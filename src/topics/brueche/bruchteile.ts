/**
 * Bruchteile von Größen: how much a fraction of a quantity is, and back to the whole. Whole-number answers, no comma key.
 * Stufe 1 (Stammbruch): AB I calculate, AB II a story, AB III what remains after the part.
 * Stufe 2 (¾ von 60 min, change the unit first): AB I any fraction, AB II change the unit first, AB III what remains, with a unit change.
 * Stufe 3 (whole from part): AB I from a Stammbruch, AB II from any fraction, AB III from the rest, or with harder numbers.
 */
import { BOX, frac, NBSP, fmt } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, pickPerson, safeHints, speak } from '../shared';
import { byStufeAndAb, gcd, shownName, typedBugs, type Form } from './helpers';

const SKILL = { id: 'brueche.bruchteile', topicId: 'brueche' } as const;
const KMK = ['ZO.bruchteile'];

const q = (v: number, unit: string) => `${fmt(v)}${NBSP}${unit}`;
const bar = (d: number, filled: number): Visual => ({ type: 'fractionModel', form: 'bar', parts: d, filled });

const STAMM = [2, 3, 4, 5, 6, 8, 10] as const;
const UNITS = ['€', 'm', 'kg', 'min', 'l', 'km'] as const;

/** A whole of a story: a multiple of d that the story allows. 4 Kinder are no class and 72 km no hike. */
const wholeIn = (rng: Rng, d: number, min: number, max: number) => d * rng.int(Math.ceil(min / d), Math.floor(max / d));

/** n/d in lowest terms with n ≥ 2. */
function properFraction(rng: Rng, denominators: readonly number[]): [n: number, d: number] {
  const d = rng.pick(denominators);
  const options = Array.from({ length: d - 2 }, (_, i) => i + 2).filter((n) => gcd(n, d) === 1);
  return [rng.pick(options), d];
}

const forwardBugs = (whole: number, d: number, value: number, unit: string) => typedBugs([
  { id: 'mal-statt-geteilt', match: whole * d, hint: `Ein Bruchteil ist kleiner als das Ganze. Teile durch ${d}.` },
  { id: 'minus-nenner', match: whole - d, hint: `Der Nenner sagt: durch ${d} teilen, nicht ${q(d, unit)} abziehen.` },
], value);

/** Stufe 1, AB I. */
const stammPlain: Form = (rng, stufe, ab) => {
  const d = rng.pick(STAMM);
  const k = rng.int(2, 12);
  const whole = d * k;
  const unit = rng.pick(UNITS);
  return build(SKILL, stufe, {
    key: `stamm:${d}:${whole}:${unit}`,
    ab,
    prompt: 'Berechne den Bruchteil.',
    expression: `${frac(1, d)} von ${q(whole, unit)} = ${BOX} ${unit}`,
    answer: { kind: 'number', value: k, unit, label: 'Bruchteil' },
    hints: safeHints([`${frac(1, d)} heißt: Teile durch ${d}.`, `Verteile ${q(whole, unit)} auf ${d} gleich große Teile.`], k, 'Teile das Ganze durch den Nenner.'),
    steps: [{ text: `${frac(1, d)} heißt: Das Ganze hat ${d} gleich große Teile.`, visual: bar(d, 1) }, `${q(whole, unit)} : ${d} = ${q(k, unit)}`],
    bugs: forwardBugs(whole, d, k, unit),
    praise: 'Du hast durch den Nenner geteilt.',
    srText: speak(`${frac(1, d)} von ${q(whole, unit)} sind wie viel?`),
    kmk: KMK,
  });
};

