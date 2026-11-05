/**
 * Brüche addieren: plus and minus with the same Nenner, then with one Nenner a multiple of the other. Any equal value counts as correct.
 * Stufe 1 (plus, sum up to 1): AB I calculate, AB II a story, AB III the missing summand.
 * Stufe 2 (minus, sum above 1 as unechter Bruch): AB I minus, AB II a sum above 1, AB III a chain of three, or the missing number in a minus task.
 * Stufe 3 (one Nenner a multiple of the other): AB I plus, AB II minus, AB III a story: how much is missing up to the whole?
 */
import { BOX, frac, NBSP } from '../../core/format';
import type { Ab, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, pickPerson, speak } from '../shared';
import { byStufeAndAb, gcd, valueBugs, type Form } from './helpers';

const SKILL = { id: 'brueche.gleichnamig', topicId: 'brueche' } as const;
const KMK = ['ZO.brueche'];

const model = (d: number, filled: number, wholes = 1): Visual => ({ type: 'fractionModel', form: 'bar', parts: d, filled, ...(wholes > 1 ? { wholes } : {}) });

/** Two Zähler with a sum in (low, high]. */
function pairWithSum(rng: Rng, d: number, low: number, high: number): [a: number, b: number] {
  const sum = rng.int(low, high);
  const a = rng.int(1, Math.min(d - 1, sum - 1));
  const b = sum - a;
  return b >= 1 && b < d ? [a, b] : [Math.max(1, sum - (d - 1)), Math.min(d - 1, sum - Math.max(1, sum - (d - 1)))];
}

const plusBugs = (a: number, b: number, d: number) => valueBugs([
  { id: 'bruch-plus', match: { numerator: a + b, denominator: d + d }, hint: 'Der Nenner sagt die Teilgröße. Der Nenner bleibt gleich.' },
  { id: 'nenner-mal', match: { numerator: a + b, denominator: d * d }, hint: 'Der Nenner sagt die Teilgröße. Der Nenner bleibt gleich.' },
  { id: 'zaehler-mal', match: { numerator: a * b, denominator: d }, hint: 'Hier rechnest du plus. Addiere die Zähler.' },
], { numerator: a + b, denominator: d });

/** Stufe 1, AB I: plus, sum up to 1. */
const plusPlain: Form = (rng, stufe, ab) => {
  const d = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 12]);
  const [a, b] = pairWithSum(rng, d, 2, d);
  const sum = a + b;
  return build(SKILL, stufe, {
    key: `plus:${a}+${b}/${d}`,
    ab,
    prompt: 'Rechne. Trage den Bruch ein.',
    expression: `${frac(a, d)} + ${frac(b, d)} = ${BOX}`,
    answer: { kind: 'fraction', numerator: sum, denominator: d, accept: 'equivalent' },
    hints: ['Der Nenner bleibt gleich. Der Nenner sagt die Teilgröße.', 'Addiere nur die Zähler.'],
    steps: [`Beide Brüche haben den Nenner ${d}.`, `Zähler: ${a} + ${b} = ${sum}`, { text: `${frac(a, d)} + ${frac(b, d)} = ${frac(sum, d)}`, visual: model(d, sum) }],
    bugs: plusBugs(a, b, d),
    praise: 'Du hast die Zähler addiert und den Nenner behalten.',
    srText: speak(`${frac(a, d)} plus ${frac(b, d)} sind wie viel?`),
    kmk: KMK,
  });
};

