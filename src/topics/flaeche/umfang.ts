/**
 * flaeche.umfang (docs/research.md §6). The formulas stand in words: the voice reads a lone 'a' as the unit Ar.
 * Stufe 1: rectangle and square, add all sides. AB I all sides labelled, AB II on the grid or with two labels, AB III find the slip in a sum.
 * Stufe 2: formula, labelled polygons, side from Umfang. AB I formula, AB II polygons with the sides to find, AB III a side from the Umfang.
 * Stufe 3: L-form, fence story, same Umfang with another shape. AB I all sides labelled, AB II missing sides or a fence with a gate, AB III same Umfang.
 */
import { speak } from '../../core/format';
import type { ShapeKind, SkillDef, Stufe, VisualOf } from '../../core/types';
import { pickPerson } from '../shared';
import { HINT, bug, generator, gridRect, lArea, lPerimeter, lShape, lSides, numberAnswer, pickL, q, rectShape, type Forms, type Item } from './common';

const SKILL = { id: 'flaeche.umfang', topicId: 'flaeche' } as const;
const KMK = ['GM.umfang-flaeche'];

const answer = (value: number, unit: string) => numberAnswer(value, unit, 'Umfang:');
const sumOf = (sides: number[], unit: string) => sides.map((s) => q(s, unit)).join(' + ');

/** A side missing from a sum of all sides. */
const SIDE_FORGOTTEN = 'Prüfe: Hast du jede Seite einmal mitgerechnet?';
const HALVE = 'Beide Seiten zusammen sind der halbe Umfang. Rechne zuerst Umfang : 2.';

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1AllSides = (rng: Parameters<Forms[1][1]>[0]): Item => {
  const a = rng.int(3, 12);
  const b = rng.chance(0.25) ? a : rng.int(2, Math.max(2, a - 1));
  const U = 2 * a + 2 * b;
  const square = a === b;
  return {
    key: `alle:${a}x${b}`,
    prompt: 'Rechne alle vier Seiten zusammen. Wie groß ist der Umfang?',
    visual: rectShape(a, b, 'cm'),
    answer: answer(U, 'cm'),
    hints: ['Geh einmal um die Figur herum.', square ? 'Alle vier Seiten sind gleich lang.' : 'Zwei Seiten sind lang und zwei Seiten sind kurz.'],
    steps: [
      `Die vier Seiten sind ${sumOf([a, b, a, b], 'cm').replace(/ \+ /g, ', ')}.`,
      `${sumOf([a, b, a, b], 'cm')} = ${q(U, 'cm')}`,
      `Der Umfang ist ${q(U, 'cm')}.`,
    ],
    bugs: [
      bug('umfang-halb', a + b, HINT.umfangHalb),
      bug('umfang-flaeche', a * b, HINT.umfangFlaeche),
      bug('seite-vergessen', 2 * a + b, SIDE_FORGOTTEN),
    ],
    praise: 'Du hast alle vier Seiten addiert.',
    srText: speak(`Die Seiten sind ${sumOf([a, b, a, b], 'cm').replace(/ \+ /g, ', ')}. Wie groß ist der Umfang?`),
  };
};

