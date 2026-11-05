/**
 * Unbekannte Zahlen finden (docs/research.md §6). Stufe 1: x + 17 = 42 by the Umkehraufgabe. Stufe 2: x : 6 = 14 and 120 − x = 75. Stufe 3: two steps, and a
 * Zahlenrätsel written as a Gleichung. Every value of x is whole and every Probe holds.
 */
import { DIV, MINUS, TIMES, fmt } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { targetAb } from '../shared';
import { attempt, item, termSpeech, wholeBugs } from './common';

const SKILL = { id: 'rechnen.gleichungen', topicId: 'rechnen' } as const;
const KMK = ['SF.gleichungen'];

interface Eq {
  /** Key part. */
  key: string;
  text: string;
  x: number;
  hints: string[];
  steps: string[];
  bugs: Bug[];
  praise: string;
}

const present = (bugs: (Bug | null)[]): Bug[] => bugs.filter((b): b is Bug => b !== null);

function equationItem(stufe: Stufe, ab: Ab, eq: Eq, prompt = 'Finde x. Mach zum Schluss die Probe.'): Exercise {
  return item(SKILL, stufe, {
    key: eq.key,
    ab,
    prompt,
    expression: eq.text,
    answer: { kind: 'number', value: eq.x, before: 'x =', label: 'Wert von x' },
    hints: eq.hints,
    steps: eq.steps,
    bugs: wholeBugs(eq.bugs, eq.x),
    praise: eq.praise,
    srText: `${prompt} ${termSpeech(eq.text)}.`,
    kmk: KMK,
  });
}

// ─── One step ────────────────────────────────────────────────────────────────

/** x + a = b, a + x = b */
function plusEq(x: number, a: number, front: boolean): Eq {
  const b = x + a;
  const text = front ? `${fmt(a)} + x = ${fmt(b)}` : `x + ${fmt(a)} = ${fmt(b)}`;
  return {
    key: `plus:${text}`,
    text,
    x,
    hints: [`Was hebt plus ${fmt(a)} auf?`, `Rechne die Umkehraufgabe: ${fmt(b)} ${MINUS} ${fmt(a)}.`],
    steps: [`Umkehraufgabe: ${fmt(b)} ${MINUS} ${fmt(a)} = ${fmt(x)}.`, `Probe: ${fmt(x)} + ${fmt(a)} = ${fmt(b)}. Also ist x = ${fmt(x)}.`],
    bugs: [{ id: 'umkehr-richtung', match: b + a, hint: `Mach die Probe. Was hebt plus ${fmt(a)} auf?` }],
    praise: 'Du hast mit der Umkehraufgabe gerechnet.',
  };
}

/** x − a = b */
function minusEq(x: number, a: number): Eq {
  const b = x - a;
  const text = `x ${MINUS} ${fmt(a)} = ${fmt(b)}`;
  return {
    key: `minus:${text}`,
    text,
    x,
    hints: [`Was hebt minus ${fmt(a)} auf?`, `Rechne die Umkehraufgabe: ${fmt(b)} + ${fmt(a)}.`],
    steps: [`Umkehraufgabe: ${fmt(b)} + ${fmt(a)} = ${fmt(x)}.`, `Probe: ${fmt(x)} ${MINUS} ${fmt(a)} = ${fmt(b)}. Also ist x = ${fmt(x)}.`],
    bugs: [{ id: 'umkehr-richtung', match: Math.abs(b - a), hint: `Mach die Probe. Was hebt minus ${fmt(a)} auf?` }],
    praise: 'Du hast mit der Umkehraufgabe gerechnet.',
  };
}

