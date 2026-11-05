/**
 * Zustand und Änderung (docs/research.md §6). Stufe 1: rises or falls, stays on one side of the 0. Stufe 2: crossing the 0. Stufe 3: find the change.
 * The worked steps count over the 0 as states and changes; under integersAsStates (§2.5) no calculating line with signs follows them.
 */
import { fmt, fmtQty, fmtSigned, fmtTemp } from '../../core/format';
import type { Ab, Bug, Rng, SkillDef, Step, Stufe } from '../../core/types';
import { numberBugs, signedNumber, targetAb } from '../shared';
import { assemble, bug, esBleiben, type Form, grad, KMK_ZAHLEN, say, sindEs, thermometerFor } from './helpers';

const SKILL = { id: 'ganzzahlen.aenderungen', topicId: 'ganzzahlen' } as const;

const DIRECTION = 'Achte auf die Richtung: nach oben oder nach unten?';
const SIGN_RULE = 'Minus heißt kälter, plus heißt wärmer.';
const ZERO_STOP = 'Du bist erst bei 0. Geh die restlichen Schritte weiter.';
/** A temperature stays believable, and on a thermometer with one tick per Grad. */
const TEMP_LIMIT = 18;
/** The largest change of a temperature within a day. */
const DAY_SWING = 20;

type Show = (n: number) => string;

function stateBugs(a: number, d: number, show: Show): Bug[] {
  const e = a + d;
  const crossing = a * e < 0;
  return numberBugs([
    bug('vorzeichen-vergessen', -e, e < 0 ? 'Der neue Stand liegt unter 0. Dort schreibst du ein Minus.' : 'Der neue Stand liegt über 0. Dort steht kein Minus.'),
    a < 0 && d < 0
      ? bug('unter-null-weiter', a - d, `${show(a)} ist schon unter 0. Beim Fallen geht es weiter nach unten.`)
      : bug('richtung', a - d, DIRECTION),
    a < 0 && d > 0 && bug('vorzeichen-ignoriert', -a + d, `Starte bei ${show(a)} und geh nach oben.`),
    crossing && bug('null-stopp', 0, ZERO_STOP),
  ], e, true);
}

/** Over the 0 in two pieces, or on one side in one. */
function walk(a: number, d: number, show: Show, unit: Show, calc: boolean): string[] {
  const e = a + d;
  const dir = d > 0 ? 'nach oben' : 'nach unten';
  const line = calc ? [`Als Rechnung: ${fmt(a)} ${d > 0 ? '+' : '−'} ${fmt(Math.abs(d))} = ${fmt(e)}`] : [];
  if (a * e >= 0) return [`Start: ${show(a)}.`, `${unit(Math.abs(d))} ${dir}: ${show(e)}.`, ...line];
  const toZero = Math.abs(a);
  const rest = Math.abs(d) - toZero;
  return [`Von ${show(a)} bis 0 ${sindEs(toZero, unit)}.`, esBleiben(rest, unit), `Von 0 noch ${unit(rest)} ${dir}: ${show(e)}.`, ...line];
}

// ─── Stufe 1: one side of the 0 ──────────────────────────────────────────────

function oneSide(rng: Rng, max: number): { a: number; d: number } {
  const size = rng.int(3, Math.min(max, TEMP_LIMIT - 1));
  // the end stays on the same side and away from 0: a step away from the 0, or one back towards it
  const away = rng.chance(0.5) ? rng.int(1, Math.min(max, TEMP_LIMIT - size)) : -rng.int(1, size - 1);
  return rng.chance(0.7) ? { a: -size, d: -away } : { a: size, d: away };
}

