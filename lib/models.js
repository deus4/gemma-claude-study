// Model callers. Each returns the same record shape so arms are comparable.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = promisify(execFile);

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
export const GEMMA_MODEL = 'gemma4:12b';
export const CLAUDE_MODEL = 'sonnet';
export const SYSTEM_PROMPT = 'You are a careful assistant. Follow the task exactly.';

export const callGemma = async (prompt) => {
  const started = Date.now();
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: GEMMA_MODEL,
      stream: false,
      think: false,
      // Google's recommended sampling for Gemma (temperature 1.0, top_k 64, top_p 0.95). The pilot at
      // temperature 0 fell into a repetition loop (2026-11-11). Output capped so a loop cannot run forever.
      options: { temperature: 1.0, top_k: 64, top_p: 0.95, num_predict: 8192 },
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = await res.json();
  return {
    model: GEMMA_MODEL,
    text: data.message?.content ?? '',
    local: { tokensIn: data.prompt_eval_count ?? 0, tokensOut: data.eval_count ?? 0 },
    cloud: null,
    ms: Date.now() - started,
  };
};

// Claude through Claude Code headless: the owner's real tool, no API key handled here.
// No tools, no settings, a one-line system prompt. The working directory must be OUTSIDE the home folder:
// Claude Code loads CLAUDE.md files from the working directory upward, and run 1 (from a folder inside the
// home directory) carried the owner's global instruction file in every call. --strict-mcp-config keeps the
// account's connectors (their tool definitions) out as well. Even so the CLI adds about 660 tokens of its
// own context (account e-mail, working directory, platform, date, model name).
const BARE_DIR = join(tmpdir(), 'gemma-claude-study-bare');
const BARE_LIMIT = 1000; // context tokens allowed for a one-line prompt; run 1 had 3,000 or more

export const callClaude = async (prompt) => {
  const started = Date.now();
  await mkdir(BARE_DIR, { recursive: true });
  const args = ['-p', prompt, '--output-format', 'json', '--model', CLAUDE_MODEL, '--tools', '',
    '--strict-mcp-config', '--no-session-persistence', '--setting-sources', 'project', '--system-prompt', SYSTEM_PROMPT];
  const { stdout } = await run('claude', args,
    { cwd: BARE_DIR, maxBuffer: 32 * 1024 * 1024, timeout: 600_000 });
  const data = JSON.parse(stdout);
  const u = data.usage ?? {};
  return {
    model: Object.keys(data.modelUsage ?? {})[0] ?? CLAUDE_MODEL,
    text: data.result ?? '',
    local: null,
    cloud: {
      tokensIn: u.input_tokens ?? 0,
      cacheRead: u.cache_read_input_tokens ?? 0,
      cacheWrite: u.cache_creation_input_tokens ?? 0,
      tokensOut: u.output_tokens ?? 0,
      costUsd: data.total_cost_usd ?? 0,
    },
    ms: Date.now() - started,
  };
};

// Refuse to run if Claude's context holds more than the CLI's own fixed part (e.g. an instruction file).
export const assertBare = async () => {
  const { cloud } = await callClaude('Reply with the single word ok.');
  const context = cloud.tokensIn + cloud.cacheRead + cloud.cacheWrite;
  if (context > BARE_LIMIT) throw new Error(`Claude is not bare: ${context} context tokens for a one-line prompt`);
  return context;
};

const reviewPrompt = (taskPrompt, draft) => `You are reviewing a draft written by a smaller model.

TASK GIVEN TO THE DRAFTER:
<task>
${taskPrompt}
</task>

DRAFT:
<draft>
${draft}
</draft>

If the draft fully and correctly does the task, reply with exactly: ACCEPT
Otherwise reply with only the corrected final answer, in the format the task asks for. No commentary.`;

// Hybrid arm: Gemma drafts, Claude accepts or fixes. Both costs are kept.
export const callHybrid = async (prompt) => {
  const draft = await callGemma(prompt);
  const review = await callClaude(reviewPrompt(prompt, draft.text));
  const accepted = review.text.trim() === 'ACCEPT';
  return {
    model: `${draft.model}+${review.model}`,
    text: accepted ? draft.text : review.text,
    accepted,
    local: draft.local,
    cloud: review.cloud,
    ms: draft.ms + review.ms,
  };
};

export const ARMS = { C: callClaude, G: callGemma, H: callHybrid };
