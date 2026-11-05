/**
 * Klammern (docs/research.md §6). Stufe 1: one bracket first, (8 + 4) · 3, with one-digit divisors at most. Stufe 2: a bracket plus Punkt vor Strich, 40 − (12 − 5);
 * from AB II on three signs with a Punkt, and every form calculates. Stufe 3: nested brackets, and set brackets to make a statement true. Terms come from the engine
 * in ./common, so every wrong value computes from the wrong order.
 */
import { BOX, MINUS, TIMES, fmt } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, MultiField, Rng, SkillDef } from '../../core/types';
import { multiBugs, targetAb } from '../shared';
import { GETEILT, MAL, PLUS, SUB, attempt, exactWhole, firstStepOptions, item, reaches, solve, stepText, termSpeech, termSteps, termText, valueOf, wholeBugs, withoutBrackets, type Solved, type Tok } from './common';

const SKILL = { id: 'rechnen.klammern', topicId: 'rechnen' } as const;
const KMK = ['ZO.terme'];

/** A term that stays in whole numbers ≥ 0, at most `max`, whose bracket really changes the value. */
function term(make: () => Tok[], max: number, fallback: Tok[]): { toks: Tok[]; solved: Solved } {
  const toks = attempt<Tok[]>(
    () => {
      const t = make();
      const v = valueOf(t);
      return v !== null && v > 0 && v <= max && valueOf(withoutBrackets(t)) !== v ? t : null;
    },
    () => fallback,
  );
  return { toks, solved: solve(toks)! };
}

/**
 * The hint for a bracket left out: a Minus in front of it is its own misconception (§5). Only the value of the whole bracket is taken away, so a bracket of more
 * than one step is worked out to its end first, and a term that goes on after the bracket keeps the plain hint.
 */
function bracketHint(toks: readonly Tok[], solved: Solved): string {
  const first = stepText(solved.steps[0]);
  const before = solved.steps.slice(0, -1);
  if (toks[toks.indexOf('(') - 1] !== MINUS || !before.every((s) => s.bracket)) return `Die Klammer kommt zuerst: ${first}.`;
  return before.length > 1 ? `Rechne die ganze Klammer aus, zuerst ${first}. Zieh dann ihren Wert ab.` : `Rechne erst ${first}. Zieh dann das Ergebnis ab.`;
}

/** The term's typical wrong values. */
function termBugs(toks: Tok[], solved: Solved): Bug[] {
  const bare = valueOf(withoutBrackets(toks));
  const minusBefore = toks[toks.indexOf('(') - 1] === MINUS;
  const left = valueOf(toks, 'links');
  return [
    ...(bare === null ? [] : [{ id: minusBefore ? 'minus-klammer' : 'klammer-ignoriert', match: bare, hint: bracketHint(toks, solved) }]),
    ...(left === null ? [] : [{ id: 'nur-klammer', match: left, hint: 'Nach der Klammer gilt weiter: Punkt vor Strich.' }]),
  ];
}

