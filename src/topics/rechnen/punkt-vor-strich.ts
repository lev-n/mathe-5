/**
 * Punkt vor Strich (docs/research.md §6). Stufe 1: two operations up to 100. Stufe 2: three operations, choose the first step, write the steps. Stufe 3:
 * insert the operation signs that reach a target value. Terms come from the engine in ./common, so every wrong value computes from the wrong order.
 */
import { BOX, DIV, MINUS, TIMES, fmt } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, MultiField, Rng, SkillDef } from '../../core/types';
import { multiBugs, pickPerson, targetAb } from '../shared';
import { GETEILT, MAL, PLUS, SUB, attempt, exactWhole, firstStepOptions, item, reaches, solve, stepText, termSpeech, termSteps, termText, valueOf, wholeBugs, type Op, type Solved, type Tok } from './common';

const SKILL = { id: 'rechnen.punkt-vor-strich', topicId: 'rechnen' } as const;
const KMK = ['ZO.terme'];

const startsWithPunkt = (t: readonly Tok[]) => t[1] === TIMES || t[1] === DIV;

/**
 * A term from `make` that stays in whole numbers ≥ 0, is at most `max`, and where a wrong order gives another value: from left to right, or, with the Punkt
 * in front, the Strich first. A term with the Punkt in front stays in: without it, 'always the right sign first' would look like the rule.
 */
function term(make: () => Tok[], max: number, fallback: Tok[]): { toks: Tok[]; solved: Solved } {
  const toks = attempt<Tok[]>(
    () => {
      const t = make();
      const v = valueOf(t);
      return v !== null && v > 0 && v <= max && (startsWithPunkt(t) || valueOf(t, 'links') !== v) ? t : null;
    },
    () => fallback,
  );
  return { toks, solved: solve(toks)! };
}

const firstPunktHint = (solved: Solved) => `Punkt vor Strich: Rechne zuerst ${stepText(solved.steps[0])}.`;

const wrongOrderBug = (toks: Tok[], solved: Solved) => ({ id: 'links-nach-rechts', match: valueOf(toks, 'links') ?? -1, hint: firstPunktHint(solved) });

/** 'b · c + d' with the Strich first: b · (c + d). null: another shape, or no whole value. */
function strichFirst(toks: readonly Tok[]): number | null {
  return toks.length === 5 && startsWithPunkt(toks) ? valueOf([toks[0], toks[1], '(', toks[2], toks[3], toks[4], ')']) : null;
}

const strichFirstBug = (toks: Tok[], solved: Solved) => ({ id: 'strich-zuerst', match: strichFirst(toks) ?? -1, hint: firstPunktHint(solved) });

