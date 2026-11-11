// Automatic checks. Each returns { auto: 'pass' | 'fail' | null, note }. null = needs a blind human grade.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cp, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = promisify(execFile);

// Models often wrap answers in ``` fences; take the largest fenced block, or the whole text.
export const stripFences = (text) => {
  const blocks = [...text.matchAll(/```[a-zA-Z]*\n([\s\S]*?)```/g)].map((m) => m[1]);
  if (blocks.length === 0) return text.trim();
  return blocks.reduce((a, b) => (b.length > a.length ? b : a)).trim();
};

const SKIP = new Set(['node_modules', '.git']);

// T1: put the model's module into a temp copy of the repo and run the real test file.
const checkModuleTests = async (task, text) => {
  const dir = await mkdtemp(join(tmpdir(), 'gcs-'));
  try {
    await cp(task.check.repo, dir, { recursive: true, filter: (src) => !SKIP.has(src.split('/').pop()) });
    await symlink(join(task.check.repo, 'node_modules'), join(dir, 'node_modules')).catch(() => {});
    await writeFile(join(dir, task.check.module), stripFences(text));
    await run(process.execPath, ['--test', '--test-reporter=tap', task.check.test], { cwd: dir, timeout: 120_000 });
    return { auto: 'pass', note: 'tests pass' };
  } catch (err) {
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    const failed = /# fail (\d+)/.exec(out)?.[1];
    return { auto: 'fail', note: failed ? `${failed} test(s) fail` : 'does not run' };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const checkExact = (task, text) => {
  const ok = stripFences(text) === task.check.expected.trim();
  return { auto: ok ? 'pass' : 'fail', note: ok ? 'exact match' : 'differs' };
};

const checkJsonKeys = (task, text) => {
  try {
    const data = JSON.parse(stripFences(text));
    const missing = task.check.keys.filter((k) => !(k in data));
    if (missing.length) return { auto: 'fail', note: `missing ${missing.join(', ')}` };
    return { auto: null, note: 'valid JSON; content needs a grade' };
  } catch {
    return { auto: 'fail', note: 'not valid JSON' };
  }
};

const checkMentions = (task, text) => {
  const lower = text.toLowerCase();
  const hit = task.check.anyOf.some((w) => lower.includes(w.toLowerCase()));
  return hit ? { auto: null, note: 'bug named; needs a grade' } : { auto: 'fail', note: 'planted bug not named' };
};

const CHECKS = {
  moduleTests: checkModuleTests,
  exact: checkExact,
  jsonKeys: checkJsonKeys,
  mentions: checkMentions,
  human: () => ({ auto: null, note: 'blind grade' }),
};

export const autoCheck = (task, text) => CHECKS[task.check.kind](task, text);
