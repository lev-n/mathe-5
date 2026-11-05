import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { DEFAULT_CONTEXT } from '../../core/generate';
import { RANGE_DEFAULTS } from '../../data/profiles';
import { tagFor } from '../errorFamilies';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { winkelMessenSkill as skill } from './winkel-messen';

describeSkill(skill);

const items = (stufe: Stufe, ab: Ab, n = 120, ctx = DEFAULT_CONTEXT): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 337 + 19), stufe, { ...ctx, ab }));
const numberOf = (ex: Exercise) => { if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error('number expected'); return { value: ex.answer.value, tolerance: ex.answer.tolerance }; };
const degreesOf = (ex: Exercise) => { if (ex.visual?.type !== 'angle') throw new Error('angle expected'); return ex.visual.degrees; };

describe('Winkel messen: independent checks', () => {
  it('Stufe 1: a size that is printed on the scale keeps its number free, an odd ten has the full arm', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(1, ab)) {
        if (ex.visual?.type !== 'angle') throw new Error('angle expected');
        expect(ex.visual.arm2, ex.key).toBe(ex.visual.degrees % 20 === 0 ? 0.5 : 1);
      }
    }
  });

  it('with maxAngle 180 the rest to 180° has its own family: nothing there is praised as a large angle over the full circle', () => {
    const narrow = { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich };
    for (const ex of items(3, 2, 60, narrow)) {
      const read = ex.bugs!.find((b) => b.match === degreesOf(ex));
      if (read) expect(tagFor(skill.id, read.id)).toBe('geometrie-rest');
      for (const b of ex.bugs ?? []) expect(tagFor(skill.id, b.id), ex.key).not.toBe('geometrie-ueberstumpf');
    }
  });

  it('Stufe 1: the value is the drawn angle, a multiple of 10°, exact', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(1, ab)) {
        const { value, tolerance } = numberOf(ex);
        expect(value).toBe(degreesOf(ex));
        expect(value % 10).toBe(0);
        expect(value).toBeLessThanOrEqual(180);
        expect(tolerance).toBe(0);
      }
    }
  });

  it('Stufe 2: to the degree with tolerance 1, an estimate with tolerance 10', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(2, ab)) {
        const { value, tolerance } = numberOf(ex);
        expect(value).toBe(degreesOf(ex));
        expect(value % 5).not.toBe(0);
        expect(tolerance).toBe(1);
      }
    }
    for (const ex of items(2, 3)) {
      expect(numberOf(ex).tolerance).toBe(10);
      if (ex.visual?.type === 'angle') expect(ex.visual.tool).toBeUndefined();
    }
  });

  it('Stufe 3 with maxAngle 360 goes via 360°', () => {
    for (const ex of items(3, 1)) expect(numberOf(ex).value + Number(/(\d+)°/.exec(ex.prompt)![1])).toBe(360);
    for (const ex of items(3, 2)) expect(numberOf(ex).value).toBe(360 - degreesOf(ex));
    for (const ex of items(3, 3)) expect(numberOf(ex).value).toBe(360 - degreesOf(ex));
  });

  it('Stufe 3 with maxAngle 180 stays at or below 180° and has its Fehlerdetektiv', () => {
    const narrow = { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich };
    for (const ab of [1, 2, 3] as const) for (const ex of items(3, ab, 60, narrow)) expect(degreesOf(ex)).toBeLessThanOrEqual(180);
    for (const ex of items(3, 2, 60, narrow)) expect(numberOf(ex).value).toBe(180 - degreesOf(ex));
  });

  it('the Fehlerdetektiv has several answers, each following from the picture and the reading', () => {
    const narrow = { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich };
    const answers = new Set<string>();
    for (const ex of items(3, 3, 300, narrow)) {
      if (ex.visual?.type !== 'angle' || ex.answer.kind !== 'choice') throw new Error('angle and choice expected');
      const right = ex.answer.options[ex.answer.correct].label;
      const kindOf = right.includes('Mitte') ? 'mitte' : right.includes('Skala') ? 'skala' : right.includes('Strichen') ? 'strich' : 'keiner';
      answers.add(kindOf);
      const read = Number(/liest (\d+)°/.exec(ex.prompt)![1]);
      const d = ex.visual.degrees;
      expect(ex.visual.toolOffset !== undefined).toBe(kindOf === 'mitte');
      if (kindOf === 'skala') expect(read).toBe(180 - d);
      if (kindOf === 'strich') expect(Math.abs(read - d)).toBe(10);
      if (kindOf === 'keiner') expect(read).toBe(d);
    }
    expect(answers.size).toBe(4);
  });

  it('with maxAngle 180, AB I: the short arm ends close to the scale and the tolerance fits the drawn line', () => {
    const narrow = { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich };
    for (const ex of items(3, 1, 60, narrow)) {
      if (ex.visual?.type !== 'angle') throw new Error('angle expected');
      expect(ex.visual.arm2).toBeGreaterThanOrEqual(0.75);
      expect(numberOf(ex).tolerance).toBe(2);
    }
  });

  it('Stufe 2, AB III: the spoken text is near enough for the estimate', () => {
    const seen = new Map<string, number[]>();
    for (const ex of items(2, 3, 400)) seen.set(ex.srText, [...(seen.get(ex.srText) ?? []), numberOf(ex).value]);
    expect(seen.size).toBeGreaterThan(2);
    for (const values of seen.values()) expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(20);
  });

  it('a read of the other scale gets the targeted hint', () => {
    const ex = items(2, 1).find((e) => e.bugs?.some((b) => b.id === 'winkel-skala'))!;
    const bug = ex.bugs!.find((b) => b.id === 'winkel-skala')!;
    expect(bug.match).toBe(180 - numberOf(ex).value);
  });
});
