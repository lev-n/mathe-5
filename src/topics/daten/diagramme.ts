/**
 * Diagramme lesen.
 * Stufe 1: read a bar, axis step 5 or 10.
 * Stufe 2: differences and totals, axis step 50 or 1 000.
 * Stufe 3: from a table to a chart; which chart fits? Option charts are Balkendiagramme with the numbers of Stufe 2: three of them
 * and the table still fit on one printed page, which three Säulendiagramme do not.
 */
import { fmt } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, numberBugs, targetAb, type MaybeBug } from '../shared';
import { chart, dataTable, distinctMultiples, HUNDRED_THEMES, listTable, pickCats, SMALL_THEMES, spoken, sum, sumLine, THOUSAND_THEMES, type ChartTheme } from './common';

const SKILL = { id: 'daten.diagramme', topicId: 'daten' } as const;
const KMK = ['DZ.diagramme', 'PK.darstellen'];

const STEP_HINT = 'Schau an die Achse: Wie viel zählt ein Kästchen?';

/** Reading the height in Kästchen instead of in the values of the axis. */
function stepBug(value: number, step: number): MaybeBug {
  return Number.isInteger(value / step) && { id: 'achse-schritt', match: value / step, hint: STEP_HINT };
}

// ─── Stufe 1: einen Wert ablesen, Schritt 5 oder 10 ──────────────────────────

function smallData(rng: Rng, step: number) {
  const theme = rng.pick(SMALL_THEMES);
  const n = rng.int(3, 4);
  const cats = pickCats(rng, theme, n);
  const values = distinctMultiples(rng, n, step, step * 8, step);
  return { theme, cats, values };
}

const shuffledIndex = (rng: Rng, n: number) => rng.int(0, n - 1);

