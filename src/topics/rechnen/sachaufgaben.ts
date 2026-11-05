/**
 * Sachaufgaben (docs/research.md §6). Stufe 1: one step, no extra numbers. Stufe 2: two steps, one number not needed. Stufe 3: missing data ("Nicht lösbar"),
 * plausibility and the meaning of a Rest. Whole numbers only, so the skill needs no comma key. "mehr" and "weniger" do not predict the operation (T13).
 * Every number item of Stufe 3 offers the button "Nicht lösbar", so that its presence gives nothing away.
 */
import { TIMES, fmt, fmtQty, speak } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, NumberAnswer, Rng, SkillDef, Step, Stufe, Visual } from '../../core/types';
import { pickPerson, pickTwo, probeLine, targetAb } from '../shared';
import { attempt, item, wholeBugs } from './common';

const SKILL = { id: 'rechnen.sachaufgaben', topicId: 'rechnen' } as const;
const KMK = ['ZO.sachrechnen'];

/** A round multiple of `step` up to `top`. */
const roundTo = (rng: Rng, low: number, top: number, step: number) => rng.int(Math.ceil(low / step), Math.floor(top / step)) * step;

const euro = (n: number) => fmtQty(n, '€');

interface Story {
  key: string;
  context: string;
  question: string;
  value: number | null;
  before?: string;
  unit?: string;
  after?: string;
  hints: string[];
  steps: Step[];
  bugs: Bug[];
  praise: string;
  visual?: Visual;
  /** Numbers that stand only in the picture, for the ear. */
  spoken?: string;
  kmk?: string[];
}

function storyItem(stufe: Stufe, ab: Ab, s: Story): Exercise {
  const answer: NumberAnswer = {
    kind: 'number',
    value: s.value,
    ...(s.before ? { before: s.before } : {}),
    ...(s.unit ? { unit: s.unit } : {}),
    ...(s.after ? { after: s.after } : {}),
    label: 'Ergebnis',
    // every number item of Stufe 3 has the button
    ...(stufe === 3 ? { offerUnsolvable: true } : {}),
  };
  return item(SKILL, stufe, {
    key: s.key,
    ab,
    context: s.context,
    prompt: s.question,
    ...(s.visual ? { visual: s.visual } : {}),
    answer,
    hints: s.hints,
    steps: s.steps,
    bugs: wholeBugs(s.bugs, s.value),
    praise: s.praise,
    srText: speak(`${[s.context, s.spoken, s.question].filter(Boolean).join(' ')}`),
    kmk: s.kmk ?? KMK,
  });
}

// ─── Stufe 1: one step ───────────────────────────────────────────────────────

const OP_HINT = 'Stell dir die Situation vor. Wird es mehr oder weniger?';

function clubGrows(rng: Rng): Story {
  const a = rng.int(120, 480);
  const b = rng.int(12, 60);
  return {
    key: `verein:${a}+${b}`,
    context: `Der Sportverein hat ${fmt(a)} Mitglieder. Im Januar kommen ${fmt(b)} Mitglieder dazu.`,
    question: 'Wie viele Mitglieder hat der Verein jetzt?',
    value: a + b,
    after: 'Mitglieder',
    hints: [OP_HINT, `Rechne ${fmt(a)} + ${fmt(b)}.`],
    steps: [`${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`, `Der Verein hat jetzt ${fmt(a + b)} Mitglieder.`],
    bugs: [{ id: 'rechenart', match: a - b, hint: 'Es kommen Mitglieder dazu. Wird es mehr oder weniger?' }],
    praise: 'Du hast die neuen Mitglieder dazugezählt.',
  };
}

function tripCost(rng: Rng): Story {
  const n = rng.int(21, 32);
  const p = rng.pick([12, 15, 18, 24, 25, 35]);
  return {
    key: `fahrt:${n}*${p}`,
    context: `Für den Ausflug zahlt jedes Kind ${euro(p)}. In der Klasse sind ${n} Kinder.`,
    question: 'Wie viel Geld kommt zusammen?',
    value: n * p,
    unit: '€',
    hints: ['Jedes Kind zahlt gleich viel. Welche Rechnung passt?', `Rechne ${n} ${TIMES} ${p}.`],
    steps: [`${n} ${TIMES} ${p} = ${fmt(n * p)}.`, `Es kommen ${euro(n * p)} zusammen.`],
    bugs: [{ id: 'rechenart', match: n + p, hint: 'Jedes Kind zahlt den ganzen Betrag. Das passt nicht zu Plus.' }],
    praise: 'Du hast erkannt: Das ist gleich oft derselbe Betrag.',
  };
}

function shareCost(rng: Rng): Story {
  const n = rng.pick([4, 5, 6, 8]);
  // an affordable game: at most 80 € together
  const each = rng.int(3, Math.floor(80 / n));
  const total = n * each;
  return {
    key: `teilen:${total}:${n}`,
    context: `${n} Freunde kaufen zusammen ein Spiel für ${euro(total)}. Alle zahlen gleich viel.`,
    question: 'Wie viel zahlt jeder?',
    value: each,
    unit: '€',
    hints: ['Alle zahlen gleich viel. Welche Rechnung passt?', `Rechne ${fmt(total)} : ${n}.`],
    steps: [`${fmt(total)} : ${n} = ${each}.`, `Jeder zahlt ${euro(each)}.`],
    bugs: [{ id: 'rechenart', match: total - n, hint: 'Die Kosten verteilen sich auf alle. Welche Rechnung teilt auf?' }],
    praise: 'Du hast den Preis gleichmäßig aufgeteilt.',
  };
}

