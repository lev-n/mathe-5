/**
 * Cube and Quader nets of the topic 'flaeche'. fold() rolls a die over the cells, so which faces meet is computed, never written down by hand.
 * nets.test.ts checks NETS and NOT_NETS against all 35 hexominoes.
 */
import type { Cell, Rng, VisualOf } from '../../core/types';
import { LETTERS, rectCells } from './common';

const fromRows = (rows: readonly string[]): Cell[] => rows.flatMap((row, y) => [...row].flatMap((c, x): Cell[] => (c === 'X' ? [[x, y]] : [])));

/** The 11 cube nets. */
export const NETS: readonly Cell[][] = ([
  ['X...', 'XXXX', 'X...'], ['X...', 'XXXX', '.X..'], ['X...', 'XXXX', '..X.'], ['X...', 'XXXX', '...X'],
  ['.X..', 'XXXX', '.X..'], ['.X..', 'XXXX', '..X.'],
  ['XX..', '.XXX', '.X..'], ['XX..', '.XXX', '..X.'], ['XX..', '.XXX', '...X'],
  ['XX..', '.XX.', '..XX'],
  ['XXX..', '..XXX'],
] as const).map(fromRows);

/** Hexominoes that fold onto themselves. The strip of six is left out: it is too long for a phone and tells too little. */
export const NOT_NETS: readonly Cell[][] = ([
  ['XX', 'XX', 'XX'], ['X..', 'XXX', '.XX'], ['XX.', 'XXX', '.X.'], ['X..', 'XXX', 'XX.'], ['X.', 'XX', 'XX', 'X.'],
  ['X..', 'X..', 'XX.', '.XX'], ['X.', 'XX', '.X', 'XX'], ['X..', 'X..', 'XXX', '.X.'], ['XX.', '.XX', 'XX.'], ['X..', 'XXX', 'X.X'],
  ['X.', 'XX', 'X.', 'XX'], ['X..', 'X.X', 'XXX'], ['X..', 'X..', 'XXX', '..X'], ['XX', 'X.', 'X.', 'XX'], ['X..', 'X..', 'X..', 'XXX'],
  ['X..', 'X..', 'XXX', 'X..'], ['X.', 'X.', 'XX', 'X.', 'X.'], ['X.', 'X.', 'X.', 'XX', 'X.'],
] as const).map(fromRows);

const key = (c: Cell) => `${c[0]},${c[1]}`;

/** Cells moved to the top left corner, sorted by row. */
export function normalise(cells: readonly Cell[]): Cell[] {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]): Cell => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

const TURNS: readonly ((c: Cell) => Cell)[] = [
  ([x, y]) => [x, y], ([x, y]) => [-x, y], ([x, y]) => [x, -y], ([x, y]) => [-x, -y],
  ([x, y]) => [y, x], ([x, y]) => [-y, x], ([x, y]) => [y, -x], ([x, y]) => [-y, -x],
];

/** The distinct turned and mirrored forms of a figure. */
export function orientations(cells: readonly Cell[]): Cell[][] {
  const seen = new Map<string, Cell[]>();
  for (const turn of TURNS) {
    const form = normalise(cells.map(turn));
    seen.set(form.map(key).join(';'), form);
  }
  return [...seen.values()];
}

export const sizeOf = (cells: readonly Cell[]) => ({ w: Math.max(...cells.map((c) => c[0])) + 1, h: Math.max(...cells.map((c) => c[1])) + 1 });

/** A form of a figure that fits a phone: at most 4 cells wide (68 px each). */
export function pickForm(rng: Rng, cells: readonly Cell[]): Cell[] {
  const forms = orientations(cells);
  const narrow = forms.filter((f) => sizeOf(f).w <= 4);
  return rng.pick(narrow.length ? narrow : forms);
}

/** Faces of a die: 0–1, 2–3 and 4–5 lie opposite each other. */
export const oppositeFace = (face: number) => face ^ 1;

interface Die { down: number; up: number; north: number; south: number; east: number; west: number }

const ROLLS: readonly [dx: number, dy: number, roll: (d: Die) => Die][] = [
  [1, 0, (d) => ({ ...d, down: d.east, east: d.up, up: d.west, west: d.down })],
  [-1, 0, (d) => ({ ...d, down: d.west, west: d.up, up: d.east, east: d.down })],
  [0, 1, (d) => ({ ...d, down: d.south, south: d.up, up: d.north, north: d.down })],
  [0, -1, (d) => ({ ...d, down: d.north, north: d.up, up: d.south, south: d.down })],
];

