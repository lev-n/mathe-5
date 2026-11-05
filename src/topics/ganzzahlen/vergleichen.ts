/**
 * Größer oder kleiner? (docs/research.md §6). Stufe 1: a negative against a positive number. Stufe 2: two negatives. Stufe 3: order five; test the
 * claim "größerer Betrag heißt größer".
 */
import { BOX, fmt, fmtQty, fmtTemp } from '../../core/format';
import type { Ab, ChoiceAnswer, ChoiceOption, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, numberBugs, orderAnswer, pickPerson, signedNumber, targetAb } from '../shared';
import { assemble, bug, type Form, KMK_ZAHLEN, lineAround, lineForMarks, say, VORZEICHEN_GLOSS } from './helpers';

const SKILL = { id: 'ganzzahlen.vergleichen', topicId: 'ganzzahlen' } as const;

const RIGHT_BIGGER = 'Weiter rechts auf der Zahlengeraden heißt: größer.';
/** Without the word Betrag: T11 asks for a gloss at its first use, and this core skill comes before the optional Betrag skill. */
const FAR_MEANS_LESS = 'Bei negativen Zahlen gilt: Weiter weg von der 0 heißt kleiner.';

function signChoice(rng: Rng, a: number, b: number, why: string): ChoiceAnswer {
  const right = a < b ? '<' : '>';
  const wrong = a < b ? '>' : '<';
  return makeChoice(rng, { label: right }, [{ label: wrong, whyWrong: why }], { layout: 'symbols', order: ['<', '>'] });
}

function chainOf(values: number[]): string {
  return [...values].sort((x, y) => x - y).map((v) => fmt(v)).join(' < ');
}

function signForm(rng: Rng, a: number, b: number, why: string, hints: string[], praise: string, withLine: boolean, show: (v: number) => string = fmt): Form {
  // the signs stand on the buttons: in a sentence the voice reads them as a comparison
  const prompt = 'Welches Zeichen passt?';
  const expression = `${show(a)} ${BOX} ${show(b)}`;
  const axis = lineAround([a, b]);
  return {
    key: `zeichen:${a}:${b}:${show === fmt ? 'zahl' : 'grad'}`,
    prompt,
    expression,
    ...(withLine ? { visual: axis } : {}),
    answer: signChoice(rng, a, b, why),
    hints,
    steps: [
      { text: `${show(Math.min(a, b))} liegt links von ${show(Math.max(a, b))}.`, visual: { ...lineForMarks(a, b, show), marks: [{ value: a, label: show(a) }, { value: b, label: show(b) }] } },
      `Also gilt: ${show(a)} ${a < b ? '<' : '>'} ${show(b)}`,
    ],
    praise,
    srText: say('Welches Zeichen passt: kleiner als oder größer als?', expression),
  };
}

// ─── Stufe 1: negative against positive ──────────────────────────────────────

function mixedPair(rng: Rng, max: number): [number, number] {
  const neg = -rng.int(1, max);
  const pos = rng.chance(0.2) ? 0 : rng.int(1, Math.max(2, Math.ceil(max / 4)));
  return rng.chance(0.5) ? [neg, pos] : [pos, neg];
}

const MIXED_WHY = 'Eine negative Zahl liegt links von der 0. Links ist kleiner.';

