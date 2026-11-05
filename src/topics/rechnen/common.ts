/**
 * Helpers of the topic 'rechnen': the item wrapper that keeps hints from giving the answer away, the term engine (Punkt vor Strich, Klammern, and what
 * a child gets with the typical wrong order) and the written calculations (Überschlag, worked lines in the school wording, bug library). Pure.
 */
import { DIV, MINUS, TIMES, fmt, toSpeech } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, Rng, Step, Stufe, SubtractionMethod, VisualOf, WrittenMask, WrittenOp } from '../../core/types';
import { correctResult, digitAt, digitsOf, layoutAdd, layoutDiv, layoutMul, layoutSub, numLength, placeDative, placeName, placeOne, writtenVisual } from '../../core/written';
import { build, mentionsNumber, numberBugs, type ExerciseBody, type MaybeBug } from '../shared';

// ─── Items ───────────────────────────────────────────────────────────────────

/** Try `make` until it returns a value (deterministic for a given rng); `fallback` after maxTries. */
export function attempt<T>(make: () => T | null, fallback: () => T, maxTries = 400): T {
  for (let i = 0; i < maxTries; i++) {
    const v = make();
    if (v !== null) return v;
  }
  return fallback();
}

/** The values a hint must not state (the same rule as revealedAnswers in src/core/testing.ts). */
function answerValues(answer: Exercise['answer']): number[] {
  switch (answer.kind) {
    case 'number':
      return answer.value === null ? [] : [answer.value];
    case 'written':
      return [answer.result];
    case 'multi':
      return answer.fields.map((f) => f.value);
    case 'choice': {
      const label = answer.options[answer.correct].label.trim();
      return /^\d+$/.test(label) ? [Number(label)] : [];
    }
    default:
      return [];
  }
}

const NO_REVEAL_HINT = 'Rechne Schritt für Schritt.';

/** build() with a guard: a hint, bug hint or whyWrong that happens to state the answer is dropped or replaced. Numbers of the task stay allowed. */
export function item(skill: { id: string; topicId: 'rechnen' }, stufe: Stufe, body: ExerciseBody): Exercise {
  const task = [body.context, body.prompt, body.expression].filter(Boolean).join(' ');
  const shown = answerValues(body.answer).filter((v) => Math.abs(v) >= 10).map((v) => fmt(v)).filter((form) => !mentionsNumber(task, form));
  const says = (text: string) => shown.some((form) => mentionsNumber(text, form));
  const hints = body.hints.filter((h) => !says(h));
  const answer = body.answer.kind === 'choice'
    ? { ...body.answer, options: body.answer.options.map((o) => (o.whyWrong && says(o.whyWrong) ? { ...o, whyWrong: NO_REVEAL_HINT } : o)) }
    : body.answer;
  return build(skill, stufe, { ...body, answer, hints: hints.length ? hints : [NO_REVEAL_HINT], bugs: body.bugs?.filter((b) => !says(b.hint)) });
}

/** Bugs of a whole-number field: numberBugs, without values a child cannot type there. */
export function wholeBugs(bugs: MaybeBug[], correct: number | null): Bug[] {
  return numberBugs(bugs.map((b) => (b && typeof b.match === 'number' && Number.isInteger(b.match) ? b : null)), correct);
}

// ─── Terms ───────────────────────────────────────────────────────────────────

export type Op = '+' | typeof MINUS | typeof TIMES | typeof DIV;
export type Tok = number | Op | '(' | ')';

export const PLUS: Op = '+';
export const SUB: Op = MINUS;
export const MAL: Op = TIMES;
export const GETEILT: Op = DIV;

/** '(8 + 4) · 3' */
export function termText(toks: readonly Tok[]): string {
  return toks.map((t) => (typeof t === 'number' ? fmt(t) : t === '(' || t === ')' ? t : ` ${t} `)).join('');
}

/** A term in words, with its brackets said (toSpeech leaves them to the voice). */
export function termSpeech(text: string): string {
  return toSpeech(text).replace(/\(/g, 'Klammer auf ').replace(/\)/g, ' Klammer zu');
}

const isPunkt = (t: Tok) => t === TIMES || t === DIV;
const isStrich = (t: Tok) => t === '+' || t === MINUS;

function compute(a: number, op: Op, b: number): number | null {
  if (op === '+') return a + b;
  if (op === MINUS) return a - b >= 0 ? a - b : null;
  if (op === TIMES) return a * b;
  return b !== 0 && a % b === 0 ? a / b : null;
}

export interface TermStep {
  a: number;
  op: Op;
  b: number;
  value: number;
  /** This step stands inside a bracket. */
  bracket: boolean;
  /** Character range of this step in the line before it. */
  range: [number, number];
}

export interface Solved {
  value: number;
  /** The term and its next steps, the last line being the value alone. */
  lines: string[];
  steps: TermStep[];
}

