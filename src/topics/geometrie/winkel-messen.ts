/**
 * Winkel messen (docs/research.md §6). Stufe 1 reads the Geodreieck in steps of 10°, Stufe 2 to the degree, with the choice of scale and an estimate.
 * Stufe 3 goes over 180° via 360°; a profile with maxAngle 180 stays below it, with short arms, the rest to 180° and a Fehlerdetektiv for the whole measuring.
 */
import { fmtAngle, toSpeech } from '../../core/format';
import type { Ab, Bug, Exercise, GenContext, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, numberBugs, pickPerson, targetAb } from '../shared';
import { angleVisual, beyondTolerance, clearReading, nearestFive, offTick, readableTool, toolVisual } from './helpers';

const SKILL = { id: 'geometrie.winkel-messen', topicId: 'geometrie' } as const;
const KMK = ['GM.winkel'];

const TICK_HINT = 'Schau nach: Wie viel Grad zählt ein kleiner Strich?';
const REST_HINT = 'Miss den kleinen Winkel. Rechne dann 360° minus dein Ergebnis.';
const WHOLE_TURN_HINT = 'Eine volle Drehung hat 360°, nicht 180°.';
const BASES = [20, 30, 45, 60, 75, 100, 120, 135, 150, 200, 225, 250, 300, 330];
const READ_HINTS = ['Die 0 liegt auf dem ersten Schenkel. Starte dort.', 'Folge dieser Skala bis zum zweiten Schenkel.'];

const scaleHint = (d: number) => (d < 90 ? 'Der Winkel ist spitz. Ein spitzer Winkel ist kleiner als 90°.' : 'Der Winkel ist stumpf. Ein stumpfer Winkel ist größer als 90°.');
const scaleBug = (d: number): Bug => ({ id: 'winkel-skala', match: 180 - d, hint: scaleHint(d) });
const tickBug = (match: number): Bug => ({ id: 'winkel-teilstrich', match, hint: TICK_HINT });
const degrees = (value: number, tolerance: number) => ({ kind: 'number' as const, value, unit: '°', tolerance });

/** The opening in words, near enough for an estimate within 10°: the voice has no picture to estimate from. */
function openingInWords(d: number): string {
  const part = (rest: number) => (rest < 37 ? 'ein Drittel einer Blattecke' : rest < 52 ? 'eine halbe Blattecke' : 'zwei Drittel einer Blattecke');
  return d < 90 ? `Die Öffnung ist ungefähr ${part(d)}.` : `Die Öffnung ist ungefähr eine Blattecke und noch ${part(d - 90)}.`;
}

