/**
 * Dreisatz: erst auf eins, dann auf die gesuchte Menge.
 * Stufe 1: many to one: 5 Hefte kosten 10 €; AB II with Cent and harder numbers; AB III backwards from one, or two offers compared per piece.
 * Stufe 2: all three steps with a table: 4 kg, 1 kg, 6 kg; AB II only the end; AB III asks for the amount.
 * Stufe 3: does it fit? AB I decides, AB II calculates a story that may not be proportional (together or one after the other); AB III a fixed price, or picks the story that fits.
 */
import { BOX, fmt } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, plural, targetAb } from '../shared';
import { COMMA_FIELD, EURO_FIELD, euro, finish, q, speak } from './helpers';

const SKILL = { id: 'groessen.schlussrechnung', topicId: 'groessen' } as const;
const KMK = ['SF.dreisatz'];

// ─── Stufe 1: many to one ────────────────────────────────────────────────────

interface Piece {
  many: string;
  verb: string;
  ask: string;
  before: string;
  unit: '€' | 'kg' | 'l' | 'min';
  /** The value of one, in the base step of the unit (Cent for €), and fitting the noun: at AB I and with harder numbers. */
  easy: (rng: Rng) => number;
  hard: (rng: Rng) => number;
}

const PIECES: readonly Piece[] = [
  { many: 'Hefte', verb: 'kosten', ask: 'Was kostet 1 Heft?', before: '1 Heft kostet', unit: '€', easy: (r) => r.int(1, 3) * 100, hard: (r) => r.int(19, 59) * 5 },
  { many: 'Stifte', verb: 'kosten', ask: 'Was kostet 1 Stift?', before: '1 Stift kostet', unit: '€', easy: (r) => r.int(1, 2) * 100, hard: (r) => r.int(10, 38) * 5 },
  { many: 'Brötchen', verb: 'kosten', ask: 'Was kostet 1 Brötchen?', before: '1 Brötchen kostet', unit: '€', easy: (r) => r.pick([50, 100]), hard: (r) => r.int(8, 19) * 5 },
  { many: 'Fahrkarten', verb: 'kosten', ask: 'Was kostet 1 Fahrkarte?', before: '1 Fahrkarte kostet', unit: '€', easy: (r) => r.int(2, 6) * 100, hard: (r) => r.int(31, 99) * 5 },
  { many: 'Kisten', verb: 'wiegen', ask: 'Wie schwer ist 1 Kiste?', before: '1 Kiste wiegt', unit: 'kg', easy: (r) => r.int(2, 9), hard: (r) => r.int(11, 25) },
  { many: 'Kanister', verb: 'fassen', ask: 'Wie viel fasst 1 Kanister?', before: '1 Kanister fasst', unit: 'l', easy: (r) => r.int(2, 9), hard: (r) => r.int(11, 25) },
  { many: 'Runden', verb: 'dauern', ask: 'Wie lange dauert 1 Runde?', before: '1 Runde dauert', unit: 'min', easy: (r) => r.int(2, 9), hard: (r) => r.int(11, 25) },
];

const isEuro = (unit: string) => unit === '€';
/** A value in the base step of its unit (Cent for €) as text. */
const shown = (v: number, unit: string) => (isEuro(unit) ? euro(v) : q(v, unit));
const inUnit = (v: number, unit: string) => (isEuro(unit) ? v / 100 : v);
const decimalsOf = (unit: string) => (isEuro(unit) ? EURO_FIELD : COMMA_FIELD);
/** Rounds away what a float adds: 7.2 − 6 is 1,2, so that it counts as the answer and never as a bug. */
const clean = (x: number) => Math.round(x * 1000) / 1000;

