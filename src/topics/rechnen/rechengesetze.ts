/**
 * Vorteilhaft rechnen (docs/research.md §6). Stufe 1: swap and group, 25 + 38 + 75. Stufe 2: 4 · 17 · 25, choose the easier order and calculate. Stufe 3: which law, and why
 * it fails for minus and geteilt. The long names of the laws stay out of the texts (T8): the options say what the law does. Only the laws of the core are here,
 * swapping and grouping (§2.3); the distributive law is optional and has its own skill, rechnen.distributiv.
 */
import { BOX, DIV, MINUS, TIMES, fmt, toSpeech } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef } from '../../core/types';
import { targetAb } from '../shared';
import { item, termSpeech, wholeBugs } from './common';

const SKILL = { id: 'rechnen.rechengesetze', topicId: 'rechnen' } as const;
const KMK = ['ZO.rechengesetze'];

/** Two numbers that add up to a round number. */
function roundPair(rng: Rng, big: boolean): [number, number, number] {
  const total = big ? rng.pick([200, 300, 500]) : rng.pick([50, 100, 100, 200]);
  let x = rng.int(Math.floor(total / 10), Math.floor(total * 0.9));
  // no pair that ends in 0, there the swap gains nothing; and two different numbers
  while (x % 10 === 0 || x * 2 === total) x += 1;
  return [x, total - x, total];
}

/** A number that makes no round sum with any of the others, so that one pair stands out. */
function other(rng: Rng, top: number, avoid: readonly number[]): number {
  let n = rng.int(11, top);
  while (avoid.includes(n) || n % 10 === 0 || avoid.some((x) => (x + n) % 10 === 0)) n = n === top ? 11 : n + 1;
  return n;
}

/** The order with the partners apart, so that the swap is what helps. */
function apart(rng: Rng, a: number, c: number, b: number): number[] {
  return rng.chance(0.5) ? [a, c, b] : [b, c, a];
}

// ─── Stufe 1: swap and group ─────────────────────────────────────────────────

