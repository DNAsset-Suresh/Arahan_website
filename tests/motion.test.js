'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function videoHarness(reduced = false) {
  const events = {}, videoEvents = {};
  const video = { paused: true, readyState: 1, duration: 8, currentTime: 0, plays: 0,
    addEventListener: (key, fn) => { videoEvents[key] = fn; },
    play() { this.plays++; this.paused = false; videoEvents.playing?.(); return Promise.resolve(); },
    pause() { this.paused = true; } };
  const showcase = { querySelector: () => video, setAttribute() {}, removeAttribute() {} };
  const document = { hidden: false, querySelector: () => showcase,
    documentElement: { classList: { contains: () => reduced } },
    addEventListener: (key, fn) => { events[key] = fn; }, removeEventListener() {} };
  const context = { document, window: {}, isFinite };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/aarahan-building.js'), 'utf8'), context);
  return { video, events, videoEvents, document, motion(value) { reduced = value; events['ae:motion'](); } };
}

test('building intro plays once and never replays a completed run', () => {
  const h = videoHarness();
  assert.equal(h.video.plays, 1);
  h.video.currentTime = 8;
  h.videoEvents.ended();
  h.document.hidden = true; h.events.visibilitychange();
  h.document.hidden = false; h.events.visibilitychange();
  h.motion(true); h.motion(false);
  assert.equal(h.video.plays, 1);
  assert.equal(h.video.paused, true);
  assert.ok(h.video.currentTime > 7.9);
});
test('motion preference interrupts playback and cannot restart that run', () => {
  const h = videoHarness();
  h.motion(true);
  assert.equal(h.video.paused, true);
  h.motion(false);
  assert.equal(h.video.plays, 1);
});
test('initial reduced motion holds the final building; explicit full motion permits one run', () => {
  const h = videoHarness(true);
  assert.equal(h.video.plays, 0);
  assert.ok(h.video.currentTime > 7.9);
  h.motion(false);
  assert.equal(h.video.plays, 1);
});
