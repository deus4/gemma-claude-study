import test from 'node:test';
import assert from 'node:assert/strict';
import { stripFences, autoCheck } from './lib/checks.js';

test('stripFences takes the largest fenced block', () => {
  assert.equal(stripFences('intro\n```js\na\n```\n```js\nlonger\n```'), 'longer');
  assert.equal(stripFences('  plain  '), 'plain');
});

test('exact check', async () => {
  const task = { check: { kind: 'exact', expected: '[1]' } };
  assert.equal((await autoCheck(task, '```json\n[1]\n```')).auto, 'pass');
  assert.equal((await autoCheck(task, '[2]')).auto, 'fail');
});

test('jsonKeys check needs valid JSON with keys', async () => {
  const task = { check: { kind: 'jsonKeys', keys: ['decisions', 'open'] } };
  assert.equal((await autoCheck(task, '{"decisions":[],"open":[]}')).auto, null);
  assert.equal((await autoCheck(task, '{"decisions":[]}')).auto, 'fail');
  assert.equal((await autoCheck(task, 'not json')).auto, 'fail');
});
