/**
 * Scheitel- und Nebenwinkel (docs/research.md §6). Stufe 1 names them at two crossing lines, Stufe 2 computes a Nebenwinkel, Stufe 3 finds all four angles
 * and works with two crossings. The `lines` visual has no angle labels, so each angle is named by a labelled point inside it, with dot and letter clear of the lines.
 */
import { fmtAngle, toSpeech } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, GridPoint, MultiField, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, multiBugs, numberBugs, targetAb } from '../shared';
import { fitLabels, labelledChoice, offsetThrough, spotInAngle } from './helpers';

const SKILL = { id: 'geometrie.scheitel', topicId: 'geometrie' } as const;
const KMK = ['RF.winkelarten'];

const NAMES = ['α', 'β', 'γ', 'δ'] as const;
type Name = (typeof NAMES)[number];
const opposite = (i: number) => (i + 2) % 4;
const WHY_NEBEN = 'Nebenwinkel ergänzen sich zu 180°. Gleich groß sind nur Scheitelwinkel.';
const WHY_NEBEN_RIGHT = 'Nebenwinkel ergeben zusammen einen gestreckten Winkel, keinen rechten.';
const WHY_NEBEN_FULL = 'Nebenwinkel ergeben zusammen 180°, nicht 360°.';
const ANGLES = [40, 50, 60, 70, 80, 100, 110, 120, 130, 140];
const TILTS = [0, 10, 20, 30, 160, 170];

/** Two lines through the centre with the angles α, β, γ, δ counterclockwise; α has the given size, γ lies opposite. */
function crossing(tilt: number, alpha: number): VisualOf<'lines'> {
  const middles = [tilt + alpha / 2, tilt + alpha + (180 - alpha) / 2, tilt + 180 + alpha / 2, tilt + 180 + alpha + (180 - alpha) / 2];
  const lines = [{ angle: tilt, offset: 0 }, { angle: tilt + alpha, offset: 0 }];
  const points: GridPoint[] = middles.map((d, i) => ({ ...spotInAngle(lines, 0, 0, d), label: NAMES[i] }));
  return { type: 'lines', lines, points };
}

const CROSS_TEXT = 'Zwei Geraden kreuzen sich. Die Winkel α, β, γ und δ liegen der Reihe nach um den Punkt.';

