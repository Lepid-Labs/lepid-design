import { useId, useLayoutEffect, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { cx } from "./cx.js";
import { Progress } from "./feedback.js";
import { IconButton } from "./IconButton.js";
import { DEFAULT_PASSWORD_RULES, STRENGTH_LABELS, passwordStrength, type PasswordRule } from "./password-strength.js";
import { SR_ONLY } from "./sr-only.js";

export interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** "new" (sign-up, change password): strength meter and requirements checklist,
   *  `autocomplete="new-password"`. "current" (sign-in): the reveal toggle only,
   *  `autocomplete="current-password"`. Default "current". */
  mode?: "new" | "current";
  /** The checklist for `mode="new"`. Default DEFAULT_PASSWORD_RULES. */
  rules?: PasswordRule[];
  /** The reveal toggle's accessible name; it stays the same, `aria-pressed` carries the state. */
  revealLabel?: string;
  /** Class for the wrapper; `className` goes on the input. */
  wrapClassName?: string;
}

const eye = "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z";

/** Password input with a show/hide toggle, and for a new password a live strength
 *  meter and a checklist that ticks as you type. Paste is never blocked. */
export function PasswordField({
  mode = "current",
  rules = DEFAULT_PASSWORD_RULES,
  revealLabel = "Show password",
  wrapClassName,
  className,
  id,
  value,
  defaultValue,
  onChange,
  "aria-describedby": describedBy,
  ...rest
}: PasswordFieldProps) {
  const [shown, setShown] = useState(false);
  const [typed, setTyped] = useState(String(defaultValue ?? ""));
  const password = value !== undefined ? String(value) : typed;
  const input = useRef<HTMLInputElement>(null);
  const selection = useRef<[number | null, number | null] | null>(null);
  const auto = useId();
  const inputId = id ?? auto;
  const rulesId = `${inputId}-rules`;
  const isNew = mode === "new";
  const score = passwordStrength(password);

  // switching type can reset the selection; put the caret back where it was
  useLayoutEffect(() => {
    const el = input.current;
    if (el && selection.current && document.activeElement === el) el.setSelectionRange(...selection.current);
    selection.current = null;
  }, [shown]);

  return (
    <div className={cx("ld-password", wrapClassName)}>
      <div className="ld-password__control">
        <input
          {...rest}
          ref={input}
          id={inputId}
          type={shown ? "text" : "password"}
          className={cx("ld-input", "ld-password__input", className)}
          autoComplete={isNew ? "new-password" : "current-password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          defaultValue={defaultValue}
          aria-describedby={[describedBy, isNew && rulesId].filter(Boolean).join(" ") || undefined}
          onChange={(e) => {
            setTyped(e.target.value);
            onChange?.(e);
          }}
        />
        <IconButton
          label={revealLabel}
          className="ld-password__toggle"
          aria-pressed={shown}
          aria-controls={inputId}
          disabled={rest.disabled}
          // a pointer press must not pull focus out of the field
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const el = input.current;
            if (el) selection.current = [el.selectionStart, el.selectionEnd];
            setShown((s) => !s);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d={eye} />
            <circle cx="12" cy="12" r="3" />
            {shown && <path d="M3 3l18 18" />}
          </svg>
        </IconButton>
      </div>
      {isNew && (
        <>
          <div className="ld-password__strength">
            <Progress
              className="ld-password__meter"
              value={password ? (score + 1) * 20 : 0}
              data-ld-strength={password ? score : undefined}
              aria-label="Password strength"
              aria-valuetext={password ? STRENGTH_LABELS[score] : "Empty"}
            />
            <span className="ld-password__score" aria-live="polite">
              {password ? STRENGTH_LABELS[score] : ""}
            </span>
          </div>
          <ul className="ld-password__rules" id={rulesId}>
            {rules.map((rule) => {
              const met = rule.test(password);
              return (
                <li key={rule.label} className={cx("ld-password__rule", met && "ld-password__rule--met")}>
                  {rule.label}
                  <span style={SR_ONLY}>{met ? " (done)" : " (not yet)"}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
