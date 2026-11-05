/**
 * Plus und Minus (docs/research.md §6). Stufe 1: a ± natural b, up to 20. Stufe 2: a negative b, up to 20. Stufe 3: up to 1 000, a missing number, an
 * abstract Konto (T12: never a child's or family's money trouble). Hints walk on the Zahlengerade instead of a rule on its own (§7.2).
 */
import { BOX, fmt, fmtQty, fmtSigned } from '../../core/format';
import type { Ab, Bug, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, numberBugs, signedNumber, targetAb } from '../shared';
import { apply, assemble, bug, type Form, GEGENZAHL_HINT, GEGENZAHL_NEAR, jumpLabel, KMK_RECHNEN, lineAround, type Op, say, schritte, sindEs, term } from './helpers';

const SKILL = { id: 'ganzzahlen.plusminus', topicId: 'ganzzahlen' } as const;

/** The misconceptions of §5 that fit this calculation. */
function calcBugs(a: number, op: Op, b: number): Bug[] {
  const r = apply(a, op, b);
  const move = op === '+' ? b : -b;
  return numberBugs([
    op === '−' && b < 0 && bug('minus-minus', a + b, `Minus einer negativen Zahl: Es wird mehr. Rechne ${fmt(a)} + ${fmt(-b)}.`),
    op === '+' && b < 0 && a < 0 && bug('regel-uebertragen', -a - b, 'Zwei negative Zahlen beim Plus: Du gehst weiter nach links.'),
    op === '+' && b < 0 && a >= 0 && bug('vorzeichen-ignoriert', a - b, 'Plus eine negative Zahl: Du gehst nach links.'),
    a < 0 && move < 0 && bug('unter-null-weiter', a - move, `${fmt(a)} ist schon unter 0. Der Schritt geht weiter nach links.`),
    a < 0 && move > 0 && bug('vorzeichen-ignoriert', -a + move, `Starte bei ${fmt(a)} und geh ${schritte(move)} nach rechts.`),
    a < 0 && move > 0 && bug('vorzeichen-behalten', a - move, `Plus ${fmt(move)} heißt: nach rechts gehen, auch über die 0 hinaus.`),
    a * r < 0 && a < 0 && bug('vorzeichen-behalten', -r, 'Du kommst über die 0 hinaus. Rechts von der 0 sind die Zahlen positiv.'),
    a > 0 && r < 0 && bug('tausch-minus', -r, `Du startest bei ${fmt(a)} und gehst über die 0 hinaus nach links.`),
    a > 0 && r < 0 && bug('richtung', a - move, 'Prüfe die Richtung: Hier geht es nach links.'),
  ], r, true);
}

function calcSteps(a: number, op: Op, b: number): Form['steps'] {
  const r = apply(a, op, b);
  const move = op === '+' ? b : -b;
  const rewrite = b < 0 ? [`${term(a, op, b)} = ${fmt(a)} ${move > 0 ? '+' : '−'} ${fmt(Math.abs(move))}`] : [];
  return [
    ...rewrite,
    { text: `Starte bei ${fmt(a)} und geh ${fmt(Math.abs(move))} nach ${move > 0 ? 'rechts' : 'links'}.`, visual: lineAround([a, r], { jumps: [{ from: a, to: r, label: jumpLabel(move) }] }) },
    `${term(a, op, b)} = ${fmt(r)}`,
  ];
}

const WALK_HINTS = ['Starte bei der ersten Zahl auf der Zahlengeraden.', 'Plus geht nach rechts, minus nach links.'];

function calcForm(a: number, op: Op, b: number, keyPart: string, hints: string[], praise: string, extra: Partial<Form> = {}): Form {
  const prompt = 'Rechne.';
  const expression = `${term(a, op, b)} = ${BOX}`;
  return {
    key: `${keyPart}:${a}:${op === '+' ? 'p' : 'm'}:${b}`,
    prompt,
    expression,
    answer: signedNumber(apply(a, op, b)),
    hints,
    steps: calcSteps(a, op, b),
    bugs: calcBugs(a, op, b),
    praise,
    srText: say(prompt, expression),
    ...extra,
  };
}

