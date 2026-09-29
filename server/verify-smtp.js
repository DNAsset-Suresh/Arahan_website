/* =========================================================================
   Arahan Enterprises — SMTP credential check

   Run before going live:  npm run mail:check

   Opens a real connection and authenticates, so a wrong host, port or app
   password is caught here rather than by a visitor whose enquiry vanishes.
   Prints no credentials.
   ========================================================================= */
"use strict";

var mailer = require("./mailer");

(async function () {
  if (mailer.isDryRun()) {
    console.log("MAIL_DRYRUN=1 - nothing to verify. Set MAIL_DRYRUN=0 to test real SMTP.");
    process.exit(0);
  }
  var to = mailer.owners();
  console.log("Owner recipients configured:", to.length ? to.join(", ") : "(none)");
  if (!to.length) {
    console.error("FAIL: set OWNER_EMAIL_1 (and optionally OWNER_EMAIL_2) in .env");
    process.exit(1);
  }
  try {
    await mailer.verify();
    console.log("OK: SMTP host reachable and credentials accepted.");
    process.exit(0);
  } catch (err) {
    console.error("FAIL:", err && err.message ? err.message : err);
    console.error("Check SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD in .env.");
    process.exit(1);
  }
})();
