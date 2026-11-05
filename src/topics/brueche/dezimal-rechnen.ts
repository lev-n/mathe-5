/**
 * Mit Dezimalzahlen rechnen. All values are built from whole hundredths or thousandths, so a result is never a float accident.
 * Stufe 1 (plus and minus, same length, money): AB I calculate, AB II a story, AB III the missing amount.
 * Stufe 2 (different length, comma under comma): AB I plus, AB II minus, AB III a chain of three, or a story with lengths.
 * Stufe 3 (mal and geteilt by a natural number, Überschlag): AB I one decimal place, AB II two places, or choose the Überschlag, AB III place the comma, or a story.
 * The comma key holds for the whole skill, so every number answer sets decimals.
 */
import { BOX, fmt, fmtMoney, NBSP } from '../../core/format';
import type { Ab, Bug, Exercise, Rng, SkillDef, Step, Stufe, Visual } from '../../core/types';
import { build, makeChoice, pickPerson, speak } from '../shared';
import { byStufeAndAb, typedBugs, type Form } from './helpers';

const SKILL = { id: 'brueche.dezimal-rechnen', topicId: 'brueche' } as const;
const KMK = ['ZO.dezimalzahlen'];
const DECIMALS = 3;
/** Money and metres are always written with two places (T10), and the field writes its answer with two only when decimals is 2. */
const TWO_PLACES = 2;

const euro = (cents: number) => fmtMoney(cents);
/** Digit-wise difference: the smaller digit is taken from the larger in every place. */
function digitwiseDifference(a: number, b: number): number {
  const x = String(a);
  const y = String(b).padStart(x.length, '0');
  return Number([...x].map((c, i) => Math.abs(Number(c) - Number(y[i]))).join(''));
}

/** Stellentafel of a sum or difference, comma under comma; values in thousandths, shown with `places` decimals. */
function aligned(milli: readonly number[], places: number): Visual {
  const whole = Math.max(...milli.map((m) => Math.floor(m / 1000)));
  const columns = [...(whole >= 10 ? (['Z'] as const) : []), 'E', ...(['z', 'h', 't'] as const).slice(0, places)] as Extract<Visual, { type: 'placeValue' }>['columns'];
  const digit = (m: number, column: string): number | null => {
    const size = { Z: 10_000, E: 1000, z: 100, h: 10, t: 1 }[column] as number;
    return Math.floor(m / size) % 10;
  };
  return { type: 'placeValue', columns, rows: milli.map((m) => ({ values: columns.map((c) => digit(m, c)) })) };
}

/** Same-length amounts, typed with two places: 22,104 from 9,78 + 13,26 gets the field's message about the places, 22,11 from 9,78 + 13,32 this hint. */
const moneyBugs = (a: number, b: number, plus: boolean, value: number): Bug[] => {
  const tail = plus ? (a % 100) + (b % 100) : 0;
  const whole = Math.floor(a / 100) + Math.floor(b / 100);
  return typedBugs([
    { id: 'komma-vergessen', match: plus ? a + b : a - b, hint: 'Setze das Komma im Ergebnis unter die anderen Kommas.' },
    plus && tail >= 100 && { id: 'komma-getrennt', match: whole + tail / 1000, hint: 'Die Cent ergeben mehr als 1 €. Trage den Euro in die Euro-Stelle um.' },
    !plus && { id: 'kleiner-von-groesser', match: digitwiseDifference(a, b) / 100, hint: 'Rechne Stelle für Stelle. Oben steht manchmal die kleinere Ziffer.' },
    { id: 'plus-statt-minus', match: plus ? Math.abs(a - b) / 100 : (a + b) / 100, hint: plus ? 'Hier kommt etwas dazu. Rechne plus.' : 'Hier geht etwas weg. Rechne minus.' },
  ], value, TWO_PLACES);
};

/** Two amounts in cents with the same length, for a bare calculation; a story takes storyAmounts. */
function amounts(rng: Rng, plus: boolean): [a: number, b: number] {
  const a = rng.int(120, 1990);
  const b = plus ? rng.int(110, 1900) : rng.int(105, a - 15);
  return [a, b];
}

