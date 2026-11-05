/**
 * flaeche.netze (docs/research.md §6). Which faces meet is computed by folding (./nets.ts).
 * Stufe 1: is it a Würfel net, which faces meet. AB I yes or no, AB II the opposite face, AB III pick one net from four pictures.
 * Stufe 2: Quader net, Schrägbild, visible edges. AB I lengths of the visible or hidden edges of a Schrägbild, AB II match faces in a net, AB III the face that does not fit, or the edges.
 * Stufe 3: missing face, hidden edges dashed, the wrong Schrägbild. AB I complete the net, AB II the right Schrägbild, AB III the one that does not fit.
 */
import { speak } from '../../core/format';
import type { Cell, ChoiceOption, Rng, SkillDef, Stufe, Visual, VisualOf } from '../../core/types';
import { joinDe, makeChoice } from '../shared';
import { HINT, LETTERS, generator, q, type Forms } from './common';
import { NET_GAPS, NETS, NOT_NETS, QUADER_OPPOSITE, QUADER_SIZES, fold, oppositeFace, pickForm, quaderNet, quaderNetVisual, shuffledLetters } from './nets';

const SKILL = { id: 'flaeche.netze', topicId: 'flaeche' } as const;
const KMK = ['RF.koerper'];

const FOLD_HINT = 'Falte das Netz im Kopf. Starte bei einer Fläche in der Mitte.';
const NO_OVERLAP = 'Falte im Kopf: Jede Fläche findet einen eigenen Platz.';
const cellsKey = (cells: readonly Cell[]) => cells.map((c) => c.join('')).join('.');
const netPicture = (cells: Cell[]): VisualOf<'net'> => ({ type: 'net', cells });

