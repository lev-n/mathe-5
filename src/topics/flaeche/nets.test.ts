import { describe, expect, it } from 'vitest';
import type { Cell } from '../../core/types';
import { NETS, NET_GAPS, NOT_NETS, QUADER_OPPOSITE, QUADER_SIZES, completions, fold, normalise, oppositeFace, orientations, quaderNet } from './nets';

const form = (cells: readonly Cell[]) => cells.map((c) => c.join()).join(';');
const canon = (cells: readonly Cell[]) => orientations(cells).map(form).sort()[0];

/** All free hexominoes, grown cell by cell. */
function hexominoes(): Cell[][] {
  let found = new Map<string, Cell[]>([[canon([[0, 0]]), [[0, 0]]]]);
  for (let size = 2; size <= 6; size++) {
    const next = new Map<string, Cell[]>();
    for (const cells of found.values()) {
      for (const [x, y] of cells) {
        for (const c of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Cell[]) {
          if (cells.some((o) => o[0] === c[0] && o[1] === c[1])) continue;
          const grown = normalise([...cells, c]);
          next.set(canon(grown), grown);
        }
      }
    }
    found = next;
  }
  return [...found.values()];
}

describe('flaeche nets', () => {
  it('of the 35 hexominoes exactly the 11 of NETS fold to a cube', () => {
    const all = hexominoes();
    expect(all.length).toBe(35);
    const folding = new Set(all.filter((c) => fold(c)).map(canon));
    expect(folding).toEqual(new Set(NETS.map(canon)));
    expect(folding.size).toBe(11);
  });

  it('no entry of NOT_NETS folds, in any form, and all are different', () => {
    for (const cells of NOT_NETS) for (const f of orientations(cells)) expect(fold(f), form(f)).toBeNull();
    expect(new Set(NOT_NETS.map(canon)).size).toBe(NOT_NETS.length);
  });

  it('a folded net has six faces, three pairs of opposite faces', () => {
    for (const cells of NETS) {
      const faces = fold(cells)!;
      expect(new Set(faces).size).toBe(6);
      for (const f of faces) expect(faces).toContain(oppositeFace(f));
      // cells side by side never lie opposite each other
      cells.forEach((a, i) => cells.forEach((b, j) => {
        if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1) expect(faces[i]).not.toBe(oppositeFace(faces[j]));
      }));
    }
  });

  it('every gap has exactly one solution inside its grid, and that grid fits the cells answer', () => {
    expect(NET_GAPS.length).toBeGreaterThan(5);
    for (const g of NET_GAPS) {
      expect(completions(g.given, g.width, g.height)).toEqual([g.missing]);
      expect(g.width).toBeLessThanOrEqual(6);
      expect(g.height).toBeLessThanOrEqual(6);
    }
  });

  it('a Quader net has the cells of its six faces; opposite faces are equal', () => {
    for (const [a, b, c] of QUADER_SIZES) {
      const net = quaderNet(a, b, c);
      expect(net.cells.length).toBe(2 * (a * b + a * c + b * c));
      expect(net.cells.length).toBeLessThanOrEqual(40);
      expect(new Set(net.cells.map((x) => x.join())).size, 'no overlap').toBe(net.cells.length);
      const size = (face: number) => net.groups.filter((g) => g === face).length;
      for (let face = 0; face < 6; face++) expect(size(face)).toBe(size(QUADER_OPPOSITE[face]));
      expect(new Set([a * b, a * c, b * c]).size, 'three different pairs').toBe(3);
      const long = quaderNet(a, b, c, true);
      expect(new Set(long.cells.map((x) => x.join())).size, 'no overlap').toBe(long.cells.length);
      expect(long.groups.filter((g) => g === 5).length).toBeGreaterThan(size(4));
    }
  });
});
