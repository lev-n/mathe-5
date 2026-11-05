/**
 * Winkel einstellen (docs/research.md §6): the angle input replaces free drawing. Stufe 1: multiples of 10° up to 180°. Stufe 2: any whole degree, with a
 * turned fixed arm. Stufe 3: over 180° and angles from a description; a profile with maxAngle 180 keeps the descriptions only.
 */
import { fmtAngle, toSpeech } from '../../core/format';
import type { Ab, AngleAnswer, Bug, Exercise, GenContext, Rng, SkillDef, Step, Stufe } from '../../core/types';
import { build, numberBugs, targetAb } from '../shared';
import { angleVisual, beyondTolerance, nearestFive, offTick, readableTool } from './helpers';

const SKILL = { id: 'geometrie.winkel-zeichnen', topicId: 'geometrie' } as const;
const KMK = ['GM.winkel'];

const BASES = [20, 30, 45, 60, 75, 90, 110, 120, 135, 150, 200, 225, 270, 300, 330];
const TOOL_HINT = 'Zeig das Geodreieck. Die 0 liegt auf dem festen Schenkel.';
const SCALE_HINT = 'Du hast an der anderen Skala gezählt. Starte an der 0 auf dem festen Schenkel.';
const TICK_HINT = 'Schau nach: Wie viel Grad zählt ein kleiner Strich?';

/** How the fixed arm lies: BASES has it upright too, and that is not schräg. */
const armPlace = (base: number) => (base % 180 === 90 ? 'steht senkrecht' : 'liegt schräg');

const scaleBug = (d: number): Bug => ({ id: 'winkel-skala', match: 180 - d, hint: SCALE_HINT });
const tickBug = (d: number): Bug => ({ id: 'winkel-teilstrich', match: nearestFive(d), hint: TICK_HINT });
const directionBug = (match: number, hint: string): Bug => ({ id: 'beschreibung-richtung', match, hint });

function angleAnswer(value: number, stufe: Stufe, baseRotation: number, ctx: GenContext): AngleAnswer {
  return { kind: 'angle', value, step: stufe === 1 ? 10 : 1, tolerance: stufe === 1 ? 0 : 1, max: stufe === 3 ? ctx.ranges.maxAngle : 180, baseRotation };
}

function setSteps(value: number, base: number): Step[] {
  return ['Die 0 liegt auf dem festen Schenkel.', value <= 180 ? 'Folge dieser Skala.' : 'Geh bis 180°. Geh dann noch weiter.', { text: `Der Winkel misst ${fmtAngle(value)}.`, visual: value <= 180 ? readableTool(value, base) : angleVisual(value, base) }];
}

