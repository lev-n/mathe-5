/**
 * Größen im Alltag.
 * Stufe 1: one step, one unit, with an Antwortsatz; AB II keywords that do not predict the operation (T13) and clock times; AB III backwards.
 * Stufe 2: Fahrplan or Preisliste from a table, two steps; AB III the latest bus, or change from a Preisliste.
 * Stufe 3: extra information; "Nicht lösbar", offered in solvable tasks too; is a result plausible?
 */
import { fmtMoney } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, pickPerson, pickTwo, targetAb } from '../shared';
import { COMMA_FIELD, EURO_FIELD, clock, clockVisual, euro, finish, hundredMinuteHint, hundredMinuteSpan, moneyItems, moneyWords, q, speak } from './helpers';

const SKILL = { id: 'groessen.sachaufgaben', topicId: 'groessen' } as const;
const KMK = ['GM.rechnen', 'PK.modellieren'];

const cents5 = (rng: Rng, min: number, max: number) => rng.int(Math.ceil(min / 5), Math.floor(max / 5)) * 5;

/** Things to buy, each with a price range in Cent that fits it. */
const THINGS = [
  { buy: 'ein Heft', the: 'das Heft', min: 80, max: 250 },
  { buy: 'ein Buch', the: 'das Buch', min: 600, max: 1800 },
  { buy: 'einen Stift', the: 'der Stift', min: 60, max: 300 },
  { buy: 'einen Block', the: 'der Block', min: 120, max: 350 },
  { buy: 'ein Lineal', the: 'das Lineal', min: 80, max: 250 },
  { buy: 'einen Saft', the: 'der Saft', min: 90, max: 220 },
] as const;

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function buyTwo(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const name = pickPerson(rng).name;
  const [ta, tb] = rng.sample(THINGS, 2);
  const a = ta.buy;
  const b = tb.buy;
  const pa = cents5(rng, ta.min, ta.max);
  const pb = cents5(rng, tb.min, tb.max);
  const sum = pa + pb;
  return finish(SKILL, stufe, {
    key: `kauf:${a}:${b}:${pa}:${pb}`,
    ab,
    context: `${name} kauft ${a} für ${fmtMoney(pa)} und ${b} für ${fmtMoney(pb)}.`,
    prompt: `Wie viel bezahlt ${name}?`,
    answer: { kind: 'number', value: sum / 100, before: `${name} bezahlt`, after: '€.', decimals: EURO_FIELD },
    hints: ['Beide Preise gehören zusammen.', 'Rechne zuerst die Euro. Rechne dann die Cent.'],
    steps: [`${fmtMoney(pa)} + ${fmtMoney(pb)} = ${fmtMoney(sum)}`, `${name} bezahlt ${fmtMoney(sum)}.`],
    bugs: [{ id: 'rechenart--', match: Math.abs(pa - pb) / 100, hint: 'Beide Dinge kosten Geld. Rechne die Preise zusammen.' }],
    praise: 'Du hast beide Preise addiert.',
    kmk: KMK,
  });
}

function rideTwo(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const name = pickPerson(rng).name;
  const a = rng.int(3, 28);
  const b = rng.int(3, 28);
  return finish(SKILL, stufe, {
    key: `strecke:${a}:${b}`,
    ab,
    context: `${name} fährt am Morgen ${q(a, 'km')} mit dem Rad. Am Nachmittag fährt ${name} noch ${q(b, 'km')}.`,
    prompt: `Wie weit fährt ${name} zusammen?`,
    answer: { kind: 'number', value: a + b, before: `${name} fährt`, after: 'km.', decimals: COMMA_FIELD },
    hints: ['Beide Strecken gehören zusammen.', 'Die Einheit bleibt gleich.'],
    steps: [`${q(a, 'km')} + ${q(b, 'km')} = ${q(a + b, 'km')}`, `${name} fährt ${q(a + b, 'km')}.`],
    bugs: [{ id: 'rechenart--', match: Math.abs(a - b), hint: 'Beide Strecken kommen zusammen. Rechne plus.' }],
    praise: 'Du hast beide Strecken addiert.',
    kmk: KMK,
  });
}

