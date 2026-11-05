/**
 * Mittelwert. Every answer field has one decimal place, so the comma key stays active for the whole skill.
 * Stufe 1: two or three values, levelled bars, whole result.
 * Stufe 2: five values: add, then divide; decimals allowed.
 * Stufe 3: find a missing value; the effect of one outlier.
 *
 * Bars only hold values on a line of the axis, so that a child can read them exactly. The levelled chart would show the result, so it comes in the steps.
 */
import { fmt } from '../../core/format';
import type { Ab, Exercise, NumberAnswer, Rng, SkillDef, Stufe } from '../../core/types';
import { build, pickTwo, PEOPLE, targetAb } from '../shared';
import { chart, dataTable, decimalBugs, HUNDRED_THEMES, mean, oneDecimal, spoken, sum, sumLine, type ChartTheme } from './common';

const SKILL = { id: 'daten.mittelwert', topicId: 'daten' } as const;
const KMK = ['DZ.kennwerte', 'PK.darstellen'];

const HINT_MEAN = 'Mittelwert: alles zusammenzählen, dann gleichmäßig verteilen.';
const BUG_SUM = 'Verteile die Summe gleichmäßig auf alle Werte.';
const BUG_ZERO = 'Die 0 zählt als Wert mit.';

const answer = (value: number): NumberAnswer => ({ kind: 'number', value, decimals: 1 });

interface Collection {
  id: string;
  title: string;
  unit: string;
}

/** What children collect: stories for two or three values. */
const COLLECTIONS: readonly Collection[] = [
  { id: 'karten', title: 'Sammelkarten', unit: 'Karten' },
  { id: 'murmeln', title: 'Murmeln', unit: 'Murmeln' },
  { id: 'sticker', title: 'Aufkleber', unit: 'Aufkleber' },
  { id: 'muscheln', title: 'Muscheln', unit: 'Muscheln' },
];

/** What a week counts: data for five values, Monday to Friday. */
const WEEK_DATA: readonly (Collection & { header: string })[] = [
  { id: 'seiten', title: 'Gelesene Seiten', unit: 'Seiten', header: 'Tag' },
  { id: 'dosen', title: 'Gesammelte Dosen', unit: 'Dosen', header: 'Tag' },
  { id: 'bahnen', title: 'Geschwommene Bahnen', unit: 'Bahnen', header: 'Tag' },
  { id: 'fotos', title: 'Fotos der Klassenfahrt', unit: 'Fotos', header: 'Tag' },
];
const WEEK = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

/** Daily counts that really reach three digits: nobody reads 355 pages or swims 400 lengths in a day. */
const LARGE_WEEK_DATA: readonly Pick<ChartTheme, 'id' | 'title' | 'header'>[] = [...WEEK_DATA.filter((d) => d.id === 'fotos'), ...HUNDRED_THEMES];

const names = (rng: Rng, n: number) => rng.sample(PEOPLE, n).map((p) => p.name);

// ─── Stufe 1: zwei oder drei Werte, ganzes Ergebnis ──────────────────────────

