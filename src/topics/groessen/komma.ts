/**
 * Kommaschreibweise.
 * Stufe 1: money and metres: 3,45 € = 3 € 45 ct, 1,5 m = 150 cm, 4 € 5 ct = 4,05 €, coins; AB III goes from one unit to the comma, and 3,05 €.
 * Stufe 2: Einheitentafel: 2,075 km in m, 0,8 kg in g; AB III: 1250 g in kg, 75 g = 0,075 kg, 4 kg 30 g.
 * Stufe 3: order mixed notations; 1,30 m is not 1 m 3 cm; AB III: how far that wrong sentence is off, or the same quantity from 3 m 5 cm.
 * srText and read-aloud say the comma of every quantity (Exercise.literalComma).
 */
import { BOX, NBSP, fmt, fmtMixed, fmtMoney } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, pickPerson, targetAb } from '../shared';
import { COMMA_FIELD, EURO_FIELD, directionWords, finish, moneyItems, moneyWords, orderQuantities, q, speak, taskText, type GroessenBody, type OrderItem } from './helpers';

const SKILL = { id: 'groessen.komma', topicId: 'groessen' } as const;
const KMK = ['GM.einheiten'];

/** Screen-reader text with the comma said: this skill is about the comma and its 0, so '7,08 €' is not '7 Euro 8' here, and '1,62 €' does not say its own split. */
const srComma = (text: string) => speak(text.replace(/(\d+),(\d+)/g, (_all, int: string, dec: string) => `${int} Komma ${dec.split('').join(' ')}`));

const done = (stufe: Stufe, body: GroessenBody): Exercise => finish(SKILL, stufe, { ...body, literalComma: true, srText: body.srText ?? srComma(taskText(body)) });

interface Dim {
  big: string;
  small: string;
  factor: number;
  /** Word for 'genauso … wie'. */
  adjective: string;
}

const MONEY: Dim = { big: '€', small: 'ct', factor: 100, adjective: 'viel' };
const METRE: Dim = { big: 'm', small: 'cm', factor: 100, adjective: 'lang' };
const KM: Dim = { big: 'km', small: 'm', factor: 1000, adjective: 'lang' };
const KG: Dim = { big: 'kg', small: 'g', factor: 1000, adjective: 'schwer' };
const TONNE: Dim = { big: 't', small: 'kg', factor: 1000, adjective: 'schwer' };

/** A quantity with the comma, from the small unit: '3,45 €', '1,30 m', '2,075 km', '0,8 kg'. Money and metres keep two places. */
function comma(d: Dim, small: number): string {
  if (d === MONEY) return fmtMoney(small);
  return `${d.factor === 100 ? fmt(small / d.factor, 2) : fmt(small / d.factor)}${NBSP}${d.big}`;
}

/** The same quantity as short as it can be written, a place for the child to fill up: '1,5 m', and '0,8 kg' as comma() writes it. */
const shortComma = (d: Dim, small: number) => `${fmt(small / d.factor)}${NBSP}${d.big}`;

/** All places written out: '1,50 m', '4,800 kg'. */
const fullComma = (d: Dim, small: number) => `${fmt(small / d.factor, d.factor === 100 ? 2 : 3)}${NBSP}${d.big}`;

/** The value of a field with this unit. */
const bigField = (d: Dim) => (d === MONEY ? EURO_FIELD : COMMA_FIELD);

/** kg and t have their own family: their three places are the classic trap (2,5 kg = 2 kg 5 g). */
const shortId = (d: Dim) => (d === KG || d === TONNE ? 'komma-gewicht' : 'komma-einheit');

const placesWord = (d: Dim) => (d.factor === 100 ? 'zwei' : 'drei');

const placesHint = (d: Dim) => (d.factor === 100 ? 'Nach dem Komma stehen Zehntel und Hundertstel. Lies beide Stellen.' : `Bei ${d.big} stehen drei Stellen nach dem Komma.`);

