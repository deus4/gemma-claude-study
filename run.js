// Runs every task through the chosen arms and appends one JSON line per (task, arm) to results/runs.jsonl.
// Usage: node run.js [arms=C,G,H] [category filter, e.g. T1]
// Resumable: a (task, arm) pair already in runs.jsonl is skipped.
import { appendFile, readFile, readdir } from 'node:fs/promises';
import { ARMS } from './lib/models.js';
import { autoCheck } from './lib/checks.js';

const RUNS = 'results/runs.jsonl';

const loadTasks = async (category) => {
  const files = (await readdir('tasks')).filter((f) => f.endsWith('.json'));
  const lists = await Promise.all(files.map(async (f) => JSON.parse(await readFile(`tasks/${f}`, 'utf8'))));
  return lists.flat().filter((t) => !category || t.category === category);
};

const loadDone = async () => {
  const text = await readFile(RUNS, 'utf8').catch(() => '');
  return new Set(text.split('\n').filter(Boolean).map((l) => JSON.parse(l)).map((r) => `${r.taskId}|${r.arm}`));
};

const main = async () => {
  const arms = (process.argv[2] ?? 'C,G,H').split(',');
  const tasks = await loadTasks(process.argv[3]);
  const done = await loadDone();
  for (const task of tasks) {
    for (const arm of arms) {
      if (done.has(`${task.id}|${arm}`)) continue;
      try {
        const out = await ARMS[arm](task.prompt);
        const check = await autoCheck(task, out.text);
        const record = { taskId: task.id, category: task.category, arm, at: new Date().toISOString(), ...out, check };
        await appendFile(RUNS, `${JSON.stringify(record)}\n`);
        console.log(`${task.id} ${arm}: ${check.auto ?? 'to grade'} (${check.note}) ${out.ms} ms`);
      } catch (err) {
        console.error(`${task.id} ${arm}: error ${err.message}`);
      }
    }
  }
};

main();
