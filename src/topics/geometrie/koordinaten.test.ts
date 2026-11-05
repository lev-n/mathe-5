import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { DEFAULT_CONTEXT } from '../../core/generate';
import { RANGE_DEFAULTS } from '../../data/profiles';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { koordinatenSkill as skill } from './koordinaten';

describeSkill(skill);

const items = (stufe: Stufe, ab: Ab, n = 150, ctx = DEFAULT_CONTEXT): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 317 + 13), stufe, { ...ctx, ab }));
const fieldsOf = (ex: Exercise) => { if (ex.answer.kind !== 'multi') throw new Error('multi expected'); return ex.answer.fields; };
/** The point name(x|y) in a text, with U+2212 as a minus. */
const pointIn = (text: string, name: string) => { const m = new RegExp(`${name}\\((−?\\d+)\\|(−?\\d+)\\)`).exec(text)!; return [m[1], m[2]].map((s) => Number(s.replace('−', '-'))); };

describe('Koordinatensystem: independent checks', () => {
  it('Stufe 3: half of a Strecke of 2 steps is 1 Schritt', () => {
    const steps = items(3, 3, 400).flatMap((ex) => ex.steps.map((s) => (typeof s === 'string' ? s : s.text)));
    expect(steps).toContain('Die Hälfte ist 1 Schritt ab A.');
    for (const s of steps) expect(s).not.toMatch(/\b1 Schritte\b/);
  });

  it('Stufe 1: reading gives the drawn point, in the first quadrant', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(1, ab)) {
        if (ex.visual?.type !== 'coordinateGrid') throw new Error('grid expected');
        const name = /von (\w)/.exec(ex.prompt)![1];
        const p = ex.visual.points.find((q) => q.label === name)!;
        expect(fieldsOf(ex).map((f) => f.value)).toEqual([p.x, p.y]);
        expect(ex.visual.xMin).toBe(0);
      }
    }
  });

  it('Stufe 1, AB III: the swapped point is an option, and the right one has the asked values', () => {
    for (const ex of items(1, 3)) {
      if (ex.visual?.type !== 'coordinateGrid' || ex.answer.kind !== 'choice') throw new Error('grid and choice expected');
      const [x, y] = [...ex.prompt.matchAll(/(\d+)/g)].map((m) => Number(m[1]));
      const { options, correct } = ex.answer;
      const right = ex.visual.points.find((p) => p.label === options[correct].label)!;
      expect([right.x, right.y]).toEqual([x, y]);
      expect(ex.visual.points.some((p) => p.x === y && p.y === x)).toBe(true);
    }
  });

  it('Stufe 2: the target is the plotted point or the fourth corner of a rectangle', () => {
    for (const ex of items(2, 1)) {
      if (ex.answer.kind !== 'point') throw new Error('point expected');
      expect([...ex.answer.target]).toEqual(pointIn(ex.prompt, ex.answer.name!));
    }
    for (const ex of items(2, 2)) {
      if (ex.answer.kind !== 'point') throw new Error('point expected');
      const [a, b, c] = ex.answer.points!;
      expect([...ex.answer.target]).toEqual([a.x + c.x - b.x, a.y + c.y - b.y]);
    }
    for (const ex of items(2, 3)) {
      const [a, b, c] = ['A', 'B', 'C'].map((n) => pointIn(ex.prompt, n));
      expect(fieldsOf(ex).map((f) => f.value)).toEqual([a[0] + c[0] - b[0], a[1] + c[1] - b[1]]);
    }
  });

  it('Stufe 3: with four quadrants a point has a negative coordinate; without, nothing is negative', () => {
    for (const ex of items(3, 1)) expect(fieldsOf(ex).some((f) => f.value < 0)).toBe(true);
    for (const ex of items(3, 2)) if (ex.answer.kind === 'point') expect(Math.min(...ex.answer.target)).toBeLessThan(0);
    for (const ex of items(3, 3)) expect(ex.prompt).toContain('−');
    const narrow = { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich };
    for (const ab of [1, 2, 3] as const) for (const ex of items(3, ab, 60, narrow)) fieldsOf(ex).forEach((f) => expect(f.value).toBeGreaterThanOrEqual(0));
  });

  it('every field of the skill sets signed, so the minus key gives nothing away', () => {
    for (const ex of items(1, 1)) fieldsOf(ex).forEach((f) => expect(f.signed).toBe(true));
  });

  it('every visible Rechtswert and Hochwert comes with its x and y (§2.4)', () => {
    const narrow = { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich };
    for (const ctx of [DEFAULT_CONTEXT, narrow]) {
      for (const stufe of [1, 2, 3] as const) {
        for (const ab of [1, 2, 3] as const) {
          for (const ex of items(stufe, ab, 40, ctx)) {
            const text = [ex.prompt, ex.srText, ex.praise, ...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)), ...(ex.bugs ?? []).map((b) => b.hint)].join(' ');
            expect(text).not.toMatch(/Rechtswert(?!e? \(x\))|Hochwert(?!e? \(y\))/);
          }
        }
      }
    }
  });

  it('a grid fits a phone: at most 9 cells wide, so its numbers keep about 13 px', () => {
    const narrow = { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich };
    for (const ctx of [DEFAULT_CONTEXT, narrow]) {
      for (const stufe of [1, 2, 3] as const) {
        for (const ab of [1, 2, 3] as const) {
          for (const ex of items(stufe, ab, 40, ctx)) {
            const grid = ex.visual?.type === 'coordinateGrid' ? ex.visual : ex.answer.kind === 'point' ? ex.answer : null;
            if (grid) expect(grid.xMax - grid.xMin).toBeLessThanOrEqual(9);
          }
        }
      }
    }
  });

  it('a swapped answer gets the targeted hint', () => {
    const ex = items(2, 1)[0];
    expect(ex.bugs?.some((b) => b.id === 'koordinaten-getauscht')).toBe(true);
  });
});
