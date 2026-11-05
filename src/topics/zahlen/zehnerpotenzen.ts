/**
 * zahlen.zehnerpotenzen: große Zahlen kurz schreiben. The Stufe chooses the content (S1 10³ to 10⁹ and back, S2 3 · 10⁶ and 450 000 as 45 · 10⁴,
 * S3 sizes from contexts); AB varies the demand inside it. A gap in the exponent is written '10 hoch □': a superscript box does not exist.
 * The sizes of Stufe 3 are rounded values ("etwa"), and every text says so. Their places have neutral names: with real names (Deutschland, Neptun)
 * general knowledge decides the comparison, and nobody needs to read a power.
 */
import { BOX, TIMES, fmt } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef } from '../../core/types';
import { build, makeChoice, numberBugs, targetAb } from '../shared';
import { placeTable, power, powerSaid } from './helpers';

const SKILL = { id: 'zahlen.zehnerpotenzen', topicId: 'zahlen' } as const;
const KMK = ['ZO.grosse-zahlen'];

const term = (m: number, k: number) => `${m} ${TIMES} ${power(10, k)}`;
const termSaid = (m: number, k: number) => `${m} mal ${powerSaid(10, k)}`;
const EXPONENT_HINT = 'Der Exponent zählt die Nullen hinter der Ziffer 1.';

function powerToNumber(ab: Ab, k: number): Exercise {
  const value = 10 ** k;
  return build(SKILL, 1, {
    key: `zahl:${k}`,
    ab,
    prompt: 'Schreibe die Zehnerpotenz als Zahl.',
    expression: `${power(10, k)} = ${BOX}`,
    answer: { kind: 'number', value, label: 'Zahl' },
    hints: [EXPONENT_HINT, 'Schreib eine 1 und dann die Nullen.'],
    steps: [`Der Exponent ist ${k}.`, { text: `Eine 1 mit ${k} Nullen.`, visual: placeTable(value) }, `${power(10, k)} = ${fmt(value)}`],
    bugs: numberBugs([
      { id: 'potenz-mal', match: 10 * k, hint: `${power(10, k)} heißt: ${k}-mal die 10 als Faktor, nicht 10 ${TIMES} ${k}.` },
      { id: 'null-zu-viel', match: 10 ** (k + 1), hint: EXPONENT_HINT },
      { id: 'null-zu-wenig', match: 10 ** (k - 1), hint: EXPONENT_HINT },
    ], value),
    praise: 'Du hast den Exponenten als Zahl der Nullen gelesen.',
    srText: `Schreibe ${powerSaid(10, k)} als Zahl.`,
    kmk: KMK,
  });
}

function numberToExponent(ab: Ab, k: number): Exercise {
  const value = 10 ** k;
  return build(SKILL, 1, {
    key: `exponent:${k}`,
    ab,
    prompt: 'Welcher Exponent gehört in die Lücke?',
    expression: `${fmt(value)} = 10 hoch ${BOX}`,
    answer: { kind: 'number', value: k, label: 'Exponent' },
    hints: ['Zähle die Nullen der Zahl.', 'Die 1 vorne zählt nicht mit.'],
    steps: [{ text: `${fmt(value)} hat ${k} Nullen.`, visual: placeTable(value) }, `Der Exponent ist ${k}.`],
    bugs: numberBugs([
      { id: 'stellen-statt-nullen', match: k + 1, hint: 'Du hast alle Stellen gezählt. Die 1 vorne zählt nicht mit.' },
    ], k),
    praise: 'Du hast die Nullen genau gezählt.',
    srText: `${value} gleich 10 hoch Lücke. Welcher Exponent gehört in die Lücke?`,
    kmk: KMK,
  });
}

