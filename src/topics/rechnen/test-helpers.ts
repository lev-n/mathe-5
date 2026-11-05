/** Test support of the topic (imported only by *.test.ts). */
import { WIDEST_RANGES } from '../../core/generate';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, GenContext, SkillDef, Stufe, SubtractionMethod } from '../../core/types';
import { RANGE_DEFAULTS } from '../../data/profiles';
import { checkStepText, evalSide } from '../step-check';

export const ABS: readonly Ab[] = [1, 2, 3];
export const STUFEN: readonly Stufe[] = [1, 2, 3];
/** A profile without the three-digit factor. */
export const NO_THREE_DIGITS = RANGE_DEFAULTS.anschaulich;
export const NO_MILLIARDE = { ...WIDEST_RANGES, beyondMilliarde: false };

/** n items of one Stufe and AB; seeds differ from the shared suite's seeds. */
export function items(skill: SkillDef, stufe: Stufe, ab: Ab, n = 150, ctx: Partial<GenContext> = {}): Exercise[] {
  const full: GenContext = { subtractionMethod: 'abziehen' as SubtractionMethod, ranges: WIDEST_RANGES, ...ctx, ab };
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 9973 + 17 + stufe + ab * 3), stufe, full));
}

export const stepTexts = (ex: Exercise) => ex.steps.map((s) => (typeof s === 'string' ? s : s.text));

/** Every arithmetic line of the worked steps holds. */
export function stepProblems(ex: Exercise): string[] {
  return stepTexts(ex).flatMap((t) => {
    const problem = checkStepText(t.replace(/\u202F/g, ''));
    return problem ? [`${ex.key}: ${problem}`] : [];
  });
}

/** The value of a term as a child's eye reads it, by the evaluator of src/topics/step-check.ts. */
export function termValue(text: string): number {
  const v = evalSide(text.replace(/\u202F/g, ''));
  if (!v) throw new Error(`no term: ${text}`);
  return v.value;
}

/** The label of the correct choice option. */
export function rightLabel(ex: Exercise): string {
  if (ex.answer.kind !== 'choice') throw new Error(`choice expected: ${ex.key}`);
  return ex.answer.options[ex.answer.correct].label;
}

/** T7: a question is what the field wants. A calculation whose field takes its result has no question at all: 'Welche glatte Zahl liegt in der Nähe?' asks for another number. */
export function strategyQuestion(ex: Exercise): boolean {
  const wantsResult = ex.answer.kind === 'multi' || (ex.answer.kind === 'number' && ex.answer.label === 'Ergebnis' && !!ex.expression);
  return wantsResult && ex.prompt.includes('?');
}

/** "Zuerst 18 : 2, Ergebnis 26": the step and the value of an option that carries both. */
export function firstStepOption(label: string): { step: string; value: number } {
  const m = /^Zuerst (.+), Ergebnis (.+)$/.exec(label);
  if (!m) throw new Error(`no first step: ${label}`);
  return { step: m[1], value: Number(m[2].replace(/\u202F/g, '')) };
}

/** All number words of an item that a child reads or hears. */
export function childStrings(ex: Exercise): string {
  return JSON.stringify({ ...ex, bugs: ex.bugs?.map((b) => b.hint) });
}
