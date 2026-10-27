// No-build demo of the form-state components. It drives the plain markup with
// the same pure helpers the React components use (built into ui/ by the Pages
// workflow; locally, symlink site/ui to components/react/dist after a build).
import { nextFieldStatus } from "./ui/field-state.js";
import { applyMask, maskDeleteCaret } from "./ui/mask.js";
import { otpActiveIndex, otpErase, otpInput, otpMove, otpTyped } from "./ui/otp-state.js";
import { DEFAULT_PASSWORD_RULES, STRENGTH_LABELS, passwordStrength } from "./ui/password-strength.js";

const $ = (id) => document.getElementById(id);

/** Show an error or success in a field's status line, the way Field does. */
function setStatus(field, input, kind, text) {
  const msg = field.querySelector(".ld-field__message");
  const hint = field.querySelector(".ld-field__hint");
  msg.className = `ld-field__message${kind ? ` ld-field__message--${kind}` : ""}`;
  msg.textContent = text ?? "";
  field.classList.toggle("ld-field--success", kind === "success");
  for (const el of Array.isArray(input) ? input : [input]) {
    el.setAttribute("aria-describedby", [hint?.id, kind && msg.id].filter(Boolean).join(" "));
    if (kind === "error") {
      el.setAttribute("aria-invalid", "true");
      el.setAttribute("aria-errormessage", msg.id);
    } else {
      el.removeAttribute("aria-invalid");
      el.removeAttribute("aria-errormessage");
    }
  }
}

// Validation timing: reward early, punish late
for (const field of document.querySelectorAll("[data-validate]")) {
  const input = field.querySelector("input");
  let status = "idle";
  const check = (event) => {
    status = nextFieldStatus(status, event, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value));
    if (status === "invalid") setStatus(field, input, "error", input.value ? "Enter an email like name@example.com." : "Enter your email.");
    else setStatus(field, input, status === "valid" ? "success" : null, status === "valid" ? "Looks good." : "");
  };
  input.addEventListener("input", () => check("input"));
  input.addEventListener("blur", () => check("blur"));
}

// Busy: aria-busy for two seconds; repeat presses are ignored, focus stays
const save = $("b-save");
save.addEventListener("click", () => {
  if (save.getAttribute("aria-busy") === "true") return;
  save.setAttribute("aria-busy", "true");
  $("b-save-status").textContent = "Saving";
  setTimeout(() => {
    save.removeAttribute("aria-busy");
    $("b-save-status").textContent = "Saved";
  }, 2000);
});

// Disabled with a reason: focusable; pressing it goes to what is missing
const publish = $("b-publish");
const title = $("b-title");
publish.addEventListener("click", () => {
  if (publish.getAttribute("aria-disabled") === "true") title.focus();
});
title.addEventListener("input", () => {
  const missing = !title.value.trim();
  if (missing) publish.setAttribute("aria-disabled", "true");
  else publish.removeAttribute("aria-disabled");
  $("b-publish-why").style.display = missing ? "" : "none"; // the theme's display rule beats [hidden]
});

