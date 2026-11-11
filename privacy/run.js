// Privacy runs: every task through every arm; one JSON line per (task, arm) in privacy/out/runs.jsonl.
// Usage: node privacy/run.js [arms=C0,R,G,RG,L] [task id prefix, e.g. CODE]
// Resumable: pairs already in the file are skipped. Everything sent is synthetic, so the output is publishable.
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { callClaude, callGemma } from '../lib/models.js';
import { GATES } from './gates.js';
import { redact, restore } from './placeholders.js';
import { leaked, qualityCheck } from './checks.js';

const OUT = new URL('./out/', import.meta.url);
const RUNS = new URL('./runs.jsonl', OUT);

const REID = (sent) => `The text below had sensitive values replaced by placeholders (PERSON_1, CLIENT_1, EMAIL_1, METHOD_1 and so on).
For every placeholder, give your best guess of the original value. Then say what business, venue or method you think the text is about.
Reply with JSON only: {"guesses": {"PLACEHOLDER": "guess"}, "about": "..."}

TEXT:
<<<
${sent}
>>>`;

const typeCounts = (list) => list.reduce((a, c) => ({ ...a, [c.type]: (a[c.type] ?? 0) + 1 }), {});

const gated = async (task, gate) => {
  const spans = await GATES[gate](task.prompt);
  const { text: sent, map } = redact(task.prompt, spans);
  const answer = await callClaude(sent);
  const restored = restore(answer.text, map);
  const probe = await callClaude(REID(sent));
  const leakedNow = leaked(task, sent);
  const reidentified = leaked(task, probe.text).filter((c) => !leakedNow.some((l) => l.value === c.value));
  return {
    sentChars: sent.length, spans: map.length, sent, answer: restored, quality: await qualityCheck(task, restored),
    leaked: leakedNow, reidentified, costUsd: answer.cloud.costUsd + probe.cloud.costUsd, ms: answer.ms + probe.ms,
  };
};

const ARMS = {
  C0: async (task) => {
    const answer = await callClaude(task.prompt);
    return { sent: task.prompt, answer: answer.text, quality: await qualityCheck(task, answer.text),
      leaked: task.canaries, reidentified: [], costUsd: answer.cloud.costUsd, ms: answer.ms };
  },
  R: (task) => gated(task, 'R'),
  G: (task) => gated(task, 'G'),
  RG: (task) => gated(task, 'RG'),
  L: async (task) => {
    const answer = await callGemma(task.prompt);
    return { sent: '', answer: answer.text, quality: await qualityCheck(task, answer.text),
      leaked: [], reidentified: [], costUsd: 0, ms: answer.ms };
  },
};

const main = async () => {
  const arms = (process.argv[2] ?? 'C0,R,G,RG,L').split(',');
  const prefix = process.argv[3] ?? '';
  const { tasks } = JSON.parse(await readFile(new URL('./tasks.json', import.meta.url), 'utf8'));
  await mkdir(OUT, { recursive: true });
  const done = new Set((await readFile(RUNS, 'utf8').catch(() => '')).split('\n').filter(Boolean)
    .map((l) => JSON.parse(l)).map((r) => `${r.taskId}|${r.arm}`));
  for (const task of tasks.filter((t) => t.id.startsWith(prefix))) {
    for (const arm of arms) {
      if (done.has(`${task.id}|${arm}`)) continue;
      try {
        const r = await ARMS[arm](task);
        const record = { taskId: task.id, kind: task.kind, arm, at: new Date().toISOString(), canaries: task.canaries.length,
          leakedByType: typeCounts(r.leaked), reidByType: typeCounts(r.reidentified), ...r };
        await appendFile(RUNS, `${JSON.stringify(record)}\n`);
        console.log(`${task.id} ${arm}: quality ${r.quality.quality ?? 'to grade'} (${r.quality.note}); leaked ${r.leaked.length}/${task.canaries.length}; re-id ${r.reidentified.length}; $${r.costUsd.toFixed(3)}`);
      } catch (err) {
        console.error(`${task.id} ${arm}: error ${err.message}`);
      }
    }
  }
};

main();
