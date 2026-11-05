/**
 * flaeche.oberflaeche (docs/research.md §6).
 * Stufe 1: Würfel, six equal squares, edge ≤ 12 cm. AB I small edge, AB II from a net or one face and all six, AB III the edge from the Oberfläche.
 * Stufe 2: Quader from a net, three face pairs. AB I pairs in a net, AB II from the edges, AB III one face from the Oberfläche.
 * Stufe 3: open box, gift wrap, solid from two Quader. AB I open box, AB II paper left over or with overlap, AB III two Quader.
 */
import type { MultiField, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { pickPerson } from '../shared';
import { HINT, bug, generator, numberAnswer, q, type Forms, type Item } from './common';
import { NETS, QUADER_OPPOSITE, QUADER_SIZES, pickForm, quaderNet, quaderNetVisual, shuffledLetters } from './nets';

const SKILL = { id: 'flaeche.oberflaeche', topicId: 'flaeche' } as const;
const KMK = ['GM.oberflaeche-volumen'];

const surface = (a: number, b: number, c: number) => 2 * (a * b + a * c + b * c);
const cube = (a: number): VisualOf<'quader'> => ({ type: 'quader', a, b: a, c: a, unit: 'cm', showLabels: true, hiddenEdges: 'dashed', kind: 'wuerfel' });
const box = (a: number, b: number, c: number, highlightFace?: 'top'): VisualOf<'quader'> => ({ type: 'quader', a, b, c, unit: 'cm', showLabels: true, hiddenEdges: 'dashed', ...(highlightFace ? { highlightFace } : {}) });
const answer = (value: number, unit = 'cm²') => numberAnswer(value, unit, 'Oberfläche:');

const ONE_FACE = 'Das ist eine Fläche. Der Würfel hat sechs.';
/** Only true where the picture is a Schrägbild: a net shows all faces, and an open box has five. */
const THREE_OF_SIX = 'Du siehst drei Flächen. Der Würfel hat sechs.';
const THREE_CUBE = 'Das sind nur drei Flächen. Der Würfel hat sechs.';
const ONE_OF_EACH_PAIR = 'Das ist von jedem Paar nur eine Fläche. Der Quader hat sechs.';

const cubeBugs = (a: number) => [
  bug('quader-sichtbar', 3 * a * a, THREE_OF_SIX),
  bug('eine-flaeche', a * a, ONE_FACE),
  bug('volumen-oberflaeche', a * a * a, HINT.volumenOberflaeche),
  bug('kanten-summe', 12 * a, 'Das sind die Kanten. Gefragt sind die Flächen.'),
];

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1Cube: Forms[1][1] = (rng) => {
  const a = rng.int(2, 9);
  const O = 6 * a * a;
  return {
    key: `wuerfel:${a}`,
    prompt: 'Der Würfel hat sechs gleiche Quadrate als Flächen. Wie groß ist die Oberfläche?',
    visual: cube(a),
    answer: answer(O),
    hints: ['Rechne zuerst eine Fläche: Kante · Kante.', 'Alle sechs Flächen sind gleich groß.'],
    steps: [`Eine Fläche: ${a} · ${a} = ${a * a}`, `Sechs Flächen: 6 · ${a * a} = ${O}`, `Die Oberfläche ist ${q(O, 'cm²')}.`],
    bugs: cubeBugs(a),
    praise: 'Du hast alle sechs Flächen gerechnet.',
    srText: `Ein Würfel mit der Kante ${a} Zentimeter. Der Würfel hat sechs gleiche Quadrate als Flächen. Wie groß ist die Oberfläche?`,
  };
};

const s1CubeNet: Forms[1][2] = (rng) => {
  const a = rng.int(4, 12);
  const O = 6 * a * a;
  const cells = pickForm(rng, rng.pick(NETS));
  const fields: MultiField[] = [
    { id: 'eine', value: a * a, before: 'Eine Fläche:', after: 'cm²', label: 'Eine Fläche' },
    { id: 'alle', value: O, before: 'Alle Flächen:', after: 'cm²', label: 'Alle Flächen' },
  ];
  return {
    key: `wuerfelnetz:${a}:${cells.map((c) => c.join('')).join('.')}`,
    prompt: `Das Netz gehört zu einem Würfel. Jede Kante ist ${q(a, 'cm')} lang. Wie groß sind die Flächen?`,
    visual: { type: 'net', cells },
    answer: { kind: 'multi', fields },
    hints: ['Jedes Quadrat im Netz ist eine Fläche vom Würfel.', 'Zähle die Quadrate im Netz.'],
    steps: [`Eine Fläche: ${a} · ${a} = ${a * a}`, `Sechs Flächen: 6 · ${a * a} = ${O}`, `Eine Fläche hat ${a * a} cm², alle haben ${O} cm².`],
    bugs: [
      bug('quader-sichtbar', { eine: a * a, alle: 3 * a * a }, THREE_CUBE),
      bug('volumen-oberflaeche', { eine: a * a, alle: a * a * a }, HINT.volumenOberflaeche),
      bug('kanten-summe', { eine: 4 * a, alle: 24 * a }, 'Das sind Längen. Eine Fläche ist Kante · Kante.'),
    ],
    praise: 'Du hast im Netz alle sechs Flächen gesehen.',
  };
};

const s1CubeBack: Forms[1][3] = (rng) => {
  const a = rng.int(2, 12);
  const O = 6 * a * a;
  return {
    key: `wuerfel-rueck:${a}`,
    prompt: `Ein Würfel hat die Oberfläche ${q(O, 'cm²')}. Wie lang ist eine Kante?`,
    answer: numberAnswer(a, 'cm', 'Kante:'),
    hints: ['Teile zuerst durch die Anzahl der Flächen.', 'Welche Zahl mal sich selbst ergibt eine Fläche?'],
    steps: [`Eine Fläche: ${O} : 6 = ${a * a}`, `${a} · ${a} = ${a * a}`, `Eine Kante ist ${q(a, 'cm')} lang.`],
    bugs: [
      bug('eine-flaeche', a * a, 'Das ist eine Fläche. Gesucht ist die Kante vom Quadrat.'),
      bug('quader-sichtbar', O / 3, 'Der Würfel hat sechs Flächen. Teile durch 6.'),
    ],
    praise: 'Du hast von der Oberfläche zur Kante geschlossen.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const s2Pairs: Forms[2][1] = (rng) => {
  const [a, b, c] = rng.pick(QUADER_SIZES);
  const letters = shuffledLetters(rng);
  const pairs = [0, 1, 4].map((face) => ({ one: letters[face], two: letters[QUADER_OPPOSITE[face]], area: 2 * (face === 0 ? a * b : face === 1 ? a * c : b * c) }));
  const O = surface(a, b, c);
  const fields: MultiField[] = [
    ...pairs.map((p, i) => ({ id: `p${i}`, value: p.area, before: `${p.one} und ${p.two}:`, after: 'cm²', label: `Flächen ${p.one} und ${p.two}` })),
    { id: 'o', value: O, before: 'Oberfläche:', after: 'cm²', label: 'Oberfläche' },
  ];
  return {
    key: `quadernetz:${a}-${b}-${c}:${letters.join('')}`,
    prompt: 'Ein Kästchen ist 1 cm² groß. Wie groß sind die drei Flächenpaare und die Oberfläche?',
    visual: quaderNetVisual(quaderNet(a, b, c), letters),
    answer: { kind: 'multi', fields },
    hints: ['Zähle bei jedem Paar die Kästchen beider Flächen.', 'Addiere am Ende alle drei Paare.'],
    steps: [`${pairs.map((p) => `${p.one} und ${p.two}: ${p.area}`).join('; ')}`, `${pairs.map((p) => p.area).join(' + ')} = ${O}`, `Paare ${pairs.map((p) => p.area).join(', ')} und Oberfläche ${O}`],
    bugs: [
      bug('quader-sichtbar', { o: O / 2 }, ONE_OF_EACH_PAIR),
    ],
    praise: 'Du hast die Flächen als Paare gerechnet.',
  };
};

function edges(rng: Rng, max: number): [number, number, number] {
  const [a, b, c] = rng.sample(Array.from({ length: max - 2 }, (_, i) => i + 3), 3);
  return [a, b, c];
}

const pairSteps = (a: number, b: number, c: number): string[] => [
  `Vorne und hinten: 2 · ${a} · ${c} = ${2 * a * c}`,
  `Oben und unten: 2 · ${a} · ${b} = ${2 * a * b}`,
  `Links und rechts: 2 · ${b} · ${c} = ${2 * b * c}`,
  `${2 * a * c} + ${2 * a * b} + ${2 * b * c} = ${surface(a, b, c)}`,
];

const quaderBugs = (a: number, b: number, c: number) => [
  bug('quader-sichtbar', a * b + a * c + b * c, HINT.quaderSichtbar),
  bug('volumen-oberflaeche', a * b * c, HINT.volumenOberflaeche),
  bug('ohne-deckel', surface(a, b, c) - a * b, 'Der Quader ist geschlossen. Rechne auch die Fläche oben.'),
];

const s2Edges: Forms[2][2] = (rng) => {
  const [a, b, c] = edges(rng, 15);
  const O = surface(a, b, c);
  return {
    key: `quader:${a}-${b}-${c}`,
    prompt: 'Rechne die drei Flächenpaare aus. Wie groß ist die Oberfläche?',
    visual: box(a, b, c),
    answer: answer(O),
    hints: ['Jede Fläche hat eine gleich große Fläche gegenüber.', 'Vorne und hinten, oben und unten, links und rechts.'],
    steps: [...pairSteps(a, b, c), `Die Oberfläche ist ${q(O, 'cm²')}.`],
    bugs: quaderBugs(a, b, c),
    praise: 'Du hast alle drei Flächenpaare gerechnet.',
    srText: `Ein Quader, ${a} Zentimeter breit, ${b} Zentimeter tief und ${c} Zentimeter hoch. Rechne die drei Flächenpaare aus. Wie groß ist die Oberfläche?`,
  };
};

const s2PairBack: Forms[2][3] = (rng) => {
  const [a, b, c] = edges(rng, 12);
  const O = surface(a, b, c);
  const front = 2 * a * c;
  const top = 2 * a * b;
  const side = 2 * b * c;
  return {
    key: `paar-rueck:${a}-${b}-${c}`,
    context: `Die Oberfläche eines Quaders ist ${q(O, 'cm²')}. Vorne und hinten sind zusammen ${q(front, 'cm²')}. Oben und unten sind zusammen ${q(top, 'cm²')}.`,
    prompt: 'Wie groß ist eine Fläche an der Seite?',
    answer: numberAnswer(side / 2, 'cm²', 'Eine Seitenfläche:'),
    hints: ['Zieh die beiden bekannten Paare von der Oberfläche ab.', 'Der Rest gehört zu zwei gleich großen Flächen.'],
    steps: [`${O} − ${front} − ${top} = ${side}`, `${side} : 2 = ${side / 2}`, `Eine Seitenfläche ist ${q(side / 2, 'cm²')} groß.`],
    bugs: [
      bug('nur-paar', side, 'Das sind beide Seitenflächen zusammen. Teile noch durch 2.'),
      bug('alle-gleich', O / 6, 'Beim Quader sind nicht alle Flächen gleich groß.'),
    ],
    praise: 'Du hast aus den Paaren die fehlende Fläche gerechnet.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const s3OpenBox: Forms[3][1] = (rng) => {
  const { name } = pickPerson(rng);
  const [a, b, c] = edges(rng, 25);
  const O = surface(a, b, c);
  const open = O - a * b;
  return {
    key: `offene-schachtel:${a}-${b}-${c}`,
    context: `${name} baut eine Schachtel ohne Deckel aus Pappe.`,
    prompt: 'Wie viel Pappe braucht die Schachtel?',
    visual: box(a, b, c, 'top'),
    answer: numberAnswer(open, 'cm²', 'Pappe:'),
    hints: ['Die Schachtel hat keine Fläche oben.', 'Rechne den Boden einmal und die vier Seiten.'],
    steps: [`Boden: ${a} · ${b} = ${a * b}`, `Vorne und hinten: 2 · ${a} · ${c} = ${2 * a * c}`, `Links und rechts: 2 · ${b} · ${c} = ${2 * b * c}`, `${a * b} + ${2 * a * c} + ${2 * b * c} = ${open}`, `Die Schachtel braucht ${q(open, 'cm²')} Pappe.`],
    bugs: [
      bug('ohne-deckel', O, 'Oben fehlt eine Fläche. Rechne den Deckel nicht mit.'),
      bug('boden-fehlt', O - 2 * a * b, 'Nur der Deckel fehlt. Der Boden gehört dazu.'),
      bug('quader-sichtbar', a * b + a * c + b * c, 'Du siehst drei Flächen. Die Schachtel hat fünf.'),
      bug('volumen-oberflaeche', a * b * c, HINT.volumenOberflaeche),
    ],
    praise: 'Du hast nur die Flächen der Schachtel gerechnet.',
    srText: `${name} baut eine Schachtel ohne Deckel aus Pappe. Die Schachtel ist ${a} Zentimeter breit, ${b} Zentimeter tief und ${c} Zentimeter hoch. Wie viel Pappe braucht die Schachtel?`,
    kmk: [...KMK, 'PK.modellieren'],
  };
};

const s3Gift: Forms[3][2] = (rng): Item => {
  const { name } = pickPerson(rng);
  const [a, b, c] = edges(rng, 30);
  const O = surface(a, b, c);
  const spoken = `Das Geschenk ist ${a} Zentimeter breit, ${b} Zentimeter tief und ${c} Zentimeter hoch.`;
  if (rng.chance(0.5)) {
    const sheet = (Math.floor(O / 500) + rng.int(1, 3)) * 500;
    const left = sheet - O;
    return {
      key: `geschenk-rest:${a}-${b}-${c}-${sheet}`,
      context: `${name} verpackt ein Geschenk ohne Überlappung. Der Bogen Papier hat ${q(sheet, 'cm²')}.`,
      prompt: 'Wie viel Papier bleibt übrig?',
      visual: box(a, b, c),
      answer: numberAnswer(left, 'cm²', 'Rest:'),
      hints: ['Rechne zuerst die ganze Oberfläche vom Geschenk.', 'Zieh die Oberfläche vom Bogen ab.'],
      steps: [`Oberfläche: ${pairSteps(a, b, c)[3]}`, `${sheet} − ${O} = ${left}`, `Es bleiben ${q(left, 'cm²')} übrig.`],
      bugs: [
        bug('oberflaeche-statt-rest', O, 'Das ist das Papier für das Geschenk. Gefragt ist der Rest.'),
        bug('quader-sichtbar', sheet - O / 2, HINT.quaderSichtbar),
      ],
      praise: 'Du hast die Oberfläche als Papier gesehen.',
      srText: `${name} verpackt ein Geschenk ohne Überlappung. ${spoken} Der Bogen Papier hat ${sheet} Quadratzentimeter. Wie viel Papier bleibt übrig?`,
      kmk: [...KMK, 'PK.modellieren'],
    };
  }
  const extra = rng.pick([50, 80, 100, 120, 150]);
  return {
    key: `geschenk-extra:${a}-${b}-${c}-${extra}`,
    context: `${name} verpackt ein Geschenk. Zum Überlappen kommen noch ${q(extra, 'cm²')} Papier dazu.`,
    prompt: 'Wie viel Papier braucht das Geschenk?',
    visual: box(a, b, c),
    answer: numberAnswer(O + extra, 'cm²', 'Papier:'),
    hints: ['Rechne zuerst die ganze Oberfläche vom Geschenk.', 'Addiere dann das Papier zum Überlappen.'],
    steps: [`Oberfläche: ${pairSteps(a, b, c)[3]}`, `${O} + ${extra} = ${O + extra}`, `Das Geschenk braucht ${q(O + extra, 'cm²')} Papier.`],
    bugs: [
      bug('oberflaeche-statt-rest', O, 'Das Papier zum Überlappen kommt noch dazu.'),
      bug('quader-sichtbar', O / 2 + extra, HINT.quaderSichtbar),
    ],
    praise: 'Du hast Oberfläche und Überlappung addiert.',
    srText: `${name} verpackt ein Geschenk. ${spoken} Zum Überlappen kommen noch ${extra} Quadratzentimeter Papier dazu. Wie viel Papier braucht das Geschenk?`,
    kmk: [...KMK, 'PK.modellieren'],
  };
};

const s3TwoBodies: Forms[3][3] = (rng) => {
  const a1 = rng.int(6, 14);
  const b1 = rng.int(5, 12);
  const c1 = rng.int(2, 8);
  const a2 = rng.int(2, a1 - 2);
  const b2 = rng.int(2, b1 - 2);
  const c2 = rng.int(2, 8);
  const O1 = surface(a1, b1, c1);
  const O2 = surface(a2, b2, c2);
  const touch = a2 * b2;
  const O = O1 + O2 - 2 * touch;
  return {
    key: `zwei-quader:${a1}-${b1}-${c1}+${a2}-${b2}-${c2}`,
    context: 'Der kleine Quader steht ganz auf dem großen Quader.',
    prompt: 'Wie groß ist die Oberfläche vom ganzen Körper?',
    visual: { type: 'table', caption: 'Kanten in cm', header: ['Quader', 'Breite', 'Tiefe', 'Höhe'], rows: [['groß', String(a1), String(b1), String(c1)], ['klein', String(a2), String(b2), String(c2)]] },
    answer: answer(O),
    hints: ['Rechne zuerst beide Oberflächen einzeln.', 'Die Fläche zwischen den Quadern ist nicht mehr außen.'],
    steps: [`Großer Quader: ${O1}`, `Kleiner Quader: ${O2}`, `Berührfläche: ${a2} · ${b2} = ${touch}`, `Zweimal abziehen: ${O1} + ${O2} − 2 · ${touch} = ${O}`, `Die Oberfläche ist ${q(O, 'cm²')}.`],
    bugs: [
      bug('klebe-doppelt', O1 + O2, 'Die Fläche zwischen den Quadern liegt innen. Zieh diese Fläche ab.'),
      bug('klebe-einmal', O1 + O2 - touch, 'Zwei Flächen liegen innen: je eine von jedem Quader.'),
    ],
    praise: 'Du hast die verdeckte Fläche zweimal abgezogen.',
    srText: `Der kleine Quader steht ganz auf dem großen Quader. Der große Quader ist ${a1} Zentimeter breit, ${b1} tief und ${c1} hoch. Der kleine ist ${a2} breit, ${b2} tief und ${c2} hoch. Wie groß ist die Oberfläche vom ganzen Körper?`,
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

const FORMS: Forms = {
  1: { 1: s1Cube, 2: s1CubeNet, 3: s1CubeBack },
  2: { 1: s2Pairs, 2: s2Edges, 3: s2PairBack },
  3: { 1: s3OpenBox, 2: s3Gift, 3: s3TwoBodies },
};

const STUFEN: Record<Stufe, string> = {
  1: 'Würfel: sechs gleiche Quadrate, Kante bis 12 cm',
  2: 'Quader aus dem Netz: drei Flächenpaare',
  3: 'Geschenkpapier, offene Schachtel, Körper aus zwei Quadern',
};

export const oberflaecheSkill: SkillDef = {
  ...SKILL,
  title: 'Oberfläche vom Quader',
  description: 'Du rechnest alle sechs Flächen zusammen.',
  stufen: STUFEN,
  kmk: KMK,
  generate: generator(SKILL, KMK, FORMS),
};
