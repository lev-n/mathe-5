/**
 * flaeche.volumen (docs/research.md §6).
 * Stufe 1: count cubes by rows and layers, ≤ 60. AB I a drawn building, AB II a Bauplan or one layer, AB III layers from the total, or cubes missing.
 * Stufe 2: length · width · height in cm³. AB I labelled, AB II larger or in a story, AB III Bodenfläche or a doubled edge.
 * Stufe 3: litres, missing edge, two Quader. AB I litres from dm, AB II litres from cm or a missing edge, AB III two Quader or a water level.
 */
import { fmt } from '../../core/format';
import type { SkillDef, Stufe, VisualOf } from '../../core/types';
import { pickPerson } from '../shared';
import { HINT, bug, generator, numberAnswer, q, type Forms, type Item } from './common';

const SKILL = { id: 'flaeche.volumen', topicId: 'flaeche' } as const;
const KMK = ['GM.oberflaeche-volumen'];

const surface = (a: number, b: number, c: number) => 2 * (a * b + a * c + b * c);
const box = (a: number, b: number, c: number, unit = 'cm'): VisualOf<'quader'> => ({ type: 'quader', a, b, c, unit, showLabels: true, hiddenEdges: 'dashed' });

const PLUS = 'Rechne mal, nicht plus: Länge · Breite · Höhe.';
const ONE_LAYER = 'Das ist eine Lage. Wie viele Lagen hat der Quader?';
const EDGE_BACK = 'Länge · Breite · Höhe ergibt das Volumen. Teile durch die beiden bekannten Kanten.';
const LITRE = '1 dm³ ist 1 l. 1000 cm³ sind 1 dm³.';

const volumeBugs = (a: number, b: number, c: number) => [
  bug('volumen-oberflaeche', surface(a, b, c), HINT.volumenOberflaeche),
  bug('plus-statt-mal', a + b + c, PLUS),
  bug('eine-lage', a * b, ONE_LAYER),
];

/** Cubes seen from front, top and right: all but the inner ones behind them. */
const visibleCubes = (a: number, b: number, c: number) => a * b * c - (a - 1) * (b - 1) * (c - 1);

/** Sizes of a building with at most 60 cubes. */
function building(rng: Parameters<Forms[1][1]>[0]): [cols: number, rows: number, layers: number] {
  for (;;) {
    const cols = rng.int(2, 4);
    const rows = rng.int(2, 4);
    const layers = rng.int(2, 5);
    if (cols * rows * layers <= 60) return [cols, rows, layers];
  }
}

const heights = (cols: number, rows: number, layers: number) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => layers));

const countSteps = (cols: number, rows: number, layers: number) => [
  `Eine Lage: ${rows} · ${cols} = ${rows * cols}`,
  `${layers} Lagen: ${layers} · ${rows * cols} = ${layers * rows * cols}`,
  `Der Quader hat ${layers * rows * cols} Würfel.`,
];

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1Drawn: Forms[1][1] = (rng) => {
  const [cols, rows, layers] = building(rng);
  const V = cols * rows * layers;
  return {
    key: `gebaeude:${cols}-${rows}-${layers}`,
    prompt: 'Der Quader ist aus gleichen Würfeln gebaut. Wie viele Würfel sind es?',
    visual: { type: 'cubeBuilding', heights: heights(cols, rows, layers), view: 'iso' },
    answer: numberAnswer(V, 'Würfel'),
    hints: [HINT.lagenZaehlen, 'Eine Lage: Reihen · Würfel in einer Reihe.'],
    steps: countSteps(cols, rows, layers),
    bugs: [
      bug('lagen-zaehlen', visibleCubes(cols, rows, layers), HINT.lagenZaehlen),
      bug('eine-lage', cols * rows, ONE_LAYER),
      bug('plus-statt-mal', cols + rows + layers, 'Zähle eine Lage. Rechne dann mal die Anzahl der Lagen.'),
    ],
    praise: 'Du hast Lage für Lage gerechnet.',
  };
};

