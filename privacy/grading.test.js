import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGrade, pending, shuffle, toGrade } from './grading.js';

test('only ungraded human items, latest record wins', () => {
  const runs = [
    { taskId: 'E1', arm: 'G', quality: { quality: 'fail' } },
    { taskId: 'E1', arm: 'G', quality: { quality: null } },
    { taskId: 'S1', arm: 'G', quality: { quality: 'pass' } },
  ];
  assert.deepEqual(toGrade(runs).map((r) => r.taskId), ['E1']);
});

test('shuffle is reproducible and keeps every item', () => {
  const list = Array.from({ length: 20 }, (_, i) => i);
  assert.deepEqual(shuffle(list, 1), shuffle(list, 1));
  assert.deepEqual([...shuffle(list, 1)].sort((a, b) => a - b), list);
  assert.notDeepEqual(shuffle(list, 1), list);
});

test('pending skips graded keys', () => {
  const q = [{ taskId: 'A', arm: 'G' }, { taskId: 'B', arm: 'R' }];
  assert.deepEqual(pending(q, [{ key: 'A|G' }]).map((r) => r.taskId), ['B']);
});

test('parseGrade', () => {
  assert.deepEqual(parseGrade('p'), { grade: 'pass', failure: null });
  assert.deepEqual(parseGrade('fi'), { grade: 'fail', failure: 'invented fact' });
  assert.equal(parseGrade('x'), null);
});