/** Stufe 1, AB I and II: set a multiple of 10°, spitz or stumpf. */
function setTens(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const d = ab === 1 ? rng.pick([10, 20, 30, 40, 50, 60, 70, 80]) : rng.pick([100, 110, 120, 130, 140, 150, 160, 170]);
  const prompt = ab === 1 ? `Stell den Winkel ${fmtAngle(d)} ein.` : `Stell einen stumpfen Winkel von ${fmtAngle(d)} ein.`;
  return build(SKILL, 1, {
    key: `zehner:${d}`,
    ab,
    prompt,
    answer: angleAnswer(d, 1, 0, ctx),
    hints: [TOOL_HINT, d < 90 ? 'Der Winkel ist kleiner als eine Blattecke.' : 'Der Winkel ist größer als eine Blattecke.'],
    steps: setSteps(d, 0),
    bugs: numberBugs([scaleBug(d)], d),
    praise: rng.pick(['Du hast an der 0 auf dem festen Schenkel begonnen.', 'Du hast die passende Skala genutzt.']),
    srText: toSpeech(`Ein fester Schenkel ist gezeichnet. ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: the size follows from a rechter or gestreckter Winkel. */
function setDescribed(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const k = rng.pick([10, 20, 30, 40]);
  const form = rng.pick(['ueber90', 'unter90', 'unter180'] as const);
  const value = form === 'ueber90' ? 90 + k : form === 'unter90' ? 90 - k : 180 - k;
  const text = form === 'ueber90' ? `Der Winkel ist ${fmtAngle(k)} größer als ein rechter Winkel.` : form === 'unter90' ? `Der Winkel ist ${fmtAngle(k)} kleiner als ein rechter Winkel.` : `Der Winkel ist ${fmtAngle(k)} kleiner als ein gestreckter Winkel.`;
  const start = form === 'unter180' ? 180 : 90;
  const wrongWay = form === 'ueber90' ? 90 - k : start + k;
  return build(SKILL, 1, {
    key: `beschreibung:${form}:${k}`,
    ab,
    prompt: `${text} Stell den Winkel ein.`,
    answer: angleAnswer(value, 1, 0, ctx),
    hints: [form === 'unter180' ? 'Ein gestreckter Winkel misst 180°.' : 'Ein rechter Winkel misst 90°.', 'Rechne zuerst. Stell danach den Winkel ein.'],
    steps: [`${fmtAngle(start)} ${form === 'ueber90' ? '+' : '−'} ${fmtAngle(k)} = ${fmtAngle(value)}`, ...setSteps(value, 0).slice(2)],
    bugs: numberBugs([wrongWay <= 180 && directionBug(wrongWay, form === 'ueber90' ? `${fmtAngle(k)} größer heißt: Gib ${fmtAngle(k)} dazu.` : `${fmtAngle(k)} kleiner heißt: Nimm ${fmtAngle(k)} weg.`)], value),
    praise: 'Du hast den Winkel zuerst berechnet.',
    srText: toSpeech(`Ein fester Schenkel ist gezeichnet. ${text} Stell den Winkel ein.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Stufe 2, AB I and II: any whole degree; AB II turns the fixed arm. */
function setWhole(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const d = offTick(rng, 12, 168);
  const base = ab === 1 ? 0 : rng.pick(BASES);
  const prompt = ab === 1 ? `Stell den Winkel ${fmtAngle(d)} ein.` : `Der feste Schenkel ${armPlace(base)}. Stell den Winkel ${fmtAngle(d)} ein.`;
  return build(SKILL, 2, {
    key: `grad:${d}:${base}`,
    ab,
    prompt,
    answer: angleAnswer(d, 2, base, ctx),
    hints: [TOOL_HINT, 'Nutze die Knöpfe mit 10 und mit 1 für die letzten Schritte.'],
    steps: setSteps(d, base),
    bugs: beyondTolerance([scaleBug(d), tickBug(d)], d, 1),
    praise: rng.pick(['Du hast den Winkel Grad für Grad eingestellt.', base === 0 ? 'Du hast an der 0 begonnen.' : 'Du hast auch beim gedrehten Schenkel an der 0 begonnen.']),
    srText: toSpeech(`Ein fester Schenkel ist gezeichnet${base ? `, er ${armPlace(base)}` : ''}. Stell den Winkel ${d} Grad ein.`),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: a whole degree that follows from 90° or 180°, on a turned arm. */
function setNear(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const k = offTick(rng, 2, 38);
  const base = rng.pick(BASES);
  const form = rng.pick(['ueber90', 'unter90', 'unter180'] as const);
  const value = form === 'ueber90' ? 90 + k : form === 'unter90' ? 90 - k : 180 - k;
  const start = form === 'unter180' ? 180 : 90;
  const text = form === 'ueber90' ? `Der Winkel ist ${fmtAngle(k)} größer als ein rechter Winkel.` : form === 'unter90' ? `Der Winkel ist ${fmtAngle(k)} kleiner als ein rechter Winkel.` : `Der Winkel ist ${fmtAngle(k)} kleiner als ein gestreckter Winkel.`;
  const wrongWay = form === 'ueber90' ? 90 - k : start + k;
  return build(SKILL, 2, {
    key: `nah:${form}:${k}:${base}`,
    ab,
    prompt: `${text} Stell den Winkel ein.`,
    answer: angleAnswer(value, 2, base, ctx),
    hints: [form === 'unter180' ? 'Ein gestreckter Winkel misst 180°.' : 'Ein rechter Winkel misst 90°.', 'Rechne zuerst. Stell danach den Winkel ein.'],
    steps: [`${fmtAngle(start)} ${form === 'ueber90' ? '+' : '−'} ${fmtAngle(k)} = ${fmtAngle(value)}`, ...setSteps(value, base).slice(2)],
    bugs: beyondTolerance([wrongWay <= 180 && directionBug(wrongWay, form === 'ueber90' ? 'Größer heißt: Gib die Grad dazu.' : 'Kleiner heißt: Nimm die Grad weg.')], value, 1),
    praise: 'Du hast gerechnet und genau eingestellt.',
    srText: toSpeech(`Ein fester Schenkel ist gezeichnet, er ${armPlace(base)}. ${text} Stell den Winkel ein.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

const WHOLE_TURN_HINT = 'Eine volle Drehung hat 360°, nicht 180°.';
const OVER_HINTS = ['Das Geodreieck reicht bis 180°. Zähle danach weiter.', 'Der Bogen geht über die gerade Linie hinaus.'];

/** Stufe 3, AB I and II: over 180°; AB II on a turned arm. */
function setOver(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const d = offTick(rng, 192, 348);
  const base = ab === 1 ? 0 : rng.pick(BASES);
  const prompt = ab === 1 ? `Stell den überstumpfen Winkel ${fmtAngle(d)} ein.` : `Der feste Schenkel ${armPlace(base)}. Stell den überstumpfen Winkel ${fmtAngle(d)} ein.`;
  return build(SKILL, 3, {
    key: `ueber:${d}:${base}`,
    ab,
    prompt,
    answer: angleAnswer(d, 3, base, ctx),
    hints: OVER_HINTS,
    steps: [`${fmtAngle(d)} = 180° + ${fmtAngle(d - 180)}`, ...setSteps(d, base).slice(1)],
    bugs: beyondTolerance([{ id: 'ueberstumpf-rest', match: 360 - d, hint: 'Das ist der kleine Winkel. Der gesuchte Winkel geht außen herum.' }, { id: 'ueberstumpf-gerade', match: d - 180, hint: WHOLE_TURN_HINT }], d, 1),
    praise: rng.pick(['Du bist über die gerade Linie hinausgegangen.', 'Du hast den Winkel in zwei Teilen gedacht.']),
    srText: toSpeech(`Ein fester Schenkel ist gezeichnet${base ? `, er ${armPlace(base)}` : ''}. Stell den überstumpfen Winkel ${d} Grad ein.`),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: over 180° from a description. */
function setOverDescribed(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const k = offTick(rng, 12, 158);
  const toFull = rng.chance(0.5);
  const value = toFull ? 360 - k : 180 + k;
  const base = rng.pick([0, ...BASES]);
  const text = toFull ? `Bis zu einer vollen Drehung fehlen dem Winkel noch ${fmtAngle(k)}.` : `Der Winkel ist ${fmtAngle(k)} größer als ein gestreckter Winkel.`;
  const wrongWay = toFull ? k : 180 - k;
  return build(SKILL, 3, {
    key: `beschrieben:${toFull ? 'voll' : 'gestreckt'}:${k}:${base}`,
    ab,
    prompt: `${text} Stell den Winkel ein.`,
    answer: angleAnswer(value, 3, base, ctx),
    hints: [toFull ? 'Eine volle Drehung hat 360°.' : 'Ein gestreckter Winkel misst 180°.', 'Rechne zuerst. Stell danach den Winkel ein.'],
    steps: [toFull ? `360° − ${fmtAngle(k)} = ${fmtAngle(value)}` : `180° + ${fmtAngle(k)} = ${fmtAngle(value)}`, ...setSteps(value, base).slice(2)],
    bugs: beyondTolerance([directionBug(wrongWay, toFull ? 'Die Angabe nennt den Rest bis zur vollen Drehung. Rechne von 360° aus.' : 'Größer heißt: Gib die Grad dazu.')], value, 1),
    praise: 'Du hast den Winkel aus der Beschreibung berechnet.',
    srText: toSpeech(`Ein fester Schenkel ist gezeichnet. ${text} Stell den Winkel ein.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Stufe 3 with maxAngle 180: half of an angle. */
function setHalf(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const value = offTick(rng, 12, 88);
  const given = 2 * value;
  const base = rng.pick(BASES);
  const text = `Der Winkel ist halb so groß wie ${fmtAngle(given)}.`;
  return build(SKILL, 3, {
    key: `halb:${value}:${base}`,
    ab,
    prompt: `${text} Stell den Winkel ein.`,
    answer: angleAnswer(value, 3, base, ctx),
    hints: ['Halb so groß heißt: Teile durch 2.', 'Rechne zuerst. Stell danach den Winkel ein.'],
    steps: [`${fmtAngle(given)} : 2 = ${fmtAngle(value)}`, ...setSteps(value, base).slice(2)],
    bugs: beyondTolerance([directionBug(given, 'Das ist der ganze Winkel. Gesucht ist die Hälfte.'), scaleBug(value)], value, 1),
    praise: 'Du hast zuerst halbiert und dann eingestellt.',
    srText: toSpeech(`Ein fester Schenkel ist gezeichnet. ${text} Stell den Winkel ein.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Stufe 3 with maxAngle 180: two angles side by side. */
function setSum(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const a = offTick(rng, 12, 88);
  const b = offTick(rng, 12, 78);
  const value = a + b;
  const base = rng.pick(BASES);
  const text = `Zwei Winkel liegen nebeneinander: ${fmtAngle(a)} und ${fmtAngle(b)}.`;
  return build(SKILL, 3, {
    key: `summe:${a}.${b}:${base}`,
    ab,
    prompt: `${text} Stell den ganzen Winkel ein.`,
    answer: angleAnswer(value, 3, base, ctx),
    hints: ['Nebeneinander heißt: Beide Winkel zählen zusammen.', 'Rechne zuerst. Stell danach den Winkel ein.'],
    steps: [`${fmtAngle(a)} + ${fmtAngle(b)} = ${fmtAngle(value)}`, ...setSteps(value, base).slice(2)],
    bugs: beyondTolerance([a !== b && directionBug(Math.abs(a - b), 'Beide Winkel liegen nebeneinander. Rechne plus.')], value, 1),
    praise: 'Du hast beide Winkel addiert.',
    srText: toSpeech(`Ein fester Schenkel ist gezeichnet. ${text} Stell den ganzen Winkel ein.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Stufe 3 with maxAngle 180, AB III: two steps, unlike the one subtraction of Stufe 2. The angle that completes two others to a gestreckter Winkel. */
function setComplement(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const a = offTick(rng, 12, 58);
  const b = offTick(rng, 12, 58);
  const sum = a + b;
  const value = 180 - sum;
  const base = rng.pick(BASES);
  const text = `Zusammen mit ${fmtAngle(a)} und ${fmtAngle(b)} ergibt der Winkel einen gestreckten Winkel.`;
  const both = 'Zieh beide Winkel von 180° ab.';
  return build(SKILL, 3, {
    key: `ergaenzen:${a}.${b}:${base}`,
    ab,
    prompt: `${text} Stell den Winkel ein.`,
    answer: angleAnswer(value, 3, base, ctx),
    hints: ['Ein gestreckter Winkel misst 180°.', 'Addiere die zwei Winkel. Rechne dann von 180° aus.'],
    steps: [`${fmtAngle(a)} + ${fmtAngle(b)} = ${fmtAngle(sum)}`, `180° − ${fmtAngle(sum)} = ${fmtAngle(value)}`, ...setSteps(value, base).slice(2)],
    bugs: beyondTolerance([directionBug(180 - a, both), directionBug(180 - b, both), directionBug(sum, 'Das ist die Summe der zwei Winkel. Gesucht ist der Rest bis 180°.')], value, 1),
    praise: 'Du hast addiert und dann den Rest bis 180° berechnet.',
    srText: toSpeech(`Ein fester Schenkel ist gezeichnet. ${text} Stell den Winkel ein.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

export const winkelZeichnenSkill: SkillDef = {
  ...SKILL,
  title: 'Winkel einstellen',
  description: 'Du stellst einen vorgegebenen Winkel genau ein.',
  stufen: {
    1: 'Vielfache von 10° bis 180° einstellen',
    2: 'Jeden ganzen Grad bis 180°, auch mit schrägem Schenkel',
    3: 'Über 180°; Winkel aus einer Beschreibung einstellen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 3 ? setDescribed(rng, ab, ctx) : setTens(rng, ab, ctx);
    if (stufe === 2) return ab === 3 ? setNear(rng, ab, ctx) : setWhole(rng, ab, ctx);
    if (ctx.ranges.maxAngle === 180) return ab === 1 ? setHalf(rng, ab, ctx) : ab === 2 ? setSum(rng, ab, ctx) : setComplement(rng, ab, ctx);
    return ab === 3 ? setOverDescribed(rng, ab, ctx) : setOver(rng, ab, ctx);
  },
};