/** The task's thermometer shows only the start: an arrow would end on the labelled tick of the answer (and over the 0 skip the crossing). The worked step draws it. */
function tempForm(a: number, d: number, keyPart: string, calc: boolean): Form {
  const e = a + d;
  const crossing = a * e < 0;
  const [first, ...rest] = walk(a, d, fmtTemp, grad, calc);
  const steps: Step[] = [{ text: first, visual: thermometerFor([a, e], a, d) }, ...rest];
  const context = `Das Thermometer zeigt ${fmtTemp(a)}. Die Temperatur ${d > 0 ? 'steigt' : 'fällt'} um ${grad(Math.abs(d))}.`;
  const prompt = 'Welche Temperatur zeigt das Thermometer jetzt?';
  return {
    key: `${keyPart}:${a}:${d}`,
    context,
    prompt,
    visual: thermometerFor([a, e], a),
    answer: signedNumber(e, { unit: '°C' }),
    hints: crossing ? ['Geh zuerst bis zur 0.', 'Geh dann den Rest der Änderung weiter.'] : [DIRECTION, 'Zähle die Grad am Thermometer ab.'],
    steps,
    bugs: stateBugs(a, d, fmtTemp),
    praise: crossing ? 'Du bist über die 0 hinaus weitergegangen.' : 'Du hast die Richtung am Thermometer beachtet.',
    srText: say(context, prompt),
  };
}

function divingForm(rng: Rng, calc: boolean): Form {
  const a = -5 * rng.int(3, 20);
  const up = rng.chance(0.4);
  const d = up ? 5 * rng.int(1, -a / 5 - 1) : -5 * rng.int(1, 12);
  const e = a + d;
  const metres: Show = (n) => fmtQty(n, 'm');
  const context = `Ein U-Boot fährt bei ${metres(a)}. Das U-Boot ${up ? 'steigt' : 'taucht'} ${metres(Math.abs(d))} ${up ? 'nach oben' : 'tiefer'}.`;
  const prompt = 'Auf welcher Höhe fährt das U-Boot jetzt?';
  return {
    key: `uboot:${a}:${d}`,
    context,
    prompt,
    answer: signedNumber(e, { unit: 'm' }),
    hints: [DIRECTION, 'Tiefer heißt: weiter unter 0.'],
    steps: walk(a, d, metres, metres, calc),
    bugs: stateBugs(a, d, metres),
    praise: 'Du hast die Richtung im Text beachtet.',
    srText: say(context, prompt),
    kmk: ['PK.modellieren'],
  };
}

/** Backwards: the later state and the difference are given. T13: "kälter" here asks for an addition. */
function backwards(a: number, d: number, keyPart: string, calc: boolean): Form {
  const e = a + d;
  const crossing = a * e < 0;
  const context = d < 0
    ? `Am Abend ist es ${grad(-d)} kälter als am Morgen. Am Abend zeigt das Thermometer ${fmtTemp(e)}.`
    : `Am Abend ist es ${grad(d)} wärmer als am Morgen. Am Abend zeigt das Thermometer ${fmtTemp(e)}.`;
  const prompt = 'Welche Temperatur zeigt das Thermometer am Morgen?';
  return {
    key: `${keyPart}:${a}:${d}`,
    context,
    prompt,
    answer: signedNumber(a, { unit: '°C' }),
    hints: ['Geh vom Abend zurück zum Morgen.', d < 0 ? 'Am Morgen ist es wärmer als am Abend.' : 'Am Morgen ist es kälter als am Abend.'],
    steps: [...walk(e, -d, fmtTemp, grad, calc), `Am Morgen zeigt das Thermometer ${fmtTemp(a)}.`].slice(0, 5),
    bugs: numberBugs([
      bug('richtung', e + d, d < 0 ? 'Am Morgen ist es wärmer. Geh am Thermometer nach oben.' : 'Am Morgen ist es kälter. Geh am Thermometer nach unten.'),
      bug('vorzeichen-vergessen', -a, a < 0 ? 'Der Stand am Morgen liegt unter 0. Dort schreibst du ein Minus.' : 'Der Stand am Morgen liegt über 0. Dort steht kein Minus.'),
      crossing && bug('null-stopp', 0, ZERO_STOP),
    ], a, true),
    praise: 'Du bist vom Abend zum Morgen zurückgegangen.',
    srText: say(context, prompt),
    kmk: ['PK.problemloesen'],
  };
}

