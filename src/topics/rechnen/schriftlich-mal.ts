/**
 * Schriftlich malnehmen (docs/research.md §6). Stufe 1: up to 4 digits times one digit, inner zeros. Stufe 2: up to 4 digits times two digits, with the
 * Überschlag. Stufe 3: a three-digit factor (threeDigitFactor) and a planted slip to find. Without the three-digit factor Stufe 3 is the planted slip only.
 */
import { TIMES, fmt, toSpeech } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, MultiField, Rng, SkillDef, SubtractionMethod, VisualOf, WrittenMask } from '../../core/types';
import { digitAt, layoutMul, numLength, partialsSpeech, writtenVisual } from '../../core/written';
import { multiBugs, pickPerson, targetAb } from '../shared';
import { attempt, canon, equationOf, expressionOf, item, maskedSpeech, partialLines, randLen, roughFits, withInnerZeros, writtenItem, writtenSteps } from './common';

const SKILL = { id: 'rechnen.schriftlich-mal', topicId: 'rechnen' } as const;
const KMK = ['ZO.schriftlich'];

/** Operands that pass `ok`. */
function operands(make: () => [number, number], ok: (a: number, b: number) => boolean, fallback: [number, number]): number[] {
  return attempt<number[]>(
    () => {
      const [a, b] = make();
      return ok(a, b) ? [a, b] : null;
    },
    () => fallback,
  );
}

const hasCarry = (a: number, b: number) => layoutMul(a, b).carryCount > 0;
const fits = (a: number, b: number) => roughFits('mul', [a, b]);

// ─── Stufe 1: times one digit ────────────────────────────────────────────────