/** Stufe 1, AB I and II: read a multiple of 20° (a number on the scale, the arm points at it) or an odd ten (between two numbers). */
function readTens(rng: Rng, ab: Ab): Exercise {
  const d = ab === 1 ? rng.pick([20, 40, 60, 80, 100, 120, 140, 160]) : rng.pick([10, 30, 50, 70, 110, 130, 150, 170]);
  return build(SKILL, 1, {
    key: `lesen:${d}`,
    ab,
    prompt: 'Lies den Winkel am Geodreieck ab.',
    visual: readableTool(d),
    answer: degrees(d, 0),
    hints: ab === 1 ? READ_HINTS : ['Der zweite Schenkel zeigt zwischen zwei Zahlen. Zähle die langen Striche.', ...READ_HINTS],
    steps: ['Die 0 liegt auf dem ersten Schenkel.', 'Folge dieser Skala bis zum zweiten Schenkel.', `Der Winkel misst ${fmtAngle(d)}.`],
    bugs: numberBugs([scaleBug(d), tickBug(d - 10), tickBug(d + 10)], d),
    praise: rng.pick(['Du hast an der Skala mit der 0 abgelesen.', 'Du hast die langen Striche genau gezählt.']),
    srText: toSpeech(`Ein Winkel mit dem Geodreieck: Die Mitte liegt am Scheitel, die 0 am ersten Schenkel. Der zweite Schenkel zeigt auf ${d} Grad. Lies den Winkel ab.`),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: someone read the other scale. The kind of angle shows it. */
function otherScale(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick([100, 110, 120, 130, 140, 150, 160, 170]);
  const { name } = pickPerson(rng);
  const shown = 180 - d;
  return build(SKILL, 1, {
    key: `skala:${d}:${name}`,
    ab,
    prompt: `${name} liest ${fmtAngle(shown)} ab. Der Winkel im Bild ist aber stumpf. Wie groß ist der Winkel?`,
    visual: readableTool(d),
    answer: degrees(d, 0),
    hints: ['Das Geodreieck hat zwei Skalen. Beide zählen von 0 bis 180.', 'Starte an der 0 auf dem ersten Schenkel.'],
    steps: [`${fmtAngle(shown)} ist kleiner als 90°. Das passt nicht zu einem stumpfen Winkel.`, 'An der anderen Skala liegt die 0 auf dem ersten Schenkel.', `Der Winkel misst ${fmtAngle(d)}.`],
    bugs: numberBugs([{ id: 'winkel-skala', match: shown, hint: scaleHint(d) }, tickBug(d - 10), tickBug(d + 10)], d),
    praise: 'Du hast die Skala mit der Winkelart geprüft.',
    srText: toSpeech(`${name} liest ${shown} Grad ab. Der Winkel im Bild ist aber stumpf. Der zweite Schenkel zeigt auf ${d} Grad. Wie groß ist der Winkel?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 2, AB I: read to the degree. */
function readOne(rng: Rng, ab: Ab): Exercise {
  const [d] = clearReading(rng, 12, 168, [0]);
  return build(SKILL, 2, {
    key: `grad:${d}`,
    ab,
    prompt: 'Lies den Winkel am Geodreieck auf 1° genau ab.',
    visual: toolVisual(d),
    answer: degrees(d, 1),
    hints: ['Ein kleiner Strich zählt 1°.', 'Geh zum Zehnerstrich davor. Zähle dann die kleinen Striche.'],
    steps: ['Die 0 liegt auf dem ersten Schenkel.', 'Ein kleiner Strich zählt 1°.', `Der Winkel misst ${fmtAngle(d)}.`],
    bugs: beyondTolerance([scaleBug(d), tickBug(nearestFive(d))], d, 1),
    praise: rng.pick(['Du hast die kleinen Striche einzeln gezählt.', 'Du hast auf 1° genau abgelesen.']),
    srText: toSpeech(`Ein Winkel mit dem Geodreieck: Die 0 liegt am ersten Schenkel. Der zweite Schenkel zeigt auf ${d} Grad. Lies den Winkel ab.`),
    kmk: KMK,
  });
}

/** Stufe 2, AB II: a turned angle, so the scale has to be chosen. */
function chooseScale(rng: Rng, ab: Ab): Exercise {
  const [d, base] = clearReading(rng, 22, 158, BASES);
  return build(SKILL, 2, {
    key: `gedreht:${d}:${base}`,
    ab,
    prompt: 'Die 0 liegt auf einem Schenkel. Nimm die passende Skala. Wie groß ist der Winkel?',
    visual: toolVisual(d, base),
    answer: degrees(d, 1),
    hints: ['Schätze zuerst: Ist der Winkel spitz oder stumpf?', 'Nimm die Skala mit der 0 auf dem Schenkel.'],
    steps: [`Der Winkel ist ${d < 90 ? 'spitz' : 'stumpf'}.`, 'Nimm die Skala mit der 0 auf dem Schenkel.', `Der Winkel misst ${fmtAngle(d)}.`],
    bugs: beyondTolerance([scaleBug(d), tickBug(nearestFive(d))], d, 1),
    praise: rng.pick(['Du hast die passende Skala gewählt.', 'Du hast deine Schätzung mit der Skala verglichen.']),
    srText: toSpeech(`Ein gedrehter Winkel mit dem Geodreieck: Die 0 liegt am ersten Schenkel. Der zweite Schenkel zeigt auf ${d} Grad. Wie groß ist der Winkel?`),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: estimate without the tool, up to 10° off. */
function estimate(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick([25, 30, 35, 40, 50, 55, 60, 65, 70, 110, 115, 120, 125, 130, 140, 145, 150, 155]);
  const base = rng.pick(BASES);
  return build(SKILL, 2, {
    key: `schaetzen:${d}:${base}`,
    ab,
    prompt: 'Schätze den Winkel ohne Geodreieck. Du darfst 10° danebenliegen.',
    visual: angleVisual(d, base),
    answer: degrees(d, 10),
    hints: ['Vergleiche mit einer Blattecke. Die Ecke misst 90°.', 'Die Hälfte einer Blattecke misst 45°.'],
    steps: ['Vergleiche den Winkel mit 45°, 90° und 135°.', `Der Winkel ist ${d < 90 ? 'spitz' : 'stumpf'}.`, `Der Winkel misst ungefähr ${fmtAngle(d)}.`],
    bugs: beyondTolerance([scaleBug(d)], d, 10),
    praise: rng.pick(['Du hast mit einer Blattecke verglichen.', 'Du hast zuerst die Winkelart bestimmt.']),
    srText: toSpeech(`Ein gedrehter Winkel. ${openingInWords(d)} Eine Blattecke misst 90 Grad. Schätze den Winkel in Grad. Du darfst 10 Grad danebenliegen.`),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** Stufe 3, AB I: the small angle is given, the large one goes round the other way. */
function largeFromSmall(rng: Rng, ab: Ab): Exercise {
  const small = rng.pick([20, 30, 40, 50, 60, 70, 80, 100, 110, 120, 130, 140, 150, 160]);
  const value = 360 - small;
  const base = rng.pick([0, ...BASES]);
  return build(SKILL, 3, {
    key: `gross:${small}:${base}`,
    ab,
    prompt: `Der kleine Winkel misst ${fmtAngle(small)}. Wie groß ist der große Winkel mit dem Bogen?`,
    visual: angleVisual(value, base),
    answer: degrees(value, 0),
    hints: ['Der kleine und der große Winkel ergeben zusammen eine volle Drehung.', 'Eine volle Drehung hat 360°.'],
    steps: ['Beide Winkel ergeben zusammen 360°.', `360° − ${fmtAngle(small)} = ${fmtAngle(value)}`, `Der große Winkel misst ${fmtAngle(value)}.`],
    bugs: numberBugs([{ id: 'ueberstumpf-rest', match: small, hint: REST_HINT }, { id: 'ueberstumpf-gerade', match: 180 - small, hint: WHOLE_TURN_HINT }, { id: 'ueberstumpf-gerade', match: 180 + small, hint: WHOLE_TURN_HINT }], value),
    praise: rng.pick(['Du hast von 360° aus gerechnet.', 'Du hast den kleinen Winkel von 360° abgezogen.']),
    srText: toSpeech(`Ein Winkel mit einem großen Bogen. Der kleine Winkel misst ${small} Grad. Wie groß ist der große Winkel mit dem Bogen?`),
    kmk: KMK,
  });
}

/** Stufe 3, AB II: read the small angle, then go via 360°. */
function largeFromTool(rng: Rng, ab: Ab): Exercise {
  const [small, base] = clearReading(rng, 22, 158, [0, ...BASES]);
  const value = 360 - small;
  return build(SKILL, 3, {
    key: `gross-lesen:${small}:${base}`,
    ab,
    prompt: 'Das Geodreieck zeigt den kleinen Winkel. Wie groß ist der überstumpfe Winkel außen herum?',
    visual: toolVisual(small, base),
    answer: degrees(value, 1),
    hints: [REST_HINT, 'Lies zuerst auf 1° genau ab.'],
    steps: [`Der kleine Winkel misst ${fmtAngle(small)}.`, `360° − ${fmtAngle(small)} = ${fmtAngle(value)}`, { text: `Der überstumpfe Winkel misst ${fmtAngle(value)}.`, visual: angleVisual(value, base) }],
    bugs: beyondTolerance([{ id: 'rest-abgelesen', match: small, hint: REST_HINT }, { id: 'ueberstumpf-gerade', match: 180 + small, hint: WHOLE_TURN_HINT }, { id: 'ueberstumpf-gerade', match: 180 - small, hint: WHOLE_TURN_HINT }, tickBug(360 - nearestFive(small))], value, 1),
    praise: rng.pick(['Du hast zuerst gemessen und dann von 360° abgezogen.', 'Du hast den Umweg über 360° genommen.']),
    srText: toSpeech(`Ein Winkel mit dem Geodreieck. Die 0 liegt am ersten Schenkel, der zweite Schenkel zeigt auf ${small} Grad. Wie groß ist der überstumpfe Winkel außen herum?`),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: reversed. The large angle is given. */
function smallFromLarge(rng: Rng, ab: Ab): Exercise {
  const large = offTick(rng, 192, 348);
  const value = 360 - large;
  const base = rng.pick([0, ...BASES]);
  return build(SKILL, 3, {
    key: `klein:${large}:${base}`,
    ab,
    prompt: `Der überstumpfe Winkel misst ${fmtAngle(large)}. Wie groß ist der kleine Winkel zwischen den Schenkeln?`,
    visual: angleVisual(large, base),
    answer: degrees(value, 0),
    hints: ['Beide Winkel ergeben zusammen eine volle Drehung.', 'Rechne von 360° aus.'],
    steps: ['Beide Winkel ergeben zusammen 360°.', `360° − ${fmtAngle(large)} = ${fmtAngle(value)}`, `Der kleine Winkel misst ${fmtAngle(value)}.`],
    bugs: numberBugs([{ id: 'ueberstumpf-gerade', match: large - 180, hint: WHOLE_TURN_HINT }], value),
    praise: 'Du hast den Rückweg über 360° gefunden.',
    srText: toSpeech(`Ein Winkel mit einem großen Bogen. Der überstumpfe Winkel misst ${large} Grad. Wie groß ist der kleine Winkel zwischen den Schenkeln?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 3 with maxAngle 180, AB I: the second arm stops just before the scale. A drawn arm covers about 2° at that distance, so 2° off counts as read. */
function shortArm(rng: Rng, ab: Ab): Exercise {
  const [d, base] = clearReading(rng, 92, 178, BASES, 0.8);
  return build(SKILL, 3, {
    key: `kurz:${d}:${base}`,
    ab,
    prompt: 'Der zweite Schenkel reicht nicht bis zur Skala. Wie groß ist der Winkel?',
    visual: toolVisual(d, base, { arm2: 0.8 }),
    answer: degrees(d, 2),
    hints: ['Verlängere den kurzen Schenkel im Kopf bis zur Skala.', 'Die Länge der Schenkel ändert den Winkel nicht.'],
    steps: ['Verlängere den Schenkel bis zur Skala.', 'Lies an der Skala mit der 0 auf dem ersten Schenkel ab.', `Der Winkel misst ${fmtAngle(d)}.`],
    bugs: beyondTolerance([scaleBug(d), tickBug(nearestFive(d))], d, 2),
    praise: 'Du hast den kurzen Schenkel im Kopf verlängert.',
    srText: toSpeech(`Ein gedrehter Winkel mit dem Geodreieck und einem kurzen Schenkel. Verlängert zeigt der Schenkel auf ${d} Grad. Wie groß ist der Winkel?`),
    kmk: KMK,
  });
}

/** Stufe 3 with maxAngle 180, AB II: read, then the rest to a gestreckter Winkel. */
function restTo180(rng: Rng, ab: Ab): Exercise {
  const [d, base] = clearReading(rng, 22, 158, BASES);
  const value = 180 - d;
  return build(SKILL, 3, {
    key: `rest:${d}:${base}`,
    ab,
    prompt: 'Lies den Winkel ab. Wie viel Grad fehlen noch bis zu einem gestreckten Winkel?',
    visual: toolVisual(d, base),
    answer: degrees(value, 1),
    hints: ['Ein gestreckter Winkel misst 180°.', 'Lies zuerst ab. Rechne dann von 180° aus.'],
    steps: [`Der Winkel misst ${fmtAngle(d)}.`, `180° − ${fmtAngle(d)} = ${fmtAngle(value)}`, `Es fehlen ${fmtAngle(value)}.`],
    bugs: beyondTolerance([{ id: 'rest-abgelesen', match: d, hint: 'Das ist der abgelesene Winkel. Rechne 180° minus diesen Wert.' }, tickBug(180 - nearestFive(d))], value, 1),
    praise: 'Du hast abgelesen und den Rest berechnet.',
    srText: toSpeech(`Ein gedrehter Winkel mit dem Geodreieck. Der zweite Schenkel zeigt auf ${d} Grad. Wie viel Grad fehlen noch bis zu einem gestreckten Winkel?`),
    kmk: KMK,
  });
}

type Slip = 'mitte' | 'skala' | 'strich' | 'keiner';

/** Stufe 3 with maxAngle 180, AB III: Fehlerdetektiv. A turned tool and a reading to the degree: placed badly, read on the other scale, 10° off, or all in order. */
function misplaced(rng: Rng, ab: Ab): Exercise {
  // Not close to 90°: there the other scale would look like a slip of a few strokes.
  const [d, base] = rng.chance(0.5) ? clearReading(rng, 22, 78, BASES) : clearReading(rng, 102, 158, BASES);
  const { name } = pickPerson(rng);
  const slip = rng.pick<Slip>(['mitte', 'skala', 'strich', 'keiner']);
  const toolOffset = { x: rng.pick([-26, -20, 20, 26]), y: rng.pick([-22, -16, 16, 22]) };
  const read = slip === 'skala' ? 180 - d : slip === 'strich' ? d + rng.pick([-10, 10]) : slip === 'mitte' ? d + rng.pick([-6, 6]) : d;
  const label: Record<Slip, string> = { mitte: 'Die Mitte liegt nicht auf dem Scheitel.', skala: `${name} hat an der anderen Skala abgelesen.`, strich: `${name} hat sich bei den Strichen verzählt.`, keiner: `${name} hat richtig gemessen.` };
  const readYourself = `Lies selbst an der Skala ab. Vergleiche mit ${fmtAngle(read)}.`;
  const why: Record<Slip, string> = { mitte: 'Der Punkt in der Mitte des Geodreiecks liegt auf dem Scheitel.', skala: `Ist der Winkel spitz oder stumpf? Passt ${fmtAngle(read)} dazu?`, strich: readYourself, keiner: slip === 'mitte' ? 'Leg die 0 auf einen Schenkel und die Mitte auf den Scheitel.' : readYourself };
  const slips: Slip[] = ['mitte', 'skala', 'strich', 'keiner'];
  const last: Record<Slip, string> = { mitte: 'In der Aufgabe liegt die Mitte nicht auf dem Scheitel.', skala: `${fmtAngle(read)} steht an der anderen Skala.`, strich: `${fmtAngle(read)} liegt 10° daneben.`, keiner: `${name} liest genau diesen Wert ab.` };
  const prompt = `Fehlerdetektiv: ${name} misst diesen Winkel und liest ${fmtAngle(read)} ab. Was stellst du fest?`;
  return build(SKILL, 3, {
    key: `detektiv:${slip}:${d}:${base}:${name}:${read}`,
    ab,
    prompt,
    visual: toolVisual(d, base, slip === 'mitte' ? { toolOffset } : {}),
    answer: makeChoice(rng, { label: label[slip] }, slips.filter((s) => s !== slip).map((s) => ({ label: label[s], whyWrong: why[s] })), { order: slips.map((s) => label[s]) }),
    hints: ['Schau zuerst auf den Punkt in der Mitte des Geodreiecks.', 'Lies dann selbst ab. Die 0 liegt auf dem ersten Schenkel.'],
    steps: slip === 'mitte'
      ? ['Die Mitte des Geodreiecks gehört auf den Scheitel.', { text: 'So liegt das Geodreieck richtig.', visual: toolVisual(d, base) }, last.mitte]
      : ['Die Mitte liegt auf dem Scheitel, die 0 auf dem ersten Schenkel.', `An dieser Skala zeigt der zweite Schenkel auf ${fmtAngle(d)}.`, last[slip]],
    praise: 'Du hast das Messen Schritt für Schritt geprüft.',
    srText: toSpeech(`${name} misst einen gedrehten Winkel und liest ${read} Grad ab. ${slip === 'mitte' ? 'Das Geodreieck liegt neben dem Scheitel.' : `Die Mitte des Geodreiecks liegt auf dem Scheitel, die 0 am ersten Schenkel. Der zweite Schenkel zeigt auf ${d} Grad.`} Was stellst du fest?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const FORMS: Record<1 | 2, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: readTens, 2: readTens, 3: otherScale },
  2: { 1: readOne, 2: chooseScale, 3: estimate },
};

function stufe3(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  if (ctx.ranges.maxAngle === 180) return ab === 1 ? shortArm(rng, ab) : ab === 2 ? restTo180(rng, ab) : misplaced(rng, ab);
  return ab === 1 ? largeFromSmall(rng, ab) : ab === 2 ? largeFromTool(rng, ab) : smallFromLarge(rng, ab);
}

export const winkelMessenSkill: SkillDef = {
  ...SKILL,
  title: 'Winkel messen',
  description: 'Du schätzt zuerst und liest dann am Geodreieck ab.',
  stufen: {
    1: 'Am Geodreieck ablesen, in Schritten von 10°, bis 180°',
    2: 'Auf 1° genau ablesen; Skala wählen; zuerst schätzen',
    3: 'Über 180° mit 360° rechnen; sonst Rest und Anlegen prüfen',
  },
  kmk: KMK,
  generate(rng, stufe: Stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return stufe === 3 ? stufe3(rng, ab, ctx) : FORMS[stufe][ab](rng, ab);
  },
};