const s1Grid: Forms[1][2] = (rng) => {
  if (rng.chance(0.5)) {
    const w = rng.int(2, 6);
    const h = rng.int(2, 6);
    const U = 2 * w + 2 * h;
    return {
      key: `gitter:${w}x${h}`,
      prompt: 'Ein Kästchen ist 1 cm lang. Wie groß ist der Umfang?',
      visual: gridRect(w, h),
      answer: answer(U, 'cm'),
      hints: ['Zähle die Kästchenlängen am Rand, nicht die Kästchen.', 'Zähle oben, rechts, unten und links.'],
      steps: [
        `Oben und unten sind es je ${q(w, 'cm')}.`,
        `Rechts und links sind es je ${q(h, 'cm')}.`,
        `${sumOf([w, h, w, h], 'cm')} = ${q(U, 'cm')}`,
        `Der Umfang ist ${q(U, 'cm')}.`,
      ],
      bugs: [
        bug('umfang-flaeche', w * h, HINT.umfangFlaeche),
        bug('rand-kaestchen', 2 * w + 2 * h - 4, 'Zähle die Längen am Rand. Eine Ecke hat zwei davon.'),
        bug('umfang-halb', w + h, HINT.umfangHalb),
      ],
      praise: 'Du hast die Längen am Rand gezählt.',
      srText: speak(`Ein Rechteck im Kästchengitter, ${w} Kästchen breit und ${h} Kästchen hoch. Ein Kästchen ist 1 cm lang. Wie groß ist der Umfang?`),
    };
  }
  const a = rng.int(6, 15);
  const b = rng.chance(0.3) ? a : rng.int(3, a - 1);
  const U = 2 * a + 2 * b;
  const square = a === b;
  return {
    key: `zwei-angaben:${a}x${b}`,
    prompt: square ? 'Das ist ein Quadrat. Wie groß ist der Umfang?' : 'Das ist ein Rechteck. Wie groß ist der Umfang?',
    visual: rectShape(a, b, 'cm', square ? 1 : 2),
    answer: answer(U, 'cm'),
    hints: [square ? 'Beim Quadrat sind alle vier Seiten gleich lang.' : 'Zwei Seiten gegenüber sind immer gleich lang.', 'Rechne alle vier Seiten zusammen.'],
    steps: [
      square ? `Alle vier Seiten sind ${q(a, 'cm')} lang.` : `Zwei Seiten sind ${q(a, 'cm')} lang und zwei Seiten ${q(b, 'cm')}.`,
      `${sumOf([a, b, a, b], 'cm')} = ${q(U, 'cm')}`,
      `Der Umfang ist ${q(U, 'cm')}.`,
    ],
    bugs: [
      bug('umfang-halb', a + b, HINT.umfangHalb),
      bug('nur-eine-seite', a, HINT.umfangHalb),
      bug('umfang-flaeche', a * b, HINT.umfangFlaeche),
    ],
    praise: 'Du hast die fehlenden Seiten mitgedacht.',
    srText: speak(`${square ? `Ein Quadrat mit der Seite ${q(a, 'cm')}` : `Ein Rechteck mit den Seiten ${q(a, 'cm')} und ${q(b, 'cm')}`}. Wie groß ist der Umfang?`),
  };
};

