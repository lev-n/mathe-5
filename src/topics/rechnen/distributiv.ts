/**
 * Zerlegen und ausklammern (docs/research.md §6). Stufe 1: split a factor, 7 · 23 = 7 · 20 + 7 · 3. Stufe 2: reverse, 6 · 17 + 6 · 3 as 6 · 20. Stufe 3: the minus
 * version, 9 · 19 = 9 · 20 − 9. A dotArray shows the split where the factors are small enough for 100 dots.
 */
import { BOX, MINUS, TIMES, fmt, toSpeech } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, MultiField, Rng, SkillDef, Visual } from '../../core/types';
import { multiBugs, targetAb } from '../shared';
import { item, wholeBugs } from './common';

const SKILL = { id: 'rechnen.distributiv', topicId: 'rechnen' } as const;
const KMK = ['ZO.rechengesetze'];

const t = (n: number) => fmt(n);

/** Groups of tens and ones: n groups of b dots, drawn in rows of ten, so the split at the ten can be seen. */
function picture(n: number, b: number): Visual | undefined {
  return n * b <= 100 && b <= 20 ? { type: 'dotArray', groups: Array.from({ length: n }, () => b), perRow: 10 } : undefined;
}

/** A two-digit number whose Einer are not 0. */
function twoDigit(rng: Rng, low: number, high: number): number {
  const b = rng.int(low, high);
  return b % 10 === 0 ? b + 1 : b;
}

// ─── Stufe 1: split ──────────────────────────────────────────────────────────

function splitFields(rng: Rng, ab: Ab): Exercise {
  // a product up to 100 can be drawn, so AB I shows the groups
  const n = rng.int(2, 6);
  const b = rng.int(12, n === 6 ? 16 : 19);
  const tens = 10;
  const ones = b - tens;
  const fields: MultiField[] = [
    { id: 'z', value: n * tens, before: `${n} ${TIMES} ${tens} =`, label: `${n} mal ${tens}` },
    { id: 'e', value: n * ones, before: `${n} ${TIMES} ${ones} =`, label: `${n} mal ${ones}` },
    { id: 's', value: n * b, before: 'Zusammen:', label: 'Zusammen' },
  ];
  const expression = `${n} ${TIMES} ${b}`;
  const prompt = `Zerlege ${b} in ${tens} und ${ones}. Rechne in zwei Teilen.`;
  const visual = picture(n, b);
  return item(SKILL, 1, {
    key: `felder:${n}*${b}`,
    ab,
    prompt,
    expression,
    ...(visual ? { visual } : {}),
    answer: { kind: 'multi', fields },
    hints: [`Die ${n} gehört zu beiden Teilen.`, 'Zähle die beiden Teile zum Schluss zusammen.'],
    steps: [`${n} ${TIMES} ${tens} = ${n * tens}.`, `${n} ${TIMES} ${ones} = ${n * ones}.`, `${n * tens} + ${n * ones} = ${n * b}.`],
    bugs: multiBugs([{ id: 'verteilen-halb', match: { s: n * tens + ones }, hint: `Die ${n} gehört zu beiden: ${n} ${TIMES} ${tens} und ${n} ${TIMES} ${ones}.` }], fields),
    praise: 'Du hast beide Teile malgenommen.',
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: KMK,
  });
}