/** One note in the picture, so that the one step is the subtraction. The text says the amount too: Vorlesen and the screen reader do not see the picture. */
function pocketMoney(rng: Rng): Story {
  const items = rng.pick<number[]>([[1000], [2000], [5000]]);
  const have = items[0] / 100;
  const price = rng.int(6, Math.min(have - 2, 40));
  const who = pickPerson(rng).name;
  return {
    key: `taschengeld:${have}-${price}:${who}`,
    context: `${who} hat ${euro(have)} Taschengeld. ${who} kauft ein Buch für ${euro(price)}.`,
    question: 'Wie viel Geld bleibt übrig?',
    value: have - price,
    unit: '€',
    visual: { type: 'money', items },
    hints: ['Wird das Geld mehr oder weniger?', `Zieh ${euro(price)} vom Taschengeld ab.`],
    steps: [`${fmt(have)} − ${fmt(price)} = ${fmt(have - price)}.`, `Es bleiben ${euro(have - price)} übrig.`],
    bugs: [{ id: 'rechenart', match: have + price, hint: 'Das Buch kostet Geld. Wird es mehr oder weniger?' }],
    praise: 'Du hast den Preis vom Taschengeld abgezogen.',
  };
}

/** T13: "mehr" with a subtraction, and "weniger" with an addition. */
function keywordTrap(rng: Rng): Story {
  const [p, q] = pickTwo(rng);
  const b = rng.int(14, 60);
  if (rng.chance(0.5)) {
    const a = rng.int(b + 40, 400);
    return {
      key: `mehr:${a}-${b}:${p.name}`,
      context: `${p.name} sammelt ${fmt(a)} Flaschen für den Schulverein. Das sind ${b} mehr als bei ${q.name}.`,
      question: `Wie viele Flaschen sammelt ${q.name}?`,
      value: a - b,
      after: 'Flaschen',
      hints: [`Wer hat mehr, ${p.name} oder ${q.name}?`, `${q.name} hat also weniger als ${fmt(a)}.`],
      steps: [`${p.name} hat ${b} mehr. Also hat ${q.name} ${b} weniger.`, `${fmt(a)} − ${b} = ${fmt(a - b)}.`, `${q.name} sammelt ${fmt(a - b)} Flaschen.`],
      bugs: [{ id: 'signalwort', match: a + b, hint: `${p.name} hat mehr. ${q.name} hat also weniger als ${p.name}.` }],
      praise: 'Du hast dich nicht vom Wort mehr leiten lassen.',
    };
  }
  const a = rng.int(40, 300);
  return {
    key: `weniger:${a}+${b}:${p.name}`,
    context: `${p.name} holt beim Sportfest ${fmt(a)} Punkte. Das sind ${b} weniger als bei ${q.name}.`,
    question: `Wie viele Punkte holt ${q.name}?`,
    value: a + b,
    after: 'Punkte',
    hints: [`Wer hat mehr Punkte, ${p.name} oder ${q.name}?`, `${q.name} hat also mehr als ${fmt(a)}.`],
    steps: [`${p.name} hat ${b} weniger. Also hat ${q.name} ${b} mehr.`, `${fmt(a)} + ${b} = ${fmt(a + b)}.`, `${q.name} holt ${fmt(a + b)} Punkte.`],
    bugs: [{ id: 'signalwort', match: a - b, hint: `${p.name} hat weniger. ${q.name} hat also mehr als ${p.name}.` }],
    praise: 'Du hast dich nicht vom Wort weniger leiten lassen.',
  };
}

function mountain(rng: Rng): Story {
  const top = rng.int(1800, 2960);
  const hut = roundTo(rng, 900, 1700, 50);
  return {
    key: `berg:${top}-${hut}`,
    context: `Der Gipfel liegt ${fmtQty(top, 'm')} hoch. Die Hütte liegt ${fmtQty(hut, 'm')} hoch.`,
    question: 'Wie viele Meter sind es von der Hütte bis zum Gipfel?',
    value: top - hut,
    unit: 'm',
    hints: ['Gesucht ist der Unterschied der beiden Höhen.', `Rechne ${fmt(top)} − ${fmt(hut)}.`],
    steps: [`${fmt(top)} − ${fmt(hut)} = ${fmt(top - hut)}.`, `Es sind ${fmtQty(top - hut, 'm')}.`],
    bugs: [{ id: 'rechenart', match: top + hut, hint: 'Gesucht ist der Unterschied der beiden Höhen.' }],
    praise: 'Du hast den Unterschied der Höhen berechnet.',
  };
}

