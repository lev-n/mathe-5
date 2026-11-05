/**
 * Diagramme prüfen: every item is a choice with a reason, so wrong options answer with whyWrong and no Bug ids arise.
 * Stufe 1: does the chart match the numbers?
 * Stufe 2: the axis does not start at zero.
 * Stufe 3: uneven steps; which version is honest? The barChart visual has an even axis only, so an uneven axis is given as a table, one row per
 * Kästchen of the same height: it shows the equal gaps and the numbers side by side.
 */
import { fmt } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, pickPerson, targetAb } from '../shared';
import { chart, distinctMultiples, HUNDRED_THEMES, pickCats, SMALL_THEMES, spoken, type ChartTheme, type Table } from './common';

const SKILL = { id: 'daten.pruefen', topicId: 'daten' } as const;
const KMK = ['DZ.diagramme', 'PK.argumentieren'];

const CUT_HINT = 'Die Achse beginnt nicht bei 0. Lies die Werte ab.';

/** Themes whose names hold no digit: the numbers of a list go into a sentence, and 5 b would count as a number (T7). */
const LISTED_THEMES = SMALL_THEMES.filter((t) => !t.cats.some((c) => /\d/.test(c)));

/** A shuffled choice with one right option. */
function choice(rng: Rng, right: string, wrongs: readonly (readonly [label: string, why: string])[]) {
  const rightOption: ChoiceOption = { label: right };
  const options = rng.shuffle<ChoiceOption>([rightOption, ...wrongs.map(([label, whyWrong]) => ({ label, whyWrong }))]);
  return { kind: 'choice' as const, options, correct: options.indexOf(rightOption) };
}

const pairs = (cats: readonly string[], values: readonly number[]) => cats.map((c, i) => `${c} ${fmt(values[i])}`);

/**
 * The numbers of a list as sentences: at most three in each (T7). The number comes first, as no sentence may end in it: spokenWords() takes the end of
 * 'Räder 35.' for a date, 'der 35.', and says 'Räder fünfunddreißigste'.
 */
function numberSentences(theme: ChartTheme, cats: readonly string[], values: readonly number[]): string {
  const items = cats.map((c, i) => `${fmt(values[i])} ${theme.at(c)}`);
  const n = items.length;
  if (n <= 3) return `Die Liste nennt: ${items.slice(0, -1).join(', ')} und ${items[n - 1]}.`;
  return `Die Liste nennt: ${items[0]} und ${items[1]}. Dazu kommen ${items[2]} und ${items[3]}.`;
}

// ─── Stufe 1: Passt das Diagramm zu den Zahlen? ──────────────────────────────

