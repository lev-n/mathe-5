/**
 * Vorzeichen und Rechenzeichen (docs/research.md §6, F5). Stufe 1: which minus is which. Stufe 2: subtraction as addition of the Gegenzahl. Stufe 3: a
 * term without brackets.
 */
import { BOX, fmt, fmtSigned } from '../../core/format';
import type { Ab, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, multiBugs, numberBugs, pickPerson, signedNumber, targetAb } from '../shared';
import { apply, assemble, bug, type Form, GEGENZAHL_HINT, GEGENZAHL_NEAR, KMK_RECHNEN, type Op, say, term } from './helpers';

const SKILL = { id: 'ganzzahlen.vorzeichen', topicId: 'ganzzahlen' } as const;

const BOTH_MEANINGS = 'Ein Vorzeichen gehört zu einer Zahl. Ein Rechenzeichen steht zwischen zwei Zahlen.';

// ─── Stufe 1: which minus is which ───────────────────────────────────────────

interface MinusTerm {
  id: string;
  text: string;
  /** Character position of the marked minus. */
  at: number;
  isRechen: boolean;
}

function markedMinus(rng: Rng): Form {
  const a = rng.int(2, 20);
  const b = rng.int(2, 20);
  const pick = rng.pick<MinusTerm>([
    { id: 'mm-1', text: `${a} − (−${b})`, at: `${a} `.length, isRechen: true },
    { id: 'mm-2', text: `${a} − (−${b})`, at: `${a} − (`.length, isRechen: false },
    { id: 'pm', text: `${a} + (−${b})`, at: `${a} + (`.length, isRechen: false },
    { id: 'vr-1', text: `−${a} − ${b}`, at: 0, isRechen: false },
    { id: 'vr-2', text: `−${a} − ${b}`, at: `−${a} `.length, isRechen: true },
    { id: 'rr', text: `${a} − ${b}`, at: `${a} `.length, isRechen: true },
  ]);
  const right = pick.isRechen ? 'Rechenzeichen' : 'Vorzeichen';
  const wrong = pick.isRechen ? 'Vorzeichen' : 'Rechenzeichen';
  const prompt = 'Was ist das markierte Minuszeichen?';
  const position = pick.at === 0 ? 'Das Minus am Anfang ist markiert.' : pick.isRechen ? 'Das Minus zwischen den Zahlen ist markiert.' : 'Das Minus in der Klammer ist markiert.';
  return {
    key: `markiert:${pick.id}:${a}:${b}`,
    prompt,
    visual: { type: 'term', lines: [pick.text], highlight: [pick.at, pick.at + 1] },
    answer: makeChoice(rng, { label: right }, [{ label: wrong, whyWrong: BOTH_MEANINGS }], { order: ['Rechenzeichen', 'Vorzeichen'] }),
    hints: [BOTH_MEANINGS, 'Schau auf beide Seiten des markierten Minus.'],
    steps: [`Im Term ${pick.text} ist ein Minus markiert.`, pick.isRechen ? 'Es steht zwischen zwei Zahlen. Das ist ein Rechenzeichen.' : 'Es gehört direkt zu einer Zahl. Das ist ein Vorzeichen.'],
    praise: 'Du hast Vorzeichen und Rechenzeichen getrennt.',
    srText: say(prompt, pick.text, position),
  };
}

interface Part {
  op: Op;
  value: number;
}

function partsText(first: number, parts: readonly Part[]): string {
  return [fmt(first), ...parts.flatMap((p) => [p.op, fmtSigned(p.value)])].join(' ');
}

function bracketParts(rng: Rng, count: number, max: number): Part[] {
  return Array.from({ length: count }, (_, i) => ({
    op: rng.chance(0.5) ? '+' as const : '−' as const,
    // the first part is always negative, so there is a sign to tell apart
    value: i === 0 || rng.chance(0.6) ? -rng.int(2, max) : rng.int(2, max),
  }));
}

