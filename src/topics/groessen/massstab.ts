/**
 * Maßstab: zwischen Plan und Wirklichkeit.
 * Stufe 1: 1 : 100, from the plan in cm to the real length in m; AB II half centimetres; AB III a room on a grid, two lengths.
 * Stufe 2: the real length to the plan; AB II 1 : 25 000 to km; AB III km back to the map.
 * Stufe 3: find the Maßstab; AB II an enlargement 5 : 1 with a change of unit, both ways; AB III a map's Maßstab or an enlargement's, with two-digit lengths.
 * Every real length fits its thing (a Schulhof is no 2 m long). An enlargement is told as a poster: this skill draws no such picture.
 * The srText says a Maßstab as '1 zu 100'. Read-aloud goes through the shared speak(), which still says 'geteilt durch'.
 */
import { BOX, fmt } from '../../core/format';
import type { Ab, Exercise, MultiField, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { targetAb } from '../shared';
import { COMMA_FIELD, finish, q, speak } from './helpers';

const SKILL = { id: 'groessen.massstab', topicId: 'groessen' } as const;
const KMK = ['GM.massstab'];

/** A Maßstab as written: '1 : 25 000'. */
const scale = (s: number) => `1 : ${fmt(s)}`;

/** The task for the screen reader, with 'zu' in a Maßstab. */
const srOf = (text: string) => speak(text).replace(/(\d) geteilt durch (\d)/g, '$1 zu $2');

/** Things on a plan, with the real lengths in m that fit them. */
const REAL_THINGS = [
  { noun: 'die Wand', Noun: 'Die Wand', min: 3, max: 9 },
  { noun: 'der Flur', Noun: 'Der Flur', min: 4, max: 12 },
  { noun: 'der Garten', Noun: 'Der Garten', min: 8, max: 30 },
  { noun: 'die Terrasse', Noun: 'Die Terrasse', min: 3, max: 8 },
  { noun: 'der Klassenraum', Noun: 'Der Klassenraum', min: 7, max: 11 },
  { noun: 'der Schulhof', Noun: 'Der Schulhof', min: 30, max: 90 },
] as const;

/**
 * A thing and a real length of it in m that this Maßstab draws at 2 cm to maxCm: whole metres and whole centimetres on the plan, or with half = true half metres.
 * The thing comes first, so that a thing with many lengths is not more frequent.
 */
function realThing(rng: Rng, s: number, maxCm: number, half = false) {
  const lengths = (t: (typeof REAL_THINGS)[number]) => Array.from({ length: t.max - t.min + 1 }, (_, i) => t.min + i + (half ? 0.5 : 0)).filter((m) => {
    const cm = (m * 100) / s;
    return m <= t.max && cm >= 2 && cm <= maxCm && (half || Number.isInteger(cm));
  });
  const t = rng.pick(REAL_THINGS.filter((x) => lengths(x).length > 0));
  return { t, m: rng.pick(lengths(t)) };
}

const rulerOf = (mm: number): Visual => ({ type: 'ruler', maxCm: Math.max(15, Math.ceil(mm / 10) + 1), startMm: 0, lengthMm: mm });

const inWords = 'In Wirklichkeit ist alles 100-mal so lang wie auf dem Plan.';

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function planToReal(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const { t, m: cm } = realThing(rng, 100, 13, ab === 2);
  const mm = cm * 10;
  const context = `Der Plan hat den Maßstab ${scale(100)}. Auf dem Plan ist ${t.noun} ${q(cm, 'cm')} lang.`;
  const prompt = `Wie lang ist ${t.noun} in Wirklichkeit?`;
  return finish(SKILL, stufe, {
    key: `plan:${t.noun}:${mm}`,
    ab,
    context,
    prompt,
    visual: rulerOf(mm),
    answer: { kind: 'number', value: cm, unit: 'm', decimals: COMMA_FIELD },
    hints: ['1 cm auf dem Plan sind 100 cm in Wirklichkeit.', '100 cm sind 1 m. Rechne um.'],
    steps: [`${q(cm, 'cm')} · 100 = ${q(cm * 100, 'cm')}`, `${q(cm * 100, 'cm')} = ${q(cm, 'm')}`],
    bugs: [
      { id: 'massstab-richtung', match: cm / 100, hint: inWords },
      { id: 'massstab-einheit', match: cm * 100, hint: `${q(cm * 100, 'cm')} sind noch keine Meter. Rechne um.` },
    ],
    praise: 'Du hast mit dem Maßstab gerechnet und in Meter umgewandelt.',
    srText: srOf(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** A room on a grid: two lengths from the same plan. */
function roomOnGrid(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const w = rng.int(4, 8);
  const h = rng.int(3, w - 1);
  const cells = Array.from({ length: w * h }, (_, i) => [1 + (i % w), 1 + Math.floor(i / w)] as const);
  const fields: MultiField[] = [
    { id: 'l', value: w, before: 'Länge:', after: 'm', decimals: COMMA_FIELD, label: 'Länge in Metern' },
    { id: 'b', value: h, before: 'Breite:', after: 'm', decimals: COMMA_FIELD, label: 'Breite in Metern' },
  ];
  const context = `Der Plan hat den Maßstab ${scale(100)}. Ein Kästchen auf dem Plan ist 1 cm breit.`;
  const prompt = 'Wie lang und wie breit ist das Zimmer in Wirklichkeit?';
  return finish(SKILL, stufe, {
    key: `zimmer:${w}:${h}`,
    ab,
    context,
    prompt,
    visual: { type: 'grid', width: w + 2, height: h + 2, cells, showOutline: true, caption: 'Plan eines Zimmers' },
    answer: { kind: 'multi', fields },
    hints: ['Zähle die Kästchen für jede Seite.', 'Jedes Kästchen sind in Wirklichkeit 100 cm, also 1 m.'],
    steps: [`Länge: ${q(w, 'cm')} · 100 = ${q(w * 100, 'cm')}`, `Breite: ${q(h, 'cm')} · 100 = ${q(h * 100, 'cm')}`, `Das Zimmer ist ${q(w, 'm')} lang und ${q(h, 'm')} breit.`],
    bugs: [{ id: 'massstab-einheit', match: { l: w * 100, b: h * 100 }, hint: 'Das sind noch Zentimeter. Gefragt sind Meter.' }],
    praise: 'Du hast beide Seiten mit dem Maßstab umgerechnet.',
    srText: srOf(`${context} Auf dem Plan ist das Zimmer ${w} Kästchen lang und ${h} Kästchen breit. ${prompt}`),
    kmk: KMK,
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

function realToPlan(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const s = rng.pick([50, 100, 200]);
  const { t, m } = realThing(rng, s, 20);
  const cm = (m * 100) / s;
  const context = `${t.Noun} ist in Wirklichkeit ${q(m, 'm')} lang. Der Plan hat den Maßstab ${scale(s)}.`;
  const prompt = `Wie lang ist ${t.noun} auf dem Plan?`;
  return finish(SKILL, stufe, {
    key: `wirklich:${t.noun}:${m}:${s}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: cm, unit: 'cm', decimals: COMMA_FIELD },
    hints: ['Auf dem Plan ist alles kleiner als in Wirklichkeit.', `Schreib die Länge in cm. Teile dann durch ${s}.`],
    steps: [`${q(m, 'm')} = ${q(m * 100, 'cm')}`, `${q(m * 100, 'cm')} : ${s} = ${q(cm, 'cm')}`],
    bugs: [
      { id: 'massstab-richtung', match: m * 100 * s, hint: 'Auf dem Plan ist es kleiner. Teile durch den Maßstab.' },
      { id: 'massstab-einheit', match: m * 100, hint: `Schreib die Länge in cm. Teile dann durch ${s}.` },
      { id: 'massstab-einheit', match: m / s, hint: 'Rechne zuerst die Meter in Zentimeter um.' },
    ],
    praise: 'Du hast umgerechnet und durch den Maßstab geteilt.',
    srText: srOf(`${context} ${prompt}`),
    kmk: KMK,
  });
}

const MAP_SCALES = [10_000, 25_000, 50_000];

/** A map to km: the unit is two steps away. */
function mapToReal(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const s = rng.pick(MAP_SCALES);
  const cm = rng.int(1, 8) * 2;
  const realCm = cm * s;
  const km = realCm / 100_000;
  const context = `Die Karte hat den Maßstab ${scale(s)}. Auf der Karte ist der Weg ${q(cm, 'cm')} lang.`;
  const prompt = 'Wie viele Kilometer ist der Weg in Wirklichkeit lang?';
  return finish(SKILL, stufe, {
    key: `karte:${s}:${cm}`,
    ab,
    context,
    prompt,
    visual: rulerOf(cm * 10),
    answer: { kind: 'number', value: km, unit: 'km', decimals: COMMA_FIELD },
    hints: [`Rechne zuerst mal ${fmt(s)}. Das Ergebnis ist in cm.`, 'Rechne dann in m und danach in km um.'],
    steps: [`${q(cm, 'cm')} · ${fmt(s)} = ${q(realCm, 'cm')}`, `${q(realCm, 'cm')} = ${q(realCm / 100, 'm')}`, `${q(realCm / 100, 'm')} = ${q(km, 'km')}`],
    bugs: [
      { id: 'massstab-einheit', match: realCm, hint: `${q(realCm, 'cm')} sind noch keine Kilometer. Rechne um.` },
      { id: 'massstab-einheit', match: realCm / 100, hint: 'Das sind noch Meter. 1000 m sind 1 km.' },
    ],
    praise: 'Du hast über Meter bis zu Kilometern umgerechnet.',
    srText: srOf(`${context} ${prompt}`),
    kmk: KMK,
  });
}

function realToMap(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const s = rng.pick(MAP_SCALES);
  // A Wanderweg has at least 1 km.
  const cm = rng.pick([2, 4, 6, 8, 10, 12, 14].filter((x) => x * s >= 100_000));
  const km = (cm * s) / 100_000;
  const realCm = cm * s;
  const context = `Ein Wanderweg ist ${q(km, 'km')} lang. Die Karte hat den Maßstab ${scale(s)}.`;
  const prompt = 'Wie lang ist der Wanderweg auf der Karte?';
  return finish(SKILL, stufe, {
    key: `zurueck:${s}:${cm}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: cm, unit: 'cm', decimals: COMMA_FIELD },
    hints: ['Auf der Karte ist der Weg viel kürzer.', 'Schreib die Länge in cm. Teile dann durch den Maßstab.'],
    steps: [`${q(km, 'km')} = ${q(realCm / 100, 'm')}`, `${q(realCm / 100, 'm')} = ${q(realCm, 'cm')}`, `${q(realCm, 'cm')} : ${fmt(s)} = ${q(cm, 'cm')}`],
    bugs: [
      { id: 'massstab-einheit', match: realCm, hint: 'Das ist die Länge in Wirklichkeit. Teile durch den Maßstab.' },
      { id: 'massstab-einheit', match: (km * 1000) / s, hint: 'Schreib die Länge zuerst in cm. Dann passt der Maßstab.' },
    ],
    praise: 'Du hast den Weg in cm geschrieben und geteilt.',
    srText: srOf(`${context} ${prompt}`),
    kmk: KMK,
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

function findScale(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const s = rng.pick([50, 100, 200, 500, 1000]);
  const { t, m } = realThing(rng, s, s === 50 ? 12 : 9);
  const realCm = m * 100;
  const cm = realCm / s;
  const context = `Auf dem Plan ist ${t.noun} ${q(cm, 'cm')} lang. In Wirklichkeit ist ${t.noun} ${q(m, 'm')} lang.`;
  const prompt = 'Welchen Maßstab hat der Plan?';
  return finish(SKILL, stufe, {
    key: `finden:${t.noun}:${s}:${cm}`,
    ab,
    context,
    prompt,
    expression: `1 : ${BOX}`,
    answer: { kind: 'number', value: s, before: '1 :', decimals: COMMA_FIELD },
    hints: ['Schreib beide Längen in derselben Einheit.', 'Wie oft passt die Länge vom Plan in die Länge in Wirklichkeit?'],
    steps: [`${q(m, 'm')} = ${q(realCm, 'cm')}`, `${q(realCm, 'cm')} : ${q(cm, 'cm')} = ${fmt(s)}`, `Der Maßstab ist ${scale(s)}.`],
    bugs: [{ id: 'massstab-einheit', match: m / cm, hint: 'Schreib zuerst beide Längen in cm.' }],
    praise: 'Du hast beide Längen in cm verglichen.',
    srText: srOf(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Small animals with real lengths in mm that fit them. */
const SMALL_ANIMALS = [
  { name: 'Ameise', mm: [4, 5, 6, 7, 8] },
  { name: 'Biene', mm: [12, 13, 14, 15] },
  { name: 'Mücke', mm: [4, 5, 6, 7, 8] },
  { name: 'Fliege', mm: [6, 7, 8, 9] },
  { name: 'Spinne', mm: [6, 8, 10, 12] },
] as const;

const ENLARGEMENTS = [5, 10, 20, 25, 50];

/** An animal, its real length and a factor that fits a poster of at most 40 cm. */
function posterAnimal(rng: Rng) {
  const a = rng.pick(SMALL_ANIMALS);
  const mm = rng.pick(a.mm);
  return { animal: a.name, mm, f: rng.pick(ENLARGEMENTS.filter((x) => x * mm <= 400)) };
}

/** An enlargement: on the poster it is larger than in reality. The real length is in mm, the poster in cm, so the direction and the unit both count. */
function enlargement(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const { animal, mm, f } = posterAnimal(rng);
  const pictureMm = mm * f;
  const cm = pictureMm / 10;
  const forward = rng.chance(0.5);
  const context = forward
    ? `Ein Poster zeigt eine ${animal} im Maßstab ${f} : 1. In Wirklichkeit ist die ${animal} ${q(mm, 'mm')} lang.`
    : `Ein Poster zeigt eine ${animal} im Maßstab ${f} : 1. Auf dem Poster ist die ${animal} ${q(cm, 'cm')} lang.`;
  const prompt = forward ? `Wie viele cm ist die ${animal} auf dem Poster lang?` : `Wie viele mm ist die ${animal} in Wirklichkeit lang?`;
  return finish(SKILL, stufe, {
    key: `vergroessert:${animal}:${f}:${mm}:${forward ? 'bild' : 'echt'}`,
    ab,
    context,
    prompt,
    answer: forward ? { kind: 'number', value: cm, unit: 'cm', decimals: COMMA_FIELD } : { kind: 'number', value: mm, unit: 'mm', decimals: COMMA_FIELD },
    hints: [`${f} : 1 heißt: Auf dem Poster ist alles ${f}-mal so groß.`, forward ? `Rechne mal ${f}. Schreib das Ergebnis dann in cm.` : `Schreib die Länge zuerst in mm. Teile dann durch ${f}.`],
    steps: forward ? [`${q(mm, 'mm')} · ${f} = ${q(pictureMm, 'mm')}`, `${q(pictureMm, 'mm')} = ${q(cm, 'cm')}`] : [`${q(cm, 'cm')} = ${q(pictureMm, 'mm')}`, `${q(pictureMm, 'mm')} : ${f} = ${q(mm, 'mm')}`],
    bugs: forward
      ? [
          { id: 'massstab-richtung', match: mm / f, hint: `${f} : 1 heißt: Auf dem Poster ist alles größer als in Wirklichkeit.` },
          { id: 'massstab-einheit', match: pictureMm, hint: 'Das sind noch mm. Gefragt sind cm.' },
        ]
      : [
          { id: 'massstab-richtung', match: pictureMm * f, hint: `${f} : 1 heißt: Auf dem Poster ist alles größer als in Wirklichkeit.` },
          { id: 'massstab-einheit', match: cm / f, hint: 'Schreib die Länge zuerst in mm.' },
        ],
    praise: 'Du hast die Vergrößerung richtig umgerechnet.',
    srText: srOf(`${context} ${prompt}`),
    kmk: KMK,
  });
}

function findMapScale(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const s = rng.pick(MAP_SCALES);
  const cm = rng.int(1, 6) * 2;
  const realCm = cm * s;
  const km = realCm / 100_000;
  const context = `Ein Weg ist in Wirklichkeit ${q(km, 'km')} lang. Auf der Karte ist der Weg ${q(cm, 'cm')} lang.`;
  const prompt = 'Welchen Maßstab hat die Karte?';
  return finish(SKILL, stufe, {
    key: `karte-finden:${s}:${cm}`,
    ab,
    context,
    prompt,
    expression: `1 : ${BOX}`,
    answer: { kind: 'number', value: s, before: '1 :', decimals: COMMA_FIELD },
    hints: ['Schreib den Weg aus der Wirklichkeit in cm.', 'Teile dann durch die Länge auf der Karte.'],
    steps: [`${q(km, 'km')} = ${q(realCm, 'cm')}`, `${q(realCm, 'cm')} : ${q(cm, 'cm')} = ${fmt(s)}`, `Der Maßstab ist ${scale(s)}.`],
    bugs: [
      { id: 'massstab-einheit', match: (km * 1000) / cm, hint: 'Schreib zuerst beide Längen in cm. Hier steht noch eine andere Einheit.' },
      { id: 'massstab-einheit', match: km / cm, hint: 'Schreib zuerst beide Längen in cm.' },
    ],
    praise: 'Du hast beide Längen in dieselbe Einheit gebracht.',
    srText: srOf(`${context} ${prompt}`),
    kmk: KMK,
  });
}

function findEnlargement(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const { animal, mm, f } = posterAnimal(rng);
  const picture = mm * f;
  const context = `Eine ${animal} ist in Wirklichkeit ${q(mm, 'mm')} lang. Auf einem Poster ist die ${animal} ${q(picture / 10, 'cm')} lang.`;
  const prompt = 'Welchen Maßstab hat das Poster?';
  return finish(SKILL, stufe, {
    key: `bild-finden:${animal}:${f}:${mm}`,
    ab,
    context,
    prompt,
    expression: `${BOX} : 1`,
    answer: { kind: 'number', value: f, after: ': 1', decimals: COMMA_FIELD },
    hints: ['Schreib beide Längen in mm.', 'Wie oft passt die wirkliche Länge in die Länge auf dem Poster?'],
    steps: [`${q(picture / 10, 'cm')} = ${q(picture, 'mm')}`, `${q(picture, 'mm')} : ${q(mm, 'mm')} = ${f}`, `Der Maßstab ist ${f} : 1.`],
    bugs: [{ id: 'massstab-einheit', match: picture / 10 / mm, hint: 'Schreib zuerst beide Längen in mm.' }],
    praise: 'Du hast die Vergrößerung aus zwei Längen bestimmt.',
    srText: srOf(`${context} ${prompt}`),
    kmk: KMK,
  });
}

export const massstabSkill: SkillDef = {
  ...SKILL,
  title: 'Maßstab',
  description: 'Du rechnest zwischen Plan und Wirklichkeit um.',
  stufen: {
    1: 'Maßstab 1 : 100: vom Plan in cm zur Wirklichkeit in m',
    2: 'Wirklichkeit zum Plan; Karte 1 : 25 000 und km',
    3: 'Den Maßstab finden; Vergrößerung wie 5 : 1',
  },
  kmk: KMK,
  keys: { comma: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 3 ? roomOnGrid(stufe, ab, rng) : planToReal(stufe, ab, rng);
    if (stufe === 2) {
      if (ab === 1) return realToPlan(stufe, ab, rng);
      return ab === 2 ? mapToReal(stufe, ab, rng) : realToMap(stufe, ab, rng);
    }
    if (ab === 1) return findScale(stufe, ab, rng);
    if (ab === 2) return enlargement(stufe, ab, rng);
    return rng.chance(0.5) ? findMapScale(stufe, ab, rng) : findEnlargement(stufe, ab, rng);
  },
};

