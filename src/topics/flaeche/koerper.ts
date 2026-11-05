/**
 * flaeche.koerper (docs/research.md §6). A wrong option is never true as well: a Würfel is also a Quader, a Würfel and a Quader are also a four-sided Prisma, and
 * a Quadrat is also a Rechteck. The solid visual cannot draw a Prisma, so its items are text only.
 * Stufe 1: name the solid. AB I picture to name, AB II everyday object or name to picture, AB III the odd one out.
 * Stufe 2: Ecken, Kanten, Flächen, shape of faces. AB I count, AB II shape of faces or round solids, AB III a tape along all Kanten.
 * Stufe 3: Prisma, solid from a description. AB I description, AB II count on a Prisma, AB III a Prisma reversed.
 */
import type { SkillDef, SolidKind, Stufe, VisualOf } from '../../core/types';
import { makeChoice, pickPerson, plural } from '../shared';
import { HINT, LETTERS, bug, generator, numberAnswer, q, type Forms, type Item } from './common';

const SKILL = { id: 'flaeche.koerper', topicId: 'flaeche' } as const;
const KMK = ['RF.koerper'];

const NAME: Record<SolidKind, string> = { wuerfel: 'Würfel', quader: 'Quader', kugel: 'Kugel', zylinder: 'Zylinder', kegel: 'Kegel', pyramide: 'Pyramide' };
const WITH_ARTICLE: Record<SolidKind, string> = { wuerfel: 'der Würfel', quader: 'der Quader', kugel: 'die Kugel', zylinder: 'der Zylinder', kegel: 'der Kegel', pyramide: 'die Pyramide' };
const AS_OBJECT: Record<SolidKind, string> = { wuerfel: 'einen Würfel', quader: 'einen Quader', kugel: 'eine Kugel', zylinder: 'einen Zylinder', kegel: 'einen Kegel', pyramide: 'eine Pyramide' };
const SOLIDS = Object.keys(NAME) as SolidKind[];

/** What tells a solid apart: the text for a child who chose it. */
const FEATURE: Record<SolidKind, string> = {
  wuerfel: 'Ein Würfel hat sechs gleich große Quadrate.',
  quader: 'Ein Quader hat Rechtecke als Flächen.',
  kugel: 'Eine Kugel ist überall rund.',
  zylinder: 'Ein Zylinder hat oben und unten einen Kreis.',
  kegel: 'Ein Kegel hat unten einen Kreis und oben eine Spitze.',
  pyramide: 'Eine Pyramide hat oben eine Spitze und Dreiecke an den Seiten.',
};

const picture = (solid: SolidKind, named = false): VisualOf<'solid'> => ({ type: 'solid', solid, ...(named ? { named } : {}) });

function wrongSolids(rng: Parameters<Forms[1][1]>[0], right: SolidKind, n: number): SolidKind[] {
  return rng.sample(SOLIDS.filter((s) => s !== right && !(right === 'wuerfel' && s === 'quader')), n);
}

const nameChoice = (rng: Parameters<Forms[1][1]>[0], right: SolidKind) =>
  makeChoice(rng, { label: NAME[right] }, wrongSolids(rng, right, 3).map((s) => ({ label: NAME[s], whyWrong: FEATURE[s] })));

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1Name: Forms[1][1] = (rng) => {
  const solid = rng.pick(SOLIDS);
  return {
    key: `name:${solid}`,
    prompt: 'Wie heißt dieser Körper?',
    visual: picture(solid),
    answer: nameChoice(rng, solid),
    hints: ['Schau auf die Form der Flächen.', 'Hat der Körper Ecken, eine Spitze oder Rundungen?'],
    steps: [FEATURE[solid], `Der Körper heißt ${NAME[solid]}.`],
    praise: 'Du hast den Körper an den Flächen erkannt.',
  };
};

const OBJECTS: readonly { text: string; solid: SolidKind }[] = [
  { text: 'Eine Dose', solid: 'zylinder' }, { text: 'Eine Kerze', solid: 'zylinder' }, { text: 'Eine Regentonne', solid: 'zylinder' },
  { text: 'Ein Ball', solid: 'kugel' }, { text: 'Eine Murmel', solid: 'kugel' }, { text: 'Eine Orange', solid: 'kugel' },
  { text: 'Ein Spielwürfel', solid: 'wuerfel' }, { text: 'Ein Zuckerstück', solid: 'wuerfel' },
  { text: 'Ein Schuhkarton', solid: 'quader' }, { text: 'Eine Milchpackung', solid: 'quader' }, { text: 'Ein Ziegelstein', solid: 'quader' },
  { text: 'Eine Eistüte', solid: 'kegel' }, { text: 'Ein Partyhut', solid: 'kegel' }, { text: 'Ein Zauberhut', solid: 'kegel' },
  { text: 'Ein Grabmal in Ägypten', solid: 'pyramide' }, { text: 'Ein Dach aus vier Dreiecken', solid: 'pyramide' },
];

