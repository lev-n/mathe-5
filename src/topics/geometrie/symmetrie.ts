/**
 * Achsensymmetrie (docs/research.md §6). Stufe 1: symmetric or not, counting axes of simple figures. Stufe 2: mirroring on the grid at a vertical axis.
 * Stufe 3: a diagonal axis and the axes of special Vierecke. Axis has no diagonal orientation, so a diagonal axis is named in the task and marked in a small
 * picture of the same grid. The catalogue's title and description use Achsensymmetrie and Symmetrieachsen (T8 allowlist); the tasks say symmetrisch and Spiegelachsen.
 */
import { toSpeech } from '../../core/format';
import type { Ab, Cell, ChoiceOption, Exercise, Rng, ShapeKind, SkillDef, Stufe, Visual, VisualOf } from '../../core/types';
import { build, makeChoice, targetAb } from '../shared';
import { labelledChoice, yesNo } from './helpers';

const SKILL = { id: 'geometrie.symmetrie', topicId: 'geometrie' } as const;
const KMK = ['RF.symmetrie'];

const ck = (c: Cell) => `${c[0]},${c[1]}`;
const sortCells = (cells: readonly Cell[]): Cell[] => [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
const cellsId = (cells: readonly Cell[]) => sortCells(cells).map((c) => `${c[0]}.${c[1]}`).join('-');
const NEIGHBOURS: readonly Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** A connected figure of n cells among those `allowed` accepts, grown from `start`. */
function grow(rng: Rng, n: number, start: Cell, allowed: (c: Cell) => boolean): Cell[] {
  const cells: Cell[] = [start];
  const seen = new Set([ck(start)]);
  for (let guard = 0; cells.length < n && guard < 200; guard++) {
    const free = cells.flatMap(([x, y]) => NEIGHBOURS.map(([dx, dy]): Cell => [x + dx, y + dy])).filter((c) => allowed(c) && !seen.has(ck(c)));
    if (free.length === 0) break;
    const next = rng.pick(free);
    seen.add(ck(next));
    cells.push(next);
  }
  return cells;
}

function connected(cells: readonly Cell[]): boolean {
  if (cells.length === 0) return false;
  const all = new Set(cells.map(ck));
  const seen = new Set([ck(cells[0])]);
  const stack: Cell[] = [cells[0]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of NEIGHBOURS) {
      const k = `${x + dx},${y + dy}`;
      if (all.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push([x + dx, y + dy]);
      }
    }
  }
  return seen.size === all.size;
}

const mirrorV = ([x, y]: Cell, at: number): Cell => [2 * at - 1 - x, y];
const mirrorMain = ([x, y]: Cell): Cell => [y, x];
const mirrorAnti = ([x, y]: Cell, n: number): Cell => [n - 1 - y, n - 1 - x];

export function symmetricAt(cells: readonly Cell[], at: number): boolean {
  const all = new Set(cells.map(ck));
  return cells.every((c) => all.has(ck(mirrorV(c, at))));
}

/** The axes of a figure on the grid: vertical, horizontal and, in a square box, both diagonals. */
export function countAxes(cells: readonly Cell[]): number {
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(...xs) - x0 + 1;
  const h = Math.max(...ys) - y0 + 1;
  const box = cells.map(([x, y]): Cell => [x - x0, y - y0]);
  const all = new Set(box.map(ck));
  const fits = (f: (c: Cell) => Cell) => box.every((c) => all.has(ck(f(c))));
  let n = 0;
  if (fits(([x, y]) => [w - 1 - x, y])) n++;
  if (fits(([x, y]) => [x, h - 1 - y])) n++;
  if (w === h && fits(mirrorMain)) n++;
  if (w === h && fits((c) => mirrorAnti(c, w))) n++;
  return n;
}

type Variant = 'sym' | 'fehlt' | 'extra' | 'verschoben';

interface Figure {
  visual: VisualOf<'grid'>;
  variant: Variant;
  cells: Cell[];
}

