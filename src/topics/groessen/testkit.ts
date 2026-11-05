/** Test support of the topic (imported only by *.test.ts): worked steps are recomputed, and the last one states the result. */
import { expect } from 'vitest';
import { fmt, keepTermsTogether } from '../../core/format';
import type { Exercise, Step } from '../../core/types';
import { checkStepText } from '../step-check';

const stepText = (step: Step) => (typeof step === 'string' ? step : step.text);

export function assertSteps(ex: Exercise): void {
  for (const step of ex.steps) expect(checkStepText(stepText(step)), `${ex.key}: ${stepText(step)}`).toBeNull();
  const last = stepText(ex.steps[ex.steps.length - 1]);
  const a = ex.answer;
  if (a.kind === 'number') {
    if (a.value === null) expect(last, ex.key).toMatch(/nicht lösbar/i);
    else expect(last, ex.key).toContain(fmt(a.value));
  } else if (a.kind === 'multi') {
    for (const f of a.fields) if (f.value !== 0) expect(last, `${ex.key}: field ${f.id}`).toContain(fmt(f.value));
  }
}

/** Measured in Chrome at 375 px with the real CSS: a piece of an expression that cannot break fits one line up to this length. Digits are wider than letters, so a number from a million on leaves less room. */
const lineSigns = (piece: string) => (/\d\u202F\d{3}\u202F\d{3}/.test(piece) ? 17 : 19);

/** The task fits a phone: no expression breaks in a forced place, and no answer is cut off by its field. */
export function assertFitsPhone(ex: Exercise): void {
  for (const piece of keepTermsTogether(ex.expression ?? '').split(' ')) expect(piece.length, `${ex.key}: ${piece}`).toBeLessThanOrEqual(lineSigns(piece));
  const a = ex.answer;
  // a number field shows 7 signs ('900 000'), a field of a multi answer four digits and no comma
  if (a.kind === 'number' && a.value !== null) expect(fmt(a.value).length, ex.key).toBeLessThanOrEqual(7);
  if (a.kind === 'multi') for (const f of a.fields) expect(fmt(f.value), ex.key).toMatch(/^\d{1,4}$/);
}
