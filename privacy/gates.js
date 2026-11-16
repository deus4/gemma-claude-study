// Gates: find sensitive spans before anything leaves the machine.
import { callGemma } from '../lib/models.js';
import { stripFences } from '../lib/checks.js';

// R: pattern rules only. Deliberately no client or name list: a pattern gate cannot know names.
const RULES = [
  { type: 'email', re: /[\w.+-]+@[\w-]+(\.[\w-]+)+/g },
  { type: 'idcode', re: /\b[1-6]\d{10}\b/g },
  { type: 'phone', re: /\+\d{3}[ \d]{7,11}\d/g },
  { type: 'iban', re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g },
  { type: 'secret', re: /\b[A-Za-z0-9]+_(?:live|test|key|secret)_[A-Za-z0-9]{16,}\b/g },
  { type: 'secret', re: /\b(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Z])[A-Za-z0-9]{32,}\b/g },
];

export const rulesGate = async (text) =>
  RULES.flatMap(({ type, re }) => [...text.matchAll(re)].map((m) => ({ text: m[0].trim(), type })));

const GEMMA_GATE = (text) => `You protect a company's data before text is sent to an outside AI service.
List every span in the text below that must NOT leave the company:
- personal: names of people, personal ID codes, phone numbers, e-mail addresses
- client: names of client businesses, venues and companies
- secret: passwords, API keys, tokens
- knowhow: names of internal methods, proprietary formulas, their constants, confidential prices

Copy each span exactly as it appears. Do not list generic words, code keywords or table names.
Reply with JSON only: [{"text": "...", "type": "personal|client|secret|knowhow"}]

TEXT:
<<<
${text}
>>>`;

const TYPES = new Set(['personal', 'client', 'secret', 'knowhow']);

// G: Gemma lists spans; only spans that literally occur in the text are kept (a model can misquote).
// Fails closed: if the reply is not a JSON list, this throws and nothing is sent.
export const gemmaGate = async (text) => {
  const out = await callGemma(GEMMA_GATE(text));
  const list = JSON.parse(stripFences(out.text));
  if (!Array.isArray(list)) throw new Error('gate reply is not a list');
  return list.filter((s) => typeof s?.text === 'string' && s.text.length > 1 && text.includes(s.text))
    .map((s) => ({ text: s.text, type: TYPES.has(s.type) ? s.type : 'personal' }));
};

// Rules last: redact() keeps the last span for a text, so a rule's exact type (EMAIL, IDCODE, PHONE) wins
// over the model's broader one (PERSON).
export const bothGate = async (text) => [...(await gemmaGate(text)), ...(await rulesGate(text))];

export const GATES = { R: rulesGate, G: gemmaGate, RG: bothGate };
