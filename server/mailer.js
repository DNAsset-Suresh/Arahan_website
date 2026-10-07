/* =========================================================================
   Arahan Enterprises — mail service

   ONE transporter for the whole process. Nodemailer keeps an SMTP
   connection pool behind it, so building a transporter per request would
   open a new TCP+TLS handshake every time and get the sender throttled.

   Nothing in here is reachable from the browser: recipients come from the
   environment only, and a caller cannot choose who gets the mail.
   ========================================================================= */
"use strict";

var nodemailer = require("nodemailer");
var templates = require("./templates");

var transporter = null;
var cachedOwners = null;

function env(name, fallback) {
  var v = process.env[name];
  return (v === undefined || v === "") ? fallback : v;
}

function isDryRun() {
  return env("MAIL_DRYRUN", "0") === "1";
}

/* Recipients are server-side configuration, never request data. Duplicates
   are collapsed: both OWNER_EMAIL_* may legitimately be the same inbox, and
   sending twice to one address just looks broken. */
function owners() {
  if (cachedOwners) return cachedOwners;
  var list = [env("OWNER_EMAIL_1", ""), env("OWNER_EMAIL_2", "")]
    .map(function (s) { return String(s).trim(); })
    .filter(Boolean);
  cachedOwners = list.filter(function (addr, i) {
    return list.findIndex(function (o) { return o.toLowerCase() === addr.toLowerCase(); }) === i;
  });
  return cachedOwners;
}

function getTransporter() {
  if (transporter) return transporter;

  if (isDryRun()) {
    /* Composes and returns the full message without touching a network.
       Lets the whole flow be exercised before real credentials exist. */
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  var host = env("SMTP_HOST", "");
  if (!host) {
    throw new Error("SMTP_HOST is not set. Copy .env.example to .env, or set MAIL_DRYRUN=1.");
  }

  var port = parseInt(env("SMTP_PORT", "587"), 10);
  transporter = nodemailer.createTransport({
    host: host,
    port: port,
    /* 465 is implicit TLS; 587 starts plaintext and upgrades via STARTTLS. */
    secure: env("SMTP_SECURE", String(port === 465)) === "true" || port === 465,
    requireTLS: true,
    auth: { user: env("SMTP_USER", ""), pass: env("SMTP_PASSWORD", "") },
    pool: true,
    maxConnections: 2,
    dnsTimeout: 10000,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  });
  return transporter;
}

function fromAddress() {
  return env("MAIL_FROM", env("SMTP_USER", "no-reply@localhost"));
}

/* Guard against a header-injection attempt reaching Reply-To. validate.js
   already strips control characters; this is the second line of defence. */
function safeAddress(addr) {
  var clean = String(addr || "").replace(/[\r\n,;<>]/g, "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean) ? clean : "";
}

/* Retain accepted recipients during the API retry window. A partial failure
   returns an error; retry sends only the outstanding messages. */
async function sendEnquiry(data, delivery) {
  delivery = delivery || { acceptedOwners: [], confirmationSent: false };
  var tx = getTransporter();
  var now = new Date();
  var to = owners();

  if (!to.length) {
    throw new Error("No owner recipients configured (OWNER_EMAIL_1 / OWNER_EMAIL_2).");
  }

  var ownerMail = templates.ownerNotification(data, now);
  var replyTo = safeAddress(data.email);

  var remaining = to.filter(function (address) {
    return delivery.acceptedOwners.indexOf(address.toLowerCase()) === -1;
  });
  if (remaining.length) {
  var ownerInfo = await tx.sendMail({
    from: fromAddress(),          // must be an address the SMTP account owns
    to: remaining.join(", "),
    replyTo: replyTo || undefined, // lets "Reply" answer the customer directly
    subject: ownerMail.subject,
    text: ownerMail.text,
    html: ownerMail.html
  });
  var accepted = isDryRun() ? remaining : (ownerInfo.accepted || []);
  accepted.forEach(function (address) {
    delivery.acceptedOwners.push(String(address).toLowerCase());
  });
  if (to.some(function (address) {
    return delivery.acceptedOwners.indexOf(address.toLowerCase()) === -1;
  })) throw new Error("SMTP did not accept all owner recipients.");
  }

  if (!delivery.confirmationSent) {
    var userMail = templates.userConfirmation(data, now);
    var userInfo = await tx.sendMail({
      from: fromAddress(),
      to: replyTo,
      replyTo: to.join(", "),
      subject: userMail.subject,
      text: userMail.text,
      html: userMail.html
    });
    if (!isDryRun() && !(userInfo.accepted || []).length) {
      throw new Error("SMTP did not accept confirmation recipient.");
    }
    delivery.confirmationSent = true;
  }

  if (isDryRun()) {
    console.log("[mail] DRY RUN - nothing was sent. Owner recipients:", to.join(", "));
    console.log("[mail] owner subject:", ownerMail.subject);
  }

  return { owners: to.length, confirmationSent: delivery.confirmationSent };
}

async function verify() {
  return getTransporter().verify();
}

module.exports = { sendEnquiry: sendEnquiry, verify: verify, owners: owners, isDryRun: isDryRun };
