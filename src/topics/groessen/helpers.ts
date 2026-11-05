/**
 * Helpers of the topic 'groessen': quantities as text, the safe exercise builder, order answers of quantities and small visual helpers.
 * Pure functions only (no React, randomness only through the Rng parameter).
 */
import { NBSP, fmt, fmtMoney, fmtQty, fmtTime } from '../../core/format';
import type { Answer, Bug, Exercise, OrderAnswer, Rng, SkillDef, Stufe } from '../../core/types';
import { build, mentionsNumber, multiBugs, numberBugs, speak, type ExerciseBody, type MaybeBug } from '../shared';

export { speak };

/** Decimals of a field in a comma skill that is no € amount: the comma key stays active, and the solution shows no '3,00' (fieldText). */
export const COMMA_FIELD = 3;
/** Decimals of a € amount: the solution shows '6,00'. */
export const EURO_FIELD = 2;

/** A quantity: '5 cm', '1,7 km', '12 500 m'. */
export const q = (n: number, unit: string): string => fmtQty(n, unit);

/** An amount in Cent, in whole Euro when it can be: '10 €', '3,40 €'. */
export const euro = (cents: number): string => (cents % 100 === 0 ? `${fmt(cents / 100)}${NBSP}€` : fmtMoney(cents));

/** A clock time from minutes since midnight: '13.50 Uhr'. */
export const clock = (t: number): string => fmtTime(Math.floor(t / 60) % 24, t % 60);

/** The analog clock of a time, for a visual. */
export const clockVisual = (t: number) => ({ type: 'clock' as const, hours: Math.floor(t / 60) % 24, minutes: t % 60, showDigital: false, face: 'five' as const });

/** Coins and notes of an amount in Cent, largest first. */
export function moneyItems(cents: number): number[] {
  const out: number[] = [];
  let rest = cents;
  for (const piece of [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]) {
    while (rest >= piece) {
      out.push(piece);
      rest -= piece;
    }
  }
  return out;
}

/** Coins and notes of an amount as words: what a picture of money shows, for a screen reader, never their sum. '1 Schein zu 5 Euro, 2 Münzen zu 1 Euro'. */
export function moneyWords(cents: number): string {
  const counts = new Map<number, number>();
  for (const piece of moneyItems(cents)) counts.set(piece, (counts.get(piece) ?? 0) + 1);
  return [...counts].map(([piece, n]) => {
    const kind = piece >= 500 ? (n === 1 ? 'Schein' : 'Scheine') : n === 1 ? 'Münze' : 'Münzen';
    return `${n} ${kind} zu ${piece >= 100 ? `${fmt(piece / 100)} Euro` : `${piece} Cent`}`;
  }).join(', ');
}

/** Reading clock times as decimal numbers, so that an hour seems to have 100 minutes: 10.20 − 8.45 gives 1 h 75 min. */
export function hundredMinuteSpan(start: number, end: number): { h: number; min: number } {
  const asDecimal = (t: number) => Math.floor(t / 60) * 100 + (t % 60);
  const d = asDecimal(end) - asDecimal(start);
  return { h: Math.floor(d / 100), min: d % 100 };
}

/** The hint for an hour of 100 minutes, in words where the answer is 60 or 100: a hint with the answer in it would be dropped, and the item would lose its bug. */
export const hundredMinuteHint = (answer: number): string => (answer === 60 || answer === 100 ? 'Eine Stunde hat nicht hundert Minuten. Geh über die volle Stunde.' : 'Eine Stunde hat 60 Minuten, nicht 100.');

const fits = (x: number, decimals = 0) => Math.abs(x * 10 ** decimals - Math.round(x * 10 ** decimals)) < 1e-9;

/** The bugs a child can really type: on the field's decimals, outside a tolerance, different from the answer, no repeats. */
function usableBugs(answer: Answer, bugs: MaybeBug[]): Bug[] {
  if (answer.kind === 'number') {
    const { value, decimals, tolerance } = answer;
    return numberBugs(bugs, value).filter((b) => fits(b.match as number, decimals) && (value === null || Math.abs((b.match as number) - value) > (tolerance ?? 0)));
  }
  if (answer.kind === 'multi') {
    const fields = answer.fields;
    return multiBugs(bugs, fields).filter((b) => fields.every((f) => fits((b.match as Record<string, number>)[f.id] ?? f.value, f.decimals)));
  }
  if (answer.kind === 'order') {
    const seen = new Set<string>([answer.correct.join()]);
    return bugs.filter((b): b is Bug => {
      if (!b || !Array.isArray(b.match) || seen.has(b.match.join())) return false;
      seen.add(b.match.join());
      return true;
    });
  }
  return [];
}

