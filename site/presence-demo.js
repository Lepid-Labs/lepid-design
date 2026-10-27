// No-build demo of live cursors and the avatar stack, on the pure helpers the React
// PresenceCursors and AvatarStack use (ui/presence-state.js). A fake server moves
// five people along curves and reports ten times a second; one stops and fades, one
// leaves the canvas now and then. "You" are in the stack but never drawn.
import { avatarOverflow, followPoint, initials, isIdle, presenceColor } from "./ui/presence-state.js";

const IDLE_MS = 4000; // shorter than the 10 s default, so the demo shows it
const SELF = "u-you";
const people = [
  { id: SELF, name: "You" },
  { id: "u-ada", name: "Ada Lovelace" },
  { id: "u-grace", name: "Grace Hopper" },
  { id: "u-linus", name: "Linus Torvalds" },
  { id: "u-margaret", name: "Margaret Hamilton" },
  { id: "u-alan", name: "Alan Turing" },
  { id: "u-katherine", name: "Katherine Johnson" },
];
const canvas = document.getElementById("canvas");
const layer = document.getElementById("cursors");
const raw = document.getElementById("raw");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

// Avatar stack: 3 faces and "+4"; each name is the accessible text
const { shown, hidden } = avatarOverflow(people, 4);
document.getElementById("here").innerHTML = shown.map((p) => `<li><span class="ld-avatar" data-ld-color="${presenceColor(p.id)}"
  title="${p.name}"><span aria-hidden="true">${initials(p.name)}</span><span class="sr-only">${p.name}</span></span></li>`).join("")
  + `<li><span class="ld-avatar ld-avatar--overflow" title="${hidden.map((p) => p.name).join(", ")}"><span aria-hidden="true">+${hidden.length}</span>
  <span class="sr-only">and ${hidden.length} more: ${hidden.map((p) => p.name).join(", ")}</span></span></li>`;

// Cursors for everyone but you
const remote = people.filter((p) => p.id !== SELF).map((p, i) => {
  const el = Object.assign(document.createElement("div"), { className: "ld-cursor" });
  el.dataset.ldColor = presenceColor(p.id);
  el.innerHTML = `<svg class="ld-cursor__pointer" viewBox="0 0 16 20"><path d="M1.5 1.5v15l4-3.6 2.6 5.6 2.6-1.2-2.6-5.5h5.4z"/></svg><span class="ld-cursor__name">${p.name}</span>`;
  layer.append(el);
  return { ...p, el, phase: i * 1.3, target: undefined, at: undefined, lastSeen: Date.now() };
});

// The "server": ten reports a second
const t0 = Date.now();
setInterval(() => {
  const w = canvas.clientWidth - 140;
  const h = canvas.clientHeight - 60;
  const t = (Date.now() - t0) / 1000;
  for (const [i, p] of remote.entries()) {
    if (p.id === "u-grace" && t > 3) continue; // stopped moving: fades after IDLE_MS
    const away = p.id === "u-alan" && t % 12 > 9; // pointer left the canvas
    p.target = away ? undefined : {
      x: 20 + (w * (1 + Math.sin(t * (0.5 + i * 0.13) + p.phase))) / 2,
      y: 20 + (h * (1 + Math.sin(t * (0.7 + i * 0.09) + p.phase * 2))) / 2,
    };
    p.lastSeen = Date.now();
  }
}, 100);

// The client: glide towards each report every frame
let last = performance.now();
requestAnimationFrame(function frame(now) {
  const dt = now - last;
  last = now;
  for (const p of remote) {
    p.el.style.visibility = p.target ? "" : "hidden";
    if (!p.target) {
      p.at = undefined; // they reappear where they are, not where they left
      continue;
    }
    p.at = followPoint(p.at, p.target, dt, reduce.matches || raw.checked);
    p.el.style.translate = `${p.at.x}px ${p.at.y}px`;
    p.el.toggleAttribute("data-ld-idle", isIdle(p.lastSeen, Date.now(), IDLE_MS));
  }
  requestAnimationFrame(frame);
});
