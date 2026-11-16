// Privacy runs: every task through every arm; one JSON line per (task, arm) in privacy/out/<run>/runs.jsonl.
// Usage: [RUN=run2] node privacy/run.js [arms=C0,R,G,RG,L] [task id prefix, e.g. CODE]
// Resumable: pairs already in the file are skipped. Everything sent is synthetic, so the output is publishable.
import { appendFile, copyFile, mkdir } from 'node:fs/promises';
import { assertBare, callClaude, callGemma } from '../lib/models.js';
import { GATES } from './gates.js';
import { redact, restore } from './placeholders.js';
import { leaked, qualityCheck } from './checks.js';
import { RUN, readJsonl, readTasks, runDir } from './paths.js';

const OUT = runDir();
const RUNS = new URL('./runs.jsonl', OUT);
const CLOUD_ARMS = ['C0', 'R', 'G', 'RG'];

const REID = (sent) => `The text below had sensitive values replaced by placeholders (PERSON_1, CLIENT_1, EMAIL_1, METHOD_1 and so on).
For every placeholder, give your best guess of the original value. Then say what business, venue or method you think the text is about.
Reply with JSON only: {"guesses": {"PLACEHOLDER": "guess"}, "about": "..."}

TEXT:
<<<
${sent}
>>>`;

const typeCounts = (list) => list.reduce((a, c) => ({ ...a, [c.type]: (a[c.type] ?? 0) + 1 }), {});

// A gate that throws (e.g. the model's reply is not a list) stops the task before anything is sent.
const gated = async (task, gate) => {
  const gateStarted = Date.now();
  const spans = await GATES[gate](task.prompt);
  const gateMs = Date.now() - gateStarted;
  const { text: sent, map } = redact(task.prompt, spans);
  const answer = await callClaude(sent);
  const restored = restore(answer.text, map);
  const probe = await callClaude(REID(sent));
  const leakedNow = leaked(task, sent);
  const reidentified = leaked(task, probe.text).filter((c) => !leakedNow.some((l) => l.value === c.value));
  return {
    sent, map, answer: restored, answerAsReceived: answer.text, probe: probe.text,
    quality: await qualityCheck(task, restored), leaked: leakedNow, reidentified,
    model: answer.model, usage: { answer: answer.cloud, probe: probe.cloud },
    costUsd: answer.cloud.costUsd, probeCostUsd: probe.cloud.costUsd,
    gateMs, answerMs: answer.ms, probeMs: probe.ms, ms: gateMs + answer.ms,
  };
};

const ARMS = {
  C0: async (task) => {
    const answer = await callClaude(task.prompt);
    return { sent: task.prompt, map: [], answer: answer.text, quality: await qualityCheck(task, answer.text),
      leaked: task.canaries, reidentified: [], model: answer.model, usage: { answer: answer.cloud },
      costUsd: answer.cloud.costUsd, probeCostUsd: 0, gateMs: 0, answerMs: answer.ms, ms: answer.ms };
  },
  R: (task) => gated(task, 'R'),
  G: (task) => gated(task, 'G'),
  RG: (task) => gated(task, 'RG'),
  L: async (task) => {
    const answer = await callGemma(task.prompt);
    return { sent: '', map: [], answer: answer.text, quality: await qualityCheck(task, answer.text),
      leaked: [], reidentified: [], model: answer.model, usage: { local: answer.local },
      costUsd: 0, probeCostUsd: 0, gateMs: 0, answerMs: answer.ms, ms: answer.ms };
  },
};

const main = async () => {
  const arms = (process.argv[2] ?? 'C0,R,G,RG,L').split(',');
  const prefix = process.argv[3] ?? '';
  const { tasks } = await readTasks();
  await mkdir(OUT, { recursive: true });
  // Keep the exact task set next to the results it produced.
  await copyFile(new URL('./tasks.json', import.meta.url), new URL('./tasks.json', OUT));
  if (arms.some((a) => CLOUD_ARMS.includes(a))) {
    console.log(`${RUN}: Claude context for a one-line prompt: ${await assertBare()} tokens (bare check passed)`);
  }
  const done = new Set((await readJsonl(RUNS)).map((r) => `${r.taskId}|${r.arm}`));
  for (const task of tasks.filter((t) => t.id.startsWith(prefix))) {
    for (const arm of arms) {
      if (done.has(`${task.id}|${arm}`)) continue;
      try {
        const r = await ARMS[arm](task);
        const record = { taskId: task.id, kind: task.kind, arm, at: new Date().toISOString(), canaries: task.canaries.length,
          leakedByType: typeCounts(r.leaked), reidByType: typeCounts(r.reidentified), spans: r.map.length, ...r };
        await appendFile(RUNS, `${JSON.stringify(record)}\n`);
        console.log(`${task.id} ${arm}: quality ${r.quality.quality ?? 'to grade'} (${r.quality.note}); leaked ${r.leaked.length}/${task.canaries.length}; re-id ${r.reidentified.length}; gate ${(r.gateMs / 1000).toFixed(1)} s; $${r.costUsd.toFixed(3)}`);
      } catch (err) {
        console.error(`${task.id} ${arm}: error, nothing recorded: ${err.message}`);
      }
    }
  }
};

main();
