/**
 * Die Zahlengerade (docs/research.md §6). Stufe 1: read marks, −10 to 10, step 1. Stufe 2: place numbers, −100 to 100, step 10. Stufe 3: a section
 * without zero, and choosing a scale. Reading a mark needs a typed answer (a numberline answer can only place), so those items use a number field.
 */
import { fmt } from '../../core/format';
import type { Ab, Bug, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, multiBugs, numberBugs, signedNumber, targetAb } from '../shared';
import { assemble, bug, type Form, KMK_ZAHLEN, line, lineAnswer, lineInWords, say, sindEs, striche } from './helpers';

const SKILL = { id: 'ganzzahlen.zahlengerade', topicId: 'ganzzahlen' } as const;

const LEFT_NEGATIVE = 'Links von der 0 stehen die negativen Zahlen.';
const RIGHT_POSITIVE = 'Rechts von der 0 stehen die positiven Zahlen.';
const LEFT_SMALLER = 'Links stehen die kleineren Zahlen. Schau auf die beiden Enden.';

function mirrorBug(v: number): Bug {
  return bug('vorzeichen-vergessen', -v, v < 0 ? LEFT_NEGATIVE : RIGHT_POSITIVE);
}

/** Between two labels, read from the wrong side: −4 between −5 and 0 taken as −1. */
function wrongSideBug(v: number, low: number, high: number): Bug {
  return bug('richtung-negativ', low + high - v, LEFT_SMALLER);
}

// ─── Stufe 1: read marks ─────────────────────────────────────────────────────

function readOne(rng: Rng): Form {
  const v = rng.chance(0.75) ? rng.int(-9, -1) : rng.int(1, 9);
  const prompt = 'Welche Zahl zeigt der Pfeil A?';
  const low = Math.floor(v / 5) * 5;
  const axis = line(-10, 10, 5, 1, { marks: [{ value: v, label: 'A' }] });
  return {
    key: `lesen:${v}`,
    prompt,
    visual: axis,
    answer: signedNumber(v, { before: 'A =' }),
    hints: ['Such zuerst die 0.', 'Zähle von der 0 aus die Striche bis zum Pfeil.'],
    steps: [`A liegt ${striche(Math.abs(v))} ${v < 0 ? 'links' : 'rechts'} von der 0.`, `A = ${fmt(v)}`],
    bugs: numberBugs([
      mirrorBug(v),
      bug('null-mitgezaehlt', v < 0 ? v - 1 : v + 1, 'Die 0 ist der Start. Zähle die Schritte ab dort.'),
      bug('links-gezaehlt', v + 10, 'Die Zahlengerade beginnt nicht bei 0. Zähle von der 0 aus.'),
      v % 5 !== 0 && wrongSideBug(v, low, low + 5),
    ], v, true),
    praise: 'Du hast die Striche von der 0 aus gezählt.',
    srText: say(lineInWords(axis), prompt),
  };
}

function readTwo(rng: Rng): Form {
  const a = rng.int(-9, -1);
  let b = rng.int(-9, 9);
  // two ticks apart at least, so that the labels of the arrows stay apart
  if (b === 0 || Math.abs(b - a) < 2) b = a === -3 ? 1 : a + 3;
  const prompt = 'Welche Zahlen zeigen die Pfeile A und B?';
  const fields = [
    { id: 'a', value: a, signed: true, before: 'A =', label: 'A' },
    { id: 'b', value: b, signed: true, before: 'B =', label: 'B' },
  ];
  const axis = line(-10, 10, 5, 1, { marks: [{ value: a, label: 'A' }, { value: b, label: 'B' }] });
  return {
    key: `lesen-zwei:${a}:${b}`,
    prompt,
    visual: axis,
    answer: { kind: 'multi', fields },
    hints: ['Such zuerst die 0.', 'Lies dann jeden Pfeil einzeln ab.'],
    steps: [`A liegt links von der 0: A = ${fmt(a)}`, `B liegt ${b < 0 ? 'links' : 'rechts'} von der 0: B = ${fmt(b)}`],
    bugs: multiBugs([
      bug('vorzeichen-vergessen', { a: -a, b: Math.abs(b) }, LEFT_NEGATIVE),
      bug('marken-getauscht', { a: b, b: a }, 'Schau auf die Buchstaben: Welcher Pfeil heißt A?'),
    ], fields),
    praise: 'Du hast beide Pfeile einzeln abgelesen.',
    srText: say(lineInWords(axis), prompt),
  };
}

