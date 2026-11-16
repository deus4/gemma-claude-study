// Writes privacy/out/<run>/REPORT.md from the runs, the blind grades and the task set of that run.
// Usage: [RUN=run2] node privacy/report.js
import { writeFile } from 'node:fs/promises';
import { summarise, toMarkdown } from './reporting.js';
import { RUN, readJsonl, readTasks, runDir } from './paths.js';

const OUT = runDir();
const { seed, tasks } = await readTasks();
const runs = await readJsonl(new URL('./runs.jsonl', OUT));
const grades = await readJsonl(new URL('./grades.jsonl', OUT));
const summary = summarise(runs, grades, tasks);
const pending = summary.reduce((s, a) => s + a.pending, 0);
const md = toMarkdown(summary, {
  at: new Date().toISOString().slice(0, 10), seed, tasks: tasks.length, run: RUN,
  canaries: tasks.reduce((s, t) => s + t.canaries.length, 0), pending,
});
await writeFile(new URL('./REPORT.md', OUT), md);
await writeFile(new URL('./summary.json', OUT), JSON.stringify(summary, null, 2));
console.log(md);
