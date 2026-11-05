/**
 * Schriftlich teilen (docs/research.md §6). Stufe 1: up to 4 digits by one digit, no Rest. Stufe 2: by 11–25, Rest, zero in the quotient. Stufe 3: a divisor
 * of 100 or more (threeDigitFactor) and the Überschlag that picks a plausible quotient, beside the written division and never instead of it. Without the
 * three-digit divisor Stufe 3 divides by 26–99.
 */
import { BOX, DIV, TIMES, fmt, toSpeech } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, SubtractionMethod } from '../../core/types';
import { layoutDiv, numLength, writtenVisual } from '../../core/written';
import { pickPerson, targetAb } from '../shared';
import { attempt, canon, divResultLine, expressionOf, item, randLen, reverseItem, roughFits, roughOf, withInnerZeros, writtenItem } from './common';

const SKILL = { id: 'rechnen.schriftlich-geteilt', topicId: 'rechnen' } as const;
const KMK = ['ZO.schriftlich'];

interface DivSpec {
  /** Divisor. */
  d: () => number;
  /** Quotient. */
  q: () => number;
  /** A Rest above 0. */
  rest?: boolean;
  ok?: (a: number, d: number) => boolean;
  fallback: [number, number];
}

/** Dividend and divisor, the Dividend built from quotient, divisor and Rest. */
function division(rng: Rng, spec: DivSpec): number[] {
  return attempt<number[]>(
    () => {
      const d = spec.d();
      const a = spec.q() * d + (spec.rest ? rng.int(1, d - 1) : 0);
      return !spec.ok || spec.ok(a, d) ? [a, d] : null;
    },
    () => [...spec.fallback],
  );
}

const zerosInQuotient = (a: number, d: number) => layoutDiv(a, d).quotientZeros;

// ─── Stufe 1: by one digit, no Rest ──────────────────────────────────────────

/** The Umkehraufgabe: the Dividend is missing, and a written multiplication finds it. */
function missingDividend(rng: Rng, ab: Ab, method: SubtractionMethod): Exercise {
  const d = rng.int(3, 9);
  const q = attempt(() => {
    const n = randLen(rng, 3);
    return n * d < 10_000 && !String(n).includes('0') ? n : null;
  }, () => 463);
  return reverseItem(SKILL, 1, {
    ab,
    op: 'mul',
    operands: [q, d],
    method,
    kmk: KMK,
    keyPart: 'umkehr',
    expression: `${BOX} ${DIV} ${d} = ${fmt(q)}`,
    extraBugs: [{ id: 'umkehr-richtung', match: q + d, hint: 'Mach die Probe. Was hebt das Teilen auf?' }],
    hints: ['Die Umkehrung von Teilen ist Malnehmen.', `Rechne ${fmt(q)} ${TIMES} ${d} von rechts nach links.`],
    praise: 'Du hast die passende Umkehraufgabe gewählt.',
  });
}

function stufe1(rng: Rng, ab: Ab, method: SubtractionMethod): Exercise {
  if (ab === 3) return missingDividend(rng, ab, method);
  const spec: DivSpec = ab === 1
    ? { d: () => rng.int(2, 9), q: () => randLen(rng, 3), ok: (a, d) => numLength(a) <= 4 && !layoutDiv(a, d).firstTwoDigits && zerosInQuotient(a, d) === 0, fallback: [936, 4] }
    // the first digit is too small, so the first step takes two digits
    : { d: () => rng.int(3, 9), q: () => randLen(rng, 3), ok: (a, d) => numLength(a) === 4 && layoutDiv(a, d).firstTwoDigits && zerosInQuotient(a, d) === 0, fallback: [2736, 8] };
  return writtenItem(SKILL, 1, { ab, op: 'div', operands: division(rng, spec), method, kmk: KMK });
}

// ─── Stufe 2: by 11–25 ───────────────────────────────────────────────────────

/**
 * Someone's division: a Rest as big as the divisor or bigger, or a sound one. So "Alles stimmt." can be right too, and the child has to compare. The division
 * stands as a line of text, which wraps: the one-line visual is wider than a phone and hides the Rest, the very thing to judge.
 */
