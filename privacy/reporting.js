// Pure aggregation for the report: runs + grades → per-arm numbers and markdown tables.
export const ARM_ORDER = ['C0', 'R', 'G', 'RG', 'L'];
export const ARM_NAME = { C0: 'no gate', R: 'rules', G: 'Gemma', RG: 'rules + Gemma', L: 'Gemma alone (nothing sent)' };
export const TYPES = ['personal', 'client', 'secret', 'knowhow'];

export const latestRuns = (runs) => [...new Map(runs.map((r) => [`${r.taskId}|${r.arm}`, r])).values()];

// Final quality of one result: auto result, else the human grade, else null (not graded yet).
export const finalQuality = (run, gradesByKey) => {
  const auto = run.quality?.quality;
  if (auto === 'pass' || auto === 'fail') return { grade: auto, failure: auto === 'fail' ? run.quality.note : null, source: 'auto' };
  const g = gradesByKey.get(`${run.taskId}|${run.arm}`);
  return g ? { grade: g.grade, failure: g.failure, source: 'human' } : { grade: null, failure: null, source: 'pending' };
};

const pct = (a, b) => (b ? (100 * a) / b : 0);
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
const count = (list, key) => list.reduce((acc, x) => ({ ...acc, [x[key]]: (acc[x[key]] ?? 0) + 1 }), {});

export const summarise = (runs, grades, tasks) => {
  const gradesByKey = new Map(grades.map((g) => [g.key, g]));
  const plantedByType = (kindFilter) => tasks.filter(kindFilter).flatMap((t) => t.canaries).reduce(
    (acc, c) => ({ ...acc, [c.type]: (acc[c.type] ?? 0) + 1 }), {});
  const latest = latestRuns(runs);
  const arms = ARM_ORDER.filter((a) => latest.some((r) => r.arm === a));
  return arms.map((arm) => {
    const rs = latest.filter((r) => r.arm === arm);
    const leaked = rs.flatMap((r) => r.leaked);
    const reid = rs.flatMap((r) => r.reidentified);
    const quality = rs.map((r) => ({ taskId: r.taskId, kind: r.kind, ...finalQuality(r, gradesByKey) }));
    const known = quality.filter((q) => q.grade);
    const byKind = Object.fromEntries([...new Set(rs.map((r) => r.kind))].map((kind) => {
      const q = quality.filter((x) => x.kind === kind);
      const k = rs.filter((r) => r.kind === kind);
      return [kind, {
        n: q.length, pass: q.filter((x) => x.grade === 'pass').length, pending: q.filter((x) => !x.grade).length,
        leaked: k.reduce((s, r) => s + r.leaked.length, 0), planted: k.reduce((s, r) => s + r.canaries, 0),
      }];
    }));
    const planted = rs.reduce((s, r) => s + r.canaries, 0);
    const typesPlanted = plantedByType((t) => rs.some((r) => r.taskId === t.id));
    return {
      arm, n: rs.length, planted, leaked: leaked.length, leakPct: pct(leaked.length, planted),
      tasksWithLeak: rs.filter((r) => r.leaked.length).length,
      leakByType: Object.fromEntries(TYPES.map((t) => [t, { leaked: leaked.filter((c) => c.type === t).length, planted: typesPlanted[t] ?? 0 }])),
      reid: reid.length, tasksWithReid: rs.filter((r) => r.reidentified.length).length,
      pass: known.filter((q) => q.grade === 'pass').length, known: known.length, pending: quality.length - known.length,
      failures: count(quality.filter((q) => q.grade === 'fail'), 'failure'),
      quality, byKind, costUsd: rs.reduce((s, r) => s + (r.costUsd ?? 0), 0),
      probeCostUsd: rs.reduce((s, r) => s + (r.probeCostUsd ?? 0), 0),
      medianMs: median(rs.map((r) => r.ms)), medianGateMs: median(rs.map((r) => r.gateMs ?? 0)),
      spans: rs.reduce((s, r) => s + (r.spans ?? 0), 0),
      leakedValues: count(leaked.map((c) => ({ v: `${c.type}: ${c.value}` })), 'v'),
    };
  });
};