function truthForm(rng: Rng): Form {
  const big = rng.int(11, 99);
  const small = rng.int(1, 9);
  const person = pickPerson(rng).name;
  const context = `${person} sagt: ${fmt(-big)} ist größer als ${small}. Die ${big} ist ja größer als ${small}.`;
  const prompt = `Hat ${person} recht?`;
  return {
    key: `stimmt:${big}:${small}`,
    context,
    prompt,
    answer: makeChoice(rng, { label: `Nein. ${fmt(-big)} liegt links von ${small}.` }, [
      { label: `Ja. ${big} ist größer als ${small}.`, whyWrong: 'Hier geht es um die negative Zahl. Schau auf die Lage an der Zahlengeraden.' },
      { label: `Ja. ${fmt(-big)} liegt rechts von ${small}.`, whyWrong: MIXED_WHY },
    ]),
    hints: ['Stell dir beide Zahlen auf der Zahlengeraden vor.', RIGHT_BIGGER],
    steps: [`${fmt(-big)} liegt links von der 0, ${small} rechts davon.`, `Also gilt: ${fmt(-big)} < ${small}`],
    praise: 'Du hast die Lage geprüft, nicht die Ziffern.',
    srText: say(context, prompt),
    kmk: ['PK.argumentieren'],
  };
}

function largestForm(rng: Rng): Form {
  const pos = rng.int(1, 9);
  const negs = rng.sample([12, 25, 37, 48, 56, 64, 73, 89, 95], 3).map((n) => -n);
  const prompt = 'Welche Zahl ist am größten?';
  return {
    key: `groesste:${pos}:${[...negs].sort((x, y) => x - y).join(':')}`,
    prompt,
    answer: makeChoice(rng, { label: fmt(pos) }, negs.map((n) => ({ label: fmt(n), whyWrong: MIXED_WHY }))),
    hints: ['Trenne zuerst: Welche Zahlen sind negativ?', 'Jede positive Zahl ist größer als jede negative Zahl.'],
    steps: [`Nur ${pos} ist positiv.`, `${pos} liegt am weitesten rechts.`],
    praise: 'Du hast zuerst auf das Minus geschaut.',
    srText: say(prompt),
  };
}

function stufe1(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    const [a, b] = mixedPair(rng, 10);
    return signForm(rng, a, b, MIXED_WHY, ['Stell dir beide Zahlen auf der Zahlengeraden vor.', RIGHT_BIGGER], 'Du hast auf das Minus geschaut.', true);
  }
  if (ab === 2) {
    const temp = rng.chance(0.4);
    const [a, b] = mixedPair(rng, temp ? 30 : 90);
    return signForm(rng, a, b, MIXED_WHY, [`${VORZEICHEN_GLOSS} Schau zuerst darauf.`, 'Jede negative Zahl ist kleiner als jede positive Zahl.'], 'Du hast das Minus geprüft, nicht die Ziffern.', false, temp ? fmtTemp : fmt);
  }
  return rng.chance(0.5) ? truthForm(rng) : largestForm(rng);
}

// ─── Stufe 2: two negatives ──────────────────────────────────────────────────

const NEGATIVE_WHY = (nearer: number) => `${fmt(nearer)} liegt weiter rechts. Rechts ist größer.`;

function twoNegatives(rng: Rng, max: number): [number, number] {
  const a = -rng.int(1, max);
  let b = -rng.int(1, max);
  if (b === a) b = a === -1 ? -2 : a + 1;
  return [a, b];
}

function colderForm(rng: Rng): Form {
  const [a, b] = twoNegatives(rng, 30);
  const colder = Math.min(a, b);
  const warmer = Math.max(a, b);
  const prompt = 'Welche Temperatur ist kälter?';
  return {
    key: `kaelter:${a}:${b}`,
    prompt,
    answer: makeChoice(rng, { label: fmtTemp(colder) }, [{ label: fmtTemp(warmer), whyWrong: 'Kälter heißt: weiter unten am Thermometer. Weiter unter 0 ist kälter.' }]),
    hints: ['Stell dir beide Temperaturen am Thermometer vor.', 'Weiter unter 0 heißt kälter.'],
    steps: [`${fmtTemp(colder)} liegt weiter unter 0 als ${fmtTemp(warmer)}.`, `Kälter ist ${fmtTemp(colder)}.`],
    praise: 'Du hast den Abstand unter null verglichen.',
    srText: say(prompt, `${fmtTemp(a)} oder ${fmtTemp(b)}`),
  };
}

