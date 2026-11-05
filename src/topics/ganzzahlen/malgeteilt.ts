/**
 * Mal und Geteilt (docs/research.md §6). Stufe 1: positive times negative as repeated addition. Stufe 2: the sign rules for · and :, up to 100. Stufe 3: the
 * sign of a long product, and why a pattern gives it. §7.2: no catchphrase as a rule on its own; hints name the step.
 */
import { BOX, fmt, fmtSigned } from '../../core/format';
import type { Ab, Bug, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { makeChoice, numberBugs, signedNumber, targetAb } from '../shared';
import { assemble, bug, type Form, jumpLabel, KMK_RECHNEN, line, say, VORZEICHEN_GLOSS } from './helpers';

const SKILL = { id: 'ganzzahlen.malgeteilt', topicId: 'ganzzahlen' } as const;

const TIMES = (n: number) => ['null', 'einmal', 'zweimal', 'dreimal', 'viermal', 'fünfmal', 'sechsmal', 'siebenmal', 'achtmal', 'neunmal'][n];

/** T11: this optional skill can come before the Vorzeichen skill. */
const WITHOUT_SIGNS = `${VORZEICHEN_GLOSS} Rechne zuerst ohne Vorzeichen.`;

const signHint = (negatives: number) => (negatives % 2 === 0 ? 'Zähle die negativen Zahlen: Ihre Anzahl ist gerade.' : 'Zähle die negativen Zahlen: Ihre Anzahl ist ungerade.');

// ─── Stufe 1: repeated addition ──────────────────────────────────────────────

function repeated(n: number, v: number): string {
  return Array.from({ length: n }, (_, i) => (i === 0 ? fmtSigned(v) : `+ ${fmtSigned(v)}`)).join(' ');
}

function repeatBugs(n: number, v: number): Bug[] {
  return numberBugs([
    bug('vorzeichen-vergessen', -n * v, `Du addierst ${TIMES(n)} eine negative Zahl. Du landest links von der 0.`),
    bug('plus-statt-mal', n + v, `Malnehmen heißt: Du addierst ${fmtSigned(v)} ${TIMES(n)}.`),
  ], n * v, true);
}

function repeatSmall(rng: Rng): Form {
  const n = rng.int(2, 5);
  const b = rng.int(2, 6);
  const v = -b;
  const r = n * v;
  const prompt = 'Rechne. Schreib die Malaufgabe zuerst als Summe.';
  const expression = `${n} · ${fmtSigned(v)} = ${BOX}`;
  const jumps = Array.from({ length: n }, (_, i) => ({ from: i * v, to: (i + 1) * v, label: jumpLabel(v) }));
  // one tick for each jump, for every n: the walk lands on ticks, and the end of the line does not give the result away
  const axis = line(-6 * b, b, b, b);
  return {
    key: `summe:${n}:${v}`,
    prompt,
    expression,
    visual: axis,
    answer: signedNumber(r),
    hints: [`Schreib es als Summe: ${repeated(n, v)}.`, `Ein Strich zählt ${b}. Geh ${TIMES(n)} um ${b} nach links.`],
    steps: [`${n} · ${fmtSigned(v)} = ${repeated(n, v)}`, { text: `Geh ${TIMES(n)} um ${b} nach links: ${fmt(r)}`, visual: { ...axis, jumps } }],
    bugs: repeatBugs(n, v),
    praise: 'Du hast die Malaufgabe als Summe gelesen.',
    srText: say(prompt, expression),
  };
}

function repeatLarger(rng: Rng): Form {
  const n = rng.int(3, 9);
  const b = rng.int(4, 12);
  const v = -b;
  const r = n * v;
  const prompt = 'Rechne.';
  const expression = `${n} · ${fmtSigned(v)} = ${BOX}`;
  return {
    key: `gross:${n}:${v}`,
    prompt,
    expression,
    answer: signedNumber(r),
    hints: [`Du addierst ${TIMES(n)} eine negative Zahl.`, `Rechne zuerst ${n} · ${b}. Denk dann an das Minus.`],
    steps: [`${n} · ${b} = ${-r}`, `Die Summe aus negativen Zahlen ist negativ.`, `${n} · ${fmtSigned(v)} = ${fmt(r)}`],
    bugs: repeatBugs(n, v),
    praise: 'Du hast zuerst die Zahl und dann das Minus bestimmt.',
    srText: say(prompt, expression),
  };
}

function repeatMissing(rng: Rng): Form {
  const n = rng.int(2, 9);
  const b = rng.int(2, 9);
  const r = -n * b;
  const askFactor = rng.chance(0.5);
  const prompt = 'Welche Zahl gehört in die Lücke?';
  const expression = askFactor ? `${BOX} · ${fmtSigned(-b)} = ${fmt(r)}` : `${n} · ${BOX} = ${fmt(r)}`;
  const value = askFactor ? n : -b;
  return {
    key: `luecke:${askFactor ? 'f' : 'z'}:${n}:${b}`,
    prompt,
    expression,
    answer: signedNumber(value),
    hints: [WITHOUT_SIGNS, 'Mach die Probe mit der Zahl in der Lücke.'],
    steps: [`Ohne Minus: ${n} · ${b} = ${n * b}`, `Probe: ${n} · ${fmtSigned(-b)} = ${fmt(r)}`, `In die Lücke gehört ${fmt(value)}.`],
    bugs: numberBugs([bug('regel-mal', -value, 'Mach die Probe. Ist deine Zahl positiv oder negativ?')], value, true),
    praise: 'Du hast mit der Probe geprüft.',
    srText: say(prompt, expression),
  };
}

function fallingStory(rng: Rng): Form {
  const hours = rng.int(2, 6);
  // a day's change stays within 20 Grad
  const per = rng.int(2, Math.min(6, Math.floor(20 / hours)));
  const r = -hours * per;
  const context = `Die Temperatur fällt ${hours} Stunden lang. In jeder Stunde fällt die Temperatur um ${per} Grad.`;
  const prompt = 'Wie groß ist die ganze Änderung?';
  return {
    key: `geschichte:${hours}:${per}`,
    context,
    prompt,
    answer: signedNumber(r, { unit: 'Grad' }),
    hints: ['Fallen ist eine negative Änderung.', `Addiere die Änderung ${TIMES(hours)}.`],
    steps: [`Jede Stunde: ${fmt(-per)} Grad.`, `${hours} · ${fmtSigned(-per)} = ${fmt(r)}`, `Die Änderung ist ${fmt(r)} Grad.`],
    bugs: numberBugs([bug('vorzeichen-vergessen', -r, 'Die Temperatur fällt. Die Änderung ist negativ.'), bug('plus-statt-mal', hours - per, `Die Änderung kommt ${TIMES(hours)} vor.`)], r, true),
    praise: 'Du hast das Fallen als negative Zahl geschrieben.',
    srText: say(context, prompt),
    kmk: ['PK.modellieren'],
  };
}

// ─── Stufe 2: the sign rules ─────────────────────────────────────────────────

function ruleBugs(x: number, y: number, r: number, times: boolean): Bug[] {
  const negatives = (x < 0 ? 1 : 0) + (y < 0 ? 1 : 0);
  return numberBugs([
    bug('regel-mal', -r, negatives === 2 ? `Zwei negative ${times ? 'Faktoren' : 'Zahlen'}: Das Ergebnis ist positiv.` : `Genau eine negative Zahl: Das Ergebnis ist negativ.`),
    times && negatives > 0 && bug('regel-uebertragen', x + y, 'Hier rechnest du mal, nicht plus.'),
  ], r, true);
}

function ruleForm(x: number, y: number, times: boolean, keyPart: string): Form {
  const r = times ? x * y : x / y;
  const shown = `${fmtSigned(x)} ${times ? '·' : ':'} ${fmtSigned(y)}`;
  const prompt = 'Rechne.';
  const expression = `${shown} = ${BOX}`;
  const negatives = (x < 0 ? 1 : 0) + (y < 0 ? 1 : 0);
  return {
    key: `${keyPart}:${x}:${y}`,
    prompt,
    expression,
    answer: signedNumber(r),
    hints: [WITHOUT_SIGNS, signHint(negatives)],
    steps: [
      `Ohne Minus: ${fmt(Math.abs(x))} ${times ? '·' : ':'} ${fmt(Math.abs(y))} = ${fmt(Math.abs(r))}`,
      negatives === 2 ? 'Zwei negative Zahlen: Das Ergebnis ist positiv.' : 'Genau eine negative Zahl: Das Ergebnis ist negativ.',
      `${shown} = ${fmt(r)}`,
    ],
    bugs: ruleBugs(x, y, r, times),
    praise: 'Du hast Zahl und Plus oder Minus getrennt bestimmt.',
    srText: say(prompt, expression),
  };
}

function signs(rng: Rng): [boolean, boolean] {
  return rng.pick([[true, true], [true, false], [false, true]] as [boolean, boolean][]);
}

/** A negative first factor: positive times negative is the content of Stufe 1, and here the second factor decides the sign. */
function signsBeyondStufe1(rng: Rng): [boolean, boolean] {
  return rng.pick([[true, true], [true, false]] as [boolean, boolean][]);
}

function ruleDirect(rng: Rng): Form {
  const [negX, negY] = signsBeyondStufe1(rng);
  const a = rng.int(2, 9);
  const b = rng.int(2, 9);
  return ruleForm(negX ? -a : a, negY ? -b : b, true, 'mal');
}

function ruleDivide(rng: Rng): Form {
  const [negX, negY] = signs(rng);
  const q = rng.int(2, 12);
  const b = rng.int(2, 9);
  const p = q * b > 100 ? 8 * b : q * b;
  return ruleForm(negX ? -p : p, negY ? -b : b, false, 'geteilt');
}

function ruleMissing(rng: Rng): Form {
  const a = rng.int(2, 10);
  const b = rng.int(2, 10);
  const divide = rng.chance(0.4);
  const [negX, negY] = divide ? signs(rng) : signsBeyondStufe1(rng);
  const x = negX ? -a : a;
  const y = negY ? -b : b;
  const prompt = 'Welche Zahl gehört in die Lücke?';
  const expression = divide ? `${BOX} : ${fmtSigned(y)} = ${fmt(x)}` : `${fmtSigned(x)} · ${BOX} = ${fmt(x * y)}`;
  const value = divide ? x * y : y;
  return {
    key: `luecke:${divide ? 'd' : 'm'}:${x}:${y}`,
    prompt,
    expression,
    answer: signedNumber(value),
    hints: [WITHOUT_SIGNS, 'Mach dann die Probe mit Plus und Minus.'],
    steps: [`Ohne Minus: ${a} · ${b} = ${a * b}`, `Probe: ${fmtSigned(x)} · ${fmtSigned(y)} = ${fmt(x * y)}`, `In die Lücke gehört ${fmt(value)}.`],
    bugs: numberBugs([bug('regel-mal', -value, 'Die Zahl stimmt. Mach die Probe: positiv oder negativ?')], value, true),
    praise: 'Du hast Plus und Minus mit der Probe geprüft.',
    srText: say(prompt, expression),
  };
}

/** Reversed: from the result back to the task. All numbers and the product stay within 100, and the options differ only in their signs. */
function ruleTarget(rng: Rng): Form {
  const [negX, negY] = signs(rng);
  const times = rng.chance(0.5);
  const big = rng.int(11, 20);
  const small = rng.int(3, Math.floor(100 / big));
  const a = times ? big : big * small;
  const task = (x: number, y: number) => `${fmtSigned(x)} ${times ? '·' : ':'} ${fmtSigned(y)}`;
  const x = negX ? -a : a;
  const y = negY ? -small : small;
  const r = times ? x * y : x / y;
  const shown = task(x, y);
  const prompt = `Welche Aufgabe hat das Ergebnis ${fmt(r)}?`;
  // the two tasks with the other sign; the other one with this sign stays out, so one option is right
  const others = r > 0 ? [task(-a, small), task(a, -small)] : [task(a, small), task(-a, -small)];
  const answer = makeChoice(rng, { label: shown }, others.map((label) => ({ label, whyWrong: `Bei dieser Aufgabe kommt ${fmt(-r)} heraus.` })));
  return {
    key: `ergebnis:${times ? 'm' : 'd'}:${x}:${y}`,
    prompt,
    answer,
    hints: ['Ohne Minus haben alle Aufgaben dasselbe Ergebnis.', 'Zähle bei jeder Aufgabe die negativen Zahlen.'],
    steps: [
      `Ohne Minus: ${fmt(a)} ${times ? '·' : ':'} ${fmt(small)} = ${fmt(Math.abs(r))}`,
      r > 0 ? 'Zwei negative Zahlen: Das Ergebnis ist positiv.' : 'Genau eine negative Zahl: Das Ergebnis ist negativ.',
      `${shown} = ${fmt(r)}`,
    ],
    praise: 'Du hast vom Ergebnis aus Plus und Minus geprüft.',
    srText: say(prompt, ...answer.options.map((o) => o.label)),
    kmk: ['PK.argumentieren'],
  };
}

// ─── Stufe 3: long products and a pattern ────────────────────────────────────

function factors(rng: Rng, count: number, max: number): number[] {
  const out = Array.from({ length: count }, () => (rng.chance(0.55) ? -rng.int(1, max) : rng.int(1, max)));
  // the product is never ±1, and it has a negative factor to count
  if (out.every((v) => Math.abs(v) === 1)) out[0] = -2;
  if (!out.some((v) => v < 0)) out[0] = -out[0];
  return out;
}

/** A line may break after a '·' (keepTermsTogether keeps ' · ' whole, which would split a long product inside a number). */
const productText = (values: readonly number[]) => values.map((v) => fmtSigned(v)).join('\u00A0· ');

function signOfProduct(rng: Rng): Form {
  const values = factors(rng, rng.int(5, 6), 9);
  const negatives = values.filter((v) => v < 0).length;
  const positive = negatives % 2 === 0;
  const right = positive ? 'positiv' : 'negativ';
  const wrong = positive ? 'negativ' : 'positiv';
  const context = VORZEICHEN_GLOSS;
  const prompt = 'Welches Vorzeichen hat das Produkt?';
  const expression = productText(values);
  return {
    key: `lang-vorzeichen:${values.join(':')}`,
    context,
    prompt,
    expression,
    answer: makeChoice(rng, { label: right }, [{ label: wrong, whyWrong: 'Zähle die negativen Faktoren noch einmal. Je zwei davon ergeben ein positives Produkt.' }], { order: ['positiv', 'negativ'] }),
    hints: ['Du musst nicht ausrechnen.', 'Zähle die negativen Faktoren. Ist die Anzahl gerade oder ungerade?'],
    steps: [`Negative Faktoren: ${negatives}`, `Je zwei ergeben ein positives Produkt.`, `Also ist das Produkt ${right}.`],
    praise: 'Du hast die negativen Faktoren gezählt.',
    srText: say(context, prompt, expression),
  };
}

function longProduct(rng: Rng): Form {
  const values = factors(rng, 4, 5);
  const r = values.reduce((p, v) => p * v, 1);
  const size = Math.abs(r);
  const prompt = 'Rechne.';
  const expression = `${productText(values)} = ${BOX}`;
  const negatives = values.filter((v) => v < 0).length;
  return {
    key: `lang:${values.join(':')}`,
    prompt,
    expression,
    answer: signedNumber(r),
    hints: [WITHOUT_SIGNS, 'Zähle dann die negativen Faktoren. So findest du Plus oder Minus.'],
    steps: [`Ohne Minus: ${values.map((v) => fmt(Math.abs(v))).join(' · ')} = ${fmt(size)}`, `Negative Faktoren: ${negatives}`, `Das Produkt ist ${fmt(r)}.`],
    bugs: numberBugs([bug('regel-mal', -r, 'Die Zahl stimmt. Zähle die negativen Faktoren noch einmal.')], r, true),
    praise: 'Du hast Zahl und Plus oder Minus getrennt bestimmt.',
    srText: say(prompt, expression),
  };
}

/** The pattern 2 · (−b), 1 · (−b), 0 · (−b), (−1) · (−b): the results grow by b in every line. */
function patternVisual(b: number, last: number): VisualOf<'term'> {
  const lines = [];
  for (let n = last + 3; n > last; n--) lines.push(`${fmtSigned(n)} · ${fmtSigned(-b)} = ${fmt(-n * b)}`);
  lines.push(`${fmtSigned(last)} · ${fmtSigned(-b)} = ${BOX}`);
  return { type: 'term', lines };
}

function patternNumber(rng: Rng): Form {
  const b = rng.int(2, 9);
  const last = rng.pick([-1, -2]);
  const r = -last * b;
  const prompt = 'Setz das Muster fort. Welche Zahl gehört in die Lücke?';
  return {
    key: `muster:${b}:${last}`,
    prompt,
    visual: patternVisual(b, last),
    answer: signedNumber(r),
    hints: ['Vergleiche die Ergebnisse von Zeile zu Zeile.', 'Rechne vom letzten Ergebnis aus weiter.'],
    steps: [`In jeder Zeile wächst das Ergebnis um ${b}.`, `Vor der letzten Zeile steht ${fmt(-(last + 1) * b)}.`, `${fmtSigned(last)} · ${fmtSigned(-b)} = ${fmt(r)}`],
    bugs: numberBugs([bug('regel-mal', -r, 'Schau auf das Muster: Von Zeile zu Zeile wächst das Ergebnis.')], r, true),
    praise: 'Du hast das Muster in jeder Zeile geprüft.',
    srText: say(prompt, ...patternVisual(b, last).lines),
    kmk: ['PK.argumentieren'],
  };
}

function patternWhy(rng: Rng): Form {
  const b = rng.int(2, 9);
  const prompt = `Warum ist ${fmtSigned(-1)} · ${fmtSigned(-b)} positiv?`;
  return {
    key: `warum:${b}`,
    prompt,
    visual: patternVisual(b, -1),
    answer: makeChoice(rng, { label: `Das Ergebnis wächst in jeder Zeile um ${b}.` }, [
      { label: `Das Ergebnis fällt in jeder Zeile um ${b}.`, whyWrong: 'Vergleiche die Zeilen: Von oben nach unten wird das Ergebnis größer.' },
      { label: 'Das Minus fällt einfach weg.', whyWrong: 'Das nennt keinen Grund. Schau auf das Muster in den Zeilen.' },
      { label: `Beide Faktoren sind gleich groß.`, whyWrong: 'Die Faktoren sind verschieden. Schau auf das Muster in den Zeilen.' },
    ]),
    hints: ['Lies die Ergebnisse von oben nach unten.', 'Wie ändert sich das Ergebnis von Zeile zu Zeile?'],
    steps: [`Die Ergebnisse: ${fmt(-2 * b)}, ${fmt(-b)}, 0`, `In jeder Zeile kommt ${b} dazu.`, `Nach 0 kommt also ${b}.`],
    praise: 'Du hast den Grund im Muster gefunden.',
    srText: say(prompt, ...patternVisual(b, -1).lines),
    kmk: ['PK.argumentieren'],
  };
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = {
  1: (rng, ab) => (ab === 1 ? repeatSmall(rng) : ab === 2 ? repeatLarger(rng) : rng.chance(0.5) ? repeatMissing(rng) : fallingStory(rng)),
  2: (rng, ab) => (ab === 1 ? ruleDirect(rng) : ab === 2 ? ruleDivide(rng) : rng.chance(0.6) ? ruleMissing(rng) : ruleTarget(rng)),
  3: (rng, ab) => (ab === 1 ? signOfProduct(rng) : ab === 2 ? longProduct(rng) : rng.chance(0.5) ? patternNumber(rng) : patternWhy(rng)),
};

export const malgeteiltSkill: SkillDef = {
  ...SKILL,
  title: 'Mal und Geteilt',
  description: 'Du wendest die Vorzeichenregeln beim Mal und Geteilt an.',
  stufen: { 1: 'Positiv mal negativ als Summe: 3 · (−4)', 2: 'Vorzeichenregeln für · und :, bis 100', 3: 'Vorzeichen langer Produkte; mit einem Muster erklären' },
  kmk: [...KMK_RECHNEN, 'PK.modellieren', 'PK.argumentieren'],
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_RECHNEN, FORMS[stufe](rng, ab));
  },
};
