/**
 * zahlen.zahlenstrahl: read and place large numbers. The Stufe chooses the line (S1 ticks at Stufenzahlen, S2 ticks like 50 000, S3 a section
 * without zero and a fitting scale); AB varies the labels and the form inside it. Bugs compute the value of a child who counts a tick wrongly.
 * The drawing of a line is 400 wide and cuts off what sticks out, so a long label only goes on a tick where it fits (shownLabels). The srText says the
 * ticks, the labels and the arrows: a screen reader does not reach them through the picture while the child is in the answer field.
 */
import { fmt } from '../../core/format';
import type { Ab, Answer, Bug, Exercise, GenContext, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, makeChoice, numberBugs, plural, targetAb } from '../shared';

const SKILL = { id: 'zahlen.zahlenstrahl', topicId: 'zahlen' } as const;
const KMK = ['ZO.grosse-zahlen', 'PK.darstellen'];

interface Line {
  min: number;
  max: number;
  major: number;
  minor: number;
}

const TICK_HINT = 'Schau zuerst: Wie viel zählt ein kleiner Strich?';

/** The drawing of a line: 400 wide, the line from 30 to 370 (NL in src/ui/visuals/NumberLineVisual.tsx). */
const atX = (line: Line, v: number) => 30 + ((v - line.min) / (line.max - line.min)) * 340;

/** The width of a label there: 10.4 per digit, 3.6 per thin gap. */
function labelWidth(v: number): number {
  const text = fmt(v);
  const digits = text.replace(/\D/g, '').length;
  return digits * 10.4 + (text.length - digits) * 3.6;
}

function majorTicks(line: Line): number[] {
  return Array.from({ length: Math.round((line.max - line.min) / line.major) + 1 }, (_, i) => line.min + i * line.major);
}

/**
 * The values a line labels: its long ticks (labelMajor) or its ends, as far as they fit. Long numbers move to the nearest long ticks that hold them,
 * with an even gap and at least two labels, so a tick can still be worked out.
 */
function shownLabels(line: Line, labelMajor: boolean): number[] {
  const majors = majorTicks(line);
  const fits = majors.filter((v) => atX(line, v) - labelWidth(v) / 2 >= 0 && atX(line, v) + labelWidth(v) / 2 <= 400);
  if (!labelMajor) return [fits[0], fits[fits.length - 1]];
  if (fits.length === majors.length) return majors;
  for (let stride = 1; stride < fits.length; stride++) {
    const every = fits.filter((_, i) => i % stride === 0);
    const apart = every.every((v, i) => i === 0 || atX(line, v) - atX(line, every[i - 1]) >= (labelWidth(v) + labelWidth(every[i - 1])) / 2 + 8);
    if (apart && every.length >= 2) return every;
  }
  return [fits[0], fits[fits.length - 1]];
}

/** How the labels of a line are written down: all long ticks, or the values that fit. */
function labelSpec(line: Line, labelMajor: boolean): { labelMajor: boolean; labels?: number[] } {
  const labels = shownLabels(line, labelMajor);
  return labelMajor && labels.length === majorTicks(line).length ? { labelMajor: true } : { labelMajor: false, labels };
}

function drawn(line: Line, labelMajor: boolean, marks: { value: number; label: string }[] = []): Visual {
  return {
    type: 'numberLine',
    min: line.min,
    max: line.max,
    majorStep: line.major,
    minorStep: line.minor,
    ...labelSpec(line, labelMajor),
    ...(marks.length ? { marks } : {}),
  };
}

function placeAnswer(line: Line, value: number, labelMajor: boolean): Answer {
  return {
    kind: 'numberline',
    min: line.min,
    max: line.max,
    majorStep: line.major,
    minorStep: line.minor,
    step: line.minor,
    value,
    tolerance: 0,
    ...labelSpec(line, labelMajor),
  };
}

/** A tick of the line that is no long tick and lies right of the first label, so a label always stands before it. */
function pickTick(rng: Rng, line: Line, labelMajor: boolean): number {
  const first = shownLabels(line, labelMajor)[0];
  const count = Math.round((line.max - line.min) / line.minor);
  for (let tries = 0; tries < 60; tries++) {
    const v = line.min + rng.int(1, count - 1) * line.minor;
    if (v > first && (v - line.min) % line.major !== 0) return v;
  }
  return first + line.minor;
}

/** The last labelled value at or before v. */
function labelBefore(line: Line, v: number, labelMajor: boolean): number {
  return shownLabels(line, labelMajor).filter((x) => x <= v).pop() ?? line.min;
}

const onLine = (line: Line, v: number) => v >= line.min && v <= line.max && (v - line.min) % line.minor === 0;