/** Stufe 1, AB II: a story, sum up to 1. */
const plusStory: Form = (rng, stufe, ab) => {
  const [p1, p2] = rng.sample(['Mia', 'Ali', 'Lena', 'Emre', 'Sofia', 'Noah', 'Elif', 'Tom'], 2);
  const d = rng.pick([4, 5, 6, 8, 10]);
  const [a, b] = pairWithSum(rng, d, 2, d);
  const sum = a + b;
  const list = [
    { key: 'pizza', context: `${p1} isst ${frac(a, d)} einer Pizza. ${p2} isst ${frac(b, d)} der Pizza.`, prompt: 'Welcher Bruchteil der Pizza ist das zusammen?' },
    { key: 'zaun', context: `${p1} streicht ${frac(a, d)} des Zauns. ${p2} streicht ${frac(b, d)} des Zauns.`, prompt: 'Welcher Bruchteil des Zauns ist jetzt gestrichen?' },
    { key: 'weg', context: `${p1} läuft ${frac(a, d)} der Strecke. ${p2} läuft ${frac(b, d)} der Strecke.`, prompt: 'Welchen Bruchteil der Strecke laufen beide zusammen?' },
  ];
  const s = rng.pick(list);
  return build(SKILL, stufe, {
    key: `sache:${s.key}:${p1}:${p2}:${a}+${b}/${d}`,
    ab,
    context: s.context,
    prompt: s.prompt,
    answer: { kind: 'fraction', numerator: sum, denominator: d, accept: 'equivalent' },
    hints: ['Beide Brüche haben denselben Nenner. Die Teile sind gleich groß.', 'Zähle die Teile zusammen.'],
    steps: [`${frac(a, d)} + ${frac(b, d)}`, `Zähler: ${a} + ${b} = ${sum}`, { text: `Zusammen sind es ${frac(sum, d)}.`, visual: model(d, sum) }],
    bugs: plusBugs(a, b, d),
    praise: 'Du hast die gleich großen Teile addiert.',
    srText: speak(`${s.context} ${s.prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

/** Stufe 1, AB III: the missing summand. */
const missingSummand: Form = (rng, stufe, ab) => {
  const d = rng.pick([4, 5, 6, 7, 8, 9, 10, 12]);
  const [a, b] = pairWithSum(rng, d, 2, d);
  const sum = a + b;
  const total = sum === d ? '1' : frac(sum, d);
  return build(SKILL, stufe, {
    key: `fehlt:${a}+${b}/${d}`,
    ab,
    prompt: 'Welcher Bruch fehlt?',
    expression: `${frac(a, d)} + ${BOX} = ${total}`,
    answer: { kind: 'fraction', numerator: b, denominator: d, accept: 'equivalent' },
    hints: [sum === d ? `Ein Ganzes sind ${d} Teile.` : 'Der Nenner bleibt gleich.', `Wie viele Teile fehlen von ${a} bis ${sum}?`],
    steps: [`${sum} − ${a} = ${b}`, `${b === 1 ? 'Es fehlt 1 Teil' : `Es fehlen ${b} Teile`}: ${frac(b, d)}.`, `Probe: ${frac(a, d)} + ${frac(b, d)} = ${frac(sum, d)}`],
    bugs: valueBugs([
      { id: 'bruch-plus', match: { numerator: sum - a, denominator: d + d }, hint: 'Der Nenner sagt die Teilgröße. Fehlende Teile haben denselben Nenner.' },
      { id: 'summe-statt-rest', match: { numerator: sum, denominator: d }, hint: 'Das ist die Summe. Gesucht ist der fehlende Bruch.' },
    ], { numerator: b, denominator: d }),
    praise: 'Du hast die fehlenden Teile abgezählt.',
    srText: speak(`Welcher Bruch fehlt? ${frac(a, d)} plus Lücke ist ${total}.`),
    kmk: KMK,
  });
};

/** Stufe 2, AB I: minus. */
const minusPlain: Form = (rng, stufe, ab) => {
  const d = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 12]);
  const a = rng.int(2, d - 1);
  const b = rng.int(1, a - 1);
  const rest = a - b;
  return build(SKILL, stufe, {
    key: `minus:${a}-${b}/${d}`,
    ab,
    prompt: 'Rechne. Trage den Bruch ein.',
    expression: `${frac(a, d)} − ${frac(b, d)} = ${BOX}`,
    answer: { kind: 'fraction', numerator: rest, denominator: d, accept: 'equivalent' },
    hints: ['Der Nenner bleibt gleich.', 'Zieh nur die Zähler voneinander ab.'],
    steps: [`Beide Brüche haben den Nenner ${d}.`, `Zähler: ${a} − ${b} = ${rest}`, { text: `${frac(a, d)} − ${frac(b, d)} = ${frac(rest, d)}`, visual: model(d, rest) }],
    bugs: valueBugs([
      { id: 'plus-statt-minus', match: { numerator: a + b, denominator: d }, hint: 'Hier steht minus. Zieh die Zähler voneinander ab.' },
      { id: 'bruch-plus', match: { numerator: rest, denominator: d + d }, hint: 'Der Nenner sagt die Teilgröße. Der Nenner bleibt gleich.' },
    ], { numerator: rest, denominator: d }),
    praise: 'Du hast die Zähler abgezogen und den Nenner behalten.',
    srText: speak(`${frac(a, d)} minus ${frac(b, d)} sind wie viel?`),
    kmk: KMK,
  });
};

/** Stufe 2, AB II: a sum above 1, as an unechter Bruch. */
const plusAboveOne: Form = (rng, stufe, ab) => {
  const d = rng.pick([3, 4, 5, 6, 7, 8, 9, 10]);
  const [a, b] = pairWithSum(rng, d, d + 1, 2 * d - 2);
  const sum = a + b;
  return build(SKILL, stufe, {
    key: `ueber:${a}+${b}/${d}`,
    ab,
    prompt: 'Rechne. Schreibe das Ergebnis als unechten Bruch.',
    expression: `${frac(a, d)} + ${frac(b, d)} = ${BOX}`,
    answer: { kind: 'fraction', numerator: sum, denominator: d, accept: 'equivalent' },
    hints: ['Addiere die Zähler. Der Nenner bleibt gleich.', 'Der Zähler darf größer als der Nenner sein.'],
    steps: [`Zähler: ${a} + ${b} = ${sum}`, `${frac(a, d)} + ${frac(b, d)} = ${frac(sum, d)}`, { text: `${frac(sum, d)} ist mehr als ein Ganzes.`, visual: model(d, sum, 2) }],
    bugs: plusBugs(a, b, d),
    praise: 'Du hast den Nenner behalten, auch über einem Ganzen.',
    srText: speak(`${frac(a, d)} plus ${frac(b, d)} sind wie viel? Schreibe das Ergebnis als unechten Bruch.`),
    kmk: KMK,
  });
};

/** Stufe 2, AB III: a chain of three. */
const chain: Form = (rng, stufe, ab) => {
  const d = rng.pick([5, 6, 7, 8, 9, 10, 12]);
  const a = rng.int(2, d - 1);
  const b = rng.int(2, d - 1);
  const c = rng.int(1, a + b - 1 < d - 1 ? a + b - 1 : d - 1);
  const value = a + b - c;
  return build(SKILL, stufe, {
    key: `kette:${a}+${b}-${c}/${d}`,
    ab,
    prompt: 'Rechne von links nach rechts. Trage den Bruch ein.',
    expression: `${frac(a, d)} + ${frac(b, d)} − ${frac(c, d)} = ${BOX}`,
    answer: { kind: 'fraction', numerator: value, denominator: d, accept: 'equivalent' },
    hints: ['Der Nenner bleibt gleich.', 'Rechne nur mit den Zählern, von links nach rechts.'],
    steps: [`Zähler: ${a} + ${b} = ${a + b}`, `Zähler: ${a + b} − ${c} = ${value}`, `Das Ergebnis ist ${frac(value, d)}.`],
    bugs: valueBugs([
      { id: 'bruch-plus', match: { numerator: value, denominator: 3 * d }, hint: 'Der Nenner sagt die Teilgröße. Der Nenner bleibt gleich.' },
      { id: 'plus-statt-minus', match: { numerator: a + b + c, denominator: d }, hint: 'Der letzte Schritt ist minus. Zieh den Zähler ab.' },
    ], { numerator: value, denominator: d }),
    praise: 'Du hast Schritt für Schritt mit den Zählern gerechnet.',
    srText: speak(`${frac(a, d)} plus ${frac(b, d)} minus ${frac(c, d)} sind wie viel?`),
    kmk: KMK,
  });
};

/** Stufe 2, AB III: the missing number of a minus task. */
const missingInMinus: Form = (rng, stufe, ab) => {
  const d = rng.pick([5, 6, 7, 8, 9, 10, 12]);
  const a = rng.int(3, d - 1);
  const rest = rng.int(1, a - 1);
  const taken = a - rest;
  return build(SKILL, stufe, {
    key: `fehlt-minus:${a}:${rest}/${d}`,
    ab,
    prompt: 'Welcher Bruch fehlt?',
    expression: `${frac(a, d)} − ${BOX} = ${frac(rest, d)}`,
    answer: { kind: 'fraction', numerator: taken, denominator: d, accept: 'equivalent' },
    hints: ['Der Nenner bleibt gleich.', `Wie viele Teile fehlen von ${rest} bis ${a}?`],
    steps: [`${a} − ${rest} = ${taken}`, `Der Bruch ist ${frac(taken, d)}.`, `Probe: ${frac(a, d)} − ${frac(taken, d)} = ${frac(rest, d)}`],
    bugs: valueBugs([
      { id: 'summe-statt-rest', match: { numerator: a + rest, denominator: d }, hint: 'Addiere nicht. Gesucht ist der Bruch zum Abziehen.' },
      { id: 'bruch-plus', match: { numerator: taken, denominator: d + d }, hint: 'Der Nenner sagt die Teilgröße. Der Nenner bleibt gleich.' },
    ], { numerator: taken, denominator: d }),
    praise: 'Du hast die fehlenden Teile abgezählt.',
    srText: speak(`Welcher Bruch fehlt? ${frac(a, d)} minus Lücke ist ${frac(rest, d)}.`),
    kmk: KMK,
  });
};

const RELATED: readonly (readonly [small: number, k: number])[] = [[2, 2], [2, 3], [2, 4], [3, 2], [3, 3], [3, 4], [4, 2], [4, 3], [5, 2], [6, 2]];

/** Numerators of the two fractions; the one with the smaller Nenner stays in lowest terms. */
function relatedPair(rng: Rng): { small: number; big: number; k: number; a: number; b: number } {
  const [small, k] = rng.pick(RELATED);
  const big = small * k;
  const a = rng.pick(Array.from({ length: small - 1 }, (_, i) => i + 1).filter((x) => gcd(x, small) === 1));
  const b = rng.pick(Array.from({ length: big - 1 }, (_, i) => i + 1).filter((x) => gcd(x, big) === 1));
  return { small, big, k, a, b };
}

/** Stufe 3, AB I: plus. */
const relatedPlus: Form = (rng, stufe, ab) => {
  const { small, big, k, a, b } = relatedPair(rng);
  const extended = a * k;
  const value = extended + b;
  return build(SKILL, stufe, {
    key: `verschieden-plus:${a}/${small}+${b}/${big}`,
    ab,
    prompt: 'Rechne. Trage den Bruch ein.',
    expression: `${frac(a, small)} + ${frac(b, big)} = ${BOX}`,
    answer: { kind: 'fraction', numerator: value, denominator: big, accept: 'equivalent' },
    hints: ['Die Nenner sind verschieden. Mach die Nenner zuerst gleich.', `Erweitere ${frac(a, small)} mit ${k}.`],
    steps: [`${frac(a, small)} = ${frac(extended, big)}`, `${frac(extended, big)} + ${frac(b, big)}`, `Zähler: ${extended} + ${b} = ${value}`, `Das Ergebnis ist ${frac(value, big)}.`],
    bugs: valueBugs([
      { id: 'nenner-addiert', match: { numerator: a + b, denominator: small + big }, hint: 'Addiere die Nenner nicht. Mach die Nenner zuerst gleich.' },
      { id: 'nicht-erweitert', match: { numerator: a + b, denominator: big }, hint: `Erweitere ${frac(a, small)} zuerst. Der Zähler ändert sich mit.` },
    ], { numerator: value, denominator: big }),
    praise: 'Du hast zuerst auf denselben Nenner erweitert.',
    srText: speak(`${frac(a, small)} plus ${frac(b, big)} sind wie viel?`),
    kmk: KMK,
  });
};

/** Stufe 3, AB II: minus; the larger fraction comes first. */
const relatedMinus: Form = (rng, stufe, ab) => {
  const { small, big, k, a, b } = relatedPair(rng);
  const extended = a * k;
  const first = extended > b;
  const left = first ? frac(a, small) : frac(b, big);
  const right = first ? frac(b, big) : frac(a, small);
  // b shares no factor with big, the erweiterter Zähler does: the two are never equal
  const hi = Math.max(extended, b);
  const lo = Math.min(extended, b);
  const value = hi - lo;
  return build(SKILL, stufe, {
    key: `verschieden-minus:${a}/${small}:${b}/${big}`,
    ab,
    prompt: 'Rechne. Trage den Bruch ein.',
    expression: `${left} − ${right} = ${BOX}`,
    answer: { kind: 'fraction', numerator: value, denominator: big, accept: 'equivalent' },
    hints: ['Die Nenner sind verschieden. Mach die Nenner zuerst gleich.', `Erweitere ${frac(a, small)} mit ${k}.`],
    steps: [`${frac(a, small)} = ${frac(extended, big)}`, `Zähler: ${hi} − ${lo} = ${value}`, `Das Ergebnis ist ${frac(value, big)}.`],
    bugs: valueBugs([
      { id: 'nicht-erweitert', match: { numerator: Math.abs(a - b), denominator: big }, hint: `Erweitere ${frac(a, small)} zuerst. Der Zähler ändert sich mit.` },
      { id: 'nenner-addiert', match: { numerator: Math.abs(a - b), denominator: small + big }, hint: 'Rechne nicht mit den Nennern. Mach die Nenner zuerst gleich.' },
    ], { numerator: value, denominator: big }),
    praise: 'Du hast zuerst auf denselben Nenner erweitert.',
    srText: speak(`${left} minus ${right} sind wie viel?`),
    kmk: KMK,
  });
};

/** Stufe 3, AB III: what is missing up to one whole, after two amounts. */
const missingToWhole: Form = (rng, stufe, ab) => {
  const p = pickPerson(rng).name;
  const small = rng.pick([2, 3, 4]);
  const k = rng.pick(small === 2 ? [2, 3, 4] : [2, 3]);
  const big = small * k;
  const a = rng.pick(Array.from({ length: small - 1 }, (_, i) => i + 1).filter((x) => gcd(x, small) === 1));
  const extended = a * k;
  const b = rng.int(1, big - extended - 1);
  const rest = big - extended - b;
  const context = `In einen Krug passt 1${NBSP}l. ${p} gießt ${frac(a, small)}${NBSP}l Saft und ${frac(b, big)}${NBSP}l Wasser hinein.`;
  const prompt = 'Wie viel Liter passen noch hinein?';
  return build(SKILL, stufe, {
    key: `bis-eins:${p}:${a}/${small}:${b}/${big}`,
    ab,
    context,
    prompt,
    answer: { kind: 'fraction', numerator: rest, denominator: big, accept: 'equivalent', unit: 'l' },
    hints: ['Mach die Nenner zuerst gleich. Addiere dann die beiden Mengen.', `Ein Ganzes sind ${big} Teile. Wie viele Teile fehlen?`],
    steps: [`${frac(a, small)} = ${frac(extended, big)}`, `${frac(extended, big)} + ${frac(b, big)} = ${frac(extended + b, big)}`, `1 = ${frac(big, big)}`, `Es ${rest === 1 ? 'fehlt' : 'fehlen'} ${frac(rest, big)}${NBSP}l.`],
    bugs: valueBugs([
      { id: 'summe-statt-rest', match: { numerator: extended + b, denominator: big }, hint: 'Das ist schon im Krug. Gefragt ist der fehlende Teil.' },
      { id: 'nenner-addiert', match: { numerator: a + b, denominator: small + big }, hint: 'Addiere die Nenner nicht. Mach die Nenner zuerst gleich.' },
    ], { numerator: rest, denominator: big }),
    praise: 'Du hast erweitert, addiert und bis zum Ganzen ergänzt.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren', 'PK.problemloesen'],
  });
};

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [plusPlain], 2: [plusStory], 3: [missingSummand] },
  2: { 1: [minusPlain], 2: [plusAboveOne], 3: [chain, missingInMinus] },
  3: { 1: [relatedPlus], 2: [relatedMinus], 3: [missingToWhole] },
};

export const gleichnamigSkill: SkillDef = {
  ...SKILL,
  title: 'Brüche addieren',
  description: 'Du addierst und subtrahierst Brüche mit gleichem Nenner.',
  stufen: { 1: 'Plus, gleicher Nenner, Summe bis 1', 2: 'Minus, Summe über 1 als unechter Bruch', 3: 'Verschiedene Nenner, einer ein Vielfaches des anderen' },
  kmk: KMK,
  generate: byStufeAndAb(FORMS),
};
