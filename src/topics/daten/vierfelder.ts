/**
 * Vierfeldertafel.
 * Stufe 1: read row and column totals of a complete table.
 * Stufe 2: fill a missing cell, compute totals.
 * Stufe 3: from a text to the table; compare two groups.
 */
import { fmt } from '../../core/format';
import type { Ab, Bug, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, numberBugs, targetAb, type MaybeBug } from '../shared';
import { schoolClass, spoken, type Table } from './common';

const SKILL = { id: 'daten.vierfelder', topicId: 'daten' } as const;
const KMK = ['DZ.diagramme', 'PK.darstellen'];

interface Scene {
  id: string;
  /** Caption of the table: the question its columns ja and nein answer. */
  title: string;
  /** The feature in a table head: 'Anteil: Rad'. */
  head: string;
  /** 'haben ein Rad' after 'Wie viele Kinder'. */
  verbs: readonly [string, string];
}

const SCENES: readonly Scene[] = [
  { id: 'rad', title: 'Eigenes Rad?', head: 'Rad', verbs: ['haben ein Rad', 'haben kein Rad'] },
  { id: 'verein', title: 'Im Sportverein?', head: 'Verein', verbs: ['sind im Verein', 'sind in keinem Verein'] },
  { id: 'fahrt', title: 'Fährt mit zur Klassenfahrt?', head: 'fährt mit', verbs: ['fahren mit', 'bleiben da'] },
  { id: 'tier', title: 'Eigenes Haustier?', head: 'Haustier', verbs: ['haben ein Haustier', 'haben kein Haustier'] },
  { id: 'musik', title: 'Spielt ein Instrument?', head: 'Instrument', verbs: ['spielen ein Instrument', 'spielen kein Instrument'] },
];

/** Short column heads: with Klasse and Summe beside them, the four columns fit a 375 px phone. The caption says what they answer. */
const COLS = ['ja', 'nein'] as const;

/** Children in one school class. */
const CLASS_MIN = 18;
const CLASS_MAX = 32;

const CLASS_PAIRS: readonly (readonly [string, string])[] = [[schoolClass('b'), schoolClass('c')], [schoolClass('d'), schoolClass('e')], [schoolClass('b'), schoolClass('d')], [schoolClass('c'), schoolClass('e')]];

/** The four inner cells: cells[row][col]. */
type Cells = readonly [readonly [number, number], readonly [number, number]];

interface Data {
  scene: Scene;
  rows: readonly [string, string];
  c: Cells;
  rowTotal: [number, number];
  colTotal: [number, number];
  total: number;
}

/** Two classes of a real size, each split into two cells of at least min children. */
function data(rng: Rng, min: number): Data {
  const scene = rng.pick(SCENES);
  const rows = rng.pick(CLASS_PAIRS);
  for (;;) {
    const rowTotal: [number, number] = [rng.int(CLASS_MIN, CLASS_MAX), rng.int(CLASS_MIN, CLASS_MAX)];
    const [yes0, yes1] = [rng.int(min, rowTotal[0] - min), rng.int(min, rowTotal[1] - min)];
    const c: Cells = [[yes0, rowTotal[0] - yes0], [yes1, rowTotal[1] - yes1]];
    const colTotal: [number, number] = [c[0][0] + c[1][0], c[0][1] + c[1][1]];
    const all = [c[0][0], c[0][1], c[1][0], c[1][1]];
    // all four cells differ, and the totals too: a swapped row or column always gives another number
    if (new Set(all).size === 4 && rowTotal[0] !== rowTotal[1] && colTotal[0] !== colTotal[1]) return { scene, rows, c, rowTotal, colTotal, total: rowTotal[0] + rowTotal[1] };
  }
}

/** The table with its Summe row and column. shown: what a cell shows, by [row, col] with 2 = Summe; default the number. */
function tafel(d: Data, shown: (row: number, col: number, value: number) => string = (_r, _c, v) => fmt(v)): Table {
  const cell = (row: number, col: number) => {
    if (row === 2) return col === 2 ? d.total : d.colTotal[col];
    return col === 2 ? d.rowTotal[row] : d.c[row][col];
  };
  const line = (row: number, label: string) => [label, shown(row, 0, cell(row, 0)), shown(row, 1, cell(row, 1)), shown(row, 2, cell(row, 2))];
  return { type: 'table', caption: d.scene.title, header: ['Klasse', COLS[0], COLS[1], 'Summe'], rows: [line(0, d.rows[0]), line(1, d.rows[1]), line(2, 'Summe')] };
}

