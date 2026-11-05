/**
 * Brüche im Alltag: ½, ¼ and ¾ with time, weight, capacity and length. The answers stay whole numbers, so this skill has no comma key.
 * Stufe 1 (½, ¼, ¾ of 1 h, 1 kg, 1 l, 1 m): AB I convert, AB II a short story, AB III name the fraction a clock, scale or jug shows.
 * Stufe 2 (mixed amounts as 1½ h): AB I with ½, AB II with ¼ or ¾, also as a story, AB III back from the small unit, or two amounts together.
 * Stufe 3 (a fraction against the small unit): AB I compare a mixed amount, AB II order four, AB III order five with mixed amounts, or what is left against a fraction.
 */
import { BOX, fmt, fmtTime, frac, NBSP } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, Rng, SkillDef, Step, Stufe, Visual } from '../../core/types';
import { build, makeChoice, pickPerson, safeHints, speak } from '../shared';
import { byStufeAndAb, orderBugs, orderWith, relationOf, shownName, symbolChoice, typedBugs, type Form } from './helpers';

const SKILL = { id: 'brueche.alltag', topicId: 'brueche' } as const;
const KMK = ['ZO.bruchteile', 'GM.einheiten'];

interface Quantity {
  /** The unit of the whole; time as a word, because 'eine Stunde' is how the fraction is said. */
  one: string;
  many: string;
  /** Short form in a calculation. */
  big: string;
  small: string;
  per: number;
  smallWord: string;
}

const HOUR: Quantity = { one: 'Stunde', many: 'Stunden', big: 'h', small: 'min', per: 60, smallWord: 'Minuten' };
const KG: Quantity = { one: 'kg', many: 'kg', big: 'kg', small: 'g', per: 1000, smallWord: 'Gramm' };
const LITRE: Quantity = { one: 'l', many: 'l', big: 'l', small: 'ml', per: 1000, smallWord: 'Milliliter' };
const METRE: Quantity = { one: 'm', many: 'm', big: 'm', small: 'cm', per: 100, smallWord: 'Zentimeter' };
const ALL = [HOUR, KG, LITRE, METRE] as const;

const HALF = [1, 2] as const;
const QUARTER = [1, 4] as const;
const THREE = [3, 4] as const;
type Part = readonly [n: number, d: number];

/** An amount as the child reads it: '{frac:3/4} kg', '{frac:1 1/2} Stunden'. */
const amount = (q: Quantity, whole: number, [n, d]: Part) => `${frac(n, d, whole > 0 ? whole : undefined)}${NBSP}${whole > 0 ? q.many : q.one}`;
const inSmall = (q: Quantity, whole: number, [n, d]: Part) => whole * q.per + (n * q.per) / d;
const small = (q: Quantity, v: number) => `${fmt(v)}${NBSP}${q.small}`;

/** Worked steps of a conversion: the size of one whole, one part, then the amount. */
function conversionSteps(q: Quantity, whole: number, [n, d]: Part): string[] {
  const value = inSmall(q, whole, [n, d]);
  const unit = q.per / d;
  const lines = [`1${NBSP}${q.big} = ${small(q, q.per)}`];
  if (n === 1) lines.push(`${frac(1, d)} von ${small(q, q.per)} = ${small(q, q.per)} : ${d} = ${small(q, unit)}`);
  else {
    lines.push(`${frac(1, d)} von ${small(q, q.per)} = ${small(q, unit)}`);
    lines.push(`${frac(n, d)} von ${small(q, q.per)} = ${n} · ${small(q, unit)} = ${small(q, n * unit)}`);
  }
  if (whole > 0) lines.push(`${small(q, whole * q.per)} + ${small(q, n * unit)} = ${small(q, value)}`);
  else lines.push(`${amount(q, 0, [n, d])} sind ${small(q, value)}.`);
  return lines;
}

