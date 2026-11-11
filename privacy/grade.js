// Blind grading in the terminal. The setup that produced each answer is never shown.
// Usage (in your own terminal): node privacy/grade.js
// Resumable: grades go to privacy/out/grades.jsonl; quit any time with q.
import { createInterface } from 'node:readline/promises';
import { appendFile, readFile } from 'node:fs/promises';
import { FAILURE_TYPES, RUBRIC, keyOf, parseGrade, pending, shuffle, toGrade } from './grading.js';

const OUT = new URL('./out/', import.meta.url);
const SEED = 4242;

const readJsonl = async (url) => (await readFile(url, 'utf8').catch(() => '')).split('\n').filter(Boolean).map((l) => JSON.parse(l));

const main = async () => {
  const { tasks } = JSON.parse(await readFile(new URL('./tasks.json', import.meta.url), 'utf8'));
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const queue = shuffle(toGrade(await readJsonl(new URL('./runs.jsonl', OUT))), SEED);
  const grades = await readJsonl(new URL('./grades.jsonl', OUT));
  const left = pending(queue, grades);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const types = Object.entries(FAILURE_TYPES).map(([k, v]) => `f${k}=${v}`).join('  ');
  console.log(`${queue.length} answers to grade, ${left.length} left. Keys: p=pass  ${types}  s=skip  q=quit\n`);

  for (const [i, r] of left.entries()) {
    const task = byId.get(r.taskId);
    console.clear();
    console.log(`Answer ${queue.length - left.length + i + 1} of ${queue.length} · ${task.kind}\n`);
    console.log(RUBRIC[task.kind].join('\n'));
    console.log(`\n──── TASK ────\n${task.prompt}\n\n──── ANSWER ────\n${r.answer}\n`);
    let grade = null;
    while (!grade) {
      const input = (await rl.question(`p / ${types} / s / q > `)).trim().toLowerCase();
      if (input === 'q') { rl.close(); return; }
      if (input === 's') break;
      grade = parseGrade(input);
    }
    if (grade) {
      await appendFile(new URL('./grades.jsonl', OUT), `${JSON.stringify({ key: keyOf(r), ...grade, at: new Date().toISOString() })}\n`);
    }
  }
  rl.close();
  console.log('All graded. Thank you.');
};

main();
