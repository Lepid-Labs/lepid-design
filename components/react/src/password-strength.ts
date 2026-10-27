// Pure password scoring behind PasswordField. No dictionary: strength is an
// entropy estimate from length and character variety, with repeats, runs,
// keyboard rows and the handful of passwords every cracker tries first
// discounted. DOM-free so node:test can run it (so it imports nothing).

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

/** Words for each score, index = score. */
export const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"] as const;

export interface PasswordRule {
  /** Shown in the checklist, ticked once `test` passes. */
  label: string;
  test: (password: string) => boolean;
}

/** The checklist PasswordField shows by default for a new password. */
export const DEFAULT_PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 12 characters", test: (p) => p.length >= 12 },
  { label: "Upper- and lower-case letters", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "A number or a symbol", test: (p) => /[^a-zA-Z]/.test(p) },
];

// shortcut: a tiny built-in list, not a dictionary; pair with a server-side breached-password check for real coverage.
const COMMON = [
  "password", "qwerty", "asdfgh", "zxcvbn", "qazwsx", "letmein", "welcome", "admin", "login", "iloveyou",
  "monkey", "dragon", "master", "sunshine", "princess", "football", "baseball", "abc123", "trustno",
];
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

/** Bits of guessing work, roughly: effective length × log2(alphabet size). */
export function passwordBits(password: string): number {
  const chars = [...password];
  if (chars.length === 0) return 0;
  const weight = chars.map(() => 1);
  // a common word (after undoing leetspeak) counts as one character; "\0" keeps
  // one code unit per character so string offsets stay character offsets
  const plain = chars.map((c) => LEET[c] ?? (c.toLowerCase().length === 1 ? c.toLowerCase() : "\0")).join("");
  for (const word of COMMON) {
    for (let at = plain.indexOf(word); at !== -1; at = plain.indexOf(word, at + 1)) {
      for (let i = at + 1; i < at + word.length; i++) weight[i] = 0;
    }
  }
  // the third and later characters of a repeat or a ±1 run ("aaa", "1234", "cba") add nothing
  for (let i = 2; i < chars.length; i++) {
    const d1 = chars[i].codePointAt(0)! - chars[i - 1].codePointAt(0)!;
    const d2 = chars[i - 1].codePointAt(0)! - chars[i - 2].codePointAt(0)!;
    if (d1 === d2 && Math.abs(d1) <= 1) weight[i] = 0;
  }
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/\d/.test(password)) pool += 10;
  if (/[^a-zA-Z\d]/.test(password)) pool += 33;
  return weight.reduce((a, b) => a + b, 0) * Math.log2(pool);
}

/** 0 (too weak) – 4 (strong). */
export function passwordStrength(password: string): StrengthScore {
  const bits = passwordBits(password);
  if (bits < 25) return 0;
  if (bits < 40) return 1;
  if (bits < 60) return 2;
  if (bits < 80) return 3;
  return 4;
}