/** The face of the cube each cell becomes, in the order of `cells`; null if two cells land on the same face, so it is no cube net. */
export function fold(cells: readonly Cell[]): number[] | null {
  const inside = new Set(cells.map(key));
  const found = new Map<string, Die>([[key(cells[0]), { down: 0, up: 1, north: 2, south: 3, east: 4, west: 5 }]]);
  const queue: Cell[] = [cells[0]];
  while (queue.length) {
    const c = queue.shift()!;
    for (const [dx, dy, roll] of ROLLS) {
      const next: Cell = [c[0] + dx, c[1] + dy];
      if (!inside.has(key(next)) || found.has(key(next))) continue;
      found.set(key(next), roll(found.get(key(c))!));
      queue.push(next);
    }
  }
  const faces = cells.map((c) => found.get(key(c))?.down ?? -1);
  return new Set(faces).size === 6 && !faces.includes(-1) ? faces : null;
}

/** A net with one square missing, and the one cell inside its bounding grid that completes it. Without that grid no gap has one solution. */
export interface NetGap {
  given: Cell[];
  missing: Cell;
  width: number;
  height: number;
}

const hangsTogether = (cells: readonly Cell[]) => {
  const inside = new Set(cells.map(key));
  const seen = new Set([key(cells[0])]);
  const queue = [cells[0]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const next of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Cell[]) {
      if (inside.has(key(next)) && !seen.has(key(next))) {
        seen.add(key(next));
        queue.push(next);
      }
    }
  }
  return seen.size === cells.length;
};

/** The cells inside a w × h grid that turn `given` into a cube net. */
export function completions(given: readonly Cell[], width: number, height: number): Cell[] {
  const taken = new Set(given.map(key));
  const out: Cell[] = [];
  for (const cell of rectCells(0, 0, width, height)) {
    if (taken.has(key(cell))) continue;
    const touches = given.some((c) => Math.abs(c[0] - cell[0]) + Math.abs(c[1] - cell[1]) === 1);
    if (touches && fold([...given, cell])) out.push(cell);
  }
  return out;
}

/** Every gap with exactly one solution, in all forms that fit the cells answer. */
export const NET_GAPS: readonly NetGap[] = NETS.flatMap(orientations).filter((n) => sizeOf(n).w <= 4).flatMap((net) => {
  const { w, h } = sizeOf(net);
  return net.flatMap((missing): NetGap[] => {
    const given = net.filter((c) => c !== missing);
    return hangsTogether(given) && completions(given, w, h).length === 1 ? [{ given, missing, width: w, height: h }] : [];
  });
});

/** Opposite faces of quaderNet(): each face has its partner. */
export const QUADER_OPPOSITE: readonly number[] = [2, 3, 0, 1, 5, 4];

/** a = width, b = depth, c = height, in cells. Sizes small enough for a phone: at most 7 cells wide and 8 rows. */
export const QUADER_SIZES: readonly (readonly [number, number, number])[] = [[2, 1, 3], [3, 1, 2], [4, 1, 2], [4, 1, 3], [3, 2, 1], [5, 1, 2]];

export interface QuaderNet {
  cells: Cell[];
  groups: number[];
}

/** tooLong: face 5 gets one row too many, so the net does not fold to a Quader. */
export function quaderNet(a: number, b: number, c: number, tooLong = false): QuaderNet {
  const faces: [x: number, y: number, w: number, h: number][] = [
    [b, 0, a, b], [b, b, a, c], [b, b + c, a, b], [b, 2 * b + c, a, c],
    [0, b, b, c], [b + a, b, b, tooLong ? c + 1 : c],
  ];
  const cells = faces.flatMap(([x, y, w, h]) => rectCells(x, y, w, h));
  const groups = faces.flatMap(([, , w, h], face) => Array.from({ length: w * h }, () => face));
  return { cells, groups };
}

/** A Quader net as a picture with a letter on each face. letters[face] names the face. */
export function quaderNetVisual(net: QuaderNet, letters: readonly string[]): VisualOf<'net'> {
  return { type: 'net', cells: net.cells, groups: net.groups, faces: net.groups.map((g) => letters[g]) };
}

export const shuffledLetters = (rng: Rng): string[] => rng.shuffle([...LETTERS]);