/** The start is missing: the story runs backwards. */
function backwards(rng: Rng): Story {
  const who = pickPerson(rng).name;
  const spent = rng.int(8, 35);
  const left = rng.int(12, 90);
  if (rng.chance(0.5)) {
    return {
      key: `vorher:${left}+${spent}:${who}`,
      context: `${who} gibt ${euro(spent)} für ein Trikot aus. Danach hat ${who} noch ${euro(left)}.`,
      question: `Wie viel Geld hatte ${who} vorher?`,
      value: left + spent,
      unit: '€',
      hints: ['Vorher war es mehr Geld. Geh die Geschichte rückwärts.', `Rechne ${left} + ${spent}.`],
      steps: [`Vorher war das Trikot noch nicht bezahlt.`, `${left} + ${spent} = ${left + spent}.`, `${who} hatte ${euro(left + spent)}.`],
      bugs: [{ id: 'signalwort', match: Math.abs(left - spent), hint: 'Das Wort ausgeben klingt nach Minus. Hier suchst du aber den Anfang.' }],
      praise: 'Du hast die Geschichte rückwärts gelesen.',
    };
  }
  const got = rng.int(8, 35);
  const now = left + got;
  return {
    key: `davor:${now}-${got}:${who}`,
    context: `${who} bekommt ${euro(got)} zum Geburtstag. Jetzt hat ${who} ${euro(now)}.`,
    question: `Wie viel Geld hatte ${who} vorher?`,
    value: left,
    unit: '€',
    hints: ['Vorher war es weniger Geld. Geh die Geschichte rückwärts.', `Rechne ${now} − ${got}.`],
    steps: [`Vorher war das Geschenk noch nicht da.`, `${now} − ${got} = ${left}.`, `${who} hatte ${euro(left)}.`],
    bugs: [{ id: 'signalwort', match: now + got, hint: 'Das Wort bekommen klingt nach Plus. Hier suchst du aber den Anfang.' }],
    praise: 'Du hast die Geschichte rückwärts gelesen.',
  };
}

