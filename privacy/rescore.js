// Re-applies today's automatic checks to the stored answers of a run, without changing its files.
// Used to score run 1 (graded with a weaker code check) on the same footing as run 2.
// Usage: RUN=run1 node privacy/rescore.js
import { ARM_NAME, ARM_ORDER, latestRuns } from './reporting.js';
import { qualityCheck } from './checks.js';
import { RUN, readJsonl, runDir } from './paths.js';
import { readFile } from 'node:fs/promises';

const { tasks } = JSON.parse(await readFile(new URL('./tasks.json', import.meta.url), 'utf8'));
const byId = new Map(tasks.map((t) => [t.id, t]));
const runs = latestRuns(await readJsonl(new URL('./runs.jsonl', runDir()))).filter((r) => ['code', 'sql'].includes(r.kind));

console.log(`${RUN}, automatic checks of today on stored answers (code and SQL):`);
for (const arm of ARM_ORDER) {
  const rows = [];
  for (const r of runs.filter((x) => x.arm === arm)) rows.push([r, await qualityCheck(byId.get(r.taskId), r.answer)]);
  const pass = (kind) => rows.filter(([r, q]) => r.kind === kind && q.quality === 'pass').length;
  const changed = rows.filter(([r, q]) => q.quality !== r.quality.quality).map(([r, q]) => `${r.taskId} ${r.quality.quality} → ${q.quality} (${q.note})`);
  console.log(`- ${ARM_NAME[arm]}: code ${pass('code')}/8, sql ${pass('sql')}/8${changed.length ? `; changed: ${changed.join('; ')}` : ''}`);
}