function stufe1(rng: Rng, ab: Ab, calc: boolean): Form {
  if (ab === 1) {
    const { a, d } = oneSide(rng, 9);
    return tempForm(a, d, 'nah', calc);
  }
  if (ab === 2) {
    if (rng.chance(0.5)) return divingForm(rng, calc);
    const { a, d } = oneSide(rng, 18);
    return tempForm(a, d, 'weit', calc);
  }
  const { a, d } = oneSide(rng, 15);
  return backwards(a, d, 'zurueck', calc);
}

// ─── Stufe 2: over the 0 ─────────────────────────────────────────────────────

function crossing(rng: Rng, max: number): { a: number; d: number } {
  const start = rng.int(1, max);
  const over = rng.int(1, Math.min(max, DAY_SWING - start));
  return rng.chance(0.65) ? { a: -start, d: start + over } : { a: start, d: -(start + over) };
}

function liftForm(rng: Rng, calc: boolean): Form {
  const start = rng.int(2, 4);
  const d = start + rng.int(1, 9);
  const a = -start;
  const e = a + d;
  const floors: Show = (n) => `${fmt(n)} ${n === 1 ? 'Stockwerk' : 'Stockwerke'}`;
  const context = `Der Aufzug zeigt ${fmt(a)} an. Der Aufzug fährt ${floors(d)} nach oben.`;
  const prompt = 'Welche Zahl zeigt der Aufzug jetzt?';
  return {
    key: `aufzug:${a}:${d}`,
    context,
    prompt,
    answer: signedNumber(e),
    hints: ['Fahr zuerst bis zur 0, dem Erdgeschoss.', 'Fahr dann die restlichen Stockwerke weiter.'],
    steps: walk(a, d, fmt, floors, calc),
    bugs: stateBugs(a, d, fmt),
    praise: 'Du bist über das Erdgeschoss hinaus weitergefahren.',
    srText: say(context, prompt),
    kmk: ['PK.modellieren'],
  };
}

function accountForm(rng: Rng, calc: boolean): Form {
  const start = 10 * rng.int(2, 20);
  const d = start + 10 * rng.int(1, 15);
  const a = -start;
  const e = a + d;
  const euro: Show = (n) => fmtQty(n, '€');
  const context = `Ein Konto steht bei ${euro(a)}. Es kommen ${euro(d)} dazu.`;
  const prompt = 'Wie steht das Konto jetzt?';
  return {
    key: `konto:${a}:${d}`,
    context,
    prompt,
    answer: signedNumber(e, { unit: '€' }),
    hints: ['Fülle das Konto zuerst bis 0 auf.', 'Rechne dann mit dem Rest weiter.'],
    steps: walk(a, d, euro, euro, calc),
    bugs: stateBugs(a, d, euro),
    praise: 'Du hast das Konto zuerst bis 0 aufgefüllt.',
    srText: say(context, prompt),
    kmk: ['PK.modellieren'],
  };
}