/** The line for a screen reader: its ends, its ticks and its labels. */
function describeLine(line: Line, labelMajor: boolean): string {
  const majors = Math.round((line.max - line.min) / line.major);
  const parts = Math.round(line.major / line.minor);
  return `Zahlenstrahl von ${line.min} bis ${line.max}. Lange Striche teilen ihn in ${majors} Abschnitte. Jeder Abschnitt hat ${parts} kleine Abschnitte. Beschriftet: ${shownLabels(line, labelMajor).join(', ')}.`;
}

/** An arrow in small ticks from the label before it, never by its value. */
function describeArrow(line: Line, v: number, labelMajor: boolean, name: string): string {
  const from = labelBefore(line, v, labelMajor);
  const k = Math.round((v - from) / line.minor);
  return `${name} steht ${k} ${plural(k, 'kleinen Abschnitt', 'kleine Abschnitte')} rechts von ${from}.`;
}

function readSteps(line: Line, v: number, from: number, labelMajor: boolean): Exercise['steps'] {
  const k = Math.round((v - from) / line.minor);
  return [
    `Ein kleiner Strich zählt ${fmt(line.minor)}.`,
    { text: `Der Pfeil steht ${k} ${k === 1 ? 'Strich' : 'Striche'} rechts von ${fmt(from)}.`, visual: drawn(line, labelMajor, [{ value: v, label: 'A' }]) },
    `Der Pfeil zeigt auf ${fmt(v)}.`,
  ];
}

/** Read the arrow with a number field. */
function readArrow(stufe: Stufe, ab: Ab, line: Line, v: number, labelMajor: boolean): Exercise {
  const from = labelBefore(line, v, labelMajor);
  const k = Math.round((v - from) / line.minor);
  return build(SKILL, stufe, {
    key: `ablesen:${line.min}:${line.max}:${line.minor}:${v}:${labelMajor ? 'm' : 'e'}`,
    ab,
    prompt: 'Welche Zahl zeigt der Pfeil?',
    visual: drawn(line, labelMajor, [{ value: v, label: 'A' }]),
    answer: { kind: 'number', value: v, label: 'Zahl am Pfeil' },
    hints: [TICK_HINT, 'Zähle die Striche ab der letzten Zahl vor dem Pfeil.'],
    steps: readSteps(line, v, from, labelMajor),
    bugs: numberBugs([
      { id: 'strahl-schritt', match: from + k, hint: TICK_HINT },
      { id: 'strahl-schritt-2', match: from + (k * line.major) / 10, hint: TICK_HINT },
      { id: 'strahl-beschriftung', match: from, hint: 'Der Pfeil steht rechts von dieser Zahl. Zähle die Striche bis zum Pfeil.' },
      line.min > 0 && { id: 'strahl-anfang', match: v - line.min, hint: 'Der Strahl beginnt nicht bei 0. Lies zuerst den Anfang ab.' },
    ], v),
    praise: 'Du hast zuerst den Wert eines Strichs bestimmt.',
    srText: `${describeLine(line, labelMajor)} ${describeArrow(line, v, labelMajor, 'Der Pfeil')} Welche Zahl zeigt der Pfeil?`,
    kmk: KMK,
  });
}

/** Set the arrow on v. A child who takes a tick for a tenth of a major tick lands elsewhere. */
function placeArrow(stufe: Stufe, ab: Ab, line: Line, v: number, labelMajor: boolean): Exercise {
  const from = labelBefore(line, v, labelMajor);
  const assumed = line.major / 10;
  const wrongTicks = (v - from) / assumed;
  const counted = from + wrongTicks * line.minor;
  const wholeTenth = (line.max - line.min) / 10;
  const tenthTicks = (v - line.min) / wholeTenth;
  const bugs: (Bug | false)[] = [
    Number.isInteger(wrongTicks) && onLine(line, counted) && { id: 'strahl-schritt', match: counted, hint: TICK_HINT },
    Number.isInteger(tenthTicks) && onLine(line, line.min + tenthTicks * line.minor) && { id: 'strahl-schritt-2', match: line.min + tenthTicks * line.minor, hint: TICK_HINT },
  ];
  return build(SKILL, stufe, {
    key: `setzen:${line.min}:${line.max}:${line.minor}:${v}:${labelMajor ? 'm' : 'e'}`,
    ab,
    prompt: `Setze den Pfeil auf ${fmt(v)}.`,
    answer: placeAnswer(line, v, labelMajor),
    hints: [TICK_HINT, labelMajor ? 'Suche die beschriftete Zahl direkt vor deiner Zahl.' : 'Teile den Abstand der beiden Zahlen durch die Zahl der Abschnitte.'],
    steps: [
      `Ein kleiner Strich zählt ${fmt(line.minor)}.`,
      `Von ${fmt(from)} bis ${fmt(v)} sind es ${Math.round((v - from) / line.minor)} kleine Abschnitte.`,
      { text: `Der Pfeil steht auf ${fmt(v)}.`, visual: drawn(line, labelMajor, [{ value: v, label: 'A' }]) },
    ],
    bugs: numberBugs(bugs, v),
    praise: 'Du hast die Striche mit ihrem richtigen Wert gezählt.',
    srText: `${describeLine(line, labelMajor)} Setze den Pfeil auf ${v}. Nutze die Pfeiltasten.`,
    kmk: KMK,
  });
}