function restTooBig(rng: Rng, ab: Ab): Exercise {
  const [a, d] = division(rng, { d: () => rng.int(11, 25), q: () => randLen(rng, 2), rest: true, ok: (x, y) => x % y > 0 && numLength(x) === 4, fallback: [1234, 15] });
  const q = Math.floor(a / d);
  const r = a % d;
  const who = pickPerson(rng).name;
  const prompt = 'Was sagst du dazu?';
  const fine = rng.chance(0.35);
  const shownQ = fine ? q : q - 1;
  const shownR = fine ? r : r + d;
  const tooBig = `Der Rest ist zu groß. Da passt ${fmt(d)} noch einmal hinein.`;
  const allGood = 'Alles stimmt.';
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>([
    fine ? { label: tooBig, whyWrong: `Vergleiche den Rest mit ${fmt(d)}.` } : { label: tooBig },
    fine ? { label: allGood } : { label: allGood, whyWrong: `Vergleiche den Rest mit ${fmt(d)}.` },
    { label: 'Es darf gar kein Rest bleiben.', whyWrong: 'Ein Rest ist erlaubt. Der Rest muss nur kleiner als der Teiler sein.' },
    { label: 'Das Ergebnis ist viel zu klein.', whyWrong: fine ? 'Mach die Probe. Passt der Teiler noch einmal in den Rest?' : 'Das Ergebnis ist nur um 1 zu klein. Schau auf den Rest.' },
  ]);
  return item(SKILL, 2, {
    key: `${fine ? 'rest-passt' : 'rest-gross'}:${canon('div', [a, d])}`,
    ab,
    context: `${who} teilt schriftlich.`,
    prompt,
    expression: `${expressionOf('div', [a, d])} = ${fmt(shownQ)} Rest ${fmt(shownR)}`,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: [`Vergleiche den Rest mit ${fmt(d)}.`, 'Passt der Teiler noch einmal in den Rest?'],
    steps: [
      fine ? `Der Rest ${fmt(shownR)} ist kleiner als ${fmt(d)}.` : `Der Rest ${fmt(shownR)} ist größer als ${fmt(d)}.`,
      fine ? `${fmt(d)} passt also nicht noch einmal hinein. Das Ergebnis bleibt.` : `${fmt(d)} passt also noch einmal hinein. Das Ergebnis wird um 1 größer.`,
      { text: divResultLine(a, d), visual: writtenVisual({ type: 'written', op: 'div', operands: [a, d], showSolution: true }) },
    ],
    praise: 'Du hast den Rest mit dem Teiler verglichen.',
    srText: `${who} teilt schriftlich: ${toSpeech(expressionOf('div', [a, d]))} gleich ${toSpeech(fmt(shownQ))} Rest ${toSpeech(fmt(shownR))}. ${prompt}`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe2(rng: Rng, ab: Ab, method: SubtractionMethod): Exercise {
  const d = () => rng.int(11, 25);
  if (ab === 1) {
    const operands = division(rng, { d, q: () => rng.int(12, 99), ok: (a, x) => numLength(a) >= 3 && zerosInQuotient(a, x) === 0, fallback: [952, 17] });
    return writtenItem(SKILL, 2, { ab, op: 'div', operands, method, kmk: KMK });
  }
  if (ab === 2) {
    const operands = division(rng, { d, q: () => rng.int(21, 399), rest: true, ok: (a, x) => numLength(a) === 4 && zerosInQuotient(a, x) === 0, fallback: [5438, 17] });
    return writtenItem(SKILL, 2, { ab, op: 'div', operands, method, kmk: KMK });
  }
  if (rng.chance(0.3)) return restTooBig(rng, ab);
  // the quotient has a 0, usually with a Rest
  const operands = division(rng, { d, q: () => withInnerZeros(rng, rng.int(3, 4)), rest: rng.chance(0.7), ok: (a, x) => numLength(a) <= 6 && zerosInQuotient(a, x) > 0, fallback: [10_535, 17] });
  return writtenItem(SKILL, 2, { ab, op: 'div', operands, method, kmk: KMK });
}

// ─── Stufe 3: large divisors, the Überschlag decides ─────────────────────────

/**
 * Wrong quotients far from the right one on either side, how many on which side by chance. A few percent off a multiple of q, so that no pattern of the options
 * names q: not the middle of q : 10, q, q · 10, and not the digits of q in front of another option.
 */
function farQuotients(rng: Rng, q: number): number[] {
  const below = rng.int(0, 3);
  const far = (factors: number[], count: number) => rng.sample(factors, count).map((f) => Math.round(q * f * (1 + rng.pick([-1, 1]) * rng.int(3, 8) / 100)));
  return attempt(
    () => {
      const values = [...far([0.1, 0.2, 0.4, 0.5], below), ...far([1.6, 2, 3, 10], 3 - below)];
      return new Set([q, ...values]).size === 4 ? values : null;
    },
    () => [Math.round(q * 0.42), Math.round(q * 2.1), Math.round(q * 3.2)],
  );
}

/** "Welches Ergebnis kann stimmen?": only one quotient fits the Überschlag. */
function plausibleQuotient(rng: Rng, ab: Ab, three: boolean): Exercise {
  const [a, d] = division(rng, {
    d: () => (three ? rng.int(112, 690) : rng.int(26, 89)),
    q: () => rng.int(112, 690),
    // a close Überschlag: the far option must be far from it
    ok: (x, y) => numLength(x) <= 6 && Math.abs(x / y - roughOf('div', [x, y]).value) <= 0.15 * roughOf('div', [x, y]).value,
    fallback: three ? [48_360, 312] : [15_288, 42],
  });
  const q = a / d;
  const rough = roughOf('div', [a, d]);
  const shown = rng.shuffle([q, ...farQuotients(rng, q)]);
  const options: ChoiceOption[] = shown.map((v) => (v === q ? { label: fmt(v) } : { label: fmt(v), whyWrong: v > q ? 'Dieses Ergebnis ist viel zu groß. Mach den Überschlag.' : 'Dieses Ergebnis ist viel zu klein. Mach den Überschlag.' }));
  const expression = `${fmt(a)} ${DIV} ${fmt(d)} = ${BOX}`;
  const prompt = 'Mach den Überschlag. Welches Ergebnis kann stimmen?';
  return item(SKILL, 3, {
    key: `plausibel:${canon('div', [a, d])}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'choice', options, correct: shown.indexOf(q) },
    hints: [`Runde ${fmt(d)} auf die höchste Stelle.`, 'Rechne den Überschlag aus. Das passende Ergebnis liegt ganz nah daran.'],
    steps: [
      rough.text,
      `Nur ${fmt(q)} liegt in der Nähe von ${fmt(rough.value)}.`,
      { text: divResultLine(a, d), visual: writtenVisual({ type: 'written', op: 'div', operands: [a, d], showSolution: true }) },
    ],
    praise: 'Du hast das Ergebnis mit dem Überschlag geprüft.',
    srText: `${prompt} ${toSpeech(expression)}`,
    kmk: [...KMK, 'ZO.runden', 'PK.argumentieren'],
  });
}

function stufe3(rng: Rng, ab: Ab, three: boolean, method: SubtractionMethod): Exercise {
  if (ab > 1 && rng.chance(0.3)) return plausibleQuotient(rng, ab, three);
  const kmk = [...KMK, 'ZO.runden'];
  // AB III: the hardest numbers, a Rest and a 0 in the quotient too
  const hardest: Pick<DivSpec, 'q' | 'rest' | 'ok'> = { q: () => withInnerZeros(rng, three ? 3 : rng.int(3, 4)), rest: true, ok: (a, d) => numLength(a) >= 5 && numLength(a) <= 6 && zerosInQuotient(a, d) > 0 && roughFits('div', [a, d]) };
  if (three) {
    const operands = ab === 1
      ? division(rng, { d: () => rng.int(101, 250), q: () => rng.int(12, 39), ok: (a, d) => numLength(a) === 4 && zerosInQuotient(a, d) === 0 && roughFits('div', [a, d]), fallback: [3978, 153] })
      : ab === 2
        ? division(rng, { d: () => rng.int(112, 690), q: () => rng.int(23, 299), rest: true, ok: (a, d) => numLength(a) === 5 && roughFits('div', [a, d]), fallback: [48_372, 312] })
        : division(rng, { d: () => rng.int(112, 690), ...hardest, fallback: [188_777, 312] });
    return writtenItem(SKILL, 3, { ab, op: 'div', operands, method, kmk, rough: true });
  }
  const operands = ab === 1
    ? division(rng, { d: () => rng.int(26, 99), q: () => rng.int(112, 899), ok: (a, d) => numLength(a) === 5 && zerosInQuotient(a, d) === 0 && roughFits('div', [a, d]), fallback: [15_288, 42] })
    : ab === 2
      ? division(rng, { d: () => rng.int(26, 99), q: () => rng.int(112, 899), rest: true, ok: (a, d) => numLength(a) === 5 && roughFits('div', [a, d]), fallback: [15_301, 42] })
      : division(rng, { d: () => rng.int(26, 99), ...hardest, fallback: [151_553, 42] });
  return writtenItem(SKILL, 3, { ab, op: 'div', operands, method, kmk, rough: true });
}

export const schriftlichGeteiltSkill: SkillDef = {
  ...SKILL,
  title: 'Schriftlich teilen',
  description: 'Du teilst schriftlich, auch durch zweistellige Zahlen.',
  stufen: {
    1: 'Bis 4 Stellen durch eine Ziffer, ohne Rest',
    2: 'Durch 11 bis 25, Rest und 0 im Ergebnis',
    3: 'Großer Teiler, und der Überschlag zeigt das passende Ergebnis',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const method = ctx.subtractionMethod;
    if (stufe === 1) return stufe1(rng, ab, method);
    if (stufe === 2) return stufe2(rng, ab, method);
    return stufe3(rng, ab, ctx.ranges.threeDigitFactor, method);
  },
};