function twoChanges(rng: Rng, calc: boolean): Form {
  const a = -rng.int(2, 9);
  const up = -a + rng.int(1, 9);
  const mid = a + up;
  const down = mid + rng.int(1, 8);
  const e = mid - down;
  const context = `Morgens zeigt das Thermometer ${fmtTemp(a)}. Bis mittags steigt die Temperatur um ${grad(up)}. Bis abends fällt die Temperatur um ${grad(down)}.`;
  const prompt = 'Welche Temperatur zeigt das Thermometer am Abend?';
  return {
    key: `zwei:${a}:${up}:${down}`,
    context,
    prompt,
    answer: signedNumber(e, { unit: '°C' }),
    hints: ['Rechne Schritt für Schritt: zuerst bis mittags.', 'Geh dann von mittags aus nach unten, über die 0 hinaus.'],
    steps: [
      `Morgens: ${fmtTemp(a)}.`,
      `${grad(up)} nach oben: mittags ${fmtTemp(mid)}.`,
      `${grad(down)} nach unten: abends ${fmtTemp(e)}.`,
      ...(calc ? [`Als Rechnung: ${fmt(a)} + ${up} − ${down} = ${fmt(e)}`] : []),
    ],
    bugs: numberBugs([
      bug('vorzeichen-vergessen', -e, 'Der neue Stand liegt unter 0. Dort schreibst du ein Minus.'),
      bug('vorzeichen-ignoriert', -a + up - down, `Starte bei ${fmtTemp(a)}. Dieser Stand liegt unter 0.`),
      bug('zwischenstand', mid, 'Das ist der Stand am Mittag. Die Temperatur fällt danach noch.'),
    ], e, true),
    praise: 'Du hast die Änderungen der Reihe nach gerechnet.',
    srText: say(context, prompt),
    kmk: ['PK.modellieren'],
  };
}

function stufe2(rng: Rng, ab: Ab, calc: boolean): Form {
  if (ab === 1) {
    const { a, d } = crossing(rng, 8);
    return tempForm(a, d, 'nah', calc);
  }
  if (ab === 2) {
    const kind = rng.int(0, 2);
    if (kind === 0) {
      const { a, d } = crossing(rng, 12);
      return tempForm(a, d, 'weit', calc);
    }
    return kind === 1 ? liftForm(rng, calc) : accountForm(rng, calc);
  }
  if (rng.chance(0.5)) return twoChanges(rng, calc);
  const { a, d } = crossing(rng, 10);
  return backwards(a, d, 'zurueck', calc);
}

// ─── Stufe 3: find the change ────────────────────────────────────────────────

function changeSteps(a: number, e: number, show: Show, unit: Show, calc: boolean): string[] {
  const size = unit(Math.abs(e - a));
  const line = calc ? [`Als Rechnung: ${fmt(e)} − ${fmtSigned(a)} = ${fmt(e - a)}`] : [];
  if (a * e < 0) return [`Von ${show(a)} bis 0 ${sindEs(Math.abs(a), unit)}.`, `Von 0 bis ${show(e)} ${sindEs(Math.abs(e), unit)}.`, `Zusammen: ${size}.`, ...line];
  return [`Von ${show(a)} bis ${show(e)} ${sindEs(Math.abs(e - a), unit)}.`, ...line];
}

function changeBugs(a: number, e: number, value: number, withSign: boolean): Bug[] {
  return numberBugs([
    a * e < 0 && bug('aenderung-zustand', Math.abs(Math.abs(e) - Math.abs(a)), 'Zähle zuerst bis 0. Geh dann weiter bis zum zweiten Stand.'),
    a * e > 0 && bug('aenderung-zustand', Math.abs(a) + Math.abs(e), 'Beide Stände liegen auf derselben Seite der 0. Zähle von einem zum anderen.'),
    bug('nur-endstand', e, 'Das ist der zweite Stand. Gesucht ist der Weg dorthin.'),
    withSign && bug('aenderung-vorzeichen', -value, e < a ? 'Der Stand fällt. Die Änderung ist negativ.' : 'Der Stand steigt. Die Änderung ist positiv.'),
  ], value, true);
}

/** Two different temperatures of one day: over the 0 in either direction, or both below it. */
function pickStates(rng: Rng, max: number): [number, number] {
  if (rng.chance(0.5)) {
    const { a, d } = crossing(rng, max);
    return [a, a + d];
  }
  const a = rng.int(1, max);
  const b = rng.int(1, max);
  const c = a === b ? a + 2 : b;
  return rng.chance(0.5) ? [-a, -c] : [-c, -a];
}

