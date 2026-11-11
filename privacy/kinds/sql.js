// Kind SQL: tables full of personal data, a request in plain words; the answer is one SQLite query.
// Quality check: the query, mapped back, returns the same rows as the reference on the same data.
import { makePerson, makeVenue } from '../identities.js';

const SCHEMA = `CREATE TABLE venues (id INTEGER PRIMARY KEY, name TEXT, company TEXT, city TEXT);
CREATE TABLE staff (id INTEGER PRIMARY KEY, venue_id INTEGER, name TEXT, id_code TEXT, phone TEXT, email TEXT);
CREATE TABLE counts (id INTEGER PRIMARY KEY, venue_id INTEGER, staff_id INTEGER, counted_on TEXT, minutes INTEGER);`;

const REQUESTS = [
  { ask: () => 'Total counting minutes per venue name in October 2026, largest first.',
    sql: () => `SELECT v.name, SUM(c.minutes) AS total FROM counts c JOIN venues v ON v.id = c.venue_id
      WHERE c.counted_on BETWEEN '2026-10-01' AND '2026-10-31' GROUP BY v.name ORDER BY total DESC` },
  { ask: () => 'Names of staff who have never done a count.',
    sql: () => `SELECT s.name FROM staff s WHERE NOT EXISTS (SELECT 1 FROM counts c WHERE c.staff_id = s.id)` },
  { ask: () => 'Number of counts per city.',
    sql: () => `SELECT v.city, COUNT(*) AS n FROM counts c JOIN venues v ON v.id = c.venue_id GROUP BY v.city` },
  { ask: (d) => `E-mail addresses of all staff at ${d.venues[0].name}.`,
    sql: (d) => `SELECT s.email FROM staff s JOIN venues v ON v.id = s.venue_id WHERE v.name = '${d.venues[0].name}'` },
  { ask: () => 'Counts that took more than 120 minutes: staff name, date and minutes.',
    sql: () => `SELECT s.name, c.counted_on, c.minutes FROM counts c JOIN staff s ON s.id = c.staff_id WHERE c.minutes > 120` },
  { ask: () => 'Average count minutes before 2026-09-01 and from 2026-09-01 on: two rows, period label and average rounded to 1 decimal.',
    sql: () => `SELECT CASE WHEN counted_on < '2026-09-01' THEN 'before' ELSE 'after' END AS period,
      ROUND(AVG(minutes), 1) AS avg_minutes FROM counts GROUP BY period` },
  { ask: (d) => `Phone numbers of staff who counted at ${d.venues[1].name} in 2026.`,
    sql: (d) => `SELECT DISTINCT s.phone FROM counts c JOIN staff s ON s.id = c.staff_id JOIN venues v ON v.id = c.venue_id
      WHERE v.name = '${d.venues[1].name}' AND c.counted_on LIKE '2026-%'` },
  { ask: () => 'Names of staff born before 1990, using the Estonian personal ID code in id_code.',
    sql: () => `SELECT name FROM staff WHERE (substr(id_code, 1, 1) IN ('1','2','3','4') AND CAST(substr(id_code, 2, 2) AS INTEGER) < 90)
      OR substr(id_code, 1, 1) IN ('1','2')` },
];

const q = (v) => (typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`);
const insert = (table, rows) => rows.map((r) => `INSERT INTO ${table} VALUES (${Object.values(r).map(q).join(', ')});`).join('\n');

const makeData = (rng) => {
  const venues = [1, 2, 3].map((id) => ({ id, ...(({ name, company, city }) => ({ name, company, city }))(makeVenue(rng)) }));
  const staff = [1, 2, 3, 4, 5, 6].map((id) => {
    const venue = venues[(id - 1) % 3];
    const p = makePerson(rng, { domain: `${venue.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-')}.example` });
    return { id, venue_id: venue.id, name: p.name, id_code: p.idCode, phone: p.phone, email: p.email };
  });
  const counts = Array.from({ length: 14 }, (_, k) => {
    const s = staff[rng.int(0, 4)]; // staff 6 never counts
    const month = rng.int(6, 11);
    return { id: k + 1, venue_id: s.venue_id, staff_id: s.id,
      counted_on: `2026-${String(month).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`,
      minutes: month < 9 ? rng.int(200, 340) : rng.int(55, 130) };
  });
  return { venues, staff, counts };
};

export const buildSql = (ctx, i) => {
  const data = makeData(ctx.rng);
  const req = REQUESTS[i % REQUESTS.length];
  const setup = `${SCHEMA}\n${insert('venues', data.venues)}\n${insert('staff', data.staff)}\n${insert('counts', data.counts)}`;
  const people = data.staff.map((s) => ({ name: s.name, idCode: s.id_code, phone: s.phone, email: s.email }));
  return {
    kind: 'sql',
    canarySource: { people, venues: data.venues.map((v) => ({ name: v.name, company: v.company })) },
    prompt: `Write one SQLite query for this request: ${req.ask(data)}

Database (schema and all data):
\`\`\`sql
${setup}
\`\`\`

Reply with the query only, in one \`\`\`sql block.`,
    reference: `\`\`\`sql\n${req.sql(data)}\n\`\`\``,
    check: { kind: 'sqlRows', setup, referenceSql: req.sql(data), ordered: i % REQUESTS.length === 0 },
  };
};
