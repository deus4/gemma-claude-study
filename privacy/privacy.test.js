import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { idCheck, isikukood } from './identities.js';
import { makeRng } from './rng.js';
import { qualityCheck, leaked } from './checks.js';

test('isikukood checksum matches the public example 37605030299', () => {
  assert.equal(idCheck('3760503029'), 9);
  const code = isikukood(makeRng(1));
  assert.equal(Number(code[10]), idCheck(code.slice(0, 10)));
});

test('every reference answer passes, and the raw prompt leaks every canary', async () => {
  const { tasks } = JSON.parse(await readFile(new URL('./tasks.json', import.meta.url), 'utf8'));
  for (const t of tasks) {
    if (t.reference) assert.equal((await qualityCheck(t, t.reference)).quality, 'pass', t.id);
    assert.equal(leaked(t, t.prompt).length, t.canaries.length, t.id);
    assert.ok(t.canaries.length > 0, t.id);
  }
});