function mixedFields(d: Dim, big: number, small: number): MultiField[] {
  return [
    { id: 'a', value: big, after: d.big, decimals: COMMA_FIELD, label: d.big },
    { id: 'b', value: small, after: d.small, decimals: COMMA_FIELD, label: d.small },
  ];
}

/** A hint about the places: filling up where places are missing in the writing, reading where they all stand there. */
const fillHint = (d: Dim, total: number) => (comma(d, total) === fullComma(d, total) ? `Nach dem Komma stehen ${placesWord(d)} Stellen für ${d.small}.` : `Füll mit 0 auf, bis ${placesWord(d)} Stellen nach dem Komma stehen.`);

const splitSteps = (write: typeof comma, d: Dim, big: number, small: number) => {
  const total = big * d.factor + small;
  return [`${write(d, total)} = ${q(big, d.big)} + ${write(d, small)}`, `${write(d, total)} = ${fmtMixed(total, d.factor, d.big, d.small)}`];
};

/** 3,45 € = □ € □ ct, and with shortComma 3,4 m = □ m □ cm. */
function commaToMixed(stufe: Stufe, ab: Ab, d: Dim, big: number, small: number, write: typeof comma = comma): Exercise {
  const total = big * d.factor + small;
  const short = write === shortComma;
  return done(stufe, {
    key: `trennen:${d.big}:${total}`,
    ab,
    prompt: 'Schreib ohne Komma.',
    expression: `${write(d, total)} = ${BOX} ${d.big} ${BOX} ${d.small}`,
    ...(d === MONEY ? { visual: { type: 'money' as const, items: moneyItems(total) } } : {}),
    answer: { kind: 'multi', fields: mixedFields(d, big, small) },
    hints: [`Vor dem Komma stehen die ganzen ${d === MONEY ? 'Euro' : 'Meter'}.`, short ? `Füll mit 0 auf, bis ${placesWord(d)} Stellen nach dem Komma stehen.` : `Nach dem Komma stehen ${placesWord(d)} Stellen für ${d.small}.`],
    steps: splitSteps(write, d, big, small),
    bugs: [
      small % 10 === 0 ? { id: 'komma-einheit', match: { a: big, b: small / 10 }, hint: short ? `Bei ${d.big} stehen ${placesWord(d)} Stellen nach dem Komma. Füll mit einer 0 auf.` : placesHint(d) } : null,
      small < 10 ? { id: 'komma-null', match: { a: big, b: small * 10 }, hint: 'Die 0 nach dem Komma zählt mit. Lies beide Stellen.' } : null,
    ],
    praise: short ? 'Du hast die leere Stelle mitgelesen.' : 'Du hast beide Stellen nach dem Komma gelesen.',
    kmk: KMK,
  });
}

/** 4 € 5 ct = □ €, 2 m 7 cm = □ m. */
function mixedToComma(stufe: Stufe, ab: Ab, d: Dim, big: number, small: number): Exercise {
  const total = big * d.factor + small;
  return done(stufe, {
    key: `komma:${d.big}:${total}`,
    ab,
    prompt: 'Schreib mit Komma.',
    expression: `${fmtMixed(total, d.factor, d.big, d.small)} = ${BOX} ${d.big}`,
    answer: { kind: 'number', value: total / d.factor, unit: d.big, decimals: bigField(d) },
    hints: [`${q(1, d.big)} = ${q(d.factor, d.small)}. Du brauchst ${placesWord(d)} Stellen nach dem Komma.`, `Schreib ${q(small, d.small)} in diese Stellen. Leere Stellen bekommen eine 0.`],
    steps: [`${q(small, d.small)} = ${comma(d, small)}`, `${fmtMixed(total, d.factor, d.big, d.small)} = ${comma(d, total)}`],
    bugs: [
      small < d.factor / 10 ? { id: 'komma-null', match: big + small / 10 ** String(small).length, hint: 'Leere Stellen bekommen eine 0. Sonst verschiebt sich der Wert.' } : null,
    ],
    praise: small < d.factor / 10 ? 'Du hast die leere Stelle mit einer 0 gefüllt.' : 'Du hast die kleine Einheit hinter das Komma geschrieben.',
    kmk: KMK,
  });
}