/** Stufe 1, AB I: money, or tenths. */
const plainSameLength: Form = (rng, stufe, ab) => {
  const plus = rng.chance(0.55);
  const useMoney = rng.chance(0.7);
  if (!useMoney) {
    const [x, y] = plus ? [rng.int(11, 89), rng.int(11, 89)] : ((v) => [v, rng.int(11, v - 2)])(rng.int(21, 99));
    const value = (plus ? x + y : x - y) / 10;
    const op = plus ? '+' : '−';
    const tail = (x % 10) + (y % 10);
    return build(SKILL, stufe, {
      key: `zehntel:${x}${op}${y}`,
      ab,
      prompt: 'Rechne.',
      expression: `${fmt(x / 10, 1)} ${op} ${fmt(y / 10, 1)} = ${BOX}`,
      answer: { kind: 'number', value, decimals: DECIMALS, label: 'Ergebnis' },
      hints: ['Komma unter Komma: Zehntel zu Zehnteln.', plus ? 'Zehn Zehntel sind ein Ganzes.' : 'Ein Ganzes sind zehn Zehntel.'],
      steps: [`${x} Zehntel ${op} ${y} Zehntel = ${plus ? x + y : x - y} Zehntel`, `${fmt(x / 10, 1)} ${op} ${fmt(y / 10, 1)} = ${fmt(value, 1)}`],
      bugs: typedBugs([
        plus && tail >= 10 && { id: 'komma-getrennt', match: Math.floor(x / 10) + Math.floor(y / 10) + tail / 100, hint: 'Zehn Zehntel sind ein Ganzes. Trage es um.' },
        { id: 'komma-vergessen', match: plus ? x + y : x - y, hint: 'Setze das Komma im Ergebnis unter die anderen Kommas.' },
      ], value, DECIMALS),
      praise: 'Du hast Zehntel zu Zehnteln gerechnet.',
      srText: speak(`${fmt(x / 10, 1)} ${op} ${fmt(y / 10, 1)} ist wie viel?`),
      kmk: KMK,
    });
  }
  const [a, b] = amounts(rng, plus);
  const value = (plus ? a + b : a - b) / 100;
  const op = plus ? '+' : '−';
  return build(SKILL, stufe, {
    key: `geld:${a}${op}${b}`,
    ab,
    prompt: 'Rechne.',
    expression: `${euro(a)} ${op} ${euro(b)} = ${BOX} €`,
    answer: { kind: 'number', value, unit: '€', decimals: TWO_PLACES, label: 'Betrag in Euro' },
    hints: ['Komma unter Komma: Euro zu Euro, Cent zu Cent.', plus ? '100 Cent sind 1 Euro.' : '1 Euro sind 100 Cent.'],
    steps: [`${a} ct ${op} ${b} ct = ${plus ? a + b : a - b} ct`.replace(/(\d) ct/g, `$1${NBSP}ct`), `${euro(a)} ${op} ${euro(b)} = ${euro(plus ? a + b : a - b)}`],
    bugs: moneyBugs(a, b, plus, value),
    praise: 'Du hast Komma unter Komma gerechnet.',
    srText: speak(`${euro(a)} ${op} ${euro(b)} ist wie viel Euro?`),
    kmk: [...KMK, 'GM.rechnen'],
  });
};

/** The amounts of a money story in cents, each fitted to its item: a Heft costs about 1 €, a Buch rather 10 €, and a Springseil is more than coins. */
function storyAmounts(rng: Rng, kind: 'kauf' | 'rest' | 'mehr'): [a: number, b: number] {
  if (kind === 'kauf') return [rng.int(80, 290), rng.int(150, 690)];
  if (kind === 'rest') {
    const book = rng.int(450, 1490);
    return [book + rng.int(35, 510), book];
  }
  const gap = rng.int(150, 1300);
  return [rng.int(250, 690) + gap, gap];
}

