/**
 * Koordinatensystem (docs/research.md §6). Stufe 1 reads points in the first quadrant, Stufe 2 plots them and finds the missing corner of a rectangle,
 * Stufe 3 uses four quadrants, from −4 to 4: a wider picture shrinks its numbers below a readable size on a phone. A profile without four quadrants (fourQuadrants: false) keeps Stufe 3 in the first one with harder corners and Mitten.
 * The minus key is active for the whole skill, so every field sets signed (§7.1).
 */
import { fmt, fmtPoint, toSpeech } from '../../core/format';
import type { Ab, Bug, Exercise, GenContext, GridPoint, MultiField, PointAnswer, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, multiBugs, pointBugs, targetAb } from '../shared';
import { clearOfAxisNames } from './helpers';

const SKILL = { id: 'geometrie.koordinaten', topicId: 'geometrie' } as const;
const KMK = ['SF.koordinaten'];

const ORDER_HINT = 'Erst nach rechts, dann nach oben.';
const SWAP_HINT = 'Der Rechtswert (x) steht zuerst. Erst nach rechts, dann nach oben.';
const ONE_HINT = 'Der Ursprung ist (0|0). Zähle die Schritte ab dort.';
const SIGN_LEFT = 'Negativer Rechtswert (x): Geh vom Ursprung nach links.';
const SIGN_DOWN = 'Negativer Hochwert (y): Geh vom Ursprung nach unten.';
const NAMES = ['P', 'Q', 'A', 'B', 'R', 'S'];

function plain(): VisualOf<'coordinateGrid'> {
  return { type: 'coordinateGrid', xMin: 0, xMax: 8, yMin: 0, yMax: 8, step: 1, labelStep: 1, axisNames: 'rechtsHoch', points: [] };
}

function wide(): VisualOf<'coordinateGrid'> {
  return { type: 'coordinateGrid', xMin: -4, xMax: 4, yMin: -4, yMax: 4, step: 1, labelStep: 1, axisNames: 'rechtsHoch', points: [] };
}

/** The fields of a read point: P( [x] | [y] ). */
function pointFields(name: string, x: number, y: number, suffix = ''): MultiField[] {
  return [
    { id: `x${suffix}`, value: x, before: `${name}(`, signed: true, label: `Rechtswert (x) von ${name}` },
    { id: `y${suffix}`, value: y, before: '|', after: ')', signed: true, label: `Hochwert (y) von ${name}` },
  ];
}

const swapped = (x: number, y: number) => ({ id: 'koordinaten-getauscht', match: { x: y, y: x }, hint: SWAP_HINT });
const offByOne = (x: number, y: number) => ({ id: 'koordinaten-eins', match: { x: x + 1, y: y + 1 }, hint: ONE_HINT });

/** The way to a point in words, with the child's numbers. */
function walk(x: number, y: number): string {
  const across = x === 0 ? 'nicht nach rechts oder links' : `${fmt(Math.abs(x))} nach ${x > 0 ? 'rechts' : 'links'}`;
  const up = y === 0 ? 'nicht nach oben oder unten' : `${fmt(Math.abs(y))} nach ${y > 0 ? 'oben' : 'unten'}`;
  return `Vom Ursprung geht es ${across}, dann ${up}.`;
}

/** A point of the first quadrant, up to `max`, off the axes and with different values, whose letter stays clear of the axis names. */
function freePoint(rng: Rng, max: number): [number, number] {
  const grid = plain();
  for (;;) {
    const x = rng.int(1, max);
    const y = rng.int(1, max);
    if (x !== y && clearOfAxisNames(grid, x, y)) return [x, y];
  }
}

const spoken = (name: string, x: number, y: number) => `${name} bei ${fmt(x)} und ${fmt(y)}`;

