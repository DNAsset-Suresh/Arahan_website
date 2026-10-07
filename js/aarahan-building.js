/* ==========================================================================
   Arahan Enterprises — hero building showcase playback

   One-time intro: the video plays through once and holds its final frame.
   It is never looped, never restarted, and never reset when the section
   scrolls back into view.

   The only reason this file exists is autoplay policy: a muted, playsinline
   video usually starts on its own, but some browsers still reject the
   promise until the page has been interacted with, so the first gesture
   retries once. No timers, no rAF, no library.
   ========================================================================== */
(function () {
  "use strict";

  var showcase = document.querySelector("[data-building-showcase]");
  if (!showcase) return;

  var video = showcase.querySelector("video");
  if (!video) return;

  var finished = false;
  var heldForRm = false;   /* parked on the last frame, never actually played */
  var played = false;
  var visible = true;
  video.addEventListener('playing', function () { played = true; });

  /* Belt and braces: the markup carries no `loop`, and nothing here adds it. */
  video.loop = false;

  video.addEventListener("ended", function () {
    finished = true;
    heldForRm = false;
    video.pause();          // hold on the closing frame
    showcase.setAttribute("data-building-complete", "");
  });

  function attempt() {
    if (finished || reduced() || document.hidden || !visible || !video.paused) return;
    var p = video.play();
    if (p && typeof p.catch === "function") p.catch(function () { /* policy blocked it */ });
  }

  /* The site's own motion flag, set by main.js from the footer toggle and the
     OS preference. The bare media query is only a fallback for no-JS. */
  function reduced() {
    return document.documentElement.classList.contains("rm");
  }

  /* Reduced motion: no sequence, but the hero should still show a building.
     Park on the closing frame - the finished tower - and treat the run as
     already spent so nothing can start it later. */
  function holdFinalFrame() {
    finished = true;
    heldForRm = !played;
    video.pause();
    function seek() {
      if (!reduced()) return;
      if (!isFinite(video.duration)) return;
      /* a hair inside the end: seeking exactly to duration lands past the
         last decoded frame in some browsers and paints nothing */
      video.currentTime = Math.max(0, video.duration - 0.05);
      showcase.setAttribute("data-building-complete", "");
    }
    if (video.readyState >= 1) seek();
    else video.addEventListener("loadedmetadata", seek, { once: true });
  }

  if (reduced()) holdFinalFrame();
  else attempt();

  /* If the browser refused autoplay, take the visitor's first gesture as
     permission. Listeners remove themselves, so this costs nothing after. */
  if (video.paused && !finished) {
    ["pointerdown", "keydown", "touchstart"].forEach(function (type) {
      document.addEventListener(type, function handler() {
        document.removeEventListener(type, handler);
        attempt();
      }, { once: true, passive: true });
    });
  }

  /* Don't burn frames decoding while the hero is off screen — but only ever
     pause, never rewind, and never resume once the run has finished. */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (finished) return;
      if (visible) attempt();
      else if (!video.paused) video.pause();
    }, { threshold: 0.05 }).observe(showcase);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) video.pause();
    else attempt();
  });
  /* The footer toggle can turn motion back on after the page loaded with it
     off. Only then does the sequence get its single run. */
  document.addEventListener("ae:motion", function () {
    if (reduced()) { holdFinalFrame(); return; }
    /* Only act when motion has just been turned ON and the sequence was
       parked rather than played. A clip that genuinely ran is spent. */
    if (!heldForRm) return;
    heldForRm = false;
    finished = false;
    showcase.removeAttribute("data-building-complete");
    video.currentTime = 0;
    attempt();
  });
})();
