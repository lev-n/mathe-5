/**
 * Small helpers of the topic 'geometrie': the drawings the skills share and the guards for answers with a tolerance. Pure functions only; lines follow
 * the geometry of the `lines` visual (a picture of 300 × 200 units around the centre, y upward).
 */
import type { Bug, ChoiceAnswer, ChoiceOption, Rng, VisualOf } from '../../core/types';
import { makeChoice, numberBugs, type MaybeBug } from '../shared';

/** Ja/Nein in a fixed order, with the targeted hint on the wrong one. */
export function yesNo(rng: Rng, isYes: boolean, whyYes: string, whyNo: string): ChoiceAnswer {
  return isYes
    ? makeChoice(rng, { label: 'Ja' }, [{ label: 'Nein', whyWrong: whyNo }], { order: ['Ja', 'Nein'] })
    : makeChoice(rng, { label: 'Nein' }, [{ label: 'Ja', whyWrong: whyYes }], { order: ['Ja', 'Nein'] });
}

/** A choice whose labels stay in this order ('A', 'B', 'C'), for options named after a picture. */
export function labelledChoice(rng: Rng, correct: ChoiceOption, wrongs: ChoiceOption[], order: string[], layout?: ChoiceAnswer['layout']): ChoiceAnswer {
  return makeChoice(rng, correct, wrongs, { order, max: order.length, ...(layout ? { layout } : {}) });
}

/** Only bugs that the tolerance of the answer does not already accept. */
export function beyondTolerance(bugs: MaybeBug[], value: number, tolerance: number): Bug[] {
  return numberBugs(bugs, value).filter((b) => Math.abs((b.match as number) - value) > tolerance);
}

/** A whole degree in [min, max] that no scale number or 5° tick hits: its last digit is 2, 3, 7 or 8, at least 2° from the next 5° tick. */
export function offTick(rng: Rng, min: number, max: number): number {
  const pool: number[] = [];
  for (let d = min; d <= max; d++) if ([2, 3, 7, 8].includes(d % 10)) pool.push(d);
  return rng.pick(pool);
}

/** The nearest multiple of 5: what a child reads who takes a small tick for 5°. */
export const nearestFive = (d: number) => Math.round(d / 5) * 5;

/** An angle with equal arms; every option as a plain drawing. */
export function angleVisual(degrees: number, baseRotation = 0, rest: Partial<VisualOf<'angle'>> = {}): VisualOf<'angle'> {
  return { type: 'angle', degrees, baseRotation, arm1: 1, arm2: 1, showArc: true, ...rest };
}

/** The same angle with the Geodreieck on it: zero on the first arm, centre on the vertex. */
export function toolVisual(degrees: number, baseRotation = 0, rest: Partial<VisualOf<'angle'>> = {}): VisualOf<'angle'> {
  return angleVisual(degrees, baseRotation, { tool: 'geodreieck', ...rest });
}

/** The second arm stops here when the number under it is what the child reads: the tip points at the number and stays below both rings of numbers. */
const SHORT_ARM = 0.5;

/**
 * The drawn second arm strikes no printed number of the Geodreieck: at most it grazes a corner of the box around a number. Follows AngleVisual: an arm of 130 units
 * at most; rings at 102 (the number d) and 82 (180 − d), both set 6° in from the ends; upright text of 14 px, 8 wide per digit and 11 high.
 */
export function armClearOfNumbers(degrees: number, base = 0, arm2 = 1): boolean {
  const r = ((base + degrees) * Math.PI) / 180;
  const [dx, dy] = [Math.cos(r), Math.sin(r)];
  return Array.from({ length: 10 }, (_, i) => i * 20).every((d) => {
    const a = ((base + Math.min(174, Math.max(6, d))) * Math.PI) / 180;
    return [[102, d], [82, 180 - d]].every(([ring, printed]) => {
      const [x, y] = [ring * Math.cos(a), ring * Math.sin(a)];
      const halfW = String(printed).length * 4;
      const across = Math.abs(x * dy - y * dx) - (halfW * Math.abs(dy) + 5.5 * Math.abs(dx));
      const along = x * dx + y * dy - (halfW * Math.abs(dx) + 5.5 * Math.abs(dy));
      return across >= -2 || along >= 130 * arm2 + 2;
    });
  });
}

