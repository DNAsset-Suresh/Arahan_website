/* =========================================================================
   AARAHAN 3D SCROLL SYSTEM
   =========================================================================

   Turns scroll position into depth for each major section, plus a hero
   recede, a hairline progress bar and a very subtle pointer parallax.

   All progress values are pure functions of scroll position, never played
   timelines, so scrolling back up reverses every transition exactly.

   Cost: one rAF-coalesced pass on scroll, one getBoundingClientRect per
   section that is currently near the viewport, and a style write only when
   a value actually changed. Sections far away are not measured at all.

   Integration notes:
     - .ae-roll (the Method board) is skipped: it runs its own vertical
       unroll and a second transform on the same element would fight it.
     - The hero is skipped too; it gets its own recede treatment instead.
     - Existing [data-reveal] behaviour is untouched. Those run on children,
       this runs on the section, so the two compose rather than collide.
   ========================================================================= */
(function () {
  "use strict";

  var html = document.documentElement;
  var main = document.querySelector("main") || document.body;
  if (!main) return;

  var panels = Array.prototype.slice.call(main.children).filter(function (el) {
    return el.tagName === "SECTION" &&
      !el.classList.contains("hero") &&
      !el.classList.contains("page-hero") &&
      !el.classList.contains("ae-roll") &&
      !el.hasAttribute("data-no-depth");
  });
  var hero = main.querySelector(".hero, .page-hero");
  if (!panels.length && !hero) return;

  main.classList.add("ae-depth-host");

  /* Tilt alternates down the page and never repeats. */
  panels.forEach(function (el, i) {
    el.classList.add("ae-depth");
    el.style.setProperty("--dir", (i % 2) === 0 ? "1" : "-1");
  });
  if (hero) hero.classList.add("ae-hero-depth");

  /* Hairline progress bar. */
  var bar = document.createElement("div");
  bar.className = "ae-progress";
  bar.setAttribute("aria-hidden", "true");
  bar.innerHTML = "<span></span>";
  document.body.appendChild(bar);
  var barFill = bar.firstChild;

  var active = [];
  var frame = 0;
  var lastSp = -1;

  function reduced() { return html.classList.contains("rm"); }
  function clamp01(n) { return n < 0 ? 0 : (n > 1 ? 1 : n); }

  var IN_SPAN = 0.55;    /* viewport-fraction over which a panel arrives */
  var OUT_SPAN = 0.85;   /* and over which it recedes once past */

  function setVar(el, name, v, key) {
    if (el[key] === v) return false;
    el[key] = v;
    if (v === 0 && name === "--xp") el.style.removeProperty(name);
    else el.style.setProperty(name, String(v));
    return true;
  }

  function applyPanel(el) {
    var vh = window.innerHeight || 1;
    var r = el.getBoundingClientRect();
    var dp = clamp01((vh - r.top) / (vh * IN_SPAN));
    /* Zoom through only once the panel's bottom is leaving the top. */
    var xp = clamp01((vh * 0.25 - r.bottom) / (vh * OUT_SPAN));
    /* Through-progress: 0 as the top meets the bottom of the screen, 1 as
       the bottom leaves the top. Drives the parallax layers, which need a
       value that keeps moving across the whole traverse rather than
       saturating at 1 the moment the panel has arrived. */
    var tp = clamp01((vh - r.top) / (vh + r.height));
    dp = Math.round(dp * 100) / 100;
    xp = Math.round(xp * 100) / 100;
    tp = Math.round(tp * 1000) / 1000;
    setVar(el, "--dp", dp, "_dp");
    setVar(el, "--xp", xp, "_xp");
    setVar(el, "--tp", tp, "_tp");
    /* Flat only when fully arrived AND not yet receding - otherwise the
       receding half of the effect would be switched off by the same class. */
    el.classList.toggle("is-flat", dp >= 1 && xp <= 0);
  }

  function applyHero() {
    if (!hero) return;
    var vh = window.innerHeight || 1;
    var r = hero.getBoundingClientRect();
    var xp = clamp01(-r.top / (vh * 0.9));
    xp = Math.round(xp * 100) / 100;
    setVar(hero, "--xp", xp, "_xp");
    hero.classList.toggle("is-flat", xp <= 0);
  }

  function applyProgress() {
    var h = (document.documentElement.scrollHeight - window.innerHeight) || 1;
    var sp = Math.round(clamp01(window.scrollY / h) * 1000) / 1000;
    if (sp === lastSp) return;
    lastSp = sp;
    barFill.style.setProperty("--sp", String(sp));
  }

  function settle() {
    panels.forEach(function (el) {
      el.style.removeProperty("--dp");
      el.style.removeProperty("--xp");
      el.style.removeProperty("--tp");
      el.classList.add("is-flat");
    });
    if (hero) { hero.style.removeProperty("--xp"); hero.classList.add("is-flat"); }
  }

  function tick() {
    frame = 0;
    for (var i = 0; i < active.length; i++) applyPanel(active[i]);
    applyHero();
    applyProgress();
  }

  function request() {
    if (frame || reduced()) return;
    frame = window.requestAnimationFrame(tick);
  }

  if (reduced()) {
    settle();
    /* No panel motion, but the progress indicator still tracks the page. */
    applyProgress();
    window.addEventListener("scroll", function () {
      if (reduced()) applyProgress();
    }, { passive: true });
  } else {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var at = active.indexOf(e.target);
          if (e.isIntersecting && at === -1) active.push(e.target);
          else if (!e.isIntersecting && at !== -1) active.splice(at, 1);
        });
        request();
      }, { rootMargin: "70% 0px 70% 0px" });
      panels.forEach(function (el) { io.observe(el); });
    } else {
      active = panels.slice();
    }

    /* CSS defaults to the settled state so a failed script leaves the page
       perfectly readable; claim the real values now that we are running. */
    panels.forEach(applyPanel);
    applyHero();
    applyProgress();

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });

    /* Pointer parallax: hero only, fine pointers only, and throttled to the
       same rAF as everything else. Skipped entirely on touch. */
    if (hero && window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      var mFrame = 0, mx = 0, my = 0;
      window.addEventListener("mousemove", function (e) {
        mx = (e.clientX / (window.innerWidth || 1)) * 2 - 1;
        my = (e.clientY / (window.innerHeight || 1)) * 2 - 1;
        if (mFrame || reduced()) return;
        mFrame = window.requestAnimationFrame(function () {
          mFrame = 0;
          hero.style.setProperty("--mx", mx.toFixed(3));
          hero.style.setProperty("--my", my.toFixed(3));
        });
      }, { passive: true });
    }
  }

  document.addEventListener("ae:motion", function () {
    if (reduced()) {
      if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      settle();
    } else {
      active = panels.slice();
      request();
    }
  });
})();