/** How a term is worked through: 'normal', or the typical wrong order 'links' (no Punkt vor Strich, brackets still first). */
export type TermOrder = 'normal' | 'links';

/** Innermost first bracket first; inside it Punkt vor Strich from the left. null: a step does not stay in whole numbers ≥ 0. */
export function solve(start: readonly Tok[], order: TermOrder = 'normal'): Solved | null {
  let toks = [...start];
  const lines = [termText(toks)];
  const steps: TermStep[] = [];
  while (toks.length > 1) {
    const close = toks.indexOf(')');
    const open = close < 0 ? -1 : toks.lastIndexOf('(', close);
    const from = open + 1;
    const to = close < 0 ? toks.length : close;
    let at = -1;
    for (let i = from; i < to && at < 0; i++) if (order === 'links' ? isPunkt(toks[i]) || isStrich(toks[i]) : isPunkt(toks[i])) at = i;
    for (let i = from; i < to && at < 0; i++) if (isStrich(toks[i])) at = i;
    if (at < 0) return null;
    const [a, op, b] = [toks[at - 1], toks[at], toks[at + 1]];
    if (typeof a !== 'number' || typeof b !== 'number') return null;
    const value = compute(a, op as Op, b);
    if (value === null) return null;
    const before = termText(toks.slice(0, at - 1)).length;
    const range: [number, number] = [before, before + termText(toks.slice(at - 1, at + 2)).length];
    steps.push({ a, op: op as Op, b, value, bracket: open >= 0, range });
    const next = [...toks.slice(0, at - 1), value, ...toks.slice(at + 2)];
    // a bracket around one number is done
    const onlyOne = open >= 0 && to - from === 3;
    toks = onlyOne ? [...next.slice(0, open), value, ...next.slice(open + 3)] : next;
    lines.push(termText(toks));
  }
  return { value: toks[0] as number, lines, steps };
}

/** The value of a term, or null. */
export const valueOf = (toks: readonly Tok[], order: TermOrder = 'normal'): number | null => solve(toks, order)?.value ?? null;

/** A value as numerator and denominator. */
type Exact = [number, number];

/** A term by the rules of arithmetic, also where a step goes below 0 or leaves a Rest (solve() stops there). null: a division by 0. */
function exactValue(toks: readonly Tok[]): Exact | null {
  let at = 0;
  const atom = (): Exact | null => {
    const t = toks[at++];
    if (t !== '(') return typeof t === 'number' ? [t, 1] : null;
    const inner = sum();
    at++;
    return inner;
  };
  const product = (): Exact | null => {
    let v = atom();
    while (v && isPunkt(toks[at])) {
      const op = toks[at++];
      const r = atom();
      if (!r || (op === DIV && r[0] === 0)) return null;
      v = op === TIMES ? [v[0] * r[0], v[1] * r[1]] : [v[0] * r[1], v[1] * r[0]];
    }
    return v;
  };
  const sum = (): Exact | null => {
    let v = product();
    while (v && isStrich(toks[at])) {
      const sign = toks[at++] === '+' ? 1 : -1;
      const r = product();
      if (!r) return null;
      v = [v[0] * r[1] + sign * r[0] * v[1], v[1] * r[1]];
    }
    return v;
  };
  return sum();
}

/** The term has exactly this value, whatever its steps do. Use this, not valueOf, to decide whether a term is a second right answer. */
export function reaches(toks: readonly Tok[], target: number): boolean {
  const v = exactValue(toks);
  return v !== null && v[0] === target * v[1];
}

/** The exact value of a term if it is a whole number (it can lie below 0), or null. */
export function exactWhole(toks: readonly Tok[]): number | null {
  const v = exactValue(toks);
  return v !== null && v[0] % v[1] === 0 ? v[0] / v[1] + 0 : null;
}

/** The term with its brackets left out. */
export const withoutBrackets = (toks: readonly Tok[]): Tok[] => toks.filter((t) => t !== '(' && t !== ')');

/** 'a op b' of a step as text. */
export const stepText = (s: Pick<TermStep, 'a' | 'op' | 'b'>) => `${fmt(s.a)} ${s.op} ${fmt(s.b)}`;

/**
 * The options of "Was rechnest du zuerst, und was kommt heraus?", so that the choice carries the calculation: every neighbouring pair of numbers with the value
 * of starting there, and the right step a second time with a value that is 10 off. Spotting the sign leaves two options, and only the calculation decides.
 */