function walkSteps(rng: Rng): Form {
  const a = rng.int(-5, 6);
  const s = rng.int(3, Math.min(7, a + 10));
  const target = a - s;
  const prompt = `Geh von A aus ${s} Schritte nach links. Bei welcher Zahl bist du?`;
  const axis = line(-10, 10, 5, 1, { marks: [{ value: a, label: 'A' }] });
  return {
    key: `schritte:${a}:${s}`,
    prompt,
    visual: axis,
    answer: signedNumber(target),
    hints: ['Lies zuerst den Wert von A ab.', 'Geh dann Strich für Strich nach links.'],
    steps: [`A steht bei ${fmt(a)}.`, `${s} Schritte nach links: ${fmt(a)} wird zu ${fmt(target)}.`],
    bugs: numberBugs([
      bug('richtung-links', a + s, 'Nach links werden die Zahlen kleiner.'),
      mirrorBug(target),
    ], target, true),
    praise: 'Du hast die Schritte in der richtigen Richtung gezählt.',
    srText: say(lineInWords(axis), prompt),
  };
}

function placeSmall(rng: Rng): Form {
  const v = rng.int(-9, -1);
  const low = Math.floor(v / 5) * 5;
  const prompt = `Setze den Pfeil auf ${fmt(v)}.`;
  const axis = line(-10, 10, 5, 1);
  return {
    key: `setzen-klein:${v}`,
    prompt,
    answer: lineAnswer(v, axis),
    hints: ['Such zuerst die 0.', 'Negative Zahlen liegen links von der 0.'],
    steps: [`${fmt(v)} liegt ${striche(-v)} links von der 0.`, { text: `Dort steht der Pfeil: ${fmt(v)}.`, visual: { ...axis, marks: [{ value: v, label: fmt(v) }] } }],
    bugs: numberBugs([mirrorBug(v), v % 5 !== 0 && wrongSideBug(v, low, low + 5)], v, true),
    praise: 'Du hast von der 0 aus nach links gezählt.',
    srText: say(lineInWords(axis), prompt),
  };
}

// ─── Stufe 2: place, −100 to 100 ─────────────────────────────────────────────

/** The tens on small ticks, so that the child has to count. */
const TENS_BELOW = [-90, -80, -70, -60, -40, -30, -20, -10];
const TENS_ABOVE = [10, 20, 30, 40, 60, 70, 80, 90];

function placeTens(rng: Rng, sparse: boolean): Form {
  const v = rng.pick(rng.chance(0.75) ? TENS_BELOW : TENS_ABOVE);
  const axis = sparse ? line(-100, 100, 50, 10, { labels: [-100, 0, 100] }) : line(-100, 100, 50, 10);
  const low = Math.floor(v / 50) * 50;
  const prompt = `Setze den Pfeil auf ${fmt(v)}.`;
  return {
    key: `setzen:${sparse ? 'wenig' : 'viel'}:${v}`,
    prompt,
    answer: lineAnswer(v, axis),
    hints: ['Ein kleiner Strich zählt 10.', v < 0 ? 'Zähle von der 0 aus in Zehnern nach links.' : 'Zähle von der 0 aus in Zehnern nach rechts.'],
    steps: [`Ein kleiner Strich zählt 10.`, { text: `${fmt(v)} liegt ${striche(Math.abs(v) / 10)} ${v < 0 ? 'links' : 'rechts'} von der 0.`, visual: { ...axis, marks: [{ value: v, label: fmt(v) }] } }],
    bugs: numberBugs([mirrorBug(v), wrongSideBug(v, low, low + 50)], v, true),
    praise: 'Du hast in Zehnern von der 0 aus gezählt.',
    srText: say(lineInWords(axis), prompt),
  };
}

