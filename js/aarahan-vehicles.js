/* ==========================================================================
   Arahan Enterprises — construction convoy spacing

   The convoy itself is pure CSS. This only converts the two spacing
   variables — --vehicle-gap and --vehicle-cycle-gap, both in pixels — into
   animation delays, using each vehicle's measured width.

   Why it cannot be done in CSS alone: the delay needed for a given pixel
   gap is (width + gap) / speed, and speed depends on the viewport width.
   calc() cannot divide one length by another to produce the required
   unitless ratio, so the arithmetic has to happen here. No rAF, no work
   per frame — it runs once on load and again only if the width changes.

   Because every vehicle shares one travel distance (100vw + --convoy-exit)
   they also share one speed, so the gaps set here hold for the whole
   crossing and the vehicles can never overlap.
   ========================================================================== */
(function () {
  "use strict";

  var band = document.querySelector(".aarahan-convoy");
  if (!band) return;

  var units = [
    band.querySelector(".aarahan-convoy__unit--excavator"),
    band.querySelector(".aarahan-convoy__unit--loader"),
    band.querySelector(".aarahan-convoy__unit--mixer")
  ];
  if (units.some(function (u) { return !u; })) return;

  function px(value, fallback) {
    var n = parseFloat(value);
    return isNaN(n) ? fallback : n;
  }

  /* A custom property comes back from getPropertyValue as authored, so a
     clamp()/calc() value cannot be read with parseFloat. Resolve it by
     laying it out on a throwaway probe and measuring the result. */
  var probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;visibility:hidden;height:0;pointer-events:none;";
  band.appendChild(probe);

  function lengthOf(expr, fallback) {
    var direct = parseFloat(expr);
    if (!isNaN(direct) && /^-?[\d.]+px$/.test(String(expr).trim())) return direct;
    probe.style.width = "0px";
    probe.style.width = expr;
    var w = probe.getBoundingClientRect().width;
    return w > 0 ? w : fallback;
  }

  function layout() {
    /* Reduced motion hides the band; nothing to lay out. */
    if (getComputedStyle(band).display === "none") return;

    var cs = getComputedStyle(band);
    var speed = px(cs.getPropertyValue("--convoy-speed"), 78);     /* px per second */
    var exit = lengthOf(cs.getPropertyValue("--convoy-exit"), 200);
    var gap = lengthOf(cs.getPropertyValue("--vehicle-gap"), 160);
    var cycleGap = lengthOf(cs.getPropertyValue("--vehicle-cycle-gap"), 300);

    var widths = units.map(function (u) {
      var img = u.querySelector("img");
      return (img && img.getBoundingClientRect().width) || 0;
    });
    if (widths.some(function (w) { return !w; })) return;   // images not laid out yet

    var total = widths[0] + widths[1] + widths[2];

    /* The loop has to be long enough to hold the convoy and its gaps:
         loop = w1 + gap + w2 + gap + w3 + cycleGap
       On a narrow screen that is longer than the viewport, so the run-in
       is extended off-stage rather than squeezing the gaps. */
    var loop = total + 2 * gap + cycleGap;
    var onScreen = window.innerWidth + exit;
    var lead = Math.max(0, loop - onScreen);
    loop = Math.max(loop, onScreen);

    /* Constant speed: a longer loop takes longer, it does not travel faster. */
    var duration = loop / (speed || 78);

    band.style.setProperty("--convoy-lead", lead.toFixed(1) + "px");

    var offsets = [0, widths[0] + gap, widths[0] + gap + widths[1] + gap];
    units.forEach(function (u, i) {
      u.style.animationDuration = duration.toFixed(2) + "s";
      u.style.animationDelay = (duration * offsets[i] / loop).toFixed(3) + "s";
    });

    /* Handy for eyeballing in devtools */
    band.dataset.convoyGap = Math.round(gap);
    band.dataset.convoyCycleGap = Math.round(loop - total - 2 * gap);
    band.dataset.convoyLoop = Math.round(loop);
    band.dataset.convoyDuration = duration.toFixed(1);
  }

  function whenImagesReady(fn) {
    var imgs = units.map(function (u) { return u.querySelector("img"); });
    var pending = imgs.filter(function (i) { return i && !i.complete; });
    if (!pending.length) { fn(); return; }
    var left = pending.length;
    pending.forEach(function (i) {
      i.addEventListener("load", function () { if (!--left) fn(); }, { once: true });
      i.addEventListener("error", function () { if (!--left) fn(); }, { once: true });
    });
  }

  whenImagesReady(layout);
  // Retain convoy phase while a background tab is not being viewed.
  function visibility() { band.classList.toggle('ae-convoy-paused', document.hidden); }
  document.addEventListener('visibilitychange', visibility);
  visibility();

  /* Recompute only when the width actually changes: re-setting a delay
     restarts the animation, so we never do it on scroll or on the
     height-only resizes mobile browsers fire when toolbars slide. */
  var lastWidth = window.innerWidth;
  var timer;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(timer);
    timer = setTimeout(layout, 200);
  }, { passive: true });

  /* The footer toggle can re-enable motion after the band was hidden. */
  document.addEventListener("ae:motion", function () { setTimeout(layout, 50); });
})();