/** A digit of the first factor or of the product is missing. The product is known, so a division or the calculation itself gives one digit. */
function missingDigit(rng: Rng, ab: Ab): Exercise {
  const [a, m] = operands(() => [withInnerZeros(rng, 4), rng.int(3, 9)], hasCarry, [4052, 7]);
  const product = a * m;
  const inProduct = rng.chance(0.5);
  // any place but the first digit, and no 0: the 0 of the first factor is the point of the Stufe, not the riddle
  const number = inProduct ? product : a;
  const free = Array.from({ length: numLength(number) - 1 }, (_, p) => p).filter((p) => digitAt(number, p) !== 0);
  const place = rng.pick(free.length ? free : [0]);
  const mask: WrittenMask = inProduct ? { row: 'result', place, label: 'A' } : { row: 'operand', index: 0, place, label: 'A' };
  const value = digitAt(number, place);
  const fields: MultiField[] = [{ id: 'A', value, before: 'A =', label: 'Ziffer A' }];
  const prompt = 'Welche Ziffer fehlt?';
  return item(SKILL, 1, {
    key: `raetsel:${canon('mul', [a, m])}:${mask.row}${place}`,
    ab,
    prompt,
    visual: writtenVisual({ type: 'written', op: 'mul', operands: [a, m], showSolution: false, shownResult: product, masks: [mask] }),
    answer: { kind: 'multi', fields },
    hints: inProduct ? ['Rechne die Aufgabe von rechts nach links aus.', 'Zähle jeden Übertrag erst nach dem Malnehmen dazu.'] : [`Teile das Ergebnis durch ${m}. Dann kennst du den ersten Faktor.`, 'Du kannst auch die Ziffern von 0 bis 9 einsetzen und prüfen.'],
    steps: [
      inProduct ? `Rechne: ${equationOf('mul', [a, m])}.` : `Rechne rückwärts: ${fmt(product)} : ${m} = ${fmt(a)}.`,
      { text: `Also ist A = ${value}.`, visual: writtenVisual({ type: 'written', op: 'mul', operands: [a, m], showSolution: true }) },
    ],
    bugs: multiBugs(
      // the digit without the carry of the place before it
      inProduct && place > 0 && layoutMul(a, m).partials[0].carries[place] > 0 ? [{ id: 'uebertrag-vergessen', match: { A: (value - layoutMul(a, m).partials[0].carries[place] + 10) % 10 }, hint: 'Prüfe die Stelle mit dem Übertrag noch einmal.' }] : [],
      fields,
    ),
    praise: inProduct ? 'Du hast die fehlende Ziffer ausgerechnet.' : 'Du hast rückwärts gerechnet und die Ziffer gefunden.',
    srText: `${prompt} ${maskedSpeech(a, [mask], 'operand')} mal ${m} gleich ${maskedSpeech(product, [mask], 'result')}.`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function stufe1(rng: Rng, ab: Ab, method: SubtractionMethod): Exercise {
  if (ab === 3) return rng.chance(0.6)
    ? missingDigit(rng, ab)
    : writtenItem(SKILL, 1, { ab, op: 'mul', operands: operands(() => [withInnerZeros(rng, 4, 2), rng.int(6, 9)], (a, b) => hasCarry(a, b) && fits(a, b), [6005, 8]), method, kmk: [...KMK, 'ZO.runden'], rough: true });
  if (ab === 2) return writtenItem(SKILL, 1, { ab, op: 'mul', operands: operands(() => [withInnerZeros(rng, 4), rng.int(3, 9)], hasCarry, [4052, 7]), method, kmk: KMK });
  return writtenItem(SKILL, 1, { ab, op: 'mul', operands: operands(() => [randLen(rng, rng.int(3, 4)), rng.int(2, 9)], hasCarry, [738, 6]), method, kmk: KMK });
}

// ─── Stufe 2: times two digits ───────────────────────────────────────────────

function stufe2(rng: Rng, ab: Ab, method: SubtractionMethod): Exercise {
  if (ab === 1) {
    const ops = operands(() => [randLen(rng, 3), rng.chance(0.25) ? rng.int(2, 9) * 10 : rng.int(12, 29)], (_, b) => b % 11 !== 0, [348, 24]);
    return writtenItem(SKILL, 2, { ab, op: 'mul', operands: ops, method, kmk: KMK });
  }
  if (ab === 2) {
    const ops = operands(() => [randLen(rng, rng.int(3, 4)), rng.int(23, 89)], (a, b) => b % 10 !== 0 && b % 11 !== 0 && fits(a, b), [1254, 37]);
    return writtenItem(SKILL, 2, { ab, op: 'mul', operands: ops, method, kmk: [...KMK, 'ZO.runden'], rough: true });
  }
  const ops = operands(() => [withInnerZeros(rng, 4), rng.int(34, 98)], (a, b) => b % 10 !== 0 && b % 11 !== 0 && fits(a, b), [4056, 37]);
  return writtenItem(SKILL, 2, { ab, op: 'mul', operands: ops, method, kmk: [...KMK, 'ZO.runden'], rough: true, prompt: 'Mach zuerst den Überschlag. Achte auf die 0 im ersten Faktor.' });
}

// ─── Stufe 3: three digits and planted slips ─────────────────────────────────

type Slip = 'versatz' | 'uebertrag' | 'summe';

interface Planted {
  a: number;
  b: number;
  slip: Slip;
  /** Index of the partial product with the slip; partials.length means the sum. */
  line: number;
  partials: { value: number; shift: number }[];
  shown: number;
}

const ORDINAL_DAT = ['Beim ersten Teilprodukt', 'Beim zweiten Teilprodukt', 'Beim dritten Teilprodukt'];
const SLIP_TEXT: Record<Slip, string> = {
  versatz: 'Ein Teilprodukt steht nicht an seiner Stelle.',
  uebertrag: 'In einem Teilprodukt fehlt ein Übertrag.',
  summe: 'Beim Addieren fehlt ein Übertrag.',
};

/** One slip in an otherwise right calculation, chosen so that it really shows in the written lines. */
function plantSlip(rng: Rng, three: boolean): Planted {
  return attempt<Planted>(
    () => {
      const a = three ? randLen(rng, rng.int(3, 4)) : randLen(rng, 4);
      const b = three ? randLen(rng, 3) : rng.int(13, 98);
      if (b % 10 === 0 || String(b).includes('0')) return null;
      const lay = layoutMul(a, b);
      const right = lay.partials.map((p) => ({ value: p.value, shift: p.shift }));
      const slip = rng.pick(['versatz', 'uebertrag', 'summe'] as const);
      if (slip === 'versatz') {
        // the first (highest) partial product one place too far to the right
        const partials = right.map((p, i) => (i === 0 ? { ...p, shift: p.shift - 1 } : p));
        return { a, b, slip, line: 0, partials, shown: partials.reduce((s, p) => s + p.value * 10 ** p.shift, 0) };
      }
      if (slip === 'uebertrag') {
        const line = rng.int(0, lay.partials.length - 1);
        const places = lay.partials[line].carries.flatMap((c, p) => (c > 0 && p > 0 && p < numLength(a) ? [p] : []));
        if (places.length === 0) return null;
        const place = rng.pick(places);
        const value = lay.partials[line].value - lay.partials[line].carries[place] * 10 ** place;
        const partials = right.map((p, i) => (i === line ? { ...p, value } : p));
        return { a, b, slip, line, partials, shown: partials.reduce((s, p) => s + p.value * 10 ** p.shift, 0) };
      }
      const places = lay.sumCarries.flatMap((c, p) => (c > 0 && p > 0 && p < numLength(lay.result) - 1 ? [p] : []));
      if (places.length === 0) return null;
      const place = rng.pick(places);
      return { a, b, slip, line: lay.partials.length, partials: right, shown: lay.result - lay.sumCarries[place] * 10 ** place };
    },
    () => ({ a: 1254, b: 37, slip: 'versatz', line: 0, partials: [{ value: 3762, shift: 0 }, { value: 8778, shift: 0 }], shown: 12540 }),
  );
}

function slipVisual(pl: Planted): VisualOf<'written'> {
  return writtenVisual({ type: 'written', op: 'mul', operands: [pl.a, pl.b], showSolution: false, shownResult: pl.shown, shownPartials: pl.partials });
}

const slipSpeech = (pl: Planted) => `${toSpeech(expressionOf('mul', [pl.a, pl.b]))} gleich ${toSpeech(fmt(pl.shown))}. ${partialsSpeech(pl.partials)}`;

/** "Wo steckt der Fehler?": choose the line. */
function whichLine(rng: Rng, ab: Ab, three: boolean): Exercise {
  const pl = plantSlip(rng, three);
  const options: ChoiceOption[] = [
    ...pl.partials.map((_, i) => (i === pl.line ? { label: ORDINAL_DAT[i] } : { label: ORDINAL_DAT[i], whyWrong: `Rechne ${fmt(pl.a)} ${TIMES} ${digitAt(pl.b, pl.partials.length - 1 - i)} nach. Prüfe auch die Einrückung.` })),
    pl.line === pl.partials.length ? { label: 'Beim Addieren' } : { label: 'Beim Addieren', whyWrong: 'Die Summe der Zeilen passt. Der Fehler steht weiter oben.' },
  ];
  const who = pickPerson(rng).name;
  const prompt = 'Rechne jede Zeile nach. Wo steckt der Fehler?';
  const lay = layoutMul(pl.a, pl.b);
  return item(SKILL, 3, {
    key: `wo:${canon('mul', [pl.a, pl.b])}:${pl.slip}:${pl.line}`,
    ab,
    context: `${who} rechnet schriftlich.`,
    prompt,
    visual: slipVisual(pl),
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Rechne jedes Teilprodukt selbst aus.', 'Jedes Teilprodukt endet unter seiner Ziffer. Stimmt das in jeder Zeile?'],
    steps: [
      ...partialLines(pl.a, pl.b),
      { text: `${SLIP_TEXT[pl.slip]} Richtig ist ${fmt(lay.result)}.`, visual: writtenVisual({ type: 'written', op: 'mul', operands: [pl.a, pl.b], showSolution: true }) },
    ],
    praise: 'Du hast jede Zeile nachgerechnet.',
    srText: `${who} rechnet schriftlich: ${slipSpeech(pl)}. ${prompt}`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** "Was ist passiert?": choose the explanation. */
function whatHappened(rng: Rng, ab: Ab, three: boolean): Exercise {
  const pl = plantSlip(rng, three);
  const wrong = (s: Slip) => (s === 'versatz' ? 'Die Teilprodukte stehen an ihren Stellen. Schau auf die Ziffern.' : s === 'uebertrag' ? 'Rechne die Teilprodukte nach. Die Ziffern stimmen dort.' : 'Addiere die Zeilen selbst. Die Summe passt zu den Zeilen.');
  const options: ChoiceOption[] = (['versatz', 'uebertrag', 'summe'] as const).map((s) => (s === pl.slip ? { label: SLIP_TEXT[s] } : { label: SLIP_TEXT[s], whyWrong: wrong(s) }));
  const who = pickPerson(rng).name;
  const prompt = 'Was ist in dieser Rechnung passiert?';
  return item(SKILL, 3, {
    key: `was:${canon('mul', [pl.a, pl.b])}:${pl.slip}:${pl.line}`,
    ab,
    context: `${who} rechnet schriftlich.`,
    prompt,
    visual: slipVisual(pl),
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Rechne jedes Teilprodukt selbst aus und vergleiche.', 'Prüfe zuerst die Ziffern, dann die Einrückung, dann die Summe.'],
    steps: [
      ...partialLines(pl.a, pl.b),
      { text: `${SLIP_TEXT[pl.slip]} Richtig ist ${fmt(pl.a * pl.b)}.`, visual: writtenVisual({ type: 'written', op: 'mul', operands: [pl.a, pl.b], showSolution: true }) },
    ],
    praise: 'Du hast den Fehler genau beschrieben.',
    srText: `${who} rechnet schriftlich: ${slipSpeech(pl)}. ${prompt}`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** "Rechne die Aufgabe richtig": the written answer, with the slip still on the screen. */
function fixSlip(rng: Rng, ab: Ab, three: boolean, method: SubtractionMethod): Exercise {
  const pl = plantSlip(rng, three);
  const who = pickPerson(rng).name;
  const prompt = 'Such den Fehler. Rechne die Aufgabe dann richtig.';
  const extra: Bug[] = [{ id: 'fehler-uebernommen', match: pl.shown, hint: 'Das ist noch das Ergebnis mit dem Fehler. Rechne jede Zeile selbst.' }];
  return writtenItem(SKILL, 3, {
    ab,
    op: 'mul',
    operands: [pl.a, pl.b],
    method,
    kmk: [...KMK, 'PK.argumentieren'],
    keyPart: 'berichtigen',
    context: `${who} rechnet schriftlich.`,
    prompt,
    visual: slipVisual(pl),
    extraBugs: extra,
    hints: ['Rechne selbst Zeile für Zeile und vergleiche mit der Rechnung oben.', pl.line < pl.partials.length ? `Schau ${ORDINAL_DAT[pl.line].replace('Beim', 'beim')} genau hin.` : 'Schau beim Addieren genau hin.'],
    steps: [SLIP_TEXT[pl.slip], ...writtenSteps('mul', [pl.a, pl.b], method, false).slice(0, 4)],
    praise: 'Du hast den Fehler gefunden und richtig gerechnet.',
    say: `${who} rechnet schriftlich: ${slipSpeech(pl)}. ${prompt}`,
  });
}

function stufe3(rng: Rng, ab: Ab, three: boolean, method: SubtractionMethod): Exercise {
  if (!three) {
    if (ab === 1) return whichLine(rng, ab, false);
    if (ab === 2) return whatHappened(rng, ab, false);
    return fixSlip(rng, ab, false, method);
  }
  if (ab === 1) {
    const ops = operands(() => [randLen(rng, 3), randLen(rng, 3)], (a, b) => !String(b).includes('0') && fits(a, b), [624, 315]);
    return writtenItem(SKILL, 3, { ab, op: 'mul', operands: ops, method, kmk: [...KMK, 'ZO.runden'], rough: true });
  }
  if (ab === 2) {
    if (rng.chance(0.5)) return whatHappened(rng, ab, true);
    const ops = operands(() => [randLen(rng, rng.int(3, 4)), withInnerZeros(rng, 3)], (a, b) => digitAt(b, 1) === 0 && digitAt(b, 0) > 0 && fits(a, b), [624, 305]);
    return writtenItem(SKILL, 3, { ab, op: 'mul', operands: ops, method, kmk: [...KMK, 'ZO.runden'], rough: true, prompt: 'Mach zuerst den Überschlag. Achte auf die 0 im zweiten Faktor.' });
  }
  if (rng.chance(0.5)) return fixSlip(rng, ab, true, method);
  const ops = operands(() => [withInnerZeros(rng, 4), randLen(rng, 3)], (a, b) => !String(b).includes('0') && fits(a, b), [4056, 738]);
  return writtenItem(SKILL, 3, { ab, op: 'mul', operands: ops, method, kmk: [...KMK, 'ZO.runden'], rough: true });
}

export const schriftlichMalSkill: SkillDef = {
  ...SKILL,
  title: 'Schriftlich malnehmen',
  description: 'Du multiplizierst schriftlich und prüfst mit dem Überschlag.',
  stufen: {
    1: 'Bis 4 Stellen mal eine Ziffer, auch mit Nullen',
    2: 'Bis 4 Stellen mal eine zweistellige Zahl',
    3: 'Dreistelliger Faktor und eingebaute Fehler finden',
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