function countMinus(rng: Rng): Form {
  const first = rng.chance(0.6) ? -rng.int(2, 12) : rng.int(2, 12);
  const parts = bracketParts(rng, rng.int(2, 3), 12);
  const text = partsText(first, parts);
  const vorzeichen = (first < 0 ? 1 : 0) + parts.filter((p) => p.value < 0).length;
  const rechen = parts.filter((p) => p.op === '−').length;
  const prompt = 'Wie viele Minuszeichen sind hier Vorzeichen?';
  return {
    key: `zaehlen:${first}:${parts.map((p) => `${p.op === '+' ? 'p' : 'm'}${p.value}`).join(':')}`,
    prompt,
    expression: text,
    answer: signedNumber(vorzeichen),
    hints: ['Vorzeichen stehen am Anfang des Terms oder in einer Klammer.', 'Ein Minus zwischen zwei Zahlen ist ein Rechenzeichen.'],
    steps: [`Minuszeichen als Rechenzeichen: ${rechen}`, `Minuszeichen als Vorzeichen: ${vorzeichen}`],
    bugs: numberBugs([
      bug('alle-minus', vorzeichen + rechen, 'Du hast alle Minuszeichen gezählt. Trenne Vorzeichen und Rechenzeichen.'),
      bug('rechenzeichen-gezaehlt', rechen, 'Das sind die Rechenzeichen. Gesucht sind die Vorzeichen.'),
    ], vorzeichen, true),
    praise: 'Du hast die beiden Zeichen getrennt.',
    srText: say(prompt, text),
  };
}

function explainMinus(rng: Rng): Form {
  const a = rng.int(2, 20);
  const b = rng.int(2, 20);
  const text = `${a} − (−${b})`;
  const person = pickPerson(rng).name;
  const prompt = `${person} liest ${text}. Welcher Satz stimmt?`;
  return {
    key: `erklaeren:${a}:${b}`,
    prompt,
    answer: makeChoice(rng, { label: `Das erste Minus heißt: abziehen. Das zweite gehört zur ${b}.` }, [
      { label: `Das erste Minus gehört zur ${b}. Das zweite heißt: abziehen.`, whyWrong: BOTH_MEANINGS },
      { label: 'Beide Minuszeichen heißen: abziehen.', whyWrong: 'Das Minus in der Klammer steht direkt bei der Zahl. Es ist ein Vorzeichen.' },
      { label: `Beide Minuszeichen gehören zur ${b}.`, whyWrong: 'Das erste Minus steht zwischen zwei Zahlen. Es ist ein Rechenzeichen.' },
    ]),
    hints: [BOTH_MEANINGS, 'Die Klammer zeigt: Dieses Minus gehört zur Zahl.'],
    steps: ['Das Minus zwischen den Zahlen ist das Rechenzeichen.', `Das Minus in der Klammer ist das Vorzeichen von ${b}.`],
    praise: 'Du hast beide Bedeutungen des Minus erklärt.',
    srText: say(prompt),
    kmk: ['PK.argumentieren'],
  };
}

// ─── Stufe 2: subtraction as addition ────────────────────────────────────────

function rewriteDirect(rng: Rng): Form {
  const a = rng.int(2, 20);
  const b = rng.int(2, 20);
  const prompt = 'Schreib die Aufgabe als Plusaufgabe.';
  const expression = `${a} − ${b} = ${a} + ${BOX}`;
  return {
    key: `direkt:${a}:${b}`,
    prompt,
    expression,
    answer: signedNumber(-b),
    hints: [GEGENZAHL_HINT, `Wie heißt die Zahl ${GEGENZAHL_NEAR}, andere Seite von ${b}?`],
    steps: [`Die Gegenzahl von ${b} ist ${fmt(-b)}: ${GEGENZAHL_NEAR}.`, `${a} − ${b} = ${a} + (${fmt(-b)})`],
    bugs: numberBugs([bug('gegenzahl-vergessen', b, `Prüfe mit der Zahlengeraden: Minus ${b} geht nach links.`)], -b, true),
    praise: 'Du hast aus Minus eine Plusaufgabe gemacht.',
    srText: say(prompt, expression),
  };
}

function rewriteHarder(rng: Rng): Form {
  const a = rng.int(2, 60) * (rng.chance(0.4) ? -1 : 1);
  const b = rng.int(2, 60);
  const kind = rng.int(0, 2);
  const prompt = kind === 2 ? 'Schreib die Aufgabe als Minusaufgabe.' : 'Schreib die Aufgabe als Plusaufgabe.';
  const left = kind === 0 ? `${fmt(a)} − (${fmt(-b)})` : kind === 1 ? `${fmt(a)} − ${b}` : `${fmt(a)} + (${fmt(-b)})`;
  const right = kind === 2 ? `${fmt(a)} − ${BOX}` : `${fmt(a)} + ${BOX}`;
  const value = kind === 1 ? -b : b;
  const expression = `${left} = ${right}`;
  return {
    key: `schwerer:${kind}:${a}:${b}`,
    prompt,
    expression,
    answer: signedNumber(value),
    hints: [kind === 2 ? `Plus eine negative Zahl heißt: die Gegenzahl abziehen, ${GEGENZAHL_NEAR}.` : GEGENZAHL_HINT, 'Prüfe mit der Zahlengeraden die Richtung.'],
    steps: [`Die Gegenzahl von ${fmt(kind === 1 ? b : -b)} ist ${fmt(value)}: ${GEGENZAHL_NEAR}.`, `${left} = ${kind === 2 ? `${fmt(a)} − ${fmtSigned(value)}` : `${fmt(a)} + ${fmtSigned(value)}`}`],
    bugs: numberBugs([bug('gegenzahl-vergessen', -value, 'Prüfe mit der Zahlengeraden: Beide Seiten gehen in dieselbe Richtung.')], value, true),
    praise: 'Du hast Rechenzeichen und Vorzeichen zusammen geändert.',
    srText: say(prompt, expression),
  };
}

