/* =========================================================================
   ARAHAN ENTERPRISES — 3D SOCIAL TILES (FOOTER ONLY)
   Self-contained: creates no globals and touches nothing outside the
   footer's .aarahan-social-* block.
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     ↓↓↓  SOCIAL LINK CONFIG — THE ONLY PART YOU NEED TO EDIT  ↓↓↓

     Paste Arahan Enterprises' real profile URLs between the quotes.
     Edit this one file only; every page picks the links up automatically.

       facebook  : e.g. "https://www.facebook.com/<page-name>"
       whatsapp  : e.g. "https://wa.me/91XXXXXXXXXX"   (business WhatsApp)
       google    : e.g. "https://g.page/<business>"    (Google Business Profile)
       instagram : e.g. "https://www.instagram.com/<handle>"

     A tile is shown ONLY when its URL is filled in. Leave a value empty
     and that tile is removed, so the footer never shows a dead link.
     If all four are empty the whole block is removed and the footer
     looks exactly as it did before.
     ===================================================================== */
  var AARAHAN_SOCIAL_LINKS = {
    facebook: "",
    whatsapp: "",
    google: "",
    instagram: ""
  };
  /* =======================  END OF CONFIG  =============================

     PREVIEW BEHAVIOUR
     While you are viewing the site locally (localhost / 127.0.0.1 or a
     file:// double-click), tiles without a URL are still drawn so the
     design can be reviewed — they are inert, not clickable, and marked
     "Link pending". On the real domain those tiles stay hidden, so the
     live site never shows a dead link.
     ===================================================================== */

  function aarahanSocialMotionOff() {
    return document.documentElement.classList.contains("rm") ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function aarahanSocialFinePointer() {
    return window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }
  function aarahanSocialValidUrl(url) {
    return typeof url === "string" && /^https?:\/\/\S+$/i.test(url.trim());
  }
  /* Local preview = localhost, 127.0.0.1, *.local or an opened file:// page */
  function aarahanSocialLocalPreview() {
    var h = window.location.hostname;
    return window.location.protocol === "file:" || h === "localhost" ||
      h === "127.0.0.1" || h === "::1" || /\.local$/i.test(h);
  }

  /* Subtle pointer-driven tilt, desktop only */
  function handleArahanSocialTilt(tile) {
    if (!aarahanSocialFinePointer()) return;
    var raf = null, ry = 0, rx = 0;
    function apply() {
      raf = null;
      tile.style.setProperty("--ast-ry", ry.toFixed(2) + "deg");
      tile.style.setProperty("--ast-rx", rx.toFixed(2) + "deg");
    }
    tile.addEventListener("pointermove", function (e) {
      if (aarahanSocialMotionOff()) return;
      var r = tile.getBoundingClientRect();
      ry = ((e.clientX - r.left) / r.width - 0.5) * 16;   /* left / right  */
      rx = (0.5 - (e.clientY - r.top) / r.height) * 12;   /* up   / down   */
      if (!raf) raf = window.requestAnimationFrame(apply);
    });
    tile.addEventListener("pointerleave", function () {
      tile.style.removeProperty("--ast-ry");
      tile.style.removeProperty("--ast-rx");
    });
  }

  function initArahanSocialTiles() {
    var root = document.querySelector("[data-aarahan-social-root]");
    if (!root) return;
    var grid = root.querySelector(".aarahan-social-grid");
    var tiles = Array.prototype.slice.call(root.querySelectorAll("[data-aarahan-social]"));
    var preview = aarahanSocialLocalPreview();
    var live = 0;
    var pending = 0;

    tiles.forEach(function (tile) {
      var key = tile.getAttribute("data-aarahan-social");
      var url = AARAHAN_SOCIAL_LINKS[key];
      var item = tile.closest("li");
      if (!aarahanSocialValidUrl(url)) {
        if (!preview) {
          /* Live site: remove the tile rather than link nowhere */
          if (item && item.parentNode) item.parentNode.removeChild(item);
          return;
        }
        /* Local preview: show the tile, inert and clearly marked */
        tile.classList.add("aarahan-social-tile--pending");
        tile.setAttribute("aria-disabled", "true");
        tile.setAttribute("title", "Link pending — add the URL in js/aarahan-social.js");
        tile.removeAttribute("href");
        handleArahanSocialTilt(tile);
        pending += 1;
        return;
      }
      tile.setAttribute("href", url.trim());
      tile.setAttribute("target", "_blank");
      tile.setAttribute("rel", "noopener noreferrer");
      handleArahanSocialTilt(tile);
      live += 1;
    });

    if (!live && !pending) {
      /* Nothing configured yet: leave the footer exactly as it was */
      if (root.parentNode) root.parentNode.removeChild(root);
      return;
    }

    root.removeAttribute("hidden");
    if (pending) {
      root.classList.add("aarahan-social-footer--preview");
      if (window.console && window.console.info) {
        window.console.info(
          "Arahan social tiles: " + pending + " tile(s) have no URL yet and are shown " +
          "in local preview only. Add the real links in js/aarahan-social.js."
        );
      }
    }

    /* Staggered entrance, once */
    if (aarahanSocialMotionOff() || !("IntersectionObserver" in window)) {
      grid.classList.add("is-in");
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { grid.classList.add("is-in"); io.disconnect(); }
      });
    }, { threshold: 0.25 });
    io.observe(grid);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initArahanSocialTiles);
  } else {
    initArahanSocialTiles();
  }
})();