/** The Geodreieck picture of an angle whose size is a printed number or stands in the text: when the full arm would strike a number, the arm stops before the numbers. */
export function readableTool(degrees: number, base = 0): VisualOf<'angle'> {
  return toolVisual(degrees, base, armClearOfNumbers(degrees, base) ? {} : { arm2: SHORT_ARM });
}

/** A whole degree as offTick() and a turn of the first arm, for an angle read at the ticks, so the full arm has to stay: together they miss every printed number. */
export function clearReading(rng: Rng, min: number, max: number, bases: readonly number[], arm2 = 1): [number, number] {
  for (let i = 0; i < 1000; i++) {
    const d = offTick(rng, min, max);
    const base = rng.pick(bases);
    if (armClearOfNumbers(d, base, arm2)) return [d, base];
  }
  throw new Error('geometrie: no angle clear of the numbers of the Geodreieck');
}

/** The offset of a `lines` line at this angle through the point (x, y), y upward. */
export function offsetThrough(angle: number, x: number, y: number): number {
  const r = (angle * Math.PI) / 180;
  return Math.round((x * Math.sin(r) - y * Math.cos(r)) * 10) / 10;
}

/** A point at this distance from the centre in this direction (degrees counterclockwise), y upward. */
export function polar(direction: number, r: number): { x: number; y: number } {
  const a = (direction * Math.PI) / 180;
  return { x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) };
}

/** The drawn half-length of a line through the centre: as far as the `lines` picture lets it go. */
export function reachOf(angle: number): number {
  const s = Math.abs(Math.sin((angle * Math.PI) / 180));
  return s < 1e-9 ? 118 : Math.min(118, 90 / s);
}

/**
 * Letters for a set of lines. None of them is the symbol of a unit: the voice says a lone a, g, h, l, m, s or t as Ar, Gramm, Stunden, Liter, Meter, Sekunden or Tonnen.
 * BASE_LINE names a line the others are compared with, so it stays out of every set.
 */
export const LINE_LETTERS: readonly (readonly string[])[] = [['b', 'c', 'd'], ['p', 'q', 'r'], ['d', 'e', 'f'], ['n', 'p', 'q']];
export const BASE_LINE = 'k';

type Line = VisualOf<'lines'>['lines'][number];
type Point = NonNullable<VisualOf<'lines'>['points']>[number];

/** The two ends of a line and the middle of its label, as the `lines` visual draws them: the label stands beside the end the angle points to. */
function drawnLine({ angle, offset }: Pick<Line, 'angle' | 'offset'>): { a: [number, number]; b: [number, number]; label: { x: number; y: number } } {
  const r = (angle * Math.PI) / 180;
  const dir = [Math.cos(r), -Math.sin(r)];
  const px = 150 - dir[1] * offset;
  const py = 100 + dir[0] * offset;
  const reach = (s: number) => {
    let t = 118;
    if (dir[0] !== 0) t = Math.min(t, Math.abs((s > 0 ? 290 - px : px - 10) / dir[0]));
    if (dir[1] !== 0) t = Math.min(t, Math.abs((s * dir[1] > 0 ? 190 - py : py - 10) / dir[1]));
    return t;
  };
  const [t1, t2] = [reach(1), reach(-1)];
  const b: [number, number] = [px + dir[0] * t1, py + dir[1] * t1];
  return { a: [px - dir[0] * t2, py - dir[1] * t2], b, label: { x: b[0] - dir[1] * 14, y: b[1] + dir[0] * 14 + 5 } };
}

/** left, right, top, bottom in the picture of 300 × 200 units, y downward. */
type Box = [number, number, number, number];
/** A letter of 18 units: 6 to each side, 16 above its baseline and 5 below. */
const labelBox = (line: Line): Box => {
  const { x, y } = drawnLine(line).label;
  return [x - 6, x + 6, y - 16, y + 5];
};
/** A point's letter stands up and to the right of its dot, about 14 wide. */
const letterBox = (p: Point): Box => [150 + p.x + 8, 150 + p.x + 22, 100 - p.y - 21, 100 - p.y - 3];

const boxesMeet = (a: Box, b: Box) => a[0] < b[1] && a[1] > b[0] && a[2] < b[3] && a[3] > b[2];