/** Two stops of a lift in metres: a few cellars below the 0, a tall building above it. */
function liftStates(rng: Rng): [number, number] {
  const below = -5 * rng.int(1, 4);
  const kind = rng.int(0, 2);
  if (kind === 0) return [below, 5 * rng.int(1, 20)];
  if (kind === 1) return [5 * rng.int(1, 20), below];
  return [below, below === -20 ? -5 : below - 5];
}

/** Over the 0, and the question reversed: Stufe 2 gives the change and asks for the state, this form gives both states and asks for the change. */
function sizeOfChange(rng: Rng): Form {
  const { a, d } = crossing(rng, 12);
  const e = a + d;
  const size = Math.abs(d);
  const context = `Das Thermometer zeigt zuerst ${fmtTemp(a)} und dann ${fmtTemp(e)}.`;
  const prompt = `Um wie viel Grad ${e > a ? 'steigt' : 'fällt'} die Temperatur?`;
  return {
    key: `wie-viel:${a}:${e}`,
    context,
    prompt,
    visual: thermometerFor([a, e], a),
    answer: signedNumber(size, { unit: 'Grad' }),
    hints: ['Zähle am Thermometer vom ersten zum zweiten Stand.', 'Zähle in zwei Stücken: zuerst bis zur 0.'],
    steps: changeSteps(a, e, fmtTemp, grad, false),
    bugs: changeBugs(a, e, size, false),
    praise: 'Du hast den Weg von Stand zu Stand gezählt.',
    srText: say(context, prompt),
  };
}

function signedChange(rng: Rng, calc: boolean): Form {
  const heights = rng.chance(0.4);
  const [a, e] = heights ? liftStates(rng) : pickStates(rng, 15);
  const d = e - a;
  const show: Show = heights ? (n) => fmtQty(n, 'm') : fmtTemp;
  const unit: Show = heights ? (n) => fmtQty(n, 'm') : grad;
  const context = heights
    ? `Ein Aufzug ist zuerst bei ${show(a)} und dann bei ${show(e)}. Minus heißt nach unten, plus heißt nach oben.`
    : `Am Morgen zeigt das Thermometer ${show(a)}, am Abend ${show(e)}. ${SIGN_RULE}`;
  const prompt = 'Wie groß ist die Änderung?';
  return {
    key: `mit-vorzeichen:${heights ? 'm' : 'c'}:${a}:${e}`,
    context,
    prompt,
    answer: signedNumber(d, { unit: heights ? 'm' : 'Grad' }),
    hints: ['Wie weit ist es vom ersten zum zweiten Stand?', 'Geht es nach oben oder nach unten? Das sagt Plus oder Minus.'],
    steps: [...changeSteps(a, e, show, unit, calc), `Die Änderung ist ${unit(d)}.`].slice(0, 5),
    bugs: changeBugs(a, e, d, true),
    praise: 'Du hast Größe und Richtung der Änderung angegeben.',
    srText: say(context, prompt),
  };
}

const DAYS = ['Mo', 'Di', 'Mi', 'Do'];
const DAYS_SPOKEN = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag'];