function rewriteAndCompute(rng: Rng): Form {
  const a = rng.int(-15, 15) || 6;
  const b = rng.int(2, 15);
  const negative = rng.chance(0.5);
  const sub = negative ? -b : b;
  const left = term(a, '−', sub);
  const r = a - sub;
  const prompt = 'Schreib als Plusaufgabe und rechne aus.';
  const fields = [
    { id: 'g', value: -sub, signed: true, before: `${left} = ${fmt(a)} +`, label: 'Gegenzahl' },
    { id: 'r', value: r, signed: true, before: '=', label: 'Ergebnis' },
  ];
  return {
    key: `rechnen:${a}:${sub}`,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [GEGENZAHL_HINT, 'Rechne dann auf der Zahlengeraden weiter.'],
    steps: [`Die Gegenzahl von ${fmt(sub)} ist ${fmt(-sub)}: ${GEGENZAHL_NEAR}.`, `${left} = ${fmt(a)} + ${fmtSigned(-sub)} = ${fmt(r)}`],
    bugs: multiBugs([
      bug('gegenzahl-vergessen', { g: sub, r: a + sub }, 'Gesucht ist die Zahl auf der anderen Seite der 0.'),
      bug('gegenzahl-vergessen', { g: sub, r }, 'Das Ergebnis stimmt. Prüfe die Zahl im ersten Feld.'),
    ], fields),
    praise: 'Du hast umgeschrieben und dann gerechnet.',
    srText: say(prompt, left),
  };
}

// ─── Stufe 3: a term without brackets ────────────────────────────────────────

/** The sign that stands after the brackets are gone. */
const flat = (p: Part): { op: Op; size: number } => {
  const positive = (p.op === '+') === (p.value > 0);
  return { op: positive ? '+' : '−', size: Math.abs(p.value) };
};

function flatText(first: number, parts: readonly { op: Op; size: number }[]): string {
  return [fmt(first), ...parts.flatMap((p) => [p.op, fmt(p.size)])].join(' ');
}

const ALL_WHY = 'Prüfe jedes Paar: Rechenzeichen und Vorzeichen werden zu einem Zeichen.';

function withoutBrackets(rng: Rng): Form {
  const first = rng.chance(0.5) ? -rng.int(2, 12) : rng.int(2, 12);
  const parts = bracketParts(rng, 2, 12);
  // with two equal sizes a wrong sign could give the right value
  if (Math.abs(parts[0].value) === Math.abs(parts[1].value)) parts[1].value += parts[1].value < 0 ? -1 : 1;
  const flats = parts.map(flat);
  const text = partsText(first, parts);
  const correct = flatText(first, flats);
  const flipped = (i: number) => flats.map((p, j) => (j === i ? { ...p, op: (p.op === '+' ? '−' : '+') as Op } : p));
  const prompt = 'Welcher Term hat keine Klammern und denselben Wert?';
  return {
    key: `ohne:${first}:${parts.map((p) => `${p.op === '+' ? 'p' : 'm'}${p.value}`).join(':')}`,
    prompt,
    expression: text,
    answer: makeChoice(rng, { label: correct }, [
      { label: flatText(first, flipped(0)), whyWrong: ALL_WHY },
      { label: flatText(first, flipped(1)), whyWrong: ALL_WHY },
      { label: flatText(first, flats.map((p) => ({ ...p, op: (p.op === '+' ? '−' : '+') as Op }))), whyWrong: ALL_WHY },
    ]),
    hints: ['Plus eine negative Zahl: Du schreibst minus.', 'Minus einer negativen Zahl: Du schreibst plus.'],
    steps: [...parts.filter((p) => p.value < 0).map((p) => `${p.op} ${fmtSigned(p.value)} wird zu ${flat(p).op} ${flat(p).size}`), `Ohne Klammern: ${correct}`],
    praise: 'Du hast aus zwei Zeichen eines gemacht.',
    srText: say(prompt, text),
  };
}