/** Two arrows: how far apart are they? */
function arrowDistance(ab: Ab, rng: Rng, line: Line): Exercise {
  const count = Math.round((line.max - line.min) / line.minor);
  const a = rng.int(1, count - 4);
  const b = rng.int(a + 2, count - 1);
  const va = line.min + a * line.minor;
  const vb = line.min + b * line.minor;
  const value = vb - va;
  return build(SKILL, 1, {
    key: `abstand:${line.max}:${line.minor}:${va}:${vb}`,
    ab,
    prompt: 'Wie groß ist der Abstand zwischen den Pfeilen A und B?',
    visual: drawn(line, true, [{ value: va, label: 'A' }, { value: vb, label: 'B' }]),
    answer: { kind: 'number', value, label: 'Abstand' },
    hints: [TICK_HINT, 'Zähle die kleinen Abschnitte von A bis B.'],
    steps: [`Ein kleiner Strich zählt ${fmt(line.minor)}.`, `Von A bis B sind es ${b - a} kleine Abschnitte.`, `Der Abstand ist ${fmt(value)}.`],
    bugs: numberBugs([
      { id: 'strahl-schritt', match: b - a, hint: 'Du hast die Striche gezählt. Wie viel zählt jeder Strich?' },
      { id: 'strahl-summe', match: va + vb, hint: 'Der Abstand ist der Weg von A nach B. Ziehe die kleinere Zahl ab.' },
    ], value),
    praise: 'Du hast den Abstand aus den Strichen bestimmt.',
    srText: `${describeLine(line, true)} ${describeArrow(line, va, true, 'Der Pfeil A')} ${describeArrow(line, vb, true, 'Der Pfeil B')} Wie groß ist der Abstand?`,
    kmk: KMK,
  });
}

/** How much does one tick count? */
function tickValue(ab: Ab, line: Line): Exercise {
  const parts = Math.round(line.major / line.minor);
  return build(SKILL, 2, {
    key: `strich:${line.max}:${line.major}:${line.minor}`,
    ab,
    prompt: 'Wie viel zählt ein kleiner Strich?',
    visual: drawn(line, true),
    answer: { kind: 'number', value: line.minor, label: 'Wert eines Strichs' },
    hints: ['Nimm zwei beschriftete Zahlen nebeneinander.', 'Zähle die kleinen Abschnitte dazwischen. Teile dann den Abstand.'],
    steps: [`Zwischen zwei langen Strichen liegt der Abstand ${fmt(line.major)}.`, `Das sind ${parts} kleine Abschnitte.`, `${fmt(line.major)} : ${parts} = ${fmt(line.minor)}`],
    bugs: numberBugs([
      { id: 'strahl-schritt', match: 1, hint: 'Ein Strich zählt hier nicht 1. Schau auf die Beschriftung.' },
      { id: 'strahl-stufenzahl', match: line.major / 10, hint: 'Hier sind es nicht zehn Abschnitte. Zähle die Abschnitte genau.' },
      { id: 'strahl-beschriftung', match: line.major, hint: 'Das ist der Abstand der langen Striche. Teile den Abstand durch die Abschnitte.' },
    ], line.minor),
    praise: 'Du hast den Abstand durch die Abschnitte geteilt.',
    srText: `${describeLine(line, true)} Wie viel zählt ein kleiner Strich?`,
    kmk: KMK,
  });
}

