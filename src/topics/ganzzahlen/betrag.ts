/**
 * Betrag und Gegenzahl (docs/research.md §6). Stufe 1: Gegenzahl on the Zahlengerade. Stufe 2: Betrag as the distance from 0. Stufe 3: two numbers with
 * the same Betrag; find a counterexample.
 */
import { BOX, fmt } from '../../core/format';
import type { Ab, ChoiceOption, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, multiBugs, numberBugs, pickPerson, signedNumber, targetAb } from '../shared';
import { assemble, bug, type Form, KMK_ZAHLEN, line, lineAround, lineInWords, say, schritte, signed, striche } from './helpers';

const SKILL = { id: 'ganzzahlen.betrag', topicId: 'ganzzahlen' } as const;

const OTHER_SIDE = 'Die Gegenzahl liegt auf der anderen Seite der 0.';
const DISTANCE = 'Der Betrag ist der Abstand zur 0. Ein Abstand ist nie negativ.';
const BETRAG_GLOSS = 'Der Betrag ist der Abstand einer Zahl zur 0.';

const abs = (v: number) => `|${fmt(v)}|`;

// ─── Stufe 1: Gegenzahl ──────────────────────────────────────────────────────

function opposite(rng: Rng): Form {
  const v = signed(rng.int(1, 9), rng.chance(0.65));
  const prompt = `Wie heißt die Gegenzahl von ${fmt(v)}?`;
  const axis = line(-10, 10, 5, 1);
  return {
    key: `gegenzahl:${v}`,
    prompt,
    visual: { ...axis, marks: [{ value: v, label: 'A' }] },
    answer: signedNumber(-v),
    hints: ['Spiegle den Pfeil an der 0.', 'Die Gegenzahl hat denselben Abstand zur 0.'],
    steps: [
      `${fmt(v)} liegt ${striche(Math.abs(v))} ${v < 0 ? 'links' : 'rechts'} von der 0.`,
      { text: `Die Gegenzahl liegt ${striche(Math.abs(v))} ${v < 0 ? 'rechts' : 'links'} davon: ${fmt(-v)}.`, visual: { ...axis, marks: [{ value: v, label: fmt(v) }, { value: -v, label: fmt(-v) }] } },
    ],
    bugs: numberBugs([bug('gegenzahl-negativ', v, OTHER_SIDE)], -v, true),
    praise: 'Du hast die Zahl an der 0 gespiegelt.',
    srText: say(lineInWords({ ...axis, marks: [{ value: v, label: 'A' }] }), prompt),
  };
}

function oppositePair(rng: Rng): Form {
  const a = -rng.int(11, 90);
  const b = rng.int(11, 90);
  const fields = [
    { id: 'a', value: -a, signed: true, before: `Die Gegenzahl von ${fmt(a)} ist`, label: `Gegenzahl von ${fmt(a)}` },
    { id: 'b', value: -b, signed: true, before: `Die Gegenzahl von ${fmt(b)} ist`, label: `Gegenzahl von ${fmt(b)}` },
  ];
  const prompt = 'Schreib beide Gegenzahlen auf.';
  return {
    key: `gegenzahl-zwei:${a}:${b}`,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Die Gegenzahl hat denselben Abstand zur 0.', OTHER_SIDE],
    steps: [`Die Gegenzahl von ${fmt(a)} ist ${fmt(-a)}.`, `Die Gegenzahl von ${fmt(b)} ist ${fmt(-b)}.`],
    bugs: multiBugs([
      bug('gegenzahl-negativ', { a, b }, OTHER_SIDE),
      bug('gegenzahl-betrag', { a: -a, b }, 'Die Gegenzahl ist nicht immer positiv. Die Gegenzahl einer positiven Zahl ist negativ.'),
    ], fields),
    praise: 'Du hast bei beiden Zahlen die Seite gewechselt.',
    srText: say(prompt),
  };
}

function oppositeDistance(rng: Rng): Form {
  const v = rng.int(3, 20);
  const distance = 2 * v;
  const context = `Zwei Gegenzahlen haben auf der Zahlengeraden den Abstand ${distance}.`;
  const prompt = 'Wie heißt die positive der beiden Zahlen?';
  return {
    key: `abstand:${distance}`,
    context,
    prompt,
    answer: signedNumber(v),
    hints: ['Gegenzahlen liegen gleich weit von der 0 entfernt.', 'Die 0 liegt genau in der Mitte.'],
    steps: ['Die 0 liegt in der Mitte der beiden Zahlen.', `Halber Abstand: ${distance} : 2 = ${v}`, `Die Zahlen heißen ${fmt(-v)} und ${v}.`],
    bugs: numberBugs([
      bug('ganzer-abstand', distance, 'Das ist der ganze Abstand. Die 0 liegt in der Mitte.'),
      bug('vorzeichen-umgekehrt', -v, 'Gefragt ist die positive der beiden Zahlen.'),
    ], v, true),
    praise: 'Du hast den Abstand an der 0 halbiert.',
    srText: say(context, prompt),
    kmk: ['PK.problemloesen'],
  };
}

