/**
 * Einheiten umrechnen.
 * Stufe 1: neighbouring units (km and m, m and dm, g and mg, h and min …), down, up, from a table and a ruler; AB III orders or takes hard numbers.
 * Stufe 2: skipped units (m to cm over dm, mm to m, t to g, h to s), down, up, along a table with the unit between; AB III orders three units.
 * A value from a million on does not fit the answer field on a phone, so t and g are asked from the g side, and km and cm stay below 10 km.
 * Stufe 3: mixed quantities (2 h 35 min), into one unit and back; AB III: decimal hours and order. Time is not decimal.
 */
import { BOX, fmt, fmtMixed, unitWord } from '../../core/format';
import type { Ab, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { targetAb } from '../shared';
import { directionWords, finish, orderQuantities, q, speak, type OrderItem } from './helpers';

const SKILL = { id: 'groessen.einheiten', topicId: 'groessen' } as const;
const KMK = ['GM.einheiten'];

interface Pair {
  big: string;
  small: string;
  factor: number;
  /** The unit between big and small with its two factors (Stufe 2). */
  via?: { unit: string; first: number; second: number };
}

/** Next to each other in the Einheitentafel (docs/research.md §2.3: km to mm, t to mg, h to s): dm lies between m and cm. */
const NEIGHBOURS: readonly Pair[] = [
  { big: 'km', small: 'm', factor: 1000 },
  { big: 'm', small: 'dm', factor: 10 },
  { big: 'dm', small: 'cm', factor: 10 },
  { big: 'cm', small: 'mm', factor: 10 },
  { big: 'g', small: 'mg', factor: 1000 },
  { big: 'kg', small: 'g', factor: 1000 },
  { big: 't', small: 'kg', factor: 1000 },
  { big: 'h', small: 'min', factor: 60 },
  { big: 'min', small: 's', factor: 60 },
];

const SKIPS: readonly Pair[] = [
  { big: 'm', small: 'cm', factor: 100, via: { unit: 'dm', first: 10, second: 10 } },
  { big: 'dm', small: 'mm', factor: 100, via: { unit: 'cm', first: 10, second: 10 } },
  { big: 'm', small: 'mm', factor: 1000, via: { unit: 'cm', first: 100, second: 10 } },
  { big: 'km', small: 'cm', factor: 100_000, via: { unit: 'm', first: 1000, second: 100 } },
  { big: 't', small: 'g', factor: 1_000_000, via: { unit: 'kg', first: 1000, second: 1000 } },
  { big: 'h', small: 's', factor: 3600, via: { unit: 'min', first: 60, second: 60 } },
];

const isTime = (p: Pair) => p.factor === 60 || p.factor === 3600;

/** n of the big unit fits the answer field and, written in the small unit, one line of a phone. */
const fitsPhone = (p: Pair, n: number) => n * p.factor < 1_000_000;

/** The sentence about a time factor. */
const hundredHint = (p: Pair) => (p.big === 'h' && p.small === 'min' ? 'Eine Stunde hat 60 Minuten, nicht 100.' : p.big === 'min' ? 'Eine Minute hat 60 Sekunden, nicht 100.' : 'Eine Stunde hat 3600 Sekunden. Rechne zweimal mit 60.');

/** A number for a conversion that is not the factor itself (a hint names the factor). */
function amount(rng: Rng, min: number, max: number, p: Pair): number {
  const n = rng.int(min, max);
  return n === p.factor ? n + 1 : n;
}

/** The two steps of a skipped unit, or one for a neighbour. */
function downSteps(p: Pair, n: number): string[] {
  const end = n * p.factor;
  if (!p.via) return [`${q(n, p.big)} = ${fmt(n)} · ${q(p.factor, p.small)}`, `${q(n, p.big)} = ${q(end, p.small)}`];
  const mid = n * p.via.first;
  return [`${q(n, p.big)} = ${fmt(n)} · ${q(p.via.first, p.via.unit)} = ${q(mid, p.via.unit)}`, `${q(mid, p.via.unit)} = ${fmt(mid)} · ${q(p.via.second, p.small)} = ${q(end, p.small)}`, `${q(n, p.big)} = ${q(end, p.small)}`];
}

function upSteps(p: Pair, n: number): string[] {
  const start = n * p.factor;
  if (!p.via) return [`${fmt(start)} : ${fmt(p.factor)} = ${fmt(n)}`, `${q(start, p.small)} = ${q(n, p.big)}`];
  const mid = n * p.via.first;
  return [`${q(start, p.small)} = ${q(mid, p.via.unit)}`, `${q(mid, p.via.unit)} = ${q(n, p.big)}`];
}

/** Wrong results of a conversion: a neighbouring factor, or one of the two steps left out. */
function factorBugs(p: Pair, wrongValue: (factor: number) => number) {
  if (p.via) {
    const twoSteps = `Von ${p.big} nach ${p.small} sind es zwei Schritte: ${p.big}, ${p.via.unit}, ${p.small}.`;
    return [
      { id: 'einheit-faktor', match: wrongValue(p.via.first), hint: twoSteps },
      { id: 'einheit-faktor', match: wrongValue(p.via.second), hint: twoSteps },
      isTime(p) ? { id: 'zeit-hundert', match: wrongValue(10_000), hint: hundredHint(p) } : null,
    ];
  }
  if (isTime(p)) return [{ id: 'zeit-hundert', match: wrongValue(100), hint: hundredHint(p) }];
  const others = p.factor === 1000 ? [100, 10] : p.factor === 100 ? [10, 1000] : [100];
  return others.map((f) => ({ id: 'einheit-faktor', match: wrongValue(f), hint: `Zwischen ${p.big} und ${p.small} liegt der Faktor ${fmt(p.factor)}.` }));
}

function down(stufe: Stufe, ab: Ab, p: Pair, n: number): Exercise {
  const value = n * p.factor;
  return finish(SKILL, stufe, {
    key: `ab:${p.big}:${p.small}:${n}`,
    ab,
    prompt: 'Rechne um.',
    expression: `${q(n, p.big)} = ${BOX} ${p.small}`,
    answer: { kind: 'number', value, unit: p.small },
    hints: [`Von ${p.big} nach ${p.small}: Die Einheit ist kleiner, die Zahl größer.`, `1 ${p.big} = ${fmt(p.factor)} ${p.small}. Rechne mal ${fmt(p.factor)}.`],
    steps: downSteps(p, n),
    bugs: factorBugs(p, (f) => n * f),
    praise: `Du hast mit dem Faktor zwischen ${p.big} und ${p.small} gerechnet.`,
    kmk: KMK,
  });
}

function up(stufe: Stufe, ab: Ab, p: Pair, n: number): Exercise {
  const start = n * p.factor;
  return finish(SKILL, stufe, {
    key: `auf:${p.small}:${p.big}:${n}`,
    ab,
    prompt: 'Rechne um.',
    expression: `${q(start, p.small)} = ${BOX} ${p.big}`,
    answer: { kind: 'number', value: n, unit: p.big },
    hints: [`Von ${p.small} nach ${p.big}: Die Einheit ist größer, die Zahl kleiner.`, `1 ${p.big} = ${fmt(p.factor)} ${p.small}. Teile durch ${fmt(p.factor)}.`],
    steps: upSteps(p, n),
    bugs: [
      ...factorBugs(p, (f) => start / f),
      { id: 'einheit-richtung', match: start * p.factor, hint: `Von ${p.small} nach ${p.big} wird die Zahl kleiner. Teile, statt zu multiplizieren.` },
    ],
    praise: `Du hast durch den Faktor geteilt und ${p.big} erhalten.`,
    kmk: KMK,
  });
}

/** The factor can be read from a table. */
function fromTable(stufe: Stufe, ab: Ab, p: Pair, n: number): Exercise {
  const other = n === 3 ? 2 : 3;
  const rows = [['1', fmt(p.factor)], [String(other), fmt(other * p.factor)], [fmt(n), BOX]];
  return finish(SKILL, stufe, {
    key: `tabelle:${p.big}:${n}`,
    ab,
    prompt: 'Welche Zahl fehlt in der Tabelle?',
    visual: { type: 'table', header: [p.big, p.small], rows },
    answer: { kind: 'number', value: n * p.factor, unit: p.small },
    hints: ['Schau in die erste Zeile. Dort steht der Faktor.', `Rechne ${fmt(n)} · ${fmt(p.factor)}.`],
    steps: downSteps(p, n),
    bugs: factorBugs(p, (f) => n * f),
    praise: 'Du hast den Faktor aus der Tabelle abgelesen.',
    srText: `Tabelle mit ${unitWord(p.big)} und ${unitWord(p.small)}. ${speak1(n, p)}`,
    kmk: KMK,
  });
}

const speak1 = (n: number, p: Pair) => `Wie viel sind ${n} ${unitWord(p.big)} in ${unitWord(p.small)}?`;

/** A strip on a ruler, whole centimetres. */
function rulerToMm(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const cm = rng.int(3, 14);
  const mm = cm * 10;
  return finish(SKILL, stufe, {
    key: `lineal:${cm}`,
    ab,
    prompt: 'Wie lang ist der Streifen in Millimetern?',
    visual: { type: 'ruler', maxCm: Math.max(15, cm + 1), startMm: 0, lengthMm: mm },
    answer: { kind: 'number', value: mm, unit: 'mm', label: 'Länge in Millimetern' },
    hints: ['Lies zuerst die Zentimeter am Lineal ab.', '1 cm hat 10 mm.'],
    steps: [`Der Streifen ist ${q(cm, 'cm')} lang.`, `${q(cm, 'cm')} = ${fmt(cm)} · ${q(10, 'mm')} = ${q(mm, 'mm')}`],
    bugs: [{ id: 'einheit-faktor', match: cm, hint: 'Das Lineal zeigt Zentimeter. Gefragt sind Millimeter: 1 cm hat 10 mm.' }, { id: 'einheit-faktor', match: mm * 10, hint: 'Zwischen cm und mm liegt der Faktor 10.' }],
    praise: 'Du hast abgelesen und in Millimeter umgerechnet.',
    srText: `Ein Lineal mit einem Streifen. Der Streifen beginnt bei 0 und endet bei ${cm} Zentimetern. Wie lang ist der Streifen in Millimetern?`,
    kmk: KMK,
  });
}

function orderTask(stufe: Stufe, ab: Ab, key: string, rng: Rng, items: OrderItem[], unit: string, misread?: { id: string; hint: string }): Exercise {
  const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
  const { answer, sorted, bugs } = orderQuantities(rng, items, direction, misread);
  return finish(SKILL, stufe, {
    key: `ordnen:${key}:${direction}`,
    ab,
    prompt: `Ordne die Größen ${directionWords(direction)}.`,
    answer,
    hints: [`Rechne alles in ${unit} um.`, 'Vergleiche dann die Zahlen.'],
    steps: [`Alles in ${unit}: ${items.map((x) => q(x.value, unit)).join(', ')}`, `Geordnet ${directionWords(direction)}: ${sorted.map((x) => x.label).join(', ')}`],
    bugs,
    praise: 'Du hast alles in eine Einheit gebracht und verglichen.',
    srText: speak(`Ordne ${directionWords(direction)}: ${answer.items.join(', ')}.`),
    kmk: KMK,
  });
}

/** One big value, and two of the small unit around it: the number alone gives another order. */
function orderNeighbours(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const p = rng.pick(NEIGHBOURS);
  const n = rng.int(2, 9);
  const step = p.factor / 2;
  const below = n * p.factor - step;
  const above = n * p.factor + step;
  const items: OrderItem[] = [
    { label: q(n, p.big), value: n * p.factor, raw: n },
    { label: q(below, p.small), value: below, raw: below },
    { label: q(above, p.small), value: above, raw: above },
  ];
  return orderTask(stufe, ab, `${p.big}:${n}`, rng, items, p.small);
}

/** Three units in one task. */
function orderSkips(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const p = rng.pick(SKIPS);
  const via = p.via!;
  const n = rng.int(2, 8);
  const base = n * p.factor;
  const tenth = p.factor / 10;
  const [a, b, c] = rng.sample([1, 2, 3, 4, 5, 6, 7], 3);
  const mid = n * via.first + (a * via.first) / 10;
  const items: OrderItem[] = [
    { label: q(n, p.big), value: base, raw: n },
    { label: q(mid, via.unit), value: mid * via.second, raw: mid },
    { label: q(base - b * tenth, p.small), value: base - b * tenth, raw: base - b * tenth },
    { label: q(base + c * tenth, p.small), value: base + c * tenth, raw: base + c * tenth },
  ];
  return orderTask(stufe, ab, `${p.big}:${n}:${a}:${b}:${c}`, rng, items, p.small);
}

// ─── Stufe 3: mixed quantities ───────────────────────────────────────────────

const MIXED: readonly Pair[] = [
  { big: 'h', small: 'min', factor: 60 },
  { big: 'km', small: 'm', factor: 1000 },
  { big: 'kg', small: 'g', factor: 1000 },
  { big: 'm', small: 'cm', factor: 100 },
  { big: 'min', small: 's', factor: 60 },
  { big: 't', small: 'kg', factor: 1000 },
];

/** A small part below the factor. A short part makes the empty places matter. */
function smallPart(rng: Rng, p: Pair): number {
  if (p.factor === 60) return rng.int(1, 11) * 5;
  if (p.factor === 100) return rng.chance(0.4) ? rng.int(2, 9) : rng.int(11, 95);
  return rng.chance(0.4) ? rng.int(11, 95) : rng.int(11, 99) * 10;
}

function mixedToOne(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const p = rng.pick(MIXED);
  const big = rng.int(2, 9);
  const small = smallPart(rng, p);
  const value = big * p.factor + small;
  const glued = Number(`${big}${small}`);
  return finish(SKILL, stufe, {
    key: `gemischt:${p.big}:${big}:${small}`,
    ab,
    prompt: `Schreib nur in ${p.small}.`,
    expression: `${fmtMixed(value, p.factor, p.big, p.small)} = ${BOX} ${p.small}`,
    answer: { kind: 'number', value, unit: p.small },
    hints: [`Rechne zuerst ${q(big, p.big)} in ${p.small} um.`, `Zähle dann die ${q(small, p.small)} dazu.`],
    steps: [`${q(big, p.big)} = ${fmt(big)} · ${q(p.factor, p.small)} = ${q(big * p.factor, p.small)}`, `${q(big * p.factor, p.small)} + ${q(small, p.small)} = ${q(value, p.small)}`],
    bugs: [
      isTime(p) ? { id: 'zeit-hintereinander', match: big * 100 + small, hint: `${p.big === 'h' ? 'Eine Stunde' : 'Eine Minute'} hat 60 Einheiten, nicht 100. Rechne zuerst um.` } : null,
      !isTime(p) && glued !== value ? { id: 'stelle-null', match: glued, hint: `Nach ${p.big} kommen ${p.factor === 100 ? 'zwei' : 'drei'} Stellen für ${p.small}. Leere Stellen bekommen eine 0.` } : null,
      { id: 'einheit-faktor', match: big + small, hint: `Rechne zuerst ${q(big, p.big)} in ${p.small} um. Dann zählst du zusammen.` },
    ],
    praise: 'Du hast den großen Teil umgerechnet und den Rest dazugezählt.',
    kmk: KMK,
  });
}

function fields(p: Pair, big: number, small: number): MultiField[] {
  return [
    { id: 'a', value: big, after: p.big, label: p.big },
    { id: 'b', value: small, after: p.small, label: p.small },
  ];
}

function oneToMixed(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const p = rng.pick(MIXED);
  const big = rng.int(2, 9);
  const small = smallPart(rng, p);
  const value = big * p.factor + small;
  const f = fields(p, big, small);
  const steps = isTime(p)
    ? [`${fmt(value)} : ${p.factor} = ${big} Rest ${small}`, `${q(value, p.small)} = ${fmtMixed(value, p.factor, p.big, p.small)}`]
    : [`${q(value, p.small)} = ${q(big * p.factor, p.small)} + ${q(small, p.small)}`, `${q(big * p.factor, p.small)} = ${q(big, p.big)}`, `${q(value, p.small)} = ${fmtMixed(value, p.factor, p.big, p.small)}`];
  const hundred = { h: Math.floor(value / 100), min: value % 100 };
  return finish(SKILL, stufe, {
    key: `trennen:${p.big}:${value}`,
    ab,
    prompt: `Schreib in ${p.big} und ${p.small}.`,
    expression: `${q(value, p.small)} = ${BOX} ${p.big} ${BOX} ${p.small}`,
    answer: { kind: 'multi', fields: f },
    hints: [`Wie viele ganze ${p.big} stecken in ${q(value, p.small)}?`, `1 ${p.big} = ${fmt(p.factor)} ${p.small}. Der Rest bleibt in ${p.small}.`],
    steps,
    bugs: [
      isTime(p)
        ? { id: 'zeit-hundert', match: { a: hundred.h, b: hundred.min }, hint: hundredHint(p) }
        : { id: 'einheit-faktor', match: p.factor === 1000 ? { a: Math.floor(value / 100), b: value % 100 } : { a: Math.floor(value / 1000), b: value % 1000 }, hint: `Zwischen ${p.big} und ${p.small} liegt der Faktor ${fmt(p.factor)}.` },
    ],
    praise: 'Du hast die ganzen Einheiten gefunden und den Rest behalten.',
    kmk: KMK,
  });
}

/**
 * A strip that does not start at 0: length as cm and mm.
 * Measured in Chrome at 375 px: a ruler to 15 cm shrinks to 1.8 px per mm, a comb. A ruler to 9 cm keeps its 2.8 px per mm, and there the long and the middle tick
 * can be read, but 7 mm and 8 mm cannot be told apart. So both ends stand on such a tick, and exactly one of them on a middle tick: the length is never whole cm.
 */
function rulerMixed(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const halfStart = rng.chance(0.5);
  const startMm = rng.int(1, 3) * 10 + (halfStart ? 5 : 0);
  const endMm = rng.int(5, 8) * 10 + (halfStart ? 0 : 5);
  const lengthMm = endMm - startMm;
  const f: MultiField[] = [
    { id: 'a', value: Math.floor(lengthMm / 10), after: 'cm', label: 'cm' },
    { id: 'b', value: lengthMm % 10, after: 'mm', label: 'mm' },
  ];
  return finish(SKILL, stufe, {
    key: `lineal:${startMm}:${lengthMm}`,
    ab,
    prompt: 'Der Streifen beginnt nicht bei 0. Wie lang ist der Streifen?',
    expression: `${BOX} cm ${BOX} mm`,
    visual: { type: 'ruler', maxCm: 9, startMm, lengthMm },
    answer: { kind: 'multi', fields: f },
    hints: ['Lies Anfang und Ende in mm ab. Der mittlere Strich zeigt 5 mm.', 'Rechne Ende minus Anfang. Dann schreibst du cm und mm.'],
    steps: [`Anfang: ${q(startMm, 'mm')}. Ende: ${q(endMm, 'mm')}.`, `${q(endMm, 'mm')} − ${q(startMm, 'mm')} = ${q(lengthMm, 'mm')}`, `${q(lengthMm, 'mm')} = ${fmtMixed(lengthMm, 10, 'cm', 'mm')}`],
    bugs: [{ id: 'lineal-start', match: { a: Math.floor(endMm / 10), b: endMm % 10 }, hint: 'Der Streifen beginnt nicht bei 0. Zieh den Anfang vom Ende ab.' }],
    praise: 'Du hast den Anfang vom Ende abgezogen.',
    srText: `Ein Lineal mit einem Streifen. Der Streifen beginnt bei ${startMm} Millimetern und endet bei ${endMm} Millimetern. Wie lang ist der Streifen in Zentimetern und Millimetern?`,
    kmk: KMK,
  });
}

/** Time is not decimal: 1,5 h is 1 h 30 min. */
function decimalHours(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const h = rng.int(1, 6);
  const part = rng.pick([
    { dec: 0.5, min: 30, digits: 50, name: 'die Hälfte', step: `0,5 h = ${q(60, 'min')} : 2 = ${q(30, 'min')}` },
    { dec: 0.25, min: 15, digits: 25, name: 'ein Viertel', step: `0,25 h = ${q(60, 'min')} : 4 = ${q(15, 'min')}` },
    { dec: 0.75, min: 45, digits: 75, name: 'drei Viertel', step: `0,75 h = 3 · ${q(15, 'min')} = ${q(45, 'min')}` },
  ]);
  const f: MultiField[] = [
    { id: 'a', value: h, after: 'h', label: 'h' },
    { id: 'b', value: part.min, after: 'min', label: 'min' },
  ];
  return finish(SKILL, stufe, {
    key: `dezimal:${h}:${part.min}`,
    ab,
    prompt: 'Schreib in Stunden und Minuten.',
    expression: `${q(h + part.dec, 'h')} = ${BOX} h ${BOX} min`,
    answer: { kind: 'multi', fields: f },
    hints: [`Nach dem Komma steht ein Teil einer Stunde: ${part.name}.`, 'Eine Stunde hat 60 Minuten. Wie viele Minuten sind dieser Teil?'],
    steps: [part.step, `${q(h + part.dec, 'h')} = ${fmtMixed(h * 60 + part.min, 60, 'h', 'min')}`],
    bugs: [{ id: 'zeit-dezimal', match: { a: h, b: part.digits }, hint: 'Eine Stunde hat 60 Minuten. Die Stellen nach dem Komma sind keine Minuten.' }],
    praise: 'Du hast die Stunde richtig in 60 Minuten geteilt.',
    kmk: KMK,
  });
}

/** Mixed notation among single units. Read as decimals, the items change their order. */
function orderMixed(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  if (rng.chance(0.5)) {
    const h = rng.int(1, 4);
    const m = rng.pick([5, 10]);
    const a = h * 60 + m;
    const b = h * 60 + m + 15;
    const c = h * 60 + 30;
    const d = h * 60 + 50;
    const items: OrderItem[] = [
      { label: fmtMixed(a, 60, 'h', 'min'), value: a, raw: h * 100 + m },
      { label: q(b, 'min'), value: b, raw: b },
      { label: fmtMixed(c, 60, 'h', 'min'), value: c, raw: h * 100 + 30 },
      { label: q(d, 'min'), value: d, raw: d },
    ];
    return orderTask(stufe, ab, `zeit:${h}:${m}`, rng, items, 'min');
  }
  const p = rng.pick(MIXED.filter((x) => x.factor === 1000));
  const n = rng.int(2, 7);
  const t = rng.int(1, 4) * 10;
  const a = n * 1000 + t;
  const b = n * 1000 + t * 5;
  const c = n * 1000 + t * 10;
  const d = n * 1000 + t * 15;
  const items: OrderItem[] = [
    { label: fmtMixed(a, 1000, p.big, p.small), value: a, misread: n * 1000 + t * 10 + 1 },
    { label: q(b, p.small), value: b },
    { label: fmtMixed(c, 1000, p.big, p.small), value: c },
    { label: q(d, p.small), value: d },
  ];
  return orderTask(stufe, ab, `${p.big}:${n}:${t}`, rng, items, p.small, { id: 'stelle-null', hint: `${q(t, p.small)} stehen hinten. Nach ${p.big} kommen drei Stellen.` });
}

export const einheitenSkill: SkillDef = {
  ...SKILL,
  title: 'Einheiten umrechnen',
  description: 'Du rechnest Längen, Gewichte und Zeiten in andere Einheiten um.',
  stufen: {
    1: 'Benachbarte Einheiten: km und m, kg und g, h und min',
    2: 'Einheiten überspringen: mm in m, t in g, h in s',
    3: 'Gemischte Angaben wie 2 h 35 min; Zeit ist nicht dezimal',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) {
        if (rng.chance(0.25)) return rulerToMm(stufe, ab, rng);
        const p = rng.pick(NEIGHBOURS);
        return down(stufe, ab, p, amount(rng, 2, 9, p));
      }
      if (ab === 2) {
        const p = rng.pick(NEIGHBOURS);
        return rng.chance(0.35) ? fromTable(stufe, ab, p, amount(rng, 4, 12, p)) : up(stufe, ab, p, amount(rng, 2, 12, p));
      }
      if (rng.chance(0.6)) return orderNeighbours(stufe, ab, rng);
      const p = rng.pick(NEIGHBOURS);
      return up(stufe, ab, p, amount(rng, 13, 45, p));
    }
    if (stufe === 2) {
      const p = rng.pick(SKIPS);
      const n = rng.int(2, 9);
      if (ab === 1) return fitsPhone(p, n) ? down(stufe, ab, p, n) : up(stufe, ab, p, n);
      if (ab === 2) return rng.chance(0.35) && fitsPhone(p, n) ? chain(stufe, ab, p, n) : up(stufe, ab, p, n);
      if (rng.chance(0.55)) return orderSkips(stufe, ab, rng);
      const hard = rng.pick(SKIPS.filter((x) => fitsPhone(x, 25)));
      return rng.chance(0.5) ? down(stufe, ab, hard, rng.int(11, 25)) : up(stufe, ab, hard, rng.int(11, 25));
    }
    if (ab === 1) return mixedToOne(stufe, ab, rng);
    if (ab === 2) return rng.chance(0.25) ? rulerMixed(stufe, ab, rng) : oneToMixed(stufe, ab, rng);
    return rng.chance(0.5) ? decimalHours(stufe, ab, rng) : orderMixed(stufe, ab, rng);
  },
};