/** 'mehr' in a subtraction (T13). */
function moreButLess(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const [p1, p2] = pickTwo(rng);
  const other = cents5(rng, 205, 780);
  const diff = cents5(rng, 55, 195);
  const has = other + diff;
  return finish(SKILL, stufe, {
    key: `mehr:${has}:${diff}`,
    ab,
    context: `${p1.name} hat ${fmtMoney(has)}. Das sind ${fmtMoney(diff)} mehr als bei ${p2.name}.`,
    prompt: `Wie viel Geld hat ${p2.name}?`,
    answer: { kind: 'number', value: other / 100, before: `${p2.name} hat`, after: '€.', decimals: EURO_FIELD },
    hints: [`Wer hat mehr: ${p1.name} oder ${p2.name}?`, `${p2.name} hat weniger. Zieh den Unterschied ab.`],
    steps: [`${fmtMoney(has)} − ${fmtMoney(diff)} = ${fmtMoney(other)}`, `${p2.name} hat ${fmtMoney(other)}.`],
    bugs: [{ id: 'rechenart-+', match: (has + diff) / 100, hint: `${p1.name} hat mehr. ${p2.name} hat also weniger.` }],
    praise: 'Du hast den Vergleich genau gelesen.',
    kmk: KMK,
  });
}

/** Coins and notes in the picture, a purchase in the text. */
function coinsLeft(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const name = pickPerson(rng).name;
  const have = rng.pick([500, 700, 1000, 1200, 1500, 2000]);
  const thing = rng.pick(THINGS.filter((t) => t.min <= have - 55));
  const price = cents5(rng, thing.min, Math.min(thing.max, have - 55));
  return finish(SKILL, stufe, {
    key: `muenzen:${thing.buy}:${have}:${price}`,
    ab,
    context: `${name} hat dieses Geld. ${name} kauft ${thing.buy} für ${fmtMoney(price)}.`,
    prompt: `Wie viel Geld bleibt ${name}?`,
    visual: { type: 'money', items: moneyItems(have) },
    answer: { kind: 'number', value: (have - price) / 100, before: `${name} bleiben`, after: '€.', decimals: EURO_FIELD },
    hints: ['Zähl zuerst das Geld im Bild.', 'Zieh dann den Preis ab.'],
    steps: [`Im Bild: ${fmtMoney(have)}`, `${fmtMoney(have)} − ${fmtMoney(price)} = ${fmtMoney(have - price)}`],
    bugs: [{ id: 'rechenart-+', match: (have + price) / 100, hint: 'Beim Kaufen geht Geld weg. Zieh den Preis ab.' }],
    praise: 'Du hast das Geld gezählt und den Preis abgezogen.',
    srText: speak(`${name} hat dieses Geld: ${moneyWords(have)}. ${name} kauft ${thing.buy} für ${fmtMoney(price)}. Wie viel Geld bleibt ${name}?`),
    kmk: KMK,
  });
}

/** A short ride over the full hour, in minutes. */
function rideTime(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const start = rng.int(7, 17) * 60 + rng.int(8, 11) * 5;
  const full = Math.ceil(start / 60) * 60;
  const dur = rng.int(Math.max(3, (full - start) / 5 + 1), 9) * 5;
  const end = start + dur;
  const wrong = hundredMinuteSpan(start, end);
  return finish(SKILL, stufe, {
    key: `bus:${start}:${dur}`,
    ab,
    context: `Der Bus fährt um ${clock(start)} ab. Um ${clock(end)} kommt der Bus an.`,
    prompt: 'Wie viele Minuten dauert die Fahrt?',
    visual: clockVisual(start),
    answer: { kind: 'number', value: dur, before: 'Die Fahrt dauert', after: 'min.', decimals: COMMA_FIELD },
    hints: ['Zähl zuerst bis zur vollen Stunde.', 'Zähl dann die Minuten danach dazu.'],
    steps: [`Bis ${clock(full)}: ${q(full - start, 'min')}`, `Bis ${clock(end)}: noch ${q(end - full, 'min')}`, `Zusammen: ${q(dur, 'min')}`],
    bugs: [{ id: 'zeit-hundert', match: wrong.h * 100 + wrong.min, hint: 'Eine Stunde hat 60 Minuten, nicht 100. Zähl über die volle Stunde.' }],
    praise: 'Du hast über die volle Stunde gezählt.',
    kmk: KMK,
  });
}