/** a − x = b: the unknown is taken away, so the Umkehraufgabe is a minus again. */
function minusFromEq(a: number, x: number): Eq {
  const b = a - x;
  const text = `${fmt(a)} ${MINUS} x = ${fmt(b)}`;
  return {
    key: `von:${text}`,
    text,
    x,
    hints: [`Von ${fmt(a)} ziehst du x ab und erhältst ${fmt(b)}.`, `Rechne ${fmt(a)} ${MINUS} ${fmt(b)}.`],
    steps: [`Von ${fmt(a)} bis ${fmt(b)} sind es ${fmt(x)} weniger.`, `${fmt(a)} ${MINUS} ${fmt(b)} = ${fmt(x)}.`, `Probe: ${fmt(a)} ${MINUS} ${fmt(x)} = ${fmt(b)}. Also ist x = ${fmt(x)}.`],
    bugs: [{ id: 'umkehr-richtung', match: a + b, hint: `Mach die Probe. x ist kleiner als ${fmt(a)}.` }],
    praise: 'Du hast gesehen, dass hier wieder Minus hilft.',
  };
}

/** x : a = b */
function divEq(x: number, a: number): Eq {
  const b = x / a;
  const text = `x ${DIV} ${fmt(a)} = ${fmt(b)}`;
  return {
    key: `geteilt:${text}`,
    text,
    x,
    hints: [`Was hebt geteilt durch ${fmt(a)} auf?`, `Rechne ${fmt(b)} ${TIMES} ${fmt(a)}.`],
    steps: [`Umkehraufgabe: ${fmt(b)} ${TIMES} ${fmt(a)} = ${fmt(x)}.`, `Probe: ${fmt(x)} ${DIV} ${fmt(a)} = ${fmt(b)}. Also ist x = ${fmt(x)}.`],
    bugs: [
      { id: 'umkehr-richtung', match: b + a, hint: 'Die Umkehrung von Geteilt ist Mal.' },
    ],
    praise: 'Du hast die Umkehraufgabe mit Mal gerechnet.',
  };
}

/** a · x = b */
function mulEq(a: number, x: number, front: boolean): Eq {
  const b = a * x;
  const text = front ? `${fmt(a)} ${TIMES} x = ${fmt(b)}` : `x ${TIMES} ${fmt(a)} = ${fmt(b)}`;
  return {
    key: `mal:${text}`,
    text,
    x,
    hints: [`Was hebt mal ${fmt(a)} auf?`, `Rechne ${fmt(b)} ${DIV} ${fmt(a)}.`],
    steps: [`Umkehraufgabe: ${fmt(b)} ${DIV} ${fmt(a)} = ${fmt(x)}.`, `Probe: ${fmt(a)} ${TIMES} ${fmt(x)} = ${fmt(b)}. Also ist x = ${fmt(x)}.`],
    bugs: [{ id: 'umkehr-richtung', match: b - a, hint: 'Die Umkehrung von Mal ist Geteilt.' }],
    praise: 'Du hast die Umkehraufgabe mit Geteilt gerechnet.',
  };
}

