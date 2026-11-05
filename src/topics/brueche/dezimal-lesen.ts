/**
 * Dezimalzahlen lesen: the Stellentafel goes on to the right of the comma, and Dezimalzahlen and Brüche are two ways to write one value.
 * Stufe 1 (Zehntel, Hundertstel, 0,7 as a fraction): AB I read the table, AB II write as a fraction, AB III from words, or the digit at a place.
 * Stufe 2 (Tausendstel, Nenner 10, 100, 1000): AB I read the table, AB II from the fraction, AB III back to the fraction in Tausendstel, or count Tausendstel.
 * Stufe 3 (inner zeros, ¼ and ¾): AB I inner zeros, AB II ¼ and ¾, also in a mixed number, AB III an inner zero or 0,25 and 0,75 back to the fraction, also fully reduced.
 * The comma key holds for the whole skill, so every number answer sets decimals.
 */
import { BOX, fmt, frac } from '../../core/format';
import type { Ab, PlaceColumn, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, fractionBugs, safeHints, speak } from '../shared';
import { byStufeAndAb, lowest, typedBugs, valueBugs, type Form } from './helpers';

const SKILL = { id: 'brueche.dezimal-lesen', topicId: 'brueche' } as const;
const KMK = ['ZO.dezimalzahlen'];
const DECIMALS = 3;

const COLUMNS: readonly PlaceColumn[] = ['z', 'h', 't'];
const PLACE_WORD = ['Zehntel', 'Hundertstel', 'Tausendstel'] as const;
const PLACE_IN = ['Zehnteln', 'Hundertsteln', 'Tausendsteln'] as const;

/** Digits after the comma as one number: places 2, digits [3, 5] → 0,35. */
const toValue = (whole: number, digits: readonly number[]) => whole + digits.reduce((sum, x, i) => sum + x * 10 ** (DECIMALS - 1 - i), 0) / 10 ** DECIMALS;
const asInt = (digits: readonly number[]) => digits.reduce((sum, x) => sum * 10 + x, 0);
const nonZero = (rng: Rng) => rng.int(1, 9);

function table(whole: number, digits: readonly number[]): Visual {
  return { type: 'placeValue', columns: ['E', ...COLUMNS.slice(0, digits.length)], rows: [{ values: [whole, ...digits.map((x) => (x === 0 ? null : x))] }] };
}

const tableSpeech = (whole: number, digits: readonly number[]) => `In der Stellentafel stehen ${whole} Einer, ${digits.map((x, i) => (x === 0 ? `keine ${PLACE_WORD[i]}` : `${x} ${PLACE_WORD[i]}`)).join(', ')}.`;

/** Read a number off the Stellentafel. */
function readTable(makeDigits: (rng: Rng) => number[], maxWhole: number): Form {
  return (rng, stufe, ab) => {
    const whole = rng.int(0, maxWhole);
    const digits = makeDigits(rng);
    const value = toValue(whole, digits);
    const prompt = 'Welche Dezimalzahl steht in der Stellentafel?';
    const zero = digits.findIndex((x) => x === 0);
    // the digit a dropped zero pushes to the wrong place: 9,205 read as 9,25 is about the 5, and the zeros go right before it
    const pushed = digits.findIndex((x, i) => x !== 0 && i > zero);
    return build(SKILL, stufe, {
      key: `tafel:${whole}:${digits.join('')}`,
      ab,
      prompt,
      visual: table(whole, digits),
      answer: { kind: 'number', value, decimals: DECIMALS, label: 'Dezimalzahl' },
      hints: ['Das Komma steht zwischen den Einern und den Zehnteln.', zero >= 0 ? 'Eine leere Stelle bekommt eine 0.' : 'Schreibe die Ziffern der Reihe nach, von links nach rechts.'],
      steps: [`Vor dem Komma: ${whole} Einer`, `Nach dem Komma: ${digits.map((x, i) => `${x} ${PLACE_WORD[i]}`).join(', ')}`, `Die Zahl ist ${fmt(value, digits.length)}.`],
      bugs: typedBugs([
        { id: 'ohne-komma', match: whole * 10 ** digits.length + asInt(digits), hint: 'Das Komma steht zwischen den Einern und den Zehnteln.' },
        zero >= 0 && pushed >= 0 && { id: 'null-vergessen', match: whole + Number(`0.${digits.filter((x) => x !== 0).join('')}`), hint: `Die ${digits[pushed]} steht bei den ${PLACE_IN[pushed]}. Schreib ${pushed - zero === 1 ? 'die 0' : 'die beiden Nullen'} davor.` },
      ], value, DECIMALS),
      praise: zero >= 0 ? 'Du hast die leere Stelle mit einer 0 gefüllt.' : 'Du hast das Komma an die richtige Stelle gesetzt.',
      srText: speak(`${prompt} ${tableSpeech(whole, digits)}`),
      kmk: KMK,
    });
  };
}

