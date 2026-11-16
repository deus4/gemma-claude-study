// Where a run's files live: privacy/out/<run>/. Pick the run with RUN=run1 (default: the latest run).
import { readFile } from 'node:fs/promises';

export const RUN = process.env.RUN ?? 'run2';
export const runDir = (run = RUN) => new URL(`./out/${run}/`, import.meta.url);

export const readJsonl = async (url) => (await readFile(url, 'utf8').catch(() => ''))
  .split('\n').filter(Boolean).map((line) => JSON.parse(line));

// Each run keeps the task set it was run on (the set changed slightly between runs; see WRITEUP.md).
export const readTasks = async (run = RUN) => JSON.parse(
  await readFile(new URL('./tasks.json', runDir(run)), 'utf8')
    .catch(() => readFile(new URL('./tasks.json', import.meta.url), 'utf8')));