function conversionHints(q: Quantity, whole: number, [n, d]: Part, value: number): string[] {
  const parts = `${whole > 0 ? 'Für den Bruch: ' : ''}Teile durch ${d}.${n > 1 ? ` Nimm das Ergebnis dann ${n}-mal.` : ''}`;
  const first = `Denke an: 1${NBSP}${q.big} = ${small(q, q.per)}.`;
  const last = whole > 0 ? `Rechne die Ganzen und den Bruch getrennt um.` : parts;
  return safeHints(whole > 0 ? [first, last, parts] : [first, last], value, `Rechne die ${q.smallWord} für ein Ganzes aus.`);
}

function conversionBugs(q: Quantity, whole: number, [n, d]: Part): Bug[] {
  const value = inSmall(q, whole, [n, d]);
  const unit = q.per / d;
  return typedBugs([
    whole === 0 && n > 1 && { id: 'von-nur-nenner', match: unit, hint: `${frac(1, d)} sind ${small(q, unit)}. Du brauchst ${frac(n, d)}.` },
    whole > 0 && { id: 'ganze-vergessen', match: n * unit, hint: 'Du hast nur den Bruch umgerechnet. Rechne die Ganzen dazu.' },
    q === HOUR && { id: 'stunde-hundert', match: ((whole * d + n) * 100) / d, hint: 'Eine Stunde hat 60 Minuten, nicht 100.' },
    q === HOUR && whole > 0 && n === 1 && d === 2 && { id: 'zeit-dezimal', match: whole * 60 + 50, hint: 'Eine halbe Stunde sind 30 Minuten, nicht 50.' },
    q.per === 1000 && { id: 'faktor-klein', match: ((whole * d + n) * 100) / d, hint: `1${NBSP}${q.big} sind ${small(q, 1000)}, nicht ${small(q, 100)}.` },
  ], value);
}

/** The drawing of an amount for a worked step, where the amount fits one. */
function picture(q: Quantity, value: number): Visual | undefined {
  if (q === KG && value <= 1000) return { type: 'scale', maxGrams: 1000, stepGrams: 50, grams: value };
  if (q === LITRE && value <= 1000) return { type: 'container', capacityMl: 1000, fillMl: value, stepMl: 50 };
  return undefined;
}

function withPicture(lines: string[], q: Quantity, value: number): Step[] {
  const visual = picture(q, value);
  return visual ? [...lines.slice(0, -1), { text: lines[lines.length - 1], visual }] : lines;
}

function plainConversion(stufe: Stufe, ab: Ab, q: Quantity, whole: number, part: Part): Exercise {
  const value = inSmall(q, whole, part);
  const shown = amount(q, whole, part);
  return build(SKILL, stufe, {
    key: `um:${q.big}:${whole}:${part.join('/')}`,
    ab,
    prompt: 'Rechne um.',
    expression: `${shown} = ${BOX} ${q.small}`,
    answer: { kind: 'number', value, unit: q.small, label: `Wert in ${q.smallWord}` },
    hints: conversionHints(q, whole, part, value),
    steps: withPicture(conversionSteps(q, whole, part), q, value),
    bugs: conversionBugs(q, whole, part),
    praise: `Du hast erst 1${NBSP}${q.big} in ${q.small} umgerechnet.`,
    srText: speak(`Rechne um: ${shown} sind wie viele ${q.smallWord}?`),
    kmk: KMK,
  });
}

/** A story of a quantity: the amounts in the small unit that fit it (no film of ¼ Stunde, no recipe with 3¾ l Milch), its sentence and its question. */
interface Story {
  id: string;
  min: number;
  max: number;
  context: (shown: string, p: string) => string;
  prompt: (p: string) => string;
}

