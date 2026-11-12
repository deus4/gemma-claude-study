// Writes privacy/out/REPORT.md from the runs, the blind grades and the task set.
// Usage: node privacy/report.js
import { readFile, writeFile } from 'node:fs/promises';
import { summarise, toMarkdown } from './reporting.js';

const readJsonl = async (url) => (await readFile(url, 'utf8').catch(() => '')).split('\n').filter(Boolean).map((l) => JSON.parse(l));

const { seed, tasks } = JSON.parse(await readFile(new URL('./tasks.json', import.meta.url), 'utf8'));
const runs = await readJsonl(new URL('./out/runs.jsonl', import.meta.url));
const grades = await readJsonl(new URL('./out/grades.jsonl', import.meta.url));
const summary = summarise(runs, grades, tasks);
const pending = summary.reduce((s, a) => s + a.pending, 0);
const md = toMarkdown(summary, {
  at: new Date().toISOString().slice(0, 10), seed, tasks: tasks.length,
  canaries: tasks.reduce((s, t) => s + t.canaries.length, 0), pending,
});
await writeFile(new URL('./out/REPORT.md', import.meta.url), md);
await writeFile(new URL('./out/summary.json', import.meta.url), JSON.stringify(summary, null, 2));
console.log(md);