/** a : x = b: the unknown divides, so the Umkehraufgabe is a division again. */
function divByEq(x: number, b: number): Eq {
  const a = x * b;
  const text = `${fmt(a)} ${DIV} x = ${fmt(b)}`;
  return {
    key: `durch:${text}`,
    text,
    x,
    hints: [`${fmt(a)} geteilt durch x ergibt ${fmt(b)}.`, `Rechne ${fmt(a)} ${DIV} ${fmt(b)}.`],
    steps: [`Wie oft passt ${fmt(b)} in ${fmt(a)}?`, `${fmt(a)} ${DIV} ${fmt(b)} = ${fmt(x)}.`, `Probe: ${fmt(a)} ${DIV} ${fmt(x)} = ${fmt(b)}. Also ist x = ${fmt(x)}.`],
    bugs: [{ id: 'umkehr-richtung', match: a * b, hint: `Mach die Probe. x ist kleiner als ${fmt(a)}.` }],
    praise: 'Du hast gesehen, dass hier wieder Geteilt hilft.',
  };
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

/** The same one-step idea as a sentence. */
function sentenceItem(rng: Rng, ab: Ab): Exercise {
  const plus = rng.chance(0.5);
  const a = rng.int(12, 89);
  const x = rng.int(a + 3, 240);
  const eq = plus ? plusEq(x, a, false) : minusEq(x, a);
  const end = plus ? x + a : x - a;
  const prompt = plus
    ? `Ich denke mir eine Zahl. Ich zähle ${fmt(a)} dazu und erhalte ${fmt(end)}. Wie heißt meine Zahl?`
    : `Ich denke mir eine Zahl. Ich ziehe ${fmt(a)} ab und erhalte ${fmt(end)}. Wie heißt meine Zahl?`;
  return item(SKILL, 1, {
    key: `satz:${eq.key}`,
    ab,
    prompt,
    answer: { kind: 'number', value: x, before: 'Meine Zahl ist', after: '.', label: 'Meine Zahl' },
    hints: ['Schreib es als Gleichung mit x.', ...eq.hints.slice(1)],
    steps: [`Als Gleichung: ${eq.text}.`, ...eq.steps],
    bugs: wholeBugs(eq.bugs, x),
    praise: 'Du hast den Satz als Gleichung gelesen.',
    srText: prompt,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) {
    const a = rng.int(11, 59);
    return equationItem(1, ab, plusEq(rng.int(11, 79), a, false));
  }
  if (ab === 2) {
    if (rng.chance(0.5)) return equationItem(1, ab, plusEq(rng.int(21, 300), rng.int(21, 200), true));
    const a = rng.int(12, 99);
    return equationItem(1, ab, minusEq(a + rng.int(12, 150), a));
  }
  if (rng.chance(0.5)) return sentenceItem(rng, ab);
  const a = rng.int(112, 480);
  return equationItem(1, ab, minusEq(a + rng.int(112, 480), a));
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) {
    if (rng.chance(0.5)) {
      const a = rng.int(3, 9);
      return equationItem(2, ab, divEq(a * rng.int(4, 25), a));
    }
    return equationItem(2, ab, mulEq(rng.int(3, 9), rng.int(6, 25), rng.chance(0.5)));
  }
  if (ab === 2) {
    if (rng.chance(0.5)) {
      const x = rng.int(12, 99);
      return equationItem(2, ab, minusFromEq(x + rng.int(20, 200), x));
    }
    const a = rng.int(11, 25);
    return equationItem(2, ab, divEq(a * rng.int(11, 40), a));
  }
  if (rng.chance(0.5)) return equationItem(2, ab, divByEq(rng.int(3, 25), rng.int(4, 25)));
  const x = rng.int(112, 400);
  return equationItem(2, ab, minusFromEq(x + rng.int(112, 500), x));
}

// ─── Stufe 3: two steps ──────────────────────────────────────────────────────

/** a · x + b = c; the last operation is undone first. */
function mulPlusEq(a: number, x: number, b: number): Eq {
  const c = a * x + b;
  const text = `${fmt(a)} ${TIMES} x + ${fmt(b)} = ${fmt(c)}`;
  return {
    key: `malplus:${text}`,
    text,
    x,
    hints: [`Rechne rückwärts: Zieh zuerst ${fmt(b)} ab.`, `Teile dann durch ${fmt(a)}.`],
    steps: [`Zuerst: ${fmt(c)} ${MINUS} ${fmt(b)} = ${fmt(a * x)}.`, `Dann: ${fmt(a * x)} ${DIV} ${fmt(a)} = ${fmt(x)}.`, `Probe: ${fmt(a)} ${TIMES} ${fmt(x)} + ${fmt(b)} = ${fmt(c)}. Also ist x = ${fmt(x)}.`],
    bugs: present([
      c % a === 0 && c / a - b > 0 ? { id: 'umkehr-reihenfolge', match: c / a - b, hint: `Rechne rückwärts: Zuerst kommt ${fmt(b)} weg, dann erst das Teilen.` } : null,
      { id: 'umkehr-schritt', match: c - b, hint: `Das ist erst ${fmt(a)} ${TIMES} x. Teile noch durch ${fmt(a)}.` },
    ]),
    praise: 'Du hast die Rechnungen rückwärts aufgehoben.',
  };
}

/** a · x − b = c */
function mulMinusEq(a: number, x: number, b: number): Eq {
  const c = a * x - b;
  const text = `${fmt(a)} ${TIMES} x ${MINUS} ${fmt(b)} = ${fmt(c)}`;
  return {
    key: `malminus:${text}`,
    text,
    x,
    hints: [`Rechne rückwärts: Zähle zuerst ${fmt(b)} dazu.`, `Teile dann durch ${fmt(a)}.`],
    steps: [`Zuerst: ${fmt(c)} + ${fmt(b)} = ${fmt(a * x)}.`, `Dann: ${fmt(a * x)} ${DIV} ${fmt(a)} = ${fmt(x)}.`, `Probe: ${fmt(a)} ${TIMES} ${fmt(x)} ${MINUS} ${fmt(b)} = ${fmt(c)}. Also ist x = ${fmt(x)}.`],
    bugs: present([
      (c - b) % a === 0 && c - b > 0 ? { id: 'umkehr-richtung', match: (c - b) / a, hint: `Was hebt minus ${fmt(b)} auf?` } : null,
      { id: 'umkehr-schritt', match: c + b, hint: `Das ist erst ${fmt(a)} ${TIMES} x. Teile noch durch ${fmt(a)}.` },
    ]),
    praise: 'Du hast die Rechnungen rückwärts aufgehoben.',
  };
}

/** x : a + b = c */
function divPlusEq(a: number, x: number, b: number): Eq {
  const c = x / a + b;
  const text = `x ${DIV} ${fmt(a)} + ${fmt(b)} = ${fmt(c)}`;
  return {
    key: `geteiltplus:${text}`,
    text,
    x,
    hints: [`Rechne rückwärts: Zieh zuerst ${fmt(b)} ab.`, `Nimm dann mal ${fmt(a)}.`],
    steps: [`Zuerst: ${fmt(c)} ${MINUS} ${fmt(b)} = ${fmt(c - b)}.`, `Dann: ${fmt(c - b)} ${TIMES} ${fmt(a)} = ${fmt(x)}.`, `Probe: ${fmt(x)} ${DIV} ${fmt(a)} + ${fmt(b)} = ${fmt(c)}. Also ist x = ${fmt(x)}.`],
    bugs: [{ id: 'umkehr-schritt', match: c - b, hint: `Das ist erst x ${DIV} ${fmt(a)}. Nimm noch mal ${fmt(a)}.` }],
    praise: 'Du hast die Rechnungen rückwärts aufgehoben.',
  };
}

/** (x + a) · b = c */
function bracketEq(a: number, x: number, b: number): Eq {
  const c = (x + a) * b;
  const text = `(x + ${fmt(a)}) ${TIMES} ${fmt(b)} = ${fmt(c)}`;
  return {
    key: `klammer:${text}`,
    text,
    x,
    hints: [`Rechne rückwärts: Teile zuerst durch ${fmt(b)}.`, `Zieh dann ${fmt(a)} ab.`],
    steps: [`Zuerst: ${fmt(c)} ${DIV} ${fmt(b)} = ${fmt(x + a)}.`, `Dann: ${fmt(x + a)} ${MINUS} ${fmt(a)} = ${fmt(x)}.`, `Probe: (${fmt(x)} + ${fmt(a)}) ${TIMES} ${fmt(b)} = ${fmt(c)}. Also ist x = ${fmt(x)}.`],
    bugs: present([
      c > a && (c - a) % b === 0 ? { id: 'umkehr-reihenfolge', match: (c - a) / b, hint: `Die Klammer gehört zusammen. Teile zuerst durch ${fmt(b)}.` } : null,
      { id: 'umkehr-schritt', match: x + a, hint: `Das ist erst der Wert der Klammer. Zieh noch ${fmt(a)} ab.` },
    ]),
    praise: 'Du hast die Klammer als Ganzes aufgehoben.',
  };
}

/** A number riddle: the child reads it as a Gleichung and solves it. */
function riddle(rng: Rng, ab: Ab): Exercise {
  const a = rng.int(2, 9);
  const x = rng.int(6, 40);
  const b = rng.int(3, 40);
  const word = a === 2 ? 'Das Doppelte' : a === 3 ? 'Das Dreifache' : a === 4 ? 'Das Vierfache' : `Das ${a}-Fache`;
  const eq = mulPlusEq(a, x, b);
  const c = a * x + b;
  const prompt = `Ich denke mir eine Zahl. ${word} meiner Zahl plus ${fmt(b)} ergibt ${fmt(c)}. Wie heißt meine Zahl?`;
  return item(SKILL, 3, {
    key: `raetsel:${eq.key}`,
    ab,
    prompt,
    answer: { kind: 'number', value: x, before: 'Meine Zahl ist', after: '.', label: 'Meine Zahl' },
    hints: [`Schreib es als Gleichung: ${a} ${TIMES} x + ${fmt(b)} = ${fmt(c)}.`, ...eq.hints],
    steps: [`Als Gleichung: ${eq.text}.`, ...eq.steps],
    bugs: wholeBugs(eq.bugs, x),
    praise: 'Du hast das Rätsel als Gleichung geschrieben.',
    srText: prompt,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** "Welche Gleichung passt zu diesem Rätsel?" */
function whichEquation(rng: Rng, ab: Ab): Exercise {
  const a = rng.int(2, 9);
  // with a = b the option with the swapped calculations would be the same Gleichung
  const b = attempt(() => {
    const n = rng.int(3, 40);
    return n === a ? null : n;
  }, () => 41);
  const x = rng.int(6, 40);
  const c = a * x + b;
  const prompt = `Ich nehme eine Zahl mal ${a} und zähle ${fmt(b)} dazu. Das ergibt ${fmt(c)}. Welche Gleichung passt?`;
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>([
    { label: `${a} ${TIMES} x + ${fmt(b)} = ${fmt(c)}` },
    { label: `${a} ${TIMES} (x + ${fmt(b)}) = ${fmt(c)}`, whyWrong: 'Dann zählst du zuerst dazu und nimmst danach mal. Die Reihenfolge ist anders.' },
    { label: `x + ${a} ${TIMES} ${fmt(b)} = ${fmt(c)}`, whyWrong: `Dann nimmst du ${fmt(b)} mal ${a}. Im Rätsel nimmst du die Zahl mal ${a}.` },
    { label: `x ${TIMES} ${fmt(b)} + ${a} = ${fmt(c)}`, whyWrong: 'Hier sind die beiden Rechnungen vertauscht.' },
  ]);
  return item(SKILL, 3, {
    key: `welche:${a}x+${b}=${c}`,
    ab,
    prompt,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Schreib die Rechnungen in der Reihenfolge des Satzes auf.', 'Für die gedachte Zahl schreibst du x.'],
    steps: [`Die Zahl mal ${a}: ${a} ${TIMES} x.`, `${fmt(b)} dazu: ${a} ${TIMES} x + ${fmt(b)}.`, `Also: ${a} ${TIMES} x + ${fmt(b)} = ${fmt(c)}.`],
    praise: 'Du hast den Satz Schritt für Schritt übersetzt.',
    srText: prompt,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return equationItem(3, ab, mulPlusEq(rng.int(2, 9), rng.int(3, 20), rng.int(3, 30)));
  if (ab === 2) {
    const kind = rng.pick(['minus', 'geteilt', 'klammer'] as const);
    if (kind === 'minus') {
      const a = rng.int(3, 9);
      const x = rng.int(4, 25);
      return equationItem(3, ab, mulMinusEq(a, x, rng.int(2, a * x - 1)));
    }
    if (kind === 'geteilt') {
      const a = rng.int(3, 9);
      return equationItem(3, ab, divPlusEq(a, a * rng.int(4, 25), rng.int(3, 30)));
    }
    return equationItem(3, ab, bracketEq(rng.int(3, 20), rng.int(3, 25), rng.int(2, 9)));
  }
  return rng.chance(0.6) ? riddle(rng, ab) : whichEquation(rng, ab);
}

export const gleichungenSkill: SkillDef = {
  ...SKILL,
  title: 'Unbekannte Zahlen finden',
  description: 'Du löst Gleichungen mit der Umkehraufgabe oder durch Probieren.',
  stufen: {
    1: 'Plus und Minus mit der Umkehraufgabe lösen',
    2: 'Auch Mal und Geteilt, x kann hinten stehen',
    3: 'Zwei Schritte und Zahlenrätsel als Gleichung',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return stufe1(rng, ab);
    if (stufe === 2) return stufe2(rng, ab);
    return stufe3(rng, ab);
  },
};
