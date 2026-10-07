"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
process.env.PORT = "0";
process.env.MAIL_DRYRUN = "0";
process.env.SMTP_HOST = "mock.invalid";
process.env.SMTP_USER = "sender@example.com";
process.env.OWNER_EMAIL_1 = "one@example.com";
process.env.OWNER_EMAIL_2 = "two@example.com";
let calls = [], failConfirmation = false;
require("nodemailer").createTransport = () => ({ sendMail: async mail => {
  calls.push(mail);
  await new Promise(resolve => setTimeout(resolve, 30));
  if (failConfirmation && mail.to === "visitor@example.com") throw new Error("Simulated SMTP failure");
  return { accepted: mail.to.split(", "), messageId: "mock" };
}});
const server = require("./server");
test("contact validation, concurrent dedupe, partial retry, and private files", async () => {
  if (!server.listening) await new Promise(resolve => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const payload = { name: "Test Visitor", email: "visitor@example.com", phone: "9381940980", type: "Interior & finishing works", message: "<script>Test enquiry</script>" };
  const validate = require("./validate").validateEnquiry;
  assert.equal(validate({ ...payload, message: "" }).ok, true);
  assert.equal(validate({ ...payload, type: "" }).ok, false);
  const post = data => fetch(base + "/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  try {
    assert.equal((await post({ ...payload, email: "invalid" })).status, 422);
    assert.equal((await post({})).status, 422);
    failConfirmation = true;
    const failed = await Promise.all([post(payload), post(payload)]);
    for (const response of failed) {
      assert.equal(response.status, 502);
      assert.ok(!(await response.text()).includes("Simulated"));
    }
    assert.equal(calls.length, 2);
    assert.equal(calls[0].to, "one@example.com, two@example.com");
    assert.equal(calls[0].replyTo, payload.email);
    assert.ok(!calls[0].html.includes("<script>"));
    failConfirmation = false;
    assert.equal((await post(payload)).status, 200);
    assert.equal(calls.length, 3, "retry sends only confirmation");
    for (const path of ["/.env", "/server/mailer.js", "/.git/config", "/package-lock.json"]) {
      assert.equal((await fetch(base + path)).status, 404);
    }
    assert.equal((await fetch(base + "/contact.html")).status, 200);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
