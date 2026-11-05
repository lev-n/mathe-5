/**
 * Brüche vergleichen: with comparison signs, in an order and on the Zahlenstrahl.
 * Stufe 1 (same Nenner or same Zähler, up to 12): AB I same Nenner, AB II same Zähler, both also as two bars (F1: pictures before rules), AB III order fractions with the same Zähler.
 * Stufe 2 (one Nenner a multiple of the other): AB I small Nenner, AB II larger Nenner and equal values, AB III order three.
 * Stufe 3 (against ½ or 1, on the Zahlenstrahl): AB I against ½ with no common Nenner, or two fractions through 1, AB II two fractions through ½, or the arrow of a
 * fraction, by its place against ½ and 1, or place a fraction with a tick for each part, AB III the fraction of an arrow, order with ½ and 1, or place a fraction with
 * finer ticks than its Nenner.
 */
import { BOX, frac, fractionWords } from '../../core/format';
import type { Ab, ChoiceOption, NumberLineAnswer, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, makeChoice, speak } from '../shared';
import { byStufeAndAb, compareFrac, fracOf, gcd, lowest, orderBugs, orderWith, relationOf, symbolChoice, type Form, type Frac, type Relation } from './helpers';

const SKILL = { id: 'brueche.vergleichen', topicId: 'brueche' } as const;
const KMK = ['ZO.brueche'];

/** The name of the parts: 'Achtel', 'Fünftel'. */
const parts = (d: number) => fractionWords(2, d).replace(/^zwei /, '');

const sign = (dir: 'aufsteigend' | 'absteigend') => (dir === 'aufsteigend' ? ' < ' : ' > ');
const orderPrompt = (dir: 'aufsteigend' | 'absteigend') => `Ordne die Brüche von ${dir === 'aufsteigend' ? 'klein nach groß' : 'groß nach klein'}.`;

/** A pair with the same Nenner. */
const sameDenominator: Form = (rng, stufe, ab) => {
  const d = rng.int(3, 12);
  const [x, y] = rng.sample(Array.from({ length: d - 1 }, (_, i) => i + 1), 2);
  const a: Frac = [x, d];
  const b: Frac = [y, d];
  const relation = relationOf(compareFrac(a, b));
  const rule = 'Gleich große Teile: Mehr Teile sind mehr.';
  return build(SKILL, stufe, {
    key: `nenner:${x}/${d}:${y}`,
    ab,
    prompt: 'Setze das passende Zeichen ein.',
    expression: `${fracOf(a)} ${BOX} ${fracOf(b)}`,
    answer: symbolChoice(rng, relation, { '<': rule, '>': rule, '=': 'Die Zähler sind verschieden. Die Werte sind nicht gleich.' }),
    hints: ['Die Nenner sind gleich. Die Teile sind also gleich groß.', 'Vergleiche die Zähler: Wie viele Teile sind es?'],
    steps: [`Beide Brüche zählen ${parts(d)}.`, `${x} ${relationOf(x - y)} ${y}`, `Also: ${fracOf(a)} ${relation} ${fracOf(b)}`],
    praise: 'Du hast bei gleichem Nenner die Zähler verglichen.',
    srText: speak(`Setze das passende Zeichen ein: ${fracOf(a)} und ${fracOf(b)}.`),
    kmk: KMK,
  });
};