const cellQ = (d: Data, r: number, c: number) => `Wie viele Kinder der ${d.rows[r]} ${d.scene.verbs[c]}?`;
const rowQ = (d: Data, r: number) => `Wie viele Kinder sind in der ${d.rows[r]}?`;
const colQ = (d: Data, c: number) => `Wie viele Kinder ${d.scene.verbs[c]}?`;

// ─── Stufe 1: Summen lesen ───────────────────────────────────────────────────

/** AB I: one row or column total of a complete table. */
function readTotal(rng: Rng, ab: Ab): Exercise {
  const d = data(rng, 4);
  const byRow = rng.chance(0.5);
  const i = rng.int(0, 1);
  const value = byRow ? d.rowTotal[i] : d.colTotal[i];
  const prompt = byRow ? rowQ(d, i) : colQ(d, i);
  const bugs: MaybeBug[] = byRow
    ? [{ id: 'zelle-statt-summe', match: d.c[i][0], hint: 'Das ist nur ein Feld. Die Summe steht ganz rechts in der Zeile.' }, { id: 'zelle-statt-summe', match: d.c[i][1], hint: 'Das ist nur ein Feld. Die Summe steht ganz rechts in der Zeile.' }, { id: 'zeile-spalte', match: d.colTotal[i], hint: 'Das ist die Summe einer Spalte. Gefragt ist eine Zeile.' }]
    : [{ id: 'zelle-statt-summe', match: d.c[0][i], hint: 'Das ist nur ein Feld. Die Summe steht ganz unten in der Spalte.' }, { id: 'zelle-statt-summe', match: d.c[1][i], hint: 'Das ist nur ein Feld. Die Summe steht ganz unten in der Spalte.' }, { id: 'zeile-spalte', match: d.rowTotal[i], hint: 'Das ist die Summe einer Zeile. Gefragt ist eine Spalte.' }];
  return build(SKILL, 1, {
    key: `${ab}:summe:${d.scene.id}:${byRow}:${i}:${d.rows.join('')}:${d.c.join()}`,
    ab,
    prompt,
    visual: tafel(d),
    answer: { kind: 'number', value },
    hints: [byRow ? `Such die Zeile der ${d.rows[i]}.` : `Such die Spalte „${COLS[i]}“.`, byRow ? 'Die Summe der Zeile steht ganz rechts.' : 'Die Summe der Spalte steht ganz unten.'],
    steps: [byRow ? `Die Zeile ${d.rows[i]} hat die Felder ${fmt(d.c[i][0])} und ${fmt(d.c[i][1])}.` : `Die Spalte hat die Felder ${fmt(d.c[0][i])} und ${fmt(d.c[1][i])}.`, `Die Summe ist ${fmt(value)}.`],
    bugs: numberBugs(bugs, value),
    praise: 'Du hast die Summe in der richtigen Reihe gefunden.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: the total of all, or a total asked for with the second feature. */
function readAllTotal(rng: Rng, ab: Ab): Exercise {
  const d = data(rng, 6);
  const all = rng.chance(0.5);
  const value = all ? d.total : d.colTotal[1];
  const prompt = all ? 'Wie viele Kinder sind es in beiden Klassen zusammen?' : colQ(d, 1);
  const bugs: MaybeBug[] = all
    ? [{ id: 'zeile-spalte', match: d.rowTotal[0], hint: 'Das ist nur eine Klasse. Gefragt sind beide Klassen.' }, { id: 'zeile-spalte', match: d.rowTotal[1], hint: 'Das ist nur eine Klasse. Gefragt sind beide Klassen.' }]
    : [{ id: 'zeile-spalte', match: d.colTotal[0], hint: 'Das ist die andere Spalte. Lies die Spaltenköpfe noch einmal.' }, { id: 'zelle-statt-summe', match: d.c[0][1], hint: 'Das ist nur eine Klasse. Die Summe steht ganz unten.' }];
  return build(SKILL, 1, {
    key: `${ab}:gesamt:${d.scene.id}:${all}:${d.rows.join('')}:${d.c.join()}`,
    ab,
    prompt,
    visual: tafel(d),
    answer: { kind: 'number', value },
    hints: [all ? 'Die Gesamtzahl steht in der Ecke unten rechts.' : `Such die Spalte „${COLS[1]}“.`, all ? 'Zeile und Spalte „Summe“ treffen sich dort.' : 'Die Summe der Spalte steht ganz unten.'],
    steps: [all ? `Zeilen: ${fmt(d.rowTotal[0])} + ${fmt(d.rowTotal[1])} = ${fmt(d.total)}` : `Spalte: ${fmt(d.c[0][1])} + ${fmt(d.c[1][1])} = ${fmt(value)}`, `Die Summe ist ${fmt(value)}.`],
    bugs: numberBugs(bugs, value),
    praise: 'Du hast dich in der Tafel gut orientiert.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB III: compare two totals of a complete table. */
function compareTotals(rng: Rng, ab: Ab): Exercise {
  const d = data(rng, 6);
  const byRow = rng.chance(0.5);
  const totals = byRow ? d.rowTotal : d.colTotal;
  const hi = totals[0] > totals[1] ? 0 : 1;
  const lo = 1 - hi;
  const value = totals[hi] - totals[lo];
  const context = byRow ? undefined : 'Vergleiche die beiden Spalten.';
  const prompt = byRow ? `Wie viele Kinder hat die ${d.rows[hi]} mehr als die ${d.rows[lo]}?` : 'Um wie viele Kinder unterscheiden sich die Summen?';
  return build(SKILL, 1, {
    key: `${ab}:vergleich:${d.scene.id}:${byRow}:${d.rows.join('')}:${d.c.join()}`,
    ab,
    ...(context ? { context } : {}),
    prompt,
    visual: tafel(d),
    answer: { kind: 'number', value },
    hints: ['Such die beiden Summen in der Tafel.', 'Zieh die kleinere Summe von der größeren ab.'],
    steps: [`Die Summen sind ${fmt(totals[hi])} und ${fmt(totals[lo])}.`, `${fmt(totals[hi])} − ${fmt(totals[lo])} = ${fmt(value)}`, `Der Unterschied ist ${fmt(value)}.`],
    bugs: numberBugs([{ id: 'plus-statt-minus', match: d.total, hint: 'Das sind beide Summen zusammen. Gefragt ist der Unterschied.' }], value),
    praise: 'Du hast die Summen gefunden und verglichen.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return readTotal(rng, ab);
  if (ab === 2) return readAllTotal(rng, ab);
  return compareTotals(rng, ab);
}

// ─── Stufe 2: Feld ergänzen, Summen berechnen ────────────────────────────────

/** AB I: one inner cell is missing; its row total is there. */
function missingCell(rng: Rng, ab: Ab): Exercise {
  const d = data(rng, 5);
  const r = rng.int(0, 1);
  const c = rng.int(0, 1);
  const other = d.c[r][1 - c];
  const value = d.c[r][c];
  const prompt = cellQ(d, r, c);
  return build(SKILL, 2, {
    key: `${ab}:feld:${d.scene.id}:${r}:${c}:${d.rows.join('')}:${d.c.join()}`,
    ab,
    prompt,
    visual: tafel(d, (row, col, v) => (row === r && col === c ? '?' : fmt(v))),
    answer: { kind: 'number', value },
    hints: ['Such die Zeile mit dem leeren Feld.', 'Summe minus bekanntes Feld ergibt das leere Feld.'],
    steps: [`In der Zeile ${d.rows[r]} ist die Summe ${fmt(d.rowTotal[r])}.`, `${fmt(d.rowTotal[r])} − ${fmt(other)} = ${fmt(value)}`, `Im leeren Feld steht ${fmt(value)}.`],
    bugs: numberBugs([
      { id: 'plus-statt-minus', match: d.rowTotal[r] + other, hint: 'Die Summe ist schon alles zusammen. Zieh das bekannte Feld ab.' },
      { id: 'falsche-summe', match: d.total - other, hint: 'Nimm die Summe der Zeile oder der Spalte, nicht die Gesamtzahl.' },
      { id: 'zelle-statt-summe', match: d.rowTotal[r], hint: 'Das ist die Summe der ganzen Zeile. Gefragt ist ein Feld.' },
    ], value),
    praise: 'Du hast von der Summe das bekannte Feld abgezogen.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: all totals are missing; write the row totals and the total of all. */
function computeTotals(rng: Rng, ab: Ab): Exercise {
  const d = data(rng, 5);
  const prompt = 'Rechne die Summen aus. Trag die Zahlen ein.';
  const fields = [
    { id: 'z0', value: d.rowTotal[0], before: `Summe ${d.rows[0]}:`, label: `Summe ${d.rows[0]}` },
    { id: 'z1', value: d.rowTotal[1], before: `Summe ${d.rows[1]}:`, label: `Summe ${d.rows[1]}` },
    { id: 'g', value: d.total, before: 'Gesamtzahl:', label: 'Gesamtzahl' },
  ];
  const bugs: Bug[] = [{ id: 'zeile-spalte', match: { z0: d.colTotal[0], z1: d.colTotal[1], g: d.total }, hint: 'Du hast die Spalten addiert. Addiere für jede Klasse die Zeile.' }];
  return build(SKILL, 2, {
    key: `${ab}:summen:${d.scene.id}:${d.rows.join('')}:${d.c.join()}`,
    ab,
    prompt,
    visual: tafel(d, (row, col, v) => (row === 2 || col === 2 ? '?' : fmt(v))),
    answer: { kind: 'multi', fields },
    hints: ['Addiere in jeder Zeile die beiden Felder.', 'Addiere dann die beiden Zeilensummen.'],
    steps: [`${d.rows[0]}: ${fmt(d.c[0][0])} + ${fmt(d.c[0][1])} = ${fmt(d.rowTotal[0])}`, `${d.rows[1]}: ${fmt(d.c[1][0])} + ${fmt(d.c[1][1])} = ${fmt(d.rowTotal[1])}`, `Gesamt: ${fmt(d.rowTotal[0])} + ${fmt(d.rowTotal[1])} = ${fmt(d.total)}`, `Also ${fmt(d.rowTotal[0])}, ${fmt(d.rowTotal[1])} und ${fmt(d.total)}.`],
    bugs,
    praise: 'Du hast Zeile für Zeile addiert.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB III: a chain: the cell asked for needs a total that is itself not shown. */
function chainCell(rng: Rng, ab: Ab): Exercise {
  const d = data(rng, 5);
  // given: c[0][0], rowTotal[0], colTotal[0], total. Asked: c[1][1].
  const value = d.c[1][1];
  const prompt = cellQ(d, 1, 1);
  const shown = (row: number, col: number, v: number) => {
    if (row === 1 && col === 1) return '?';
    if ((row === 0 && col === 0) || (row === 0 && col === 2) || (row === 2 && col === 0) || (row === 2 && col === 2)) return fmt(v);
    return '';
  };
  return build(SKILL, 2, {
    key: `${ab}:kette:${d.scene.id}:${d.rows.join('')}:${d.c.join()}`,
    ab,
    prompt,
    visual: tafel(d, shown),
    answer: { kind: 'number', value },
    hints: ['Fülle zuerst ein anderes leeres Feld aus.', `Rechne dann die Zeile der ${d.rows[1]} aus.`],
    steps: [`Summe ${d.rows[1]}: ${fmt(d.total)} − ${fmt(d.rowTotal[0])} = ${fmt(d.rowTotal[1])}`, `Feld links davon: ${fmt(d.colTotal[0])} − ${fmt(d.c[0][0])} = ${fmt(d.c[1][0])}`, `${fmt(d.rowTotal[1])} − ${fmt(d.c[1][0])} = ${fmt(value)}`, `Im Feld steht ${fmt(value)}.`],
    bugs: numberBugs([
      { id: 'falsche-summe', match: d.total - d.colTotal[0], hint: 'Das ist die ganze Spalte. Gefragt ist nur ein Feld darin.' },
      { id: 'zelle-statt-summe', match: d.rowTotal[1], hint: 'Das ist die ganze Zeile. Gefragt ist nur ein Feld darin.' },
    ], value),
    praise: 'Du hast die Tafel Schritt für Schritt gefüllt.',
    srText: spoken(prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return missingCell(rng, ab);
  if (ab === 2) return computeTotals(rng, ab);
  return chainCell(rng, ab);
}

// ─── Stufe 3: vom Text zur Tafel; zwei Gruppen vergleichen ───────────────────

/** Text with the given data. Everything else follows from it. */
function storyOf(d: Data): string {
  return `In der ${d.rows[0]} und der ${d.rows[1]} sind ${fmt(d.total)} Kinder. Die ${d.rows[0]} hat ${fmt(d.rowTotal[0])} Kinder. ${fmt(d.colTotal[0])} Kinder ${d.scene.verbs[0]}. ${fmt(d.c[0][0])} Kinder der ${d.rows[0]} ${d.scene.verbs[0]}.`;
}

/** The empty table for a text: only labels, plus a mark on the asked cell or letters. */
const emptyTafel = (d: Data, shown: (row: number, col: number) => string): Table => tafel(d, (row, col) => shown(row, col));

/** AB I: one cell from a text; the empty table is there to help. */
function textCell(rng: Rng, ab: Ab): Exercise {
  const d = data(rng, 5);
  const context = storyOf(d);
  const prompt = cellQ(d, 1, 1);
  const value = d.c[1][1];
  return build(SKILL, 3, {
    key: `${ab}:text:${d.scene.id}:${d.rows.join('')}:${d.c.join()}`,
    ab,
    context,
    prompt,
    visual: emptyTafel(d, (row, col) => (row === 1 && col === 1 ? '?' : '')),
    answer: { kind: 'number', value },
    hints: ['Trag die Zahlen aus dem Text in die Tafel ein.', 'Jede Summe minus ein Feld ergibt das andere Feld.'],
    steps: [`Summe ${d.rows[1]}: ${fmt(d.total)} − ${fmt(d.rowTotal[0])} = ${fmt(d.rowTotal[1])}`, `Spalte „${COLS[0]}“: ${fmt(d.colTotal[0])} − ${fmt(d.c[0][0])} = ${fmt(d.c[1][0])}`, `${fmt(d.rowTotal[1])} − ${fmt(d.c[1][0])} = ${fmt(value)}`, `Gesucht sind ${fmt(value)} Kinder.`],
    bugs: numberBugs([
      { id: 'falsche-summe', match: d.total - d.colTotal[0], hint: 'Das ist die ganze Spalte. Trag die Zahlen in die Tafel ein.' },
      { id: 'zelle-statt-summe', match: d.rowTotal[1], hint: 'Das ist die ganze Zeile. Gefragt ist nur ein Feld.' },
    ], value),
    praise: 'Du hast den Text in die Tafel übersetzt.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** AB II: all four cells from a text. */
function textFill(rng: Rng, ab: Ab): Exercise {
  const d = data(rng, 6);
  const context = storyOf(d);
  const prompt = 'Trag die vier Felder A, B, C und D ein.';
  const letters = [['A', 'B'], ['C', 'D']];
  const fields = letters.flatMap((row, r) => row.map((l, c) => ({ id: l, value: d.c[r][c], before: `${l}:`, label: `Feld ${l}` })));
  return build(SKILL, 3, {
    key: `${ab}:textfelder:${d.scene.id}:${d.rows.join('')}:${d.c.join()}`,
    ab,
    context,
    prompt,
    visual: emptyTafel(d, (row, col) => (row < 2 && col < 2 ? letters[row][col] : '')),
    answer: { kind: 'multi', fields },
    hints: ['Schreib die Summen aus dem Text an den Rand der Tafel.', 'Fülle zuerst das Feld mit der genauen Zahl aus dem Text.'],
    steps: [`A steht im Text: ${fmt(d.c[0][0])}`, `B: ${fmt(d.rowTotal[0])} − ${fmt(d.c[0][0])} = ${fmt(d.c[0][1])}`, `C: ${fmt(d.colTotal[0])} − ${fmt(d.c[0][0])} = ${fmt(d.c[1][0])}`, `D: ${fmt(d.rowTotal[1])} − ${fmt(d.c[1][0])} = ${fmt(d.c[1][1])}`, `Also ${fmt(d.c[0][0])}, ${fmt(d.c[0][1])}, ${fmt(d.c[1][0])} und ${fmt(d.c[1][1])}.`],
    bugs: [
      { id: 'zeile-spalte', match: { A: d.c[0][0], B: d.c[1][0], C: d.c[0][1], D: d.c[1][1] }, hint: 'B und C sind vertauscht. Prüfe die Summen jeder Zeile.' },
    ],
    praise: 'Du hast die ganze Tafel aus dem Text aufgebaut.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

const SHARES: readonly { word: string; n: number }[] = [{ word: 'die Hälfte', n: 2 }, { word: 'ein Drittel', n: 3 }, { word: 'ein Viertel', n: 4 }];

/** AB III: compare two groups of different sizes with shares. */
function compareGroups(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(SCENES);
  const rows = rng.pick(CLASS_PAIRS);
  const [s0, s1] = rng.sample(SHARES, 2);
  const classSize = (n: number) => n * rng.int(Math.ceil(CLASS_MIN / n), Math.floor(CLASS_MAX / n));
  let [size0, size1] = [classSize(s0.n), classSize(s1.n)];
  // different classes and different answers; the text does not say which class has more: finding that out is the task
  while (size0 === size1 || size0 / s0.n === size1 / s1.n) [size0, size1] = [classSize(s0.n), classSize(s1.n)];
  const [a, b] = [size0 / s0.n, size1 / s1.n];
  const [hi, lo] = a > b ? [a, b] : [b, a];
  const value = hi - lo;
  const context = `Die Tabelle nennt für jede Klasse einen Anteil. So viele Kinder ${scene.verbs[0]}.`;
  const prompt = `Um wie viele Kinder unterscheiden sich die ${rows[0]} und die ${rows[1]} dabei?`;
  return build(SKILL, 3, {
    key: `${ab}:gruppen:${scene.id}:${rows.join('')}:${size0}:${size1}:${s0.n}:${s1.n}`,
    ab,
    context,
    prompt,
    visual: { type: 'table', caption: scene.title, header: ['Klasse', 'Kinder', `Anteil: ${scene.head}`], rows: [[rows[0], fmt(size0), s0.word], [rows[1], fmt(size1), s1.word]] },
    answer: { kind: 'number', value },
    hints: ['Rechne für jede Klasse zuerst die Anzahl aus.', 'Vergleiche danach die beiden Anzahlen.'],
    steps: [`${rows[0]}: ${fmt(size0)} : ${fmt(s0.n)} = ${fmt(a)}`, `${rows[1]}: ${fmt(size1)} : ${fmt(s1.n)} = ${fmt(b)}`, `${fmt(hi)} − ${fmt(lo)} = ${fmt(value)}`, `Der Unterschied ist ${fmt(value)}.`],
    bugs: numberBugs([
      { id: 'gruppen-groesse', match: Math.abs(size0 - size1), hint: 'Das ist der Unterschied der Klassengrößen. Rechne zuerst die Anteile aus.' },
      { id: 'plus-statt-minus', match: a + b, hint: 'Das sind beide Klassen zusammen. Gefragt ist der Unterschied.' },
    ], value),
    praise: 'Du hast erst die Anteile berechnet und dann verglichen.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return textCell(rng, ab);
  if (ab === 2) return textFill(rng, ab);
  return compareGroups(rng, ab);
}

// ─── Skill ───────────────────────────────────────────────────────────────────

const BY_STUFE: Record<Stufe, (rng: Rng, ab: Ab) => Exercise> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const vierfelderSkill: SkillDef = {
  ...SKILL,
  title: 'Vierfeldertafel',
  description: 'Du liest und ergänzt eine Tafel mit zwei Merkmalen.',
  stufen: {
    1: 'Summen der Zeilen und Spalten ablesen',
    2: 'Ein Feld ergänzen, Summen berechnen',
    3: 'Vom Text zur Tafel, zwei Gruppen vergleichen',
  },
  kmk: ['DZ.diagramme', 'PK.darstellen', 'PK.problemloesen', 'PK.modellieren'],
  generate(rng, stufe, ctx) {
    return BY_STUFE[stufe](rng, targetAb(rng, stufe, ctx));
  },
};
