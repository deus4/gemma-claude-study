// Builds the synthetic privacy task set: privacy/tasks.json (publishable: every value is invented).
// Usage: node privacy/build.js [seed]
import { writeFile } from 'node:fs/promises';
import { makeRng } from './rng.js';
import { canariesOf, makeKey, makeMethod, makePerson, makeVenue } from './identities.js';
import { buildCode } from './kinds/code.js';
import { buildSql } from './kinds/sql.js';
import { buildEmail } from './kinds/email.js';
import { buildNotes } from './kinds/notes.js';

const PLAN = [['code', buildCode, 8], ['sql', buildSql, 8], ['email', buildEmail, 8], ['notes', buildNotes, 6]];

const build = (seed) => {
  const rng = makeRng(seed);
  return PLAN.flatMap(([kind, fn, n]) => Array.from({ length: n }, (_, i) => {
    const venue = makeVenue(rng);
    const ctx = { rng, venue, person: makePerson(rng, venue), key: makeKey(rng), method: makeMethod(rng) };
    const task = fn(ctx, i);
    const used = task.canarySource ?? {
      people: [ctx.person], venues: [ctx.venue],
      keys: kind === 'code' || kind === 'notes' ? [ctx.key] : [],
      methods: kind === 'code' || kind === 'notes' ? [ctx.method] : [],
    };
    const canaries = canariesOf(used).filter((c) => task.prompt.includes(c.value));
    const { canarySource, ...rest } = task;
    return { id: `${kind.toUpperCase()}-${String(i + 1).padStart(2, '0')}`, ...rest, canaries };
  }));
};

const seed = Number(process.argv[2] ?? 20261111);
const tasks = build(seed);
await writeFile(new URL('./tasks.json', import.meta.url), JSON.stringify({ seed, tasks }, null, 2));
console.log(`privacy/tasks.json: ${tasks.length} tasks, ${tasks.reduce((s, t) => s + t.canaries.length, 0)} canaries`);