/** A pair with the same Zähler: the larger Nenner is the smaller fraction. */
const sameNumerator: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 5);
  const [x, y] = rng.sample(Array.from({ length: 12 - n }, (_, i) => n + 1 + i), 2);
  const a: Frac = [n, x];
  const b: Frac = [n, y];
  const relation = relationOf(compareFrac(a, b));
  const small = Math.max(x, y);
  const large = Math.min(x, y);
  const rule = `${parts(small)} sind kleiner als ${parts(large)}: Das Ganze hat mehr Teile.`;
  return build(SKILL, stufe, {
    key: `zaehler:${n}:${x}:${y}`,
    ab,
    prompt: 'Setze das passende Zeichen ein.',
    expression: `${fracOf(a)} ${BOX} ${fracOf(b)}`,
    answer: symbolChoice(rng, relation, { '<': rule, '>': rule, '=': 'Der Zähler ist gleich, die Teile sind verschieden groß.' }),
    hints: ['Die Zähler sind gleich. Es sind also gleich viele Teile.', 'Welche Teile sind größer? Mehr Teile im Ganzen heißt: kleinere Teile.'],
    steps: [`Beide Brüche haben ${n} ${n === 1 ? 'Teil' : 'Teile'}.`, `${parts(small)} sind kleiner als ${parts(large)}.`, `Also: ${fracOf(a)} ${relation} ${fracOf(b)}`],
    praise: 'Du hast bei gleichem Zähler auf die Teilgröße geschaut.',
    srText: speak(`Setze das passende Zeichen ein: ${fracOf(a)} und ${fracOf(b)}.`),
    kmk: KMK,
  });
};

/** Stufe 1, AB III: order fractions with the same Zähler. */
const orderSameNumerator: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 4);
  const count = rng.int(3, 4);
  const values = rng.sample(Array.from({ length: 12 - n }, (_, i) => n + 1 + i), count).map((d): Frac => [n, d]);
  const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
  const { answer, sorted, wrongOrder } = orderWith(rng, values, compareFrac, fracOf, direction);
  const prompt = orderPrompt(direction);
  return build(SKILL, stufe, {
    key: `ordnen-z:${n}:${direction}:${sorted.map(fracOf).join()}`,
    ab,
    prompt,
    answer,
    hints: ['Alle Zähler sind gleich. Schau auf die Nenner.', 'Ein großer Nenner heißt: kleine Teile.'],
    steps: [`Alle Brüche haben ${n} ${n === 1 ? 'Teil' : 'Teile'}.`, 'Je größer der Nenner, desto kleiner der Teil.', `Also: ${sorted.map(fracOf).join(sign(direction))}`],
    bugs: orderBugs(answer.correct, [['nenner-groesser', wrongOrder((a, b) => a[1] - b[1]), 'Ein großer Nenner heißt: kleine Teile. Das Ganze hat mehr Teile.']]),
    praise: 'Du hast die Teilgröße aus dem Nenner abgelesen.',
    srText: speak(`${prompt} ${answer.items.join(', ')}.`),
    kmk: KMK,
  });
};

/** A bar of one size for every fraction, so that the two pictures compare directly. */
const bar = (f: Frac): Visual => ({ type: 'fractionModel', form: 'bar', parts: f[1], filled: f[0] });

/** Stufe 1, AB I and II: the pair as two bars. The picture decides before any rule (F1), and the larger Nenner shows its smaller parts. */
function picturePair(same: 'nenner' | 'zaehler'): Form {
  return (rng, stufe, ab) => {
    const pair: Frac[] = same === 'nenner'
      ? (() => { const d = rng.int(3, 12); return rng.sample(Array.from({ length: d - 1 }, (_, i) => i + 1), 2).map((n): Frac => [n, d]); })()
      : (() => { const n = rng.int(1, 5); return rng.sample(Array.from({ length: 12 - n }, (_, i) => n + 1 + i), 2).map((d): Frac => [n, d]); })();
    const [big, small] = [...pair].sort((a, b) => compareFrac(b, a));
    const rule = same === 'nenner' ? 'Gleich große Teile: Mehr Teile sind mehr.' : 'Gleich viele Teile: Größere Teile sind mehr.';
    const prompt = 'Schau auf die Bilder. Welcher Bruch ist größer?';
    const answer = makeChoice(rng, { label: fracOf(big), visual: bar(big) }, [{ label: fracOf(small), visual: bar(small), whyWrong: rule }]);
    return build(SKILL, stufe, {
      key: `bild-${same}:${fracOf(big)}:${fracOf(small)}`,
      ab,
      prompt,
      answer,
      hints: ['Beide Balken sind gleich lang.', 'Welcher Balken ist weiter gefärbt?'],
      steps: [{ text: `${fracOf(big)} färbt mehr vom Balken.`, visual: bar(big) }, { text: `${fracOf(small)} färbt weniger vom Balken.`, visual: bar(small) }, `Also: ${fracOf(big)} > ${fracOf(small)}`],
      praise: 'Du hast die Brüche im Bild verglichen.',
      srText: speak(`${prompt} Wähle aus: ${answer.options.map((o) => o.label).join(' oder ')}.`),
      kmk: [...KMK, 'PK.darstellen'],
    });
  };
}