// ─── Stufe 2: Betrag ─────────────────────────────────────────────────────────

function betragBugs(v: number) {
  return numberBugs([v < 0 ? bug('betrag-minus', v, DISTANCE) : bug('betrag-gegenzahl', -v, DISTANCE)], Math.abs(v), true);
}

function betragSmall(rng: Rng): Form {
  const v = signed(rng.int(1, 20), rng.chance(0.75));
  const prompt = 'Wie groß ist der Betrag?';
  const expression = `${abs(v)} = ${BOX}`;
  const axis = lineAround([v], { marks: [{ value: v, label: fmt(v) }] });
  return {
    key: `betrag:${v}`,
    prompt,
    expression,
    visual: axis,
    answer: signedNumber(Math.abs(v)),
    hints: [BETRAG_GLOSS, 'Zähle die Schritte von der Zahl bis zur 0.'],
    steps: [`${fmt(v)} liegt ${schritte(Math.abs(v))} von der 0 entfernt.`, `${abs(v)} = ${fmt(Math.abs(v))}`],
    bugs: betragBugs(v),
    praise: 'Du hast den Abstand zur 0 gezählt.',
    srText: say(lineInWords(axis), prompt, expression),
  };
}

function betragWords(rng: Rng): Form {
  const v = signed(rng.int(21, 300), rng.chance(0.8));
  const prompt = `Wie weit ist ${fmt(v)} von der 0 entfernt?`;
  return {
    key: `entfernt:${v}`,
    prompt,
    answer: signedNumber(Math.abs(v)),
    hints: ['Ein Abstand zählt nur die Schritte.', DISTANCE],
    steps: ['Der Abstand zur 0 ist der Betrag.', `${abs(v)} = ${fmt(Math.abs(v))}`],
    bugs: betragBugs(v),
    praise: 'Du hast den Betrag als Abstand verstanden.',
    srText: say(prompt),
  };
}

function biggerBetrag(rng: Rng): Form {
  const big = rng.int(21, 90);
  const small = rng.int(3, big - 5);
  const negativeIsBigger = rng.chance(0.75);
  const a = negativeIsBigger ? -big : big;
  const b = negativeIsBigger ? small : -small;
  // the place in the task says nothing: the options are shuffled, and so are these two
  const [first, second] = rng.chance(0.5) ? [a, b] : [b, a];
  const prompt = 'Welche Zahl hat den größeren Betrag?';
  const expression = `${fmt(first)} oder ${fmt(second)}`;
  return {
    key: `groesserer:${first}:${second}`,
    prompt,
    expression,
    answer: makeChoice(rng, { label: fmt(a) }, [{ label: fmt(b), whyWrong: 'Vergleiche den Abstand zur 0, nicht den Wert der Zahl.' }]),
    hints: [BETRAG_GLOSS, 'Plus oder Minus zählt beim Abstand nicht.'],
    steps: [`${abs(first)} = ${fmt(Math.abs(first))} und ${abs(second)} = ${fmt(Math.abs(second))}`, `${big} ist mehr als ${small}. Den größeren Betrag hat ${fmt(a)}.`],
    praise: 'Du hast die Abstände verglichen, nicht die Werte.',
    srText: say(prompt, expression),
  };
}

/**
 * Rows with commas, no order answer: its input, solution and worksheet join the items with '<', and −8 < 9 < −14 is false. A larger Betrag does not mean a larger
 * number, so this row must never read as a chain.
 */
function orderByBetrag(rng: Rng): Form {
  const absolutes = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 17, 18], 4);
  const values = absolutes.map((v, i) => signed(v, i < 2 || rng.chance(0.5)));
  const sorted = [...values].sort((x, y) => Math.abs(x) - Math.abs(y));
  const row = (seq: readonly number[]) => seq.map((v) => fmt(v)).join(', ');
  const context = 'Ordne nach dem Betrag. Der kleinste Betrag steht vorn.';
  const prompt = 'Welche Reihe stimmt?';
  return {
    key: `ordnen:${[...values].sort((x, y) => x - y).join(':')}`,
    context,
    prompt,
    answer: makeChoice(rng, { label: row(sorted) }, [
      { label: row([...values].sort((x, y) => x - y)), whyWrong: 'Diese Reihe ist nach dem Wert geordnet. Der Betrag ist der Abstand zur 0.' },
      { label: row([...sorted].reverse()), whyWrong: 'Diese Reihe beginnt mit dem größten Betrag.' },
      { label: row([sorted[0], sorted[2], sorted[1], sorted[3]]), whyWrong: 'Schreib zu jeder Zahl den Abstand zur 0 auf. Vergleiche dann.' },
    ]),
    hints: [BETRAG_GLOSS, 'Schreib zu jeder Zahl den Abstand zur 0 auf.'],
    steps: [`Die Beträge: ${sorted.map((v) => fmt(Math.abs(v))).join(', ')}`, `Geordnet: ${row(sorted)}`],
    praise: 'Du hast nach dem Abstand zur 0 geordnet.',
    srText: say(context, prompt),
  };
}

