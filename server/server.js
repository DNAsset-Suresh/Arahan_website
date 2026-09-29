/* =========================================================================
   Arahan Enterprises — static file server + enquiry mail API

   Plain node:http on purpose. The only job beyond serving the existing
   static site is one POST route, which does not justify a framework; this
   keeps the project at exactly one runtime dependency (nodemailer).

   Serving the site and the API from the same process also means they share
   an origin, so the browser never makes a cross-origin request and no CORS
   configuration is needed in the normal setup.

   Routes:
     POST /api/contact  -> validate, send, respond JSON
     GET  /api/health   -> readiness probe
     GET  *             -> static file from the project root
   ========================================================================= */
"use strict";

var http = require("node:http");
var fs = require("node:fs");
var fsp = require("node:fs/promises");
var path = require("node:path");
var crypto = require("node:crypto");

var validate = require("./validate");
var mailer = require("./mailer");

var ROOT = path.resolve(__dirname, "..");
var PORT = parseInt(process.env.PORT || "8765", 10);
var MAX_BODY = 16 * 1024;              // 16 KB: far above a real enquiry
var RATE_MAX = 5;                      // submissions per window per IP
var RATE_WINDOW = 10 * 60 * 1000;      // 10 minutes
var DEDUPE_TTL = 2 * 60 * 1000;        // identical payload ignored for 2 min

var TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".mp4": "video/mp4", ".webm": "video/webm", ".woff2": "font/woff2",
  ".woff": "font/woff", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json"
};

var hits = new Map();      // ip -> timestamps[]
var recent = new Map();    // payload hash -> { at, result }

function json(res, status, payload) {
  var body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store"
  });
  res.end(body);
}

function clientIp(req) {
  var fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function rateLimited(ip) {
  var now = Date.now();
  var list = (hits.get(ip) || []).filter(function (t) { return now - t < RATE_WINDOW; });
  if (list.length >= RATE_MAX) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  return false;
}

/* Reads the body with a hard ceiling, so an oversized POST is dropped as it
   arrives rather than after it has all been buffered. */
function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    var size = 0;
    req.on("data", function (c) {
      size += c.length;
      if (size > MAX_BODY) {
        /* Stop reading, but do NOT destroy the socket here: tearing it down
           now kills the connection before the 413 can be written and the
           client sees a reset instead of a real status code. Pause, reject,
           and let the handler answer; the "connection: close" header on that
           response tells Node to discard the rest. */
        req.pause();
        reject(Object.assign(new Error("Payload too large"), { statusCode: 413 }));
        return;
      }
      chunks.push(c);
    });
    req.on("end", function () { resolve(Buffer.concat(chunks).toString("utf8")); });
    req.on("error", reject);
  });
}

function applyCors(req, res) {
  var allowed = String(process.env.ALLOWED_ORIGINS || "").split(",")
    .map(function (s) { return s.trim(); }).filter(Boolean);
  var origin = req.headers.origin;
  if (!allowed.length || !origin) return;         // same-origin: nothing to do
  if (allowed.indexOf(origin) === -1) return;     // not on the list: no header
  res.setHeader("access-control-allow-origin", origin);
  res.setHeader("vary", "Origin");
  res.setHeader("access-control-allow-headers", "content-type");
  res.setHeader("access-control-allow-methods", "POST, OPTIONS");
}

async function handleContact(req, res) {
  var ip = clientIp(req);

  if (rateLimited(ip)) {
    return json(res, 429, { ok: false, error: "Too many enquiries from this connection. Please try again later." });
  }

  var raw;
  try {
    raw = await readBody(req);
  } catch (err) {
    var tooBig = err.statusCode === 413;
    res.setHeader("connection", "close");
    return json(res, tooBig ? 413 : 400, {
      ok: false,
      error: tooBig ? "Your message is too long. Please shorten it and try again."
                    : "Malformed request."
    });
  }

  var body;
  try { body = JSON.parse(raw || "{}"); }
  catch (e) { return json(res, 400, { ok: false, error: "Malformed request." }); }

  var check = validate.validateEnquiry(body);
  if (!check.ok) {
    return json(res, 422, { ok: false, error: "Please check the highlighted fields.", details: check.errors });
  }

  /* Duplicate guard: a double-click or an automatic retry must not send the
     enquiry twice. The same payload inside the window replays the original
     response instead of sending again. */
  var hash = crypto.createHash("sha256")
    .update(JSON.stringify(check.data) + "|" + ip).digest("hex");
  var seen = recent.get(hash);
  if (seen && Date.now() - seen.at < DEDUPE_TTL) {
    return json(res, 200, Object.assign({ duplicate: true }, seen.result));
  }

  try {
    var out = await mailer.sendEnquiry(check.data);
    var result = { ok: true, message: "Enquiry received.", confirmationSent: out.confirmationSent };
    recent.set(hash, { at: Date.now(), result: result });
    console.log("[enquiry] from %s <%s> -> %d owner(s), confirmation:%s",
      check.data.name, check.data.email, out.owners, out.confirmationSent);
    return json(res, 200, result);
  } catch (err) {
    /* The real reason stays on the server. The browser gets nothing that
       could reveal SMTP hosts, credentials or a stack trace. */
    console.error("[enquiry] send failed:", err && err.message ? err.message : err);
    return json(res, 502, {
      ok: false,
      error: "We could not send your enquiry just now. Please try again, or contact us directly."
    });
  }
}

function safePath(urlPath) {
  var decoded;
  try { decoded = decodeURIComponent(urlPath.split("?")[0]); }
  catch (e) { return null; }
  if (decoded === "/" || decoded === "") decoded = "/index.html";
  var full = path.join(ROOT, path.normalize(decoded));
  /* Refuse anything that escapes the project root (../ traversal). */
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return null;
  return full;
}

async function serveStatic(req, res) {
  var file = safePath(req.url);
  if (!file) { res.writeHead(400).end("Bad request"); return; }

  try {
    var st = await fsp.stat(file);
    if (st.isDirectory()) file = path.join(file, "index.html");
  } catch (e) { /* fall through to 404 */ }

  /* Never serve secrets or server code, whatever the URL asks for. */
  var rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel.startsWith(".env") || rel.startsWith("server/") || rel === "package.json" ||
      rel.startsWith("node_modules/")) {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
    return;
  }

  fs.createReadStream(file)
    .on("open", function () {
      res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
    })
    .on("error", function () {
      fs.readFile(path.join(ROOT, "404.html"), function (e, buf) {
        if (e) { res.writeHead(404, { "content-type": "text/plain" }).end("Not found"); return; }
        res.writeHead(404, { "content-type": TYPES[".html"] }).end(buf);
      });
    })
    .pipe(res);
}

var server = http.createServer(function (req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }

  if (req.url.split("?")[0] === "/api/contact") {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed." });
    return handleContact(req, res);
  }

  if (req.url.split("?")[0] === "/api/health") {
    return json(res, 200, { ok: true, dryRun: mailer.isDryRun(), owners: mailer.owners().length });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return json(res, 405, { ok: false, error: "Method not allowed." });
  }
  return serveStatic(req, res);
});

server.listen(PORT, function () {
  console.log("Arahan Enterprises site  -> http://localhost:" + PORT);
  console.log("Enquiry API              -> POST http://localhost:" + PORT + "/api/contact");
  if (mailer.isDryRun()) console.log("MAIL_DRYRUN=1 - emails are composed and logged, NOT sent.");
  var n = mailer.owners().length;
  if (!n) console.warn("WARNING: no OWNER_EMAIL_1 / OWNER_EMAIL_2 configured - enquiries will fail.");
});

module.exports = server;
