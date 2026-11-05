/**
 * zahlen.runden: runden passend zur Aufgabe. The Stufe chooses the content (S1 a named Stufenzahl up to 1 Million without carry, S2 carry across
 * places and which numbers round to this, S3 is rounding sensible and the largest original number); AB varies the demand inside it.
 */
import { APPROX, BOX, fmt, fmtMoney } from '../../core/format';
import type { Ab, Exercise, GenContext, MultiField, Rng, SkillDef, Visual } from '../../core/types';
import { build, makeChoice, multiBugs, numberBugs, targetAb } from '../shared';
import { PLACE_DATIVE, PLACE_NAME, PV, digitAt, floorTo, larger, placeTable, roundTo, smaller, type WholeColumn } from './helpers';

const SKILL = { id: 'zahlen.runden', topicId: 'zahlen' } as const;
const KMK = ['ZO.runden'];

/** From lo to lo + p with half a step of room on both sides: a label at the very end of the drawing is cut off from 6 digits on. */
function roundingLine(lo: number, p: number): Extract<Visual, { type: 'numberLine' }> {
  return { type: 'numberLine', min: lo - p / 2, max: lo + p + p / 2, majorStep: p / 2, minorStep: p / 10, labelMajor: false, labels: [lo, lo + p / 2, lo + p] };
}

function segment(n: number, p: number): Visual {
  return { ...roundingLine(floorTo(n, p), p), marks: [{ value: n, label: fmt(n) }] };
}

function roundBugs(n: number, c: WholeColumn) {
  const p = PV[c];
  const lo = floorTo(n, p);
  const hi = lo + p;
  const r = roundTo(n, p);
  const up = r === hi;
  const decisive = digitAt(n, smaller(c));
  const head = Math.floor(n / p);
  const stelle = `Markiere zuerst die Stelle der ${PLACE_NAME[c]}.`;
  return numberBugs([
    up && digitAt(n, c) === 9 && { id: 'runden-uebertrag', match: lo, hint: `Die ${decisive} rundet auf. Aus ${fmt(head)} ${PLACE_DATIVE[c]} werden ${fmt(head + 1)}.` },
    c !== 'E' && smaller(c) !== 'E' && { id: 'runden-stelle', match: roundTo(n, PV[smaller(c)]), hint: stelle },
    { id: 'runden-stelle-2', match: roundTo(n, PV[larger(c)]), hint: stelle },
    { id: 'runden-richtung', match: up ? lo : hi, hint: up ? `Rechts daneben steht eine ${decisive}. Bei 5 bis 9 rundest du auf.` : `Rechts daneben steht eine ${decisive}. Bei 0 bis 4 rundest du ab.` },
    { id: 'runden-unveraendert', match: n, hint: 'Alle Stellen rechts von dieser Stelle werden zu 0.' },
    up && { id: 'runden-nullen', match: hi + (n - lo), hint: 'Alle Stellen rechts von dieser Stelle werden zu 0.' },
  ], r);
}

function roundTask(ab: Ab, stufe: 1 | 2, n: number, c: WholeColumn, withLine: boolean): Exercise {
  const p = PV[c];
  const r = roundTo(n, p);
  const lo = floorTo(n, p);
  const up = r > lo;
  const carry = up && digitAt(n, c) === 9;
  const right = smaller(c);
  const d = digitAt(n, right);
  return build(SKILL, stufe, {
    key: `runden:${n}:${c}`,
    ab,
    prompt: `Runde auf ${PLACE_NAME[c]}.`,
    expression: `${fmt(n)} ${APPROX} ${BOX}`,
    ...(withLine ? { visual: segment(n, p) } : {}),
    answer: { kind: 'number', value: r, label: 'Gerundete Zahl' },
    hints: [`Schau auf die ${PLACE_NAME[right]}, rechts von den ${PLACE_DATIVE[c]}.`, 'Bei 0 bis 4 rundest du ab. Bei 5 bis 9 rundest du auf.'],
    steps: [
      { text: `Rechts von den ${PLACE_DATIVE[c]} steht eine ${d}.`, visual: placeTable(n, right) },
      `Also rundest du ${up ? 'auf' : 'ab'}.`,
      ...(carry ? [`Aus ${fmt(Math.floor(n / p))} ${PLACE_DATIVE[c]} werden ${fmt(Math.floor(n / p) + 1)}.`] : []),
      `${fmt(n)} ${APPROX} ${fmt(r)}`,
    ],
    bugs: roundBugs(n, c),
    praise: carry ? 'Du hast den Übertrag über die Stellen weitergegeben.' : 'Du hast die Ziffer rechts daneben geprüft.',
    srText: `Runde ${n} auf ${PLACE_NAME[c]}.`,
    kmk: KMK,
  });
}

