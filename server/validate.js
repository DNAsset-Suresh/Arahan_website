/* =========================================================================
   Arahan Enterprises — server-side validation for the enquiry form

   The browser validates too, but nothing here trusts that: a POST can be
   made with curl. Every field is re-checked, trimmed and length-capped
   before it is allowed anywhere near an email template.

   Field names mirror the existing form in contact.html exactly:
     name* · company · phone* · email* · type · location · message
   ========================================================================= */
"use strict";

/* Deliberately permissive: this rejects obvious nonsense, not unusual but
   legal addresses. Real delivery is the only true test of an address. */
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* The Scope <select> is a fixed list. Anything else means the payload did
   not come from our form, so it is replaced rather than echoed back. */
var SCOPES = [
  "Interior & finishing works",
  "Complete finishing package",
  "Civil & structural",
  "Power project infrastructure",
  "Pipeline & utility",
  "Fencing & boundary protection"
];

var RULES = {
  name:     { required: true,  min: 2, max: 120, label: "Full name" },
  company:  { required: false, min: 0, max: 160, label: "Company" },
  phone:    { required: true,  min: 6, max: 32,  label: "Phone" },
  email:    { required: true,  min: 5, max: 254, label: "Email" },
  location: { required: false, min: 0, max: 160, label: "Project location" },
  message:  { required: false, min: 5, max: 5000, label: "Requirement / scope" }
};

function asText(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && isFinite(value)) return String(value);
  return "";                      // objects, arrays, null -> treated as empty
}

/* Strip control characters. Chiefly this stops CR/LF being smuggled into a
   value that later lands in a header-like position (subject, Reply-To). */
function stripControl(s) {
  return s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s{3,}/g, "  ");
}

function validateEnquiry(body) {
  var errors = [];
  var data = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, errors: ["Malformed request body."], data: null };
  }

  Object.keys(RULES).forEach(function (key) {
    var rule = RULES[key];
    var value = stripControl(asText(body[key]));

    if (!value) {
      if (rule.required) errors.push(rule.label + " is required.");
      data[key] = "";
      return;
    }
    if (value.length < rule.min) {
      errors.push(rule.label + " is too short.");
    } else if (value.length > rule.max) {
      errors.push(rule.label + " is too long.");
      value = value.slice(0, rule.max);
    }
    data[key] = value;
  });

  if (data.email && !EMAIL_RE.test(data.email)) {
    errors.push("Email address is not valid.");
  }

  /* Needs at least a few digits to be a usable phone number. */
  if (data.phone && (data.phone.replace(/\D/g, "").length < 6)) {
    errors.push("Phone number is not valid.");
  }

  var scope = stripControl(asText(body.type));
  if (SCOPES.indexOf(scope) === -1) errors.push("Please select a valid scope.");
  data.type = scope;

  return { ok: errors.length === 0, errors: errors, data: errors.length ? null : data };
}

module.exports = { validateEnquiry: validateEnquiry, SCOPES: SCOPES };
