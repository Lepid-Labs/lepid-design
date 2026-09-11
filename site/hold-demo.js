// Static-site demo of the hold-to-confirm button. The React HoldButton in
// @lepid-labs/ui-react does the same thing; this is the no-build equivalent so
// the showcase can exercise the CSS contract in every theme.
//
// Markup: <button class="ld-btn ld-btn--hold" data-hold-demo> with the
// .ld-btn__ring / __body / __hint / __meter subparts. The script writes one
// number (--ld-hold) per frame and flips data-ld-hold.
(() => {
  const HOLD_KEYS = new Set([" ", "Enter"]);
  const parseTime = (raw) => {
    const m = raw.trim().match(/^([\d.]+)\s*(ms|s)$/);
    return m ? Number(m[1]) * (m[2] === "s" ? 1000 : 1) : 300;
  };

  for (const btn of document.querySelectorAll("[data-hold-demo]")) {
    const meter = btn.querySelector(".ld-btn__meter");
    const hint = btn.querySelector(".ld-btn__hint");
    const chip = document.getElementById(btn.dataset.holdDemo);
    const live = document.getElementById("hold-live");
    let state = "idle";
    let startedAt = 0;
    let duration = 300;
    let frame;
    let timer;

    const paint = (p) => {
      btn.style.setProperty("--ld-hold", p);
      if (meter) meter.textContent = `${Math.round(p * 100)}%`;
    };
    const durationFromTheme = () => parseTime(getComputedStyle(btn).getPropertyValue("--ld-hold-duration"));
    // The hint mirrors the theme's own window, so switching styles updates it.
    const syncHint = () => {
      if (hint) hint.textContent = `hold ${durationFromTheme()} ms`;
    };
    syncHint();
    new MutationObserver(syncHint).observe(document.documentElement, { attributes: true, attributeFilter: ["data-ld-style"] });

    const fire = () => {
      cancelAnimationFrame(frame);
      state = "fired";
      btn.dataset.ldHold = "fired";
      paint(1);
      if (chip) {
        chip.textContent = `fired at ${duration} ms`;
        chip.style.display = "";
      }
      if (live) live.textContent = btn.dataset.holdConfirmed || "Confirmed";
      timer = setTimeout(() => {
        state = "idle";
        delete btn.dataset.ldHold;
        paint(0);
        if (live) live.textContent = "";
      }, 600);
    };
    const tick = () => {
      if (state !== "holding") return;
      const elapsed = performance.now() - startedAt;
      if (elapsed >= duration) return fire();
      paint(elapsed / duration);
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (state !== "idle" || btn.disabled) return;
      duration = durationFromTheme();
      startedAt = performance.now();
      state = "holding";
      btn.dataset.ldHold = "holding";
      if (chip) chip.style.display = "none"; // the badge's display rule beats [hidden]
      frame = requestAnimationFrame(tick);
    };
    const cancel = () => {
      if (state !== "holding") return;
      cancelAnimationFrame(frame);
      state = "idle";
      delete btn.dataset.ldHold;
      paint(0);
    };

    btn.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !e.isPrimary) return;
      btn.setPointerCapture(e.pointerId);
      start();
    });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture", "blur"]) btn.addEventListener(ev, cancel);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return cancel();
      if (!HOLD_KEYS.has(e.key)) return;
      e.preventDefault(); // no synthetic click on release
      if (!e.repeat) start();
    });
    btn.addEventListener("keyup", (e) => {
      if (HOLD_KEYS.has(e.key)) {
        e.preventDefault();
        cancel();
      }
    });
  }
})();
