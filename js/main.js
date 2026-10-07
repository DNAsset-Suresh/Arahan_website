/* ==========================================================================
   Arahan Enterprises — main.js
   Loader, footer utilities and page-specific interactive components:
   capability stack (About), values colonnade (About), service ecosystem
   (Services), infrastructure explorer (Civil), execution timeline (Method)
   and the enquiry form (Contact).
   ========================================================================== */
(function () {
  "use strict";

  var AE = window.AE;
  var html = document.documentElement;

  /* ---------- Loader ---------- */
  function initLoader() {
    var loader = document.querySelector("[data-loader]");
    function ready() {
      html.classList.add("is-ready");
      document.dispatchEvent(new CustomEvent("ae:ready"));
    }
    if (!loader || html.classList.contains("no-loader") || AE.reduced()) {
      if (loader) loader.remove();
      ready();
      return;
    }
    var t0 = performance.now();
    var MIN = 1500; // long enough for the wireframe to draw, never longer than needed
    function done() {
      var wait = Math.max(0, MIN - (performance.now() - t0));
      window.setTimeout(function () {
        loader.classList.add("is-done");
        AE.store.set("ae-loaded", "1", true);
        ready();
        window.setTimeout(function () { loader.remove(); }, 800);
      }, wait);
    }
    if (document.readyState === "complete") done();
    else window.addEventListener("load", done);
    // Never hold the page hostage to a slow asset
    window.setTimeout(function () { if (!html.classList.contains("is-ready")) done(); }, 3200);
  }

  /* ---------- Footer: year + motion toggle ---------- */
  function initFooter() {
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    var t = document.querySelector("[data-motion-toggle]");
    if (!t) return;
    function sync() { t.setAttribute("aria-pressed", String(AE.reduced())); }
    sync();
    t.addEventListener("click", function () { AE.setMotion(!AE.reduced()); sync(); });
  }

  /* ---------- About: capability stack ----------
     Buttons select a layer; the matching 3D plate lifts. Auto-cycles
     until the visitor interacts. Mouse nudges the isometric view. */
  function initStack() {
    var root = document.querySelector("[data-stack]");
    if (!root) return;
    var world = root.querySelector("[data-stack-world]");
    var stage = root.querySelector("[data-stack-stage]");
    var btns = Array.prototype.slice.call(root.querySelectorAll("[data-layer-btn]"));
    var plates = root.querySelectorAll("[data-layer]");
    var idx = 0, timer = null, userTook = false;

    function select(i) {
      idx = i;
      var key = btns[i].getAttribute("data-layer-btn");
      btns.forEach(function (b, j) { b.setAttribute("aria-pressed", String(j === i)); });
      plates.forEach(function (p) { p.classList.toggle("is-active", p.getAttribute("data-layer") === key); });
      root.classList.add("has-active");
    }
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () { userTook = true; stop(); select(i); });
      b.addEventListener("mouseenter", function () { if (AE.finePointer()) { userTook = true; stop(); select(i); } });
    });
    function stop() { if (timer) { window.clearInterval(timer); timer = null; } }
    function start() {
      if (userTook || AE.reduced() || timer) return;
      timer = window.setInterval(function () { select((idx + 1) % btns.length); }, 3200);
    }
    select(0);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
      }, { threshold: 0.3 }).observe(root);
    }

    if (AE.finePointer()) {
      stage.parentElement.addEventListener("pointermove", function (e) {
        if (AE.reduced()) return;
        var r = root.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        world.style.setProperty("--rz", (px * 16).toFixed(2) + "deg");
        world.style.setProperty("--rx", (py * -10).toFixed(2) + "deg");
      });
      root.addEventListener("pointerleave", function () {
        world.style.setProperty("--rz", "0deg");
        world.style.setProperty("--rx", "0deg");
      });
    }
  }

  /* ---------- About: values colonnade responds to the pointer ---------- */
  function initColonnade() {
    var root = document.querySelector("[data-colonnade]");
    if (!root || !AE.finePointer()) return;
    var row = root.querySelector(".colonnade__row");
    root.addEventListener("pointermove", function (e) {
      if (AE.reduced()) return;
      var r = root.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      row.style.setProperty("--ry", (px * 14).toFixed(2) + "deg");
    });
    root.addEventListener("pointerleave", function () { row.style.setProperty("--ry", "0deg"); });
  }

  /* ---------- Services: ecosystem hub ---------- */
  function initEco() {
    var root = document.querySelector("[data-eco-root]");
    if (!root) return;
    var detail = root.querySelector("[data-eco-detail]");
    var initial = detail.innerHTML;
    var nodes = root.querySelectorAll(".eco__node");
    var current = -1;

    function show(i) {
      if (i === current) return;
      current = i;
      nodes.forEach(function (n, j) { n.classList.toggle("is-active", j === i); });
      var tpl = i >= 0 ? root.querySelector('template[data-eco-item="' + i + '"]') : null;
      detail.innerHTML = tpl ? tpl.innerHTML : initial;
      detail.classList.remove("is-swap");
      void detail.offsetWidth; // restart the swap animation
      detail.classList.add("is-swap");
    }
    root.querySelectorAll("[data-eco]").forEach(function (b) {
      var i = parseInt(b.getAttribute("data-eco"), 10);
      b.addEventListener("click", function () { show(current === i ? -1 : i); });
      b.addEventListener("mouseenter", function () { if (AE.finePointer()) show(i); });
      b.addEventListener("focus", function () { show(i); });
    });
  }

  /* ---------- Civil: infrastructure explorer (accessible tabs) ---------- */
  function initExplorer() {
    var root = document.querySelector("[data-cx]");
    if (!root) return;
    var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-cx-tab]"));
    var panels = root.querySelectorAll("[data-cx-panel]");
    var chosen = false; // set once the visitor picks a tab themselves

    function activate(i, focus) {
      tabs.forEach(function (t, j) {
        var on = j === i;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      var key = tabs[i].getAttribute("data-cx-tab");
      panels.forEach(function (p) {
        var on = p.getAttribute("data-cx-panel") === key;
        p.hidden = !on;
        p.classList.remove("is-drawn");
        if (on) { void p.offsetWidth; p.classList.add("is-drawn"); }
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { chosen = true; activate(i); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") n = (i + 1) % tabs.length;
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === "Home") n = 0;
        if (e.key === "End") n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); chosen = true; activate(n, true); }
      });
    });
    // Draw the first drawing when the explorer scrolls into view
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { if (!chosen) activate(0); io.disconnect(); }
      }, { threshold: 0.25 });
      io.observe(root);
    } else activate(0);
  }

  /* ---------- Method: scroll-driven execution timeline ----------
     Desktop: the section is pinned and the track translates horizontally.
     Smaller screens / reduced motion: a vertical timeline whose
     progress line fills as you scroll. */
  function initTimeline() {
    var sec = document.querySelector("[data-timeline]");
    if (!sec) return;
    var track = sec.querySelector("[data-tl-track]");
    var bar = sec.querySelector("[data-tl-bar]");
    var steps = sec.querySelectorAll("[data-tl-step]");
    var counter = sec.querySelector("[data-tl-current]");
    var mode = "";

    function setMode() {
      var horizontal = window.innerWidth >= 1025 && window.innerHeight >= 620 && !AE.reduced();
      var next = horizontal ? "h" : "v";
      if (next === mode) return;
      mode = next;
      sec.classList.toggle("tl--h", horizontal);
      sec.classList.toggle("tl--v", !horizontal);
      track.style.transform = "";
      update(window.pageYOffset);
    }

    function setActive(p) {
      var n = Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999 + 0.15));
      steps.forEach(function (s, i) { s.classList.toggle("is-active", i <= n); });
      if (counter) counter.textContent = "0" + (n + 1);
    }

    function update() {
      var r = sec.getBoundingClientRect();
      var vh = window.innerHeight;
      var p;
      if (mode === "h") {
        var total = sec.offsetHeight - vh;
        p = AE.clamp(-r.top / total, 0, 1);
        var dist = track.scrollWidth - window.innerWidth;
        track.style.transform = "translate3d(" + (-p * Math.max(0, dist)).toFixed(1) + "px,0,0)";
      } else {
        p = AE.clamp((vh * 0.65 - r.top) / (r.height * 0.85), 0, 1);
      }
      bar.parentElement.parentElement.style.setProperty("--tp", p.toFixed(4));
      bar.style.setProperty("--tp", p.toFixed(4));
      setActive(p);
    }

    setMode();
    AE.onScroll(update);
    window.addEventListener("resize", function () { setMode(); update(); });
    document.addEventListener("ae:motion", function () { setMode(); update(); });
  }

  /* ---------- Contact: server-side enquiry API ---------- */
  function initEnquiry() {
    var form = document.querySelector("[data-enquiry]");
    if (!form) return;
    var status = form.querySelector("[data-form-status]");
    var submitBtn = form.querySelector('button[type="submit"]');
    var EMAIL = "arahanenterprises14@gmail.com";
    var PHONE = "+91 93819 40980";
    var ENDPOINT = "/api/contact";
    var sending = false;          /* blocks a second submit while one is in flight */

    function setStatus(kind, text) {
      status.className = "form__status" + (kind ? " " + kind : "");
      status.textContent = text;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      /* A double-click must not produce two enquiries. The button is also
         disabled below; this covers Enter-key submits that bypass it. */
      if (sending) return;

      var ok = true;
      var limits = { name: 120, company: 160, phone: 32, email: 254, location: 160, message: 5000 };
      Object.keys(limits).forEach(function (key) {
        form.elements[key].maxLength = limits[key];
      });
      form.querySelectorAll("[required]").forEach(function (f) {
        var bad = !f.value.trim();
        f.closest(".field").classList.toggle("is-invalid", bad);
        f.setAttribute("aria-invalid", String(bad));
        if (bad && ok) { f.focus(); ok = false; }
      });
      var email = form.elements.email;
      if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        email.closest(".field").classList.add("is-invalid");
        email.setAttribute("aria-invalid", "true");
        if (ok) email.focus();
        ok = false;
      }
      var message = form.elements.message;
      Object.keys(limits).forEach(function (key) {
        var field = form.elements[key];
        var value = field.value.trim();
        var bad = value.length > limits[key] ||
          (key === "name" && value.length < 2) ||
          (key === "phone" && value.replace(/\D/g, "").length < 6);
        if (bad) {
          field.closest(".field").classList.add("is-invalid");
          field.setAttribute("aria-invalid", "true");
          if (ok) field.focus();
          ok = false;
        }
      });
      if (ok && message.value.trim() && message.value.trim().length < 5) {
        message.closest(".field").classList.add("is-invalid");
        message.setAttribute("aria-invalid", "true");
        message.focus();
        ok = false;
      }
      if (!ok) {
        setStatus("is-error", "Please complete the highlighted fields.");
        return;
      }

      var v = function (n) { return (form.elements[n].value || "").trim(); };
      var payload = {
        name: v("name"), company: v("company"), phone: v("phone"),
        email: v("email"), type: v("type"), location: v("location"),
        message: v("message")
      };

      sending = true;
      if (submitBtn) submitBtn.disabled = true;
      /* No is-ok / is-error yet: aarahan-form.js reads those classes, and
         leaving both off keeps the button in its loading state. */
      setStatus("", "Sending…");

      /* SMTP performs DNS, TLS, authentication and two deliveries. Its
         normal latency can exceed 20s; don't abort before it can respond. */
      var controller = ("AbortController" in window) ? new AbortController() : null;
      var timeout = window.setTimeout(function () { if (controller) controller.abort(); }, 60000);

      window.fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { status: res.status, data: data };
        });
      }).then(function (r) {
        if (r.status === 200 && r.data && r.data.ok) {
          setStatus("is-ok", "Thank you for contacting Arahan Enterprises. Your enquiry has been received successfully. " +
            "Our team will contact you shortly.");
          form.reset();                       /* only ever on success */
          form.querySelectorAll(".field.has-value").forEach(function (f) {
            var c = f.querySelector("input, textarea");
            if (c) f.classList.remove("has-value");   /* re-float the labels */
          });
          return;
        }
        if (r.status === 422) {
          setStatus("is-error", "Please check the highlighted fields.");
          return;
        }
        if (r.status === 429) {
          setStatus("is-error", "Too many enquiries from this connection. " +
            "Please try again shortly, or call " + PHONE + ".");
          return;
        }
        /* Anything else: show the safe message the server sent, never details. */
        console.error("[enquiry] API returned HTTP " + r.status);
        if (r.status === 404 || r.status === 405 || r.status === 501) {
          setStatus("is-error", "The enquiry service is currently unavailable. Please contact " + EMAIL + " or call " + PHONE + ".");
          return;
        }
        setStatus("is-error", (r.data && r.data.error) ||
          "Something went wrong while submitting your enquiry. " +
          "Please try again or email " + EMAIL + ".");
      }).catch(function (err) {
        var timedOut = err && err.name === "AbortError";
        console.error("[enquiry] " + (timedOut ? "Request timed out waiting for delivery confirmation" : "Network request failed"));
        setStatus("is-error", timedOut
          ? "Delivery is taking longer than expected. We couldn't confirm whether your enquiry was received. Your details are still here; please contact " + EMAIL + " or call " + PHONE + "."
          : "We couldn't connect to the enquiry service. Your details are still here. Please try again or contact " + EMAIL + " or call " + PHONE + ".");
      }).then(function () {
        window.clearTimeout(timeout);
        sending = false;
        if (submitBtn) submitBtn.disabled = false;
      });
    });
    form.addEventListener("input", function (e) {
      var f = e.target.closest(".field");
      if (f && f.classList.contains("is-invalid") && e.target.value.trim()) {
        f.classList.remove("is-invalid");
        e.target.removeAttribute("aria-invalid");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLoader();
    initFooter();
    initStack();
    initColonnade();
    initEco();
    initExplorer();
    initTimeline();
    initEnquiry();
  });
})();