/** The drawn line (stroke 3) passes through this box. */
function lineMeets(line: Line, [left, right, top, bottom]: Box): boolean {
  const { a, b } = drawnLine(line);
  let from = 0;
  let to = 1;
  for (const [start, size, low, high] of [[a[0], b[0] - a[0], left - 2, right + 2], [a[1], b[1] - a[1], top - 2, bottom + 2]]) {
    if (size === 0) {
      if (start < low || start > high) return false;
      continue;
    }
    const [t1, t2] = [(low - start) / size, (high - start) / size];
    from = Math.max(from, Math.min(t1, t2));
    to = Math.min(to, Math.max(t1, t2));
  }
  return from <= to;
}

/** Every label and every point's letter stands inside the picture, clear of the other lines and of each other. */
function labelsClear(lines: readonly Line[], points: readonly Point[]): boolean {
  const labelled = lines.filter((l) => l.label);
  const boxes = labelled.map(labelBox);
  const letters = points.filter((p) => p.label).map(letterBox);
  if (!boxes.every(([l, r, t, u]) => l >= 0 && r <= 300 && t >= 0 && u <= 200)) return false;
  if (boxes.some((box, i) => boxes.slice(i + 1).some((other) => boxesMeet(box, other)) || letters.some((other) => boxesMeet(box, other)))) return false;
  return lines.every((line) => (!line.label || !boxes.some((box, i) => labelled[i] !== line && lineMeets(line, box))) && !letters.some((box) => lineMeets(line, box)));
}

/**
 * These lines with every label inside the picture and clear of the rest of the drawing, or null if no choice of ends gives that. The angle + 180° with the opposite
 * offset draws the same line, with its label at the other end.
 */
export function placeLabels(lines: readonly Line[], points: readonly Point[] = []): Line[] | null {
  for (let flips = 0; flips < 2 ** lines.length; flips++) {
    if (lines.some((l, i) => !l.label && flips & (1 << i))) continue;
    const placed = lines.map((l, i) => (flips & (1 << i) ? { ...l, angle: (l.angle + 180) % 360, offset: -l.offset } : l));
    if (labelsClear(placed, points)) return placed;
  }
  return null;
}

/** The first drawing of make() whose labels all fit. */
export function fitLabels<T extends { lines: readonly Line[]; points?: readonly Point[] }>(make: () => T): T & { lines: Line[] } {
  for (let i = 0; i < 400; i++) {
    const drawing = make();
    const lines = placeLabels(drawing.lines, drawing.points);
    if (lines) return { ...drawing, lines };
  }
  throw new Error('geometrie: no drawing with its labels clear');
}

/**
 * A labelled point inside the angle in this direction from (cx, cy), as near to the crossing as it can be: the dot and its letter (written up and to the right of
 * the dot) stay clear of all lines and inside the picture of the `lines` visual.
 */
export function spotInAngle(lines: readonly Line[], cx: number, cy: number, direction: number): { x: number; y: number } {
  const a = (direction * Math.PI) / 180;
  const gap = (l: Line, x: number, y: number) => offsetThrough(l.angle, x, y) - l.offset;
  for (let r = 30; r <= 100; r += 2) {
    const mx = cx + r * Math.cos(a);
    const my = cy + r * Math.sin(a);
    const x = Math.round(mx - 7);
    const y = Math.round(my - 8);
    const parts: [number, number, number][] = [[x, y, 7], [x + 8, y + 3, 3], [x + 22, y + 3, 3], [x + 8, y + 19, 3], [x + 22, y + 19, 3]];
    const clear = lines.every((l) => parts.every(([px, py, room]) => Math.abs(gap(l, px, py)) >= room && Math.sign(gap(l, px, py)) === Math.sign(gap(l, mx, my))));
    if (clear && x > -142 && x + 22 < 150 && y > -92 && y + 19 < 100) return { x, y };
  }
  throw new Error('geometrie: no room for a label in this angle');
}

/** The drawn axis names of a coordinate grid do not lie under the letter of this point. 'Rechtswert' stands above the end of the x-axis, 'Hochwert' beside the top of the y-axis. */
export function clearOfAxisNames(grid: { xMin: number; xMax: number; yMax: number }, x: number, y: number): boolean {
  const left = (x - grid.xMin) * 40 + 9;
  const right = left + 14;
  const origin = -grid.xMin * 40;
  const end = (grid.xMax - grid.xMin) * 40 + 18;
  if (y === 0 && right > end - 92) return false;
  return !(y === grid.yMax && left < origin + 12 + 77 && right > origin + 12);
}
