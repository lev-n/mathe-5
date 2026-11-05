/**
 * zahlen.lesen: große Zahlen lesen und schreiben. The Stufe chooses the range (S1 ≤ 1 Million without inner zeros, S2 ≤ 1 Milliarde with inner
 * zeros, S3 beyond 1 Milliarde and digits to words); AB varies the support and the form inside that range.
 */
import { MAX_NUMBER } from '../../core/age';
import { BOX, fmt, numberWord } from '../../core/format';
import type { Ab, Bug, Exercise, GenContext, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, numberBugs, targetAb, type MaybeBug } from '../shared';
import { anyNumber, emptyTable, groupLine, groupsOf, innerZeroNumber, noZeroNumber, placeTable, shownWord } from './helpers';

const SKILL = { id: 'zahlen.lesen', topicId: 'zahlen' } as const;
const KMK = ['ZO.grosse-zahlen'];

const fromGroups = (groups: readonly number[]) => groups.reduce((a, g) => a * 1000 + g, 0);

/** 3 040 000 written as heard, without the zeros of the groups: 340. */
export function withoutPadding(n: number): number {
  return Number(groupsOf(n).filter((g) => g > 0).join(''));
}

/** 3 040 000 with its empty groups left out: 3 040. */
export function withoutEmptyGroups(n: number): number {
  return fromGroups(groupsOf(n).filter((g, i) => i === 0 || g > 0));
}

/** 304 120 with the 0 inside a group left out: 34 120. */
export function withoutGroupZero(n: number): number {
  return Number(groupsOf(n).map((g, i) => {
    const text = i === 0 ? String(g) : String(g).padStart(3, '0');
    return g >= 100 && Math.floor(g / 10) % 10 === 0 && g % 10 !== 0 ? text.replace('0', '') : text;
  }).join(''));
}

/** 312 450 written as heard: 312 000 450. */
export function asHeard(n: number): number | null {
  const low = n % 1000;
  const high = Math.floor(n / 1000);
  if (low === 0 || high === 0) return null;
  const heard = Number(`${high}000${low}`);
  return heard <= MAX_NUMBER ? heard : null;
}

/** Tens and ones of the first group that says them the other way round: 34 is said 'vierunddreißig'. */
function turned(n: number): { value: number; t: number; o: number } | null {
  const groups = groupsOf(n);
  for (let i = 0; i < groups.length; i++) {
    const rest = groups[i] % 100;
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    if (t < 2 || o === 0 || t === o) continue;
    const copy = [...groups];
    copy[i] = groups[i] - rest + o * 10 + t;
    return { value: fromGroups(copy), t, o };
  }
  return null;
}

/** A Milliarde taken as a Million; only computable if the Millionen group is empty. */
export function milliardeAsMillion(n: number): number | null {
  if (n < 1e9 || Math.floor(n / 1e6) % 1000 !== 0) return null;
  return Math.floor(n / 1e9) * 1e6 + n % 1e6;
}

function writeBugs(n: number, extra: MaybeBug[] = [], correct = n): Bug[] {
  const zeroHint = 'Trag die Zahl in die Stellentafel ein. Leere Stellen bekommen eine 0.';
  const turn = turned(n);
  const heard = asHeard(n);
  const milliarde = milliardeAsMillion(n);
  return numberBugs([
    ...extra,
    { id: 'null-vergessen', match: withoutPadding(n), hint: zeroHint },
    { id: 'null-vergessen-2', match: withoutEmptyGroups(n), hint: zeroHint },
    { id: 'null-vergessen-3', match: withoutGroupZero(n), hint: zeroHint },
    milliarde !== null && { id: 'milliarde-million', match: milliarde, hint: 'Eine Milliarde sind 1000 Millionen.' },
    heard !== null && { id: 'wie-gehoert', match: heard, hint: 'Nach „tausend“ folgen genau drei Stellen: Hunderter, Zehner, Einer.' },
    turn && { id: 'zahl-dreher', match: turn.value, hint: `„${numberWord(turn.t * 10 + turn.o)}“ sind ${turn.t} Zehner und ${turn.o} Einer. Schreib zuerst die Zehner.` },
  ], correct);
}

