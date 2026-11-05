import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { BOX } from '../../core/format';
import { answerValue, checkAll, correctLabel, evalTerm, items, naturalOnly } from './checks';
import { plusminusSkill } from './plusminus';

describeSkill(plusminusSkill);

/** The value that fills the box of 'a + □ = r': tried on the term itself. */
function fills(expression: string, value: number): boolean {
  const [left, right] = expression.split(' = ');
  const shown = value < 0 ? `(−${-value})` : String(value);
  return evalTerm(left.replace(BOX, shown)) === evalTerm(right);
}

describe('ganzzahlen.plusminus', () => {
  it('every item of every Stufe and AB holds a negative number, or has one as the result', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const { ex, form } of items(plusminusSkill, stufe, ab, 1500)) {
          if (form !== 'konto') expect(naturalOnly(ex), ex.key).toBe(false);
        }
      }
    }
  });

  it('the Konto of Stufe 3: Guthaben and Schulden at the start, and the sign of the end is a decision', () => {
    const konto = items(plusminusSkill, 3, 3, 1000);
    for (const start of ['Guthaben', 'Schulden']) {
      const some = konto.filter(({ ex }) => ex.context?.includes(start));
      const below = some.filter(({ ex }) => (answerValue(ex) as number) < 0).length;
      expect(below / some.length, start).toBeGreaterThan(0.3);
      expect(below / some.length, start).toBeLessThan(0.7);
      for (const { ex } of some) expect(answerValue(ex), ex.key).not.toBe(0);
    }
    for (const { ex } of konto) {
      expect(Math.abs(answerValue(ex) as number), ex.key).toBeLessThanOrEqual(1000);
      expect(ex.hints[0], ex.key).toContain('Guthaben');
      expect(ex.hints[0], ex.key).toContain('Schulden');
    }
  });

  it('worked steps add up and state the result', () => checkAll(plusminusSkill));

  it('Stufe 1: a ± natural b, up to 20', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex } of items(plusminusSkill, 1, ab)) {
        const [left] = (ex.expression as string).split(' = ');
        expect(left).not.toContain('(');
        expect(answerValue(ex)).toBe(evalTerm(left));
        for (const n of left.match(/\d+/g) ?? []) expect(Number(n)).toBeLessThanOrEqual(20);
        expect(Math.abs(answerValue(ex) as number)).toBeLessThanOrEqual(20);
      }
    }
    for (const { ex } of items(plusminusSkill, 1, 3)) expect(fills(ex.expression as string, answerValue(ex) as number), ex.key).toBe(true);
  });

  it('Stufe 2: the second number is negative', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex } of items(plusminusSkill, 2, ab)) {
        const [left] = (ex.expression as string).split(' = ');
        expect(left).toMatch(/[+−] \(−\d+\)$/);
        expect(answerValue(ex)).toBe(evalTerm(left));
      }
    }
    for (const { ex, form, num } of items(plusminusSkill, 2, 3)) {
      if (form === 'gleich') {
        expect(correctLabel(ex)).toBe(`${num[0]} + ${num[1]}`);
      } else {
        expect(answerValue(ex)).toBeLessThan(0);
        expect(fills(ex.expression as string, answerValue(ex) as number), ex.key).toBe(true);
      }
    }
  });

  it('Stufe 2 stays within 20, in every number and the result', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const { ex, form, num } of items(plusminusSkill, 2, ab, 3000)) {
        if (form === 'gleich') {
          expect(num[0] + num[1], ex.key).toBeLessThanOrEqual(20);
          continue;
        }
        for (const n of (ex.expression as string).match(/\d+/g) ?? []) expect(Number(n), ex.key).toBeLessThanOrEqual(20);
        expect(Math.abs(answerValue(ex) as number), ex.key).toBeLessThanOrEqual(20);
      }
    }
  });

  it('a minus before a negative number has its own bug hint', () => {
    for (const { ex, num } of items(plusminusSkill, 2, 2)) {
      const bug = ex.bugs?.find((b) => b.id === 'minus-minus');
      if (num[0] + num[2] !== answerValue(ex)) expect(bug?.match).toBe(num[0] + num[2]);
    }
  });

  it('Stufe 3 goes up to 1000, with missing numbers and an abstract Konto', () => {
    for (const { ex } of items(plusminusSkill, 3, 1)) {
      const [left] = (ex.expression as string).split(' = ');
      expect(answerValue(ex)).toBe(evalTerm(left));
      expect(Math.abs(answerValue(ex) as number)).toBeLessThanOrEqual(1000);
    }
    for (const { ex } of items(plusminusSkill, 3, 2)) expect(fills(ex.expression as string, answerValue(ex) as number), ex.key).toBe(true);
    for (const { ex, num, p } of items(plusminusSkill, 3, 3)) {
      const [size, first, second] = num.slice(1);
      expect(answerValue(ex)).toBe(p[0] === 'g' ? size - first + second : -size + first - second);
      expect(ex.context).toContain(p[0] === 'g' ? 'Guthaben' : 'Schulden');
      expect(ex.context).toContain('Konto');
      // T12: never a person's own money trouble
      expect(ex.context).not.toMatch(/\b(Mia|Ali|Lena|Emre|Noah|Sofia|Familie|Eltern|Taschengeld)\b/);
    }
  });
});
