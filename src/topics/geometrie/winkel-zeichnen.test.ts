import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { DEFAULT_CONTEXT } from '../../core/generate';
import { RANGE_DEFAULTS } from '../../data/profiles';
import type { Ab, AngleAnswer, Exercise, Stufe } from '../../core/types';
import { winkelZeichnenSkill as skill } from './winkel-zeichnen';

// Stufe 1 has only the multiples of 10° up to 180°, so fewer tasks exist there.
describeSkill(skill, { minDistinct: { 1: 20, 2: 30, 3: 30 } });

const items = (stufe: Stufe, ab: Ab, n = 120, ctx = DEFAULT_CONTEXT): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 347 + 23), stufe, { ...ctx, ab }));
const angle = (ex: Exercise): AngleAnswer => { if (ex.answer.kind !== 'angle') throw new Error('angle expected'); return ex.answer; };
const shown = (ex: Exercise) => [...ex.prompt.matchAll(/(\d+)°/g)].map((m) => Number(m[1]));

describe('Winkel einstellen: independent checks', () => {
  it('Stufe 1: multiples of 10° up to 180°, exact, on an unturned arm', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(1, ab)) {
        const a = angle(ex);
        expect(a.value % 10).toBe(0);
        expect(a.value).toBeLessThanOrEqual(180);
        expect([a.step, a.tolerance, a.max, a.baseRotation]).toEqual([10, 0, 180, 0]);
      }
    }
    for (const ex of items(1, 1)) expect(angle(ex).value).toBe(shown(ex)[0]);
  });

  it('Stufe 2: whole degrees, tolerance 1, AB II and III on a turned arm', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(2, ab)) {
        const a = angle(ex);
        expect([a.step, a.tolerance, a.max]).toEqual([1, 1, 180]);
        expect(a.value % 5).not.toBe(0);
        if (ab > 1) expect(a.baseRotation).not.toBe(0);
      }
    }
  });

  it('the text says how the fixed arm lies: upright is not schräg, and at 0° it says nothing of a turn', () => {
    for (const [stufe, ab] of [[2, 1], [2, 2], [2, 3], [3, 1], [3, 2]] as const) {
      for (const ex of items(stufe, ab, 300)) {
        const base = angle(ex).baseRotation;
        const texts = [ex.prompt, ex.srText, ex.praise].join(' ');
        if (base % 180 === 90) expect(texts, ex.key).toContain('steht senkrecht');
        if (base % 180 === 90 || base === 0) expect(texts, ex.key).not.toContain('schräg');
        if (base === 0) expect(texts, ex.key).not.toContain('gedreht');
      }
    }
  });

  it('described angles are recomputed from the text', () => {
    for (const ex of items(1, 3)) {
      const k = shown(ex)[0];
      const a = angle(ex).value;
      if (ex.prompt.includes('größer als ein rechter')) expect(a).toBe(90 + k);
      else if (ex.prompt.includes('kleiner als ein rechter')) expect(a).toBe(90 - k);
      else expect(a).toBe(180 - k);
    }
    for (const ex of items(3, 3)) {
      const k = shown(ex)[0];
      expect(angle(ex).value).toBe(ex.prompt.includes('vollen Drehung') ? 360 - k : 180 + k);
    }
  });

  it('Stufe 3 with maxAngle 360 goes over 180°', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(3, ab)) {
        expect(angle(ex).value).toBeGreaterThan(180);
        expect(angle(ex).max).toBe(360);
      }
    }
  });

  it('Stufe 3 with maxAngle 180 keeps the descriptions, up to 180°', () => {
    const narrow = { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich };
    for (const ex of items(3, 1, 60, narrow)) expect(angle(ex).value).toBe(shown(ex)[0] / 2);
    for (const ex of items(3, 2, 60, narrow)) expect(angle(ex).value).toBe(shown(ex)[0] + shown(ex)[1]);
    for (const ex of items(3, 3, 60, narrow)) {
      // Two steps: Stufe 2, AB III already has the one subtraction from 180°.
      expect(shown(ex)).toHaveLength(2);
      expect(angle(ex).value).toBe(180 - shown(ex)[0] - shown(ex)[1]);
    }
    for (const ab of [1, 2, 3] as const) for (const ex of items(3, ab, 60, narrow)) expect(angle(ex).max).toBe(180);
  });
});