/** A figure around a vertical axis on a grid with a margin of 1: half of it mirrored, or a near miss. Half width k. */
function figure(rng: Rng, k: number, rows: number, cellsInHalf: [number, number], variant: Variant): Figure {
  for (let i = 0; ; i++) {
    const n = rng.int(cellsInHalf[0], cellsInHalf[1]);
    const half = grow(rng, n, [k - 1, rng.int(0, rows - 1)], ([x, y]) => x >= 0 && x < k && y >= 0 && y < rows);
    const full = [...half, ...half.map((c) => mirrorV(c, k))];
    let cells = full;
    if (variant === 'fehlt') {
      const right = rng.shuffle(full.filter((c) => c[0] >= k));
      const drop = right.find((c) => connected(full.filter((d) => d !== c)) && full.length > 3);
      if (!drop) continue;
      cells = full.filter((c) => c !== drop);
    } else if (variant === 'extra') {
      const all = new Set(full.map(ck));
      const free = rng.shuffle(full.flatMap(([x, y]) => NEIGHBOURS.map(([dx, dy]): Cell => [x + dx, y + dy]))).filter((c) => !all.has(ck(c)) && c[0] >= k && c[0] < 2 * k && c[1] >= 0 && c[1] < rows);
      if (free.length === 0) continue;
      cells = [...full, free[0]];
    } else if (variant === 'verschoben') {
      cells = [...half, ...half.map(([x, y]): Cell => [x + k, y])];
    }
    const placed = sortCells(cells.map(([x, y]): Cell => [x + 1, y + 1]));
    if (symmetricAt(placed, k + 1) === (variant === 'sym') || i > 400) {
      if (symmetricAt(placed, k + 1) !== (variant === 'sym')) throw new Error('symmetrie: no figure');
      return { cells: placed, variant, visual: { type: 'grid', width: 2 * k + 2, height: rows + 2, cells: placed, axis: { orientation: 'vertical', at: k + 1 }, showOutline: true } };
    }
  }
}

const WHY_SHIFTED = 'Das Bild klappt um. Links wird zu rechts, nicht nur weiter rechts.';
const WHY_LONELY = 'Falte im Kopf an der Linie. Ein Kästchen trifft auf keinen Partner.';
const WHY_FITS = 'Prüfe jede Reihe: Jedes Kästchen hat auf der anderen Seite einen Partner.';
const whyYesFor = (v: Variant) => (v === 'verschoben' ? WHY_SHIFTED : WHY_LONELY);

function resultText(v: Variant): string {
  if (v === 'sym') return 'Die Figur ist symmetrisch zur Linie.';
  return v === 'verschoben' ? 'Die Hälften sind verschoben. Die Figur ist nicht symmetrisch zur Linie.' : 'Ein Kästchen hat keinen Partner. Die Figur ist nicht symmetrisch zur Linie.';
}

const cellsSpeech = (cells: readonly Cell[]) => cells.map(([x, y]) => `Zeile ${y + 1} Spalte ${x + 1}`).join(', ');

/** Stufe 1, AB I: symmetric to the drawn line? */
function isSymmetric(rng: Rng, ab: Ab): Exercise {
  const variant = rng.pick<Variant>(['sym', 'sym', 'sym', 'fehlt', 'extra', 'verschoben']);
  const f = figure(rng, 3, rng.int(3, 4), [3, 5], variant);
  return build(SKILL, 1, {
    key: `ja-nein:${variant}:${cellsId(f.cells)}`,
    ab,
    prompt: 'Ist die Figur symmetrisch zur gestrichelten Linie?',
    visual: f.visual,
    answer: yesNo(rng, variant === 'sym', whyYesFor(variant), WHY_FITS),
    hints: ['Falte die Figur im Kopf an der gestrichelten Linie.', 'Prüfe Reihe für Reihe: Hat jedes Kästchen einen Partner?'],
    steps: ['Falte die Figur im Kopf an der Linie.', 'Jedes Kästchen braucht auf der anderen Seite einen Partner.', resultText(variant)],
    praise: rng.pick(['Du hast Reihe für Reihe verglichen.', 'Du hast im Kopf an der Linie gefaltet.']),
    srText: toSpeech(`Ein Kästchengitter mit einer senkrechten Linie zwischen Spalte ${f.visual.axis!.at} und ${f.visual.axis!.at + 1}. Angemalt: ${cellsSpeech(f.cells)}. Ist die Figur symmetrisch zu dieser Linie?`),
    kmk: KMK,
  });
}