/** Stories with a Stammbruch: the part is asked. Each story has its own range for the whole; every Nenner of stammInStory has a multiple in it. */
function stammStory(rng: Rng, name: string, d: number): { key: string; whole: number; context: string; prompt: string; unit: string } {
  const part = frac(1, d);
  const list = [
    { key: 'murmeln', min: 12, max: 72, context: (whole: number) => `${name} hat ${whole} Murmeln. ${name} verschenkt ${part} der Murmeln.`, prompt: `Wie viele Murmeln verschenkt ${name}?`, unit: 'Murmeln' },
    { key: 'klasse', min: 15, max: 32, context: (whole: number) => `In der Klasse sind ${whole} Kinder. ${part} der Kinder fährt mit dem Bus.`, prompt: 'Wie viele Kinder fahren mit dem Bus?', unit: 'Kinder' },
    { key: 'weg', min: 4, max: 24, context: (whole: number) => `Die Wanderung ist ${q(whole, 'km')} lang. Bis zur Pause schafft die Gruppe ${part} der Strecke.`, prompt: 'Wie viele Kilometer schafft die Gruppe bis zur Pause?', unit: 'km' },
    { key: 'geld', min: 12, max: 96, context: (whole: number) => `Der Ausflug kostet ${q(whole, '€')}. Der Verein bezahlt ${part} davon.`, prompt: 'Wie viel Euro bezahlt der Verein?', unit: '€' },
  ];
  const s = rng.pick(list);
  const whole = wholeIn(rng, d, s.min, s.max);
  return { key: s.key, whole, context: s.context(whole), prompt: s.prompt, unit: s.unit };
}