const twoDigits = (rng: Rng) => (rng.chance(0.4) ? [nonZero(rng)] : [nonZero(rng), nonZero(rng)]);
const threeDigits = (rng: Rng) => [nonZero(rng), nonZero(rng), nonZero(rng)];
const innerZeros = (rng: Rng) => rng.pick([[0, nonZero(rng)], [0, 0, nonZero(rng)], [nonZero(rng), 0, nonZero(rng)], [0, nonZero(rng), nonZero(rng)]]);

/** Stufe 1, AB II: 0,7 as a fraction. */
const asFraction: Form = (rng, stufe, ab) => {
  const digits = twoDigits(rng);
  const value = toValue(0, digits);
  const n = asInt(digits);
  const d = 10 ** digits.length;
  const prompt = `Schreibe ${fmt(value, digits.length)} als Bruch.`;
  const correct = { numerator: n, denominator: d };
  return build(SKILL, stufe, {
    key: `bruch:${digits.join('')}`,
    ab,
    prompt,
    answer: { kind: 'fraction', ...correct, accept: 'equivalent' },
    hints: ['Wie viele Stellen stehen nach dem Komma?', digits.length === 1 ? 'Eine Stelle nach dem Komma: Das sind Zehntel.' : 'Zwei Stellen nach dem Komma: Das sind Hundertstel.'],
    steps: [`${fmt(value, digits.length)} hat ${digits.length === 1 ? 'eine Stelle' : 'zwei Stellen'} nach dem Komma.`, `Der Nenner ist ${d}, der Zähler ${n}.`, `${fmt(value, digits.length)} = ${frac(n, d)}`],
    bugs: valueBugs([
      digits.length === 1 && { id: 'null-stelle', match: { numerator: n, denominator: 100 }, hint: `Die ${n} steht bei den Zehnteln, nicht bei den Hundertsteln.` },
      digits.length === 2 && { id: 'null-stelle', match: { numerator: n, denominator: 10 }, hint: 'Zwei Stellen nach dem Komma: Der Nenner ist 100.' },
      { id: 'bruch-komma', match: { numerator: 1, denominator: n }, hint: 'Die Ziffern nach dem Komma bilden den Zähler.' },
    ], correct),
    praise: 'Du hast den Nenner an den Stellen abgelesen.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

/** Stufe 1, AB III: from words to the Dezimalzahl, the order of the places is not always the order of the digits. */
const fromWords: Form = (rng, stufe, ab) => {
  const z = nonZero(rng);
  const h = rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== z));
  const swap = rng.chance(0.6);
  const value = toValue(0, [z, h]);
  const words = swap ? `${h} Hundertstel und ${z} Zehntel` : `${z} Zehntel und ${h} Hundertstel`;
  const prompt = `Schreibe als Dezimalzahl: ${words}.`;
  return build(SKILL, stufe, {
    key: `worte:${z}${h}:${swap ? 's' : 'g'}`,
    ab,
    prompt,
    answer: { kind: 'number', value, decimals: DECIMALS, label: 'Dezimalzahl' },
    hints: ['Zehntel stehen direkt nach dem Komma.', 'Hundertstel stehen an der zweiten Stelle nach dem Komma.'],
    steps: [`${z} Zehntel: erste Stelle nach dem Komma`, `${h} Hundertstel: zweite Stelle nach dem Komma`, `Die Zahl ist ${fmt(value, 2)}.`],
    bugs: typedBugs([
      { id: 'reihenfolge', match: toValue(0, [h, z]), hint: 'Die Zehntel stehen zuerst. Achte auf die Namen, nicht auf die Reihenfolge.' },
      { id: 'ohne-komma', match: asInt([z, h]), hint: 'Vor dem Komma steht hier eine 0.' },
    ], value, DECIMALS),
    praise: 'Du hast nach den Namen der Stellen geschrieben.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** Stufe 1, AB III: the digit at a place. */
const digitAtPlace: Form = (rng, stufe, ab) => {
  const whole = rng.int(1, 9);
  const z = nonZero(rng);
  const h = rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== z && x !== whole));
  const asked = rng.pick([0, 1] as const);
  const digit = asked === 0 ? z : h;
  const other = asked === 0 ? h : z;
  const shown = fmt(toValue(whole, [z, h]), 2);
  const prompt = `Welche Ziffer steht in ${shown} bei den ${PLACE_IN[asked]}?`;
  return build(SKILL, stufe, {
    key: `ziffer:${whole}${z}${h}:${asked}`,
    ab,
    prompt,
    answer: { kind: 'number', value: digit, decimals: DECIMALS, label: 'Ziffer' },
    hints: ['Zähle die Stellen ab dem Komma nach rechts.', 'Die erste Stelle sind die Zehntel, die zweite die Hundertstel.'],
    steps: [`In ${shown} stehen ${z} Zehntel und ${h} Hundertstel.`, `Die Ziffer ist ${digit}.`],
    bugs: typedBugs([{ id: 'stelle-verwechselt', match: other, hint: 'Das ist die andere Stelle. Zähle ab dem Komma nach rechts.' }, { id: 'stelle-verwechselt', match: whole, hint: 'Diese Ziffer steht vor dem Komma. Schau nach rechts.' }], digit, DECIMALS),
    praise: 'Du hast die Stellen ab dem Komma gezählt.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** Stufe 2, AB II: Nenner 10, 100, 1000 to the Dezimalzahl. */
const fromPowerOfTen: Form = (rng, stufe, ab) => {
  const places = rng.int(1, 3);
  const digits = Array.from({ length: places }, () => nonZero(rng));
  const whole = places < 3 && rng.chance(0.3) ? rng.int(1, 9) : 0;
  const d = 10 ** places;
  const n = whole * d + asInt(digits);
  const value = n / d;
  return build(SKILL, stufe, {
    key: `nenner:${n}/${d}`,
    ab,
    prompt: 'Schreibe als Dezimalzahl.',
    expression: `${frac(n, d)} = ${BOX}`,
    answer: { kind: 'number', value, decimals: DECIMALS, label: 'Dezimalzahl' },
    hints: [`Der Nenner ${d} sagt: ${places === 1 ? 'eine Stelle' : places === 2 ? 'zwei Stellen' : 'drei Stellen'} nach dem Komma.`, 'Schreibe den Zähler und setze das Komma von rechts.'],
    steps: [`Der Nenner ${d} hat ${places} ${places === 1 ? 'Null' : 'Nullen'}.`, `Also ${places === 1 ? 'steht eine Stelle' : `stehen ${places} Stellen`} nach dem Komma.`, `${frac(n, d)} = ${fmt(value, places)}`],
    bugs: typedBugs([
      places >= 2 && { id: 'komma-nenner', match: n / 10, hint: `Der Nenner ${d} heißt: ${places === 2 ? 'zwei' : 'drei'} Stellen nach dem Komma.` },
      places <= 2 && { id: 'komma-nenner', match: n / (d * 10), hint: `Der Nenner ${d} heißt: ${places === 1 ? 'eine Stelle' : 'zwei Stellen'} nach dem Komma.` },
      { id: 'ohne-komma', match: n, hint: 'Der Bruch heißt: Zähler geteilt durch Nenner. Setze das Komma.' },
    ], value, DECIMALS),
    praise: 'Du hast die Stellen am Nenner abgelesen.',
    srText: speak(`${frac(n, d)} als Dezimalzahl schreiben.`),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

/** Stufe 2, AB III: Zehntel or Hundertstel as a fraction in Tausendstel, so the Zähler is more than the digits shown. */
const toThousandths: Form = (rng, stufe, ab) => {
  const places = rng.int(1, 2);
  const digits = Array.from({ length: places }, () => nonZero(rng));
  const shown = fmt(toValue(0, digits), places);
  const n = asInt(digits) * 10 ** (DECIMALS - places);
  const prompt = `Schreibe ${shown} als Bruch mit dem Nenner 1000.`;
  return build(SKILL, stufe, {
    key: `zumnenner:${shown}`,
    ab,
    prompt,
    answer: { kind: 'fraction', numerator: n, denominator: 1000, accept: 'exact' },
    hints: ['Der Nenner 1000 heißt: drei Stellen nach dem Komma.', 'Hänge Nullen an, bis drei Stellen da sind.'],
    steps: [`${shown} = ${fmt(n / 1000, DECIMALS)}`, `Nach dem Komma steht ${n}.`, `${shown} = ${frac(n, 1000)}`],
    bugs: fractionBugs([
      { id: 'null-stelle', match: { numerator: asInt(digits), denominator: 1000 }, hint: `${shown} hat nur ${places === 1 ? 'eine Stelle' : 'zwei Stellen'}. Hänge Nullen an, bis drei Stellen da sind.` },
    ], { numerator: n, denominator: 1000 }),
    praise: 'Du hast Nullen angehängt und den Wert behalten.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

/** Stufe 2, AB III: Tausendstel back to a fraction; the Nenner comes from the places. */
const thousandthsAsFraction: Form = (rng, stufe, ab) => {
  const digits = threeDigits(rng);
  const n = asInt(digits);
  const shown = fmt(n / 1000, DECIMALS);
  const prompt = `Schreibe ${shown} als Bruch.`;
  const correct = { numerator: n, denominator: 1000 };
  return build(SKILL, stufe, {
    key: `bruch3:${digits.join('')}`,
    ab,
    prompt,
    answer: { kind: 'fraction', ...correct, accept: 'equivalent' },
    hints: ['Wie viele Stellen stehen nach dem Komma?', 'Drei Stellen nach dem Komma: Das sind Tausendstel.'],
    steps: [`${shown} hat drei Stellen nach dem Komma.`, `Der Nenner ist 1000, der Zähler ${n}.`, `${shown} = ${frac(n, 1000)}`],
    bugs: valueBugs([
      { id: 'null-stelle', match: { numerator: n, denominator: 100 }, hint: 'Drei Stellen nach dem Komma: Der Nenner ist 1000.' },
      { id: 'bruch-komma', match: { numerator: 1, denominator: n }, hint: 'Die Ziffern nach dem Komma bilden den Zähler.' },
    ], correct),
    praise: 'Du hast den Nenner an den Stellen abgelesen.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

/** Stufe 2, AB III: how many Tausendstel are 0,27? */
const countThousandths: Form = (rng, stufe, ab) => {
  const digits = [nonZero(rng), nonZero(rng)];
  const value = asInt(digits) * 10;
  const shown = fmt(toValue(0, digits), 2);
  const prompt = `Wie viele Tausendstel sind ${shown}?`;
  return build(SKILL, stufe, {
    key: `tausendstel:${digits.join('')}`,
    ab,
    prompt,
    answer: { kind: 'number', value, decimals: DECIMALS, unit: 'Tausendstel', label: 'Anzahl der Tausendstel' },
    hints: safeHints(['Schreibe die Zahl mit drei Stellen nach dem Komma.', 'Lies die Ziffern nach dem Komma als eine Zahl.'], value, 'Schreibe die Zahl mit drei Stellen nach dem Komma.'),
    steps: [`${shown} = ${fmt(value / 1000, 3)}`, `Das sind ${fmt(value)} Tausendstel.`],
    bugs: typedBugs([{ id: 'stellen-zaehlen', match: asInt(digits), hint: 'So viele Hundertstel sind es. Ein Hundertstel sind 10 Tausendstel.' }], value, DECIMALS),
    praise: 'Du hast eine 0 angehängt und den Wert behalten.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** Stufe 3, AB I: a fraction whose Zähler has fewer digits than the Nenner has zeros. */
const innerZeroFraction: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick([[nonZero(rng), 100], [nonZero(rng), 1000], [rng.int(11, 99), 1000]] as const);
  const places = d === 100 ? 2 : 3;
  const value = n / d;
  const digit = String(n)[0];
  return build(SKILL, stufe, {
    key: `innen:${n}/${d}`,
    ab,
    prompt: 'Schreibe als Dezimalzahl.',
    expression: `${frac(n, d)} = ${BOX}`,
    answer: { kind: 'number', value, decimals: DECIMALS, label: 'Dezimalzahl' },
    hints: [`Der Nenner ${d} sagt: ${places === 2 ? 'zwei' : 'drei'} Stellen nach dem Komma.`, 'Fülle leere Stellen direkt nach dem Komma mit 0.'],
    steps: [`Der Nenner ${d} heißt: ${places === 2 ? 'zwei' : 'drei'} Stellen nach dem Komma.`, 'Leere Stellen nach dem Komma bekommen eine 0.', `${frac(n, d)} = ${fmt(value, places)}`],
    bugs: typedBugs([
      { id: 'null-vergessen', match: Number(`0.${n}`), hint: `Die ${digit} steht zu weit vorn. Der Nenner ist ${d}.` },
      { id: 'ohne-komma', match: n, hint: 'Der Bruch ist kleiner als 1. Vor dem Komma steht 0.' },
    ], value, DECIMALS),
    praise: 'Du hast die leeren Stellen mit 0 gefüllt.',
    srText: speak(`${frac(n, d)} als Dezimalzahl schreiben.`),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

/** Stufe 3, AB II: ¼ and ¾, the fractions of this Stufe's label, alone or in a mixed number. */
const commonFraction: Form = (rng, stufe, ab) => {
  const [n, d, k] = rng.pick([[1, 4, 25], [3, 4, 25]] as const);
  const whole = rng.chance(0.5) ? rng.int(1, 9) : 0;
  const value = whole + (n * k) / 100;
  const shown = frac(n, d, whole > 0 ? whole : undefined);
  return build(SKILL, stufe, {
    key: `gemein:${whole}:${n}/${d}`,
    ab,
    prompt: 'Schreibe als Dezimalzahl.',
    expression: `${shown} = ${BOX}`,
    answer: { kind: 'number', value, decimals: DECIMALS, label: 'Dezimalzahl' },
    hints: [`Erweitere ${frac(n, d)} auf Hundertstel.`, `Welche Zahl macht aus ${d} den Nenner 100?`],
    steps: [`${d} · ${k} = 100`, `${frac(n, d)} = ${frac(n * k, 100)} = ${fmt((n * k) / 100, 2)}`, ...(whole > 0 ? [`${whole} + ${fmt((n * k) / 100, 2)} = ${fmt(value, 2)}`] : [])],
    bugs: typedBugs([
      whole === 0 && { id: 'bruch-komma', match: Number(`${n}.${d}`), hint: `${frac(n, d)} heißt ${n} : ${d}. Erweitere zuerst auf Hundertstel.` },
      { id: 'bruch-komma', match: Number(`${whole}.${n}${d}`), hint: 'Zähler und Nenner sind keine Ziffern nach dem Komma. Erweitere auf Hundertstel.' },
    ], value, DECIMALS),
    praise: 'Du hast den Bruch zuerst auf Hundertstel erweitert.',
    srText: speak(`${shown} als Dezimalzahl schreiben.`),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

/** Stufe 3, AB III: a number with an inner zero back to a fraction. */
const innerZeroAsFraction: Form = (rng, stufe, ab) => {
  const places = rng.int(2, 3);
  const n = places === 2 ? nonZero(rng) : rng.pick([nonZero(rng), rng.int(11, 99)]);
  const d = 10 ** places;
  const shown = fmt(n / d, places);
  const prompt = `Schreibe ${shown} als Bruch.`;
  const correct = { numerator: n, denominator: d };
  const digit = String(n)[0];
  return build(SKILL, stufe, {
    key: `null-bruch:${n}/${d}`,
    ab,
    prompt,
    answer: { kind: 'fraction', ...correct, accept: 'equivalent' },
    hints: ['Wie viele Stellen stehen nach dem Komma? So viele Nullen hat der Nenner.', 'Die Nullen direkt nach dem Komma gehören nicht in den Zähler.'],
    steps: [`${shown} hat ${places === 2 ? 'zwei' : 'drei'} Stellen nach dem Komma.`, `Der Nenner ist ${d}, der Zähler ${n}.`, `${shown} = ${frac(n, d)}`],
    bugs: valueBugs([
      { id: 'null-stelle', match: { numerator: n, denominator: places === 2 ? 10 : 100 }, hint: `Die ${digit} steht nicht direkt nach dem Komma. Zähle die Stellen.` },
    ], correct),
    praise: 'Du hast die Stellen nach dem Komma gezählt.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

/** Stufe 3, AB III: as a fully reduced fraction; 0,25, 0,75 and numbers with an inner zero, as the Stufe's label says. */
const reducedFraction: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick([[25, 100], [75, 100], [2, 100], [4, 100], [5, 100], [6, 100], [8, 100], [25, 1000], [75, 1000], [2, 1000], [4, 1000], [5, 1000], [8, 1000]] as const);
  const [a, b] = lowest([n, d]);
  const places = d === 100 ? 2 : 3;
  const shown = fmt(n / d, places);
  const prompt = `Schreibe ${shown} als Bruch und kürze vollständig.`;
  const correct = { numerator: a, denominator: b };
  return build(SKILL, stufe, {
    key: `gekuerzt:${n}/${d}`,
    ab,
    prompt,
    answer: { kind: 'fraction', ...correct, accept: 'lowest' },
    hints: ['Schreibe die Zahl zuerst als Bruch mit dem Nenner 10, 100 oder 1000.', 'Kürze dann, bis keine gemeinsame Zahl mehr bleibt.'],
    steps: [`${shown} = ${frac(n, d)}`, `Zähler und Nenner durch ${n / a} teilen.`, `${frac(n, d)} = ${frac(a, b)}`],
    bugs: valueBugs([
      { id: 'bruch-komma', match: { numerator: 1, denominator: n }, hint: 'Die Ziffern nach dem Komma bilden den Zähler. Der Nenner hat Nullen.' },
    ], correct),
    praise: 'Du hast den Bruch aufgestellt und ganz gekürzt.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [readTable(twoDigits, 9)], 2: [asFraction], 3: [fromWords, digitAtPlace] },
  2: { 1: [readTable(threeDigits, 9)], 2: [fromPowerOfTen], 3: [toThousandths, thousandthsAsFraction, countThousandths] },
  3: { 1: [innerZeroFraction, readTable(innerZeros, 9)], 2: [commonFraction], 3: [innerZeroAsFraction, reducedFraction] },
};

export const dezimalLesenSkill: SkillDef = {
  ...SKILL,
  title: 'Dezimalzahlen lesen',
  description: 'Du erweiterst die Stellentafel nach rechts.',
  stufen: { 1: 'Zehntel und Hundertstel in der Stellentafel, 0,7 als Bruch', 2: 'Tausendstel, Nenner 10, 100 und 1000 als Dezimalzahl', 3: 'Nullen nach dem Komma wie 0,05, ¼ und ¾ als Dezimalzahl' },
  kmk: KMK,
  keys: { comma: true },
  generate: byStufeAndAb(FORMS),
};