function deeperForm(rng: Rng): Form {
  const a = -5 * rng.int(2, 60);
  let b = -5 * rng.int(2, 60);
  if (a === b) b = a - 15;
  const deep = Math.min(a, b);
  const high = Math.max(a, b);
  const prompt = 'Welche Höhe liegt tiefer?';
  return {
    key: `tiefer:${a}:${b}`,
    prompt,
    answer: makeChoice(rng, { label: fmtQty(deep, 'm') }, [{ label: fmtQty(high, 'm'), whyWrong: 'Tiefer heißt: weiter unter dem Meeresspiegel. Vergleiche den Abstand zur 0.' }]),
    hints: ['0 m ist der Meeresspiegel.', 'Weiter unter 0 heißt tiefer.'],
    steps: [`${fmtQty(deep, 'm')} liegt weiter unter 0 als ${fmtQty(high, 'm')}.`, `Tiefer liegt ${fmtQty(deep, 'm')}.`],
    praise: 'Du hast den Abstand zum Meeresspiegel verglichen.',
    srText: say(prompt, `${fmtQty(a, 'm')} oder ${fmtQty(b, 'm')}`),
  };
}

function betweenForm(rng: Rng): Form {
  const k = rng.int(2, 40);
  const t = -k;
  const prompt = 'Welche ganze Zahl passt in die Lücke?';
  const expression = `${fmt(t - 1)} < ${BOX} < ${fmt(t + 1)}`;
  return {
    key: `zwischen:${t}`,
    prompt,
    expression,
    answer: signedNumber(t),
    hints: ['Zwischen den beiden Zahlen liegt genau eine ganze Zahl.', 'Stell dir die Zahlengerade vor und zähle nach rechts.'],
    steps: [`Von ${fmt(t - 1)} einen Schritt nach rechts.`, `Das ist ${fmt(t)}.`],
    bugs: numberBugs([bug('vorzeichen-vergessen', k, 'Beide Grenzen sind negativ. Die gesuchte Zahl liegt auch links von der 0.')], t, true),
    praise: 'Du hast die Zahlen an der Geraden geordnet.',
    srText: say(prompt, expression),
  };
}

function neighbourForm(rng: Rng): Form {
  const a = -rng.int(3, 90);
  const right = rng.chance(0.5);
  const v = right ? a + 1 : a - 1;
  const prompt = `Welche ganze Zahl liegt direkt ${right ? 'rechts' : 'links'} von ${fmt(a)}?`;
  return {
    key: `nachbar:${a}:${right ? 'r' : 'l'}`,
    prompt,
    answer: signedNumber(v),
    hints: ['Nach rechts werden die Zahlen größer.', 'Links von der 0 kommst du nach rechts näher an die 0.'],
    // a step on the line, no calculating line: this core skill also runs under integersAsStates (§2.5)
    steps: [`Von ${fmt(a)} einen Schritt nach ${right ? 'rechts' : 'links'}.`, `Das ist ${fmt(v)}.`],
    bugs: numberBugs([bug('betrag-groesser', right ? a - 1 : a + 1, right ? 'Nach rechts wird die Zahl größer. Du kommst dort näher an die 0.' : 'Nach links wird die Zahl kleiner. Du kommst dort weiter weg von der 0.')], v, true),
    praise: 'Du hast die Richtung auf der Geraden beachtet.',
    srText: say(prompt),
  };
}

