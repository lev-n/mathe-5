/**
 * Systematisch zählen.
 * Stufe 1: two stages (2 · 3) with the tree shown.
 * Stufe 2: three stages (3 · 2 · 4).
 * Stufe 3: orders of four things and places; when the rule does not fit.
 */
import { fmt } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, numberBugs, pickPerson, PEOPLE, targetAb, type MaybeBug } from '../shared';
import { spoken } from './common';

const SKILL = { id: 'daten.zaehlprinzip', topicId: 'daten' } as const;
const KMK = ['DZ.zaehlen', 'PK.problemloesen'];

interface Stage {
  /** Plural after a number: '3 Shirts'. */
  plural: string;
  /** One of them, usable as subject and object: 'eine Hose'. */
  one: string;
  opts: readonly string[];
}

interface Scene {
  id: string;
  stages: readonly [Stage, Stage, Stage];
}

const SCENES: readonly Scene[] = [
  {
    id: 'kleidung',
    stages: [
      { plural: 'Shirts', one: 'ein Shirt', opts: ['rot', 'blau', 'gelb', 'grün', 'weiß'] },
      { plural: 'Hosen', one: 'eine Hose', opts: ['Jeans', 'Shorts', 'Cord', 'Leinen', 'Sport'] },
      { plural: 'Paar Schuhe', one: 'ein Paar Schuhe', opts: ['Sneaker', 'Sandalen', 'Stiefel', 'Halle', 'Lauf'] },
    ],
  },
  {
    id: 'mensa',
    stages: [
      { plural: 'Hauptgerichte', one: 'ein Hauptgericht', opts: ['Nudeln', 'Pizza', 'Eintopf', 'Fisch', 'Suppe'] },
      { plural: 'Beilagen', one: 'eine Beilage', opts: ['Salat', 'Gemüse', 'Obst', 'Brot', 'Reis'] },
      { plural: 'Getränke', one: 'ein Getränk', opts: ['Wasser', 'Saft', 'Tee', 'Milch', 'Schorle'] },
    ],
  },
  {
    id: 'fahrt',
    stages: [
      { plural: 'Ziele', one: 'ein Ziel', opts: ['Berge', 'Meer', 'See', 'Burg', 'Stadt'] },
      { plural: 'Fahrzeuge', one: 'ein Fahrzeug', opts: ['Bus', 'Bahn', 'Schiff', 'Rad', 'Fähre'] },
      { plural: 'Programme', one: 'ein Programm', opts: ['Wandern', 'Klettern', 'Museum', 'Kanu', 'Spiele'] },
    ],
  },
  {
    id: 'basteln',
    stages: [
      { plural: 'Papiere', one: 'ein Papier', opts: ['rot', 'blau', 'gelb', 'grün', 'silber'] },
      { plural: 'Bänder', one: 'ein Band', opts: ['Samt', 'Seide', 'Wolle', 'Jute', 'Filz'] },
      { plural: 'Motive', one: 'ein Motiv', opts: ['Stern', 'Herz', 'Baum', 'Mond', 'Blatt'] },
    ],
  },
];

/** A worksheet prints a picture at most 5.5 cm high: with more than 12 ends, the words of a tree get too small to read. */
const tree = (scene: Scene, rng: Rng, sizes: readonly number[]): VisualOf<'tree'> => ({ type: 'tree', levels: sizes.map((n, i) => rng.sample(scene.stages[i].opts, n)) });
const anyOf = (scene: Scene, n: number) => scene.stages.slice(0, n).map((s) => s.one);
const pairHint = (a: number, b: number) => `Jede Wahl passt zu jeder anderen: ${a} · ${b}.`;

// ─── Stufe 1: zwei Stufen, Baum sichtbar ─────────────────────────────────────