/** 1,5 m = □ cm, 0,8 kg = □ g, 3,4 km = □ m: written short, so that places are missing. Money has no short writing. */
function shortCommaToSmall(stufe: Stufe, ab: Ab, d: Dim, big: number, tenth: number): Exercise {
  const small = (tenth * d.factor) / 10;
  const total = big * d.factor + small;
  // With 0 before the comma, '0,800 kg' would state the answer 800 and cost the item its bugs.
  const placesBug = `Bei ${d.big} stehen ${placesWord(d)} Stellen nach dem Komma${big > 0 ? `: ${fullComma(d, total)}.` : '. Füll mit 0 auf.'}`;
  return done(stufe, {
    key: `kurz:${d.big}:${total}`,
    ab,
    prompt: `Schreib in ${d.small}.`,
    expression: `${shortComma(d, total)} = ${BOX} ${d.small}`,
    answer: { kind: 'number', value: total, unit: d.small, decimals: COMMA_FIELD },
    hints: [`${q(1, d.big)} = ${q(d.factor, d.small)}.`, `Schreib mit ${placesWord(d)} Stellen nach dem Komma und füll mit 0 auf.`],
    steps: big > 0
      ? [`${q(big, d.big)} = ${q(big * d.factor, d.small)}`, `${shortComma(d, small)} = ${q(small, d.small)}`, `${q(big * d.factor, d.small)} + ${q(small, d.small)} = ${q(total, d.small)}`]
      : [`Mit Nullen aufgefüllt: ${shortComma(d, total)} = ${fullComma(d, total)}`, `${shortComma(d, total)} = ${q(total, d.small)}`],
    bugs: [
      { id: shortId(d), match: big * d.factor + tenth, hint: placesBug },
      { id: shortId(d), match: Number(`${big}${tenth}`), hint: placesBug },
    ],
    praise: 'Du hast die Stellen mit Nullen aufgefüllt.',
    kmk: KMK,
  });
}

/** 3,05 € = □ ct: a 0 straight after the comma. */
function zeroAfterComma(stufe: Stufe, ab: Ab, d: Dim, big: number, small: number): Exercise {
  const total = big * d.factor + small;
  return done(stufe, {
    key: `null:${d.big}:${total}`,
    ab,
    prompt: `Schreib in ${d.small}.`,
    expression: `${comma(d, total)} = ${BOX} ${d.small}`,
    answer: { kind: 'number', value: total, unit: d.small, decimals: COMMA_FIELD },
    hints: ['Schau auf die Stelle direkt nach dem Komma.', `${q(big, d.big)} = ${q(big * d.factor, d.small)}. Zähl den Rest dazu.`],
    steps: [`${q(big, d.big)} = ${q(big * d.factor, d.small)}`, `${q(big * d.factor, d.small)} + ${q(small, d.small)} = ${q(total, d.small)}`],
    bugs: [{ id: 'komma-null', match: Number(`${big}${small}`), hint: 'Die 0 nach dem Komma zählt mit. Lies beide Stellen.' }],
    praise: 'Du hast die 0 nach dem Komma beachtet.',
    kmk: KMK,
  });
}

/** 345 ct = □ €, 1250 g = □ kg, 75 g = □ kg. */
function smallToComma(stufe: Stufe, ab: Ab, d: Dim, total: number): Exercise {
  const big = Math.floor(total / d.factor);
  const small = total % d.factor;
  return done(stufe, {
    key: `klein:${d.big}:${total}`,
    ab,
    prompt: `Schreib in ${d.big} mit Komma.`,
    expression: `${q(total, d.small)} = ${BOX} ${d.big}`,
    answer: { kind: 'number', value: total / d.factor, unit: d.big, decimals: bigField(d) },
    hints: [`${q(1, d.big)} = ${q(d.factor, d.small)}. Wie viele ganze ${d.big} sind es?`, `Der Rest kommt in ${placesWord(d)} Stellen hinter das Komma.`],
    steps: [`${q(total, d.small)} = ${fmtMixed(total, d.factor, d.big, d.small)}`, `${q(total, d.small)} = ${comma(d, total)}`],
    bugs: [
      { id: 'komma-stelle', match: total / (d.factor / 10), hint: `Es sind ${placesWord(d)} Stellen nach dem Komma. Zähl von rechts.` },
      small < d.factor / 10 ? { id: 'komma-null', match: big + small / 10 ** String(small).length, hint: 'Leere Stellen bekommen eine 0. Sonst verschiebt sich der Wert.' } : null,
    ],
    praise: 'Du hast das Komma an die richtige Stelle gesetzt.',
    kmk: KMK,
  });
}

