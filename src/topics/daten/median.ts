/**
 * Median und Spannweite. Every answer field has one decimal place: a Median of an even count can end in ,5, and the comma key stays the same for the
 * whole skill.
 * Stufe 1: Minimum, Maximum, Spannweite of at most 7 values.
 * Stufe 2: Median of an odd count: sort first.
 * Stufe 3: Median of an even count; Median against Mittelwert with an outlier.
 */
import { fmt } from '../../core/format';
import type { Ab, Exercise, NumberAnswer, Rng, SkillDef, Stufe } from '../../core/types';
import { build, targetAb } from '../shared';
import { ascending, decimalBugs, distinctMultiples, listTable, mean, median, oneDecimal, spoken, sum, sumLine } from './common';

const SKILL = { id: 'daten.median', topicId: 'daten' } as const;
const KMK = ['DZ.kennwerte', 'PK.darstellen'];

const HINT_SORT = 'Sortiere die Werte zuerst der Größe nach.';
const BUG_UNSORTED = 'Sortiere zuerst. Dann suchst du die Mitte.';
const BUG_MEAN = 'Das ist der Mittelwert. Der Median ist der Wert in der Mitte.';

const answer = (value: number): NumberAnswer => ({ kind: 'number', value, decimals: 1 });

interface DataList {
  id: string;
  title: string;
  /** Range of the values of an ordinary item. */
  max: number;
}

const LISTS: readonly DataList[] = [
  { id: 'tore', title: 'Tore pro Spiel', max: 12 },
  { id: 'seiten', title: 'Gelesene Seiten pro Tag', max: 60 },
  { id: 'bus', title: 'Busfahrt in Minuten', max: 45 },
  { id: 'punkte', title: 'Punkte pro Runde', max: 40 },
  { id: 'temperatur', title: 'Temperatur mittags in °C', max: 30 },
];

const sortedLine = (values: readonly number[]) => `Sortiert: ${ascending(values).map((v) => fmt(v)).join(', ')}`;
const table = (list: DataList, values: readonly number[]) => listTable(list.title, values.map((v) => fmt(v)));

/** n values in an order where the middle of the list is not the Median, so sorting matters. */
function shuffledValues(rng: Rng, n: number, max: number, repeats = false): number[] {
  for (;;) {
    const values = repeats ? Array.from({ length: n }, () => rng.int(1, max)) : distinctMultiples(rng, n, 1, Math.max(max, n + 2), 1);
    const m = Math.floor(n / 2);
    const middle = n % 2 === 1 ? values[m] : (values[m - 1] + values[m]) / 2;
    if (middle !== median(values)) return values;
  }
}

const unsortedMiddle = (values: readonly number[]) => {
  const m = Math.floor(values.length / 2);
  return values.length % 2 === 1 ? values[m] : (values[m - 1] + values[m]) / 2;
};

// ─── Stufe 1: Minimum, Maximum, Spannweite ───────────────────────────────────

