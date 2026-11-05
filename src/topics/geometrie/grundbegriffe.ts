/**
 * Punkt, Strecke, Gerade (docs/research.md §6). Stufe 1 tells the three kinds of line apart by their ends. Stufe 2 names them and finds the Abstand of a
 * point from a Gerade. Stufe 3 turns to the Kreis: Radius, Durchmesser and the points at a given distance.
 */
import { fmtQty, toSpeech } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, GenContext, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, numberBugs, targetAb } from '../shared';
import { BASE_LINE, LINE_LETTERS, clearOfAxisNames, fitLabels, labelledChoice, offsetThrough, reachOf } from './helpers';

const SKILL = { id: 'geometrie.grundbegriffe', topicId: 'geometrie' } as const;
const KMK = ['RF.grundbegriffe'];

type Kind = 'strecke' | 'gerade' | 'halbgerade';
const KINDS: readonly Kind[] = ['strecke', 'gerade', 'halbgerade'];
const NAME: Record<Kind, string> = { strecke: 'Strecke', gerade: 'Gerade', halbgerade: 'Halbgerade' };
const ENDS: Record<Kind, string> = { strecke: 'zwei Endpunkte', gerade: 'keinen Endpunkt', halbgerade: 'einen Endpunkt' };
/** ENDS after 'mit'. */
const WITH_ENDS: Record<Kind, string> = { strecke: 'zwei Endpunkten', gerade: 'keinem Endpunkt', halbgerade: 'einem Endpunkt' };
const WHY: Record<Kind, string> = {
  strecke: 'Eine Strecke hat zwei Endpunkte. Zähle die Endpunkte noch einmal.',
  gerade: 'Eine Gerade hat keinen Endpunkt. Schau auf beide Enden der Linie.',
  halbgerade: 'Eine Halbgerade hat einen Endpunkt und läuft dann weiter.',
};
const ANGLES = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165];
const TILTS = [0, 10, 15, 20, 160, 165, 170];
/** Flat enough for a labelled point at the end of the line to stay inside the picture. Falling to the right: the letter stands up and to the right of the point, off the line. */
const FLAT_TILTS = [140, 145, 150, 160, 165, 170];

const wrongKinds = (right: Kind): ChoiceOption[] => KINDS.filter((k) => k !== right).map((k) => ({ label: NAME[k], whyWrong: WHY[k] }));

/** Stufe 1, AB I: name the line in the picture. */
function nameLine(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick(KINDS);
  const angle = rng.pick(ANGLES);
  return build(SKILL, 1, {
    key: `name:${kind}:${angle}`,
    ab,
    prompt: 'Wie heißt diese Linie?',
    visual: { type: 'lines', lines: [{ angle, offset: 0, kind }] },
    answer: makeChoice(rng, { label: NAME[kind] }, wrongKinds(kind)),
    hints: ['Schau dir beide Enden der Linie an.', 'Zähle die Endpunkte: keiner, einer oder zwei?'],
    steps: [`Die Linie hat ${ENDS[kind]}.`, `Diese Linie ist eine ${NAME[kind]}.`],
    praise: rng.pick(['Du hast auf die Enden der Linie geschaut.', 'Du hast die Endpunkte gezählt.']),
    srText: toSpeech(`Eine Linie mit ${WITH_ENDS[kind]}. Wie heißt diese Linie?`),
    kmk: KMK,
  });
}