function splitNumber(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(3, 9);
  const b = twoDigit(rng, 21, 89);
  const tens = b - (b % 10);
  const ones = b % 10;
  const value = n * b;
  const expression = `${n} ${TIMES} ${b} = ${BOX}`;
  const prompt = `Zerlege ${b} und rechne in zwei Teilen.`;
  return item(SKILL, 1, {
    key: `zahl:${n}*${b}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, label: 'Ergebnis' },
    hints: [`${b} = ${tens} + ${ones}.`, `Die ${n} gehört zu beiden: ${n} ${TIMES} ${tens} und ${n} ${TIMES} ${ones}.`],
    steps: [`${b} = ${tens} + ${ones}.`, `${n} ${TIMES} ${tens} = ${n * tens}.`, `${n} ${TIMES} ${ones} = ${n * ones}.`, `${n * tens} + ${n * ones} = ${value}.`],
    bugs: wholeBugs([{ id: 'verteilen-halb', match: n * tens + ones, hint: `Die ${n} gehört zu beiden: ${n} ${TIMES} ${tens} und ${n} ${TIMES} ${ones}.` }], value),
    praise: 'Du hast den Faktor in zwei Teile zerlegt.',
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: KMK,
  });
}

/** "Welche Zerlegung passt?": or one part of the split is missing. */
function splitReason(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(3, 9);
  const b = twoDigit(rng, 21, 89);
  const tens = b - (b % 10);
  const ones = b % 10;
  if (rng.chance(0.5)) {
    const expression = `${n} ${TIMES} ${b} = ${n} ${TIMES} ${BOX} + ${n} ${TIMES} ${ones}`;
    const prompt = 'Welche Zahl fehlt?';
    return item(SKILL, 1, {
      key: `luecke:${n}*${b}`,
      ab,
      prompt,
      expression,
      answer: { kind: 'number', value: tens, label: 'Fehlende Zahl' },
      hints: [`Beide Teile zusammen ergeben ${b}.`, `Was fehlt von ${ones} bis ${b}?`],
      steps: [`${b} ${MINUS} ${ones} = ${tens}.`, `Probe: ${n} ${TIMES} ${tens} + ${n} ${TIMES} ${ones} = ${n * b}. Es fehlt die ${tens}.`],
      praise: 'Du hast die Zerlegung ergänzt.',
      srText: `${prompt} ${toSpeech(expression)}.`,
      kmk: [...KMK, 'PK.problemloesen'],
    });
  }
  const expression = `${n} ${TIMES} ${b}`;
  const prompt = 'Welche Rechnung hat denselben Wert?';
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>([
    { label: `${n} ${TIMES} ${tens} + ${n} ${TIMES} ${ones}` },
    { label: `${n} ${TIMES} ${tens} + ${ones}`, whyWrong: `Die ${n} gehört zu beiden: ${n} ${TIMES} ${tens} und ${n} ${TIMES} ${ones}.` },
    { label: `${n} + ${tens} ${TIMES} ${ones}`, whyWrong: `${b} ist die Summe aus ${tens} und ${ones}. Nimm beide mit ${n} mal.` },
    { label: `${n} ${TIMES} ${tens} ${TIMES} ${ones}`, whyWrong: `${b} ist eine Summe, kein Produkt. Zwischen den Teilen steht Plus.` },
  ]);
  return item(SKILL, 1, {
    key: `welche:${n}*${b}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: [`Zerlege ${b} in ${tens} und ${ones}.`, `Die ${n} gehört zu beiden Teilen.`],
    steps: [`${b} = ${tens} + ${ones}.`, `${n} ${TIMES} ${b} = ${n} ${TIMES} ${tens} + ${n} ${TIMES} ${ones}.`],
    praise: 'Du hast die passende Zerlegung erkannt.',
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 2: reverse (ausklammern) ──────────────────────────────────────────

/** Two parts that sum to a round number. */
function roundParts(rng: Rng, big: boolean): { x: number; y: number; sum: number } {
  const sum = big ? rng.pick([50, 60, 80, 100]) : rng.pick([20, 30, 40]);
  const y = rng.int(2, 9);
  return { x: sum - y, y, sum };
}

function reverseFields(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(3, 9);
  const { x, y, sum } = roundParts(rng, false);
  const fields: MultiField[] = [
    { id: 'f', value: sum, before: `${n} ${TIMES}`, label: 'Zweiter Faktor' },
    { id: 'p', value: n * sum, before: '=', label: 'Ergebnis' },
  ];
  const expression = `${n} ${TIMES} ${x} + ${n} ${TIMES} ${y}`;
  const prompt = `Klammere die ${n} aus. Rechne dann.`;
  return item(SKILL, 2, {
    key: `felder:${n}:${x}+${y}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [`In beiden Teilen steht die ${n}. Die ${n} zählt nur einmal.`, `Rechne ${x} + ${y}.`],
    steps: [`${x} + ${y} = ${sum}.`, `${n} ${TIMES} ${sum} = ${n * sum}.`],
    bugs: multiBugs([{ id: 'ausklammern-doppelt', match: { p: 2 * n * sum }, hint: `Die ${n} zählt nur einmal: ${n} ${TIMES} (${x} + ${y}).` }], fields),
    praise: `Du hast erkannt: ${n}-mal die Summe.`,
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: KMK,
  });
}

function reverseNumber(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(11, 25);
  const { x, y, sum } = roundParts(rng, true);
  const value = n * sum;
  const expression = `${n} ${TIMES} ${x} + ${n} ${TIMES} ${y} = ${BOX}`;
  const prompt = 'Such den Faktor in beiden Teilen. Rechne dann vorteilhaft.';
  return item(SKILL, 2, {
    key: `zahl:${n}:${x}+${y}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, label: 'Ergebnis' },
    hints: [`In beiden Teilen steht ${n} als Faktor.`, `Rechne zuerst ${x} + ${y}.`],
    steps: [`${n} ${TIMES} ${x} + ${n} ${TIMES} ${y} = ${n} ${TIMES} (${x} + ${y}).`, `${x} + ${y} = ${sum}.`, `${n} ${TIMES} ${sum} = ${t(value)}.`],
    bugs: wholeBugs([{ id: 'ausklammern-doppelt', match: 2 * n * sum, hint: `Die ${n} zählt nur einmal: ${n} ${TIMES} (${x} + ${y}).` }], value),
    praise: 'Du hast den gemeinsamen Faktor genutzt.',
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: KMK,
  });
}

/** A missing part, or a sum where the common factor stands alone: 25 · 7 + 25 = 25 · 8. */
function reverseHard(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.5)) {
    const n = rng.int(11, 49);
    const k = rng.int(4, 19);
    const value = n * (k + 1);
    const expression = `${n} ${TIMES} ${k} + ${n} = ${BOX}`;
    const prompt = 'Rechne vorteilhaft.';
    return item(SKILL, 2, {
      key: `allein:${n}*${k}`,
      ab,
      prompt,
      expression,
      answer: { kind: 'number', value, label: 'Ergebnis' },
      hints: [`${k}-mal ${n}, und noch einmal ${n}. Wie oft ist das ${n}?`],
      steps: [`${n} ${TIMES} ${k} + ${n} ${TIMES} 1 = ${n} ${TIMES} ${k + 1}.`, `${n} ${TIMES} ${k + 1} = ${t(value)}.`],
      bugs: wholeBugs([{ id: 'verteilen-halb', match: n * k + 1, hint: `Das zweite ${n} steht für ${n} ${TIMES} 1. Es zählt ganz.` }], value),
      praise: 'Du hast die einzelne Zahl als einmal gelesen.',
      srText: `${prompt} ${toSpeech(expression)}.`,
      kmk: [...KMK, 'PK.problemloesen'],
    });
  }
  const n = rng.int(4, 19);
  const { x, y, sum } = roundParts(rng, true);
  const expression = `${n} ${TIMES} ${x} + ${n} ${TIMES} ${BOX} = ${n} ${TIMES} ${sum}`;
  const prompt = 'Welche Zahl fehlt?';
  return item(SKILL, 2, {
    key: `luecke:${n}:${x}+${y}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: y, label: 'Fehlende Zahl' },
    hints: [`Die beiden Teile ergeben zusammen ${sum}.`, `Was fehlt von ${x} bis ${sum}?`],
    steps: [`${sum} ${MINUS} ${x} = ${y}.`, `Probe: ${n} ${TIMES} (${x} + ${y}) = ${n} ${TIMES} ${sum}. Es fehlt die ${y}.`],
    praise: 'Du hast den fehlenden Summanden gefunden.',
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

// ─── Stufe 3: the minus version ──────────────────────────────────────────────

/** Just under a round number: 19, 49, 98, 199. */
function nearRound(rng: Rng, big: boolean): { b: number; round: number; gap: number } {
  const round = big ? rng.pick([100, 200, 300, 500]) : rng.pick([20, 30, 40, 50, 60]);
  const gap = rng.int(1, big ? 3 : 2);
  return { b: round - gap, round, gap };
}

function minusFields(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(3, 9);
  const { b, round, gap } = nearRound(rng, false);
  const fields: MultiField[] = [
    { id: 'g', value: n * round, before: `${n} ${TIMES} ${round} =`, label: `${n} mal ${round}` },
    { id: 'k', value: n * gap, before: `${n} ${TIMES} ${gap} =`, label: `${n} mal ${gap}` },
    { id: 's', value: n * b, before: 'Ergebnis:', label: 'Ergebnis' },
  ];
  const expression = `${n} ${TIMES} ${b}`;
  const prompt = `Rechne mit ${round} und zieh wieder ab.`;
  return item(SKILL, 3, {
    key: `felder:${n}*${b}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [`${b} ist ${gap} weniger als ${round}.`, `Du hast ${n}-mal ${gap} zu viel. Zieh das ab.`],
    steps: [`${n} ${TIMES} ${round} = ${n * round}.`, `${n} ${TIMES} ${gap} = ${n * gap}.`, `${n * round} ${MINUS} ${n * gap} = ${n * b}.`],
    bugs: multiBugs([
      { id: 'verteilen-halb', match: { s: n * round - gap }, hint: `Du hast ${n}-mal ${gap} zu viel, nicht nur ${gap}.` },
      { id: 'vorzeichen-verteilen', match: { s: n * round + n * gap }, hint: `${round} ist schon zu viel. Zieh ${n} ${TIMES} ${gap} ab.` },
    ], fields),
    praise: 'Du hast den zu großen Teil wieder abgezogen.',
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: KMK,
  });
}

