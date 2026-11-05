/**
 * Größen schätzen, mit bekannten Größen (Tür ≈ 2 m, Tafel Schokolade 100 g).
 * Stufe 1: the unit of an everyday object: with its number; AB II without a number; AB III repairs a wrong unit.
 * Stufe 2: a plausible value: in the usual unit; AB II all options in a smaller unit; AB III judges a claim.
 * Stufe 3: estimating with a reference size, Fermi style: one reference; AB II two steps with a change of unit; AB III several estimates.
 * No body or weight comparison of people (T12).
 */
import { BOX, fmt } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, pickPerson, targetAb } from '../shared';
import { finish, q } from './helpers';

const SKILL = { id: 'groessen.schaetzen', topicId: 'groessen' } as const;
const KMK = ['GM.schaetzen'];

type Dim = 'laenge' | 'gewicht' | 'zeit' | 'volumen';

const DIM_UNITS: Record<Dim, readonly string[]> = {
  laenge: ['mm', 'cm', 'm', 'km'],
  gewicht: ['g', 'kg', 't'],
  zeit: ['s', 'min', 'h'],
  volumen: ['ml', 'l'],
};

const DIM_WORD: Record<Dim, string> = { laenge: 'eine Länge', gewicht: 'ein Gewicht', zeit: 'eine Zeit', volumen: 'eine Menge in einem Gefäß' };

/** A Stützpunkt for each unit: what a wrong option is compared with. */
const REFERENCE: Record<string, string> = {
  mm: 'Eine Münze ist etwa 2 mm dick.',
  cm: 'Dein kleiner Finger ist etwa 1 cm breit.',
  m: 'Eine Tür ist etwa 2 m hoch.',
  km: 'Für 1 km gehst du etwa 15 min.',
  g: 'Eine Tafel Schokolade wiegt 100 g.',
  kg: 'Eine Packung Mehl wiegt 1 kg.',
  t: 'Ein Auto wiegt etwa 1 t.',
  s: 'Einmal klatschen dauert etwa 1 s.',
  min: 'Zähneputzen dauert etwa 3 min.',
  h: 'Ein Kinofilm dauert etwa 2 h.',
  ml: 'Ein Teelöffel fasst etwa 5 ml.',
  l: 'Eine Milchtüte fasst 1 l.',
};

interface UnitItem {
  dim: Dim;
  /** 'Ein Bleistift ist etwa 17 # lang.' */
  s: string;
  n: number;
  u: string;
  /** 'die Länge eines Bleistifts' */
  what: string;
  /** A unit that also fits as long as the sentence has no number: not offered as a wrong option there. */
  alsoFits?: string;
}

