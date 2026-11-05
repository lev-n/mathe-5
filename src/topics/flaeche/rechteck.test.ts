import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import topic from './index';
import { rechteckSkill } from './rechteck';
import { allItems, numberOf, numbersIn } from './testing';

describeSkill(rechteckSkill);

const teilerPaare = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((b) => n % b === 0 && b * b <= n).length;

describe('flaeche.rechteck: answers recomputed', () => {
  it('a full rectangle on the grid: the answer is the number of cells', () => {
    let seen = 0;
    for (const ex of allItems(rechteckSkill)) {
      if (ex.visual?.type !== 'grid' || !/:(reihen|kaestchen-cm2):/.test(ex.key)) continue;
      expect(numberOf(ex), ex.key).toBe(ex.visual.cells.length);
      seen++;
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('every form follows from the numbers in its key', () => {
    for (const ex of allItems(rechteckSkill)) {
      const m = (re: RegExp) => re.exec(ex.key)?.slice(1).map((s) => Number(s));
      const product = m(/:(?:laenge-breite|cm2|m2:[^:]+):(\d+)x(\d+)/);
      if (product) expect(numberOf(ex), ex.key).toBe(product[0] * product[1]);
      const left = m(/:kaestchen-fehlen:(\d+)x(\d+)-(\d+)/);
      if (left) expect(numberOf(ex) + left[0] * left[2], ex.key).toBe(left[0] * left[1]);
      const whole = m(/:erste-reihe-spalte:(\d+)x(\d+)/);
      if (whole) expect(numberOf(ex), ex.key).toBe(whole[0] * whole[1]);
      const side = m(/:fehlende-seite:(\d+):(\d+)/);
      if (side) expect(numberOf(ex) * side[1], ex.key).toBe(side[0]);
      const square = m(/:quadrat-gleich:(\d+)x(\d+)/);
      if (square) expect(numberOf(ex) ** 2, ex.key).toBe(square[0] * square[1]);
      const same = m(/:gleiche-flaeche:(\d+)x(\d+)-(\d+)/);
      if (same) expect(numberOf(ex) * same[2], ex.key).toBe(same[0] * same[1]);
      const pairs = m(/:wie-viele-rechtecke:(\d+)/);
      if (pairs) expect(numberOf(ex), ex.key).toBe(teilerPaare(pairs[0]));
    }
  });

  it('a square side from its area is exact', () => {
    for (const ex of allItems(rechteckSkill)) {
      const m = /Ein Quadrat ist (\d+) (?:cm|m)² groß/.exec(ex.prompt);
      if (m) expect(numberOf(ex) ** 2, ex.key).toBe(Number(m[1]));
    }
  });

  it('Stufe 1 stays with Kästchen and small lengths, the reversed forms belong to Stufe 2 and 3', () => {
    for (const ex of allItems(rechteckSkill)) {
      if (ex.stufe === 1) expect(ex.key).not.toMatch(/fehlende-seite|quadrat|gleiche-flaeche|wie-viele/);
      if (ex.stufe === 2) expect(ex.key).not.toMatch(/quadrat|gleiche-flaeche|wie-viele/);
    }
  });

  it('a place has a size that fits it: a Turnhalle, a Schulhof and a Sportplatz are larger than a Klassenzimmer', () => {
    let seen = 0;
    for (const ex of allItems(rechteckSkill)) {
      const m = /:m2:(.+):(\d+)x(\d+)/.exec(ex.key);
      if (!m) continue;
      const area = Number(m[2]) * Number(m[3]);
      if (m[1].includes('Klassenzimmer')) expect(area, ex.key).toBeLessThanOrEqual(80);
      if (/Turnhalle|Schulhof|Sportplatz/.test(m[1])) expect(area, ex.key).toBeGreaterThanOrEqual(180);
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('a drawn rectangle is wider than high: its longer side lies on top, in every skill and also when a side is the unknown', () => {
    let seen = 0;
    for (const skill of topic.skills) {
      for (const ex of allItems(skill)) {
        const v = ex.visual;
        if (v?.type !== 'shape' || v.shape !== 'rechteck' || !v.sideLabels) continue;
        const length = (label: string | null | undefined) => (label === '?' ? numberOf(ex) : label ? numbersIn(label)[0] : null);
        const [top, right] = [length(v.sideLabels[0]), length(v.sideLabels[1])];
        if (top === null || right === null) continue;
        expect(top, ex.key).toBeGreaterThan(right);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('worked steps calculate correctly and end with the result', () => {
    for (const ex of allItems(rechteckSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });
});
