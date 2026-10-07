import server from '../server/server.js';

// Reuse local validation, SMTP delivery and safe errors; never start a listener.
export default async function contact(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'content-type': 'application/json', 'allow': 'POST', 'cache-control': 'no-store' });
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed.' }));
  }
  return server.handleContact(req, res);
}