// ─── Stufe 1: a ± natural b, up to 20 ────────────────────────────────────────

function stufe1Direct(rng: Rng): Form {
  const a = -rng.int(1, 12);
  const op: Op = rng.chance(0.65) ? '+' : '−';
  const b = op === '+' ? rng.int(1, 20) : rng.int(1, 20 + a);
  return calcForm(a, op, b, 'direkt', WALK_HINTS, 'Du bist von der negativen Zahl aus gegangen.', {
    visual: lineAround([a, apply(a, op, b)], { marks: [{ value: a, label: 'Start' }] }),
  });
}

function stufe1Cross(rng: Rng): Form {
  if (rng.chance(0.5)) {
    const a = rng.int(1, 12);
    const r = -rng.int(1, 8);
    return calcForm(a, '−', a - r, 'ueber-null', ['Geh zuerst bis zur 0.', 'Geh dann den Rest nach links weiter.'], 'Du bist über die 0 hinaus weitergegangen.');
  }
  const a = -rng.int(5, 18);
  const r = rng.int(1, 20 + a);
  return calcForm(a, '+', r - a, 'ueber-null', ['Geh zuerst bis zur 0.', 'Geh dann den Rest nach rechts weiter.'], 'Du bist über die 0 hinaus weitergegangen.');
}

function missing(a: number, op: Op, b: number, gap: 'a' | 'b', keyPart: string, praise: string): Form {
  const r = apply(a, op, b);
  const prompt = 'Welche Zahl gehört in die Lücke?';
  const left = gap === 'a' ? `${BOX} ${op} ${fmtSigned(b)}` : `${fmt(a)} ${op} ${BOX}`;
  const expression = `${left} = ${fmt(r)}`;
  const value = gap === 'a' ? a : b;
  const inverse = op === '+' ? '−' : '+';
  // '−3 + □ = 5' is a distance on the line: on Stufe 1 no minus with a negative number yet
  const count = gap === 'b' && op === '+';
  const first = gap === 'a' ? `Umkehraufgabe: ${fmt(r)} ${inverse} ${fmtSigned(b)} = ${fmt(value)}` : count ? `Von ${fmt(a)} bis ${fmt(r)} ${sindEs(b, schritte)} nach rechts.` : `Umkehraufgabe: ${fmt(a)} − ${fmtSigned(r)} = ${fmt(value)}`;
  return {
    key: `${keyPart}:${gap}:${a}:${op === '+' ? 'p' : 'm'}:${b}`,
    prompt,
    expression,
    answer: signedNumber(value),
    hints: [count ? 'Wie weit ist es von der ersten Zahl bis zum Ergebnis?' : 'Rechne mit der Umkehraufgabe.', 'Mach die Probe: Setz deine Zahl in die Lücke.'],
    steps: [first, `Probe: ${term(a, op, b)} = ${fmt(r)}`, `In die Lücke gehört ${fmt(value)}.`],
    bugs: numberBugs([
      gap === 'a' && bug('umkehr-richtung', op === '+' ? r + b : r - b, `Mach die Probe. Was hebt ${op === '+' ? 'plus' : 'minus'} ${fmt(Math.abs(b))} auf?`),
      gap === 'b' && bug('vorzeichen-ignoriert', op === '+' ? r - Math.abs(a) : Math.abs(a) - r, 'Mach die Probe. Achte bei der ersten Zahl auf Plus oder Minus.'),
      bug('vorzeichen-vergessen', -value, 'Mach die Probe. Ist deine Zahl positiv oder negativ?'),
    ], value, true),
    praise,
    srText: say(prompt, expression),
  };
}

function stufe1Missing(rng: Rng): Form {
  const a = -rng.int(1, 12);
  const b = rng.int(1, 19);
  return missing(a, '+', b, rng.chance(0.6) ? 'a' : 'b', 'luecke', 'Du hast mit der Umkehraufgabe gerechnet.');
}

