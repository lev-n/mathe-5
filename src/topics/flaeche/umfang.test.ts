import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { allItems, numberOf, numbersIn } from './testing';
import { umfangSkill } from './umfang';

describeSkill(umfangSkill);

describe('flaeche.umfang: answers recomputed', () => {
  it('a figure with all its sides labelled has the sum of the labels as its Umfang', () => {
    let seen = 0;
    for (const ex of allItems(umfangSkill)) {
      const v = ex.visual;
      if (v?.type !== 'shape' || !v.sideLabels?.every(Boolean) || ex.prompt.includes('Formel')) continue;
      expect(numberOf(ex), ex.key).toBe(v.sideLabels.reduce((sum, l) => sum + numbersIn(l!)[0], 0));
      seen++;
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('an L-form has the Umfang of its bounding rectangle', () => {
    let seen = 0;
    for (const ex of allItems(umfangSkill)) {
      const l = ex.visual?.type === 'shape' ? ex.visual.lForm : undefined;
      if (!l) continue;
      expect(numberOf(ex), ex.key).toBe(2 * (l.w + l.h));
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('rectangle and square: the key gives the sides, every form follows from them', () => {
    for (const ex of allItems(umfangSkill)) {
      const [form, a, b] = /:(alle|gitter|zwei-angaben|rechnung-pruefen|formel):(\d+)x(\d+)/.exec(ex.key)?.slice(1) ?? [];
      if (form) expect(numberOf(ex), ex.key).toBe(2 * Number(a) + 2 * Number(b));
      const back = /:seite-aus-umfang:(\d+)\+(\d+)/.exec(ex.key);
      if (back) {
        const U = numbersIn(ex.prompt)[0];
        expect((U - 2 * Number(back[1])) / 2, ex.key).toBe(numberOf(ex));
      }
      const fence = /:zaun:(\d+)x(\d+)-(\d+)/.exec(ex.key);
      if (fence) expect(numberOf(ex), ex.key).toBe(2 * Number(fence[1]) + 2 * Number(fence[2]) - Number(fence[3]));
      const same = /:gleicher-umfang:(\d+)x(\d+)-(\d+)/.exec(ex.key);
      if (same) expect(2 * Number(same[3]) + 2 * numberOf(ex), ex.key).toBe(2 * Number(same[1]) + 2 * Number(same[2]));
      const sameSquare = /:gleicher-umfang-quadrat:(\d+)x(\d+)/.exec(ex.key);
      if (sameSquare) expect(4 * numberOf(ex), ex.key).toBe(2 * Number(sameSquare[1]) + 2 * Number(sameSquare[2]));
    }
  });

  it('each Stufe keeps its content: Stufe 1 rectangles and squares only, the L-form only on Stufe 3', () => {
    for (const ex of allItems(umfangSkill)) {
      if (ex.stufe === 1) expect(ex.key, ex.key).toMatch(/:(alle|gitter|zwei-angaben|rechnung-pruefen):/);
      if (ex.visual?.type === 'shape' && ex.visual.lForm) expect(ex.stufe).toBe(3);
    }
  });

  it('a fence fits its place: no Beet of 45 m, a gate far smaller than the shorter side', () => {
    let seen = 0;
    for (const ex of allItems(umfangSkill)) {
      const fence = /:zaun:(\d+)x(\d+)-(\d+)/.exec(ex.key);
      if (!fence) continue;
      const [a, b, gate] = fence.slice(1).map(Number);
      expect(ex.context, ex.key).toMatch(/Garten|Wiese|Koppel/);
      expect(b, ex.key).toBeLessThan(a);
      expect(gate * 2, ex.key).toBeLessThanOrEqual(b);
      seen++;
    }
    expect(seen).toBeGreaterThan(5);
  });

  it('a polygon task can be solved from what is visible: a missing side follows from the name or from the prompt', () => {
    const DEFINED = new Set(['parallelogramm', 'raute', 'drachen']);
    const seen = new Set<string>();
    for (const ex of allItems(umfangSkill, undefined, 200)) {
      const shape = /:vieleck:(\w+):/.exec(ex.key)?.[1];
      if (!shape || ex.visual?.type !== 'shape' || ex.visual.sideLabels?.every(Boolean)) continue;
      seen.add(shape);
      if (!DEFINED.has(shape)) expect(ex.prompt, ex.key).toMatch(/gleich lange Seiten/);
    }
    expect(seen).toEqual(new Set([...DEFINED, 'sechseck']));
  });

  it('worked steps calculate correctly and end with the result', () => {
    for (const ex of allItems(umfangSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });
});
