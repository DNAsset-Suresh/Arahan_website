export default function health(req, res) {
  const mailConfigured = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'OWNER_EMAIL_1', 'OWNER_EMAIL_2']
    .every(key => Boolean(process.env[key]));
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify({ ok: true, mailConfigured }));
}