const f1 = (x) => x.toFixed(1);

// Quality relative to "no gate", only on tasks graded in both setups (fair while grading is incomplete).
export const relativeQuality = (s, c0) => {
  if (!c0) return '–';
  const base = new Map(c0.quality.filter((q) => q.grade).map((q) => [q.taskId, q.grade]));
  const both = s.quality.filter((q) => q.grade && base.has(q.taskId));
  const basePass = both.filter((q) => base.get(q.taskId) === 'pass').length;
  if (!basePass) return '–';
  return `${f1(pct(both.filter((q) => q.grade === 'pass').length, basePass))} % (n=${both.length})`;
};

export const toMarkdown = (summary, meta) => {
  const lines = [];
  const row = (cells) => lines.push(`| ${cells.join(' | ')} |`);
  const c0 = summary.find((s) => s.arm === 'C0');
  lines.push(`# Results: local privacy gate before a cloud model`, '',
    `Generated ${meta.at} from \`privacy/out/${meta.run}/runs.jsonl\` and \`grades.jsonl\`. Task set seed ${meta.seed}: ${meta.tasks} synthetic tasks, ${meta.canaries} canaries.`,
    meta.pending ? `**${meta.pending} results have no human grade; quality numbers cover graded results only.**` : 'All results graded.', '');

  lines.push('## Headline', '');
  row(['Setup', 'Leaked', 'Tasks with any leak', 'Re-identified', 'Quality pass', 'Quality vs no gate', 'Claude cost']);
  row(['---', '---:', '---:', '---:', '---:', '---:', '---:']);
  for (const s of summary) {
    const rel = relativeQuality(s, c0);
    row([ARM_NAME[s.arm], `${s.leaked}/${s.planted} (${f1(s.leakPct)} %)`, `${s.tasksWithLeak}/${s.n}`, `${s.reid} in ${s.tasksWithReid} tasks`,
      `${s.pass}/${s.known}${s.pending ? ` (+${s.pending} pending)` : ''}`, rel, `$${s.costUsd.toFixed(2)}`]);
  }

  lines.push('', 'Claude cost is for the answer call only; the re-identification probe (a second call per gated task) is not included.',
    'Quality vs no gate is computed only on tasks graded in both setups.');
  lines.push('', '## Leakage by type', '');
  row(['Setup', ...TYPES]); row(['---', ...TYPES.map(() => '---:')]);
  for (const s of summary) row([ARM_NAME[s.arm], ...TYPES.map((t) => `${s.leakByType[t].leaked}/${s.leakByType[t].planted}`)]);

  lines.push('', '## By task kind (leaked · quality pass)', '');
  const kinds = [...new Set(summary.flatMap((s) => Object.keys(s.byKind)))];
  row(['Setup', ...kinds]); row(['---', ...kinds.map(() => '---')]);
  for (const s of summary) {
    row([ARM_NAME[s.arm], ...kinds.map((k) => {
      const b = s.byKind[k];
      return b ? `${f1(pct(b.leaked, b.planted))} % · ${b.pass}/${b.n - b.pending}${b.pending ? ` (+${b.pending})` : ''}` : '–';
    })]);
  }

  lines.push('', '## Failure types (quality)', '');
  for (const s of summary) {
    const f = Object.entries(s.failures).map(([k, v]) => `${k}: ${v}`).join(', ');
    lines.push(`- **${ARM_NAME[s.arm]}:** ${f || 'none'}`);
  }

  lines.push('', '## What still leaked through the gates', '');
  for (const s of summary.filter((x) => ['G', 'RG'].includes(x.arm))) {
    const top = Object.entries(s.leakedValues).sort((a, b) => b[1] - a[1]);
    lines.push(`- **${ARM_NAME[s.arm]}:** ${top.length ? top.map(([v, n]) => `${v} (×${n})`).join('; ') : 'nothing'}`);
  }

  lines.push('', '## Time', '');
  for (const s of summary) lines.push(`- ${ARM_NAME[s.arm]}: median ${f1(s.medianMs / 1000)} s per task (gate ${f1(s.medianGateMs / 1000)} s of that; the probe call is not included)`);
  return `${lines.join('\n')}\n`;
};