/** Stufe 1, AB II. */
const stammInStory: Form = (rng, stufe, ab) => {
  const name = pickPerson(rng).name;
  const d = rng.pick([2, 3, 4, 5, 6, 8]);
  const s = stammStory(rng, name, d);
  const whole = s.whole;
  const k = whole / d;
  return build(SKILL, stufe, {
    key: `geschichte:${s.key}:${shownName(name, s.context, s.prompt)}:${d}:${whole}`,
    ab,
    context: s.context,
    prompt: s.prompt,
    answer: { kind: 'number', value: k, unit: s.unit, label: 'Bruchteil' },
    hints: safeHints([`Welche Menge ist das Ganze? Teile das Ganze durch ${d}.`, `${frac(1, d)} ist einer von ${d} gleich großen Teilen.`], k, 'Teile das Ganze durch den Nenner.'),
    steps: [`Das Ganze sind ${whole}.`, `${whole} : ${d} = ${k}`, `Der Bruchteil ist ${q(k, s.unit)}.`],
    bugs: forwardBugs(whole, d, k, s.unit),
    praise: 'Du hast das Ganze in der Geschichte gefunden.',
    srText: speak(`${s.context} ${s.prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

/** Stufe 1, AB III: the part is gone, what remains? */
const stammRest: Form = (rng, stufe, ab) => {
  const name = pickPerson(rng).name;
  const d = rng.pick([2, 3, 4, 5, 6, 8, 10]);
  const list = [
    { key: 'geld', min: 10, max: 90, context: (whole: number) => `${name} hat ${q(whole, '€')}. ${name} gibt ${frac(1, d)} davon aus.`, prompt: 'Wie viel Euro bleiben übrig?', unit: '€' },
    { key: 'kekse', min: 12, max: 48, context: (whole: number) => `Auf dem Blech liegen ${whole} Kekse. Die Klasse isst ${frac(1, d)} der Kekse.`, prompt: 'Wie viele Kekse bleiben übrig?', unit: 'Kekse' },
  ];
  const story = rng.pick(list);
  const whole = wholeIn(rng, d, story.min, story.max);
  const k = whole / d;
  const rest = whole - k;
  const s = { ...story, context: story.context(whole) };
  return build(SKILL, stufe, {
    key: `rest:${s.key}:${shownName(name, s.context, s.prompt)}:${d}:${whole}`,
    ab,
    context: s.context,
    prompt: s.prompt,
    answer: { kind: 'number', value: rest, unit: s.unit, label: 'Rest' },
    hints: safeHints([`Rechne zuerst ${frac(1, d)} von ${whole} aus.`, 'Zieh den Bruchteil dann vom Ganzen ab.'], rest, 'Rechne zuerst den Bruchteil aus.'),
    steps: [{ text: `${frac(1, d)} von ${whole}: ${whole} : ${d} = ${k}`, visual: bar(d, 1) }, `${whole} − ${k} = ${rest}`, `Es bleiben ${q(rest, s.unit)}.`],
    bugs: typedBugs([
      { id: 'nur-teil', match: k, hint: 'Das ist der Bruchteil. Wie viel bleibt übrig?' },
      { id: 'mal-statt-geteilt', match: whole * d, hint: `Ein Bruchteil ist kleiner als das Ganze. Teile durch ${d}.` },
    ], rest),
    praise: 'Du hast den Bruchteil vom Ganzen abgezogen.',
    srText: speak(`${s.context} ${s.prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

/** Stufe 2, AB I: ¾ von 60 min. */
const anyFraction: Form = (rng, stufe, ab) => {
  const [n, d] = properFraction(rng, [3, 4, 5, 6, 8, 10]);
  const unit = rng.pick(UNITS);
  const whole = unit === 'min' && d <= 6 && 60 % d === 0 ? 60 : d * rng.int(2, 15);
  const one = whole / d;
  const value = n * one;
  return build(SKILL, stufe, {
    key: `bruch:${n}/${d}:${whole}:${unit}`,
    ab,
    prompt: 'Berechne den Bruchteil.',
    expression: `${frac(n, d)} von ${q(whole, unit)} = ${BOX} ${unit}`,
    answer: { kind: 'number', value, unit, label: 'Bruchteil' },
    hints: safeHints([`Rechne zuerst ${frac(1, d)} von ${q(whole, unit)} aus.`, `Nimm das Ergebnis dann ${n}-mal.`], value, 'Teile durch den Nenner und nimm dann den Zähler mal.'),
    steps: [{ text: `${frac(1, d)} von ${q(whole, unit)}: ${q(whole, unit)} : ${d} = ${q(one, unit)}`, visual: bar(d, n) }, `${frac(n, d)} von ${q(whole, unit)}: ${n} · ${q(one, unit)} = ${q(value, unit)}`],
    bugs: typedBugs([
      { id: 'von-nur-nenner', match: one, hint: `${frac(1, d)} sind ${q(one, unit)}. Du brauchst ${frac(n, d)}.` },
      { id: 'nur-zaehler', match: whole * n, hint: 'Ein echter Bruchteil ist kleiner als das Ganze. Teile auch durch den Nenner.' },
      whole % n === 0 && { id: 'von-nur-zaehler', match: whole / n, hint: 'Teile durch den Nenner. Nimm das Ergebnis dann so oft wie der Zähler.' },
    ], value),
    praise: 'Du hast zuerst einen Teil und dann alle Teile gerechnet.',
    srText: speak(`${frac(n, d)} von ${q(whole, unit)} sind wie viel?`),
    kmk: KMK,
  });
};

interface Change {
  big: string;
  small: string;
  per: number;
  wrongPer: number;
  wrongId: string;
  words: string;
}
const CHANGES: readonly Change[] = [
  { big: 'h', small: 'min', per: 60, wrongPer: 100, wrongId: 'stunde-hundert', words: 'Minuten' },
  { big: 'kg', small: 'g', per: 1000, wrongPer: 100, wrongId: 'faktor-klein', words: 'Gramm' },
  { big: 'km', small: 'm', per: 1000, wrongPer: 100, wrongId: 'faktor-klein', words: 'Meter' },
  { big: 'l', small: 'ml', per: 1000, wrongPer: 100, wrongId: 'faktor-klein', words: 'Milliliter' },
  { big: 'm', small: 'cm', per: 100, wrongPer: 10, wrongId: 'faktor-klein', words: 'Zentimeter' },
  { big: '€', small: 'ct', per: 100, wrongPer: 10, wrongId: 'faktor-klein', words: 'Cent' },
];

/** n/d of `big` of the unit is a whole number in the small unit. */
function fitsChange(c: Change, big: number, d: number): boolean {
  return (big * c.per) % d === 0;
}

/** Stufe 2, AB II: change the unit first. */
const changeUnit: Form = (rng, stufe, ab) => {
  const c = rng.pick(CHANGES);
  const big = rng.int(1, 5);
  const options = [2, 3, 4, 5, 6, 8, 10].filter((d) => fitsChange(c, big, d) && d > 2);
  const d = rng.pick(options);
  const n = rng.pick(Array.from({ length: d - 1 }, (_, i) => i + 1).filter((x) => gcd(x, d) === 1));
  const whole = big * c.per;
  const one = whole / d;
  const value = n * one;
  const wrong = (big * c.wrongPer * n) / d;
  return build(SKILL, stufe, {
    key: `einheit:${n}/${d}:${big}:${c.big}`,
    ab,
    prompt: 'Rechne zuerst um. Berechne dann den Bruchteil.',
    expression: `${frac(n, d)} von ${q(big, c.big)} = ${BOX} ${c.small}`,
    answer: { kind: 'number', value, unit: c.small, label: `Bruchteil in ${c.words}` },
    hints: safeHints([`Rechne ${q(big, c.big)} zuerst in ${c.small} um.`, `Teile dann durch ${d}${n > 1 ? ` und nimm das Ergebnis ${n}-mal` : ''}.`], value, 'Rechne zuerst in die kleine Einheit um.'),
    steps: [`${q(big, c.big)} = ${q(whole, c.small)}`, `${q(whole, c.small)} : ${d} = ${q(one, c.small)}`, ...(n > 1 ? [`${n} · ${q(one, c.small)} = ${q(value, c.small)}`] : [`${frac(n, d)} von ${q(big, c.big)} sind ${q(value, c.small)}.`])],
    bugs: typedBugs([
      n > 1 && { id: 'von-nur-nenner', match: one, hint: `${frac(1, d)} sind ${q(one, c.small)}. Du brauchst ${frac(n, d)}.` },
      { id: c.wrongId, match: wrong, hint: `1${NBSP}${c.big} sind ${q(c.per, c.small)}, nicht ${q(c.wrongPer, c.small)}.` },
    ], value),
    praise: 'Du hast die Einheit zuerst umgerechnet.',
    srText: speak(`Rechne zuerst um. ${frac(n, d)} von ${q(big, c.big)} sind wie viele ${c.words}?`),
    kmk: [...KMK, 'GM.einheiten'],
  });
};

/** Stufe 2, AB III: what remains, with a unit change. */
const restWithUnit: Form = (rng, stufe, ab) => {
  const name = pickPerson(rng).name;
  const big = rng.int(1, 5);
  const [n, d] = properFraction(rng, [3, 4, 5, 8, 10].filter((x) => (big * 1000) % x === 0));
  const whole = big * 1000;
  const one = whole / d;
  const gone = n * one;
  const rest = whole - gone;
  // the bus takes at least 1 km of the way, and the rest is a walk a child can do
  const list = [
    { key: 'weg', fits: gone >= 1000 && rest <= 2000, context: `Der Schulweg von ${name} ist ${q(big, 'km')} lang. ${name} fährt ${frac(n, d)} davon mit dem Bus. Den Rest geht ${name} zu Fuß.`, prompt: `Wie viele Meter geht ${name} zu Fuß?`, unit: 'm', word: 'Meter', first: `${q(big, 'km')} = ${q(whole, 'm')}` },
    { key: 'mehl', fits: true, context: `Im Regal ${big === 1 ? 'steht' : 'stehen'} ${q(big, 'kg')} Mehl. ${name} backt mit ${frac(n, d)} davon.`, prompt: 'Wie viel Gramm Mehl bleiben im Regal?', unit: 'g', word: 'Gramm', first: `${q(big, 'kg')} = ${q(whole, 'g')}` },
  ];
  const s = rng.pick(list.filter((x) => x.fits));
  return build(SKILL, stufe, {
    key: `restumrechnen:${s.key}:${name}:${n}/${d}:${big}`,
    ab,
    context: s.context,
    prompt: s.prompt,
    answer: { kind: 'number', value: rest, unit: s.unit, label: `Rest in ${s.word}` },
    hints: safeHints([`Rechne zuerst in ${s.unit} um. Berechne dann ${frac(n, d)} davon.`, 'Zieh den Bruchteil zum Schluss vom Ganzen ab.'], rest, 'Rechne zuerst in die kleine Einheit um.'),
    steps: [s.first, `${frac(n, d)} davon: ${q(whole, s.unit)} : ${d} · ${n} = ${q(gone, s.unit)}`, `${q(whole, s.unit)} − ${q(gone, s.unit)} = ${q(rest, s.unit)}`],
    bugs: typedBugs([
      { id: 'nur-teil', match: gone, hint: 'Das ist der Bruchteil aus der Geschichte. Gefragt ist der Rest.' },
      { id: 'von-nur-nenner', match: one, hint: `${frac(1, d)} sind ${q(one, s.unit)}. Du brauchst ${frac(n, d)}.` },
    ], rest),
    praise: 'Du hast umgerechnet, den Bruchteil bestimmt und abgezogen.',
    srText: speak(`${s.context} ${s.prompt}`),
    kmk: [...KMK, 'GM.einheiten', 'PK.modellieren'],
  });
};

/** Stories in which a part is known and the whole is asked; each with the wholes it allows. */
const PART_STORIES = [
  { key: 'verein', min: 12, max: 120, context: (part: string, amount: number, one: boolean) => `${part} der Kinder im Verein ${one ? 'spielt' : 'spielen'} Tennis. Das sind ${amount} Kinder.`, prompt: 'Wie viele Kinder sind im Verein?', unit: 'Kinder' },
  { key: 'strecke', min: 4, max: 60, context: (part: string, amount: number) => `${part} der Strecke sind ${q(amount, 'km')}.`, prompt: 'Wie lang ist die ganze Strecke?', unit: 'km' },
  { key: 'regal', min: 10, max: 120, context: (part: string, amount: number) => `${part} der Bücher im Regal sind Comics. Das sind ${amount} Bücher.`, prompt: 'Wie viele Bücher stehen im Regal?', unit: 'Bücher' },
  { key: 'konto', min: 20, max: 600, context: (part: string, amount: number, one: boolean) => `Für den Ausflug ${one ? 'liegt' : 'liegen'} ${part} des Preises bereit. Das sind ${q(amount, '€')}.`, prompt: 'Wie viel Euro kostet der Ausflug?', unit: '€' },
] as const;

/** `ones` holds the sizes of one part; the story takes one of them that gives a whole it allows. */
function wholeFromPart(rng: Rng, stufe: Stufe, ab: Ab, n: number, d: number, ones: readonly number[]): Exercise {
  const fits = (story: (typeof PART_STORIES)[number], one: number) => d * one >= story.min && d * one <= story.max;
  const story = rng.pick(PART_STORIES.filter((x) => ones.some((one) => fits(x, one))));
  const one = rng.pick(ones.filter((x) => fits(story, x)));
  const amount = n * one;
  const whole = d * one;
  const s = { key: story.key, context: story.context(frac(n, d), amount, n === 1), prompt: story.prompt, unit: story.unit };
  const visual = bar(d, n);
  return build(SKILL, stufe, {
    key: `ganzes:${s.key}:${n}/${d}:${amount}`,
    ab,
    context: s.context,
    prompt: s.prompt,
    visual,
    answer: { kind: 'number', value: whole, unit: s.unit, label: 'Das Ganze' },
    hints: safeHints(n === 1 ? [`${amount} sind ${frac(1, d)}. Das Ganze hat ${d} solche Teile.`, `Rechne ${amount} mal ${d}.`] : [`${amount} sind ${frac(n, d)}. Wie viel ist ${frac(1, d)}?`, `Teile durch ${n}. Rechne dann mal ${d}.`], whole, 'Bestimme zuerst einen einzelnen Teil.'),
    steps: [
      ...(n > 1 ? [`${frac(1, d)}: ${amount} : ${n} = ${one}`] : [`${frac(1, d)} sind ${q(amount, s.unit)}.`]),
      `Das Ganze: ${d} · ${one} = ${whole}`,
      `Das Ganze sind ${q(whole, s.unit)}.`,
    ],
    bugs: typedBugs([
      { id: 'ganzes-rueckwaerts', match: (amount * n) / d, hint: `${amount} sind ${frac(n, d)}. Das Ganze ist größer als ${amount}.` },
      n > 1 && { id: 'ganzes-einteil', match: one, hint: `Das ist ${frac(1, d)}. Das Ganze hat ${d} solche Teile.` },
      n > 1 && { id: 'ganzes-mal-nenner', match: amount * d, hint: `${amount} sind schon ${n} Teile. Teile zuerst durch ${n}.` },
      { id: 'ganzes-plus', match: amount + d, hint: 'Addiere den Nenner nicht. Das Ganze hat so viele gleich große Teile.' },
    ], whole),
    praise: n === 1 ? 'Du hast vom Teil auf das Ganze geschlossen.' : 'Du hast zuerst einen einzelnen Teil bestimmt.',
    srText: speak(`${s.context} ${s.prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Stufe 3, AB III: only the rest is known. */
const wholeFromRest: Form = (rng, stufe, ab) => {
  const name = pickPerson(rng).name;
  const d = rng.pick([3, 4, 5, 6, 8]);
  const n = rng.pick(Array.from({ length: d - 1 }, (_, i) => i + 1).filter((x) => gcd(x, d) === 1 && x > 1));
  const rest = d - n;
  // a way for a child, so at most 40 km in all
  const one = rng.pick(Array.from({ length: 12 }, (_, i) => i + 2).filter((x) => d * x <= 40));
  const left = rest * one;
  const whole = d * one;
  const context = `${name} hat ${frac(n, d)} der Strecke geschafft. Es fehlen noch ${q(left, 'km')}.`;
  const prompt = 'Wie lang ist die ganze Strecke?';
  return build(SKILL, stufe, {
    key: `ausrest:${name}:${n}/${d}:${left}`,
    ab,
    context,
    prompt,
    visual: bar(d, n),
    answer: { kind: 'number', value: whole, unit: 'km', label: 'Die ganze Strecke' },
    hints: safeHints([`Welcher Bruchteil der Strecke fehlt noch? Rechne 1 − ${frac(n, d)}.`, `${q(left, 'km')} gehören zu diesem Bruchteil.`], whole, 'Bestimme zuerst den Bruchteil, der fehlt.'),
    steps: [`Es ${rest === 1 ? 'fehlt' : 'fehlen'} ${frac(rest, d)} der Strecke.`, `${frac(1, d)}: ${left} : ${rest} = ${one}`, `Das Ganze: ${d} · ${one} = ${whole}`, `Die Strecke ist ${q(whole, 'km')} lang.`],
    bugs: typedBugs([
      { id: 'rest-als-teil', match: (left / n) * d, hint: `Die ${q(left, 'km')} sind der Rest. Welcher Bruchteil fehlt noch?` },
      { id: 'ganzes-mal-nenner', match: left * d, hint: `${q(left, 'km')} sind schon ${rest} Teile. Bestimme zuerst einen einzelnen Teil.` },
    ], whole),
    praise: 'Du hast den fehlenden Bruchteil bestimmt.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen', 'PK.modellieren'],
  });
};

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [stammPlain], 2: [stammInStory], 3: [stammRest] },
  2: { 1: [anyFraction], 2: [changeUnit], 3: [restWithUnit] },
  3: {
    1: [(rng, s, a) => {
      const d = rng.pick([2, 3, 4, 5, 6, 8]);
      return wholeFromPart(rng, s, a, 1, d, range(3, 15));
    }],
    2: [(rng, s, a) => {
      const [n, d] = properFraction(rng, [3, 4, 5, 6, 8]);
      return wholeFromPart(rng, s, a, n, d, range(2, 15));
    }],
    3: [wholeFromRest, (rng, s, a) => {
      const [n, d] = properFraction(rng, [3, 4, 5, 8]);
      return wholeFromPart(rng, s, a, n, d, [15, 20, 25, 30, 40, 50, 75]);
    }],
  },
};

export const bruchteileSkill: SkillDef = {
  ...SKILL,
  title: 'Bruchteile von Größen',
  description: 'Du rechnest aus, wie viel ein Bruchteil von einer Menge ist.',
  stufen: { 1: 'Stammbruch von einer Menge: ¼ von 20 €', 2: '¾ von 60 min, zuerst die Einheit umrechnen', 3: 'Das Ganze aus dem Teil: ⅖ sind 8 Kinder' },
  kmk: KMK,
  generate: byStufeAndAb(FORMS),
};
