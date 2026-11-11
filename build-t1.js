// Builds T1 tasks: "implement this module so that this test file passes", from Getti's pure modules.
// Usage: node build-t1.js <path-to-GettiApp>
// Security code (passwords, tokens, TOTP) and anything touching config or the database is excluded on purpose.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PAIRS = [
  ['src/core/attributes.js', 'test/attributes.test.js'],
  ['src/core/counting.js', 'test/counting.test.js'],
  ['src/core/product.js', 'test/product.test.js'],
  ['src/core/recipes.js', 'test/recipes.test.js'],
  ['src/core/reportFormat.js', 'test/reportFormat.test.js'],
  ['server/blocks/plc/layout.js', 'test/layout.test.js'],
];

const exportsOf = (src) => [...src.matchAll(/export\s+(?:async\s+)?(?:function|const|let)\s+(\w+)/g)].map((m) => m[1]);
const importsOf = (src) => src.split('\n').filter((l) => l.startsWith('import ')).join('\n');

const prompt = (module, testFile, testSrc, exported, imports) => `Write the JavaScript ES module \`${module}\` so that the test file below passes with \`node --test\`.

Rules: plain JavaScript (no TypeScript), ES modules, Node.js 24, no new dependencies, pure functions where possible, const by default.
The module must export: ${exported.join(', ')}.
${imports ? `It may use these imports (the same as the original):\n${imports}\n` : 'It has no imports.'}
Test file \`${testFile}\`:
\`\`\`js
${testSrc}
\`\`\`

Reply with the complete module only, in one \`\`\`js block.`;

const main = async () => {
  const repo = process.argv[2];
  if (!repo) throw new Error('usage: node build-t1.js <path-to-GettiApp>');
  const tasks = await Promise.all(PAIRS.map(async ([module, test], i) => {
    const src = await readFile(join(repo, module), 'utf8');
    const testSrc = await readFile(join(repo, test), 'utf8');
    return {
      id: `T1-${String(i + 1).padStart(2, '0')}`,
      category: 'T1',
      source: `GettiApp ${module}`,
      prompt: prompt(module, test, testSrc, exportsOf(src), importsOf(src)),
      check: { kind: 'moduleTests', repo, module, test },
    };
  }));
  await writeFile('tasks/T1.json', JSON.stringify(tasks, null, 2));
  console.log(`tasks/T1.json: ${tasks.length} tasks`);
};

main();