const s1Object: Forms[1][2] = (rng) => {
  if (rng.chance(0.35)) {
    const solid = rng.pick(SOLIDS);
    // a drawn Würfel also shows a Quader
    const wrong = solid === 'quader' ? rng.sample(SOLIDS.filter((s) => s !== 'quader' && s !== 'wuerfel'), 3) : wrongSolids(rng, solid, 3);
    const order = rng.shuffle([solid, ...wrong]);
    return {
      key: `bild-suchen:${solid}`,
      prompt: `Welche Zeichnung zeigt ${AS_OBJECT[solid]}?`,
      answer: {
        kind: 'choice',
        layout: 'grid',
        correct: order.indexOf(solid),
        options: order.map((s, i) => ({ label: LETTERS[i], visual: picture(s), ...(s === solid ? {} : { whyWrong: FEATURE[s] }) })),
      },
      hints: [FEATURE[solid], 'Prüfe eine Zeichnung nach der anderen.'],
      steps: [{ text: FEATURE[solid], visual: picture(solid, true) }, `Diese Zeichnung zeigt ${AS_OBJECT[solid]}.`],
      praise: 'Du hast Name und Zeichnung verbunden.',
    };
  }
  const o = rng.pick(OBJECTS);
  return {
    key: `gegenstand:${o.text}`,
    prompt: `${o.text}: Welche Form hat das ungefähr?`,
    answer: nameChoice(rng, o.solid),
    hints: ['Stell dir den Gegenstand in der Hand vor.', 'Ist der Gegenstand rund oder eckig? Hat der Gegenstand eine Spitze?'],
    steps: [FEATURE[o.solid], `Die Form ist ungefähr: ${NAME[o.solid]}.`],
    praise: 'Du hast den Körper im Alltag wiedergefunden.',
  };
};

const FLAT: SolidKind[] = ['wuerfel', 'quader', 'pyramide'];
const ROUND: SolidKind[] = ['kugel', 'kegel', 'zylinder'];