/** A table with the unit between: the last gap is the skipped unit. */
function chain(stufe: Stufe, ab: Ab, p: Pair, n: number): Exercise {
  const via = p.via!;
  const mid = n * via.first;
  return finish(SKILL, stufe, {
    key: `kette:${p.big}:${n}`,
    ab,
    prompt: 'Welche Zahl fehlt in der Tabelle?',
    visual: { type: 'table', header: [p.big, via.unit, p.small], rows: [[fmt(n), fmt(mid), BOX]] },
    answer: { kind: 'number', value: mid * via.second, unit: p.small },
    hints: [`Die Tabelle zeigt schon ${via.unit}. Von dort fehlt nur ein Schritt.`, `1 ${via.unit} = ${fmt(via.second)} ${p.small}.`],
    steps: [`${q(mid, via.unit)} = ${fmt(mid)} · ${q(via.second, p.small)}`, `${q(n, p.big)} = ${q(mid * via.second, p.small)}`],
    bugs: factorBugs(p, (f) => n * f),
    praise: `Du bist über ${via.unit} bis zu ${p.small} gegangen.`,
    srText: `Tabelle mit ${unitWord(p.big)}, ${unitWord(via.unit)} und ${unitWord(p.small)}. ${speak1(n, p)}`,
    kmk: KMK,
  });
}
