import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { gleichnamigSkill } from './gleichnamig';
import { everyItem, fractionsIn, items, sameTaskTwoKeys } from './test-helpers';

describeSkill(gleichnamigSkill);

const answerOf = (ex: Exercise) => ex.answer as { numerator: number; denominator: number };

/** The left side of a task without a gap on it, added up exactly over the common Nenner. */
function total(expression: string): [number, number] {
  const left = expression.split(' = ')[0];
  const terms = fractionsIn(left);
  const signs = [...left.matchAll(/ ([+−]) /g)].map((m) => m[1]);
  const d = Math.max(...terms.map((t) => t[1]));
  const n = terms.reduce((sum, t, i) => sum + (i > 0 && signs[i - 1] === '−' ? -1 : 1) * t[0] * (d / t[1]), 0);
  return [n, d];
}

describe('brueche.gleichnamig specifics', () => {
  it('worked steps calculate correctly', () => {
    for (const ex of everyItem(gleichnamigSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('the answer has the value of the calculation', () => {
    for (const ex of everyItem(gleichnamigSkill)) {
      if (!ex.expression || ex.expression.split(' = ')[0].includes('□')) continue;
      const [n, d] = total(ex.expression);
      const a = answerOf(ex);
      expect(a.numerator * d, ex.key).toBe(n * a.denominator);
    }
  });

  it('a gap task closes: the answer in the gap gives the other side', () => {
    for (const ab of [3] as const) {
      for (const ex of items(gleichnamigSkill, 1, ab)) {
        const [[a, d]] = fractionsIn(ex.expression!);
        const right = ex.expression!.split(' = ')[1];
        const target = right === '1' ? d : fractionsIn(right)[0][0];
        expect(a + answerOf(ex).numerator).toBe(target);
      }
    }
  });

  it('Stufe 1: same Nenner, plus, sum up to 1', () => {
    for (const ex of items(gleichnamigSkill, 1, 1)) {
      const a = answerOf(ex);
      expect(ex.expression).toContain('+');
      expect(a.numerator).toBeLessThanOrEqual(a.denominator);
    }
  });

  it('Stufe 2: minus at AB I, a sum above 1 at AB II', () => {
    for (const ex of items(gleichnamigSkill, 2, 1)) expect(ex.expression).toContain('−');
    for (const ex of items(gleichnamigSkill, 2, 2)) {
      const a = answerOf(ex);
      expect(a.numerator).toBeGreaterThan(a.denominator);
    }
  });

  it('Stufe 3: different Nenner, one a multiple of the other', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(gleichnamigSkill, 3, ab)) {
        const [a, b] = fractionsIn(ex.expression!);
        const [lo, hi] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
        expect(lo).not.toBe(hi);
        expect(hi % lo).toBe(0);
      }
    }
  });

  it('what is missing up to the whole is above 0', () => {
    for (const ex of items(gleichnamigSkill, 3, 3)) {
      const a = answerOf(ex);
      expect(a.numerator).toBeGreaterThan(0);
      expect(a.numerator).toBeLessThan(a.denominator);
    }
  });

  it('a task that looks the same has one key, so a round never shows it twice', () => {
    expect(sameTaskTwoKeys(gleichnamigSkill)).toEqual([]);
  });

  it('what is missing has its verb in the number of its Zähler', () => {
    for (const ex of everyItem(gleichnamigSkill, 300)) {
      for (const step of ex.steps) expect(typeof step === 'string' ? step : step.text, ex.key).not.toMatch(/Es fehlen (?:\{frac:1\/|1 Teil)/);
    }
  });
});