/** Two fractions, one Nenner a multiple of the other, values possibly equal. */
function multiplePair(pairs: readonly (readonly [small: number, k: number])[], equal: boolean): Form {
  return (rng, stufe, ab) => {
    const [s, k] = rng.pick(pairs);
    const big = s * k;
    const n = rng.pick(Array.from({ length: s - 1 }, (_, i) => i + 1).filter((x) => gcd(x, s) === 1));
    const m = equal && rng.chance(0.3) ? n * k : rng.pick(Array.from({ length: big - 1 }, (_, i) => i + 1).filter((x) => x !== n * k));
    const left: Frac = [n, s];
    const right: Frac = [m, big];
    const swap = rng.chance(0.5);
    const a = swap ? right : left;
    const b = swap ? left : right;
    const relation = relationOf(compareFrac(a, b));
    const extended: Frac = [n * k, big];
    const hint = `Erweitere ${fracOf(left)} auf ${parts(big)}. Vergleiche dann.`;
    const why: Partial<Record<Relation, string>> = { '<': hint, '>': hint, '=': hint };
    return build(SKILL, stufe, {
      key: `vielfach:${fracOf(a)}:${fracOf(b)}`,
      ab,
      prompt: 'Setze das passende Zeichen ein.',
      expression: `${fracOf(a)} ${BOX} ${fracOf(b)}`,
      answer: symbolChoice(rng, relation, why),
      hints: [`Die Nenner sind verschieden. ${big} ist ein Vielfaches von ${s}.`, hint],
      steps: [{ text: `${fracOf(left)} = ${fracOf(extended)}`, visual: { type: 'fractionModel', form: 'bar', parts: s, filled: n, refineTo: big } }, `${n * k} ${relationOf(n * k - m)} ${m}`, `Also: ${fracOf(a)} ${relation} ${fracOf(b)}`],
      praise: 'Du hast zuerst auf denselben Nenner erweitert.',
      srText: speak(`Setze das passende Zeichen ein: ${fracOf(a)} und ${fracOf(b)}.`),
      kmk: KMK,
    });
  };
}

/** Stufe 2, AB III: order three fractions with related Nenner. */
const orderRelated: Form = (rng, stufe, ab) => {
  const family = rng.pick([[2, 4, 8], [3, 6, 12], [2, 6, 12], [2, 5, 10], [3, 9, 9], [4, 8, 8]]);
  const big = Math.max(...family);
  const pick = (d: number) => rng.pick(Array.from({ length: d - 1 }, (_, i) => i + 1).filter((x) => gcd(x, d) === 1));
  const values: Frac[] = [];
  for (const d of family) {
    let f: Frac = [pick(d), d];
    for (let tries = 0; tries < 12 && values.some((v) => compareFrac(v, f) === 0); tries++) f = [pick(d), d];
    if (!values.some((v) => compareFrac(v, f) === 0)) values.push(f);
  }
  while (values.length < 3) {
    const x = rng.int(1, big - 1);
    const f: Frac = lowest([x, big]);
    if (!values.some((v) => compareFrac(v, f) === 0)) values.push(f);
  }
  const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
  const { answer, sorted, wrongOrder } = orderWith(rng, values, compareFrac, fracOf, direction);
  const inBig = (f: Frac) => (f[0] * big) / f[1];
  const prompt = orderPrompt(direction);
  return build(SKILL, stufe, {
    key: `ordnen-v:${direction}:${sorted.map(fracOf).join()}`,
    ab,
    prompt,
    answer,
    hints: [`Erweitere alle Brüche auf ${parts(big)}.`, 'Vergleiche dann die Zähler.'],
    steps: [`Auf ${parts(big)} erweitert: ${sorted.map((f) => frac(inBig(f), big)).join(', ')}`, `Also: ${sorted.map(fracOf).join(sign(direction))}`],
    bugs: orderBugs(answer.correct, [
      ['kleinere-zahlen', wrongOrder((a, b) => a[0] - b[0]), 'Die Zähler allein sagen nichts. Erweitere zuerst auf denselben Nenner.'],
      ['nenner-groesser', wrongOrder((a, b) => a[1] - b[1]), 'Die Nenner allein sagen nichts. Erweitere zuerst auf denselben Nenner.'],
    ]),
    praise: 'Du hast alle Brüche auf denselben Nenner gebracht.',
    srText: speak(`${prompt} ${answer.items.join(', ')}.`),
    kmk: KMK,
  });
};