/** Stufe 1, AB I: the Scheitelwinkel of an angle. */
function nameOpposite(rng: Rng, ab: Ab): Exercise {
  const alpha = rng.pick(ANGLES);
  const tilt = rng.pick(TILTS);
  const i = rng.int(0, 3);
  const others = NAMES.filter((_, k) => k !== i);
  const right = NAMES[opposite(i)];
  const wrongs: ChoiceOption[] = others.filter((n) => n !== right).map((label) => ({ label, whyWrong: `${label} liegt neben ${NAMES[i]}. Das ist ein Nebenwinkel.` }));
  const prompt = `Welcher Winkel ist der Scheitelwinkel von ${NAMES[i]}?`;
  return build(SKILL, 1, {
    key: `scheitel:${alpha}:${tilt}:${i}`,
    ab,
    prompt,
    visual: crossing(tilt, alpha),
    answer: labelledChoice(rng, { label: right }, wrongs, [...others]),
    hints: ['Scheitelwinkel liegen sich genau gegenüber.', 'Geh von dem Winkel einmal über die Kreuzung hinweg.'],
    steps: ['Scheitelwinkel liegen sich an der Kreuzung gegenüber.', `Gegenüber von ${NAMES[i]} liegt ${right}.`, `${right} ist der Scheitelwinkel von ${NAMES[i]}.`],
    praise: rng.pick(['Du hast über die Kreuzung hinweg geschaut.', 'Du hast den Winkel gegenüber gefunden.']),
    srText: toSpeech(`${CROSS_TEXT} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB II: which pair are Nebenwinkel? */
function namePair(rng: Rng, ab: Ab): Exercise {
  const alpha = rng.pick(ANGLES);
  const tilt = rng.pick(TILTS);
  const i = rng.int(0, 3);
  const pair = (a: Name, b: Name) => (NAMES.indexOf(a) < NAMES.indexOf(b) ? `${a} und ${b}` : `${b} und ${a}`);
  const right = pair(NAMES[i], NAMES[(i + 1) % 4]);
  const why = 'Diese Winkel liegen sich gegenüber. Das sind Scheitelwinkel.';
  return build(SKILL, 1, {
    key: `paar:${alpha}:${tilt}:${i}`,
    ab,
    prompt: 'Welche zwei Winkel sind Nebenwinkel?',
    visual: crossing(tilt, alpha),
    answer: makeChoice(rng, { label: right }, [{ label: 'α und γ', whyWrong: why }, { label: 'β und δ', whyWrong: why }]),
    hints: ['Nebenwinkel liegen direkt nebeneinander.', 'Nebenwinkel haben einen Schenkel gemeinsam.'],
    steps: ['Nebenwinkel liegen direkt nebeneinander.', `${right} haben einen Schenkel gemeinsam.`, `${right} sind Nebenwinkel.`],
    praise: 'Du hast den gemeinsamen Schenkel gesucht.',
    srText: toSpeech(`${CROSS_TEXT} Welche zwei Winkel sind Nebenwinkel?`),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: reasoning. Which angle is as large as this one? */
function sameSize(rng: Rng, ab: Ab): Exercise {
  const alpha = rng.pick(ANGLES);
  const tilt = rng.pick(TILTS);
  const i = rng.int(0, 3);
  const others = NAMES.filter((_, k) => k !== i);
  const right = NAMES[opposite(i)];
  const wrongs: ChoiceOption[] = others.filter((n) => n !== right).map((label) => ({ label, whyWrong: `${label} und ${NAMES[i]} ergeben zusammen einen gestreckten Winkel.` }));
  const prompt = `Welcher Winkel ist genauso groß wie ${NAMES[i]}?`;
  return build(SKILL, 1, {
    key: `gleich:${alpha}:${tilt}:${i}`,
    ab,
    prompt,
    visual: crossing(tilt, alpha),
    answer: labelledChoice(rng, { label: right }, wrongs, [...others]),
    hints: ['Dreh das Bild im Kopf um eine halbe Drehung.', 'Scheitelwinkel sind gleich groß.'],
    steps: ['Scheitelwinkel sind gleich groß.', `${right} liegt ${NAMES[i]} gegenüber.`, `${right} ist genauso groß wie ${NAMES[i]}.`],
    praise: 'Du hast die halbe Drehung im Kopf gemacht.',
    srText: toSpeech(`${CROSS_TEXT} ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function nebenBugs(given: number, value: number) {
  return numberBugs([
    { id: 'neben-gleich', match: given, hint: WHY_NEBEN },
    given < 90 && { id: 'neben-rechter', match: 90 - given, hint: WHY_NEBEN_RIGHT },
    { id: 'neben-voll', match: 360 - given, hint: WHY_NEBEN_FULL },
  ], value);
}

/** Stufe 2, AB I and II: compute a Nebenwinkel; AB II with any whole degree and any named pair. */
function computeNeben(rng: Rng, ab: Ab): Exercise {
  const v = ab === 1 ? rng.pick([35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145]) : rng.pick([31, 37, 42, 48, 53, 59, 64, 71, 76, 83, 97, 104, 112, 118, 123, 129, 136, 141, 147]);
  const i = ab === 1 ? 0 : rng.int(0, 3);
  const j = ab === 1 ? 1 : (i + rng.pick([1, 3])) % 4;
  const tilt = rng.pick(TILTS);
  const alpha = i % 2 === 0 ? v : 180 - v;
  const value = 180 - v;
  const prompt = `${NAMES[i]} misst ${fmtAngle(v)}. Wie groß ist der Nebenwinkel ${NAMES[j]}?`;
  return build(SKILL, 2, {
    key: `neben:${v}:${i}.${j}:${tilt}`,
    ab,
    prompt,
    visual: crossing(tilt, alpha),
    answer: { kind: 'number', value, unit: '°' },
    hints: ['Nebenwinkel ergeben zusammen einen gestreckten Winkel.', 'Ein gestreckter Winkel misst 180°.'],
    steps: ['Nebenwinkel ergeben zusammen 180°.', `180° − ${fmtAngle(v)} = ${fmtAngle(value)}`, `${NAMES[j]} misst ${fmtAngle(value)}.`],
    bugs: nebenBugs(v, value),
    praise: rng.pick(['Du hast von 180° aus gerechnet.', 'Du hast den gestreckten Winkel genutzt.']),
    srText: toSpeech(`${CROSS_TEXT} ${prompt}`),
    kmk: KMK,
  });
}

const NEBEN_HARD = [31, 37, 42, 48, 53, 59, 64, 71, 76, 83, 97, 104, 112, 118, 123, 129, 136, 141, 147];
const pairLabel = (a: number, b: number) => `${fmtAngle(a)} und ${fmtAngle(b)}`;

/** Stufe 2, AB III: reasoning, still with 180° minus α. Which pair can be Nebenwinkel? The other pairs are 10° off, a slip when subtracting, or two equal angles. */
function nebenCheck(rng: Rng, ab: Ab): Exercise {
  const [v, over, under, same] = rng.sample(NEBEN_HARD, 4);
  const other = 180 - v;
  const offBy = (a: number, b: number) => `${fmtAngle(a)} + ${fmtAngle(b)} = ${fmtAngle(a + b)}. Nebenwinkel ergeben zusammen 180°.`;
  const prompt = 'Welche zwei Winkel können Nebenwinkel sein?';
  return build(SKILL, 2, {
    key: `pruefen:${v}:${over}.${under}.${same}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: pairLabel(v, other) }, [
      { label: pairLabel(over, 190 - over), whyWrong: offBy(over, 190 - over) },
      { label: pairLabel(under, 170 - under), whyWrong: offBy(under, 170 - under) },
      { label: pairLabel(same, same), whyWrong: WHY_NEBEN },
    ]),
    hints: ['Nebenwinkel ergeben zusammen einen gestreckten Winkel.', 'Addiere bei jedem Paar. Welche Summe ist genau 180°?'],
    steps: ['Nebenwinkel ergeben zusammen 180°.', `180° − ${fmtAngle(v)} = ${fmtAngle(other)}`, `${pairLabel(v, other)} können Nebenwinkel sein.`],
    praise: 'Du hast jedes Paar an den 180° geprüft.',
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const field = (id: string, name: Name, value: number): MultiField => ({ id, value, before: `${name} =`, after: '°', label: name });

/** Stufe 3, AB I: one angle is given, find the other three. */
function allFour(rng: Rng, ab: Ab): Exercise {
  const alpha = rng.pick([32, 38, 44, 47, 53, 58, 63, 67, 72, 78, 84, 102, 108, 114, 121, 127, 133, 139, 146]);
  const tilt = rng.pick(TILTS);
  const other = 180 - alpha;
  const fields = [field('beta', 'β', other), field('gamma', 'γ', alpha), field('delta', 'δ', other)];
  return build(SKILL, 3, {
    key: `alle:${alpha}:${tilt}`,
    ab,
    prompt: `α misst ${fmtAngle(alpha)}. Trag die Größen von β, γ und δ ein.`,
    visual: crossing(tilt, alpha),
    answer: { kind: 'multi', fields },
    hints: ['γ liegt α gegenüber. Scheitelwinkel sind gleich groß.', 'β liegt neben α. Nebenwinkel ergeben zusammen einen gestreckten Winkel.'],
    steps: [`γ ist der Scheitelwinkel von α: γ = ${fmtAngle(alpha)}.`, `β ist ein Nebenwinkel von α: 180° − ${fmtAngle(alpha)} = ${fmtAngle(other)}.`, `δ liegt β gegenüber: δ = ${fmtAngle(other)}.`, `β = ${fmtAngle(other)}, γ = ${fmtAngle(alpha)}, δ = ${fmtAngle(other)}`],
    bugs: multiBugs([
      { id: 'scheitel-neben', match: { beta: alpha, gamma: other, delta: alpha }, hint: 'Gegenüber ist gleich groß. Daneben ergibt zusammen 180°.' },
      { id: 'neben-gleich', match: { beta: alpha, gamma: alpha, delta: alpha }, hint: WHY_NEBEN },
      { id: 'neben-voll', match: { beta: 360 - alpha, gamma: alpha, delta: 360 - alpha }, hint: WHY_NEBEN_FULL },
    ], fields),
    praise: rng.pick(['Du hast Scheitelwinkel und Nebenwinkel beide genutzt.', 'Du hast aus einem Winkel die übrigen bestimmt.']),
    srText: toSpeech(`${CROSS_TEXT} α misst ${alpha} Grad. Trag die Größen von β, γ und δ ein.`),
    kmk: KMK,
  });
}

/** Stufe 3, AB II: two crossings on one Gerade, one angle given at each. */
function twoCrossings(rng: Rng, ab: Ab): Exercise {
  const steep = rng.chance(0.5);
  const X = 70;
  const { lines, a, b } = fitLabels(() => {
    const a = steep ? rng.int(115, 125) : rng.int(50, 60);
    const b = steep ? rng.int(120, 130) : rng.int(70, 85);
    return { a, b, lines: [{ angle: 0, offset: 0, label: 'k' }, { angle: a, offset: offsetThrough(a, -X, 0), label: 'p' }, { angle: b, offset: offsetThrough(b, X, 0), label: 'q' }] };
  });
  const gamma = a;
  const delta = 180 - b;
  const visual: VisualOf<'lines'> = {
    type: 'lines',
    lines,
    points: [{ ...spotInAngle(lines, -X, 0, a / 2), label: 'α' }, { ...spotInAngle(lines, -X, 0, a / 2 + 180), label: 'γ' }, { ...spotInAngle(lines, X, 0, b / 2), label: 'β' }, { ...spotInAngle(lines, X, 0, (180 + b) / 2), label: 'δ' }],
  };
  const fields = [field('gamma', 'γ', gamma), field('delta', 'δ', delta)];
  const text = `α misst ${fmtAngle(a)}, β misst ${fmtAngle(b)}. γ liegt α gegenüber. δ liegt neben β.`;
  return build(SKILL, 3, {
    key: `zwei:${a}:${b}`,
    ab,
    prompt: `${text} Trag γ und δ ein.`,
    visual,
    answer: { kind: 'multi', fields },
    hints: ['Schau jede Kreuzung für sich an.', 'Gegenüber ist gleich groß. Daneben ergibt zusammen einen gestreckten Winkel.'],
    steps: [`Linke Kreuzung: γ ist der Scheitelwinkel von α, also γ = ${fmtAngle(gamma)}.`, `Rechte Kreuzung: δ ist der Nebenwinkel von β.`, `180° − ${fmtAngle(b)} = ${fmtAngle(delta)}`, `γ = ${fmtAngle(gamma)}, δ = ${fmtAngle(delta)}`],
    bugs: multiBugs([
      { id: 'scheitel-neben', match: { gamma: 180 - a, delta: b }, hint: 'Gegenüber ist gleich groß. Daneben ergibt zusammen 180°.' },
      { id: 'neben-gleich', match: { gamma, delta: b }, hint: WHY_NEBEN },
    ], fields),
    praise: 'Du hast jede Kreuzung einzeln betrachtet.',
    srText: toSpeech(`Die Gerade k wird von den Geraden p und q gekreuzt. An der linken Kreuzung liegen α und γ, an der rechten β und δ. ${text} Trag γ und δ ein.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Stufe 3, AB III: reversed. The sum of two Scheitelwinkel is given. */
function fromSum(rng: Rng, ab: Ab): Exercise {
  const alpha = rng.pick([35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 100, 105, 110, 115, 120, 125, 130]);
  const sum = 2 * alpha;
  const other = 180 - alpha;
  const tilt = rng.pick(TILTS);
  const fields = [field('alpha', 'α', alpha), field('beta', 'β', other), field('gamma', 'γ', alpha), field('delta', 'δ', other)];
  return build(SKILL, 3, {
    key: `summe:${alpha}:${tilt}`,
    ab,
    prompt: `α und γ sind Scheitelwinkel. Zusammen messen α und γ genau ${fmtAngle(sum)}. Trag alle vier Winkel ein.`,
    visual: crossing(tilt, alpha),
    answer: { kind: 'multi', fields },
    hints: ['Scheitelwinkel sind gleich groß. Teile die Summe durch 2.', 'β liegt neben α. Rechne dann von 180° aus.'],
    steps: [`${fmtAngle(sum)} : 2 = ${fmtAngle(alpha)}`, `Der Nebenwinkel: 180° − ${fmtAngle(alpha)} = ${fmtAngle(other)}`, `α = ${fmtAngle(alpha)}, β = ${fmtAngle(other)}, γ = ${fmtAngle(alpha)}, δ = ${fmtAngle(other)}`],
    bugs: multiBugs([
      { id: 'scheitel-summe', match: { alpha: sum }, hint: 'Die Angabe gilt für beide Winkel zusammen. Teile zuerst durch 2.' },
      { id: 'scheitel-neben', match: { alpha, beta: alpha, gamma: other, delta: other }, hint: 'γ liegt α gegenüber, also sind α und γ gleich groß.' },
    ], fields),
    praise: 'Du hast aus der Summe alle vier Winkel bestimmt.',
    srText: toSpeech(`${CROSS_TEXT} α und γ sind Scheitelwinkel. Zusammen messen α und γ genau ${sum} Grad. Trag alle vier Winkel ein.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: nameOpposite, 2: namePair, 3: sameSize },
  2: { 1: computeNeben, 2: computeNeben, 3: nebenCheck },
  3: { 1: allFour, 2: twoCrossings, 3: fromSum },
};

export const scheitelSkill: SkillDef = {
  ...SKILL,
  title: 'Scheitel- und Nebenwinkel',
  description: 'Du berechnest Winkel an sich schneidenden Geraden.',
  stufen: {
    1: 'Nebenwinkel und Scheitelwinkel benennen',
    2: 'Nebenwinkel berechnen: 180° minus α',
    3: 'Zwei Kreuzungen; alle vier Winkel finden',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
