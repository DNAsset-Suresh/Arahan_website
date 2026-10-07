/* ==========================================================================
   Arahan Enterprises — animations.js
   Generic, reusable interaction + scroll modules:
   split headings, scroll reveal, counters, 3D tilt, magnetic buttons,
   blueprint-grid spotlight and light parallax.
   Every module degrades to a static state under reduced motion.
   ========================================================================== */
(function () {
  "use strict";

  var AE = window.AE;

  /* ---------- Split headings into masked words ---------- */
  function splitText(el) {
    if (el.classList.contains("is-split")) return;
    var wi = 0;
    // Walk text nodes so <br>, <em> etc. are preserved
    (function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span");
            w.className = "w";
            var inner = document.createElement("span");
            inner.className = "w__i";
            inner.style.setProperty("--wi", wi++);
            inner.textContent = p;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    })(el);
    el.classList.add("is-split");
  }

  /* ---------- Animated number counters ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var from = parseFloat(el.getAttribute("data-count-from") || "0");
    if (isNaN(target)) return;
    if (AE.reduced()) { el.textContent = target; return; }
    var dur = 1800;
    var start = null;
    function frame(t) {
      if (AE.reduced()) { el.textContent = target; return; }
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur);
      var eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
      el.textContent = Math.round(from + (target - from) * eased);
      if (p < 1) window.requestAnimationFrame(frame);
    }
    el.textContent = from;
    window.requestAnimationFrame(frame);
  }

  /* ---------- Scroll reveal via IntersectionObserver ---------- */
  function initReveal() {
    var splits = document.querySelectorAll("[data-split]");
    splits.forEach(splitText);

    // Rhythm within existing grids, without delaying an entire section.
    document.querySelectorAll('.cap-grid, .sector-grid, .svc-grid, .vgrid, .cgrid, .icard-grid').forEach(function (grid) {
      Array.prototype.forEach.call(grid.children, function (card, i) {
        if (card.hasAttribute('data-reveal') && !card.hasAttribute('data-delay')) {
          card.style.setProperty('--reveal-step', String((i % 3) * 0.65));
        }
      });
    });

    var targets = document.querySelectorAll(
      "[data-reveal], [data-split], [data-count], [data-progress-line], .stat, .shield, .stack, .figure"
    );

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-in"); if (el.hasAttribute("data-count")) countUp(el); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("is-in");
        if (el.hasAttribute("data-count")) countUp(el);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3D tilt ----------
     Pointer position inside the card maps to a small rotateX/rotateY.
     A glare layer follows the pointer when data-tilt-glare is present. */
  function initTilt() {
    if (!AE.finePointer()) return;
    document.querySelectorAll("[data-tilt], .sector-card").forEach(function (el) {
      var max = Math.min(5, parseFloat(el.getAttribute("data-tilt-max") || "5"));
      var glare = null;
      if (el.hasAttribute("data-tilt-glare")) {
        glare = document.createElement("span");
        glare.className = "tilt-glare";
        glare.setAttribute("aria-hidden", "true");
        el.appendChild(glare);
      }
      var raf = null, rx = 0, ry = 0, currentX = 0, currentY = 0, inside = false, lastTime = 0;

      function apply(time) {
        raf = null;
        if (AE.reduced()) return;
        var step = 1 - Math.exp(-Math.min(40, lastTime ? time - lastTime : 16) / 75);
        lastTime = time;
        currentX += (rx - currentX) * step;
        currentY += (ry - currentY) * step;
        el.style.transform = "perspective(1200px) rotateX(" + currentX.toFixed(3) + "deg) rotateY(" + currentY.toFixed(3) + "deg)";
        if (Math.abs(rx - currentX) + Math.abs(ry - currentY) > 0.015) raf = requestAnimationFrame(apply);
        else {
          lastTime = 0;
          if (!inside) reset();
        }
      }
      function reset() {
        if (raf) cancelAnimationFrame(raf);
        raf = null; lastTime = 0; rx = ry = currentX = currentY = 0;
        el.style.transform = el.style.transition = el.style.willChange = '';
      }
      el.addEventListener("pointerenter", function () {
        if (AE.reduced()) return;
        inside = true;
        el.style.transition = "none";
        el.style.willChange = "transform";
      });
      el.addEventListener("pointermove", function (e) {
        if (AE.reduced()) return;
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        ry = (px - 0.5) * 2 * max;
        rx = (0.5 - py) * 2 * max;
        if (glare) {
          el.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
          el.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
        }
        if (!raf) raf = window.requestAnimationFrame(apply);
      });
      el.addEventListener("pointerleave", function () {
        inside = false; rx = ry = 0;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      document.addEventListener('visibilitychange', function () { if (document.hidden) reset(); });
      document.addEventListener("ae:motion", function () {
        if (!AE.reduced()) return;
        reset();
      });
    });
  }

  /* ---------- Magnetic buttons ----------
     Uses the independent `translate` property so it never fights
     with transform-based reveal animations. */
  function initMagnetic() {
    if (!AE.finePointer()) return;
    document.querySelectorAll(".magnetic").forEach(function (el) {
      var strength = 0.12;
      el.addEventListener("pointermove", function (e) {
        if (AE.reduced()) return;
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.translate = AE.clamp(dx * strength, -6, 6).toFixed(1) + "px " + AE.clamp(dy * strength, -3, 3).toFixed(1) + "px";
      });
      el.addEventListener("pointerleave", function () { el.style.translate = ""; });
      el.addEventListener('focus', function () { el.style.translate = ''; });
      document.addEventListener('ae:motion', function () { if (AE.reduced()) el.style.translate = ''; });
    });
  }

  /* ---------- Blueprint grid spotlight (subtle cursor interaction) ---------- */
  function initSpotlight() {
    if (!AE.finePointer()) return;
    document.querySelectorAll("[data-spotlight]").forEach(function (el) {
      var raf = null, x = 0, y = 0;
      el.addEventListener("pointermove", function (e) {
        if (AE.reduced()) return;
        var r = el.getBoundingClientRect();
        x = e.clientX - r.left; y = e.clientY - r.top;
        if (raf) return;
        raf = window.requestAnimationFrame(function () {
          raf = null;
          if (AE.reduced()) return;
          el.style.setProperty("--mx", x + "px");
          el.style.setProperty("--my", y + "px");
        });
      });
      el.addEventListener("pointerenter", function () { if (!AE.reduced()) el.classList.add("is-lit"); });
      el.addEventListener("pointerleave", function () { el.classList.remove("is-lit"); });
      document.addEventListener('ae:motion', function () { if (AE.reduced()) el.classList.remove('is-lit'); });
    });
  }

  /* ---------- Light parallax for hero visuals ---------- */
  function initParallax() {
    var items = document.querySelectorAll(".page-hero__visual, .hero__inner");
    if (!items.length) return;
    AE.onScroll(function (y) {
      if (AE.reduced() || y > window.innerHeight * 1.2) return;
      items.forEach(function (el) {
        if (el.closest(".ae-hero-depth")) { el.style.translate = ""; return; }
        var f = el.classList.contains("hero__inner") ? 0.12 : -0.08;
        el.style.translate = "0 " + (y * f).toFixed(1) + "px";
      });
    });
  }

  /* ---------- Hero scroll cue retires once the visitor scrolls ---------- */
  function initHeroHud() {
    var hero = document.querySelector("[data-hero]");
    if (!hero || !hero.querySelector(".hero__hud")) return;
    AE.onScroll(function (y) { hero.classList.toggle("is-past", y > 40); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initTilt();
    initMagnetic();
    initSpotlight();
    initParallax();
    initHeroHud();
  });

  window.AE && (window.AE.splitText = splitText);
})();
