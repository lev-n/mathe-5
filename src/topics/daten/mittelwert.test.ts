import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { PEOPLE } from '../shared';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { mittelwertSkill as skill } from './mittelwert';

describeSkill(skill, { minDistinct: 30 });

const items = (stufe: Stufe, ab: Ab, n = 150): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 739 + 23), stufe, { ...CTX, ab }));

const chartValues = (ex: Exercise) => {
  if (ex.visual?.type !== 'barChart') throw new Error('expected a chart');
  return ex.visual.values;
};
const total = (v: readonly number[]) => v.reduce((a, b) => a + b, 0);
const valueOf = (ex: Exercise) => {
  if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error('expected a number');
  return ex.answer.value;
};

describe('daten.mittelwert: answers recomputed', () => {
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

  it('every value of a chart lies on a line of the axis, and no task chart gives the result away', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab)) {
          if (ex.visual?.type !== 'barChart') continue;
          for (const v of ex.visual.values) expect(v % ex.visual.axisStep).toBe(0);
          expect(ex.visual.levelled).toBeUndefined();
          if (ex.visual.meanLine !== undefined) expect(ex.visual.meanLine).not.toBe(valueOf(ex));
        }
      }
    }
  });

  it('Stufe 1: two or three values, a whole result that is their mean', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of items(1, ab)) {
        const v = chartValues(ex);
        expect(v.length).toBe(ab === 1 ? 2 : 3);
        expect(valueOf(ex)).toBe(total(v) / v.length);
        expect(Number.isInteger(valueOf(ex))).toBe(true);
      }
    }
  });

  it('Stufe 1, AB III: after the gift both have the same', () => {
    for (const ex of items(1, 3)) {
      const [a, b] = chartValues(ex);
      expect(a - valueOf(ex)).toBe(b + valueOf(ex));
    }
  });

  it('Stufe 2: five values, the result is their sum divided by 5', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(2, ab)) {
        const v = ex.visual?.type === 'barChart' ? ex.visual.values : ex.visual?.type === 'table' ? ex.visual.rows.map((r) => Number(r[1])) : [];
        expect(v.length).toBe(5);
        expect(valueOf(ex)).toBeCloseTo(total(v) / 5, 9);
      }
    }
  });

  it('Stufe 2, AB II and III: a result with a comma', () => {
    for (const ab of [2, 3] as Ab[]) for (const ex of items(2, ab)) expect(Number.isInteger(valueOf(ex))).toBe(false);
  });

  it('Stufe 3, AB I: with the answer the three values have the mean of the text', () => {
    for (const ex of items(3, 1)) {
      const m = Number(/ist (\d+)\.$/.exec(ex.context!)![1]);
      expect((total(chartValues(ex)) + valueOf(ex)) / 3).toBe(m);
    }
  });

  it('Stufe 3, AB II: only the mean of five and the largest value are known: back to the sum, without it, and divide', () => {
    let withComma = 0;
    for (const ex of items(3, 2, 400)) {
      expect(ex.visual, ex.key).toBeUndefined();
      const [m5, outlier] = [...ex.context!.matchAll(/\d+(?:,\d+)?/g)].map((m) => Number(m[0].replace(',', '.')));
      const rest = Math.round(5 * m5) - outlier;
      expect(valueOf(ex)).toBeCloseTo(rest / 4, 9);
      expect(outlier, ex.key).toBeGreaterThanOrEqual(rest);
      expect(ex.steps.length).toBeGreaterThanOrEqual(4);
      if (!Number.isInteger(valueOf(ex))) withComma++;
    }
    expect(withComma / 400).toBeGreaterThan(0.6);
  });

  it('a first name is not part of the key: the same task with another name is a repeat', () => {
    const names = new RegExp(`\\b(${PEOPLE.map((p) => p.name).join('|')})\\b`, 'g');
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab, 100)) expect(ex.key, ex.key).not.toMatch(names);
      }
    }
  });

  it('Stufe 3, next value: with the answer the mean reaches the target', () => {
    for (const ex of items(3, 3).filter((e) => e.key.includes(':naechster:'))) {
      const [n, m1, m2] = [...ex.context!.matchAll(/\d+/g)].map((m) => Number(m[0]));
      expect((n * m1 + valueOf(ex)) / (n + 1)).toBe(m2);
    }
  });

  it('Stufe 2, AB III: three-digit daily values only where a day can really reach them', () => {
    for (const ex of items(2, 3)) {
      if (ex.visual?.type !== 'table') throw new Error('expected a table');
      expect(ex.visual.caption).not.toMatch(/Seiten|Bahnen|Dosen/);
    }
  });
});