/** Backwards: from the change to the price. */
function fromChange(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const name = pickPerson(rng).name;
  const thing = rng.pick(THINGS);
  const price = cents5(rng, thing.min, thing.max);
  const pay = rng.pick([500, 1000, 2000].filter((note) => note >= price + 45));
  const back = pay - price;
  const The = thing.the.charAt(0).toUpperCase() + thing.the.slice(1);
  return finish(SKILL, stufe, {
    key: `rueckwaerts:${thing.buy}:${pay}:${back}`,
    ab,
    context: `${name} bezahlt ${thing.buy} mit ${euro(pay)}. ${name} bekommt ${fmtMoney(back)} zurück.`,
    prompt: `Was kostet ${thing.the}?`,
    answer: { kind: 'number', value: price / 100, before: `${The} kostet`, after: '€.', decimals: EURO_FIELD },
    hints: ['Ein Teil vom Schein ist der Preis. Der andere Teil kommt zurück.', 'Zieh das Rückgeld vom Schein ab.'],
    steps: [`${euro(pay)} − ${fmtMoney(back)} = ${fmtMoney(price)}`, `${The} kostet ${fmtMoney(price)}.`],
    bugs: [{ id: 'rechenart-+', match: (pay + back) / 100, hint: 'Das Rückgeld ist schon im Schein enthalten. Zieh es ab.' }],
    praise: 'Du hast vom Rückgeld auf den Preis geschlossen.',
    kmk: KMK,
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

/** Short names: a Fahrplan with three buses fits a 375 px phone only with them (measured: 'Schwimmbad' needs 365 px of 311 px). */
const STOPS = ['Markt', 'Park', 'Schule', 'Bad'];

interface Timetable {
  /** Minutes since midnight: buses[i][j] is bus i at stop j. */
  buses: number[][];
  visual: Extract<Exercise['visual'], { type: 'table' }>;
}

function timetable(rng: Rng, count: number): Timetable {
  const gaps = [rng.int(2, 3) * 5 + 2, rng.int(2, 4) * 5 + 1, rng.int(2, 4) * 5 + 3];
  const first = rng.int(7, 15) * 60 + rng.int(6, 10) * 5;
  const buses = Array.from({ length: count }, (_, i) => {
    let t = first + i * 30;
    return [t, ...gaps.map((g) => (t += g))];
  });
  const cell = (t: number) => `${Math.floor(t / 60)}.${String(t % 60).padStart(2, '0')}`;
  return {
    buses,
    visual: {
      type: 'table',
      caption: 'Fahrplan, Zeiten in Uhr',
      header: ['Halt', ...buses.map((_, i) => `Bus ${i + 1}`)],
      rows: STOPS.map((stop, j) => [stop, ...buses.map((b) => cell(b[j]))]),
    },
  };
}

/** A Fahrplan as words: a screen reader hears the data of the table with the task. */
const timetableWords = (buses: readonly number[][]) => `Fahrplan. ${STOPS.map((stop, j) => `${stop}: ${buses.map((b, i) => `Bus ${i + 1} um ${clock(b[j])}`).join(', ')}.`).join(' ')}`;

function rideFromTable(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const { buses, visual } = timetable(rng, 2);
  const i = rng.int(0, 1);
  const from = rng.int(0, 1);
  const to = 3;
  const start = buses[i][from];
  const end = buses[i][to];
  const wrong = hundredMinuteSpan(start, end);
  const dur = end - start;
  return finish(SKILL, stufe, {
    key: `fahrplan:${start}:${end}:${i}:${from}`,
    ab,
    prompt: `Wie viele Minuten fährt Bus ${i + 1} vom Halt ${STOPS[from]} bis zum Halt ${STOPS[to]}?`,
    visual,
    answer: { kind: 'number', value: dur, before: 'Die Fahrt dauert', after: 'min.', decimals: COMMA_FIELD },
    hints: ['Lies in der Spalte des Busses beide Zeiten ab.', Math.floor(start / 60) === Math.floor(end / 60) ? 'Zieh die frühere Zeit von der späteren ab.' : 'Rechne über die volle Stunde. Eine Stunde hat 60 Minuten.'],
    steps: [`Abfahrt: ${clock(start)}. Ankunft: ${clock(end)}.`, `Von ${clock(start)} bis ${clock(end)}: ${q(dur, 'min')}`],
    bugs: [{ id: 'zeit-hundert', match: wrong.h * 100 + wrong.min, hint: 'Eine Stunde hat 60 Minuten, nicht 100. Zähl über die volle Stunde.' }],
    praise: 'Du hast im Fahrplan die richtigen Zeiten gefunden.',
    srText: speak(`${timetableWords(buses)} Wie viele Minuten fährt Bus ${i + 1} vom Halt ${STOPS[from]} bis zum Halt ${STOPS[to]}?`),
    kmk: KMK,
  });
}

const GOODS = [
  { one: 'Brötchen', many: 'Brötchen', price: [40, 45, 50, 55] },
  { one: 'Laugenstange', many: 'Laugenstangen', price: [75, 80, 85, 90] },
  { one: 'Apfel', many: 'Äpfel', price: [35, 40, 45, 60] },
  { one: 'Muffin', many: 'Muffins', price: [120, 135, 150, 180] },
];
const DRINKS = [
  { one: 'Saft', price: [110, 120, 150, 180] },
  { one: 'Kakao', price: [130, 140, 160, 190] },
  { one: 'Tee', price: [90, 100, 120, 140] },
];

interface PriceList {
  many: string;
  each: number;
  drink: string;
  drinkPrice: number;
  visual: Extract<Exercise['visual'], { type: 'table' }>;
}

function priceList(rng: Rng): PriceList {
  const [g1, g2] = rng.sample(GOODS, 2);
  const d = rng.pick(DRINKS);
  const each = rng.pick(g1.price);
  const otherPrice = rng.pick(g2.price);
  const drinkPrice = rng.pick(d.price);
  const rows = rng.shuffle([[`1 ${g1.one}`, fmtMoney(each)], [`1 ${g2.one}`, fmtMoney(otherPrice)], [`1 ${d.one}`, fmtMoney(drinkPrice)]]);
  return { many: g1.many, each, drink: d.one, drinkPrice, visual: { type: 'table', caption: 'Preisliste', header: ['Ware', 'Preis'], rows } };
}

/** A Preisliste as words, so that a screen reader hears the prices with the task. */
const priceWords = (list: PriceList) => `Preisliste: ${list.visual.rows.map(([good, price]) => `${good} ${price}`).join(', ')}.`;

function shoppingFromList(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const name = pickPerson(rng).name;
  const list = priceList(rng);
  const n = rng.int(3, 6);
  const part = n * list.each;
  const sum = part + list.drinkPrice;
  return finish(SKILL, stufe, {
    key: `preisliste:${list.many}:${list.each}:${list.drink}:${list.drinkPrice}:${n}`,
    ab,
    context: `${name} kauft ${n} ${list.many} und 1 ${list.drink}.`,
    prompt: `Wie viel bezahlt ${name}?`,
    visual: list.visual,
    answer: { kind: 'number', value: sum / 100, before: `${name} bezahlt`, after: '€.', decimals: EURO_FIELD },
    hints: [`Rechne zuerst den Preis für alle ${list.many}.`, `Zähl dann den Preis für 1 ${list.drink} dazu.`],
    steps: [`${n} · ${fmtMoney(list.each)} = ${fmtMoney(part)}`, `${fmtMoney(part)} + ${fmtMoney(list.drinkPrice)} = ${fmtMoney(sum)}`],
    bugs: [{ id: 'schritt-vergessen', match: (list.each + list.drinkPrice) / 100, hint: `Das sind zwei Schritte. Es sind ${n} ${list.many}.` }],
    praise: 'Du hast aus der Preisliste in zwei Schritten gerechnet.',
    srText: speak(`${priceWords(list)} ${name} kauft ${n} ${list.many} und 1 ${list.drink}. Wie viel bezahlt ${name}?`),
    kmk: KMK,
  });
}

function changeFromList(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const name = pickPerson(rng).name;
  const list = priceList(rng);
  const n = rng.int(3, 6);
  const part = n * list.each + list.drinkPrice;
  const pay = Math.ceil(part / 500) * 500 + 500;
  return finish(SKILL, stufe, {
    key: `rueckgeld:${list.many}:${list.each}:${list.drink}:${list.drinkPrice}:${n}`,
    ab,
    context: `${name} kauft ${n} ${list.many} und 1 ${list.drink}. ${name} bezahlt mit ${euro(pay)}.`,
    prompt: `Wie viel Geld bekommt ${name} zurück?`,
    visual: list.visual,
    answer: { kind: 'number', value: (pay - part) / 100, before: `${name} bekommt`, after: '€ zurück.', decimals: EURO_FIELD },
    hints: ['Rechne zuerst den ganzen Einkauf aus.', 'Zieh den Einkauf dann vom bezahlten Betrag ab.'],
    steps: [`${n} · ${fmtMoney(list.each)} = ${fmtMoney(n * list.each)}`, `${fmtMoney(n * list.each)} + ${fmtMoney(list.drinkPrice)} = ${fmtMoney(part)}`, `${euro(pay)} − ${fmtMoney(part)} = ${fmtMoney(pay - part)}`],
    bugs: [{ id: 'schritt-vergessen', match: part / 100, hint: 'Das ist der Einkauf. Gefragt ist das Rückgeld.' }],
    praise: 'Du hast den Einkauf ausgerechnet und das Rückgeld gefunden.',
    srText: speak(`${priceWords(list)} ${name} kauft ${n} ${list.many} und 1 ${list.drink}. ${name} bezahlt mit ${euro(pay)}. Wie viel Geld bekommt ${name} zurück?`),
    kmk: KMK,
  });
}

/** The latest bus that is on time: the task says that the latest one is wanted, else every earlier bus fits as well. */
function latestBus(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const { buses, visual } = timetable(rng, 3);
  const name = pickPerson(rng).name;
  const right = rng.int(0, 1);
  const target = buses[right][3] + rng.int(1, 3) * 5;
  const label = (i: number) => `Bus ${i + 1}`;
  const wrongs: ChoiceOption[] = [0, 1, 2].filter((i) => i !== right).map((i) => ({
    label: label(i),
    whyWrong: i < right ? 'Dieser Bus kommt rechtzeitig an. Es gibt aber einen späteren.' : 'Dieser Bus kommt zu spät an. Schau in die letzte Zeile.',
  }));
  return finish(SKILL, stufe, {
    key: `spaetestens:${buses[0][0]}:${buses[0][3]}:${right}:${target}`,
    ab,
    context: `${name} möchte spätestens um ${clock(target)} am Halt ${STOPS[3]} sein. ${name} möchte möglichst spät losfahren.`,
    prompt: `Welchen Bus nimmt ${name}?`,
    visual,
    answer: makeChoice(rng, { label: label(right) }, wrongs, { order: [label(0), label(1), label(2)] }),
    hints: [`Schau in die Zeile vom Halt ${STOPS[3]}.`, 'Gesucht ist der letzte Bus vor dieser Zeit.'],
    steps: [`Bus ${right + 1} kommt um ${clock(buses[right][3])} an.`, `Bus ${right + 2} kommt um ${clock(buses[right + 1][3])} an. Das ist zu spät.`, `Also nimmt ${name} ${label(right)}.`],
    praise: 'Du hast die Ankunft im Fahrplan genau geprüft.',
    srText: speak(`${timetableWords(buses)} ${name} möchte spätestens um ${clock(target)} am Halt ${STOPS[3]} sein. ${name} möchte möglichst spät losfahren. Welchen Bus nimmt ${name}?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** A number too many: the question needs only some of them. */
function extraInformation(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const kind = rng.int(1, 3);
  const hints = ['Welche Zahlen brauchst du für diese Frage?', 'Streiche die Angabe ohne Bezug zur Frage.'];
  const praise = 'Du hast nur die nötigen Zahlen benutzt.';
  if (kind === 1) {
    const people = rng.int(22, 30);
    const price = rng.int(3, 8);
    const minutes = rng.int(4, 9) * 5;
    const value = people * price;
    return finish(SKILL, stufe, {
      key: `extra-karten:${people}:${price}:${minutes}`,
      ab,
      context: `Eine Klasse fährt mit ${people} Personen ins Museum. Eine Karte kostet ${q(price, '€')}. Die Fahrt dauert ${q(minutes, 'min')}.`,
      prompt: 'Wie viel kosten alle Karten zusammen?',
      answer: { kind: 'number', value, before: 'Alle Karten kosten', after: '€.', decimals: EURO_FIELD },
      hints,
      steps: [`Die Fahrzeit brauchst du hier nicht.`, `${people} · ${q(price, '€')} = ${q(value, '€')}`],
      bugs: [{ id: 'alle-zahlen', match: value + minutes, hint: 'Welche Zahlen brauchst du für diese Frage? Die Fahrzeit gehört nicht dazu.' }],
      praise,
      kmk: KMK,
    });
  }
  if (kind === 2) {
    const name = pickPerson(rng).name;
    const n = rng.int(2, 6);
    const price = cents5(rng, 95, 240);
    const way = rng.int(3, 9) * 100;
    const pay = Math.ceil((n * price) / 500) * 500 + 500;
    const cost = n * price;
    return finish(SKILL, stufe, {
      key: `extra-heft:${n}:${price}:${way}:${pay}`,
      ab,
      context: `${name} kauft ${n} Hefte zu je ${fmtMoney(price)}. Der Laden ist ${q(way, 'm')} entfernt. ${name} bezahlt mit ${euro(pay)}.`,
      prompt: `Wie viel Geld bekommt ${name} zurück?`,
      answer: { kind: 'number', value: (pay - cost) / 100, before: `${name} bekommt`, after: '€ zurück.', decimals: EURO_FIELD },
      hints,
      steps: ['Der Weg zum Laden spielt hier keine Rolle.', `${n} · ${fmtMoney(price)} = ${fmtMoney(cost)}`, `${euro(pay)} − ${fmtMoney(cost)} = ${fmtMoney(pay - cost)}`],
      bugs: [{ id: 'alle-zahlen', match: (pay - cost - way) / 100, hint: 'Welche Zahlen brauchst du für diese Frage? Der Weg gehört nicht dazu.' }, { id: 'schritt-vergessen', match: cost / 100, hint: 'Das ist der Preis der Hefte. Gefragt ist das Rückgeld.' }],
      praise,
      kmk: KMK,
    });
  }
  const total = rng.int(8, 24);
  const done = rng.int(3, total - 2);
  const hour = rng.int(8, 11) * 60;
  return finish(SKILL, stufe, {
    key: `extra-weg:${total}:${done}:${hour}`,
    ab,
    context: `Ein Wanderweg ist ${q(total, 'km')} lang. Die Gruppe startet um ${clock(hour)}. Nach ${q(done, 'km')} macht die Gruppe Pause.`,
    prompt: 'Wie weit ist es dann noch bis zum Ziel?',
    answer: { kind: 'number', value: total - done, before: 'Es sind noch', after: 'km.', decimals: COMMA_FIELD },
    hints,
    steps: ['Die Uhrzeit brauchst du hier nicht.', `${q(total, 'km')} − ${q(done, 'km')} = ${q(total - done, 'km')}`],
    bugs: [{ id: 'rechenart-+', match: total + done, hint: 'Ein Teil vom Weg ist schon geschafft. Zieh diesen Teil ab.' }, { id: 'alle-zahlen', match: total - done - hour / 60, hint: 'Welche Zahlen brauchst du für diese Frage? Die Uhrzeit gehört nicht dazu.' }],
    praise,
    kmk: KMK,
  });
}

/** Solvable or not: the button is there in both cases, so it gives nothing away. */
function maybeUnsolvable(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const kind = rng.int(1, 3);
  const missing = rng.chance(0.5);
  const name = pickPerson(rng).name;
  const hints = ['Welche Angaben brauchst du für die Frage?', 'Stehen alle diese Angaben in der Aufgabe?'];
  const praise = missing ? 'Du hast gemerkt: Eine Angabe fehlt.' : 'Du hast geprüft: Alle Angaben sind da.';
  const tail = (lack: string) => [`Hier fehlt ${lack}.`, 'Die Aufgabe ist nicht lösbar.'];
  if (kind === 1) {
    const n = rng.int(2, 6);
    const price = cents5(rng, 95, 240);
    const pay = Math.ceil((n * price) / 500) * 500 + 500;
    const cost = n * price;
    return finish(SKILL, stufe, {
      key: `offen-heft:${missing}:${n}:${price}:${pay}`,
      ab,
      context: missing ? `${name} kauft ${n} Hefte. ${name} bezahlt mit ${euro(pay)}.` : `${name} kauft ${n} Hefte zu je ${fmtMoney(price)}. ${name} bezahlt mit ${euro(pay)}.`,
      prompt: `Wie viel Geld bekommt ${name} zurück?`,
      answer: { kind: 'number', value: missing ? null : (pay - cost) / 100, unit: '€', decimals: EURO_FIELD, offerUnsolvable: true },
      hints,
      steps: missing ? tail('der Preis der Hefte') : [`${n} · ${fmtMoney(price)} = ${fmtMoney(cost)}`, `${euro(pay)} − ${fmtMoney(cost)} = ${fmtMoney(pay - cost)}`],
      bugs: missing ? [{ id: 'alle-zahlen', match: pay / 100 - n, hint: 'Welche Zahlen brauchst du für diese Frage? Sind alle da?' }] : [{ id: 'schritt-vergessen', match: cost / 100, hint: 'Das ist der Preis der Hefte. Gefragt ist das Rückgeld.' }],
      praise,
      kmk: KMK,
    });
  }
  if (kind === 2) {
    const start = rng.int(8, 16) * 60 + rng.int(1, 10) * 5;
    const dur = rng.int(5, 17) * 5;
    return finish(SKILL, stufe, {
      key: `offen-zug:${missing}:${start}:${dur}`,
      ab,
      context: missing ? `Der Zug fährt um ${clock(start)} ab. Der Zug hält dreimal.` : `Der Zug fährt um ${clock(start)} ab. Der Zug kommt um ${clock(start + dur)} an.`,
      prompt: 'Wie viele Minuten dauert die Fahrt?',
      answer: { kind: 'number', value: missing ? null : dur, unit: 'min', decimals: COMMA_FIELD, offerUnsolvable: true },
      hints,
      steps: missing ? tail('die Ankunftszeit') : [`Von ${clock(start)} bis ${clock(start + dur)}: ${q(dur, 'min')}`],
      bugs: missing ? [{ id: 'alle-zahlen', match: 3, hint: 'Die Anzahl der Halte sagt nichts über die Dauer. Welche Angabe fehlt?' }] : [{ id: 'zeit-hundert', match: hundredMinuteSpan(start, start + dur).h * 100 + hundredMinuteSpan(start, start + dur).min, hint: hundredMinuteHint(dur) }],
      praise,
      kmk: KMK,
    });
  }
  const total = rng.int(10, 30);
  const done = rng.int(3, total - 2);
  return finish(SKILL, stufe, {
    key: `offen-rad:${missing}:${total}:${done}`,
    ab,
    context: missing ? `${name} fährt mit dem Rad zum See. ${name} hat schon ${q(done, 'km')} geschafft.` : `${name} fährt ${q(total, 'km')} mit dem Rad zum See. ${name} hat schon ${q(done, 'km')} geschafft.`,
    prompt: 'Wie weit ist es noch bis zum See?',
    answer: { kind: 'number', value: missing ? null : total - done, unit: 'km', decimals: COMMA_FIELD, offerUnsolvable: true },
    hints,
    steps: missing ? tail('die Länge des ganzen Wegs') : [`${q(total, 'km')} − ${q(done, 'km')} = ${q(total - done, 'km')}`],
    bugs: missing ? [{ id: 'alle-zahlen', match: done, hint: 'Das ist der geschaffte Teil. Welche Angabe fehlt für den Rest?' }] : [{ id: 'rechenart-+', match: total + done, hint: 'Ein Teil vom Weg ist schon geschafft. Zieh diesen Teil ab.' }],
    praise,
    kmk: KMK,
  });
}

/** Is a result plausible? A claim that is right, or off by a factor of 10. */
function plausible(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const name = pickPerson(rng).name;
  const yes = 'Das passt.';
  const much = 'Das ist viel zu viel.';
  const little = 'Das ist viel zu wenig.';
  const verdict = rng.pick([yes, much, little]);
  const factor = verdict === much ? 10 : verdict === little ? 0.1 : 1;
  const money = rng.chance(0.5);
  let context: string;
  let shownSaid: string;
  let check: string;
  if (money) {
    const n = rng.int(2, 6);
    const price = rng.int(5, 9) * 20 + 100;
    const real = n * price;
    const said = Math.round(real * factor);
    context = `${name} rechnet: ${n} Hefte zu je ${fmtMoney(price)} kosten zusammen ${fmtMoney(said)}.`;
    shownSaid = fmtMoney(said);
    check = `${n} · ${fmtMoney(price)} = ${fmtMoney(real)}`;
  } else {
    const h = rng.int(2, 4);
    const speed = rng.int(5, 9) * 10;
    const real = h * speed;
    const said = Math.round(real * factor);
    context = `${name} rechnet: Ein Bus fährt ${q(h, 'h')} lang. In jeder Stunde schafft der Bus ${q(speed, 'km')}. Das sind zusammen ${q(said, 'km')}.`;
    shownSaid = q(said, 'km');
    check = `${h} · ${q(speed, 'km')} = ${q(real, 'km')}`;
  }
  const wrongs: ChoiceOption[] = [yes, much, little].filter((v) => v !== verdict).map((label) => ({ label, whyWrong: 'Mach einen Überschlag mit runden Zahlen. Vergleiche dann.' }));
  return finish(SKILL, stufe, {
    key: `plausibel:${context}`,
    ab,
    context,
    prompt: 'Passt das Ergebnis?',
    answer: makeChoice(rng, { label: verdict }, wrongs, { order: [yes, much, little] }),
    hints: ['Mach einen Überschlag mit runden Zahlen.', 'Vergleiche dein Ergebnis mit der Angabe.'],
    steps: [check, `${name} schreibt ${shownSaid}. ${verdict}`],
    praise: 'Du hast das Ergebnis mit einem Überschlag geprüft.',
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

export const sachaufgabenSkill: SkillDef = {
  ...SKILL,
  title: 'Größen im Alltag',
  description: 'Du löst Aufgaben zu Fahrplänen, Preisen und Strecken.',
  stufen: {
    1: 'Ein Rechenschritt, eine Einheit, mit Antwortsatz',
    2: 'Fahrplan oder Preisliste lesen, zwei Rechenschritte',
    3: 'Ergebnis prüfen; Angaben zu viel; nicht lösbar',
  },
  kmk: KMK,
  keys: { comma: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) return rng.chance(0.6) ? buyTwo(stufe, ab, rng) : rideTwo(stufe, ab, rng);
      if (ab === 2) {
        const kind = rng.int(1, 3);
        if (kind === 1) return moreButLess(stufe, ab, rng);
        return kind === 2 ? coinsLeft(stufe, ab, rng) : rideTime(stufe, ab, rng);
      }
      return fromChange(stufe, ab, rng);
    }
    if (stufe === 2) {
      if (ab === 1) return rideFromTable(stufe, ab, rng);
      if (ab === 2) return shoppingFromList(stufe, ab, rng);
      return rng.chance(0.5) ? latestBus(stufe, ab, rng) : changeFromList(stufe, ab, rng);
    }
    if (ab === 1) return extraInformation(stufe, ab, rng);
    if (ab === 2) return maybeUnsolvable(stufe, ab, rng);
    return plausible(stufe, ab, rng);
  },
};

