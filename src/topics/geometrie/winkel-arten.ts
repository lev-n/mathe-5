/**
 * Winkelarten (docs/research.md §6). Stufe 1: the four kinds in the usual position. Stufe 2: turned angles and different arm lengths (F8), Scheitel and
 * Schenkel. Stufe 3: überstumpf and comparing with 45°, 90° and 180°; a profile with maxAngle 180 stays with the comparisons. Values close to a border are read on the Geodreieck, as no eye can name them.
 */
import { fmtAngle, toSpeech } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, GenContext, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, targetAb } from '../shared';
import { angleVisual, labelledChoice, toolVisual } from './helpers';

const SKILL = { id: 'geometrie.winkel-arten', topicId: 'geometrie' } as const;
const KMK = ['RF.winkelarten'];

type Art = 'spitz' | 'recht' | 'stumpf' | 'gestreckt' | 'ueberstumpf';
const LABEL: Record<Art, string> = { spitz: 'spitzer Winkel', recht: 'rechter Winkel', stumpf: 'stumpfer Winkel', gestreckt: 'gestreckter Winkel', ueberstumpf: 'überstumpfer Winkel' };
const WHY: Record<Art, string> = {
  spitz: 'Ein spitzer Winkel ist kleiner als ein rechter Winkel.',
  recht: 'Ein rechter Winkel sieht aus wie die Ecke eines Blatts.',
  stumpf: 'Ein stumpfer Winkel liegt zwischen einem rechten und einem gestreckten Winkel.',
  gestreckt: 'Bei einem gestreckten Winkel liegen die Schenkel auf einer Linie.',
  ueberstumpf: 'Ein überstumpfer Winkel ist größer als ein gestreckter Winkel.',
};
/** The size of a kind as the end of a sentence about an angle. */
const SIZE: Record<Art, string> = { spitz: 'ist kleiner als 90°', recht: 'misst genau 90°', stumpf: 'liegt zwischen 90° und 180°', gestreckt: 'misst genau 180°', ueberstumpf: 'ist größer als 180°' };

export function artOf(d: number): Art {
  if (d < 90) return 'spitz';
  if (d === 90) return 'recht';
  if (d < 180) return 'stumpf';
  return d === 180 ? 'gestreckt' : 'ueberstumpf';
}

const four: readonly Art[] = ['spitz', 'recht', 'stumpf', 'gestreckt'];
const five: readonly Art[] = [...four, 'ueberstumpf'];

function options(rng: Rng, right: Art, arts: readonly Art[]) {
  return makeChoice(rng, { label: LABEL[right] }, arts.filter((a) => a !== right).map((a) => ({ label: LABEL[a], whyWrong: WHY[a] })), { order: arts.map((a) => LABEL[a]), max: arts.length });
}

function degreesOf(rng: Rng, art: Art): number {
  if (art === 'spitz') return rng.pick([20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75]);
  if (art === 'stumpf') return rng.pick([105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165]);
  if (art === 'ueberstumpf') return rng.pick([200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310, 320, 330]);
  return art === 'recht' ? 90 : 180;
}

const steps = (d: number) => [`Der Winkel ${SIZE[artOf(d)]}.`, `Das ist ein ${LABEL[artOf(d)]}.`];
const artText = 'Welche Winkelart siehst du?';
const compareHints = ['Vergleiche die Öffnung mit einem rechten Winkel, der Ecke eines Blatts.', 'Prüfe auch: Liegen die Schenkel auf einer Linie?'];

const openingWord = (v: VisualOf<'angle'>) => {
  const a = artOf(v.degrees);
  return a === 'recht' ? 'Die Schenkel bilden eine Ecke wie ein Blatt Papier.' : a === 'gestreckt' ? 'Die Schenkel liegen auf einer Linie.' : a === 'spitz' ? 'Die Öffnung ist kleiner als eine Blattecke.' : a === 'stumpf' ? 'Die Öffnung ist größer als eine Blattecke, aber die Schenkel liegen nicht auf einer Linie.' : 'Der Bogen geht über die Linie hinaus.';
};