const VERY_MANY = 'sehr viele';
/** The result of counting axes, as a sentence. */
const axesResult = (subject: string, label: string) => (label === '0' ? `${subject} hat keine Spiegelachse.` : label === '1' ? `${subject} hat 1 Spiegelachse.` : `${subject} hat ${label} Spiegelachsen.`);
const SIMPLE: { shape: ShapeKind; label: string; speech: string }[] = [
  { shape: 'quadrat', label: '4', speech: 'Ein Quadrat.' },
  { shape: 'rechteck', label: '2', speech: 'Ein Rechteck, kein Quadrat.' },
  { shape: 'gleichseitiges-dreieck', label: '3', speech: 'Ein Dreieck mit drei gleich langen Seiten.' },
  { shape: 'kreis', label: VERY_MANY, speech: 'Ein Kreis.' },
];

/** Stufe 1, AB II: count the axes of a simple figure, drawn as a shape or on the grid. */
function countSimple(rng: Rng, ab: Ab): Exercise {
  const hints = ['Falte die Figur im Kopf. Passen beide Hälften genau aufeinander?', 'Probiere senkrecht, waagerecht und schräg.'];
  const why = 'Probiere alle Richtungen aus: senkrecht, waagerecht und schräg.';
  const prompt = 'Wie viele Spiegelachsen hat diese Figur?';
  if (rng.chance(0.4)) {
    const item = rng.pick(SIMPLE);
    const order = ['1', '2', '3', '4', VERY_MANY];
    return build(SKILL, 1, {
      key: `achsen-form:${item.shape}`,
      ab,
      prompt,
      visual: { type: 'shape', shape: item.shape },
      answer: makeChoice(rng, { label: item.label }, order.filter((l) => l !== item.label).map((label) => ({ label, whyWrong: why })), { order, max: order.length }),
      hints,
      steps: ['Falte die Figur im Kopf in alle Richtungen.', { text: 'So passen die Hälften genau aufeinander.', visual: { type: 'shape', shape: item.shape, showAxes: true } }, axesResult('Die Figur', item.label)],
      praise: 'Du hast in alle Richtungen gefaltet.',
      srText: toSpeech(`${item.speech} ${prompt}`),
      kmk: KMK,
    });
  }
  const want = rng.int(0, 2);
  let cells: Cell[] = [];
  let count = 0;
  for (let i = 0; i < 400; i++) {
    const half = grow(rng, rng.int(2, 4), [2, 2], ([x, y]) => x >= 0 && x < 3 && y >= 0 && y < 3);
    const one = [...half, ...half.map((c) => mirrorV(c, 3))];
    const both = [...one, ...one.map(([x, y]): Cell => [x, 5 - y])];
    const lop = grow(rng, rng.int(4, 6), [2, 2], ([x, y]) => x >= 0 && x < 5 && y >= 0 && y < 5);
    const picked = want === 0 ? lop : want === 1 ? one : both;
    cells = sortCells([...new Map(picked.map((c) => [ck(c), c])).values()]);
    count = countAxes(cells);
    if (count === want && connected(cells)) break;
  }
  const order = ['0', '1', '2', '4'];
  const label = String(count);
  return build(SKILL, 1, {
    key: `achsen-gitter:${cellsId(cells)}`,
    ab,
    prompt,
    visual: { type: 'grid', width: 6, height: 6, cells, showOutline: true },
    answer: makeChoice(rng, { label }, order.filter((l) => l !== label).map((l) => ({ label: l, whyWrong: why })), { order }),
    hints,
    steps: ['Falte die Figur im Kopf: senkrecht, waagerecht und schräg.', count === 0 ? 'Bei keiner Faltung passen die Hälften.' : 'Zähle die Faltungen mit passenden Hälften.', axesResult('Die Figur', label)],
    praise: 'Du hast jede Faltung einzeln geprüft.',
    srText: toSpeech(`Ein Kästchengitter mit einer Figur. Angemalt: ${cellsSpeech(cells)}. ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: reversed. Which of the figures is symmetric? */
function findSymmetric(rng: Rng, ab: Ab): Exercise {
  const rows = rng.int(3, 4);
  const variants = rng.shuffle<Variant>(['sym', 'fehlt', 'extra', 'verschoben']);
  const labels = ['A', 'B', 'C', 'D'];
  const figures = variants.map((v) => figure(rng, 2, rows, [2, 4], v));
  const right = variants.indexOf('sym');
  const wrongs: ChoiceOption[] = figures.flatMap((f, i) => (i === right ? [] : [{ label: labels[i], visual: f.visual, whyWrong: whyYesFor(f.variant) }]));
  return build(SKILL, 1, {
    key: `finden:${figures.map((f) => cellsId(f.cells)).join('/')}`,
    ab,
    prompt: 'Welche Figur ist symmetrisch zur gestrichelten Linie?',
    answer: labelledChoice(rng, { label: labels[right], visual: figures[right].visual }, wrongs, labels, 'grid'),
    hints: ['Falte jede Figur im Kopf an der Linie.', 'Hat jedes Kästchen auf der anderen Seite einen Partner?'],
    steps: ['Prüfe jede Figur Reihe für Reihe.', 'Nur eine Figur hat zu jedem Kästchen einen Partner.', `Figur ${labels[right]} ist symmetrisch.`],
    praise: 'Du hast alle vier Figuren geprüft.',
    srText: toSpeech(`Vier Figuren im Kästchengitter, jede mit einer senkrechten Linie. ${figures.map((f, i) => `Figur ${labels[i]}: ${cellsSpeech(f.cells)}`).join('. ')}. Welche Figur ist symmetrisch zur Linie?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const MIRROR_HINTS = ['Zähle bei jedem Kästchen den Abstand zur Linie.', 'Das Spiegelbild liegt genauso weit entfernt, auf der anderen Seite.'];

function mirrorExercise(rng: Rng, ab: Ab, given: Cell[], solution: Cell[], height: number, form: string, prompt: string): Exercise {
  const example = solution[0];
  const source = mirrorV(example, 3);
  const done: Visual = { type: 'grid', width: 6, height, cells: sortCells([...given, ...solution]), axis: { orientation: 'vertical', at: 3 } };
  return build(SKILL, 2, {
    key: `${form}:${height}:${cellsId(given)}`,
    ab,
    prompt,
    answer: { kind: 'cells', width: 6, height, given: sortCells(given), solution: sortCells(solution), axis: { orientation: 'vertical', at: 3 } },
    hints: [...MIRROR_HINTS, 'Das Bild klappt um. Links wird zu rechts.'],
    steps: ['Spiegle ein Kästchen nach dem anderen.', `Beispiel: Zeile ${source[1] + 1}, Spalte ${source[0] + 1} hat das Spiegelbild in Spalte ${example[0] + 1}.`, { text: `Du malst ${solution.length} Kästchen an.`, visual: done }],
    praise: rng.pick(['Du hast die Abstände zur Linie genau übertragen.', 'Du hast Reihe für Reihe gespiegelt.']),
    srText: toSpeech(`Ein Kästchengitter mit 6 Spalten und ${height} Zeilen. Eine gestrichelte senkrechte Linie liegt zwischen Spalte 3 und 4. Schon angemalt: ${cellsSpeech(sortCells(given))}. ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB I: the half on the left touches the axis. */
function mirrorTouching(rng: Rng, ab: Ab): Exercise {
  const height = rng.int(4, 6);
  const given = grow(rng, rng.int(3, 5), [2, rng.int(0, height - 1)], ([x, y]) => x >= 0 && x < 3 && y >= 0 && y < height);
  return mirrorExercise(rng, ab, given, given.map((c) => mirrorV(c, 3)), height, 'links', 'Male das Spiegelbild an. Die gestrichelte Linie ist die Spiegelachse.');
}

/** Stufe 2, AB II: more cells, on either side, not always at the axis. */
function mirrorApart(rng: Rng, ab: Ab): Exercise {
  const height = rng.int(4, 6);
  const start: Cell = [rng.int(0, 1), rng.int(0, height - 1)];
  const left = grow(rng, rng.int(4, 6), start, ([x, y]) => x >= 0 && x < 2 && y >= 0 && y < height);
  const fromRight = rng.chance(0.5);
  const given = fromRight ? left.map((c) => mirrorV(c, 3)) : left;
  return mirrorExercise(rng, ab, given, given.map((c) => mirrorV(c, 3)), height, fromRight ? 'rechts' : 'abstand', 'Male das Spiegelbild an. Die gestrichelte Linie ist die Spiegelachse.');
}

/** Stufe 2, AB III: cells are missing on both sides. */
function mirrorGaps(rng: Rng, ab: Ab): Exercise {
  const height = rng.int(4, 6);
  const half = grow(rng, rng.int(4, 6), [2, rng.int(0, height - 1)], ([x, y]) => x >= 0 && x < 3 && y >= 0 && y < height);
  const [a, b, c] = rng.shuffle(half);
  const solution: Cell[] = [mirrorV(a, 3), b, ...(c && rng.chance(0.5) ? [mirrorV(c, 3)] : [])];
  const missing = new Set(solution.map(ck));
  const given = [...half, ...half.map((d) => mirrorV(d, 3))].filter((d) => !missing.has(ck(d)));
  return mirrorExercise(rng, ab, given, solution, height, 'luecken', 'Male die fehlenden Kästchen an. Dann ist die Figur symmetrisch zur Linie.');
}

const VIERECK_AXES: { shape: ShapeKind; label: string; name: string; draw: boolean }[] = [
  { shape: 'quadrat', label: '4', name: 'ein Quadrat', draw: true },
  { shape: 'rechteck', label: '2', name: 'ein Rechteck, kein Quadrat', draw: true },
  { shape: 'raute', label: '2', name: 'eine Raute, kein Quadrat', draw: true },
  { shape: 'parallelogramm', label: '0', name: 'ein schiefes Parallelogramm', draw: false },
  { shape: 'drachen', label: '1', name: 'ein Drachenviereck, keine Raute', draw: false },
  { shape: 'trapez', label: '1', name: 'ein Trapez mit zwei gleich langen schrägen Seiten', draw: false },
];
const AXIS_WORD: Record<string, string> = {
  quadrat: 'Zwei Achsen laufen durch die Seitenmitten, zwei durch die Ecken.',
  rechteck: 'Beide Achsen laufen durch die Seitenmitten, keine durch die Ecken.',
  raute: 'Beide Achsen laufen durch die Ecken.',
  parallelogramm: 'Keine Faltung passt. Die Hälften sind schief zueinander.',
  drachen: 'Die Achse läuft durch die Spitze und die Ecke gegenüber.',
  trapez: 'Die Achse läuft durch die Mitten der parallelen Seiten.',
};

/** Stufe 3, AB I: the axes of a special Viereck. The text names it: a turned Raute and a turned Quadrat can look alike, and their answers differ. */
function axesOfViereck(rng: Rng, ab: Ab): Exercise {
  const item = rng.pick(VIERECK_AXES);
  const rotate = rng.pick([0, 15, 30, 45, 60, 345, 330]);
  const order = ['0', '1', '2', '4'];
  const why = 'Falte auch schräg, durch die Ecken. Prüfe: Passen die Hälften genau?';
  const question = 'Wie viele Spiegelachsen hat dieses Viereck?';
  const prompt = `Das ist ${item.name}. ${question}`;
  return build(SKILL, 3, {
    key: `viereck:${item.shape}:${rotate}`,
    ab,
    prompt,
    visual: { type: 'shape', shape: item.shape, rotate, named: true },
    answer: makeChoice(rng, { label: item.label }, order.filter((l) => l !== item.label).map((label) => ({ label, whyWrong: why })), { order }),
    hints: ['Prüfe Faltungen durch die Seitenmitten.', 'Prüfe auch Faltungen durch die Ecken.'],
    steps: ['Falte durch die Seitenmitten und durch die Ecken.', item.draw ? { text: AXIS_WORD[item.shape], visual: { type: 'shape', shape: item.shape, showAxes: true, named: true } } : AXIS_WORD[item.shape], axesResult('Das Viereck', item.label)],
    praise: rng.pick(['Du hast auch durch die Ecken gefaltet.', 'Du hast jede Faltung einzeln geprüft.']),
    srText: toSpeech(`Das ist ${item.name}.${rotate ? ' Die Figur ist gedreht.' : ''} ${question}`),
    kmk: KMK,
  });
}

const AXIS_TEXT = { main: 'Die Spiegelachse läuft schräg von der Ecke oben links zur Ecke unten rechts.', anti: 'Die Spiegelachse läuft schräg von der Ecke oben rechts zur Ecke unten links.' };

/** Stufe 3, AB II: mirror at a diagonal of the grid. */
function mirrorDiagonal(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(5, 6);
  const main = rng.chance(0.5);
  const side = (c: Cell) => c[0] >= 0 && c[1] >= 0 && c[0] < n && c[1] < n && (main ? c[0] < c[1] : c[0] + c[1] < n - 1);
  const mirror = (c: Cell) => (main ? mirrorMain(c) : mirrorAnti(c, n));
  const start: Cell = main ? [rng.int(0, n - 2), n - 1] : [0, rng.int(0, n - 2)];
  const given = grow(rng, rng.int(3, 5), start, side);
  const solution = given.map(mirror);
  const line: Cell[] = Array.from({ length: n }, (_, i): Cell => (main ? [i, i] : [n - 1 - i, i]));
  const example = given[0];
  const image = mirror(example);
  return build(SKILL, 3, {
    key: `diagonal:${main ? 'haupt' : 'neben'}:${n}:${cellsId(given)}`,
    ab,
    prompt: `${main ? AXIS_TEXT.main : AXIS_TEXT.anti} Male das Spiegelbild an.`,
    visual: { type: 'grid', width: n, height: n, cells: line, caption: 'So läuft die Achse' },
    answer: { kind: 'cells', width: n, height: n, given: sortCells(given), solution: sortCells(solution) },
    hints: main ? ['Bei dieser schrägen Achse tauschen Zeile und Spalte ihre Plätze.', 'Prüfe jedes Kästchen einzeln.'] : ['Zähle die Kästchen schräg bis zur Achse.', 'Das Spiegelbild liegt auf der anderen Seite gleich weit weg.'],
    steps: ['Spiegle ein Kästchen nach dem anderen an der schrägen Achse.', `Beispiel: Zeile ${example[1] + 1}, Spalte ${example[0] + 1} geht nach Zeile ${image[1] + 1}, Spalte ${image[0] + 1}.`, { text: `Du malst ${solution.length} Kästchen an.`, visual: { type: 'grid', width: n, height: n, cells: sortCells([...given, ...solution]) } }],
    praise: rng.pick(['Du hast an der schrägen Achse genau gespiegelt.', 'Du hast Zeile und Spalte sicher zugeordnet.']),
    srText: toSpeech(`Ein Kästchengitter mit ${n} Spalten und ${n} Zeilen. ${main ? AXIS_TEXT.main : AXIS_TEXT.anti} Schon angemalt: ${cellsSpeech(sortCells(given))}. Male das Spiegelbild an.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

const DIAGONALS: { shape: ShapeKind; name: string; yes: boolean; why: string; speech: string }[] = [
  { shape: 'quadrat', name: 'bei einem Quadrat', yes: true, why: 'Beim Falten an der Diagonale passen die zwei Dreiecke genau aufeinander.', speech: 'Ein Quadrat.' },
  { shape: 'rechteck', name: 'bei einem Rechteck', yes: false, why: 'Falte an der Diagonale: Die Ecken landen neben dem Rechteck.', speech: 'Ein Rechteck, kein Quadrat.' },
  { shape: 'raute', name: 'bei einer Raute', yes: true, why: 'Alle Seiten sind gleich lang. Die Hälften passen genau aufeinander.', speech: 'Eine Raute.' },
  { shape: 'parallelogramm', name: 'bei einem Parallelogramm', yes: false, why: 'Falte an der Diagonale: Die Ecken landen neben der Figur.', speech: 'Ein schiefes Parallelogramm.' },
];

/** Stufe 3, AB III: reasoning about a diagonal, on a Viereck or on a figure of the grid. */
function diagonalReasoning(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.5)) {
    const d = rng.pick(DIAGONALS);
    const prompt = `Ist ${d.name} jede Diagonale eine Spiegelachse?`;
    return build(SKILL, 3, {
      key: `diagonale:${d.shape}`,
      ab,
      prompt,
      visual: { type: 'shape', shape: d.shape, named: true },
      answer: yesNo(rng, d.yes, d.why, d.why),
      hints: ['Eine Diagonale verbindet zwei Ecken gegenüber.', 'Falte im Kopf an der Diagonale. Passen die Hälften genau?'],
      steps: ['Falte die Figur im Kopf an einer Diagonale.', d.why, `Die Antwort ist ${d.yes ? 'Ja' : 'Nein'}.`],
      praise: 'Du hast die Faltung an der Diagonale geprüft.',
      srText: toSpeech(`${d.speech} ${prompt}`),
      kmk: [...KMK, 'PK.argumentieren'],
    });
  }
  const n = 5;
  const half = grow(rng, rng.int(3, 4), [rng.int(0, 2), rng.int(3, 4)], (c) => c[0] >= 0 && c[1] < n && c[0] < c[1]);
  const full = [...half, ...half.map(mirrorMain)];
  const yes = rng.chance(0.5);
  const dropped = yes ? null : rng.pick(half.map(mirrorMain));
  const cells = sortCells(dropped ? full.filter((c) => ck(c) !== ck(dropped)) : full);
  const prompt = `${AXIS_TEXT.main} Ist die Figur dazu symmetrisch?`;
  return build(SKILL, 3, {
    key: `diagonale-gitter:${cellsId(cells)}`,
    ab,
    prompt,
    visual: { type: 'grid', width: n, height: n, cells, showOutline: true },
    answer: yesNo(rng, yes, 'Falte im Kopf an der Achse. Ein Kästchen trifft auf keinen Partner.', 'Tausche bei jedem Kästchen Zeile und Spalte. Dort liegt immer ein Partner.'),
    hints: ['Bei dieser Achse tauschen Zeile und Spalte ihre Plätze.', 'Prüfe jedes Kästchen: Ist sein Spiegelbild auch angemalt?'],
    steps: ['Tausche bei jedem Kästchen Zeile und Spalte.', yes ? 'Jedes Spiegelbild ist angemalt.' : 'Ein Spiegelbild ist nicht angemalt.', `Die Figur ist ${yes ? '' : 'nicht '}symmetrisch zu dieser Achse.`],
    praise: 'Du hast jedes Kästchen an der Achse gespiegelt.',
    srText: toSpeech(`Ein Kästchengitter mit 5 Spalten und 5 Zeilen. Angemalt: ${cellsSpeech(cells)}. ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: isSymmetric, 2: countSimple, 3: findSymmetric },
  2: { 1: mirrorTouching, 2: mirrorApart, 3: mirrorGaps },
  3: { 1: axesOfViereck, 2: mirrorDiagonal, 3: diagonalReasoning },
};

export const symmetrieSkill: SkillDef = {
  ...SKILL,
  title: 'Achsensymmetrie',
  description: 'Du findest Symmetrieachsen und spiegelst Figuren.',
  stufen: {
    1: 'Symmetrisch oder nicht; Achsen einfacher Figuren zählen',
    2: 'Auf dem Gitter spiegeln, senkrechte Achse',
    3: 'Schräge Achse; Achsen besonderer Vierecke',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
