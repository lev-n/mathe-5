import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { DEFAULT_CONTEXT } from '../../core/generate';
import { RANGE_DEFAULTS } from '../../data/profiles';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { winkelArtenSkill as skill } from './winkel-arten';

describeSkill(skill);

const items = (stufe: Stufe, ab: Ab, n = 120, ctx = DEFAULT_CONTEXT): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 331 + 17), stufe, { ...ctx, ab }));
const label = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options[ex.answer.correct].label : '');
const kind = (d: number) => (d < 90 ? 'spitzer Winkel' : d === 90 ? 'rechter Winkel' : d < 180 ? 'stumpfer Winkel' : d === 180 ? 'gestreckter Winkel' : 'überstumpfer Winkel');

describe('Winkelarten: independent checks', () => {
  it('the name follows from the drawn size', () => {
    for (const [stufe, ab] of [[1, 1], [2, 1], [3, 1]] as const) {
      for (const ex of items(stufe, ab)) {
        if (ex.visual?.type !== 'angle') throw new Error('angle expected');
        expect(label(ex)).toBe(kind(ex.visual.degrees));
      }
    }
  });

  it('Stufe 1 keeps the usual position, Stufe 2 turns the angle', () => {
    for (const ex of items(1, 1)) if (ex.visual?.type === 'angle') expect(ex.visual.baseRotation).toBe(0);
    for (const ex of items(2, 1)) if (ex.visual?.type === 'angle') expect(ex.visual.baseRotation).not.toBe(0);
  });

  it('Stufe 2, AB III: the larger angle always has the shorter arms', () => {
    for (const ex of items(2, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const pictures = ex.answer.options.map((o) => o.visual);
      const right = pictures[ex.answer.correct]!;
      const other = pictures[1 - ex.answer.correct]!;
      if (right.type !== 'angle' || other.type !== 'angle') throw new Error('angles expected');
      expect(right.degrees).toBeGreaterThan(other.degrees);
      expect(right.arm1).toBeLessThan(other.arm1);
    }
  });

  it('Stufe 3 reaches überstumpf only with maxAngle 360', () => {
    expect(items(3, 1).some((ex) => label(ex) === 'überstumpfer Winkel')).toBe(true);
    const narrow = { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich };
    for (const ab of [1, 2, 3] as const) for (const ex of items(3, ab, 60, narrow)) expect(JSON.stringify(ex.answer)).not.toContain('überstumpf');
  });

  it('Stufe 3, AB I with maxAngle 180: a size close to a border is read on the tool, never named by eye', () => {
    const narrow = { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich };
    for (const ex of items(3, 1, 200, narrow)) {
      if (ex.visual?.type !== 'angle') throw new Error('angle expected');
      expect(label(ex)).toBe(kind(ex.visual.degrees));
      expect(ex.visual.tool).toBe('geodreieck');
      expect([ex.visual.arm1, ex.visual.arm2]).toEqual([1, 1]);
      expect(ex.srText).toContain(`${ex.visual.degrees} Grad`);
    }
  });

  it('by eye, a size stays well away from 90° and 180°', () => {
    for (const [stufe, ab] of [[1, 1], [2, 1], [3, 1], [3, 2]] as const) {
      for (const ex of items(stufe, ab)) {
        if (ex.visual?.type !== 'angle') throw new Error('angle expected');
        const d = ex.visual.degrees;
        if (d !== 90 && d !== 180) expect(Math.min(Math.abs(d - 90), Math.abs(d - 180))).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it('a hint names the border of stumpf: following it never leads to a gestreckter Winkel', () => {
    for (const ex of items(1, 2, 200)) expect(ex.hints.join(' ')).not.toMatch(/größer als 90° ist stumpf/);
    for (const ex of items(1, 3)) if (ex.prompt.includes('stumpfen')) expect(ex.hints[0]).toContain('gestreckten');
  });

  it('the steps are plain German: no "misst kleiner", no empty "90° ist genau 90°"', () => {
    const narrow = { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich };
    for (const ctx of [DEFAULT_CONTEXT, narrow]) {
      for (const stufe of [1, 2, 3] as const) {
        for (const ab of [1, 2, 3] as const) {
          for (const ex of items(stufe, ab, 60, ctx)) {
            const text = ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).join(' ');
            expect(text).not.toMatch(/mess\w* (kleiner|größer|zwischen)|im Bereich (kleiner|größer|zwischen)|(\d+)° (ist|misst) genau \2°/);
          }
        }
      }
    }
  });

  it('Stufe 3, AB II: one spoken text fits one answer, so a screen reader has the data', () => {
    for (const ctx of [DEFAULT_CONTEXT, { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich }]) {
      const seen = new Map<string, Set<string>>();
      for (const ex of items(3, 2, 400, ctx)) seen.set(ex.srText, (seen.get(ex.srText) ?? new Set()).add(label(ex)));
      for (const answers of seen.values()) expect(answers.size).toBe(1);
    }
  });

  it('Stufe 2, AB II: no arm runs through the name of the vertex', () => {
    for (const ex of items(2, 2, 300)) {
      if (ex.visual?.type !== 'angle') throw new Error('angle expected');
      const { degrees, baseRotation } = ex.visual;
      for (const dir of [baseRotation, baseRotation + degrees]) {
        const r = (dir * Math.PI) / 180;
        // The letter stands 14 to the left of the vertex and 20 below, in a box of ±7 by ±10; y upward.
        const across = [[-7, -10], [-21, -10], [-7, -30], [-21, -30]].map(([x, y]) => x * Math.sin(r) - y * Math.cos(r));
        const ahead = Math.cos(r) * -14 + Math.sin(r) * -20;
        expect(ahead > 0 && Math.min(...across) < 0 && Math.max(...across) > 0, `${ex.key}: arm at ${dir}°`).toBe(false);
      }
    }
  });

  it('Stufe 3, AB III: the kind of the double, triple or half is recomputed', () => {
    for (const ex of items(3, 3)) {
      const d = Number(/(\d+)°/.exec(ex.prompt)![1]);
      const result = ex.prompt.includes('doppelt') ? 2 * d : ex.prompt.includes('dreimal') ? 3 * d : d / 2;
      expect(label(ex)).toBe(kind(result));
    }
  });
});