/** Stufe 1, AB II: a money story; 'mehr' does not always mean plus (T13). */
const moneyStory: Form = (rng, stufe, ab) => {
  const p = pickPerson(rng).name;
  const kind = rng.pick(['kauf', 'rest', 'mehr'] as const);
  const plus = kind === 'kauf';
  const [a, b] = storyAmounts(rng, kind);
  const value = (plus ? a + b : a - b) / 100;
  const s = kind === 'kauf'
    ? { context: `${p} kauft ein Heft für ${euro(a)} und Stifte für ${euro(b)}.`, prompt: `Wie viel bezahlt ${p}?` }
    : kind === 'rest'
      ? { context: `${p} hat ${euro(a)}. Ein Buch kostet ${euro(b)}.`, prompt: 'Wie viel Geld bleibt nach dem Kauf?' }
      : { context: `Ein Ball kostet ${euro(a)}. Das sind ${euro(b)} mehr als ein Springseil.`, prompt: 'Wie viel kostet das Springseil?' };
  return build(SKILL, stufe, {
    key: `sache:${kind}:${p}:${a}:${b}`,
    ab,
    context: s.context,
    prompt: s.prompt,
    answer: { kind: 'number', value, unit: '€', decimals: TWO_PLACES, label: 'Betrag in Euro' },
    hints: [plus ? 'Beide Preise kommen zusammen.' : kind === 'rest' ? 'Der Preis geht vom Geld ab.' : 'Das Springseil ist billiger als der Ball.', 'Schreibe Komma unter Komma.'],
    steps: [`Rechnung: ${euro(a)} ${plus ? '+' : '−'} ${euro(b)} = ${euro(plus ? a + b : a - b)}`, `Die Antwort ist ${euro(plus ? a + b : a - b)}.`],
    bugs: moneyBugs(a, b, plus, value),
    praise: 'Du hast aus der Geschichte die passende Rechnung gemacht.',
    srText: speak(`${s.context} ${s.prompt}`),
    kmk: [...KMK, 'GM.rechnen', 'PK.modellieren'],
  });
};

/** Stufe 1, AB III: the missing amount. */
const missingAmount: Form = (rng, stufe, ab) => {
  const p = pickPerson(rng).name;
  const story = rng.chance(0.5);
  // a child pays with a banknote, and with a 20-€-Schein for more than a few coins' worth
  const total = story ? rng.pick([500, 1000, 2000]) : rng.pick([500, 1000, 2000, rng.int(4, 19) * 100 + rng.pick([0, 50])]);
  const a = rng.int(story ? Math.max(115, total / 4) : 115, total - 35);
  const missing = total - a;
  const context = `${p} bezahlt mit ${euro(total)}. ${p} bekommt ${euro(missing)} zurück.`;
  const prompt = story ? 'Wie viel kostet der Einkauf?' : 'Welcher Betrag fehlt?';
  return build(SKILL, stufe, {
    key: `fehlt:${story ? `s:${p}` : 'p'}:${a}:${total}`,
    ab,
    ...(story ? { context } : { expression: `${euro(a)} + ${BOX} € = ${euro(total)}` }),
    prompt,
    answer: { kind: 'number', value: (story ? a : missing) / 100, unit: '€', decimals: TWO_PLACES, label: 'Betrag in Euro' },
    hints: ['Rechne rückwärts mit minus.', 'Mach die Probe: Passt die Summe?'],
    steps: story
      ? [`${euro(total)} − ${euro(missing)} = ${euro(a)}`, `Probe: ${euro(a)} + ${euro(missing)} = ${euro(total)}`, `Der Einkauf kostet ${euro(a)}.`]
      : [`${euro(total)} − ${euro(a)} = ${euro(missing)}`, `Probe: ${euro(a)} + ${euro(missing)} = ${euro(total)}`, `Es fehlen ${euro(missing)}.`],
    bugs: typedBugs([{ id: 'plus-statt-minus', match: (story ? total + missing : total + a) / 100, hint: 'Das Ergebnis ist kleiner als der größte Betrag. Rechne minus.' }], (story ? a : missing) / 100, TWO_PLACES),
    praise: 'Du hast rückwärts gerechnet und die Probe gemacht.',
    srText: speak(story ? `${context} ${prompt}` : `${prompt} ${euro(a)} plus Lücke ist ${euro(total)}.`),
    kmk: [...KMK, 'GM.rechnen'],
  });
};

/** A number with one place and a number with two, in thousandths. */
function differentLength(rng: Rng): [one: number, two: number] {
  return [rng.int(11, 99) * 100, (rng.int(1, 9) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9)) * 10];
}

/** The steps of a sum or difference with the Stellentafel. */
function alignedSteps(a: number, b: number, plus: boolean, result: number, unit = ''): Step[] {
  const op = plus ? '+' : '−';
  const text = (m: number) => `${fmt(m / 1000, 2)}${unit}`;
  return [
    { text: `Komma unter Komma: ${fmt(a / 1000, 2)} und ${fmt(b / 1000, 2)}`, visual: aligned([a, b], 2) },
    `${text(a)} ${op} ${text(b)} = ${text(result)}`,
  ];
}

