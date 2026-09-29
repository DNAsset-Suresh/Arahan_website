/* ==========================================================================
   Arahan Enterprises — navigation.js
   Loaded synchronously in <head> (tiny) so that the `js`, `rm` (reduced
   motion) and `no-loader` classes are on <html> before first paint.
   Also defines the shared `window.AE` helpers used by the other scripts.
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  html.classList.add("js");

  /* ---------- Shared helpers ---------- */
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var store = {
    get: function (k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    set: function (k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  function applyMotionPref() {
    var pref = store.get("ae-motion");
    var reduce = pref === "reduced" || (pref !== "full" && mq.matches);
    html.classList.toggle("rm", reduce);
    return reduce;
  }
  applyMotionPref();

  // Load web fonts without blocking first paint (a <noscript> fallback is in the page)
  var fonts = document.createElement("link");
  fonts.rel = "stylesheet";
  fonts.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
  document.head.appendChild(fonts);

  // The web manifest cannot be fetched from file:// (CORS), so attach it
  // only when the site is served over http(s). Keeps the console clean
  // when index.html is opened straight from disk.
  if (location.protocol === "http:" || location.protocol === "https:") {
    var man = document.createElement("link");
    man.rel = "manifest";
    man.href = "site.webmanifest";
    document.head.appendChild(man);
  }

  // Skip the intro loader after the first page of a session
  if (store.get("ae-loaded", true)) html.classList.add("no-loader");

  var scrollFns = [];
  var ticking = false;
  function runScroll() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop;
    for (var i = 0; i < scrollFns.length; i++) scrollFns[i](y);
  }

  window.AE = {
    store: store,
    reduced: function () { return html.classList.contains("rm"); },
    finePointer: function () { return window.matchMedia("(hover: hover) and (pointer: fine)").matches; },
    isSmall: function () { return window.innerWidth < 760; },
    clamp: function (v, a, b) { return Math.min(b, Math.max(a, v)); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    /* Single rAF-throttled scroll dispatcher shared by every module */
    onScroll: function (fn) {
      scrollFns.push(fn);
      fn(window.pageYOffset || 0);
    },
    setMotion: function (reduced) {
      store.set("ae-motion", reduced ? "reduced" : "full");
      applyMotionPref();
      document.dispatchEvent(new CustomEvent("ae:motion", { detail: { reduced: reduced } }));
    }
  };

  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(runScroll); }
  }, { passive: true });

  if (mq.addEventListener) mq.addEventListener("change", applyMotionPref);

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    initHeader();
    initMenu();
    initProgress();
    initTransitions();
  }

  /* ---------- Header: transparent over hero, solid on scroll, hides on scroll down ---------- */
  function initHeader() {
    var header = document.querySelector("[data-header]");
    if (!header) return;
    var lastY = 0;
    AE.onScroll(function (y) {
      header.classList.toggle("is-scrolled", y > 40);
      var goingDown = y > lastY + 4;
      var goingUp = y < lastY - 4;
      if (goingDown && y > 420 && !header.classList.contains("menu-open") && !header.contains(document.activeElement)) {
        header.classList.add("is-hidden");
      } else if (goingUp || y < 420) {
        header.classList.remove("is-hidden");
      }
      if (goingDown || goingUp) lastY = y;
    });
    // Keyboard users tabbing into the header should always see it
    header.addEventListener("focusin", function () { header.classList.remove("is-hidden"); });
  }

  /* ---------- Mobile / tablet overlay menu ---------- */
  function initMenu() {
    var btn = document.querySelector("[data-menu-btn]");
    var menu = document.querySelector("[data-menu]");
    var header = document.querySelector("[data-header]");
    if (!btn || !menu) return;
    var links = menu.querySelectorAll("a");

    function setOpen(open) {
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
      header.classList.toggle("menu-open", open);
      document.body.style.overflow = open ? "hidden" : "";
      if (open) {
        menu.removeAttribute("inert");
        for (var i = 0; i < links.length; i++) links[i].style.transitionDelay = (0.18 + i * 0.045) + "s";
        window.setTimeout(function () { if (links[0]) links[0].focus({ preventScroll: true }); }, 350);
      } else {
        menu.setAttribute("inert", "");
        for (var j = 0; j < links.length; j++) links[j].style.transitionDelay = "0s";
      }
    }

    btn.addEventListener("click", function () { setOpen(btn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) { setOpen(false); btn.focus(); }
    });
    // Keep focus inside the header + menu while open
    document.addEventListener("focusin", function (e) {
      if (!menu.classList.contains("is-open")) return;
      if (!menu.contains(e.target) && e.target !== btn) btn.focus();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1180 && menu.classList.contains("is-open")) setOpen(false);
    });
  }

  /* ---------- Reading progress bar ---------- */
  function initProgress() {
    var bar = document.querySelector("[data-progress]");
    if (!bar) return;
    AE.onScroll(function (y) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
    });
  }

  /* ---------- Soft page transitions between internal pages ---------- */
  function initTransitions() {
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || /^(mailto|tel|https?):/i.test(href)) return;
      if (!/\.html(#.*)?$/i.test(href)) return;
      if (AE.reduced()) return;
      e.preventDefault();
      html.classList.add("is-leaving");
      window.setTimeout(function () { window.location.href = href; }, 260);
    });
    // Restore state when returning via the back/forward cache
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) html.classList.remove("is-leaving");
    });
  }
})();