// ─── Stufe 2: a negative b, up to 20 ─────────────────────────────────────────

function stufe2Plus(rng: Rng): Form {
  const a = rng.int(-12, 15) || 4;
  // the result stays within 20
  const b = -rng.int(1, Math.min(12, 20 + a));
  return calcForm(a, '+', b, 'plus-negativ', ['Plus eine negative Zahl: Du gehst nach links.', 'Schreib es kürzer, ohne die Klammer.'], 'Du hast das Plus und das Minus getrennt gelesen.');
}

function stufe2Minus(rng: Rng): Form {
  const a = rng.int(-10, 12) || -3;
  const b = -rng.int(1, Math.min(9, 20 - a));
  return calcForm(a, '−', b, 'minus-negativ', ['Minus einer negativen Zahl: Du gehst nach rechts.', GEGENZAHL_HINT], 'Du hast aus Minus eine Plusaufgabe gemacht.');
}

function stufe2Missing(rng: Rng): Form {
  const a = rng.int(-9, 9) || 5;
  const b = -rng.int(2, 11);
  return missing(a, '−', b, 'b', 'luecke-negativ', 'Du hast die negative Zahl mit der Probe gefunden.');
}

function stufe2Same(rng: Rng): Form {
  const a = rng.int(3, 15);
  const b = rng.int(2, Math.min(15, 20 - a));
  const start = `${fmt(a)} − (${fmt(-b)})`;
  const prompt = `Welche Aufgabe hat dasselbe Ergebnis wie ${start}?`;
  return {
    key: `gleich:${a}:${b}`,
    prompt,
    answer: makeChoice(rng, { label: `${a} + ${b}` }, [
      { label: `${a} − ${b}`, whyWrong: 'Minus einer negativen Zahl geht nach rechts. Hier geht es nach links.' },
      { label: `${fmt(-a)} + ${b}`, whyWrong: 'Die erste Zahl bleibt gleich. Nur der zweite Teil ändert sich.' },
      { label: `${fmt(-a)} − ${b}`, whyWrong: 'Die erste Zahl bleibt gleich. Nur der zweite Teil ändert sich.' },
    ]),
    hints: ['Du ziehst eine negative Zahl ab.', GEGENZAHL_HINT],
    steps: [`Die Gegenzahl von ${fmt(-b)} ist ${b}: ${GEGENZAHL_NEAR}.`, `${start} = ${a} + ${b}`, `Beide Ergebnisse sind ${a + b}.`],
    praise: 'Du hast aus Minus eine Plusaufgabe gemacht.',
    srText: say(prompt),
    kmk: ['PK.argumentieren'],
  };
}

// ─── Stufe 3: up to 1 000 ────────────────────────────────────────────────────

function big(rng: Rng): number {
  return rng.int(11, 95) * 10;
}

function stufe3Direct(rng: Rng): Form {
  const a = rng.chance(0.75) ? -big(rng) : big(rng);
  const op: Op = rng.chance(0.5) ? '+' : '−';
  const size = rng.int(11, 99) * 10;
  const wanted = rng.chance(0.7) ? size : -size;
  // the result stays within 1 000: with the other sign the step goes back towards 0
  const fitting = Math.abs(apply(a, op, wanted)) <= 1000 ? wanted : -wanted;
  // natural numbers only ('340 + 430') are no task of this skill: a plus gets a negative second number, a minus goes over the 0
  const natural = a > 0 && fitting > 0 && apply(a, op, fitting) >= 0;
  const b = !natural ? fitting : op === '+' ? -fitting : a + 10 * rng.int(1, (1000 - a) / 10);
  return calcForm(a, op, b, 'gross', ['Rechne zuerst ohne die Minuszeichen.', 'Zeigt der Schritt zur 0 hin oder von der 0 weg?'], 'Du hast Richtung und Größe einzeln geprüft.');
}

function stufe3Missing(rng: Rng): Form {
  const a = -big(rng);
  const praise = 'Du hast die fehlende Zahl mit der Probe gefunden.';
  if (rng.chance(0.5)) return missing(a, '+', big(rng), rng.chance(0.5) ? 'a' : 'b', 'gross-luecke', praise);
  return missing(a, '−', -rng.int(1, 9) * 10, 'b', 'gross-luecke', praise);
}