const s1Slip: Forms[1][3] = (rng) => {
  const { name } = pickPerson(rng);
  const a = rng.int(5, 18);
  const b = rng.chance(0.3) ? a : rng.int(3, a - 1);
  const U = 2 * a + 2 * b;
  const square = a === b;
  return {
    key: `rechnung-pruefen:${a}x${b}:${name}`,
    context: `${name} rechnet: ${q(a, 'cm')} + ${q(b, 'cm')} = ${q(a + b, 'cm')}.`,
    prompt: 'Wie groß ist der Umfang wirklich?',
    visual: rectShape(a, b, 'cm', square ? 1 : 2),
    answer: answer(U, 'cm'),
    hints: [`${name} hat nur zwei Seiten gerechnet.`, 'Die Figur hat vier Seiten. Geh einmal ganz herum.'],
    steps: [
      `${name} hat zwei Seiten addiert. Das ist der halbe Weg.`,
      `${sumOf([a, b, a, b], 'cm')} = ${q(U, 'cm')}`,
      `Der Umfang ist ${q(U, 'cm')}.`,
    ],
    bugs: [
      bug('umfang-halb', a + b, HINT.umfangHalb),
      bug('umfang-flaeche', a * b, HINT.umfangFlaeche),
    ],
    praise: 'Du hast die Rechnung geprüft und ergänzt.',
    srText: speak(`${square ? `Ein Quadrat mit der Seite ${q(a, 'cm')}` : `Ein Rechteck mit den Seiten ${q(a, 'cm')} und ${q(b, 'cm')}`}. ${name} rechnet: ${q(a, 'cm')} + ${q(b, 'cm')} = ${q(a + b, 'cm')}. Wie groß ist der Umfang wirklich?`),
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const s2Formula: Forms[2][1] = (rng) => {
  const unit = rng.pick(['cm', 'm']);
  if (rng.chance(0.3)) {
    const a = rng.int(13, 45);
    const U = 4 * a;
    return {
      key: `formel-quadrat:${a}${unit}`,
      prompt: 'Nutze die Formel U = 4 · Seite. Wie groß ist der Umfang?',
      visual: rectShape(a, a, unit, 1),
      answer: answer(U, unit),
      hints: ['Beim Quadrat sind alle vier Seiten gleich lang.', 'Setze die Seite in die Formel ein.'],
      steps: [`Seite = ${q(a, unit)}`, `4 · ${q(a, unit)} = ${q(U, unit)}`, `Der Umfang ist ${q(U, unit)}.`],
      bugs: [
        bug('umfang-halb', 2 * a, HINT.umfangHalb),
        bug('umfang-flaeche', a * a, HINT.umfangFlaeche),
        bug('nur-eine-seite', a, HINT.umfangHalb),
      ],
      praise: 'Du hast die Seite richtig in die Formel eingesetzt.',
      srText: speak(`Ein Quadrat mit der Seite ${q(a, unit)}. Nutze die Formel U = 4 · Seite. Wie groß ist der Umfang?`),
    };
  }
  const a = rng.int(14, 48);
  const b = rng.int(5, a - 2);
  const U = 2 * a + 2 * b;
  return {
    key: `formel:${a}x${b}${unit}`,
    prompt: 'Nutze die Formel U = 2 · Länge + 2 · Breite. Wie groß ist der Umfang?',
    visual: rectShape(a, b, unit, 2),
    answer: answer(U, unit),
    hints: ['Setze Länge und Breite in die Formel ein.', 'Rechne zuerst die Malaufgaben, dann plus.'],
    steps: [
      `Länge = ${q(a, unit)} und Breite = ${q(b, unit)}`,
      `2 · ${q(a, unit)} + 2 · ${q(b, unit)} = ${q(2 * a, unit)} + ${q(2 * b, unit)} = ${q(U, unit)}`,
      `Der Umfang ist ${q(U, unit)}.`,
    ],
    bugs: [
      bug('umfang-halb', a + b, HINT.umfangHalb),
      bug('umfang-flaeche', a * b, HINT.umfangFlaeche),
      bug('seite-vergessen', 2 * a + b, SIDE_FORGOTTEN),
    ],
    praise: 'Du hast Länge und Breite richtig in die Formel eingesetzt.',
    srText: speak(`Ein Rechteck mit den Seiten ${q(a, unit)} und ${q(b, unit)}. Nutze die Formel U = 2 · Länge + 2 · Breite. Wie groß ist der Umfang?`),
  };
};

interface Polygon {
  shape: ShapeKind;
  name: string;
  /** All sides, clockwise from the top side as the shape visual draws them. */
  sides: number[];
  /** How many of them carry a label: the others follow from the figure. */
  labelled: boolean[];
  rule?: string;
  /** The name does not make the sides equal, as it does for a Raute: the task says so. */
  equalSides?: boolean;
}

/** The sides fit the drawing: the longest label sits on the longest side (src/ui/visuals/ShapeVisual.tsx). */
function pickPolygon(rng: Parameters<Forms[2][2]>[0]): Polygon {
  const kind = rng.pick(['dreieck', 'trapez', 'drachen', 'parallelogramm', 'raute', 'sechseck'] as const);
  if (kind === 'dreieck') {
    const x = rng.int(7, 19);
    const z = x + rng.int(2, 9);
    const y = z + rng.int(2, x - 2);
    return { shape: 'dreieck', name: 'Dreieck', sides: [x, y, z], labelled: [true, true, true] };
  }
  if (kind === 'trapez') {
    const top = rng.int(8, 18);
    const bottom = top + 2 * rng.int(2, 9);
    const slant = (bottom - top) / 2 + rng.int(3, 9);
    return { shape: 'trapez', name: 'Trapez', sides: [top, slant, bottom, slant], labelled: [true, true, true, true] };
  }
  if (kind === 'drachen') {
    const short = rng.int(6, 17);
    const long = short + rng.int(4, 15);
    return { shape: 'drachen', name: 'Drachenviereck', sides: [short, long, long, short], labelled: [true, true, false, false], rule: 'Je zwei benachbarte Seiten sind gleich lang.' };
  }
  if (kind === 'parallelogramm') {
    const long = rng.int(16, 38);
    const slant = rng.int(7, long - 5);
    return { shape: 'parallelogramm', name: 'Parallelogramm', sides: [long, slant, long, slant], labelled: [true, true, false, false], rule: 'Zwei Seiten gegenüber sind immer gleich lang.' };
  }
  if (kind === 'raute') {
    const s = rng.int(12, 38);
    return { shape: 'raute', name: 'Raute', sides: [s, s, s, s], labelled: [true, false, false, false], rule: 'Alle vier Seiten sind gleich lang.' };
  }
  const s = rng.int(7, 25);
  return { shape: 'sechseck', name: 'Sechseck', sides: [s, s, s, s, s, s], labelled: [true, false, false, false, false, false], rule: 'Alle sechs Seiten sind gleich lang.', equalSides: true };
}

const s2Polygon: Forms[2][2] = (rng) => {
  const p = pickPolygon(rng);
  const U = p.sides.reduce((x, y) => x + y, 0);
  const unit = 'cm';
  const missing = p.labelled.includes(false);
  const article = p.shape === 'raute' ? 'Die' : 'Das';
  const shown = p.sides.filter((_, i) => p.labelled[i]);
  return {
    key: `vieleck:${p.shape}:${p.sides.join('-')}`,
    prompt: `${article} ${p.name} hat ${p.sides.length} ${p.equalSides ? 'gleich lange ' : ''}Seiten. Wie groß ist der Umfang?`,
    visual: { type: 'shape', shape: p.shape, named: true, sideLabels: p.sides.map((s, i) => (p.labelled[i] ? q(s, unit) : null)) } satisfies VisualOf<'shape'>,
    answer: answer(U, unit),
    hints: [p.equalSides ? 'Eine Seite kennst du. Die anderen Seiten sind genauso lang.' : p.rule ?? 'Der Umfang ist die Summe aller Seiten.', 'Geh einmal ganz herum und rechne jede Seite mit.'],
    steps: [
      ...(p.rule ? [p.rule] : []),
      `${sumOf(p.sides, unit)} = ${q(U, unit)}`,
      `Der Umfang ist ${q(U, unit)}.`,
    ],
    bugs: [
      bug('nur-beschriftete', shown.reduce((x, y) => x + y, 0), missing ? 'Auch Seiten ohne Zahl gehören zum Umfang.' : SIDE_FORGOTTEN),
      bug('seite-vergessen', U - p.sides[p.sides.length - 1], SIDE_FORGOTTEN),
    ],
    praise: missing ? 'Du hast auch die Seiten ohne Zahl mitgerechnet.' : 'Du hast jede Seite genau einmal gerechnet.',
    srText: speak(`${article} ${p.name} hat ${p.sides.length} ${p.equalSides ? 'gleich lange ' : ''}Seiten: ${shown.map((s) => q(s, unit)).join(', ')}${missing ? ` und weitere Seiten. ${p.rule}` : '.'} Wie groß ist der Umfang?`),
  };
};

const s2SideFromPerimeter: Forms[2][3] = (rng) => {
  const unit = rng.pick(['cm', 'm']);
  if (rng.chance(0.35)) {
    const s = rng.int(11, 39);
    const U = 4 * s;
    return {
      key: `quadrat-aus-umfang:${s}${unit}`,
      prompt: `Ein Quadrat hat den Umfang ${q(U, unit)}. Wie lang ist eine Seite?`,
      answer: numberAnswer(s, unit, 'Eine Seite:'),
      hints: ['Das Quadrat hat vier gleich lange Seiten.', 'Teile den Umfang gleichmäßig auf alle Seiten auf.'],
      steps: [`Der Umfang verteilt sich auf 4 gleich lange Seiten.`, `${q(U, unit)} : 4 = ${q(s, unit)}`, `Eine Seite ist ${q(s, unit)} lang.`],
      bugs: [
        bug('quadrat-halb', U / 2, 'Das Quadrat hat vier Seiten. Teile durch 4.'),
      ],
      praise: 'Du hast den Umfang auf vier Seiten verteilt.',
    };
  }
  const a = rng.int(12, 40);
  const b = rng.int(5, a - 1);
  const U = 2 * a + 2 * b;
  return {
    key: `seite-aus-umfang:${a}+${b}${unit}`,
    prompt: `Ein Rechteck hat den Umfang ${q(U, unit)}. Eine Seite ist ${q(a, unit)} lang. Wie lang ist die andere Seite?`,
    visual: { type: 'shape', shape: 'rechteck', named: true, sideLabels: [q(a, unit), '?', null, null] },
    answer: numberAnswer(b, unit, 'Andere Seite:'),
    hints: ['Zwei Seiten kommen im Umfang doppelt vor.', HALVE],
    steps: [
      `Zwei verschiedene Seiten sind der halbe Umfang: ${q(U, unit)} : 2 = ${q(a + b, unit)}.`,
      `${q(a + b, unit)} − ${q(a, unit)} = ${q(b, unit)}`,
      `Die andere Seite ist ${q(b, unit)} lang.`,
    ],
    bugs: [
      bug('seite-nicht-halbiert', U - a, HALVE),
      bug('seite-zwei-abziehen', U - 2 * a, 'Das ist die Summe von zwei Seiten. Teile noch durch 2.'),
      bug('quadrat-halb', U / 4, 'Das Rechteck hat verschiedene Seiten. Rechne zuerst Umfang : 2.'),
    ],
    praise: 'Du hast rückwärts vom Umfang zur Seite gerechnet.',
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const s3LAll: Forms[3][1] = (rng) => {
  const l = pickL(rng, [8, 24], [6, 20]);
  const sides = lSides(l);
  const U = lPerimeter(l);
  const unit = rng.pick(['cm', 'm']);
  return {
    key: `l-form:${l.w}x${l.h}-${l.cutW}x${l.cutH}${unit}`,
    prompt: 'Die Figur hat sechs Seiten. Wie groß ist der Umfang?',
    visual: lShape(l, unit),
    answer: answer(U, unit),
    hints: ['Starte an einer Ecke und geh einmal ganz herum.', 'Rechne alle sechs Seiten zusammen.'],
    steps: [`${sumOf(sides.slice(0, 3), unit)} = ${q(sides[0] + sides[1] + sides[2], unit)}`, `${sumOf(sides.slice(3), unit)} = ${q(sides[3] + sides[4] + sides[5], unit)}`, `Der Umfang ist ${q(U, unit)}.`],
    bugs: [
      bug('umfang-flaeche', lArea(l), HINT.umfangFlaeche),
      bug('seite-vergessen', U - l.cutW - l.cutH, 'Auch die beiden Seiten an der Ecke gehören zum Umfang.'),
      bug('umfang-halb', U / 2, 'Geh einmal ganz herum: alle sechs Seiten.'),
    ],
    praise: 'Du bist einmal ganz um die L-Form gegangen.',
    srText: speak(`Eine L-Form mit den Seiten ${sides.map((s) => q(s, unit)).join(', ')}. Wie groß ist der Umfang?`),
  };
};

/** Places that get a fence, with sizes that fit them. A gate is a few metres at most. */
const FENCED = [
  { to: 'einen Garten', it: 'der Garten', a: [14, 32], b: [8, 22], gate: [1, 3] },
  { to: 'eine Wiese', it: 'die Wiese', a: [25, 45], b: [15, 35], gate: [2, 4] },
  { to: 'eine Koppel', it: 'die Koppel', a: [30, 45], b: [20, 40], gate: [3, 5] },
] as const;

const s3MissingOrFence: Forms[3][2] = (rng) => {
  if (rng.chance(0.5)) {
    const l = pickL(rng, [10, 26], [8, 22]);
    const sides = lSides(l);
    const U = lPerimeter(l);
    return {
      key: `l-form-fehlt:${l.w}x${l.h}-${l.cutW}x${l.cutH}`,
      prompt: 'Zwei Seiten haben keine Zahl. Wie groß ist der Umfang?',
      visual: lShape(l, 'cm', [1, 2, 4, 5]),
      answer: answer(U, 'cm'),
      hints: ['Rechne zuerst die beiden Seiten ohne Zahl aus.', 'Vergleiche die kurzen Seiten mit den langen Seiten.'],
      steps: [
        `Seite oben: ${q(l.w, 'cm')} − ${q(l.cutW, 'cm')} = ${q(sides[0], 'cm')}`,
        `Seite rechts: ${q(l.h, 'cm')} − ${q(l.cutH, 'cm')} = ${q(sides[3], 'cm')}`,
        `${sides.map((s) => q(s, 'cm')).join(' + ')} = ${q(U, 'cm')}`,
        `Der Umfang ist ${q(U, 'cm')}.`,
      ],
      bugs: [
        bug('nur-beschriftete', l.w + l.h + l.cutW + l.cutH, 'Auch Seiten ohne Zahl gehören zum Umfang.'),
        bug('umfang-flaeche', lArea(l), HINT.umfangFlaeche),
      ],
      praise: 'Du hast die fehlenden Seiten zuerst ausgerechnet.',
      srText: speak(`Eine L-Form, ${q(l.w, 'cm')} breit und ${q(l.h, 'cm')} hoch. An der Ecke fehlen ${q(l.cutW, 'cm')} und ${q(l.cutH, 'cm')}. Wie groß ist der Umfang?`),
    };
  }
  const { name } = pickPerson(rng);
  const place = rng.pick(FENCED);
  const a = rng.int(place.a[0], place.a[1]);
  const b = rng.int(place.b[0], Math.min(place.b[1], a - 2));
  const gate = rng.int(place.gate[0], place.gate[1]);
  const U = 2 * a + 2 * b;
  const fence = U - gate;
  const It = place.it[0].toUpperCase() + place.it.slice(1);
  return {
    key: `zaun:${a}x${b}-${gate}`,
    context: `${name} baut einen Zaun um ${place.to}. ${It} ist ${q(a, 'm')} lang und ${q(b, 'm')} breit. Das Tor bleibt ohne Zaun und ist ${q(gate, 'm')} breit.`,
    prompt: `Wie viel Meter Zaun braucht ${place.it}?`,
    visual: rectShape(a, b, 'm', 2),
    answer: { ...numberAnswer(fence, 'm'), before: 'Zaun:' },
    hints: ['Rechne zuerst den ganzen Umfang aus.', 'Das Tor braucht keinen Zaun. Zieh die Breite vom Tor ab.'],
    steps: [
      `2 · ${q(a, 'm')} + 2 · ${q(b, 'm')} = ${q(U, 'm')}`,
      `${q(U, 'm')} − ${q(gate, 'm')} = ${q(fence, 'm')}`,
      `${It} braucht ${q(fence, 'm')} Zaun.`,
    ],
    bugs: [
      bug('tor-vergessen', U, 'Das Tor braucht keinen Zaun. Zieh die Breite vom Tor ab.'),
      bug('tor-doppelt', U - 2 * gate, 'Es gibt nur ein Tor. Zieh die Breite einmal ab.'),
      bug('umfang-halb', a + b - gate, HINT.umfangHalb),
      bug('umfang-flaeche', a * b, HINT.umfangFlaeche),
    ],
    praise: 'Du hast den Umfang gerechnet und das Tor abgezogen.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

const s3SameUmfang: Forms[3][3] = (rng) => {
  if (rng.chance(0.5)) {
    const s = rng.int(9, 30);
    const d = rng.int(1, Math.min(s - 3, 8));
    const a = s + d;
    const b = s - d;
    const U = 4 * s;
    return {
      key: `gleicher-umfang-quadrat:${a}x${b}`,
      prompt: `Ein Rechteck ist ${q(a, 'cm')} lang und ${q(b, 'cm')} breit. Ein Quadrat hat denselben Umfang. Wie lang ist eine Seite vom Quadrat?`,
      visual: rectShape(a, b, 'cm', 2),
      answer: numberAnswer(s, 'cm', 'Seite vom Quadrat:'),
      hints: ['Rechne zuerst den Umfang vom Rechteck aus.', 'Teile den Umfang auf die vier Seiten vom Quadrat auf.'],
      steps: [
        `Umfang vom Rechteck: 2 · ${q(a, 'cm')} + 2 · ${q(b, 'cm')} = ${q(U, 'cm')}`,
        `${q(U, 'cm')} : 4 = ${q(s, 'cm')}`,
        `Eine Seite vom Quadrat ist ${q(s, 'cm')} lang.`,
      ],
      bugs: [
        bug('umfang-halb', U, 'Das ist der Umfang. Das Quadrat hat vier gleich lange Seiten.'),
        bug('quadrat-halb', U / 2, 'Das Quadrat hat vier Seiten. Teile durch 4.'),
        bug('umfang-flaeche', a * b, HINT.umfangFlaeche),
      ],
      praise: 'Du hast den gleichen Umfang auf ein Quadrat übertragen.',
      kmk: [...KMK, 'PK.problemloesen'],
    };
  }
  const half = rng.int(18, 40);
  const a = rng.int(half - 7, half - 3);
  const b = half - a;
  const c = rng.pick([a - 2, a - 1, a + 1, a + 2].filter((x) => x !== b && x > half / 2));
  const d = half - c;
  const U = 2 * half;
  return {
    key: `gleicher-umfang:${a}x${b}-${c}`,
    context: `Rechteck A ist ${q(a, 'cm')} lang und ${q(b, 'cm')} breit. Rechteck B hat denselben Umfang und ist ${q(c, 'cm')} lang.`,
    prompt: 'Wie breit ist Rechteck B?',
    visual: rectShape(a, b, 'cm', 2),
    answer: numberAnswer(d, 'cm', 'Breite:'),
    hints: ['Rechne zuerst den Umfang von Rechteck A aus.', HALVE],
    steps: [
      `Umfang von Rechteck A: 2 · ${q(a, 'cm')} + 2 · ${q(b, 'cm')} = ${q(U, 'cm')}`,
      `Halber Umfang: ${q(U, 'cm')} : 2 = ${q(half, 'cm')}`,
      `${q(half, 'cm')} − ${q(c, 'cm')} = ${q(d, 'cm')}`,
      `Rechteck B ist ${q(d, 'cm')} breit.`,
    ],
    bugs: [
      bug('seite-nicht-halbiert', U - c, HALVE),
      bug('seite-zwei-abziehen', U - 2 * c, 'Das ist die Summe von zwei Seiten. Teile noch durch 2.'),
      bug('umfang-flaeche', (a * b) / c, 'Gleich ist hier der Umfang, nicht die Fläche.'),
    ],
    praise: 'Du hast denselben Umfang auf ein neues Rechteck übertragen.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

const FORMS: Forms = {
  1: { 1: s1AllSides, 2: s1Grid, 3: s1Slip },
  2: { 1: s2Formula, 2: s2Polygon, 3: s2SideFromPerimeter },
  3: { 1: s3LAll, 2: s3MissingOrFence, 3: s3SameUmfang },
};

const STUFEN: Record<Stufe, string> = {
  1: 'Rechteck und Quadrat: alle Seiten addieren',
  2: 'Formel, Vielecke mit Zahlen, Seite aus dem Umfang',
  3: 'L-Form, Zaun, gleicher Umfang bei anderer Form',
};

export const umfangSkill: SkillDef = {
  ...SKILL,
  title: 'Umfang',
  description: 'Du rechnest den Weg einmal außen herum aus.',
  stufen: STUFEN,
  kmk: KMK,
  generate: generator(SKILL, KMK, FORMS),
};

