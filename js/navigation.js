/* Aarahan Enterprises: static presentation and accessible navigation. */
(function () {
  "use strict";
  var html = document.documentElement;
  html.classList.add("js", "static-site", "rm", "no-loader", "is-ready");
  var store = {
    get: function (k, session) { try { return (session ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    set: function (k, value, session) { try { (session ? sessionStorage : localStorage).setItem(k, value); } catch (e) {} }
  };
  // Compatibility helpers for the existing form and static component modules.
  // An old saved "full" preference must never reactivate motion.
  window.AE = {
    store: store,
    reduced: function () { return true; },
    finePointer: function () { return false; },
    isSmall: function () { return innerWidth < 760; },
    clamp: function (v, a, b) { return Math.min(b, Math.max(a, v)); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    setMotion: function () {
      html.classList.add("rm");
      document.dispatchEvent(new CustomEvent("ae:motion", { detail: { reduced: true } }));
    }
  };
  var fonts = document.createElement("link");
  fonts.rel = "stylesheet";
  fonts.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
  document.head.appendChild(fonts);
  if (/^https?:$/.test(location.protocol)) {
    var manifest = document.createElement("link");
    manifest.rel = "manifest"; manifest.href = "site.webmanifest";
    document.head.appendChild(manifest);
  }
  document.addEventListener("DOMContentLoaded", initMenu);
  function initMenu() {
    var btn = document.querySelector("[data-menu-btn]");
    var menu = document.querySelector("[data-menu]");
    var header = document.querySelector("[data-header]");
    if (!btn || !menu) return;
    var links = menu.querySelectorAll("a");
    var focusTimer = null;

    function setOpen(open) {
      window.clearTimeout(focusTimer);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
      header.classList.toggle("menu-open", open);
      document.body.style.overflow = open ? "hidden" : "";
      if (open) {
        menu.removeAttribute("inert");
        focusTimer = window.setTimeout(function () { if (menu.classList.contains('is-open') && links[0]) links[0].focus({ preventScroll: true }); }, 0);
      } else {
        menu.setAttribute("inert", "");
      }
    }

    btn.addEventListener("click", function () { setOpen(btn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) { setOpen(false); btn.focus(); }
      if (e.key === 'Tab' && menu.classList.contains('is-open')) {
        var focusable = [btn].concat(Array.prototype.slice.call(menu.querySelectorAll('a[href], button:not([disabled])')));
        var index = focusable.indexOf(document.activeElement);
        if (e.shiftKey && index <= 0) { e.preventDefault(); focusable[focusable.length - 1].focus(); }
        else if (!e.shiftKey && index === focusable.length - 1) { e.preventDefault(); btn.focus(); }
      }
    });
    links.forEach(function (link) { link.addEventListener('click', function () { setOpen(false); }); });
    // Keep focus inside the header + menu while open
    document.addEventListener("focusin", function (e) {
      if (!menu.classList.contains("is-open")) return;
      if (!menu.contains(e.target) && e.target !== btn) btn.focus();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1180 && menu.classList.contains("is-open")) setOpen(false);
    });
  }


})();
