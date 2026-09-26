// Copy control for .ld-pre blocks — the no-build equivalent of the React
// CodeBlock, and the snippet the README documents for plain-HTML hosts.
//
// Markup: <div class="ld-pre-wrap"> holding a <pre class="ld-pre">, a
// <button class="ld-icon-btn ld-pre-copy"> with .ld-pre-copy__icon and
// .ld-pre-copy__check glyphs, and <span class="ld-pre-copy-status"
// aria-live="polite">. The script flips data-ld-copy for 1.5s.
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".ld-pre-copy");
  const wrap = btn?.closest(".ld-pre-wrap");
  if (!wrap) return;
  let state = "copied";
  try {
    await navigator.clipboard.writeText(wrap.querySelector("pre").textContent);
  } catch {
    state = "failed";
  }
  const status = wrap.querySelector(".ld-pre-copy-status");
  if (status) status.textContent = state === "copied" ? "Copied to clipboard" : "Copy failed";
  btn.dataset.ldCopy = state;
  clearTimeout(btn._ldCopyTimer);
  btn._ldCopyTimer = setTimeout(() => {
    delete btn.dataset.ldCopy;
    if (status) status.textContent = "";
  }, 1500);
});