function manyToOne(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const p = rng.pick(PIECES);
  const n = rng.int(ab === 1 ? 2 : 3, 9);
  const one = ab === 1 ? p.easy(rng) : p.hard(rng);
  const total = n * one;
  const value = inUnit(one, p.unit);
  const multiplied = clean(inUnit(total, p.unit) * n);
  return finish(SKILL, stufe, {
    key: `auf-eins:${p.many}:${n}:${one}`,
    ab,
    context: `${n} ${p.many} ${p.verb} ${shown(total, p.unit)}.`,
    prompt: p.ask,
    answer: { kind: 'number', value, before: p.before, unit: p.unit, decimals: decimalsOf(p.unit) },
    hints: ['Der Wert gilt für alle zusammen. Du suchst den Wert für eins.', `Teile durch die Anzahl: ${n}.`],
    steps: [`${shown(total, p.unit)} : ${n} = ${shown(one, p.unit)}`, `${p.before} ${shown(one, p.unit)}.`],
    bugs: [
      { id: 'dreisatz-mal', match: multiplied, hint: 'Eins ist weniger als alle zusammen. Teile durch die Anzahl.' },
      { id: 'dreisatz-mal', match: clean(inUnit(total, p.unit) - n), hint: 'Zieh die Anzahl nicht ab. Teile durch die Anzahl.' },
    ],
    praise: 'Du hast richtig auf eins gerechnet.',
    kmk: KMK,
  });
}

/** Backwards: how many for an amount? */
function howMany(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  // The range of each price fits the noun: no Heft for 25 ct.
  const [one, many, low, top] = rng.pick([['Heft', 'Hefte', 3, 8], ['Stift', 'Stifte', 2, 6], ['Brötchen', 'Brötchen', 2, 4], ['Apfel', 'Äpfel', 2, 4]] as const);
  const price = rng.int(low, top) * 25;
  const n = rng.int(3, 12);
  const total = price * n;
  return finish(SKILL, stufe, {
    key: `wie-viele:${one}:${price}:${n}`,
    ab,
    context: `1 ${one} kostet ${euro(price)}.`,
    prompt: `Wie viele ${many} bekommst du für ${euro(total)}?`,
    answer: { kind: 'number', value: n, before: 'Du bekommst', after: `${many}.`, decimals: COMMA_FIELD },
    hints: ['Wie oft passt der Preis in den ganzen Betrag?', 'Rechne in Cent. Dann teilst du ohne Komma.'],
    steps: [`${q(total, 'ct')} : ${q(price, 'ct')} = ${fmt(n)}`, `Du bekommst ${fmt(n)} ${many}.`],
    bugs: [{ id: 'dreisatz-mal', match: (total * price) / 10000, hint: 'Hier suchst du eine Anzahl. Teile den Betrag durch den Preis.' }],
    praise: 'Du hast den Betrag durch den Preis geteilt.',
    kmk: KMK,
  });
}