const STORIES: Readonly<Record<string, readonly Story[]>> = {
  h: [
    { id: 'pause', min: 15, max: 45, context: (shown) => `Die Pause dauert ${shown}.`, prompt: () => 'Wie viele Minuten dauert die Pause?' },
    { id: 'klavier', min: 15, max: 105, context: (shown, p) => `${p} übt ${shown} Klavier.`, prompt: (p) => `Wie viele Minuten übt ${p}?` },
    { id: 'training', min: 30, max: 120, context: (shown) => `Das Training dauert ${shown}.`, prompt: () => 'Wie viele Minuten dauert das Training?' },
    { id: 'film', min: 75, max: 165, context: (shown) => `Der Film dauert ${shown}.`, prompt: () => 'Wie viele Minuten dauert der Film?' },
    { id: 'zug', min: 60, max: 225, context: (shown) => `Die Zugfahrt dauert ${shown}.`, prompt: () => 'Wie viele Minuten dauert die Zugfahrt?' },
  ],
  kg: [
    { id: 'aepfel', min: 250, max: 2750, context: (shown, p) => `${p} kauft ${shown} Äpfel.`, prompt: () => 'Wie viel Gramm Äpfel sind das?' },
    { id: 'mehl', min: 250, max: 1250, context: (shown) => `Das Rezept braucht ${shown} Mehl.`, prompt: () => 'Wie viel Gramm Mehl sind das?' },
    { id: 'kartoffeln', min: 1000, max: 3750, context: (shown) => `Der Sack enthält ${shown} Kartoffeln.`, prompt: () => 'Wie viel Gramm Kartoffeln sind das?' },
  ],
  l: [
    { id: 'saft', min: 250, max: 1750, context: (shown) => `Der Krug enthält ${shown} Saft.`, prompt: () => 'Wie viele Milliliter Saft sind das?' },
    { id: 'milch', min: 250, max: 1000, context: (shown) => `Das Rezept braucht ${shown} Milch.`, prompt: () => 'Wie viele Milliliter Milch sind das?' },
    { id: 'eimer', min: 1000, max: 3750, context: (shown) => `Der Eimer enthält ${shown} Wasser.`, prompt: () => 'Wie viele Milliliter Wasser sind das?' },
  ],
  m: [
    { id: 'band', min: 25, max: 375, context: (shown) => `Das Band ist ${shown} lang.`, prompt: () => 'Wie viele Zentimeter lang ist das Band?' },
    { id: 'brett', min: 25, max: 375, context: (shown, p) => `${p} sägt ${shown} von einem Brett ab.`, prompt: () => 'Wie viele Zentimeter sind das?' },
  ],
};