/** Picture options labelled A, B, … in the order shown. */
function pictureChoice(rng: Rng, right: Visual, wrong: { visual: Visual; whyWrong: string }[]) {
  const shuffled = rng.shuffle<{ visual: Visual; whyWrong?: string }>([{ visual: right }, ...wrong]);
  const options: ChoiceOption[] = shuffled.map((o, i) => ({ label: LETTERS[i], visual: o.visual, ...(o.whyWrong ? { whyWrong: o.whyWrong } : {}) }));
  return { kind: 'choice' as const, options, correct: shuffled.findIndex((o) => o.visual === right), layout: 'grid' as const };
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1YesNo: Forms[1][1] = (rng) => {
  const isNet = rng.chance(0.5);
  const cells = pickForm(rng, rng.pick(isNet ? NETS : NOT_NETS));
  return {
    key: `ist-netz:${cellsKey(cells)}`,
    prompt: 'Lässt sich aus diesem Netz ein Würfel falten?',
    visual: netPicture(cells),
    answer: makeChoice(rng, { label: isNet ? 'Ja' : 'Nein' }, [{ label: isNet ? 'Nein' : 'Ja', whyWrong: isNet ? NO_OVERLAP : HINT.netzUeberlappt }], { order: ['Ja', 'Nein'] }),
    hints: [FOLD_HINT, HINT.netzUeberlappt],
    steps: [
      'Falte das Netz im Kopf, Fläche für Fläche.',
      isNet ? 'Jede der sechs Flächen findet einen eigenen Platz.' : 'Zwei Flächen landen auf derselben Stelle.',
      isNet ? 'Das ist ein Würfelnetz.' : 'Das ist kein Würfelnetz.',
    ],
    praise: 'Du hast das Netz im Kopf gefaltet.',
  };
};

const s1Opposite: Forms[1][2] = (rng) => {
  const cells = pickForm(rng, rng.pick(NETS));
  const faces = fold(cells)!;
  const letters = shuffledLetters(rng);
  const target = rng.int(0, 5);
  const partner = faces.indexOf(oppositeFace(faces[target]));
  const touching = letters.filter((_, i) => i !== target && i !== partner);
  return {
    key: `gegenueber:${cellsKey(cells)}:${letters.join('')}:${letters[target]}`,
    prompt: `Falte das Netz zum Würfel. Welche Fläche liegt gegenüber von ${letters[target]}?`,
    visual: { type: 'net', cells, faces: letters },
    answer: makeChoice(rng, { label: letters[partner] }, touching.map((l) => ({ label: l, whyWrong: `Fläche ${l} stößt an ${letters[target]}.` })), { max: 5 }),
    hints: [`Welche Flächen stoßen an ${letters[target]}?`, `Die Fläche gegenüber berührt ${letters[target]} nicht.`],
    steps: [`An ${letters[target]} stoßen ${joinDe([...touching].sort())}.`, `Nur ${letters[partner]} berührt ${letters[target]} nicht.`, `${letters[partner]} liegt gegenüber von ${letters[target]}.`],
    praise: 'Du hast die Flächen im Kopf gefaltet.',
  };
};

const s1PickNet: Forms[1][3] = (rng) => {
  const lookForNet = rng.chance(0.5);
  const odd = pickForm(rng, rng.pick(lookForNet ? NETS : NOT_NETS));
  const others = rng.sample(lookForNet ? NOT_NETS : NETS, 3).map((c) => netPicture(pickForm(rng, c)));
  const why = lookForNet ? HINT.netzUeberlappt : 'Dieses Netz lässt sich falten. Suche das andere Netz.';
  return {
    key: `welches-netz:${lookForNet ? 'ist' : 'kein'}:${cellsKey(odd)}`,
    prompt: lookForNet ? 'Nur ein Bild zeigt ein Würfelnetz. Welches Bild ist das?' : 'Ein Bild zeigt kein Würfelnetz. Welches Bild ist das?',
    answer: pictureChoice(rng, netPicture(odd), others.map((visual) => ({ visual, whyWrong: why }))),
    hints: ['Prüfe ein Bild nach dem anderen.', HINT.netzUeberlappt],
    steps: [
      { text: lookForNet ? 'Dieses Netz lässt sich falten.' : 'Bei diesem Netz liegen zwei Flächen übereinander.', visual: netPicture(odd) },
      lookForNet ? 'Bei den anderen Netzen liegen zwei Flächen übereinander.' : 'Die anderen Netze lassen sich falten.',
    ],
    praise: 'Du hast alle Netze einzeln geprüft.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const pickSize = (rng: Rng) => rng.pick(QUADER_SIZES);

const quader = (a: number, b: number, c: number, hiddenEdges: 'dashed' | 'none' = 'dashed'): VisualOf<'quader'> => ({ type: 'quader', a, b, c, unit: 'cm', showLabels: true, hiddenEdges });

function threeSides(rng: Rng): [number, number, number] {
  const [a, b, c] = rng.sample([2, 3, 4, 5, 6, 7, 8], 3);
  return [a, b, c];
}

const s2Seen: Forms[2][1] = (rng) => {
  const [a, b, c] = threeSides(rng);
  const sum = a + b + c;
  const hidden = rng.chance(0.5);
  const right = hidden ? sum : 3 * sum;
  const ask = hidden ? 'Drei Kanten sind verdeckt. Wie lang sind diese drei Kanten zusammen?' : 'Wie lang sind alle sichtbaren Kanten zusammen?';
  // near misses from a, b and c, in random order: no fixed set, and the right one has no fixed place among the sizes
  const misses = hidden
    ? [a + b, a + c, b + c, sum + a, sum + b, sum + c, 2 * sum, 3 * sum]
    : [right - a, right - b, right - c, right + a, right + b, right + c, 2 * sum, 4 * sum];
  const why = hidden ? 'Prüfe: In jeder Richtung ist genau eine Kante verdeckt.' : 'Prüfe: Du siehst 9 Kanten. Hast du jede Kante einmal gerechnet?';
  const wrongs = rng.shuffle(misses).map((n) => ({ label: q(n, 'cm'), whyWrong: why }));
  return {
    key: `schraegbild:${hidden ? 'verdeckt' : 'sichtbar'}:${a}-${b}-${c}`,
    prompt: `Das Bild zeigt einen Quader als Schrägbild. ${ask}`,
    visual: quader(a, b, c, 'none'),
    answer: makeChoice(rng, { label: q(right, 'cm') }, wrongs),
    hints: hidden
      ? ['Die verdeckten Kanten treffen sich in der verdeckten Ecke.', 'In jeder Richtung ist eine Kante verdeckt.']
      : ['In jeder Richtung siehst du gleich viele Kanten.', 'Zähle zu jeder Kantenlänge die Kanten im Bild.'],
    steps: hidden
      ? ['In jeder Richtung ist 1 Kante verdeckt.', `${q(a, 'cm')} + ${q(b, 'cm')} + ${q(c, 'cm')} = ${q(right, 'cm')}`, `Die verdeckten Kanten sind zusammen ${q(right, 'cm')} lang.`]
      : ['Du siehst 9 Kanten: in jeder Richtung 3 Kanten.', `3 · ${q(a, 'cm')} + 3 · ${q(b, 'cm')} + 3 · ${q(c, 'cm')} = ${q(right, 'cm')}`, `Die sichtbaren Kanten sind zusammen ${q(right, 'cm')} lang.`],
    praise: 'Du hast sichtbare und verdeckte Kanten getrennt.',
    srText: speak(`Ein Quader als Schrägbild, ${q(a, 'cm')} breit, ${q(b, 'cm')} tief und ${q(c, 'cm')} hoch. ${ask}`),
    kmk: [...KMK, 'PK.darstellen'],
  };
};

const s2MatchFaces: Forms[2][2] = (rng) => {
  const [a, b, c] = pickSize(rng);
  const net = quaderNet(a, b, c);
  const letters = shuffledLetters(rng);
  const face = rng.int(0, 5);
  const partner = QUADER_OPPOSITE[face];
  const askSize = rng.chance(0.5);
  const others = letters.filter((_, i) => i !== face && i !== partner);
  return {
    key: `quadernetz:${askSize ? 'gleich' : 'gegenueber'}:${a}-${b}-${c}:${letters.join('')}:${letters[face]}`,
    prompt: askSize ? `Welche Fläche ist genauso groß wie ${letters[face]}?` : `Falte das Netz zum Quader. Welche Fläche liegt gegenüber von ${letters[face]}?`,
    visual: quaderNetVisual(net, letters),
    answer: makeChoice(rng, { label: letters[partner] }, others.map((l) => ({ label: l, whyWrong: askSize ? 'Vergleiche Länge und Breite in Kästchen.' : `Fläche ${l} stößt an ${letters[face]}.` })), { max: 5 }),
    hints: ['Ein Quader hat drei Paare gleich großer Flächen.', 'Zwei Flächen gegenüber sind gleich groß.'],
    steps: [`Zähle bei ${letters[face]} Länge und Breite in Kästchen.`, `${letters[partner]} hat dieselben Maße und liegt gegenüber.`, `Das Paar ist ${letters[face]} und ${letters[partner]}.`],
    praise: 'Du hast die beiden passenden Flächen gefunden.',
  };
};

const s2DoesNotFit: Forms[2][3] = (rng) => {
  const [a, b, c] = pickSize(rng);
  const letters = shuffledLetters(rng);
  if (rng.chance(0.5)) {
    const net = quaderNet(a, b, c, true);
    const others = letters.filter((_, i) => i !== 5);
    return {
      key: `flaeche-passt-nicht:${a}-${b}-${c}:${letters.join('')}`,
      prompt: 'Eine Fläche ist zu lang. Das Netz ergibt so keinen Quader. Welche Fläche ist das?',
      visual: quaderNetVisual(net, letters),
      answer: makeChoice(rng, { label: letters[5] }, others.map((l) => ({ label: l, whyWrong: 'Vergleiche jede Fläche mit der Fläche gegenüber.' })), { max: 6 }),
      hints: ['Zwei Flächen gegenüber müssen gleich groß sein.', 'Zähle bei jedem Paar die Kästchen.'],
      steps: [`Fläche ${letters[4]} und Fläche ${letters[5]} liegen sich gegenüber.`, `Fläche ${letters[5]} hat eine Reihe Kästchen zu viel.`, `Die Fläche ${letters[5]} passt nicht.`],
      praise: 'Du hast die Flächen paarweise verglichen.',
      kmk: [...KMK, 'PK.argumentieren'],
    };
  }
  const sorted = [a, b, c].sort((x, y) => x - y);
  const text = (sides: number[]) => joinDe(sides.map((s) => q(s, 'cm')));
  const wrongs = [[sorted[0], sorted[1], sorted[2] + 1], [sorted[0] + 1, sorted[1] + 1, sorted[2] + 1], [sorted[0], sorted[1] + 2, sorted[2] + 2]];
  return {
    key: `kanten-aus-netz:${a}-${b}-${c}:${letters.join('')}`,
    prompt: 'Ein Kästchen ist 1 cm lang. Welche Kanten hat der gefaltete Quader?',
    visual: quaderNetVisual(quaderNet(a, b, c), letters),
    answer: makeChoice(rng, { label: text(sorted) }, wrongs.map((w) => ({ label: text(w), whyWrong: 'Zähle bei einer Fläche Länge und Breite. Eine zweite Fläche zeigt die dritte Kante.' }))),
    hints: ['Zähle bei einer Fläche beide Seiten.', 'Die dritte Kante zeigt eine Fläche daneben.'],
    steps: ['Zähle bei zwei Flächen Länge und Breite in Kästchen.', `Der Quader hat die Kanten ${text(sorted)}.`],
    praise: 'Du hast die Kanten aus dem Netz abgelesen.',
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const s3Missing: Forms[3][1] = (rng) => {
  const gap = rng.pick(NET_GAPS);
  return {
    key: `fehlende-flaeche:${cellsKey(gap.given)}`,
    prompt: 'Dem Würfelnetz fehlt ein Quadrat. Das Netz passt genau in dieses Gitter. Tippe das fehlende Feld an.',
    answer: { kind: 'cells', width: gap.width, height: gap.height, given: gap.given, solution: [gap.missing] },
    hints: ['Falte die fünf Quadrate im Kopf. Welche Würfelseite bleibt frei?', 'Das neue Quadrat muss genau auf diese freie Seite klappen.'],
    steps: [{ text: 'Fünf Quadrate belegen fünf Würfelseiten. Eine Seite bleibt frei.', visual: netPicture([...gap.given, gap.missing]) }, 'Nur an dieser Stelle klappt das Quadrat auf die freie Seite.'],
    praise: 'Du hast die freie Würfelseite gefunden.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

const s3RightDrawing: Forms[3][2] = (rng) => {
  const [a, b, c] = threeSides(rng);
  return {
    key: `richtiges-schraegbild:${a}-${b}-${c}`,
    prompt: `Der Quader ist ${q(a, 'cm')} breit, ${q(b, 'cm')} tief und ${q(c, 'cm')} hoch. Verdeckte Kanten sind gestrichelt. Welches Schrägbild stimmt?`,
    answer: pictureChoice(rng, quader(a, b, c), [
      { visual: quader(a, b, c, 'none'), whyWrong: 'Hier fehlen die gestrichelten Kanten.' },
      { visual: quader(c, b, a), whyWrong: 'Vergleiche Breite und Höhe mit dem Text.' },
      { visual: quader(a, c, b), whyWrong: 'Vergleiche Tiefe und Höhe mit dem Text.' },
    ]),
    hints: ['Prüfe zuerst: Sind die verdeckten Kanten gestrichelt?', 'Prüfe dann Breite, Tiefe und Höhe.'],
    steps: [{ text: `Dieses Bild zeigt Breite ${q(a, 'cm')}, Tiefe ${q(b, 'cm')} und Höhe ${q(c, 'cm')}.`, visual: quader(a, b, c) }, 'Die drei verdeckten Kanten sind gestrichelt.'],
    praise: 'Du hast Maße und gestrichelte Kanten geprüft.',
  };
};

const s3OddDrawing: Forms[3][3] = (rng) => {
  const WHY = 'Vergleiche die drei Kantenlängen. Bei diesem Bild passen alle drei.';
  if (rng.chance(0.5)) {
    const [a, b, c] = threeSides(rng);
    return {
      key: `schraegbild-passt-nicht:${a}-${b}-${c}`,
      prompt: 'Drei Schrägbilder zeigen denselben Quader in anderer Lage. Welches Schrägbild passt nicht?',
      answer: pictureChoice(rng, quader(a, b, c + 1), [
        { visual: quader(a, b, c), whyWrong: WHY },
        { visual: quader(b, c, a), whyWrong: WHY },
        { visual: quader(c, a, b), whyWrong: WHY },
      ]),
      hints: ['Schreib zu jedem Bild die drei Kantenlängen auf.', 'Die Lage ändert die Kantenlängen nicht.'],
      steps: [{ text: `Dieses Bild hat die Kanten ${joinDe([a, b, c + 1].map((s) => q(s, 'cm')))}.`, visual: quader(a, b, c + 1) }, `Die anderen Bilder haben die Kanten ${joinDe([a, b, c].map((s) => q(s, 'cm')))}.`],
      praise: 'Du hast die Kanten trotz anderer Lage verglichen.',
      kmk: [...KMK, 'PK.argumentieren'],
    };
  }
  const [a, b, c] = pickSize(rng);
  const letters = shuffledLetters(rng);
  return {
    key: `netz-zu-schraegbild:${a}-${b}-${c}:${letters.join('')}`,
    prompt: 'Ein Kästchen ist 1 cm lang. Welches Schrägbild zeigt den Quader aus dem Netz?',
    visual: quaderNetVisual(quaderNet(a, b, c), letters),
    answer: pictureChoice(rng, quader(a, b, c), [
      { visual: quader(a + 1, b, c), whyWrong: 'Zähle die Kanten im Netz noch einmal.' },
      { visual: quader(a, b + 1, c), whyWrong: 'Zähle die Kanten im Netz noch einmal.' },
      { visual: quader(a, b, c + 1), whyWrong: 'Zähle die Kanten im Netz noch einmal.' },
    ]),
    hints: ['Zähle bei einer Fläche Länge und Breite in Kästchen.', 'Eine Fläche daneben zeigt die dritte Kante.'],
    steps: [{ text: `Das Netz zeigt die Kanten ${joinDe([a, b, c].map((s) => q(s, 'cm')))}.`, visual: quader(a, b, c) }, 'Dieses Schrägbild hat genau diese Kanten.'],
    praise: 'Du hast das Netz mit dem Schrägbild verbunden.',
    kmk: [...KMK, 'PK.darstellen'],
  };
};

const FORMS: Forms = {
  1: { 1: s1YesNo, 2: s1Opposite, 3: s1PickNet },
  2: { 1: s2Seen, 2: s2MatchFaces, 3: s2DoesNotFit },
  3: { 1: s3Missing, 2: s3RightDrawing, 3: s3OddDrawing },
};

const STUFEN: Record<Stufe, string> = {
  1: 'Würfelnetz prüfen, Flächen gegenüber finden',
  2: 'Quadernetz, Schrägbild und sichtbare Kanten',
  3: 'Fehlende Fläche, gestrichelte Kanten, unpassendes Schrägbild',
};

export const netzeSkill: SkillDef = {
  ...SKILL,
  title: 'Netze und Schrägbilder',
  description: 'Du erkennst, welches Netz zum Quader passt, und liest Schrägbilder.',
  stufen: STUFEN,
  kmk: KMK,
  generate: generator(SKILL, KMK, FORMS),
};