/** AB I: read the largest or the smallest value. */
function minOrMax(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(LISTS);
  const values = shuffledValues(rng, 5, list.max);
  const wantMax = rng.chance(0.5);
  const value = wantMax ? Math.max(...values) : Math.min(...values);
  const other = wantMax ? Math.min(...values) : Math.max(...values);
  const prompt = wantMax ? 'Wie groß ist das Maximum?' : 'Wie groß ist das Minimum?';
  return build(SKILL, 1, {
    key: `${ab}:extrem:${list.id}:${wantMax}:${values.join()}`,
    ab,
    prompt,
    visual: table(list, values),
    answer: answer(value),
    hints: [wantMax ? 'Das Maximum ist der größte Wert.' : 'Das Minimum ist der kleinste Wert.', 'Vergleiche die Werte der Reihe nach.'],
    steps: [sortedLine(values), `${wantMax ? 'Das Maximum' : 'Das Minimum'} ist ${fmt(value)}.`],
    bugs: decimalBugs([{ id: 'min-max-tausch', match: other, hint: wantMax ? 'Das ist der kleinste Wert. Maximum heißt: der größte Wert.' : 'Das ist der größte Wert. Minimum heißt: der kleinste Wert.' }], value),
    praise: 'Du hast alle Werte verglichen.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: the Spannweite of up to 7 values. */
function range(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(LISTS);
  const n = rng.int(5, 7);
  const values = shuffledValues(rng, n, list.max);
  const [lo, hi] = [Math.min(...values), Math.max(...values)];
  const value = hi - lo;
  const prompt = 'Wie groß ist die Spannweite?';
  return build(SKILL, 1, {
    key: `${ab}:spannweite:${list.id}:${values.join()}`,
    ab,
    prompt,
    visual: table(list, values),
    answer: answer(value),
    hints: ['Spannweite: Maximum minus Minimum.', 'Such zuerst den größten und den kleinsten Wert.'],
    steps: [`Maximum: ${fmt(hi)}, Minimum: ${fmt(lo)}`, `${fmt(hi)} − ${fmt(lo)} = ${fmt(value)}`, `Die Spannweite ist ${fmt(value)}.`],
    bugs: decimalBugs([
      { id: 'spannweite-summe', match: hi + lo, hint: 'Die Spannweite ist ein Abstand. Rechne minus.' },
      { id: 'spannweite-reihe', match: Math.abs(values[n - 1] - values[0]), hint: 'Nimm den größten und den kleinsten Wert, nicht den ersten und letzten.' },
      { id: 'spannweite-nur-max', match: hi, hint: 'Das ist das Maximum. Zieh noch das Minimum ab.' },
    ], value),
    praise: 'Du hast den Abstand von Minimum und Maximum berechnet.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB III, reversed: the Spannweite is known, the extreme value is missing. */
function rangeBack(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(LISTS);
  const n = rng.int(5, 7);
  const sorted = ascending(distinctMultiples(rng, n, 2, Math.max(list.max, n + 4), 1));
  const wantMax = rng.chance(0.5);
  const value = wantMax ? sorted[n - 1] : sorted[0];
  const known = wantMax ? sorted[0] : sorted[n - 1];
  const width = sorted[n - 1] - sorted[0];
  const shown = rng.shuffle(sorted.map((v) => (v === value ? '?' : fmt(v))));
  const context = `Die Spannweite ist ${fmt(width)}. Der ${wantMax ? 'größte' : 'kleinste'} Wert fehlt in der Liste.`;
  const prompt = wantMax ? 'Wie groß ist das Maximum?' : 'Wie groß ist das Minimum?';
  return build(SKILL, 1, {
    key: `${ab}:zurueck:${list.id}:${wantMax}:${shown.join()}`,
    ab,
    context,
    prompt,
    visual: listTable(list.title, shown),
    answer: answer(value),
    hints: [wantMax ? 'Such zuerst den kleinsten Wert der Liste.' : 'Such zuerst den größten Wert der Liste.', 'Spannweite: Maximum minus Minimum. Rechne rückwärts.'],
    steps: [wantMax ? `Das Minimum ist ${fmt(known)}.` : `Das Maximum ist ${fmt(known)}.`, wantMax ? `${fmt(known)} + ${fmt(width)} = ${fmt(value)}` : `${fmt(known)} − ${fmt(width)} = ${fmt(value)}`, `${wantMax ? 'Das Maximum' : 'Das Minimum'} ist ${fmt(value)}.`],
    bugs: decimalBugs([
      { id: 'spannweite-summe', match: wantMax ? Math.abs(known - width) : known + width, hint: wantMax ? 'Das Maximum liegt über dem Minimum. Rechne plus.' : 'Das Minimum liegt unter dem Maximum. Rechne minus.' },
      { id: 'spannweite-nur-max', match: width, hint: 'Das ist nur der Abstand. Geh vom bekannten Wert aus.' },
    ], value),
    praise: 'Du hast die Spannweite rückwärts genutzt.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return minOrMax(rng, ab);
  if (ab === 2) return range(rng, ab);
  return rangeBack(rng, ab);
}

// ─── Stufe 2: Median bei ungerader Anzahl ────────────────────────────────────

const PROMPT_MEDIAN = 'Wie groß ist der Median?';

function oddMedian(rng: Rng, ab: Ab, n: number, repeats: boolean): Exercise {
  const list = rng.pick(LISTS);
  const values = shuffledValues(rng, n, list.max, repeats);
  const value = median(values);
  const place = (n + 1) / 2;
  return build(SKILL, 2, {
    key: `${ab}:ungerade:${list.id}:${values.join()}`,
    ab,
    prompt: PROMPT_MEDIAN,
    visual: table(list, values),
    answer: answer(value),
    hints: [HINT_SORT, `Bei ${n} Werten steht der Median an Platz ${place}.`],
    steps: [sortedLine(values), `Bei ${fmt(n)} Werten ist Platz ${fmt(place)} die Mitte.`, `Der Median ist ${fmt(value)}.`],
    bugs: decimalBugs([
      { id: 'median-unsortiert', match: unsortedMiddle(values), hint: BUG_UNSORTED },
      { id: 'mittel-statt-median', match: mean(values), hint: BUG_MEAN },
    ], value),
    praise: 'Du hast zuerst sortiert und dann die Mitte gesucht.',
    srText: spoken(PROMPT_MEDIAN),
    kmk: KMK,
  });
}

/** AB III, reasoning: the largest value grows, or the smallest shrinks; the Median stays. */
function medianStays(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(LISTS);
  const n = rng.pick([5, 7]);
  const values = shuffledValues(rng, n, list.max);
  const value = median(values);
  const k = rng.pick(list.max <= 30 ? [2, 3, 5] : [5, 10, 20]);
  const context = `Der größte Wert wird um ${fmt(k)} größer.`;
  const prompt = 'Wie groß ist der Median dann?';
  return build(SKILL, 2, {
    key: `${ab}:bleibt:${list.id}:${k}:${values.join()}`,
    ab,
    context,
    prompt,
    visual: table(list, values),
    answer: answer(value),
    hints: [HINT_SORT, 'Bleibt der mittlere Wert an seinem Platz?'],
    steps: [sortedLine(values), 'Der größte Wert bleibt ganz rechts. Die Mitte ändert sich nicht.', `Der Median ist weiter ${fmt(value)}.`],
    bugs: decimalBugs([
      { id: 'median-plus', match: value + k, hint: 'Nur der größte Wert ändert sich. Bleibt die Mitte gleich?' },
      { id: 'median-unsortiert', match: unsortedMiddle(values), hint: BUG_UNSORTED },
    ], value),
    praise: 'Du hast erkannt: Der Median hängt an der Mitte.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return oddMedian(rng, ab, 5, false);
  if (ab === 2) return oddMedian(rng, ab, 7, true);
  return medianStays(rng, ab);
}

// ─── Stufe 3: gerade Anzahl; Median und Mittelwert mit Ausreißer ─────────────

/** AB I: an even count: the mean of the two middle values. */
function evenMedian(rng: Rng, ab: Ab): Exercise {
  const list = rng.pick(LISTS);
  const n = rng.pick([6, 8]);
  const values = shuffledValues(rng, n, list.max);
  const value = median(values);
  const s = ascending(values);
  const [a, b] = [s[n / 2 - 1], s[n / 2]];
  return build(SKILL, 3, {
    key: `${ab}:gerade:${list.id}:${values.join()}`,
    ab,
    prompt: PROMPT_MEDIAN,
    visual: table(list, values),
    answer: answer(value),
    hints: [HINT_SORT, 'Bei einer geraden Anzahl stehen zwei Werte in der Mitte.'],
    steps: [sortedLine(values), `In der Mitte stehen ${fmt(a)} und ${fmt(b)}.`, `(${fmt(a)} + ${fmt(b)}) : 2 = ${fmt(value)}`, `Der Median ist ${fmt(value)}.`],
    bugs: decimalBugs([
      { id: 'median-unsortiert', match: unsortedMiddle(values), hint: BUG_UNSORTED },
      { id: 'median-eine-mitte', match: a, hint: 'In der Mitte stehen zwei Werte. Rechne den Wert genau dazwischen.' },
      { id: 'median-eine-mitte', match: b, hint: 'In der Mitte stehen zwei Werte. Rechne den Wert genau dazwischen.' },
      { id: 'mittel-statt-median', match: mean(values), hint: BUG_MEAN },
    ], value),
    praise: 'Du hast die Mitte zwischen zwei Werten gefunden.',
    srText: spoken(PROMPT_MEDIAN),
    kmk: KMK,
  });
}

/** Values with one far above the others, in lists where such a value can happen. */
function withOutlier(rng: Rng, n: number) {
  const list = rng.pick(LISTS.filter((l) => l.max >= 40));
  const others = distinctMultiples(rng, n - 1, 2, 20, 1);
  const outlier = rng.int(60, 99);
  return { list, others, outlier, values: rng.shuffle([...others, outlier]) };
}

/** AB II: how far apart are Mittelwert and Median? */
function meanAgainstMedian(rng: Rng, ab: Ab): Exercise {
  const { list, values } = withOutlier(rng, 5);
  const med = median(values);
  const avg = oneDecimal(mean(values));
  const value = oneDecimal(avg - med);
  const context = 'Ein Wert der Liste ist ein Ausreißer.';
  const prompt = 'Um wie viel ist der Mittelwert größer als der Median?';
  return build(SKILL, 3, {
    key: `${ab}:vergleich:${list.id}:${values.join()}`,
    ab,
    context,
    prompt,
    visual: table(list, values),
    answer: answer(value),
    hints: ['Rechne beide Werte aus: Mittelwert und Median.', 'Zieh den Median vom Mittelwert ab.'],
    steps: [`Summe: ${sumLine(values)}`, `Mittelwert: ${fmt(sum(values))} : 5 = ${fmt(avg)}`, `${sortedLine(values)}, Median: ${fmt(med)}`, `${fmt(avg)} − ${fmt(med)} = ${fmt(value)}`, `Der Unterschied ist ${fmt(value)}.`],
    bugs: decimalBugs([
      { id: 'mittel-statt-median', match: avg, hint: 'Das ist der Mittelwert. Zieh noch den Median ab.' },
      { id: 'median-statt-unterschied', match: med, hint: 'Das ist der Median. Gefragt ist der Unterschied zum Mittelwert.' },
      { id: 'median-unsortiert', match: oneDecimal(avg - unsortedMiddle(values)), hint: BUG_UNSORTED },
    ], value),
    praise: 'Du hast beide Kennwerte berechnet und verglichen.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** AB III: seven values, and the task does not name the outlier. Without it an even count remains, so the Median lies between two values. */
function medianWithoutOutlier(rng: Rng, ab: Ab): Exercise {
  const { list, others, outlier, values } = withOutlier(rng, 7);
  const value = median(others);
  const before = median(values);
  const s = ascending(others);
  const [a, b] = [s[2], s[3]];
  const context = 'Ein Wert der Liste ist ein Ausreißer.';
  const prompt = 'Wie groß ist der Median ohne den Ausreißer?';
  return build(SKILL, 3, {
    key: `${ab}:ohne:${list.id}:${values.join()}`,
    ab,
    context,
    prompt,
    visual: table(list, values),
    answer: answer(value),
    hints: ['Such den Ausreißer und streiche den Wert. Wie viele Werte bleiben?', HINT_SORT],
    steps: [`Der Ausreißer ist ${fmt(outlier)}.`, sortedLine(others), `Es bleiben 6 Werte. In der Mitte stehen ${fmt(a)} und ${fmt(b)}.`, `(${fmt(a)} + ${fmt(b)}) : 2 = ${fmt(value)}`, `Der Median ist ${fmt(value)}.`],
    bugs: decimalBugs([
      { id: 'ausreisser-mit', match: before, hint: 'Das ist der Median mit dem Ausreißer. Streiche den Wert zuerst.' },
      { id: 'median-eine-mitte', match: a, hint: 'In der Mitte stehen zwei Werte. Rechne den Wert genau dazwischen.' },
      { id: 'mittel-statt-median', match: mean(others), hint: BUG_MEAN },
    ], value),
    praise: 'Du hast den Ausreißer gefunden und die neue Mitte berechnet.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** AB III: the outlier shrinks: what happens to the Mittelwert? Its change spreads over all values. */
function meanMoves(rng: Rng, ab: Ab): Exercise {
  const { list, values, outlier } = withOutlier(rng, 5);
  const k = 5 * rng.int(2, 8);
  const value = k / 5;
  const context = `Der Wert ${fmt(outlier)} sinkt um ${fmt(k)}.`;
  const prompt = 'Um wie viel sinkt der Mittelwert?';
  return build(SKILL, 3, {
    key: `${ab}:sinkt:${list.id}:${k}:${values.join()}`,
    ab,
    context,
    prompt,
    visual: table(list, values),
    answer: answer(value),
    hints: ['Um wie viel sinkt die Summe aller Werte?', 'Teile diese Änderung durch die Anzahl der Werte.'],
    steps: [`Die Summe sinkt um ${fmt(k)}.`, `${fmt(k)} : 5 = ${fmt(value)}`, `Der Mittelwert sinkt um ${fmt(value)}.`],
    bugs: decimalBugs([
      { id: 'mittel-ganz', match: k, hint: 'Die Änderung verteilt sich auf alle Werte.' },
      { id: 'median-statt-mittel', match: 0, hint: 'Das gilt für den Median. Der Mittelwert hängt an der Summe.' },
    ], value),
    praise: 'Du hast die Änderung auf alle Werte verteilt.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return evenMedian(rng, ab);
  if (ab === 2) return meanAgainstMedian(rng, ab);
  return rng.chance(0.5) ? medianWithoutOutlier(rng, ab) : meanMoves(rng, ab);
}

// ─── Skill ───────────────────────────────────────────────────────────────────

const BY_STUFE: Record<Stufe, (rng: Rng, ab: Ab) => Exercise> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const medianSkill: SkillDef = {
  ...SKILL,
  title: 'Median und Spannweite',
  description: 'Du findest die Mitte und den Abstand von Minimum zu Maximum.',
  stufen: {
    1: 'Minimum, Maximum und Spannweite von bis zu 7 Werten',
    2: 'Median: zuerst sortieren, ungerade Anzahl',
    3: 'Gerade Anzahl, Median und Mittelwert mit einem Ausreißer',
  },
  kmk: ['DZ.kennwerte', 'PK.darstellen', 'PK.problemloesen', 'PK.argumentieren'],
  keys: { comma: true },
  generate(rng, stufe, ctx) {
    return BY_STUFE[stufe](rng, targetAb(rng, stufe, ctx));
  },
};
