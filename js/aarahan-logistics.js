/* =========================================================================
   ARAHAN ENTERPRISES — TAMIL NADU → GUJARAT LOGISTICS ROUTE
   Projects page only. Self-contained: no globals, no dependencies.

   One requestAnimationFrame loop drives a four-stage cycle:
     draw → transit → arrived → hold, then it repeats.
   The truck is placed with SVGPathElement.getPointAtLength(), so it sits
   exactly on the route at every frame and on every screen size. Only
   `transform`, `opacity` and stroke-dashoffset are animated.
   ========================================================================= */
(function () {
  "use strict";

  var root = document.querySelector("[data-aarahan-logistics]");
  if (!root) return;

  var html = document.documentElement;
  var routes = Array.prototype.slice.call(root.querySelectorAll("[data-aarahan-route]"));
  if (!routes.length) return;

  /* Stage durations in milliseconds */
  var DRAW = 1300;      /* route draws from Tamil Nadu outward */
  var PAUSE = 420;      /* beat before departure */
  var TRANSIT = 5200;   /* the journey itself — deliberately unhurried */
  var ARRIVED = 1900;   /* hold on arrival */
  var RESET = 700;      /* fade before looping */
  var CYCLE = DRAW + PAUSE + TRANSIT + ARRIVED + RESET;

  function reducedMotion() { return html.classList.contains("rm"); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* ---- Measure each route once (and again on resize) ---- */
  var views = routes.map(function (svg) {
    return {
      svg: svg,
      path: svg.querySelector("[data-aarahan-path]"),
      line: svg.querySelector(".aarahan-route__line"),
      trail: svg.querySelector(".aarahan-route__trail"),
      truck: svg.querySelector("[data-aarahan-truck]"),
      waypoints: Array.prototype.slice.call(svg.querySelectorAll(".aarahan-waypoint")),
      vertical: svg.classList.contains("aarahan-route__v"),
      len: 0
    };
  });

  function measure() {
    views.forEach(function (v) {
      if (!v.path || typeof v.path.getTotalLength !== "function") return;
      v.len = v.path.getTotalLength();
      if (v.line) { v.line.style.strokeDasharray = v.len; v.line.style.strokeDashoffset = v.len; }
      if (v.trail) { v.trail.style.strokeDasharray = "36 " + (v.len + 36); }
      /* Waypoints sit on the path itself, so they can never drift off it */
      v.waypoints.forEach(function (dot, i) {
        var p = v.path.getPointAtLength(v.len * ((i + 1) / (v.waypoints.length + 1)));
        dot.setAttribute("cx", p.x);
        dot.setAttribute("cy", p.y);
      });
      placeTruck(v, 0);
    });
  }

  /* Position + orient the truck at a fraction of the route */
  function placeTruck(v, progress) {
    if (!v.truck || !v.len) return;
    var d = v.len * progress;
    var p = v.path.getPointAtLength(d);
    var ahead = v.path.getPointAtLength(Math.min(v.len, d + 1.5));
    var angle = Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180 / Math.PI;
    /* A side-view truck reads badly upside down, so the vertical route
       keeps it near-upright with just a hint of lean. */
    if (v.vertical) angle = Math.max(-14, Math.min(14, angle - 90));
    /* scale keeps the truck legible against each route's own viewBox */
    var scale = v.vertical ? 0.95 : 1.25;
    v.truck.setAttribute("transform",
      "translate(" + p.x.toFixed(2) + "," + p.y.toFixed(2) + ") rotate(" + angle.toFixed(2) + ") scale(" + scale + ")");
  }

  function setStage(stage) {
    root.classList.toggle("is-drawing", stage === "draw");
    root.classList.toggle("is-running", stage === "transit");
    root.classList.toggle("is-arrived", stage === "arrived");
  }

  /* ---- Static completed state, used for reduced motion ---- */
  function showCompleted() {
    setStage("arrived");
    views.forEach(function (v) {
      if (v.line) v.line.style.strokeDashoffset = 0;
      if (v.trail) v.trail.style.opacity = 0;
      placeTruck(v, 1);
    });
  }

  /* ---- The loop ---- */
  var startedAt = 0;
  var rafId = null;
  var visible = false;

  function frame(now) {
    rafId = null;
    if (!visible) return;
    if (reducedMotion()) { showCompleted(); return; }
    if (!startedAt) startedAt = now;

    var t = (now - startedAt) % CYCLE;
    var stage, drawP = 1, travelP = 0, fade = 1;

    if (t < DRAW) {
      stage = "draw";
      drawP = t / DRAW;
      travelP = 0;
    } else if (t < DRAW + PAUSE) {
      stage = "draw";
    } else if (t < DRAW + PAUSE + TRANSIT) {
      stage = "transit";
      travelP = easeInOut((t - DRAW - PAUSE) / TRANSIT);
    } else if (t < DRAW + PAUSE + TRANSIT + ARRIVED) {
      stage = "arrived";
      travelP = 1;
    } else {
      stage = "reset";
      travelP = 1;
      fade = 1 - (t - DRAW - PAUSE - TRANSIT - ARRIVED) / RESET;
    }
    setStage(stage);

    views.forEach(function (v) {
      if (!v.len) return;
      if (v.line) {
        v.line.style.strokeDashoffset = v.len * (1 - drawP);
        v.line.style.opacity = fade;
      }
      if (v.trail) {
        /* Bright segment trailing just behind the truck */
        var show = stage === "transit";
        v.trail.style.opacity = show ? 0.9 * fade : 0;
        /* dasharray is "36 rest", so this offset parks the 36-unit dash
           immediately behind the truck's current position */
        v.trail.style.strokeDashoffset = -(v.len * travelP - 36);
      }
      if (v.truck) v.truck.style.opacity = stage === "draw" ? 0.35 : fade;
      placeTruck(v, travelP);
    });

    kick();
  }

  function kick() { if (rafId === null && visible) rafId = window.requestAnimationFrame(frame); }
  function stop() { if (rafId !== null) { window.cancelAnimationFrame(rafId); rafId = null; } }

  function initArahanLogistics() {
    measure();

    if (reducedMotion()) { showCompleted(); }

    /* Only run while the block is on screen — never from page load alone */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          visible = entry.isIntersecting;
          if (visible) { startedAt = 0; kick(); } else { stop(); }
        });
      }, { threshold: 0.2 }).observe(root);
    } else {
      visible = true;
      kick();
    }

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { measure(); startedAt = 0; }, 200);
    });

    /* The footer "Reduce motion" toggle switches behaviour immediately */
    document.addEventListener("ae:motion", function () {
      if (reducedMotion()) { stop(); showCompleted(); } else { startedAt = 0; kick(); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initArahanLogistics);
  } else {
    initArahanLogistics();
  }
})();
