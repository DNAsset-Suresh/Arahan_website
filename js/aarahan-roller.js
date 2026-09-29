/* =========================================================================
   Arahan Enterprises — engineering fabric roller

   Converts the Method section's travel through the viewport into a single
   number, --p (0 to 1), and writes it to the section. All of the visual
   work lives in css/aarahan-roller.css; this file does arithmetic and
   nothing else.

   Why no sticky scroll track: the usual build for an unroll effect reserves
   two or three screens of scrolling to play the animation in. The home page
   was deliberately shortened, so instead the sheet unrolls across the
   section's normal approach to the viewport. No extra page height, no
   layout shift, and the reading order is untouched.

   Cost per frame: one getBoundingClientRect and one custom property write
   per tracked section, and only while that section is near the viewport.
   ========================================================================= */
(function () {
  "use strict";

  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-roller]"));
  if (!sections.length) return;

  var html = document.documentElement;
  var active = [];            /* sections currently worth measuring */
  var frame = 0;

  function reduced() {
    return html.classList.contains("rm");
  }

  function clamp01(n) {
    return n < 0 ? 0 : (n > 1 ? 1 : n);
  }

  /* The unrolled length tracks the viewport, not the section's entry.

     The first version mapped progress to the section approaching the fold,
     which meant the sheet was fully unrolled by the time its top reached
     30% of the screen - so the unrolling edge was always somewhere below
     the fold and nobody ever saw it move. Measuring against the bottom of
     the viewport instead means the edge descends with the reader: the sheet
     is unrolled exactly as far as you can see.

     HOLD keeps the leading edge a short way ABOVE the bottom of the screen.
     A first attempt put it below the fold instead, which measured perfectly
     but was invisible - the sheet was always already unrolled by the time
     any of it came into view. Holding it back means the edge and its fold
     shadow are on screen, travelling down as you scroll. */
  var HOLD = 0.12;            /* viewport-heights to keep the edge inside view */

  function progressFor(el) {
    var sheet = el.querySelector(".ae-roll__sheet") || el;
    var r = sheet.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    if (r.height <= 0) return 1;
    return clamp01(((1 - HOLD) * vh - r.top) / r.height);
  }

  function write(el, p) {
    /* Two decimals is finer than a pixel of movement and keeps the style
       recalculation from firing on every sub-pixel scroll tick. */
    var v = Math.round(p * 100) / 100;
    if (el._aeP === v) return;
    el._aeP = v;
    el.style.setProperty("--p", String(v));
  }

  function settle() {
    /* Reduced motion: hand every section its finished state once. */
    sections.forEach(function (el) { write(el, 1); });
  }

  function tick() {
    frame = 0;
    for (var i = 0; i < active.length; i++) {
      write(active[i], progressFor(active[i]));
    }
  }

  function request() {
    if (frame || reduced()) return;
    frame = window.requestAnimationFrame(tick);
  }

  if (reduced()) {
    settle();
  } else {
    /* Only measure sections that are near the viewport. Off-screen ones cost
       nothing, which matters on the home page where this sits well down. */
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var at = active.indexOf(e.target);
          if (e.isIntersecting && at === -1) active.push(e.target);
          else if (!e.isIntersecting && at !== -1) active.splice(at, 1);
        });
        request();
      }, { rootMargin: "120% 0px 120% 0px" });
      sections.forEach(function (el) { io.observe(el); });
    } else {
      active = sections.slice();
    }

    /* CSS defaults --p to 1 for the no-JS case; now that the script is
       running, take ownership straight away so the sheet is in its true
       scroll position before it can be seen. */
    sections.forEach(function (el) { write(el, progressFor(el)); });

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    request();
  }

  /* The footer toggle can switch motion on or off after load. */
  document.addEventListener("ae:motion", function () {
    if (reduced()) {
      if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      settle();
    } else {
      active = sections.slice();
      request();
    }
  });
})();