function sumItem(rng: Rng, ab: Ab): Exercise {
  const [a, b, total] = roundPair(rng, ab === 2);
  // AB II stays below the products of Stufe 2
  const c = other(rng, ab === 2 ? 180 : 89, [a, b]);
  const d = ab === 2 && rng.chance(0.5) ? other(rng, 90, [a, b, c]) : null;
  const shown = d === null ? apart(rng, a, c, b) : [a, c, b, d];
  const value = total + c + (d ?? 0);
  const expression = `${shown.map((n) => fmt(n)).join(' + ')} = ${BOX}`;
  const prompt = 'Such zwei passende Zahlen. Rechne dann vorteilhaft.';
  return item(SKILL, 1, {
    key: `summe:${shown.join('+')}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, label: 'Ergebnis' },
    hints: ['Such zwei Zahlen mit einer glatten Summe.', 'Beim Plusrechnen darfst du die Zahlen tauschen.'],
    steps: [`Tausche: ${fmt(a)} + ${fmt(b)} = ${fmt(total)}.`, `Dann: ${fmt(total)} + ${fmt(c)} = ${fmt(total + c)}.`, ...(d === null ? [] : [`Dann: ${fmt(total + c)} + ${fmt(d)} = ${fmt(value)}.`])],
    bugs: wholeBugs([{ id: 'nur-paar', match: total, hint: 'Die glatte Summe hast du. Die anderen Zahlen kommen noch dazu.' }], value),
    praise: `Du hast zuerst ${fmt(a)} + ${fmt(b)} gerechnet.`,
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: KMK,
  });
}

/** One partner is missing, or: which pair comes first? */
function reasonSum(rng: Rng, ab: Ab): Exercise {
  const [a, b, total] = roundPair(rng, false);
  const c = other(rng, 89, [a, b]);
  if (rng.chance(0.5)) {
    const expression = `${fmt(a)} + ${BOX} + ${fmt(c)} = ${fmt(total + c)}`;
    const prompt = 'Die Summe ist vorteilhaft gebaut. Welche Zahl fehlt?';
    return item(SKILL, 1, {
      key: `partner:${a}+${b}+${c}`,
      ab,
      prompt,
      expression,
      answer: { kind: 'number', value: b, label: 'Fehlende Zahl' },
      hints: [`Zieh zuerst ${fmt(c)} ab.`, `Was fehlt dann von ${fmt(a)} bis zum Ergebnis?`],
      steps: [`${fmt(total + c)} ${MINUS} ${fmt(c)} = ${fmt(total)}.`, `${fmt(total)} ${MINUS} ${fmt(a)} = ${fmt(b)}.`, `Es fehlt die ${fmt(b)}.`],
      bugs: wholeBugs([{ id: 'nur-paar', match: total, hint: `Das ist die glatte Summe. ${fmt(a)} ist darin schon enthalten.` }], b),
      praise: 'Du hast die glatte Summe erkannt.',
      srText: `${prompt} ${toSpeech(expression)}.`,
      kmk: [...KMK, 'PK.problemloesen'],
    });
  }
  const shown = apart(rng, a, c, b);
  const expression = shown.map((n) => fmt(n)).join(' + ');
  const prompt = 'Welche zwei Zahlen rechnest du zuerst zusammen?';
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>([
    { label: `${fmt(a)} + ${fmt(b)}` },
    { label: `${fmt(a)} + ${fmt(c)}`, whyWrong: 'Diese Summe ist nicht glatt. Such eine andere.' },
    { label: `${fmt(b)} + ${fmt(c)}`, whyWrong: 'Diese Summe ist nicht glatt. Such eine andere.' },
  ]);
  return item(SKILL, 1, {
    key: `paar:${shown.join('+')}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Schau auf die Einer. Welche Einer ergeben zusammen 10?'],
    steps: [`${fmt(a)} + ${fmt(b)} = ${fmt(total)}. Das ist eine glatte Zahl.`, `Danach: ${fmt(total)} + ${fmt(c)} = ${fmt(total + c)}.`],
    praise: 'Du hast das passende Paar gefunden.',
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 2: products ───────────────────────────────────────────────────────

const PAIRS: readonly [number, number][] = [[2, 5], [4, 5], [5, 20], [4, 25], [2, 50], [8, 125], [25, 40]];

function productPair(rng: Rng, big: boolean): { p: number; q: number; x: number } {
  const [p, q] = rng.pick(big ? PAIRS.slice(3) : PAIRS.slice(0, 5));
  // never a third factor that repeats a partner or is round itself: then the order would not matter
  let x = big ? rng.int(13, 79) : rng.int(7, 39);
  while (x === p || x === q || x % 10 === 0) x += 1;
  return { p, q, x };
}

function productItem(rng: Rng, ab: Ab): Exercise {
  const big = ab === 3;
  const { p, q, x } = productPair(rng, big);
  const y = big && rng.chance(0.4) ? rng.int(2, 3) : null;
  const shown = y === null ? (rng.chance(0.5) ? [p, x, q] : [q, x, p]) : [p, x, q, y];
  const pair = p * q;
  const value = pair * x * (y ?? 1);
  const expression = `${shown.map((n) => fmt(n)).join(` ${TIMES} `)} = ${BOX}`;
  const prompt = 'Such zwei passende Faktoren. Rechne dann vorteilhaft.';
  return item(SKILL, 2, {
    key: `produkt:${shown.join('*')}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, label: 'Ergebnis' },
    hints: ['Such zwei Faktoren mit einem glatten Produkt.', 'Beim Malnehmen darfst du die Faktoren tauschen.'],
    steps: [`Tausche: ${fmt(p)} ${TIMES} ${fmt(q)} = ${fmt(pair)}.`, `Dann: ${fmt(pair)} ${TIMES} ${fmt(x)} = ${fmt(pair * x)}.`, ...(y === null ? [] : [`Dann: ${fmt(pair * x)} ${TIMES} ${y} = ${fmt(value)}.`])],
    bugs: wholeBugs([{ id: 'nur-paar', match: pair, hint: 'Das glatte Produkt hast du. Der andere Faktor kommt noch dazu.' }], value),
    praise: `Du hast zuerst ${fmt(p)} ${TIMES} ${fmt(q)} gerechnet.`,
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: KMK,
  });
}

/** Only pairs whose product stays the one round product: an odd third factor without a 5 is never round with p or q alone. No 2 · 5 and no one-digit factor: this form sits above the long sums of Stufe 1. */
const EASIER_PAIRS: readonly [number, number][] = [[4, 5], [4, 25], [8, 125]];

/** The order and its value: every value stands on two options and every first product on one or two, so that only the calculation with the round product decides. */
function easierOrder(rng: Rng, ab: Ab): Exercise {
  const [p, q] = rng.pick(EASIER_PAIRS);
  const x = rng.pick([13, 17, 19, 21, 23, 27, 29, 31, 33, 37, 39]);
  const expression = `${fmt(p)} ${TIMES} ${fmt(x)} ${TIMES} ${fmt(q)}`;
  const prompt = 'Welche Reihenfolge macht die Rechnung leichter, und was kommt heraus?';
  const value = p * q * x;
  // one round product too many or too few: the slip of the calculation
  const slip = value + (rng.chance(0.5) ? p * q : -p * q);
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>([
    { label: `(${fmt(p)} ${TIMES} ${fmt(q)}) ${TIMES} ${fmt(x)} = ${fmt(value)}` },
    { label: `(${fmt(p)} ${TIMES} ${fmt(q)}) ${TIMES} ${fmt(x)} = ${fmt(slip)}`, whyWrong: 'Die Reihenfolge passt. Rechne das Produkt noch einmal.' },
    { label: `(${fmt(p)} ${TIMES} ${fmt(x)}) ${TIMES} ${fmt(q)} = ${fmt(value)}`, whyWrong: `${fmt(p)} ${TIMES} ${fmt(x)} ist nicht glatt. Such ein glattes Produkt.` },
    { label: `(${fmt(x)} ${TIMES} ${fmt(q)}) ${TIMES} ${fmt(p)} = ${fmt(slip)}`, whyWrong: `${fmt(x)} ${TIMES} ${fmt(q)} ist nicht glatt. Such ein glattes Produkt.` },
  ]);
  return item(SKILL, 2, {
    key: `reihenfolge:${p}*${x}*${q}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Welches Produkt ist eine glatte Zahl?', 'Rechne mit dem glatten Produkt weiter.'],
    steps: [`${fmt(p)} ${TIMES} ${fmt(q)} = ${fmt(p * q)}. Das ist eine glatte Zahl.`, `${fmt(p * q)} ${TIMES} ${fmt(x)} = ${fmt(p * q * x)}.`],
    praise: 'Du hast das glatte Produkt nach vorne geholt.',
    srText: `${prompt} ${toSpeech(expression)}.`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 3: which law, and where it fails ──────────────────────────────────

/** Dividends that divide by 4, 6 or 8 and then by 2 without a Rest, also when the bracket moves. */
const EVEN_THROUGH = [48, 96, 144, 240];

/** "Was ändert sich hier?": three numbers, and both sides have to be compared piece by piece. The options say what the law does. */
function whichLaw(rng: Rng, ab: Ab): Exercise {
  const [a, b, c] = rng.sample(Array.from({ length: 38 }, (_, i) => i + 3), 3);
  const op = rng.pick(['+', TIMES] as const);
  const kind = rng.pick(['tauschen', 'verbinden', 'beides'] as const);
  const left = `(${a} ${op} ${b}) ${op} ${c}`;
  const right = kind === 'tauschen' ? `(${b} ${op} ${a}) ${op} ${c}` : kind === 'verbinden' ? `${a} ${op} (${b} ${op} ${c})` : `${a} ${op} (${c} ${op} ${b})`;
  const expression = `${left} = ${right}`;
  const rights: Record<typeof kind, string> = { tauschen: 'Tauschen: Zwei Zahlen wechseln den Platz.', verbinden: 'Verbinden: Die Klammer wechselt den Platz.', beides: 'Beides: Zahlen und Klammer wechseln den Platz.' };
  const whys: Record<typeof kind, string> = { tauschen: 'Die Klammer umfasst dieselben Zahlen. Schau auf die Plätze der Zahlen.', verbinden: 'Die Zahlen bleiben in derselben Reihenfolge. Schau auf die Klammer.', beides: 'Hier ändert sich mehr als eine Sache. Schau auf Zahlen und Klammer.' };
  const steps: Record<typeof kind, string> = { tauschen: 'In der Klammer wechseln zwei Zahlen den Platz. Die Klammer bleibt.', verbinden: 'Die Reihenfolge bleibt. Nur die Klammer wechselt den Platz.', beides: 'Die Klammer wechselt den Platz. In der Klammer stehen die Zahlen andersherum.' };
  const options: ChoiceOption[] = (['tauschen', 'verbinden', 'beides'] as const).map((k) => (k === kind ? { label: rights[k] } : { label: rights[k], whyWrong: whys[kind] }));
  const prompt = 'Welches Rechengesetz zeigt diese Gleichung?';
  return item(SKILL, 3, {
    key: `gesetz:${kind}:${expression}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Vergleiche die linke und die rechte Seite.', 'Was bleibt gleich, was ändert seinen Platz?'],
    steps: [steps[kind], `Richtig ist also ${kind === 'tauschen' ? 'Tauschen' : kind === 'verbinden' ? 'Verbinden' : 'Beides'}.`],
    praise: 'Du hast die beiden Seiten genau verglichen.',
    srText: `${prompt} ${termSpeech(expression)}.`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

interface LawCase {
  left: string;
  right: string;
  leftValue: number;
  rightValue: number;
  /** What the two values mean. */
  moral: string;
}

/** A bracket that moves: it holds for plus and mal, it fails for minus and geteilt. */
function movingBracket(rng: Rng): LawCase {
  const kind = rng.pick(['plus', 'mal', 'minus', 'geteilt'] as const);
  if (kind === 'plus') {
    const [a, b, c] = [rng.int(12, 90), rng.int(12, 90), rng.int(12, 90)];
    return { left: `(${a} + ${b}) + ${c}`, right: `${a} + (${b} + ${c})`, leftValue: a + b + c, rightValue: a + b + c, moral: 'Die Werte sind gleich. Bei Plus darf die Klammer wandern.' };
  }
  if (kind === 'mal') {
    const [a, b, c] = [rng.int(2, 9), rng.int(2, 9), rng.int(2, 9)];
    return { left: `(${a} ${TIMES} ${b}) ${TIMES} ${c}`, right: `${a} ${TIMES} (${b} ${TIMES} ${c})`, leftValue: a * b * c, rightValue: a * b * c, moral: 'Die Werte sind gleich. Bei Mal darf die Klammer wandern.' };
  }
  if (kind === 'minus') {
    const [a, b, c] = [rng.int(30, 90), rng.int(5, 20), rng.int(2, 4)];
    return { left: `(${a} ${MINUS} ${b}) ${MINUS} ${c}`, right: `${a} ${MINUS} (${b} ${MINUS} ${c})`, leftValue: a - b - c, rightValue: a - (b - c), moral: 'Die Werte sind verschieden. Bei Minus darf die Klammer nicht wandern.' };
  }
  const [a, b, c] = [rng.pick(EVEN_THROUGH), rng.pick([4, 6, 8]), 2];
  return { left: `(${a} ${DIV} ${b}) ${DIV} ${c}`, right: `${a} ${DIV} (${b} ${DIV} ${c})`, leftValue: a / b / c, rightValue: a / (b / c), moral: 'Die Werte sind verschieden. Bei Geteilt darf die Klammer nicht wandern.' };
}

/** A sign that changes in front of the bracket, with larger numbers: some of these hold, some do not, and only the calculation tells. */
function changingSign(rng: Rng): LawCase {
  const kind = rng.pick(['summe', 'plus', 'differenz', 'produkt', 'quotient'] as const);
  const holds = 'Die Werte sind gleich. Diese Umformung stimmt.';
  const fails = 'Die Werte sind verschieden. Diese Umformung stimmt nicht.';
  if (kind === 'produkt' || kind === 'quotient') {
    const [a, b, c] = [rng.pick(EVEN_THROUGH) * rng.int(2, 5), rng.pick([4, 6, 8]), 2];
    const leftValue = a / b / c;
    return kind === 'produkt'
      ? { left: `${a} ${DIV} ${b} ${DIV} ${c}`, right: `${a} ${DIV} (${b} ${TIMES} ${c})`, leftValue, rightValue: a / (b * c), moral: holds }
      : { left: `${a} ${DIV} ${b} ${DIV} ${c}`, right: `${a} ${DIV} (${b} ${DIV} ${c})`, leftValue, rightValue: a / (b / c), moral: fails };
  }
  const [a, b, c] = [rng.int(120, 480), rng.int(35, 90), rng.int(5, 30)];
  if (kind === 'summe') return { left: `${a} ${MINUS} ${b} ${MINUS} ${c}`, right: `${a} ${MINUS} (${b} + ${c})`, leftValue: a - b - c, rightValue: a - (b + c), moral: holds };
  if (kind === 'differenz') return { left: `${a} ${MINUS} ${b} + ${c}`, right: `${a} ${MINUS} (${b} ${MINUS} ${c})`, leftValue: a - b + c, rightValue: a - (b - c), moral: holds };
  return { left: `${a} ${MINUS} ${b} + ${c}`, right: `${a} ${MINUS} (${b} + ${c})`, leftValue: a - b + c, rightValue: a - (b + c), moral: fails };
}

/** Both sides computed: the law may hold or fail, so "Ja" and "Nein" can both be right. */
function judgeLaw(rng: Rng, ab: Ab): Exercise {
  const { left, right, leftValue, rightValue, moral } = ab === 2 ? movingBracket(rng) : changingSign(rng);
  const holds = leftValue === rightValue;
  const expression = `${left} = ${right}`;
  const prompt = 'Rechne beide Seiten aus. Stimmt diese Gleichung?';
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>([
    holds ? { label: `Ja: Beide Seiten ergeben ${fmt(leftValue)}.` } : { label: `Ja: Beide Seiten ergeben ${fmt(leftValue)}.`, whyWrong: 'Rechne auch die rechte Seite aus. Die Klammer kommt zuerst.' },
    holds ? { label: `Nein: links ${fmt(leftValue)}, rechts ${fmt(leftValue + 10)}.`, whyWrong: 'Rechne die rechte Seite noch einmal. Die Klammer kommt zuerst.' } : { label: `Nein: links ${fmt(leftValue)}, rechts ${fmt(rightValue)}.` },
    { label: 'Das lässt sich nicht ausrechnen.', whyWrong: 'Du kannst beide Seiten ausrechnen. Die Klammer kommt zuerst.' },
  ]);
  return item(SKILL, 3, {
    key: `gleichung:${expression}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Rechne jede Seite für sich. Die Klammer kommt zuerst.', 'Vergleiche danach die beiden Ergebnisse.'],
    steps: [`Links: ${left} = ${fmt(leftValue)}.`, `Rechts: ${right} = ${fmt(rightValue)}.`, moral],
    praise: 'Du hast beide Seiten nachgerechnet.',
    srText: `${prompt} ${termSpeech(expression)}.`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Two divisors with a round product whose quotient divides the Dividend too, so that the wrong bracket still gives a whole number. */
const ROUND_DIVISORS: readonly [number, number][] = [[20, 5], [50, 2], [40, 5]];

/** A chain with minus or geteilt that may be grouped, but only the right way: a − b − c = a − (b + c). The bracket left as it is gives the misconception's value. */
function chainItem(rng: Rng, ab: Ab): Exercise {
  const useMinus = rng.chance(0.5);
  const [b, c] = useMinus ? chainPair(rng) : rng.pick(ROUND_DIVISORS);
  const pair = useMinus ? b + c : b * c;
  const a = useMinus ? rng.int(pair + 23, 900) : pair * rng.int(3, 19);
  const op = useMinus ? MINUS : DIV;
  const joint = useMinus ? '+' : TIMES;
  const value = useMinus ? a - pair : a / pair;
  const wrong = useMinus ? a - (b - c) : a / (b / c);
  const expression = `${a} ${op} ${b} ${op} ${c} = ${BOX}`;
  const prompt = 'Rechne vorteilhaft. Achte auf das Rechenzeichen.';
  return item(SKILL, 3, {
    key: `kette:${expression}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, label: 'Ergebnis' },
    hints: useMinus ? ['Du ziehst beide Zahlen ab. Zähl die beiden zuerst zusammen.', 'Zieh dann die Summe ab.'] : ['Du teilst zweimal. Nimm die beiden Teiler zuerst mal.', 'Teile dann durch das Produkt.'],
    steps: [`Zuerst: ${b} ${joint} ${c} = ${pair}.`, `Dann: ${a} ${op} ${pair} = ${value}.`],
    bugs: wholeBugs([{ id: 'tausch-minus', match: wrong, hint: 'Bei Minus und Geteilt darfst du nicht einfach tauschen.' }], value),
    praise: useMinus ? 'Du hast die Summe der beiden Zahlen abgezogen.' : 'Du hast durch das Produkt der Teiler geteilt.',
    srText: `${prompt} ${termSpeech(expression)}.`,
    kmk: KMK,
  });
}

/** Two numbers with a round sum, the larger one first. */
function chainPair(rng: Rng): [number, number] {
  const [x, y] = roundPair(rng, false);
  return x > y ? [x, y] : [y, x];
}

export const rechengesetzeSkill: SkillDef = {
  ...SKILL,
  title: 'Vorteilhaft rechnen',
  description: 'Du tauschst und fasst zusammen, damit es leichter wird.',
  stufen: {
    1: 'Summen tauschen und zusammenfassen',
    2: 'Produkte tauschen und die leichtere Reihenfolge wählen',
    3: 'Rechengesetze erkennen, auch bei Minus und Geteilt',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 3 ? reasonSum(rng, ab) : sumItem(rng, ab);
    if (stufe === 2) return ab === 2 ? easierOrder(rng, ab) : productItem(rng, ab);
    if (ab === 1) return whichLaw(rng, ab);
    if (ab === 2) return rng.chance(0.5) ? chainItem(rng, ab) : judgeLaw(rng, ab);
    return judgeLaw(rng, ab);
  },
};
