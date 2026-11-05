/**
 * Helpers of the topic 'brueche': exact fraction arithmetic, bug filters, and the answers its skills share.
 * Pure functions only; randomness only through the Rng parameter. Generic helpers stay in src/topics/shared.ts.
 */
import { fmt, frac } from '../../core/format';
import type { Ab, Bug, ChoiceAnswer, ChoiceOption, Exercise, GenContext, OrderAnswer, Rng, Stufe, Visual } from '../../core/types';
import { fractionBugs, makeChoice, mentionsNumber, numberBugs, targetAb, type MaybeBug } from '../shared';

export const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** A fraction as [Zähler, Nenner]. */
export type Frac = readonly [n: number, d: number];

export const lowest = ([n, d]: Frac): Frac => {
  const g = gcd(n, d);
  return [n / g, d / g];
};

/** Integer cross-multiplication, never floats: below 0 if a < b. */
export const compareFrac = (a: Frac, b: Frac): number => a[0] * b[1] - b[0] * a[1];

export const fracOf = ([n, d]: Frac): string => frac(n, d);

export type Relation = '<' | '>' | '=';

export const relationOf = (cmp: number): Relation => (cmp < 0 ? '<' : cmp > 0 ? '>' : '=');

/** The name of a story for its key, only if the text shows it: generateUnique avoids repeats by key, and two stories that read the same are one task. */
export const shownName = (name: string, ...texts: readonly string[]) => (texts.some((t) => new RegExp(`\\b${name}\\b`).test(t)) ? name : '');

/** One form of a skill: builds its item for a Stufe and an AB level. */
export type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

/** generate() of a skill: each Stufe has its forms per AB level, so a Stufe chooses the content and AB only the demand. */
export function byStufeAndAb(forms: Readonly<Record<Stufe, Readonly<Record<Ab, readonly Form[]>>>>) {
  return (rng: Rng, stufe: Stufe, ctx: GenContext): Exercise => {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(forms[stufe][ab])(rng, stufe, ab);
  };
}

// ─── Bugs ────────────────────────────────────────────────────────────────────

/** A bug hint never states the answer, also when the bug's own arithmetic happens to use that number. */
const keepsAnswer = (b: Bug, value: number) => Math.abs(value) >= 10 && (mentionsNumber(b.hint, fmt(value)) || mentionsNumber(b.hint, fmt(value, 2)));

/**
 * Bugs of a number answer: a child can type the match with the field's `decimals` (0: a whole number), and the hint keeps the answer.
 * A match the field would reject as input can never fire, so it stays out.
 */
export function typedBugs(bugs: MaybeBug[], correct: number, decimals = 0): Bug[] {
  const factor = 10 ** decimals;
  const fits = (b: MaybeBug): b is Bug & { match: number } => !!b && typeof b.match === 'number' && Math.abs(b.match * factor - Math.round(b.match * factor)) < 1e-9 && Math.abs(b.match - correct) > 1e-9 && !keepsAnswer(b, correct);
  // rounded to the field's places only after that check: 0.1 + 0.2 never decides whether two bugs are the same
  return numberBugs(bugs.filter(fits).map((b) => ({ ...b, match: Math.round(b.match * factor) / factor })), correct);
}

/** Bugs of a fraction answer that accepts any equal value: a match with the value of the answer would be correct, so it stays out. */
export function valueBugs(bugs: MaybeBug[], correct: { numerator: number; denominator: number; whole?: number }): Bug[] {
  const n = (correct.whole ?? 0) * correct.denominator + correct.numerator;
  return fractionBugs(bugs, correct).filter((b) => {
    const m = b.match as Record<string, number>;
    return ((m.whole ?? 0) * m.denominator + m.numerator) * correct.denominator !== n * m.denominator;
  });
}

/** One Bug per wrong index order: leaves out the correct order and repeats. */
export function orderBugs(correct: readonly number[], candidates: readonly (readonly [id: string, order: readonly number[], hint: string])[]): Bug[] {
  const seen = new Set<string>([correct.join()]);
  const out: Bug[] = [];
  for (const [id, order, hint] of candidates) {
    if (seen.has(order.join())) continue;
    seen.add(order.join());
    out.push({ id, match: [...order], hint });
  }
  return out;
}

// ─── Answers ─────────────────────────────────────────────────────────────────

/** An order answer of any values, shown shuffled and never already sorted. wrongOrder gives the index order a mistaken comparison leads to. */
export function orderWith<T>(rng: Rng, values: readonly T[], compare: (a: T, b: T) => number, label: (v: T) => string, direction: OrderAnswer['direction']) {
  const sign = direction === 'aufsteigend' ? 1 : -1;
  const sorted = [...values].sort((a, b) => sign * compare(a, b));
  let shown = rng.shuffle(values);
  if (shown.every((v, i) => v === sorted[i])) shown = [...shown.slice(1), shown[0]];
  const answer: OrderAnswer = { kind: 'order', items: shown.map(label), correct: sorted.map((v) => shown.indexOf(v)), direction };
  const wrongOrder = (mistaken: (a: T, b: T) => number) => [...shown].sort((a, b) => sign * mistaken(a, b)).map((v) => shown.indexOf(v));
  return { answer, sorted, wrongOrder };
}

/** The three signs in a fixed order, with a text for each wrong one. */
export function symbolChoice(rng: Rng, correct: Relation, whyWrong: Partial<Record<Relation, string>>): ChoiceAnswer {
  const wrongs: ChoiceOption[] = (['<', '>', '='] as const).filter((s) => s !== correct).map((s) => ({ label: s, whyWrong: whyWrong[s] ?? 'Vergleiche die beiden Werte noch einmal.' }));
  return makeChoice(rng, { label: correct }, wrongs, { layout: 'symbols', order: ['<', '>', '='] });
}

/** Options that are pictures, named Bild A, Bild B, … in the shown order. */
export function pictureChoice(rng: Rng, correct: Visual, wrong: readonly { visual: Visual; whyWrong: string }[], max = 4): ChoiceAnswer {
  const seen = new Set<string>([JSON.stringify(correct)]);
  const items: { visual: Visual; whyWrong?: string }[] = [{ visual: correct }];
  for (const w of wrong) {
    if (items.length >= max || seen.has(JSON.stringify(w.visual))) continue;
    seen.add(JSON.stringify(w.visual));
    items.push(w);
  }
  const shown = rng.shuffle(items);
  const options = shown.map((item, i): ChoiceOption => ({ label: `Bild ${'ABCD'[i]}`, visual: item.visual, ...(item.whyWrong ? { whyWrong: item.whyWrong } : {}) }));
  return { kind: 'choice', options, correct: shown.findIndex((item) => item.visual === correct), layout: 'grid' };
}