/** Which scale fits these numbers? */
function fittingScale(rng: Rng, ab: Ab, line: Line): Exercise {
  const count = Math.round((line.max - line.min) / line.minor);
  const low = line.min + rng.int(1, 2) * line.minor;
  const high = line.max - rng.int(1, 2) * line.minor;
  const mid = line.min + rng.int(4, count - 4) * line.minor;
  const label = (min: number, tick: number) => `${fmt(min)} bis ${fmt(min + 10 * tick)}, ein Strich zählt ${fmt(tick)}`;
  const span = 10 * line.minor;
  const answer = makeChoice(rng, { label: label(line.min, line.minor) }, [
    { label: label(line.min, line.minor / 10), whyWrong: 'Dieser Strahl endet zu früh. Die größte Zahl passt nicht mehr darauf.' },
    { label: label(line.min + span, line.minor), whyWrong: 'Dieser Strahl beginnt zu spät. Die kleinste Zahl liegt links vom Anfang.' },
    { label: label(0, 10 ** String(line.min + span).length), whyWrong: 'Hier liegen alle Zahlen fast auf demselben Strich.' },
  ]);
  return build(SKILL, 3, {
    key: `skala:${line.min}:${line.minor}:${low}:${mid}:${high}`,
    ab,
    prompt: 'Du trägst diese Zahlen auf einem Strahl mit 10 kleinen Abschnitten ein. Welche Einteilung passt?',
    expression: [low, mid, high].map((v) => fmt(v)).join('; '),
    answer,
    hints: ['Prüfe zuerst: Liegen die kleinste und die größte Zahl auf dem Strahl?', 'Die Zahlen sollen auf verschiedenen Strichen liegen.'],
    steps: [
      `Die kleinste Zahl ist ${fmt(low)}, die größte ${fmt(high)}.`,
      { text: `Der Abschnitt ab ${fmt(line.min)} enthält beide.`, visual: drawn(line, true, [{ value: low, label: 'A' }, { value: high, label: 'B' }]) },
      `Passend ist: ${label(line.min, line.minor)}.`,
    ],
    praise: 'Du hast den Abschnitt zu den Zahlen passend gewählt.',
    srText: `Du trägst die Zahlen ${low}, ${mid} und ${high} auf einem Strahl mit 10 kleinen Abschnitten ein. Welche Einteilung passt?`,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

const STUFENZAHLEN = [1000, 10_000, 100_000, 1_000_000, 10_000_000];

function stufe1(rng: Rng, ab: Ab): Exercise {
  const s = rng.pick(STUFENZAHLEN);
  const line: Line = { min: 0, max: (ab === 1 ? 10 : 20) * s, major: 5 * s, minor: s };
  if (ab === 1) return readArrow(1, ab, line, pickTick(rng, line, true), true);
  // only the ends are labelled: the child finds the value of a tick first. Placing an arrow belongs to Stufe 2
  if (ab === 2) return readArrow(1, ab, line, pickTick(rng, line, false), false);
  return arrowDistance(ab, rng, line);
}

/** Ticks that are no Stufenzahl. */
const TICKS: readonly { minor: number; major: number; count: number }[] = [
  { minor: 50_000, major: 200_000, count: 20 },
  { minor: 25_000, major: 100_000, count: 20 },
  { minor: 20_000, major: 100_000, count: 25 },
  { minor: 5000, major: 20_000, count: 20 },
  { minor: 2500, major: 10_000, count: 20 },
  { minor: 500_000, major: 2_000_000, count: 20 },
  { minor: 250_000, major: 1_000_000, count: 20 },
  { minor: 200_000, major: 1_000_000, count: 25 },
];

function stufe2(rng: Rng, ab: Ab): Exercise {
  const t = rng.pick(TICKS);
  const line: Line = { min: 0, max: t.count * t.minor, major: t.major, minor: t.minor };
  if (ab === 1) return placeArrow(2, ab, line, pickTick(rng, line, true), true);
  if (ab === 2) return placeArrow(2, ab, line, pickTick(rng, line, false), false);
  return rng.chance(0.5) ? tickValue(ab, line) : readArrow(2, ab, line, pickTick(rng, line, false), false);
}

/** A section without zero, above a Milliarde if the range allows it. */
function section(rng: Rng, ctx: GenContext): Line {
  const minor = rng.pick([2000, 5000, 20_000, 50_000, 200_000, 500_000]);
  const big = ctx.ranges.beyondMilliarde && rng.chance(0.4);
  const scaled = big ? minor * 100 : minor;
  const block = scaled * 5;
  const min = big ? rng.int(2, 9) * 1e9 + rng.int(1, 4) * block : rng.int(2, 40) * block;
  // a long tick every 2 small ticks: its first and last ones lie far enough inside to hold even a number above a Milliarde
  return { min, max: min + 10 * scaled, major: scaled * 2, minor: scaled };
}

function stufe3(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const line = section(rng, ctx);
  if (ab === 1) return readArrow(3, ab, line, pickTick(rng, line, true), true);
  if (ab === 2) return placeArrow(3, ab, line, pickTick(rng, line, false), false);
  return fittingScale(rng, ab, line);
}

export const zahlenstrahlSkill: SkillDef = {
  ...SKILL,
  title: 'Am Zahlenstrahl',
  description: 'Du liest große Zahlen ab und trägst sie ein.',
  stufen: {
    1: 'Pfeil ablesen; Striche bei Stufenzahlen',
    2: 'Zahl eintragen; ein Strich zählt zum Beispiel 50 000',
    3: 'Abschnitt ohne Null; passende Einteilung wählen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return stufe1(rng, ab);
    return stufe === 2 ? stufe2(rng, ab) : stufe3(rng, ab, ctx);
  },
};