export function firstStepOptions(rng: Rng, toks: readonly Tok[], solved: Solved, whyStep: (op: Op) => string): ChoiceOption[] {
  const bare = withoutBrackets(toks);
  const first = stepText(solved.steps[0]);
  const label = (step: string, value: number) => `Zuerst ${step}, Ergebnis ${fmt(value)}`;
  const used = new Set([solved.value]);
  // a value no other option has, so that no value stands out by repeating
  const fresh = (wanted: number | null) => {
    let v = wanted !== null && wanted >= 0 ? wanted : solved.value + 10;
    while (used.has(v)) v += 10;
    used.add(v);
    return v;
  };
  const off = fresh(solved.value >= 10 && rng.chance(0.5) ? solved.value - 10 : solved.value + 10);
  const options: ChoiceOption[] = [{ label: label(first, solved.value) }, { label: label(first, off), whyWrong: 'Der erste Schritt passt. Rechne danach noch einmal nach.' }];
  const seen = new Set([first]);
  for (let i = 1; i < bare.length; i += 2) {
    const [a, op, b] = [bare[i - 1] as number, bare[i] as Op, bare[i + 1] as number];
    const step = stepText({ a, op, b });
    if (seen.has(step)) continue;
    seen.add(step);
    const started = exactWhole([...bare.slice(0, i - 1), '(', a, op, b, ')', ...bare.slice(i + 2)]);
    options.push({ label: label(step, fresh(started)), whyWrong: whyStep(op) });
  }
  return rng.shuffle(options);
}

/** The worked lines of a term, naming what comes first. The last one carries the whole Rechenweg as a `term` picture. */
export function termSteps(solved: Solved, bracketDepth = false): Step[] {
  const last = solved.steps.length - 1;
  const lines = solved.steps.map((s, i) => {
    const label = s.bracket ? 'Klammer' : (s.op === TIMES || s.op === DIV) && i < last ? 'Punkt vor Strich' : i === last ? 'Zuletzt' : 'Dann';
    return `${label}: ${stepText(s)} = ${fmt(s.value)}.`;
  });
  const picture: VisualOf<'term'> = { type: 'term', lines: solved.lines, highlight: solved.steps[0].range };
  if (bracketDepth) picture.bracketDepth = true;
  return [...lines.slice(0, -1), { text: lines[last], visual: picture }];
}

// ─── Written: numbers ────────────────────────────────────────────────────────

/** Random integer with exactly `len` digits. */
export function randLen(rng: Rng, len: number): number {
  return len === 1 ? rng.int(1, 9) : rng.int(10 ** (len - 1), 10 ** len - 1);
}

/** A number of `len` digits with `zeros` inner zeros (never the first or the last digit). */
export function withInnerZeros(rng: Rng, len: number, zeros = 1): number {
  const ds = String(randLen(rng, len)).split('');
  const inner = Array.from({ length: Math.max(0, len - 2) }, (_, i) => i + 1);
  for (const p of rng.sample(inner, Math.min(zeros, inner.length))) ds[p] = '0';
  // the last digit stays above 0, so the Einer are a real step
  if (ds[len - 1] === '0') ds[len - 1] = String(rng.int(1, 9));
  return Number(ds.join(''));
}

/** Number of carries of a written sum. */
export const carryCount = (ops: readonly number[]) => layoutAdd(ops).carries.filter((c) => c > 0).length;

export function opSign(op: WrittenOp): string {
  return op === 'add' ? '+' : op === 'sub' ? MINUS : op === 'mul' ? TIMES : DIV;
}

/** '4567 + 2845 + 312' */
export function expressionOf(op: WrittenOp, operands: readonly number[]): string {
  return operands.map((n) => fmt(n)).join(` ${opSign(op)} `);
}

/** '5435 : 4 = 1358 Rest 3' */
export function equationOf(op: WrittenOp, operands: readonly number[]): string {
  const rest = op === 'div' ? operands[0] % operands[1] : 0;
  return `${expressionOf(op, operands)} = ${fmt(correctResult(op, operands))}${rest ? ` Rest ${fmt(rest)}` : ''}`;
}

/** Key part of a calculation. */
export const canon = (op: WrittenOp, operands: readonly number[]) => `${op}:${operands.join('_')}`;

// ─── Überschlag ──────────────────────────────────────────────────────────────

/** Round to the highest place: 4873 → 5000, 37 → 40, 6 → 6. */
export function roundLead(n: number): number {
  if (n < 10) return n;
  const p = 10 ** (numLength(n) - 1);
  return Math.round(n / p) * p;
}

/** Round to two leading digits: 1612 → 1600. */
function roundTwo(n: number): number {
  if (n < 100) return Math.max(1, n);
  const p = 10 ** (numLength(n) - 2);
  return Math.round(n / p) * p;
}

export interface Rough {
  expression: string;
  value: number;
  /** 'Überschlag: 5000 · 40 = 200 000.' */
  text: string;
}

