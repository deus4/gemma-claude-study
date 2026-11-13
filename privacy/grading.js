// Pure helpers for blind grading: build the queue, shuffle it reproducibly, record grades.
import { makeRng } from './rng.js';

export const RUBRIC = {
  email: [
    'PASS only if all hold:',
    '- answers what the customer actually asked, correctly for a bar inventory app',
    '- follows "How Getti works" in the task: never asks for ID codes, never sends reports or exports by e-mail',
    '- addresses the sender by name',
    '- invents nothing: no made-up prices, dates, policies or promises',
    '- short, friendly, plain text',
  ],
  notes: [
    'PASS only if all hold:',
    '- at most 5 summary bullets, then the action items',
    '- all three actions: send the contract, enable foam correction, rotate the sandbox key',
    '- invents nothing and drops nothing important (the price, the "do not tell them" point)',
  ],
};

export const FAILURE_TYPES = { w: 'wrong', i: 'invented fact', m: 'missed requirement', f: 'format', s: 'style' };

// Latest record per (task, arm) that still needs a human grade.
export const toGrade = (runs) => {
  const latest = new Map(runs.map((r) => [`${r.taskId}|${r.arm}`, r]));
  return [...latest.values()].filter((r) => r.quality?.quality === null);
};

export const shuffle = (list, seed) => {
  const rng = makeRng(seed);
  return list.map((item) => [rng.next(), item]).sort((a, b) => a[0] - b[0]).map(([, item]) => item);
};

export const keyOf = (r) => `${r.taskId}|${r.arm}`;

export const pending = (queue, grades) => {
  const done = new Set(grades.map((g) => g.key));
  return queue.filter((r) => !done.has(keyOf(r)));
};

// One keystroke answer → a grade, or null if the input is not valid.
export const parseGrade = (input) => {
  const s = input.trim().toLowerCase();
  if (s === 'p') return { grade: 'pass', failure: null };
  const m = /^f\s*([wimfs])$/.exec(s);
  return m ? { grade: 'fail', failure: FAILURE_TYPES[m[1]] } : null;
};
