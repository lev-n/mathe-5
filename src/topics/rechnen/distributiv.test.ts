import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { distributivSkill as skill } from './distributiv';
import { ABS, items, rightLabel, stepProblems, stepTexts, strategyQuestion, termValue } from './test-helpers';

describeSkill(skill);

const termOf = (expression: string) => expression.split(' = ')[0];

describe('rechnen.distributiv', () => {
  it('Stufe 1: the fields split the product, and the picture shows the same product', () => {
    for (const ex of items(skill, 1, 1)) {
      if (ex.answer.kind !== 'multi' || !ex.expression) throw new Error(ex.key);
      const value = termValue(ex.expression);
      const [z, e, s] = ex.answer.fields.map((f) => f.value);
      expect(z + e, ex.key).toBe(value);
      expect(s, ex.key).toBe(value);
      if (ex.visual?.type !== 'dotArray' || !('groups' in ex.visual)) throw new Error(ex.key);
      expect(ex.visual.groups.reduce((x, y) => x + y, 0), ex.key).toBe(value);
    }
  });

  it('Stufe 1: the number form recomputes, verteilen-halb is the factor on one part only; the right split has the value', () => {
    for (const ex of items(skill, 1, 2)) {
      if (ex.answer.kind !== 'number' || !ex.expression) throw new Error(ex.key);
      const [n, , b] = termOf(ex.expression).split(' ').map(Number);
      expect(ex.answer.value, ex.key).toBe(n * b);
      expect(ex.bugs?.find((x) => x.id === 'verteilen-halb')?.match, ex.key).toBe(n * (b - (b % 10)) + (b % 10));
    }
    for (const ex of items(skill, 1, 3)) {
      if (!ex.expression) throw new Error(ex.key);
      if (ex.answer.kind === 'choice') {
        const value = termValue(ex.expression);
        expect(ex.answer.options.filter((o) => termValue(o.label) === value).map((o) => o.label), ex.key).toEqual([rightLabel(ex)]);
      } else if (ex.answer.kind === 'number') {
        const [left, right] = ex.expression.split(' = ');
        expect(termValue(right.replace('□', String(ex.answer.value))), ex.key).toBe(termValue(left));
      } else throw new Error(ex.key);
    }
  });

  it('Stufe 2: the reverse form; both forms recompute, and the factor counts once', () => {
    for (const ab of ABS) {
      for (const ex of items(skill, 2, ab)) {
        if (!ex.expression) throw new Error(ex.key);
        if (ex.answer.kind === 'multi') {
          expect(ex.answer.fields[1].value, ex.key).toBe(termValue(ex.expression));
        } else if (ex.answer.kind === 'number' && ex.key.includes('luecke')) {
          const [left, right] = ex.expression.split(' = ');
          expect(termValue(left.replace('□', String(ex.answer.value))), ex.key).toBe(termValue(right));
        } else if (ex.answer.kind === 'number') {
          expect(termValue(termOf(ex.expression)), ex.key).toBe(ex.answer.value);
        } else throw new Error(ex.key);
      }
    }
  });

  it('Stufe 3: the factor just under a round number, always worked with a Minus', () => {
    for (const ab of ABS) {
      for (const ex of items(skill, 3, ab)) {
        if (!ex.expression) throw new Error(ex.key);
        expect(stepTexts(ex).join(' '), ex.key).toContain('−');
        if (ex.answer.kind === 'multi') {
          expect(ex.answer.fields[2].value, ex.key).toBe(termValue(ex.expression));
          expect(ex.answer.fields[0].value - ex.answer.fields[1].value, ex.key).toBe(ex.answer.fields[2].value);
        } else if (ex.answer.kind === 'number') {
          expect(termValue(termOf(ex.expression)), ex.key).toBe(ex.answer.value);
        } else if (ex.answer.kind === 'choice') {
          const value = termValue(ex.expression);
          expect(ex.answer.options.filter((o) => termValue(o.label) === value).map((o) => o.label), ex.key).toEqual([rightLabel(ex)]);
        }
      }
    }
  });

  it('T7: no strategy question stands in front of a field that wants the result', () => {
    for (const stufe of [1, 2, 3] as const) for (const ab of ABS) for (const ex of items(skill, stufe, ab, 60)) expect(strategyQuestion(ex), `${ex.key}: ${ex.prompt}`).toBe(false);
  });

  it('every arithmetic line of the worked steps holds', () => {
    for (const ab of ABS) for (const stufe of [1, 2, 3] as const) for (const ex of items(skill, stufe, ab, 80)) expect(stepProblems(ex)).toEqual([]);
  });
});
