import test from 'node:test';
import assert from 'node:assert/strict';
import { finalQuality, latestRuns, summarise, toMarkdown } from './reporting.js';

const c = (type, value) => ({ type, value });
const tasks = [{ id: 'E1', canaries: [c('personal', 'Ann'), c('client', 'Bar X')] }, { id: 'S1', canaries: [c('personal', 'Bob')] }];
const run = (taskId, arm, kind, leaked, quality, extra = {}) => ({
  taskId, arm, kind, canaries: tasks.find((t) => t.id === taskId).canaries.length, leaked, reidentified: [],
  quality: { quality, note: quality === 'fail' ? 'rows differ' : '' }, costUsd: 0.01, ms: 1000, ...extra,
});

test('latest record per task and arm wins', () => {
  const rs = latestRuns([run('S1', 'G', 'sql', [], 'fail'), run('S1', 'G', 'sql', [], 'pass')]);
  assert.equal(rs.length, 1);
  assert.equal(rs[0].quality.quality, 'pass');
});

test('human grade fills quality only where the auto check left it open', () => {
  const grades = new Map([['E1|G', { grade: 'fail', failure: 'invented fact' }]]);
  assert.equal(finalQuality(run('E1', 'G', 'email', [], null), grades).failure, 'invented fact');
  assert.equal(finalQuality(run('S1', 'G', 'sql', [], 'pass'), grades).source, 'auto');
  assert.equal(finalQuality(run('E1', 'R', 'email', [], null), grades).grade, null);
});

test('summary counts leaks by type, quality and pending', () => {
  const runs = [
    run('E1', 'C0', 'email', tasks[0].canaries, null), run('S1', 'C0', 'sql', tasks[1].canaries, 'pass'),
    run('E1', 'RG', 'email', [c('client', 'Bar X')], null), run('S1', 'RG', 'sql', [], 'pass'),
  ];
  const grades = [{ key: 'E1|C0', grade: 'pass' }, { key: 'E1|RG', grade: 'fail', failure: 'wrong' }];
  const [c0, rg] = summarise(runs, grades, tasks);
  assert.equal(c0.leaked, 3);
  assert.equal(rg.leaked, 1);
  assert.deepEqual(rg.leakByType.client, { leaked: 1, planted: 1 });
  assert.equal(rg.pass, 1);
  assert.equal(rg.pending, 0);
  assert.deepEqual(rg.failures, { wrong: 1 });
  const md = toMarkdown([c0, rg], { at: 'x', seed: 1, tasks: 2, canaries: 3, pending: 0 });
  assert.match(md, /rules \+ Gemma \| 1\/3 \(33\.3 %\)/);
});