function strongestChange(rng: Rng): Form {
  const temps = [-rng.int(1, 9), rng.int(1, 8), -rng.int(1, 12), rng.int(1, 6)];
  const before = temps.slice(1).map((t, i) => Math.abs(t - temps[i]));
  // one strongest change only: raise the last day above a tie
  const top = Math.max(...before);
  if (before.filter((c) => c === top).length > 1) temps[3] = temps[2] + top + 3;
  const changes = temps.slice(1).map((t, i) => Math.abs(t - temps[i]));
  const strongest = Math.max(...changes);
  const where = changes.indexOf(strongest);
  const context = 'Die Tabelle zeigt die Temperatur an vier Tagen.';
  const prompt = 'Wie viel Grad beträgt die stärkste Änderung von einem Tag zum nächsten?';
  return {
    key: `tabelle:${temps.join(':')}`,
    context,
    prompt,
    // one row per day: five columns would overflow a 375 px phone, with no cue that the last day is out of view
    visual: { type: 'table', header: ['Tag', 'Temperatur'], rows: DAYS.map((day, i) => [day, fmtTemp(temps[i])]) },
    answer: signedNumber(strongest, { unit: 'Grad' }),
    hints: ['Rechne für je zwei Nachbartage den Weg aus.', 'Liegt die 0 dazwischen? Dann zähle in zwei Stücken.'],
    steps: [
      `${DAYS[0]} bis ${DAYS[1]}: ${grad(changes[0])}`,
      `${DAYS[1]} bis ${DAYS[2]}: ${grad(changes[1])}`,
      `${DAYS[2]} bis ${DAYS[3]}: ${grad(changes[2])}`,
      `Am stärksten von ${DAYS[where]} bis ${DAYS[where + 1]}: ${grad(strongest)}`,
    ],
    bugs: numberBugs([
      bug('aenderung-zustand', Math.abs(Math.abs(temps[where + 1]) - Math.abs(temps[where])), 'Zähle zuerst bis 0. Geh dann weiter bis zum zweiten Stand.'),
      bug('nur-endstand', Math.abs(temps[where + 1]), 'Das ist ein Stand. Gesucht ist der Weg von Tag zu Tag.'),
    ], strongest, true),
    praise: 'Du hast jede Änderung über die 0 gezählt.',
    srText: say(context, ...DAYS_SPOKEN.map((day, i) => `${day}: ${fmtTemp(temps[i])}`), prompt),
    kmk: ['PK.problemloesen'],
  };
}

function mountainForm(rng: Rng): Form {
  const top = 50 * rng.int(4, 50);
  const deep = 50 * rng.int(2, 18);
  const size = top + deep;
  const context = `Ein Gipfel liegt bei ${fmtQty(top, 'm')}. Der Grund eines Sees liegt bei ${fmtQty(-deep, 'm')}.`;
  const prompt = 'Wie viele Meter liegen dazwischen?';
  return {
    key: `gipfel:${top}:${deep}`,
    context,
    prompt,
    answer: signedNumber(size, { unit: 'm' }),
    hints: ['Geh vom See zuerst bis 0 m.', 'Geh dann von 0 m bis zum Gipfel.'],
    steps: [`Vom See bis 0 m: ${fmtQty(deep, 'm')}.`, `Von 0 m bis zum Gipfel: ${fmtQty(top, 'm')}.`, `Zusammen: ${fmtQty(size, 'm')}.`],
    bugs: numberBugs([
      bug('aenderung-zustand', Math.abs(top - deep), 'Der See liegt unter 0. Zähle die Meter bis 0 dazu.'),
      bug('nur-endstand', top, 'Das ist nur der Gipfel. Der See liegt noch tiefer.'),
    ], size, true),
    praise: 'Du hast die Meter über und unter 0 addiert.',
    srText: say(context, prompt),
    kmk: ['PK.modellieren'],
  };
}

function stufe3(rng: Rng, ab: Ab, calc: boolean): Form {
  if (ab === 1) return sizeOfChange(rng);
  if (ab === 2) return signedChange(rng, calc);
  return rng.chance(0.5) ? strongestChange(rng) : mountainForm(rng);
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab, calc: boolean) => Form> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const aenderungenSkill: SkillDef = {
  ...SKILL,
  title: 'Zustand und Änderung',
  description: 'Du beschreibst, wie sich eine Temperatur oder Höhe ändert.',
  stufen: { 1: 'Das Thermometer steigt oder fällt, bleibt auf einer Seite', 2: 'Über die 0: −3 °C steigt um 8 Grad', 3: 'Die Änderung finden: von −4 bis 6' },
  kmk: [...KMK_ZAHLEN, 'PK.modellieren', 'PK.problemloesen'],
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_ZAHLEN, FORMS[stufe](rng, ab, !ctx.ranges.integersAsStates));
  },
};