function twoStages(rng: Rng, ab: Ab, sizes: readonly (readonly [number, number])[]): Exercise {
  const scene = rng.pick(SCENES);
  const [a, b] = rng.pick(sizes);
  const person = pickPerson(rng);
  const value = a * b;
  const [one, two] = anyOf(scene, 2);
  const context = `${person.name} wählt ${one} und ${two}.`;
  const prompt = `Wie viele Möglichkeiten hat ${person.name}?`;
  const visual = tree(scene, rng, [a, b]);
  return build(SKILL, 1, {
    key: `${ab}:zwei:${scene.id}:${a}:${b}:${visual.levels.flat().join('')}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value },
    hints: ['Folge jedem Weg vom Start bis zum Ende.', 'Zähle die Enden ganz rechts im Baum.'],
    steps: [`Vom Start gehen ${fmt(a)} Äste aus. Jeder Ast teilt sich in ${fmt(b)} Äste.`, `${fmt(a)} · ${fmt(b)} = ${fmt(value)}`, `Es gibt ${fmt(value)} Möglichkeiten.`],
    bugs: numberBugs([{ id: 'baum-addiert', match: a + b, hint: pairHint(a, b) }], value),
    praise: 'Du hast alle Wege im Baum erfasst.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

/** AB II: how many ways start with one choice? */
function startsWith(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(SCENES);
  const [a, b] = rng.pick([[3, 4], [4, 3], [2, 5], [5, 2]] as const);
  const visual = tree(scene, rng, [a, b]);
  const first = rng.pick(visual.levels[0]);
  const prompt = `Wie viele Wege beginnen mit „${first}“?`;
  return build(SKILL, 1, {
    key: `${ab}:start:${scene.id}:${a}:${b}:${first}:${visual.levels.flat().join('')}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: b },
    hints: [`Such den Ast „${first}“ im Baum.`, 'Zähle die Enden nur an diesem Ast.'],
    steps: [`Am Ast „${first}“ hängen alle ${scene.stages[1].plural}.`, `Es sind ${fmt(b)} Wege.`],
    bugs: numberBugs([{ id: 'alle-wege', match: a * b, hint: `Das sind alle Wege. Zähle nur die Wege ab „${first}“.` }, { id: 'baum-addiert', match: a + b, hint: `Zähle nur die Enden am Ast „${first}“.` }], b),
    praise: 'Du hast nur die Wege dieses Astes gezählt.',
    srText: spoken(prompt),
    kmk: KMK,
  });
}