/** Stufe 1, AB I: read one point. */
function readOne(rng: Rng, ab: Ab): Exercise {
  const name = rng.pick(NAMES);
  const [x, y] = freePoint(rng, 8);
  const fields = pointFields(name, x, y);
  return build(SKILL, 1, {
    key: `lesen:${name}:${x}.${y}`,
    ab,
    prompt: `Lies die Koordinaten von ${name} ab.`,
    visual: { ...plain(), points: [{ x, y, label: name }] },
    answer: { kind: 'multi', fields },
    hints: [ORDER_HINT, 'Starte im Ursprung. Zähle die Kästchen bis zum Punkt.'],
    steps: [walk(x, y), `Der Rechtswert (x) ist ${x}, der Hochwert (y) ist ${y}.`, `${fmtPoint(name, x, y)}`],
    bugs: multiBugs([swapped(x, y), offByOne(x, y)], fields),
    praise: rng.pick(['Du bist erst nach rechts und dann nach oben gegangen.', 'Du hast ab dem Ursprung gezählt.']),
    srText: toSpeech(`Koordinatensystem mit dem Punkt ${spoken(name, x, y)}. Lies die Koordinaten von ${name} ab.`),
    kmk: KMK,
  });
}

/** Stufe 1, AB II: several points; the one asked for lies on an axis. */
function readOnAxis(rng: Rng, ab: Ab): Exercise {
  const onX = rng.chance(0.5);
  const v = rng.pick([1, 2, 3, 4, 5, 6, 7, 8].filter((n) => clearOfAxisNames(plain(), onX ? n : 0, onX ? 0 : n)));
  const [x, y] = onX ? [v, 0] : [0, v];
  const [name, other1, other2] = rng.sample(NAMES, 3);
  const a: GridPoint = { x: rng.int(1, 4), y: rng.int(5, 7), label: other1 };
  const b: GridPoint = { x: rng.int(5, 8), y: rng.int(1, 4), label: other2 };
  const fields = pointFields(name, x, y);
  return build(SKILL, 1, {
    key: `achse:${name}:${x}.${y}:${a.x}.${a.y}:${b.x}.${b.y}`,
    ab,
    prompt: `Lies die Koordinaten von ${name} ab.`,
    visual: { ...plain(), points: [{ x, y, label: name }, a, b] },
    answer: { kind: 'multi', fields },
    hints: ['Der Punkt liegt auf einer Achse. Wie viele Schritte brauchst du noch?', ORDER_HINT],
    steps: [walk(x, y), `Der Rechtswert (x) ist ${x}, der Hochwert (y) ist ${y}.`, fmtPoint(name, x, y)],
    bugs: multiBugs([swapped(x, y), offByOne(x, y)], fields),
    praise: 'Du hast die 0 beim Punkt auf der Achse mitgeschrieben.',
    srText: toSpeech(`Koordinatensystem mit den Punkten ${spoken(name, x, y)}, ${spoken(other1, a.x, a.y)} und ${spoken(other2, b.x, b.y)}. Lies die Koordinaten von ${name} ab.`),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: reversed. Which point has these values? The swapped point is among them. */
function whichPoint(rng: Rng, ab: Ab): Exercise {
  const grid = plain();
  let x = 0;
  let y = 0;
  do {
    [x, y] = freePoint(rng, 7);
  } while (!clearOfAxisNames(grid, y, x) || !clearOfAxisNames(grid, x + 1, y + 1));
  const labels = ['A', 'B', 'C', 'D'];
  const taken = new Set([`${x}.${y}`, `${y}.${x}`, `${x + 1}.${y + 1}`]);
  let far: [number, number] = [1, 1];
  for (let i = 0; i < 40; i++) {
    far = [rng.int(0, 8), rng.int(0, 8)];
    if (!taken.has(`${far[0]}.${far[1]}`) && clearOfAxisNames(grid, far[0], far[1])) break;
  }
  const spots = rng.shuffle<{ p: [number, number]; why?: string }>([
    { p: [x, y] },
    { p: [y, x], why: SWAP_HINT },
    { p: [x + 1, y + 1], why: ONE_HINT },
    { p: far, why: 'Starte im Ursprung. Zähle zuerst nach rechts, dann nach oben.' },
  ]);
  const points: GridPoint[] = spots.map((s, i) => ({ x: s.p[0], y: s.p[1], label: labels[i] }));
  const right = spots.findIndex((s) => !s.why);
  const prompt = `Welcher Punkt hat den Rechtswert (x) ${x} und den Hochwert (y) ${y}?`;
  return build(SKILL, 1, {
    key: `welcher:${x}.${y}:${points.map((p) => `${p.x}.${p.y}`).join('-')}`,
    ab,
    prompt,
    visual: { ...plain(), points },
    answer: makeChoice(rng, { label: labels[right] }, spots.flatMap((s, i) => (s.why ? [{ label: labels[i], whyWrong: s.why }] : [])), { order: labels }),
    hints: [ORDER_HINT, `Geh ${x} nach rechts und dann ${y} nach oben.`],
    steps: [walk(x, y), `Dort liegt Punkt ${labels[right]}.`, `Punkt ${labels[right]} hat den Rechtswert (x) ${x} und den Hochwert (y) ${y}.`],
    praise: 'Du hast Rechtswert (x) und Hochwert (y) unterschieden.',
    srText: toSpeech(`Koordinatensystem mit den Punkten ${points.map((p) => spoken(p.label!, p.x, p.y)).join(', ')}. ${prompt}`),
    kmk: KMK,
  });
}

function pointAnswer(grid: VisualOf<'coordinateGrid'>, name: string, x: number, y: number, extra: Partial<PointAnswer> = {}): PointAnswer {
  return { kind: 'point', xMin: grid.xMin, xMax: grid.xMax, yMin: grid.yMin, yMax: grid.yMax, step: 1, target: [x, y], tolerance: 0, name, labelStep: 1, axisNames: grid.axisNames, ...extra };
}

/** Stufe 2, AB I: plot a point. */
function plot(rng: Rng, ab: Ab): Exercise {
  const name = rng.pick(NAMES);
  const [x, y] = freePoint(rng, 8);
  const answer = pointAnswer(plain(), name, x, y);
  return build(SKILL, 2, {
    key: `setzen:${name}:${x}.${y}`,
    ab,
    prompt: `Setze den Punkt ${fmtPoint(name, x, y)}.`,
    answer,
    hints: [ORDER_HINT, 'Die erste Zahl ist der Rechtswert (x), die zweite der Hochwert (y).'],
    steps: [walk(x, y), { text: `Dort liegt ${fmtPoint(name, x, y)}.`, visual: { ...plain(), points: [{ x, y, label: name }] } }],
    bugs: pointBugs([swapped(x, y), offByOne(x, y)], answer),
    praise: rng.pick(['Du bist erst nach rechts und dann nach oben gegangen.', 'Du hast die Reihenfolge der Zahlen beachtet.']),
    srText: toSpeech(`Setze den Punkt ${name} bei ${x} und ${y}. Erst der Rechtswert (x), dann der Hochwert (y).`),
    kmk: KMK,
  });
}

/** Stufe 2, AB I (F9): the swapped point is already in the picture, so (4|5) and (5|4) stand side by side. */
function plotBesideSwapped(rng: Rng, ab: Ab): Exercise {
  const [name, other] = rng.sample(NAMES, 2);
  const grid = plain();
  let [x, y] = freePoint(rng, 8);
  while (!clearOfAxisNames(grid, y, x)) [x, y] = freePoint(rng, 8);
  const given = { x: y, y: x, label: other };
  const answer = pointAnswer(grid, name, x, y, { points: [given] });
  const shown = fmtPoint(other, y, x);
  return build(SKILL, 2, {
    key: `setzen-paar:${name}:${other}:${x}.${y}`,
    ab,
    prompt: `${shown} ist schon eingetragen. Setze den Punkt ${fmtPoint(name, x, y)}.`,
    answer,
    hints: ['Die beiden Punkte haben dieselben Zahlen, aber andersherum.', ORDER_HINT],
    steps: [
      walk(x, y),
      { text: `${fmtPoint(name, x, y)} und ${shown} liegen an verschiedenen Stellen.`, visual: { ...plain(), points: [given, { x, y, label: name }] } },
    ],
    bugs: pointBugs([{ ...swapped(x, y), hint: `Dort liegt schon ${other}. ${ORDER_HINT}` }, offByOne(x, y)], answer),
    praise: 'Du hast die Reihenfolge der Zahlen beachtet.',
    srText: toSpeech(`${spoken(other, y, x)} ist schon eingetragen. Setze den Punkt ${spoken(name, x, y)}. Erst der Rechtswert (x), dann der Hochwert (y).`),
    kmk: KMK,
  });
}

/** Corners A, B, C, D of a rectangle, clockwise, starting at a random corner. D is the one to find. */
function rectangle(rng: Rng, xMin: number, xMax: number, yMin: number, yMax: number, crossing = false): [number, number][] {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < 80; i++) {
    x1 = rng.int(xMin, xMax - 2);
    x2 = rng.int(x1 + 2, xMax);
    y1 = rng.int(yMin, yMax - 2);
    y2 = rng.int(y1 + 2, yMax);
    const clear = xMin < 0 || [[x1, y1], [x1, y2], [x2, y2], [x2, y1]].every(([x, y]) => clearOfAxisNames(plain(), x, y));
    if (x2 - x1 !== y2 - y1 && clear && (!crossing || (x1 < 0 && y2 > 0 && (x2 > 0 || y1 < 0)))) break;
  }
  const ring: [number, number][] = [[x1, y1], [x1, y2], [x2, y2], [x2, y1]];
  const start = rng.int(0, 3);
  return [0, 1, 2, 3].map((i) => ring[(start + i) % 4]);
}

/** The wrong corners: the parallelogram a child gets from the wrong pair of corners. */
function wrongCorners([a, b, c]: [number, number][]): [number, number][] {
  return [[b[0] + c[0] - a[0], b[1] + c[1] - a[1]], [a[0] + b[0] - c[0], a[1] + b[1] - c[1]]];
}

const CORNER_HINT = 'Die Seite gegenüber ist parallel und gleich lang. Prüfe die Lage der Ecke.';

/** Stufe 2, AB II: the missing corner in the picture. */
function cornerInPicture(rng: Rng, ab: Ab): Exercise {
  const corners = rectangle(rng, 0, 8, 0, 8);
  const [a, b, c, d] = corners;
  const pts: GridPoint[] = [{ x: a[0], y: a[1], label: 'A' }, { x: b[0], y: b[1], label: 'B' }, { x: c[0], y: c[1], label: 'C' }];
  const segments: [GridPoint, GridPoint][] = [[pts[0], pts[1]], [pts[1], pts[2]]];
  const answer = pointAnswer(plain(), 'D', d[0], d[1], { points: pts, segments });
  const bugs: Bug[] = pointBugs([
    swapped(d[0], d[1]),
    ...wrongCorners(corners).map((w) => ({ id: 'ecke-gegenueber', match: { x: w[0], y: w[1] }, hint: CORNER_HINT })),
  ], answer);
  return build(SKILL, 2, {
    key: `ecke-bild:${corners.map((p) => p.join('.')).join('-')}`,
    ab,
    prompt: 'A, B und C sind Ecken eines Rechtecks. Setze die vierte Ecke D.',
    answer,
    hints: ['Geh von A aus parallel zur Seite von B nach C.', 'Ein Rechteck hat vier rechte Winkel.'],
    steps: [
      `D liegt beim Rechtswert (x) von ${a[0] === b[0] ? 'C' : 'A'}: ${fmt(d[0])}.`,
      `D liegt beim Hochwert (y) von ${a[1] === b[1] ? 'C' : 'A'}: ${fmt(d[1])}.`,
      { text: `Die vierte Ecke ist ${fmtPoint('D', d[0], d[1])}.`, visual: { ...plain(), points: [...pts, { x: d[0], y: d[1], label: 'D' }], segments: [...segments, [pts[2], { x: d[0], y: d[1] }], [{ x: d[0], y: d[1] }, pts[0]]] } },
    ],
    bugs,
    praise: rng.pick(['Du hast die Seiten des Rechtecks parallel fortgesetzt.', 'Du hast die vierte Ecke aus zwei Werten bestimmt.']),
    srText: toSpeech(`Koordinatensystem mit den Ecken ${fmtPoint('A', a[0], a[1])}, ${fmtPoint('B', b[0], b[1])} und ${fmtPoint('C', c[0], c[1])} eines Rechtecks. Setze die vierte Ecke D.`),
    kmk: KMK,
  });
}

/** The missing corner from the coordinates alone, read as D( [x] | [y] ). */
function cornerFromText(rng: Rng, stufe: Stufe, ab: Ab, corners: [number, number][], kmk: string[]): Exercise {
  const [a, b, c, d] = corners;
  const fields = pointFields('D', d[0], d[1]);
  const bugs = multiBugs([
    swapped(d[0], d[1]),
    ...wrongCorners(corners).map((w) => ({ id: 'ecke-gegenueber', match: { x: w[0], y: w[1] }, hint: CORNER_HINT })),
    (d[0] < 0 || d[1] < 0) && { id: 'koordinaten-vorzeichen', match: { x: Math.abs(d[0]), y: Math.abs(d[1]) }, hint: d[0] < 0 ? SIGN_LEFT : SIGN_DOWN },
  ], fields);
  const text = `Ein Rechteck hat die Ecken ${fmtPoint('A', a[0], a[1])}, ${fmtPoint('B', b[0], b[1])} und ${fmtPoint('C', c[0], c[1])}.`;
  return build(SKILL, stufe, {
    key: `${stufe === 3 ? 'ecke-minus' : 'ecke-text'}:${corners.map((p) => p.join('.')).join('-')}`,
    ab,
    prompt: `${text} Welche Koordinaten hat die vierte Ecke D?`,
    answer: { kind: 'multi', fields },
    hints: ['Zeichne die drei Ecken in ein Koordinatensystem.', 'Vergleiche die Rechtswerte (x) und die Hochwerte (y): Jeder Wert kommt zweimal vor.'],
    steps: [`Die Rechtswerte (x) sind ${fmt(a[0])}, ${fmt(b[0])}, ${fmt(c[0])}. Einer fehlt noch: ${fmt(d[0])}.`, `Die Hochwerte (y) sind ${fmt(a[1])}, ${fmt(b[1])}, ${fmt(c[1])}. Einer fehlt noch: ${fmt(d[1])}.`, fmtPoint('D', d[0], d[1])],
    bugs,
    praise: rng.pick(['Du hast jeden Wert zweimal gefunden.', 'Du hast die Ecke ohne Bild bestimmt.']),
    srText: toSpeech(`${text} Welche Koordinaten hat die vierte Ecke D?`),
    kmk,
  });
}

/** A point with at least one negative coordinate and different amounts. */
function negativePoint(rng: Rng): [number, number] {
  for (;;) {
    const x = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
    const y = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
    if ((x < 0 || y < 0) && Math.abs(x) !== Math.abs(y)) return [x, y];
  }
}

const signHint = (x: number) => (x < 0 ? SIGN_LEFT : SIGN_DOWN);

function signBugs(x: number, y: number): Bug[] {
  return [
    { id: 'koordinaten-vorzeichen', match: { x: Math.abs(x), y: Math.abs(y) }, hint: signHint(x) },
    { id: 'koordinaten-vorzeichen', match: { x: -x, y: -y }, hint: 'Prüfe beide Vorzeichen: Links und unten sind die Werte negativ.' },
    { id: 'koordinaten-vorzeichen', match: { x: -x, y }, hint: x < 0 ? SIGN_LEFT : 'Positiver Rechtswert (x): Geh vom Ursprung nach rechts.' },
    swapped(x, y),
  ];
}

/** Stufe 3, AB I: read a point with a negative coordinate. */
function readNegative(rng: Rng, ab: Ab): Exercise {
  const name = rng.pick(NAMES);
  const [x, y] = negativePoint(rng);
  const fields = pointFields(name, x, y);
  return build(SKILL, 3, {
    key: `lesen-minus:${name}:${x}.${y}`,
    ab,
    prompt: `Lies die Koordinaten von ${name} ab. Denk an die Vorzeichen.`,
    visual: { ...wide(), points: [{ x, y, label: name }] },
    answer: { kind: 'multi', fields },
    hints: ['Links vom Ursprung ist der Rechtswert (x) negativ. Unten ist der Hochwert (y) negativ.', 'Lies zuerst den Rechtswert (x), dann den Hochwert (y).'],
    steps: [walk(x, y), `Der Rechtswert (x) ist ${fmt(x)}, der Hochwert (y) ist ${fmt(y)}.`, fmtPoint(name, x, y)],
    bugs: multiBugs(signBugs(x, y), fields),
    praise: rng.pick(['Du hast die Vorzeichen beider Werte beachtet.', 'Du hast links und unten negativ geschrieben.']),
    srText: toSpeech(`Koordinatensystem mit vier Quadranten und dem Punkt ${spoken(name, x, y)}. Lies die Koordinaten von ${name} ab.`),
    kmk: KMK,
  });
}

/** Stufe 3, AB II: plot a point with a negative coordinate. */
function plotNegative(rng: Rng, ab: Ab): Exercise {
  const name = rng.pick(NAMES);
  const [x, y] = negativePoint(rng);
  const answer = pointAnswer(wide(), name, x, y);
  return build(SKILL, 3, {
    key: `setzen-minus:${name}:${x}.${y}`,
    ab,
    prompt: `Setze den Punkt ${fmtPoint(name, x, y)}.`,
    answer,
    hints: [x < 0 ? SIGN_LEFT : SIGN_DOWN, 'Geh zuerst waagerecht, dann senkrecht.'],
    steps: [walk(x, y), { text: `Dort liegt ${fmtPoint(name, x, y)}.`, visual: { ...wide(), points: [{ x, y, label: name }] } }],
    bugs: pointBugs(signBugs(x, y), answer),
    praise: rng.pick(['Du hast das Vorzeichen in eine Richtung übersetzt.', 'Du bist erst waagerecht und dann senkrecht gegangen.']),
    srText: toSpeech(`Setze den Punkt ${name} bei ${fmt(x)} und ${fmt(y)}. Das Koordinatensystem hat vier Quadranten.`),
    kmk: KMK,
  });
}

const MIDDLE_HINT = 'Die Mitte liegt von beiden Enden gleich weit entfernt.';

/** The Mitte of a waagerechte or senkrechte Strecke. */
function middle(rng: Rng, ab: Ab, min: number, max: number): Exercise {
  const flat = rng.chance(0.5);
  let half = 1;
  let start = 0;
  let other = 0;
  // With negative values in range, the Strecke has to use them: that is the content of this Stufe.
  do {
    half = rng.int(1, Math.floor((max - min) / 2));
    start = rng.int(min, max - 2 * half);
    other = rng.int(min, max);
  } while (min < 0 && start >= 0 && other >= 0);
  const lo = start;
  const hi = start + 2 * half;
  const mid = start + half;
  const [a, b, m] = flat ? [[lo, other], [hi, other], [mid, other]] : [[other, lo], [other, hi], [other, mid]];
  const fields = pointFields('M', m[0], m[1]);
  const wrong = flat ? { x: half, y: other } : { x: other, y: half };
  return build(SKILL, 3, {
    key: `mitte:${a.join('.')}:${b.join('.')}`,
    ab,
    prompt: `Die Strecke geht von ${fmtPoint('A', a[0], a[1])} bis ${fmtPoint('B', b[0], b[1])}. Welche Koordinaten hat ihre Mitte M?`,
    answer: { kind: 'multi', fields },
    hints: [MIDDLE_HINT, 'Zähle die Schritte von A bis B. Geh die Hälfte davon ab A.'],
    steps: [`Von A bis B sind es ${fmt(2 * half)} Schritte.`, half === 1 ? 'Die Hälfte ist 1 Schritt ab A.' : `Die Hälfte sind ${fmt(half)} Schritte ab A.`, fmtPoint('M', m[0], m[1])],
    bugs: multiBugs([{ id: 'mitte-laenge', match: wrong, hint: 'Das ist die halbe Länge. Geh diese Schritte ab A.' }, swapped(m[0], m[1])], fields),
    praise: rng.pick(['Du hast die Hälfte ab dem Anfang gezählt.', 'Du hast die Länge halbiert und ab A gezählt.']),
    srText: toSpeech(`Die Strecke geht von A bei ${fmt(a[0])} und ${fmt(a[1])} bis B bei ${fmt(b[0])} und ${fmt(b[1])}. Welche Koordinaten hat ihre Mitte M?`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Stufe 3 in one quadrant: the Ecke of a Quadrat above a given side. */
function squareCorner(rng: Rng, ab: Ab): Exercise {
  const s = rng.int(2, 4);
  const x = rng.int(0, 8 - s);
  const y = rng.int(0, 8 - s);
  const fields = pointFields('C', x + s, y + s);
  return build(SKILL, 3, {
    key: `quadrat-ecke:${x}.${y}:${s}`,
    ab,
    prompt: `Ein Quadrat hat unten die Ecken ${fmtPoint('A', x, y)} und ${fmtPoint('B', x + s, y)}. Welche Koordinaten hat die Ecke C rechts oben?`,
    answer: { kind: 'multi', fields },
    hints: ['Alle Seiten eines Quadrats sind gleich lang.', 'Die Seite von B nach C geht senkrecht nach oben.'],
    steps: [`Die Seite von A nach B ist ${s} Schritte lang.`, `Von B geht es ${s} Schritte nach oben.`, fmtPoint('C', x + s, y + s)],
    bugs: multiBugs([{ id: 'ecke-gegenueber', match: { x, y: y + s }, hint: 'Das ist die Ecke links oben. Gesucht ist die Ecke rechts oben.' }, swapped(x + s, y + s)], fields),
    praise: 'Du hast die Seitenlänge nach oben übertragen.',
    srText: toSpeech(`Ein Quadrat hat unten die Ecken A bei ${x} und ${y} und B bei ${x + s} und ${y}. Welche Koordinaten hat die Ecke C rechts oben?`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Stufe 3 in one quadrant, AB III: both upper corners of a Quadrat. */
function squareBoth(rng: Rng, ab: Ab): Exercise {
  const s = rng.int(2, 4);
  const x = rng.int(0, 8 - s);
  const y = rng.int(0, 8 - s);
  const fields = [...pointFields('C', x + s, y + s, 'c'), ...pointFields('D', x, y + s, 'd')];
  return build(SKILL, 3, {
    key: `quadrat-beide:${x}.${y}:${s}`,
    ab,
    prompt: `Ein Quadrat hat unten die Ecken ${fmtPoint('A', x, y)} und ${fmtPoint('B', x + s, y)}. Trag C rechts oben und D links oben ein.`,
    answer: { kind: 'multi', fields },
    hints: ['Alle Seiten eines Quadrats sind gleich lang.', 'C liegt senkrecht über B. D liegt senkrecht über A.'],
    steps: [`Die Seite von A nach B ist ${s} Schritte lang.`, `C und D liegen ${s} Schritte über B und A.`, `${fmtPoint('C', x + s, y + s)} und ${fmtPoint('D', x, y + s)}`],
    bugs: multiBugs([{ id: 'ecke-gegenueber', match: { xc: x, yc: y + s, xd: x + s, yd: y + s }, hint: 'C liegt rechts oben, D links oben. Prüfe die Rechtswerte (x).' }], fields),
    praise: 'Du hast beide Ecken aus der Seitenlänge bestimmt.',
    srText: toSpeech(`Ein Quadrat hat unten die Ecken A bei ${x} und ${y} und B bei ${x + s} und ${y}. C liegt rechts oben, D links oben. Trag C und D ein.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function stufe3(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  if (!ctx.ranges.fourQuadrants) {
    if (ab === 1) return squareCorner(rng, ab);
    return ab === 2 ? middle(rng, ab, 0, 8) : squareBoth(rng, ab);
  }
  if (ab === 1) return readNegative(rng, ab);
  if (ab === 2) return plotNegative(rng, ab);
  if (rng.chance(0.4)) return middle(rng, ab, -6, 6);
  return cornerFromText(rng, 3, ab, rectangle(rng, -6, 6, -6, 6, true), [...KMK, 'PK.problemloesen']);
}

export const koordinatenSkill: SkillDef = {
  ...SKILL,
  title: 'Koordinatensystem',
  description: 'Du liest Punkte ab und trägst sie ein.',
  stufen: {
    1: 'Punkte ablesen, erster Quadrant, 0 bis 8',
    2: 'Punkte eintragen; fehlende Ecke eines Rechtecks',
    3: 'Vier Quadranten mit Vorzeichen; schwierige Ecken und Mitten',
  },
  kmk: KMK,
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 1 ? readOne(rng, ab) : ab === 2 ? readOnAxis(rng, ab) : whichPoint(rng, ab);
    if (stufe === 2) {
      if (ab === 1) return rng.chance(0.5) ? plot(rng, ab) : plotBesideSwapped(rng, ab);
      if (ab === 2) return cornerInPicture(rng, ab);
      return cornerFromText(rng, 2, ab, rectangle(rng, 0, 8, 0, 8), KMK);
    }
    return stufe3(rng, ab, ctx);
  },
};
