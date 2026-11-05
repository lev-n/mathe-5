/**
 * Strichlisten und Tabellen.
 * Stufe 1: from an Urliste to a Strichliste (at most 30 values).
 * Stufe 2: frequency tables with ranges like 0–4, 5–9.
 * Stufe 3: which question can the list answer?
 */
import { fmt } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, numberBugs, targetAb, type MaybeBug } from '../shared';
import { bundleLine, listLine, listTable, partition, schoolClass, spoken, sum, sumLine, type Tally } from './common';

const SKILL = { id: 'daten.strichliste', topicId: 'daten' } as const;
const KMK = ['DZ.erheben', 'PK.darstellen'];

const BUG_BUNDLE_FOUR = 'Ein Fünferbündel hat 5 Striche: vier senkrecht und einen quer.';
const BUG_BUNDLE_ONE = 'Ein Bündel zählt 5, nicht 1. Zähle in Schritten von 5.';

const asFour = (count: number) => count - Math.floor(count / 5);
const asOne = (count: number) => Math.floor(count / 5) + (count % 5);

const bundleBugs = (count: number): MaybeBug[] => [
  { id: 'buendel-vier', match: asFour(count), hint: BUG_BUNDLE_FOUR },
  { id: 'buendel-eins', match: asOne(count), hint: BUG_BUNDLE_ONE },
];

interface WordList {
  id: string;
  title: string;
  cats: readonly string[];
}

/** Words short enough for five columns of a phone. */
const WORD_LISTS: readonly WordList[] = [
  { id: 'schulweg', title: 'Schulweg', cats: ['Bus', 'Rad', 'Fuß', 'Auto'] },
  { id: 'farbe', title: 'Lieblingsfarbe', cats: ['rot', 'blau', 'grün', 'gelb'] },
  { id: 'snack', title: 'Pausensnack', cats: ['Apfel', 'Brot', 'Keks', 'Nuss'] },
  { id: 'sport', title: 'Sport-AG', cats: ['Judo', 'Tanz', 'Ball', 'Lauf'] },
];

function wordData(rng: Rng, n: number, k: number) {
  const list = rng.pick(WORD_LISTS);
  const cats = rng.sample(list.cats, k);
  const counts = partition(rng, n, k);
  const values = rng.shuffle(cats.flatMap((c, i) => Array.from<string>({ length: counts[i] }).fill(c)));
  return { list, cats, counts, values };
}

const tally = (cats: readonly string[], counts: readonly number[], title?: string): Tally => ({
  type: 'tally',
  ...(title ? { title } : {}),
  rows: cats.map((label, i) => ({ label, count: counts[i] })),
});

// ─── Stufe 1: Urliste → Strichliste ──────────────────────────────────────────