const s1Odd: Forms[1][3] = (rng) => {
  const lookForRound = rng.chance(0.5);
  const odd = rng.pick(lookForRound ? ROUND : FLAT);
  const group = lookForRound ? FLAT : ROUND;
  const why = lookForRound ? 'Dieser Körper hat nur ebene Flächen.' : 'Dieser Körper hat eine gebogene Fläche.';
  return {
    key: `passt-nicht:${odd}`,
    prompt: lookForRound ? 'Drei Körper haben nur ebene Flächen. Welcher Körper nicht?' : 'Drei Körper haben eine gebogene Fläche. Welcher Körper nicht?',
    answer: makeChoice(rng, { label: NAME[odd] }, group.map((s) => ({ label: NAME[s], whyWrong: why }))),
    hints: ['Stell dir jeden Körper einzeln vor.', 'Ein Körper mit gebogener Fläche kann rollen.'],
    steps: [FEATURE[odd], `${NAME[odd]} passt nicht zu den anderen drei Körpern.`],
    praise: 'Du hast die Körper nach ihren Flächen sortiert.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

type Prop = 'Ecken' | 'Kanten' | 'Flächen';
const COUNTS: Partial<Record<SolidKind, Record<Prop, number>>> = {
  wuerfel: { Ecken: 8, Kanten: 12, Flächen: 6 },
  quader: { Ecken: 8, Kanten: 12, Flächen: 6 },
  pyramide: { Ecken: 5, Kanten: 8, Flächen: 5 },
};
/** What a child sees in the drawing (src/ui/visuals/SolidVisual.tsx). */
const VISIBLE: Partial<Record<SolidKind, Record<Prop, number>>> = {
  wuerfel: { Ecken: 7, Kanten: 9, Flächen: 3 },
  quader: { Ecken: 7, Kanten: 9, Flächen: 3 },
  pyramide: { Ecken: 4, Kanten: 5, Flächen: 2 },
};
const HOW: Record<string, string> = {
  'wuerfel:Ecken': 'Oben 4 Ecken und unten 4 Ecken.', 'quader:Ecken': 'Oben 4 Ecken und unten 4 Ecken.',
  'wuerfel:Kanten': 'Oben 4, unten 4 und an den Seiten 4 Kanten.', 'quader:Kanten': 'Oben 4, unten 4 und an den Seiten 4 Kanten.',
  'wuerfel:Flächen': 'Vorne, hinten, links, rechts, oben und unten.', 'quader:Flächen': 'Vorne, hinten, links, rechts, oben und unten.',
  'pyramide:Ecken': 'Unten 4 Ecken und oben die Spitze.', 'pyramide:Kanten': 'Unten 4 Kanten und zur Spitze 4 Kanten.', 'pyramide:Flächen': 'Unten 1 Quadrat und an den Seiten 4 Dreiecke.',
};

const s2Count: Forms[2][1] = (rng): Item => {
  const solid = rng.pick(['wuerfel', 'quader', 'pyramide'] as const);
  const prop = rng.pick(['Ecken', 'Kanten', 'Flächen'] as const);
  const value = COUNTS[solid]![prop];
  const seen = VISIBLE[solid]![prop];
  const ids: Record<Prop, string> = { Ecken: 'ecken-verdeckt', Kanten: 'kanten-verdeckt', Flächen: 'flaechen-sichtbar' };
  const hint = prop === 'Flächen' ? 'Du siehst nur einen Teil. Zähle auch die Flächen hinten und unten.' : prop === 'Ecken' ? 'Denk auch an die verdeckte Ecke.' : HINT.kantenVerdeckt;
  return {
    key: `zaehlen:${solid}:${prop}`,
    prompt: `Wie viele ${prop} hat ${WITH_ARTICLE[solid]}?`,
    visual: picture(solid, true),
    answer: numberAnswer(value, prop),
    hints: ['Gestrichelte Linien sind verdeckte Kanten.', 'Zähle in einer festen Reihenfolge: zuerst unten, dann oben.'],
    steps: [HOW[`${solid}:${prop}`], `${NAME[solid]}: ${value} ${prop}`],
    bugs: [bug(ids[prop], seen, hint)],
    praise: 'Du hast auch die verdeckten Teile mitgezählt.',
  };
};

/** Rechteck is never a wrong option for a Quadrat: every Quadrat is a Rechteck. fact: what the child should look at, about the asked face. */
const FACE_SHAPES: readonly { id: string; ask: string; right: string; wrong: string[]; solid: SolidKind; fact: string }[] = [
  { id: 'wuerfel', ask: 'Welche Form haben die Flächen vom Würfel?', right: 'Quadrate', wrong: ['Dreiecke', 'Kreise', 'Fünfecke'], solid: 'wuerfel', fact: FEATURE.wuerfel },
  { id: 'quader', ask: 'Welche Form haben die Flächen vom Quader mit verschiedenen Kanten?', right: 'Rechtecke', wrong: ['Quadrate', 'Dreiecke', 'Kreise'], solid: 'quader', fact: FEATURE.quader },
  { id: 'pyr-seite', ask: 'Welche Form haben die Seitenflächen der Pyramide?', right: 'Dreiecke', wrong: ['Quadrate', 'Rechtecke', 'Kreise'], solid: 'pyramide', fact: FEATURE.pyramide },
  { id: 'pyr-boden', ask: 'Welche Form hat der Boden der Pyramide?', right: 'Quadrat', wrong: ['Dreieck', 'Kreis', 'Fünfeck'], solid: 'pyramide', fact: 'Der Boden der Pyramide hat vier gleich lange Seiten und vier rechte Winkel.' },
  { id: 'zyl', ask: 'Welche Form hat der Boden vom Zylinder?', right: 'Kreis', wrong: ['Dreieck', 'Quadrat', 'Rechteck'], solid: 'zylinder', fact: FEATURE.zylinder },
  { id: 'kegel', ask: 'Welche Form hat der Boden vom Kegel?', right: 'Kreis', wrong: ['Dreieck', 'Quadrat', 'Rechteck'], solid: 'kegel', fact: FEATURE.kegel },
];
const ROUND_COUNTS: readonly { solid: SolidKind; prop: 'Kanten' | 'Flächen'; value: number; how: string; wrong: number; id: string; hint: string }[] = [
  { solid: 'zylinder', prop: 'Flächen', value: 3, how: 'Oben ein Kreis, unten ein Kreis und die gebogene Fläche.', wrong: 2, id: 'gebogene-vergessen', hint: 'Auch die gebogene Fläche zählt als Fläche.' },
  { solid: 'zylinder', prop: 'Kanten', value: 2, how: 'Die Kanten sind der obere und der untere Kreisrand.', wrong: 0, id: 'kanten-rund', hint: 'Auch ein Kreisrand ist eine Kante.' },
  { solid: 'kegel', prop: 'Flächen', value: 2, how: 'Unten ein Kreis und die gebogene Fläche.', wrong: 1, id: 'gebogene-vergessen', hint: 'Auch die gebogene Fläche zählt als Fläche.' },
  { solid: 'kegel', prop: 'Kanten', value: 1, how: 'Die Kante ist der Kreisrand unten.', wrong: 0, id: 'kanten-rund', hint: 'Auch ein Kreisrand ist eine Kante.' },
];

const s2Shape: Forms[2][2] = (rng): Item => {
  if (rng.chance(0.65)) {
    const f = rng.pick(FACE_SHAPES);
    return {
      key: `flaechenform:${f.id}`,
      prompt: f.ask,
      visual: picture(f.solid, true),
      answer: makeChoice(rng, { label: f.right }, f.wrong.map((label) => ({ label, whyWrong: f.fact }))),
      hints: ['Stell dir vor: Du stempelst mit dieser Fläche auf Papier.', 'Welche Figur bleibt auf dem Papier zurück?'],
      steps: [f.fact, `Die Antwort ist: ${f.right}.`],
      praise: 'Du hast die Form der Fläche genau benannt.',
    };
  }
  const r = rng.pick(ROUND_COUNTS);
  const unit = plural(r.value, r.prop === 'Kanten' ? 'Kante' : 'Fläche', r.prop);
  return {
    key: `rund-zaehlen:${r.solid}:${r.prop}`,
    prompt: `Wie viele ${r.prop} hat ${WITH_ARTICLE[r.solid]}?`,
    visual: picture(r.solid, true),
    // the word stands before the field: a unit behind it would turn singular only for the answer 1
    answer: { kind: 'number', value: r.value, before: `${r.prop}:` },
    hints: ['Eine Kante ist die Linie zwischen zwei Flächen.', 'Auch eine gebogene Fläche zählt als Fläche.'],
    steps: [r.how, `${NAME[r.solid]}: ${r.value} ${unit}`],
    bugs: [bug(r.id, r.wrong, r.hint)],
    praise: 'Du hast auch gebogene Flächen und Ränder beachtet.',
  };
};

const s2Tape: Forms[2][3] = (rng): Item => {
  const { name } = pickPerson(rng);
  if (rng.chance(0.5)) {
    const a = rng.int(3, 15);
    const total = 12 * a;
    return {
      key: `band-wuerfel:${a}`,
      context: `${name} klebt Band auf alle Kanten eines Würfels. Jede Kante ist ${q(a, 'cm')} lang.`,
      prompt: `Wie viel Band braucht ${name}?`,
      visual: { type: 'quader', a, b: a, c: a, unit: 'cm', showLabels: true, hiddenEdges: 'dashed', kind: 'wuerfel' },
      answer: numberAnswer(total, 'cm', 'Band:'),
      hints: ['Wie viele Kanten hat ein Würfel?', HINT.kantenVerdeckt],
      steps: [`Ein Würfel hat 12 gleich lange Kanten.`, `12 · ${q(a, 'cm')} = ${q(total, 'cm')}`, `Das Band ist ${q(total, 'cm')} lang.`],
      bugs: [
        bug('kanten-verdeckt', 9 * a, HINT.kantenVerdeckt),
        bug('kanten-drei', 3 * a, 'Jede Kantenlänge kommt viermal vor.'),
      ],
      praise: 'Du hast alle zwölf Kanten mitgerechnet.',
      kmk: [...KMK, 'GM.oberflaeche-volumen'],
    };
  }
  const a = rng.int(4, 15);
  const b = rng.int(2, 10);
  const c = rng.int(2, 10);
  const sum = a + b + c;
  return {
    key: `band-quader:${a}-${b}-${c}`,
    context: `${name} klebt Band auf alle Kanten eines Quaders.`,
    prompt: `Wie viel Band braucht ${name}?`,
    visual: { type: 'quader', a, b, c, unit: 'cm', showLabels: true, hiddenEdges: 'dashed' },
    answer: numberAnswer(4 * sum, 'cm', 'Band:'),
    hints: ['Jede Kantenlänge kommt viermal vor.', HINT.kantenVerdeckt],
    steps: [`Drei Kanten zusammen: ${q(a, 'cm')} + ${q(b, 'cm')} + ${q(c, 'cm')} = ${q(sum, 'cm')}`, `4 · ${q(sum, 'cm')} = ${q(4 * sum, 'cm')}`, `Das Band ist ${q(4 * sum, 'cm')} lang.`],
    bugs: [
      bug('kanten-verdeckt', 3 * sum, HINT.kantenVerdeckt),
      bug('kanten-drei', sum, 'Jede Kantenlänge kommt viermal vor.'),
    ],
    praise: 'Du hast jede Kantenlänge viermal gerechnet.',
    srText: `${name} klebt Band auf alle Kanten eines Quaders. Die Kanten sind ${a}, ${b} und ${c} Zentimeter lang. Wie viel Band braucht ${name}?`,
    kmk: [...KMK, 'GM.oberflaeche-volumen'],
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const RIDDLES: readonly { id: string; right: string; text: string; wrong: string[] }[] = [
  { id: 'wuerfel', right: 'Würfel', text: 'Der Körper hat 8 Ecken. Alle Flächen sind gleich große Quadrate.', wrong: ['Pyramide', 'Kegel', 'Zylinder'] },
  { id: 'quader', right: 'Quader', text: 'Der Körper hat 12 Kanten. Alle Flächen sind Rechtecke, aber nicht alle gleich groß.', wrong: ['Würfel', 'Pyramide', 'Kegel'] },
  { id: 'pyramide', right: 'Pyramide', text: 'Der Körper hat 5 Ecken. Der Boden ist ein Quadrat.', wrong: ['Würfel', 'Prisma', 'Kegel'] },
  { id: 'kegel', right: 'Kegel', text: 'Der Körper hat eine gebogene Fläche und einen Kreis. Oben ist eine Spitze.', wrong: ['Zylinder', 'Kugel', 'Pyramide'] },
  { id: 'zylinder', right: 'Zylinder', text: 'Der Körper hat zwei gleich große Kreise. Dazwischen liegt eine gebogene Fläche.', wrong: ['Kegel', 'Kugel', 'Prisma'] },
  { id: 'kugel', right: 'Kugel', text: 'Der Körper hat keine Ecke und keine Kante. Der Körper ist überall rund.', wrong: ['Kegel', 'Zylinder', 'Würfel'] },
  { id: 'prisma', right: 'Prisma', text: 'Oben und unten liegt je ein gleiches Dreieck. An den Seiten sind 3 Rechtecke.', wrong: ['Pyramide', 'Quader', 'Kegel'] },
  { id: 'prisma-sechs', right: 'Prisma', text: 'Oben und unten liegt je ein gleiches Sechseck. An den Seiten sind 6 Rechtecke.', wrong: ['Pyramide', 'Würfel', 'Zylinder'] },
];

const s3Riddle: Forms[3][1] = (rng) => {
  const r = rng.pick(RIDDLES);
  return {
    key: `steckbrief:${r.id}`,
    context: r.text,
    prompt: 'Welcher Körper ist das?',
    answer: makeChoice(rng, { label: r.right }, r.wrong.map((label) => ({ label, whyWrong: 'Prüfe jede Angabe einzeln an diesem Körper.' }))),
    hints: ['Prüfe zuerst die Form der Flächen.', 'Streiche alle Körper mit anderen Flächen.'],
    steps: [r.text, `Von diesen Körpern passt nur: ${r.right}.`],
    praise: 'Du hast jede Angabe am Körper geprüft.',
  };
};

const POLY: Record<number, string> = { 3: 'Dreieck', 4: 'Viereck', 5: 'Fünfeck', 6: 'Sechseck', 7: 'Siebeneck', 8: 'Achteck' };
const POLY_WITH_ARTICLE = (n: number) => `ein ${POLY[n]}`;

const s3PrismCount: Forms[3][2] = (rng) => {
  const n = rng.int(3, 8);
  const prop = rng.pick(['Ecken', 'Kanten', 'Flächen'] as const);
  const value = { Ecken: 2 * n, Kanten: 3 * n, Flächen: n + 2 }[prop];
  const how = {
    Ecken: `Oben ${n} Ecken und unten ${n} Ecken.`,
    Kanten: `Oben ${n}, unten ${n} und an den Seiten ${n} Kanten.`,
    Flächen: `Oben 1 und unten 1 Fläche, an den Seiten ${n} Rechtecke.`,
  }[prop];
  return {
    key: `prisma:${n}:${prop}`,
    prompt: `Ein Prisma hat oben und unten je ${POLY_WITH_ARTICLE(n)}. Wie viele ${prop} hat das Prisma?`,
    answer: numberAnswer(value, prop),
    hints: ['Stell dir oben und unten die gleiche Figur vor.', 'Jede Ecke oben ist mit einer Ecke unten verbunden.'],
    steps: [how, `Das Prisma hat ${value} ${prop}.`],
    bugs: [
      bug('prisma-grund', { Ecken: n, Kanten: 2 * n, Flächen: n }[prop], { Ecken: 'Zähle oben und unten.', Kanten: 'Denk auch an die Kanten an den Seiten.', Flächen: 'Zähle auch die Fläche oben und unten.' }[prop]),
    ],
    praise: 'Du hast oben, unten und die Seiten gezählt.',
  };
};

const s3PrismBack: Forms[3][3] = (rng): Item => {
  const n = rng.int(3, 8);
  if (rng.chance(0.5)) {
    const E = 2 * n;
    const K = 3 * n;
    return {
      key: `prisma-rueck-kanten:${E}`,
      prompt: `Ein Prisma hat ${E} Ecken. Wie viele Kanten hat das Prisma?`,
      answer: numberAnswer(K, 'Kanten'),
      hints: ['Die Ecken verteilen sich gleich auf oben und unten.', 'Rechne oben, unten und die Seiten zusammen.'],
      steps: [`Oben sind ${E} : 2 = ${n} Ecken.`, `Oben ${n}, unten ${n} und an den Seiten ${n} Kanten.`, `3 · ${n} = ${K}`, `Das Prisma hat ${K} Kanten.`],
      bugs: [
        bug('prisma-grund', E, 'Denk auch an die Kanten an den Seiten.'),
        bug('prisma-grund-oben', n, 'Das ist nur die Figur oben. Zähle auch unten und an den Seiten.'),
      ],
      praise: 'Du hast von den Ecken auf die Figur geschlossen.',
      kmk: [...KMK, 'PK.problemloesen'],
    };
  }
  const F = n + 2;
  const others = [3, 4, 5, 6, 7, 8].filter((x) => x !== n);
  return {
    key: `prisma-rueck-form:${F}`,
    prompt: `Ein Prisma hat ${F} Flächen. Welche Figur liegt oben und unten?`,
    answer: makeChoice(rng, { label: POLY[n] }, rng.sample(others, 3).map((x) => ({ label: POLY[x], whyWrong: 'Oben und unten sind 2 Flächen. Der Rest sind Rechtecke an den Seiten.' }))),
    hints: ['Oben und unten sind 2 Flächen.', 'So viele Rechtecke wie Ecken der Figur liegen an den Seiten.'],
    steps: [`Oben und unten: 2 Flächen`, `An den Seiten: ${F} − 2 = ${n} Rechtecke`, `Die Figur hat ${n} Ecken: ${POLY[n]}.`],
    praise: 'Du hast von den Flächen auf die Figur geschlossen.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

const FORMS: Forms = {
  1: { 1: s1Name, 2: s1Object, 3: s1Odd },
  2: { 1: s2Count, 2: s2Shape, 3: s2Tape },
  3: { 1: s3Riddle, 2: s3PrismCount, 3: s3PrismBack },
};

const STUFEN: Record<Stufe, string> = {
  1: 'Würfel, Quader, Zylinder, Kegel, Pyramide und Kugel benennen',
  2: 'Ecken, Kanten und Flächen zählen, Form der Flächen',
  3: 'Prisma, Körper aus einer Beschreibung finden',
};

export const koerperSkill: SkillDef = {
  ...SKILL,
  title: 'Körper erkennen',
  description: 'Du beschreibst Körper mit Ecken, Kanten und Flächen.',
  stufen: STUFEN,
  kmk: KMK,
  generate: generator(SKILL, KMK, FORMS),
};