/** The money shown as coins and notes. */
function coins(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const total = rng.int(1, 9) * 100 + rng.pick([5, 10, 20, 25, 35, 40, 50, 55, 75, 80, 95]);
  const small = total % 100;
  return done(stufe, {
    key: `geld:${total}`,
    ab,
    prompt: 'Schreib mit Komma. Wie viel Geld ist das?',
    visual: { type: 'money', items: moneyItems(total) },
    answer: { kind: 'number', value: total / 100, unit: '€', decimals: EURO_FIELD },
    hints: ['Zähl zuerst die Euro. Zähl dann die Cent.', 'Nach dem Komma stehen immer zwei Stellen für die Cent.'],
    steps: [`Zusammen: ${fmtMixed(total, 100, '€', 'ct')}`, `Das sind ${fmtMoney(total)}.`],
    bugs: [small < 10 ? { id: 'komma-null', match: Math.floor(total / 100) + small / 10, hint: 'Nur wenige Cent: Direkt nach dem Komma steht eine 0.' } : null],
    praise: 'Du hast Euro und Cent richtig mit Komma geschrieben.',
    srText: speak(`Im Bild ist dieses Geld: ${moneyWords(total)}. Schreib mit Komma. Wie viel Geld ist das?`),
    kmk: KMK,
  });
}

/** The Einheitentafel of a quantity: one digit for each place. */
function unitTable(d: Dim, total: number) {
  const big = Math.floor(total / d.factor);
  const small = total % d.factor;
  const digits = String(small).padStart(3, '0').split('');
  return { type: 'table' as const, caption: 'Einheitentafel', header: [d.big, `100 ${d.small}`, `10 ${d.small}`, `1 ${d.small}`], rows: [[String(big), ...digits]] };
}

/** 2,075 km = □ m with the Einheitentafel. */
function fromTable(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const d = rng.pick([KM, KG, TONNE]);
  const big = rng.int(1, 9);
  const small = rng.chance(0.5) ? rng.int(11, 99) : rng.int(101, 999);
  const total = big * d.factor + small;
  return done(stufe, {
    key: `tafel:${d.big}:${total}`,
    ab,
    prompt: `Lies die Einheitentafel. Schreib in ${d.small}.`,
    expression: `${comma(d, total)} = ${BOX} ${d.small}`,
    visual: unitTable(d, total),
    answer: { kind: 'number', value: total, unit: d.small, decimals: COMMA_FIELD },
    hints: [`Jede Ziffer steht in der Tafel auf ihrem Platz.`, `Lies alle Ziffern von links nach rechts. Das sind die ${d.small}.`],
    steps: [`${comma(d, total)}: ${q(big, d.big)} und ${q(small, d.small)}`, `${q(big * d.factor, d.small)} + ${q(small, d.small)} = ${q(total, d.small)}`],
    bugs: [small < 100 ? { id: 'komma-null', match: Number(`${big}${small}`), hint: 'Die 0 aus der Tafel zählt mit. Diese 0 hält die Stelle frei.' } : null, { id: shortId(d), match: big + small, hint: `Rechne zuerst ${q(big, d.big)} in ${d.small} um.` }],
    praise: 'Du hast jede Ziffer aus der Tafel übernommen.',
    kmk: KMK,
  });
}