/** AB I: count one word in a short Urliste. */
function countWord(rng: Rng, ab: Ab): Exercise {
  const { list, cats, counts, values } = wordData(rng, rng.int(10, 15), 3);
  const t = rng.int(0, 2);
  const prompt = `Wie oft steht „${cats[t]}“ in der Urliste?`;
  return build(SKILL, 1, {
    key: `${ab}:wort:${list.id}:${cats[t]}:${values.join('')}`,
    ab,
    prompt,
    visual: listTable(`Urliste: ${list.title}`, values),
    answer: { kind: 'number', value: counts[t] },
    hints: [`Geh die Urliste Wert für Wert durch. Mach bei „${cats[t]}“ einen Strich.`, 'Bündle immer fünf Striche. So zählst du leichter.'],
    steps: [{ text: 'So sieht die Strichliste aus.', visual: tally(cats, counts) }, `Bei „${cats[t]}“: ${bundleLine(counts[t])}`, `„${cats[t]}“ steht ${fmt(counts[t])}-mal in der Urliste.`],
    bugs: numberBugs([{ id: 'alle-gezaehlt', match: values.length, hint: `Zähle nur die Werte „${cats[t]}“, nicht alle.` }], counts[t]),
    praise: 'Du hast die Urliste Wert für Wert geprüft.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB I: read one row of a Strichliste. */
function readTally(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(WORD_LISTS);
  const k = rng.int(3, 4);
  const cats = rng.sample(list.cats, k);
  const counts = partition(rng, rng.int(24, 30), k, 3);
  const t = rng.pick(counts.map((c, i) => (c >= 6 ? i : -1)).filter((i) => i >= 0));
  const prompt = `Wie viele Striche stehen bei „${cats[t]}“?`;
  return build(SKILL, 1, {
    key: `${ab}:lesen:${list.id}:${cats.join('')}:${counts.join()}`,
    ab,
    prompt,
    visual: tally(cats, counts, list.title),
    answer: { kind: 'number', value: counts[t] },
    hints: ['Ein Bündel hat 5 Striche. Zähle die Bündel in Schritten von 5.', 'Zähle danach die einzelnen Striche dazu.'],
    steps: [`Zähle in Schritten von 5: ${bundleLine(counts[t])}`, `Bei „${cats[t]}“ stehen ${fmt(counts[t])} Striche.`],
    bugs: numberBugs(bundleBugs(counts[t]), counts[t]),
    praise: 'Du hast in Schritten von 5 gezählt.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: count every word of a longer Urliste. */
function fillCounts(rng: Rng, ab: Ab): Exercise {
  const { list, cats, counts, values } = wordData(rng, rng.int(18, 24), 3);
  const prompt = 'Zähle die Werte der Urliste. Trag die Anzahlen ein.';
  return build(SKILL, 1, {
    key: `${ab}:fuellen:${list.id}:${values.join('')}`,
    ab,
    prompt,
    visual: listTable(`Urliste: ${list.title}`, values),
    answer: { kind: 'multi', fields: cats.map((c, i) => ({ id: `w${i}`, value: counts[i], before: `${c}:`, label: c })) },
    hints: ['Mach für jeden Wert einen Strich in der passenden Zeile.', `Prüfe am Ende: Alle Anzahlen ergeben zusammen ${fmt(values.length)}.`],
    steps: [{ text: 'So sieht die Strichliste aus.', visual: tally(cats, counts) }, `Probe: ${sumLine(counts)}`, `${cats.map((c, i) => `${c}: ${fmt(counts[i])}`).join(', ')}.`],
    praise: 'Du hast jeden Wert einmal gezählt und die Summe geprüft.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: which Strichliste belongs to the Urliste? Two near misses, each with one value moved to another row. */
function matchTally(rng: Rng, ab: Ab): Exercise {
  const { list, cats, counts, values } = wordData(rng, rng.int(15, 20), 3);
  const moved = (from: number, to: number) => counts.map((c, i) => (i === from ? c - 1 : i === to ? c + 1 : c));
  const wrongs: [number[], number][] = [[moved(0, 1), 0], [moved(2, 0), 2]];
  const shuffled = rng.shuffle<{ counts: number[]; off: number | null }>([{ counts, off: null }, ...wrongs.map(([c, off]) => ({ counts: c, off }))]);
  const options: ChoiceOption[] = shuffled.map((o, i) => ({
    label: `Liste ${'ABC'[i]}`,
    visual: tally(cats, o.counts),
    ...(o.off === null ? {} : { whyWrong: `Zähle „${cats[o.off]}“ in der Urliste noch einmal.` }),
  }));
  const correct = shuffled.findIndex((o) => o.off === null);
  const prompt = 'Welche Strichliste passt zur Urliste?';
  return build(SKILL, 1, {
    key: `${ab}:passt:${list.id}:${values.join('')}`,
    ab,
    prompt,
    visual: listTable(`Urliste: ${list.title}`, values),
    answer: { kind: 'choice', options, correct, layout: 'grid' },
    hints: ['Zähle einen Wert in der Urliste. Vergleiche die Zahl mit den Listen.', 'Streiche jeden Wert nach dem Zählen durch.'],
    steps: [`${cats.map((c, i) => `${c}: ${fmt(counts[i])}`).join(', ')}.`, `${options[correct].label} zeigt genau diese Anzahlen.`],
    praise: 'Du hast die Listen mit der Urliste verglichen.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: all strokes of a Strichliste. */
function tallyTotal(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(WORD_LISTS);
  const k = rng.int(3, 4);
  const cats = rng.sample(list.cats, k);
  const total = rng.int(20, 30);
  const counts = partition(rng, total, k, 3);
  const prompt = 'Wie viele Striche stehen insgesamt in der Strichliste?';
  return build(SKILL, 1, {
    key: `${ab}:gesamt:${list.id}:${cats.join('')}:${counts.join()}`,
    ab,
    prompt,
    visual: tally(cats, counts, list.title),
    answer: { kind: 'number', value: total },
    hints: ['Lies jede Zeile einzeln ab. Ein Bündel zählt 5.', 'Addiere danach die Zahlen aller Zeilen.'],
    steps: [`In den Zeilen stehen ${listLine(counts)} Striche.`, sumLine(counts), `Insgesamt sind es ${fmt(total)} Striche.`],
    bugs: numberBugs([{ id: 'buendel-vier', match: sum(counts.map(asFour)), hint: BUG_BUNDLE_FOUR }, { id: 'buendel-eins', match: sum(counts.map(asOne)), hint: BUG_BUNDLE_ONE }], total),
    praise: 'Du hast erst die Zeilen gelesen und dann addiert.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB III, reversed: the strokes of one row are missing, the number of values is known. */
function missingRow(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(WORD_LISTS);
  const k = rng.int(3, 4);
  const cats = rng.sample(list.cats, k);
  const total = rng.int(20, 30);
  const counts = partition(rng, total, k, 3);
  const t = rng.int(0, k - 1);
  const shown = counts.map((c, i) => (i === t ? 0 : c));
  const others = total - counts[t];
  const context = `In der Urliste stehen ${fmt(total)} Werte. In der Strichliste fehlen die Striche bei „${cats[t]}“.`;
  const prompt = 'Wie viele Striche kommen dazu?';
  return build(SKILL, 1, {
    key: `${ab}:fehlt:${list.id}:${cats.join('')}:${counts.join()}:${t}`,
    ab,
    context,
    prompt,
    visual: tally(cats, shown, list.title),
    answer: { kind: 'number', value: counts[t] },
    hints: ['Zähle zuerst alle Striche der anderen Zeilen.', 'Vergleiche diese Zahl mit der Anzahl aller Werte.'],
    steps: [`Schon da: ${sumLine(counts.filter((_, i) => i !== t))}`, `${fmt(total)} − ${fmt(others)} = ${fmt(counts[t])}`, `Bei „${cats[t]}“ kommen ${fmt(counts[t])} Striche dazu.`],
    bugs: numberBugs([{ id: 'alle-gezaehlt', match: total, hint: 'Ein Teil der Werte steht schon in der Strichliste.' }, { id: 'andere-summe', match: others, hint: 'Diese Striche stehen schon da. Wie viele fehlen?' }], counts[t]),
    praise: 'Du hast von allen Werten die Striche abgezogen.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** AB III, reversed: how many full bundles do n strokes make? */
function fullBundles(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(WORD_LISTS);
  const cat = rng.pick(list.cats);
  const count = rng.int(11, 29);
  const bundles = Math.floor(count / 5);
  const context = `Die Urliste zeigt ${fmt(count)}-mal „${cat}“.`;
  const prompt = 'Wie viele volle Fünferbündel stehen in der Strichliste?';
  return build(SKILL, 1, {
    key: `${ab}:buendel:${list.id}:${cat}:${count}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: bundles },
    hints: ['Ein Bündel hat 5 Striche. Zähle in Schritten von 5 bis zur Zahl.', 'Einzelne Striche bilden noch kein volles Bündel.'],
    steps: [bundleLine(count), `Also sind es ${fmt(bundles)} volle Bündel.`],
    bugs: numberBugs([{ id: 'buendel-vier', match: Math.floor(count / 4), hint: BUG_BUNDLE_FOUR }], bundles),
    praise: 'Du hast die Striche in Fünfer gebündelt.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return rng.chance(0.5) ? countWord(rng, ab) : readTally(rng, ab);
  if (ab === 2) return rng.pick([fillCounts, matchTally, tallyTotal])(rng, ab);
  return rng.chance(0.65) ? missingRow(rng, ab) : fullBundles(rng, ab);
}

// ─── Stufe 2: Tabellen mit Bereichen ─────────────────────────────────────────

interface NumberList {
  id: string;
  title: string;
  /** What a row of the table counts. */
  unit: string;
  /** Head of the first table column. */
  header: string;
  /** Width of a range: 5 gives 0–4, 5–9, … */
  width: number;
  /** The smallest value that can happen: a school way takes at least a minute. */
  first: number;
  /** 'Wie viele Kinder lesen von 5 bis 9 Bücher?' */
  range(a: number, b: number): string;
  /** 'Wie viele Kinder lesen mindestens 10 Bücher?' */
  atLeast(a: number): string;
  /** 'Wie viele Kinder lesen genau 7 Bücher?', and 'genau 1 Buch' */
  exactly(a: number): string;
}

const NUMBER_LISTS: readonly NumberList[] = [
  {
    id: 'buecher',
    title: 'Gelesene Bücher im Jahr',
    unit: 'Kinder',
    header: 'Bücher',
    width: 5,
    first: 0,
    range: (a, b) => `Wie viele Kinder lesen von ${a} bis ${b} Bücher?`,
    atLeast: (a) => `Wie viele Kinder lesen mindestens ${a} Bücher?`,
    exactly: (a) => `Wie viele Kinder lesen genau ${a} ${a === 1 ? 'Buch' : 'Bücher'}?`,
  },
  {
    id: 'schulweg',
    title: 'Schulweg in Minuten',
    unit: 'Kinder',
    header: 'Minuten',
    width: 10,
    first: 1,
    range: (a, b) => `Wie viele Kinder brauchen von ${a} bis ${b} Minuten?`,
    atLeast: (a) => `Wie viele Kinder brauchen mindestens ${a} Minuten?`,
    exactly: (a) => `Wie viele Kinder brauchen genau ${a} ${a === 1 ? 'Minute' : 'Minuten'}?`,
  },
  {
    id: 'punkte',
    title: 'Punkte beim Spielfest',
    unit: 'Teams',
    header: 'Punkte',
    width: 10,
    first: 0,
    range: (a, b) => `Wie viele Teams haben von ${a} bis ${b} Punkte?`,
    atLeast: (a) => `Wie viele Teams haben mindestens ${a} Punkte?`,
    exactly: (a) => `Wie viele Teams haben genau ${a} ${a === 1 ? 'Punkt' : 'Punkte'}?`,
  },
  {
    id: 'seiten',
    title: 'Gelesene Seiten am Tag',
    unit: 'Tage',
    header: 'Seiten',
    width: 5,
    first: 0,
    range: (a, b) => `An wie vielen Tagen sind es von ${a} bis ${b} Seiten?`,
    atLeast: (a) => `An wie vielen Tagen sind es mindestens ${a} Seiten?`,
    exactly: (a) => `An wie vielen Tagen sind es genau ${a} ${a === 1 ? 'Seite' : 'Seiten'}?`,
  },
];

/** Lower and upper bound of the range number i. */
const rangeFrom = (list: NumberList, i: number) => Math.max(i * list.width, list.first);
const rangeTo = (list: NumberList, i: number) => (i + 1) * list.width - 1;
const rangeLabel = (list: NumberList, i: number) => `${rangeFrom(list, i)}–${rangeTo(list, i)}`;

/** A list of numbers whose ranges hold the given counts; every range also holds its upper bound, so a bound always matters. */
function numbersFor(rng: Rng, list: NumberList, counts: readonly number[]): number[] {
  const values = counts.flatMap((count, i) => Array.from({ length: count }, (_, j) => (j === 0 ? rangeTo(list, i) : rng.int(rangeFrom(list, i), rangeTo(list, i)))));
  return rng.shuffle(values);
}

const rangeTable = (list: NumberList, labels: readonly string[], cells: readonly string[], total?: number) => ({
  type: 'table' as const,
  caption: list.title,
  header: [list.header, `Anzahl ${list.unit}`],
  rows: [...labels.map((l, i) => [l, cells[i]]), ...(total === undefined ? [] : [['Zusammen', fmt(total)]])],
});

/** AB I: count the values of one range in a list of numbers. */
function countRange(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(NUMBER_LISTS);
  const counts = partition(rng, rng.int(12, 16), 3);
  const values = numbersFor(rng, list, counts);
  const t = rng.int(0, 2);
  const a = rangeFrom(list, t);
  const b = rangeTo(list, t);
  const withoutBound = values.filter((v) => v >= a && v < b).length;
  const prompt = list.range(a, b);
  return build(SKILL, 2, {
    key: `${ab}:bereich:${list.id}:${t}:${values.join()}`,
    ab,
    prompt,
    visual: listTable(`Urliste: ${list.title}`, values.map((v) => fmt(v))),
    answer: { kind: 'number', value: counts[t] },
    hints: [`Prüfe jede Zahl: Liegt die Zahl von ${a} bis ${b}?`, `Auch ${a} und ${b} zählen mit.`],
    steps: [`Im Bereich ${a}–${b} liegen: ${values.filter((v) => v >= a && v <= b).map((v) => fmt(v)).join(', ')}.`, `Das sind ${fmt(counts[t])} Werte.`],
    bugs: numberBugs([{ id: 'bereich-grenze', match: withoutBound, hint: `Die Grenzen gehören dazu: Auch ${b} zählt mit.` }, { id: 'alle-gezaehlt', match: values.length, hint: `Zähle nur die Zahlen von ${a} bis ${b}.` }], counts[t]),
    praise: 'Du hast auch die Grenzen des Bereichs mitgezählt.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: sort a longer list into a table of ranges. */
function fillRanges(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(NUMBER_LISTS);
  const counts = partition(rng, rng.int(16, 24), 3, 3);
  const values = numbersFor(rng, list, counts);
  const labels = counts.map((_, i) => rangeLabel(list, i));
  const prompt = 'Sortiere die Zahlen in die Bereiche. Trag die Anzahlen ein.';
  const shifted = counts.map((_, i) => values.filter((v) => v >= i * list.width && v < (i + 1) * list.width - 1).length);
  return build(SKILL, 2, {
    key: `${ab}:bereiche:${list.id}:${values.join()}`,
    ab,
    prompt,
    visual: listTable(`Urliste: ${list.title}`, values.map((v) => fmt(v))),
    answer: { kind: 'multi', fields: labels.map((l, i) => ({ id: `b${i}`, value: counts[i], before: `${l}:`, label: `Bereich ${l}` })) },
    hints: ['Mach für jede Zahl einen Strich bei ihrem Bereich.', `Prüfe am Ende: Alle Anzahlen ergeben zusammen ${fmt(values.length)}.`],
    steps: [`Probe: ${sumLine(counts)}`, `${labels.map((l, i) => `${l}: ${fmt(counts[i])}`).join(', ')}.`],
    bugs: [{ id: 'bereich-grenze', match: Object.fromEntries(shifted.map((c, i) => [`b${i}`, c])), hint: 'Die Grenzen gehören dazu: Auch die letzte Zahl eines Bereichs zählt mit.' }],
    praise: 'Du hast jede Zahl genau einem Bereich zugeordnet.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: "mindestens": add the rows of a table from one range on. */
function atLeast(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(NUMBER_LISTS);
  const counts = partition(rng, rng.int(20, 32), 4, 2);
  const labels = counts.map((_, i) => rangeLabel(list, i));
  const from = rng.int(1, 2);
  const a = from * list.width;
  const rows = counts.slice(from);
  const value = sum(rows);
  const prompt = list.atLeast(a);
  return build(SKILL, 2, {
    key: `${ab}:mindestens:${list.id}:${from}:${counts.join()}`,
    ab,
    prompt,
    visual: rangeTable(list, labels, counts.map((c) => fmt(c))),
    answer: { kind: 'number', value },
    hints: [`Mindestens ${a} heißt: ${a} oder mehr. Welche Zeilen gehören dazu?`, 'Addiere die Anzahlen dieser Zeilen.'],
    steps: [`Dazu gehören: ${labels.slice(from).join(', ')}.`, sumLine(rows), `Es sind ${fmt(value)} ${list.unit}.`],
    bugs: numberBugs([{ id: 'nur-eine-zeile', match: counts[from], hint: `Auch die Zeilen darunter zählen: Mindestens ${a} heißt ${a} oder mehr.` }, { id: 'alle-gezaehlt', match: sum(counts), hint: 'Die Zeilen darüber liegen unter der Grenze. Lass die Zeilen weg.' }], value),
    praise: 'Du hast alle Zeilen ab der Grenze addiert.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/**
 * AB III, reversed: "mindestens" with a gap in the table. Only the ranges say which rows count, and the way to the answer goes through the
 * total: all values minus the rows below the bound. Just filling the gap, as in Stufe 1, does not answer it.
 */
function atLeastWithGap(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(NUMBER_LISTS);
  const total = rng.int(20, 36);
  const counts = partition(rng, total, 4, 2);
  const from = rng.int(1, 2);
  const t = rng.int(from, 3);
  const a = from * list.width;
  const labels = counts.map((_, i) => rangeLabel(list, i));
  const below = counts.slice(0, from);
  const under = sum(below);
  const value = total - under;
  const prompt = list.atLeast(a);
  return build(SKILL, 2, {
    key: `${ab}:luecke:${list.id}:${from}:${t}:${counts.join()}`,
    ab,
    prompt,
    visual: rangeTable(list, labels, counts.map((c, i) => (i === t ? '?' : fmt(c))), total),
    answer: { kind: 'number', value },
    hints: [`Mindestens ${a} heißt: ${a} oder mehr. Welche Zeilen liegen darunter?`, 'Zieh diese Zeilen von „Zusammen“ ab.'],
    steps: [`Unter ${a} liegen: ${labels.slice(0, from).join(', ')}.`, ...(from > 1 ? [sumLine(below)] : []), `${fmt(total)} − ${fmt(under)} = ${fmt(value)}`, `Es sind ${fmt(value)} ${list.unit}.`],
    bugs: numberBugs([
      { id: 'alle-gezaehlt', match: total, hint: `„Zusammen“ zählt alle Zeilen. Die Zeilen unter ${a} gehören nicht dazu.` },
      { id: 'andere-summe', match: under, hint: `Diese Zeilen liegen unter ${a}. Wie viele bleiben bis „Zusammen“?` },
      { id: 'nur-eine-zeile', match: counts[t], hint: `Das ist nur die leere Zeile. Mindestens ${a} heißt ${a} oder mehr.` },
    ], value),
    praise: 'Du hast die Zeilen unter der Grenze von allen abgezogen.',
    srText: spoken(prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** AB III, reasoning: a range hides the single values. */
function rangeHides(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(NUMBER_LISTS);
  const counts = partition(rng, rng.int(18, 28), 4, 3);
  const t = rng.int(0, 3);
  const a = rangeFrom(list, t);
  const b = rangeTo(list, t);
  const inner = rng.int(a + 1, b - 1);
  const labels = counts.map((_, i) => rangeLabel(list, i));
  const prompt = list.exactly(inner);
  const why = `Die Tabelle zählt nur den ganzen Bereich ${labels[t]}.`;
  const right: ChoiceOption = { label: 'Das zeigt die Tabelle nicht.' };
  const options = rng.shuffle<ChoiceOption>([right, { label: fmt(counts[t]), whyWrong: why }, { label: '0', whyWrong: why }, { label: fmt(counts[t] + (t < 3 ? counts[t + 1] : counts[t - 1])), whyWrong: why }]);
  return build(SKILL, 2, {
    key: `${ab}:genau:${list.id}:${t}:${inner}:${counts.join()}`,
    ab,
    prompt,
    visual: rangeTable(list, labels, counts.map((c) => fmt(c))),
    answer: { kind: 'choice', options, correct: options.indexOf(right) },
    hints: [`Such die Zeile mit ${inner}. Was zählt diese Zeile?`, 'Die einzelnen Werte stehen nur in der Urliste.'],
    steps: [`Die Zeile ${labels[t]} zählt alle Werte von ${a} bis ${b}.`, `Die Zahl ${inner} kann darunter sein. Die Tabelle zeigt das nicht.`],
    praise: 'Du hast erkannt: Ein Bereich verbirgt die einzelnen Werte.',
    srText: spoken(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return countRange(rng, ab);
  if (ab === 2) return rng.chance(0.5) ? fillRanges(rng, ab) : atLeast(rng, ab);
  return rng.chance(0.5) ? atLeastWithGap(rng, ab) : rangeHides(rng, ab);
}

// ─── Stufe 3: Welche Frage kann die Liste beantworten? ───────────────────────

interface ListScene {
  id: string;
  title: string;
  unit: string;
  /** One of what is counted: 'Es ist 1 Kind.' */
  one: string;
  cats: readonly string[];
  /** Questions the list does not answer. */
  cannot: readonly string[];
  /** The same, asking for a number. */
  cannotCount: readonly string[];
  /** A goal as a statement, a list that serves it and lists that do not. */
  goal: string;
  fits: string;
  fitsNot: readonly string[];
}

const LIST_SCENES: readonly ListScene[] = [
  {
    id: 'schulweg',
    title: `Schulweg der ${schoolClass('c')}`,
    unit: 'Kinder',
    one: 'Kind',
    cats: ['Bus', 'Rad', 'Fuß', 'Auto'],
    cannot: ['Wie lange dauert der Schulweg von Mia?', 'Wie weit ist die Schule von Alis Haus entfernt?', 'Welches Kind fährt mit dem Rad?', 'Wie viele Kinder haben einen Helm?'],
    cannotCount: ['Wie viele Kinder haben einen Helm?', 'Wie viele Minuten dauert der Schulweg von Mia?', 'Wie viele Kinder fahren im Winter mit dem Rad?'],
    goal: `Du willst den Schulweg der ${schoolClass('c')} untersuchen.`,
    fits: `Für jedes Kind der ${schoolClass('c')}: Bus, Rad, Fuß oder Auto`,
    fitsNot: [`Für jedes Kind der ${schoolClass('c')}: Lieblingsfarbe`, 'Für jeden Bus: Abfahrt am Morgen', 'Für jede Klasse: Anzahl der Kinder'],
  },
  {
    id: 'ag',
    title: 'Gewählte AGs',
    unit: 'Kinder',
    one: 'Kind',
    cats: ['Chor', 'Judo', 'Kunst', 'Schach'],
    cannot: ['Wie lange dauert die Judo-AG?', 'Welche Kinder gehen in den Chor?', 'Wer gewinnt beim Schach?', 'Wie alt sind die Kinder in der Kunst-AG?'],
    cannotCount: ['Wie viele Minuten dauert die Judo-AG?', 'Wie viele Lieder singt der Chor?', 'Wie viele Schachbretter hat die Schule?'],
    goal: 'Du willst die beliebteste AG finden.',
    fits: 'Für jedes Kind: die gewählte AG',
    fitsNot: ['Für jede AG: Raum und Uhrzeit', 'Für jedes Kind: Länge des Schulwegs', 'Für jeden Tag: Anzahl der AGs'],
  },
  {
    id: 'verkehr',
    title: 'Fahrzeuge vor der Schule',
    unit: 'Fahrzeuge',
    one: 'Fahrzeug',
    cats: ['Autos', 'Busse', 'Räder', 'Mopeds'],
    cannot: ['Welche Farbe haben die Busse?', 'Wie viele Menschen sitzen in den Autos?', 'Wohin fahren die Mopeds?', 'Wie viele Autos fahren am Abend vorbei?'],
    cannotCount: ['Wie viele Menschen sitzen in den Autos?', 'Wie viele Autos fahren am Abend vorbei?', 'Wie viele Busse sind voll?'],
    goal: 'Du willst die häufigsten Fahrzeuge am Morgen finden.',
    fits: 'Für jedes Fahrzeug am Morgen: die Art',
    fitsNot: ['Für jedes Auto: die Farbe', 'Für jeden Bus: das Ziel', 'Für jeden Abend: die Anzahl der Räder'],
  },
  {
    id: 'snack',
    title: 'Pausensnack',
    unit: 'Kinder',
    one: 'Kind',
    cats: ['Apfel', 'Brot', 'Keks', 'Nuss'],
    cannot: ['Wie viel kostet ein Keks?', 'Welches Kind isst Nüsse?', 'Welcher Snack schmeckt am besten?', 'Wie viele Äpfel liegen im Laden?'],
    cannotCount: ['Wie viele Äpfel liegen im Laden?', 'Wie viele Kekse passen in eine Dose?', 'Wie viele Kinder essen montags Brot?'],
    goal: `Du willst die Pausensnacks der ${schoolClass('b')} vergleichen.`,
    fits: `Für jedes Kind der ${schoolClass('b')}: der Pausensnack`,
    fitsNot: ['Für jeden Laden: Preis eines Apfels', `Für jedes Kind der ${schoolClass('b')}: Schulweg`, 'Für jede Pause: die Minuten'],
  },
];

function sceneData(rng: Rng) {
  const scene = rng.pick(LIST_SCENES);
  const counts = partition(rng, rng.int(18, 30), 4, 2);
  return { scene, counts, visual: tally(scene.cats, counts, scene.title) };
}

/** Questions the list does answer, for any counts. */
function answerable(rng: Rng, scene: ListScene): string[] {
  const [a, b] = rng.sample(scene.cats, 2);
  return [`Wie viele ${scene.unit} stehen bei „${a}“?`, 'Welche Zeile hat die meisten Striche?', `Wie viele ${scene.unit} zählt die Liste insgesamt?`, `Stehen bei „${a}“ mehr ${scene.unit} als bei „${b}“?`];
}

const WHY_NOT = 'Prüfe: Steht die Angabe wirklich in der Liste?';

/** AB I: one question the list answers, three it does not. */
function whichQuestion(rng: Rng, ab: Ab): Exercise {
  const { scene, counts, visual } = sceneData(rng);
  const can = rng.pick(answerable(rng, scene));
  const wrong = rng.sample(scene.cannot, 3);
  const right: ChoiceOption = { label: can };
  const options = rng.shuffle<ChoiceOption>([right, ...wrong.map((label) => ({ label, whyWrong: WHY_NOT }))]);
  const prompt = 'Welche Frage kann die Strichliste beantworten?';
  return build(SKILL, 3, {
    key: `${ab}:frage:${scene.id}:${counts.join()}:${can}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'choice', options, correct: options.indexOf(right) },
    hints: ['Die Liste zählt nur die Antworten.', 'Prüfe jede Frage: Hilft die Zahl in der Liste?'],
    steps: [`Die Liste zählt: ${scene.cats.join(', ')}.`, `Diese Frage kann die Liste beantworten: ${can}`],
    praise: 'Du hast die Fragen an der Liste geprüft.',
    srText: spoken(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** AB II: three questions the list answers, one it does not. */
function whichNot(rng: Rng, ab: Ab): Exercise {
  const { scene, counts, visual } = sceneData(rng);
  const cannot = rng.pick(scene.cannot);
  const right: ChoiceOption = { label: cannot };
  const can = rng.sample(answerable(rng, scene), 3);
  const options = rng.shuffle<ChoiceOption>([right, ...can.map((label) => ({ label, whyWrong: 'Die Antwort steht in der Liste. Zähle die Striche nach.' }))]);
  const prompt = 'Welche Frage kann die Strichliste nicht beantworten?';
  return build(SKILL, 3, {
    key: `${ab}:nicht:${scene.id}:${counts.join()}:${cannot}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'choice', options, correct: options.indexOf(right) },
    hints: ['Beantworte jede Frage mit der Liste. Bei welcher Frage geht das nicht?', 'Die Liste zählt nur die Antworten. Mehr steht dort nicht.'],
    steps: [`Die Liste zählt: ${scene.cats.join(', ')}.`, `Dazu steht nichts in der Liste: ${cannot}`],
    praise: 'Du hast jede Frage an der Liste geprüft.',
    srText: spoken(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** AB II: the other way round: which data does a question need? */
function whichList(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(LIST_SCENES);
  const right: ChoiceOption = { label: scene.fits };
  const wrong = rng.sample(scene.fitsNot, 3);
  const options = rng.shuffle<ChoiceOption>([right, ...wrong.map((label) => ({ label, whyWrong: 'Hilft diese Liste bei der Frage? Prüfe das noch einmal.' }))]);
  const context = scene.goal;
  const prompt = 'Welche Liste legst du an?';
  return build(SKILL, 3, {
    key: `${ab}:plan:${scene.id}`,
    ab,
    context,
    prompt,
    answer: { kind: 'choice', options, correct: options.indexOf(right) },
    hints: ['Welche Angabe brauchst du für die Frage?', 'Wen oder was musst du dafür zählen?'],
    steps: [scene.goal, `Also passt: ${scene.fits}.`],
    praise: 'Du hast von der Frage aus die Liste geplant.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** AB III: answer if the list is enough, otherwise "Nicht lösbar". */
function answerOrNot(rng: Rng, ab: Ab): Exercise {
  const { scene, counts, visual } = sceneData(rng);
  const lead = 'Wenn eine Angabe fehlt, wähle „Nicht lösbar“.';
  if (rng.chance(0.4)) {
    const question = rng.pick(scene.cannotCount);
    const prompt = `${lead} ${question}`;
    return build(SKILL, 3, {
      key: `${ab}:loesbar:${scene.id}:${counts.join()}:${question}`,
      ab,
      prompt,
      visual,
      answer: { kind: 'number', value: null, offerUnsolvable: true },
      hints: ['Prüfe zuerst: Steht die Angabe in der Liste?', 'Die Liste zählt nur die Antworten. Mehr steht dort nicht.'],
      steps: [`Die Liste zählt: ${scene.cats.join(', ')}.`, 'Zu dieser Frage steht dort keine Zahl.', 'Die Aufgabe ist nicht lösbar.'],
      praise: 'Du hast gemerkt, dass eine Angabe fehlt.',
      srText: spoken(prompt),
      kmk: [...KMK, 'PK.argumentieren'],
    });
  }
  const [i, j] = rng.sample([0, 1, 2, 3], 2);
  const [hi, lo] = counts[i] > counts[j] ? [i, j] : [j, i];
  const together = rng.chance(0.5);
  const question = together
    ? `Wie viele ${scene.unit} stehen bei „${scene.cats[i]}“ und „${scene.cats[j]}“ zusammen?`
    : `Wie viele ${scene.unit} stehen bei „${scene.cats[hi]}“ mehr als bei „${scene.cats[lo]}“?`;
  const value = together ? counts[i] + counts[j] : counts[hi] - counts[lo];
  const line = together ? `${fmt(counts[i])} + ${fmt(counts[j])} = ${fmt(value)}` : `${fmt(counts[hi])} − ${fmt(counts[lo])} = ${fmt(value)}`;
  const prompt = `${lead} ${question}`;
  const bugs: MaybeBug[] = [
    { id: 'alle-gezaehlt', match: sum(counts), hint: 'Du brauchst nur zwei Zeilen der Liste.' },
    !together && { id: 'plus-statt-minus', match: counts[hi] + counts[lo], hint: 'Gefragt ist der Unterschied zwischen den beiden Zeilen.' },
    together && { id: 'plus-statt-minus', match: counts[hi] - counts[lo], hint: 'Gefragt ist die Summe der beiden Zeilen.' },
  ];
  return build(SKILL, 3, {
    key: `${ab}:loesbar:${scene.id}:${counts.join()}:${question}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value, offerUnsolvable: true },
    hints: ['Prüfe zuerst: Steht die Angabe in der Liste?', 'Lies die beiden Zeilen ab. Ein Bündel zählt 5.'],
    steps: [`Du liest ab: ${fmt(counts[i])} und ${fmt(counts[j])}.`, line, value === 1 ? `Es ist 1 ${scene.one}.` : `Es sind ${fmt(value)} ${scene.unit}.`],
    bugs: numberBugs(bugs, value),
    praise: 'Du hast geprüft und dann gerechnet.',
    srText: spoken(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return whichQuestion(rng, ab);
  if (ab === 2) return rng.chance(0.6) ? whichNot(rng, ab) : whichList(rng, ab);
  return answerOrNot(rng, ab);
}

// ─── Skill ───────────────────────────────────────────────────────────────────

const BY_STUFE: Record<Stufe, (rng: Rng, ab: Ab) => Exercise> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const strichlisteSkill: SkillDef = {
  ...SKILL,
  title: 'Strichlisten und Tabellen',
  description: 'Du ordnest Daten in Listen und Tabellen.',
  stufen: {
    1: 'Von der Urliste zur Strichliste, bis 30 Werte',
    2: 'Tabellen mit Bereichen wie 0–4 und 5–9',
    3: 'Welche Frage kann die Liste beantworten?',
  },
  kmk: ['DZ.erheben', 'PK.darstellen', 'PK.argumentieren', 'PK.problemloesen', 'PK.modellieren'],
  generate(rng, stufe, ctx) {
    return BY_STUFE[stufe](rng, targetAb(rng, stufe, ctx));
  },
};
