/* =========================================================================
   Arahan Enterprises — enquiry email bodies

   Every value that reaches the HTML version goes through esc() first. The
   visitor controls all of it, so without escaping a message containing
   "<script>" or a stray "</td>" could restructure the owners' email.

   Each message is sent as both text and HTML so it stays readable in
   clients that refuse HTML.
   ========================================================================= */
"use strict";

var COMPANY = "Arahan Enterprises";
var TAGLINE = "Solutions for All Your Corporate Needs";
var PHONE_1 = "+91 93819 40980";
var PHONE_2 = "+91 88254 53036";
var PUBLIC_EMAIL = "arahanenterprises14@gmail.com";
var ADDRESS = "No. 9, Door No 525/6, Sri Malli Nagar, Railway Station Road, " +
              "Pattamandiri, Vallur, Chennai - 600 120, Tamil Nadu, India";

var GREEN = "#28584E";
var SAND = "#d8cbb8";
var INK = "#2b2b2b";

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Message bodies keep their line breaks; escape first, then convert. */
function escMultiline(value) {
  return esc(value).replace(/\r?\n/g, "<br>");
}

function stamp(date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata"
  }).format(date) + " IST";
}

function rows(pairs) {
  return pairs.map(function (p) {
    return '<tr>' +
      '<td style="padding:8px 14px 8px 0;color:#6b6257;font:500 12px/1.5 Arial,sans-serif;' +
      'text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;vertical-align:top">' +
      esc(p[0]) + '</td>' +
      '<td style="padding:8px 0;color:' + INK + ';font:400 15px/1.6 Arial,sans-serif">' +
      esc(p[1] || "-") + '</td></tr>';
  }).join("");
}

function shell(heading, intro, inner) {
  return '<!doctype html><html><body style="margin:0;padding:24px;background:#f7f3ec">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ' +
    'style="max-width:600px;margin:0 auto;background:#fff;border:1px solid rgba(40,88,78,.14)">' +
      '<tr><td style="background:' + GREEN + ';padding:22px 28px">' +
        '<div style="color:#fff;font:700 19px/1.2 Arial,sans-serif;letter-spacing:.08em">' +
          esc(COMPANY.toUpperCase()) + '</div>' +
        '<div style="color:' + SAND + ';font:400 12px/1.5 Arial,sans-serif;margin-top:5px">' +
          esc(TAGLINE) + '</div>' +
      '</td></tr>' +
      '<tr><td style="padding:28px">' +
        '<h1 style="margin:0 0 14px;color:' + GREEN + ';font:700 20px/1.3 Arial,sans-serif">' +
          esc(heading) + '</h1>' +
        '<p style="margin:0 0 20px;color:' + INK + ';font:400 15px/1.65 Arial,sans-serif">' +
          intro + '</p>' + inner +
      '</td></tr>' +
      '<tr><td style="background:#f7f3ec;padding:18px 28px;border-top:1px solid rgba(40,88,78,.12)">' +
        '<div style="color:#6b6257;font:400 12px/1.7 Arial,sans-serif">' +
          esc(ADDRESS) + '<br>' +
          esc(PHONE_1) + ' &middot; ' + esc(PHONE_2) + ' &middot; ' + esc(PUBLIC_EMAIL) +
        '</div>' +
      '</td></tr>' +
    '</table></body></html>';
}

