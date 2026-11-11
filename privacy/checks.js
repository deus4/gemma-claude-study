// Quality checks on an answer that has already been mapped back to real values.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { stripFences } from '../lib/checks.js';

const run = promisify(execFile);

const codeTest = async (task, text) => {
  const dir = await mkdtemp(join(tmpdir(), 'gcs-p-'));
  try {
    await writeFile(join(dir, 'package.json'), '{"type":"module"}');
    await writeFile(join(dir, 'stock.js'), stripFences(text));
    await writeFile(join(dir, 'stock.test.js'), task.check.test);
    await run(process.execPath, ['--test', '--test-reporter=tap', 'stock.test.js'], { cwd: dir, timeout: 60_000 });
    return { quality: 'pass', note: 'tests pass' };
  } catch (err) {
    const failed = /# fail (\d+)/.exec(`${err.stdout ?? ''}`)?.[1];
    return { quality: 'fail', note: failed ? `${failed} test(s) fail` : 'does not run' };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const rowsOf = (setup, sql) => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(setup);
    return db.prepare(sql).all().map((r) => JSON.stringify(Object.values(r)));
  } finally {
    db.close();
  }
};

const sqlRows = (task, text) => {
  try {
    const want = rowsOf(task.check.setup, task.check.referenceSql);
    const got = rowsOf(task.check.setup, stripFences(text).replace(/;\s*$/, ''));
    const same = task.check.ordered
      ? JSON.stringify(got) === JSON.stringify(want)
      : JSON.stringify([...got].sort()) === JSON.stringify([...want].sort());
    return { quality: same ? 'pass' : 'fail', note: same ? 'same rows' : `rows differ (${got.length} vs ${want.length})` };
  } catch (err) {
    return { quality: 'fail', note: `sql error: ${err.message.slice(0, 80)}` };
  }
};

// Pre-check only: a miss is a fail; a hit still needs the blind human grade.
const mentions = (task, text) => {
  const t = text.toLowerCase();
  const has = (words) => words.some((w) => t.includes(w.toLowerCase()));
  const groups = task.check.allOf ?? [task.check.anyOf];
  if (!groups.every(has)) return { quality: 'fail', note: 'key point missing' };
  if (task.check.alsoName && !text.includes(task.check.alsoName)) return { quality: 'fail', note: 'sender not named' };
  return { quality: null, note: 'pre-check ok; needs a blind grade' };
};

const CHECKS = { codeTest, sqlRows, mentions };
export const qualityCheck = (task, text) => CHECKS[task.check.kind](task, text);

// Leakage: which canaries appear in the text that was actually sent to the cloud.
export const leaked = (task, sentText) => task.canaries.filter((c) => sentText.includes(c.value));