function stufe2(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    const [a, b] = twoNegatives(rng, 20);
    return signForm(rng, a, b, NEGATIVE_WHY(Math.max(a, b)), ['Stell dir beide Zahlen auf der Zahlengeraden vor.', RIGHT_BIGGER], 'Du hast die Lage auf der Geraden verglichen.', true);
  }
  if (ab === 2) {
    const kind = rng.int(0, 2);
    if (kind === 0) {
      const a = -rng.int(100, 900);
      let b = -(Math.abs(a) + rng.pick([-9, -5, 3, 9, 27, 90]));
      if (b === a || b >= 0) b = a - 9;
      return signForm(rng, a, b, NEGATIVE_WHY(Math.max(a, b)), ['Welche Zahl liegt weiter weg von der 0?', FAR_MEANS_LESS], 'Du hast die Lage verglichen, nicht nur die Ziffern.', false);
    }
    return kind === 1 ? colderForm(rng) : deeperForm(rng);
  }
  return rng.chance(0.5) ? betweenForm(rng) : neighbourForm(rng);
}

// ─── Stufe 3: order five, test a claim ───────────────────────────────────────

/** n distinct non-zero values from ±max, at least two of them negative and one positive, with all absolute values different. */
function mixedValues(rng: Rng, n: number, max: number): number[] {
  const absolutes = rng.sample(Array.from({ length: max }, (_, i) => i + 1), n);
  return absolutes.map((v, i) => (i < 2 ? -v : i === 2 ? v : rng.chance(0.6) ? -v : v));
}

function orderForm(rng: Rng, values: number[], direction: 'aufsteigend' | 'absteigend'): Form {
  const answer = orderAnswer(rng, values, direction);
  const ascending = direction === 'aufsteigend';
  const asc = [...values].sort((x, y) => x - y);
  const indexOf = (v: number) => answer.items.indexOf(fmt(v));
  const sequence = (seq: number[]) => (ascending ? seq : [...seq].reverse()).map(indexOf);
  const byAbs = [...values].sort((x, y) => Math.abs(x) - Math.abs(y));
  const negatives = asc.filter((v) => v < 0);
  const rest = asc.filter((v) => v >= 0);
  const prompt = ascending ? 'Ordne die Zahlen. Beginne mit der kleinsten.' : 'Ordne die Zahlen. Beginne mit der größten.';
  const shown = ascending ? asc : [...asc].reverse();
  const sign = ascending ? '<' : '>';
  return {
    key: `ordnen:${asc.join(':')}:${direction}`,
    prompt,
    answer,
    hints: ['Trenne zuerst die negativen Zahlen von den anderen.', FAR_MEANS_LESS],
    steps: [
      negatives.length > 1 ? `Die negativen Zahlen, von links nach rechts: ${negatives.map((v) => fmt(v)).join(' < ')}` : `Die einzige negative Zahl ist ${fmt(negatives[0])}.`,
      `Danach kommen die anderen: ${rest.map((v) => fmt(v)).join(' < ')}`,
      `Geordnet: ${shown.map((v) => fmt(v)).join(` ${sign} `)}`,
    ],
    bugs: [
      bug('betrag-groesser', sequence(byAbs), 'Du hast nach dem Abstand zur 0 geordnet. Schau auch auf das Minus.'),
      bug('negative-umgedreht', sequence([...[...negatives].reverse(), ...rest]), FAR_MEANS_LESS),
    ].filter((b) => JSON.stringify(b.match) !== JSON.stringify(answer.correct)),
    praise: 'Du hast Minus und Abstand zur 0 beachtet.',
    srText: say(prompt, values.map((v) => fmt(v)).join(', ')),
  };
}