/** The forms of the answer a hint must not state (≥ 10, as in the shared suite). */
function answerForms(answer: Answer): string[] {
  const values = answer.kind === 'number' ? (answer.value === null ? [] : [answer.value]) : answer.kind === 'multi' ? answer.fields.map((f) => f.value) : [];
  return values.filter((v) => Math.abs(v) >= 10).flatMap((v) => (Number.isInteger(v) ? [fmt(v)] : [fmt(v), fmt(v, 2)]));
}

/** The correct option of a choice when it is a quantity ('1 kg'): a hint with these words singles it out, however small the number. A word like 'Das passt.' is no quantity. */
function quantityLabel(answer: Answer): string | null {
  if (answer.kind !== 'choice') return null;
  const label = answer.options[answer.correct].label.replace(/\u00A0/g, ' ');
  return /^\d/.test(label) ? label : null;
}

/** The quantity stands in a text as a whole: '1 m' is not in '1 min' or '0,1 m'. */
const statesQuantity = (text: string, label: string) => new RegExp(`(?<![\\d,])${label}(?![\\p{L}\\d])`, 'u').test(text.replace(/\u00A0/g, ' '));

export type GroessenBody = Omit<ExerciseBody, 'bugs' | 'srText'> & { bugs?: MaybeBug[]; srText?: string };

/** What the child reads, as screen-reader text. */
export const taskText = (body: Pick<ExerciseBody, 'context' | 'prompt' | 'expression'>): string => [body.context, body.prompt, body.expression].filter(Boolean).join(' ');

/**
 * build() with the checks every item of this topic needs: bugs a child can type, no hint, bug hint or whyWrong that states the answer, the
 * screen-reader text from the task. A hint that the task's own numbers explain stays.
 */
export function finish(skill: Pick<SkillDef, 'id' | 'topicId'>, stufe: Stufe, body: GroessenBody, fallback = 'Schreib zuerst auf, was du schon weißt.'): Exercise {
  const task = taskText(body);
  const hidden = answerForms(body.answer).filter((form) => !mentionsNumber(task, form));
  const label = quantityLabel(body.answer);
  const hiddenLabel = label !== null && !statesQuantity(task, label) ? label : null;
  const safe = (text: string) => !hidden.some((form) => mentionsNumber(text, form)) && (hiddenLabel === null || !statesQuantity(text, hiddenLabel));
  const hints = body.hints.filter(safe);
  const bugs = usableBugs(body.answer, body.bugs ?? []).filter((b) => safe(b.hint));
  const answer: Answer = body.answer.kind === 'choice' ? { ...body.answer, options: body.answer.options.map((o) => (o.whyWrong && !safe(o.whyWrong) ? { ...o, whyWrong: fallback } : o)) } : body.answer;
  return build(skill, stufe, { ...body, answer, hints: hints.length ? hints : [fallback], bugs, srText: body.srText ?? speak(task) });
}

/** One quantity of an order task. raw: the number the child sees, for the mistake of comparing without the unit. misread: its value when read wrongly. */
export interface OrderItem {
  label: string;
  value: number;
  raw?: number;
  misread?: number;
}

export interface OrderedQuantities {
  answer: OrderAnswer;
  sorted: OrderItem[];
  bugs: Bug[];
}

/** An order answer of distinct quantities, never shown in the target order, with the order a child gets by each typical misreading. */
export function orderQuantities(rng: Rng, items: readonly OrderItem[], direction: 'aufsteigend' | 'absteigend', misreadBug?: { id: string; hint: string }): OrderedQuantities {
  const by = (get: (x: OrderItem) => number) => (a: OrderItem, b: OrderItem) => (direction === 'aufsteigend' ? get(a) - get(b) : get(b) - get(a));
  const sorted = [...items].sort(by((x) => x.value));
  let shown = rng.shuffle(items);
  if (shown.every((v, i) => v === sorted[i])) shown = [...shown.slice(1), shown[0]];
  const answer: OrderAnswer = { kind: 'order', items: shown.map((x) => x.label), correct: sorted.map((x) => shown.indexOf(x)), direction };
  const indices = (list: OrderItem[]) => list.map((x) => shown.indexOf(x));
  const bugs: Bug[] = [];
  if (items.every((x) => x.raw !== undefined)) {
    bugs.push({ id: 'nur-zahl', match: indices([...items].sort(by((x) => x.raw!))), hint: 'Rechne zuerst alles in dieselbe Einheit um. Dann vergleichst du.' });
  }
  if (misreadBug && items.some((x) => x.misread !== undefined)) {
    bugs.push({ id: misreadBug.id, match: indices([...items].sort(by((x) => x.misread ?? x.value))), hint: misreadBug.hint });
  }
  return { answer, sorted, bugs };
}

/** The direction of an order task, as a word for the worked steps. */
export const directionWords = (direction: 'aufsteigend' | 'absteigend'): string => (direction === 'aufsteigend' ? 'vom Kleinsten zum Größten' : 'vom Größten zum Kleinsten');