const WRITE_HINTS = ['Teile das Zahlwort bei den großen Wörtern: Milliarden, Millionen, tausend.', 'Jede Gruppe nach dem großen Wort hat genau drei Stellen.'];
const THOUSAND_HINTS = ['Suche im Zahlwort das Wort „tausend“.', 'Vor „tausend“ stehen die Tausender. Danach kommen genau drei Stellen.'];

function writeSteps(n: number): Exercise['steps'] {
  return [
    'Teile das Zahlwort in Dreiergruppen.',
    { text: `${groupLine(n)}.`, visual: placeTable(n) },
    ...(/0/.test(String(n)) ? ['Leere Stellen bekommen eine 0.'] : []),
    `Zusammen: ${fmt(n)}.`,
  ];
}

/** Write a number word with digits, with an empty Stellentafel as support if `table`. */
function writeWord(stufe: Stufe, ab: Ab, n: number, table: boolean): Exercise {
  return build(SKILL, stufe, {
    key: `wort:${n}:${table ? 't' : 'o'}`,
    ab,
    prompt: `Schreibe mit Ziffern: ${shownWord(n)}.`,
    ...(table ? { visual: emptyTable(n) } : {}),
    answer: { kind: 'number', value: n, label: 'Zahl mit Ziffern' },
    hints: n < 1e6 ? THOUSAND_HINTS : WRITE_HINTS,
    steps: writeSteps(n),
    bugs: writeBugs(n),
    praise: /0/.test(String(n)) ? 'Du hast die leeren Stellen mit 0 gefüllt.' : 'Du hast das Zahlwort in Dreiergruppen geteilt.',
    srText: `Schreibe die Zahl ${numberWord(n)} mit Ziffern.`,
    kmk: KMK,
  });
}