/** · rounds both factors to the highest place. : rounds the divisor, then takes a Dividend that divides well (48 372 : 312 → 48 000 : 300 = 160). */
export function roughOf(op: WrittenOp, operands: readonly number[]): Rough {
  let terms: number[];
  let value: number;
  if (op === 'div') {
    const d = roundLead(operands[1]);
    value = roundTwo(Math.round(operands[0] / d));
    terms = [value * d, d];
  } else {
    terms = operands.map(roundLead);
    value = op === 'add' ? terms.reduce((s, t) => s + t, 0) : op === 'sub' ? terms[0] - terms[1] : terms[0] * terms[1];
  }
  const expression = expressionOf(op, terms);
  return { expression, value, text: `Überschlag: ${expression} = ${fmt(value)}.` };
}

/** The Überschlag lies within 25 % of the exact result, so that a solution may say that they fit. */
export function roughFits(op: WrittenOp, operands: readonly number[]): boolean {
  const u = roughOf(op, operands).value;
  const r = correctResult(op, operands);
  return u > 0 && Math.abs(r - u) <= 0.25 * Math.max(r, u);
}

// ─── Written: worked lines (one per place or partial product) ────────────────

/** One line per place, from the Einer. */
export function addLines(ops: readonly number[]): string[] {
  const lay = layoutAdd(ops);
  return lay.columnSums.map((s, p) => {
    const parts = [...ops.filter((n) => numLength(n) > p).map((n) => digitAt(n, p)), ...(lay.carries[p] ? [lay.carries[p]] : [])];
    const calc = parts.length > 1 ? `${parts.join(' + ')} = ${s}` : `${s}`;
    return `${placeName(p)}: ${calc}. ${s >= 10 ? `Schreibe ${s % 10}, Übertrag ${Math.floor(s / 10)}.` : `Schreibe ${s}.`}`;
  });
}

/** One line per place, from the Einer, in the wording of the method (never mixed, §2.3). */
export function subLines(a: number, b: number, method: SubtractionMethod): string[] {
  return layoutSub(a, b, method).columns.map((c) => {
    const name = placeName(c.place);
    if (method === 'abziehen') {
      if (!c.regrouped) return `${name}: ${c.before} ${MINUS} ${c.b ?? 0} = ${c.r}.`;
      const from = c.regroupFrom ?? c.place + 1;
      const take = from === c.place + 1 ? `Entbündle ${placeOne(from)}` : `Entbündle bei den ${placeDative(from)}`;
      return `${name}: ${c.before} ${MINUS} ${c.b ?? 0} geht nicht. ${take}: ${c.top} ${MINUS} ${c.b ?? 0} = ${c.r}.`;
    }
    const lower = (c.b ?? 0) + c.carryIn;
    const target = c.extended ? c.a + 10 : c.a;
    const missing = `Von ${lower} bis ${target} ${c.r === 1 ? 'fehlt' : 'fehlen'} ${c.r}`;
    return `${name}: ${missing}${c.extended ? ', 1 gemerkt.' : '.'}`;
  });
}

/** Times one digit: one line per place. */
export function mulDigitLines(a: number, m: number): string[] {
  const len = numLength(a);
  const lines: string[] = [];
  let c = 0;
  for (let p = 0; p < len; p++) {
    const d = digitAt(a, p);
    const v = d * m + c;
    const calc = c ? `${d} ${TIMES} ${m} = ${d * m}, dazu Übertrag ${c}: ${v}` : `${d} ${TIMES} ${m} = ${v}`;
    const write = p === len - 1 || v < 10 ? `Schreibe ${v}.` : `Schreibe ${v % 10}, Übertrag ${Math.floor(v / 10)}.`;
    lines.push(`${placeName(p)}: ${calc}. ${write}`);
    c = Math.floor(v / 10);
  }
  return lines;
}

const ORDINAL = ['Erstes', 'Zweites', 'Drittes'];

/** One line per partial product. The first one stands furthest left, and each next one moves a place to the right: that is 'einrücken', as in the bug hints. */
export function partialLines(a: number, b: number): string[] {
  return layoutMul(a, b).partials.map((part, i) => {
    const indent = i === 0 ? '' : i === 1 ? ', eine Stelle eingerückt' : ', zwei Stellen eingerückt';
    return `${ORDINAL[i]} Teilprodukt: ${fmt(a)} ${TIMES} ${part.digit} = ${fmt(part.value)}${indent}.`;
  });
}

/** The partial products added: '36 120 + 7224 = 43 344'. */
export function partialSum(a: number, b: number): string {
  const lay = layoutMul(a, b);
  return `${lay.partials.map((p) => fmt(p.value * 10 ** p.shift)).join(' + ')} = ${fmt(lay.result)}`;
}

/** One line per digit of the quotient. */
export function divLines(a: number, d: number): string[] {
  const lay = layoutDiv(a, d);
  const ds = digitsOf(a);
  return lay.steps.map((s, k) => {
    const next = k < lay.steps.length - 1 ? ` Hole die ${ds[s.end + 1]} herunter.` : '';
    if (s.q === 0) return `${fmt(s.partial)} ist kleiner als ${fmt(d)}. Schreibe 0 ins Ergebnis.${next}`;
    return `Wie oft passt ${fmt(d)} in ${fmt(s.partial)}? ${s.q}-mal. Es ${s.diff > 1 ? 'bleiben' : 'bleibt'} ${fmt(s.diff)}.${next}`;
  });
}