/** Stufe 1, AB II: three lines side by side, find the one of a kind. */
function findLine(rng: Rng, ab: Ab): Exercise {
  const letters = rng.pick(LINE_LETTERS);
  const kinds = rng.shuffle(KINDS);
  const asked = rng.pick(KINDS);
  const index = kinds.indexOf(asked);
  const angle = rng.pick(TILTS);
  const visual: VisualOf<'lines'> = fitLabels(() => ({ type: 'lines', lines: kinds.map((kind, i) => ({ angle, offset: (i - 1) * 62, kind, label: letters[i] })) }));
  const wrongs = letters.filter((_, i) => i !== index).map((label) => ({ label, whyWrong: WHY[asked] }));
  return build(SKILL, 1, {
    key: `finden:${asked}:${kinds.join('-')}:${angle}:${letters[0]}`,
    ab,
    prompt: `Welche Linie ist eine ${NAME[asked]}?`,
    visual,
    answer: labelledChoice(rng, { label: letters[index] }, wrongs, [...letters]),
    hints: ['Schau bei jeder Linie auf beide Enden.', `Eine ${NAME[asked]} hat ${ENDS[asked]}.`],
    steps: [`Eine ${NAME[asked]} hat ${ENDS[asked]}.`, `Linie ${letters[index]} hat ${ENDS[asked]}.`, `Linie ${letters[index]} ist die ${NAME[asked]}.`],
    praise: rng.pick(['Du hast jede Linie einzeln geprüft.', 'Du hast die Enden der Linien verglichen.']),
    srText: toSpeech(`Drei Linien: ${kinds.map((k, i) => `Linie ${letters[i]} hat ${ENDS[k]}`).join(', ')}. Welche Linie ist eine ${NAME[asked]}?`),
    kmk: KMK,
  });
}

const SITUATIONS: { text: string; kind: Kind; why: string }[] = [
  { text: 'Welche Linie kannst du ganz mit dem Lineal messen?', kind: 'strecke', why: 'Mit dem Lineal misst du von Endpunkt zu Endpunkt.' },
  { text: 'Welche Linie beginnt an einem Punkt und hat dann kein Ende?', kind: 'halbgerade', why: 'Diese Linie hat genau einen Anfang.' },
  { text: 'Welche Linie hat in beide Richtungen kein Ende?', kind: 'gerade', why: 'Beide Richtungen laufen immer weiter.' },
  { text: 'Licht startet an einer Lampe und läuft immer weiter. Welche Linie passt?', kind: 'halbgerade', why: 'Das Licht hat einen Anfang an der Lampe, aber kein Ende.' },
  { text: 'Eine Seite eines Rechtecks reicht von Ecke zu Ecke. Welche Linie passt?', kind: 'strecke', why: 'Die Seite hat an den zwei Ecken ihre Enden.' },
  { text: 'Ein Bahngleis denkst du dir ohne Anfang und ohne Ende. Welche Linie passt?', kind: 'gerade', why: 'Ohne Anfang und ohne Ende gibt es keinen Endpunkt.' },
];

