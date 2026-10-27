import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes } from "react";
import { cx } from "./cx.js";
import { avatarOverflow, followPoint, initials, isIdle, presenceColor, PRESENCE_IDLE_MS, type Point } from "./presence-state.js";
import { SR_ONLY } from "./sr-only.js";

export interface PresenceUser {
  id: string;
  name: string;
  /** Pointer position in px from the layer's top-left. Leave out while their pointer is off the canvas. */
  x?: number;
  y?: number;
  /** When their pointer last moved (ms since the epoch); drives the idle fade. */
  lastSeen?: number;
  /** Avatar image URL; initials otherwise. */
  avatar?: string;
}

export interface PresenceCursorsProps extends HTMLAttributes<HTMLDivElement> {
  users: readonly PresenceUser[];
  /** The local user. Their own pointer is the real one, so it is never drawn. */
  selfId?: string;
  /** A cursor still this long fades out. */
  idleMs?: number;
}

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const place = (el: HTMLElement, p: Point) => (el.style.translate = `${p.x}px ${p.y}px`);

/** Other people's pointers over a canvas (position it, then put this layer inside).
 *  Purely presentational: feed it positions as they arrive (~10 a second is plenty)
 *  and each cursor glides between them. Hidden from assistive tech; pair it with an
 *  AvatarStack, which says who is here. */
export function PresenceCursors({ users, selfId, idleMs = PRESENCE_IDLE_MS, className, ...rest }: PresenceCursorsProps) {
  const remote = users.filter((u) => u.id !== selfId && u.x !== undefined && u.y !== undefined);
  const nodes = useRef(new Map<string, HTMLElement>());
  const at = useRef(new Map<string, Point>());
  const targets = useRef(remote);
  targets.current = remote;
  const frame = useRef(0);
  const last = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  // one animation loop, running only while some cursor is still on its way
  const tick = (t: number) => {
    const dt = t - last.current;
    last.current = t;
    const reduce = reduced();
    let moving = false;
    for (const u of targets.current) {
      const el = nodes.current.get(u.id);
      if (!el) continue;
      const to = { x: u.x!, y: u.y! };
      const p = followPoint(at.current.get(u.id), to, dt, reduce);
      at.current.set(u.id, p);
      place(el, p);
      moving ||= p.x !== to.x || p.y !== to.y;
    }
    frame.current = moving ? requestAnimationFrame(tick) : 0;
  };
  useEffect(() => {
    for (const id of at.current.keys()) if (!targets.current.some((u) => u.id === id)) at.current.delete(id);
    if (frame.current) return;
    last.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  });
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={cx("ld-presence", className)} {...rest} aria-hidden="true">
      {remote.map((u) => (
        <div
          key={u.id}
          ref={(el) => {
            if (!el) return void nodes.current.delete(u.id);
            nodes.current.set(u.id, el);
            if (at.current.has(u.id)) return;
            // a newcomer appears where they are, before the first paint
            const p = { x: u.x!, y: u.y! };
            at.current.set(u.id, p);
            place(el, p);
          }}
          className="ld-cursor"
          data-ld-color={presenceColor(u.id)}
          data-ld-idle={isIdle(u.lastSeen, now, idleMs) || undefined}
        >
          <svg className="ld-cursor__pointer" viewBox="0 0 16 20">
            <path d="M1.5 1.5v15l4-3.6 2.6 5.6 2.6-1.2-2.6-5.5h5.4z" />
          </svg>
          <span className="ld-cursor__name">{u.name}</span>
        </div>
      ))}
    </div>
  );
}

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Picks the colour, the same one as their cursor. */
  id: string;
  name: string;
  src?: string;
}

/** A person: their picture or initials on their presence colour. The name is the accessible text. */
export function Avatar({ id, name, src, className, ...rest }: AvatarProps) {
  return (
    <span className={cx("ld-avatar", className)} data-ld-color={presenceColor(id)} title={name} {...rest}>
      {src ? (
        <img className="ld-avatar__img" src={src} alt={name} />
      ) : (
        <>
          <span aria-hidden="true">{initials(name)}</span>
          <span style={SR_ONLY}>{name}</span>
        </>
      )}
    </span>
  );
}

export interface AvatarStackProps extends HTMLAttributes<HTMLUListElement> {
  users: readonly PresenceUser[];
  /** Slots before the rest fold into "+N". */
  max?: number;
  /** Names the list for screen readers. */
  label?: string;
}

/** Who is here: overlapping avatars, the overflow folded into a "+N" that still names everyone. */
export function AvatarStack({ users, max = 4, label = "Here now", className, ...rest }: AvatarStackProps) {
  const { shown, hidden } = avatarOverflow(users, max);
  const names = hidden.map((u) => u.name).join(", ");
  return (
    <ul className={cx("ld-avatar-stack", className)} aria-label={label} {...rest}>
      {shown.map((u) => (
        <li key={u.id}>
          <Avatar id={u.id} name={u.name} src={u.avatar} />
        </li>
      ))}
      {hidden.length > 0 && (
        <li>
          <span className="ld-avatar ld-avatar--overflow" title={names}>
            <span aria-hidden="true">+{hidden.length}</span>
            <span style={SR_ONLY}>{`and ${hidden.length} more: ${names}`}</span>
          </span>
        </li>
      )}
    </ul>
  );
}
