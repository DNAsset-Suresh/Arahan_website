'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('all pages ship visible, motion-off markup without animation dependencies', () => {
  const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));
  assert.equal(pages.length, 11);
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /<html[^>]*class="static-site rm no-loader is-ready"/, page);
    assert.match(html, /href="css\/aarahan-static.css"/, page);
    assert.doesNotMatch(html, /<(?:video|canvas)\b|data-motion-toggle|data-aarahan-book/, page);
    assert.doesNotMatch(html, /src="js\/(?:3d|animations|aarahan-(?:depth|roller|vehicles|building))\.js/, page);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, page);
  }
});

test('all existing machinery categories and stationary vehicles remain available', () => {
  const html = read('index.html');
  assert.equal((html.match(/class="machinery-card"/g) || []).length, 9);
  for (const name of ['Vertical Mast','Electric Scissor Lift','Boom Lift','Spider Lift','Truck Mounted Boom Lift','Battery Stacker','Battery Pallet Truck','Welding Solutions','Portable Power Station']) {
    assert.ok(html.includes(name), name);
  }
  assert.equal((html.match(/class="machinery-table"/g) || []).length, 9);
  for (const image of ['excavator','wheel-loader','concrete-mixer']) assert.ok(html.includes('assets/vehicles/'+image+'.png'));
  assert.ok(fs.statSync(path.join(root,'assets/images/completed-building.webp')).size < 150000);
});

test('old full-motion preferences cannot reactivate motion or register scroll handlers', () => {
  const classes = new Set(), listeners = [];
  const document = {
    documentElement: { classList: { add: (...names) => names.forEach(n => classes.add(n)) } },
    createElement: () => ({}), head: { appendChild() {} },
    addEventListener: name => listeners.push(name), dispatchEvent() {}
  };
  const context = { document, window: {}, location: { protocol:'https:' }, innerWidth:1440,
    localStorage: { getItem: () => 'full', setItem() {} },
    CustomEvent: function (name, data) { this.type=name;this.detail=data.detail; } };
  vm.runInNewContext(read('js/navigation.js'), context);
  assert.equal(context.window.AE.reduced(), true);
  context.window.AE.setMotion(false);
  assert.equal(context.window.AE.reduced(), true);
  assert.ok(classes.has('rm'));
  assert.ok(!listeners.includes('scroll'));
});

test('static CSS suppresses animations, transitions and smooth scrolling', () => {
  const css = read('css/aarahan-static.css');
  for (const rule of ['animation: none !important','transition: none !important','scroll-behavior: auto !important']) assert.ok(css.includes(rule));
  assert.doesNotMatch(css, /@keyframes/);
});