/** AB I: a bar that ends on a line. */
function readBar(rng: Rng, ab: Ab): Exercise {
  const step = rng.pick([5, 10]);
  const { theme, cats, values } = smallData(rng, step);
  const t = shuffledIndex(rng, cats.length);
  const prompt = `Wie viele ${theme.unit} sind es ${theme.at(cats[t])}?`;
  return build(SKILL, 1, {
    key: `${ab}:lesen:${theme.id}:${step}:${t}:${cats.join('')}:${values.join()}`,
    ab,
    prompt,
    visual: chart(theme, cats, values, step),
    answer: { kind: 'number', value: values[t] },
    hints: [STEP_HINT, `Geh von der Säule ${theme.at(cats[t])} waagerecht zur Achse.`],
    steps: [`Ein Kästchen zählt ${fmt(step)}.`, `Die Säule ist ${fmt(values[t] / step)} Kästchen hoch: ${fmt(values[t] / step)} · ${fmt(step)} = ${fmt(values[t])}`, `Es sind ${fmt(values[t])} ${theme.unit}.`],
    bugs: numberBugs([stepBug(values[t], step)], values[t]),
    praise: 'Du hast an der Achse abgelesen.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: a bar that ends halfway between two lines (step 10), or a Balkendiagramm. */
function readBetween(rng: Rng, ab: Ab): Exercise {
  const { theme, cats, values } = smallData(rng, 10);
  const t = shuffledIndex(rng, cats.length);
  values[t] += 5;
  const horizontal = rng.chance(0.3);
  const prompt = `Wie viele ${theme.unit} sind es ${theme.at(cats[t])}?`;
  return build(SKILL, 1, {
    key: `${ab}:halb:${theme.id}:${horizontal}:${t}:${cats.join('')}:${values.join()}`,
    ab,
    prompt,
    visual: chart(theme, cats, values, 10, horizontal ? { horizontal } : {}),
    answer: { kind: 'number', value: values[t] },
    hints: ['Ein Kästchen zählt 10. Das Ende liegt mitten im Kästchen.', 'Was ist die Hälfte von 10?'],
    steps: [`Das Ende liegt zwischen ${fmt(values[t] - 5)} und ${fmt(values[t] + 5)}, genau in der Mitte.`, `${fmt(values[t] - 5)} + 5 = ${fmt(values[t])}`, `Es sind ${fmt(values[t])} ${theme.unit}.`],
    bugs: numberBugs([
      { id: 'halber-schritt', match: values[t] - 5, hint: `Das Ende liegt ${horizontal ? 'rechts von' : 'über'} dieser Linie. Zähle das halbe Kästchen dazu.` },
      { id: 'halber-schritt', match: values[t] + 5, hint: `Das Ende liegt ${horizontal ? 'links von' : 'unter'} dieser Linie. ${horizontal ? 'Der Balken' : 'Die Säule'} füllt nur ein halbes Kästchen.` },
    ], values[t]),
    praise: 'Du hast das halbe Kästchen mitgezählt.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: a Bilddiagramm: one picture stands for 5 or 10. */
function readPictogram(rng: Rng, ab: Ab): Exercise {
  const iconValue = rng.pick([5, 10]);
  const scene = rng.pick<{ theme: ChartTheme; icon: VisualOf<'pictogram'>['icon'] }>([
    { theme: SMALL_THEMES[0], icon: 'person' },
    { theme: SMALL_THEMES[1], icon: 'person' },
    { theme: SMALL_THEMES[2], icon: 'buch' },
  ]);
  const n = rng.int(3, 4);
  const cats = pickCats(rng, scene.theme, n);
  const icons = distinctMultiples(rng, n, 2, 7, 1);
  const values = icons.map((i) => i * iconValue);
  const t = shuffledIndex(rng, n);
  const prompt = `Wie viele ${scene.theme.unit} sind es ${scene.theme.at(cats[t])}?`;
  return build(SKILL, 1, {
    key: `${ab}:bild:${scene.theme.id}:${iconValue}:${t}:${cats.join('')}:${values.join()}`,
    ab,
    prompt,
    visual: { type: 'pictogram', title: scene.theme.title, categories: cats, values, iconValue, icon: scene.icon },
    answer: { kind: 'number', value: values[t] },
    hints: ['Schau in die Legende: Wie viel zählt ein Bild?', 'Zähle die Bilder in der Zeile. Rechne dann mal.'],
    steps: [`Ein Bild zählt ${fmt(iconValue)}.`, `In der Zeile stehen ${fmt(icons[t])} Bilder: ${fmt(icons[t])} · ${fmt(iconValue)} = ${fmt(values[t])}`, `Es sind ${fmt(values[t])} ${scene.theme.unit}.`],
    bugs: numberBugs([{ id: 'legende-vergessen', match: icons[t], hint: 'Du hast die Bilder gezählt. Wie viel zählt ein Bild?' }], values[t]),
    praise: 'Du hast die Legende benutzt.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB III, reversed: which bar shows this value? */
function findBar(rng: Rng, ab: Ab): Exercise {
  const step = rng.pick([5, 10]);
  const { theme, cats, values } = smallData(rng, step);
  const t = shuffledIndex(rng, cats.length);
  const prompt = `Wo zeigt das Diagramm den Wert ${fmt(values[t])}?`;
  const right: ChoiceOption = { label: cats[t] };
  const options = rng.shuffle<ChoiceOption>([right, ...cats.filter((_, i) => i !== t).map((c) => ({ label: c, whyWrong: `Lies bei „${c}“ noch einmal an der Achse ab.` }))]);
  return build(SKILL, 1, {
    key: `${ab}:suchen:${theme.id}:${step}:${t}:${cats.join('')}:${values.join()}`,
    ab,
    prompt,
    visual: chart(theme, cats, values, step),
    answer: { kind: 'choice', options, correct: options.indexOf(right) },
    hints: [`Such ${fmt(values[t])} auf der Achse.`, 'Geh von dort waagerecht bis zu einer Säule.'],
    steps: [`Auf der Achse liegt ${fmt(values[t])} auf einer Linie.`, `Die Säule „${cats[t]}“ endet genau dort.`],
    praise: 'Du hast von der Achse aus die Säule gesucht.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB III, reasoning: the bar grows by some Kästchen. */
function growBar(rng: Rng, ab: Ab): Exercise {
  const step = rng.pick([5, 10]);
  const { theme, cats, values } = smallData(rng, step);
  const t = shuffledIndex(rng, cats.length);
  const grow = rng.int(2, 4);
  const value = values[t] + grow * step;
  const context = `Die Säule ${theme.at(cats[t])} wächst um ${fmt(grow)} Kästchen.`;
  const prompt = 'Welchen Wert zeigt die Säule dann?';
  return build(SKILL, 1, {
    key: `${ab}:wachsen:${theme.id}:${step}:${t}:${grow}:${cats.join('')}:${values.join()}`,
    ab,
    context,
    prompt,
    visual: chart(theme, cats, values, step),
    answer: { kind: 'number', value },
    hints: [STEP_HINT, 'Lies zuerst den Wert ab. Rechne dann die neuen Kästchen dazu.'],
    steps: [`Abgelesen: ${fmt(values[t])}`, `${fmt(grow)} Kästchen zählen ${fmt(grow)} · ${fmt(step)} = ${fmt(grow * step)}`, `${fmt(values[t])} + ${fmt(grow * step)} = ${fmt(value)}`],
    bugs: numberBugs([{ id: 'achse-schritt', match: values[t] + grow, hint: STEP_HINT }], value),
    praise: 'Du hast die Kästchen in Werte umgerechnet.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return readBar(rng, ab);
  if (ab === 2) return rng.chance(0.6) ? readBetween(rng, ab) : readPictogram(rng, ab);
  return rng.chance(0.5) ? findBar(rng, ab) : growBar(rng, ab);
}

// ─── Stufe 2: Unterschiede und Summen, Schritt 50 oder 1 000 ─────────────────

function largeData(rng: Rng, half = false, n = rng.int(3, 4)) {
  const thousand = rng.chance(0.5);
  const step = thousand ? 1000 : 50;
  const theme = rng.pick(thousand ? THOUSAND_THEMES : HUNDRED_THEMES);
  const cats = pickCats(rng, theme, n);
  const values = distinctMultiples(rng, n, step, step * 8, step).map((v) => (half && rng.chance(0.5) ? v + step / 2 : v));
  return { theme, step, cats, values };
}

/** AB I: the difference or the sum of two bars that end on lines. */
function twoBars(rng: Rng, ab: Ab): Exercise {
  const { theme, step, cats, values } = largeData(rng);
  const [i, j] = rng.sample(cats.map((_, k) => k), 2);
  const [hi, lo] = values[i] > values[j] ? [i, j] : [j, i];
  const kind = rng.pick(['mehr', 'weniger', 'zusammen'] as const);
  const prompt = kind === 'zusammen'
    ? `Wie viele ${theme.unit} sind es ${theme.at(cats[i])} und ${theme.at(cats[j])} zusammen?`
    : kind === 'mehr'
      ? `Wie viele ${theme.unit} sind es ${theme.at(cats[hi])} mehr als ${theme.at(cats[lo])}?`
      : `Wie viele ${theme.unit} sind es ${theme.at(cats[lo])} weniger als ${theme.at(cats[hi])}?`;
  const value = kind === 'zusammen' ? values[i] + values[j] : values[hi] - values[lo];
  const line = kind === 'zusammen' ? `${fmt(values[i])} + ${fmt(values[j])} = ${fmt(value)}` : `${fmt(values[hi])} − ${fmt(values[lo])} = ${fmt(value)}`;
  const bugs: MaybeBug[] = [
    stepBug(value, step),
    kind === 'zusammen'
      ? { id: 'unterschied-statt-summe', match: values[hi] - values[lo], hint: 'Gefragt sind beide Säulen zusammen.' }
      : { id: 'summe-statt-unterschied', match: values[hi] + values[lo], hint: 'Gefragt ist der Unterschied zwischen den Säulen.' },
  ];
  return build(SKILL, 2, {
    key: `${ab}:zwei:${theme.id}:${kind}:${i}:${j}:${cats.join('')}:${values.join()}`,
    ab,
    prompt,
    visual: chart(theme, cats, values, step),
    answer: { kind: 'number', value },
    hints: [STEP_HINT, 'Lies beide Werte ab. Rechne erst dann.'],
    steps: [`Ein Kästchen zählt ${fmt(step)}.`, `Abgelesen: ${fmt(values[i])} und ${fmt(values[j])}.`, `${line}`],
    bugs: numberBugs(bugs, value),
    praise: 'Du hast beide Werte abgelesen und dann gerechnet.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: the total of all bars, some ending halfway between two lines. */
function allBars(rng: Rng, ab: Ab): Exercise {
  const { theme, step, cats, values } = largeData(rng, true);
  const value = sum(values);
  const prompt = `Wie viele ${theme.unit} zeigt das ganze Diagramm zusammen?`;
  const lower = values.map((v) => Math.floor(v / step) * step);
  return build(SKILL, 2, {
    key: `${ab}:alle:${theme.id}:${cats.join('')}:${values.join()}`,
    ab,
    prompt,
    visual: chart(theme, cats, values, step),
    answer: { kind: 'number', value },
    hints: [STEP_HINT, `Ein halbes Kästchen zählt ${fmt(step / 2)}.`],
    steps: [`Abgelesen: ${values.map((v) => fmt(v)).join(', ')}.`, sumLine(values), `Zusammen sind es ${fmt(value)} ${theme.unit}.`],
    bugs: numberBugs([stepBug(value, step), { id: 'halber-schritt', match: sum(lower), hint: `Ein halbes Kästchen zählt auch: ${fmt(step / 2)}.` }], value),
    praise: 'Du hast auch die halben Kästchen genau gelesen.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB III: how much is missing to a goal? */
function goal(rng: Rng, ab: Ab): Exercise {
  const { theme, step, cats, values } = largeData(rng);
  const total = sum(values);
  const target = total + rng.int(1, 6) * step;
  const value = target - total;
  const context = `Das Ziel sind ${fmt(target)} ${theme.unit}.`;
  const prompt = 'Wie viele fehlen noch bis zum Ziel?';
  return build(SKILL, 2, {
    key: `${ab}:ziel:${theme.id}:${target}:${cats.join('')}:${values.join()}`,
    ab,
    context,
    prompt,
    visual: chart(theme, cats, values, step),
    answer: { kind: 'number', value },
    hints: ['Lies alle Werte ab. Wie viele sind es schon?', 'Zieh diese Summe vom Ziel ab.'],
    steps: [`Schon da: ${sumLine(values)}`, `${fmt(target)} − ${fmt(total)} = ${fmt(value)}`, `Es fehlen ${fmt(value)} ${theme.unit}.`],
    bugs: numberBugs([{ id: 'schritt-vergessen', match: total, hint: 'Das ist schon da. Wie viele fehlen bis zum Ziel?' }, stepBug(value, step)], value),
    praise: 'Du hast addiert und dann die Lücke zum Ziel berechnet.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** The indexes of the three largest values, largest first. */
const threeLargest = (values: readonly number[]) => values.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0]).slice(0, 3).map(([, i]) => i);

/** The largest value equals the next two together: no difference is left to find, and no smaller number to subtract. */
function tied(values: readonly number[]): boolean {
  const [top, a, b] = threeLargest(values);
  return values[top] === values[a] + values[b];
}

/** AB III: one bar against two others together. */
function oneAgainstTwo(rng: Rng, ab: Ab): Exercise {
  let d = largeData(rng, false, 4);
  while (tied(d.values)) d = largeData(rng, false, 4);
  const { theme, step, cats, values } = d;
  const [top, a, b] = threeLargest(values);
  const two = values[a] + values[b];
  const [hi, lo] = values[top] > two ? [values[top], two] : [two, values[top]];
  const value = hi - lo;
  const context = `Vergleiche den Wert ${theme.at(cats[top])} mit den Werten ${theme.at(cats[a])} und ${theme.at(cats[b])} zusammen.`;
  const prompt = 'Wie groß ist der Unterschied?';
  const bugs: MaybeBug[] = [stepBug(value, step), { id: 'summe-statt-unterschied', match: values[top] + two, hint: 'Gefragt ist der Unterschied, nicht die Summe.' }, value !== values[top] - values[a] && { id: 'nur-eine-saeule', match: values[top] - values[a], hint: `Rechne ${theme.at(cats[b])} auch mit.` }];
  return build(SKILL, 2, {
    key: `${ab}:vergleich:${theme.id}:${cats.join('')}:${values.join()}`,
    ab,
    context,
    prompt,
    visual: chart(theme, cats, values, step),
    answer: { kind: 'number', value },
    hints: ['Addiere zuerst die beiden Säulen.', 'Zieh dann die kleinere Zahl von der größeren ab.'],
    steps: [`${fmt(values[a])} + ${fmt(values[b])} = ${fmt(two)}`, `${fmt(hi)} − ${fmt(lo)} = ${fmt(value)}`, `Der Unterschied ist ${fmt(value)}.`],
    bugs: numberBugs(bugs, value),
    praise: 'Du hast die Rechnung in zwei Schritte geteilt.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return twoBars(rng, ab);
  if (ab === 2) return allBars(rng, ab);
  return rng.chance(0.5) ? goal(rng, ab) : oneAgainstTwo(rng, ab);
}

// ─── Stufe 3: von der Tabelle zum Diagramm; welches Diagramm passt? ──────────

/** Charts A, B, C, one of them right. The wrong ones explain themselves through whyWrong. */
function chartChoice(rng: Rng, right: VisualOf<'barChart'>, wrongs: { chart: VisualOf<'barChart'>; why: string }[]) {
  const shuffled = rng.shuffle([{ chart: right, why: undefined as string | undefined }, ...wrongs]);
  const options: ChoiceOption[] = shuffled.map((o, i) => ({ label: `Diagramm ${'ABC'[i]}`, visual: o.chart, ...(o.why ? { whyWrong: o.why } : {}) }));
  return { options, correct: shuffled.findIndex((o) => o.chart === right) };
}

/** Four values at step 50 or 1 000 for option charts, at least one ending halfway between two lines. All charts of a task share one axis. */
function optionData(rng: Rng) {
  const { theme, step, cats } = largeData(rng, false, 4);
  const halves = [2, 3, 4, 5, 6, 7, 8, 9];
  let values: number[];
  do values = rng.sample(halves, 4).map((h) => (h * step) / 2); while (values.every((v) => v % step === 0));
  const drawn = (shown: readonly number[]) => chart(theme, cats, shown, step, { horizontal: true, axisMax: 5 * step });
  return { theme, step, cats, values, drawn };
}

/** AB I: which chart shows the table? One wrong chart swaps two bars, one changes a bar by half a Kästchen. */
function tableToChart(rng: Rng, ab: Ab): Exercise {
  const { theme, cats, step, values, drawn } = optionData(rng);
  const [i, j, k] = rng.sample([0, 1, 2, 3], 3);
  const swapped = values.map((v, n) => (n === i ? values[j] : n === j ? values[i] : v));
  const changed = values.map((v, n) => (n === k ? v + step / 2 : v));
  const { options, correct } = chartChoice(rng, drawn(values), [
    { chart: drawn(swapped), why: `Vergleiche „${cats[i]}“ und „${cats[j]}“ mit der Tabelle.` },
    { chart: drawn(changed), why: `Lies bei „${cats[k]}“ noch einmal ab.` },
  ]);
  const prompt = 'Welches Diagramm zeigt die Tabelle?';
  return build(SKILL, 3, {
    key: `${ab}:tabelle:${theme.id}:${cats.join('')}:${values.join()}:${i}${j}${k}`,
    ab,
    prompt,
    visual: dataTable(theme, cats, values),
    answer: { kind: 'choice', options, correct, layout: 'grid' },
    hints: ['Prüfe jeden Balken einzeln mit der Tabelle.', `Ein halbes Kästchen zählt ${fmt(step / 2)}.`],
    steps: [`Die Tabelle zeigt ${cats.map((c, n) => `${c} ${fmt(values[n])}`).join(', ')}.`, `${options[correct].label} zeigt genau diese Werte.`],
    praise: 'Du hast jeden Balken mit der Tabelle verglichen.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** The usual steps of an axis, from small to large. */
const AXIS_STEPS = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

/**
 * AB II: choose the axis step: about 5 to 10 lines reach the largest value. The wrong steps lie below, above or on both sides of the right one, so
 * its place among the options says nothing: only the number of lines decides.
 */
function chooseStep(rng: Rng, ab: Ab): Exercise {
  const step = rng.pick([50, 100, 200, 500, 1000]);
  const theme = rng.pick(step >= 500 ? THOUSAND_THEMES : HUNDRED_THEMES);
  const n = 4;
  const cats = pickCats(rng, theme, n);
  const values = distinctMultiples(rng, n, step, step * 8, step);
  if (Math.max(...values) < step * 5) values[0] = step * 6;
  const top = Math.max(...values);
  const lines = (s: number) => top / s + 1;
  const tooFine = AXIS_STEPS.filter((s) => s < step && lines(s) > 10).slice(-2).map((s) => ({ label: `Schritt ${fmt(s)}`, whyWrong: 'Bei diesem Schritt brauchst du viel zu viele Linien.' }));
  const tooWide = AXIS_STEPS.filter((s) => s > step && lines(s) < 5).slice(0, 2).map((s) => ({ label: `Schritt ${fmt(s)}`, whyWrong: 'Bei diesem Schritt hat die Achse viel zu wenige Linien.' }));
  const wrongs = rng.pick([tooFine, tooWide, [tooFine[tooFine.length - 1], tooWide[0]]]);
  const right: ChoiceOption = { label: `Schritt ${fmt(step)}` };
  const options = rng.shuffle<ChoiceOption>([right, ...wrongs]);
  const context = 'Du zeichnest ein Säulendiagramm zu dieser Tabelle.';
  const prompt = 'Welcher Schritt passt zur Achse?';
  return build(SKILL, 3, {
    key: `${ab}:schritt:${theme.id}:${cats.join('')}:${values.join()}:${wrongs.map((w) => w.label).join()}`,
    ab,
    context,
    prompt,
    visual: dataTable(theme, cats, values),
    answer: { kind: 'choice', options, correct: options.indexOf(right) },
    hints: ['Schau auf den größten Wert der Tabelle.', 'Die Achse soll etwa 5 bis 10 Linien haben.'],
    steps: [`Der größte Wert ist ${fmt(top)}.`, `Mit Schritt ${fmt(step)} reichen ${fmt(lines(step))} Linien.`, `Also passt Schritt ${fmt(step)}.`],
    praise: 'Du hast den Schritt nach dem größten Wert gewählt.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** What one picture can stand for, and the legends a child might try. */
const ICON_VALUES = [3, 4, 5, 6, 8, 10, 12, 15, 20, 25];
const ICON_LEGENDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50];

/** AB II: which value can one picture of a Bilddiagramm stand for? A wrong legend fits one or two values, so only checking all of them decides. */
function chooseIcon(rng: Rng, ab: Ab): Exercise {
  const iconValue = rng.pick(ICON_VALUES);
  const theme = rng.pick(SMALL_THEMES);
  const cats = pickCats(rng, theme, 3);
  const values = distinctMultiples(rng, 3, iconValue, iconValue * 6, iconValue);
  // the wrong values never divide all values of the table
  const wrongs = ICON_LEGENDS.filter((w) => !values.every((v) => v % w === 0));
  const traps = wrongs.filter((w) => values.some((v) => v % w === 0));
  const right: ChoiceOption = { label: `Ein Bild für ${fmt(iconValue)}` };
  const options = rng.shuffle<ChoiceOption>([right, ...rng.sample(traps.length >= 2 ? traps : wrongs, 2).map((w) => ({ label: `Ein Bild für ${fmt(w)}`, whyWrong: `Kommst du mit ${fmt(w)} genau auf alle Werte? Prüfe das.` }))]);
  const context = 'Du zeichnest ein Bilddiagramm. Jede Zeile soll nur ganze Bilder haben.';
  const prompt = 'Welche Legende passt?';
  return build(SKILL, 3, {
    key: `${ab}:legende:${theme.id}:${iconValue}:${cats.join('')}:${values.join()}`,
    ab,
    context,
    prompt,
    visual: dataTable(theme, cats, values),
    answer: { kind: 'choice', options, correct: options.indexOf(right) },
    hints: ['Teile jeden Wert der Tabelle durch die Zahl der Legende.', 'Der Teiler muss bei allen Werten aufgehen.'],
    steps: [`${values.map((v) => `${fmt(v)} : ${fmt(iconValue)} = ${fmt(v / iconValue)}`).join('; ')}.`, `Mit ${fmt(iconValue)} gibt es nur ganze Bilder.`],
    praise: 'Du hast die Legende an allen Werten geprüft.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** Names too long for a slot under a Säule, still short enough for one table line on a phone. */
const LONG_NAMES = ['Sommerfest im Park', 'Flohmarkt im Hof', 'Lesenacht im Saal', 'Spielefest im Hof', 'Sportfest am See', 'Kuchenbasar im Hof'];

/** Two-digit values that no picture of 5 or 10 reaches. */
const unevenValues = (rng: Rng, n: number) => rng.sample(Array.from({ length: 80 }, (_, i) => i + 13).filter((v) => v % 5 !== 0), n);

const pictureWhy = (value: number) => `Ein Bild zählt zum Beispiel 5 oder 10. Dann passt ${fmt(value)} nicht genau.`;

/** A question about what a table or a list shows: the data decide the answer, so every wrong option has a reason in the data. */
interface ChartFit {
  id: string;
  context: string;
  prompt: string;
  visual: VisualOf<'table'>;
  right: string;
  wrongs: readonly [string, string][];
  why: string;
  hints: readonly [string, string];
}

/** Long names: only bars have room for them. */
function fitLongNames(rng: Rng): ChartFit {
  const cats = rng.sample(LONG_NAMES, 4);
  const values = unevenValues(rng, 4);
  return {
    id: `lang:${cats.join()}:${values.join()}`,
    context: 'Du zeichnest ein Diagramm zu dieser Tabelle.',
    prompt: 'Welche Darstellung passt am besten?',
    visual: dataTable({ title: 'Besucher der Schulfeste', header: 'Fest' }, cats, values),
    right: 'Balkendiagramm',
    wrongs: [['Säulendiagramm', 'Lange Namen passen schlecht unter eine schmale Säule.'], ['Bilddiagramm', pictureWhy(values[0])]],
    why: 'Bei Balken stehen die Namen links neben dem Balken. Dort ist viel Platz.',
    hints: ['Schau dir die Namen und die Werte der Tabelle an.', 'Wo haben die Namen Platz?'],
  };
}

/** Exact values with no common picture size: Säulen show them, pictures do not, and the counting is done. */
function fitExactValues(rng: Rng): ChartFit {
  const theme = rng.pick(SMALL_THEMES);
  const cats = pickCats(rng, theme, 4);
  const values = unevenValues(rng, 4);
  return {
    id: `genau:${theme.id}:${cats.join()}:${values.join()}`,
    context: 'Du zeichnest ein Diagramm zu dieser Tabelle.',
    prompt: 'Welche Darstellung passt am besten?',
    visual: dataTable(theme, cats, values),
    right: 'Säulendiagramm',
    wrongs: [['Bilddiagramm', pictureWhy(values[0])], ['Strichliste', 'Eine Strichliste hilft beim Zählen. Die Anzahlen stehen schon in der Tabelle.']],
    why: 'Die Namen sind kurz, und jede Säule zeigt ihren Wert genau.',
    hints: ['Schau dir die Werte der Tabelle an.', 'Kommst du mit ganzen Bildern genau auf jeden Wert?'],
  };
}

/** An Urliste: before any chart, the values have to be counted. */
function fitCountFirst(rng: Rng): ChartFit {
  const theme = rng.pick(SMALL_THEMES.filter((t) => !t.ordered));
  const cats = pickCats(rng, theme, 4);
  const values = Array.from({ length: 20 }, () => rng.pick(cats));
  return {
    id: `zuerst:${theme.id}:${values.join()}`,
    context: 'Aus dieser Urliste soll ein Diagramm entstehen.',
    prompt: 'Welche Darstellung machst du zuerst?',
    visual: listTable(`Urliste: ${theme.title}`, values),
    right: 'Strichliste',
    wrongs: [['Säulendiagramm', 'Für das Diagramm brauchst du zuerst die Anzahlen.'], ['Bilddiagramm', 'Für das Diagramm brauchst du zuerst die Anzahlen.']],
    why: 'In der Strichliste zählst du die Werte aus. Danach zeichnest du das Diagramm.',
    hints: ['Stehen die Anzahlen schon da?', 'Was brauchst du für jede Säule?'],
  };
}

/** AB II: which representation fits these data? */
function chooseChart(rng: Rng, ab: Ab): Exercise {
  const fit = rng.pick([fitLongNames, fitExactValues, fitCountFirst])(rng);
  const right: ChoiceOption = { label: fit.right };
  const options = rng.shuffle<ChoiceOption>([right, ...fit.wrongs.map(([label, whyWrong]) => ({ label, whyWrong }))]);
  return build(SKILL, 3, {
    key: `${ab}:form:${fit.id}`,
    ab,
    context: fit.context,
    prompt: fit.prompt,
    visual: fit.visual,
    answer: { kind: 'choice', options, correct: options.indexOf(right) },
    hints: [...fit.hints],
    steps: [fit.why, `Also passt: ${fit.right}.`],
    praise: 'Du hast die Darstellung nach den Daten gewählt.',
    srText: spoken(fit.prompt, fit.context),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** AB III: a value of the table is missing; the total decides which chart is right. */
function missingToChart(rng: Rng, ab: Ab): Exercise {
  const { theme, cats, step, values, drawn } = optionData(rng);
  const t = rng.int(0, 3);
  const total = sum(values);
  const others = values.filter((_, i) => i !== t);
  const missing = values[t];
  const up = values.map((v, i) => (i === t ? v + step / 2 : v));
  const down = values.map((v, i) => (i === t ? v - step / 2 : v));
  const why = `Rechne „${cats[t]}“ zuerst aus der Zeile „Zusammen“ aus.`;
  const { options, correct } = chartChoice(rng, drawn(values), [{ chart: drawn(up), why }, { chart: drawn(down), why }]);
  const prompt = 'Welches Diagramm passt zur Tabelle?';
  return build(SKILL, 3, {
    key: `${ab}:luecke:${theme.id}:${t}:${cats.join('')}:${values.join()}`,
    ab,
    prompt,
    visual: dataTable(theme, cats, values.map((v, i) => (i === t ? null : v)), total),
    answer: { kind: 'choice', options, correct, layout: 'grid' },
    hints: ['Ein Wert fehlt in der Tabelle. Rechne den Wert zuerst aus.', 'Die Zeile „Zusammen“ hilft dir dabei.'],
    steps: [sumLine(others), `${fmt(total)} − ${fmt(sum(others))} = ${fmt(missing)}`, `${options[correct].label} zeigt bei „${cats[t]}“ den Wert ${fmt(missing)}.`],
    praise: 'Du hast den fehlenden Wert berechnet und dann verglichen.',
    srText: spoken(prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return tableToChart(rng, ab);
  if (ab === 2) return rng.pick([chooseStep, chooseIcon, chooseChart])(rng, ab);
  return missingToChart(rng, ab);
}

// ─── Skill ───────────────────────────────────────────────────────────────────

const BY_STUFE: Record<Stufe, (rng: Rng, ab: Ab) => Exercise> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const diagrammeSkill: SkillDef = {
  ...SKILL,
  title: 'Diagramme lesen',
  description: 'Du liest Werte ab und vergleichst sie.',
  stufen: {
    1: 'Eine Säule ablesen, Achse in Schritten von 5 oder 10',
    2: 'Unterschiede und Summen, Achse in Schritten von 50 oder 1000',
    3: 'Von der Tabelle zum Diagramm: Welches Diagramm passt?',
  },
  kmk: ['DZ.diagramme', 'PK.darstellen', 'PK.problemloesen', 'PK.modellieren'],
  generate(rng, stufe, ctx) {
    return BY_STUFE[stufe](rng, targetAb(rng, stufe, ctx));
  },
};