/** Stufe 1, AB III: the kind of line from its meaning, without a picture. */
function situation(rng: Rng, ab: Ab): Exercise {
  const s = rng.pick(SITUATIONS);
  return build(SKILL, 1, {
    key: `sinn:${SITUATIONS.indexOf(s)}`,
    ab,
    prompt: s.text,
    answer: makeChoice(rng, { label: NAME[s.kind] }, wrongKinds(s.kind)),
    hints: ['Überlege: Wo fängt die Linie an? Wo hört die Linie auf?', 'Zähle die Endpunkte der Linie.'],
    steps: [s.why, `Die Linie hat ${ENDS[s.kind]}.`, `Es passt die ${NAME[s.kind]}.`],
    praise: rng.pick(['Du hast dir die Enden der Linie vorgestellt.', 'Du hast die Situation mit den Endpunkten verglichen.']),
    srText: toSpeech(s.text),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** Stufe 2, AB I: the name of a line, by its letters. */
function notation(rng: Rng, ab: Ab): Exercise {
  const angle = rng.pick(FLAT_TILTS);
  const t = reachOf(angle);
  const r = (angle * Math.PI) / 180;
  const at = (s: number) => ({ x: Math.round(s * t * Math.cos(r)), y: Math.round(s * t * Math.sin(r)) });
  if (rng.chance(0.4)) {
    const [g, p] = rng.pick([['k', 'P'], ['n', 'Q'], ['d', 'A']]);
    return build(SKILL, 2, {
      key: `name-klein:${g}:${angle}`,
      ab,
      prompt: 'Welcher Name passt zu der Geraden im Bild?',
      visual: { ...fitLabels(() => ({ type: 'lines' as const, lines: [{ angle, offset: 0, label: g }] })), points: [{ ...at(0.3), label: p }] },
      answer: makeChoice(rng, { label: `Gerade ${g}` }, [{ label: `Gerade ${p}`, whyWrong: `${p} ist der Name des Punkts. Punkte bekommen große Buchstaben.` }, { label: `Punkt ${g}`, whyWrong: 'Punkte bekommen große Buchstaben. Geraden bekommen kleine.' }, { label: `Strecke ${g}`, whyWrong: 'Die Linie im Bild hat keinen Endpunkt.' }]),
      hints: ['Punkte bekommen große Buchstaben.', 'Geraden bekommen kleine Buchstaben.'],
      steps: [`Der Punkt heißt ${p}. Das ist ein großer Buchstabe.`, `Die Linie heißt ${g}. Das ist ein kleiner Buchstabe.`, `Der Name ist Gerade ${g}.`],
      praise: 'Du hast große und kleine Buchstaben unterschieden.',
      srText: toSpeech(`Eine Linie ohne Endpunkte mit dem Namen ${g}. Auf der Linie liegt der Punkt ${p}. Welcher Name passt zu der Geraden im Bild?`),
      kmk: KMK,
    });
  }
  const kind = rng.pick(KINDS);
  const [a, b] = rng.pick([['A', 'B'], ['C', 'D'], ['P', 'Q'], ['R', 'S']]);
  const spots = kind === 'strecke' ? [at(-1), at(1)] : kind === 'halbgerade' ? [at(-1), at(0.25)] : [at(-0.5), at(0.5)];
  return build(SKILL, 2, {
    key: `name:${kind}:${a}${b}:${angle}`,
    ab,
    prompt: 'Welcher Name passt zu der Linie im Bild?',
    visual: { type: 'lines', lines: [{ angle, offset: 0, kind }], points: [{ ...spots[0], label: a }, { ...spots[1], label: b }] },
    answer: makeChoice(rng, { label: `${NAME[kind]} ${a}${b}` }, [...KINDS.filter((k) => k !== kind).map((k) => ({ label: `${NAME[k]} ${a}${b}`, whyWrong: WHY[k] })), { label: `Punkt ${a}`, whyWrong: `${a} ist nur ein Punkt auf der Linie.` }]),
    hints: ['Schau zuerst auf die Enden der Linie.', 'Der Name nennt die Art der Linie und zwei Punkte.'],
    steps: [`Die Linie hat ${ENDS[kind]}.`, `Die Linie geht durch die Punkte ${a} und ${b}.`, `Der Name ist ${NAME[kind]} ${a}${b}.`],
    praise: 'Du hast die Art der Linie und ihre Punkte genannt.',
    srText: toSpeech(`Eine Linie mit ${WITH_ENDS[kind]}. Auf der Linie liegen die Punkte ${a} und ${b}. Welcher Name passt?`),
    kmk: KMK,
  });
}

const GRID = { type: 'coordinateGrid', xMin: 0, xMax: 8, yMin: 0, yMax: 8, step: 1, labelStep: 1, axisNames: 'rechtsHoch' } as const;

/** Stufe 2, AB II: the Abstand of P from a waagerechte or senkrechte Gerade, counted on the grid. */
function distance(rng: Rng, ab: Ab): Exercise {
  const flat = rng.chance(0.5);
  const line = rng.int(1, 6);
  const free = rng.int(1, 7);
  const place = rng.pick([0, 1, 2, 3, 4, 5, 6, 7, 8].filter((v) => Math.abs(v - line) >= 2 && clearOfAxisNames(GRID, flat ? free : v, flat ? v : free)));
  const [x, y] = flat ? [free, place] : [place, free];
  const value = Math.abs(place - line);
  const g = flat ? [{ x: 0, y: line }, { x: 8, y: line }] : [{ x: line, y: 0 }, { x: line, y: 8 }];
  const foot = flat ? { x, y: line } : { x: line, y };
  const big = Math.max(place, line);
  const small = Math.min(place, line);
  const word = flat ? 'Hochwert (y)' : 'Rechtswert (x)';
  return build(SKILL, 2, {
    key: `abstand:${flat ? 'w' : 's'}:${line}:${x}.${y}`,
    ab,
    prompt: 'Wie groß ist der Abstand von P zu der Geraden im Bild?',
    visual: { ...GRID, points: [{ x, y, label: 'P' }], segments: [[g[0], g[1]]] },
    answer: { kind: 'number', value, unit: 'Kästchen' },
    hints: ['Der Abstand ist der kürzeste Weg von P zur Geraden.', 'Geh von P senkrecht zur Geraden. Zähle dabei die Kästchen.'],
    steps: [
      { text: 'Geh von P senkrecht zur Geraden.', visual: { ...GRID, points: [{ x, y, label: 'P' }, foot], segments: [[g[0], g[1]], [{ x, y }, foot]] } },
      `Von ${word} ${big} bis ${word} ${small}: ${big} − ${small} = ${value}.`,
      `Der Abstand beträgt ${value} Kästchen.`,
    ],
    bugs: numberBugs([{ id: 'abstand-achse', match: place, hint: 'Zähle ab der Geraden, nicht ab der Achse.' }, { id: 'abstand-achse', match: free, hint: 'Geh senkrecht zur Geraden. Den anderen Wert brauchst du nicht.' }], value),
    praise: rng.pick(['Du hast senkrecht zur Geraden gezählt.', 'Du hast den kürzesten Weg zur Geraden genommen.']),
    srText: toSpeech(`Koordinatensystem mit einer ${flat ? 'waagerechten' : 'senkrechten'} Geraden beim ${word} ${line} und dem Punkt P bei ${x} und ${y}. Wie groß ist der Abstand von P zu der Geraden?`),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: reversed. Which point has this Abstand, or which line shows it? */
function distanceReversed(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.5)) {
    const letters = rng.pick(LINE_LETTERS);
    const P = { x: 20, y: 55, label: 'P' };
    const { lines, tilt, angles, perp } = fitLabels(() => {
      // All lines go through P, so no line may run up and to the right of it, where its letter stands: their directions stay between 80° and 155°.
      // The Abstand is one of the two steeper leaning lines, as k then rises to the right and leaves room for the labels at the lower ends.
      const angles = rng.shuffle(rng.pick([[85, 120, 155], [80, 120, 155], [85, 120, 150]]));
      const perp = angles.indexOf(rng.pick(angles.filter((a) => a >= 120)));
      const tilt = (angles[perp] + 90) % 180;
      const through = angles.map((angle, i) => ({ angle, offset: offsetThrough(angle, P.x, P.y), label: letters[i] }));
      return { tilt, angles, perp, points: [P], lines: [{ angle: tilt, offset: offsetThrough(tilt, 0, -45), label: BASE_LINE }, ...through] };
    });
    const wrongs = letters.filter((_, i) => i !== perp).map((label) => ({ label, whyWrong: `Diese Linie steht schräg auf ${BASE_LINE}. Der Abstand steht senkrecht auf ${BASE_LINE}.` }));
    return build(SKILL, 2, {
      key: `abstand-linie:${tilt}:${angles.join('-')}:${letters[0]}`,
      ab,
      prompt: `Welche Linie zeigt den Abstand von P zur Geraden ${BASE_LINE}?`,
      visual: { type: 'lines', lines, points: [P] },
      answer: labelledChoice(rng, { label: letters[perp] }, wrongs, [...letters]),
      hints: [`Der Abstand ist der kürzeste Weg von P zu ${BASE_LINE}.`, `Der kürzeste Weg bildet mit ${BASE_LINE} einen rechten Winkel.`],
      steps: [`Der kürzeste Weg von P zu ${BASE_LINE} steht senkrecht auf ${BASE_LINE}.`, { text: `Linie ${letters[perp]} bildet mit ${BASE_LINE} einen rechten Winkel.`, visual: { type: 'lines', lines, points: [P], rightAngleMarks: [[0, perp + 1]] } }, `Linie ${letters[perp]} zeigt den Abstand.`],
      praise: 'Du hast den rechten Winkel zur Geraden gesucht.',
      srText: toSpeech(`Die Gerade ${BASE_LINE} und der Punkt P. Durch P gehen die Linien ${letters.join(', ')}. Linie ${letters[perp]} bildet mit ${BASE_LINE} einen rechten Winkel, die anderen Linien stehen schräg. Welche Linie zeigt den Abstand?`),
      kmk: [...KMK, 'PK.argumentieren'],
    });
  }
  const line = rng.pick([3, 4, 5]);
  const far = Math.max(line, 8 - line);
  const labels = ['A', 'B', 'C', 'D'];
  let dists: number[] = [];
  let ys: number[] = [];
  let points: { x: number; y: number; label: string }[] = [];
  do {
    dists = rng.shuffle(Array.from({ length: far }, (_, i) => i + 1)).slice(0, 4);
    const xs = rng.shuffle([1, 2, 3, 4, 5, 6, 7]);
    ys = dists.map((d) => (line + d <= 8 && (line - d < 0 || rng.chance(0.5)) ? line + d : line - d));
    points = dists.map((_, i) => ({ x: xs[i], y: ys[i], label: labels[i] }));
  } while (!points.every((p) => clearOfAxisNames(GRID, p.x, p.y)));
  const target = rng.int(0, 3);
  const value = dists[target];
  const wrongs = labels.filter((_, i) => i !== target).map((label) => ({ label, whyWrong: `Zähle senkrecht von ${label} bis zur Geraden.` }));
  return build(SKILL, 2, {
    key: `abstand-punkt:${line}:${points.map((p) => `${p.x}.${p.y}`).join('-')}:${value}`,
    ab,
    prompt: `Welcher Punkt hat von der Geraden den Abstand ${value} Kästchen?`,
    visual: { ...GRID, points, segments: [[{ x: 0, y: line }, { x: 8, y: line }]] },
    answer: labelledChoice(rng, { label: labels[target] }, wrongs, labels),
    hints: ['Zähle bei jedem Punkt die Kästchen bis zur Geraden.', 'Geh dabei senkrecht zur Geraden, nach oben oder nach unten.'],
    steps: [`Die Gerade liegt beim Hochwert (y) ${line}.`, `Punkt ${labels[target]} liegt beim Hochwert (y) ${ys[target]}.`, `Der Abstand von Punkt ${labels[target]} beträgt ${value} Kästchen.`],
    praise: 'Du hast den Abstand bei jedem Punkt geprüft.',
    srText: toSpeech(`Koordinatensystem mit einer waagerechten Geraden beim Hochwert (y) ${line} und den Punkten ${points.map((p) => `${p.label} bei ${p.x} und ${p.y}`).join(', ')}. Welcher Punkt hat von der Geraden den Abstand ${value} Kästchen?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const CIRCLE: VisualOf<'shape'> = { type: 'shape', shape: 'kreis', named: true };

/** Stufe 3, AB I: Radius and Durchmesser. */
function radius(rng: Rng, ab: Ab): Exercise {
  const r = rng.int(2, 19);
  const toDiameter = rng.chance(0.5);
  const value = toDiameter ? r * 2 : r;
  const given = toDiameter ? r : r * 2;
  const twice = 'Der Durchmesser ist doppelt so lang wie der Radius.';
  return build(SKILL, 3, {
    key: `radius:${toDiameter ? 'd' : 'r'}:${r}`,
    ab,
    prompt: toDiameter ? `Ein Kreis hat den Radius ${fmtQty(given, 'cm')}. Wie lang ist der Durchmesser?` : `Ein Kreis hat den Durchmesser ${fmtQty(given, 'cm')}. Wie lang ist der Radius?`,
    visual: CIRCLE,
    answer: { kind: 'number', value, unit: 'cm' },
    hints: ['Der Radius geht vom Mittelpunkt bis zum Rand.', 'Der Durchmesser geht durch den Mittelpunkt von Rand zu Rand.'],
    steps: [twice, toDiameter ? `2 · ${given} cm = ${value} cm` : `${given} cm : 2 = ${value} cm`, `Der ${toDiameter ? 'Durchmesser' : 'Radius'} ist ${fmtQty(value, 'cm')} lang.`],
    bugs: numberBugs([
      { id: 'radius-gleich', match: given, hint: 'Radius und Durchmesser sind verschieden lang. Der Durchmesser besteht aus zwei Radien.' },
      (!toDiameter || r % 2 === 0) && { id: 'radius-richtung', match: toDiameter ? r / 2 : r * 4, hint: toDiameter ? 'Der Durchmesser ist länger als der Radius.' : 'Der Radius ist kürzer als der Durchmesser.' },
    ], value),
    praise: rng.pick(['Du hast Radius und Durchmesser unterschieden.', 'Du hast zwei Radien zu einem Durchmesser verbunden.']),
    srText: toSpeech(toDiameter ? `Ein Kreis hat den Radius ${given} Zentimeter. Wie lang ist der Durchmesser?` : `Ein Kreis hat den Durchmesser ${given} Zentimeter. Wie lang ist der Radius?`),
    kmk: KMK,
  });
}

const INSIDE = 'Innerhalb des Kreises';
const ON = 'Auf dem Kreis';
const OUTSIDE = 'Außerhalb des Kreises';

/** Stufe 3, AB II: points at a given distance from M: inside, on or outside the Kreis; all of them make up the Kreis. */
function pointAndCircle(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.25)) {
    const d = rng.int(2, 9);
    const text = `Alle Punkte haben vom Punkt M den Abstand ${fmtQty(d, 'cm')}. Welche Figur bilden diese Punkte?`;
    return build(SKILL, 3, {
      key: `alle:${d}`,
      ab,
      prompt: text,
      answer: makeChoice(rng, { label: 'Einen Kreis' }, [{ label: 'Eine Gerade', whyWrong: 'Die Punkte einer Geraden sind verschieden weit von M entfernt.' }, { label: 'Ein Quadrat', whyWrong: 'Die Ecken eines Quadrats sind weiter von M entfernt als die Seitenmitten.' }, { label: 'Eine Strecke', whyWrong: 'Die Punkte einer Strecke sind verschieden weit von M entfernt.' }]),
      hints: ['Zeichne im Kopf viele Punkte, alle gleich weit von M entfernt.', 'Dreh eine Strecke um M. Welche Figur zeichnet ihr Ende?'],
      steps: [`Jeder Punkt liegt genau ${fmtQty(d, 'cm')} von M entfernt.`, 'Das ist genau die Eigenschaft eines Kreises um M.', 'Die Punkte bilden einen Kreis.'],
      praise: 'Du hast dir alle Punkte um M vorgestellt.',
      srText: toSpeech(`Alle Punkte haben vom Mittelpunkt M den Abstand ${d} Zentimeter. Welche Figur bilden diese Punkte?`),
      kmk: [...KMK, 'PK.argumentieren'],
    });
  }
  const r = rng.int(2, 9);
  const dist = rng.pick([r, r - 1, r + 1, r + 2, 2 * r].filter((v) => v >= 1));
  const useDiameter = rng.chance(0.5);
  const right = dist < r ? INSIDE : dist === r ? ON : OUTSIDE;
  const given = useDiameter ? `Ein Kreis um M hat den Durchmesser ${fmtQty(2 * r, 'cm')}.` : `Ein Kreis um M hat den Radius ${fmtQty(r, 'cm')}.`;
  const wrongText = useDiameter ? 'Vergleiche den Abstand mit dem Radius, nicht mit dem Durchmesser.' : 'Vergleiche den Abstand von P mit dem Radius.';
  return build(SKILL, 3, {
    key: `lage:${useDiameter ? 'd' : 'r'}:${r}:${dist}`,
    ab,
    prompt: `${given} P hat von M den Abstand ${fmtQty(dist, 'cm')}. Wo liegt P?`,
    visual: CIRCLE,
    answer: makeChoice(rng, { label: right }, [INSIDE, ON, OUTSIDE].filter((o) => o !== right).map((label) => ({ label, whyWrong: wrongText })), { order: [INSIDE, ON, OUTSIDE] }),
    hints: ['Alle Punkte auf dem Kreis sind einen Radius von M entfernt.', useDiameter ? 'Berechne zuerst den Radius aus dem Durchmesser.' : 'Vergleiche den Abstand von P mit dem Radius.'],
    steps: [`Der Radius ist ${fmtQty(r, 'cm')} lang.`, `P hat von M den Abstand ${fmtQty(dist, 'cm')}.`, `P liegt: ${right}.`],
    praise: rng.pick(['Du hast den Abstand mit dem Radius verglichen.', 'Du hast zuerst den Radius bestimmt.']),
    srText: toSpeech(`${useDiameter ? `Ein Kreis um M hat den Durchmesser ${2 * r} Zentimeter.` : `Ein Kreis um M hat den Radius ${r} Zentimeter.`} P hat von M den Abstand ${dist} Zentimeter. Wo liegt P?`),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: reversed and in two steps, always from the Durchmesser. How far is P from the Kreis, or which Abstand fits its position? Lines and Kreis stay out (§2.6). */
function circleReasoning(rng: Rng, ab: Ab): Exercise {
  const r = rng.int(4, 12);
  const given = `Ein Kreis um M hat den Durchmesser ${fmtQty(2 * r, 'cm')}.`;
  const spokenGiven = `Ein Kreis um M hat den Durchmesser ${2 * r} Zentimeter.`;
  const half = `Der Radius ist ${2 * r} cm : 2 = ${r} cm.`;
  if (rng.chance(0.5)) {
    const dist = r + rng.pick([-3, -2, -1, 1, 2, 3]);
    const value = Math.abs(dist - r);
    const inside = dist < r;
    const prompt = `${given} P ist ${fmtQty(dist, 'cm')} von M entfernt. Wie weit ist P vom Kreis?`;
    return build(SKILL, 3, {
      key: `rand:${r}:${dist}`,
      ab,
      prompt,
      visual: CIRCLE,
      answer: { kind: 'number', value, unit: 'cm' },
      hints: ['Berechne zuerst den Radius aus dem Durchmesser.', 'Vergleiche den Abstand von P zu M mit dem Radius.'],
      steps: [half, `P liegt ${inside ? 'innerhalb' : 'außerhalb'} des Kreises.`, inside ? `${r} cm − ${dist} cm = ${value} cm` : `${dist} cm − ${r} cm = ${value} cm`, `P ist ${fmtQty(value, 'cm')} vom Kreis entfernt.`],
      bugs: numberBugs([
        { id: 'radius-gleich', match: dist, hint: 'Das ist der Weg bis M. Gesucht ist der Weg bis zum Kreis.' },
        { id: 'radius-gleich', match: Math.abs(2 * r - dist), hint: 'Rechne mit dem Radius, nicht mit dem Durchmesser.' },
      ], value),
      praise: 'Du hast zuerst den Radius bestimmt.',
      srText: toSpeech(`${spokenGiven} P ist ${dist} Zentimeter von M entfernt. Wie weit ist P vom Kreis?`),
      kmk: [...KMK, 'PK.problemloesen'],
    });
  }
  const outside = rng.chance(0.5);
  const right = outside ? r + rng.int(1, 2) : r - rng.int(1, 2);
  const others = outside ? [r, r - 1, r - 2] : [r, r + 1, 2 * r];
  const place = outside ? 'außerhalb' : 'innerhalb';
  const why = 'Vergleiche den Abstand mit dem Radius, nicht mit dem Durchmesser.';
  const prompt = `${given} P liegt ${place} des Kreises. Welcher Abstand von M passt?`;
  return build(SKILL, 3, {
    key: `abstand-wahl:${place}:${r}:${right}`,
    ab,
    prompt,
    visual: CIRCLE,
    answer: makeChoice(rng, { label: fmtQty(right, 'cm') }, others.map((d) => ({ label: fmtQty(d, 'cm'), whyWrong: d === r ? 'Mit diesem Abstand liegt P genau auf dem Kreis.' : why }))),
    hints: ['Berechne zuerst den Radius aus dem Durchmesser.', 'Auf dem Kreis ist der Abstand von M genau ein Radius.'],
    steps: [half, outside ? `Außerhalb ist der Abstand größer als ${r} cm.` : `Innerhalb ist der Abstand kleiner als ${r} cm.`, `Es passt ${fmtQty(right, 'cm')}.`],
    praise: 'Du hast den Durchmesser zuerst halbiert.',
    srText: toSpeech(`${spokenGiven} P liegt ${place} des Kreises. Welcher Abstand von M passt?`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab, ctx: GenContext) => Exercise>> = {
  1: { 1: nameLine, 2: findLine, 3: situation },
  2: { 1: notation, 2: distance, 3: distanceReversed },
  3: { 1: radius, 2: pointAndCircle, 3: circleReasoning },
};

export const grundbegriffeSkill: SkillDef = {
  ...SKILL,
  title: 'Punkt, Strecke, Gerade',
  description: 'Du benennst Strecken, Geraden und Halbgeraden.',
  stufen: {
    1: 'Strecke, Gerade und Halbgerade erkennen',
    2: 'Schreibweise; Abstand eines Punkts von einer Geraden',
    3: 'Kreis: Radius, Durchmesser; Punkte mit gleichem Abstand',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab, ctx);
  },
};
