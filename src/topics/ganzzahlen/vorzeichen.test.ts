import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { BOX } from '../../core/format';
import { answerValue, checkAll, correctLabel, evalTerm, fieldValues, items } from './checks';
import { vorzeichenSkill } from './vorzeichen';

describeSkill(vorzeichenSkill);

const fill = (expression: string, value: number) => expression.replace(BOX, value < 0 ? `(−${-value})` : String(value));

describe('ganzzahlen.vorzeichen', () => {
  it('worked steps add up and state the result', () => checkAll(vorzeichenSkill));

  it('Stufe 1: the marked minus is what its place says', () => {
    for (const { ex } of items(vorzeichenSkill, 1, 1)) {
      if (ex.visual?.type !== 'term' || !ex.visual.highlight) throw new Error('term');
      const text = ex.visual.lines[0];
      const at = ex.visual.highlight[0];
      expect(text[at]).toBe('−');
      const sign = at === 0 || text[at - 1] === '(';
      expect(correctLabel(ex)).toBe(sign ? 'Vorzeichen' : 'Rechenzeichen');
    }
    for (const { ex } of items(vorzeichenSkill, 1, 2)) {
      const signs = [...(ex.expression as string).matchAll(/(^|\()−/g)].length;
      expect(answerValue(ex)).toBe(signs);
    }
  });

  it('the spoken term and the sentence after it stay apart', () => {
    for (const { ex } of items(vorzeichenSkill, 1, 1)) expect(ex.srText, ex.key).toMatch(/\d\. Das Minus/);
  });

  it('Stufe 2: both sides have one value', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex } of items(vorzeichenSkill, 2, ab)) {
        const [left, right] = fill(ex.expression as string, answerValue(ex) as number).split(' = ');
        expect(evalTerm(left), ex.key).toBe(evalTerm(right));
      }
    }
    for (const { ex, num } of items(vorzeichenSkill, 2, 3)) {
      const f = fieldValues(ex);
      expect(f).toEqual({ g: -num[1], r: num[0] - num[1] });
    }
  });

  it('Stufe 3: the term without brackets has the same value, and the distractors do not', () => {
    for (const { ex } of items(vorzeichenSkill, 3, 1)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const want = evalTerm(ex.expression as string);
      expect(correctLabel(ex)).not.toContain('(');
      ex.answer.options.forEach((o, i) => expect(evalTerm(o.label) === want, o.label).toBe(i === (ex.answer as { correct: number }).correct));
    }
    for (const { ex } of items(vorzeichenSkill, 3, 2)) {
      const [left] = (ex.expression as string).split(' = ');
      expect(answerValue(ex)).toBe(evalTerm(left));
    }
    for (const { ex } of items(vorzeichenSkill, 3, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const want = evalTerm(ex.expression as string);
      ex.answer.options.forEach((o, i) => expect(evalTerm(o.label) === want, o.label).toBe(i === (ex.answer as { correct: number }).correct));
    }
  });
});