// ─── Stufe 3: two numbers; a counterexample ──────────────────────────────────

function twoWithBetrag(rng: Rng): Form {
  const n = rng.int(3, 60);
  const prompt = `Welche zwei ganzen Zahlen haben den Betrag ${n}?`;
  const fields = [
    { id: 'neg', value: -n, signed: true, before: 'kleinere Zahl:', label: 'kleinere Zahl' },
    { id: 'pos', value: n, signed: true, before: 'größere Zahl:', label: 'größere Zahl' },
  ];
  return {
    key: `zwei:${n}`,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Der Betrag ist der Abstand zur 0.', 'Dieser Abstand passt auf beiden Seiten der 0.'],
    steps: [`Abstand ${n} nach links: ${fmt(-n)}.`, `Abstand ${n} nach rechts: ${n}.`, `Die Zahlen: ${fmt(-n)} und ${n}`],
    bugs: multiBugs([
      bug('betrag-nur-positiv', { neg: n, pos: n }, 'Du hast zweimal dieselbe Zahl. Geh von der 0 auch nach links.'),
      bug('reihenfolge', { neg: n, pos: -n }, 'Schau auf die Felder: Zuerst kommt die kleinere Zahl.'),
    ], fields),
    praise: 'Du hast beide Seiten der 0 geprüft.',
    srText: say(prompt),
  };
}

function betragWithCondition(rng: Rng): Form {
  const n = rng.int(6, 200);
  const positive = rng.chance(0.3);
  const other = rng.int(1, n - 1);
  const v = positive ? n : -n;
  const context = positive
    ? `Eine ganze Zahl hat den Betrag ${n}. Die Zahl ist größer als ${fmt(-other)}.`
    : `Eine ganze Zahl hat den Betrag ${n}. Die Zahl ist kleiner als ${fmt(other)}.`;
  const prompt = 'Wie heißt die Zahl?';
  return {
    key: `bedingung:${n}:${other}:${positive ? 'p' : 'n'}`,
    context,
    prompt,
    answer: signedNumber(v),
    hints: ['Zwei Zahlen haben diesen Betrag. Schreib beide auf.', 'Prüfe dann die zweite Angabe.'],
    steps: [`Den Betrag ${n} haben ${fmt(-n)} und ${n}.`, positive ? `Nur ${n} ist größer als ${fmt(-other)}.` : `Nur ${fmt(-n)} ist kleiner als ${fmt(other)}.`, `Die Zahl heißt ${fmt(v)}.`],
    bugs: numberBugs([bug('betrag-nur-positiv', -v, 'Diese Zahl hat den Betrag auch. Prüfe die zweite Angabe.')], v, true),
    praise: 'Du hast beide Zahlen mit der Angabe geprüft.',
    srText: say(context, prompt),
    kmk: ['PK.problemloesen'],
  };
}

function distanceBetween(rng: Rng): Form {
  const n = rng.int(6, 200);
  const context = `Zwei verschiedene Zahlen haben beide den Betrag ${n}.`;
  const prompt = 'Wie weit liegen die beiden Zahlen auseinander?';
  return {
    key: `auseinander:${n}`,
    context,
    prompt,
    answer: signedNumber(2 * n),
    hints: ['Die beiden Zahlen liegen auf verschiedenen Seiten der 0.', 'Zähle von der einen Zahl bis 0, dann bis zur anderen.'],
    steps: [`Die Zahlen sind ${fmt(-n)} und ${n}.`, `Bis 0 sind es ${n}, dann noch einmal ${n}.`, `${n} + ${n} = ${2 * n}`],
    bugs: numberBugs([
      bug('ganzer-abstand', n, 'Das ist nur der Weg bis 0. Geh bis zur zweiten Zahl weiter.'),
      bug('betrag-nur-positiv', 0, 'Die beiden Zahlen sind verschieden. Eine liegt links von der 0.'),
    ], 2 * n, true),
    praise: 'Du hast den Weg über die 0 gezählt.',
    srText: say(context, prompt),
    kmk: ['PK.problemloesen'],
  };
}

