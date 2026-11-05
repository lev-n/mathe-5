import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { BOX } from '../../core/format';
import { answerValue, checkAll, correctLabel, evalTerm, fieldValues, items, naturalOnly } from './checks';
import { termeSkill } from './terme';

describeSkill(termeSkill);

const fill = (expression: string, value: number) => expression.replace(BOX, value < 0 ? `(−${-value})` : String(value));

function balanced(expression: string, value: number): boolean {
  const [left, right] = fill(expression, value).split(' = ');
  return evalTerm(left) === evalTerm(right);
}

describe('ganzzahlen.terme', () => {
  it('every item of every Stufe and AB holds a negative number, or has one as the result', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const { ex } of items(termeSkill, stufe, ab, 1500)) expect(naturalOnly(ex), ex.key).toBe(false);
      }
    }
  });

  it('setting brackets: a negative first number, and no bracket of 0', () => {
    for (const { ex, num } of items(termeSkill, 3, 1, 1500)) {
      expect(ex.expression, ex.key).toMatch(/^−\d/);
      expect(num[0] + num[1], ex.key).not.toBe(0);
    }
  });

  it('worked steps add up and state the result', () => checkAll(termeSkill));

  it('Stufe 1: two operations and no brackets', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex } of items(termeSkill, 1, ab)) {
        const [left] = (ex.expression as string).split(' = ');
        expect(left).not.toContain('(');
        expect(answerValue(ex)).toBe(evalTerm(left));
      }
    }
    for (const { ex, form, num } of items(termeSkill, 1, 3)) {
      if (form === 'schritte') {
        const [a, b, c] = num;
        expect(fieldValues(ex)).toEqual({ p: b * c, r: a + b * c });
      } else {
        expect(balanced(ex.expression as string, answerValue(ex) as number), ex.key).toBe(true);
      }
    }
  });

  it('Stufe 2: brackets, with the results up to 100', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex } of items(termeSkill, 2, ab)) {
        const [left] = (ex.expression as string).split(' = ');
        expect(left).toContain('(');
        expect(answerValue(ex)).toBe(evalTerm(left));
        expect(Math.abs(answerValue(ex) as number)).toBeLessThanOrEqual(100);
      }
    }
    for (const { ex } of items(termeSkill, 2, 3)) {
      expect(fieldValues(ex).r).toBe(evalTerm(ex.expression as string));
    }
  });

  it('grouping brackets are said, also in the options of "Klammern setzen"', () => {
    for (const { ex } of items(termeSkill, 2, 1)) {
      expect(ex.srText, ex.key).toContain('Klammer auf');
      expect(ex.srText, ex.key).toContain('Klammer zu');
    }
    for (const { ex } of items(termeSkill, 3, 1)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const said = ex.answer.options.filter((o) => o.label.includes('(')).length;
      expect(ex.srText.split('Klammer auf').length - 1, ex.key).toBeGreaterThanOrEqual(said);
    }
  });

  it('Stufe 3: one set of brackets reaches the target; working backwards fits the term', () => {
    for (const { ex, p } of items(termeSkill, 3, 1)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const target = Number(p[4]);
      expect(evalTerm(correctLabel(ex))).toBe(target);
      const hits = ex.answer.options.filter((o) => evalTerm(o.label) === target);
      expect(hits).toHaveLength(1);
      expect(correctLabel(ex)).toContain('(');
    }
    for (const { ex } of items(termeSkill, 3, 2)) expect(balanced(ex.expression as string, answerValue(ex) as number), ex.key).toBe(true);
    for (const { ex, num } of items(termeSkill, 3, 3)) {
      const [x, m, s] = num;
      expect(answerValue(ex)).toBe(x);
      expect(ex.context).toContain(String(s));
      expect(x * m + s).toBe(evalTerm(`${x < 0 ? `(−${-x})` : x} · (−${-m}) + ${s}`));
    }
  });
});