// Password: reveal toggle that keeps focus and caret; meter and checklist for a new one
for (const field of document.querySelectorAll("[data-password]")) {
  const input = field.querySelector("input");
  const toggle = field.querySelector(".ld-password__toggle");
  toggle.addEventListener("mousedown", (e) => e.preventDefault());
  toggle.addEventListener("click", () => {
    const [start, end] = [input.selectionStart, input.selectionEnd];
    const shown = input.type === "password";
    input.type = shown ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(shown));
    toggle.querySelector("path:last-child").setAttribute("display", shown ? "inline" : "none");
    if (document.activeElement === input) input.setSelectionRange(start, end);
  });
  if (field.dataset.password !== "new") continue;
  const meter = field.querySelector(".ld-password__meter");
  const score = field.querySelector(".ld-password__score");
  const list = field.querySelector(".ld-password__rules");
  const items = DEFAULT_PASSWORD_RULES.map((rule) => {
    const li = list.appendChild(document.createElement("li"));
    li.className = "ld-password__rule";
    li.append(rule.label, Object.assign(document.createElement("span"), { className: "sr-only" }));
    return li;
  });
  const update = () => {
    const pw = input.value;
    const s = passwordStrength(pw);
    meter.querySelector(".ld-progress__bar").style.width = `${pw ? (s + 1) * 20 : 0}%`;
    meter.setAttribute("aria-valuenow", String(pw ? (s + 1) * 20 : 0));
    meter.setAttribute("aria-valuetext", pw ? STRENGTH_LABELS[s] : "Empty");
    if (pw) meter.dataset.ldStrength = String(s);
    else delete meter.dataset.ldStrength;
    if (score.textContent !== (pw ? STRENGTH_LABELS[s] : "")) score.textContent = pw ? STRENGTH_LABELS[s] : "";
    DEFAULT_PASSWORD_RULES.forEach((rule, i) => {
      const met = rule.test(pw);
      items[i].classList.toggle("ld-password__rule--met", met);
      items[i].lastChild.textContent = met ? " (done)" : " (not yet)";
    });
  };
  input.addEventListener("input", update);
  update();
}

// One-time code: one string, the cells are a view of it
for (const group of document.querySelectorAll("[data-otp]")) {
  const length = Number(group.dataset.otp);
  const field = group.closest(".ld-field");
  let code = "";
  const cells = Array.from({ length }, (_, i) => {
    const cell = group.appendChild(document.createElement("input"));
    Object.assign(cell, { className: "ld-input ld-otp__cell", placeholder: " ", inputMode: "numeric" });
    cell.autocomplete = i === 0 ? "one-time-code" : "off";
    if (i === 0) cell.id = "otp";
    cell.setAttribute("aria-label", `Digit ${i + 1} of ${length}`);
    return cell;
  });
  const render = () => {
    const active = otpActiveIndex(code, length);
    cells.forEach((c, i) => {
      c.value = code[i] ?? "";
      c.tabIndex = i === active ? 0 : -1;
    });
  };
  const apply = ({ code: next, focus }) => {
    const changed = next !== code;
    code = next;
    render();
    cells[focus].focus();
    if (changed) setStatus(field, cells, null);
    if (changed && code.length === length) {
      if (code === "123456") setStatus(field, cells, "success", "Verified.");
      else {
        setStatus(field, cells, "error", "That code didn't match. Check the latest text and try again.");
        code = "";
        render();
        cells[0].focus();
      }
    }
  };
  cells.forEach((cell, i) => {
    cell.addEventListener("focus", () => {
      const first = otpActiveIndex(code, length);
      if (i > first) cells[first].focus();
      else cell.select();
    });
    cell.addEventListener("input", () => apply(otpInput(code, i, otpTyped(code[i] ?? "", cell.value), length)));
    cell.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        return apply(otpErase(code, i, e.key));
      }
      const to = otpMove(e.key, i, code, length);
      if (to === null) return;
      e.preventDefault();
      cells[to].focus();
    });
  });
  render();
}

// Masks: format as you type, carry the caret, show the raw value
for (const input of document.querySelectorAll("[data-mask]")) {
  const mask = input.dataset.mask;
  const out = document.querySelector(`output[for="${input.id}"]`);
  input.addEventListener("keydown", (e) => {
    if ((e.key === "Backspace" || e.key === "Delete") && input.selectionStart === input.selectionEnd) {
      const c = maskDeleteCaret(input.value, mask, input.selectionStart, e.key);
      input.setSelectionRange(c, c);
    }
  });
  input.addEventListener("input", () => {
    const next = applyMask(input.value, mask, input.selectionStart);
    input.value = next.value;
    input.setSelectionRange(next.caret, next.caret);
    out.textContent = next.raw ? `raw: ${next.raw}` : "";
  });
}
