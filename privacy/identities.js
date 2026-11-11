// Invented identities ("canaries"). Every value is synthetic; leakage = any canary value found in sent text.

const FIRST = ['Kaarel', 'Liisa', 'Mihkel', 'Triin', 'Rasmus', 'Kertu', 'Aivar', 'Merilin', 'Janno', 'Helen',
  'Ilmar', 'Pille', 'Tõnis', 'Annika', 'Urmas', 'Signe', 'Veiko', 'Katrin', 'Margus', 'Elina'];
const LAST = ['Kalvet', 'Rannamets', 'Põldsaar', 'Tiirik', 'Saarvere', 'Mölder', 'Kivistik', 'Lauristin',
  'Undrits', 'Härmson', 'Vaikmaa', 'Ojasild', 'Sepalaan', 'Nõmmik', 'Tammeorg', 'Raudsepp'];
const VENUE_A = ['Sinine', 'Vana', 'Kuldne', 'Uninud', 'Hõbedane', 'Punane', 'Tuuline', 'Vaikne'];
const VENUE_B = ['Kaheksajalg', 'Ankur', 'Majakas', 'Rebane', 'Kajakas', 'Laternas', 'Kompass', 'Tõrvik'];
const VENUE_KIND = ['Baar', 'Kohvik', 'Restoran', 'Pubi'];
const CITIES = ['Tallinn', 'Tartu', 'Pärnu', 'Helsinki', 'Riga'];
const METHOD_WORDS = ['Kalda', 'Virve', 'Saula', 'Tormi', 'Liiva', 'Rehe'];
const METHOD_KINDS = ['foam compensation', 'tare drift correction', 'pour-loss model', 'bottle-neck curve'];

// Estonian personal ID code (isikukood) with a valid checksum.
export const idCheck = (ten) => {
  const w1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
  const w2 = [3, 4, 5, 6, 7, 8, 9, 1, 2, 3];
  const sum = (w) => [...ten].reduce((s, d, i) => s + Number(d) * w[i], 0) % 11;
  const a = sum(w1);
  if (a < 10) return a;
  const b = sum(w2);
  return b < 10 ? b : 0;
};

export const isikukood = (rng) => {
  const g = rng.pick(['3', '4', '4', '3', '5', '6']);
  const yy = String(rng.int(g >= '5' ? 0 : 60, g >= '5' ? 5 : 99)).padStart(2, '0');
  const ten = `${g}${yy}${String(rng.int(1, 12)).padStart(2, '0')}${String(rng.int(1, 28)).padStart(2, '0')}${rng.digits(3)}`;
  return `${ten}${idCheck(ten)}`;
};

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-')
  .replace(/^-|-$/g, '');

export const makeVenue = (rng) => {
  const name = `${rng.pick(VENUE_KIND)} ${rng.pick(VENUE_A)} ${rng.pick(VENUE_B)}`;
  return { name, company: `${rng.pick(VENUE_A)}${rng.pick(VENUE_B).toLowerCase()} OÜ`, city: rng.pick(CITIES),
    domain: `${slug(name)}.example` };
};

export const makePerson = (rng, venue) => {
  const first = rng.pick(FIRST);
  const last = rng.pick(LAST);
  return {
    name: `${first} ${last}`,
    idCode: isikukood(rng),
    phone: `+372 5${rng.digits(3)} ${rng.digits(4)}`,
    email: `${slug(first)}.${slug(last)}@${venue.domain}`,
  };
};

const B62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const makeKey = (rng) => `gtk_live_${Array.from({ length: 32 }, () => B62[rng.int(0, 61)]).join('')}`;

// A "secret method": a named technique with distinctive constants. Leak = name or constants sent.
export const makeMethod = (rng) => {
  const word = rng.pick(METHOD_WORDS);
  const kind = rng.pick(METHOD_KINDS);
  const k1 = (0.9 + rng.int(100, 989) / 10000).toFixed(4);
  const k2 = (rng.int(111, 799) / 100).toFixed(2);
  return { name: `${word} ${kind}`, fn: `${word.toLowerCase()}Correction`, k1, k2 };
};

// Canary list for a task: what must not reach the cloud. type: personal | secret | client | knowhow.
export const canariesOf = ({ people = [], venues = [], keys = [], methods = [] }) => [
  ...people.flatMap((p) => [
    { type: 'personal', value: p.name }, { type: 'personal', value: p.idCode },
    { type: 'personal', value: p.phone }, { type: 'personal', value: p.email },
  ]),
  ...venues.flatMap((v) => [{ type: 'client', value: v.name }, { type: 'client', value: v.company }]),
  ...keys.map((k) => ({ type: 'secret', value: k })),
  ...methods.flatMap((m) => [
    { type: 'knowhow', value: m.name }, { type: 'knowhow', value: m.fn },
    { type: 'knowhow', value: m.k1 }, { type: 'knowhow', value: m.k2 },
  ]),
];