const s1Plan: Forms[1][2] = (rng): Item => {
  const [cols, rows, layers] = building(rng);
  const V = cols * rows * layers;
  if (rng.chance(0.5)) {
    return {
      key: `bauplan:${cols}-${rows}-${layers}`,
      prompt: 'Der Bauplan zeigt die Turmhöhen von oben. Wie viele Würfel braucht der Quader?',
      visual: { type: 'cubeBuilding', heights: heights(cols, rows, layers), view: 'plan' },
      answer: numberAnswer(V, 'Würfel'),
      hints: ['Jede Zahl sagt: So viele Würfel stehen auf diesem Feld.', 'Addiere alle Zahlen, oder rechne Felder · Höhe.'],
      steps: [`Der Plan hat ${rows} · ${cols} = ${rows * cols} Felder.`, `Auf jedem Feld stehen ${layers} Würfel.`, `${rows * cols} · ${layers} = ${V}`, `Der Quader braucht ${V} Würfel.`],
      bugs: [
        bug('eine-lage', cols * rows, 'Das sind die Felder. Auf jedem Feld steht ein Turm.'),
        bug('plus-statt-mal', rows * cols + layers, 'Jedes Feld hat einen ganzen Turm. Rechne Felder · Höhe.'),
      ],
      praise: 'Du hast den Bauplan richtig gelesen.',
    };
  }
  return {
    key: `quader-lagen:${cols}-${rows}-${layers}`,
    prompt: 'Die Linien zeigen die Würfel. Wie viele Würfel hat der Quader?',
    visual: { type: 'quader', a: cols, b: rows, c: layers, showLabels: false, hiddenEdges: 'none', layers: true },
    answer: numberAnswer(V, 'Würfel'),
    hints: [HINT.lagenZaehlen, 'Oben siehst du eine ganze Lage.'],
    steps: countSteps(cols, rows, layers),
    bugs: [
      bug('lagen-zaehlen', visibleCubes(cols, rows, layers), HINT.lagenZaehlen),
      bug('eine-lage', cols * rows, ONE_LAYER),
    ],
    praise: 'Du hast aus dem Schrägbild die Lagen abgelesen.',
    srText: `Ein Quader aus Würfeln, ${cols} Würfel breit, ${rows} Würfel tief und ${layers} Würfel hoch. Wie viele Würfel hat der Quader?`,
  };
};