function countPlaces(ab: Ab, k: number): Exercise {
  return build(SKILL, 1, {
    key: `stellen:${k}`,
    ab,
    prompt: `Wie viele Stellen hat die Zahl ${power(10, k)}?`,
    answer: { kind: 'number', value: k + 1, label: 'Anzahl der Stellen' },
    hints: [EXPONENT_HINT, 'Zähle die 1 als eigene Stelle mit.'],
    steps: [{ text: `${power(10, k)} = ${fmt(10 ** k)}`, visual: placeTable(10 ** k) }, `Das sind ${k} Nullen und eine 1.`, `Die Zahl hat ${k + 1} Stellen.`],
    bugs: numberBugs([
      { id: 'null-statt-stelle', match: k, hint: 'Das sind die Nullen. Die 1 ist auch eine Stelle.' },
    ], k + 1),
    praise: 'Du hast auch die 1 als Stelle gezählt.',
    srText: `Wie viele Stellen hat die Zahl ${powerSaid(10, k)}?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** The range of Stufe 1: 10³ to 10⁹. */
const MIN_EXPONENT = 3;
const MAX_EXPONENT = 9;

const NAMED: readonly [word: string, k: number][] = [['eine Million', 6], ['eine Milliarde', 9], ['tausend', 3], ['zehntausend', 4], ['hunderttausend', 5]];

function namedPower(rng: Rng, ab: Ab): Exercise {
  const [word, k] = rng.pick(NAMED);
  const others = [k - 1, k + 1, k + 2, k === 3 ? 6 : 3, k === 9 ? 6 : 9].filter((x) => x !== k && x >= MIN_EXPONENT && x <= MAX_EXPONENT);
  const answer = makeChoice(rng, { label: power(10, k) }, others.map((x) => ({ label: power(10, x), whyWrong: `${power(10, x)} ist eine 1 mit ${x} Nullen. Schreib die Zahl zuerst auf.` })));
  return build(SKILL, 1, {
    key: `wort:${word}:${answer.options.map((o) => o.label).join('|')}`,
    ab,
    prompt: `Welche Zehnerpotenz ist ${word}?`,
    answer,
    hints: ['Schreib die Zahl zuerst mit Ziffern.', EXPONENT_HINT],
    steps: [{ text: `${word.charAt(0).toUpperCase()}${word.slice(1)} ist ${fmt(10 ** k)}.`, visual: placeTable(10 ** k) }, `Das sind ${k} Nullen.`, `Also ${power(10, k)}.`],
    praise: 'Du hast das Zahlwort über die Nullen zugeordnet.',
    srText: `Welche Zehnerpotenz ist ${word}?`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  const k = rng.int(MIN_EXPONENT, MAX_EXPONENT);
  if (ab === 1) return powerToNumber(ab, k);
  if (ab === 2) return numberToExponent(ab, k);
  return rng.chance(0.5) ? countPlaces(ab, k) : namedPower(rng, ab);
}

function productToNumber(stufe: 2 | 3, ab: Ab, m: number, k: number): Exercise {
  const value = m * 10 ** k;
  return build(SKILL, stufe, {
    key: `produkt:${m}:${k}`,
    ab,
    prompt: 'Schreibe als Zahl.',
    expression: `${term(m, k)} = ${BOX}`,
    answer: { kind: 'number', value, label: 'Zahl' },
    hints: [`${power(10, k)} ist eine 1 mit ${k} Nullen.`, `Häng die ${k} Nullen an die ${m} an.`],
    steps: [`${power(10, k)} = ${fmt(10 ** k)}`, `Die ${m} bekommt ${k} Nullen.`, `${term(m, k)} = ${fmt(value)}`],
    bugs: numberBugs([
      { id: 'potenz-mal', match: m * 10 * k, hint: `${power(10, k)} ist eine 1 mit ${k} Nullen, nicht 10 ${TIMES} ${k}.` },
      { id: 'exponent-mal', match: m * k, hint: 'Der Exponent ist kein Faktor. Der Exponent zählt die Nullen.' },
      { id: 'null-zu-viel', match: m * 10 ** (k + 1), hint: EXPONENT_HINT },
      { id: 'null-zu-wenig', match: m * 10 ** (k - 1), hint: EXPONENT_HINT },
    ], value),
    praise: 'Du hast die Nullen an die Zahl gehängt.',
    srText: `Schreibe ${termSaid(m, k)} als Zahl.`,
    kmk: KMK,
  });
}

function numberToProduct(rng: Rng, ab: Ab): Exercise {
  const m = rng.pick([rng.int(11, 19), rng.int(21, 29), rng.int(31, 99)]);
  const clean = m % 10 === 0 ? m + 1 : m;
  const k = rng.int(2, 7);
  const value = clean * 10 ** k;
  const zerosAll = k;
  if (rng.chance(0.5)) {
    return build(SKILL, 2, {
      key: `hoch:${clean}:${k}`,
      ab,
      prompt: 'Welcher Exponent gehört in die Lücke?',
      expression: `${fmt(value)} = ${clean} ${TIMES} 10 hoch ${BOX}`,
      answer: { kind: 'number', value: k, label: 'Exponent' },
      hints: ['Zähle die Nullen am Ende der Zahl.', `Prüfe: Die ${clean} steht schon vor der Potenz.`],
      steps: [`${fmt(value)} hat ${zerosAll} Nullen am Ende.`, `Also ${fmt(value)} = ${term(clean, k)}.`, `Der Exponent ist ${k}.`],
      bugs: numberBugs([
        { id: 'stellen-statt-nullen', match: String(value).length, hint: 'Du hast alle Stellen gezählt. Zähle nur die Nullen am Ende.' },
        { id: 'stellen-statt-nullen-2', match: String(value).length - 1, hint: 'Zähle nur die Nullen am Ende.' },
      ], k),
      praise: 'Du hast nur die Nullen am Ende gezählt.',
      srText: `${value} gleich ${clean} mal 10 hoch Lücke. Welcher Exponent gehört in die Lücke?`,
      kmk: [...KMK, 'PK.darstellen'],
    });
  }
  return build(SKILL, 2, {
    key: `faktor:${clean}:${k}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: `${BOX} ${TIMES} ${power(10, k)} = ${fmt(value)}`,
    answer: { kind: 'number', value: clean, label: 'Faktor' },
    hints: [`${power(10, k)} hat ${k} Nullen.`, `Streiche am Ende der Zahl ${k} Nullen.`],
    steps: [`${power(10, k)} hat ${k} Nullen.`, `Am Ende der Zahl fallen ${k} Nullen weg.`, `${term(clean, k)} = ${fmt(value)}`],
    bugs: numberBugs([
      { id: 'null-zu-viel', match: clean * 10, hint: `Streiche genau ${k} Nullen.` },
      { id: 'null-zu-wenig', match: Math.floor(clean / 10), hint: `Streiche nur die ${k} Nullen, keine andere Ziffer.` },
    ], clean),
    praise: 'Du hast genau die Nullen der Potenz weggenommen.',
    srText: `Lücke mal ${powerSaid(10, k)} gleich ${value}. Welche Zahl gehört in die Lücke?`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

/** Compare two products: the larger first factor belongs to the smaller number. */
function compareProducts(rng: Rng, ab: Ab): Exercise {
  const k = rng.int(3, 8);
  const a = rng.int(2, 9);
  const shift = rng.int(1, 2);
  const b = rng.int(11, 99);
  const k2 = k - shift;
  const va = a * 10 ** k;
  const vb = b * 10 ** k2;
  if (va === vb) return compareProducts(rng, ab);
  const symbol = va < vb ? '<' : '>';
  const why = `${term(a, k)} sind ${fmt(va)}. ${term(b, k2)} sind ${fmt(vb)}.`;
  const answer = makeChoice(rng, { label: symbol }, ['<', '>', '='].filter((x) => x !== symbol).map((x) => ({ label: x, whyWrong: why })), { order: ['<', '>', '='], layout: 'symbols' });
  return build(SKILL, 2, {
    key: `vergleich:${a}:${k}:${b}:${k2}`,
    ab,
    prompt: 'Welches Zeichen passt?',
    expression: `${term(a, k)} ${BOX} ${term(b, k2)}`,
    answer,
    hints: ['Schreib beide Seiten als Zahl.', 'Vergleiche dann die Zahl der Stellen.'],
    steps: [`${term(a, k)} = ${fmt(va)}`, `${term(b, k2)} = ${fmt(vb)}`, `${fmt(va)} ${symbol} ${fmt(vb)}`],
    praise: 'Du hast beide Seiten als Zahl verglichen.',
    srText: `Vergleiche ${termSaid(a, k)} mit ${termSaid(b, k2)}. Welches Zeichen passt?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return productToNumber(2, ab, rng.int(2, 9), rng.int(2, 8));
  if (ab === 2) return numberToProduct(rng, ab);
  return rng.chance(0.5) ? compareProducts(rng, ab) : productToNumber(2, ab, rng.int(11, 99), rng.int(3, 7));
}

/** A rounded size, as m · 10^k. */
interface Size {
  name: string;
  m: number;
  k: number;
}

const GROUPS = {
  einwohner: { names: ['Stadt A', 'Stadt B', 'Stadt C'], text: (name: string, t: string) => `${name} hat etwa ${t} Einwohner.`, two: 'Wo leben mehr Menschen?', three: 'Wo leben die meisten Menschen?', unit: '', maxK: 5 },
  entfernung: { names: ['Strecke A', 'Strecke B', 'Strecke C'], text: (name: string, t: string) => `${name} ist etwa ${t} km lang.`, two: 'Welche Strecke ist länger?', three: 'Welche Strecke ist am längsten?', unit: ' km', maxK: 6 },
} as const;

const sizeValue = (f: Size) => f.m * 10 ** f.k;

/** Two digits, never ending in 0, so that a factor cannot be read off another one. */
const noRoundFactor = (m: number) => (m % 10 === 0 ? m + 1 : m);

/**
 * Two sizes that neither rule decides alone: the larger exponent wins about half of the time, and the larger factor the other half (6 · 10⁵ and
 * 72 · 10⁴), so the child has to write both as numbers.
 */
function compareTwoSizes(rng: Rng, ab: Ab): Exercise {
  const group = rng.pick(['einwohner', 'entfernung'] as const);
  const g = GROUPS[group];
  const k = rng.int(3, g.maxK);
  const small = rng.int(2, 8);
  const large = noRoundFactor(rng.chance(0.5) ? rng.int(small * 10 + 1, 99) : rng.int(11, small * 10 - 1));
  const [m1, m2] = rng.shuffle([{ m: small, k: k + 1 }, { m: large, k }]);
  const a: Size = { name: g.names[0], ...m1 };
  const b: Size = { name: g.names[1], ...m2 };
  const [big, other] = sizeValue(a) > sizeValue(b) ? [a, b] : [b, a];
  return build(SKILL, 3, {
    key: `zwei:${group}:${a.m}-${a.k}|${b.m}-${b.k}`,
    ab,
    context: `${g.text(a.name, term(a.m, a.k))} ${g.text(b.name, term(b.m, b.k))}`,
    prompt: g.two,
    answer: makeChoice(rng, { label: big.name }, [{ label: other.name, whyWrong: `${term(other.m, other.k)} sind ${fmt(sizeValue(other))}. Vergleiche die Zahlen.` }]),
    hints: ['Schreib beide Angaben als Zahl.', 'Vergleiche dann die Zahl der Stellen und die Ziffern von links.'],
    steps: [`${big.name}: ${term(big.m, big.k)} = ${fmt(sizeValue(big))}`, `${other.name}: ${term(other.m, other.k)} = ${fmt(sizeValue(other))}`, `Größer: ${big.name}.`],
    praise: 'Du hast beide Größen als Zahl verglichen.',
    srText: `${g.text(a.name, termSaid(a.m, a.k))} ${g.text(b.name, termSaid(b.m, b.k))} ${g.two}`,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** Three close sizes with a factor of one, two and three digits: each of them can be the largest, whatever its exponent. */
function compareThreeSizes(rng: Rng, ab: Ab): Exercise {
  const group = rng.pick(['einwohner', 'entfernung'] as const);
  const g = GROUPS[group];
  const k = rng.int(3, g.maxK);
  const small = rng.int(2, 8);
  const around = small * 100;
  const two = noRoundFactor(Math.min(99, Math.max(11, Math.round((around + rng.int(-14, 14) * 10) / 10))));
  const three = noRoundFactor(Math.min(999, Math.max(101, around + rng.int(-14, 14) * 10 + rng.int(1, 9))));
  const sizes = rng.shuffle([{ m: small, k: k + 1 }, { m: two === small * 10 ? two + 1 : two, k }, { m: three, k: k - 1 }]);
  const [a, b, c] = sizes.map((x, i): Size => ({ name: g.names[i], ...x }));
  const sorted = [a, b, c].sort((x, y) => sizeValue(y) - sizeValue(x));
  const label = (f: Size) => `${f.name}: ${term(f.m, f.k)}${g.unit}`;
  const answer = makeChoice(rng, { label: label(sorted[0]) }, sorted.slice(1).map((f) => ({ label: label(f), whyWrong: `${term(f.m, f.k)} sind ${fmt(sizeValue(f))}. Vergleiche die Zahlen.` })));
  return build(SKILL, 3, {
    key: `groesser:${group}:${[a, b, c].map((f) => `${f.m}-${f.k}`).join('|')}`,
    ab,
    prompt: g.three,
    answer,
    hints: ['Schreib jede Angabe als Zahl.', 'Vergleiche dann die Zahl der Stellen und die Ziffern von links.'],
    steps: [...sorted.map((f) => `${f.name}: ${term(f.m, f.k)} = ${fmt(sizeValue(f))}`), `Am größten: ${sorted[0].name}.`],
    praise: 'Du hast Faktor und Exponent zusammen betrachtet.',
    srText: `${g.three} ${[a, b, c].map((f) => `${f.name}: ${termSaid(f.m, f.k)}`).join(', ')}.`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/**
 * Each story with the exponents it can hold: a Dorf of hundreds or thousands and a Stadt up to 3 Millionen, a Foto of some hundred kB or some MB
 * and a Film of some hundred MB or some GB, a Schulweg up to 5 km and a Flugreise from 200 km. mMax keeps the larger cases real.
 */
const RATIO_STORIES: readonly { big: (t: string) => string; small: (t: string) => string; ask: string; so: string; pairs: readonly { low: number; high: number; mMax: number }[] }[] = [
  {
    big: (t) => `Eine Stadt hat ${t} Einwohner.`,
    small: (t) => `Ein Dorf hat ${t} Einwohner.`,
    ask: 'Wievielmal so viele Einwohner hat die Stadt?',
    so: 'so viele',
    pairs: [{ low: 2, high: 5, mMax: 9 }, { low: 3, high: 5, mMax: 9 }, { low: 2, high: 6, mMax: 3 }, { low: 3, high: 6, mMax: 3 }],
  },
  {
    big: (t) => `Ein Film braucht ${t} Byte Speicherplatz.`,
    small: (t) => `Ein Foto braucht ${t} Byte Speicherplatz.`,
    ask: 'Wievielmal so viel Speicherplatz braucht der Film?',
    so: 'so viel',
    pairs: [{ low: 5, high: 8, mMax: 9 }, { low: 6, high: 8, mMax: 9 }, { low: 6, high: 9, mMax: 9 }, { low: 5, high: 9, mMax: 9 }],
  },
  {
    big: (t) => `Eine Flugreise ist ${t} m lang.`,
    small: (t) => `Ein Schulweg ist ${t} m lang.`,
    ask: 'Wievielmal so lang ist die Flugreise?',
    so: 'so lang',
    pairs: [{ low: 2, high: 5, mMax: 9 }, { low: 2, high: 6, mMax: 9 }, { low: 3, high: 5, mMax: 5 }, { low: 3, high: 6, mMax: 5 }],
  },
];

function ratio(rng: Rng, ab: Ab): Exercise {
  const story = rng.pick(RATIO_STORIES);
  const { low, high, mMax } = rng.pick(story.pairs);
  const m = rng.int(2, mMax);
  const value = 10 ** (high - low);
  return build(SKILL, 3, {
    key: `wievielmal:${RATIO_STORIES.indexOf(story)}:${m}:${low}:${high}`,
    ab,
    context: `${story.big(term(m, high))} ${story.small(term(m, low))}`,
    prompt: story.ask,
    answer: { kind: 'number', value, after: `mal ${story.so}`, label: 'Faktor' },
    hints: ['Der Faktor davor ist in beiden Sätzen gleich.', 'Jeder Exponent mehr bedeutet zehnmal so viel.'],
    steps: [`Beide Zahlen haben den Faktor ${m}.`, `Die Exponenten sind ${high} und ${low}. Das sind ${high - low} mehr.`, `Also ${fmt(value)}-mal ${story.so}.`],
    bugs: numberBugs([
      { id: 'exponent-differenz', match: high - low, hint: 'Das ist der Unterschied der Exponenten. Jeder Exponent mehr bedeutet zehnmal so viel.' },
      { id: 'exponent-mal', match: (high - low) * 10, hint: 'Jeder Exponent mehr nimmt noch einmal mal zehn, nicht plus zehn.' },
    ], value),
    praise: 'Du hast den Unterschied der Exponenten genutzt.',
    srText: `${story.big(termSaid(m, high))} ${story.small(termSaid(m, low))} ${story.ask}`,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

export const zehnerpotenzenSkill: SkillDef = {
  ...SKILL,
  title: 'Zehnerpotenzen',
  description: 'Du schreibst große Zahlen kurz mit Zehnerpotenzen.',
  stufen: {
    1: '10³ bis 10⁹ als Zahl und zurück',
    2: '3 · 10⁶ als Zahl; 450 000 als 45 · 10⁴',
    3: 'Größen vergleichen: Einwohner und Entfernungen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return stufe1(rng, ab);
    if (stufe === 2) return stufe2(rng, ab);
    return ab === 1 ? compareTwoSizes(rng, ab) : ab === 2 ? compareThreeSizes(rng, ab) : ratio(rng, ab);
  },
};