function readTens(rng: Rng): Form {
  const v = rng.pick(TENS_BELOW);
  const prompt = 'Welche Zahl zeigt der Pfeil A?';
  const axis = line(-100, 100, 50, 10, { labels: [-100, 0, 100], marks: [{ value: v, label: 'A' }] });
  return {
    key: `lesen-zehner:${v}`,
    prompt,
    visual: axis,
    answer: signedNumber(v, { before: 'A =' }),
    hints: ['Schau zuerst: Wie viel zählt ein kleiner Strich?', 'Zähle von der 0 aus nach links.'],
    steps: [`Ein kleiner Strich zählt 10.`, `A liegt ${striche(-v / 10)} links von der 0.`, `A = ${fmt(v)}`],
    bugs: numberBugs([mirrorBug(v), bug('strich-zaehlt', v / 10, 'Schau noch einmal: Ein kleiner Strich zählt hier mehr als 1.')], v, true),
    praise: 'Du hast zuerst den Wert eines Strichs bestimmt.',
    srText: say(lineInWords(axis), prompt),
  };
}

function placeWalk(rng: Rng): Form {
  const start = 10 * rng.int(-6, -1);
  const s = 10 * rng.int(2, Math.min(4, (start + 100) / 10));
  const v = start - s;
  const axis = line(-100, 100, 50, 10);
  const prompt = `Starte bei ${fmt(start)}. Geh ${s} nach links. Setze dort den Pfeil.`;
  return {
    key: `gehen:${start}:${s}`,
    prompt,
    answer: lineAnswer(v, axis),
    hints: ['Nach links werden die Zahlen kleiner.', 'Ein kleiner Strich zählt 10. Zähle die Striche ab.'],
    // the left half of the line, with the two values as labels and no label on the jump: the sentence names the distance, and the labels stay apart
    steps: [`Start: ${fmt(start)}`, { text: `${s} nach links: ${fmt(v)}`, visual: { ...line(-100, 0, 50, 10), marks: [{ value: start, label: fmt(start) }, { value: v, label: fmt(v) }], jumps: [{ from: start, to: v }] } }],
    bugs: numberBugs([bug('richtung-links', start + s, 'Nach links werden die Zahlen kleiner. Der Abstand zur 0 wächst dort.')], v, true),
    praise: 'Du bist in der richtigen Richtung gegangen.',
    srText: say(lineInWords(axis), prompt),
    kmk: ['PK.problemloesen'],
  };
}

function placeMiddle(rng: Rng): Form {
  const half = 10 * rng.int(2, 4);
  const mid = 10 * rng.int(-5, -1);
  const a = mid - half;
  const b = mid + half;
  const axis = line(-100, 100, 50, 10);
  const prompt = `Setze den Pfeil in die Mitte zwischen ${fmt(a)} und ${fmt(b)}.`;
  const ignore = (Math.abs(a) + Math.abs(b)) / 2;
  return {
    key: `mitte:${a}:${b}`,
    prompt,
    answer: lineAnswer(mid, axis),
    hints: ['Zähle die Striche von der einen Zahl bis zur anderen.', 'Halbiere die Anzahl und geh so weit von einem Ende.'],
    steps: [`Von ${fmt(a)} bis ${fmt(b)} sind es ${(b - a) / 10} Striche.`, `Die Hälfte sind ${half / 10} Striche.`, { text: `Die Mitte ist ${fmt(mid)}.`, visual: { ...axis, marks: [{ value: a, label: 'a' }, { value: mid, label: fmt(mid) }, { value: b, label: 'b' }] } }],
    bugs: numberBugs([bug('vorzeichen-ignoriert', ignore, 'Prüfe mit den Strichen: Beide Abstände zur Mitte sind gleich groß.')], mid, true),
    praise: 'Du hast den Abstand halbiert.',
    srText: say(lineInWords(axis), prompt),
    kmk: ['PK.problemloesen'],
  };
}

