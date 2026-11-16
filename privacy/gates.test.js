import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { redact, restore, substitute } from './placeholders.js';
import { rulesGate } from './gates.js';
import { leaked, qualityCheck } from './checks.js';

test('redact and restore are exact inverses', () => {
  const text = 'Mail ann.kask@x.example or call Ann Kask; Ann Kask again.';
  const { text: r, map } = redact(text, [{ text: 'Ann Kask', type: 'personal' }, { text: 'ann.kask@x.example', type: 'email' }]);
  assert.ok(!r.includes('Ann Kask') && !r.includes('ann.kask'));
  assert.equal(restore(r, map), text);
});

test('a value inside an identifier is masked and restored (run 1 left METHOD_2Correction in two answers)', () => {
  const text = 'export const saulaCorrection = (g) => g * 0.9688; // Saula curve';
  const { text: r, map } = redact(text, [{ text: 'saula', type: 'knowhow' }, { text: '0.9688', type: 'knowhow' }]);
  assert.ok(!r.includes('saula') && r.includes('Correction'));
  assert.equal(restore(r, map), text);
});

test('PERSON_12 is restored before PERSON_1', () => {
  const map = Array.from({ length: 12 }, (_, i) => ({ placeholder: `PERSON_${i + 1}`, value: `p${i + 1}` }));
  assert.equal(restore('PERSON_12 and PERSON_1', map), 'p12 and p1');
});

test('rules gate removes e-mails, ID codes, phones and keys; reference code still passes after round trip', async () => {
  const { tasks } = JSON.parse(await readFile(new URL('./tasks.json', import.meta.url), 'utf8'));
  for (const t of tasks) {
    const { text, map } = redact(t.prompt, await rulesGate(t.prompt));
    const left = leaked(t, text).map((c) => c.value);
    assert.ok(!left.some((v) => /@|^\d{11}$|^\+372|^gtk_live_/.test(v)), `${t.id}: ${left}`);
    if (t.reference) {
      // A perfect cloud answer comes back in placeholders; restoring must give the reference exactly.
      const roundTrip = restore(substitute(t.reference, map), map);
      assert.equal(roundTrip, t.reference, t.id);
      assert.equal((await qualityCheck(t, roundTrip)).quality, 'pass', t.id);
    }
  }
});

test('code check: a correct fix that rewrites the API key or renames an export fails; a fix that only passes the visible asserts fails', async () => {
  const { tasks } = JSON.parse(await readFile(new URL('./tasks.json', import.meta.url), 'utf8'));
  const first = tasks.find((t) => t.id === 'CODE-01');
  assert.equal((await qualityCheck(first, first.reference.replace(/gtk_live_\w+/, 'gtk_live_REDACTED'))).quality, 'fail');
  assert.equal((await qualityCheck(first, first.reference.replace(/export const \w+Correction/, 'export const METHOD_2Correction'))).quality, 'fail');
  const rounding = tasks.find((t) => t.id === 'CODE-07');
  assert.equal((await qualityCheck(rounding, rounding.reference.replace('Math.round', 'Math.ceil'))).quality, 'fail');
});

test('rules win over the model on the type of a span', () => {
  const spans = [{ text: 'a@b.example', type: 'personal' }, { text: 'a@b.example', type: 'email' }];
  assert.equal(redact('write to a@b.example', spans).text, 'write to EMAIL_1');
});