/** The last line of a division, with the Probe. */
export function divResultLine(a: number, d: number): string {
  const q = Math.floor(a / d);
  const r = a % d;
  return `${equationOf('div', [a, d])}. Probe: ${fmt(q)} ${TIMES} ${fmt(d)}${r ? ` + ${fmt(r)}` : ''} = ${fmt(a)}.`;
}

/** At most `limit` lines: those `wanted` first, shown in their order. */
export function pickLines(lines: readonly string[], limit: number, wanted: (line: string) => boolean = () => true): string[] {
  const keep = lines.map((l, i) => (wanted(l) ? i : -1)).filter((i) => i >= 0).slice(0, limit);
  for (let i = 0; i < lines.length && keep.length < limit; i++) if (!keep.includes(i)) keep.push(i);
  return keep.sort((x, y) => x - y).map((i) => lines[i]);
}

// ─── Written: the bug library ────────────────────────────────────────────────

const pow10 = (p: number) => 10 ** p;

/** Column addition without any carry; the leftmost column is written in full (8 + 5 → 13), as on paper. */
export function addNoCarry(ops: readonly number[]): number | null {
  const len = Math.max(...ops.map(numLength));
  const sums = Array.from({ length: len }, (_, p) => ops.reduce((s, n) => s + (numLength(n) > p ? digitAt(n, p) : 0), 0));
  if (sums.slice(0, -1).every((s) => s < 10)) return null;
  return sums.reduce((acc, s, p) => acc + (p === len - 1 ? s : s % 10) * pow10(p), 0);
}

/** Only 1 carried where the carry is 2 or more (three Summanden). */
function addSmallCarry(ops: readonly number[]): number | null {
  if (!layoutAdd(ops).carries.some((c) => c >= 2)) return null;
  const len = Math.max(...ops.map(numLength));
  let carry = 0;
  let res = 0;
  for (let p = 0; p < len || carry > 0; p++) {
    const s = ops.reduce((acc, n) => acc + (numLength(n) > p ? digitAt(n, p) : 0), carry);
    res += (s % 10) * pow10(p);
    carry = Math.min(1, Math.floor(s / 10));
  }
  return res;
}

/** The smaller digit taken from the larger in every column. */
export function subSmallerFromLarger(a: number, b: number): number | null {
  const len = numLength(a);
  const res = Array.from({ length: len }, (_, p) => Math.abs(digitAt(a, p) - digitAt(b, p)) * pow10(p)).reduce((x, y) => x + y, 0);
  return res === a - b ? null : res;
}

/** Regrouped, but the next column never takes the 1 off (abziehen: not reduced; ergänzen: the gemerkte 1 forgotten). */
function subNoBorrow(a: number, b: number): number | null {
  const len = numLength(a);
  const res = Array.from({ length: len }, (_, p) => ((digitAt(a, p) - digitAt(b, p) + 10) % 10) * pow10(p)).reduce((x, y) => x + y, 0);
  return res === a - b ? null : res;
}

/** The second factor's digits added instead of placed: 123 · 45 as 123 · 4 + 123 · 5. */
export function mulUnshifted(a: number, b: number): number | null {
  if (numLength(b) < 2) return null;
  return a * digitsOf(b).reduce((s, d) => s + d, 0);
}

/** Times one digit, the carries left out. */
function mulDigitNoCarry(a: number, m: number): number {
  const len = numLength(a);
  return Array.from({ length: len }, (_, p) => {
    const v = digitAt(a, p) * m;
    return (p === len - 1 ? v : v % 10) * pow10(p);
  }).reduce((x, y) => x + y, 0);
}

function mulNoCarry(a: number, b: number): number | null {
  const res = layoutMul(a, b).partials.reduce((s, part) => s + mulDigitNoCarry(a, part.digit) * pow10(part.shift), 0);
  return res === a * b ? null : res;
}

/** A carry into a 0 of the first factor is lost: 0 · 7 = 0, the carry never written. Times one digit only. */
function mulZeroLosesCarry(a: number, m: number): number | null {
  if (m > 9 || !/0/.test(String(a).slice(0, -1))) return null;
  const len = numLength(a);
  let c = 0;
  let res = 0;
  for (let p = 0; p < len; p++) {
    const d = digitAt(a, p);
    if (d === 0) {
      c = 0;
      continue;
    }
    const v = d * m + c;
    res += (p === len - 1 ? v : v % 10) * pow10(p);
    c = Math.floor(v / 10);
  }
  return res === a * m ? null : res;
}