/** AB I: two values. */
function levelTwo(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(COLLECTIONS);
  const cats = names(rng, 2);
  let [a, b] = [rng.int(2, 12), rng.int(2, 12)];
  while (a === b || (a + b) % 2 === 1) [a, b] = [rng.int(2, 12), rng.int(2, 12)];
  const m = (a + b) / 2;
  const prompt = `Verteile die ${scene.unit} gleichmäßig. Wie viele ${scene.unit} hat dann jedes Kind?`;
  return build(SKILL, 1, {
    key: `${ab}:zwei:${scene.id}:${a}:${b}`,
    ab,
    prompt,
    visual: chart(scene, cats, [a, b], 1),
    answer: answer(m),
    hints: [HINT_MEAN, 'Stell dir vor: Die höhere Säule gibt an die niedrigere ab.'],
    steps: [`Zusammen: ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}`, `${fmt(a + b)} : 2 = ${fmt(m)}`, { text: `Jedes Kind hat dann ${fmt(m)} ${scene.unit}.`, visual: chart(scene, cats, [a, b], 1, { meanLine: m, levelled: true }) }],
    bugs: decimalBugs([{ id: 'mittel-ohne-teilen', match: a + b, hint: BUG_SUM }], m),
    praise: 'Du hast addiert und gleichmäßig verteilt.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: three values; some with a repeated value or a 0. */
function levelThree(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(COLLECTIONS);
  const cats = names(rng, 3);
  const kind = rng.pick(['plain', 'repeat', 'zero'] as const);
  let values: number[];
  for (;;) {
    const [x, y, z] = [rng.int(1, 12), rng.int(1, 12), rng.int(1, 12)];
    values = kind === 'repeat' ? [x, x, y] : kind === 'zero' ? [0, y, z] : [x, y, z];
    if (sum(values) % 3 === 0 && sum(values) >= 6 && new Set(values).size === (kind === 'repeat' ? 2 : 3)) break;
  }
  values = rng.shuffle(values);
  const total = sum(values);
  const m = total / 3;
  const prompt = `Verteile die ${scene.unit} gleichmäßig. Wie viele ${scene.unit} hat dann jedes Kind?`;
  const repeated = kind === 'repeat' ? values.find((v, i) => values.indexOf(v) !== i) : undefined;
  return build(SKILL, 1, {
    key: `${ab}:drei:${scene.id}:${values.join()}`,
    ab,
    prompt,
    visual: chart(scene, cats, values, 1),
    answer: answer(m),
    hints: [HINT_MEAN, 'Teile die Summe durch 3, die Anzahl der Kinder.'],
    steps: [`Zusammen: ${sumLine(values)}`, `${fmt(total)} : 3 = ${fmt(m)}`, { text: `Jedes Kind hat dann ${fmt(m)} ${scene.unit}.`, visual: chart(scene, cats, values, 1, { meanLine: m, levelled: true }) }],
    bugs: decimalBugs([
      { id: 'mittel-ohne-teilen', match: total, hint: BUG_SUM },
      repeated !== undefined && { id: 'mittel-haeufigster', match: repeated, hint: HINT_MEAN },
      kind === 'zero' && { id: 'mittel-null', match: total / 2, hint: BUG_ZERO },
    ], m),
    praise: 'Du hast alle drei Werte gleichmäßig verteilt.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB III, reasoning: how much has to move to level two bars? */
function giveAway(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(COLLECTIONS);
  const [from, to] = pickTwo(rng);
  let [a, b] = [rng.int(6, 12), rng.int(1, 5)];
  while ((a - b) % 2 === 1) [a, b] = [rng.int(6, 12), rng.int(1, 5)];
  const m = (a + b) / 2;
  const value = a - m;
  const cats = [from.name, to.name];
  const context = `${from.name} gibt ${to.name} ${scene.unit} ab. Danach haben beide gleich viele ${scene.unit}.`;
  const prompt = `Wie viele ${scene.unit} gibt ${from.name} ab?`;
  return build(SKILL, 1, {
    key: `${ab}:abgeben:${scene.id}:${a}:${b}`,
    ab,
    context,
    prompt,
    visual: chart(scene, cats, [a, b], 1),
    answer: answer(value),
    hints: ['Wie hoch sind beide Säulen am Ende?', `Vergleiche diese Höhe mit der Säule von ${from.name}.`],
    steps: [`Zusammen: ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}`, `Am Ende hat jedes Kind ${fmt(a + b)} : 2 = ${fmt(m)}`, { text: `${fmt(a)} − ${fmt(m)} = ${fmt(value)}`, visual: chart(scene, cats, [a, b], 1, { meanLine: m, levelled: true }) }],
    bugs: decimalBugs([
      { id: 'unterschied-ganz', match: a - b, hint: `Dann hat ${to.name} mehr. Gib nur die Hälfte des Unterschieds ab.` },
      { id: 'mittel-statt-abgabe', match: m, hint: 'So viele hat jedes Kind am Ende. Gefragt ist die Abgabe.' },
    ], value),
    praise: 'Du hast vom Ausgleich her gedacht.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return levelTwo(rng, ab);
  if (ab === 2) return levelThree(rng, ab);
  return giveAway(rng, ab);
}

// ─── Stufe 2: fünf Werte, addieren und teilen ────────────────────────────────

const PROMPT_FIVE = 'Berechne den Mittelwert der fünf Tage.';

function fiveBugs(values: readonly number[], m: number) {
  const counts = new Map<number, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  const repeated = [...counts].filter(([, c]) => c > 1).map(([v]) => v);
  return decimalBugs([
    { id: 'mittel-ohne-teilen', match: sum(values), hint: BUG_SUM },
    repeated.length === 1 && { id: 'mittel-haeufigster', match: repeated[0], hint: HINT_MEAN },
    values.includes(0) && { id: 'mittel-null', match: sum(values) / values.filter((v) => v !== 0).length, hint: BUG_ZERO },
  ], m);
}

const fiveSteps = (values: readonly number[], m: number) => [`Summe: ${sumLine(values)}`, `${fmt(sum(values))} : 5 = ${fmt(m)}`, `Der Mittelwert ist ${fmt(m)}.`];

/** AB I: five values on the lines, a whole result. */
function fiveWhole(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(WEEK_DATA);
  const step = rng.pick([1, 2]);
  let values: number[];
  do values = WEEK.map(() => step * rng.int(1, 12)); while (sum(values) % 5 !== 0 || new Set(values).size < 4);
  const m = sum(values) / 5;
  return build(SKILL, 2, {
    key: `${ab}:ganz:${scene.id}:${values.join()}`,
    ab,
    prompt: PROMPT_FIVE,
    visual: chart(scene, WEEK, values, step),
    answer: answer(m),
    hints: [HINT_MEAN, 'Teile die Summe durch 5, die Anzahl der Werte.'],
    steps: fiveSteps(values, m),
    bugs: fiveBugs(values, m),
    praise: 'Du hast addiert und durch die Anzahl geteilt.',
    srText: spoken(PROMPT_FIVE),
    kmk: KMK,
  });
}

/** AB II: five values, a result with a comma; a repeated value or a 0 may come up. */
function fiveDecimal(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(WEEK_DATA);
  const withZero = rng.chance(0.4);
  const repeat = rng.chance(0.4);
  let values: number[];
  do {
    values = WEEK.map(() => rng.int(1, 12));
    if (repeat) values[1] = values[0];
    if (withZero) values[4] = 0;
    values = rng.shuffle(values);
  } while (sum(values) % 5 === 0);
  const m = oneDecimal(sum(values) / 5);
  return build(SKILL, 2, {
    key: `${ab}:komma:${scene.id}:${values.join()}`,
    ab,
    prompt: PROMPT_FIVE,
    visual: chart(scene, WEEK, values, 1),
    answer: answer(m),
    hints: [HINT_MEAN, 'Das Ergebnis darf ein Komma haben. Teile weiter durch 5.'],
    steps: fiveSteps(values, m),
    bugs: fiveBugs(values, m),
    praise: 'Du hast bis zur Stelle nach dem Komma gerechnet.',
    srText: spoken(PROMPT_FIVE),
    kmk: KMK,
  });
}

/** AB III: three-digit values, exact in a table, a result with a comma. */
function fiveLarge(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(LARGE_WEEK_DATA);
  let values: number[];
  do values = WEEK.map(() => rng.int(105, 495)); while (sum(values) % 5 === 0);
  const m = oneDecimal(sum(values) / 5);
  return build(SKILL, 2, {
    key: `${ab}:gross:${scene.id}:${values.join()}`,
    ab,
    prompt: PROMPT_FIVE,
    visual: dataTable(scene, WEEK, values),
    answer: answer(m),
    hints: ['Addiere die fünf Zahlen in Teilschritten oder schriftlich.', 'Teile die Summe durch 5. Das Ergebnis darf ein Komma haben.'],
    steps: fiveSteps(values, m),
    bugs: fiveBugs(values, m),
    praise: 'Du hast auch mit großen Zahlen sauber geteilt.',
    srText: spoken(PROMPT_FIVE),
    kmk: KMK,
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return fiveWhole(rng, ab);
  if (ab === 2) return fiveDecimal(rng, ab);
  return fiveLarge(rng, ab);
}

// ─── Stufe 3: fehlender Wert; ein Ausreißer ──────────────────────────────────

/** AB I: three children, one is missing, the mean is known. */
function missingValue(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(COLLECTIONS);
  const [a, b, c] = names(rng, 3);
  let [x, y, v] = [rng.int(2, 12), rng.int(2, 12), rng.int(2, 14)];
  while ((x + y + v) % 3 !== 0 || x === y || v === (x + y + v) / 3) [x, y, v] = [rng.int(2, 12), rng.int(2, 12), rng.int(2, 14)];
  const m = (x + y + v) / 3;
  const context = `Das Diagramm zeigt ${a} und ${b}. ${c} fehlt noch. Der Mittelwert aller drei ist ${fmt(m)}.`;
  const prompt = `Wie viele ${scene.unit} hat ${c}?`;
  return build(SKILL, 3, {
    key: `${ab}:fehlt:${scene.id}:${x}:${y}:${v}`,
    ab,
    context,
    prompt,
    visual: chart(scene, [a, b], [x, y], 1, { meanLine: m, axisMax: Math.max(x, y, m) + 1 }),
    answer: answer(v),
    hints: ['Mittelwert mal Anzahl ergibt die Summe aller Werte.', 'Zieh die bekannten Werte von dieser Summe ab.'],
    steps: [`Summe aller drei: 3 · ${fmt(m)} = ${fmt(3 * m)}`, `Schon da: ${fmt(x)} + ${fmt(y)} = ${fmt(x + y)}`, `${fmt(3 * m)} − ${fmt(x + y)} = ${fmt(v)}`, `${c} hat ${fmt(v)} ${scene.unit}.`],
    bugs: decimalBugs([
      { id: 'fehlwert-summe', match: 3 * m, hint: 'Das ist die Summe aller drei. Zieh die bekannten Werte ab.' },
      { id: 'fehlwert-mittel', match: m, hint: 'Der Mittelwert ist der Ausgleich. Der fehlende Wert kann anders sein.' },
      { id: 'fehlwert-bekannte', match: (x + y) / 2, hint: 'Das ist der Mittelwert der zwei bekannten Werte. Rechne mit allen drei.' },
    ], v),
    praise: 'Du bist vom Mittelwert zur Summe zurückgegangen.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Five values with one far above the others, on the lines of an axis with step 2. */
function outlierData(rng: Rng) {
  const scene = rng.pick(WEEK_DATA);
  const others = WEEK.slice(0, 4).map(() => 2 * rng.int(1, 5));
  const outlier = 2 * rng.int(10, 12);
  const at = rng.int(0, 4);
  const values = [...others.slice(0, at), outlier, ...others.slice(at)];
  return { scene, others, outlier, at, values };
}

/** AB II, reversed: the mean of all five and the outlier are known, the single values are not. Back to the sum, without the outlier, and divide again. */
function withoutOutlier(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(WEEK_DATA);
  const withComma = rng.chance(0.75);
  let total: number;
  let outlier: number;
  let rest: number;
  do {
    total = rng.int(45, 130);
    outlier = rng.int(30, 70);
    rest = total - outlier;
  } while (rest < 16 || outlier < rest || rest % 4 !== (withComma ? 2 : 0));
  const m5 = total / 5;
  const value = rest / 4;
  const context = `Der Mittelwert der fünf Tage ist ${fmt(m5)} ${scene.unit}. Der größte Wert ist ${fmt(outlier)} ${scene.unit}.`;
  const prompt = 'Wie groß ist der Mittelwert der anderen vier Tage?';
  return build(SKILL, 3, {
    key: `${ab}:ohne:${scene.id}:${total}:${outlier}`,
    ab,
    context,
    prompt,
    answer: answer(value),
    hints: ['Mittelwert mal Anzahl ergibt die Summe aller Werte.', 'Zieh den größten Wert ab. Teile durch die übrigen vier Tage.'],
    steps: [`Summe aller fünf: 5 · ${fmt(m5)} = ${fmt(total)}`, `Ohne ${fmt(outlier)}: ${fmt(total)} − ${fmt(outlier)} = ${fmt(rest)}`, `${fmt(rest)} : 4 = ${fmt(value)}`, `Der Mittelwert ist ${fmt(value)}.`],
    bugs: decimalBugs([
      { id: 'ausreisser-mit', match: m5, hint: 'Das ist der Mittelwert mit dem größten Wert. Lass den Wert weg.' },
      { id: 'ausreisser-mit', match: total / 4, hint: 'Zieh zuerst den größten Wert von der Summe ab.' },
      { id: 'falsche-anzahl', match: rest / 5, hint: 'Ohne den größten Wert sind es nur noch vier Werte.' },
      { id: 'mittel-ohne-teilen', match: rest, hint: BUG_SUM },
      { id: 'fehlwert-summe', match: total, hint: 'Das ist die Summe aller fünf Tage. Zieh den größten Wert ab.' },
    ], value),
    praise: 'Du hast den Ausreißer aus der Summe genommen.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** AB III: how far does the outlier lift the mean? */
function outlierEffect(rng: Rng, ab: Ab): Exercise {
  let d = outlierData(rng);
  while (sum(d.values) % 5 !== 0) d = outlierData(rng);
  const { scene, others, values, outlier } = d;
  const m5 = sum(values) / 5;
  const m4 = oneDecimal(mean(others));
  const value = oneDecimal(m5 - m4);
  const prompt = 'Um wie viel sinkt der Mittelwert ohne den größten Wert?';
  return build(SKILL, 3, {
    key: `${ab}:wirkung:${scene.id}:${values.join()}`,
    ab,
    prompt,
    visual: chart(scene, WEEK, values, 2),
    answer: answer(value),
    hints: ['Rechne beide Mittelwerte aus: mit und ohne den größten Wert.', 'Zieh den kleineren Mittelwert vom größeren ab.'],
    steps: [`Mit ${fmt(outlier)}: ${fmt(sum(values))} : 5 = ${fmt(m5)}`, `Ohne ${fmt(outlier)}: ${fmt(sum(others))} : 4 = ${fmt(m4)}`, `${fmt(m5)} − ${fmt(m4)} = ${fmt(value)}`, `Der Mittelwert sinkt um ${fmt(value)}.`],
    bugs: decimalBugs([
      { id: 'ausreisser-mit', match: m5, hint: 'Das ist ein Mittelwert. Gefragt ist der Unterschied zwischen beiden.' },
      { id: 'ausreisser-mit', match: m4, hint: 'Das ist ein Mittelwert. Gefragt ist der Unterschied zwischen beiden.' },
      { id: 'ausreisser-wert', match: outlier - m4, hint: 'Der große Wert verteilt sich auf alle Tage. Rechne beide Mittelwerte aus.' },
    ], value),
    praise: 'Du hast die Wirkung eines einzelnen Werts gemessen.',
    srText: spoken(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const SERIES: readonly { id: string; unit: string; past: (n: number) => string; ask: string }[] = [
  { id: 'tore', unit: 'Tore', past: (n) => `Nach ${n} Spielen`, ask: 'Wie viele Tore braucht das Team im nächsten Spiel?' },
  { id: 'seiten', unit: 'Seiten', past: (n) => `Nach ${n} Tagen`, ask: 'Wie viele Seiten liest Lena am nächsten Tag?' },
  { id: 'bahnen', unit: 'Bahnen', past: (n) => `Nach ${n} Trainings`, ask: 'Wie viele Bahnen schwimmt Emre im nächsten Training?' },
];

/** AB III, reversed: which next value lifts the mean to a target? */
function nextValue(rng: Rng, ab: Ab): Exercise {
  const series = rng.pick(SERIES);
  const n = rng.int(3, 5);
  const m1 = rng.int(2, 8);
  const m2 = m1 + rng.int(1, 2);
  const value = (n + 1) * m2 - n * m1;
  const context = `${series.past(n)} ist der Mittelwert ${fmt(m1)} ${series.unit}. Danach soll der Mittelwert ${fmt(m2)} ${series.unit} sein.`;
  return build(SKILL, 3, {
    key: `${ab}:naechster:${series.id}:${n}:${m1}:${m2}`,
    ab,
    context,
    prompt: series.ask,
    answer: answer(value),
    hints: [`Wie groß ist die Summe bisher? Rechne ${n} · ${m1}.`, 'Wie groß muss die Summe danach sein?'],
    steps: [`Bisher: ${fmt(n)} · ${fmt(m1)} = ${fmt(n * m1)}`, `Danach: ${fmt(n + 1)} · ${fmt(m2)} = ${fmt((n + 1) * m2)}`, `${fmt((n + 1) * m2)} − ${fmt(n * m1)} = ${fmt(value)}`, `Es sind ${fmt(value)} ${series.unit}.`],
    bugs: decimalBugs([
      { id: 'fehlwert-mittel', match: m2, hint: 'So bleibt der Mittelwert kleiner. Rechne mit den Summen.' },
      { id: 'fehlwert-summe', match: (n + 1) * m2, hint: 'Das ist die ganze Summe. Zieh die Summe von bisher ab.' },
    ], value),
    praise: 'Du hast mit den Summen statt mit den Mitteln gerechnet.',
    srText: spoken(series.ask, context),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return missingValue(rng, ab);
  if (ab === 2) return withoutOutlier(rng, ab);
  return rng.chance(0.5) ? outlierEffect(rng, ab) : nextValue(rng, ab);
}

// ─── Skill ───────────────────────────────────────────────────────────────────

const BY_STUFE: Record<Stufe, (rng: Rng, ab: Ab) => Exercise> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const mittelwertSkill: SkillDef = {
  ...SKILL,
  title: 'Mittelwert',
  description: 'Du verteilst Werte gleichmäßig und rechnest den Durchschnitt aus.',
  stufen: {
    1: 'Zwei oder drei Werte ausgleichen, ganzes Ergebnis',
    2: 'Fünf Werte: addieren und teilen, auch mit Komma',
    3: 'Einen fehlenden Wert finden, Wirkung eines Ausreißers',
  },
  kmk: ['DZ.kennwerte', 'PK.darstellen', 'PK.problemloesen', 'PK.argumentieren'],
  keys: { comma: true },
  generate(rng, stufe, ctx) {
    return BY_STUFE[stufe](rng, targetAb(rng, stufe, ctx));
  },
};
