/* =========================================================================
   ARAHAN ENTERPRISES — "DISCUSS YOUR PROJECT" FORM INTERACTIONS
   Contact page only. Presentation layer only.

   This script NEVER touches validation, the composed email or the
   destination address — all of that stays in js/main.js. It only:
     · tracks whether a field holds a value (for the floating label)
     · re-arms the shake animation on each rejected submit
     · mirrors the form's own status element into a button loading /
       success state
   It adds no globals and fails silently if anything is missing.
   ========================================================================= */
(function () {
  "use strict";

  var form = document.querySelector("[data-enquiry]");
  if (!form) return;

  var fields = Array.prototype.slice.call(form.querySelectorAll(".field"));
  var submitBtn = form.querySelector('button[type="submit"]');
  var statusEl = form.querySelector("[data-form-status]");
  var successTimer = null;

  function aarahanFormMotionOff() {
    return document.documentElement.classList.contains("rm") ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* ---- Floating label state -------------------------------------------
     .has-value keeps the label floated once something has been typed,
     chosen or auto-filled. A <select> always has a value, so its label
     stays up permanently. */
  function syncArahanFormField(control) {
    var field = control.closest(".field");
    if (!field) return;
    var filled = control.tagName === "SELECT" || String(control.value || "").trim() !== "";
    field.classList.toggle("has-value", filled);
  }

  function initArahanFormLabels() {
    fields.forEach(function (field) {
      var control = field.querySelector("input, select, textarea");
      if (!control) return;
      syncArahanFormField(control);
      ["input", "change", "blur"].forEach(function (evt) {
        control.addEventListener(evt, function () { syncArahanFormField(control); });
      });
    });
    /* Browser autofill can land after load without firing "input" */
    window.setTimeout(function () {
      fields.forEach(function (field) {
        var control = field.querySelector("input, select, textarea");
        if (control) syncArahanFormField(control);
      });
    }, 350);
  }

  /* ---- Re-arm the shake so it replays on every rejected submit ---- */
  function replayArahanFormShake() {
    if (aarahanFormMotionOff()) return;
    form.querySelectorAll(".field.is-invalid").forEach(function (field) {
      field.classList.remove("ae-shake");
      void field.offsetWidth;            /* restart the animation */
      field.classList.add("ae-shake");
    });
  }

  function clearArahanFormButton() {
    if (!submitBtn) return;
    submitBtn.classList.remove("is-loading", "is-success");
  }

  /* ---- Button loading / success, mirrored from the status element ----
     js/main.js writes "is-error" or "is-ok" onto [data-form-status];
     we only read that and animate the button accordingly. */
  function watchArahanFormStatus() {
    if (!statusEl || !("MutationObserver" in window)) return;
    new MutationObserver(function () {
      var ok = statusEl.classList.contains("is-ok");
      var err = statusEl.classList.contains("is-error");
      if (err) {
        clearArahanFormButton();
        window.requestAnimationFrame(replayArahanFormShake);
        return;
      }
      if (ok && submitBtn) {
        window.clearTimeout(successTimer);
        submitBtn.classList.add("is-loading");
        successTimer = window.setTimeout(function () {
          submitBtn.classList.remove("is-loading");
          submitBtn.classList.add("is-success");
        }, aarahanFormMotionOff() ? 0 : 520);
      }
    }).observe(statusEl, { attributes: true, attributeFilter: ["class"] });
  }

  function initArahanFormButton() {
    if (!submitBtn) return;
    /* Listen only — the submit handler in main.js still does the work */
    form.addEventListener("submit", function () {
      submitBtn.classList.remove("is-success");
      submitBtn.classList.add("is-loading");
      /* If validation rejected the submit, main.js flags fields synchronously */
      window.setTimeout(function () {
        if (form.querySelector(".field.is-invalid")) {
          clearArahanFormButton();
          replayArahanFormShake();
        }
      }, 0);
    });
    /* Editing again clears a finished success state */
    form.addEventListener("input", function () {
      if (submitBtn.classList.contains("is-success")) clearArahanFormButton();
    });
  }

  function initArahanContactForm() {
    initArahanFormLabels();
    initArahanFormButton();
    watchArahanFormStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initArahanContactForm);
  } else {
    initArahanContactForm();
  }
})();