/* ---- 1. Confirmation to the visitor ---------------------------------- */
function userConfirmation(d, now) {
  var pairs = [
    ["Name", d.name], ["Company", d.company], ["Phone", d.phone],
    ["Email", d.email], ["Scope", d.type], ["Project location", d.location]
  ];

  var text = [
    "Hello " + d.name + ",",
    "",
    "Thank you for contacting " + COMPANY + ".",
    "",
    "We have received your enquiry. Our team will review your requirement and",
    "get back to you shortly.",
    "",
    "Your submitted details",
    "----------------------",
    "Name: " + d.name,
    "Company: " + (d.company || "-"),
    "Phone: " + d.phone,
    "Email: " + d.email,
    "Scope: " + d.type,
    "Project location: " + (d.location || "-"),
    "",
    "Requirement / scope:",
    d.message,
    "",
    "Submitted at: " + stamp(now),
    "",
    "If anything above is wrong, reply to this email and we will correct it.",
    "",
    "Regards,",
    COMPANY,
    ADDRESS,
    PHONE_1 + " / " + PHONE_2,
    PUBLIC_EMAIL,
    "",
    "This is an automated confirmation - please do not treat it as a quotation."
  ].join("\n");

  var html = shell(
    "Thank you for your enquiry",
    "Hello " + esc(d.name) + ',<br><br>Thank you for contacting ' + esc(COMPANY) +
    '. We have received your enquiry and our team will review your requirement ' +
    'and get back to you shortly.',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' +
      rows(pairs) + '</table>' +
    '<p style="margin:18px 0 6px;color:#6b6257;font:500 12px/1.5 Arial,sans-serif;' +
      'text-transform:uppercase;letter-spacing:.06em">Requirement / scope</p>' +
    '<div style="padding:14px 16px;background:#f7f3ec;border-left:3px solid ' + GREEN + ';' +
      'color:' + INK + ';font:400 15px/1.65 Arial,sans-serif">' + escMultiline(d.message) + '</div>' +
    '<p style="margin:20px 0 0;color:#6b6257;font:400 13px/1.6 Arial,sans-serif">' +
      'Submitted at ' + esc(stamp(now)) + '.<br>' +
      'If anything above is wrong, reply to this email and we will correct it.</p>'
  );

  return { subject: "Thank you for contacting " + COMPANY, text: text, html: html };
}

/* ---- 2. Notification to the owners ----------------------------------- */
function ownerNotification(d, now) {
  var pairs = [
    ["Name", d.name], ["Company", d.company], ["Phone", d.phone],
    ["Email", d.email], ["Scope", d.type], ["Project location", d.location],
    ["Submitted", stamp(now)]
  ];

  var text = [
    "A new enquiry has been submitted through the website.",
    "",
    "Customer details",
    "----------------",
    "Name: " + d.name,
    "Company: " + (d.company || "-"),
    "Phone: " + d.phone,
    "Email: " + d.email,
    "Scope: " + d.type,
    "Project location: " + (d.location || "-"),
    "",
    "Requirement / scope:",
    d.message,
    "",
    "Submitted at: " + stamp(now),
    "",
    "Reply to this email to respond directly to the customer."
  ].join("\n");

  var html = shell(
    "New website enquiry",
    "A new enquiry has been submitted through the website. Reply to this email " +
    "to respond directly to the customer.",
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' +
      rows(pairs) + '</table>' +
    '<p style="margin:18px 0 6px;color:#6b6257;font:500 12px/1.5 Arial,sans-serif;' +
      'text-transform:uppercase;letter-spacing:.06em">Requirement / scope</p>' +
    '<div style="padding:14px 16px;background:#f7f3ec;border-left:3px solid ' + GREEN + ';' +
      'color:' + INK + ';font:400 15px/1.65 Arial,sans-serif">' + escMultiline(d.message) + '</div>' +
    '<p style="margin:22px 0 0">' +
      '<a href="mailto:' + esc(d.email) + '" style="display:inline-block;padding:11px 20px;' +
      'background:' + GREEN + ';color:#fff;text-decoration:none;font:600 14px Arial,sans-serif">' +
      'Reply to ' + esc(d.name) + '</a></p>'
  );

  return { subject: "New website enquiry - " + d.name, text: text, html: html };
}

module.exports = {
  userConfirmation: userConfirmation,
  ownerNotification: ownerNotification,
  esc: esc,
  COMPANY: COMPANY
};