/**
 * Guthaben or Schulden at the start. The first step goes over the 0, the second one stays on that side or goes back over the 0, so the end can lie on either side: the
 * sign of the answer is a decision.
 */
function kontoForm(rng: Rng): Form {
  const credit = rng.chance(0.5);
  const size = 10 * rng.int(3, 30);
  const over = 10 * rng.int(2, 30);
  const first = size + over;
  const second = rng.chance(0.5) ? over + 10 * rng.int(2, 40) : 10 * rng.int(1, over / 10 - 1);
  const a = credit ? size : -size;
  const mid = credit ? -over : over;
  const e = credit ? mid + second : mid - second;
  const euro = (n: number) => fmtQty(n, '€');
  const moves = credit ? [`gehen ${euro(first)} ab`, `kommen ${euro(second)} dazu`] : [`kommen ${euro(first)} dazu`, `gehen ${euro(second)} ab`];
  const context = `Ein Konto zeigt ${euro(size)} ${credit ? 'Guthaben' : 'Schulden'}. Zuerst ${moves[0]}. Danach ${moves[1]}.`;
  const prompt = 'Wie steht das Konto jetzt?';
  return {
    key: `konto:${credit ? 'g' : 's'}:${size}:${first}:${second}`,
    context,
    prompt,
    answer: signedNumber(e, { unit: '€' }),
    hints: ['Schulden sind ein Stand unter 0, Guthaben ein Stand über 0.', 'Rechne der Reihe nach: Zuerst der erste Schritt, dann der zweite.'],
    steps: [
      `Start: ${euro(a)}.`,
      `${euro(first)} ${credit ? 'ab' : 'dazu'}: ${euro(mid)}.`,
      `${euro(second)} ${credit ? 'dazu' : 'ab'}: ${euro(e)}. ${e < 0 ? 'Das sind Schulden.' : 'Das ist Guthaben.'}`,
    ],
    bugs: numberBugs([
      bug('vorzeichen-ignoriert', credit ? -size - first + second : size + first - second, credit ? 'Prüfe den Start: Guthaben ist ein Stand über 0.' : 'Prüfe den Start: Schulden sind ein Stand unter 0.'),
      bug('zwischenstand', mid, 'Das ist der Stand nach dem ersten Schritt. Rechne auch den zweiten.'),
      bug('vorzeichen-vergessen', -e, 'Liegt der neue Stand über 0 oder unter 0? Prüfe Plus oder Minus.'),
    ], e, true),
    praise: 'Du hast den Kontostand Schritt für Schritt verfolgt.',
    srText: say(context, prompt),
    kmk: ['PK.modellieren'],
  };
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = {
  1: (rng, ab) => (ab === 1 ? stufe1Direct(rng) : ab === 2 ? stufe1Cross(rng) : stufe1Missing(rng)),
  2: (rng, ab) => (ab === 1 ? stufe2Plus(rng) : ab === 2 ? stufe2Minus(rng) : rng.chance(0.5) ? stufe2Missing(rng) : stufe2Same(rng)),
  3: (rng, ab) => (ab === 1 ? stufe3Direct(rng) : ab === 2 ? stufe3Missing(rng) : kontoForm(rng)),
};

export const plusminusSkill: SkillDef = {
  ...SKILL,
  title: 'Plus und Minus',
  description: 'Du rechnest plus und minus mit ganzen Zahlen.',
  stufen: { 1: 'Plus und minus mit natürlicher Zahl, bis 20: −3 + 8', 2: 'Negative zweite Zahl: 4 + (−9), 4 − (−9), bis 20', 3: 'Bis 1000; fehlende Zahl; Guthaben und Schulden' },
  kmk: [...KMK_RECHNEN, 'PK.argumentieren', 'PK.modellieren'],
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_RECHNEN, FORMS[stufe](rng, ab));
  },
};
