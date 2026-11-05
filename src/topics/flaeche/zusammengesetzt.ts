/**
 * flaeche.zusammengesetzt (docs/research.md §6).
 * Stufe 1: L-form on a grid, split line given. AB I count with the split, AB II each part in its own field, AB III a Kästchen worth more than 1 cm².
 * Stufe 2: L-form with lengths, own split. AB I split given, AB II no split, AB III two sides without a number.
 * Stufe 3: cut-out, two ways. AB I an L-form as large rectangle minus corner, AB II a story or a hole in a grid of Kästchen wider than 1 cm, AB III both ways, or the corner from the rest.
 */
import { speak } from '../../core/format';
import type { Cell, MultiField, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { pickPerson } from '../shared';
import { HINT, bug, generator, lArea, lShape, lSides, numberAnswer, pickL, q, rectCells, type Forms, type Item, type LForm } from './common';

const SKILL = { id: 'flaeche.zusammengesetzt', topicId: 'flaeche' } as const;
const KMK = ['GM.umfang-flaeche'];

const HUELLE = 'Das große Rechteck ist zu viel: Eine Ecke fehlt.';
const SPLIT_HINT = 'Rechne jedes Rechteck einzeln. Addiere danach beide Teile.';

const doubled = (l: LForm) => (l.w - l.cutW) * l.h + l.w * (l.h - l.cutH);
const wrongSide = (l: LForm) => l.w * (l.h - l.cutH) + l.cutW * l.cutH;
const perimeter = (l: LForm) => 2 * l.w + 2 * l.h;

/** The two rectangles of a split, with their sides. */
function parts(l: LForm, split: 'vertical' | 'horizontal') {
  return split === 'vertical'
    ? { first: [l.w - l.cutW, l.h], second: [l.cutW, l.h - l.cutH], names: ['links', 'rechts'] }
    : { first: [l.w - l.cutW, l.cutH], second: [l.w, l.h - l.cutH], names: ['oben', 'unten'] };
}

const L_BUGS = (l: LForm) => [
  bug('zerlegen-doppelt', doubled(l), HINT.zerlegenDoppelt),
  bug('huelle', l.w * l.h, HUELLE),
  bug('falsche-seite', wrongSide(l), 'Prüfe die Seiten: Passt jede Seite zu diesem Rechteck?'),
  bug('umfang-flaeche', perimeter(l), HINT.umfangFlaeche),
];

// ─── L-form on a grid ────────────────────────────────────────────────────────

/** An L-form on a grid with a margin of one Kästchen, mirrored at random. The line of the split lies on the grid. */
function lOnGrid(rng: Rng, split: 'vertical' | 'horizontal') {
  const l = pickL(rng, [4, 6], [4, 6], false);
  const flipX = rng.chance(0.5);
  const flipY = rng.chance(0.5);
  const cell = ([x, y]: Cell): Cell => [(flipX ? l.w - 1 - x : x) + 1, (flipY ? l.h - 1 - y : y) + 1];
  const cells = rectCells(0, 0, l.w, l.h).filter(([x, y]) => !(x >= l.w - l.cutW && y < l.cutH)).map(cell);
  const at = split === 'vertical' ? 1 + (flipX ? l.cutW : l.w - l.cutW) : 1 + (flipY ? l.h - l.cutH : l.cutH);
  const visual: VisualOf<'grid'> = { type: 'grid', width: l.w + 2, height: l.h + 2, cells, showOutline: true, axis: { orientation: split, at } };
  const { first, second, names } = parts(l, split);
  const flipped = split === 'vertical' ? flipX : flipY;
  return { l, visual, first, second, names: flipped ? [names[1], names[0]] : names, key: `${l.w}x${l.h}-${l.cutW}x${l.cutH}:${split}:${flipX ? 'x' : ''}${flipY ? 'y' : ''}` };
}

const s1Count: Forms[1][1] = (rng) => {
  const { l, visual, first, second, names, key } = lOnGrid(rng, rng.pick(['vertical', 'horizontal']));
  const [a, b] = [first[0] * first[1], second[0] * second[1]];
  return {
    key: `gitter:${key}`,
    prompt: 'Die Linie teilt die Figur in zwei Rechtecke. Wie viele Kästchen hat die Figur?',
    visual,
    answer: numberAnswer(a + b, 'Kästchen'),
    hints: [SPLIT_HINT, 'Rechne bei jedem Rechteck Reihen · Kästchen in einer Reihe.'],
    steps: [`Teil ${names[0]}: ${first[0]} · ${first[1]} = ${a}`, `Teil ${names[1]}: ${second[0]} · ${second[1]} = ${b}`, `${a} + ${b} = ${a + b}`, `Die Figur hat ${a + b} Kästchen.`],
    bugs: L_BUGS(l),
    praise: 'Du hast beide Rechtecke einzeln gerechnet.',
    srText: speak(`Eine L-Form im Gitter. Eine Linie teilt die Figur in zwei Rechtecke: ${first[0]} mal ${first[1]} und ${second[0]} mal ${second[1]} Kästchen. Wie viele Kästchen hat die Figur?`),
  };
};

const s1Fields: Forms[1][2] = (rng) => {
  const { l, visual, first, second, names, key } = lOnGrid(rng, rng.pick(['vertical', 'horizontal']));
  const [a, b] = [first[0] * first[1], second[0] * second[1]];
  const fields: MultiField[] = [
    { id: 'a', value: a, before: `Teil ${names[0]}:`, after: 'Kästchen', label: `Teil ${names[0]}` },
    { id: 'b', value: b, before: `Teil ${names[1]}:`, after: 'Kästchen', label: `Teil ${names[1]}` },
    { id: 'c', value: a + b, before: 'Zusammen:', after: 'Kästchen', label: 'Zusammen' },
  ];
  return {
    key: `gitter-teile:${key}`,
    prompt: 'Die Linie teilt die Figur. Wie viele Kästchen haben die Teile und die ganze Figur?',
    visual,
    answer: { kind: 'multi', fields },
    hints: ['Schau jeden Teil für sich an.', 'Addiere am Ende die beiden Teile.'],
    steps: [`Teil ${names[0]}: ${first[0]} · ${first[1]} = ${a}`, `Teil ${names[1]}: ${second[0]} · ${second[1]} = ${b}`, `Zusammen: ${a} + ${b} = ${a + b}`],
    bugs: [
      bug('huelle', { a, b, c: l.w * l.h }, HUELLE),
      bug('zerlegen-doppelt', { a, b, c: doubled(l) }, HINT.zerlegenDoppelt),
    ],
    praise: 'Du hast jeden Teil genau einmal gezählt.',
    srText: speak(`Eine L-Form im Gitter. Eine Linie teilt die Figur in die Teile ${names[0]} und ${names[1]}. Teil ${names[0]} ist ${first[0]} mal ${first[1]} Kästchen groß, Teil ${names[1]} ist ${second[0]} mal ${second[1]} Kästchen groß. Wie viele Kästchen haben die Teile und die ganze Figur?`),
  };
};

const s1Worth: Forms[1][3] = (rng) => {
  const { l, visual, first, second, names, key } = lOnGrid(rng, rng.pick(['vertical', 'horizontal']));
  const [a, b] = [first[0] * first[1], second[0] * second[1]];
  const k = rng.pick([2, 3, 4, 5]);
  const area = (a + b) * k;
  return {
    key: `gitter-wert:${k}:${key}`,
    prompt: `Ein Kästchen ist ${q(k, 'cm²')} groß. Wie groß ist der Flächeninhalt der Figur?`,
    visual,
    answer: numberAnswer(area, 'cm²', 'Flächeninhalt:'),
    hints: ['Zähle zuerst alle Kästchen mit beiden Teilen.', `Jedes Kästchen zählt ${q(k, 'cm²')}.`],
    steps: [`Teil ${names[0]}: ${first[0]} · ${first[1]} = ${a}`, `Teil ${names[1]}: ${second[0]} · ${second[1]} = ${b}`, `${a} + ${b} = ${a + b}`, `${a + b} · ${k} = ${area}`, `Der Flächeninhalt ist ${q(area, 'cm²')}.`],
    bugs: [
      bug('kaestchen-wert', a + b, `Das sind die Kästchen. Jedes Kästchen zählt ${q(k, 'cm²')}.`),
      bug('zerlegen-doppelt', doubled(l) * k, HINT.zerlegenDoppelt),
      bug('huelle', l.w * l.h * k, HUELLE),
    ],
    praise: 'Du hast Kästchen gezählt und ihren Wert beachtet.',
    srText: speak(`Eine L-Form im Gitter, zwei Rechtecke mit ${first[0]} mal ${first[1]} und ${second[0]} mal ${second[1]} Kästchen. Ein Kästchen ist ${q(k, 'cm²')} groß. Wie groß ist der Flächeninhalt der Figur?`),
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

// ─── L-form with lengths ─────────────────────────────────────────────────────

const lengthSteps = (l: LForm, split: 'vertical' | 'horizontal', unit: string) => {
  const { first, second, names } = parts(l, split);
  const [a, b] = [first[0] * first[1], second[0] * second[1]];
  return [
    `Rechteck ${names[0]}: ${first[0]} · ${first[1]} = ${a}`,
    `Rechteck ${names[1]}: ${second[0]} · ${second[1]} = ${b}`,
    `${a} + ${b} = ${a + b}`,
    `Der Flächeninhalt ist ${q(a + b, `${unit}²`)}.`,
  ];
};

const lSpoken = (l: LForm, unit: string) => lSides(l).map((s) => q(s, unit)).join(', ');

const s2Split: Forms[2][1] = (rng) => {
  const l = pickL(rng, [8, 20], [6, 16]);
  const unit = rng.pick(['cm', 'm']);
  const split = rng.pick(['vertical', 'horizontal'] as const);
  return {
    key: `laengen:${l.w}x${l.h}-${l.cutW}x${l.cutH}:${split}${unit}`,
    prompt: 'Die Linie zerlegt die Figur in zwei Rechtecke. Wie groß ist der Flächeninhalt?',
    visual: lShape(l, unit, undefined, split),
    answer: numberAnswer(lArea(l), `${unit}²`, 'Flächeninhalt:'),
    hints: ['Suche zu jedem Rechteck seine Länge und seine Breite.', SPLIT_HINT],
    steps: lengthSteps(l, split, unit),
    bugs: L_BUGS(l),
    praise: 'Du hast die passenden Seiten zu jedem Rechteck gefunden.',
    srText: speak(`Eine L-Form mit den Seiten ${lSpoken(l, unit)}. Eine Linie zerlegt die Figur in zwei Rechtecke. Wie groß ist der Flächeninhalt?`),
  };
};

const s2OwnSplit: Forms[2][2] = (rng) => {
  const l = pickL(rng, [9, 24], [7, 18]);
  const unit = rng.pick(['cm', 'm']);
  return {
    key: `laengen-frei:${l.w}x${l.h}-${l.cutW}x${l.cutH}${unit}`,
    prompt: 'Zerlege die Figur selbst in zwei Rechtecke. Wie groß ist der Flächeninhalt?',
    visual: lShape(l, unit),
    answer: numberAnswer(lArea(l), `${unit}²`, 'Flächeninhalt:'),
    hints: ['Zeichne eine Linie von der inneren Ecke bis zum Rand.', SPLIT_HINT],
    steps: lengthSteps(l, 'vertical', unit),
    bugs: L_BUGS(l),
    praise: 'Du hast selbst eine passende Linie gefunden.',
    srText: speak(`Eine L-Form mit den Seiten ${lSpoken(l, unit)}. Zerlege die Figur selbst in zwei Rechtecke. Wie groß ist der Flächeninhalt?`),
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

const s2Missing: Forms[2][3] = (rng) => {
  const l = pickL(rng, [10, 26], [8, 20]);
  const unit = rng.pick(['cm', 'm']);
  const sides = lSides(l);
  return {
    key: `laengen-fehlen:${l.w}x${l.h}-${l.cutW}x${l.cutH}${unit}`,
    prompt: 'Zwei Seiten haben keine Zahl. Wie groß ist der Flächeninhalt?',
    visual: lShape(l, unit, [1, 2, 4, 5]),
    answer: numberAnswer(lArea(l), `${unit}²`, 'Flächeninhalt:'),
    hints: ['Rechne zuerst die Seiten ohne Zahl aus.', 'Lange Seite minus kurze Seite ergibt die fehlende Seite.'],
    steps: [
      `Fehlende Seiten: ${l.w} − ${l.cutW} = ${sides[0]} und ${l.h} − ${l.cutH} = ${sides[3]}`,
      ...lengthSteps(l, 'vertical', unit),
    ],
    bugs: L_BUGS(l),
    praise: 'Du hast die fehlenden Seiten zuerst ausgerechnet.',
    srText: speak(`Eine L-Form, ${q(l.w, unit)} breit und ${q(l.h, unit)} hoch. An der Ecke fehlt ein Stück: ${q(l.cutW, unit)} breit und ${q(l.cutH, unit)} hoch. Wie groß ist der Flächeninhalt?`),
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

// ─── Cut-out ─────────────────────────────────────────────────────────────────

const cutBugs = (hull: number, cut: number) => [
  bug('huelle', hull, 'Das ist das ganze Rechteck. Das fehlende Stück musst du abziehen.'),
  bug('ausschnitt-addiert', hull + cut, 'Das Stück fehlt. Zieh seine Fläche ab.'),
  bug('nur-ausschnitt', cut, 'Das ist nur das fehlende Stück. Gefragt ist der Rest.'),
];

const s3Corner: Forms[3][1] = (rng) => {
  const l = pickL(rng, [10, 28], [8, 22]);
  const unit = rng.pick(['cm', 'm']);
  const hull = l.w * l.h;
  const cut = l.cutW * l.cutH;
  return {
    key: `ecke-abziehen:${l.w}x${l.h}-${l.cutW}x${l.cutH}${unit}`,
    prompt: 'Ergänze die Figur zu einem großen Rechteck. Zieh dann die Ecke ab. Wie groß ist der Flächeninhalt?',
    visual: lShape(l, unit),
    answer: numberAnswer(hull - cut, `${unit}²`, 'Flächeninhalt:'),
    hints: ['Das große Rechteck hat die ganze Seite unten und die ganze Seite links.', 'Die fehlende Ecke ist auch ein Rechteck.'],
    steps: [`Großes Rechteck: ${l.w} · ${l.h} = ${hull}`, `Fehlende Ecke: ${l.cutW} · ${l.cutH} = ${cut}`, `${hull} − ${cut} = ${hull - cut}`, `Der Flächeninhalt ist ${q(hull - cut, `${unit}²`)}.`],
    bugs: cutBugs(hull, cut),
    praise: 'Du hast ergänzt und die Ecke abgezogen.',
    srText: speak(`Eine L-Form mit den Seiten ${lSpoken(l, unit)}. Ergänze die Figur zu einem großen Rechteck. Zieh dann die Ecke ab. Wie groß ist der Flächeninhalt?`),
  };
};

/** Two real products as on Stufe 2: no part of 1 m by 1 m, no hull a child sees at once. */
const STORIES = [
  { big: 'Eine Hallenwand', part: 'Das Fenster', bigL: 'lang', partL: 'breit', ask: (n: string) => `Wie viel Wand kann ${n} streichen?`, min: [14, 5], max: [28, 9], partMin: [3, 2], partMax: [6, 3] },
  { big: 'Eine Wiese', part: 'Der Teich', bigL: 'lang', partL: 'lang', ask: (n: string) => `Wie viel Rasen kann ${n} mähen?`, min: [16, 9], max: [30, 18], partMin: [3, 2], partMax: [10, 6] },
  { big: 'Ein Schulhof', part: 'Der Sandkasten', bigL: 'lang', partL: 'lang', ask: (n: string) => `Wie viel Boden kann ${n} kehren?`, min: [24, 14], max: [40, 24], partMin: [3, 2], partMax: [6, 5] },
] as const;

const s3Story: Forms[3][2] = (rng): Item => {
  if (rng.chance(0.35)) {
    // counting is no way here: a Kästchen is k cm long, so the sides are lengths and a Kästchen counts k · k cm²
    const k = rng.int(2, 4);
    const w = rng.int(7, 10);
    const h = rng.int(5, 8);
    const hw = rng.int(2, 3);
    const hh = 2;
    const x = rng.int(1, w - hw - 1);
    const y = rng.int(1, h - hh - 1);
    const cells = rectCells(0, 0, w, h).filter(([cx, cy]) => !(cx >= x && cx < x + hw && cy >= y && cy < y + hh));
    const hull = w * k * h * k;
    const cut = hw * k * hh * k;
    const counted = w * h - hw * hh;
    return {
      key: `loch:${w * k}x${h * k}-${hw * k}x${hh * k}@${x},${y}:${k}`,
      prompt: `Ein Kästchen ist ${q(k, 'cm')} lang und ${q(k, 'cm')} breit. Die Figur hat ein Loch. Wie groß ist der Flächeninhalt?`,
      visual: { type: 'grid', width: w, height: h, cells, showOutline: true },
      answer: numberAnswer(hull - cut, 'cm²', 'Flächeninhalt:'),
      hints: ['Rechne zuerst aus: Wie lang sind die Seiten in cm?', 'Rechne das ganze Rechteck. Zieh dann das Loch ab.'],
      steps: [`Seiten vom Rechteck: ${w} · ${k} = ${w * k} und ${h} · ${k} = ${h * k}`, `Ganzes Rechteck: ${w * k} · ${h * k} = ${hull}`, `Loch: ${hw * k} · ${hh * k} = ${cut}`, `${hull} − ${cut} = ${hull - cut}`, `Der Flächeninhalt ist ${q(hull - cut, 'cm²')}.`],
      bugs: [
        ...cutBugs(hull, cut),
        bug('kaestchen-wert', counted, `Das sind die Kästchen. Ein Kästchen ist ${q(k, 'cm')} lang und ${q(k, 'cm')} breit.`),
        bug('kaestchen-einmal', counted * k, `Ein Kästchen zählt ${k} · ${k} cm², nicht ${q(k, 'cm²')}.`),
      ],
      praise: 'Du hast das Loch vom ganzen Rechteck abgezogen.',
      srText: speak(`Ein Rechteck im Gitter, ${w} Kästchen breit und ${h} Kästchen hoch, mit einem Loch von ${hw} mal ${hh} Kästchen. Ein Kästchen ist ${q(k, 'cm')} lang und ${q(k, 'cm')} breit. Wie groß ist der Flächeninhalt?`),
    };
  }
  const s = rng.pick(STORIES);
  const { name } = pickPerson(rng);
  const a = rng.int(s.min[0], s.max[0]);
  const b = rng.int(s.min[1], s.max[1]);
  const pa = rng.int(s.partMin[0], Math.min(s.partMax[0], Math.floor(a / 2)));
  const pb = rng.int(s.partMin[1], Math.min(s.partMax[1], Math.floor(b / 2)));
  const hull = a * b;
  const cut = pa * pb;
  return {
    key: `sache:${s.big}:${a}x${b}-${pa}x${pb}`,
    context: `${s.big} ist ${q(a, 'm')} ${s.bigL} und ${q(b, 'm')} ${s.big === 'Eine Hallenwand' ? 'hoch' : 'breit'}. ${s.part} ist ${q(pa, 'm')} ${s.partL} und ${q(pb, 'm')} ${s.part === 'Das Fenster' ? 'hoch' : 'breit'}.`,
    prompt: s.ask(name),
    answer: numberAnswer(hull - cut, 'm²'),
    hints: ['Rechne zuerst die ganze große Fläche.', 'Zieh dann die kleine Fläche ab.'],
    steps: [`Große Fläche: ${a} · ${b} = ${hull}`, `Kleine Fläche: ${pa} · ${pb} = ${cut}`, `${hull} − ${cut} = ${hull - cut}`, `Es bleiben ${q(hull - cut, 'm²')}.`],
    bugs: cutBugs(hull, cut),
    praise: 'Du hast die kleine Fläche von der großen abgezogen.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

const s3TwoWays: Forms[3][3] = (rng): Item => {
  const unit = 'cm';
  if (rng.chance(0.6)) {
    const l = pickL(rng, [8, 20], [6, 16]);
    const { first, second } = parts(l, 'vertical');
    const [a, b] = [first[0] * first[1], second[0] * second[1]];
    const hull = l.w * l.h;
    const cut = l.cutW * l.cutH;
    const fields: MultiField[] = [
      { id: 'links', value: a, before: 'Zerlegen: Teil links', after: 'cm²', label: 'Teil links' },
      { id: 'rechts', value: b, before: 'Teil rechts', after: 'cm²', label: 'Teil rechts' },
      { id: 'gross', value: hull, before: 'Ergänzen: großes Rechteck', after: 'cm²', label: 'Großes Rechteck' },
      { id: 'ecke', value: cut, before: 'fehlende Ecke', after: 'cm²', label: 'Fehlende Ecke' },
      { id: 'flaeche', value: a + b, before: 'Beide Wege ergeben', after: 'cm²', label: 'Flächeninhalt' },
    ];
    return {
      key: `zwei-wege:${l.w}x${l.h}-${l.cutW}x${l.cutH}`,
      prompt: 'Rechne auf zwei Wegen: Zerlegen und Ergänzen. Vergleiche beide Ergebnisse.',
      visual: lShape(l, unit, undefined, 'vertical'),
      answer: { kind: 'multi', fields },
      hints: ['Zerlegen: Die Linie zeigt die beiden Teile.', 'Ergänzen: Großes Rechteck minus fehlende Ecke.'],
      steps: [`Zerlegen: ${a} + ${b} = ${a + b}`, `Ergänzen: ${hull} − ${cut} = ${hull - cut}`, `Teile ${a} und ${b}, Rechteck ${hull}, Ecke ${cut}, Fläche ${a + b}`],
      bugs: [
        bug('zerlegen-doppelt', { flaeche: doubled(l) }, HINT.zerlegenDoppelt),
        bug('ausschnitt-addiert', { flaeche: hull + cut }, 'Das Stück fehlt. Zieh seine Fläche ab.'),
        bug('huelle', { flaeche: hull }, HUELLE),
      ],
      praise: 'Du hast geprüft: Beide Wege ergeben dasselbe.',
      srText: speak(`Eine L-Form mit den Seiten ${lSpoken(l, unit)}. Eine senkrechte Linie zerlegt die Figur. Rechne auf zwei Wegen: Zerlegen und Ergänzen. Vergleiche beide Ergebnisse.`),
      kmk: [...KMK, 'PK.argumentieren'],
    };
  }
  const w = rng.int(9, 20);
  const h = rng.int(7, 16);
  const s = rng.int(2, Math.min(w, h) - 3);
  const rest = w * h - s * s;
  return {
    key: `ecke-gesucht:${w}x${h}-${s}`,
    context: `Ein Blatt ist ${q(w, 'cm')} lang und ${q(h, 'cm')} breit. ${pickPerson(rng).name} schneidet eine quadratische Ecke ab. Es bleiben ${q(rest, 'cm²')} übrig.`,
    prompt: 'Wie lang ist eine Seite der Ecke?',
    answer: numberAnswer(s, 'cm', 'Seite der Ecke:'),
    hints: ['Rechne zuerst das ganze Blatt aus.', 'Die Ecke ist die Differenz. Welches Quadrat hat diese Fläche?'],
    steps: [`Ganzes Blatt: ${w} · ${h} = ${w * h}`, `Ecke: ${w * h} − ${rest} = ${s * s}`, `${s} · ${s} = ${s * s}`, `Eine Seite der Ecke ist ${q(s, 'cm')} lang.`],
    bugs: [
      bug('ecke-flaeche', s * s, 'Das ist die Fläche der Ecke. Gesucht ist die Seite vom Quadrat.'),
      bug('nur-ausschnitt', rest, 'Das ist der Rest vom Blatt. Rechne zuerst die Fläche der Ecke aus.'),
    ],
    praise: 'Du hast vom Rest auf die Ecke geschlossen.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

const FORMS: Forms = {
  1: { 1: s1Count, 2: s1Fields, 3: s1Worth },
  2: { 1: s2Split, 2: s2OwnSplit, 3: s2Missing },
  3: { 1: s3Corner, 2: s3Story, 3: s3TwoWays },
};

const STUFEN: Record<Stufe, string> = {
  1: 'L-Form im Gitter, die Linie ist schon da',
  2: 'L-Form mit Längen, eigene Linie wählen',
  3: 'Ausschnitt abziehen, zwei Wege vergleichen',
};

export const zusammengesetztSkill: SkillDef = {
  ...SKILL,
  title: 'Zerlegen und Ergänzen',
  description: 'Du zerlegst Figuren oder ergänzt sie zu einem Rechteck.',
  stufen: STUFEN,
  kmk: KMK,
  generate: generator(SKILL, KMK, FORMS),
};