/** A term to work out: number answer. */
function numberItem(stufe: 1 | 2, ab: Ab, toks: Tok[], solved: Solved): Exercise {
  const text = termText(toks);
  const expression = `${text} = ${BOX}`;
  const prompt = 'Achte auf die Reihenfolge. Rechne dann den Term aus.';
  return item(SKILL, stufe, {
    key: `wert:${text}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: solved.value, label: 'Ergebnis' },
    hints: ['Mal und Geteilt kommen vor Plus und Minus.', firstPunktHint(solved)],
    steps: termSteps(solved),
    bugs: wholeBugs([wrongOrderBug(toks, solved), strichFirstBug(toks, solved)], solved.value),
    praise: `Du hast zuerst ${stepText(solved.steps[0])} gerechnet.`,
    srText: `${prompt} ${termSpeech(expression)}.`,
    kmk: KMK,
  });
}

// ─── Stufe 1: two operations, up to 100 ──────────────────────────────────────

function directTerm(rng: Rng): Tok[] {
  const [b, c] = [rng.int(2, 9), rng.int(2, 9)];
  return rng.chance(0.6) ? [rng.int(2, 40), PLUS, b, MAL, c] : [b, MAL, c, PLUS, rng.int(2, 40)];
}

function lessDirectTerm(rng: Rng): Tok[] {
  const [b, c] = [rng.int(2, 9), rng.int(2, 9)];
  const product = b * c;
  switch (rng.int(0, 4)) {
    case 0:
      return [rng.int(product + 1, 95), SUB, b, MAL, c];
    case 1:
      return [rng.int(2, 60), PLUS, product, GETEILT, c];
    case 2:
      return [rng.int(b + 1, 90), SUB, product, GETEILT, c];
    case 3:
      return [product, GETEILT, c, PLUS, rng.int(2, 60)];
    default:
      return [b, MAL, c, SUB, rng.int(2, product - 1)];
  }
}

/** One number of the term is missing: undo the Strich first, then the Punkt. */
function missingFactor(rng: Rng, ab: Ab): Exercise {
  // at most 19 + 9 · 9 = 100
  const a = rng.int(3, 19);
  const [b, c] = [rng.int(3, 9), rng.int(3, 9)];
  const v = a + b * c;
  const front = rng.chance(0.5);
  const expression = front ? `${BOX} ${TIMES} ${c} + ${a} = ${v}` : `${a} + ${BOX} ${TIMES} ${c} = ${v}`;
  const prompt = 'Welche Zahl fehlt?';
  return item(SKILL, 1, {
    key: front ? `luecke:${b}*${c}+${a}` : `luecke:${a}+${b}*${c}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: b, label: 'Fehlende Zahl' },
    hints: [`Das Produkt und ${a} ergeben zusammen ${v}. Wie groß ist das Produkt?`, `Teile das Produkt dann durch ${c}.`],
    steps: [`Das Produkt ist ${v} ${MINUS} ${a} = ${b * c}.`, `${b * c} : ${c} = ${b}.`, `Probe: ${front ? `${b} ${TIMES} ${c} + ${a}` : `${a} + ${b} ${TIMES} ${c}`} = ${v}. Es fehlt die ${b}.`],
    bugs: wholeBugs([
      // 'a + □' first, then · c: the wrong order, backwards
      !front && v % c === 0 && { id: 'links-nach-rechts', match: v / c - a, hint: `Punkt vor Strich: Das Produkt gehört zusammen. Zieh zuerst ${a} ab.` },
      // 'c + a' first, then □ · that: the Strich first, backwards
      front && v % (c + a) === 0 && { id: 'strich-zuerst', match: v / (c + a), hint: `Punkt vor Strich: Das Produkt gehört zusammen. Zieh zuerst ${a} ab.` },
    ], b),
    praise: 'Du hast den Term rückwärts gelesen.',
    srText: `${prompt} ${termSpeech(expression)}.`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Someone's result: from a wrong order, or worked out well. So "Ja" can be right too, and the child has to calculate. */
function judgeOthers(rng: Rng, ab: Ab): Exercise {
  const { toks, solved } = term(() => directTerm(rng), 100, [3, PLUS, 4, MAL, 5]);
  const wrong = strichFirst(toks) ?? valueOf(toks, 'links') ?? solved.value + 10;
  const holds = rng.chance(0.35);
  const claimed = holds ? solved.value : wrong;
  const who = pickPerson(rng).name;
  const expression = `${termText(toks)} = ${fmt(claimed)}`;
  const prompt = 'Stimmt das?';
  const others = [wrong, solved.value + 10, solved.value + 20].filter((n, i, all) => n !== solved.value && all.indexOf(n) === i).slice(0, 2);
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>(holds
    ? [{ label: `Ja, ${fmt(claimed)} stimmt.` }, ...others.map((n) => ({ label: `Nein, richtig ist ${fmt(n)}.`, whyWrong: firstPunktHint(solved) }))]
    : [{ label: `Nein, richtig ist ${fmt(solved.value)}.` }, { label: `Ja, ${fmt(claimed)} stimmt.`, whyWrong: firstPunktHint(solved) }, { label: `Nein, richtig ist ${fmt(claimed + 10)}.`, whyWrong: firstPunktHint(solved) }]);
  return item(SKILL, 1, {
    key: `stimmt:${termText(toks)}:${claimed}`,
    ab,
    context: `${who} rechnet so.`,
    prompt,
    expression,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Mal und Geteilt kommen vor Plus und Minus.', firstPunktHint(solved)],
    steps: termSteps(solved),
    praise: 'Du hast Punkt vor Strich beachtet.',
    srText: `${who} rechnet so: ${termSpeech(expression)}. ${prompt}`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 3) return rng.chance(0.5) ? missingFactor(rng, ab) : judgeOthers(rng, ab);
  const { toks, solved } = term(() => (ab === 1 ? directTerm(rng) : lessDirectTerm(rng)), 100, ab === 1 ? [3, PLUS, 4, MAL, 5] : [40, SUB, 3, MAL, 5]);
  return numberItem(1, ab, toks, solved);
}

// ─── Stufe 2: three operations ───────────────────────────────────────────────

/** Three operations with one Punkt: the term of a "first step" question, since only one step comes first. */
function onePunkt(rng: Rng, big: boolean): Tok[] {
  const [b, c] = big ? [rng.int(6, 15), rng.int(4, 12)] : [rng.int(2, 9), rng.int(2, 9)];
  const product = b * c;
  const a = rng.int(5, big ? 200 : 60);
  const d = rng.int(2, big ? 90 : 30);
  switch (rng.int(0, 4)) {
    case 0:
      return [a, PLUS, b, MAL, c, SUB, d];
    case 1:
      return [a + product, SUB, b, MAL, c, PLUS, d];
    case 2:
      return [a, PLUS, product, GETEILT, c, SUB, d];
    case 3:
      return [b, MAL, c, PLUS, a, SUB, d];
    default:
      return [a + d, SUB, d, PLUS, b, MAL, c];
  }
}

/** Three operations with two Punkt steps. */
function twoPunkt(rng: Rng, big: boolean): Tok[] {
  const top = big ? 15 : 9;
  const [a, b, c, d] = [rng.int(2, top), rng.int(2, top), rng.int(2, top), rng.int(2, top)];
  switch (rng.int(0, 2)) {
    case 0:
      return [a, MAL, b, PLUS, c, MAL, d];
    case 1:
      return [a * b, GETEILT, b, PLUS, c, MAL, d];
    default:
      return [c * d + a * b, SUB, a, MAL, b, PLUS, c];
  }
}

const opWord = (t: Tok) => (t === TIMES ? 'Mal' : t === DIV ? 'Geteilt' : t === '+' ? 'Plus' : 'Minus');

/** "Was rechnest du zuerst, und was kommt heraus?": choose the step, and the calculation to its end, as finding the one Punkt sign alone asks less than Stufe 1. */
function firstStep(rng: Rng, ab: Ab): Exercise {
  const { toks, solved } = term(() => onePunkt(rng, false), 300, [12, PLUS, 3, MAL, 4, SUB, 5]);
  const options = firstStepOptions(rng, toks, solved, (op) => `${opWord(op)} kommt später. Punkt vor Strich.`);
  const text = termText(toks);
  const prompt = 'Was rechnest du zuerst, und was kommt heraus?';
  return item(SKILL, 2, {
    key: `zuerst:${text}`,
    ab,
    prompt,
    expression: text,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Mal und Geteilt kommen vor Plus und Minus.', 'Rechne den Term danach zu Ende.'],
    steps: termSteps(solved),
    praise: 'Du hast die Punktrechnung gefunden und zu Ende gerechnet.',
    srText: `${prompt} ${termSpeech(text)}.`,
    kmk: KMK,
  });
}

/** Write the steps: every step in its own field. */
function writeSteps(rng: Rng, ab: Ab, big: boolean): Exercise {
  const { toks, solved } = term(() => (rng.chance(0.5) ? onePunkt(rng, big) : twoPunkt(rng, big)), 900, [12, PLUS, 3, MAL, 4, SUB, 5]);
  const text = termText(toks);
  const labels = ['Zuerst:', 'Dann:', 'Ergebnis:'];
  const fields: MultiField[] = solved.steps.map((s, i) => ({ id: `s${i}`, value: s.value, before: labels[i], label: labels[i].replace(':', '') }));
  const prompt = 'Schreib jeden Schritt auf. Geht beides, fang links an.';
  const wrong = valueOf(toks, 'links');
  return item(SKILL, 2, {
    key: `schritte:${text}`,
    ab,
    prompt,
    expression: text,
    answer: { kind: 'multi', fields },
    hints: ['Rechne Mal und Geteilt zuerst, von links nach rechts.', 'Rechne Plus und Minus zum Schluss, auch von links nach rechts.'],
    steps: termSteps(solved),
    bugs: multiBugs([
      wrong !== null && wrong !== solved.value && { id: 'links-nach-rechts', match: { s2: wrong }, hint: firstPunktHint(solved) },
    ], fields),
    praise: 'Du hast jeden Schritt sauber aufgeschrieben.',
    srText: `${prompt} ${termSpeech(text)}.`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

/** Someone's steps, one of them breaks Punkt vor Strich: choose the step. */
function findStep(rng: Rng, ab: Ab): Exercise {
  const [a, b, c, d] = attempt<number[]>(
    () => {
      const ns = [rng.int(2, 9), rng.int(2, 9), rng.int(2, 9), rng.int(2, 9)];
      return new Set(ns).size === 4 ? ns : null;
    },
    () => [3, 4, 5, 6],
  );
  const toks: Tok[] = [a, MAL, b, PLUS, c, MAL, d];
  const solved = solve(toks)!;
  // step 1: b + c first; step 2: (a · b) + c before · d
  const wrongAt = rng.int(1, 2);
  const lines = wrongAt === 1
    ? [termText(toks), `${a} ${TIMES} ${b + c} ${TIMES} ${d}`, `${a * (b + c)} ${TIMES} ${d}`, fmt(a * (b + c) * d)]
    : [termText(toks), `${a * b} + ${c} ${TIMES} ${d}`, `${a * b + c} ${TIMES} ${d}`, fmt((a * b + c) * d)];
  const who = pickPerson(rng).name;
  const prompt = 'Welcher Schritt stimmt nicht?';
  const options: ChoiceOption[] = [1, 2, 3].map((i) => (i === wrongAt ? { label: `Von Zeile ${i} zu Zeile ${i + 1}` } : { label: `Von Zeile ${i} zu Zeile ${i + 1}`, whyWrong: i < wrongAt ? 'Dieser Schritt stimmt: Punkt kommt vor Strich.' : 'Dieser Schritt ist richtig gerechnet. Der Fehler liegt weiter oben.' }));
  return item(SKILL, 2, {
    key: `schritt-fehler:${termText(toks)}:${wrongAt}`,
    ab,
    context: `${who} rechnet so.`,
    prompt,
    visual: { type: 'term', lines },
    answer: { kind: 'choice', options, correct: wrongAt - 1 },
    hints: ['Vergleiche immer zwei Zeilen untereinander.', 'Solange noch ein Mal dasteht, kommt kein Plus dran.'],
    steps: [`In Zeile ${wrongAt + 1} kommt Plus vor einem Mal dran.`, ...termSteps(solved)],
    praise: 'Du hast den Schritt mit dem Fehler gefunden.',
    srText: `${who} rechnet so: ${lines.map(termSpeech).join(', dann ')}. ${prompt}`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) {
    const { toks, solved } = term(() => onePunkt(rng, false), 300, [12, PLUS, 3, MAL, 4, SUB, 5]);
    return numberItem(2, ab, toks, solved);
  }
  if (ab === 2) return rng.chance(0.5) ? firstStep(rng, ab) : writeSteps(rng, ab, false);
  return rng.chance(0.5) ? findStep(rng, ab) : writeSteps(rng, ab, true);
}

// ─── Stufe 3: signs to a target value ────────────────────────────────────────

const OPS: readonly Op[] = [PLUS, SUB, MAL, GETEILT];

/** All ways to put signs between the numbers. */
function allSigns(gaps: number): Op[][] {
  if (gaps === 0) return [[]];
  return allSigns(gaps - 1).flatMap((rest) => OPS.map((op) => [op, ...rest]));
}

/** numbers[0] op[0] numbers[1] … */
function joined(numbers: readonly number[], ops: readonly Op[]): Tok[] {
  return numbers.flatMap((n, i): Tok[] => (i < ops.length ? [n, ops[i]] : [n]));
}

/** Signs for the numbers that reach a value no other signs reach: exactly, also where a step goes below 0 or leaves a Rest. */
function signsPuzzle(rng: Rng, count: number, top: number): { numbers: number[]; ops: Op[]; target: number } {
  return attempt(
    () => {
      const numbers = Array.from({ length: count }, () => rng.int(2, top));
      const ops = Array.from({ length: count - 1 }, () => rng.pick(OPS));
      if (!ops.some((o) => o === TIMES || o === DIV) || !ops.some((o) => o === '+' || o === MINUS)) return null;
      const target = valueOf(joined(numbers, ops));
      if (target === null || target === 0) return null;
      const reaching = allSigns(count - 1).filter((o) => reaches(joined(numbers, o), target));
      return reaching.length === 1 ? { numbers, ops, target } : null;
    },
    () => ({ numbers: [4, 6, 3], ops: [PLUS, MAL], target: 22 }),
  );
}

/** What these signs give, for the feedback. */
function whatItGives(toks: Tok[]): string {
  const v = exactWhole(toks);
  return v === null || v < 0 ? 'Mit diesen Zeichen geht die Rechnung nicht auf. Rechne Punkt vor Strich.' : `Mit diesen Zeichen kommt ${fmt(v)} heraus. Rechne Punkt vor Strich.`;
}

function signsItem(rng: Rng, ab: Ab): Exercise {
  const count = ab === 1 ? 3 : ab === 2 ? 3 : 4;
  const { numbers, ops, target } = signsPuzzle(rng, count, ab === 1 ? 9 : 12);
  const toks = joined(numbers, ops);
  // one gap on AB I, as the other sign stands in the task; more gaps ask more
  const fixedAt = ab === 1 ? rng.int(0, 1) : -1;
  const gapsShown = numbers.map((n, i) => (i < ops.length ? `${fmt(n)} ${i === fixedAt ? ops[i] : BOX} ` : fmt(n))).join('');
  const expression = `${gapsShown} = ${fmt(target)}`;
  const others = allSigns(count - 1).filter((o) => o.join() !== ops.join() && (fixedAt < 0 || o[fixedAt] === ops[fixedAt]));
  // the signs that reach the target from left to right are the telling option
  const trap = others.filter((o) => valueOf(joined(numbers, o), 'links') === target);
  const wrong = [...trap, ...rng.shuffle(others)].filter((o, i, all) => all.findIndex((x) => x.join() === o.join()) === i).slice(0, 3);
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>([
    { label: termText(toks) },
    ...wrong.map((o) => ({ label: termText(joined(numbers, o)), whyWrong: whatItGives(joined(numbers, o)) })),
  ]);
  const prompt = ab === 1 ? 'Welches Zeichen gehört in die Lücke?' : 'Welche Zeichen gehören in die Lücken?';
  const solved = solve(toks)!;
  return item(SKILL, 3, {
    key: `zeichen:${numbers.join('_')}:${ops.join('')}:${fixedAt}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Probiere die Zeichen aus. Rechne immer Punkt vor Strich.', `Rechne jede Möglichkeit aus. Welche ergibt ${fmt(target)}?`],
    steps: termSteps(solved),
    praise: 'Du hast die Zeichen ausprobiert und richtig gerechnet.',
    srText: `${prompt} ${termSpeech(expression)}.`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

export const punktVorStrichSkill: SkillDef = {
  ...SKILL,
  title: 'Punkt vor Strich',
  description: 'Du weißt, was du zuerst rechnest.',
  stufen: {
    1: 'Zwei Rechenzeichen bis 100',
    2: 'Drei Rechenzeichen, ersten Schritt wählen und Schritte aufschreiben',
    3: 'Rechenzeichen einsetzen und einen Zielwert erreichen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return stufe1(rng, ab);
    if (stufe === 2) return stufe2(rng, ab);
    return signsItem(rng, ab);
  },
};