/** Stufe 2, AB I: 3,5 + 1,25. */
const alignPlus: Form = (rng, stufe, ab) => {
  const [one, two] = differentLength(rng);
  const swap = rng.chance(0.5);
  const [a, b] = swap ? [two, one] : [one, two];
  const value = (a + b) / 1000;
  const rightAligned = (one / 100 + two / 10) / 100;
  const tailsAdded = Math.floor(one / 1000) + Math.floor(two / 1000) + (Math.floor((one % 1000) / 100) + Math.floor((two % 1000) / 10)) / 100;
  return build(SKILL, stufe, {
    key: `plus:${a}:${b}`,
    ab,
    prompt: 'Rechne. Achte auf das Komma.',
    expression: `${fmt(a / 1000)} + ${fmt(b / 1000)} = ${BOX}`,
    answer: { kind: 'number', value, decimals: DECIMALS, label: 'Ergebnis' },
    hints: ['Komma unter Komma: Zehntel zu Zehnteln.', 'Hänge eine 0 an, bis beide gleich viele Stellen haben.'],
    steps: alignedSteps(a, b, true, a + b),
    bugs: typedBugs([
      { id: 'komma-ausrichten', match: rightAligned, hint: 'Komma unter Komma: Zehntel zu Zehnteln.' },
      { id: 'komma-ausrichten', match: tailsAdded, hint: 'Komma unter Komma: Zehntel zu Zehnteln. Hänge zuerst eine 0 an.' },
    ], value, DECIMALS),
    praise: 'Du hast Komma unter Komma geschrieben.',
    srText: speak(`${fmt(a / 1000)} + ${fmt(b / 1000)} ist wie viel?`),
    kmk: KMK,
  });
};

/** Stufe 2, AB II: 4,5 − 1,25, also from a whole number. */
const alignMinus: Form = (rng, stufe, ab) => {
  const fromWhole = rng.chance(0.3);
  const two = (rng.int(1, 4) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9)) * 10;
  const a = fromWhole ? rng.int(5, 12) * 1000 : rng.int(5, 12) * 1000 + rng.int(1, 9) * 100;
  const value = (a - two) / 1000;
  const tailDiff = Math.floor(a / 1000) - Math.floor(two / 1000) + Math.abs((a % 1000) / 10 - (two % 1000) / 10) / 100;
  const noZero = Math.floor(a / 1000) - Math.floor(two / 1000) + (fromWhole ? (two % 1000) / 1000 : Math.abs((a % 1000) / 100 - (two % 1000) / 10) / 100);
  const leftShown = fmt(a / 1000);
  const filled = fmt(a / 1000, 2);
  return build(SKILL, stufe, {
    key: `minus:${a}:${two}`,
    ab,
    prompt: 'Rechne. Achte auf das Komma.',
    expression: `${leftShown} − ${fmt(two / 1000)} = ${BOX}`,
    answer: { kind: 'number', value, decimals: DECIMALS, label: 'Ergebnis' },
    hints: [`Schreib ${leftShown} als ${filled}.`, 'Komma unter Komma. Rechne dann Stelle für Stelle.'],
    steps: alignedSteps(a, two, false, a - two),
    bugs: typedBugs([
      { id: 'null-ergaenzen', match: tailDiff, hint: `Schreib ${leftShown} als ${filled}. Dann siehst du jede Stelle.` },
      { id: 'null-ergaenzen', match: noZero, hint: `Schreib ${leftShown} als ${filled}. Dann siehst du jede Stelle.` },
    ], value, DECIMALS),
    praise: 'Du hast die fehlende Stelle mit einer 0 gefüllt.',
    srText: speak(`${leftShown} − ${fmt(two / 1000)} ist wie viel?`),
    kmk: KMK,
  });
};