/** Stufe 1, AB I: name the kind in the usual position. */
function nameUsual(rng: Rng, ab: Ab): Exercise {
  const art = rng.pick(four);
  const d = degreesOf(rng, art);
  const visual = angleVisual(d);
  return build(SKILL, 1, {
    key: `art:${d}`,
    ab,
    prompt: artText,
    visual,
    answer: options(rng, art, four),
    hints: compareHints,
    steps: steps(d),
    praise: rng.pick(['Du hast die Öffnung mit einer Blattecke verglichen.', 'Du hast auf die Öffnung des Winkels geschaut.']),
    srText: toSpeech(`Ein Winkel. ${openingWord(visual)} ${artText}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB II: the kind from the size, also close to 90°. */
function nameFromNumber(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick([12, 25, 38, 47, 64, 75, 81, 85, 88, 90, 92, 95, 99, 108, 124, 136, 147, 163, 172, 178, 180]);
  const art = artOf(d);
  const prompt = `Ein Winkel misst ${fmtAngle(d)}. Welche Winkelart ist das?`;
  return build(SKILL, 1, {
    key: `zahl:${d}`,
    ab,
    prompt,
    answer: options(rng, art, four),
    hints: ['Vergleiche mit 90° und mit 180°.', 'Unter 90° ist spitz. Zwischen 90° und 180° ist stumpf.'],
    steps: [`Vergleiche ${fmtAngle(d)} mit 90° und 180°.`, ...steps(d)],
    praise: 'Du hast die Größe mit 90° und 180° verglichen.',
    srText: toSpeech(prompt),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: reversed. Which size fits this kind? */
function sizeForArt(rng: Rng, ab: Ab): Exercise {
  const art = rng.pick<Art>(['spitz', 'stumpf']);
  const right = art === 'spitz' ? rng.pick([35, 48, 62, 77, 84]) : rng.pick([97, 112, 128, 143, 169]);
  const pool = art === 'spitz' ? [rng.pick([105, 124, 156]), 90, 180] : [rng.pick([28, 53, 76]), 90, 180];
  const wrongs: ChoiceOption[] = pool.map((d) => ({ label: fmtAngle(d), whyWrong: `${fmtAngle(d)}: Das ist ein ${LABEL[artOf(d)]}.` }));
  const prompt = `Welche Größe passt zu einem ${art === 'spitz' ? 'spitzen' : 'stumpfen'} Winkel?`;
  return build(SKILL, 1, {
    key: `groesse:${art}:${right}:${pool[0]}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: fmtAngle(right) }, wrongs),
    hints: [art === 'spitz' ? 'Ein spitzer Winkel ist kleiner als ein rechter Winkel.' : 'Ein stumpfer Winkel liegt zwischen einem rechten und einem gestreckten Winkel.', 'Ein rechter Winkel misst 90°, ein gestreckter 180°.'],
    steps: [art === 'spitz' ? 'Spitze Winkel sind kleiner als 90°.' : 'Stumpfe Winkel liegen zwischen 90° und 180°.', `${fmtAngle(right)} liegt in diesem Bereich.`, `Es passt ${fmtAngle(right)}.`],
    praise: 'Du hast jede Größe mit 90° verglichen.',
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const BASES = [15, 30, 45, 60, 75, 100, 120, 135, 150, 200, 225, 250, 300, 330];
const ARMS = [0.4, 0.5, 0.6, 0.75, 0.9, 1];

/** Stufe 2, AB I: turned, with arms of different length. */
function nameTurned(rng: Rng, ab: Ab): Exercise {
  const art = rng.pick(four);
  const d = degreesOf(rng, art);
  const base = rng.pick(BASES);
  const arm1 = rng.pick(ARMS);
  const arm2 = rng.pick(ARMS);
  const visual = angleVisual(d, base, { arm1, arm2 });
  return build(SKILL, 2, {
    key: `gedreht:${d}:${base}:${arm1}.${arm2}`,
    ab,
    prompt: artText,
    visual,
    answer: options(rng, art, four),
    hints: ['Dreh das Bild im Kopf, bis ein Schenkel waagerecht liegt.', 'Die Länge der Schenkel ändert den Winkel nicht. Schau auf die Öffnung.'],
    steps: ['Die Lage und die Schenkellänge ändern den Winkel nicht.', ...steps(d)],
    praise: rng.pick(['Du hast nur auf die Öffnung geschaut.', 'Du hast das Bild im Kopf gedreht.']),
    srText: toSpeech(`Ein gedrehter Winkel. ${openingWord(visual)} ${artText}`),
    kmk: KMK,
  });
}

/** The visual writes the name of the vertex to its lower left: no arm in this direction runs through the letter. */
const clearOfVertexLabel = (direction: number) => direction % 360 < 195 || direction % 360 > 267;

/** Stufe 2, AB II: Scheitel and Schenkel. */
function nameParts(rng: Rng, ab: Ab): Exercise {
  const vertex = rng.pick(['S', 'A', 'B', 'O', 'P']);
  const [p, q] = rng.pick([['b', 'c'], ['p', 'q'], ['e', 'f']]);
  const d = rng.pick([40, 55, 70, 110, 125, 140]);
  const base = rng.pick(BASES.filter((b) => clearOfVertexLabel(b) && clearOfVertexLabel(b + d)));
  const asksVertex = rng.chance(0.5);
  const whyTip = 'Der Scheitel ist ein Punkt. Gefragt sind die zwei Linien.';
  const whyArm = 'Die Schenkel sind die zwei Linien des Winkels.';
  const right = asksVertex ? 'Scheitel' : 'Schenkel';
  const prompt = asksVertex ? `Wie heißt der Punkt ${vertex} an diesem Winkel?` : `Wie heißen die Linien ${p} und ${q} an diesem Winkel?`;
  const wrongs: ChoiceOption[] = (asksVertex ? [{ label: 'Schenkel', whyWrong: whyArm }, { label: 'Mittelpunkt', whyWrong: 'Einen Mittelpunkt hat ein Kreis. Ein Winkel hat einen Scheitel.' }, { label: 'Endpunkt', whyWrong: `Am Punkt ${vertex} treffen sich beide Linien.` }] : [{ label: 'Scheitel', whyWrong: whyTip }, { label: 'Seiten', whyWrong: 'Seiten haben Figuren wie ein Rechteck. Ein Winkel hat Schenkel.' }, { label: 'Radien', whyWrong: 'Radien gehören zu einem Kreis.' }]);
  return build(SKILL, 2, {
    key: `teile:${asksVertex ? 'punkt' : 'linien'}:${vertex}:${p}:${d}:${base}`,
    ab,
    prompt,
    visual: angleVisual(d, base, { labels: { vertex, arm1: p, arm2: q } }),
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: ['Ein Winkel besteht aus einem Punkt und zwei Linien.', 'Beide Linien beginnen am selben Punkt.'],
    steps: [`Der Punkt ${vertex} ist der Scheitel.`, `Die Linien ${p} und ${q} sind die Schenkel.`, asksVertex ? `${vertex} heißt Scheitel.` : `${p} und ${q} heißen Schenkel.`],
    praise: 'Du hast die Fachwörter dem Bild zugeordnet.',
    srText: toSpeech(`Ein Winkel mit dem Punkt ${vertex} und den Linien ${p} und ${q}. ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: the larger angle has shorter arms. */
function compareArms(rng: Rng, ab: Ab): Exercise {
  const small = rng.pick([30, 40, 50, 60, 70]);
  const large = small + rng.pick([20, 30, 40]);
  const longFirst = rng.chance(0.5);
  const longArm = angleVisual(small, rng.pick([0, 20, 40]), { arm1: 1, arm2: 1 });
  const shortArm = angleVisual(large, rng.pick([0, 20, 40]), { arm1: 0.45, arm2: 0.45 });
  const [a, b] = longFirst ? [longArm, shortArm] : [shortArm, longArm];
  const right = longFirst ? 'B' : 'A';
  const wrong = longFirst ? 'A' : 'B';
  const correct: ChoiceOption = { label: right, visual: longFirst ? b : a };
  const other: ChoiceOption = { label: wrong, visual: longFirst ? a : b, whyWrong: 'Die Länge der Schenkel ändert den Winkel nicht. Schau auf die Öffnung.' };
  return build(SKILL, 2, {
    key: `vergleich:${small}:${large}:${longFirst ? 'lang' : 'kurz'}:${longArm.baseRotation}:${shortArm.baseRotation}`,
    ab,
    prompt: 'Welcher Winkel ist größer?',
    answer: labelledChoice(rng, correct, [other], ['A', 'B'], 'grid'),
    hints: ['Vergleiche die Öffnung, nicht die Länge der Schenkel.', 'Verlängere die kurzen Schenkel im Kopf.'],
    steps: ['Die Länge der Schenkel zählt nicht.', `Winkel ${right} ist weiter geöffnet.`, `Winkel ${right} ist größer.`],
    praise: 'Du hast die Öffnung verglichen, nicht die Schenkel.',
    srText: toSpeech(`Zwei Winkel. Winkel ${longFirst ? 'A hat lange Schenkel und eine kleine Öffnung, Winkel B kurze Schenkel und eine größere Öffnung' : 'A hat kurze Schenkel und eine größere Öffnung, Winkel B lange Schenkel und eine kleine Öffnung'}. Welcher Winkel ist größer?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 3, AB I: all kinds with überstumpf, by the arc. */
function nameAll(rng: Rng, ab: Ab): Exercise {
  const d = rng.chance(0.6) ? degreesOf(rng, 'ueberstumpf') : degreesOf(rng, rng.pick(four));
  const base = rng.pick(BASES);
  const visual = angleVisual(d, base, { arm1: rng.pick(ARMS), arm2: rng.pick(ARMS) });
  return build(SKILL, 3, {
    key: `alle:${d}:${base}:${visual.arm1}.${visual.arm2}`,
    ab,
    prompt: 'Der Bogen zeigt den Winkel. Welche Winkelart siehst du?',
    visual,
    answer: options(rng, artOf(d), five),
    hints: ['Folge dem Bogen von einem Schenkel zum anderen.', 'Geht der Bogen über eine gerade Linie hinaus?'],
    steps: steps(d),
    praise: rng.pick(['Du bist dem Bogen genau gefolgt.', 'Du hast die Grenzen 90° und 180° geprüft.']),
    srText: toSpeech(`Ein gedrehter Winkel. ${openingWord(visual)} Welche Winkelart siehst du?`),
    kmk: KMK,
  });
}

/** Stufe 3 with maxAngle 180, AB I: a turned angle close to 90° or 180°, read on the Geodreieck and then compared. */
function nameNearBorder(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick([80, 82, 85, 87, 88, 90, 92, 93, 95, 98, 100, 172, 175, 178, 180]);
  const base = rng.pick(BASES);
  const prompt = 'Lies den Winkel am Geodreieck ab. Welche Winkelart ist das?';
  return build(SKILL, 3, {
    key: `grenze:${d}:${base}`,
    ab,
    prompt,
    visual: toolVisual(d, base),
    answer: options(rng, artOf(d), four),
    hints: ['Starte an der 0 auf dem ersten Schenkel.', 'Vergleiche dann genau mit 90° und 180°.'],
    steps: [`Der zweite Schenkel zeigt auf ${fmtAngle(d)}.`, ...steps(d)],
    praise: 'Du hast abgelesen und genau mit 90° und 180° verglichen.',
    srText: toSpeech(`Ein gedrehter Winkel mit dem Geodreieck: Die 0 liegt am ersten Schenkel. Der zweite Schenkel zeigt auf ${d} Grad. Welche Winkelart ist das?`),
    kmk: KMK,
  });
}

const BANDS = [
  { label: 'kleiner als 45°', test: (d: number) => d < 45, step: 'Der Winkel ist kleiner als 45°.', spoken: 'Die Öffnung ist kleiner als eine halbe Blattecke.' },
  { label: 'zwischen 45° und 90°', test: (d: number) => d > 45 && d < 90, step: 'Der Winkel liegt zwischen 45° und 90°.', spoken: 'Die Öffnung ist größer als eine halbe Blattecke, aber kleiner als eine ganze.' },
  { label: 'zwischen 90° und 180°', test: (d: number) => d > 90 && d < 180, step: 'Der Winkel liegt zwischen 90° und 180°.', spoken: 'Die Öffnung ist größer als eine Blattecke, aber die Schenkel liegen nicht auf einer Linie.' },
  { label: 'größer als 180°', test: (d: number) => d > 180, step: 'Der Winkel ist größer als 180°.', spoken: 'Der Bogen geht über die Linie hinaus.' },
];

/** Stufe 3, AB II: compare with the benchmarks. */
function bands(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const wide = ctx.ranges.maxAngle === 360;
  const pool = [20, 25, 30, 35, 55, 60, 65, 70, 75, 105, 120, 135, 150, 165, ...(wide ? [200, 225, 250, 270, 300, 320] : [])];
  const d = rng.pick(pool);
  const base = rng.pick(BASES);
  const shown = BANDS.slice(0, wide ? 4 : 3);
  const right = shown.find((b) => b.test(d))!;
  const why = 'Die halbe Blattecke misst 45°. Die ganze Blattecke misst 90°.';
  return build(SKILL, 3, {
    key: `band:${d}:${base}`,
    ab,
    prompt: 'Wie groß ist der Winkel ungefähr?',
    visual: angleVisual(d, base),
    answer: makeChoice(rng, { label: right.label }, shown.filter((b) => b !== right).map((b) => ({ label: b.label, whyWrong: why })), { order: shown.map((b) => b.label), max: shown.length }),
    hints: ['Eine Blattecke misst 90°. Die Hälfte davon sind 45°.', 'Zwei Blattecken nebeneinander ergeben 180°.'],
    steps: ['Vergleiche mit 45°, 90° und 180°.', right.step],
    praise: 'Du hast den Winkel mit festen Größen verglichen.',
    srText: toSpeech(`Ein gedrehter Winkel. ${right.spoken} Wie groß ist der Winkel ungefähr: ${shown.map((b) => b.label).join(', ')}?`),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: reasoning. What kind is the double, triple or half of an angle? */
function multiples(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const wide = ctx.ranges.maxAngle === 360;
  const form = rng.pick(wide ? (['doppelt', 'dreifach', 'halb'] as const) : (['doppelt', 'halb'] as const));
  const d = form === 'doppelt' ? rng.pick([30, 35, 40, 45, 50, 55, 60, 70, 80, 90, ...(wide ? [100, 110, 120, 130] : [])]) : form === 'dreifach' ? rng.pick([20, 25, 30, 40, 50, 60, 70, 80, 90]) : rng.pick([100, 120, 140, 150, 160, 180, ...(wide ? [200, 220, 240, 300] : [])]);
  const result = form === 'doppelt' ? d * 2 : form === 'dreifach' ? d * 3 : d / 2;
  const word = form === 'doppelt' ? 'doppelt so groß' : form === 'dreifach' ? 'dreimal so groß' : 'halb so groß';
  const term = form === 'doppelt' ? `2 · ${d}° = ${result}°` : form === 'dreifach' ? `3 · ${d}° = ${result}°` : `${d}° : 2 = ${result}°`;
  const arts = wide ? five : four;
  const prompt = `Ein Winkel misst ${fmtAngle(d)}. Ein anderer Winkel ist ${word}. Welche Winkelart hat der andere Winkel?`;
  return build(SKILL, 3, {
    key: `rechnen:${form}:${d}`,
    ab,
    prompt,
    answer: options(rng, artOf(result), arts),
    hints: ['Berechne zuerst die Größe des anderen Winkels.', 'Vergleiche dein Ergebnis mit 90° und 180°.'],
    steps: [term, ...(result === 90 || result === 180 ? [] : [`${fmtAngle(result)} ${SIZE[artOf(result)]}.`]), `Das ist ein ${LABEL[artOf(result)]}.`],
    praise: rng.pick(['Du hast zuerst gerechnet und dann verglichen.', 'Du hast die Winkelart aus der Rechnung bestimmt.']),
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab, ctx: GenContext) => Exercise>> = {
  1: { 1: nameUsual, 2: nameFromNumber, 3: sizeForArt },
  2: { 1: nameTurned, 2: nameParts, 3: compareArms },
  3: { 1: (rng, ab, ctx) => (ctx.ranges.maxAngle === 360 ? nameAll(rng, ab) : nameNearBorder(rng, ab)), 2: bands, 3: multiples },
};

export const winkelArtenSkill: SkillDef = {
  ...SKILL,
  title: 'Winkelarten',
  description: 'Du erkennst spitze, rechte, stumpfe und gestreckte Winkel.',
  stufen: {
    1: 'Spitz, recht, stumpf und gestreckt in gewohnter Lage',
    2: 'Gedrehte Winkel, andere Schenkel; Scheitel und Schenkel benennen',
    3: 'Überstumpfe Winkel; Vergleich mit 45°, 90° und 180°',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab, ctx);
  },
};
