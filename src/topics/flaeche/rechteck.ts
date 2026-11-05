/**
 * flaeche.rechteck (docs/research.md §6).
 * Stufe 1: rows of Kästchen, then length · width. AB I count on the grid, AB II in cm² or with two lengths, AB III finish a part-filled rectangle.
 * Stufe 2: area in cm² and m², missing side. AB I labelled rectangle, AB II story with larger numbers, AB III a side from the area.
 * Stufe 3: same area with other sides, square from area. AB I square side, AB II a second rectangle, AB III square from a rectangle or counting rectangles.
 */
import { speak } from '../../core/format';
import type { Cell, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { pickPerson } from '../shared';
import { HINT, bug, generator, gridRect, numberAnswer, q, rectCells, rectShape, type Forms, type Item } from './common';

const SKILL = { id: 'flaeche.rechteck', topicId: 'flaeche' } as const;
const KMK = ['GM.umfang-flaeche'];

const REIHEN = 'Zähle die Kästchen in einer Reihe. Wie viele Reihen gibt es?';
const ALLE_REIHEN = 'Jede Reihe hat gleich viele Kästchen. Rechne alle Reihen mit.';
const SIDE_BACK = 'Die Fläche ist Länge · Breite. Rechne rückwärts mit Geteilt.';
const SQUARE_SIDE = 'Beide Seiten vom Quadrat sind gleich lang. Welche Zahl mal sich selbst passt?';

const areaAnswer = (value: number, unit: string) => numberAnswer(value, unit, 'Flächeninhalt:');

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1Count: Forms[1][1] = (rng) => {
  const w = rng.int(3, 6);
  const h = rng.int(2, 6);
  const A = w * h;
  return {
    key: `reihen:${w}x${h}`,
    prompt: 'Wie viele Kästchen hat das Rechteck?',
    visual: gridRect(w, h),
    answer: numberAnswer(A, 'Kästchen'),
    hints: [REIHEN, 'Rechne Reihen · Kästchen in einer Reihe.'],
    steps: [`In einer Reihe sind ${w} Kästchen.`, `Es sind ${h} Reihen.`, `${h} · ${w} = ${A}`, `Das Rechteck hat ${A} Kästchen.`],
    bugs: [
      bug('nur-reihe', w + h, ALLE_REIHEN),
      bug('umfang-flaeche', 2 * w + 2 * h, HINT.umfangFlaeche),
      bug('nur-rand', 2 * w + 2 * h - 4, ALLE_REIHEN),
    ],
    praise: 'Du hast Reihen und Kästchen mal gerechnet.',
    srText: speak(`Ein Rechteck im Gitter, ${w} Kästchen breit und ${h} Kästchen hoch. Wie viele Kästchen hat das Rechteck?`),
  };
};

const s1LengthWidth: Forms[1][2] = (rng) => {
  if (rng.chance(0.5)) {
    const w = rng.int(4, 6);
    const h = rng.int(3, 6);
    const A = w * h;
    return {
      key: `kaestchen-cm2:${w}x${h}`,
      prompt: 'Ein Kästchen ist 1 cm² groß. Wie groß ist der Flächeninhalt?',
      visual: gridRect(w, h),
      answer: areaAnswer(A, 'cm²'),
      hints: ['Jedes Kästchen zählt 1 cm². Wie viele Kästchen sind es?', 'Rechne Reihen · Kästchen in einer Reihe.'],
      steps: [`${h} Reihen mit je ${w} Kästchen: ${h} · ${w} = ${A}`, `Der Flächeninhalt ist ${q(A, 'cm²')}.`],
      bugs: [
        bug('umfang-flaeche', 2 * w + 2 * h, HINT.umfangFlaeche),
        bug('nur-reihe', w + h, ALLE_REIHEN),
      ],
      praise: 'Du hast aus Kästchen Quadratzentimeter gemacht.',
      srText: speak(`Ein Rechteck im Gitter, ${w} Kästchen breit und ${h} Kästchen hoch. Ein Kästchen ist 1 cm² groß. Wie groß ist der Flächeninhalt?`),
    };
  }
  const a = rng.int(4, 12);
  const b = rng.int(2, a - 1);
  const A = a * b;
  return {
    key: `laenge-breite:${a}x${b}`,
    prompt: 'Rechne Länge · Breite. Wie groß ist der Flächeninhalt?',
    visual: rectShape(a, b, 'cm', 2),
    answer: areaAnswer(A, 'cm²'),
    hints: [`Stell dir ${b} Reihen mit je ${a} Quadraten vor.`, 'Jedes Quadrat zählt 1 cm².'],
    steps: [`Länge ${q(a, 'cm')}, Breite ${q(b, 'cm')}`, `${a} · ${b} = ${A}`, `Der Flächeninhalt ist ${q(A, 'cm²')}.`],
    bugs: [
      bug('umfang-flaeche', 2 * a + 2 * b, HINT.umfangFlaeche),
      bug('nur-reihe', a + b, ALLE_REIHEN),
    ],
    praise: 'Du hast Länge und Breite mal gerechnet.',
    srText: speak(`Ein Rechteck, ${q(a, 'cm')} lang und ${q(b, 'cm')} breit. Rechne Länge · Breite. Wie groß ist der Flächeninhalt?`),
  };
};

const s1PartFilled: Forms[1][3] = (rng) => {
  const w = rng.int(4, 8);
  const h = rng.int(3, 6);
  const A = w * h;
  const full: VisualOf<'grid'> = { type: 'grid', width: w, height: h, cells: rectCells(0, 0, w, h), showOutline: true };
  if (rng.chance(0.5)) {
    const cells: Cell[] = [...rectCells(0, 0, w, 1), ...rectCells(0, 1, 1, h - 1)];
    return {
      key: `erste-reihe-spalte:${w}x${h}`,
      prompt: 'Das ganze Gitter soll voll werden. Wie viele Kästchen sind es dann?',
      visual: { type: 'grid', width: w, height: h, cells },
      answer: numberAnswer(A, 'Kästchen'),
      hints: ['Die obere Reihe zeigt die Kästchen pro Reihe.', 'Die linke Spalte zeigt die Anzahl der Reihen.'],
      steps: [{ text: `Eine Reihe hat ${w} Kästchen. Es gibt ${h} Reihen.`, visual: full }, `${h} · ${w} = ${A}`, `Es sind ${A} Kästchen.`],
      bugs: [
        bug('nur-rand', w + h - 1, ALLE_REIHEN),
        bug('nur-reihe', w + h, ALLE_REIHEN),
      ],
      praise: 'Du hast aus Reihe und Spalte das Ganze gerechnet.',
      srText: speak(`Ein Gitter, ${w} Kästchen breit und ${h} Kästchen hoch. Angemalt sind die obere Reihe und die linke Spalte. Das ganze Gitter soll voll werden. Wie viele Kästchen sind es dann?`),
      kmk: [...KMK, 'PK.problemloesen'],
    };
  }
  const filled = rng.int(1, h - 1);
  const missing = w * (h - filled);
  return {
    key: `kaestchen-fehlen:${w}x${h}-${filled}`,
    prompt: 'Das ganze Gitter soll voll werden. Wie viele Kästchen fehlen noch?',
    visual: { type: 'grid', width: w, height: h, cells: rectCells(0, 0, w, filled) },
    answer: numberAnswer(missing, 'Kästchen'),
    hints: ['Wie viele Reihen sind noch leer?', 'Rechne leere Reihen · Kästchen in einer Reihe.'],
    steps: [`Leer sind ${h} − ${filled} = ${h - filled} Reihen.`, `${h - filled} · ${w} = ${missing}`, `Es fehlen ${missing} Kästchen.`],
    bugs: [
      bug('ganzes-rechteck', A, 'Das ist das ganze Gitter. Gefragt sind nur die leeren Kästchen.'),
      bug('nur-reihe', w * filled, 'Das sind die vollen Kästchen. Gefragt sind die leeren.'),
    ],
    praise: 'Du hast nur die leeren Reihen gerechnet.',
    srText: speak(`Ein Gitter, ${w} Kästchen breit und ${h} Kästchen hoch. Die oberen ${filled} Reihen sind voll. Wie viele Kästchen fehlen noch?`),
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const s2Labelled: Forms[2][1] = (rng) => {
  const a = rng.int(11, 25);
  const b = rng.int(3, 9);
  const A = a * b;
  return {
    key: `cm2:${a}x${b}`,
    prompt: 'Rechne Länge · Breite. Wie groß ist der Flächeninhalt?',
    visual: rectShape(a, b, 'cm', 2),
    answer: areaAnswer(A, 'cm²'),
    hints: ['Rechne die beiden Seiten mal.', `Zerlege die große Zahl, wenn das leichter ist.`],
    steps: [`Länge ${q(a, 'cm')}, Breite ${q(b, 'cm')}`, `${a} · ${b} = ${A}`, `Der Flächeninhalt ist ${q(A, 'cm²')}.`],
    bugs: [
      bug('umfang-flaeche', 2 * a + 2 * b, HINT.umfangFlaeche),
      bug('nur-reihe', a + b, 'Rechne mal: Es sind ganze Reihen von Quadraten.'),
    ],
    praise: 'Du hast Länge und Breite mal gerechnet.',
    srText: speak(`Ein Rechteck, ${q(a, 'cm')} lang und ${q(b, 'cm')} breit. Wie groß ist der Flächeninhalt?`),
  };
};

/** Sizes in m that fit the place: lower and upper bound of each side. */
const PLACES = [
  { what: 'Das Klassenzimmer', q: 'Wie groß ist der Boden?', a: [7, 10], b: [6, 8] },
  { what: 'Die Turnhalle', q: 'Wie groß ist der Boden?', a: [15, 32], b: [12, 20] },
  { what: 'Der Schulhof', q: 'Wie groß ist der Schulhof?', a: [20, 45], b: [15, 30] },
  { what: 'Der Sportplatz', q: 'Wie groß ist der Sportplatz?', a: [40, 60], b: [20, 35] },
  { what: 'Der Garten', q: 'Wie groß ist der Garten?', a: [9, 25], b: [6, 15] },
] as const;

const s2Story: Forms[2][2] = (rng) => {
  const p = rng.pick(PLACES);
  const a = rng.int(p.a[0], p.a[1]);
  const b = rng.int(p.b[0], Math.min(p.b[1], a - 1));
  const A = a * b;
  return {
    key: `m2:${p.what}:${a}x${b}`,
    context: `${p.what} ist ${q(a, 'm')} lang und ${q(b, 'm')} breit.`,
    prompt: p.q,
    visual: rectShape(a, b, 'm', 2),
    answer: areaAnswer(A, 'm²'),
    hints: ['Gefragt ist alles innen, also die Fläche.', 'Rechne Länge · Breite. Die Einheit ist m².'],
    steps: [`Länge · Breite: ${a} · ${b} = ${A}`, `Der Flächeninhalt ist ${q(A, 'm²')}.`],
    bugs: [
      bug('umfang-flaeche', 2 * a + 2 * b, HINT.umfangFlaeche),
      bug('nur-reihe', a + b, 'Rechne mal: Es sind ganze Reihen von Quadraten.'),
    ],
    praise: 'Du hast die Fläche in Quadratmetern gerechnet.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

const s2MissingSide: Forms[2][3] = (rng) => {
  const unit = rng.pick(['cm', 'm']);
  const a = rng.int(6, 15);
  const drawn = rng.int(6, 14);
  const b = drawn >= a ? drawn + 1 : drawn;
  const A = a * b;
  return {
    key: `fehlende-seite:${A}:${a}${unit}`,
    prompt: `Ein Rechteck ist ${q(A, `${unit}²`)} groß. Eine Seite ist ${q(a, unit)} lang. Wie lang ist die andere Seite?`,
    // the rectangle is drawn wider than high: the longer side goes on top, known or not
    visual: { type: 'shape', shape: 'rechteck', named: true, sideLabels: a > b ? [q(a, unit), '?', null, null] : ['?', q(a, unit), null, null] },
    answer: numberAnswer(b, unit, 'Andere Seite:'),
    hints: [SIDE_BACK, `Probe: Seite · Seite muss ${q(A, `${unit}²`)} ergeben.`],
    steps: [`Länge · Breite = Fläche, also rechnest du Fläche : Seite.`, `${A} : ${a} = ${b}`, `Probe: ${a} · ${b} = ${A}`, `Die andere Seite ist ${q(b, unit)} lang.`],
    bugs: [
      bug('seite-minus', A - a, SIDE_BACK),
      bug('seite-mal', A * a, SIDE_BACK),
      bug('umfang-flaeche', A / 2 - a, 'Gegeben ist die Fläche, nicht der Umfang. Rechne Fläche : Seite.'),
    ],
    praise: 'Du hast von der Fläche auf die Seite geschlossen.',
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const s3SquareSide: Forms[3][1] = (rng) => {
  const s = rng.int(4, 15);
  const A = s * s;
  const unit = rng.pick(['cm', 'm']);
  return {
    key: `quadrat-aus-flaeche:${s}${unit}`,
    prompt: `Ein Quadrat ist ${q(A, `${unit}²`)} groß. Wie lang ist eine Seite?`,
    answer: numberAnswer(s, unit, 'Eine Seite:'),
    hints: [SQUARE_SIDE, 'Probiere Quadratzahlen aus.'],
    steps: [`Beim Quadrat gilt: Seite · Seite = Fläche.`, `${s} · ${s} = ${A}`, `Eine Seite ist ${q(s, unit)} lang.`],
    bugs: [
      bug('quadrat-durch-vier', A / 4, 'Du teilst wie beim Umfang. Hier ist die Fläche gegeben.'),
      bug('quadrat-halb', A / 2, SQUARE_SIDE),
    ],
    praise: 'Du hast die passende Quadratzahl gefunden.',
  };
};

/** Areas with many Teiler, so a second rectangle exists. */
const RICH_AREAS = [24, 30, 36, 40, 48, 60, 72, 80, 90, 96, 120, 144];

function pairsOf(area: number): [number, number][] {
  const out: [number, number][] = [];
  for (let b = 1; b * b <= area; b++) if (area % b === 0) out.push([area / b, b]);
  return out;
}

const s3SameArea: Forms[3][2] = (rng) => {
  const A = rng.pick(RICH_AREAS);
  const pairs = pairsOf(A).filter(([x, y]) => y >= 2 && x <= 24 && x !== y);
  const [[a, b], [c, d]] = rng.sample(pairs, 2);
  return {
    key: `gleiche-flaeche:${a}x${b}-${c}`,
    context: `Rechteck A ist ${q(a, 'cm')} lang und ${q(b, 'cm')} breit. Rechteck B hat denselben Flächeninhalt und ist ${q(c, 'cm')} lang.`,
    prompt: 'Wie breit ist Rechteck B?',
    visual: rectShape(a, b, 'cm', 2),
    answer: numberAnswer(d, 'cm', 'Breite:'),
    hints: ['Rechne zuerst den Flächeninhalt von Rechteck A aus.', SIDE_BACK],
    steps: [`Rechteck A: ${a} · ${b} = ${A}`, `Rechteck B: ${A} : ${c} = ${d}`, `Rechteck B ist ${q(d, 'cm')} breit.`],
    bugs: [
      bug('gleiche-summe', a + b - c, 'Gleich bleibt die Fläche, nicht die Summe der Seiten.'),
      bug('seite-minus', A - c, SIDE_BACK),
    ],
    praise: 'Du hast zuerst die gemeinsame Fläche gerechnet.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

/** A rectangle with the area of a square of side s. */
function rectangleOfSquare(rng: Rng, s: number): [number, number] {
  const factors = [2, 3, 4].filter((k) => s % k === 0);
  const k = rng.pick(factors);
  return [s * k, s / k];
}

const s3Reason: Forms[3][3] = (rng): Item => {
  if (rng.chance(0.6)) {
    const s = rng.pick([4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20]);
    const [a, b] = rectangleOfSquare(rng, s);
    const A = s * s;
    return {
      key: `quadrat-gleich:${a}x${b}`,
      context: `Ein Rechteck ist ${q(a, 'cm')} lang und ${q(b, 'cm')} breit. Ein Quadrat hat denselben Flächeninhalt.`,
      prompt: 'Wie lang ist eine Seite vom Quadrat?',
      visual: rectShape(a, b, 'cm', 2),
      answer: numberAnswer(s, 'cm', 'Seite vom Quadrat:'),
      hints: ['Rechne zuerst den Flächeninhalt vom Rechteck aus.', SQUARE_SIDE],
      steps: [`Rechteck: ${a} · ${b} = ${A}`, `Quadrat: ${s} · ${s} = ${A}`, `Eine Seite vom Quadrat ist ${q(s, 'cm')} lang.`],
      bugs: [
        bug('gleiche-summe', (a + b) / 2, 'Gleich bleibt die Fläche, nicht die Summe der Seiten.'),
        bug('quadrat-durch-vier', A / 4, 'Du teilst wie beim Umfang. Hier ist die Fläche gegeben.'),
        bug('quadrat-halb', A / 2, SQUARE_SIDE),
      ],
      praise: 'Du hast zur Fläche das passende Quadrat gefunden.',
      kmk: [...KMK, 'PK.problemloesen'],
    };
  }
  const { name } = pickPerson(rng);
  const A = rng.pick([12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 48]);
  const pairs = pairsOf(A);
  const isSquare = pairs.some(([x, y]) => x === y);
  return {
    key: `wie-viele-rechtecke:${A}:${name}`,
    context: `${name} legt ${A} gleiche Quadrate zu einem Rechteck. Beide Seiten sind ganze Zahlen. Ein gedrehtes Rechteck zählt nicht neu.`,
    prompt: 'Wie viele verschiedene Rechtecke gibt es?',
    answer: numberAnswer(pairs.length, 'Rechtecke'),
    hints: ['Starte mit 1 Reihe. Probiere dann 2 Reihen, 3 Reihen und so weiter.', 'Schreib die Paare auf: Reihen · Quadrate in einer Reihe.'],
    steps: [`${pairs.slice(0, 4).map(([x, y]) => `${y} · ${x} = ${A}`).join('; ')}`, ...(pairs.length > 4 ? [`${pairs.slice(4).map(([x, y]) => `${y} · ${x} = ${A}`).join('; ')}`] : []), `Es gibt ${pairs.length} verschiedene Rechtecke.`],
    bugs: [
      bug('gedreht-doppelt', isSquare ? 2 * pairs.length - 1 : 2 * pairs.length, 'Ein gedrehtes Rechteck zählt nicht neu: 2 · 3 und 3 · 2 sind gleich.'),
    ],
    praise: 'Du hast alle Paare der Reihe nach gesucht.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

const FORMS: Forms = {
  1: { 1: s1Count, 2: s1LengthWidth, 3: s1PartFilled },
  2: { 1: s2Labelled, 2: s2Story, 3: s2MissingSide },
  3: { 1: s3SquareSide, 2: s3SameArea, 3: s3Reason },
};

const STUFEN: Record<Stufe, string> = {
  1: 'Kästchen in Reihen, dann Länge · Breite',
  2: 'Fläche in cm² und m², fehlende Seite',
  3: 'Gleiche Fläche mit anderen Seiten, Quadrat aus der Fläche',
};

export const rechteckSkill: SkillDef = {
  ...SKILL,
  title: 'Flächeninhalt vom Rechteck',
  description: 'Du rechnest aus, wie viele Quadrate in das Rechteck passen.',
  stufen: STUFEN,
  kmk: KMK,
  generate: generator(SKILL, KMK, FORMS),
};
