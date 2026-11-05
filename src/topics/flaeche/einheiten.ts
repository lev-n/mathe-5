/**
 * flaeche.einheiten (docs/research.md §6). The comma key is on for the whole skill, so every field sets `decimals`. ctx.ranges.areaUnits: 'wide' adds
 * a, ha and km², 'm2ToMm2' stays with m², dm², cm², mm²; each Stufe keeps its meaning under both.
 * Stufe 1: neighbouring units. AB I big to small, AB II small to big, AB III two units at once.
 * Stufe 2: two steps, decimal notation, a, ha and km². AB I two steps, AB II with a comma, AB III a, ha and km² with a comma, or (m²–mm²) two steps with a comma.
 * Stufe 3: order areas, compare with Klassenzimmer and Fußballfeld. AB I order, AB II fitting size or larger than a benchmark, AB III how often one area fits another.
 */
import { fmt } from '../../core/format';
import type { GenContext, OrderAnswer, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { makeChoice } from '../shared';
import { bug, generator, q, rectCells, type Forms, type Item } from './common';

const SKILL = { id: 'flaeche.einheiten', topicId: 'flaeche', keys: { comma: true } } as const;
const KMK = ['GM.flaecheneinheiten'];
/** Above 2: fieldText() writes two decimals as money ('600,00'), and a Lösung here shows '600 dm²' or '3,45 ha'. */
const COMMA_FIELD = 3;

/** Large to small, each 100 of the next. a, ha and km² appear only in their own forms on Stufe 2 and 3. */
const SQUARE_UNITS = ['m²', 'dm²', 'cm²', 'mm²'] as const;

const LENGTH: Record<string, string> = { 'm²': 'm', 'dm²': 'dm', 'cm²': 'cm', 'mm²': 'mm' };

const isWide = (ctx: GenContext) => ctx.ranges.areaUnits === 'wide';
const answerIn = (value: number, unit: string) => ({ kind: 'number' as const, value, unit, decimals: COMMA_FIELD });

/** Rounds away what a float adds: 2.5 · 100 stays 250, 0.07 · 100 stays 7. */
const clean = (x: number) => Math.round(x * 1000) / 1000;

/** The factor between neighbouring units, in the child's units. */
function factorHint(big: string, small: string): string {
  if (LENGTH[big] && LENGTH[small]) return `1 ${LENGTH[big]} sind 10 ${LENGTH[small]}. Also ist 1 ${big} = 10 · 10 ${small}.`;
  return `Von ${big} zu ${small} ist der Faktor immer 100.`;
}

const factorLine = (big: string, small: string) => `1 ${big} = 100 ${small}`;
const WAY_DOWN = 'Eine kleinere Einheit braucht mehr Quadrate. Die Zahl muss größer sein.';
const WAY_UP = 'Eine größere Einheit braucht weniger Quadrate. Die Zahl muss kleiner sein.';

/** The units in one line of steps, each 100 of the next, for a worked step. */
const unitTable = (units: readonly string[]): VisualOf<'table'> => ({ type: 'table', caption: 'Einheitentafel', header: ['Einheit', 'Das sind'], rows: units.slice(0, -1).map((u, i) => [`1 ${u}`, `100 ${units[i + 1]}`]) });

function neighbours(rng: Rng): [string, string] {
  const i = rng.int(0, SQUARE_UNITS.length - 2);
  return [SQUARE_UNITS[i], SQUARE_UNITS[i + 1]];
}

/** Picture of 1 dm² in cm² and so on: ten rows of ten, for a worked step. */
const HUNDRED = { type: 'grid', width: 10, height: 10, cells: rectCells(0, 0, 10, 10), showOutline: true } as const;

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1Down: Forms[1][1] = (rng) => {
  const [big, small] = neighbours(rng);
  const n = rng.int(2, 9);
  const v = n * 100;
  return {
    key: `runter:${n}${big}`,
    prompt: 'Rechne um.',
    expression: `${n} ${big} = □ ${small}`,
    answer: answerIn(v, small),
    hints: [factorHint(big, small), `Jedes ${big} besteht aus 100 ${small}.`],
    steps: [
      { text: factorLine(big, small), visual: { ...HUNDRED, cells: [...HUNDRED.cells] } },
      `${n} · 100 = ${v}`,
      `${n} ${big} = ${v} ${small}`,
    ],
    bugs: [
      bug('flaeche-faktor', n * 10, factorHint(big, small)),
      bug('richtung', clean(n / 100), WAY_DOWN),
    ],
    praise: 'Du hast den Faktor 100 genutzt.',
  };
};

const s1Up: Forms[1][2] = (rng) => {
  const [big, small] = neighbours(rng);
  const n = rng.int(2, 19);
  const v = n * 100;
  return {
    key: `hoch:${v}${small}`,
    prompt: 'Rechne um.',
    expression: `${fmt(v)} ${small} = □ ${big}`,
    answer: answerIn(n, big),
    hints: [factorHint(big, small), `Wie oft passen 100 ${small} hinein?`],
    steps: [{ text: factorLine(big, small), visual: unitTable(SQUARE_UNITS) }, `${v} : 100 = ${n}`, `${fmt(v)} ${small} = ${n} ${big}`],
    bugs: [
      bug('flaeche-faktor', v / 10, factorHint(big, small)),
      bug('richtung', v * 100, WAY_UP),
    ],
    praise: 'Du hast durch 100 geteilt.',
  };
};

const s1Mixed: Forms[1][3] = (rng) => {
  const [big, small] = neighbours(rng);
  const n = rng.int(2, 9);
  const k = rng.chance(0.4) ? rng.int(3, 9) : rng.int(11, 95);
  const v = n * 100 + k;
  if (rng.chance(0.4)) {
    return {
      key: `aufteilen:${v}${small}`,
      prompt: `Schreibe in ${big} und ${small}.`,
      expression: `${fmt(v)} ${small} = □ ${big} □ ${small}`,
      answer: { kind: 'multi', fields: [{ id: 'g', value: n, after: big, decimals: COMMA_FIELD, label: big }, { id: 'k', value: k, after: small, decimals: COMMA_FIELD, label: small }] },
      hints: [factorLine(big, small), `Wie viele volle Hunderter stecken in der Zahl?`],
      steps: [{ text: factorLine(big, small), visual: unitTable(SQUARE_UNITS) }, `${v} = ${n} · 100 + ${k}`, `${fmt(v)} ${small} = ${n} ${big} ${k} ${small}`],
      bugs: [bug('flaeche-faktor', { g: Math.floor(v / 10), k: v % 10 }, factorHint(big, small))],
      praise: 'Du hast die vollen Hunderter abgespalten.',
    };
  }
  return {
    key: `gemischt:${n}${big}${k}${small}`,
    prompt: `Schreibe alles in ${small}.`,
    expression: `${n} ${big} ${k} ${small} = □ ${small}`,
    answer: answerIn(v, small),
    hints: [factorLine(big, small), `Rechne zuerst die ${big} um. Addiere dann die ${small}.`],
    steps: [{ text: factorLine(big, small), visual: unitTable(SQUARE_UNITS) }, `${n} · 100 = ${n * 100}`, `${n * 100} + ${k} = ${v}`, `${n} ${big} ${k} ${small} = ${v} ${small}`],
    bugs: [
      bug('einheit-addiert', n + k, `${big} und ${small} sind verschieden groß. Rechne zuerst um.`),
      bug('ziffern-ohne-null', Number(`${n}${k}`), `Die ${big} zählen als Hunderter. Auf der Zehnerstelle steht hier eine 0.`),
      bug('flaeche-faktor', n * 10 + k, factorHint(big, small)),
    ],
    praise: 'Du hast zuerst umgerechnet und dann addiert.',
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const TWO_STEP_PAIRS: readonly [string, string, string][] = [['m²', 'dm²', 'cm²'], ['dm²', 'cm²', 'mm²']];
const TWO_STEP_WIDE: readonly [string, string, string][] = [...TWO_STEP_PAIRS, ['km²', 'ha', 'a'], ['ha', 'a', 'm²'], ['a', 'm²', 'dm²']];

const s2TwoSteps: Forms[2][1] = (rng, ctx) => {
  const [big, mid, small] = rng.pick(isWide(ctx) ? TWO_STEP_WIDE : TWO_STEP_PAIRS);
  const n = rng.int(2, 19);
  const v = n * 10_000;
  const up = rng.chance(0.35);
  return {
    key: `zwei-schritte:${up ? 'hoch' : 'runter'}:${n}${big}-${small}`,
    prompt: 'Rechne in zwei Schritten um.',
    expression: up ? `${fmt(v)} ${small} = □ ${big}` : `${n} ${big} = □ ${small}`,
    answer: up ? answerIn(n, big) : answerIn(v, small),
    hints: [`Der Weg geht über ${mid}.`, `Jeder Schritt hat den Faktor 100.`],
    steps: up
      ? [{ text: `${fmt(v)} ${small} = ${fmt(n * 100)} ${mid}`, visual: unitTable([big, mid, small]) }, `${fmt(n * 100)} ${mid} = ${n} ${big}`]
      : [{ text: `${n} ${big} = ${fmt(n * 100)} ${mid}`, visual: unitTable([big, mid, small]) }, `${fmt(n * 100)} ${mid} = ${fmt(v)} ${small}`],
    bugs: up
      ? [bug('ein-schritt', n * 100, `Das ist erst ${mid}. Ein Schritt fehlt noch.`), bug('laengen-faktor', clean(v / 1000), 'Flächen haben von Stufe zu Stufe den Faktor 100.')]
      : [bug('ein-schritt', n * 100, `Das ist erst ${mid}. Ein Schritt fehlt noch.`), bug('laengen-faktor', n * 1000, 'Flächen haben von Stufe zu Stufe den Faktor 100.')],
    praise: 'Du hast Schritt für Schritt umgerechnet.',
  };
};

const s2Comma: Forms[2][2] = (rng) => {
  const [big, small] = neighbours(rng);
  if (rng.chance(0.5)) return s2CommaUp(big, small, rng.int(11, 99) * 10 + rng.int(1, 9));
  // never a whole number: this form is about the comma
  const x = rng.chance(0.5) ? clean(rng.int(1, 9) + rng.int(11, 99) / 100) : clean(rng.int(1, 9) + rng.int(1, 9) / 10);
  const v = clean(x * 100);
  return {
    key: `komma-runter:${x}${big}`,
    prompt: 'Rechne um. Schiebe das Komma passend.',
    expression: `${fmt(x)} ${big} = □ ${small}`,
    answer: answerIn(v, small),
    hints: [factorLine(big, small), 'Mal 100 schiebt das Komma um zwei Stellen nach rechts.'],
    steps: [{ text: factorLine(big, small), visual: unitTable(SQUARE_UNITS) }, `${fmt(x)} · 100 = ${fmt(v)}`, `${fmt(x)} ${big} = ${fmt(v)} ${small}`],
    bugs: [
      bug('flaeche-faktor', clean(x * 10), factorHint(big, small)),
      bug('komma-weg', Number(fmt(x).replace(',', '')), 'Prüfe die Zahl: Hat das Komma die richtige Stelle?'),
      bug('richtung', clean(x / 100), WAY_DOWN),
    ],
    praise: 'Du hast das Komma um zwei Stellen geschoben.',
  };
};

function s2CommaUp(big: string, small: string, v: number): Item {
  const x = clean(v / 100);
  return {
    key: `komma-hoch:${v}${small}`,
    prompt: 'Rechne um. Nutze ein Komma.',
    expression: `${v} ${small} = □ ${big}`,
    answer: answerIn(x, big),
    hints: [factorLine(big, small), 'Geteilt durch 100 schiebt das Komma um zwei Stellen nach links.'],
    steps: [{ text: factorLine(big, small), visual: unitTable(SQUARE_UNITS) }, `${v} : 100 = ${fmt(x)}`, `${v} ${small} = ${fmt(x)} ${big}`],
    bugs: [
      bug('flaeche-faktor', clean(v / 10), factorHint(big, small)),
      bug('komma-weg', Math.floor(v / 100), 'Der Rest gehört dazu: Schreib den Rest hinter das Komma.'),
    ],
    praise: 'Du hast den Rest hinter das Komma geschrieben.',
  };
}

/** Never a whole number: AB III always has a comma, or it is easier than Stufe 1 AB III. */
const oneDecimal = (rng: Rng) => clean(rng.int(1, 9) + rng.int(1, 9) / 10);
const commaNumber = (rng: Rng) => (rng.chance(0.5) ? oneDecimal(rng) : clean(rng.int(1, 9) + rng.int(11, 99) / 100));

const s2Hardest: Forms[2][3] = (rng, ctx) => {
  if (!isWide(ctx)) {
    const [big, mid, small] = rng.pick(TWO_STEP_PAIRS);
    const x = oneDecimal(rng);
    const v = clean(x * 10_000);
    return {
      key: `zwei-schritte-komma:${x}${big}`,
      prompt: 'Rechne in zwei Schritten um.',
      expression: `${fmt(x)} ${big} = □ ${small}`,
      answer: answerIn(v, small),
      hints: [`Der Weg geht über ${mid}.`, 'Jeder Schritt schiebt das Komma um zwei Stellen.'],
      steps: [`${fmt(x)} ${big} = ${fmt(clean(x * 100))} ${mid}`, `${fmt(clean(x * 100))} ${mid} = ${fmt(v)} ${small}`],
      bugs: [
        bug('ein-schritt', clean(x * 100), `Das ist erst ${mid}. Ein Schritt fehlt noch.`),
        bug('laengen-faktor', clean(x * 1000), 'Flächen haben von Stufe zu Stufe den Faktor 100.'),
      ],
      praise: 'Du hast zwei Schritte mit Komma sicher verbunden.',
    };
  }
  const kind = rng.pick(['ha-a', 'a-ha', 'ha-m2', 'a-m2', 'km2-ha', 'ha-km2'] as const);
  if (kind === 'km2-ha') {
    const x = commaNumber(rng);
    const v = clean(x * 100);
    return {
      key: `km2-ha:${x}`,
      prompt: 'Rechne um. Schiebe das Komma passend.',
      expression: `${fmt(x)} km² = □ ha`,
      answer: answerIn(v, 'ha'),
      hints: ['1 km² sind 100 ha.', 'Mal 100 schiebt das Komma um zwei Stellen nach rechts.'],
      steps: [`1 km² = 100 ha`, `${fmt(x)} · 100 = ${fmt(v)}`, `${fmt(x)} km² = ${fmt(v)} ha`],
      bugs: [bug('flaeche-faktor', clean(x * 10), 'Von km² zu ha ist der Faktor 100.'), bug('richtung', clean(x / 100), WAY_DOWN)],
      praise: 'Du hast km² richtig in Hektar umgerechnet.',
    };
  }
  if (kind === 'ha-km2') {
    const shown = rng.int(1, 9) * 100 + rng.int(1, 99);
    const x = clean(shown / 100);
    return {
      key: `ha-km2:${shown}`,
      prompt: 'Rechne um. Nutze ein Komma.',
      expression: `${shown} ha = □ km²`,
      answer: answerIn(x, 'km²'),
      hints: ['100 ha sind 1 km².', 'Geteilt durch 100 schiebt das Komma um zwei Stellen nach links.'],
      steps: [`100 ha = 1 km²`, `${shown} : 100 = ${fmt(x)}`, `${shown} ha = ${fmt(x)} km²`],
      bugs: [bug('flaeche-faktor', clean(shown / 10), 'Von ha zu km² ist der Faktor 100.'), bug('komma-weg', Math.floor(shown / 100), 'Der Rest gehört dazu: Schreib den Rest hinter das Komma.')],
      praise: 'Du hast Hektar richtig in km² umgerechnet.',
    };
  }
  if (kind === 'ha-a') {
    const x = commaNumber(rng);
    const v = clean(x * 100);
    return {
      key: `ha-a:${x}`,
      prompt: 'Rechne um. Schiebe das Komma passend.',
      expression: `${fmt(x)} ha = □ a`,
      answer: answerIn(v, 'a'),
      hints: ['1 ha sind 100 a.', 'Mal 100 schiebt das Komma um zwei Stellen nach rechts.'],
      steps: [`1 ha = 100 a`, `${fmt(x)} · 100 = ${fmt(v)}`, `${fmt(x)} ha = ${fmt(v)} a`],
      bugs: [bug('flaeche-faktor', clean(x * 10), 'Von ha zu a ist der Faktor 100.'), bug('richtung', clean(x / 100), WAY_DOWN)],
      praise: 'Du hast Hektar richtig in Ar umgerechnet.',
    };
  }
  if (kind === 'a-ha') {
    const shown = rng.int(1, 9) * 100 + rng.int(1, 99);
    const x = clean(shown / 100);
    return {
      key: `a-ha:${shown}`,
      prompt: 'Rechne um. Nutze ein Komma.',
      expression: `${shown} a = □ ha`,
      answer: answerIn(x, 'ha'),
      hints: ['100 a sind 1 ha.', 'Geteilt durch 100 schiebt das Komma um zwei Stellen nach links.'],
      steps: [`100 a = 1 ha`, `${shown} : 100 = ${fmt(x)}`, `${shown} a = ${fmt(x)} ha`],
      bugs: [bug('flaeche-faktor', clean(shown / 10), 'Von a zu ha ist der Faktor 100.'), bug('komma-weg', Math.floor(shown / 100), 'Der Rest gehört dazu: Schreib den Rest hinter das Komma.')],
      praise: 'Du hast Ar richtig in Hektar umgerechnet.',
    };
  }
  if (kind === 'ha-m2') {
    const x = oneDecimal(rng);
    const v = clean(x * 10_000);
    return {
      key: `ha-m2:${x}`,
      prompt: 'Rechne in zwei Schritten um: über a.',
      expression: `${fmt(x)} ha = □ m²`,
      answer: answerIn(v, 'm²'),
      hints: ['1 ha sind 100 a, und 1 a sind 100 m².', 'Rechne zweimal mal 100.'],
      steps: [`${fmt(x)} ha = ${fmt(clean(x * 100))} a`, `${fmt(clean(x * 100))} a = ${fmt(v)} m²`],
      bugs: [bug('ein-schritt', clean(x * 100), 'Das ist erst a. Ein Schritt fehlt noch.'), bug('laengen-faktor', clean(x * 1000), 'Flächen haben von Stufe zu Stufe den Faktor 100.')],
      praise: 'Du hast über Ar bis zu Quadratmetern gerechnet.',
    };
  }
  const x = commaNumber(rng);
  const v = clean(x * 100);
  return {
    key: `a-m2:${x}`,
    prompt: 'Ein Ar ist ein Quadrat mit 10 m Seite. Rechne um.',
    expression: `${fmt(x)} a = □ m²`,
    answer: answerIn(v, 'm²'),
    hints: ['Ein Ar: 10 m · 10 m.', 'Jedes Ar zählt also 100 Quadratmeter.'],
    steps: [`1 a = 10 m · 10 m = 100 m²`, `${fmt(x)} · 100 = ${fmt(v)}`, `${fmt(x)} a = ${fmt(v)} m²`],
    bugs: [bug('flaeche-faktor', clean(x * 10), 'Rechne 10 · 10: Ein Ar hat mehr als 10 m².')],
    praise: 'Du hast das Ar als Quadrat gesehen.',
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** One area in its own unit: value in the base unit, the text shown. */
interface Area {
  base: number;
  shown: string;
  raw: number;
}

function orderSet(rng: Rng, ctx: GenContext): { unit: string; areas: Area[] } {
  if (isWide(ctx) && rng.chance(0.25)) {
    const areas: Area[] = [
      (() => { const n = rng.int(2, 9); return { base: n * 100, shown: q(n, 'km²'), raw: n }; })(),
      (() => { const n = rng.int(12, 95) * 10; return { base: n, shown: q(n, 'ha'), raw: n }; })(),
      (() => { const n = rng.int(11, 95) * 1000; return { base: n / 100, shown: q(n, 'a'), raw: n }; })(),
      (() => { const n = rng.int(21, 89) * 10; return { base: n, shown: q(n, 'ha'), raw: n }; })(),
    ];
    return { unit: 'ha', areas };
  }
  if (isWide(ctx) && rng.chance(0.5)) {
    const areas = (): Area[] => [
      (() => { const n = rng.int(2, 9); return { base: n * 100, shown: q(n, 'a'), raw: n }; })(),
      (() => { const n = rng.int(12, 95) * 10; return { base: n, shown: q(n, 'm²'), raw: n }; })(),
      (() => { const n = rng.int(11, 95) * 1000; return { base: n / 100, shown: q(n, 'dm²'), raw: n }; })(),
      (() => { const n = rng.int(12, 90) * 10; return { base: n * 10, shown: q(n * 10, 'm²'), raw: n * 10 }; })(),
    ];
    return { unit: 'm²', areas: areas() };
  }
  const areas: Area[] = [
    (() => { const n = rng.int(2, 9); return { base: n * 10_000, shown: q(n, 'm²'), raw: n }; })(),
    (() => { const n = rng.int(12, 95) * 10; return { base: n * 100, shown: q(n, 'dm²'), raw: n }; })(),
    (() => { const n = rng.int(11, 95) * 1000; return { base: n, shown: q(n, 'cm²'), raw: n }; })(),
    (() => { const n = rng.int(21, 89) * 10; return { base: n * 100, shown: q(n, 'dm²'), raw: n }; })(),
  ];
  return { unit: 'cm²', areas };
}

const s3Order: Forms[3][1] = (rng, ctx) => {
  for (;;) {
    const { unit, areas } = orderSet(rng, ctx);
    if (new Set(areas.map((a) => a.base)).size < areas.length || new Set(areas.map((a) => a.raw)).size < areas.length) continue;
    const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
    const shown = rng.shuffle(areas);
    const sign = direction === 'aufsteigend' ? 1 : -1;
    const correct = shown.map((_, i) => i).sort((i, j) => sign * (shown[i].base - shown[j].base));
    const byNumber = shown.map((_, i) => i).sort((i, j) => sign * (shown[i].raw - shown[j].raw));
    if (correct.every((v, i) => v === byNumber[i]) || correct.every((v, i) => v === i)) continue;
    const answer: OrderAnswer = { kind: 'order', items: shown.map((a) => a.shown), correct, direction };
    const order = correct.map((i) => shown[i].shown);
    const changed = shown.filter((a) => a.shown !== q(a.base, unit)).map((a) => `${a.shown} = ${q(a.base, unit)}`);
    return {
      key: `ordnen:${[...shown].map((a) => a.shown.replace(/\s/g, '')).sort().join('|')}:${direction}`,
      prompt: `Ordne die Flächen ${direction === 'aufsteigend' ? 'von klein nach groß' : 'von groß nach klein'}.`,
      answer,
      hints: [`Rechne alle Flächen in ${unit} um.`, 'Die größte Zahl ist nicht immer die größte Fläche.'],
      steps: [{ text: `Rechne alle Flächen in ${unit} um.`, visual: { type: 'table', caption: `Alle Flächen in ${unit}`, header: ['Fläche', `In ${unit}`], rows: correct.map((i) => [shown[i].shown, q(shown[i].base, unit)]) } }, changed.slice(0, 2).join('; '), ...(changed.length > 2 ? [changed.slice(2).join('; ')] : []), `Die Reihenfolge: ${order.join(', ')}`],
      bugs: [bug('nach-zahl', byNumber, 'Schau auf die Einheit. Rechne alle Flächen in dieselbe Einheit um.')],
      praise: 'Du hast alles in dieselbe Einheit umgerechnet.',
    };
  }
};

/** Everyday areas with a fitting size, about as large as they are (docs/research.md §6: Klassenzimmer, Fußballfeld). */
const BENCHMARKS: readonly { what: string; article: string; size: number; unit: string; wrong: [number, string][]; wideOnly?: boolean }[] = [
  { what: 'Klassenzimmer', article: 'ein', size: 60, unit: 'm²', wrong: [[60, 'dm²'], [60, 'cm²'], [6000, 'm²']] },
  { what: 'Fußballfeld', article: 'ein', size: 7000, unit: 'm²', wrong: [[70, 'm²'], [7000, 'cm²'], [7000, 'dm²']] },
  { what: 'Fußballfeld', article: 'ein', size: 70, unit: 'a', wrong: [[70, 'm²'], [70, 'ha'], [70, 'km²']], wideOnly: true },
  { what: 'Schulhof', article: 'ein', size: 20, unit: 'a', wrong: [[20, 'm²'], [20, 'ha'], [20, 'dm²']], wideOnly: true },
  { what: 'Briefmarke', article: 'eine', size: 6, unit: 'cm²', wrong: [[6, 'mm²'], [6, 'dm²'], [6, 'm²']] },
  { what: 'Heftseite', article: 'eine', size: 6, unit: 'dm²', wrong: [[6, 'cm²'], [6, 'mm²'], [6, 'm²']] },
  { what: 'Tischplatte', article: 'eine', size: 1, unit: 'm²', wrong: [[1, 'dm²'], [1, 'cm²'], [100, 'm²']] },
  { what: 'Fingernagel', article: 'ein', size: 1, unit: 'cm²', wrong: [[1, 'mm²'], [1, 'dm²'], [1, 'm²']] },
];

const SQUARES_ON_IT = 'Stell dir vor: Wie viele solche Quadrate passen darauf?';

/** The picture for the hints must fit the object: no square of 1 m² lies on a Fingernagel, so small objects compare with the hand. */
function fittingHints(unit: string): string[] {
  if (unit === 'cm²') return ['Deine Handfläche ist etwa 1 dm² groß. Ist die Fläche viel kleiner?', '1 cm² hat 1 cm Seite. 1 mm² hat nur 1 mm Seite.'];
  if (unit === 'dm²') return ['Deine Handfläche ist etwa 1 dm² groß.', 'Wie viele Handflächen passen darauf?'];
  if (unit === 'a') return ['1 a ist ein Quadrat mit 10 m Seite.', SQUARES_ON_IT];
  return ['1 m² ist ein Quadrat mit 1 m Seite.', SQUARES_ON_IT];
}

const IN_M2: Record<string, number> = { 'cm²': 0.0001, 'dm²': 0.01, 'm²': 1, a: 100, ha: 10_000 };
type Sized = [n: number, unit: string];
const toM2 = ([n, unit]: Sized) => clean(n * IN_M2[unit]);

/** A benchmark and four areas: one is larger, and the others can carry the larger number. Everyday knowledge alone does not decide it. */
function comparison(rng: Rng, ctx: GenContext): { article: string; what: string; size: Sized; right: Sized; wrong: Sized[] } {
  const kind = rng.pick(isWide(ctx) ? (['zimmer', 'feld', 'feld-a'] as const) : (['zimmer', 'feld'] as const));
  if (kind === 'zimmer') {
    return { article: 'ein', what: 'Klassenzimmer', size: [60, 'm²'], right: [rng.int(7, 9) * 1000, 'dm²'], wrong: [[rng.int(2, 5) * 1000, 'dm²'], [rng.int(40, 58), 'm²'], [rng.int(10, 50) * 10_000, 'cm²']] };
  }
  if (kind === 'feld') {
    return { article: 'ein', what: 'Fußballfeld', size: [7000, 'm²'], right: [rng.int(8, 9) * 100_000, 'dm²'], wrong: [[rng.int(10, 60) * 10_000, 'dm²'], [rng.int(40, 65) * 100, 'm²'], [rng.int(20, 90) * 100_000, 'cm²']] };
  }
  return { article: 'ein', what: 'Fußballfeld', size: [70, 'a'], right: [rng.int(1, 2), 'ha'], wrong: [[rng.int(40, 65), 'a'], [rng.int(40, 65) * 100, 'm²'], [rng.int(10, 60) * 1000, 'dm²']] };
}

const s3Fitting: Forms[3][2] = (rng, ctx) => {
  if (rng.chance(0.5)) {
    const { article, what, size, right, wrong } = comparison(rng, ctx);
    const inM2 = q(toM2(size), 'm²');
    const label = ([n, unit]: Sized) => q(n, unit);
    const changed = [size, right, ...wrong].filter(([, unit]) => unit !== 'm²').map((s) => `${label(s)} = ${q(toM2(s), 'm²')}`);
    return {
      key: `vergleich:${what}:${size[1]}:${label(right).replace(/\s/g, '')}:${wrong.map((s) => label(s).replace(/\s/g, '')).join('|')}`,
      context: `${article === 'ein' ? 'Ein' : 'Eine'} ${what} ist etwa ${label(size)} groß.`,
      prompt: `Welche Fläche ist größer als ${article} ${what}?`,
      answer: makeChoice(rng, { label: label(right) }, wrong.map((s) => ({ label: label(s), whyWrong: `Rechne in m² um. Vergleiche dann mit ${inM2}.` }))),
      hints: ['Rechne alle Flächen in m² um.', 'Die größte Zahl ist nicht immer die größte Fläche.'],
      steps: ['Rechne alle Flächen in m² um.', changed.slice(0, 2).join('; '), ...(changed.length > 2 ? [changed.slice(2).join('; ')] : []), `Nur ${label(right)} ist größer als ${inM2}.`],
      praise: 'Du hast zuerst in dieselbe Einheit umgerechnet.',
      kmk: [...KMK, 'GM.schaetzen'],
    };
  }
  const b = rng.pick(BENCHMARKS.filter((x) => isWide(ctx) || (!x.wideOnly && x.unit !== 'a')));
  const right = q(b.size, b.unit);
  const options = b.wrong.filter(([, unit]) => isWide(ctx) || !['a', 'ha', 'km²'].includes(unit));
  return {
    key: `alltag:${b.what}:${b.unit}`,
    prompt: `Wie groß ist ${b.article} ${b.what} ungefähr?`,
    answer: makeChoice(rng, { label: right }, options.map(([n, unit]) => ({ label: q(n, unit), whyWrong: 'Stell dir ein Quadrat mit dieser Fläche vor. Passt das Quadrat?' }))),
    hints: fittingHints(b.unit),
    steps: [`${b.article === 'ein' ? 'Ein' : 'Eine'} ${b.what} ist ungefähr ${right} groß.`],
    praise: 'Du hast die Größe mit dem Alltag verglichen.',
    kmk: [...KMK, 'GM.schaetzen'],
  };
};

const s3HowOften: Forms[3][3] = (rng, ctx) => {
  const kind = rng.pick(isWide(ctx) ? (['fussball-m2', 'fussball-a', 'fliese'] as const) : (['fussball-m2', 'fliese'] as const));
  if (kind === 'fliese') {
    const tile = rng.pick([2, 4, 5]);
    const floor = rng.int(2, 15) * tile;
    const n = (floor * 100) / tile;
    return {
      key: `fliesen:${floor}m2-${tile}dm2`,
      context: `Ein Flur ist ${q(floor, 'm²')} groß. Eine Fliese ist ${q(tile, 'dm²')} groß.`,
      prompt: 'Wie viele Fliesen passen in den Flur?',
      answer: { ...answerIn(n, 'Fliesen') },
      hints: ['Rechne zuerst den Flur in dm² um.', 'Teile dann durch die Fläche einer Fliese.'],
      steps: [`${q(floor, 'm²')} = ${q(floor * 100, 'dm²')}`, `${floor * 100} : ${tile} = ${n}`, `Es passen ${n} Fliesen in den Flur.`],
      bugs: [
        bug('ohne-umrechnen', floor / tile, 'm² und dm² sind verschieden groß. Rechne zuerst um.'),
        bug('flaeche-faktor', (floor * 10) / tile, factorHint('m²', 'dm²')),
      ],
      praise: 'Du hast zuerst in dieselbe Einheit umgerechnet.',
      kmk: [...KMK, 'PK.modellieren'],
    };
  }
  const room = rng.pick([50, 70, 100, 140, 175]);
  const n = 7000 / room;
  const asA = kind === 'fussball-a';
  return {
    key: `fussballfeld:${asA ? 'a' : 'm2'}:${room}`,
    context: `Ein Fußballfeld ist etwa ${asA ? q(70, 'a') : q(7000, 'm²')} groß. Ein Raum ist ${q(room, 'm²')} groß.`,
    prompt: 'Wie oft passt der Raum auf das Fußballfeld?',
    answer: { ...answerIn(n, 'Räume') },
    hints: [asA ? 'Rechne zuerst das Feld in m² um.' : 'Beide Flächen stehen schon in m².', 'Teile die große Fläche durch die kleine.'],
    steps: [...(asA ? [`${q(70, 'a')} = ${q(7000, 'm²')}`] : []), `7000 : ${room} = ${n}`, `Der Raum passt ${n}-mal auf das Feld.`],
    bugs: [
      asA && bug('flaeche-faktor', 700 / room, 'Von a zu m² ist der Faktor 100.'),
      asA && bug('ohne-umrechnen', 70 / room, 'a und m² sind verschieden groß. Rechne zuerst um.'),
    ],
    praise: 'Du hast die beiden Flächen durch Teilen verglichen.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

const FORMS: Forms = {
  1: { 1: s1Down, 2: s1Up, 3: s1Mixed },
  2: { 1: s2TwoSteps, 2: s2Comma, 3: s2Hardest },
  3: { 1: s3Order, 2: s3Fitting, 3: s3HowOften },
};

const STUFEN: Record<Stufe, string> = {
  1: 'Benachbarte Einheiten: 1 m² = 100 dm²',
  2: 'Zwei Schritte, Kommazahlen, Ar, Hektar und km²',
  3: 'Flächen ordnen und mit dem Alltag vergleichen',
};

export const einheitenSkill: SkillDef = {
  ...SKILL,
  title: 'Flächeneinheiten',
  description: 'Du rechnest Flächeneinheiten um und stellst sie dir vor.',
  stufen: STUFEN,
  kmk: KMK,
  generate: generator(SKILL, KMK, FORMS),
};