const UNIT_ITEMS: readonly UnitItem[] = [
  { dim: 'laenge', s: 'Ein Bleistift ist etwa # lang.', n: 17, u: 'cm', what: 'die Länge eines Bleistifts' },
  { dim: 'laenge', s: 'Eine Tür ist etwa # hoch.', n: 2, u: 'm', what: 'die Höhe einer Tür' },
  { dim: 'laenge', s: 'Der Weg von Hamburg nach Berlin ist etwa # lang.', n: 290, u: 'km', what: 'die Länge des Wegs von Hamburg nach Berlin' },
  { dim: 'laenge', s: 'Eine Ameise ist etwa # lang.', n: 5, u: 'mm', what: 'die Länge einer Ameise' },
  { dim: 'laenge', s: 'Ein Schulheft ist etwa # hoch.', n: 30, u: 'cm', what: 'die Höhe eines Schulhefts' },
  { dim: 'laenge', s: 'Ein Schwimmbecken ist etwa # lang.', n: 25, u: 'm', what: 'die Länge eines Schwimmbeckens' },
  { dim: 'laenge', s: 'Eine Münze ist etwa # dick.', n: 2, u: 'mm', what: 'die Dicke einer Münze' },
  { dim: 'laenge', s: 'Ein Fußballfeld ist etwa # lang.', n: 100, u: 'm', what: 'die Länge eines Fußballfelds' },
  { dim: 'laenge', s: 'Eine Busfahrt durch die Stadt ist etwa # lang.', n: 8, u: 'km', what: 'die Strecke einer Busfahrt' },
  { dim: 'laenge', s: 'Ein Radiergummi ist etwa # lang.', n: 4, u: 'cm', what: 'die Länge eines Radiergummis' },
  { dim: 'gewicht', s: 'Eine Tafel Schokolade wiegt #.', n: 100, u: 'g', what: 'das Gewicht einer Tafel Schokolade' },
  { dim: 'gewicht', s: 'Ein Apfel wiegt etwa #.', n: 150, u: 'g', what: 'das Gewicht eines Apfels' },
  { dim: 'gewicht', s: 'Ein Sack Kartoffeln wiegt #.', n: 5, u: 'kg', what: 'das Gewicht eines Sacks Kartoffeln' },
  { dim: 'gewicht', s: 'Ein Elefant wiegt etwa #.', n: 5, u: 't', what: 'das Gewicht eines Elefanten' },
  { dim: 'gewicht', s: 'Ein Blatt Papier wiegt etwa #.', n: 5, u: 'g', what: 'das Gewicht eines Blatts Papier' },
  { dim: 'gewicht', s: 'Eine Packung Mehl wiegt #.', n: 1, u: 'kg', what: 'das Gewicht einer Packung Mehl' },
  { dim: 'gewicht', s: 'Ein Lastwagen wiegt etwa #.', n: 12, u: 't', what: 'das Gewicht eines Lastwagens' },
  { dim: 'gewicht', s: 'Ein Fahrrad wiegt etwa #.', n: 15, u: 'kg', what: 'das Gewicht eines Fahrrads' },
  { dim: 'zeit', s: 'Zähneputzen dauert etwa #.', n: 3, u: 'min', what: 'die Zeit beim Zähneputzen' },
  { dim: 'zeit', s: 'Ein Kinofilm dauert etwa #.', n: 2, u: 'h', what: 'die Dauer eines Kinofilms', alsoFits: 'min' },
  { dim: 'zeit', s: 'Eine Schulstunde dauert #.', n: 45, u: 'min', what: 'die Dauer einer Schulstunde' },
  { dim: 'zeit', s: 'Einmal klatschen dauert etwa #.', n: 1, u: 's', what: 'die Zeit für einmal klatschen' },
  { dim: 'zeit', s: 'Ein Lauf über 100 m dauert etwa #.', n: 15, u: 's', what: 'die Dauer eines Laufs über 100 m' },
  { dim: 'zeit', s: 'Eine Nacht Schlaf dauert etwa #.', n: 9, u: 'h', what: 'die Dauer einer Nacht Schlaf' },
  { dim: 'volumen', s: 'Ein Eimer fasst etwa #.', n: 10, u: 'l', what: 'die Menge in einem Eimer' },
  { dim: 'volumen', s: 'Ein Teelöffel fasst etwa #.', n: 5, u: 'ml', what: 'die Menge in einem Teelöffel' },
  { dim: 'volumen', s: 'Eine Badewanne fasst etwa #.', n: 150, u: 'l', what: 'die Menge in einer Badewanne' },
  { dim: 'volumen', s: 'Ein Trinkglas fasst etwa #.', n: 200, u: 'ml', what: 'die Menge in einem Trinkglas' },
];

const wrongUnit = (u: string): ChoiceOption => ({ label: u, whyWrong: `Vergleiche: ${REFERENCE[u]}` });

/** The reference of the next smaller unit, or else the next larger: close enough to compare with, and never the answer's own unit. */
function neighbourReference(it: UnitItem): string {
  const units = DIM_UNITS[it.dim];
  const i = units.indexOf(it.u);
  return REFERENCE[units[i - 1] ?? units[i + 1]];
}

const hintFor = (it: UnitItem) => `Vergleiche mit etwas Bekanntem. ${neighbourReference(it)}`;

const filled = (it: UnitItem) => it.s.replace('#', q(it.n, it.u));

function unitForNumber(stufe: Stufe, ab: Ab, rng: Rng, it: UnitItem): Exercise {
  const others = DIM_UNITS[it.dim].filter((u) => u !== it.u);
  return finish(SKILL, stufe, {
    key: `einheit:${it.s}`,
    ab,
    prompt: 'Welche Einheit passt?',
    expression: it.s.replace('#', `${fmt(it.n)} ${BOX}`),
    answer: makeChoice(rng, { label: it.u }, others.map(wrongUnit)),
    hints: ['Stell dir die Größe vor. Probier jede Einheit aus.', hintFor(it)],
    steps: [`${filled(it)}`],
    praise: 'Du hast die Einheit mit etwas Bekanntem verglichen.',
    kmk: KMK,
  });
}

