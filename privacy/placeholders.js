// Placeholder swap, done by code (not by a model) so the mapping is exact and reversible.
const PREFIX = { personal: 'PERSON', client: 'CLIENT', secret: 'SECRET', knowhow: 'METHOD', email: 'EMAIL',
  phone: 'PHONE', idcode: 'IDCODE', iban: 'IBAN' };

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// spans: [{ text, type }] → { text, map } with map = [{ placeholder, value }]
export const redact = (text, spans) => {
  const unique = [...new Map(spans.filter((s) => s.text && text.includes(s.text)).map((s) => [s.text, s])).values()]
    .sort((a, b) => b.text.length - a.text.length); // longest first: an e-mail before the name inside it
  const counters = {};
  const map = unique.map((s) => {
    const prefix = PREFIX[s.type] ?? 'PRIVATE';
    counters[prefix] = (counters[prefix] ?? 0) + 1;
    return { placeholder: `${prefix}_${counters[prefix]}`, value: s.text };
  });
  return { text: substitute(text, map), map };
};

// Apply an existing map (value → placeholder), longest value first.
export const substitute = (text, map) => [...map]
  .sort((a, b) => b.value.length - a.value.length)
  .reduce((t, m) => t.replace(new RegExp(escape(m.value), 'g'), m.placeholder), text);

// Longest placeholder first, so PERSON_12 is restored before PERSON_1.
export const restore = (text, map) => [...map]
  .sort((a, b) => b.placeholder.length - a.placeholder.length)
  .reduce((t, m) => t.replace(new RegExp(`\\b${m.placeholder}\\b`, 'g'), m.value), text);