/** A 0 in the second factor skipped: 624 · 305 as 624 · 35. */
function mulSkipsZero(a: number, b: number): number | null {
  if (numLength(b) < 3 || digitAt(b, 1) !== 0 || digitAt(b, 0) === 0) return null;
  return a * (digitAt(b, 2) * 10 + digitAt(b, 0));
}

/** The zeros of the quotient left out: 4230 : 6 = 75. */
function divNoZeros(a: number, d: number): number | null {
  const q = Math.floor(a / d);
  const s = String(q).replace(/0/g, '');
  return s === '' || s === String(q) ? null : Number(s);
}

/** Bugs of one written calculation (§5). Each matches only when the wrong answer computes exactly from the pattern. */
export function writtenBugs(op: WrittenOp, operands: readonly number[], method: SubtractionMethod): Bug[] {
  const out: Bug[] = [];
  const correct = correctResult(op, operands);
  const add = (id: string, match: number | null, hint: string, remainder?: number) => {
    if (match === null || !Number.isSafeInteger(match) || match < 0) return;
    if (remainder === undefined && (match === correct || out.some((b) => b.match === match && b.remainder === undefined))) return;
    out.push({ id, match, hint, ...(remainder !== undefined ? { remainder } : {}) });
  };
  if (op === 'add') {
    add('uebertrag-vergessen', addNoCarry(operands), 'Prüfe die Stelle mit dem Übertrag noch einmal.');
    add('uebertrag-zu-klein', addSmallCarry(operands), 'Bei drei Zahlen kann der Übertrag auch 2 sein.');
  } else if (op === 'sub') {
    const [a, b] = operands;
    add('kleiner-von-groesser', subSmallerFromLarger(a, b), method === 'abziehen' ? 'Oben steht die kleinere Ziffer. Entbündle zuerst.' : 'Oben steht die kleinere Ziffer. Erweitere zuerst.');
    add('regroup-vergessen', subNoBorrow(a, b), method === 'abziehen' ? 'Nach dem Entbündeln steht links daneben 1 weniger.' : 'Nach dem Erweitern kommt die gemerkte 1 unten dazu.');
  } else if (op === 'mul') {
    const [a, b] = operands;
    const tens = numLength(b) > 1 ? digitAt(b, 1) : 0;
    add('mal-versatz', mulUnshifted(a, b), tens ? `Die ${tens} steht für ${tens} Zehner. Rück das Teilergebnis eine Stelle ein.` : 'Jedes Teilprodukt endet unter seiner Ziffer. Rück die Teilergebnisse ein.');
    add('null-im-faktor', mulSkipsZero(a, b), `Die 0 in ${fmt(b)} hält eine Stelle frei. Rück das nächste Teilprodukt weiter ein.`);
    add('uebertrag-null', mulZeroLosesCarry(a, b), `0 ${TIMES} ${b} = 0. Der Übertrag kommt noch dazu.`);
    add('uebertrag-vergessen', mulNoCarry(a, b), 'Prüfe die Stelle mit dem Übertrag noch einmal.');
  } else {
    const [a, d] = operands;
    const r = a % d;
    const zeroless = divNoZeros(a, d);
    if (zeroless !== null) add('null-im-quotient', zeroless, `Passt ${fmt(zeroless)} zum Überschlag? Schreib auch die 0 im Ergebnis.`);
    if (correct >= 2) add('rest-zu-gross', correct - 1, `Der Rest muss kleiner als ${fmt(d)} sein.`, r + d);
    if (r > 0) add('rest-vergessen', correct, 'Es bleibt noch etwas übrig. Schreib auch den Rest.', 0);
  }
  return out;
}

// ─── Written: the exercise ───────────────────────────────────────────────────

export function writtenHints(op: WrittenOp, operands: readonly number[], method: SubtractionMethod, withRough: boolean): string[] {
  const first = withRough ? [op === 'div' ? 'Mach zuerst den Überschlag: Runde den Teiler, nimm dann eine passende Zahl.' : 'Mach zuerst den Überschlag: Runde beide Zahlen auf die höchste Stelle.'] : [];
  switch (op) {
    case 'add':
      return [...first, 'Fang bei den Einern an und rechne Spalte für Spalte nach links.', 'Ist eine Spalte 10 oder mehr? Dann schreib die Einer und merk dir den Übertrag.'];
    case 'sub':
      return [...first, method === 'abziehen' ? 'Fang bei den Einern an: oben minus unten. Ist oben zu wenig, entbündelst du.' : 'Ergänze bei den Einern von unten bis oben. Geht das nicht, erweiterst du.', 'Probe: Ergebnis plus untere Zahl ergibt die obere Zahl.'];
    case 'mul':
      return numLength(operands[1]) === 1
        ? [...first, 'Rechne von rechts nach links. Zähle den Übertrag erst nach dem Malnehmen dazu.', `Bei den Einern: ${digitAt(operands[0], 0)} ${TIMES} ${operands[1]}. Was schreibst du, was merkst du dir?`]
        : [...first, 'Rechne für jede Ziffer des zweiten Faktors ein Teilprodukt.', 'Jedes Teilprodukt endet genau unter seiner Ziffer. Addiere dann.'];
    case 'div': {
      const lay = layoutDiv(operands[0], operands[1]);
      const d = fmt(operands[1]);
      return [...first, 'Fang vorne an: teilen, malnehmen, abziehen, nächste Ziffer herunterholen.', lay.quotientZeros > 0 ? `Ist eine Zahl kleiner als ${d}, schreibst du eine 0 ins Ergebnis.` : lay.remainder > 0 ? `Am Ende bleibt der Rest. Der Rest ist kleiner als ${d}.` : `Nimm vorne so viele Ziffern, bis ${d} hineinpasst.`];
    }
  }
}