/** A conversion story with an amount out of these wholes and parts that fits the story. */
function storyConversion(rng: Rng, stufe: Stufe, ab: Ab, q: Quantity, wholes: readonly number[], parts: readonly Part[]): Exercise {
  const amounts = wholes.flatMap((whole) => parts.map((part) => ({ whole, part, value: inSmall(q, whole, part) })));
  const fits = (x: Story, value: number) => value >= x.min && value <= x.max;
  const chosen = rng.pick(STORIES[q.big].filter((x) => amounts.some((a) => fits(x, a.value))));
  const { whole, part, value } = rng.pick(amounts.filter((a) => fits(chosen, a.value)));
  const p = pickPerson(rng).name;
  const context = chosen.context(amount(q, whole, part), p);
  const prompt = chosen.prompt(p);
  return build(SKILL, stufe, {
    key: `sache:${q.big}:${whole}:${part.join('/')}:${chosen.id}:${shownName(p, context, prompt)}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, unit: q.small, label: `Wert in ${q.smallWord}` },
    hints: conversionHints(q, whole, part, value),
    steps: withPicture(conversionSteps(q, whole, part), q, value),
    bugs: conversionBugs(q, whole, part),
    praise: `Du hast den Bruch in ${q.smallWord} übersetzt.`,
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** Stufe 1, AB III: which fraction does the picture show? */
const readPicture: Form = (rng, stufe, ab) => {
  const part = rng.pick([HALF, QUARTER, THREE]);
  const kind = rng.pick(['scale', 'container', 'clock'] as const);
  const q = kind === 'scale' ? KG : kind === 'container' ? LITRE : HOUR;
  const value = inSmall(q, 0, part);
  const startHour = rng.int(8, 16);
  const visual: Visual = kind === 'scale'
    ? { type: 'scale', maxGrams: 1000, stepGrams: 50, grams: value }
    : kind === 'container'
      ? { type: 'container', capacityMl: 1000, fillMl: value, stepMl: 50 }
      : { type: 'clock', hours: startHour, minutes: value };
  const prompt = kind === 'scale'
    ? 'Die Waage zeigt eine Menge. Welcher Bruchteil von 1 kg ist das?'
    : kind === 'container'
      ? 'Im Messbecher ist Wasser. Welcher Bruchteil von 1 l ist das?'
      : `Das Spiel beginnt um ${startHour}${NBSP}Uhr. Die Uhr zeigt das Ende. Welcher Bruchteil einer Stunde ist vorbei?`;
  // the reading of the picture in words, as a screen reader gets no drawing
  const reading = kind === 'scale'
    ? `Die Waage zeigt ${small(q, value)}. Welcher Bruchteil von 1 kg ist das?`
    : kind === 'container'
      ? `Im Messbecher sind ${small(q, value)} Wasser. Welcher Bruchteil von 1 l ist das?`
      : `Das Spiel beginnt um ${startHour}${NBSP}Uhr. Die Uhr zeigt das Ende: ${fmtTime(startHour, value)}. Welcher Bruchteil einer Stunde ist vorbei?`;
  const wrongs: ChoiceOption[] = [HALF, QUARTER, THREE].filter((w) => w !== part).map((w) => ({
    label: amount(q, 0, w),
    whyWrong: `${amount(q, 0, w)} sind ${small(q, inSmall(q, 0, w))}. Lies das Bild noch einmal ab.`,
  }));
  const answer = makeChoice(rng, { label: amount(q, 0, part) }, wrongs, { order: [HALF, QUARTER, THREE].map((w) => amount(q, 0, w)) });
  return build(SKILL, stufe, {
    key: `bild:${kind}:${part.join('/')}:${kind === 'clock' ? startHour : ''}`,
    ab,
    prompt,
    visual,
    answer,
    hints: [kind === 'clock' ? 'Wie viele Minuten sind vorbei? Eine Stunde hat 60 Minuten.' : `Lies den Wert in ${q.small} ab.`, `Vergleiche mit einem Ganzen: 1${NBSP}${q.big} = ${small(q, q.per)}.`],
    steps: [`Das Bild zeigt ${small(q, value)}.`, `1${NBSP}${q.big} = ${small(q, q.per)}`, `${small(q, value)} sind ${amount(q, 0, part)}.`],
    praise: 'Du hast den Wert mit einem Ganzen verglichen.',
    srText: speak(`${reading} Wähle aus: ${answer.options.map((o) => o.label).join(', ')}.`),
    kmk: KMK,
  });
};

/** Stufe 2, AB III: from the small unit back to a mixed amount. */
const backToMixed: Form = (rng, stufe, ab) => {
  const q = rng.pick([HOUR, KG, LITRE]);
  const whole = rng.int(1, 3);
  const part = rng.pick([HALF, QUARTER, THREE]);
  const value = inSmall(q, whole, part);
  const label = amount(q, whole, part);
  const other = (w: number, p: Part): ChoiceOption => ({ label: amount(q, w, p), whyWrong: `${amount(q, w, p)} sind ${small(q, inSmall(q, w, p))}.` });
  const swapped = part === QUARTER ? THREE : part === THREE ? QUARTER : QUARTER;
  const answer = makeChoice(rng, { label }, [other(whole, swapped), other(whole + 1, part), other(Math.max(1, whole - 1) === whole ? whole + 2 : whole - 1, part), other(whole, part === HALF ? THREE : HALF)]);
  const prompt = `Welche Angabe ist genauso viel wie ${small(q, value)}?`;
  return build(SKILL, stufe, {
    key: `zurueck:${q.big}:${whole}:${part.join('/')}`,
    ab,
    prompt,
    answer,
    hints: [`Wie viele Ganze stecken darin? 1${NBSP}${q.big} = ${small(q, q.per)}.`, 'Welcher Bruch passt zum Rest?'],
    steps: [`${whole} · ${small(q, q.per)} = ${small(q, whole * q.per)}`, `Rest: ${small(q, value)} − ${small(q, whole * q.per)} = ${small(q, value - whole * q.per)}`, `${small(q, value - whole * q.per)} sind ${frac(part[0], part[1])} von ${small(q, q.per)}.`, `${small(q, value)} sind ${label}.`],
    praise: 'Du hast die Ganzen abgezogen und den Rest benannt.',
    srText: speak(`${prompt} Wähle aus: ${answer.options.map((o) => o.label).join(', ')}.`),
    kmk: KMK,
  });
};

/** Stufe 2, AB III: two amounts together, in the small unit. */
const twoAmounts: Form = (rng, stufe, ab) => {
  const p = pickPerson(rng).name;
  const q = rng.pick([KG, LITRE]);
  const a = rng.pick([HALF, QUARTER, THREE]);
  const b = rng.pick([HALF, QUARTER, THREE].filter((x) => x !== a));
  const whole = rng.int(0, 1);
  const va = inSmall(q, whole, a);
  const vb = inSmall(q, 0, b);
  const value = va + vb;
  const context = q === KG ? `${p} kauft ${amount(q, whole, a)} Äpfel und ${amount(q, 0, b)} Birnen.` : `${p} mischt ${amount(q, whole, a)} Saft und ${amount(q, 0, b)} Wasser.`;
  const prompt = q === KG ? 'Wie viel Gramm sind das zusammen?' : 'Wie viele Milliliter sind das zusammen?';
  return build(SKILL, stufe, {
    key: `zwei:${q.big}:${p}:${whole}:${a.join('/')}:${b.join('/')}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, unit: q.small, label: `Wert in ${q.smallWord}` },
    hints: safeHints(['Rechne beide Mengen zuerst in die kleine Einheit um.', 'Zähle die beiden Werte dann zusammen.'], value, 'Rechne zuerst beide Mengen um.'),
    steps: [`${amount(q, whole, a)} = ${small(q, va)}`, `${amount(q, 0, b)} = ${small(q, vb)}`, `${small(q, va)} + ${small(q, vb)} = ${small(q, value)}`],
    bugs: typedBugs([{ id: 'nur-eine-menge', match: va, hint: 'Das ist erst die erste Menge. Zähle die zweite dazu.' }, { id: 'nur-eine-menge', match: vb, hint: 'Das ist erst die zweite Menge. Zähle die erste dazu.' }], value),
    praise: 'Du hast beide Mengen in dieselbe Einheit gebracht.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

/** Stufe 3, AB I: a mixed amount against the small unit, 1¾ l and 1700 ml: the conversion of Stufe 2, then a comparison that a glance does not decide. */
const compareAmounts: Form = (rng, stufe, ab) => {
  const q = rng.pick(ALL);
  const whole = rng.int(1, 3);
  const part = rng.pick([HALF, QUARTER, THREE]);
  const value = inSmall(q, whole, part);
  const gap = q.per === 1000 ? rng.pick([50, 100, 150]) : rng.pick([5, 10]);
  const other = value + rng.pick([-1, 1, 0]) * gap;
  const relation = relationOf(value - other);
  const shown = amount(q, whole, part);
  const hint = `Rechne ${shown} zuerst in ${q.small} um. Vergleiche dann.`;
  return build(SKILL, stufe, {
    key: `vergleich:${q.big}:${whole}:${part.join('/')}:${other}`,
    ab,
    prompt: 'Setze das passende Zeichen ein.',
    expression: `${shown} ${BOX} ${small(q, other)}`,
    answer: symbolChoice(rng, relation, { '<': hint, '>': hint, '=': hint }),
    hints: [`Rechne ${shown} in ${q.small} um.`, 'Vergleiche dann die beiden Zahlen. Beide haben jetzt dieselbe Einheit.'],
    steps: [`1${NBSP}${q.big} = ${small(q, q.per)}`, `${shown} = ${small(q, value)}`, `${small(q, value)} ${relation} ${small(q, other)}`, `Also: ${shown} ${relation} ${small(q, other)}`],
    praise: `Du hast beide Mengen in ${q.small} verglichen.`,
    srText: speak(`Setze das passende Zeichen ein: ${shown} und ${small(q, other)}.`),
    kmk: KMK,
  });
};

interface Item {
  label: string;
  value: number;
  /** The number the child sees, without its unit. */
  shown: number;
}

/** Stufe 3, AB II and III: mixed amounts in order; `mixed` adds amounts above one whole. */
function orderAmounts(count: number, mixed: boolean): Form {
  return (rng, stufe, ab) => {
    const q = rng.pick(ALL);
    const fractions: Item[] = [];
    for (const whole of mixed ? [0, 1] : [0]) {
      for (const part of [HALF, QUARTER, THREE]) fractions.push({ label: amount(q, whole, part), value: inSmall(q, whole, part), shown: whole + part[0] / part[1] });
    }
    const step = q.per === 1000 ? 50 : 5;
    const top = mixed ? 2 * q.per : q.per;
    const chosen = rng.sample(fractions, Math.ceil(count / 2));
    const free = Array.from({ length: Math.floor(top / step) - 1 }, (_, i) => (i + 1) * step).filter((v) => !chosen.some((c) => c.value === v));
    const plain = rng.sample(free, count - chosen.length).map((v): Item => ({ label: small(q, v), value: v, shown: v }));
    const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
    const { answer, sorted, wrongOrder } = orderWith(rng, [...chosen, ...plain], (a, b) => a.value - b.value, (x) => x.label, direction);
    const sign = direction === 'aufsteigend' ? ' < ' : ' > ';
    const prompt = `Ordne die Angaben von ${direction === 'aufsteigend' ? 'klein nach groß' : 'groß nach klein'}.`;
    return build(SKILL, stufe, {
      key: `ordnen:${count}:${q.big}:${direction}:${sorted.map((x) => x.label).join()}`,
      ab,
      prompt,
      answer,
      hints: [`Rechne zuerst alle Angaben in ${q.small} um.`, 'Vergleiche dann nur noch die Zahlen.'],
      steps: [`1${NBSP}${q.big} = ${small(q, q.per)}`, `In ${q.small}: ${sorted.map((x) => fmt(x.value)).join(sign)}`, `Also: ${sorted.map((x) => x.label).join(sign)}`],
      bugs: orderBugs(answer.correct, [['einheit-ignoriert', wrongOrder((a, b) => a.shown - b.shown), `Die Einheiten sind verschieden. Rechne zuerst alles in ${q.small} um.`]]),
      praise: `Du hast alles in ${q.small} umgerechnet und dann geordnet.`,
      srText: speak(`${prompt} ${answer.items.join(', ')}.`),
      kmk: KMK,
    });
  };
}

/** Stufe 3, AB III: what is left in the small unit against a fraction: two conversions, a subtraction, and then the comparison of this Stufe. */
const leftAgainstFraction: Form = (rng, stufe, ab) => {
  const p = pickPerson(rng).name;
  const q = rng.pick([HOUR, KG, LITRE]);
  const part = rng.pick([QUARTER, THREE, HALF]);
  // of ¼ alone no fraction is left to compare with, and a game of ¼ Stunde is too short for this story
  const whole = part === QUARTER ? 1 : rng.int(0, 1);
  const value = inSmall(q, whole, part);
  const gap = q === HOUR ? rng.pick([5, 10]) : rng.pick([50, 100]);
  // close to the fraction, so a glance does not decide
  const mark = rng.pick([HALF, QUARTER, THREE].filter((m) => inSmall(q, 0, m) + gap < value));
  const markValue = inSmall(q, 0, mark);
  const rest = markValue + rng.pick([-1, 0, 1]) * gap;
  const taken = value - rest;
  const relation = relationOf(rest - markValue);
  const shown = amount(q, whole, part);
  const markShown = amount(q, 0, mark);
  const [context, prompt] = q === HOUR
    ? [`Das Spiel dauert ${shown}. ${small(q, taken)} sind schon vorbei.`, 'Wie lange dauert das Spiel noch?']
    : q === KG
      ? [`Eine Tüte enthält ${shown} Mehl. ${p} nimmt ${small(q, taken)} heraus.`, 'Wie viel Mehl bleibt in der Tüte?']
      : [`Eine Flasche enthält ${shown} Saft. ${p} gießt ${small(q, taken)} ab.`, 'Wie viel Saft bleibt in der Flasche?'];
  const labels: Record<'<' | '=' | '>', string> = { '>': `Mehr als ${markShown}`, '=': `Genau ${markShown}`, '<': `Weniger als ${markShown}` };
  const why = `Rechne den Rest und ${markShown} in ${q.small} um. Vergleiche dann.`;
  const wrongs: ChoiceOption[] = (['>', '=', '<'] as const).filter((r) => r !== relation).map((r) => ({ label: labels[r], whyWrong: why }));
  const answer = makeChoice(rng, { label: labels[relation] }, wrongs, { order: [labels['>'], labels['='], labels['<']] });
  return build(SKILL, stufe, {
    key: `rest:${q.big}:${whole}:${part.join('/')}:${taken}:${mark.join('/')}:${shownName(p, context, prompt)}`,
    ab,
    context,
    prompt,
    answer,
    hints: [`Rechne ${shown} in ${q.small} um. Zieh dann ${small(q, taken)} ab.`, `Rechne auch ${markShown} in ${q.small} um. Vergleiche dann.`],
    steps: [`${shown} = ${small(q, value)}`, `${small(q, value)} − ${small(q, taken)} = ${small(q, rest)}`, `${markShown} = ${small(q, markValue)}`, `${small(q, rest)} ${relation} ${small(q, markValue)}`],
    praise: 'Du hast den Rest mit dem Bruch verglichen.',
    srText: speak(`${context} ${prompt} Wähle aus: ${answer.options.map((o) => o.label).join(', ')}.`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

const anyPart = (rng: Rng) => rng.pick([HALF, QUARTER, THREE]);

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: {
    1: [(rng, s, a) => plainConversion(s, a, rng.pick(ALL), 0, anyPart(rng))],
    2: [(rng, s, a) => storyConversion(rng, s, a, rng.pick(ALL), [0], [HALF, QUARTER, THREE])],
    3: [readPicture],
  },
  2: {
    1: [(rng, s, a) => plainConversion(s, a, rng.pick(ALL), rng.int(1, 4), HALF)],
    2: [
      (rng, s, a) => plainConversion(s, a, rng.pick(ALL), rng.int(1, 4), rng.pick([QUARTER, THREE])),
      (rng, s, a) => storyConversion(rng, s, a, rng.pick(ALL), [1, 2, 3], [QUARTER, THREE]),
    ],
    3: [backToMixed, twoAmounts],
  },
  3: {
    1: [compareAmounts],
    2: [orderAmounts(4, false)],
    3: [orderAmounts(5, true), leftAgainstFraction],
  },
};

export const alltagSkill: SkillDef = {
  ...SKILL,
  title: 'Brüche im Alltag',
  description: 'Du nutzt ½, ¼ und ¾ bei Zeit, Gewicht und Länge.',
  stufen: { 1: '½, ¼ und ¾ von 1 h, 1 kg, 1 l, 1 m', 2: 'Gemischte Angaben: 1½ h in min, 2¾ kg in g', 3: '¾ l und 700 ml vergleichen, gemischte Angaben ordnen' },
  kmk: KMK,
  generate: byStufeAndAb(FORMS),
};