/** "Welche Rechnung passt?": no calculating, only the model. */
function whichCalculation(rng: Rng, ab: Ab): Exercise {
  const box = rng.pick([6, 8, 12]);
  const boxes = rng.int(4, 15);
  const context = `In einer Kiste sind ${box} Flaschen. Im Keller stehen ${boxes} Kisten.`;
  const question = 'Welche Rechnung passt zur Frage: Wie viele Flaschen sind es?';
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>([
    { label: `${boxes} ${TIMES} ${box}` },
    { label: `${boxes} + ${box}`, whyWrong: 'In jeder Kiste sind gleich viele Flaschen. Das passt nicht zu Plus.' },
    { label: `${Math.max(boxes, box)} − ${Math.min(boxes, box)}`, whyWrong: 'Hier nimmst du Flaschen weg. In der Geschichte kommt nichts weg.' },
    { label: `${box * boxes} : ${box}`, whyWrong: 'Diese Rechnung teilt auf. Hier willst du die Flaschen zusammenzählen.' },
  ]);
  return item(SKILL, 1, {
    key: `welche:${boxes}*${box}`,
    ab,
    context,
    prompt: question,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Stell dir die Kisten vor. Was ist in jeder Kiste?'],
    steps: [`${boxes} Kisten mit je ${box} Flaschen.`, `${boxes} ${TIMES} ${box} = ${box * boxes}.`],
    praise: 'Du hast die Rechnung zur Geschichte gefunden.',
    srText: speak(`${context} ${question}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return storyItem(1, ab, rng.pick([clubGrows, tripCost, shareCost, pocketMoney])(rng));
  if (ab === 2) return storyItem(1, ab, rng.pick([keywordTrap, mountain, keywordTrap])(rng));
  return rng.chance(0.4) ? whichCalculation(rng, ab) : storyItem(1, ab, backwards(rng));
}

// ─── Stufe 2: two steps, one number not needed ───────────────────────────────

interface StoryGap {
  /** Which of the parts gives way. */
  at: number;
  decoy: string;
  /** What is missing then. */
  lacks: string;
  /** What one gets with the decoy's number. */
  tempting: number;
}

interface TwoStep {
  key: string;
  /** Needed sentences. */
  facts: string[];
  /** The needed facts one per sentence, for the check of Stufe 3: a task of as many sentences and numbers with or without a gap. */
  parts: string[];
  /** A needed sentence that can give way to a decoy: it looks alike, holds a number too, and leaves the question without an answer. */
  gaps: StoryGap[];
  /** A sentence with a number the question does not need. */
  extra: string;
  extraNumber: number;
  /** What one gets with the extra number too. */
  withExtra: number;
  question: string;
  value: number;
  /** The first step's value: one step short. */
  firstStep: number;
  /** What to work out first, as a hint. */
  firstHint: string;
  /** What that value still is not, for the bug hint. */
  firstText: string;
  /** "Welche Angabe brauchst du nicht …?" */
  goal: string;
  unit?: string;
  after?: string;
  lines: string[];
}

function comics(rng: Rng): TwoStep {
  const who = pickPerson(rng).name;
  const n = rng.int(3, 9);
  const p = rng.int(3, 6);
  // a note that fits the price: the smallest or the next one
  const m = rng.pick([10, 20, 50, 100].filter((note) => note >= n * p + 2).slice(0, 2));
  const pen = rng.int(2, 5);
  const pages = rng.int(24, 64);
  const wait = rng.int(3, 12);
  return {
    key: `comics:${n}*${p}:${m}:${who}`,
    facts: [`${who} kauft ${n} Comics zu je ${euro(p)}.`, `${who} bezahlt mit ${euro(m)}.`],
    parts: [`${who} kauft ${n} Comics.`, `Ein Comic kostet ${euro(p)}.`, `${who} bezahlt mit ${euro(m)}.`],
    gaps: [
      { at: 1, decoy: `Ein Comic hat ${pages} Seiten.`, lacks: 'der Preis eines Comics', tempting: n * pages },
      { at: 2, decoy: `${who} wartet ${wait} Minuten an der Kasse.`, lacks: 'der bezahlte Betrag', tempting: n * p },
    ],
    extra: `Ein Stift kostet ${euro(pen)}.`,
    extraNumber: pen,
    withExtra: m - n * p - pen,
    question: `Wie viel Geld bekommt ${who} zurück?`,
    value: m - n * p,
    firstStep: n * p,
    firstHint: 'Rechne zuerst die Kosten der Comics.',
    firstText: `Das sind erst die Kosten der Comics. ${who} bezahlt aber mit mehr Geld.`,
    goal: 'für das Rückgeld',
    unit: '€',
    lines: [`Die Comics: ${n} ${TIMES} ${p} = ${n * p}.`, `Zurück: ${m} − ${n * p} = ${m - n * p}.`, `${who} bekommt ${euro(m - n * p)} zurück.`],
  };
}

function busTrip(rng: Rng): TwoStep {
  const k = rng.int(2, 5);
  const s = rng.pick([36, 42, 48, 52]);
  const e = rng.int(11, 29);
  const h = rng.int(3, 7);
  const way = rng.int(12, 40);
  const min = rng.int(15, 40);
  return {
    key: `busse:${k}*${s}+${e}`,
    facts: [`Zum Sportfest fahren ${k} Busse mit je ${s} Kindern.`, `Mit dem Fahrrad kommen ${e} Kinder.`],
    parts: [`Zum Sportfest fahren ${k} Busse.`, `In jedem Bus sitzen ${s} Kinder.`, `Mit dem Fahrrad kommen ${e} Kinder.`],
    gaps: [
      { at: 1, decoy: `Jeder Bus fährt ${way} km.`, lacks: 'die Zahl der Kinder in einem Bus', tempting: k * way + e },
      { at: 2, decoy: `Mit dem Fahrrad dauert der Weg ${min} Minuten.`, lacks: 'die Zahl der Kinder mit dem Fahrrad', tempting: k * s + min },
    ],
    extra: `Das Fest dauert ${h} Stunden.`,
    extraNumber: h,
    withExtra: k * s + e + h,
    question: 'Wie viele Kinder kommen zum Sportfest?',
    value: k * s + e,
    firstStep: k * s,
    firstHint: 'Rechne zuerst die Kinder in den Bussen.',
    firstText: 'Das sind erst die Kinder in den Bussen.',
    goal: 'für die Zahl der Kinder',
    after: 'Kinder',
    lines: [`In den Bussen: ${k} ${TIMES} ${s} = ${k * s}.`, `Mit dem Fahrrad dazu: ${k * s} + ${e} = ${k * s + e}.`, `Es kommen ${k * s + e} Kinder.`],
  };
}

function classMoney(rng: Rng): TwoStep {
  const c = rng.int(22, 30);
  const p = rng.pick([8, 10, 12, 15]);
  const b = roundTo(rng, 60, c * p - 20, 10);
  const min = rng.pick([40, 50, 70]);
  const bread = rng.int(2, 3);
  const seats = rng.pick([32, 44, 50]);
  return {
    key: `ausflug:${c}*${p}-${b}`,
    facts: [`${c} Kinder zahlen je ${euro(p)} für den Ausflug.`, `Der Bus kostet ${euro(b)}.`],
    parts: [`${c} Kinder fahren zum Ausflug.`, `Jedes Kind zahlt ${euro(p)}.`, `Der Bus kostet ${euro(b)}.`],
    gaps: [
      { at: 1, decoy: `Jedes Kind packt ${bread} Brote ein.`, lacks: 'der Betrag für ein Kind', tempting: c * bread },
      { at: 2, decoy: `Der Bus hat ${seats} Sitze.`, lacks: 'der Preis für den Bus', tempting: c * p - seats },
    ],
    extra: `Die Fahrt dauert ${min} Minuten.`,
    extraNumber: min,
    withExtra: c * p - b - min,
    question: 'Wie viel Geld bleibt für den Eintritt?',
    value: c * p - b,
    firstStep: c * p,
    firstHint: 'Rechne zuerst das ganze Geld aus.',
    firstText: 'Das ist erst das ganze Geld. Zieh den Bus noch ab.',
    goal: 'für das Geld zum Eintritt',
    unit: '€',
    lines: [`Alles zusammen: ${c} ${TIMES} ${p} = ${c * p}.`, `Ohne Bus: ${c * p} − ${b} = ${c * p - b}.`, `Es bleiben ${euro(c * p - b)}.`],
  };
}

function recipe(rng: Rng): TwoStep {
  const g = roundTo(rng, 150, 400, 50);
  const z = roundTo(rng, 50, 200, 25);
  const n = rng.int(2, 6);
  const m = rng.pick([30, 40, 45, 60]);
  const eggs = rng.int(2, 4);
  const guests = rng.int(6, 12);
  return {
    key: `rezept:${g}+${z}:${n}`,
    facts: [`Für einen Kuchen brauchst du ${fmtQty(g, 'g')} Mehl und ${fmtQty(z, 'g')} Zucker.`, `Du backst ${n} Kuchen.`],
    parts: [`Für einen Kuchen brauchst du ${fmtQty(g, 'g')} Mehl.`, `Für einen Kuchen brauchst du ${fmtQty(z, 'g')} Zucker.`, `Du backst ${n} Kuchen.`],
    gaps: [
      { at: 1, decoy: `Für einen Kuchen brauchst du ${eggs} Eier.`, lacks: 'die Menge an Zucker', tempting: g * n },
      { at: 2, decoy: `Ein Kuchen reicht für ${guests} Kinder.`, lacks: 'die Zahl der Kuchen', tempting: g + z },
    ],
    extra: `Ein Kuchen backt ${m} Minuten.`,
    extraNumber: m,
    withExtra: (g + z) * n + m,
    question: 'Wie viel Gramm Mehl und Zucker brauchst du für alle Kuchen?',
    value: (g + z) * n,
    firstStep: g + z,
    firstHint: 'Rechne zuerst Mehl und Zucker für einen Kuchen.',
    firstText: 'Das reicht erst für einen Kuchen.',
    goal: 'für die Menge an Mehl und Zucker',
    unit: 'g',
    lines: [`Ein Kuchen: ${g} + ${z} = ${g + z}.`, `Alle Kuchen: ${g + z} ${TIMES} ${n} = ${fmt((g + z) * n)}.`, `Du brauchst ${fmtQty((g + z) * n, 'g')}.`],
  };
}

function storage(rng: Rng): TwoStep {
  const a = rng.pick([3, 4, 5, 6, 8]);
  const n = rng.int(40, 120);
  const f = roundTo(rng, a * n + 100, 2000, 100);
  const songs = rng.int(12, 40);
  const faces = rng.int(2, 6);
  const apps = rng.int(12, 30);
  return {
    key: `speicher:${a}*${n}:${f}`,
    facts: [`Auf dem Tablet sind ${fmt(f)} MB frei.`, `Du speicherst ${n} Fotos mit je ${a} MB.`],
    parts: [`Auf dem Tablet sind ${fmt(f)} MB frei.`, `Du speicherst ${n} Fotos.`, `Ein Foto braucht ${a} MB.`],
    gaps: [
      { at: 0, decoy: `Auf dem Tablet sind ${apps} Apps.`, lacks: 'der freie Speicherplatz', tempting: a * n },
      { at: 2, decoy: `Auf jedem Foto sind ${faces} Kinder.`, lacks: 'der Platz für ein Foto', tempting: f - faces * n },
    ],
    extra: `Im Ordner liegen schon ${songs} Lieder.`,
    extraNumber: songs,
    withExtra: f - a * n - songs,
    question: 'Wie viele MB bleiben nach dem Speichern frei?',
    value: f - a * n,
    firstStep: a * n,
    firstHint: 'Rechne zuerst den Platz für die Fotos.',
    firstText: 'Das ist erst der Platz für die Fotos.',
    goal: 'für den freien Speicherplatz',
    after: 'MB',
    lines: [`Die Fotos: ${n} ${TIMES} ${a} = ${a * n}.`, `Frei: ${fmt(f)} − ${a * n} = ${fmt(f - a * n)}.`, `Es bleiben ${fmt(f - a * n)} MB frei.`],
  };
}

const TWO_STEP = [comics, busTrip, classMoney, recipe, storage];

/** Two steps and a number too many, on AB I with the extra sentence last, on AB II anywhere. */
function twoStepItem(rng: Rng, ab: Ab): Exercise {
  const t = rng.pick(TWO_STEP)(rng);
  const facts = ab === 1 ? [...t.facts, t.extra] : rng.shuffle([...t.facts, t.extra]);
  return storyItem(2, ab, {
    key: `mit:${t.key}:${facts.indexOf(t.extra)}`,
    context: facts.join(' '),
    question: t.question,
    value: t.value,
    ...(t.unit ? { unit: t.unit } : {}),
    ...(t.after ? { after: t.after } : {}),
    hints: ['Welche Zahlen brauchst du für diese Frage?', t.firstHint],
    steps: t.lines,
    bugs: [
      { id: 'erster-schritt', match: t.firstStep, hint: t.firstText },
      { id: 'alle-zahlen', match: t.withExtra, hint: 'Welche Zahlen brauchst du für diese Frage?' },
    ],
    praise: 'Du hast nur die nötigen Zahlen genommen.',
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** A price table: more rows than the question needs. One adult, so that the Kinder and then the sum are the two steps. */
function priceTable(rng: Rng, ab: Ab): Exercise {
  const child = rng.int(3, 8);
  const adult = child + rng.int(2, 7);
  const locker = rng.int(1, 2);
  const slide = rng.int(2, 4);
  const kids = rng.int(3, 9);
  const value = kids * child + adult;
  const lines = [`Kinder: ${kids} ${TIMES} ${child} = ${kids * child}.`, `Mit dem Erwachsenen: ${kids * child} + ${adult} = ${value}.`, `Der Eintritt kostet ${euro(value)}.`];
  return storyItem(2, ab, {
    key: `preise:${child}:${adult}:${kids}`,
    context: `${kids} Kinder und ein Erwachsener gehen ins Schwimmbad.`,
    question: 'Wie viel kostet der Eintritt zusammen?',
    value,
    unit: '€',
    visual: { type: 'table', caption: 'Preise im Schwimmbad', header: ['Angebot', 'Preis'], rows: [['Eintritt Kind', euro(child)], ['Eintritt Erwachsene', euro(adult)], ['Schließfach', euro(locker)], ['Wasserrutsche', euro(slide)]] },
    spoken: `Preise: Eintritt Kind ${euro(child)}, Eintritt Erwachsene ${euro(adult)}, Schließfach ${euro(locker)}, Wasserrutsche ${euro(slide)}.`,
    hints: ['Welche Zeilen der Tabelle brauchst du?', 'Rechne zuerst die Kinder. Dann kommt der Erwachsene dazu.'],
    steps: lines,
    bugs: [
      { id: 'erster-schritt', match: kids * child, hint: 'Das sind erst die Kinder. Der Erwachsene zahlt auch.' },
      { id: 'alle-zahlen', match: value + locker + slide, hint: 'Welche Zahlen brauchst du für diese Frage?' },
    ],
    praise: 'Du hast aus der Tabelle nur das Nötige genommen.',
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** The numbers of the needed sentences, as they stand there. */
const neededNumbers = (t: TwoStep) => [...new Set(t.facts.flatMap((f) => [...f.matchAll(/\d[\d\u202F]*/g)].map((m) => m[0])))];

/** "Welche Angabe brauchst du nicht?": the options are bare numbers, so the extra number must not stand in a needed sentence too. */
function notNeeded(rng: Rng, ab: Ab): Exercise {
  const t = attempt<TwoStep>(() => {
    const story = rng.pick(TWO_STEP)(rng);
    return neededNumbers(story).includes(fmt(story.extraNumber)) ? null : story;
  }, () => recipe(rng));
  const context = rng.shuffle([...t.facts, t.extra]).join(' ');
  const prompt = `Welche Angabe brauchst du nicht ${t.goal}?`;
  const wrongNumbers = neededNumbers(t);
  const extraShown = fmt(t.extraNumber);
  const options: ChoiceOption[] = rng.shuffle<ChoiceOption>([
    { label: extraShown },
    ...wrongNumbers.slice(0, 3).map((n) => ({ label: n, whyWrong: 'Ohne diese Zahl kannst du die Frage nicht beantworten.' })),
  ]);
  return item(SKILL, 2, {
    key: `angabe:${t.key}`,
    ab,
    context,
    prompt,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Lies die Frage zuerst. Was ist gesucht?', 'Welche Zahl hat nichts mit der Frage zu tun?'],
    steps: [`Du brauchst diese Angabe nicht: ${t.extra}`, ...t.lines.slice(-2)],
    praise: 'Du hast die überflüssige Angabe gefunden.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab < 3) return twoStepItem(rng, ab);
  return rng.chance(0.5) ? priceTable(rng, ab) : notNeeded(rng, ab);
}

// ─── Stufe 3: the Rest, missing data, plausibility ───────────────────────────

interface RestStory {
  id: string;
  /** round up (everyone comes along) or down (only full ones count) */
  up: boolean;
  divisors: number[];
  top: number;
  context: (n: number, k: number) => string;
  question: string;
  after: string;
  things: string;
  restThings: string;
  /** The Rest when it is 1. */
  restOne: string;
  /** Round down: one full thing, and what counts. */
  whole?: string;
  wholes?: string;
}

const REST_STORIES: readonly RestStory[] = [
  { id: 'autos', up: true, divisors: [3, 4], top: 60, context: (n, k) => `${n} Kinder fahren zum Turnier. In ein Auto passen ${k} Kinder.`, question: 'Wie viele Autos braucht die Gruppe mindestens?', after: 'Autos', things: 'Autos', restThings: 'Kinder', restOne: 'Kind' },
  { id: 'zelte', up: true, divisors: [3, 4, 5, 6], top: 120, context: (n, k) => `Im Zeltlager schlafen ${n} Kinder. In ein Zelt passen ${k} Kinder.`, question: 'Wie viele Zelte braucht das Lager mindestens?', after: 'Zelte', things: 'Zelte', restThings: 'Kinder', restOne: 'Kind' },
  { id: 'kisten', up: true, divisors: [12, 15, 20, 25], top: 500, context: (n, k) => `Die Bücherei packt ${n} Bücher ein. In eine Kiste passen ${k} Bücher.`, question: 'Wie viele Kisten braucht die Bücherei mindestens?', after: 'Kisten', things: 'Kisten', restThings: 'Bücher', restOne: 'Buch' },
  { id: 'schachteln', up: false, divisors: [6, 10], top: 300, context: (n, k) => `Auf dem Hof liegen ${n} Eier. In eine Schachtel passen ${k} Eier.`, question: 'Wie viele Schachteln werden voll?', after: 'Schachteln', things: 'Schachteln', restThings: 'Eier', restOne: 'Ei', whole: 'eine volle Schachtel', wholes: 'volle Schachteln' },
  { id: 'mannschaft', up: false, divisors: [7, 11], top: 120, context: (n, k) => `${n} Kinder spielen im Verein. Eine Mannschaft hat genau ${k} Kinder.`, question: 'Wie viele ganze Mannschaften gibt es?', after: 'Mannschaften', things: 'Mannschaften', restThings: 'Kinder', restOne: 'Kind', whole: 'eine ganze Mannschaft', wholes: 'ganze Mannschaften' },
  { id: 'baender', up: false, divisors: [12, 15, 20, 25], top: 400, context: (n, k) => `Für das Bastelprojekt liegen ${n} cm Band bereit. Ein Stück ist ${k} cm lang.`, question: 'Wie viele ganze Stücke kannst du schneiden?', after: 'Stücke', things: 'Stücke', restThings: 'cm Band', restOne: 'cm Band', whole: 'ein ganzes Stück', wholes: 'ganze Stücke' },
];

/** The meaning of a Rest: the story decides whether to round up or down. */
function restStory(rng: Rng, ab: Ab): Exercise {
  const s = rng.pick(REST_STORIES);
  const k = rng.pick(s.divisors);
  const q = rng.int(3, Math.floor((s.top - k) / k));
  const r = rng.int(1, k - 1);
  const n = q * k + r;
  const value = s.up ? q + 1 : q;
  const division = `${fmt(n)} : ${k} = ${q} Rest ${r}`;
  const rest = `${r} ${r === 1 ? s.restOne : s.restThings}`;
  const restBug = { id: 'rest-als-antwort', match: r, hint: `Das ist der Rest: ${rest}. Gefragt sind die ${s.things}.` };
  return storyItem(3, ab, {
    key: `rest:${s.id}:${n}:${k}`,
    context: s.context(n, k),
    question: s.question,
    value,
    after: s.after,
    hints: ['Teile zuerst. Bleibt ein Rest?', s.up ? 'Alle sollen dabei sein. Was machst du mit dem Rest?' : `Reicht der Rest für ${s.whole}?`],
    steps: [`${division}.`, `Probe: ${probeLine(q, k, r)}.`, s.up ? `Der Rest braucht auch noch Platz. Es sind ${value} ${s.after}.` : `Der Rest reicht nicht aus. Es sind ${value} ${s.after}.`],
    bugs: s.up
      ? [{ id: 'rest-sache', match: q, hint: `Alle sollen mit. Reichen ${q} ${s.things}?` }, restBug]
      : [{ id: 'rest-sache', match: q + 1, hint: `Der Rest reicht nicht für ${s.whole}. ${r === 1 ? 'Es bleibt' : 'Es bleiben'} nur ${rest}.` }, restBug],
    praise: s.up ? 'Du hast an den Rest gedacht.' : `Du hast nur ${s.wholes} gezählt.`,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

interface GroupStory {
  id: string;
  /** Where the group goes. */
  goes: string;
  /** 'In ein Zelt' */
  into: string;
  question: string;
  after: string;
  divisors: number[];
  /** The largest quotient. */
  top: number;
  /** Every vehicle needs an adult at the wheel. */
  drivers: boolean;
}

const GROUP_STORIES: readonly GroupStory[] = [
  { id: 'kleinbus', goes: 'zum Turnier', into: 'In einen Kleinbus', question: 'Wie viele Kleinbusse braucht die Gruppe mindestens?', after: 'Kleinbusse', divisors: [8, 9], top: 7, drivers: true },
  { id: 'zelte', goes: 'ins Zeltlager', into: 'In ein Zelt', question: 'Wie viele Zelte braucht die Gruppe mindestens?', after: 'Zelte', divisors: [4, 5, 6], top: 18, drivers: false },
];

/** Two steps and the Rest: the adults come along, so the count starts with a sum. At least one adult per twelve people, and one per vehicle. */
function groupStory(rng: Rng, ab: Ab): Exercise {
  const s = rng.pick(GROUP_STORIES);
  const k = rng.pick(s.divisors);
  const q = rng.int(3, s.top);
  const r = rng.int(1, k - 1);
  const n = q * k + r;
  const value = q + 1;
  const least = Math.max(2, Math.ceil(n / 12), s.drivers ? value : 0);
  const adults = rng.int(least, least + 1);
  const children = n - adults;
  return storyItem(3, ab, {
    key: `rest2:${s.id}:${children}+${adults}:${k}`,
    context: `${children} Kinder und ${adults} Erwachsene fahren ${s.goes}. ${s.into} passen ${k} Personen.`,
    question: s.question,
    value,
    after: s.after,
    hints: ['Zähle zuerst alle Personen zusammen.', 'Alle sollen mit. Was machst du mit dem Rest?'],
    steps: [`Alle: ${children} + ${adults} = ${fmt(n)}.`, `${fmt(n)} : ${k} = ${q} Rest ${r}. Probe: ${probeLine(q, k, r)}.`, `Der Rest braucht auch noch Platz. Es sind ${value} ${s.after}.`],
    bugs: [
      { id: 'rest-sache', match: q, hint: `Alle sollen mit. Reichen ${q} ${s.after}?` },
      { id: 'alle-zahlen', match: Math.ceil(children / k), hint: 'Die Erwachsenen brauchen auch einen Platz.' },
    ],
    praise: 'Du hast alle gezählt und den Rest gedeutet.',
    kmk: [...KMK, 'ZO.schriftlich', 'PK.modellieren'],
  });
}

/**
 * Is all the data there? The story of Stufe 2 with its number too many, its facts one per sentence, and one needed sentence that may give way to a decoy. Both
 * forms have as many sentences and numbers, so that only reading the question against the sentences tells them apart.
 */
function maybeMissing(rng: Rng, ab: Ab): Exercise {
  const t = rng.pick(TWO_STEP)(rng);
  const gap = rng.chance(0.5) ? null : rng.pick(t.gaps);
  const sentences = t.parts.map((part, i) => (gap?.at === i ? gap.decoy : part));
  const context = rng.shuffle([...sentences, t.extra]).join(' ');
  if (!gap) {
    return storyItem(3, ab, {
      key: `geht:${t.key}`,
      context,
      question: t.question,
      value: t.value,
      ...(t.unit ? { unit: t.unit } : {}),
      ...(t.after ? { after: t.after } : {}),
      hints: ['Prüfe zuerst: Hast du alle Angaben?', t.firstHint],
      steps: t.lines,
      bugs: [
        { id: 'erster-schritt', match: t.firstStep, hint: t.firstText },
        { id: 'alle-zahlen', match: t.withExtra, hint: 'Welche Zahlen brauchst du für diese Frage?' },
      ],
      praise: 'Du hast geprüft und dann richtig gerechnet.',
      kmk: [...KMK, 'PK.modellieren'],
    });
  }
  return storyItem(3, ab, {
    key: `fehlt:${t.key}:${gap.at}`,
    context,
    question: t.question,
    value: null,
    ...(t.unit ? { unit: t.unit } : {}),
    ...(t.after ? { after: t.after } : {}),
    hints: ['Welche Angaben brauchst du für diese Frage?', 'Fehlt dir etwas? Dann ist die Aufgabe nicht lösbar.'],
    steps: [`Für die Frage fehlt ${gap.lacks}.`, `${gap.decoy} Das hilft bei dieser Frage nicht.`, 'Die Aufgabe ist nicht lösbar.'],
    bugs: [{ id: 'alle-zahlen', match: gap.tempting, hint: 'Prüfe: Welche Angabe fehlt dir für diese Frage?' }],
    praise: 'Du hast gemerkt, dass eine Angabe fehlt.',
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** "Passt das Ergebnis?": the Überschlag checks a claim that may be ten times too big or too small. */
function plausibility(rng: Rng, ab: Ab): Exercise {
  const who = pickPerson(rng).name;
  const n = rng.int(21, 38);
  const p = rng.pick([6, 7, 8, 9, 12]);
  const exact = n * p;
  const roundN = Math.round(n / 10) * 10;
  const rough = roundN * p;
  const kind = rng.pick(['passt', 'gross', 'klein'] as const);
  const claimed = kind === 'passt' ? exact : kind === 'gross' ? exact * 10 : Math.floor(exact / 10);
  const context = `${n} Kinder zahlen je ${euro(p)} für den Ausflug. ${who} rechnet und erhält ${euro(claimed)}.`;
  const prompt = 'Passt das Ergebnis?';
  const right = kind === 'passt' ? 'Ja, das passt zum Überschlag.' : kind === 'gross' ? 'Nein, das ist viel zu groß.' : 'Nein, das ist viel zu klein.';
  const all = ['Ja, das passt zum Überschlag.', 'Nein, das ist viel zu groß.', 'Nein, das ist viel zu klein.'];
  const options: ChoiceOption[] = all.map((label) => (label === right ? { label } : { label, whyWrong: `Mach den Überschlag: ${roundN} ${TIMES} ${p}. Vergleiche dann.` }));
  return item(SKILL, 3, {
    key: `plausibel:${n}*${p}:${kind}:${who}`,
    ab,
    context,
    prompt,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: [`Runde ${n} auf Zehner. Rechne dann im Kopf.`, 'Vergleiche den Überschlag mit dem Ergebnis.'],
    steps: [`Überschlag: ${roundN} ${TIMES} ${p} = ${rough}.`, `Genau: ${n} ${TIMES} ${p} = ${exact}.`, kind === 'passt' ? `${euro(claimed)} liegt nah am Überschlag.` : `${euro(claimed)} ist weit vom Überschlag entfernt.`],
    praise: 'Du hast das Ergebnis mit dem Überschlag geprüft.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'ZO.runden', 'PK.argumentieren'],
  });
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return restStory(rng, ab);
  if (ab === 2) return maybeMissing(rng, ab);
  return rng.chance(0.5) ? plausibility(rng, ab) : groupStory(rng, ab);
}

export const sachaufgabenSkill: SkillDef = {
  ...SKILL,
  title: 'Sachaufgaben',
  description: 'Du liest genau, rechnest und prüfst, ob das Ergebnis passt.',
  stufen: {
    1: 'Ein Rechenschritt, alle Zahlen werden gebraucht',
    2: 'Zwei Rechenschritte, eine Zahl ist überflüssig',
    3: 'Fehlende Angaben, Ergebnis prüfen und Rest deuten',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return stufe1(rng, ab);
    if (stufe === 2) return stufe2(rng, ab);
    return stufe3(rng, ab);
  },
};
