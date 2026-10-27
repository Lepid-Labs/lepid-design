// passwordStrength: length and variety, with common patterns discounted and no
// dictionary. Runs the TS source directly.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PASSWORD_RULES, STRENGTH_LABELS, passwordBits, passwordStrength } from "../src/password-strength.ts";

test("empty and tiny passwords are too weak", () => {
  assert.equal(passwordStrength(""), 0);
  assert.equal(passwordBits(""), 0);
  assert.equal(passwordStrength("a"), 0);
  assert.equal(passwordStrength("abc123"), 0);
});

test("length beats required symbols: a long passphrase is strong, a short complex one is not", () => {
  assert.equal(passwordStrength("correct horse battery staple"), 4);
  assert.ok(passwordStrength("kT9#mQ2$") < passwordStrength("correct horse battery staple"));
  assert.equal(passwordStrength("kT9#mQ2$"), 2);
  assert.equal(passwordStrength("Tr0ub4dor&3"), 3);
});

test("more variety at the same length scores higher", () => {
  assert.ok(passwordBits("abcxyzqw") < passwordBits("aBcxYzqw"));
  assert.ok(passwordBits("aBcxYzqw") < passwordBits("aB3xY#qw"));
});

test("common passwords count as one character, leetspeak and case included", () => {
  assert.equal(passwordStrength("password"), 0);
  assert.equal(passwordStrength("P@ssw0rd"), 0);
  assert.equal(passwordStrength("Password1!"), 0);
  assert.equal(passwordStrength("qwertyuiop"), 0);
  assert.ok(passwordBits("password") < passwordBits("pdsrwaso")); // same letters, scrambled
});

test("repeats and runs add nothing past their second character", () => {
  assert.equal(passwordStrength("aaaaaaaaaaaaaaaa"), 0);
  assert.equal(passwordStrength("1234567890123456"), 0);
  assert.equal(passwordStrength("zyxwvutsrqponmlk"), 0);
  assert.equal(passwordBits("aaaa"), passwordBits("aa"));
  assert.equal(passwordBits("abcd"), passwordBits("ab"));
});

test("non-ASCII characters count as symbols and do not break the word scan", () => {
  assert.ok(passwordStrength("пароль-🙂-日本語-mañana") >= 3);
  assert.equal(passwordStrength("🙂password"), 0);
});

test("scores map onto five labels", () => {
  assert.equal(STRENGTH_LABELS.length, 5);
  assert.equal(STRENGTH_LABELS[passwordStrength("correct horse battery staple")], "Strong");
});

test("default rules tick as a password grows", () => {
  const met = (p) => DEFAULT_PASSWORD_RULES.map((r) => r.test(p));
  assert.deepEqual(met(""), [false, false, false]);
  assert.deepEqual(met("abc"), [false, false, false]);
  assert.deepEqual(met("abcD"), [false, true, false]);
  assert.deepEqual(met("abcD 1"), [false, true, true]);
  assert.deepEqual(met("abcDefghij 1"), [true, true, true]);
});