/** Write a number word with digits, then add a Stufenzahl: the number has to be understood, not only copied. */
function writeAndAdd(stufe: Stufe, ab: Ab, n: number, add: number, addText: string, wrongAdd: { value: number; id: string; hint: string } | null): Exercise {
  const sum = n + add;
  return build(SKILL, stufe, {
    key: `dazu:${n}:${add}`,
    ab,
    prompt: `Schreibe mit Ziffern: ${shownWord(n)}. Zähle dann ${addText} dazu.`,
    answer: { kind: 'number', value: sum, label: 'Ergebnis' },
    hints: [...(n < 1e6 ? THOUSAND_HINTS.slice(0, 1) : WRITE_HINTS.slice(0, 1)), `Schreib zuerst die Zahl. Ändere dann nur die Stelle von ${addText}.`],
    steps: [
      { text: `Das Zahlwort als Zahl: ${fmt(n)}.`, visual: placeTable(n) },
      `${fmt(n)} + ${fmt(add)} = ${fmt(sum)}`,
    ],
    bugs: writeBugs(n, [
      { id: 'nicht-addiert', match: n, hint: `Die Zahl steht richtig da. Zähle jetzt noch ${addText} dazu.` },
      wrongAdd && { id: wrongAdd.id, match: wrongAdd.value, hint: wrongAdd.hint },
    ], sum),
    praise: 'Du hast erst geschrieben und dann die Stelle geändert.',
    srText: `Schreibe die Zahl ${numberWord(n)} mit Ziffern. Zähle dann ${addText} dazu.`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return writeWord(1, ab, noZeroNumber(rng, 5), true);
  if (ab === 2) return writeWord(1, ab, noZeroNumber(rng, 6), false);
  // AB III: only a digit below 9 at the place, so the sum keeps its digits
  let n = noZeroNumber(rng, 6);
  const add = rng.pick([100, 1000, 10_000]);
  const digit = Math.floor(n / add) % 10;
  if (digit === 9) n -= add;
  return writeAndAdd(1, ab, n, add, fmt(add), { value: n + add * 10, id: 'falsche-stelle', hint: `Prüfe die Stelle: ${fmt(add)} ändert genau eine Ziffer.` });
}

/** How many zeros the number has. */
function countZeros(ab: Ab, n: number): Exercise {
  const text = String(n);
  const zeros = (text.match(/0/g) ?? []).length;
  const trailing = text.length - text.replace(/0+$/, '').length;
  return build(SKILL, 2, {
    key: `nullen:${n}`,
    ab,
    prompt: `Du schreibst ${shownWord(n)} mit Ziffern. Wie viele Nullen schreibst du?`,
    answer: { kind: 'number', value: zeros, label: 'Anzahl der Nullen' },
    hints: ['Schreib die Zahl zuerst auf.', 'Zähle alle Nullen, auch die zwischen den Ziffern.'],
    steps: [{ text: `Die Zahl heißt ${fmt(n)}.`, visual: placeTable(n) }, `Die Zahl hat ${zeros} Nullen.`],
    bugs: numberBugs([
      { id: 'nullen-innen', match: trailing, hint: 'Zähle auch die Nullen zwischen den Ziffern.' },
    ], zeros),
    praise: 'Du hast auch die Nullen im Inneren gezählt.',
    srText: `Du schreibst ${numberWord(n)} mit Ziffern. Wie viele Nullen schreibst du?`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

/** 3 Millionen + 40 Tausender + 5 Einer. */
function fromParts(rng: Rng, ab: Ab): Exercise {
  const a = rng.int(2, 999);
  const b = rng.pick([rng.int(1, 9), rng.int(1, 9) * 10, rng.int(1, 9) * 100]);
  const c = rng.pick([rng.int(1, 9), rng.int(1, 9) * 10]);
  const n = a * 1e6 + b * 1000 + c;
  return build(SKILL, 2, {
    key: `teile:${n}`,
    ab,
    prompt: 'Schreibe als eine Zahl.',
    expression: `${a} Millionen + ${b} Tausender + ${c} Einer = ${BOX}`,
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: ['Jede Gruppe hat drei Stellen: Millionen, Tausender, Einer.', 'Fülle jede Gruppe vorne mit Nullen auf.'],
    steps: [{ text: `${groupLine(n)}.`, visual: placeTable(n) }, 'Leere Stellen bekommen eine 0.', `Zusammen: ${fmt(n)}.`],
    bugs: numberBugs([
      { id: 'null-vergessen', match: Number(`${a}${b}${c}`), hint: 'Trag die Zahl in die Stellentafel ein. Leere Stellen bekommen eine 0.' },
    ], n),
    praise: 'Du hast jede Dreiergruppe mit Nullen aufgefüllt.',
    srText: `${a} Millionen plus ${b} Tausender plus ${c} Einer. Schreibe als eine Zahl.`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return writeWord(2, ab, innerZeroNumber(rng, 7), true);
  if (ab === 2) return rng.chance(0.12) ? writeWord(2, ab, 1e9, false) : writeWord(2, ab, innerZeroNumber(rng, rng.int(8, 9)), false);
  return rng.chance(0.5) ? countZeros(ab, innerZeroNumber(rng, rng.int(8, 9))) : fromParts(rng, ab);
}

/** Pick a word for the number: the Zahlwort tasks show digits in a picture, so the voice does not say the answer. */
function wordChoice(rng: Rng, ab: Ab, stufe: Stufe, n: number, shownAs: 'tafel' | 'zelle'): Exercise {
  const groups = groupsOf(n);
  const swapped = fromGroups([groups[0], groups[groups.length - 1], ...groups.slice(1, -1)]);
  const wrongs = [
    { value: Math.floor(n / 1000), why: 'Zähle die Dreiergruppen von rechts. Die Zahl hat eine Gruppe mehr.' },
    { value: n * 1000, why: 'Zähle die Dreiergruppen von rechts. Die Zahl hat eine Gruppe weniger.' },
    { value: withoutEmptyGroups(n), why: 'Leere Dreiergruppen zählen mit. Lies die Gruppen von rechts.' },
    { value: swapped, why: 'Lies die Gruppen von links nach rechts, in ihrer Reihenfolge.' },
    { value: n + (n % 1000 >= 100 ? 100 : 1), why: 'Vergleiche die letzte Dreiergruppe noch einmal Ziffer für Ziffer.' },
  ].filter((w) => w.value !== n && w.value < 1e15 && w.value > 0);
  const answer = makeChoice(rng, { label: shownWord(n) }, wrongs.map((w) => ({ label: shownWord(w.value), whyWrong: w.why })));
  return build(SKILL, stufe, {
    key: `wahl:${n}:${shownAs}`,
    ab,
    prompt: shownAs === 'tafel' ? 'Welches Zahlwort passt zur Stellentafel?' : 'Welches Zahlwort passt zu dieser Zahl?',
    visual: shownAs === 'tafel' ? placeTable(n) : { type: 'table', header: ['Zahl'], rows: [[fmt(n)]] },
    answer: { ...answer, silentOptions: true },
    hints: ['Teile die Zahl von rechts in Dreiergruppen.', 'Lies dann von links: zuerst die größte Gruppe.'],
    steps: [`Die Gruppen von links: ${groupLine(n)}.`, `Die Zahl heißt ${numberWord(n)}.`],
    praise: 'Du hast die Dreiergruppen von rechts abgezählt.',
    // digit by digit: a screen reader says a whole number as the Zahlwort the child has to find
    srText: `Welches Zahlwort passt zu dieser Zahl? Die Ziffern von links: ${String(n).split('').join(' ')}.`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

/** Above a Milliarde, if the range allows it; otherwise the same forms stay just below it (RangeDefaults.beyondMilliarde). */
function bigDigits(rng: Rng, ctx: GenContext, low: number, high: number): number {
  return ctx.ranges.beyondMilliarde ? rng.int(low, high) : 9;
}

/** A number whose Millionen group is empty, so that a Milliarde taken as a Million shows up. */
function emptyMillions(rng: Rng, digits: number): number {
  const g = groupsOf(innerZeroNumber(rng, digits));
  if (g.length >= 3) g[g.length - 3] = 0;
  return fromGroups(g);
}

function stufe3(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const beyond = ctx.ranges.beyondMilliarde;
  if (ab === 1) {
    const n = beyond && rng.chance(0.5) ? emptyMillions(rng, 10) : innerZeroNumber(rng, bigDigits(rng, ctx, 10, 10));
    return rng.chance(0.5) ? writeWord(3, ab, n, true) : wordChoice(rng, ab, 3, n, 'tafel');
  }
  if (ab === 2) return wordChoice(rng, ab, 3, innerZeroNumber(rng, bigDigits(rng, ctx, 11, 12)), 'zelle');
  const n = anyNumber(rng, bigDigits(rng, ctx, 10, 11));
  if (beyond) {
    // a digit below 9 at the Milliarden place, so the sum changes one digit
    const start = Math.floor(n / 1e9) % 10 === 9 ? n - 1e9 : n;
    return writeAndAdd(3, ab, start, 1e9, '1 Milliarde', { value: start + 1e6, id: 'milliarde-million', hint: 'Eine Milliarde sind 1000 Millionen.' });
  }
  const start = Math.floor(n / 1e6) % 10 === 9 ? n - 1e6 : n;
  return writeAndAdd(3, ab, start, 1e6, '1 Million', { value: start + 1e3, id: 'falsche-stelle', hint: 'Eine Million sind 1000 Tausender.' });
}

export const lesenSkill: SkillDef = {
  ...SKILL,
  title: 'Große Zahlen lesen',
  description: 'Du liest und schreibst Zahlen bis über eine Milliarde.',
  stufen: {
    1: 'Zahlwörter bis eine Million in Ziffern, ohne Nullen im Inneren',
    2: 'Bis eine Milliarde, mit Nullen im Inneren, in Dreiergruppen',
    3: 'Über eine Milliarde; Ziffern zu Zahlwörtern auswählen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return stufe1(rng, ab);
    return stufe === 2 ? stufe2(rng, ab) : stufe3(rng, ab, ctx);
  },
};
