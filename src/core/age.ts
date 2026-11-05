/**
 * Age rules for 10–11-year-olds that generators, planners and tests share (docs/research.md §4, §7.1, §7.3).
 * All numbers are heuristics, chosen to be checkable by a unit test. Pure and free of React and of the state code.
 */
import type { Ab, Rng, Stufe } from './types';

/** Items of a practice round (§7.3). The 3-item Einstiegs-Check counts inside the round. */
export const ROUND_SIZE = 10;
/** Items of a round of a written-calculation skill (§7.3): a written item with large numbers takes much longer. */
export const WRITTEN_ROUND_SIZE = 6;

/** A written-calculation skill: rechnen.schriftlich-plusminus, -mal, -geteilt. */
export function isWrittenSkill(skillId: string): boolean {
  return skillId.startsWith('rechnen.schriftlich-');
}

/** Items of a round of one skill. */
export function roundSize(skillId: string): number {
  return isWrittenSkill(skillId) ? WRITTEN_ROUND_SIZE : ROUND_SIZE;
}

/**
 * Items of a mixed round, one per entry, in the order given: every written item costs as much as ROUND_SIZE / WRITTEN_ROUND_SIZE other items,
 * so all written gives 6 items, none written 10 and a mix something between.
 */
export function mixedRoundSkills<T extends string>(skillIds: readonly T[]): T[] {
  if (skillIds.length === 0) return [];
  const budget = ROUND_SIZE * WRITTEN_ROUND_SIZE;
  const costOf = (id: string) => ROUND_SIZE * WRITTEN_ROUND_SIZE / roundSize(id);
  const out: T[] = [];
  let used = 0;
  for (let i = 0; used + costOf(skillIds[i % skillIds.length]) <= budget; i++) {
    const id = skillIds[i % skillIds.length];
    out.push(id);
    used += costOf(id);
  }
  return out;
}

/** AB I/II/III items per round of a Stufe (§7.1): every Stufe keeps at least one harder item. */
export const AB_MIX: Readonly<Record<Stufe, readonly [ab1: number, ab2: number, ab3: number]>> = {
  1: [6, 3, 1],
  2: [3, 5, 2],
  3: [2, 4, 4],
};
/** The same for the 6-item round of a written skill. */
export const AB_MIX_WRITTEN: Readonly<Record<Stufe, readonly [ab1: number, ab2: number, ab3: number]>> = {
  1: [4, 1, 1],
  2: [2, 3, 1],
  3: [1, 3, 2],
};

/** The AB levels of the items of one round of `size` items (10 or 6), easier items first. */
export function abSequence(stufe: Stufe, size: number = ROUND_SIZE): Ab[] {
  const mix = size === WRITTEN_ROUND_SIZE ? AB_MIX_WRITTEN : AB_MIX;
  return mix[stufe].flatMap((n, i) => Array.from({ length: n }, () => (i + 1) as Ab));
}

/** An AB level drawn with the weights of the mix (items outside a planned round, such as worksheets). */
export function drawAb(rng: Rng, stufe: Stufe, size: number = ROUND_SIZE): Ab {
  return rng.pick(abSequence(stufe, size));
}

/** Skills close to Grundschule content start at Stufe 2 (§7.1). Never based on the profile. */
const STUFE_2_FIRST: ReadonlySet<string> = new Set(['zahlen.lesen', 'zahlen.stellenwerte', 'zahlen.runden', 'rechnen.schriftlich-plusminus', 'groessen.einheiten']);

/** The Stufe suggested for a skill the child has not worked on yet. */
export function defaultStufe(skillId: string): Stufe {
  return STUFE_2_FIRST.has(skillId) ? 2 : 1;
}

/** Answer limits (§7.1). */
export const MAX_CHOICE_OPTIONS = 6;
export const MAX_ORDER_ITEMS = 5;
export const MAX_MULTI_FIELDS = 5;
/** Decimal places of an answer: up to Tausendstel (brueche.dezimal-lesen, groessen.komma). */
export const MAX_DECIMALS = 3;

/** Written calculation (§6): operands up to 12 digits, three-digit factor and divisor (Stufe 3). */
export const MAX_WRITTEN_DIGITS = 12;
export const MAX_WRITTEN_FACTOR_DIGITS = 3;

/**
 * Largest number a task works with (§2.3: beyond 1 Milliarde at Stufe 3): a written sum of 12-digit operands stays below it. A Stufe's own
 * limit (≤ 1 Million at Stufe 1 of zahlen.lesen) belongs to the skill's test.
 */
export const MAX_NUMBER = 2 * 10 ** 12;

/** Text limits (§4, T1–T4, T7, T15). */
export const TEXT_LIMITS = {
  /** T1: words of a task without a story. */
  taskWords: 18,
  /** T2: words of a story task (an exercise with `context`). */
  storyWords: { 1: 30, 2: 40, 3: 50 } as Readonly<Record<Stufe, number>>,
  /** T3: sentences, including the question. */
  sentences: { 1: 4, 2: 4, 3: 5 } as Readonly<Record<Stufe, number>>,
  /** T4: words per sentence. */
  sentenceWords: { 1: 14, 2: 14, 3: 16 } as Readonly<Record<Stufe, number>>,
  /** T5: subordinate clauses per task (only wenn, weil, dass). */
  subordinateClauses: { 1: 0, 2: 1, 3: 1 } as Readonly<Record<Stufe, number>>,
  /** T7: numbers per sentence of a task; a mixed quantity ('3 € 40 ct') counts as one. */
  sentenceNumbers: 3,
  /** T7: numbers of a task before the data belongs in a table or chart. */
  taskNumbers: 4,
  /** T15: a hint. */
  hintWords: 14,
  hintSentences: 2,
  /** T15: praise. */
  praiseWords: 10,
  /** T15: "one line each" for a worked step, counted in words (the proxy a test can check). */
  stepWords: 16,
  /** T15: worked steps. */
  steps: 5,
} as const;