function counterexample(rng: Rng): Form {
  const big = rng.int(5, 40);
  const small = rng.int(1, big - 1);
  const correct = rng.chance(0.6) ? `${fmt(-big)} und ${fmt(-small)}` : `${fmt(-big)} und ${fmt(small)}`;
  const person = pickPerson(rng).name;
  const context = `Der Betrag ist der Abstand zur 0. ${person} sagt: Die Zahl mit dem größeren Betrag ist immer größer.`;
  const prompt = `Welches Paar zeigt, dass ${person} nicht recht hat?`;
  const fits = 'Bei diesem Paar stimmt der Satz. Such ein anderes Paar.';
  const wrongs: ChoiceOption[] = [
    { label: `${big} und ${small}`, whyWrong: fits },
    { label: `${big} und ${fmt(-small)}`, whyWrong: fits },
    { label: `${big + 3} und ${small + 1}`, whyWrong: fits },
  ];
  return {
    key: `gegenbeispiel:${big}:${small}:${correct.includes(`und ${fmt(-small)}`) ? 'nn' : 'np'}`,
    context,
    prompt,
    answer: makeChoice(rng, { label: correct }, wrongs),
    hints: ['Schreib zu jeder Zahl den Abstand zur 0 auf.', 'Prüfe bei jedem Paar: Hat die Zahl mit dem größeren Betrag den größeren Wert?'],
    steps: [`Bei ${correct} hat ${fmt(-big)} den größeren Betrag.`, `${fmt(-big)} ist aber die kleinere Zahl.`, `Also passt ${correct} als Gegenbeispiel.`],
    praise: 'Du hast ein Gegenbeispiel gefunden.',
    srText: say(context, prompt),
    kmk: ['PK.argumentieren'],
  };
}

function rightChain(rng: Rng): Form {
  const values = mixedValues(rng, 4, 30);
  const asc = [...values].sort((x, y) => x - y);
  const byAbs = [...values].sort((x, y) => Math.abs(x) - Math.abs(y));
  const negatives = asc.filter((v) => v < 0);
  const rest = asc.filter((v) => v >= 0);
  const reversedNegatives = [...[...negatives].reverse(), ...rest];
  const sameChain = (seq: number[]) => seq.map((v) => fmt(v)).join(' < ');
  const prompt = 'Welche Reihe ist richtig geordnet?';
  return {
    key: `reihe:${asc.join(':')}`,
    prompt,
    answer: makeChoice(rng, { label: chainOf(values) }, [
      { label: sameChain(byAbs), whyWrong: 'Diese Reihe ist nach dem Abstand zur 0 geordnet. Schau auch auf das Minus.' },
      { label: sameChain(reversedNegatives), whyWrong: `Prüfe die negativen Zahlen. ${FAR_MEANS_LESS}` },
      { label: sameChain([...rest, ...negatives]), whyWrong: 'Negative Zahlen kommen vor den positiven Zahlen.' },
    ]),
    hints: ['In der Reihe steht links immer die kleinere Zahl.', FAR_MEANS_LESS],
    steps: [`Negative Zahlen zuerst: ${negatives.map((v) => fmt(v)).join(' < ')}`, `Geordnet: ${chainOf(values)}`],
    praise: 'Du hast jede Reihe an der Geraden geprüft.',
    srText: say(prompt),
    kmk: ['PK.argumentieren'],
  };
}

function stufe3(rng: Rng, ab: Ab): Form {
  if (ab === 1) return orderForm(rng, mixedValues(rng, 5, 20), 'aufsteigend');
  if (ab === 2) {
    // a number close to another one, with the same digits up front
    const values = mixedValues(rng, 4, 500);
    const close = values[0] - rng.pick([9, 18, 90]);
    const five = values.some((v) => Math.abs(v) === Math.abs(close)) ? [...values, 0] : [...values, close];
    return orderForm(rng, five, rng.chance(0.5) ? 'absteigend' : 'aufsteigend');
  }
  return rng.chance(0.5) ? counterexample(rng) : rightChain(rng);
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const vergleichenSkill: SkillDef = {
  ...SKILL,
  title: 'Größer oder kleiner?',
  description: 'Du vergleichst und ordnest positive und negative Zahlen.',
  stufen: { 1: 'Negativ gegen positiv; < und > nutzen', 2: 'Zwei negative Zahlen: −7 und −3', 3: 'Fünf Zahlen ordnen; prüfen: größerer Betrag heißt größer?' },
  kmk: [...KMK_ZAHLEN, 'PK.argumentieren'],
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_ZAHLEN, FORMS[stufe](rng, ab));
  },
};

