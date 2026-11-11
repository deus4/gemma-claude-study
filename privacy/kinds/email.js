// Kind EMAIL: answer a customer e-mail that is full of personal and client data.
// Quality: blind human grade; an auto pre-check looks for the key point after mapping back.

const CASES = [
  { topic: 'GDPR deletion', body: (p, v) => `I worked at ${v.name} until last month. Please delete all my personal data from your system: my name, my ID code ${p.idCode} and my phone ${p.phone}. How long will it take?`,
    must: ['delet', 'kustut', '30', 'month'] },
  { topic: 'scale not connecting', body: (p, v) => `Our Bluetooth scale at ${v.name} (${v.company}) stopped connecting to the iPad this morning. We have a count tonight. What do we do? Call me at ${p.phone}.`,
    must: ['bluetooth', 'restart', 'battery', 'pair'] },
  { topic: 'invoice wrong company', body: (p, v) => `The October invoice is addressed to the wrong company. It should be ${v.company}, ${v.city}, not our old name. Please resend to ${p.email}.`,
    must: ['invoice', 'resend', 'correct'] },
  { topic: 'staff account', body: (p, v) => `Please create a counting account for our new bartender. I am ${p.name}, manager at ${v.name}. The new person starts on Monday.`,
    must: ['account', 'name', 'email', 'e-mail'] },
  { topic: 'data export', body: (p, v) => `We are moving ${v.name} to a new accounting system. Can you export all our count history for 2026 as a spreadsheet? Send it to ${p.email}.`,
    must: ['export', 'csv', 'excel', 'spreadsheet'] },
  { topic: 'count too slow', body: (p, v) => `Hi, ${p.name} from ${v.name} here. Our counts take 3 hours, other bars say 1 hour. What are we doing wrong?`,
    must: ['shelf', 'order', 'layout', 'train'] },
  { topic: 'price change', body: (p, v) => `We heard prices change in January. ${v.company} has three venues. What will we pay? Reach me at ${p.phone}.`,
    must: ['price', 'januar', 'venue'] },
  { topic: 'wrong report total', body: (p, v) => `The loss report for ${v.name} shows 1,240 euros for October. That cannot be right; we sold almost nothing that week. Can you check? ${p.name}`,
    must: ['check', 'report', 'count'] },
];

export const buildEmail = (ctx, i) => {
  const c = CASES[i % CASES.length];
  const { person: p, venue: v } = ctx;
  return {
    kind: 'email',
    prompt: `You are the support person for Getti, an inventory app with Bluetooth scales for bars. Write a short, friendly reply to this customer e-mail. Address the sender by name. Plain text, no subject line.

From: ${p.name} <${p.email}>
${c.body(p, v)}`,
    reference: null,
    check: { kind: 'mentions', anyOf: c.must, alsoName: p.name.split(' ')[0] },
  };
};