/** AB II: one branch falls away: how many ways are left? */
function withoutBranch(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(SCENES);
  const [a, b] = rng.pick([[3, 4], [4, 3], [5, 2], [4, 2], [3, 3]] as const);
  const visual = tree(scene, rng, [a, b]);
  const gone = rng.pick(visual.levels[0]);
  const value = (a - 1) * b;
  const context = `„${gone}“ fällt weg.`;
  const prompt = 'Wie viele Wege bleiben im Baum?';
  return build(SKILL, 1, {
    key: `${ab}:ohne:${scene.id}:${a}:${b}:${gone}:${visual.levels.flat().join('')}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value },
    hints: [`Streiche den Ast „${gone}“ mit allen Enden.`, 'Zähle die Enden an den anderen Ästen.'],
    steps: [`Ohne „${gone}“ bleiben ${fmt(a - 1)} Äste.`, `${fmt(a - 1)} · ${fmt(b)} = ${fmt(value)}`, `Es bleiben ${fmt(value)} Wege.`],
    bugs: numberBugs([
      { id: 'alle-wege', match: a * b, hint: `Das sind alle Wege. Der Ast „${gone}“ fällt weg.` },
      { id: 'nur-eins-dazu', match: a * b - 1, hint: 'Mit dem Ast fallen alle seine Enden weg.' },
    ], value),
    praise: 'Du hast die Wege ohne diesen Ast gezählt.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

/** AB III: one more option at a stage. */
function oneMore(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(SCENES);
  const [a, b] = rng.pick([[2, 3], [3, 2], [2, 4], [3, 3], [4, 2]] as const);
  const at = rng.int(0, 1);
  const person = pickPerson(rng);
  const before = a * b;
  const newA = at === 0 ? a + 1 : a;
  const newB = at === 1 ? b + 1 : b;
  const value = newA * newB;
  const stage = scene.stages[at];
  const visual = tree(scene, rng, [a, b]);
  const context = `Der Baum zeigt die Wahl von ${person.name}. Noch ${stage.one} kommt dazu.`;
  const prompt = 'Wie viele Möglichkeiten gibt es dann?';
  return build(SKILL, 1, {
    key: `${ab}:dazu:${scene.id}:${a}:${b}:${at}:${visual.levels.flat().join('')}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value },
    hints: [`Wie viele ${stage.plural} sind es dann?`, 'Rechne wieder: Anzahl mal Anzahl.'],
    steps: [`Vorher: ${fmt(a)} · ${fmt(b)} = ${fmt(before)}`, `Jetzt: ${fmt(newA)} · ${fmt(newB)} = ${fmt(value)}`, `Es gibt ${fmt(value)} Möglichkeiten.`],
    bugs: numberBugs([
      { id: 'nur-eins-dazu', match: before + 1, hint: 'Die neue Wahl passt zu jeder Wahl der anderen Stufe.' },
      { id: 'baum-addiert', match: newA + newB, hint: pairHint(newA, newB) },
    ], value),
    praise: 'Du hast die neue Wahl mit allen anderen kombiniert.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return twoStages(rng, ab, [[2, 3], [3, 2], [2, 4], [4, 2], [3, 3]]);
  // a tree of at most 12 ends leaves two stages only 10 and 12 here, so the other forms bring the variety
  if (ab === 2) return rng.pick([(r: Rng, a: Ab) => twoStages(r, a, [[3, 4], [4, 3], [2, 5], [5, 2]]), startsWith, withoutBranch])(rng, ab);
  return oneMore(rng, ab);
}

// ─── Stufe 2: drei Stufen ────────────────────────────────────────────────────

/** A tree of at most 12 ends allows only the products 8 and 12. */
const TREE_SIZES = [[2, 2, 2], [2, 3, 2], [3, 2, 2], [2, 2, 3]] as const;
/** Too many ends for a tree, still small factors. */
const SMALL_SIZES = [[2, 2, 4], [2, 4, 2], [4, 2, 2], [2, 3, 3], [3, 2, 3], [3, 3, 2], [2, 2, 5], [2, 5, 2], [5, 2, 2]] as const;
const LARGE_SIZES = [[3, 2, 4], [4, 3, 2], [3, 3, 4], [5, 2, 3], [4, 3, 5], [5, 3, 4], [4, 4, 3], [5, 4, 3]] as const;

function threeStages(rng: Rng, ab: Ab, sizes: readonly (readonly [number, number, number])[], withTree: boolean): Exercise {
  const scene = rng.pick(SCENES);
  const [a, b, c] = rng.pick(sizes);
  const person = pickPerson(rng);
  const value = a * b * c;
  const [one, two, three] = anyOf(scene, 3);
  const [p, q, r] = scene.stages.map((s) => s.plural);
  const context = withTree ? `${person.name} wählt ${one}, ${two} und ${three}.` : `${person.name} wählt ${one}, ${two} und ${three}. Es gibt ${a} ${p}, ${b} ${q} und ${c} ${r}.`;
  const prompt = `Wie viele Möglichkeiten hat ${person.name}?`;
  const visual = withTree ? tree(scene, rng, [a, b, c]) : undefined;
  return build(SKILL, 2, {
    key: `${ab}:drei:${withTree}:${scene.id}:${a}:${b}:${c}:${visual ? visual.levels.flat().join('') : ''}`,
    ab,
    context,
    prompt,
    ...(visual ? { visual } : {}),
    answer: { kind: 'number', value },
    hints: withTree ? ['Zähle die Enden ganz rechts im Baum.', 'Oder rechne Stufe für Stufe: Anzahl mal Anzahl.'] : ['Stell dir den Baum vor: Wie viele Äste hat jede Stufe?', 'Multipliziere die Anzahlen aller drei Stufen.'],
    steps: [`${fmt(a)} · ${fmt(b)} = ${fmt(a * b)}`, `${fmt(a * b)} · ${fmt(c)} = ${fmt(value)}`, `Es gibt ${fmt(value)} Möglichkeiten.`],
    bugs: numberBugs([
      { id: 'baum-addiert', match: a + b + c, hint: `Jede Wahl passt zu jeder anderen: ${a} · ${b} · ${c}.` },
      { id: 'nur-zwei', match: a * b, hint: 'Das sind erst zwei Stufen. Nimm die dritte Stufe auch mit.' },
    ], value),
    praise: 'Du hast alle drei Stufen multipliziert.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

/** AB III, reversed: the total and two stages are known. */
function missingStage(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(SCENES);
  const [a, b, c] = rng.pick([[3, 2, 4], [4, 3, 2], [3, 3, 4], [5, 2, 3], [4, 3, 5], [5, 3, 4], [4, 4, 3], [2, 5, 4]] as const);
  const person = pickPerson(rng);
  const total = a * b * c;
  const [p, q, r] = scene.stages.map((s) => s.plural);
  const context = `Es gibt ${a} ${p} und ${b} ${q}. Dazu kommt noch eine Wahl. ${person.name} hat ${fmt(total)} Möglichkeiten.`;
  const prompt = `Wie viele ${r} gibt es?`;
  return build(SKILL, 2, {
    key: `${ab}:rueck:${scene.id}:${a}:${b}:${c}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: c },
    hints: [`Rechne zuerst ${a} · ${b}.`, 'Welche Zahl mal diesem Ergebnis ergibt die Gesamtzahl?'],
    steps: [`${fmt(a)} · ${fmt(b)} = ${fmt(a * b)}`, `${fmt(total)} : ${fmt(a * b)} = ${fmt(c)}`, `Es gibt ${fmt(c)} ${r}.`],
    bugs: numberBugs([
      { id: 'minus-statt-geteilt', match: total - a - b, hint: 'Die Anzahlen sind Faktoren. Teile die Gesamtzahl durch beide.' },
      { id: 'nur-zwei', match: total / a, hint: 'Teile auch durch die zweite Anzahl.' },
    ], c),
    praise: 'Du hast vom Ergebnis aus rückwärts gerechnet.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return rng.chance(0.5) ? threeStages(rng, ab, TREE_SIZES, true) : threeStages(rng, ab, SMALL_SIZES, false);
  if (ab === 2) return threeStages(rng, ab, LARGE_SIZES, false);
  return missingStage(rng, ab);
}

// ─── Stufe 3: Reihenfolgen; wann passt die Regel nicht? ──────────────────────

const ORDER_THINGS: readonly {
  id: string;
  sentence: (names: readonly string[]) => string;
  pool: readonly string[];
  /** The places, after 'die ersten zwei'. */
  places: string;
  /** One of the four takes the first place. */
  firstIs: (name: string) => string;
}[] = [
  { id: 'kinder', sentence: (n) => `${n[0]}, ${n[1]}, ${n[2]} und ${n[3]} stellen sich in einer Reihe auf.`, pool: PEOPLE.map((p) => p.name), places: 'Plätze', firstIs: (n) => `${n} steht ganz vorn.` },
  { id: 'faecher', sentence: (n) => `Der Stundenplan hat die Fächer ${n[0]}, ${n[1]}, ${n[2]} und ${n[3]}.`, pool: ['Mathe', 'Kunst', 'Musik', 'Sport', 'Englisch', 'Biologie'], places: 'Stunden', firstIs: (n) => `${n} kommt zuerst.` },
  { id: 'regal', sentence: (n) => `Im Regal steht je ein Buch über ${n[0]}, ${n[1]}, ${n[2]} und ${n[3]}.`, pool: ['Tiere', 'Sterne', 'Burgen', 'Schiffe', 'Pflanzen', 'Vulkane'], places: 'Plätze', firstIs: (n) => `Das Buch über ${n} steht ganz links.` },
];

const USED_UP = 'Ein Platz ist danach besetzt. Für den nächsten bleibt eins weniger.';

/** What is asked about the four things. The answers differ, so a second item of a round cannot be answered from memory. */
const ORDER_FORMS: readonly ((name: string, places: string, firstIs: (name: string) => string) => Pick<Exercise, 'prompt' | 'hints' | 'steps' | 'praise'> & { id: string; rule?: string; value: number; bugs: MaybeBug[] })[] = [
  () => ({
    id: 'alle',
    prompt: 'Wie viele Reihenfolgen gibt es?',
    value: 24,
    hints: ['Für den ersten Platz gibt es 4. Wie viele bleiben für den zweiten?', 'Multipliziere die Anzahlen für alle Plätze.'],
    steps: ['Platz 1: 4, Platz 2: 3, Platz 3: 2, Platz 4: 1.', '4 · 3 · 2 · 1 = 24', 'Es gibt 24 Reihenfolgen.'],
    bugs: [
      { id: 'baum-addiert', match: 10, hint: 'Jede Wahl passt zu jeder anderen: Multipliziere die Anzahlen.' },
      { id: 'ohne-verbrauch', match: 256, hint: USED_UP },
      { id: 'ohne-verbrauch', match: 16, hint: USED_UP },
    ],
    praise: 'Du hast von Platz zu Platz eins weniger gerechnet.',
  }),
  (name, _places, firstIs) => ({
    id: 'fest',
    rule: firstIs(name),
    prompt: 'Wie viele Reihenfolgen gibt es?',
    value: 6,
    hints: ['Der erste Platz steht schon fest. Wie viele Plätze bleiben offen?', 'Für den nächsten Platz gibt es 3. Wie viele bleiben dann?'],
    steps: ['Platz 1 steht fest. Platz 2: 3, Platz 3: 2, Platz 4: 1.', '3 · 2 · 1 = 6', 'Es gibt 6 Reihenfolgen.'],
    bugs: [
      { id: 'immer-mal', match: 24, hint: 'Der erste Platz steht schon fest. Rechne nur mit den anderen drei Plätzen.' },
      { id: 'ohne-verbrauch', match: 27, hint: USED_UP },
    ],
    praise: 'Du hast nur die offenen Plätze gezählt.',
  }),
  (_name, places) => ({
    id: 'zwei',
    prompt: `Wie viele Möglichkeiten gibt es für die ersten zwei ${places}?`,
    value: 12,
    hints: ['Für den ersten Platz gibt es 4. Wie viele bleiben für den zweiten?', 'Multipliziere nur so viele Anzahlen wie Plätze.'],
    steps: ['Platz 1: 4, Platz 2: 3.', '4 · 3 = 12', 'Es gibt 12 Möglichkeiten.'],
    bugs: [
      { id: 'immer-mal', match: 24, hint: 'Gefragt sind nur zwei Plätze. Multipliziere nur zwei Anzahlen.' },
      { id: 'ohne-verbrauch', match: 16, hint: USED_UP },
      { id: 'baum-addiert', match: 7, hint: 'Jede Wahl passt zu jeder anderen: Multipliziere die Anzahlen.' },
    ],
    praise: 'Du hast nur die gefragten Plätze gezählt.',
  }),
];

/** AB I: orders of four things: all of them, with the first place fixed, or the first two places. */
function fourOrders(rng: Rng, ab: Ab): Exercise {
  const thing = rng.pick(ORDER_THINGS);
  const names = rng.sample(thing.pool, 4);
  const form = rng.pick(ORDER_FORMS)(rng.pick(names), thing.places, thing.firstIs);
  const context = form.rule ? `${thing.sentence(names)} ${form.rule}` : thing.sentence(names);
  return build(SKILL, 3, {
    key: `${ab}:reihen:${form.id}:${thing.id}`,
    ab,
    context,
    prompt: form.prompt,
    answer: { kind: 'number', value: form.value },
    hints: form.hints,
    steps: form.steps,
    bugs: numberBugs(form.bugs, form.value),
    praise: form.praise,
    srText: spoken(form.prompt, context),
    kmk: KMK,
  });
}

/** AB II: only some places: a race or an election. */
function somePlaces(rng: Rng, ab: Ab): Exercise {
  const race = rng.chance(0.6);
  const n = rng.int(5, 8);
  const places = race ? 3 : 2;
  const factors = Array.from({ length: places }, (_, i) => n - i);
  const value = factors.reduce((a, b) => a * b, 1);
  const context = race ? `${n} Kinder laufen um die Wette. Die ersten drei bekommen je eine andere Medaille.` : `${n} Kinder stellen sich zur Wahl. Die Klasse wählt einen Sprecher und eine Vertretung.`;
  const prompt = race ? 'Wie viele Möglichkeiten gibt es für die Medaillen?' : 'Wie viele Möglichkeiten gibt es für die zwei Ämter?';
  const line = factors.map((f) => fmt(f)).join(' · ');
  return build(SKILL, 3, {
    key: `${ab}:plaetze:${race}:${n}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value },
    hints: [`Für den ersten Platz gibt es ${n}. Wie viele bleiben dann?`, 'Multipliziere nur so viele Anzahlen wie Plätze.'],
    steps: [`Es gibt ${fmt(places)} Plätze: ${factors.map((f) => fmt(f)).join(', dann ')}.`, `${line} = ${fmt(value)}`, `Es gibt ${fmt(value)} Möglichkeiten.`],
    bugs: numberBugs([
      { id: 'ohne-verbrauch', match: n ** places, hint: 'Ein Kind bekommt nur einen Platz. Für den nächsten bleibt eins weniger.' },
      { id: 'baum-addiert', match: factors.reduce((a, b) => a + b, 0), hint: 'Jede Wahl passt zu jeder anderen: Multipliziere die Anzahlen.' },
    ], value),
    praise: 'Du hast nur die gefragten Plätze gezählt.',
    srText: spoken(prompt, context),
    kmk: KMK,
  });
}

/** AB III: the rule does not fit: one pair of options is ruled out. */
function ruledOut(rng: Rng, ab: Ab): Exercise {
  const scene = rng.pick(SCENES);
  const [a, b] = rng.pick([[3, 2], [3, 4], [4, 3], [2, 5], [5, 3], [4, 4]] as const);
  const [p, q] = scene.stages.map((s) => s.plural);
  const first = rng.pick(scene.stages[0].opts);
  const second = rng.pick(scene.stages[1].opts);
  const value = a * b - 1;
  const context = `Es gibt ${a} ${p} und ${b} ${q}. Die Wahl „${first}“ passt nicht zu „${second}“.`;
  const prompt = 'Wie viele Möglichkeiten bleiben?';
  return build(SKILL, 3, {
    key: `${ab}:verbot:${scene.id}:${a}:${b}:${first}:${second}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value },
    hints: [`Rechne zuerst alle Möglichkeiten aus: ${a} · ${b}.`, 'Wie viele davon fallen weg?'],
    steps: [`${fmt(a)} · ${fmt(b)} = ${fmt(a * b)}`, `Genau ein Paar fällt weg: ${fmt(a * b)} − 1 = ${fmt(value)}`, `Es bleiben ${fmt(value)} Möglichkeiten.`],
    bugs: numberBugs([
      { id: 'immer-mal', match: a * b, hint: 'Ein Paar passt hier nicht. Prüfe: Bleiben alle Möglichkeiten?' },
      { id: 'ganze-wahl-weg', match: (a - 1) * b, hint: `Nur das Paar fällt weg. „${first}“ passt zu allem anderen.` },
    ], value),
    praise: 'Du hast die Regel an dieser Aufgabe geprüft.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** AB III: shaking hands: multiplying counts every pair twice. */
function handshakes(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(4, 9);
  const value = (n * (n - 1)) / 2;
  const context = `${n} Kinder begrüßen sich. Jedes Paar gibt sich genau einmal die Hand.`;
  const prompt = 'Wie oft geben sich die Kinder die Hand?';
  return build(SKILL, 3, {
    key: `${ab}:haende:${n}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value },
    hints: [`Jedes Kind gibt ${n - 1} anderen die Hand.`, 'Beim Malrechnen zählst du jedes Paar zweimal.'],
    steps: [`Jedes Kind begrüßt ${fmt(n - 1)} andere: ${fmt(n)} · ${fmt(n - 1)} = ${fmt(n * (n - 1))}`, 'Jedes Paar ist dabei doppelt gezählt.', `${fmt(n * (n - 1))} : 2 = ${fmt(value)}`, `Die Kinder geben sich ${fmt(value)}-mal die Hand.`],
    bugs: numberBugs([
      { id: 'immer-mal', match: n * (n - 1), hint: 'So zählst du jedes Paar doppelt. Mia und Ali sind nur ein Paar.' },
      { id: 'ohne-verbrauch', match: n * n, hint: 'Niemand gibt sich selbst die Hand. Jedes Paar zählt nur einmal.' },
    ], value),
    praise: 'Du hast jedes Paar nur einmal gezählt.',
    srText: spoken(prompt, context),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** AB III: when does a · b not fit? */
function whenNot(rng: Rng, ab: Ab): Exercise {
  const a = rng.int(2, 5);
  const b = rng.int(2, 5);
  const fitting: readonly string[] = [
    `${a} Shirts und ${b} Hosen: Alles passt zu allem.`,
    `${a} Hauptgerichte und ${b} Getränke: Du wählst frei.`,
    `${a} Ziele und ${b} Fahrzeuge: Jedes Fahrzeug fährt zu jedem Ziel.`,
    `${a} Papiere und ${b} Bänder: Jedes Band passt zu jedem Papier.`,
  ];
  const notFitting: readonly string[] = [
    `${a} Shirts und ${b} Hosen: Das rote Shirt passt nur zu Jeans.`,
    `${a} Hauptgerichte und ${b} Getränke: Zu Fisch gibt es nur Wasser.`,
    `${a} Ziele und ${b} Fahrzeuge: Zur Burg fährt nur der Bus.`,
    `${a} Papiere und ${b} Bänder: Das blaue Papier passt zu keinem Band.`,
  ];
  const t = rng.int(0, 3);
  const right: ChoiceOption = { label: notFitting[t] };
  const others = rng.sample(fitting.filter((_, i) => i !== t), 3);
  const options = rng.shuffle<ChoiceOption>([right, ...others.map((label) => ({ label, whyWrong: 'Hier passt jede Wahl zu jeder anderen. Die Rechnung stimmt also.' }))]);
  const prompt = `Bei welcher Aufgabe passt die Rechnung ${a} · ${b} nicht?`;
  return build(SKILL, 3, {
    key: `${ab}:wann:${a}:${b}:${t}:${[...others].sort().join('|')}`,
    ab,
    prompt,
    answer: { kind: 'choice', options, correct: options.indexOf(right) },
    hints: ['Die Malrechnung braucht: Jede Wahl passt zu jeder anderen.', 'Such die Aufgabe mit einer Einschränkung.'],
    steps: ['Die Rechnung passt nur, wenn jede Wahl zu jeder anderen passt.', `Hier gilt das nicht: ${notFitting[t]}`],
    praise: 'Du hast die Bedingung der Malrechnung geprüft.',
    srText: spoken(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return fourOrders(rng, ab);
  if (ab === 2) return somePlaces(rng, ab);
  return rng.pick([ruledOut, handshakes, whenNot])(rng, ab);
}

// ─── Skill ───────────────────────────────────────────────────────────────────

const BY_STUFE: Record<Stufe, (rng: Rng, ab: Ab) => Exercise> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const zaehlprinzipSkill: SkillDef = {
  ...SKILL,
  title: 'Systematisch zählen',
  description: 'Du zählst Möglichkeiten mit Baumdiagramm und Zählprinzip.',
  stufen: {
    1: 'Zwei Stufen mit Baumdiagramm',
    2: 'Drei Stufen wie 3 · 2 · 4',
    3: 'Reihenfolgen von vier Dingen, und wann die Regel nicht passt',
  },
  kmk: ['DZ.zaehlen', 'PK.problemloesen', 'PK.argumentieren'],
  generate(rng, stufe, ctx) {
    return BY_STUFE[stufe](rng, targetAb(rng, stufe, ctx));
  },
};
