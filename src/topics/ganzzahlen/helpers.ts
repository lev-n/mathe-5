/**
 * Helpers of the topic 'ganzzahlen' (docs/research.md §6): the exercise frame, Zahlengeraden, thermometers and short term texts. Pure; randomness
 * only through the Rng parameter.
 */
import { fmt, fmtSigned, fmtTemp, MINUS, toSpeech } from '../../core/format';
import type { Ab, Bug, Exercise, NumberLineAnswer, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, type ExerciseBody } from '../shared';

export const KMK_ZAHLEN = ['ZO.ganze-zahlen'];
export const KMK_RECHNEN = ['ZO.ganze-rechnen'];

/**
 * T11, outside the skills that teach these words. Skills are optional and come in any order, so a text with the word also says what it means, or the word stays out of that
 * text (fachwortWithoutGloss in checks.ts).
 */
export const VORZEICHEN_GLOSS = 'Plus oder Minus vor einer Zahl heißt Vorzeichen.';
export const GEGENZAHL_NEAR = 'gleich weit von der 0';
export const GEGENZAHL_HINT = `Abziehen heißt: die Gegenzahl addieren, ${GEGENZAHL_NEAR}, andere Seite.`;

/** One item without the frame: `key` holds the form and its numbers; `kmk` adds to the skill's tags when an item also trains a Prozesskompetenz. */
export type Form = Omit<ExerciseBody, 'ab' | 'kmk'> & { kmk?: string[] };

export type SkillRef = Pick<SkillDef, 'id' | 'topicId'>;

/** The frame every item shares: the key is '<ab>:<form>:<numbers>' after the skill and Stufe parts. */
export function assemble(skill: SkillRef, stufe: Stufe, ab: Ab, kmk: string[], form: Form): Exercise {
  const { key, kmk: extra, ...rest } = form;
  return build(skill, stufe, { key: `${ab}:${key}`, ab, kmk: extra ? [...kmk, ...extra] : kmk, ...rest });
}

export const bug = (id: string, match: Bug['match'], hint: string): Bug => ({ id, match, hint });

const closed = (part: string) => (/[.!?:,]$/.test(part.trim()) ? part.trim() : `${part.trim()}.`);

/**
 * The spoken text of a task: operators spelled out, grouping brackets said (toSpeech leaves them to the voice), and each part closed as its own sentence, so that a
 * result never runs into the next term.
 */
export function say(...parts: (string | undefined)[]): string {
  const text = toSpeech(parts.filter((p): p is string => !!p).map(closed).join(' '));
  return text.replace(/\(\s*/g, 'Klammer auf ').replace(/\s*\)/g, ' Klammer zu');
}

// ─── Terms ───────────────────────────────────────────────────────────────────

export type Op = '+' | '−';

/** 'a + (−b)', with the first number free of brackets (T10). */
export function term(a: number, op: Op, b: number): string {
  return `${fmt(a)} ${op} ${fmtSigned(b)}`;
}

export const apply = (a: number, op: Op, b: number): number => (op === '+' ? a + b : a - b);

/** The label of a jump on the line: '+ 8', '− 3'. */
export const jumpLabel = (d: number): string => (d >= 0 ? `+ ${fmt(d)}` : `${MINUS} ${fmt(-d)}`);

// ─── Zahlengerade ────────────────────────────────────────────────────────────

type Line = VisualOf<'numberLine'>;

/** A Zahlengerade with an arrowhead at both ends, labelled at the long ticks unless `labels` is given. */
export function line(min: number, max: number, majorStep: number, minorStep: number, extra: Partial<Line> = {}): Line {
  return { type: 'numberLine', min, max, majorStep, minorStep, labelMajor: !extra.labels, arrows: 'both', ...extra };
}

/** A Zahlengerade around these values and the 0 with a readable scale, for worked steps. */
export function lineAround(values: readonly number[], extra: Partial<Line> = {}): Line {
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const span = Math.max(1, high - low);
  const minor = [1, 2, 5, 10, 20, 50, 100, 200, 500].find((s) => span / s <= 20) ?? 1000;
  // long ticks are multiples of 5 steps, so that the 0 is one of them and gets its label
  const major = minor * 5;
  return line(Math.floor((low - minor) / major) * major, Math.ceil((high + minor) / major) * major, major, minor, extra);
}

/**
 * The picture in words for srText, as a child who tabs to the field never meets the image: the ends, the number of sections and the labels. A letter mark is told in
 * sections from the nearest label on its left, never by its value, which is the answer of a reading task. The value of a section stays out too: finding it can be the task.
 */
