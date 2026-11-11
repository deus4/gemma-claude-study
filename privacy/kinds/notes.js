// Kind NOTES: summarise internal meeting notes that mix people, clients, a deal price and a secret method.
// Quality: blind human grade; an auto pre-check looks for each action item after mapping back.

export const buildNotes = (ctx, i) => {
  const { person: p, venue: v, method: m, key } = ctx;
  const price = 180 + (i * 37) % 200;
  const notes = `Meeting ${i % 2 ? 'Tuesday' : 'Thursday'}, sales + tech.
- ${p.name} (${v.company}) wants Getti in all ${2 + (i % 3)} venues incl. ${v.name}; agreed €${price}/month per venue, not public.
- Their counts are slow because of foam on draught beer. Our ${m.name} (k=${m.k1}, offset ${m.k2}) fixes it; do NOT tell them how it works.
- Test key for their sandbox: ${key}. Rotate after the pilot.
- ${p.name}'s ID code ${p.idCode} is needed for the contract signature.
- Action: send contract to ${p.email} by Friday. Action: enable foam correction for ${v.name}. Action: rotate the sandbox key after the pilot.`;
  return {
    kind: 'notes',
    prompt: `Summarise these meeting notes for the team in at most 5 bullets, then list the action items.

${notes}`,
    reference: null,
    check: { kind: 'mentions', allOf: [['contract'], ['foam'], ['rotate', 'key']] },
  };
};
