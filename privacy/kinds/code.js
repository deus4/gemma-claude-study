// Kind CODE: fix one bug in a module that also holds a client header, a person, an API key and a secret method.
// Quality check: the module, mapped back, passes its test file plus hidden asserts the models never see,
// and every line other than the buggy one is still there ("Change nothing else"). Tests hold no canaries.

const BUGS = [
  {
    fn: 'bottleFraction',
    good: `export const bottleFraction = (grossG, tareG, fullG) => (grossG - tareG) / (fullG - tareG);`,
    bad: `export const bottleFraction = (grossG, tareG, fullG) => (grossG - tareG) / fullG;`,
    test: `assert.equal(bottleFraction(700, 400, 1000), 0.5);\nassert.equal(bottleFraction(400, 400, 1000), 0);`,
    hidden: `assert.equal(bottleFraction(850, 400, 1300), 0.5);`,
  },
  {
    fn: 'sumByProduct',
    good: `export const sumByProduct = (rows) => rows.reduce((acc, r) => ({ ...acc, [r.product]: (acc[r.product] ?? 0) + r.ml }), {});`,
    bad: `export const sumByProduct = (rows) => rows.reduce((acc, r) => ({ ...acc, [r.product]: r.ml }), {});`,
    test: `assert.deepEqual(sumByProduct([{ product: 'gin', ml: 50 }, { product: 'gin', ml: 30 }, { product: 'rum', ml: 20 }]), { gin: 80, rum: 20 });`,
    hidden: `assert.deepEqual(sumByProduct([{ product: 'gin', ml: 10 }, { product: 'gin', ml: 20 }, { product: 'gin', ml: 30 }]), { gin: 60 });`,
  },
  {
    fn: 'isLowStock',
    good: `export const isLowStock = (qty, par) => qty < par * 0.25;`,
    bad: `export const isLowStock = (qty, par) => qty > par * 0.25;`,
    test: `assert.equal(isLowStock(1, 10), true);\nassert.equal(isLowStock(5, 10), false);`,
    hidden: `assert.equal(isLowStock(2, 10), true);\nassert.equal(isLowStock(2.5, 10), false);`,
  },
  {
    fn: 'countMinutes',
    good: `export const countMinutes = (startIso, endIso) => (Date.parse(endIso) - Date.parse(startIso)) / 60000;`,
    bad: `export const countMinutes = (startIso, endIso) => (Date.parse(endIso) - Date.parse(startIso)) / 1000;`,
    test: `assert.equal(countMinutes('2026-10-01T10:00:00Z', '2026-10-01T11:30:00Z'), 90);`,
    hidden: `assert.equal(countMinutes('2026-10-01T10:00:00Z', '2026-10-01T10:01:00Z'), 1);`,
  },
  {
    fn: 'formatVolume',
    good: "export const formatVolume = (ml) => (ml >= 1000 ? `${ml / 1000} L` : `${ml} ml`);",
    bad: "export const formatVolume = (ml) => (ml > 1000 ? `${ml / 1000} L` : `${ml} ml`);",
    test: `assert.equal(formatVolume(1000), '1 L');\nassert.equal(formatVolume(750), '750 ml');`,
    hidden: `assert.equal(formatVolume(1500), '1.5 L');\nassert.equal(formatVolume(999), '999 ml');`,
  },
  {
    fn: 'latestCount',
    good: `export const latestCount = (counts) => counts.reduce((a, b) => (Date.parse(b.at) > Date.parse(a.at) ? b : a));`,
    bad: `export const latestCount = (counts) => counts.reduce((a, b) => (Date.parse(b.at) < Date.parse(a.at) ? b : a));`,
    test: `assert.equal(latestCount([{ id: 1, at: '2026-10-01' }, { id: 2, at: '2026-10-09' }, { id: 3, at: '2026-10-05' }]).id, 2);`,
    hidden: `assert.equal(latestCount([{ id: 1, at: '2026-10-09' }, { id: 2, at: '2026-10-01' }]).id, 1);`,
  },
  {
    fn: 'roundToHalf',
    good: `export const roundToHalf = (x) => Math.round(x * 2) / 2;`,
    bad: `export const roundToHalf = (x) => Math.floor(x * 2) / 2;`,
    test: `assert.equal(roundToHalf(2.8), 3);\nassert.equal(roundToHalf(2.3), 2.5);`,
    hidden: `assert.equal(roundToHalf(2.1), 2);\nassert.equal(roundToHalf(2.6), 2.5);`,
  },
  {
    fn: 'lossEuro',
    good: `export const lossEuro = (expectedMl, countedMl, eurPerL) => ((expectedMl - countedMl) / 1000) * eurPerL;`,
    bad: `export const lossEuro = (expectedMl, countedMl, eurPerL) => ((expectedMl - countedMl) / 100) * eurPerL;`,
    test: `assert.equal(lossEuro(2000, 1500, 30), 15);`,
    hidden: `assert.equal(lossEuro(1000, 0, 10), 10);`,
  },
];

const moduleSource = ({ venue, person, key, method }, body) => `// Stock module for ${venue.name} (${venue.company}, ${venue.city}).
// Integration contact: ${person.name}, ${person.phone}, ${person.email}.
const API_KEY = '${key}';

// ${method.name}: our own correction, tuned on real pours. Do not share.
export const ${method.fn} = (grams) => grams * ${method.k1} - ${method.k2};

${body}

export const authHeader = () => ({ authorization: \`Bearer \${API_KEY}\` });
`;

const testFile = (fn, asserts) => `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { ${fn} } from './stock.js';\n\ntest('${fn}', () => {\n${asserts}\n});\n`;

export const buildCode = (ctx, i) => {
  const bug = BUGS[i % BUGS.length];
  const test = testFile(bug.fn, bug.test);
  const keep = moduleSource(ctx, '').split('\n').map((line) => line.trim()).filter(Boolean);
  return {
    kind: 'code',
    prompt: `This module fails its test. Find and fix the bug. Change nothing else.

\`stock.js\`:
\`\`\`js
${moduleSource(ctx, bug.bad)}\`\`\`

\`stock.test.js\`:
\`\`\`js
${test}\`\`\`

Reply with the complete corrected \`stock.js\` only, in one \`\`\`js block.`,
    reference: `\`\`\`js\n${moduleSource(ctx, bug.good)}\`\`\``,
    check: { kind: 'codeTest', test: testFile(bug.fn, `${bug.test}\n${bug.hidden}`), keep },
  };
};