/** Stufe 2, AB III: three numbers of different length. */
const chainOfThree: Form = (rng, stufe, ab) => {
  const a = rng.int(11, 59) * 100;
  const b = (rng.int(1, 4) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9)) * 10;
  const c = rng.int(1, 9) * 1000;
  const value = (a + b + c) / 1000;
  const terms = rng.shuffle([a, b, c]);
  const shown = terms.map((t) => fmt(t / 1000)).join(' + ');
  return build(SKILL, stufe, {
    key: `drei:${terms.join('+')}`,
    ab,
    prompt: 'Rechne. Achte auf das Komma.',
    expression: `${shown} = ${BOX}`,
    answer: { kind: 'number', value, decimals: DECIMALS, label: 'Ergebnis' },
    hints: ['Eine ganze Zahl hat ihr Komma am Ende: 3 = 3,00.', 'Schreibe alle Zahlen Komma unter Komma.'],
    steps: [{ text: `Mit zwei Stellen: ${terms.map((t) => fmt(t / 1000, 2)).join(' + ')}`, visual: aligned(terms, 2) }, `${fmt(a / 1000, 2)} + ${fmt(b / 1000, 2)} = ${fmt((a + b) / 1000, 2)}`, `${fmt((a + b) / 1000, 2)} + ${fmt(c / 1000, 2)} = ${fmt(value, 2)}`],
    bugs: typedBugs([{ id: 'komma-ausrichten', match: (a + b) / 1000 + c / 100_000, hint: 'Eine ganze Zahl steht vor dem Komma, bei den Einern.' }], value, DECIMALS),
    praise: 'Du hast auch die ganze Zahl richtig eingeordnet.',
    srText: speak(`${shown} ist wie viel?`),
    kmk: KMK,
  });
};

