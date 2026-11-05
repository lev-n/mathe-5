import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { oberflaecheSkill } from './oberflaeche';
import { allItems, fieldOf, numberOf } from './testing';

describeSkill(oberflaecheSkill);

const items = allItems(oberflaecheSkill);
const O = (a: number, b: number, c: number) => 2 * a * b + 2 * a * c + 2 * b * c;
const nums = (s: string) => s.split(/[-+]/).map(Number);

describe('flaeche.oberflaeche: answers recomputed', () => {
  it('Würfel: six squares, the edge never above 12 cm', () => {
    for (const ex of items) {
      const m = /:wuerfel(-rueck|netz)?:(\d+)/.exec(ex.key);
      if (!m) continue;
      const a = Number(m[2]);
      expect(a, ex.key).toBeLessThanOrEqual(12);
      if (m[1] === '-rueck') expect(numberOf(ex), ex.key).toBe(a);
      else if (m[1] === 'netz') {
        expect(fieldOf(ex, 'eine'), ex.key).toBe(a * a);
        expect(fieldOf(ex, 'alle'), ex.key).toBe(6 * a * a);
      } else expect(numberOf(ex), ex.key).toBe(6 * a * a);
    }
  });

  it('a Quader net: the Oberfläche is the number of cells, each pair the cells of two faces', () => {
    let seen = 0;
    for (const ex of items) {
      if (!ex.key.includes(':quadernetz:') || ex.visual?.type !== 'net' || ex.answer.kind !== 'multi') continue;
      expect(fieldOf(ex, 'o'), ex.key).toBe(ex.visual.cells.length);
      expect(fieldOf(ex, 'p0') + fieldOf(ex, 'p1') + fieldOf(ex, 'p2'), ex.key).toBe(ex.visual.cells.length);
      for (const f of ex.answer.fields.slice(0, 3)) {
        const [one, two] = /([A-F]) und ([A-F])/.exec(f.before!)!.slice(1);
        const faces = ex.visual.faces!;
        expect(faces.filter((x) => x === one || x === two).length, ex.key).toBe(f.value);
      }
      seen++;
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('every other form follows from the edges in its key', () => {
    for (const ex of items) {
      const box = /:quader:([\d-]+)/.exec(ex.key);
      if (box) expect(numberOf(ex), ex.key).toBe(O(...(nums(box[1]) as [number, number, number])));
      const open = /:offene-schachtel:([\d-]+)/.exec(ex.key);
      if (open) {
        const [a, b, c] = nums(open[1]);
        expect(numberOf(ex), ex.key).toBe(a * b + 2 * a * c + 2 * b * c);
      }
      const rest = /:geschenk-rest:([\d-]+)/.exec(ex.key);
      if (rest) {
        const [a, b, c, sheet] = nums(rest[1]);
        expect(numberOf(ex), ex.key).toBe(sheet - O(a, b, c));
        expect(numberOf(ex), ex.key).toBeGreaterThanOrEqual(0);
      }
      const extra = /:geschenk-extra:([\d-]+)/.exec(ex.key);
      if (extra) {
        const [a, b, c, more] = nums(extra[1]);
        expect(numberOf(ex), ex.key).toBe(O(a, b, c) + more);
      }
      const two = /:zwei-quader:([\d+-]+)/.exec(ex.key);
      if (two) {
        const [a1, b1, c1, a2, b2, c2] = nums(two[1]);
        expect(a2, 'the small one stands fully on the large one').toBeLessThan(a1);
        expect(b2, 'the small one stands fully on the large one').toBeLessThan(b1);
        expect(numberOf(ex), ex.key).toBe(O(a1, b1, c1) + O(a2, b2, c2) - 2 * a2 * b2);
      }
      const back = /:paar-rueck:([\d-]+)/.exec(ex.key);
      if (back) {
        const [, b, c] = nums(back[1]);
        expect(numberOf(ex), ex.key).toBe(b * c);
      }
    }
  });

  it('every Stufe keeps its content: Würfel only on Stufe 1, stories only on Stufe 3', () => {
    for (const ex of items) {
      if (ex.stufe === 1) expect(ex.key).toMatch(/:(wuerfel|wuerfelnetz|wuerfel-rueck):/);
      if (ex.stufe === 2) expect(ex.key).toMatch(/:(quadernetz|quader|paar-rueck):/);
      if (ex.stufe === 3) expect(ex.key).toMatch(/:(offene-schachtel|geschenk-rest|geschenk-extra|zwei-quader):/);
    }
  });

  it('the hint with the three visible faces stands only by a Schrägbild, and an open box has five faces', () => {
    let seen = 0;
    for (const ex of items) {
      for (const b of ex.bugs ?? []) {
        if (/Du siehst drei Flächen/.test(b.hint)) {
          expect(ex.visual?.type, ex.key).toBe('quader');
          seen++;
        }
        if (ex.key.includes(':offene-schachtel:')) expect(b.hint, ex.key).not.toMatch(/sechs/);
      }
    }
    expect(seen).toBeGreaterThan(20);
    const open = items.filter((ex) => ex.key.includes(':offene-schachtel:'));
    expect(open.length).toBeGreaterThan(0);
    for (const ex of open) expect(ex.bugs?.find((b) => b.id === 'quader-sichtbar')?.hint, ex.key).toMatch(/fünf/);
  });

  it('worked steps calculate correctly and end with the result', () => {
    for (const ex of items) expect(checkWorkedSolution(ex)).toEqual([]);
  });
});
