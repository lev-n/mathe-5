/**
 * zahlen.zahlensysteme: römische Zahlen und Dualzahlen. The Stufe chooses the content (S1 Roman ≤ 100 to decimal, S2 Roman ≤ 3000 and binary ≤ 15 to
 * decimal, S3 decimal to binary ≤ 63 and why position matters); AB varies the demand inside it. A Dualzahl is written digit by digit, so the voice
 * says 'eins null eins' and nobody reads it as a decimal number. As an answer it has one field per digit: a single number field would show it with
 * the thousands gap of a decimal number. The first digit, always a 1, stands before the fields, as a multi answer holds at most 5 fields.
 */
import { BOX, MINUS, NBSP, fmt } from '../../core/format';
import type { Ab, Exercise, MultiField, Rng, SkillDef, Visual } from '../../core/types';
import { build, makeChoice, multiBugs, numberBugs, targetAb } from '../shared';

const SKILL = { id: 'zahlen.zahlensysteme', topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlensysteme'];

const ROMAN: readonly [value: number, sign: string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const SIGN_VALUE: Readonly<Record<string, number>> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

export function toRoman(n: number): string {
  let rest = n;
  let out = '';
  for (const [value, sign] of ROMAN) {
    while (rest >= value) {
      out += sign;
      rest -= value;
    }
  }
  return out;
}

/** All signs added, also those that are subtracted: XLIX → 71. */
export function romanAllAdded(roman: string): number {
  return roman.split('').reduce((s, c) => s + SIGN_VALUE[c], 0);
}

/** The pairs of a Roman number, like IV or XL. */
const pairsOf = (roman: string) => roman.match(/IV|IX|XL|XC|CD|CM/g) ?? [];
const hasPair = (roman: string) => pairsOf(roman).length > 0;

/** Every sign added, without any pair: 49 → XXXXVIIII. */
function additiveRoman(n: number): string {
  let rest = n;
  let out = '';
  for (const [sign, value] of Object.entries(SIGN_VALUE).sort((a, b) => b[1] - a[1])) {
    while (rest >= value) {
      out += sign;
      rest -= value;
    }
  }
  return out;
}

/** The worked parts: 49 → XL = 40, IX = 9. */
function romanParts(n: number): string[] {
  let rest = n;
  const out: string[] = [];
  for (const [value, sign] of ROMAN) {
    let count = 0;
    while (rest >= value) {
      count++;
      rest -= value;
    }
    if (count) out.push(`${sign.repeat(count)} = ${fmt(count * value)}`);
  }
  return out;
}

/** The worked parts as steps of one line each. */
function partLines(n: number): string[] {
  const parts = romanParts(n);
  return parts.length <= 3 ? [`${parts.join(', ')}.`] : [`${parts.slice(0, 3).join(', ')},`, `${parts.slice(3).join(', ')}.`];
}

const SMALL_LEGEND: Visual = { type: 'table', caption: 'Römische Zeichen', header: ['Zeichen', 'I', 'V', 'X', 'L', 'C'], rows: [['Wert', '1', '5', '10', '50', '100']] };
const FULL_LEGEND: Visual = { type: 'table', caption: 'Römische Zeichen', header: ['Zeichen', 'Wert', 'Zeichen', 'Wert'], rows: [['I', '1', 'C', '100'], ['V', '5', 'D', '500'], ['X', '10', 'M', '1000'], ['L', '50', '–', '–']] };

function romanToDecimal(stufe: 1 | 2, ab: Ab, n: number): Exercise {
  const roman = toRoman(n);
  const pair = hasPair(roman);
  return build(SKILL, stufe, {
    key: `roemisch:${n}`,
    ab,
    prompt: 'Welche Zahl ist das?',
    expression: `${roman} = ${BOX}`,
    visual: stufe === 1 ? SMALL_LEGEND : FULL_LEGEND,
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: pair ? ['Lies von links und suche Paare wie IV oder XL.', 'Steht das kleinere Zeichen links, ziehst du es ab.'] : ['Jedes Zeichen hat einen festen Wert.', 'Lies von links und addiere die Werte.'],
    steps: [...partLines(n), `Zusammen: ${fmt(n)}.`],
    bugs: numberBugs([
      pair && { id: 'roemisch-addiert', match: romanAllAdded(roman), hint: 'Steht ein kleineres Zeichen links vom größeren, ziehst du es ab.' },
      { id: 'roemisch-zeichen', match: roman.length, hint: 'Du hast die Zeichen gezählt. Jedes Zeichen hat einen eigenen Wert.' },
    ], n),
    praise: pair ? 'Du hast die Paare zum Abziehen erkannt.' : 'Du hast die Werte der Zeichen addiert.',
    srText: `Die römische Zahl ${roman.split('').join(' ')}. Welche Zahl ist das?`,
    kmk: KMK,
  });
}

/** A number up to max whose Roman form has no pair (AB I), or has one (AB II). */
function romanNumber(rng: Rng, max: number, wantPair: boolean): number {
  for (let tries = 0; tries < 80; tries++) {
    const n = rng.int(max > 100 ? 101 : 11, max);
    if (hasPair(toRoman(n)) === wantPair) return n;
  }
  return wantPair ? 49 : 76;
}

/** A number up to 3000 with at least two pairs, like MCMXCIV: the hardest to write at Stufe 2. */
function hardRoman(rng: Rng): number {
  for (let tries = 0; tries < 200; tries++) {
    const n = rng.int(101, 3000);
    if (pairsOf(toRoman(n)).length >= 2) return n;
  }
  return 2894;
}

/** The reversed task. The hints name no pair: for 40 or 90 a pair is the whole answer. */
function decimalToRoman(rng: Rng, stufe: 1 | 2, ab: Ab, n: number): Exercise {
  const roman = toRoman(n);
  const max = stufe === 1 ? 100 : 3000;
  const wrongs = [
    { label: additiveRoman(n), whyWrong: 'Ein Zeichen steht höchstens dreimal hintereinander.' },
    { label: toRoman(n + 10 <= max ? n + 10 : n - 10), whyWrong: 'Rechne diese Zahl zurück und vergleiche.' },
    { label: toRoman(n + 1 <= max ? n + 1 : n - 1), whyWrong: 'Rechne diese Zahl zurück und vergleiche.' },
    { label: roman.split('').reverse().join(''), whyWrong: 'Beim Abziehen steht das kleinere Zeichen links vom größeren.' },
  ];
  return build(SKILL, stufe, {
    key: `nachroemisch:${n}`,
    ab,
    prompt: `Welche römische Zahl ist ${fmt(n)}?`,
    visual: stufe === 1 ? SMALL_LEGEND : FULL_LEGEND,
    answer: makeChoice(rng, { label: roman }, wrongs),
    hints: [stufe === 1 ? 'Zerlege die Zahl in Zehner und Einer.' : 'Zerlege die Zahl in Tausender, Hunderter, Zehner und Einer.', 'Steht das kleinere Zeichen links vom größeren, ziehst du es ab.'],
    steps: [...partLines(n), `Die römische Zahl ist ${roman}.`],
    praise: 'Du hast die Zahl in passende Zeichen zerlegt.',
    srText: `Welche römische Zahl ist ${n}?`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

/** 11 → '1 0 1 1': never read as a decimal number, and the voice says each digit. */
export function dualShown(n: number): string {
  return n.toString(2).split('').join(NBSP);
}

/** The digits read as a decimal number: 11 → 1011. */
export const dualTyped = (n: number) => Number(n.toString(2));

/** Places 32, 16, 8, 4, 2, 1, as far as needed. */
const dualPlaces = (bits: number) => Array.from({ length: bits }, (_, i) => String(2 ** (bits - 1 - i)));

function dualTable(n: number, bits: number, filled: boolean): Visual {
  const digits = n.toString(2).padStart(bits, '0').split('');
  return { type: 'table', caption: 'Stellen einer Dualzahl', header: dualPlaces(bits), rows: [filled ? digits : digits.map(() => '–')] };
}

/** The value with the digits read from the other end. */
export function dualReversed(n: number): number {
  return parseInt(n.toString(2).split('').reverse().join(''), 2);
}

function dualToDecimal(ab: Ab, n: number): Exercise {
  const digits = n.toString(2);
  const ones = (digits.match(/1/g) ?? []).length;
  const taken = digits.split('').flatMap((d, i) => (d === '1' ? [2 ** (digits.length - 1 - i)] : []));
  return build(SKILL, 2, {
    key: `dual:${n}`,
    ab,
    prompt: 'Welche Zahl ist diese Dualzahl?',
    expression: dualShown(n),
    visual: dualTable(n, 4, true),
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: ['Jede Stelle zählt doppelt so viel wie die Stelle rechts daneben.', 'Addiere die Werte der Stellen mit einer 1.'],
    steps: [`Die Stellen mit einer 1 zählen: ${taken.join(', ')}.`, taken.length > 1 ? `${taken.join(' + ')} = ${n}` : `Das sind ${n}.`],
    bugs: numberBugs([
      { id: 'dual-ziffern', match: ones, hint: 'Du hast die Einsen gezählt. Jede 1 zählt den Wert ihrer Stelle.' },
      { id: 'dual-dezimal', match: dualTyped(n), hint: 'Eine 1 sagt: Diese Stelle zählt. Addiere die Werte der Stellen.' },
      { id: 'dual-umgedreht', match: dualReversed(n), hint: 'Die Stelle ganz rechts zählt 1. Nach links verdoppelt sich der Wert.' },
    ], n),
    praise: 'Du hast die Werte der Stellen addiert.',
    srText: `Die Dualzahl ${digits.split('').join(' ')}. Welche Zahl ist das?`,
    kmk: KMK,
  });
}

/** One field per digit after the first: fmt would group one typed number like a decimal number (110 100). */
function decimalToDual(ab: Ab, n: number, withTable: boolean): Exercise {
  const digits = n.toString(2);
  const bits = digits.length;
  const taken = digits.split('').flatMap((d, i) => (d === '1' ? [2 ** (bits - 1 - i)] : []));
  const rest = digits.slice(1).split('').map(Number);
  const fields: MultiField[] = rest.map((value, i) => ({ id: `d${i + 2}`, value, label: `Ziffer ${i + 2} von links`, ...(i === 0 ? { before: '1,' } : {}) }));
  const record = (tail: string) => Object.fromEntries(tail.split('').map((d, i) => [`d${i + 2}`, Number(d)]));
  const ones = digits.replace(/0/g, '');
  const reversed = digits.split('').reverse().join('');
  return build(SKILL, 3, {
    key: `nachdual:${n}:${withTable ? 't' : 'o'}`,
    ab,
    prompt: `Schreibe ${n} als Dualzahl. Die erste Ziffer steht schon da.`,
    ...(withTable ? { visual: dualTable(n, bits, false) } : {}),
    answer: { kind: 'multi', fields },
    hints: ['Nimm zuerst die größte passende Zahl aus 32, 16, 8, 4, 2, 1.', 'Zieh diese Zahl ab und mach mit dem Rest weiter.'],
    steps: [
      `${n} = ${taken.join(' + ')}`,
      { text: 'Diese Stellen bekommen eine 1, die anderen eine 0.', visual: dualTable(n, bits, true) },
      `Die Dualzahl heißt ${dualShown(n)}.`,
    ],
    bugs: multiBugs([
      reversed[0] === '1' && { id: 'dual-umgedreht', match: record(reversed.slice(1)), hint: 'Die Stelle mit dem größten Wert steht links.' },
      { id: 'dual-null-vergessen', match: record(ones.padEnd(bits, '0').slice(1)), hint: 'Jede 1 steht an ihrer Stelle. Leere Stellen bekommen eine 0.' },
    ], fields),
    praise: 'Du hast die Zahl in passende Stellen zerlegt.',
    srText: `Schreibe ${n} als Dualzahl mit ${bits} Ziffern. Die erste Ziffer ist 1. Trag die anderen Ziffern von links nach rechts ein.`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

function dualChoice(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(5, 15);
  const answer = makeChoice(rng, { label: dualShown(n) }, [
    { label: dualShown(dualReversed(n) === n ? n + 1 : dualReversed(n)), whyWrong: 'Die Stelle mit dem größten Wert steht links.' },
    { label: dualShown(n + 1 > 15 ? n - 1 : n + 1), whyWrong: 'Rechne diese Dualzahl zurück und vergleiche.' },
    { label: dualShown(n - 2), whyWrong: 'Rechne diese Dualzahl zurück und vergleiche.' },
  ]);
  return build(SKILL, 2, {
    key: `waehldual:${n}`,
    ab,
    prompt: `Welche Dualzahl ist ${n}?`,
    answer,
    hints: ['Die Stellen zählen 8, 4, 2 und 1.', 'Rechne jede Dualzahl zurück und vergleiche.'],
    steps: ['Die Stellen zählen 8, 4, 2 und 1.', `${n} = ${n.toString(2).split('').flatMap((d, i, all) => (d === '1' ? [2 ** (all.length - 1 - i)] : [])).join(' + ')}`, `Die Dualzahl heißt ${dualShown(n)}.`],
    praise: 'Du hast die Dualzahl ins Zehnersystem umgerechnet.',
    srText: `Welche Dualzahl ist ${n}?`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return rng.chance(0.5) ? romanToDecimal(2, ab, romanNumber(rng, 3000, false)) : dualToDecimal(ab, rng.int(3, 7));
  if (ab === 2) return rng.chance(0.5) ? romanToDecimal(2, ab, romanNumber(rng, 3000, true)) : dualToDecimal(ab, rng.int(9, 15));
  // AB III goes the other way round: AB II already reads Roman numbers with pairs
  return rng.chance(0.5) ? decimalToRoman(rng, 2, ab, hardRoman(rng)) : dualChoice(rng, ab);
}

/** The same digits have another value in the other system: only the value of the places differs. */
function sameDigits(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(5, 31);
  const asDecimal = dualTyped(n);
  const value = asDecimal - n;
  const prompt = 'Lies diese Ziffern im Zehnersystem und als Dualzahl. Wie groß ist der Unterschied der Werte?';
  return build(SKILL, 3, {
    key: `warum:ziffern:${n}`,
    ab,
    prompt,
    expression: dualShown(n),
    answer: { kind: 'number', value, label: 'Unterschied' },
    hints: ['Lies die Ziffern zuerst als Zahl im Zehnersystem.', 'Rechne die Ziffern dann als Dualzahl um und zieh ab.'],
    steps: [`Im Zehnersystem: ${fmt(asDecimal)}.`, `Als Dualzahl: ${n}.`, `${fmt(asDecimal)} ${MINUS} ${n} = ${fmt(value)}`],
    bugs: numberBugs([
      { id: 'dual-dezimal', match: asDecimal, hint: 'Das ist nur der Wert im Zehnersystem. Zieh den Wert der Dualzahl ab.' },
      { id: 'dual-dezimal', match: n, hint: 'Das ist nur der Wert der Dualzahl. Lies die Ziffern auch im Zehnersystem.' },
      { id: 'dual-ziffern', match: asDecimal + n, hint: 'Der Unterschied ist eine Differenz. Zieh die kleinere Zahl ab.' },
    ], value),
    praise: 'Du hast dieselben Ziffern in beiden Systemen gelesen.',
    srText: `Die Ziffern ${n.toString(2).split('').join(' ')}. Lies diese Ziffern im Zehnersystem und als Dualzahl. Wie groß ist der Unterschied der Werte?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** A Roman number with one pair and the same signs with this pair turned round: XLVII and LXVII. */
function turnedPair(rng: Rng): { n: number; roman: string; turned: string; small: number } {
  for (let tries = 0; tries < 300; tries++) {
    const n = rng.int(11, 2900);
    const roman = toRoman(n);
    const pairs = pairsOf(roman);
    if (pairs.length !== 1) continue;
    const [pair] = pairs;
    const turned = roman.replace(pair, `${pair[1]}${pair[0]}`);
    const small = SIGN_VALUE[pair[0]];
    if (toRoman(n + 2 * small) === turned) return { n, roman, turned, small };
  }
  return { n: 47, roman: 'XLVII', turned: 'LXVII', small: 10 };
}

/** Roman signs have places too, in one way: the same signs in another order have another value. */
function turnedSigns(rng: Rng, ab: Ab): Exercise {
  const { n, roman, turned, small } = turnedPair(rng);
  const value = 2 * small;
  const spaced = (text: string) => text.split('').join(' ');
  return build(SKILL, 3, {
    key: `warum:tausch:${n}`,
    ab,
    prompt: 'Beide Zahlen haben dieselben Zeichen. Wie groß ist der Unterschied der Werte?',
    expression: `${roman} und ${turned}`,
    visual: FULL_LEGEND,
    answer: { kind: 'number', value, label: 'Unterschied' },
    hints: ['Lies zuerst beide Zahlen einzeln.', 'Steht das kleinere Zeichen links, ziehst du es ab. Rechts zählst du es dazu.'],
    steps: [`${roman} = ${fmt(n)}`, `${turned} = ${fmt(n + value)}`, `${fmt(n + value)} ${MINUS} ${fmt(n)} = ${value}`],
    bugs: numberBugs([
      { id: 'roemisch-addiert', match: 0, hint: 'Die Zeichen sind gleich, aber nicht ihre Stelle. Links vom größeren ziehst du ab.' },
      { id: 'roemisch-zeichen', match: small, hint: 'Einmal ziehst du dieses Zeichen ab, einmal zählst du dieses Zeichen dazu.' },
    ], value),
    praise: 'Du hast gesehen, dass die Stelle des Zeichens zählt.',
    srText: `Die römischen Zahlen ${spaced(roman)} und ${spaced(turned)} haben dieselben Zeichen. Wie groß ist der Unterschied der Werte?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** A 0 on the right moves every digit one place up, so the value doubles. */
function appendZero(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(5, 31);
  const value = n * 2;
  return build(SKILL, 3, {
    key: `warum:dual:${n}`,
    ab,
    prompt: 'Du hängst an diese Dualzahl rechts eine 0 an. Welche Zahl ist es dann?',
    expression: dualShown(n),
    answer: { kind: 'number', value, label: 'Neuer Wert' },
    hints: ['Jede Ziffer rückt eine Stelle nach links.', 'Links daneben zählt eine Stelle doppelt so viel.'],
    steps: [`${dualShown(n)} ist die Zahl ${n}.`, `Mit der 0 steht dort ${dualShown(value)}.`, `Jede Ziffer zählt doppelt so viel: ${value}.`],
    bugs: numberBugs([
      { id: 'dual-ziffern', match: n, hint: 'Das ist der alte Wert. Jede Ziffer rückt eine Stelle nach links.' },
      { id: 'dual-dezimal', match: n * 10, hint: 'Das gilt im Zehnersystem. Hier zählt jede Stelle doppelt so viel.' },
      { id: 'dual-null-vergessen', match: n + 1, hint: 'Eine 0 zählt nichts, aber die anderen Ziffern rücken nach links.' },
      { id: 'dual-dezimal', match: dualTyped(n) * 10, hint: 'Lies die Ziffern als Dualzahl, nicht als Zahl im Zehnersystem.' },
    ], value),
    praise: 'Du hast auf die Stellen der Dualzahl geachtet.',
    srText: `Du hängst an die Dualzahl ${n.toString(2).split('').join(' ')} rechts eine 0 an. Welche Zahl ist es dann?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Why position matters, as reasoning with the child's numbers: every form needs a calculation, and no sentence answers it. */
function positionWhy(rng: Rng, ab: Ab): Exercise {
  return rng.pick([sameDigits, turnedSigns, appendZero])(rng, ab);
}

export const zahlensystemeSkill: SkillDef = {
  ...SKILL,
  title: 'Andere Zahlensysteme',
  description: 'Du vergleichst römische Zahlen und Dualzahlen mit unseren Zahlen.',
  stufen: {
    1: 'Römische Zahlen bis 100 lesen',
    2: 'Römische Zahlen bis 3000; Dualzahlen bis 15 lesen',
    3: 'Zahlen bis 63 als Dualzahl; warum die Stelle zählt',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) return romanToDecimal(1, ab, romanNumber(rng, 100, false));
      return ab === 2 ? romanToDecimal(1, ab, romanNumber(rng, 100, true)) : decimalToRoman(rng, 1, ab, romanNumber(rng, 100, true));
    }
    if (stufe === 2) return stufe2(rng, ab);
    if (ab === 1) return decimalToDual(ab, rng.int(5, 31), true);
    return ab === 2 ? decimalToDual(ab, rng.int(32, 63), false) : positionWhy(rng, ab);
  },
};