/** 4 kg 30 g = □ kg. */
function twoPartsToComma(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const d = rng.pick([KG, KM]);
  const big = rng.int(1, 9);
  return mixedToComma(stufe, ab, d, big, rng.int(1, 9) * 10);
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const ORDER_DIMS = [METRE, KG, MONEY];

/** Near values in mixed notations: the trap 2 kg 3 g stands next to 2,3 kg. */
function orderMixed(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const d = rng.pick(ORDER_DIMS);
  const b = rng.int(1, 4);
  const t = rng.pick([2, 3, 4, 6, 7, 8]);
  const one = d.factor / 10;
  const half = d.factor / 20;
  const tens = b * d.factor + t * one;
  const trap = b * d.factor + t;
  const items: OrderItem[] = [
    { label: comma(d, tens), value: tens, raw: b + t / 10 },
    { label: fmtMixed(trap, d.factor, d.big, d.small), value: trap, raw: b, misread: tens + 1 },
    { label: q(tens - half, d.small), value: tens - half, raw: tens - half },
    { label: comma(d, tens + half), value: tens + half, raw: b + t / 10 + half / d.factor },
  ];
  if (ab >= 2) {
    const later = (b + 1) * d.factor + t;
    items.push({ label: fmtMixed(later, d.factor, d.big, d.small), value: later, raw: b + 1, misread: (b + 1) * d.factor + t * one });
  }
  const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
  const { answer, sorted, bugs } = orderQuantities(rng, items, direction, { id: shortId(d), hint: placesHint(d) });
  return done(stufe, {
    key: `ordnen:${d.big}:${b}:${t}:${ab}:${direction}`,
    ab,
    prompt: `Ordne die Größen ${directionWords(direction)}.`,
    answer,
    hints: [`Schreib alles in ${d.small}.`, `${fmtMixed(trap, d.factor, d.big, d.small)} ist nicht dasselbe wie ${comma(d, tens)}.`],
    steps: [`Alles in ${d.small}: ${items.map((x) => q(x.value, d.small)).join(', ')}`, `Geordnet ${directionWords(direction)}: ${sorted.map((x) => x.label).join(', ')}`],
    bugs,
    praise: 'Du hast alle Schreibweisen in eine Einheit gebracht.',
    srText: srComma(`Ordne ${directionWords(direction)}: ${answer.items.join(', ')}.`),
    kmk: KMK,
  });
}

/** How far a wrong sentence is off: 1,30 m = 1 m 3 cm is 27 cm too little. The child reads the places, finds the mistake and calculates; Stufe 1 only reads them. */
function repair(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const d = rng.pick(ORDER_DIMS);
  const b = rng.int(1, 6);
  const t = rng.int(1, 9);
  const small = (t * d.factor) / 10;
  const total = b * d.factor + small;
  const missing = small - t;
  const person = pickPerson(rng);
  return done(stufe, {
    key: `pruefen:${d.big}:${total}`,
    ab,
    context: `${person.name} schreibt: ${comma(d, total)} = ${q(b, d.big)} ${q(t, d.small)}.`,
    prompt: `Wie viele ${d.small} sind das zu wenig?`,
    answer: { kind: 'number', value: missing, unit: d.small, decimals: COMMA_FIELD },
    hints: [fillHint(d, total), 'Lies die Stellen nach dem Komma als kleine Einheit. Vergleiche dann beide Angaben.'],
    steps: [comma(d, total) === fullComma(d, total) ? `${comma(d, total)} hat ${placesWord(d)} Stellen nach dem Komma.` : `Mit Nullen aufgefüllt: ${comma(d, total)} = ${fullComma(d, total)}`, `${comma(d, total)} = ${fmtMixed(total, d.factor, d.big, d.small)}`, `${q(small, d.small)} − ${q(t, d.small)} = ${q(missing, d.small)}`],
    bugs: [
      { id: shortId(d), match: 0, hint: placesHint(d) },
      { id: shortId(d), match: t, hint: placesHint(d) },
      { id: shortId(d), match: small, hint: `So viel steht nach dem Komma. Zieh die ${q(t, d.small)} noch ab.` },
    ],
    praise: 'Du hast die Stellen richtig gelesen und den Unterschied gefunden.',
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Which writing is the same quantity? Backwards from the two parts, with a 0 straight after the comma, and every option in another writing. */
function sameQuantity(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const d = rng.pick(ORDER_DIMS);
  const b = rng.int(1, 6);
  const t = rng.int(1, 9);
  const small = d.factor === 100 ? t : t * 10;
  const total = b * d.factor + small;
  const mixed = fmtMixed(total, d.factor, d.big, d.small);
  const correct: ChoiceOption = { label: comma(d, total) };
  const glued = Number(`${b}${small}`);
  const wrongs: ChoiceOption[] = [
    { label: comma(d, b * d.factor + (t * d.factor) / 10), whyWrong: placesHint(d) },
    { label: q(glued, d.small), whyWrong: `${q(glued, d.small)} sind viel weniger als ${q(b, d.big)}.` },
    { label: d === KG ? comma(d, b * d.factor + t) : q(b * d.factor + t * 10, d.small), whyWrong: placesHint(d) },
  ];
  return done(stufe, {
    key: `gleich:${d.big}:${total}`,
    ab,
    prompt: `Welche Angabe ist genauso ${d.adjective} wie ${mixed}?`,
    answer: makeChoice(rng, correct, wrongs),
    hints: ['Schreib alle Angaben in der kleinen Einheit.', `Nach dem Komma stehen ${placesWord(d)} Stellen für ${d.small}.`],
    steps: [`${mixed} = ${q(total, d.small)}`, `${q(total, d.small)} = ${correct.label}`],
    praise: 'Du hast alle Schreibweisen verglichen.',
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

export const kommaSkill: SkillDef = {
  ...SKILL,
  title: 'Kommaschreibweise',
  description: 'Du schreibst Größen mit Komma und ohne Komma.',
  stufen: {
    1: 'Geld und Meter: 3,45 € = 3 € 45 ct; 1,5 m',
    2: 'Einheitentafel: 2,075 km in m; 0,8 kg in g',
    3: 'Schreibweisen ordnen; 1,30 m ist nicht 1 m 3 cm',
  },
  kmk: KMK,
  keys: { comma: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      const d = rng.pick([MONEY, METRE]);
      if (ab === 1) return commaToMixed(stufe, ab, d, rng.int(1, 9), rng.int(11, 99));
      if (ab === 2) {
        const kind = rng.int(1, 3);
        if (kind === 1) return mixedToComma(stufe, ab, d, rng.int(1, 9), rng.chance(0.5) ? rng.int(1, 9) : rng.int(11, 99));
        if (kind === 2) return shortCommaToSmall(stufe, ab, METRE, rng.int(1, 9), rng.int(1, 9));
        return coins(stufe, ab, rng);
      }
      const kind = rng.int(1, 3);
      if (kind === 1) return smallToComma(stufe, ab, d, rng.int(1, 9) * 100 + rng.int(1, 99));
      if (kind === 2) return zeroAfterComma(stufe, ab, d, rng.int(1, 9), rng.int(1, 9));
      return commaToMixed(stufe, ab, d, rng.int(1, 9), rng.int(1, 9) * 10, d === METRE ? shortComma : comma);
    }
    if (stufe === 2) {
      const d = rng.pick([KM, KG, TONNE]);
      if (ab === 1) return fromTable(stufe, ab, rng);
      if (ab === 2) return shortCommaToSmall(stufe, ab, d, rng.int(0, 9), rng.int(1, 9));
      if (rng.chance(0.3)) return twoPartsToComma(stufe, ab, rng);
      return smallToComma(stufe, ab, d, rng.chance(0.3) ? rng.int(11, 99) : rng.int(1, 9) * 1000 + rng.int(11, 999));
    }
    if (ab === 1 || ab === 2) return orderMixed(stufe, ab, rng);
    return rng.chance(0.6) ? repair(stufe, ab, rng) : sameQuantity(stufe, ab, rng);
  },
};