const HALF: Frac = [1, 2];
const ONE: Frac = [1, 1];

const textOf = (f: Frac) => (f[1] === 1 ? String(f[0]) : fracOf(f));

/** Nenner that are no multiples of each other: the erweitern of Stufe 2 does not help, a comparison value does. */
const UNRELATED = [[7, 5], [9, 5], [7, 9], [8, 5], [11, 7], [9, 8], [12, 7], [11, 5]] as const;

/** Stufe 3, AB I: against ½, with an odd Nenner: there is no erweitern to ½ as at Stufe 2 (3/8 against 1/2), and no 1/15 that a glance decides. */
const againstHalf: Form = (rng, stufe, ab) => {
  const d = rng.pick([5, 7, 9, 11, 13, 15]);
  const n = rng.int(2, d - 2);
  const f: Frac = [n, d];
  const relation = relationOf(compareFrac(f, HALF));
  const twice = 2 * n;
  const hint = `Verdopple den Zähler. Vergleiche das Ergebnis mit dem Nenner ${d}.`;
  return build(SKILL, stufe, {
    key: `marke:${n}/${d}`,
    ab,
    prompt: 'Setze das passende Zeichen ein.',
    expression: `${fracOf(f)} ${BOX} ${fracOf(HALF)}`,
    answer: symbolChoice(rng, relation, { '<': hint, '>': hint, '=': hint }),
    hints: [hint, 'Du musst nicht erweitern. Der doppelte Zähler reicht.'],
    steps: [`Doppelter Zähler: 2 · ${n} = ${twice}`, `${twice} ${relationOf(twice - d)} ${d}`, `Also: ${fracOf(f)} ${relation} ${fracOf(HALF)}`],
    praise: 'Du hast den doppelten Zähler mit dem Nenner verglichen.',
    srText: speak(`Setze das passende Zeichen ein: ${fracOf(f)} und ${fracOf(HALF)}.`),
    kmk: KMK,
  });
};

