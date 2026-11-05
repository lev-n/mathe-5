/**
 * Alles zusammen (docs/research.md §6). Stufe 1: two operations, small integers, no brackets. Stufe 2: brackets and Punkt vor Strich, up to 100. Stufe 3: set
 * brackets for a target; work backwards.
 */
import { BOX, fmt, fmtSigned } from '../../core/format';
import type { Ab, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { makeChoice, multiBugs, numberBugs, pickPerson, signedNumber, targetAb } from '../shared';
import { assemble, bug, type Form, KMK_RECHNEN, say } from './helpers';

const SKILL = { id: 'ganzzahlen.terme', topicId: 'ganzzahlen' } as const;

const POINT_FIRST = 'Punkt vor Strich: Rechne zuerst das Mal oder das Geteilt.';
const BRACKET_FIRST = 'Die Klammer kommt zuerst.';

/** The term with its next step marked (F4), for a worked step. */
const nextStep = (term: string, part: string): VisualOf<'term'> => {
  const at = term.indexOf(part);
  return { type: 'term', lines: [term], highlight: [at, at + part.length] };
};

// ─── Stufe 1: two operations, no brackets ────────────────────────────────────

function pointForm(a: number, op: '+' | '−', b: number, c: number, keyPart: string, praise: string): Form {
  const product = b * c;
  const r = op === '+' ? a + product : a - product;
  const text = `${fmt(a)} ${op} ${b} · ${c}`;
  const prompt = 'Rechne. Punkt vor Strich.';
  const expression = `${text} = ${BOX}`;
  const leftToRight = (op === '+' ? a + b : a - b) * c;
  return {
    key: `${keyPart}:${a}:${op === '+' ? 'p' : 'm'}:${b}:${c}`,
    prompt,
    expression,
    answer: signedNumber(r),
    hints: [POINT_FIRST, `Rechne dann mit ${fmt(a)} weiter.`],
    steps: [{ text: `Zuerst: ${b} · ${c} = ${product}`, visual: nextStep(text, `${b} · ${c}`) }, `Dann: ${fmt(a)} ${op} ${product} = ${fmt(r)}`],
    bugs: numberBugs([
      bug('links-nach-rechts', leftToRight, `Punkt vor Strich: Rechne zuerst ${b} · ${c}.`),
      a < 0 && bug('vorzeichen-ignoriert', op === '+' ? -a + product : -a - product, `Prüfe den Start: Die erste Zahl ist ${fmt(a)}.`),
      bug('vorzeichen-vergessen', -r, 'Prüfe Plus oder Minus: Auf welcher Seite der 0 landest du?'),
    ], r, true),
    praise,
    srText: say(prompt, expression),
  };
}

function leadForm(b: number, c: number, op: '+' | '−', d: number): Form {
  const r = op === '+' ? -b * c + d : -b * c - d;
  const text = `${fmt(-b)} · ${c} ${op} ${d}`;
  const prompt = 'Rechne. Punkt vor Strich.';
  const expression = `${text} = ${BOX}`;
  return {
    key: `vorn:${b}:${c}:${op === '+' ? 'p' : 'm'}:${d}`,
    prompt,
    expression,
    answer: signedNumber(r),
    hints: [POINT_FIRST, 'Eine negative Zahl mal eine positive Zahl: Das Ergebnis ist negativ.'],
    steps: [{ text: `Zuerst: ${fmt(-b)} · ${c} = ${fmt(-b * c)}`, visual: nextStep(text, `${fmt(-b)} · ${c}`) }, `Dann: ${fmt(-b * c)} ${op} ${d} = ${fmt(r)}`],
    bugs: numberBugs([
      bug('regel-mal', op === '+' ? b * c + d : b * c - d, 'Eine negative Zahl mal eine positive Zahl: Das Ergebnis ist negativ.'),
      bug('links-nach-rechts', -b * (op === '+' ? c + d : c - d), `Punkt vor Strich: Rechne zuerst ${fmt(-b)} · ${c}.`),
    ], r, true),
    praise: 'Du hast zuerst das Mal mit dem Minus gerechnet.',
    srText: say(prompt, expression),
  };
}

function stufe1Direct(rng: Rng): Form {
  return pointForm(-rng.int(2, 9), '+', rng.int(2, 5), rng.int(2, 5), 'plus', 'Du hast Punkt vor Strich beachtet.');
}

function stufe1Harder(rng: Rng): Form {
  if (rng.chance(0.5)) {
    const start = rng.int(-9, 9) || 4;
    const b = rng.int(2, 6);
    const c = rng.int(2, 6);
    // a positive start stays below the product: '9 − 2 · 2' has natural numbers only
    return pointForm(start >= b * c ? -start : start, '−', b, c, 'minus', 'Du hast zuerst das Mal gerechnet.');
  }
  return leadForm(rng.int(2, 6), rng.int(2, 6), rng.chance(0.5) ? '+' : '−', rng.int(2, 9));
}

function stufe1Steps(rng: Rng): Form {
  const a = -rng.int(2, 9);
  const b = rng.int(2, 6);
  const c = rng.int(2, 6);
  const product = b * c;
  const r = a + product;
  const fields = [
    { id: 'p', value: product, signed: true, before: `${fmt(a)} + ${b} · ${c} = ${fmt(a)} +`, label: 'erster Schritt' },
    { id: 'r', value: r, signed: true, before: '=', label: 'Ergebnis' },
  ];
  return {
    key: `schritte:${a}:${b}:${c}`,
    prompt: 'Rechne in zwei Schritten.',
    answer: { kind: 'multi', fields },
    hints: [POINT_FIRST, `Rechne dann mit ${fmt(a)} weiter.`],
    steps: [{ text: `Zuerst: ${b} · ${c} = ${product}`, visual: nextStep(`${fmt(a)} + ${b} · ${c}`, `${b} · ${c}`) }, `Dann: ${fmt(a)} + ${product} = ${fmt(r)}`],
    bugs: multiBugs([
      bug('links-nach-rechts', { p: a + b, r: (a + b) * c }, `Punkt vor Strich: Rechne zuerst ${b} · ${c}.`),
      bug('vorzeichen-ignoriert', { p: product, r: -a + product }, `Der erste Schritt stimmt. Prüfe den Start: ${fmt(a)}.`),
    ], fields),
    praise: 'Du hast jeden Schritt einzeln aufgeschrieben.',
    srText: say('Rechne in zwei Schritten.', `${fmt(a)} + ${b} · ${c}`),
  };
}

function stufe1Missing(rng: Rng): Form {
  const a = -rng.int(2, 9);
  const b = rng.int(2, 6);
  const c = rng.int(2, 6);
  const r = a + b * c;
  const prompt = 'Welche Zahl gehört in die Lücke?';
  const expression = `${fmt(a)} + ${BOX} · ${c} = ${fmt(r)}`;
  return {
    key: `luecke:${a}:${b}:${c}`,
    prompt,
    expression,
    answer: signedNumber(b),
    hints: ['Das Mal-Ergebnis fehlt. Rechne zuerst: Was muss zu der ersten Zahl dazu?', `Teile dann durch ${c}.`],
    steps: [`${fmt(a)} + ${b * c} = ${fmt(r)}`, `${b * c} : ${c} = ${b}`, `In die Lücke gehört ${b}.`],
    bugs: numberBugs([
      Number.isInteger((r + a) / c) && bug('vorzeichen-ignoriert', (r + a) / c, `Prüfe mit der Probe: Die erste Zahl ist ${fmt(a)}.`),
      bug('nur-mal', b * c, `Das ist das Mal-Ergebnis. Teile es noch durch ${c}.`),
    ], b, true),
    praise: 'Du hast die Aufgabe rückwärts gelöst.',
    srText: say(prompt, expression),
    kmk: ['PK.problemloesen'],
  };
}

// ─── Stufe 2: brackets and Punkt vor Strich, up to 100 ───────────────────────

function pickBracket(rng: Rng): { a: number; b: number; inner: number } {
  const a = -rng.int(2, 12);
  const b = rng.int(2, 15);
  return a + b === 0 ? { a, b: b + 2, inner: a + b + 2 } : { a, b, inner: a + b };
}

function bracketDirect(rng: Rng): Form {
  const { a, b, inner } = pickBracket(rng);
  const c = rng.int(2, 6);
  const r = inner * c;
  const prompt = 'Rechne. Die Klammer kommt zuerst.';
  const expression = `(${fmt(a)} + ${b}) · ${c} = ${BOX}`;
  return {
    key: `klammer:${a}:${b}:${c}`,
    prompt,
    expression,
    answer: signedNumber(r),
    hints: [BRACKET_FIRST, `Rechne dann mal ${c}.`],
    steps: [{ text: `Klammer: ${fmt(a)} + ${b} = ${fmt(inner)}`, visual: nextStep(`(${fmt(a)} + ${b}) · ${c}`, `(${fmt(a)} + ${b})`) }, `Dann: ${fmtSigned(inner)} · ${c} = ${fmt(r)}`],
    bugs: numberBugs([
      bug('klammer-ignoriert', a + b * c, `${BRACKET_FIRST} Rechne ${fmt(a)} + ${b}.`),
      bug('vorzeichen-vergessen', -r, 'Prüfe den Wert der Klammer: positiv oder negativ?'),
    ], r, true),
    praise: 'Du hast zuerst die Klammer gerechnet.',
    srText: say(prompt, expression),
  };
}

function bracketAndPoint(rng: Rng): Form {
  const { a, b, inner } = pickBracket(rng);
  const c = rng.chance(0.5) ? rng.int(2, 5) : -rng.int(2, 5);
  const x = rng.chance(0.5) ? rng.int(2, 20) : -rng.int(2, 20);
  const r = x + inner * c;
  const prompt = 'Rechne. Denk an Klammer und Punkt vor Strich.';
  const expression = `${fmt(x)} + (${fmt(a)} + ${b}) · ${fmtSigned(c)} = ${BOX}`;
  return {
    key: `klammer-punkt:${x}:${a}:${b}:${c}`,
    prompt,
    expression,
    answer: signedNumber(r),
    hints: [BRACKET_FIRST, 'Nach der Klammer gilt weiter: Punkt vor Strich.'],
    steps: [{ text: `Klammer: ${fmt(a)} + ${b} = ${fmt(inner)}`, visual: nextStep(`${fmt(x)} + (${fmt(a)} + ${b}) · ${fmtSigned(c)}`, `(${fmt(a)} + ${b})`) }, `Mal: ${fmtSigned(inner)} · ${fmtSigned(c)} = ${fmt(inner * c)}`, `Dann: ${fmt(x)} + ${fmtSigned(inner * c)} = ${fmt(r)}`],
    bugs: numberBugs([
      bug('nur-klammer', (x + inner) * c, 'Nach der Klammer gilt weiter: Punkt vor Strich.'),
      bug('klammer-ignoriert', x + a + b * c, `${BRACKET_FIRST} Rechne ${fmt(a)} + ${b}.`),
      bug('regel-mal', x - inner * c, 'Prüfe Plus oder Minus beim Mal: Zähle die negativen Faktoren.'),
    ], r, true),
    praise: 'Du hast die Reihenfolge eingehalten.',
    srText: say(prompt, expression),
  };
}

function bracketSteps(rng: Rng): Form {
  const d = -rng.int(2, 6);
  const q = rng.int(2, 9) * (rng.chance(0.5) ? 1 : -1);
  const inner = q * d;
  const b = rng.int(2, 15);
  const a = inner - b;
  const e = rng.int(2, 15);
  const r = q - e;
  const text = `(${fmt(a)} + ${b}) : ${fmtSigned(d)} − ${e}`;
  const fields = [
    { id: 'k', value: inner, signed: true, before: 'Klammer:', label: 'Klammer' },
    { id: 'q', value: q, signed: true, before: 'Geteilt:', label: 'Geteilt' },
    { id: 'r', value: r, signed: true, before: 'Ergebnis:', label: 'Ergebnis' },
  ];
  const prompt = 'Rechne den Term. Schreib jeden Schritt auf.';
  return {
    key: `schritte:${a}:${b}:${d}:${e}`,
    prompt,
    expression: text,
    answer: { kind: 'multi', fields },
    hints: [BRACKET_FIRST, 'Teile dann und zieh zum Schluss ab.'],
    steps: [{ text: `Klammer: ${fmt(a)} + ${b} = ${fmt(inner)}`, visual: nextStep(text, `(${fmt(a)} + ${b})`) }, `Geteilt: ${fmtSigned(inner)} : ${fmtSigned(d)} = ${fmt(q)}`, `Ergebnis: ${fmt(q)} − ${e} = ${fmt(r)}`],
    bugs: multiBugs([
      bug('regel-mal', { k: inner, q: -q, r: -q - e }, 'Prüfe Plus oder Minus beim Geteilt: Zähle die negativen Zahlen.'),
      Number.isInteger((-a + b) / d) && bug('vorzeichen-ignoriert', { k: -a + b, q: (-a + b) / d, r: (-a + b) / d - e }, `Prüfe die Klammer: Die erste Zahl ist ${fmt(a)}.`),
    ], fields),
    praise: 'Du hast jeden Schritt einzeln gerechnet.',
    srText: say(prompt, text),
  };
}

// ─── Stufe 3: set brackets, work backwards ───────────────────────────────────

/** The first number is always negative: with a positive one this is a task of rechnen.klammern. A bracket is never 0, which would make the rest of the term pointless. */
function setBrackets(rng: Rng): Form {
  const a = -rng.int(2, 9);
  const raw = rng.int(2, 6);
  const b = a + raw === 0 ? raw + 1 : raw;
  const c = rng.int(3, 9);
  const d = rng.int(1, 2);
  const candidates = [
    { label: `(${fmt(a)} + ${b}) · ${c} − ${d}`, value: (a + b) * c - d },
    { label: `${fmt(a)} + ${b} · (${c} − ${d})`, value: a + b * (c - d) },
    { label: `(${fmt(a)} + ${b}) · (${c} − ${d})`, value: (a + b) * (c - d) },
    { label: `${fmt(a)} + ${b} · ${c} − ${d}`, value: a + b * c - d },
  ];
  const shown = candidates.filter((o, i) => candidates.findIndex((x) => x.value === o.value) === i);
  const target = rng.pick(shown.slice(0, Math.max(1, shown.length - 1)));
  const prompt = `Setz Klammern. Bei welchem Term kommt ${fmt(target.value)} heraus?`;
  const expression = candidates[3].label;
  const answer = makeChoice(rng, { label: target.label }, shown.filter((o) => o !== target).map((o) => ({ label: o.label, whyWrong: `Bei diesem Term kommt ${fmt(o.value)} heraus.` })));
  return {
    key: `setzen:${a}:${b}:${c}:${d}:${target.value}`,
    prompt,
    expression,
    answer,
    hints: ['Rechne jeden Term aus.', 'Klammer zuerst, dann Punkt vor Strich.'],
    steps: ['Rechne bei jedem Term zuerst die Klammer.', { text: `${target.label} = ${fmt(target.value)}`, visual: { type: 'term', lines: [target.label] } }],
    praise: 'Du hast die Klammern gezielt geprüft.',
    // the options differ only in their brackets: spoken here with the words for them
    srText: say(prompt, expression, ...answer.options.map((o) => o.label)),
    kmk: ['PK.problemloesen'],
  };
}

function backwardsBracket(rng: Rng): Form {
  const c = -rng.int(2, 6);
  const k = rng.int(2, 9) * (rng.chance(0.5) ? 1 : -1);
  const a = rng.int(2, 9);
  const x = k + a;
  const r = k * c;
  const prompt = 'Rechne rückwärts. Welche Zahl gehört in die Lücke?';
  const expression = `(${BOX} − ${a}) · ${fmtSigned(c)} = ${fmt(r)}`;
  return {
    key: `rueck:${x}:${a}:${c}`,
    prompt,
    expression,
    answer: signedNumber(x),
    hints: [`Was hebt mal ${fmtSigned(c)} auf?`, `Was hebt minus ${a} auf?`],
    steps: [{ text: `Zuerst geteilt: ${fmtSigned(r)} : ${fmtSigned(c)} = ${fmt(k)}`, visual: nextStep(`(${BOX} − ${a}) · ${fmtSigned(c)} = ${fmt(r)}`, `· ${fmtSigned(c)}`) }, `Dann plus: ${fmt(k)} + ${a} = ${fmt(x)}`, `In die Lücke gehört ${fmt(x)}.`],
    bugs: numberBugs([
      bug('nur-klammer', k, `Das ist der Wert der Klammer. Rechne noch plus ${a}.`),
      bug('umkehr-richtung', k - a, `Mach die Probe. Was hebt minus ${a} auf?`),
      bug('regel-mal', -k + a, 'Prüfe Plus oder Minus beim Teilen: Zähle die negativen Zahlen.'),
    ], x, true),
    praise: 'Du hast die Schritte rückwärts gerechnet.',
    srText: say(prompt, expression),
    kmk: ['PK.problemloesen'],
  };
}

function backwardsStory(rng: Rng): Form {
  const x = rng.int(2, 12) * (rng.chance(0.5) ? 1 : -1);
  const m = -rng.int(2, 5);
  const s = rng.int(2, 15);
  const r = x * m + s;
  const name = pickPerson(rng).name;
  const context = `${name} denkt sich eine Zahl. ${name} rechnet die Zahl mal ${fmtSigned(m)}. Dann addiert ${name} ${s}. Das Ergebnis ist ${fmt(r)}.`;
  const prompt = `Wie heißt die Zahl von ${name}?`;
  return {
    key: `denken:${x}:${m}:${s}`,
    context,
    prompt,
    answer: signedNumber(x),
    hints: ['Rechne von hinten nach vorn.', 'Mach zuerst das Addieren rückgängig. Teile dann.'],
    steps: [`Plus ${s} rückgängig: ${fmt(r)} − ${s} = ${fmt(r - s)}`, `Mal ${fmtSigned(m)} rückgängig: ${fmtSigned(r - s)} : ${fmtSigned(m)} = ${fmt(x)}`, `Die Zahl heißt ${fmt(x)}.`],
    bugs: numberBugs([
      Number.isInteger((r + s) / m) && bug('umkehr-richtung', (r + s) / m, `Mach die Probe. Was hebt plus ${s} auf?`),
      bug('regel-mal', -x, 'Prüfe Plus oder Minus beim Teilen: Zähle die negativen Zahlen.'),
      bug('nur-klammer', r - s, 'Du hast einen Schritt gerechnet. Teile noch.'),
    ], x, true),
    praise: 'Du hast die Rechnung von hinten nach vorn gelöst.',
    srText: say(context, prompt),
    kmk: ['PK.modellieren'],
  };
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = {
  1: (rng, ab) => (ab === 1 ? stufe1Direct(rng) : ab === 2 ? stufe1Harder(rng) : rng.chance(0.5) ? stufe1Steps(rng) : stufe1Missing(rng)),
  2: (rng, ab) => (ab === 1 ? bracketDirect(rng) : ab === 2 ? bracketAndPoint(rng) : bracketSteps(rng)),
  3: (rng, ab) => (ab === 1 ? setBrackets(rng) : ab === 2 ? backwardsBracket(rng) : backwardsStory(rng)),
};

export const termeSkill: SkillDef = {
  ...SKILL,
  title: 'Alles zusammen',
  description: 'Du verbindest alle Rechenarten mit ganzen Zahlen.',
  stufen: { 1: 'Zwei Rechenarten, kleine ganze Zahlen, keine Klammern', 2: 'Klammern und Punkt vor Strich, bis 100', 3: 'Klammern für ein Ziel setzen; rückwärts rechnen' },
  kmk: [...KMK_RECHNEN, 'PK.problemloesen', 'PK.modellieren'],
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_RECHNEN, FORMS[stufe](rng, ab));
  },
};