export function writtenPraise(op: WrittenOp, operands: readonly number[], method: SubtractionMethod): string {
  switch (op) {
    case 'add':
      if (operands.length > 2) return 'Du hast alle Zahlen Spalte für Spalte addiert.';
      return carryCount(operands) > 0 ? 'Du hast an jeden Übertrag gedacht.' : 'Du hast Spalte für Spalte sauber gerechnet.';
    case 'sub': {
      const lay = layoutSub(operands[0], operands[1], method);
      if (lay.acrossZero) return method === 'abziehen' ? 'Du hast auch über die Null richtig entbündelt.' : 'Du hast auch bei der Null richtig erweitert.';
      if (lay.regroupings > 0) return method === 'abziehen' ? 'Du hast an der richtigen Stelle entbündelt.' : 'Du hast richtig erweitert und an die gemerkte 1 gedacht.';
      return 'Du hast Spalte für Spalte sauber gerechnet.';
    }
    case 'mul': {
      if (numLength(operands[1]) > 1) return 'Du hast die Teilprodukte stellengerecht eingerückt.';
      // says only what this calculation asked: a carry into a place of the first factor, and into a 0 of it
      const into = layoutMul(operands[0], operands[1]).partials[0].carries.slice(0, numLength(operands[0]));
      if (into.some((c, p) => c > 0 && digitAt(operands[0], p) === 0)) return 'Du hast auch bei der 0 an den Übertrag gedacht.';
      return into.some((c) => c > 0) ? 'Du hast jeden Übertrag erst danach dazugezählt.' : 'Du hast jede Stelle sauber malgenommen.';
    }
    case 'div': {
      const lay = layoutDiv(operands[0], operands[1]);
      if (lay.quotientZeros > 0) return 'Du hast an die 0 im Ergebnis gedacht.';
      return lay.remainder > 0 ? 'Du hast den Rest richtig bestimmt.' : 'Du hast Schritt für Schritt geteilt und heruntergeholt.';
    }
  }
}

/** Worked lines of a calculation, at most `limit`, without the last line. Places with a carry or a regrouping first: they are what the child looks up. */
function workedLines(op: WrittenOp, operands: readonly number[], method: SubtractionMethod, limit: number): string[] {
  switch (op) {
    case 'add':
      return pickLines(addLines(operands), limit, (l) => l.includes('Übertrag'));
    case 'sub':
      return pickLines(subLines(operands[0], operands[1], method), limit, (l) => /geht nicht|gemerkt/.test(l));
    case 'mul':
      return numLength(operands[1]) === 1 ? pickLines(mulDigitLines(operands[0], operands[1]), limit) : partialLines(operands[0], operands[1]).slice(0, limit);
    case 'div':
      return divLines(operands[0], operands[1]).slice(0, limit);
  }
}

/** The worked solution: Überschlag, the telling places and the result with the solved layout. At most 5 lines (T15). */
export function writtenSteps(op: WrittenOp, operands: readonly number[], method: SubtractionMethod, withRough: boolean): Step[] {
  const head = withRough ? [roughOf(op, operands).text] : [];
  const lines = workedLines(op, operands, method, 4 - head.length);
  const rough = withRough ? ' Das passt zum Überschlag.' : '';
  const fine = op === 'mul' && numLength(operands[1]) > 1 ? `Addiere: ${partialSum(operands[0], operands[1])}.${rough}` : op === 'div' ? divResultLine(operands[0], operands[1]) : `${equationOf(op, operands)}.${rough}`;
  const probe = op === 'sub' ? ` Probe: ${fmt(operands[0] - operands[1])} + ${fmt(operands[1])} = ${fmt(operands[0])}.` : '';
  const visual = writtenVisual({ type: 'written', op, operands: [...operands], method: op === 'sub' ? method : undefined, showSolution: true });
  return [...head, ...lines, { text: `${fine}${probe}`, visual }];
}