/** Stufe 3, AB I: 1 as the comparison value of two fractions, one below it, the other at or above it. '10/11 □ 1' alone would be easier than Stufe 2. */
const throughOne: Form = (rng, stufe, ab) => {
  const [d1, d2] = rng.pick(UNRELATED);
  const low: Frac = [d1 - rng.int(1, 3), d1];
  const high: Frac = [d2 + rng.int(0, 3), d2];
  const swap = rng.chance(0.5);
  const a = swap ? high : low;
  const b = swap ? low : high;
  const relation = relationOf(compareFrac(a, b));
  const hint = 'Vergleiche beide Brüche mit 1.';
  return build(SKILL, stufe, {
    key: `eins:${fracOf(a)}:${fracOf(b)}`,
    ab,
    prompt: 'Setze das passende Zeichen ein.',
    expression: `${fracOf(a)} ${BOX} ${fracOf(b)}`,
    answer: symbolChoice(rng, relation, { '<': hint, '>': hint, '=': hint }),
    hints: [hint, 'Vergleiche bei jedem Bruch den Zähler mit dem Nenner.'],
    steps: [`${fracOf(low)} < 1`, `${fracOf(high)} ${relationOf(compareFrac(high, ONE))} 1`, `Also: ${fracOf(a)} ${relation} ${fracOf(b)}`],
    praise: 'Du hast 1 als Vergleichswert genutzt.',
    srText: speak(`Setze das passende Zeichen ein: ${fracOf(a)} und ${fracOf(b)}.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** Stufe 3, AB II: two fractions that ½ separates, with Nenner that are no multiples. */
const throughHalf: Form = (rng, stufe, ab) => {
  const [d1, d2] = rng.pick(UNRELATED);
  const below = rng.pick(Array.from({ length: d1 - 1 }, (_, i) => i + 1).filter((x) => 2 * x < d1 && x > 1));
  const above = rng.pick(Array.from({ length: d2 - 1 }, (_, i) => i + 1).filter((x) => 2 * x > d2));
  const low: Frac = [below, d1];
  const high: Frac = [above, d2];
  const swap = rng.chance(0.5);
  const a = swap ? high : low;
  const b = swap ? low : high;
  const relation = relationOf(compareFrac(a, b));
  const hint = `Vergleiche beide Brüche mit ${fracOf(HALF)}.`;
  return build(SKILL, stufe, {
    key: `halb:${fracOf(a)}:${fracOf(b)}`,
    ab,
    prompt: 'Setze das passende Zeichen ein.',
    expression: `${fracOf(a)} ${BOX} ${fracOf(b)}`,
    answer: symbolChoice(rng, relation, { '<': hint, '>': hint, '=': hint }),
    hints: [hint, 'Verdopple den Zähler. Ist das Ergebnis kleiner oder größer als der Nenner?'],
    steps: [`${fracOf(low)} < ${fracOf(HALF)}`, `${fracOf(high)} > ${fracOf(HALF)}`, `Also: ${fracOf(a)} ${relation} ${fracOf(b)}`],
    praise: `Du hast ${fracOf(HALF)} als Vergleichswert genutzt.`,
    srText: speak(`Setze das passende Zeichen ein: ${fracOf(a)} und ${fracOf(b)}.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** The stretches of the Zahlenstrahl that ½ and 1 mark, with where an arrow stands in tenths: clear of the ticks, so a child sees its stretch. */
const STRETCHES = [
  { id: 'unter', from: 1, to: 4, words: 'zwischen 0 und einem Halb' },
  { id: 'mitte', from: 6, to: 9, words: 'zwischen einem Halb und 1' },
  { id: 'ueber', from: 11, to: 14, words: 'zwischen 1 und 2' },
] as const;
type Stretch = (typeof STRETCHES)[number];

/** Odd Nenner: no erweitern to ½ as at Stufe 2, so only the comparison with ½ and 1 places the fraction. */
const LINE_NENNER = [5, 7, 9, 11, 13];

function fractionIn(rng: Rng, stretch: Stretch): Frac {
  const d = rng.pick(LINE_NENNER);
  const fits = Array.from({ length: 2 * d }, (_, i) => i + 2).filter((n) => gcd(n, d) === 1 && 10 * n >= stretch.from * d && 10 * n <= stretch.to * d);
  return [rng.pick(fits), d];
}

/**
 * A Zahlenstrahl with ticks only at each half, so no Abschnitte give the fraction away. Its values count halves, so that ½ is a label: an arrow at 5/7 stands at 10/7.
 * The letters of the arrows go from left to right.
 */
function halvesLine(fractions: readonly Frac[]): { visual: Visual; marks: { value: number; label: string; f: Frac }[] } {
  const marks = [...fractions].sort(compareFrac).map((f, i) => ({ value: (2 * f[0]) / f[1], label: 'ABC'[i], f }));
  return { visual: { type: 'numberLine', min: 0, max: 4, majorStep: 1, minorStep: 1, labelMajor: false, labels: [0, 1, 2, 4], denominator: 2, marks: marks.map(({ value, label }) => ({ value, label })) }, marks };
}

/** Where the fraction lies against ½ and against 1, for a worked step. */
const placeLines = (f: Frac) => [`${fracOf(f)} ${relationOf(compareFrac(f, HALF))} ${fracOf(HALF)}`, `${fracOf(f)} ${relationOf(compareFrac(f, ONE))} 1`];

/** Stufe 3, AB II: which arrow shows the fraction? Only the comparison with ½ and with 1 tells. */
const arrowByComparison: Form = (rng, stufe, ab) => {
  const asked = rng.pick(STRETCHES);
  const inStretches = STRETCHES.map((s) => [s, fractionIn(rng, s)] as const);
  const target = inStretches.find(([s]) => s === asked)![1];
  const { visual, marks } = halvesLine(inStretches.map(([, f]) => f));
  const right = marks.find((m) => m.f === target)!;
  const wrongs: ChoiceOption[] = marks.filter((m) => m !== right).map((m) => ({ label: `Pfeil ${m.label}`, whyWrong: `Vergleiche ${fracOf(target)} zuerst mit ${fracOf(HALF)} und mit 1. Such dann die passende Stelle.` }));
  const prompt = `Welcher Pfeil zeigt auf ${fracOf(target)}?`;
  const answer = makeChoice(rng, { label: `Pfeil ${right.label}` }, wrongs, { order: marks.map((m) => `Pfeil ${m.label}`) });
  return build(SKILL, stufe, {
    key: `strahl:${fracOf(target)}:${marks.map((m) => fracOf(m.f)).join()}`,
    ab,
    prompt,
    visual,
    answer,
    hints: [`Vergleiche den Bruch mit ${fracOf(HALF)} und mit 1.`, 'Verdopple den Zähler. Vergleiche das Ergebnis mit dem Nenner.'],
    steps: [...placeLines(target), `Dort steht Pfeil ${right.label}.`],
    praise: `Du hast mit ${fracOf(HALF)} und 1 verglichen.`,
    srText: speak(`${prompt} Der Zahlenstrahl geht von 0 bis 2. ${STRETCHES.map((s, i) => `Pfeil ${marks[i].label} steht ${s.words}`).join(', ')}.`),
    kmk: [...KMK, 'PK.darstellen', 'PK.problemloesen'],
  });
};

/** A line from 0 to 2 with a tick for each d-th, labelled only at 0, 1 and 2. Its values count d-ths, so nothing depends on a float. */
const placingLine = (d: number, value: number): NumberLineAnswer => ({ kind: 'numberline', min: 0, max: 2 * d, majorStep: d, minorStep: 1, step: 1, value, tolerance: 0, labelMajor: true, denominator: d });

/** A fraction between 0 and 2 that is no whole number. */
const fractionToPlace = (rng: Rng, d: number): Frac => [rng.pick(Array.from({ length: 2 * d - 1 }, (_, i) => i + 1).filter((n) => n > 1 && gcd(n, d) === 1)), d];

/** The worked picture of a placed fraction: the answer's line with the arrow on it. */
const placedLine = (a: NumberLineAnswer): Visual => ({ type: 'numberLine', min: a.min, max: a.max, majorStep: a.majorStep, minorStep: a.minorStep, labelMajor: a.labelMajor, denominator: a.denominator, marks: [{ value: a.value, label: 'A' }] });

const placeSpeech = (prompt: string, ticks: number) => speak(`${prompt} Der Zahlenstrahl geht von 0 bis 2. Von 0 bis 1 sind es ${ticks} gleiche Abschnitte.`);

/** Stufe 3, AB II: place a fraction with an odd Nenner; each tick is one part, so the Nenner says what a tick counts. */
const placeFraction: Form = (rng, stufe, ab) => {
  const d = rng.pick([7, 9]);
  const f = fractionToPlace(rng, d);
  const answer = placingLine(d, f[0]);
  const prompt = `Setze den Pfeil auf ${fracOf(f)}.`;
  return build(SKILL, stufe, {
    key: `setzen:${fracOf(f)}`,
    ab,
    prompt,
    answer,
    hints: ['Der Nenner sagt: So viele gleiche Abschnitte hat die Strecke von 0 bis 1.', 'Der Zähler sagt: So viele Abschnitte gehst du ab der 0.'],
    steps: [`Von 0 bis 1 sind es ${d} Abschnitte. Jeder zählt ${frac(1, d)}.`, `Von 0 bis ${fracOf(f)} sind es ${f[0]} Abschnitte.`, { text: `Der Pfeil steht bei ${fracOf(f)}.`, visual: placedLine(answer) }],
    bugs: [{ id: 'strahl-striche', match: f[0] - 1, hint: 'Zähle die Abschnitte ab der 0, nicht die Striche.' }],
    praise: 'Du hast die Abschnitte vom Nenner her gezählt.',
    srText: placeSpeech(prompt, d),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

/** Stufe 3, AB III: the ticks count half parts, so the fraction has to be erweitert first. */
const placeOnFinerTicks: Form = (rng, stufe, ab) => {
  const d = rng.pick([3, 4, 5]);
  const f = fractionToPlace(rng, d);
  const fine = 2 * d;
  const answer = placingLine(fine, 2 * f[0]);
  const prompt = `Setze den Pfeil auf ${fracOf(f)}.`;
  return build(SKILL, stufe, {
    key: `setzen-fein:${fracOf(f)}`,
    ab,
    prompt,
    answer,
    hints: ['Zähle zuerst: Wie viele Abschnitte hat die Strecke von 0 bis 1?', `Erweitere den Bruch auf ${parts(fine)}.`],
    steps: [`Von 0 bis 1 sind es ${fine} Abschnitte. Jeder zählt ${frac(1, fine)}.`, `${fracOf(f)} = ${frac(2 * f[0], fine)}`, { text: `Der Pfeil steht bei ${frac(2 * f[0], fine)}.`, visual: placedLine(answer) }],
    bugs: [
      { id: 'strahl-fein', match: f[0], hint: 'Ein Abschnitt ist hier kleiner, als der Nenner sagt. Erweitere zuerst.' },
      { id: 'strahl-striche', match: 2 * f[0] - 1, hint: 'Zähle die Abschnitte ab der 0, nicht die Striche.' },
    ],
    praise: 'Du hast den Bruch passend zu den Strichen erweitert.',
    srText: placeSpeech(prompt, fine),
    kmk: [...KMK, 'PK.darstellen', 'PK.problemloesen'],
  });
};

/** Close to a mark but on its other side, or right on it: what an AB III option looks like. */
const justBelowHalf = (d: number): Frac => [(d - 1) / 2, d];
const justAboveHalf = (d: number): Frac => [(d + 1) / 2, d];
const justBelowOne = (d: number): Frac => [d - 1, d];
const justAboveOne = (d: number): Frac => [d + 1, d];

/** Stufe 3, AB III, reversed: which fraction can the arrow show? The other options lie close to ½ and 1, on the other side or right on them. */
const fractionAtArrow: Form = (rng, stufe, ab) => {
  const stretch = rng.pick(STRETCHES);
  const target = fractionIn(rng, stretch);
  const near = () => rng.pick([7, 9, 11, 13]);
  const k = rng.int(3, 6);
  const onHalf: Frac = [k, 2 * k];
  const w = near();
  const onOne: Frac = [w, w];
  const others: Frac[] = stretch.id === 'unter'
    ? [justAboveHalf(near()), justAboveOne(near()), onHalf]
    : stretch.id === 'mitte'
      ? [justBelowHalf(near()), justAboveOne(near()), rng.chance(0.5) ? onHalf : onOne]
      : [justAboveHalf(near()), justBelowOne(near()), onOne];
  const { visual } = halvesLine([target]);
  const side = stretch.id === 'unter' ? `links von ${fracOf(HALF)}` : stretch.id === 'mitte' ? `zwischen ${fracOf(HALF)} und 1` : 'rechts von 1';
  const about = (f: Frac) => (compareFrac(f, HALF) === 0 ? `genau ${fracOf(HALF)}` : compareFrac(f, ONE) === 0 ? 'genau 1' : compareFrac(f, ONE) > 0 ? 'größer als 1' : compareFrac(f, HALF) < 0 ? `kleiner als ${fracOf(HALF)}` : `größer als ${fracOf(HALF)} und kleiner als 1`);
  const wrongs: ChoiceOption[] = others.map((f) => ({ label: fracOf(f), whyWrong: `${fracOf(f)} ist ${about(f)}. Pfeil A steht ${side}.` }));
  const answer = makeChoice(rng, { label: fracOf(target) }, wrongs);
  const prompt = 'Pfeil A zeigt auf einen dieser Brüche. Welcher Bruch ist das?';
  return build(SKILL, stufe, {
    key: `strahl-bruch:${fracOf(target)}:${others.map(fracOf).join()}`,
    ab,
    prompt,
    visual,
    answer,
    hints: [`Lies ab: Pfeil A steht ${side}.`, `Vergleiche jeden Bruch mit ${fracOf(HALF)} und mit 1.`],
    steps: [`Pfeil A steht ${side}.`, ...placeLines(target), `Also zeigt Pfeil A auf ${fracOf(target)}.`],
    praise: `Du hast jeden Bruch mit ${fracOf(HALF)} und 1 verglichen.`,
    srText: speak(`${prompt} Der Zahlenstrahl geht von 0 bis 2. Pfeil A steht ${stretch.words}. Wähle aus: ${answer.options.map((o) => o.label).join(', ')}.`),
    kmk: [...KMK, 'PK.darstellen', 'PK.argumentieren'],
  });
};

/** Stufe 3, AB III: order fractions together with ½ and 1. */
const orderWithMarks: Form = (rng, stufe, ab) => {
  const [low, high]: Frac[] = [
    [rng.pick([1, 2]), rng.pick([5, 7, 9])],
    [rng.pick([5, 6]), rng.pick([7, 8, 9])],
  ];
  const above: Frac = [rng.pick([7, 9, 11]), rng.pick([5, 6])];
  const values: Frac[] = [low, high, above, HALF, ONE];
  const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
  const { answer, sorted, wrongOrder } = orderWith(rng, values, compareFrac, textOf, direction);
  const prompt = orderPrompt(direction);
  return build(SKILL, stufe, {
    key: `ordnen-m:${direction}:${sorted.map(textOf).join()}`,
    ab,
    prompt,
    answer,
    hints: [`Welche Brüche sind kleiner als ${fracOf(HALF)}? Welche sind größer als 1?`, `Vergleiche dann jeden Bruch mit ${fracOf(HALF)} und 1.`],
    steps: [`Kleiner als ${fracOf(HALF)}: ${fracOf(low)}`, `Größer als 1: ${fracOf(above)}`, `Also: ${sorted.map(textOf).join(sign(direction))}`],
    bugs: orderBugs(answer.correct, [['kleinere-zahlen', wrongOrder((a, b) => a[0] - b[0]), `Die Zähler allein sagen nichts. Vergleiche mit ${fracOf(HALF)} und 1.`]]),
    praise: `Du hast ${fracOf(HALF)} und 1 zum Vergleichen genutzt.`,
    srText: speak(`${prompt} ${answer.items.join(', ')}.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [sameDenominator, picturePair('nenner')], 2: [sameNumerator, picturePair('zaehler')], 3: [orderSameNumerator] },
  2: {
    1: [multiplePair([[2, 2], [2, 3], [2, 4], [3, 2], [4, 2], [5, 2]], false)],
    2: [multiplePair([[3, 3], [3, 4], [4, 3], [6, 2], [5, 2], [4, 2], [2, 6]], true)],
    3: [orderRelated],
  },
  3: {
    1: [againstHalf, throughOne],
    2: [throughHalf, arrowByComparison, placeFraction],
    3: [fractionAtArrow, orderWithMarks, placeOnFinerTicks],
  },
};

export const vergleichenSkill: SkillDef = {
  ...SKILL,
  title: 'Brüche vergleichen',
  description: 'Du vergleichst Brüche und ordnest sie am Zahlenstrahl.',
  stufen: { 1: 'Gleicher Nenner oder gleicher Zähler, bis 12', 2: 'Verschiedene Nenner, einer ein Vielfaches des anderen', 3: 'Mit ½ oder 1 vergleichen, am Zahlenstrahl zeigen' },
  kmk: KMK,
  generate: byStufeAndAb(FORMS),
};