function computeWithout(rng: Rng): Form {
  const first = rng.chance(0.5) ? -rng.int(5, 60) : rng.int(5, 60);
  const parts = bracketParts(rng, 3, 40);
  const flats = parts.map(flat);
  const text = partsText(first, parts);
  const r = parts.reduce((sum, p) => apply(sum, p.op, p.value), first);
  const prompt = 'Lass die Klammern weg und rechne.';
  const expression = `${text} = ${BOX}`;
  const ignoreSigns = parts.reduce((sum, p) => apply(sum, p.op, Math.abs(p.value)), first);
  const firstAbs = parts.reduce((sum, p) => apply(sum, p.op, p.value), Math.abs(first));
  return {
    key: `rechnen:${first}:${parts.map((p) => `${p.op === '+' ? 'p' : 'm'}${p.value}`).join(':')}`,
    prompt,
    expression,
    answer: signedNumber(r),
    hints: ['Mach aus Rechenzeichen und Vorzeichen zuerst ein Zeichen.', 'Rechne dann von links nach rechts.'],
    steps: [`Ohne Klammern: ${flatText(first, flats)}`, `Von links nach rechts: ${flatText(first, flats)} = ${fmt(r)}`],
    bugs: numberBugs([
      bug('vorzeichen-ignoriert', ignoreSigns, 'Die Vorzeichen in den Klammern ändern das Rechenzeichen.'),
      first < 0 && bug('vorzeichen-vergessen', firstAbs, 'Prüfe die erste Zahl: Dort steht ein Minus.'),
    ], r, true),
    praise: 'Du hast den Term vereinfacht und dann gerechnet.',
    srText: say(prompt, expression),
  };
}

function withBrackets(rng: Rng): Form {
  const first = rng.chance(0.5) ? -rng.int(2, 15) : rng.int(2, 15);
  const b = rng.int(2, 15);
  const c = rng.int(2, 15);
  const flatTerm = `${fmt(first)} + ${b} − ${c}`;
  const value = first + b - c;
  const prompt = 'Welcher Term hat denselben Wert?';
  const options: { label: string; value: number }[] = [
    { label: `${fmt(first)} + ${b} − (${fmt(-c)})`, value: first + b + c },
    { label: `${fmt(first)} − ${b} + (${fmt(-c)})`, value: first - b - c },
    { label: `${fmt(first)} + (${fmt(-b)}) − (${fmt(-c)})`, value: first - b + c },
  ];
  return {
    key: `rueckwaerts:${first}:${b}:${c}`,
    prompt,
    expression: flatTerm,
    answer: makeChoice(rng, { label: `${fmt(first)} + ${b} + (${fmt(-c)})` }, options.filter((o) => o.value !== value).map((o) => ({ label: o.label, whyWrong: ALL_WHY }))),
    hints: ['Lass bei jedem Term die Klammern weg.', 'Vergleiche dann mit dem gegebenen Term.'],
    steps: [`Minus ${c} ist dasselbe wie plus (${fmt(-c)}).`, `${flatTerm} = ${fmt(first)} + ${b} + (${fmt(-c)})`],
    praise: 'Du hast den Term in beide Richtungen gelesen.',
    srText: say(prompt, flatTerm),
    kmk: ['PK.argumentieren'],
  };
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = {
  1: (rng, ab) => (ab === 1 ? markedMinus(rng) : ab === 2 ? countMinus(rng) : explainMinus(rng)),
  2: (rng, ab) => (ab === 1 ? rewriteDirect(rng) : ab === 2 ? rewriteHarder(rng) : rewriteAndCompute(rng)),
  3: (rng, ab) => (ab === 1 ? withoutBrackets(rng) : ab === 2 ? computeWithout(rng) : withBrackets(rng)),
};

export const vorzeichenSkill: SkillDef = {
  ...SKILL,
  title: 'Vorzeichen und Rechenzeichen',
  description: 'Du unterscheidest die beiden Bedeutungen des Minuszeichens.',
  stufen: { 1: 'In 5 − (−3): Welches Minus ist welches?', 2: 'Minus als Plus schreiben: 7 − 9 = 7 + (−9)', 3: 'Term ohne Klammern: −3 + 5 − 8' },
  kmk: [...KMK_RECHNEN, 'PK.argumentieren'],
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_RECHNEN, FORMS[stufe](rng, ab));
  },
};