function numberItem(stufe: 1 | 2 | 3, ab: Ab, toks: Tok[], solved: Solved, nested = false): Exercise {
  const text = termText(toks);
  const expression = `${text} = ${BOX}`;
  const prompt = nested ? 'Rechne. Fang bei der inneren Klammer an.' : 'Rechne. Die Klammer kommt zuerst.';
  return item(SKILL, stufe, {
    key: `wert:${text}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: solved.value, label: 'Ergebnis' },
    hints: [nested ? 'Such die innere Klammer. Dort fängst du an.' : 'Such die Klammer und rechne dort zuerst.', bracketHint(toks, solved)],
    steps: termSteps(solved, nested),
    bugs: wholeBugs(termBugs(toks, solved), solved.value),
    praise: nested ? 'Du hast von innen nach außen gerechnet.' : 'Du hast zuerst die Klammer gerechnet.',
    srText: `${prompt} ${termSpeech(expression)}.`,
    kmk: KMK,
  });
}

// ─── Stufe 1: one bracket ────────────────────────────────────────────────────

/** AB II takes larger numbers and a Geteilt, but keeps a one-digit divisor: a division by 11 or a three-digit sum would ask more than Stufe 2. */
function oneBracket(rng: Rng, big: boolean): Tok[] {
  const [a, b] = big ? [rng.int(2, 25), rng.int(2, 25)] : [rng.int(2, 12), rng.int(2, 12)];
  const c = rng.int(2, 9);
  if (!big) return rng.pick<Tok[]>([['(', a, PLUS, b, ')', MAL, c], [c, MAL, '(', a, PLUS, b, ')'], ['(', a + b, SUB, b, ')', MAL, c]]);
  const [x, y] = [rng.int(2, 9), rng.int(2, 9)];
  return rng.pick<Tok[]>([
    [c, MAL, '(', a + b, SUB, b, ')'],
    ['(', x * c, PLUS, y * c, ')', GETEILT, c],
    ['(', (x + y) * c, SUB, y * c, ')', GETEILT, c],
    ['(', a, PLUS, b, ')', MAL, c],
  ]);
}

/** One number inside the bracket is missing. */
function missingInBracket(rng: Rng, ab: Ab): Exercise {
  const [a, b] = [rng.int(3, 25), rng.int(3, 25)];
  const c = rng.int(2, 9);
  const v = (a + b) * c;
  const expression = `(${a} + ${BOX}) ${TIMES} ${c} = ${fmt(v)}`;
  const prompt = 'Welche Zahl fehlt?';
  return item(SKILL, 1, {
    key: `luecke:${a}+${b}*${c}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: b, label: 'Fehlende Zahl' },
    hints: [`Teile ${fmt(v)} durch ${c}. So groß ist die Klammer.`, `In der Klammer steht ${a} plus die fehlende Zahl.`],
    steps: [`Die Klammer hat den Wert ${fmt(v)} : ${c} = ${a + b}.`, `${a + b} ${MINUS} ${a} = ${b}.`, `Probe: (${a} + ${b}) ${TIMES} ${c} = ${fmt(v)}. Es fehlt die ${b}.`],
    bugs: wholeBugs([
      // the bracket ignored while going backwards: a + □ · c
      v > a && (v - a) % c === 0 && { id: 'klammer-ignoriert', match: (v - a) / c, hint: `Die Klammer gehört zusammen. Teile zuerst ${fmt(v)} durch ${c}.` },
    ], b),
    praise: 'Du hast den Term von außen nach innen gelesen.',
    srText: `${prompt} ${termSpeech(expression)}.`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** "Welcher Term hat diesen Wert?": the same numbers, with and without a bracket. Any of the terms can be the one asked for, so that the shape gives nothing away. */
function whichTerm(rng: Rng, ab: Ab): Exercise {
  const forms = (a: number, b: number, c: number): Tok[][] => [['(', a, PLUS, b, ')', MAL, c], [a, PLUS, b, MAL, c], [a, MAL, '(', b, PLUS, c, ')'], [a, PLUS, '(', b, PLUS, c, ')']];
  const all = attempt<Tok[][]>(
    () => {
      const terms = forms(rng.int(2, 15), rng.int(2, 15), rng.int(2, 9));
      return new Set(terms.map((t) => valueOf(t))).size === terms.length ? terms : null;
    },
    () => forms(8, 4, 3),
  );
  // the last form is the plain sum: nothing to tell apart, so it stays a wrong option
  const toks = rng.pick(all.slice(0, 3));
  const solved = solve(toks)!;
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>(all.map((t) => (t === toks ? { label: termText(t) } : { label: termText(t), whyWrong: `Dieser Term hat den Wert ${fmt(valueOf(t)!)}.` })));
  const prompt = `Welcher Term hat den Wert ${fmt(solved.value)}?`;
  return item(SKILL, 1, {
    key: `welcher:${termText(toks)}`,
    ab,
    prompt,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Rechne jeden Term aus. Die Klammer kommt zuerst.', 'Ohne Klammer gilt Punkt vor Strich.'],
    steps: termSteps(solved),
    praise: 'Du hast die Terme genau verglichen.',
    srText: prompt,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 3) return rng.chance(0.5) ? missingInBracket(rng, ab) : whichTerm(rng, ab);
  const { toks, solved } = term(() => oneBracket(rng, ab === 2), 500, ['(', 8, PLUS, 4, ')', MAL, 3]);
  return numberItem(1, ab, toks, solved);
}

// ─── Stufe 2: bracket plus Punkt vor Strich ──────────────────────────────────

function bracketAndPunkt(rng: Rng): Tok[] {
  const [b, c, d] = [rng.int(2, 9), rng.int(3, 12), rng.int(2, 9)];
  const a = rng.int(5, 60);
  return rng.pick<Tok[]>([
    [a, PLUS, b, MAL, '(', c, PLUS, d, ')'],
    [a, PLUS, b, MAL, '(', c + d, SUB, d, ')'],
    ['(', a, PLUS, c, ')', MAL, b, PLUS, d],
    ['(', a, PLUS, c, ')', MAL, b, SUB, d],
    [a + c + d, SUB, '(', c + d, SUB, d, ')'],
    [a + c + d, SUB, '(', c, PLUS, d, ')'],
  ]);
}

/** Three signs with a Punkt, also with a Minus before the bracket: more steps than the one bracket of Stufe 1. */
function threeSigns(rng: Rng): Tok[] {
  const [b, c, d] = [rng.int(2, 9), rng.int(3, 12), rng.int(2, 9)];
  const a = rng.int(5, 60);
  return rng.pick<Tok[]>([
    [a, PLUS, b, MAL, '(', c, PLUS, d, ')'],
    [a + b * c, SUB, b, MAL, '(', c + d, SUB, d, ')'],
    ['(', a, PLUS, c, ')', MAL, b, SUB, d],
    [a + b * c, SUB, '(', c + d, SUB, d, ')', MAL, b],
    [a + b * c + d, SUB, '(', b, MAL, c, PLUS, d, ')'],
  ]);
}

function harder(rng: Rng): Tok[] {
  const [a, b, c, d] = [rng.int(12, 40), rng.int(3, 12), rng.int(3, 12), rng.int(2, 9)];
  return rng.pick<Tok[]>([
    ['(', a, PLUS, b, ')', MAL, '(', c + d, SUB, d, ')'],
    [a + b * c, SUB, b, MAL, '(', c + d, SUB, d, ')'],
    ['(', a * d, PLUS, b * d, ')', GETEILT, d, PLUS, c],
  ]);
}

/** "Was rechnest du zuerst, und was kommt heraus?": the bracket, also when a Punkt stands beside it, and the calculation to its end. */
function firstStep(rng: Rng, ab: Ab): Exercise {
  const { toks, solved } = term(() => threeSigns(rng), 400, [12, PLUS, 3, MAL, '(', 4, PLUS, 5, ')']);
  const options = firstStepOptions(rng, toks, solved, () => 'Schau zuerst in die Klammer. Dort gilt Punkt vor Strich.');
  const text = termText(toks);
  const prompt = 'Was rechnest du zuerst, und was kommt heraus?';
  return item(SKILL, 2, {
    key: `zuerst:${text}`,
    ab,
    prompt,
    expression: text,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Klammern gehen vor. Das gilt auch vor Mal und Geteilt.', 'Rechne den Term danach zu Ende.'],
    steps: termSteps(solved),
    praise: 'Du hast mit der Klammer begonnen und zu Ende gerechnet.',
    srText: `${prompt} ${termSpeech(text)}.`,
    kmk: KMK,
  });
}

/** Write the steps: every step in its own field. Two brackets side by side have no first one, so their fields say which bracket they mean. */
function writeSteps(ab: Ab, make: () => Tok[]): Exercise {
  const { toks, solved } = term(make, 900, [12, PLUS, 3, MAL, '(', 4, PLUS, 5, ')']);
  const twoBrackets = toks.filter((t) => t === '(').length === 2;
  const labels = solved.steps.map((_, i) => (i === solved.steps.length - 1 ? 'Ergebnis:' : twoBrackets ? (i === 0 ? 'Linke Klammer:' : 'Rechte Klammer:') : i === 0 ? 'Zuerst:' : 'Dann:'));
  const fields: MultiField[] = solved.steps.map((s, i) => ({ id: `s${i}`, value: s.value, before: labels[i], label: labels[i].replace(':', '') }));
  const last = `s${solved.steps.length - 1}`;
  const text = termText(toks);
  const prompt = 'Schreib jeden Schritt auf.';
  return item(SKILL, 2, {
    key: `schritte:${text}`,
    ab,
    prompt,
    expression: text,
    answer: { kind: 'multi', fields },
    hints: [twoBrackets ? 'Rechne zuerst beide Klammern.' : 'Rechne zuerst die Klammer.', 'Dann gilt weiter Punkt vor Strich.'],
    steps: termSteps(solved),
    bugs: multiBugs(termBugs(toks, solved).filter((b) => b.match !== solved.value).map((b) => ({ ...b, match: { [last]: b.match as number } })), fields),
    praise: 'Du hast jeden Schritt sauber aufgeschrieben.',
    srText: `${prompt} ${termSpeech(text)}.`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

/** How much a bracket changes the value of the same numbers. */
function bracketDifference(rng: Rng, ab: Ab): Exercise {
  const { toks, solved } = term(() => ['(', rng.int(5, 30), PLUS, rng.int(3, 20), ')', MAL, rng.int(3, 9)], 500, ['(', 8, PLUS, 4, ')', MAL, 3]);
  const bare = withoutBrackets(toks);
  const plain = solve(bare)!;
  const value = solved.value - plain.value;
  const prompt = 'Wie groß ist der Unterschied zwischen den beiden Werten?';
  const expression = `${termText(toks)} und ${termText(bare)}`;
  return item(SKILL, 2, {
    key: `unterschied:${termText(toks)}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, label: 'Unterschied' },
    hints: ['Rechne beide Terme getrennt aus.', 'Bilde dann die Differenz der beiden Werte.'],
    steps: [`Mit Klammer: ${termText(toks)} = ${fmt(solved.value)}.`, `Ohne Klammer: ${termText(bare)} = ${fmt(plain.value)}.`, `${fmt(solved.value)} ${MINUS} ${fmt(plain.value)} = ${fmt(value)}.`],
    bugs: wholeBugs([{ id: 'klammer-ignoriert', match: 0, hint: 'Die Klammer ändert die Reihenfolge. Rechne beide Terme aus.' }], value),
    praise: 'Du hast den Unterschied durch die Klammer berechnet.',
    srText: `${prompt} ${termSpeech(termText(toks))} und ${termSpeech(termText(bare))}.`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) {
    const { toks, solved } = term(() => bracketAndPunkt(rng), 400, [12, PLUS, 3, MAL, '(', 4, PLUS, 5, ')']);
    return numberItem(2, ab, toks, solved);
  }
  if (ab === 2) return rng.chance(0.5) ? firstStep(rng, ab) : writeSteps(ab, () => threeSigns(rng));
  const kind = rng.pick(['zahl', 'schritte', 'unterschied'] as const);
  if (kind === 'unterschied') return bracketDifference(rng, ab);
  if (kind === 'schritte') return writeSteps(ab, () => harder(rng));
  const { toks, solved } = term(() => harder(rng), 900, [12, PLUS, 3, MAL, '(', 4, PLUS, 5, ')']);
  return numberItem(2, ab, toks, solved);
}

// ─── Stufe 3: nested brackets, set brackets ──────────────────────────────────

function nested(rng: Rng, hard: boolean): Tok[] {
  const [a, b, c, d] = [rng.int(2, 9), rng.int(2, hard ? 15 : 9), rng.int(3, hard ? 15 : 9), rng.int(1, 3)];
  if (!hard) {
    return rng.pick<Tok[]>([
      [a, MAL, '(', b, PLUS, '(', c + d, SUB, d, ')', ')'],
      ['(', b, PLUS, '(', c + d, SUB, d, ')', ')', MAL, a],
      [a + b + c, SUB, '(', b, PLUS, '(', c + d, SUB, d, ')', ')'],
    ]);
  }
  return rng.pick<Tok[]>([
    [a, MAL, '(', b, PLUS, c, MAL, '(', a + d, SUB, d, ')', ')'],
    ['(', b, PLUS, a, MAL, '(', c + d, SUB, d, ')', ')', MAL, 2],
    [(a + b + c * d) * 3, SUB, 2, MAL, '(', a, PLUS, '(', b, PLUS, c * d, ')', ')'],
    [rng.int(20, 90) + a * (b + c), SUB, a, MAL, '(', b, PLUS, '(', c + d, SUB, d, ')', ')'],
  ]);
}

/** Every way to put one bracket around two or more neighbouring numbers, the whole term left out. */
function bracketPlacements(numbers: readonly number[], ops: readonly Tok[]): Tok[][] {
  const out: Tok[][] = [];
  for (let from = 0; from < numbers.length - 1; from++) {
    for (let to = from + 1; to < numbers.length; to++) {
      if (from === 0 && to === numbers.length - 1) continue;
      const toks: Tok[] = [];
      numbers.forEach((n, i) => {
        if (i === from) toks.push('(');
        toks.push(n);
        if (i === to) toks.push(')');
        if (i < ops.length) toks.push(ops[i]);
      });
      out.push(toks);
    }
  }
  return out;
}

/** "Wo gehört die Klammer hin?": exactly one placement reaches the value on the right, and the term without a bracket does not, also where a step goes below 0. */
function setBracket(rng: Rng, ab: Ab, count: number): Exercise {
  const { numbers, ops, placements, right } = attempt(
    () => {
      const ns = Array.from({ length: count }, () => rng.int(2, 9));
      const os = Array.from({ length: count - 1 }, () => rng.pick<Tok>([PLUS, SUB, MAL, MAL]));
      if (!os.includes(MAL) || !(os.includes(PLUS) || os.includes(SUB))) return null;
      const placed = bracketPlacements(ns, os);
      const all = placed.filter((t) => valueOf(t) !== null);
      if (all.length < 3) return null;
      const pick = rng.pick(all);
      const target = valueOf(pick);
      if (target === null || target === 0 || reaches(joinedBare(ns, os), target) || target > 2000) return null;
      return placed.filter((t) => reaches(t, target)).length === 1 ? { numbers: ns, ops: os, placements: all, right: pick } : null;
    },
    () => {
      const numbers = [3, 4, 5, 2];
      const ops: Tok[] = [PLUS, MAL, SUB];
      const right: Tok[] = ['(', 3, PLUS, 4, ')', MAL, 5, SUB, 2];
      const others: Tok[][] = [[3, PLUS, '(', 4, MAL, 5, ')', SUB, 2], [3, PLUS, 4, MAL, '(', 5, SUB, 2, ')']];
      return { numbers, ops, placements: [right, ...others], right };
    },
  );
  const target = valueOf(right)!;
  const bare = joinedBare(numbers, ops);
  const bareValue = exactWhole(bare);
  const expression = `${termText(bare)} = ${fmt(target)}`;
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>([
    { label: termText(right) },
    ...rng.shuffle(placements.filter((t) => t !== right)).slice(0, 4).map((t) => ({ label: termText(t), whyWrong: `Mit dieser Klammer kommt ${fmt(valueOf(t)!)} heraus.` })),
    { label: 'Es geht auch ohne Klammer.', whyWrong: bareValue === null || bareValue < 0 ? 'Ohne Klammer kommst du unter 0. Das passt nicht.' : `Ohne Klammer kommt ${fmt(bareValue)} heraus. Das passt nicht.` },
  ]);
  const prompt = 'Die Gleichung soll stimmen. Wo gehört die Klammer hin?';
  return item(SKILL, 3, {
    key: `setzen:${termText(right)}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Probiere jede Klammer aus und rechne den Term aus.', `Vergleiche jedes Ergebnis mit ${fmt(target)}.`],
    steps: termSteps(solve(right)!),
    praise: 'Du hast die Klammer an die passende Stelle gesetzt.',
    srText: `${prompt} ${termSpeech(expression)}.`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function joinedBare(numbers: readonly number[], ops: readonly Tok[]): Tok[] {
  return numbers.flatMap((n, i): Tok[] => (i < ops.length ? [n, ops[i]] : [n]));
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) {
    const { toks, solved } = term(() => nested(rng, false), 400, [3, MAL, '(', 4, PLUS, '(', 7, SUB, 2, ')', ')']);
    return numberItem(3, ab, toks, solved, true);
  }
  if (rng.chance(0.6)) return setBracket(rng, ab, ab === 2 ? 4 : 5);
  const { toks, solved } = term(() => nested(rng, true), 900, [3, MAL, '(', 4, PLUS, 2, MAL, '(', 7, SUB, 2, ')', ')']);
  return numberItem(3, ab, toks, solved, true);
}

export const klammernSkill: SkillDef = {
  ...SKILL,
  title: 'Klammern',
  description: 'Du rechnest Klammern zuerst und setzt selbst Klammern.',
  stufen: {
    1: 'Eine Klammer zuerst rechnen',
    2: 'Klammer und Punkt vor Strich, auch Minus vor der Klammer',
    3: 'Klammern in Klammern und selbst Klammern setzen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return stufe1(rng, ab);
    if (stufe === 2) return stufe2(rng, ab);
    return stufe3(rng, ab);
  },
};