const s1Back: Forms[1][3] = (rng): Item => {
  const [cols, rows, layers] = building(rng);
  const V = cols * rows * layers;
  const L = cols * rows;
  const { name } = pickPerson(rng);
  if (rng.chance(0.5)) {
    return {
      key: `lagen-rueck:${V}-${L}`,
      context: `${name} baut aus ${V} Würfeln einen Quader. Eine Lage hat ${L} Würfel.`,
      prompt: 'Wie viele Lagen hat der Quader?',
      answer: numberAnswer(layers, 'Lagen'),
      hints: ['Wie oft passt eine Lage in alle Würfel?', 'Rechne alle Würfel geteilt durch eine Lage.'],
      steps: [`${V} : ${L} = ${layers}`, `Probe: ${layers} · ${L} = ${V}`, `Der Quader hat ${layers} Lagen.`],
      bugs: [bug('lagen-minus', V - L, 'Das sind die übrigen Würfel. Gefragt ist die Anzahl der Lagen.')],
      praise: 'Du hast von den Würfeln auf die Lagen geschlossen.',
      kmk: [...KMK, 'PK.problemloesen'],
    };
  }
  const hs = heights(cols, rows, layers);
  const holes = rng.int(1, Math.min(L - 1, 5));
  let left = holes;
  for (let r = 0; r < rows && left > 0; r++) for (let c = cols - 1; c >= 0 && left > 0; c--, left--) hs[r][c] = layers - 1;
  return {
    key: `wuerfel-fehlen:${cols}-${rows}-${layers}-${holes}`,
    prompt: 'Der Bauplan zeigt einen Bau. Wie viele Würfel fehlen bis zum vollen Quader?',
    visual: { type: 'cubeBuilding', heights: hs, view: 'plan' },
    answer: numberAnswer(holes, 'Würfel'),
    hints: [`Der volle Quader hat auf jedem Feld ${layers} Würfel.`, 'Zähle die Felder mit weniger Würfeln.'],
    steps: [`Beim vollen Quader stehen ${layers} Würfel auf jedem Feld.`, `${holes === 1 ? '1 Feld hat' : `${holes} Felder haben`} je 1 Würfel weniger.`, `Es ${holes === 1 ? 'fehlt 1 Würfel' : `fehlen ${holes} Würfel`}.`],
    bugs: [bug('alle-gezaehlt', V - holes, 'Das sind die Würfel im Bau. Gefragt sind die fehlenden.')],
    praise: 'Du hast den Bau mit dem vollen Quader verglichen.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const s2Labelled: Forms[2][1] = (rng) => {
  const a = rng.int(3, 12);
  const b = rng.int(2, 9);
  const c = rng.int(2, 8);
  const V = a * b * c;
  return {
    key: `quader:${a}-${b}-${c}`,
    prompt: 'Rechne Länge · Breite · Höhe. Wie groß ist das Volumen?',
    visual: box(a, b, c),
    answer: numberAnswer(V, 'cm³', 'Volumen:'),
    hints: ['Länge · Breite ergibt eine Lage.', 'Die Höhe sagt dir die Anzahl der Lagen.'],
    steps: [`Eine Lage: ${a} · ${b} = ${a * b}`, `${a * b} · ${c} = ${V}`, `Das Volumen ist ${q(V, 'cm³')}.`],
    bugs: volumeBugs(a, b, c),
    praise: 'Du hast alle drei Kanten mal gerechnet.',
    srText: `Ein Quader, ${a} Zentimeter breit, ${b} Zentimeter tief und ${c} Zentimeter hoch. Wie groß ist das Volumen?`,
  };
};

/** Things small enough for cm, with sizes that fit them. */
const THINGS = [
  { what: 'Eine Schachtel', a: [8, 10, 12, 14, 15, 16, 18, 20, 24, 25], b: [5, 6, 7, 8, 9, 10, 12], c: [4, 5, 6, 7, 8, 9, 10] },
  { what: 'Ein Schuhkarton', a: [30, 32, 35], b: [15, 18, 20], c: [10, 12] },
  { what: 'Eine Brotdose', a: [16, 18, 20], b: [10, 12, 15], c: [5, 6, 7, 8] },
  { what: 'Ein Karton', a: [20, 25, 30, 40], b: [10, 15, 20, 25], c: [10, 15, 20] },
] as const;

const s2Story: Forms[2][2] = (rng) => {
  const thing = rng.pick(THINGS);
  const a = rng.pick<number>(thing.a);
  const b = rng.pick<number>(thing.b);
  const c = rng.pick<number>(thing.c);
  const V = a * b * c;
  return {
    key: `sache:${thing.what}:${a}-${b}-${c}`,
    context: `${thing.what} ist ${q(a, 'cm')} lang, ${q(b, 'cm')} breit und ${q(c, 'cm')} hoch.`,
    prompt: `Wie groß ist das Volumen?`,
    answer: numberAnswer(V, 'cm³', 'Volumen:'),
    hints: ['Rechne zuerst die Bodenfläche aus.', 'Rechne dann mal die Höhe.'],
    steps: [`Bodenfläche: ${a} · ${b} = ${a * b}`, `${a * b} · ${c} = ${fmt(V)}`, `Das Volumen ist ${q(V, 'cm³')}.`],
    bugs: volumeBugs(a, b, c),
    praise: 'Du hast das Volumen Schritt für Schritt gerechnet.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

const s2Reason: Forms[2][3] = (rng): Item => {
  const { name } = pickPerson(rng);
  if (rng.chance(0.5)) {
    const floor = rng.int(6, 40);
    const c = rng.int(3, 15);
    return {
      key: `bodenflaeche:${floor}-${c}`,
      context: `Ein Quader hat die Bodenfläche ${q(floor, 'cm²')}. Der Quader ist ${q(c, 'cm')} hoch.`,
      prompt: 'Wie groß ist das Volumen?',
      answer: numberAnswer(floor * c, 'cm³', 'Volumen:'),
      hints: ['Die Bodenfläche ist schon eine ganze Lage.', 'Die Höhe sagt dir die Anzahl der Lagen.'],
      steps: [`Bodenfläche · Höhe: ${floor} · ${c} = ${floor * c}`, `Das Volumen ist ${q(floor * c, 'cm³')}.`],
      bugs: [bug('plus-statt-mal', floor + c, 'Rechne Bodenfläche · Höhe.')],
      praise: 'Du hast die Bodenfläche als Lage genutzt.',
    };
  }
  const a = rng.int(2, 8);
  const b = rng.int(2, 8);
  const c = rng.int(2, 8);
  const V = a * b * c;
  const all = rng.chance(0.4);
  const k = all ? 8 : 2;
  return {
    key: `verdoppeln:${all ? 'alle' : 'hoehe'}:${a}-${b}-${c}`,
    context: `Ein Quader hat das Volumen ${q(V, 'cm³')}. ${name} verdoppelt ${all ? 'alle drei Kanten' : 'die Höhe'}.`,
    prompt: 'Wie groß ist das Volumen jetzt?',
    visual: box(a, b, c),
    answer: numberAnswer(k * V, 'cm³', 'Volumen:'),
    hints: ['Rechne mit den neuen Kanten.', 'Vergleiche danach mit dem alten Volumen.'],
    steps: [all ? `Neue Kanten: ${2 * a}, ${2 * b} und ${2 * c}` : `Neue Höhe: 2 · ${c} = ${2 * c}`, all ? `${2 * a} · ${2 * b} · ${2 * c} = ${k * V}` : `${a} · ${b} · ${2 * c} = ${k * V}`, `Das Volumen ist jetzt ${q(k * V, 'cm³')}.`],
    bugs: [
      bug('nur-verdoppelt', all ? 2 * V : 4 * V, all ? 'Alle drei Kanten wachsen. Rechne mit den neuen Kanten.' : 'Nur eine Kante wächst. Es sind doppelt so viele Lagen.'),
      bug('plus-statt-mal', V + 2, 'Verdoppeln heißt mal 2, nicht plus 2.'),
    ],
    praise: 'Du hast neue Kanten und altes Volumen verglichen.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const s3Litres: Forms[3][1] = (rng) => {
  const a = rng.int(3, 12);
  const b = rng.int(2, 8);
  const c = rng.int(2, 6);
  const V = a * b * c;
  return {
    key: `liter-dm:${a}-${b}-${c}`,
    context: 'Das Aquarium hat die Form eines Quaders. 1 dm³ ist 1 l.',
    prompt: 'Wie viele Liter passen hinein?',
    visual: box(a, b, c, 'dm'),
    answer: numberAnswer(V, 'l'),
    hints: ['Rechne zuerst das Volumen in dm³ aus.', 'Jeder Kubikdezimeter fasst 1 l.'],
    steps: [`${a} · ${b} · ${c} = ${V}`, `${q(V, 'dm³')} = ${q(V, 'l')}`, `Es passen ${q(V, 'l')} hinein.`],
    bugs: [
      bug('liter-faktor', V * 10, LITRE),
      bug('liter-tausend', V * 1000, LITRE),
      bug('volumen-oberflaeche', surface(a, b, c), 'Für Wasser zählt der Raum innen. Rechne das Volumen.'),
    ],
    praise: 'Du hast Kubikdezimeter in Liter übertragen.',
    srText: `Ein Aquarium, ${a} Dezimeter lang, ${b} Dezimeter breit und ${c} Dezimeter hoch. Ein Kubikdezimeter ist ein Liter. Wie viele Liter passen hinein?`,
    kmk: [...KMK, 'PK.modellieren'],
  };
};

const s3LitresOrEdge: Forms[3][2] = (rng): Item => {
  if (rng.chance(0.5)) {
    const a = rng.int(3, 10) * 10;
    const b = rng.int(2, 6) * 10;
    const c = rng.int(2, 6) * 10;
    const V = a * b * c;
    const l = V / 1000;
    return {
      key: `liter-cm:${a}-${b}-${c}`,
      context: `Eine Kiste ist ${q(a, 'cm')} lang, ${q(b, 'cm')} breit und ${q(c, 'cm')} hoch.`,
      prompt: 'Wie viele Liter passen hinein?',
      answer: numberAnswer(l, 'l'),
      hints: ['Rechne die Kanten zuerst in dm um.', LITRE],
      steps: [`In dm: ${a / 10}, ${b / 10} und ${c / 10}`, `${a / 10} · ${b / 10} · ${c / 10} = ${l}`, `Es passen ${q(l, 'l')} hinein.`],
      bugs: [
        bug('liter-faktor', V / 100, LITRE),
        bug('liter-tausend', V, 'Das sind cm³. Rechne noch in Liter um.'),
      ],
      praise: 'Du hast zuerst die Einheit passend gemacht.',
      kmk: [...KMK, 'PK.modellieren'],
    };
  }
  const a = rng.int(3, 15);
  const b = rng.int(2, 12);
  const c = rng.int(3, 15);
  const V = a * b * c;
  return {
    key: `fehlende-kante:${V}:${a}-${b}`,
    context: `Ein Quader hat das Volumen ${q(V, 'cm³')}. Der Quader ist ${q(a, 'cm')} lang und ${q(b, 'cm')} breit.`,
    prompt: 'Wie hoch ist der Quader?',
    answer: numberAnswer(c, 'cm', 'Höhe:'),
    hints: ['Rechne zuerst die Bodenfläche aus.', EDGE_BACK],
    steps: [`Bodenfläche: ${a} · ${b} = ${a * b}`, `${V} : ${a * b} = ${c}`, `Der Quader ist ${q(c, 'cm')} hoch.`],
    bugs: [
      bug('kante-minus', V - a - b, EDGE_BACK),
      bug('kante-nur-eine', V / a, 'Teile auch noch durch die zweite Kante.'),
    ],
    praise: 'Du hast vom Volumen auf die Kante geschlossen.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

const s3TwoOrLevel: Forms[3][3] = (rng): Item => {
  if (rng.chance(0.5)) {
    const [a1, b1, c1] = [rng.int(5, 15), rng.int(4, 10), rng.int(2, 8)];
    const [a2, b2, c2] = [rng.int(2, a1 - 1), rng.int(2, b1 - 1), rng.int(2, 8)];
    const [V1, V2] = [a1 * b1 * c1, a2 * b2 * c2];
    return {
      key: `zwei-quader:${a1}-${b1}-${c1}+${a2}-${b2}-${c2}`,
      context: 'Ein Körper besteht aus zwei Quadern. Der kleine Quader steht auf dem großen Quader.',
      prompt: 'Wie groß ist das Volumen vom ganzen Körper?',
      visual: { type: 'table', caption: 'Kanten in cm', header: ['Quader', 'Breite', 'Tiefe', 'Höhe'], rows: [['groß', String(a1), String(b1), String(c1)], ['klein', String(a2), String(b2), String(c2)]] },
      answer: numberAnswer(V1 + V2, 'cm³', 'Volumen:'),
      hints: ['Rechne jeden Quader einzeln.', 'Addiere danach beide Volumen.'],
      steps: [`Großer Quader: ${a1} · ${b1} · ${c1} = ${V1}`, `Kleiner Quader: ${a2} · ${b2} · ${c2} = ${V2}`, `${V1} + ${V2} = ${V1 + V2}`, `Das Volumen ist ${q(V1 + V2, 'cm³')}.`],
      bugs: [
        bug('nur-ein-quader', V1, 'Das ist nur der große Quader. Der kleine gehört dazu.'),
        bug('volumen-oberflaeche', surface(a1, b1, c1) + surface(a2, b2, c2), HINT.volumenOberflaeche),
      ],
      praise: 'Du hast den Körper in zwei Quader zerlegt.',
      srText: `Ein Körper besteht aus zwei Quadern. Der große Quader ist ${a1} Zentimeter breit, ${b1} tief und ${c1} hoch. Der kleine ist ${a2} breit, ${b2} tief und ${c2} hoch. Wie groß ist das Volumen vom ganzen Körper?`,
      kmk: [...KMK, 'PK.problemloesen'],
    };
  }
  const a = rng.int(4, 12);
  const b = rng.int(2, 8);
  const c = rng.int(2, 9);
  const L = a * b * c;
  return {
    key: `wasserstand:${L}:${a}-${b}`,
    context: `Ein Aquarium ist ${q(a, 'dm')} lang und ${q(b, 'dm')} breit. Im Aquarium sind ${q(L, 'l')} Wasser.`,
    prompt: 'Wie hoch steht das Wasser?',
    answer: numberAnswer(c, 'dm', 'Höhe:'),
    hints: ['1 l ist 1 dm³. Rechne zuerst die Bodenfläche aus.', EDGE_BACK],
    steps: [`${q(L, 'l')} = ${q(L, 'dm³')}`, `Bodenfläche: ${a} · ${b} = ${a * b}`, `${L} : ${a * b} = ${c}`, `Das Wasser steht ${q(c, 'dm')} hoch.`],
    bugs: [
      bug('kante-minus', L - a - b, EDGE_BACK),
      bug('kante-nur-eine', L / a, 'Teile auch noch durch die zweite Kante.'),
    ],
    praise: 'Du hast aus Litern die Wasserhöhe gerechnet.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

const FORMS: Forms = {
  1: { 1: s1Drawn, 2: s1Plan, 3: s1Back },
  2: { 1: s2Labelled, 2: s2Story, 3: s2Reason },
  3: { 1: s3Litres, 2: s3LitresOrEdge, 3: s3TwoOrLevel },
};

const STUFEN: Record<Stufe, string> = {
  1: 'Würfel in Reihen und Lagen zählen, bis 60',
  2: 'Länge · Breite · Höhe in cm³',
  3: 'Liter, fehlende Kante, Körper aus zwei Quadern',
};

export const volumenSkill: SkillDef = {
  ...SKILL,
  title: 'Volumen vom Quader',
  description: 'Du zählst Würfel in Lagen und rechnest das Volumen aus.',
  stufen: STUFEN,
  kmk: KMK,
  generate: generator(SKILL, KMK, FORMS),
};