function minusNumber(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(3, 12);
  const { b, round, gap } = nearRound(rng, true);
  const value = n * b;
  const expression = `${n} ${TIMES} ${b} = ${BOX}`;
  const prompt = 'Such eine glatte Zahl in der Nähe. Rechne dann vorteilhaft.';
  return item(SKILL, 3, {
    key: `zahl:${n}*${b}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, label: 'Ergebnis' },
    hints: [`Rechne zuerst mit ${round}.`, `Zieh dann ${n}-mal ${gap} wieder ab.`],
    steps: [`${n} ${TIMES} ${b} = ${n} ${TIMES} ${round} ${MINUS} ${n} ${TIMES} ${gap}.`, `${n} ${TIMES} ${round} = ${t(n * round)}.`, `${t(n * round)} ${MINUS} ${n * gap} = ${t(value)}.`],
    bugs: wholeBugs([
      { id: 'verteilen-halb', match: n * round - gap, hint: `Du hast ${n}-mal ${gap} zu viel, nicht nur ${gap}.` },
      { id: 'vorzeichen-verteilen', match: n * round + n * gap, hint: `${round} ist schon zu viel. Zieh ${n} ${TIMES} ${gap} ab.` },
    ], value),
    praise: `Du hast mit der glatten Zahl ${round} gerechnet.`,
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: KMK,
  });
}

/** Ausklammern with minus: 12 · 27 − 12 · 7 as 12 · 20; or "Welche Rechnung passt?". */
function minusReverse(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.5)) {
    const n = rng.int(11, 25);
    const round = rng.pick([20, 30, 40, 50, 100]);
    const y = rng.int(2, 9);
    const x = round + y;
    const value = n * round;
    const expression = `${n} ${TIMES} ${x} ${MINUS} ${n} ${TIMES} ${y} = ${BOX}`;
    const prompt = 'Such den Faktor in beiden Teilen. Rechne dann vorteilhaft.';
    return item(SKILL, 3, {
      key: `aus-minus:${n}:${x}-${y}`,
      ab,
      prompt,
      expression,
      answer: { kind: 'number', value, label: 'Ergebnis' },
      hints: [`In beiden Teilen steht ${n} als Faktor.`, `Rechne zuerst ${x} ${MINUS} ${y}.`],
      steps: [`${n} ${TIMES} ${x} ${MINUS} ${n} ${TIMES} ${y} = ${n} ${TIMES} (${x} ${MINUS} ${y}).`, `${x} ${MINUS} ${y} = ${round}.`, `${n} ${TIMES} ${round} = ${t(value)}.`],
      bugs: wholeBugs([{ id: 'vorzeichen-verteilen', match: n * (x + y), hint: 'Zwischen den Teilen steht ein Minus. Es bleibt auch in der Klammer.' }], value),
      praise: 'Du hast den gemeinsamen Faktor auch beim Minus genutzt.',
      srText: `${prompt} ${toSpeech(expression)}.`,
      kmk: [...KMK, 'PK.problemloesen'],
    });
  }
  const n = rng.int(3, 12);
  const { b, round, gap } = nearRound(rng, true);
  const expression = `${n} ${TIMES} ${b}`;
  const prompt = 'Welche Rechnung hat denselben Wert?';
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>([
    { label: `${n} ${TIMES} ${round} ${MINUS} ${n} ${TIMES} ${gap}` },
    { label: `${n} ${TIMES} ${round} ${MINUS} ${gap}`, whyWrong: `Du hast ${n}-mal ${gap} zu viel, nicht nur ${gap}.` },
    { label: `${n} ${TIMES} ${round} + ${n} ${TIMES} ${gap}`, whyWrong: `${round} ist schon zu viel. Zieh ${n} ${TIMES} ${gap} ab.` },
  ]);
  return item(SKILL, 3, {
    key: `welche:${n}*${b}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: [`${b} ist ${gap} weniger als ${round}.`, `Der Faktor ${n} gehört zu beiden Teilen.`],
    steps: [`${b} = ${round} ${MINUS} ${gap}.`, `${n} ${TIMES} ${b} = ${n} ${TIMES} ${round} ${MINUS} ${n} ${TIMES} ${gap}.`],
    praise: 'Du hast die passende Zerlegung mit Minus erkannt.',
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const FORMS = {
  1: { 1: splitFields, 2: splitNumber, 3: splitReason },
  2: { 1: reverseFields, 2: reverseNumber, 3: reverseHard },
  3: { 1: minusFields, 2: minusNumber, 3: minusReverse },
} as const satisfies Record<1 | 2 | 3, Record<Ab, (rng: Rng, ab: Ab) => Exercise>>;

export const distributivSkill: SkillDef = {
  ...SKILL,
  title: 'Zerlegen und ausklammern',
  description: 'Du zerlegst einen Faktor und rechnest in zwei Teilen.',
  stufen: {
    1: 'Einen Faktor zerlegen und in zwei Teilen rechnen',
    2: 'Rückwärts: den gemeinsamen Faktor ausklammern',
    3: 'Mit Minus: knapp unter einer glatten Zahl rechnen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