/** A number below 1 Million that rounds to c without a carry. */
function plainNumber(rng: Rng, c: WholeColumn): number {
  const p = PV[c];
  const digit = rng.int(1, 8);
  const headDigits = 6 - String(p).length;
  const head = headDigits > 0 ? rng.int(1, 10 ** headDigits - 1) : 0;
  const tail = rng.int(1, p - 1);
  return head * p * 10 + digit * p + tail;
}

const STUFE1_PLACES: readonly WholeColumn[] = ['Z', 'H', 'T', 'ZT'];

function whichPlace(rng: Rng, ab: Ab): Exercise {
  // all four roundings differ from each other and from the number, so exactly one place fits
  const places: WholeColumn[] = ['H', 'T', 'ZT', 'HT'];
  const fits = (x: number) => new Set([x, ...places.map((k) => roundTo(x, PV[k]))]).size === places.length + 1 && x < 900_000;
  let n = 123_456;
  for (let tries = 0; tries < 60; tries++) {
    const candidate = rng.int(100_000, 899_999);
    if (fits(candidate)) {
      n = candidate;
      break;
    }
  }
  const c = rng.pick(places);
  const r = roundTo(n, PV[c]);
  const answer = makeChoice(rng, { label: `auf ${PLACE_NAME[c]}` }, places.filter((k) => k !== c).map((k) => ({ label: `auf ${PLACE_NAME[k]}`, whyWrong: `Auf ${PLACE_NAME[k]} gerundet gibt das ${fmt(roundTo(n, PV[k]))}.` })));
  return build(SKILL, 1, {
    key: `stelle:${n}:${c}`,
    ab,
    prompt: 'Auf welche Stelle ist diese Zahl gerundet?',
    expression: `${fmt(n)} ${APPROX} ${fmt(r)}`,
    answer,
    hints: ['Ab welcher Stelle stehen nur noch Nullen?', 'Prüfe deine Wahl: Runde selbst und vergleiche.'],
    steps: [`Rechts von den ${PLACE_DATIVE[c]} stehen nur Nullen.`, `${fmt(n)} ${APPROX} ${fmt(r)} passt zum Runden auf ${PLACE_NAME[c]}.`, `Gerundet ist auf ${PLACE_NAME[c]}.`],
    praise: 'Du hast die Stelle an den Nullen erkannt.',
    srText: `${n} ist ungefähr ${r}. Auf welche Stelle ist diese Zahl gerundet?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 3) return whichPlace(rng, ab);
  const c = ab === 1 ? rng.pick(STUFE1_PLACES) : rng.pick<WholeColumn>(['H', 'T', 'ZT', 'HT']);
  return roundTask(ab, 1, plainNumber(rng, c), c, ab === 1);
}

/** Digit 9 at c (and more 9s before it if chain > 1), a decisive digit from 5 on: the carry runs across places. */
function carryNumber(rng: Rng, c: WholeColumn, chain: number): number {
  const p = PV[c];
  const nines = 10 ** chain - 1;
  const head = rng.pick([1, 2, 3, 4, 5, 6, 7, 8]);
  const tail = rng.int(p / 2, p - 1);
  return (head * 10 ** chain + nines) * p + tail;
}

function whichNumbers(rng: Rng, ab: Ab, tight: boolean): Exercise {
  const c = rng.pick<WholeColumn>(['T', 'ZT', 'HT']);
  const p = PV[c];
  const t = rng.int(2, 98) * p;
  const lowest = t - p / 2;
  const highest = t + p / 2 - 1;
  const step = p / 10;
  const ok = tight ? rng.pick([lowest, highest]) : t + rng.pick([-3, -2, -1, 1, 2, 3, 4]) * step + rng.int(1, step - 1);
  const wrongs = (tight ? [t + p / 2, lowest - 1, t + p] : [t + p / 2 + rng.int(1, step - 1), lowest - rng.int(1, step - 1), t + p + rng.int(1, step - 1)])
    .map((x) => ({ label: fmt(x), whyWrong: `${fmt(x)} ergibt gerundet ${fmt(roundTo(x, p))}.` }));
  return build(SKILL, 2, {
    key: `welche:${t}:${c}:${ok}`,
    ab,
    prompt: `Welche Zahl ergibt auf ${PLACE_NAME[c]} gerundet ${fmt(t)}?`,
    answer: makeChoice(rng, { label: fmt(ok) }, wrongs),
    hints: [`Runde jede Zahl auf ${PLACE_NAME[c]}.`, `Schau jeweils auf die ${PLACE_NAME[smaller(c)]}.`],
    steps: [`Auf ${PLACE_NAME[c]} gerundet gibt ${fmt(t)} jede Zahl von ${fmt(lowest)} bis ${fmt(highest)}.`, `${fmt(ok)} liegt in diesem Bereich.`, `${fmt(ok)} ${APPROX} ${fmt(t)}`],
    praise: 'Du hast jede Zahl geprüft und verglichen.',
    srText: `Welche Zahl ergibt auf ${PLACE_NAME[c]} gerundet ${t}?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) {
    const c = rng.pick<WholeColumn>(['T', 'ZT', 'HT', 'M']);
    return roundTask(ab, 2, carryNumber(rng, c, 1), c, false);
  }
  if (ab === 2) {
    if (rng.chance(0.3)) return whichNumbers(rng, ab, false);
    const c = rng.pick<WholeColumn>(['H', 'T', 'ZT', 'HT']);
    return roundTask(ab, 2, carryNumber(rng, c, rng.int(2, 3)), c, false);
  }
  return whichNumbers(rng, ab, true);
}

/** A count where a rounded value is fine, and the place it is rounded to. */
const ROUND_OK: readonly { where: string; things: string; c: WholeColumn; text: string }[] = [
  { where: 'Zeitung', things: 'Zuschauer beim Spiel', c: 'T', text: 'Bei Zuschauern reicht eine ungefähre Zahl.' },
  { where: 'Stadtporträt', things: 'Einwohner', c: 'ZT', text: 'Bei Einwohnern reicht eine ungefähre Zahl.' },
  { where: 'Zoo-Prospekt', things: 'Besucher im Jahr', c: 'T', text: 'Bei Besuchern im Jahr reicht eine ungefähre Zahl.' },
  { where: 'Klassenfahrt', things: 'Schritte beim Wandern', c: 'T', text: 'Bei Schritten reicht eine ungefähre Zahl.' },
  { where: 'Bücherei', things: 'Bücher im Regal', c: 'T', text: 'Bei Büchern im Regal reicht eine ungefähre Zahl.' },
  { where: 'Stadtwald', things: 'Bäume im Bericht', c: 'ZT', text: 'Bei Bäumen im Bericht reicht eine ungefähre Zahl.' },
];

/** A number that has to be exact: the rounding next to it is correct, and still makes no sense. */
const ROUND_NEVER: readonly ((rng: Rng) => { label: string; why: string })[] = [
  (rng) => { const n = rng.int(1001, 9999); return { label: `Zahlencode am Fahrradschloss: ${n} ${APPROX} ${roundTo(n, 100)}`, why: 'Ein Code muss genau stimmen. Gerundet geht das Schloss nicht auf.' }; },
  (rng) => { const n = rng.int(11, 99) * 10 + rng.int(1, 9); return { label: `Preis an der Kasse: ${fmtMoney(n)} ${APPROX} ${fmtMoney(roundTo(n, 10))}`, why: 'An der Kasse zählt jeder Cent.' }; },
  (rng) => { const n = rng.int(11, 89) * 10 + rng.int(1, 9); return { label: `Busnummer: ${n} ${APPROX} ${roundTo(n, 10)}`, why: 'Eine Busnummer ist ein Name. Gerundet fährt ein anderer Bus.' }; },
  (rng) => { const n = rng.int(1001, 9999); return { label: `Startnummer beim Stadtlauf: ${n} ${APPROX} ${roundTo(n, 100)}`, why: 'Eine Startnummer gehört genau einer Person.' }; },
  (rng) => { const n = rng.int(11, 99); return { label: `Hausnummer: ${n} ${APPROX} ${roundTo(n, 10)}`, why: 'Eine Hausnummer nennt genau ein Haus.' }; },
  (rng) => { const n = rng.int(11, 49) * 10 + rng.int(1, 9); return { label: `Zimmernummer im Hotel: ${n} ${APPROX} ${roundTo(n, 10)}`, why: 'Eine Zimmernummer nennt genau ein Zimmer.' }; },
];

/**
 * Is rounding sensible here, and is it done right? Common sense only rules out the number that has to be exact: two of the three other lines are
 * rounded wrongly, and the right one needs a carry, so the child rounds as well.
 */
function sensible(rng: Rng, ab: Ab): Exercise {
  const [right, noCarry, wrongWay] = rng.sample(ROUND_OK, 3);
  const line = (x: { where: string; things: string }, n: number, r: number) => `${x.where}: ${fmt(n)} ${x.things} ${APPROX} ${fmt(r)}`;
  const n = carryNumber(rng, right.c, 1);
  const r = roundTo(n, PV[right.c]);
  // the carry left out
  const m = carryNumber(rng, noCarry.c, 1);
  // a number below the middle, rounded up all the same
  const q = rng.int(11, 89) * PV[wrongWay.c] + rng.int(1, PV[wrongWay.c] / 2 - 1);
  const never = rng.pick(ROUND_NEVER)(rng);
  const wrong = (shownN: number, c: WholeColumn) => `Hier passt Runden. Aber ${fmt(shownN)} ergibt gerundet ${fmt(roundTo(shownN, PV[c]))}.`;
  const correct = line(right, n, r);
  const answer = makeChoice(rng, { label: correct }, [
    { label: line(noCarry, m, floorTo(m, PV[noCarry.c])), whyWrong: wrong(m, noCarry.c) },
    { label: line(wrongWay, q, floorTo(q, PV[wrongWay.c]) + PV[wrongWay.c]), whyWrong: wrong(q, wrongWay.c) },
    { label: never.label, whyWrong: never.why },
  ]);
  const prompt = 'Wo ist das Runden sinnvoll und auch richtig?';
  return build(SKILL, 3, {
    key: `sinn:${right.c}:${answer.options.map((o) => o.label).join('|')}`,
    ab,
    prompt,
    answer,
    hints: ['Frag dich zuerst: Darf diese Zahl ungefähr sein?', 'Runde die anderen Zahlen dann selbst und vergleiche.'],
    steps: [never.why, right.text, `${fmt(n)} ${APPROX} ${fmt(r)} stimmt: Der Übertrag läuft über die ${PLACE_NAME[right.c]}.`, `Richtig ist: ${correct}.`],
    praise: 'Du hast den Sinn und das Runden geprüft.',
    srText: prompt,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

function largestOriginal(rng: Rng, ab: Ab): Exercise {
  const c = rng.pick<WholeColumn>(['H', 'T', 'ZT']);
  const p = PV[c];
  const t = rng.int(3, 980) * p;
  const value = t + p / 2 - 1;
  return build(SKILL, 3, {
    key: `groesste:${t}:${c}`,
    ab,
    prompt: `Eine Zahl ergibt auf ${PLACE_NAME[c]} gerundet ${fmt(t)}. Wie heißt die größte mögliche Zahl?`,
    answer: { kind: 'number', value, label: 'Größte Zahl' },
    hints: [`Die Grenze liegt in der Mitte zwischen zwei ${PLACE_DATIVE[c]}.`, 'Bei einer 5 rundest du schon auf.'],
    steps: [
      { text: `Die Mitte zwischen ${fmt(t)} und ${fmt(t + p)} ist ${fmt(t + p / 2)}.`, visual: roundingLine(t, p) },
      `${fmt(t + p / 2)} ergibt gerundet schon ${fmt(t + p)}.`,
      `Die größte Zahl ist 1 kleiner: ${fmt(value)}.`,
    ],
    bugs: numberBugs([
      { id: 'grenze-mitte', match: t + p / 2, hint: `Bei einer 5 rundest du auf. Diese Zahl ergibt ${fmt(t + p)}.` },
      { id: 'grenze-abschneiden', match: t + p - 1, hint: `Diese Zahl rundest du auf ${fmt(t + p)} auf. Nur abschneiden ist kein Runden.` },
      { id: 'grenze-ziel', match: t, hint: `Auch größere Zahlen ergeben gerundet ${fmt(t)}.` },
    ], value),
    praise: 'Du hast die Grenze beim Runden genau bestimmt.',
    srText: `Eine Zahl ergibt auf ${PLACE_NAME[c]} gerundet ${t}. Wie heißt die größte mögliche Zahl?`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Each story with the places it can hold: Milliarden of Besuche on a website are real, Milliarden of Besucher are more people than the Erde has. */
const BOUND_STORIES: readonly { story: string; things: string; places: readonly WholeColumn[] }[] = [
  { story: 'Ein Video hat', things: 'Aufrufe', places: ['ZT', 'HT', 'M'] },
  { story: 'Eine Internetseite zählt', things: 'Besuche', places: ['ZT', 'HT', 'M', 'Mrd'] },
  { story: 'Ein Bericht nennt', things: 'Besucher', places: ['ZT', 'HT'] },
];

/** The whole range behind a rounded number, in a story: the hardest numbers of the Stufe. */
function bothBounds(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const places: WholeColumn[] = ctx.ranges.beyondMilliarde ? ['ZT', 'HT', 'M', 'Mrd'] : ['ZT', 'HT', 'M'];
  const c = rng.pick(places);
  const { story, things } = rng.pick(BOUND_STORIES.filter((s) => s.places.includes(c)));
  const p = PV[c];
  const t = rng.int(3, 90) * p;
  const lowest = t - p / 2;
  const highest = t + p / 2 - 1;
  const fields: MultiField[] = [{ id: 'min', value: lowest, before: 'mindestens', label: 'Kleinste Zahl' }, { id: 'max', value: highest, before: 'höchstens', label: 'Größte Zahl' }];
  return build(SKILL, 3, {
    key: `bereich:${t}:${c}:${things}`,
    ab,
    context: `${story} rund ${fmt(t)} ${things}. Die Zahl ist auf ${PLACE_NAME[c]} gerundet.`,
    prompt: `Wie viele ${things} sind es mindestens und höchstens?`,
    answer: { kind: 'multi', fields },
    hints: [`Die Grenzen liegen jeweils in der Mitte zwischen zwei ${PLACE_DATIVE[c]}.`, 'Die obere Mitte rundest du schon auf. Nimm also 1 weniger.'],
    steps: [
      `Die untere Mitte ist ${fmt(lowest)}. Diese Zahl rundest du auf.`,
      `Die obere Mitte ist ${fmt(t + p / 2)}. Diese Zahl ergibt ${fmt(t + p)}.`,
      `Also mindestens ${fmt(lowest)} und höchstens ${fmt(highest)}.`,
    ],
    bugs: multiBugs([
      { id: 'grenze-mitte', match: { min: lowest, max: t + p / 2 }, hint: 'Die obere Mitte rundest du schon auf. Nimm 1 weniger.' },
      { id: 'grenze-abschneiden', match: { min: t, max: t + p - 1 }, hint: 'Nur abschneiden ist kein Runden. Auch kleinere Zahlen ergeben diese Zahl.' },
      { id: 'grenze-ziel', match: { min: t, max: t }, hint: 'Viele Zahlen ergeben gerundet diese Zahl. Suche die Grenzen.' },
    ], fields),
    praise: 'Du hast beide Grenzen beim Runden bestimmt.',
    srText: `${story} rund ${t} ${things}, auf ${PLACE_NAME[c]} gerundet. Wie viele ${things} sind es mindestens und höchstens?`,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

export const rundenSkill: SkillDef = {
  ...SKILL,
  title: 'Runden',
  description: 'Du rundest passend zur Aufgabe.',
  stufen: {
    1: 'Auf eine genannte Stufenzahl runden, bis eine Million',
    2: 'Übertrag über mehrere Stellen; welche Zahlen ergeben diese gerundete Zahl?',
    3: 'Ist Runden hier sinnvoll? Größte mögliche Ausgangszahl',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return stufe1(rng, ab);
    if (stufe === 2) return stufe2(rng, ab);
    return ab === 1 ? sensible(rng, ab) : ab === 2 ? largestOriginal(rng, ab) : bothBounds(rng, ab, ctx);
  },
};

