import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { medianSkill as skill } from './median';

describeSkill(skill, { minDistinct: 30 });

const items = (stufe: Stufe, ab: Ab, n = 150): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 859 + 29), stufe, { ...CTX, ab }));

/** The list of the table; a gap stays out. */
const listOf = (ex: Exercise): number[] => {
  if (ex.visual?.type !== 'table') throw new Error('expected a table');
  return ex.visual.rows.flatMap((r) => r.slice(1)).filter((c) => /^\d+$/.test(c)).map(Number);
};
const valueOf = (ex: Exercise) => {
  if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error('expected a number');
  return ex.answer.value;
};
/** An independent Median: remove the outer values until one or two remain. */
function middle(values: readonly number[]): number {
  let s = [...values].sort((a, b) => a - b);
  while (s.length > 2) s = s.slice(1, -1);
  return s.length === 1 ? s[0] : (s[0] + s[1]) / 2;
}
const total = (v: readonly number[]) => v.reduce((a, b) => a + b, 0);

describe('daten.median: answers recomputed', () => {
  it('worked steps add up and end in the result, every field takes a comma', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab, 60)) {
          expect(checkWorkedSolution(ex)).toEqual([]);
          expect(ex.answer).toMatchObject({ decimals: 1 });
        }
      }
    }
  });

  it('Stufe 1: at most 7 values', () => {
    for (const ab of [1, 2, 3] as Ab[]) for (const ex of items(1, ab)) expect(listOf(ex).length).toBeLessThanOrEqual(7);
  });

  it('Stufe 1, AB II: maximum minus minimum', () => {
    for (const ex of items(1, 2)) {
      const v = listOf(ex);
      expect(valueOf(ex)).toBe(Math.max(...v) - Math.min(...v));
    }
  });

  it('Stufe 1, AB III: the answer lies outside the list and gives the Spannweite of the text', () => {
    for (const ex of items(1, 3)) {
      const v = [...listOf(ex), valueOf(ex)];
      expect(Math.max(...v) - Math.min(...v)).toBe(Number(/Spannweite ist (\d+)/.exec(ex.context!)![1]));
      expect(valueOf(ex) === Math.max(...v) || valueOf(ex) === Math.min(...v)).toBe(true);
    }
  });

  it('Stufe 2: an odd count, the answer is the middle value, and sorting matters', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(2, ab)) {
        const v = listOf(ex);
        expect(v.length % 2).toBe(1);
        expect(valueOf(ex)).toBe(middle(v));
        expect(v[(v.length - 1) / 2]).not.toBe(valueOf(ex));
      }
    }
  });

  it('Stufe 3, AB I: an even count, the answer lies between the two middle values', () => {
    for (const ex of items(3, 1)) {
      const v = listOf(ex);
      expect(v.length % 2).toBe(0);
      expect(valueOf(ex)).toBe(middle(v));
    }
  });

  it('Stufe 3, AB II: Mittelwert minus Median', () => {
    for (const ex of items(3, 2)) {
      const v = listOf(ex);
      expect(valueOf(ex)).toBeCloseTo(total(v) / v.length - middle(v), 9);
      expect(valueOf(ex)).toBeGreaterThan(0);
    }
  });

  it('Stufe 3, AB III without the outlier: the task does not name it, and an even count remains', () => {
    const items3 = items(3, 3, 400).filter((e) => e.key.includes(':ohne:'));
    expect(items3.length).toBeGreaterThan(50);
    for (const ex of items3) {
      const list = listOf(ex);
      const outlier = Math.max(...list);
      const rest = list.filter((v) => v !== outlier);
      expect(`${ex.context} ${ex.prompt}`).not.toMatch(/\d/);
      expect(rest.length, ex.key).toBe(6);
      expect(outlier).toBeGreaterThan(2 * Math.max(...rest));
      expect(valueOf(ex)).toBe(middle(rest));
    }
  });

  it('Stufe 3: every item fits the label: an even count, or Median and Mittelwert with an outlier', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(3, ab)) {
        const count = listOf(ex).length;
        const evenWork = count % 2 === 0 || ex.key.includes(':ohne:');
        const outlierWork = /Ausreißer|Mittelwert/.test(`${ex.context} ${ex.prompt}`) || /\d+ sinkt/.test(ex.context ?? '');
        expect(evenWork || outlierWork, ex.key).toBe(true);
      }
    }
  });
});
