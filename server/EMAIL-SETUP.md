# Contact email setup

The existing contact.html form posts its seven fields to POST /api/contact.
The Node server serves the website and API together; a Python/static server
cannot send these emails. No frontend framework or email library was added.

## Local use

Use Node 20.6+ and run `npm ci`, then `npm run dev` from the project directory.
Open http://localhost:8790/contact.html. Run `npm run mail:check` to check SMTP
authentication without sending mail. Run `node --test server/contact.test.js`
for mocked delivery, validation, concurrent-request and partial-failure tests.

Both saved preview configurations run this Node server on port 8790. Do not
start Python http.server for enquiry testing: it cannot handle POST /api/contact.
The browser allows 60 seconds for SMTP delivery. If that expires, submission
status is unknown; the form retains the input rather than reporting success.

## Environment

Copy .env.example to .env only when .env does not already exist. Configure:

- SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_SECURE=false
- SMTP_USER: the sending Gmail account; SMTP_PASSWORD: its Gmail App Password
- MAIL_FROM: optional authorized sender (defaults to SMTP_USER)
- OWNER_EMAIL_1 and OWNER_EMAIL_2: notification recipients
- MAIL_DRYRUN=0 for real email, 1 for local composition without sending
- PORT=8790 locally; use the hosting provider's assigned port in production
- ALLOWED_ORIGINS: empty for same-origin deployment

Only the sender requires an App Password. Recipient account passwords are
unnecessary. Keep .env private and excluded from Git and published assets.

## Delivery

Owners receive the enquiry with the visitor as Reply-To. The visitor receives
a branded confirmation whose replies go to the owners. The API returns success
only when SMTP has accepted both owner recipients and the confirmation.
SMTP acceptance does not guarantee inbox placement.

Concurrent identical submissions share one operation. Accepted recipients are
remembered for two minutes so retries send only outstanding messages. This
memory is local to the running process: restarts, multiple server instances,
expired retry windows, and ambiguous SMTP disconnections cannot provide
exactly-once delivery. Use a persistent outbox for those requirements.

## Production

### Existing Vercel project

The repository now includes `/api/contact` and `/api/health` Vercel Functions.
Keep the existing `dn-asset1/aarahan-enterprises-website` project and Git connection.
Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`,
`OWNER_EMAIL_1` and `OWNER_EMAIL_2` in its Production environment, then redeploy.
Do not copy `.env` into the static output. `MAIL_DRYRUN` must be absent or `0`
for real delivery. `/api/health` reports configuration presence only.
The contact function has a 60-second execution limit; SMTP acceptance is not
an inbox-delivery guarantee. In-memory rate limits and deduplication are best
effort per warm instance, not global across concurrent serverless instances.
Use platform firewall limits and a durable outbox if stronger abuse protection
or delivery guarantees are required. Test real SMTP from the deployed environment
before claiming email delivery works in production.

### Other Node-capable hosts

Deploy this project to a Node-capable host, install with `npm ci --omit=dev`,
set secrets in the host's environment dashboard, and run `npm start`.
Use HTTPS and serve frontend/API on the same origin. Static-only hosting needs
a separate Node API and explicit origin/endpoint configuration. Permit outbound
SMTP to Gmail port 587. Never upload .env to a public static hosting root.
Only set TRUST_PROXY=1 behind a trusted proxy that overwrites X-Forwarded-For;
otherwise leave it unset. Rate limits and duplicate tracking are per process.

Before public launch, run the SMTP check in that hosting environment and test
a labelled enquiry. Watch server-side delivery failures; browser errors omit
internal SMTP details. Gmail sending limits still apply.