/** Stufe 2, AB III: a story with lengths. */
const lengthStory: Form = (rng, stufe, ab) => {
  const p = pickPerson(rng).name;
  const a = rng.int(21, 59) * 100;
  const b = (100 + rng.int(1, 9) * 10 + rng.int(1, 9)) * 10;
  const value = (a - b) / 1000;
  const m = (x: number) => `${fmt(x / 1000)}${NBSP}m`;
  const context = `Ein Brett ist ${m(a)} lang. ${p} sägt ${m(b)} ab.`;
  const prompt = 'Wie lang ist das Brett jetzt?';
  return build(SKILL, stufe, {
    key: `brett:${p}:${a}:${b}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, unit: 'm', decimals: TWO_PLACES, label: 'Länge in Meter' },
    hints: [`Schreib ${m(a)} mit zwei Stellen nach dem Komma.`, 'Rechne Komma unter Komma.'],
    steps: [{ text: `Komma unter Komma: ${fmt(a / 1000, 2)} und ${fmt(b / 1000, 2)}`, visual: aligned([a, b], 2) }, `${fmt(a / 1000, 2)}${NBSP}m − ${fmt(b / 1000, 2)}${NBSP}m = ${fmt(value, 2)}${NBSP}m`],
    bugs: typedBugs([
      { id: 'plus-statt-minus', match: (a + b) / 1000, hint: 'Das Brett wird kürzer. Rechne minus.' },
      { id: 'null-ergaenzen', match: Math.floor(a / 1000) - Math.floor(b / 1000) + Math.abs((a % 1000) / 10 - (b % 1000) / 10) / 100, hint: 'Schreib beide Längen mit zwei Stellen. Dann siehst du jede Stelle.' },
    ], value, TWO_PLACES),
    praise: 'Du hast Komma unter Komma abgezogen.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'GM.rechnen', 'PK.modellieren'],
  });
};

/** A product or quotient with the numbers in `places` decimal places. */
function timesOrDivide(rng: Rng, stufe: Stufe, ab: Ab, places: 1 | 2): Exercise {
  const times = rng.chance(0.55);
  const f = rng.int(2, 9);
  const scale = 10 ** places;
  let q = places === 1 ? rng.int(12, 89) : rng.int(112, 899);
  // no 7,0 and no 9,0 : 2: both numbers keep the places they promise
  while (q % 10 === 0 || (!times && (q * f) % 10 === 0)) q += 1;
  const x = times ? q : q * f;
  const value = (times ? q * f : q) / scale;
  const left = fmt(x / scale, places);
  const op = times ? '·' : ':';
  // a Überschlag divides without a Rest: the dividend goes to a multiple of the divisor
  const near = Math.round(q / scale);
  const rough = times ? near : near * f;
  const estimate = times ? near * f : near;
  return build(SKILL, stufe, {
    key: `${times ? 'mal' : 'geteilt'}:${x}:${f}:${places}`,
    ab,
    prompt: 'Rechne. Prüfe mit einem Überschlag.',
    expression: `${left} ${op} ${f} = ${BOX}`,
    answer: { kind: 'number', value, decimals: DECIMALS, label: 'Ergebnis' },
    hints: [times ? 'Rechne ohne Komma. Setze das Komma danach.' : 'Rechne wie gewohnt. Setze das Komma, sobald du es erreichst.', `Mach den Überschlag mit ${fmt(rough)} ${op} ${f}.`],
    steps: [
      `Überschlag: ${fmt(rough)} ${op} ${f} = ${fmt(estimate)}`,
      times ? `Ohne Komma: ${x} · ${f} = ${q * f}` : `Ohne Komma: ${x} : ${f} = ${q}`,
      `${left} ${op} ${f} = ${fmt(value)}`,
    ],
    bugs: typedBugs([
      { id: 'komma-vergessen', match: times ? q * f : q, hint: 'Mach den Überschlag. Wo muss das Komma stehen?' },
      // only a product of the tenths from 10 on has a whole to carry
      times && places === 1 && (q % 10) * f >= 10 && { id: 'komma-getrennt', match: Math.floor(q / 10) * f + ((q % 10) * f) / 100, hint: 'Die Zehntel ergeben mehr als 1. Trage das Ganze um.' },
      { id: 'komma-verschoben', match: (times ? q * f : q) / (scale * 10), hint: 'Mach den Überschlag. Das Ergebnis ist größer.' },
    ], value, DECIMALS),
    praise: 'Dein Überschlag hat zur Stelle des Kommas gepasst.',
    srText: speak(`${left} ${op} ${f} ist wie viel?`),
    kmk: [...KMK, 'ZO.runden'],
  });
}

/** Stufe 3, AB II: which Überschlag fits? */
const chooseEstimate: Form = (rng, stufe, ab) => {
  const near = rng.int(2, 9);
  const tenth = rng.pick([-2, -1, 1, 2]);
  const x = near * 10 + tenth;
  const f = rng.int(3, 9);
  const right = near * f;
  const expression = `${fmt(x / 10, 1)} · ${f}`;
  const prompt = `Welcher Überschlag passt zu ${expression}?`;
  const answer = makeChoice(rng, { label: `${near} · ${f} = ${right}` }, [
    { label: `${near + 1} · ${f} = ${(near + 1) * f}`, whyWrong: `Runde ${fmt(x / 10, 1)} auf die nächste ganze Zahl.` },
    { label: `${x} · ${f} = ${x * f}`, whyWrong: 'Hier fehlt das Komma. Das Ergebnis ist zehnmal zu groß.' },
    { label: `${near} + ${f} = ${near + f}`, whyWrong: 'Die Aufgabe heißt mal. Der Überschlag bleibt bei mal.' },
  ]);
  return build(SKILL, stufe, {
    key: `ueberschlag:${x}:${f}`,
    ab,
    prompt,
    answer,
    hints: [`Runde ${fmt(x / 10, 1)} auf die nächste ganze Zahl.`, `Rechne dann mal ${f}.`],
    steps: [`${fmt(x / 10, 1)} ist ungefähr ${near}.`, `${near} · ${f} = ${right}`, `Der Überschlag ist ${right}.`],
    praise: 'Du hast zuerst auf eine ganze Zahl gerundet.',
    srText: speak(`${prompt} Wähle aus: ${answer.options.map((o) => o.label).join('; ')}.`),
    kmk: [...KMK, 'ZO.runden'],
  });
};

/** Stufe 3, AB III: the digits are given, the comma is the task. */
const placeComma: Form = (rng, stufe, ab) => {
  const places = rng.pick([1, 2] as const);
  let q = places === 1 ? rng.int(12, 89) : rng.int(112, 899);
  if (q % 10 === 0) q += 1;
  const f = rng.int(3, 9);
  const product = q * f;
  const scale = 10 ** places;
  const value = product / scale;
  const left = fmt(q / scale, places);
  const rough = Math.round(q / scale);
  const estimate = rough * f;
  const prompt = `Es gilt: ${q} · ${f} = ${product}. Rechne mit dem Überschlag weiter.`;
  return build(SKILL, stufe, {
    key: `komma:${q}:${f}:${places}`,
    ab,
    prompt,
    expression: `${left} · ${f} = ${BOX}`,
    answer: { kind: 'number', value, decimals: DECIMALS, label: 'Ergebnis' },
    hints: [`Mach den Überschlag: ${rough} · ${f}.`, 'Das Ergebnis muss in der Nähe des Überschlags liegen.'],
    steps: [`Überschlag: ${rough} · ${f} = ${estimate}`, `Die Ziffern sind ${product}.`, `${left} · ${f} = ${fmt(value)}`],
    bugs: typedBugs([
      { id: 'komma-vergessen', match: product, hint: 'Mach den Überschlag. Dieses Ergebnis ist viel zu groß.' },
      { id: 'komma-verschoben', match: product / (scale * 10), hint: 'Mach den Überschlag. Dieses Ergebnis ist zu klein.' },
      places === 2 && { id: 'komma-verschoben', match: product / 10, hint: 'Mach den Überschlag. Dieses Ergebnis ist zu groß.' },
    ], value, DECIMALS),
    praise: 'Dein Überschlag hat die Stelle des Kommas gezeigt.',
    srText: speak(`${prompt} ${left} mal ${f} ist wie viel?`),
    kmk: [...KMK, 'ZO.runden', 'PK.argumentieren'],
  });
};

/** Items of the price story with the price of one piece in cents, in steps of 5 ct. */
const PRICED_ITEMS = [['Hefte', 80, 295], ['Stifte', 60, 250], ['Bälle', 300, 995], ['Karten', 55, 250]] as const;

/** Stufe 3, AB III: price of one item. */
const unitPrice: Form = (rng, stufe, ab) => {
  const p = pickPerson(rng).name;
  const count = rng.int(2, 9);
  const [item, cheapest, dearest] = rng.pick(PRICED_ITEMS);
  const cents = rng.int(cheapest / 5, dearest / 5) * 5;
  const total = cents * count;
  const context = `${p} kauft ${count} ${item} für zusammen ${euro(total)}. Alle kosten gleich viel.`;
  const prompt = 'Wie viel kostet ein Stück?';
  // a Überschlag divides without a Rest: the rough total is a multiple of the count, so it is also never below the count
  const roughEuro = Math.max(1, Math.round(cents / 100)) * count;
  return build(SKILL, stufe, {
    key: `preis:${p}:${item}:${count}:${total}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: cents / 100, unit: '€', decimals: TWO_PLACES, label: 'Preis in Euro' },
    hints: [`Teile den Preis durch ${count}.`, `Der Überschlag ${roughEuro} € : ${count} zeigt die Stelle des Kommas.`],
    steps: [`Rechnung: ${euro(total)} : ${count} = ${euro(cents)}`, `Probe: ${count} · ${euro(cents)} = ${euro(total)}`, `Ein Stück kostet ${euro(cents)}.`],
    bugs: typedBugs([
      { id: 'komma-vergessen', match: cents, hint: 'Mach den Überschlag. So teuer ist ein Stück nicht.' },
      { id: 'komma-verschoben', match: cents / 1000, hint: 'Mach den Überschlag. Das ist zu wenig.' },
    ], cents / 100, TWO_PLACES),
    praise: 'Du hast geteilt und mit der Probe geprüft.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'GM.rechnen', 'PK.modellieren'],
  });
};

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [plainSameLength], 2: [moneyStory], 3: [missingAmount] },
  2: { 1: [alignPlus], 2: [alignMinus], 3: [chainOfThree, lengthStory] },
  3: {
    1: [(rng, s, a) => timesOrDivide(rng, s, a, 1)],
    2: [(rng, s, a) => timesOrDivide(rng, s, a, 2), chooseEstimate],
    3: [placeComma, unitPrice],
  },
};

export const dezimalRechnenSkill: SkillDef = {
  ...SKILL,
  title: 'Mit Dezimalzahlen rechnen',
  description: 'Du rechnest mit Dezimalzahlen und achtest auf das Komma.',
  stufen: { 1: 'Plus und minus, gleich viele Stellen, mit Geld', 2: 'Verschieden viele Stellen: 3,5 + 1,25, Komma unter Komma', 3: 'Mal und geteilt durch eine natürliche Zahl, mit Überschlag' },
  kmk: KMK,
  keys: { comma: true },
  generate: byStufeAndAb(FORMS),
};