// ─── Stufe 3: a section without zero, a scale ────────────────────────────────

function placeSection(rng: Rng): Form {
  const min = -50 * rng.int(3, 8);
  const max = min + 100;
  let v = min + 5 * rng.int(1, 19);
  if ((v - min) % 20 === 0) v += 5;
  const axis = line(min, max, 20, 5);
  const prompt = `Setze den Pfeil auf ${fmt(v)}. Hier fehlt die 0.`;
  return {
    key: `ausschnitt-setzen:${min}:${v}`,
    prompt,
    answer: lineAnswer(v, axis),
    hints: ['Schau auf beide Enden: Welches ist kleiner?', 'Ein kleiner Strich zählt 5.'],
    steps: [`Links steht die kleinste Zahl, ${fmt(min)}.`, { text: `Von ${fmt(min)} ${sindEs((v - min) / 5, striche)} bis ${fmt(v)}.`, visual: { ...axis, marks: [{ value: v, label: fmt(v) }] } }],
    bugs: numberBugs([wrongSideBug(v, min, max)], v, true),
    praise: 'Du hast den Ausschnitt an den Enden geprüft.',
    srText: say(lineInWords(axis), prompt),
  };
}

function readSection(rng: Rng): Form {
  const width = rng.pick([200, 400]);
  const minor = width / 20;
  const min = -width - 100 * rng.int(1, 8);
  const max = min + width;
  let v = min + minor * rng.int(1, 19);
  if (v === min + width / 2) v += minor;
  const prompt = 'Hier fehlt die 0. Welche Zahl zeigt der Pfeil A?';
  const axis = line(min, max, width / 4, minor, { labels: [min, max], marks: [{ value: v, label: 'A' }] });
  return {
    key: `ausschnitt-lesen:${min}:${width}:${v}`,
    prompt,
    visual: axis,
    answer: signedNumber(v, { before: 'A =' }),
    hints: ['Wie viel zählt ein kleiner Strich? Teile den Abstand der Enden.', 'Zähle vom linken Ende nach rechts: Dort werden die Zahlen größer.'],
    steps: [`Von ${fmt(min)} bis ${fmt(max)} sind es ${fmt(width)}, also zählt ein Strich ${fmt(minor)}.`, `A liegt ${striche((v - min) / minor)} rechts von ${fmt(min)}.`, `A = ${fmt(v)}`],
    bugs: numberBugs([
      wrongSideBug(v, min, max),
      bug('vorzeichen-vergessen', -v, LEFT_NEGATIVE),
      bug('strich-zaehlt', min + (v - min) / minor, 'Schau noch einmal: Wie viel zählt ein kleiner Strich?'),
    ], v, true),
    praise: 'Du hast den Wert eines Strichs selbst bestimmt.',
    srText: say(lineInWords(axis), prompt),
  };
}

function tickValue(rng: Rng): Form {
  const sections = rng.pick([4, 5, 8, 10]);
  const value = rng.pick([5, 10, 20, 25, 50, 100]);
  const width = sections * value;
  // mostly a section without zero; sometimes the 0 lies inside but stays unmarked
  const min = rng.chance(0.7) ? -width - value * rng.int(1, 6) : -value * rng.int(1, sections - 1);
  const max = min + width;
  const prompt = `Die Zahlengerade hat ${sections} gleiche Abschnitte. Wie viel zählt ein Abschnitt?`;
  const ignore = (Math.abs(min) + Math.abs(max)) / sections;
  const axis = line(min, max, value, value, { labels: [min, max] });
  return {
    key: `abschnitt:${min}:${max}:${sections}`,
    prompt,
    visual: axis,
    answer: signedNumber(value),
    hints: ['Wie weit ist es vom linken Ende bis zum rechten Ende?', 'Teile diesen Abstand durch die Zahl der Abschnitte.'],
    steps: [`Von ${fmt(min)} bis ${fmt(max)} sind es ${fmt(width)}.`, `${fmt(width)} : ${sections} = ${fmt(value)}`],
    bugs: numberBugs([
      bug('abstand-ganz', width, 'Das ist der ganze Abstand. Teile den Abstand durch die Zahl der Abschnitte.'),
      Number.isInteger(ignore) && bug('vorzeichen-ignoriert', ignore, 'Prüfe den Abstand der Enden: Liegen beide auf derselben Seite der 0?'),
    ], value, true),
    praise: 'Du hast den Abstand gleichmäßig aufgeteilt.',
    srText: say(lineInWords(axis), prompt),
    kmk: ['PK.darstellen'],
  };
}