/** Two offers: the price per piece decides. */
function offers(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const a = rng.pick([4, 5, 6]);
  const b = rng.pick([8, 10, 12]);
  // A pen costs at most about 2 €, so a pack stays below about 20 €.
  const oneA = rng.int(3, 5) * 25;
  const oneB = rng.chance(0.2) ? oneA : oneA + rng.pick([-25, 25, 50]);
  const [right, wrongA, wrongB] = oneA < oneB ? ['Packung A', 'Packung B', 'Beide gleich'] : oneB < oneA ? ['Packung B', 'Packung A', 'Beide gleich'] : ['Beide gleich', 'Packung A', 'Packung B'];
  const why = 'Rechne für beide Packungen den Preis für 1 Stift aus.';
  return finish(SKILL, stufe, {
    key: `angebot:${a}:${oneA}:${b}:${oneB}`,
    ab,
    prompt: 'Bei welcher Packung kostet 1 Stift weniger?',
    visual: { type: 'table', header: ['Packung', 'Stifte', 'Preis'], rows: [['A', String(a), euro(a * oneA)], ['B', String(b), euro(b * oneB)]] },
    answer: makeChoice(rng, { label: right }, [{ label: wrongA, whyWrong: why }, { label: wrongB, whyWrong: why }], { order: ['Packung A', 'Packung B', 'Beide gleich'] }),
    hints: ['Vergleiche nicht die Preise der Packungen.', why],
    steps: [`A: ${euro(a * oneA)} : ${a} = ${euro(oneA)}`, `B: ${euro(b * oneB)} : ${b} = ${euro(oneB)}`, `Also: ${right}.`],
    praise: 'Du hast beide Packungen auf 1 Stift gerechnet.',
    srText: speak(`Packung A: ${a} Stifte für ${euro(a * oneA)}. Packung B: ${b} Stifte für ${euro(b * oneB)}. Bei welcher Packung kostet 1 Stift weniger?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 2: three steps ────────────────────────────────────────────────────

interface Rate {
  id: string;
  head: [amount: string, value: string];
  /** The amount with its unit: '4 kg', '4 Personen'. */
  amount: (n: number) => string;
  story: (a: string, total: string) => string;
  ask: (b: string) => string;
  /** The Antwortsatz before the field. */
  before: (b: string) => string;
  after?: string;
  /** What a hint says for 'auf eins'. */
  oneAsk: string;
  /** The question backwards, and the unit of the amount. */
  askAmount: (total: string) => string;
  amountUnit: string;
  unit: string;
  /** The value of one, in the base step of the unit. */
  one: (rng: Rng) => number;
  /** For €: the largest whole-Euro value of one that fits the noun. */
  wholeTop?: number;
}

const RATES: readonly Rate[] = [
  { id: 'aepfel', head: ['Menge', 'Preis'], amount: (n) => q(n, 'kg'), story: (a, t) => `${a} Äpfel kosten ${t}.`, ask: (b) => `Was kosten ${b} Äpfel?`, before: (b) => `${b} kosten`, oneAsk: 'Was kostet 1 kg?', askAmount: (t) => `Wie viel kg bekommst du für ${t}?`, amountUnit: 'kg', unit: '€', one: (r) => r.int(6, 19) * 25, wholeTop: 5 },
  { id: 'stoff', head: ['Länge', 'Preis'], amount: (n) => q(n, 'm'), story: (a, t) => `${a} Stoff kosten ${t}.`, ask: (b) => `Was kosten ${b} Stoff?`, before: (b) => `${b} kosten`, oneAsk: 'Was kostet 1 m?', askAmount: (t) => `Wie viel Meter bekommst du für ${t}?`, amountUnit: 'm', unit: '€', one: (r) => r.int(4, 16) * 50, wholeTop: 12 },
  { id: 'mehl', head: ['Personen', 'Mehl'], amount: (n) => `${n} ${plural(n, 'Person', 'Personen')}`, story: (a, t) => `Für ${a} brauchst du ${t} Mehl.`, ask: (b) => `Wie viel Mehl brauchst du für ${b}?`, before: (b) => `Für ${b} brauchst du`, after: 'Mehl.', oneAsk: 'Wie viel brauchst du für 1 Person?', askAmount: (t) => `Für wie viele Personen reichen ${t} Mehl?`, amountUnit: 'Personen', unit: 'g', one: (r) => r.int(8, 25) * 5 },
  { id: 'zug', head: ['Zeit', 'Strecke'], amount: (n) => q(n, 'h'), story: (a, t) => `Ein Zug fährt in ${a} genau ${t}.`, ask: (b) => `Wie weit fährt der Zug in ${b}?`, before: () => 'Der Zug fährt', after: 'weit.', oneAsk: 'Wie weit fährt der Zug in 1 h?', askAmount: (t) => `Wie viele Stunden braucht der Zug für ${t}?`, amountUnit: 'h', unit: 'km', one: (r) => r.int(6, 14) * 10 },
  { id: 'wasser', head: ['Zeit', 'Wasser'], amount: (n) => q(n, 'min'), story: (a, t) => `In ${a} laufen ${t} in die Wanne.`, ask: (b) => `Wie viel Wasser läuft in ${b} in die Wanne?`, before: () => 'Es laufen', after: 'in die Wanne.', oneAsk: 'Wie viel läuft in 1 min?', askAmount: (t) => `Wie viele Minuten dauert es für ${t}?`, amountUnit: 'min', unit: 'l', one: (r) => r.int(6, 15) },
];

/** Two different amounts; the second is no multiple of the first, so the step over one is needed. */
function amounts(rng: Rng): [number, number] {
  const a = rng.pick([3, 4, 5, 6, 8]);
  let b = rng.int(2, 9);
  while (b === a || b % a === 0) b = b === 9 ? 2 : b + 1;
  return [a, b];
}

const addedBug = (total: number, a: number, b: number, unit: string, oneAsk: string) => ({ id: 'dreisatz-addiert', value: inUnit(total, unit) + (b - a), hint: `Rechne zuerst auf eins: ${oneAsk}` });

function threeSteps(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const r = rng.pick(RATES);
  const [a, b] = amounts(rng);
  // The most direct form: whole Euro, so the short fields of a table on a phone show the whole amount.
  const one = isEuro(r.unit) ? rng.int(2, r.wholeTop ?? 12) * 100 : r.one(rng);
  const total = a * one;
  const end = b * one;
  const fields: MultiField[] = [
    { id: 'eins', value: inUnit(one, r.unit), before: `${r.amount(1)}:`, after: r.unit, decimals: COMMA_FIELD, label: `Wert für ${r.amount(1)}` },
    { id: 'ziel', value: inUnit(end, r.unit), before: `${r.amount(b)}:`, after: r.unit, decimals: COMMA_FIELD, label: `Wert für ${r.amount(b)}` },
  ];
  const added = addedBug(total, a, b, r.unit, r.oneAsk);
  return finish(SKILL, stufe, {
    key: `tabelle:${r.id}:${a}:${b}:${one}`,
    ab,
    prompt: 'Welche Werte fehlen in der Tabelle?',
    visual: { type: 'table', header: r.head, rows: [[r.amount(a), shown(total, r.unit)], [r.amount(1), BOX], [r.amount(b), BOX]] },
    answer: { kind: 'multi', fields },
    hints: [`Rechne zuerst auf eins: Teile durch ${a}.`, `Rechne dann mal ${b}.`],
    steps: [`${shown(total, r.unit)} : ${a} = ${shown(one, r.unit)}`, `${shown(one, r.unit)} · ${b} = ${shown(end, r.unit)}`, `${r.amount(1)}: ${shown(one, r.unit)}; ${r.amount(b)}: ${shown(end, r.unit)}`],
    bugs: [{ id: 'dreisatz-addiert', match: { eins: fields[0].value, ziel: added.value }, hint: `Du hast den Unterschied addiert. Rechne mit dem Wert für ${r.amount(1)}.` }],
    praise: 'Du hast zuerst auf eins gerechnet.',
    srText: speak(`Tabelle. ${r.amount(a)}: ${shown(total, r.unit)}. Welche Werte fehlen für ${r.amount(1)} und ${r.amount(b)}?`),
    kmk: KMK,
  });
}

function toTarget(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const r = rng.pick(RATES);
  const [a, b] = amounts(rng);
  const one = r.one(rng);
  const total = a * one;
  const end = b * one;
  const added = addedBug(total, a, b, r.unit, r.oneAsk);
  return finish(SKILL, stufe, {
    key: `ziel:${r.id}:${a}:${b}:${one}`,
    ab,
    context: r.story(r.amount(a), shown(total, r.unit)),
    prompt: r.ask(r.amount(b)),
    visual: { type: 'table', header: r.head, rows: [[r.amount(a), shown(total, r.unit)], [r.amount(b), BOX]] },
    answer: { kind: 'number', value: inUnit(end, r.unit), before: r.before(r.amount(b)), unit: r.unit, ...(r.after ? { after: r.after } : {}), decimals: decimalsOf(r.unit) },
    hints: [`Rechne zuerst auf eins: ${r.oneAsk}`, `Rechne dann mal ${b}.`],
    steps: [`${shown(total, r.unit)} : ${a} = ${shown(one, r.unit)}`, `${shown(one, r.unit)} · ${b} = ${shown(end, r.unit)}`],
    bugs: [
      { id: 'dreisatz-addiert', match: added.value, hint: added.hint },
      { id: 'dreisatz-mal', match: inUnit(total, r.unit) * b, hint: `Du hast den ganzen Wert mal ${b} gerechnet. Teile zuerst durch ${a}.` },
    ],
    praise: 'Du hast zuerst auf eins und dann weiter gerechnet.',
    kmk: KMK,
  });
}

/** Backwards: the value is given, the amount asked. */
function toAmount(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const r = rng.pick(RATES);
  const [a, b] = amounts(rng);
  const one = r.one(rng);
  const total = a * one;
  const end = b * one;
  return finish(SKILL, stufe, {
    key: `menge:${r.id}:${a}:${b}:${one}`,
    ab,
    context: r.story(r.amount(a), shown(total, r.unit)),
    prompt: r.askAmount(shown(end, r.unit)),
    visual: { type: 'table', header: r.head, rows: [[r.amount(a), shown(total, r.unit)], [BOX, shown(end, r.unit)]] },
    answer: { kind: 'number', value: b, unit: r.amountUnit, decimals: COMMA_FIELD },
    hints: [`Rechne zuerst auf eins: ${r.oneAsk}`, 'Wie oft passt dieser Wert in den neuen Wert?'],
    steps: [`${shown(total, r.unit)} : ${a} = ${shown(one, r.unit)}`, `${shown(end, r.unit)} : ${shown(one, r.unit)} = ${b}`, `Das sind ${r.amount(b)}.`],
    bugs: [{ id: 'dreisatz-addiert', match: a + inUnit(end - total, r.unit), hint: `Rechne zuerst auf eins: ${r.oneAsk}` }],
    praise: 'Du hast über eins zurück zur Menge gerechnet.',
    kmk: KMK,
  });
}

// ─── Stufe 3: does it fit? ───────────────────────────────────────────────────

interface Fixed {
  id: string;
  story: (v: number, n: number) => string;
  ask: string;
  unit: string;
  values: readonly number[];
  /** The short form for a list of stories. */
  short: (v: number, n: number) => string;
}

/** The value stays the same, however many take part. */
const FIXED: readonly Fixed[] = [
  { id: 'hemden', story: (v, n) => `1 Hemd trocknet auf der Leine in ${q(v, 'h')}. Jetzt hängen ${n} Hemden auf der Leine.`, ask: 'Wie lange trocknen die Hemden?', unit: 'h', values: [2, 3, 4], short: (v, n) => `1 Hemd trocknet in ${q(v, 'h')}. Wie lange trocknen ${n} Hemden?` },
  { id: 'eier', story: (v, n) => `1 Ei kocht ${q(v, 'min')} im Topf. Jetzt kochen ${n} Eier im gleichen Topf.`, ask: 'Wie lange kochen die Eier?', unit: 'min', values: [6, 7, 8, 9, 10], short: (v, n) => `1 Ei kocht ${q(v, 'min')}. Wie lange kochen ${n} Eier im gleichen Topf?` },
  { id: 'lied', story: (v, n) => `Ein Lied dauert ${q(v, 'min')}. Jetzt singen ${n} Personen das Lied zusammen.`, ask: 'Wie lange dauert das Lied jetzt?', unit: 'min', values: [3, 4, 5], short: (v, n) => `Ein Lied dauert ${q(v, 'min')}. Wie lange singen ${n} Personen das Lied zusammen?` },
  { id: 'film', story: (v, n) => `Ein Film dauert ${q(v, 'min')}. Jetzt schauen ${n} Personen den Film zusammen.`, ask: 'Wie lange dauert der Film jetzt?', unit: 'min', values: [85, 90, 95, 100, 110], short: (v, n) => `Ein Film dauert ${q(v, 'min')}. Wie lange schauen ${n} Personen den Film zusammen?` },
  { id: 'pizza', story: (v, n) => `1 Pizza backt ${q(v, 'min')} im Ofen. Jetzt backen ${n} Pizzen zusammen im Ofen.`, ask: 'Wie lange backen die Pizzen?', unit: 'min', values: [10, 12, 15], short: (v, n) => `1 Pizza backt ${q(v, 'min')}. Wie lange backen ${n} Pizzen zusammen im Ofen?` },
  { id: 'karussell', story: (v, n) => `Eine Runde im Karussell dauert ${q(v, 'min')}. Jetzt fahren ${n} Personen mit.`, ask: 'Wie lange dauert die Runde jetzt?', unit: 'min', values: [3, 4, 5], short: (v, n) => `Eine Runde im Karussell dauert ${q(v, 'min')}. Wie lange dauert die Runde mit ${n} Personen?` },
];

const IMAGINE = 'Stell dir die Situation vor. Wird es wirklich doppelt so viel?';

function fitsChoice(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const yes = 'Ja, der Dreisatz passt.';
  const no = 'Nein, der Dreisatz passt hier nicht.';
  const prompt = 'Kannst du hier mit dem Dreisatz rechnen?';
  if (rng.chance(0.5)) {
    const f = rng.pick(FIXED);
    const v = rng.pick(f.values);
    const n = rng.int(2, 6);
    return finish(SKILL, stufe, {
      key: `passt-nicht:${f.id}:${v}:${n}`,
      ab,
      context: f.story(v, n),
      prompt,
      answer: makeChoice(rng, { label: no }, [{ label: yes, whyWrong: IMAGINE }], { order: [yes, no] }),
      hints: ['Stell dir die Situation vor.', 'Dauert es mit mehr wirklich länger?'],
      steps: [`Es bleibt bei ${q(v, f.unit)}. Mehr ändert hier nichts.`, 'Also passt der Dreisatz nicht.'],
      praise: 'Du hast dir die Situation vorgestellt und geprüft.',
      kmk: [...KMK, 'PK.modellieren'],
    });
  }
  const r = rng.pick(RATES);
  const [a, b] = amounts(rng);
  const one = r.one(rng);
  return finish(SKILL, stufe, {
    key: `passt:${r.id}:${a}:${b}:${one}`,
    ab,
    context: `${r.story(r.amount(a), shown(a * one, r.unit))} Jetzt geht es um ${r.amount(b)}.`,
    prompt,
    answer: makeChoice(rng, { label: yes }, [{ label: no, whyWrong: 'Doppelte Menge, doppelter Wert: Das stimmt hier. Der Dreisatz passt also.' }], { order: [yes, no] }),
    hints: ['Stell dir die doppelte Menge vor.', 'Wird der Wert dann auch doppelt so groß?'],
    steps: ['Doppelte Menge, doppelter Wert: Das stimmt hier.', 'Also passt der Dreisatz.'],
    praise: 'Du hast geprüft: Doppelte Menge, doppelter Wert.',
    kmk: [...KMK, 'PK.modellieren'],
  });
}

function fixedStory(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const f = rng.pick(FIXED);
  const v = rng.pick(f.values);
  const n = rng.int(2, 6);
  return finish(SKILL, stufe, {
    key: `gleich:${f.id}:${v}:${n}`,
    ab,
    context: f.story(v, n),
    prompt: f.ask,
    answer: { kind: 'number', value: v, unit: f.unit, decimals: COMMA_FIELD },
    hints: ['Stell dir die Situation vor, bevor du rechnest.', 'Dauert es mit mehr wirklich länger?'],
    steps: ['Mehr ändert hier nichts an der Zeit.', `Es dauert ${q(v, f.unit)}.`],
    bugs: [
      { id: 'immer-proportional', match: v * n, hint: IMAGINE },
      { id: 'immer-proportional', match: v + n, hint: IMAGINE },
    ],
    praise: 'Du hast erst gedacht und dann entschieden.',
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** The stories of FIXED where the Dreisatz does fit: one after the other, the time grows. Only 'nacheinander' tells the two kinds apart. */
const IN_A_ROW = [
  { id: 'lieder', story: (a: string, t: string) => `${a} gleich lange Lieder dauern nacheinander ${t}.`, ask: (b: string) => `Wie lange dauern ${b} solche Lieder nacheinander?`, oneAsk: 'Wie lange dauert ein Lied?', values: [3, 4, 5] },
  { id: 'runden', story: (a: string, t: string) => `${a} Runden im Karussell dauern nacheinander ${t}.`, ask: (b: string) => `Wie lange dauern ${b} Runden nacheinander?`, oneAsk: 'Wie lange dauert eine Runde?', values: [3, 4, 5] },
  { id: 'pizzen', story: (a: string, t: string) => `Im Ofen ist nur Platz für eine Pizza. ${a} Pizzen backen nacheinander ${t}.`, ask: (b: string) => `Wie lange backen ${b} Pizzen nacheinander?`, oneAsk: 'Wie lange backt eine Pizza?', values: [10, 12, 15] },
  { id: 'eier', story: (a: string, t: string) => `Im Topf ist nur Platz für ein Ei. ${a} Eier kochen nacheinander ${t}.`, ask: (b: string) => `Wie lange kochen ${b} Eier nacheinander?`, oneAsk: 'Wie lange kocht ein Ei?', values: [6, 7, 8, 9, 10] },
] as const;

/** A story where the Dreisatz does fit, told like the ones where it does not: never a story of Stufe 2, no table, and the check decides how to calculate. */
function fittingStory(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const s = rng.pick(IN_A_ROW);
  const a = rng.pick([6, 8, 9]);
  let b = rng.int(5, 12);
  while (b === a || b % a === 0) b = b === 12 ? 5 : b + 1;
  const one = rng.pick(s.values);
  const total = a * one;
  const end = b * one;
  return finish(SKILL, stufe, {
    key: `passt-rechnen:${s.id}:${a}:${b}:${one}`,
    ab,
    context: s.story(String(a), q(total, 'min')),
    prompt: s.ask(String(b)),
    answer: { kind: 'number', value: end, before: 'Es dauert', unit: 'min', decimals: COMMA_FIELD },
    hints: ['Stell dir die Situation vor. Doppelte Menge, doppelte Zeit?', `Wenn das stimmt: ${s.oneAsk}`],
    steps: ['Nacheinander gilt: Doppelte Menge, doppelte Zeit.', `${q(total, 'min')} : ${a} = ${q(one, 'min')}`, `${q(one, 'min')} · ${b} = ${q(end, 'min')}`],
    bugs: [
      { id: 'dreisatz-addiert', match: total + (b - a), hint: `Rechne zuerst auf eins: ${s.oneAsk}` },
      { id: 'dreisatz-mal', match: total * b, hint: `Du hast den ganzen Wert mal ${b} gerechnet. Teile zuerst durch ${a}.` },
      { id: 'immer-proportional', match: total, hint: 'Stell dir die Situation vor. Hier läuft alles nacheinander.' },
    ],
    praise: 'Du hast geprüft: Hier passt der Dreisatz.',
    kmk: [...KMK, 'PK.modellieren'],
  });
}

const BASE_PRICES = [
  { id: 'minigolf', story: (f: string, p: string) => `Minigolf kostet ${f} Eintritt und ${p} für jede Runde.`, head: 'Runden', item: 'Runden', fee: 'Eintritt' },
  { id: 'fahrrad', story: (f: string, p: string) => `Ein Leihfahrrad kostet ${f} Grundpreis und ${p} für jede Stunde.`, head: 'Stunden', item: 'Stunden', fee: 'Grundpreis' },
  { id: 'boot', story: (f: string, p: string) => `Ein Ruderboot kostet ${f} Grundpreis und ${p} für jede Stunde.`, head: 'Stunden', item: 'Stunden', fee: 'Grundpreis' },
];

/** A fixed price and a price per piece: more, but not in proportion. */
function basePrice(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const s = rng.pick(BASE_PRICES);
  const fee = rng.int(2, 6) * 100;
  const per = rng.int(1, 5) * 100;
  const a = rng.int(2, 3);
  const b = a * 2;
  const totalA = fee + a * per;
  const totalB = fee + b * per;
  return finish(SKILL, stufe, {
    key: `grundpreis:${s.id}:${fee}:${per}:${a}`,
    ab,
    context: s.story(euro(fee), euro(per)),
    prompt: 'Welcher Preis fehlt in der Tabelle?',
    visual: { type: 'table', header: [s.head, 'Preis'], rows: [[String(a), euro(totalA)], [String(b), BOX]] },
    answer: { kind: 'number', value: totalB / 100, unit: '€', decimals: EURO_FIELD },
    hints: [`Der ${s.fee} kommt nur einmal dazu.`, `Rechne: ${b} ${s.item}, dann plus ${s.fee}.`],
    steps: [`${b} · ${euro(per)} = ${euro(b * per)}`, `${euro(b * per)} + ${euro(fee)} = ${euro(totalB)}`],
    bugs: [{ id: 'immer-proportional', match: (2 * totalA) / 100, hint: `Der ${s.fee} verdoppelt sich nicht. Wird es wirklich doppelt so viel?` }],
    praise: `Du hast den ${s.fee} nur einmal gezählt.`,
    srText: speak(`${s.story(euro(fee), euro(per))} Tabelle. ${a} ${s.item} kosten ${euro(totalA)}. Was kosten ${b} ${s.item}?`),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** Which of these stories fits? */
function pickStory(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const n = rng.int(3, 8);
  const price = rng.int(1, 3) * 100;
  const count = n + rng.int(1, 4);
  const right = `${n} Hefte kosten ${euro(n * price)}. Was kosten ${count} Hefte?`;
  const wrongs: ChoiceOption[] = rng.sample(FIXED, 3).map((f) => ({ label: f.short(rng.pick(f.values), rng.int(2, 6)), whyWrong: IMAGINE }));
  return finish(SKILL, stufe, {
    key: `geschichte:${n}:${price}:${count}:${wrongs.map((w) => w.label).join('|')}`,
    ab,
    prompt: 'Bei welcher Geschichte passt der Dreisatz?',
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: ['Stell dir jede Geschichte vor.', 'Passt: doppelte Menge, doppelter Wert?'],
    steps: ['Bei den anderen Geschichten bleibt die Zeit gleich.', `Der Dreisatz passt hier: ${right}`],
    praise: 'Du hast jede Geschichte geprüft.',
    kmk: [...KMK, 'PK.modellieren'],
  });
}

export const schlussrechnungSkill: SkillDef = {
  ...SKILL,
  title: 'Dreisatz',
  description: 'Du rechnest erst auf eins und dann auf die gesuchte Menge.',
  stufen: {
    1: 'Von vielen auf eins: 5 Hefte kosten 10 €',
    2: 'Drei Schritte mit Tabelle: 4 kg, 1 kg, 6 kg',
    3: 'Passt der Dreisatz? Geschichten ohne feste Verhältnisse',
  },
  kmk: KMK,
  keys: { comma: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab < 3) return manyToOne(stufe, ab, rng);
      return rng.chance(0.5) ? howMany(stufe, ab, rng) : offers(stufe, ab, rng);
    }
    if (stufe === 2) {
      if (ab === 1) return threeSteps(stufe, ab, rng);
      return ab === 2 ? toTarget(stufe, ab, rng) : toAmount(stufe, ab, rng);
    }
    if (ab === 1) return fitsChoice(stufe, ab, rng);
    if (ab === 2) return rng.chance(0.65) ? fixedStory(stufe, ab, rng) : fittingStory(stufe, ab, rng);
    return rng.chance(0.65) ? basePrice(stufe, ab, rng) : pickStory(stufe, ab, rng);
  },
};