export interface WrittenSpec {
  ab: 1 | 2 | 3;
  op: WrittenOp;
  operands: number[];
  method: SubtractionMethod;
  kmk: string[];
  /** The child writes an Überschlag first. */
  rough?: boolean;
  prompt?: string;
  context?: string;
  /** Key part in front of the calculation, for the kinds of item. */
  keyPart?: string;
  visual?: Exercise['visual'];
  extraBugs?: Bug[];
  hints?: string[];
  steps?: Step[];
  praise?: string;
  /** Spoken in front of the calculation; default: the prompt. */
  say?: string;
}

/** A complete exercise for one written calculation (answer kind 'written'). */
export function writtenItem(skill: { id: string; topicId: 'rechnen' }, stufe: Stufe, spec: WrittenSpec): Exercise {
  const { op, operands, method } = spec;
  const withRough = spec.rough === true;
  const result = correctResult(op, operands);
  const rest = op === 'div' ? operands[0] % operands[1] : 0;
  const prompt = spec.prompt ?? (withRough ? (op === 'div' ? 'Mach zuerst den Überschlag. Teile dann schriftlich.' : 'Mach zuerst den Überschlag. Rechne dann schriftlich.') : op === 'div' ? 'Teile schriftlich.' : 'Rechne schriftlich.');
  const extra = spec.extraBugs ?? [];
  return item(skill, stufe, {
    key: `${spec.keyPart ? `${spec.keyPart}:` : ''}${canon(op, operands)}${op === 'sub' ? `:${method[0]}` : ''}`,
    ab: spec.ab,
    ...(spec.context ? { context: spec.context } : {}),
    prompt,
    ...(spec.visual ? { visual: spec.visual } : {}),
    answer: {
      kind: 'written',
      op,
      operands: [...operands],
      result,
      ...(op === 'div' ? { remainder: rest } : {}),
      ...(op === 'sub' ? { method } : {}),
      ...(withRough ? { ueberschlag: roughOf(op, operands).value } : {}),
    },
    hints: spec.hints ?? writtenHints(op, operands, method, withRough),
    steps: spec.steps ?? writtenSteps(op, operands, method, withRough),
    bugs: [...extra.filter((b) => b.match !== result), ...writtenBugs(op, operands, method).filter((b) => !extra.some((e) => e.match === b.match && e.remainder === b.remainder))],
    praise: spec.praise ?? writtenPraise(op, operands, method),
    srText: `${[spec.context, spec.say ?? prompt].filter(Boolean).join(' ')} Rechnung: ${toSpeech(expressionOf(op, operands))}.`,
    kmk: spec.kmk,
  });
}

export interface ReverseSpec {
  ab: Ab;
  op: WrittenOp;
  operands: number[];
  method: SubtractionMethod;
  kmk: string[];
  /** Key part in front of the calculation. */
  keyPart: string;
  /** The equation with the gap. */
  expression: string;
  extraBugs: Bug[];
  hints: string[];
  praise: string;
}

const REVERSE_PROMPT = 'Such die Umkehraufgabe. Rechne dann schriftlich. Welche Zahl fehlt?';

/** An Umkehraufgabe: a number field, as the columns of a written answer would already show the calculation the child has to choose. The solution shows them. */
export function reverseItem(skill: { id: string; topicId: 'rechnen' }, stufe: Stufe, spec: ReverseSpec): Exercise {
  const { op, operands, method } = spec;
  const value = correctResult(op, operands);
  return item(skill, stufe, {
    key: `${spec.keyPart}:${canon(op, operands)}${op === 'sub' ? `:${method[0]}` : ''}`,
    ab: spec.ab,
    prompt: REVERSE_PROMPT,
    expression: spec.expression,
    answer: { kind: 'number', value, label: 'Fehlende Zahl' },
    hints: spec.hints,
    steps: writtenSteps(op, operands, method, false),
    bugs: wholeBugs([...spec.extraBugs, ...writtenBugs(op, operands, method).filter((b) => b.remainder === undefined)], value),
    praise: spec.praise,
    srText: `${REVERSE_PROMPT} ${termSpeech(spec.expression)}.`,
    kmk: spec.kmk,
  });
}

/** A number of a Ziffernrätsel for the ear: digit by digit, a gap by its label ('eins 0 Lücke A 5'). The digit 1 is a word, as '1 Lücke' is said 'eine Lücke'. The hidden digits are never said. */
export function maskedSpeech(n: number, masks: readonly WrittenMask[], row: WrittenMask['row'], index = 0): string {
  const inRow = masks.filter((m) => m.row === row && (row === 'result' || (m.index ?? 0) === index));
  if (inRow.length === 0) return String(n);
  return Array.from({ length: numLength(n) }, (_, i) => {
    const place = numLength(n) - 1 - i;
    const gap = inRow.find((m) => m.place === place);
    const digit = digitAt(n, place);
    return gap ? `Lücke ${gap.label}` : digit === 1 ? 'eins' : String(digit);
  }).join(' ');
}
