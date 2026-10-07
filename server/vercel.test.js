'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.SMTP_HOST = 'mock.invalid';
process.env.SMTP_USER = 'sender@example.com';
process.env.OWNER_EMAIL_1 = 'owner@example.com';
process.env.OWNER_EMAIL_2 = 'other@example.com';
process.env.MAIL_DRYRUN = '0';
const calls = [];
require('nodemailer').createTransport = () => ({ sendMail: async mail => {
  calls.push(mail);
  return { accepted: mail.to.split(', '), messageId: 'test' };
} });

test('Vercel adapter accepts parsed JSON, validates and never opens a server port', async () => {
  const { default: handler } = await import('../api/contact.mjs');
  assert.equal(require('./server').listening, false);
  async function invoke(body, method = 'POST') {
    const req = { method, body, headers: { 'content-type': 'application/json' }, socket: { remoteAddress: 'test' } };
    const res = { status: 0, headers: {}, writeHead(status, headers) { this.status = status; Object.assign(this.headers, headers); },
      setHeader(k, v) { this.headers[k] = v; }, end(data) { this.body = JSON.parse(data); } };
    await handler(req, res);
    return res;
  }
  assert.equal((await invoke({}, 'GET')).status, 405);
  assert.equal((await invoke({})).status, 422);
  assert.equal((await invoke({ message: 'x'.repeat(17000) })).status, 413);
  const data = { name: 'Test Visitor', phone: '9381940980', email: 'visitor@example.com', type: 'Interior & finishing works', message: '' };
  assert.equal((await invoke(data)).status, 200);
  assert.equal((await invoke(data)).body.duplicate, true);
  assert.equal(calls.length, 2);
});