export function lineInWords(v: Line): string {
  const sections = Math.round((v.max - v.min) / v.minorStep);
  const shown = v.labels ?? Array.from({ length: Math.round((v.max - v.min) / v.majorStep) + 1 }, (_, i) => v.min + i * v.majorStep);
  const labels = v.labels
    ? `Beschriftet sind nur ${shown.map((n) => fmt(n)).join(' und ').replace(/ und (?=.* und )/g, ', ')}.`
    : `Die Beschriftung geht in Schritten von ${fmt(v.majorStep)}.`;
  const marks = (v.marks ?? []).map((m) => {
    if (!/^[A-Z]$/.test(m.label)) return `Marke bei ${m.label}.`;
    const from = [...shown].reverse().find((n) => n <= m.value) ?? v.min;
    const count = Math.round((m.value - from) / v.minorStep);
    return count === 0 ? `Pfeil ${m.label} steht genau bei ${fmt(from)}.` : `Pfeil ${m.label}: ${count} ${count === 1 ? 'Abschnitt' : 'Abschnitte'} rechts von ${fmt(from)}.`;
  });
  return [`Zahlengerade von ${fmt(v.min)} bis ${fmt(v.max)} mit ${sections} gleichen Abschnitten.`, labels, ...marks].join(' ');
}

/** How wide a mark's label is on the line (NumberLineVisual: viewBox 400, 340 of it for the axis, font size 20). */
const markWidth = (label: string) => label.length * 11.6 + 6;

/** A Zahlengerade for two labelled marks: around the 0 if their labels stay apart there, else a section close enough to tell them apart. */
export function lineForMarks(a: number, b: number, show: (v: number) => string = fmt): Line {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const need = (markWidth(show(lo)) + markWidth(show(hi))) / 2 + 4;
  const apart = (l: Line) => ((hi - lo) / (l.max - l.min)) * 340 >= need;
  const around = lineAround([a, b]);
  if (apart(around)) return around;
  const sections = [1, 2, 5, 10, 20, 50, 100, 200].map((minor) => line(Math.floor(lo / (minor * 5)) * minor * 5, Math.ceil(hi / (minor * 5)) * minor * 5, minor * 5, minor));
  return sections.find((l) => (l.max - l.min) / l.minorStep <= 20 && apart(l)) ?? around;
}

/** The arrow is set on this line: same axis as line(). */
export function lineAnswer(value: number, v: Line): NumberLineAnswer {
  return {
    kind: 'numberline',
    min: v.min,
    max: v.max,
    majorStep: v.majorStep,
    minorStep: v.minorStep,
    step: v.minorStep,
    value,
    tolerance: 0,
    labelMajor: v.labelMajor,
    arrows: 'both',
    ...(v.labels ? { labels: v.labels } : {}),
  };
}

// ─── Thermometer ─────────────────────────────────────────────────────────────

/**
 * A thermometer that holds these values and the 0, with at most 30 ticks for a phone. ThermometerVisual labels every tick, every 2nd (16 to 21 ticks) or every 5th,
 * counted from the lower end: an end on a multiple of 5, and on an even tick for every 2nd label, puts the labels on round values.
 */
export function thermometerFor(values: readonly number[], value: number, change?: number): VisualOf<'thermometer'> {
  const low = Math.min(0, ...values) - 2;
  const high = Math.max(0, ...values) + 2;
  const scale = (step: number) => {
    const min = Math.floor(low / (5 * step)) * 5 * step;
    const max = Math.ceil(high / step) * step;
    const count = (max - min) / step;
    return { min: count > 15 && count < 22 && (min / step) % 2 !== 0 ? min - 5 * step : min, max, step };
  };
  const { min, max, step } = [1, 2, 5].map(scale).find((s) => (s.max - s.min) / s.step <= 30) ?? scale(10);
  return {
    type: 'thermometer',
    min,
    max,
    step,
    value,
    unit: '°C',
    ...(change !== undefined ? { change } : {}),
  };
}

/** The thermometer in words for srText: the level in ticks from the lower end, never its value (see lineInWords). */
export function thermometerInWords(v: Pick<VisualOf<'thermometer'>, 'min' | 'max' | 'step' | 'value'>): string {
  const ticks = Math.round((v.value - v.min) / v.step);
  return `Thermometer von ${fmtTemp(v.min)} bis ${fmtTemp(v.max)}, ein Strich zählt ${fmt(v.step)} Grad. Der Stand liegt ${ticks} ${ticks === 1 ? 'Strich' : 'Striche'} über dem unteren Ende.`;
}

// ─── Small numbers ───────────────────────────────────────────────────────────

/** A sign of a value: −n or n. */
export const signed = (n: number, negative: boolean): number => (negative ? -n : n);

/** Grad with its number: '1 Grad', '5 Grad'. */
export const grad = (n: number): string => `${fmt(n)} Grad`;

/** '1 Strich', '5 Striche'. */
export const striche = (n: number): string => `${fmt(n)} ${n === 1 ? 'Strich' : 'Striche'}`;

/** '1 Schritt', '5 Schritte'. */
export const schritte = (n: number): string => `${fmt(n)} ${n === 1 ? 'Schritt' : 'Schritte'}`;

/** The verb agrees with the number: 'ist es 1 Grad', 'sind es 5 Grad'. */
export const sindEs = (n: number, unit: (n: number) => string): string => `${n === 1 ? 'ist' : 'sind'} es ${unit(n)}`;

/** The verb agrees with the number: 'Es bleibt 1 Grad.', 'Es bleiben 5 Grad.' */
export const esBleiben = (n: number, unit: (n: number) => string): string => `Es ${n === 1 ? 'bleibt' : 'bleiben'} ${unit(n)}.`;