function matchItem(rng: Rng, ab: Ab, n: number, half: boolean): Exercise {
  const theme = rng.pick(LISTED_THEMES.filter((t) => t.cats.length >= n));
  const step = 10;
  const cats = pickCats(rng, theme, n);
  const values = distinctMultiples(rng, n, step, step * 7, step).map((v) => (half && rng.chance(0.5) ? v + 5 : v));
  // a third of the items match, in the others one bar is off by a half or a whole Kästchen
  const off = rng.chance(1 / 3) ? -1 : rng.int(0, n - 1);
  const drawn = values.map((v, i) => (i === off ? v + (half ? 5 : step) : v));
  const right = off < 0 ? 'Ja, alle Säulen passen.' : `Nein, bei „${cats[off]}“ passt die Säule nicht.`;
  const wrongs: [string, string][] = cats
    .map((c, i) => [i, c] as const)
    .filter(([i]) => i !== off)
    .map(([, c]) => [`Nein, bei „${c}“ passt die Säule nicht.`, `Lies bei „${c}“ noch einmal an der Achse ab.`]);
  if (off >= 0) wrongs.push(['Ja, alle Säulen passen.', 'Vergleiche jede Säule einzeln mit der Liste.']);
  const context = numberSentences(theme, cats, values);
  const prompt = 'Passt das Diagramm zur Liste?';
  return build(SKILL, 1, {
    key: `${ab}:passt:${theme.id}:${off}:${half}:${cats.join('')}:${values.join()}`,
    ab,
    context,
    prompt,
    visual: chart(theme, cats, drawn, step),
    answer: choice(rng, right, wrongs),
    hints: ['Ein Kästchen zählt 10. Lies jede Säule einzeln ab.', 'Vergleiche jeden abgelesenen Wert mit der Liste.'],
    steps: off < 0
      ? [`Abgelesen: ${pairs(cats, drawn).join(', ')}.`, 'Alle Werte stehen genauso in der Liste.', right]
      : [`Bei „${cats[off]}“ liest du ${fmt(drawn[off])} ab.`, `In der Liste steht ${fmt(values[off])}.`, right],
    praise: 'Du hast jede Säule einzeln geprüft.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

/** AB III, reasoning: the total matches, but two bars are swapped. */
function swappedBars(rng: Rng, ab: Ab): Exercise {
  const theme = rng.pick(LISTED_THEMES);
  const step = 10;
  const cats = pickCats(rng, theme, 3);
  const values = distinctMultiples(rng, 3, step, step * 7, step);
  const drawn = [values[1], values[0], values[2]];
  const person = pickPerson(rng);
  const context = `${numberSentences(theme, cats, values)} ${person.name} sagt: Die Summe stimmt, also passt das Diagramm.`;
  const prompt = `Hat ${person.name} recht?`;
  const right = `Nein, bei „${cats[0]}“ und „${cats[1]}“ sind die Werte vertauscht.`;
  const summe = values[0] + values[1] + values[2];
  return build(SKILL, 1, {
    key: `${ab}:vertauscht:${theme.id}:${cats.join('')}:${values.join()}`,
    ab,
    context,
    prompt,
    visual: chart(theme, cats, drawn, step),
    answer: choice(rng, right, [
      ['Ja, die Summe reicht als Probe.', 'Eine gleiche Summe sagt nichts über die einzelnen Säulen.'],
      ['Nein, die Summe ist anders.', 'Rechne beide Summen noch einmal aus.'],
      ['Nein, die Achse beginnt nicht bei 0.', 'Schau auf die Achse: Das unterste Zeichen ist die 0.'],
    ]),
    hints: ['Lies jede Säule einzeln ab.', 'Prüfe jede Säule einzeln: Reicht die Summe als Probe?'],
    steps: [`Die Summe ist in beiden Fällen ${fmt(summe)}.`, `Die Säule „${cats[0]}“ zeigt ${fmt(drawn[0])}, die Liste nennt ${fmt(values[0])}.`, right],
    praise: 'Du hast dich nicht auf die Summe verlassen.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return matchItem(rng, ab, 3, false);
  if (ab === 2) return matchItem(rng, ab, 4, true);
  return swappedBars(rng, ab);
}

// ─── Stufe 2: Die Achse beginnt nicht bei 0 ──────────────────────────────────

/** Values close together on an axis cut off just below them, so the bars look far apart. */
function cutData(rng: Rng) {
  const theme: ChartTheme = rng.pick(HUNDRED_THEMES);
  const step = rng.pick([10, 20]);
  const start = rng.pick([100, 200, 300, 500]);
  const n = rng.int(3, 4);
  const cats = pickCats(rng, theme, n);
  const heights = distinctMultiples(rng, n, 1, 6, 1);
  const values = heights.map((h) => start + h * step);
  return { theme, step, start, cats, values };
}

/** AB I: what is misleading here? */
function whatMisleads(rng: Rng, ab: Ab): Exercise {
  const { theme, step, start, cats, values } = cutData(rng);
  const prompt = 'Was täuscht an diesem Diagramm?';
  return build(SKILL, 2, {
    key: `${ab}:achse:${theme.id}:${start}:${step}:${cats.join('')}:${values.join()}`,
    ab,
    prompt,
    visual: chart(theme, cats, values, step, { axisStart: start }),
    answer: choice(rng, `Die Achse beginnt bei ${fmt(start)}, nicht bei 0.`, [
      ['Die Säulen sind zu schmal.', 'Die Breite ändert keinen Wert. Schau auf die Achse.'],
      ['Eine Säule fehlt.', 'Es fehlt keine Säule. Schau auf die Zahlen der Achse.'],
      ['Die Namen stehen in einer anderen Reihenfolge.', 'Die Namen ändern keinen Wert. Schau auf die Achse.'],
    ]),
    hints: ['Lies die unterste Zahl der Achse.', 'Säulen beginnen sonst bei welcher Zahl?'],
    steps: [`Die Achse beginnt bei ${fmt(start)}.`, 'Darum wirken die Unterschiede größer.', 'Das täuscht: Die Achse beginnt nicht bei 0.'],
    praise: 'Du hast die Achse geprüft, nicht nur die Säulen.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: a claim from the heights; the values disagree. */
function claimFromHeight(rng: Rng, ab: Ab): Exercise {
  const theme: ChartTheme = rng.pick(HUNDRED_THEMES);
  const step = rng.pick([10, 20]);
  const start = rng.pick([100, 200, 300]);
  const cats = pickCats(rng, theme, 3);
  const factor = rng.pick([2, 3]);
  const small = start + step;
  const big = start + factor * step;
  const mid = start + (factor === 3 ? 2 : 1.5) * step;
  const values = [small, mid, big];
  const person = pickPerson(rng);
  const times = factor === 2 ? 'doppelt so viele' : 'dreimal so viele';
  const context = `${person.name} sagt: ${theme.at(cats[2]).replace(/^./, (c) => c.toUpperCase())} sind es ${times} ${theme.unit} wie ${theme.at(cats[0])}.`;
  const prompt = `Hat ${person.name} recht?`;
  const diff = big - small;
  const right = `Nein, es sind nur ${fmt(diff)} mehr: ${fmt(big)} und ${fmt(small)}.`;
  return build(SKILL, 2, {
    key: `${ab}:aussage:${theme.id}:${start}:${step}:${factor}:${cats.join('')}`,
    ab,
    context,
    prompt,
    visual: chart(theme, cats, values, step, { axisStart: start }),
    answer: choice(rng, right, [
      [`Ja, die Säule ist ${factor === 2 ? 'doppelt' : 'dreimal'} so hoch.`, CUT_HINT],
      ['Ja, die Achse zeigt das so.', CUT_HINT],
      ['Nein, dort sind es weniger.', 'Lies beide Werte an der Achse ab.'],
    ]),
    hints: [CUT_HINT, 'Vergleiche die Werte, nicht die Höhen.'],
    steps: [`Abgelesen: ${fmt(small)} und ${fmt(big)}.`, `${fmt(big)} − ${fmt(small)} = ${fmt(diff)}`, right],
    praise: 'Du hast die Werte verglichen, nicht die Höhen.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

/** AB III: which statement about the values is true? Largest against smallest needs a little calculation. */
function trueStatement(rng: Rng, ab: Ab): Exercise {
  const { theme, step, start, cats, values } = cutData(rng);
  const top = Math.max(...values);
  const low = Math.min(...values);
  const diff = top - low;
  const prompt = 'Welche Aussage stimmt wirklich?';
  const right = `Der größte Wert ist nur um ${fmt(diff)} größer als der kleinste.`;
  return build(SKILL, 2, {
    key: `${ab}:wahr:${theme.id}:${start}:${step}:${cats.join('')}:${values.join()}`,
    ab,
    prompt,
    visual: chart(theme, cats, values, step, { axisStart: start }),
    answer: choice(rng, right, [
      ['Der größte Wert ist mehr als doppelt so groß wie der kleinste.', CUT_HINT],
      [`Der kleinste Wert ist nur ${fmt(step)}.`, CUT_HINT],
      [`Der größte Wert ist um ${fmt(top)} größer als der kleinste.`, 'Der kleinste Wert ist nicht 0. Lies den Wert an der Achse ab.'],
    ]),
    hints: ['Lies den größten und den kleinsten Wert an der Achse ab.', 'Zieh den kleinsten Wert vom größten Wert ab.'],
    steps: [`Abgelesen: ${fmt(top)} und ${fmt(low)}.`, `${fmt(top)} − ${fmt(low)} = ${fmt(diff)}`, right],
    praise: 'Du hast nachgerechnet und nicht nur geschaut.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return whatMisleads(rng, ab);
  if (ab === 2) return claimFromHeight(rng, ab);
  return trueStatement(rng, ab);
}

// ─── Stufe 3: ungleiche Schritte; welche Version ist ehrlich? ────────────────

/** AB I: the same values, once from 0, once cut off, once from a lower cut. */
function honestVersion(rng: Rng, ab: Ab): Exercise {
  const { theme, step, start, cats, values } = cutData(rng);
  const shortCats = cats.slice(0, 3);
  const shortValues = values.slice(0, 3);
  const zeroStep = 100;
  const honest = chart(theme, shortCats, shortValues, zeroStep);
  const cut = chart(theme, shortCats, shortValues, step, { axisStart: start });
  const lower = chart(theme, shortCats, shortValues, 50, { axisStart: start - 50 });
  const shuffled = rng.shuffle([{ v: honest, why: undefined as string | undefined }, { v: cut, why: CUT_HINT }, { v: lower, why: CUT_HINT }]);
  const options: ChoiceOption[] = shuffled.map((o, i) => ({ label: `Version ${'ABC'[i]}`, visual: o.v, ...(o.why ? { whyWrong: o.why } : {}) }));
  const correct = shuffled.findIndex((o) => o.v === honest);
  const context = 'Alle drei Versionen zeigen dieselben Werte.';
  const prompt = 'Welche Version zeigt die Unterschiede ehrlich?';
  return build(SKILL, 3, {
    key: `${ab}:version:${theme.id}:${start}:${step}:${shortCats.join('')}:${shortValues.join()}`,
    ab,
    context,
    prompt,
    answer: { kind: 'choice', options, correct, layout: 'grid' },
    hints: ['Schau bei jeder Version auf die unterste Zahl der Achse.', 'Bei welcher Version passen die Höhen zu den Werten?'],
    steps: ['Ehrlich ist die Version mit dem Start bei 0.', `Nur dort passen die Höhen zu ${shortValues.map((v) => fmt(v)).join(', ')}.`, `Also ${options[correct].label}.`],
    praise: 'Du hast die Achsen der Versionen verglichen.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

/** Axis numbers at equal distances, with a step that grows or shrinks. lo and hi are two of them, for two bars. */
const UNEVEN: readonly { ticks: readonly number[]; lo: number; hi: number }[] = [
  { ticks: [0, 10, 20, 50, 100], lo: 20, hi: 100 },
  { ticks: [0, 5, 10, 50, 100], lo: 10, hi: 100 },
  { ticks: [0, 20, 40, 100, 200], lo: 40, hi: 200 },
  { ticks: [0, 10, 20, 40, 80], lo: 20, hi: 80 },
  { ticks: [0, 50, 100, 500, 1000], lo: 100, hi: 1000 },
  { ticks: [0, 100, 200, 500, 1000], lo: 200, hi: 1000 },
  { ticks: [0, 50, 100, 110, 120], lo: 100, hi: 120 },
  { ticks: [0, 100, 200, 210, 220], lo: 200, hi: 220 },
  { ticks: [0, 500, 1000, 1050, 1100], lo: 1000, hi: 1100 },
  { ticks: [0, 5, 10, 20, 40], lo: 10, hi: 40 },
  { ticks: [0, 5, 10, 25, 50], lo: 10, hi: 50 },
  { ticks: [0, 10, 20, 30, 60], lo: 20, hi: 60 },
  { ticks: [0, 10, 20, 100, 200], lo: 20, hi: 200 },
  { ticks: [0, 20, 40, 60, 120], lo: 40, hi: 120 },
  { ticks: [0, 25, 50, 100, 200], lo: 50, hi: 200 },
  { ticks: [0, 50, 100, 200, 400], lo: 100, hi: 400 },
  { ticks: [0, 100, 200, 400, 800], lo: 200, hi: 800 },
  { ticks: [0, 10, 20, 25, 30], lo: 20, hi: 30 },
  { ticks: [0, 20, 40, 50, 60], lo: 40, hi: 60 },
  { ticks: [0, 50, 100, 120, 150], lo: 100, hi: 150 },
  { ticks: [0, 100, 200, 250, 300], lo: 200, hi: 300 },
  { ticks: [0, 200, 400, 500, 600], lo: 400, hi: 600 },
  { ticks: [0, 500, 1000, 1200, 1500], lo: 1000, hi: 1500 },
];

const BOX_LINE = 'Im Diagramm ist jedes Kästchen gleich hoch.';

/** The axis from the top down, as in a chart. bars: where a bar ends, by the number of its line. */
function axisTable(ticks: readonly number[], bars?: Readonly<Record<number, string>>): Table {
  const rows = ticks.map((t, i) => [`${fmt(i)} Kästchen`, fmt(t), ...(bars ? [bars[t] ?? ''] : [])]).reverse();
  return { type: 'table', caption: 'Achse im Diagramm', header: ['Höhe', 'Achse', ...(bars ? ['Säule endet hier'] : [])], rows };
}

/** The smallest usual step with which an axis of five lines reaches top. */
const honestStep = (top: number) => [5, 10, 20, 25, 50, 100, 200, 250, 500].find((s) => 4 * s >= top) as number;

/** AB II: an axis with uneven steps: what misleads? */
function unevenSteps(rng: Rng, ab: Ab): Exercise {
  const u = rng.pick(UNEVEN);
  const person = pickPerson(rng);
  const context = `${person.name} zeichnet ein Diagramm. ${BOX_LINE}`;
  const prompt = `Was täuscht an der Achse von ${person.name}?`;
  const steps = u.ticks.slice(1).map((t, i) => t - u.ticks[i]);
  const small = steps[0];
  const big = steps[steps.length - 1];
  return build(SKILL, 3, {
    key: `${ab}:ungleich:${u.ticks.join()}`,
    ab,
    context,
    prompt,
    visual: axisTable(u.ticks),
    answer: choice(rng, `Die Schritte sind ungleich: erst ${fmt(small)}, später ${fmt(big)}.`, [
      ['Die Achse beginnt nicht bei 0.', 'Die erste Zahl ist die 0. Vergleiche die Schritte.'],
      ['Die Zahlen sind zu groß.', 'Große Zahlen täuschen nicht. Vergleiche die Schritte.'],
      ['Die Achse hat zu wenige Zahlen.', 'Die Anzahl täuscht nicht. Vergleiche die Schritte.'],
    ]),
    hints: ['Rechne von Zahl zu Zahl: Wie groß ist jeder Schritt?', 'Gleich hohe Kästchen brauchen gleich große Schritte.'],
    steps: [`Die Schritte sind ${steps.map((s) => fmt(s)).join(', ')}.`, 'Gleich hohe Kästchen zeigen hier verschieden große Schritte.', `Das täuscht: erst ${fmt(small)}, später ${fmt(big)}.`],
    praise: 'Du hast jeden Schritt der Achse nachgerechnet.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

/** AB II: which axis is honest? */
function honestAxis(rng: Rng, ab: Ab): Exercise {
  const u = rng.pick(UNEVEN);
  const top = u.ticks[u.ticks.length - 1];
  const step = honestStep(top);
  const even = [0, 1, 2, 3, 4].map((i) => i * step);
  const cut = even.map((t) => t + step);
  const right = even.map((t) => fmt(t)).join(', ');
  const prompt = 'Welche Achse ist ehrlich?';
  return build(SKILL, 3, {
    key: `${ab}:ehrlich:${u.ticks.join()}`,
    ab,
    prompt,
    answer: choice(rng, right, [
      [u.ticks.map((t) => fmt(t)).join(', '), 'Rechne von Zahl zu Zahl: Sind die Schritte gleich groß?'],
      [cut.map((t) => fmt(t)).join(', '), 'Die Achse beginnt nicht bei 0. So wirken Unterschiede größer.'],
    ]),
    hints: ['Eine ehrliche Achse beginnt bei 0.', 'Alle Schritte sind gleich groß.'],
    steps: [`${right}: Das beginnt bei 0.`, `Jeder Schritt ist ${fmt(step)}.`, 'Diese Achse ist ehrlich.'],
    praise: 'Du hast Start und Schritte der Achse geprüft.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB III: two bars on an uneven axis: bigger or smaller than it looks? */
function unevenEffect(rng: Rng, ab: Ab): Exercise {
  const u = rng.pick(UNEVEN);
  const cats = rng.pick([['Mo', 'Fr'], ['Bus', 'Rad'], ['Mai', 'Juli']]);
  const iLo = u.ticks.indexOf(u.lo);
  const iHi = u.ticks.indexOf(u.hi);
  const looks = iHi / iLo;
  const real = u.hi / u.lo;
  const [word, otherWord] = looks < real ? ['Kleiner', 'Größer'] : ['Größer', 'Kleiner'];
  const why = `Zähle die Kästchen und rechne ${fmt(u.hi)} : ${fmt(u.lo)}.`;
  const context = `${BOX_LINE} Die Tabelle zeigt die Achse und zwei Säulen.`;
  const prompt = 'Wie wirkt der Unterschied im Diagramm?';
  return build(SKILL, 3, {
    key: `${ab}:wirkung:${u.ticks.join()}:${cats.join('')}`,
    ab,
    context,
    prompt,
    visual: axisTable(u.ticks, { [u.lo]: cats[0], [u.hi]: cats[1] }),
    answer: choice(rng, `${word} als in Wirklichkeit.`, [
      [`${otherWord} als in Wirklichkeit.`, why],
      ['Genau so groß wie in Wirklichkeit.', why],
    ]),
    hints: ['Lies ab: Wie viele Kästchen ist jede Säule hoch?', 'Vergleiche mit den echten Werten: Wie oft passt der kleine hinein?'],
    steps: [`Die Säule ${cats[1]} ist ${fmt(iHi)} Kästchen hoch, die Säule ${cats[0]} ${fmt(iLo)} Kästchen.`, `Das wirkt ${fmt(looks)}-mal so hoch. Der Wert ist ${fmt(real)}-mal so groß.`, `Der Unterschied wirkt also ${word.toLowerCase()} als in Wirklichkeit.`],
    praise: 'Du hast Höhe und Wert getrennt betrachtet.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return honestVersion(rng, ab);
  if (ab === 2) return rng.chance(0.5) ? unevenSteps(rng, ab) : honestAxis(rng, ab);
  return unevenEffect(rng, ab);
}

// ─── Skill ───────────────────────────────────────────────────────────────────

const BY_STUFE: Record<Stufe, (rng: Rng, ab: Ab) => Exercise> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const pruefenSkill: SkillDef = {
  ...SKILL,
  title: 'Diagramme prüfen',
  description: 'Du findest heraus, wenn ein Diagramm täuscht.',
  stufen: {
    1: 'Passt das Diagramm zu den Zahlen?',
    2: 'Die Achse beginnt nicht bei 0',
    3: 'Ungleiche Schritte: Welche Version ist ehrlich?',
  },
  kmk: ['DZ.diagramme', 'PK.argumentieren'],
  generate(rng, stufe, ctx) {
    return BY_STUFE[stufe](rng, targetAb(rng, stufe, ctx));
  },
};