interface Claim {
  id: string;
  text: string;
  /** The correct counterexample, the numbers that fit the claim, and why each of them fits. */
  make(rng: Rng): { correct: number; others: number[]; why: (v: number) => string; steps: string[] };
}

const CLAIMS: Claim[] = [
  {
    id: 'groesser',
    text: 'Der Betrag einer Zahl ist immer größer als die Zahl.',
    make(rng) {
      const correct = rng.int(2, 30);
      const others = rng.sample([2, 3, 5, 7, 9, 11, 13], 3).map((n) => -n);
      return {
        correct,
        others,
        why: (v) => `Bei ${fmt(v)} stimmt der Satz: ${abs(v)} = ${fmt(-v)}. Das ist größer als ${fmt(v)}.`,
        steps: [`${abs(correct)} = ${correct}`, `${correct} ist nicht größer als ${correct}. Also passt ${correct}.`],
      };
    },
  },
  {
    id: 'gegenzahl',
    text: 'Die Gegenzahl einer Zahl ist immer negativ.',
    make(rng) {
      const correct = -rng.int(2, 30);
      const others = rng.sample([2, 4, 6, 8, 10, 12, 15], 3);
      return {
        correct,
        others,
        why: (v) => `Bei ${fmt(v)} stimmt der Satz: Die Gegenzahl ist ${fmt(-v)}.`,
        steps: [`Die Gegenzahl von ${fmt(correct)} ist ${fmt(-correct)}.`, `${fmt(-correct)} ist positiv. Also passt ${fmt(correct)}.`],
      };
    },
  },
  {
    id: 'kleiner',
    text: 'Die Gegenzahl einer Zahl ist immer kleiner als die Zahl.',
    make(rng) {
      const correct = -rng.int(2, 30);
      const others = rng.sample([3, 5, 7, 9, 11, 14, 16], 3);
      return {
        correct,
        others,
        why: (v) => `Bei ${fmt(v)} stimmt der Satz: ${fmt(-v)} ist kleiner als ${fmt(v)}.`,
        steps: [`Die Gegenzahl von ${fmt(correct)} ist ${fmt(-correct)}.`, `${fmt(-correct)} ist größer als ${fmt(correct)}. Also passt ${fmt(correct)}.`],
      };
    },
  },
];

function counterexample(rng: Rng): Form {
  const claim = rng.pick(CLAIMS);
  const made = claim.make(rng);
  const person = pickPerson(rng).name;
  const context = `${person} sagt: ${claim.text}`;
  const prompt = `Welche Zahl zeigt, dass ${person} nicht recht hat?`;
  const wrongs: ChoiceOption[] = made.others.map((v) => ({ label: fmt(v), whyWrong: made.why(v) }));
  return {
    key: `gegenbeispiel:${claim.id}:${made.correct}:${[...made.others].sort((x, y) => x - y).join(':')}`,
    context,
    prompt,
    answer: makeChoice(rng, { label: fmt(made.correct) }, wrongs),
    hints: ['Prüfe den Satz mit jeder Zahl.', 'Du suchst eine Zahl. Für diese Zahl stimmt der Satz nicht.'],
    steps: made.steps,
    praise: 'Du hast den Satz mit einem Gegenbeispiel geprüft.',
    srText: say(context, prompt),
    kmk: ['PK.argumentieren'],
  };
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = {
  1: (rng, ab) => (ab === 1 ? opposite(rng) : ab === 2 ? oppositePair(rng) : oppositeDistance(rng)),
  2: (rng, ab) => (ab === 1 ? betragSmall(rng) : ab === 2 ? (rng.chance(0.6) ? betragWords(rng) : biggerBetrag(rng)) : orderByBetrag(rng)),
  3: (rng, ab) => (ab === 1 ? twoWithBetrag(rng) : ab === 2 ? (rng.chance(0.5) ? betragWithCondition(rng) : distanceBetween(rng)) : counterexample(rng)),
};

export const betragSkill: SkillDef = {
  ...SKILL,
  title: 'Betrag und Gegenzahl',
  description: 'Du findest Abstand zur Null und Gegenzahl.',
  stufen: { 1: 'Gegenzahl auf der Zahlengeraden', 2: 'Betrag: |−8| als Abstand zur 0', 3: 'Zwei Zahlen mit Betrag 6; ein Gegenbeispiel finden' },
  kmk: [...KMK_ZAHLEN, 'PK.problemloesen', 'PK.argumentieren'],
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_ZAHLEN, FORMS[stufe](rng, ab));
  },
};
