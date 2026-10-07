'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
fs.mkdirSync(output, { recursive: true });
// Allowlist only website assets. Never publish server code, .env or dependencies.
for (const name of fs.readdirSync(root)) {
  if (/\.html$/.test(name) || ['robots.txt', 'sitemap.xml', 'site.webmanifest'].includes(name)) {
    fs.copyFileSync(path.join(root, name), path.join(output, name));
  }
}
for (const name of ['assets', 'css', 'js']) {
  fs.cpSync(path.join(root, name), path.join(output, name), {
    recursive: true,
    filter: source => !path.relative(root, source).split(path.sep).some(part => part.startsWith('.'))
  });
}
console.log('Static website built into public/; private server files excluded.');