function unitWithoutNumber(stufe: Stufe, ab: Ab, rng: Rng, it: UnitItem): Exercise {
  const others = rng.shuffle(DIM_UNITS[it.dim].filter((u) => u !== it.u && u !== it.alsoFits)).slice(0, 2);
  // What a spoon or a glass holds can also be weighed, so a weight is no clear wrong option there, and the other way round.
  const unclear = (d: Dim) => d === it.dim || (it.dim === 'volumen' && d === 'gewicht') || (it.dim === 'gewicht' && d === 'volumen');
  const foreignDim = rng.pick((Object.keys(DIM_UNITS) as Dim[]).filter((d) => !unclear(d)));
  const foreign = rng.pick(DIM_UNITS[foreignDim]);
  return finish(SKILL, stufe, {
    key: `ohne-zahl:${it.s}`,
    ab,
    prompt: `Welche Einheit passt am besten für ${it.what}?`,
    answer: makeChoice(rng, { label: it.u }, [...others.map(wrongUnit), { label: foreign, whyWrong: `${foreign} misst ${DIM_WORD[foreignDim]}. Hier geht es um ${DIM_WORD[it.dim]}.` }]),
    hints: [`Hier geht es um ${DIM_WORD[it.dim]}.`, 'Wähle eine Einheit, bei der die Zahl klein und handlich bleibt.'],
    steps: [`${filled(it)}`, `Also passt ${it.u}.`],
    praise: 'Du hast die Größe erkannt und die Einheit gewählt.',
    kmk: KMK,
  });
}