function chooseScale(rng: Rng): Form {
  const a = -5 * rng.int(4, 10);
  const b = -5 * (2 * rng.int(0, 1) + 1);
  const min = Math.floor((a - 5) / 10) * 10;
  const upper = (top: number) => Math.ceil((top + 5) / 10) * 10;
  // the right scale keeps its own condition: at most 20 ticks with one for every 5, both ends counted
  const c = rng.pick([5, 10, 15, 20, 25, 30].filter((top) => (upper(top) - min) / 5 + 1 <= 20));
  const max = upper(c);
  const option = (from: number, to: number, step: number) => `von ${fmt(from)} bis ${fmt(to)}, ein Strich zählt ${step}`;
  const prompt = 'Welche Einteilung passt?';
  const context = `Trag ${fmt(a)}, ${fmt(b)} und ${fmt(c)} auf einer Zahlengeraden ein. Die Gerade hat höchstens 20 Striche.`;
  return {
    key: `skala:${a}:${b}:${c}`,
    context,
    prompt,
    answer: makeChoice(rng, { label: option(min, max, 5) }, [
      { label: option(a + 10, max, 5), whyWrong: `Hier fehlt ${fmt(a)}. Prüfe beide Enden.` },
      { label: option(min, max, 1), whyWrong: 'Das sind mehr als 20 Striche. Zähle nach.' },
      { label: option(min, max, 20), whyWrong: `Dann liegt ${fmt(b)} auf keinem Strich.` },
    ]),
    hints: ['Liegen alle drei Zahlen zwischen den Enden?', 'Liegt jede Zahl auf einem Strich? Sind es höchstens 20 Striche?'],
    steps: [`Die Enden müssen ${fmt(a)} und ${fmt(c)} einschließen.`, `Alle Zahlen sind Vielfache von 5, also passt ein Strich für 5.`, `Passend: ${option(min, max, 5)}.`],
    praise: 'Du hast Enden und Strichabstand geprüft.',
    srText: say(context, prompt),
    kmk: ['PK.darstellen'],
  };
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = {
  1: (rng, ab) => (ab === 1 ? readOne(rng) : ab === 2 ? readTwo(rng) : rng.chance(0.5) ? walkSteps(rng) : placeSmall(rng)),
  2: (rng, ab) => (ab === 1 ? placeTens(rng, false) : ab === 2 ? (rng.chance(0.6) ? placeTens(rng, true) : readTens(rng)) : rng.chance(0.5) ? placeWalk(rng) : placeMiddle(rng)),
  3: (rng, ab) => (ab === 1 ? placeSection(rng) : ab === 2 ? readSection(rng) : rng.chance(0.5) ? chooseScale(rng) : tickValue(rng)),
};

export const zahlengeradeSkill: SkillDef = {
  ...SKILL,
  title: 'Die Zahlengerade',
  description: 'Du liest ganze Zahlen ab und trägst sie ein.',
  stufen: { 1: 'Marken ablesen, −10 bis 10, Schritt 1', 2: 'Zahlen eintragen, −100 bis 100, Schritt 10', 3: 'Ausschnitt ohne 0; eine Einteilung wählen' },
  kmk: [...KMK_ZAHLEN, 'PK.problemloesen', 'PK.darstellen'],
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_ZAHLEN, FORMS[stufe](rng, ab));
  },
};