function repairUnit(stufe: Stufe, ab: Ab, rng: Rng, it: UnitItem): Exercise {
  const units = DIM_UNITS[it.dim];
  const said = rng.pick(units.filter((u) => u !== it.u));
  const person = pickPerson(rng);
  const others = units.filter((u) => u !== it.u && u !== said);
  const foreign = rng.pick(DIM_UNITS[it.dim === 'laenge' ? 'gewicht' : 'laenge']);
  return finish(SKILL, stufe, {
    key: `pruefen:${it.s}:${said}`,
    ab,
    prompt: `${person.name} schreibt: ${it.s.replace('#', q(it.n, said))} Welche Einheit passt besser?`,
    answer: makeChoice(rng, { label: it.u }, [...others.map(wrongUnit), { label: foreign, whyWrong: `${foreign} misst etwas anderes. Hier geht es um ${DIM_WORD[it.dim]}.` }]),
    hints: ['Stell dir die Größe vor. Ist die Angabe zu groß oder zu klein?', `Vergleiche: ${REFERENCE[said]}`],
    steps: [`${q(it.n, said)} passt hier nicht.`, `${filled(it)}`],
    praise: 'Du hast die Angabe mit deiner Vorstellung verglichen.',
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 2: a plausible value ──────────────────────────────────────────────

interface ValueItem {
  /** 'Wie hoch ist eine Tür etwa?' */
  ask: string;
  /** 'Eine Tür ist etwa # hoch.' */
  claim: string;
  n: number;
  u: string;
  /** Options, each at least a factor 10 away from the answer. */
  wrongs: readonly [string, string, string];
  /** The answer in a smaller unit and that unit's other options. */
  small: { n: number; u: string; wrongs: readonly [number, number, number] };
  dim: Dim;
  /** A known size of about the same scale, about something else, and never the answer itself. */
  ref: string;
}

/** Known sizes that fill the gaps of REFERENCE for a plausible value. */
const NEAR_REFERENCE = { auto: 'Ein Auto ist etwa 4 m lang.', heft: 'Ein Schulheft ist etwa 30 cm hoch.', sack: 'Ein Sack Kartoffeln wiegt 5 kg.', feld: 'Ein Fußballfeld ist etwa 100 m lang.', weg: 'Von Hamburg nach Berlin sind es etwa 290 km.', eimer: 'Ein Eimer fasst etwa 10 l.', stunde: 'Eine Schulstunde dauert 45 min.' };

const VALUE_ITEMS: readonly ValueItem[] = [
  { ask: 'Wie hoch ist eine Tür etwa?', claim: 'Eine Tür ist etwa # hoch.', n: 2, u: 'm', wrongs: ['20 cm', '20 m', '200 m'], small: { n: 200, u: 'cm', wrongs: [20, 2000, 20000] }, dim: 'laenge', ref: NEAR_REFERENCE.auto },
  { ask: 'Wie lang ist ein Schulweg zu Fuß etwa?', claim: 'Ein Schulweg zu Fuß ist etwa # lang.', n: 1, u: 'km', wrongs: ['10 m', '100 km', '1000 km'], small: { n: 1000, u: 'm', wrongs: [10, 100000, 1000000] }, dim: 'laenge', ref: NEAR_REFERENCE.feld },
  { ask: 'Wie schwer ist ein Schulbuch etwa?', claim: 'Ein Schulbuch wiegt etwa #.', n: 500, u: 'g', wrongs: ['5 g', '50 kg', '5 t'], small: { n: 500, u: 'g', wrongs: [5, 50000, 500000] }, dim: 'gewicht', ref: REFERENCE.kg },
  { ask: 'Wie hoch ist ein Esstisch etwa?', claim: 'Ein Esstisch ist etwa # hoch.', n: 75, u: 'cm', wrongs: ['7 cm', '7 m', '75 m'], small: { n: 750, u: 'mm', wrongs: [75, 7500, 75000] }, dim: 'laenge', ref: REFERENCE.m },
  { ask: 'Wie schwer ist eine Flasche mit 1 l Wasser etwa?', claim: 'Eine Flasche mit 1 l Wasser wiegt etwa #.', n: 1, u: 'kg', wrongs: ['10 g', '10 kg', '100 kg'], small: { n: 1000, u: 'g', wrongs: [10, 10000, 100000] }, dim: 'gewicht', ref: NEAR_REFERENCE.sack },
  { ask: 'Wie lange dauert ein Fußballspiel etwa?', claim: 'Ein Fußballspiel dauert etwa #.', n: 90, u: 'min', wrongs: ['9 min', '90 s', '90 h'], small: { n: 5400, u: 's', wrongs: [90, 540, 54000] }, dim: 'zeit', ref: REFERENCE.h },
  { ask: 'Wie hoch ist ein Haus mit 3 Stockwerken etwa?', claim: 'Ein Haus mit 3 Stockwerken ist etwa # hoch.', n: 10, u: 'm', wrongs: ['1 m', '100 m', '1 km'], small: { n: 1000, u: 'cm', wrongs: [100, 10000, 100000] }, dim: 'laenge', ref: REFERENCE.m },
  { ask: 'Wie lang ist ein Auto etwa?', claim: 'Ein Auto ist etwa # lang.', n: 4, u: 'm', wrongs: ['40 cm', '40 m', '400 m'], small: { n: 400, u: 'cm', wrongs: [40, 4000, 40000] }, dim: 'laenge', ref: REFERENCE.m },
  { ask: 'Wie schwer ist ein Fahrrad etwa?', claim: 'Ein Fahrrad wiegt etwa #.', n: 15, u: 'kg', wrongs: ['150 g', '150 kg', '15 t'], small: { n: 15000, u: 'g', wrongs: [150, 1500, 150000] }, dim: 'gewicht', ref: REFERENCE.kg },
  { ask: 'Wie viel wiegt ein Ei etwa?', claim: 'Ein Ei wiegt etwa #.', n: 60, u: 'g', wrongs: ['6 g', '600 g', '6 kg'], small: { n: 60, u: 'g', wrongs: [6, 600, 6000] }, dim: 'gewicht', ref: REFERENCE.g },
  { ask: 'Wie dick ist ein Schulbuch etwa?', claim: 'Ein Schulbuch ist etwa # dick.', n: 2, u: 'cm', wrongs: ['2 mm', '20 cm', '2 m'], small: { n: 20, u: 'mm', wrongs: [2, 200, 2000] }, dim: 'laenge', ref: REFERENCE.cm },
  { ask: 'Wie weit ist es von München nach Berlin etwa?', claim: 'Von München nach Berlin sind es etwa #.', n: 600, u: 'km', wrongs: ['60 m', '60 km', '6000 km'], small: { n: 600000, u: 'm', wrongs: [6000, 60000, 6000000] }, dim: 'laenge', ref: NEAR_REFERENCE.weg },
  { ask: 'Wie lange dauert ein Kinofilm etwa?', claim: 'Ein Kinofilm dauert etwa #.', n: 2, u: 'h', wrongs: ['2 min', '20 min', '20 h'], small: { n: 120, u: 'min', wrongs: [12, 1200, 12000] }, dim: 'zeit', ref: NEAR_REFERENCE.stunde },
  { ask: 'Wie viel Wasser passt in eine Badewanne etwa?', claim: 'In eine Badewanne passen etwa #.', n: 150, u: 'l', wrongs: ['15 ml', '1500 ml', '15000 l'], small: { n: 150000, u: 'ml', wrongs: [1500, 15000, 1500000] }, dim: 'volumen', ref: NEAR_REFERENCE.eimer },
  { ask: 'Wie lang ist ein Kugelschreiber etwa?', claim: 'Ein Kugelschreiber ist etwa # lang.', n: 14, u: 'cm', wrongs: ['14 mm', '1 m', '14 m'], small: { n: 140, u: 'mm', wrongs: [14, 1400, 14000] }, dim: 'laenge', ref: NEAR_REFERENCE.heft },
  { ask: 'Wie lang ist ein langer Zug etwa?', claim: 'Ein langer Zug ist etwa # lang.', n: 200, u: 'm', wrongs: ['20 m', '2 km', '20 km'], small: { n: 20000, u: 'cm', wrongs: [2000, 200000, 2000000] }, dim: 'laenge', ref: NEAR_REFERENCE.feld },
  { ask: 'Wie schwer ist ein Elefant etwa?', claim: 'Ein Elefant wiegt etwa #.', n: 5, u: 't', wrongs: ['50 kg', '50 t', '500 t'], small: { n: 5000, u: 'kg', wrongs: [50, 50000, 500000] }, dim: 'gewicht', ref: REFERENCE.t },
  { ask: 'Wie lange dauert eine große Pause etwa?', claim: 'Eine große Pause dauert etwa #.', n: 20, u: 'min', wrongs: ['20 s', '2 min', '20 h'], small: { n: 1200, u: 's', wrongs: [20, 120, 12000] }, dim: 'zeit', ref: NEAR_REFERENCE.stunde },
];

const FAR_OFF = 'Vergleiche mit etwas Bekanntem. Das liegt weit daneben.';
const claimOf = (it: ValueItem, n: number, u: string) => it.claim.replace('#', q(n, u));

function plausibleValue(stufe: Stufe, ab: Ab, rng: Rng, it: ValueItem): Exercise {
  return finish(SKILL, stufe, {
    key: `wert:${it.ask}`,
    ab,
    prompt: it.ask,
    answer: makeChoice(rng, { label: q(it.n, it.u) }, it.wrongs.map((w) => ({ label: q(...parseQuantity(w)), whyWrong: FAR_OFF }))),
    hints: ['Stell dir die Größe vor.', `Vergleiche: ${it.ref}`],
    steps: [claimOf(it, it.n, it.u)],
    praise: 'Du hast den Wert mit etwas Bekanntem verglichen.',
    kmk: KMK,
  });
}

function plausibleSmallUnit(stufe: Stufe, ab: Ab, rng: Rng, it: ValueItem): Exercise {
  const { n, u, wrongs } = it.small;
  return finish(SKILL, stufe, {
    key: `klein:${it.ask}`,
    ab,
    prompt: `Wähle den Wert in ${u}. ${it.ask}`,
    answer: makeChoice(rng, { label: q(n, u) }, wrongs.map((w) => ({ label: q(w, u), whyWrong: 'Rechne die Angabe in eine größere Einheit um. Stell dir die Größe dann vor.' }))),
    hints: ['Überlege zuerst: Wie groß ist das in einer Einheit deiner Wahl?', `Rechne dann in ${u} um.`],
    steps: [claimOf(it, it.n, it.u), ...(it.u === u ? [] : [`${q(it.n, it.u)} = ${q(n, u)}`])],
    praise: 'Du hast geschätzt und danach umgerechnet.',
    kmk: KMK,
  });
}

function judgeClaim(stufe: Stufe, ab: Ab, rng: Rng, it: ValueItem): Exercise {
  const person = pickPerson(rng);
  const kind = rng.pick(['passt', 'zu-viel', 'zu-wenig'] as const);
  const shown = kind === 'passt' ? [it.n, it.u] as const : parseQuantity(kind === 'zu-viel' ? it.wrongs[2] : it.wrongs[0]);
  const texts = { passt: 'Das passt.', 'zu-viel': 'Das ist viel zu viel.', 'zu-wenig': 'Das ist viel zu wenig.' };
  const correct = texts[kind];
  const wrongs: ChoiceOption[] = (Object.keys(texts) as (keyof typeof texts)[]).filter((k) => k !== kind).map((k) => ({ label: texts[k], whyWrong: `Stell dir die Größe vor. ${it.ref}` }));
  return finish(SKILL, stufe, {
    key: `behauptung:${it.ask}:${kind}`,
    ab,
    prompt: `${person.name} sagt: ${claimOf(it, shown[0], shown[1])} Was stimmt?`,
    answer: makeChoice(rng, { label: correct }, wrongs, { order: [texts.passt, texts['zu-viel'], texts['zu-wenig']] }),
    hints: ['Stell dir die Größe vor.', 'Rechne im Kopf in eine vertraute Einheit um.'],
    steps: [`Zum Vergleich: ${claimOf(it, it.n, it.u)}`, `${person.name} sagt ${q(shown[0], shown[1])}. ${correct}`],
    praise: 'Du hast die Angabe mit deiner Vorstellung geprüft.',
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** '20 cm' → [20, 'cm']. */
function parseQuantity(text: string): readonly [number, string] {
  const [n, u] = text.split(' ');
  return [Number(n), u];
}

// ─── Stufe 3: estimating with a reference size ───────────────────────────────

interface Estimate {
  key: string;
  context: string;
  prompt: string;
  value: number;
  unit: string;
  hints: string[];
  steps: string[];
  added?: number;
  unitSlip?: number;
  /** Set where round numbers on the way give another result, as in 25 · 60 for 24 · 60. */
  tolerance?: number;
  praise: string;
}

/** Numbers of an estimate may be off by at most a tenth: a small result has to be exact, and a wrong method stays outside. */
const toleranceOf = (value: number) => Math.floor(value / 10);

function estimateExercise(stufe: Stufe, ab: Ab, e: Estimate): Exercise {
  return finish(SKILL, stufe, {
    key: e.key,
    ab,
    context: e.context,
    prompt: e.prompt,
    answer: { kind: 'number', value: e.value, unit: e.unit, tolerance: e.tolerance ?? toleranceOf(e.value), before: 'Etwa' },
    hints: e.hints,
    steps: e.steps,
    bugs: [
      e.added !== undefined ? { id: 'schaetzen-addiert', match: e.added, hint: 'Die gleiche Größe kommt mehrmals vor. Rechne mal, nicht plus.' } : null,
      e.unitSlip !== undefined ? { id: 'schaetzen-einheit', match: e.unitSlip, hint: 'Schau auf die Einheit in der Frage. Rechne dein Ergebnis um.' } : null,
    ],
    praise: e.praise,
    kmk: KMK,
  });
}

/** One reference size, repeated. */
function oneReference(rng: Rng): Estimate {
  const kind = rng.int(1, 5);
  const praise = 'Du hast die bekannte Größe als Maß genommen.';
  const hints = ['Die bekannte Größe kommt mehrmals vor.', 'Rechne mit der Anzahl mal.'];
  if (kind === 1) {
    const n = rng.int(3, 9);
    return { key: `lineal:${n}`, context: `Ein Lineal ist 30 cm lang. Ein Tisch ist etwa ${n} Lineale lang.`, prompt: 'Wie lang ist der Tisch etwa?', value: 30 * n, unit: 'cm', hints, steps: [`${n} · ${q(30, 'cm')} = ${q(30 * n, 'cm')}`], added: 30 + n, praise };
  }
  if (kind === 2) {
    const n = rng.int(3, 12);
    return { key: `haus:${n}`, context: `Eine Tür ist etwa 2 m hoch. Ein Haus ist etwa so hoch wie ${n} Türen übereinander.`, prompt: 'Wie hoch ist das Haus etwa?', value: 2 * n, unit: 'm', hints, steps: [`${n} · ${q(2, 'm')} = ${q(2 * n, 'm')}`], added: 2 + n, praise };
  }
  if (kind === 3) {
    const n = rng.int(2, 8);
    return { key: `stunden:${n}`, context: `Eine Schulstunde dauert 45 min. Ein Ausflug dauert etwa ${n} Schulstunden.`, prompt: 'Wie lange dauert der Ausflug etwa in Minuten?', value: 45 * n, unit: 'min', hints, steps: [`${n} · ${q(45, 'min')} = ${q(45 * n, 'min')}`], added: 45 + n, praise };
  }
  if (kind === 4) {
    const n = rng.int(4, 9);
    return { key: `aepfel:${n}`, context: `Ein Apfel wiegt etwa 150 g. In einer Tüte sind ${n} Äpfel.`, prompt: 'Wie schwer ist die Tüte etwa?', value: 150 * n, unit: 'g', hints, steps: [`${n} · ${q(150, 'g')} = ${q(150 * n, 'g')}`], added: 150 + n, praise };
  }
  const n = rng.int(5, 15);
  return { key: `eimer:${n}`, context: `Ein Eimer fasst etwa 10 l. Ein Planschbecken ist mit ${n} Eimern voll.`, prompt: 'Wie viele Liter fasst das Planschbecken etwa?', value: 10 * n, unit: 'l', hints, steps: [`${n} · ${q(10, 'l')} = ${q(10 * n, 'l')}`], added: 10 + n, praise };
}

/** Two steps with a change of unit. */
function twoSteps(rng: Rng): Estimate {
  const kind = rng.int(1, 4);
  const praise = 'Du hast zuerst die Einheit passend gemacht.';
  if (kind === 1) {
    const thick = rng.pick([2, 4, 5]);
    const m = rng.int(1, 3);
    const value = (m * 100) / thick;
    return { key: `buecher:${thick}:${m}`, context: `Ein Buch ist etwa ${thick} cm dick. Ein Stapel Bücher ist ${q(m, 'm')} hoch.`, prompt: 'Wie viele Bücher liegen etwa im Stapel?', value, unit: 'Bücher', hints: ['Schreib beide Längen in cm.', 'Rechne dann: Wie oft passt ein Buch in den Stapel?'], steps: [`${q(m, 'm')} = ${q(m * 100, 'cm')}`, `${m * 100} : ${thick} = ${value}`], praise };
  }
  if (kind === 2) {
    const km = rng.pick([4, 8, 12]);
    const h = (km * 15) / 60;
    return { key: `wandern:${km}`, context: `Für 1 km brauchst du etwa 15 min. Ein Wanderweg ist ${q(km, 'km')} lang.`, prompt: 'Wie viele Stunden dauert die Wanderung etwa?', value: h, unit: 'h', hints: ['Rechne zuerst die Minuten für den ganzen Weg aus.', 'Eine Stunde hat 60 Minuten.'], steps: [`${km} · ${q(15, 'min')} = ${q(km * 15, 'min')}`, `${q(km * 15, 'min')} = ${q(h, 'h')}`], unitSlip: km * 15, praise };
  }
  if (kind === 3) {
    const km = rng.int(1, 3);
    const steps = km * 2000;
    return { key: `schritte:${km}`, context: `Ein Schritt ist etwa 50 cm lang. Ein Schulweg ist ${q(km, 'km')} lang.`, prompt: 'Wie viele Schritte sind das etwa?', value: steps, unit: 'Schritte', hints: ['Wie viele Schritte brauchst du für 1 m?', 'Rechne den Weg in Meter um.'], steps: [`${q(km, 'km')} = ${q(km * 1000, 'm')}`, `Für 1 m brauchst du 2 Schritte.`, `${km * 1000} · 2 = ${fmt(steps)}`], unitSlip: km * 2, praise };
  }
  const kg = rng.int(2, 9);
  return { key: `tafeln:${kg}`, context: 'Eine Tafel Schokolade wiegt 100 g.', prompt: `Wie viele Tafeln wiegen zusammen etwa ${q(kg, 'kg')}?`, value: kg * 10, unit: 'Tafeln', hints: [`Schreib ${q(kg, 'kg')} in g.`, 'Wie oft passen 100 g hinein?'], steps: [`${q(kg, 'kg')} = ${q(kg * 1000, 'g')}`, `${kg * 1000} : 100 = ${kg * 10}`], unitSlip: kg * 1000, praise };
}

/** Several estimates in a row. */
function fermi(rng: Rng): Estimate {
  const kind = rng.int(1, 3);
  const praise = 'Du hast mit runden Zahlen Schritt für Schritt geschätzt.';
  if (kind === 1) {
    const people = rng.pick([20, 24, 26, 30]);
    const days = rng.pick([5, 10]);
    const liters = (people * days) / 2;
    return { key: `trinken:${people}:${days}`, context: `In einer Klasse sind ${people} Personen. Jede Person trinkt am Schultag etwa 500 ml.`, prompt: `Wie viele Liter trinkt die Klasse etwa in ${days} Schultagen?`, value: liters, unit: 'l', hints: ['Rechne zuerst einen Tag für die ganze Klasse aus.', 'Wandle ml in l um: 1000 ml sind 1 l.'], steps: [`${people} · ${q(500, 'ml')} = ${q(people * 500, 'ml')}`, `${q(people * 500, 'ml')} = ${q(people / 2, 'l')}`, `${days} · ${q(people / 2, 'l')} = ${q(liters, 'l')}`], unitSlip: people * 500 * days, praise };
  }
  if (kind === 2) {
    const perMin = rng.pick([5, 10]);
    const liters = Math.round((perMin * 60 * 24) / 1000);
    return { key: `tropfen:${perMin}`, context: `Ein Wasserhahn tropft. In 1 min laufen etwa ${perMin} ml Wasser aus.`, prompt: 'Wie viele Liter sind das etwa an einem Tag?', value: liters, unit: 'l', hints: ['Ein Tag hat 24 Stunden. Eine Stunde hat 60 Minuten.', 'Rechne runde Zahlen. 1000 ml sind 1 l.'], steps: [`24 · 60 = ${fmt(1440)}`, `${fmt(1440)} · ${q(perMin, 'ml')} = ${q(1440 * perMin, 'ml')}`, `${q(1440 * perMin, 'ml')} sind etwa ${q(liters, 'l')}.`], unitSlip: 1440 * perMin, tolerance: 1, praise };
  }
  const step = rng.pick([50, 60, 70, 80]);
  const minutes = rng.pick([10, 20, 30]);
  const metres = step * minutes;
  return { key: `gehen:${step}:${minutes}`, context: `Du machst in 1 min etwa 100 Schritte. Ein Schritt ist etwa ${step} cm lang.`, prompt: `Wie viele Meter gehst du etwa in ${minutes} min?`, value: metres, unit: 'm', hints: ['Rechne zuerst die Schritte für die ganze Zeit aus.', 'Rechne dann die Länge aller Schritte in Meter um.'], steps: [`${minutes} · 100 = ${minutes * 100} Schritte`, `${minutes * 100} · ${q(step, 'cm')} = ${q(minutes * 100 * step, 'cm')}`, `Das sind ${q(metres, 'm')}.`], unitSlip: minutes * 100 * step, praise };
}

/** Which size fits? The options are powers of ten apart. */
function sizeChoice(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const len = rng.pick([4, 5]);
  const km = rng.int(1, 3);
  const cars = (km * 1000) / len;
  const label = (n: number) => `${fmt(n)} Autos`;
  const options = [cars / 10, cars * 10, cars * 100];
  return finish(SKILL, stufe, {
    key: `stau:${len}:${km}`,
    ab,
    context: `Ein Stau ist ${q(km, 'km')} lang. Ein Auto braucht etwa ${q(len, 'm')} Platz.`,
    prompt: 'Wie viele Autos stehen etwa im Stau?',
    answer: makeChoice(rng, { label: label(cars) }, options.map((n) => ({ label: label(n), whyWrong: 'Rechne den Stau in Meter um. Teile durch den Platz für ein Auto.' }))),
    hints: ['Rechne den Stau in Meter um.', 'Wie oft passt ein Auto in diese Länge?'],
    steps: [`${q(km, 'km')} = ${q(km * 1000, 'm')}`, `${km * 1000} : ${len} = ${cars}`, `Etwa ${label(cars)} stehen im Stau.`],
    praise: 'Du hast die Länge passend gemacht und geteilt.',
    kmk: KMK,
  });
}

export const schaetzenSkill: SkillDef = {
  ...SKILL,
  title: 'Größen schätzen',
  description: 'Du schätzt mit bekannten Größen und prüfst, ob es passt.',
  stufen: {
    1: 'Die passende Einheit für einen Gegenstand wählen',
    2: 'Einen passenden Wert wählen: Türhöhe, Schulweg, Buchgewicht',
    3: 'Mit einer bekannten Größe schätzen, Schritt für Schritt',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      const it = rng.pick(UNIT_ITEMS);
      if (ab === 1) return unitForNumber(stufe, ab, rng, it);
      return ab === 2 ? unitWithoutNumber(stufe, ab, rng, it) : repairUnit(stufe, ab, rng, it);
    }
    if (stufe === 2) {
      const it = rng.pick(VALUE_ITEMS);
      if (ab === 1) return plausibleValue(stufe, ab, rng, it);
      return ab === 2 ? plausibleSmallUnit(stufe, ab, rng, it) : judgeClaim(stufe, ab, rng, it);
    }
    if (ab === 1) return estimateExercise(stufe, ab, oneReference(rng));
    if (ab === 2) return rng.chance(0.25) ? sizeChoice(stufe, ab, rng) : estimateExercise(stufe, ab, twoSteps(rng));
    return estimateExercise(stufe, ab, fermi(rng));
  },
};
