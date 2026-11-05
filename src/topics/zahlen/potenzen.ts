/**
 * zahlen.potenzen: Potenzen und Quadratzahlen. The Stufe chooses the content (S1 squares to 12², Basis and Exponent; S2 squares to 20², 2⁵, 3³; S3 doubling
 * stories and a negative Basis); AB varies the demand inside it. The minus key is active for the whole skill (§7.1), since Stufe 3 has a negative Basis,
 * so every field is signed. A profile with integers as states only gets a story with a start value instead (RangeDefaults.integersAsStates).
 */
import { BOX, TIMES, fmt, fmtSigned } from '../../core/format';
import type { Ab, Exercise, GenContext, Rng, SkillDef, Visual } from '../../core/types';
import { build, numberBugs, signedNumber, targetAb } from '../shared';
import { power, powerSaid } from './helpers';

const SKILL = { id: 'zahlen.potenzen', topicId: 'zahlen' } as const;
const KMK = ['ZO.potenzen'];

const factors = (base: number, exponent: number) => Array.from({ length: exponent }, () => fmtSigned(base)).join(` ${TIMES} `);
const dots = (n: number): Visual | undefined => (n <= 10 ? { type: 'dotArray', rows: n, cols: n } : undefined);

function powerTask(stufe: 1 | 2, ab: Ab, base: number, exponent: number): Exercise {
  const value = base ** exponent;
  const picture = exponent === 2 && stufe === 1 ? dots(base) : undefined;
  return build(SKILL, stufe, {
    key: `wert:${base}:${exponent}`,
    ab,
    prompt: exponent === 2 ? 'Berechne die Quadratzahl.' : 'Berechne die Potenz.',
    expression: `${power(base, exponent)} = ${BOX}`,
    ...(picture ? { visual: picture } : {}),
    answer: signedNumber(value, { label: 'Ergebnis' }),
    hints: [`Schreib die Potenz als Produkt: ${factors(base, exponent)}.`, 'Der Exponent zählt die Faktoren.'],
    steps: [`${power(base, exponent)} heißt ${factors(base, exponent)}.`, `${factors(base, exponent)} = ${fmt(value)}`],
    bugs: numberBugs([
      { id: 'potenz-mal', match: base * exponent, hint: `${power(base, exponent)} heißt ${factors(base, exponent)}, nicht ${base} ${TIMES} ${exponent}.` },
      { id: 'potenz-plus', match: base + exponent, hint: 'Der Exponent zählt die Faktoren. Du musst malnehmen, nicht addieren.' },
      base !== exponent && { id: 'basis-exponent', match: exponent ** base, hint: 'Die Basis ist der Faktor. Der Exponent zählt die Faktoren.' },
    ], value, true),
    praise: 'Du hast die Potenz als Produkt gerechnet.',
    srText: `Berechne ${powerSaid(base, exponent)}.`,
    kmk: KMK,
  });
}

function namePart(rng: Rng, ab: Ab): Exercise {
  const base = rng.int(2, 12);
  const exponent = rng.pick([2, 3, 4, 5].filter((e) => e !== base));
  const askBase = rng.chance(0.5);
  const value = askBase ? base : exponent;
  const other = askBase ? exponent : base;
  return build(SKILL, 1, {
    key: `name:${base}:${exponent}:${askBase ? 'b' : 'e'}`,
    ab,
    prompt: `Wie heißt ${askBase ? 'die Basis' : 'der Exponent'} dieser Potenz?`,
    expression: power(base, exponent),
    answer: signedNumber(value, { label: askBase ? 'Basis' : 'Exponent' }),
    hints: ['Die Basis ist die große Zahl unten.', 'Der Exponent ist die kleine Zahl oben.'],
    steps: [`In ${power(base, exponent)} ist ${base} die Basis.`, `Der Exponent ist ${exponent}.`, `Gesucht ist ${value}.`],
    bugs: numberBugs([
      { id: 'basis-exponent', match: other, hint: 'Die Basis ist die große Zahl unten. Der Exponent ist die kleine Zahl oben.' },
      { id: 'potenz-mal', match: base * exponent, hint: 'Hier rechnest du nicht. Gesucht ist nur ein Teil der Potenz.' },
    ], value, true),
    praise: 'Du hast Basis und Exponent unterschieden.',
    srText: `Die Potenz ${powerSaid(base, exponent)}. Wie heißt ${askBase ? 'die Basis' : 'der Exponent'}?`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

function squareRootBack(ab: Ab, stufe: 1 | 2, base: number): Exercise {
  const square = base * base;
  return build(SKILL, stufe, {
    key: `zurueck:${base}`,
    ab,
    // the field is signed, and the negative root also squares to this: the task says which one it means
    prompt: 'Welche Zahl größer als 0 gehört in die Lücke?',
    expression: `${BOX}² = ${fmt(square)}`,
    answer: signedNumber(base, { label: 'Basis' }),
    hints: ['Gesucht ist eine Zahl: Diese Zahl mal sich selbst ergibt das Ergebnis.', 'Probiere Zahlen aus und rechne nach.'],
    steps: [`${base} ${TIMES} ${base} = ${fmt(square)}`, `Also ${power(base, 2)} = ${fmt(square)}.`, `In die Lücke gehört ${base}.`],
    bugs: numberBugs([
      square % 2 === 0 && { id: 'potenz-mal', match: square / 2, hint: 'Gesucht ist nicht die Hälfte. Rechne die Zahl mal sich selbst.' },
      { id: 'wurzel-negativ', match: -base, hint: 'Zwei negative Faktoren ergeben auch dieses Quadrat. Gesucht ist hier die Zahl größer als 0.' },
    ], base, true),
    praise: 'Du hast die Quadratzahl rückwärts gefunden.',
    srText: `Lücke hoch 2 gleich ${square}. Welche Zahl größer als 0 gehört in die Lücke?`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function exponentBack(rng: Rng, ab: Ab): Exercise {
  const base = rng.pick([2, 3, 4, 5, 10]);
  const exponent = rng.int(3, base === 2 ? 8 : base === 3 ? 5 : 4);
  const value = base ** exponent;
  return build(SKILL, 2, {
    key: `exponent:${base}:${exponent}`,
    ab,
    prompt: 'Welcher Exponent gehört in die Lücke?',
    expression: `${base} hoch ${BOX} = ${fmt(value)}`,
    answer: signedNumber(exponent, { label: 'Exponent' }),
    hints: [`Multipliziere immer wieder mit ${base}.`, 'Zähle die Faktoren.'],
    steps: [`${factors(base, exponent)} = ${fmt(value)}`, `Das sind ${exponent} Faktoren.`, `Der Exponent ist ${exponent}.`],
    bugs: numberBugs([
      { id: 'potenz-mal', match: value / base, hint: `Der Exponent zählt die Faktoren. Gesucht ist nicht ${fmt(value)} : ${base}.` },
      { id: 'exponent-eins-weniger', match: exponent - 1, hint: 'Zähle auch den ersten Faktor mit.' },
    ], exponent, true),
    praise: 'Du hast die Faktoren der Potenz gezählt.',
    srText: `${base} hoch Lücke gleich ${value}. Welcher Exponent gehört in die Lücke?`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** The start of an algae story: 'liegt 1 Alge', 'liegen 5 Algen'. */
const algaeStart = (n: number) => `In einer Schale ${n === 1 ? 'liegt 1 Alge' : `liegen ${n} Algen`}. Jeden Tag verdoppelt sich die Zahl.`;

const DOUBLING: readonly { story: (start: number) => string; ask: (n: number) => string; unit: string }[] = [
  { story: () => 'Du faltest ein Blatt Papier immer wieder in der Mitte. Jedes Falten verdoppelt die Lagen.', ask: (n) => `Wie viele Lagen hast du nach ${n}-mal Falten?`, unit: 'Lagen' },
  { story: algaeStart, ask: (n) => `Wie viele Algen sind es nach ${n} Tagen?`, unit: 'Algen' },
  { story: (s) => `Ein Bild ist ${s} MB groß. Jede neue Fassung braucht doppelt so viel Speicherplatz wie die Fassung davor.`, ask: (n) => `Wie viele MB braucht die letzte von ${n} neuen Fassungen?`, unit: 'MB' },
];

function doublingStory(rng: Rng, ab: Ab, withStart: boolean): Exercise {
  const idx = rng.int(0, DOUBLING.length - 1);
  const d = DOUBLING[idx];
  const start = idx === 0 ? 1 : withStart ? rng.int(3, 7) : 1;
  const n = rng.int(4, 9);
  const value = start * 2 ** n;
  return build(SKILL, 3, {
    key: `verdoppeln:${idx}:${start}:${n}`,
    ab,
    context: d.story(start),
    prompt: d.ask(n),
    answer: signedNumber(value, { unit: d.unit, label: d.unit }),
    hints: ['Verdoppeln heißt: immer wieder mal 2.', `Schreib eine Potenz mit der Basis 2 und dem Exponenten ${n}.`],
    steps: [`${n}-mal verdoppeln heißt: ${n}-mal mal 2.`, `${power(2, n)} = ${fmt(2 ** n)}`, ...(start > 1 ? [`${start} ${TIMES} ${fmt(2 ** n)} = ${fmt(value)}`] : []), `Es sind ${fmt(value)} ${d.unit}.`],
    bugs: numberBugs([
      { id: 'verdoppeln-mal', match: start * 2 * n, hint: 'Verdoppeln heißt: jedes Mal das Doppelte vom letzten Wert.' },
      { id: 'verdoppeln-plus', match: start + 2 * n, hint: 'Verdoppeln heißt mal 2, nicht plus 2.' },
      { id: 'verdoppeln-schritt', match: start * 2 ** (n - 1), hint: 'Zähle noch einmal: Das erste Mal verdoppelt schon.' },
    ], value, true),
    praise: 'Du hast das Verdoppeln als Potenz erkannt.',
    srText: `${d.story(start)} ${d.ask(n)}`,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

function negativeBase(rng: Rng, ab: Ab): Exercise {
  const base = -rng.pick([2, 3, 4, 5, 10]);
  const exponent = base === -2 ? rng.int(2, 6) : rng.int(2, 3);
  const value = base ** exponent;
  const size = Math.abs(value);
  const shown = `(${fmt(base)})`;
  const negatives = exponent;
  return build(SKILL, 3, {
    key: `negativ:${base}:${exponent}`,
    ab,
    prompt: 'Berechne die Potenz.',
    expression: `${power(shown, exponent)} = ${BOX}`,
    answer: signedNumber(value, { label: 'Ergebnis' }),
    hints: [`Schreib aus: ${factors(base, exponent)}.`, 'Rechne Faktor für Faktor. Achte nach jedem Schritt auf das Vorzeichen.'],
    steps: [`${power(shown, exponent)} heißt ${factors(base, exponent)}.`, `Das sind ${negatives} negative Faktoren: ${negatives % 2 === 0 ? 'Das Ergebnis ist positiv.' : 'Das Ergebnis ist negativ.'}`, `Das Ergebnis ist ${fmt(value)}.`],
    bugs: numberBugs([
      { id: 'potenz-mal', match: base * exponent, hint: `${power(shown, exponent)} heißt ${factors(base, exponent)}, nicht ${shown} ${TIMES} ${exponent}.` },
      { id: 'vorzeichen-potenz', match: value < 0 ? size : -size, hint: 'Zähle die negativen Faktoren. Prüfe dann das Vorzeichen.' },
    ], value, true),
    praise: 'Du hast die negativen Faktoren gezählt.',
    srText: `Berechne minus ${Math.abs(base)} in Klammern hoch ${exponent}.`,
    kmk: [...KMK, 'ZO.ganze-rechnen'],
  });
}

/** After how many doublings is it more than the limit? */
function firstOver(rng: Rng, ab: Ab): Exercise {
  const start = rng.int(1, 9);
  const limit = rng.pick([100, 500, 1000, 5000, 10_000, 100_000]);
  let days = 0;
  while (start * 2 ** days <= limit) days++;
  const before = start * 2 ** (days - 1);
  const after = start * 2 ** days;
  return build(SKILL, 3, {
    key: `grenze:${start}:${limit}`,
    ab,
    context: algaeStart(start),
    prompt: `Nach wie vielen Tagen sind es erstmals mehr als ${fmt(limit)} Algen?`,
    answer: signedNumber(days, { unit: 'Tagen', label: 'Tage' }),
    hints: ['Verdopple Schritt für Schritt und zähle die Tage.', 'Prüfe am Ende: Liegt der Tag davor noch unter der Grenze?'],
    steps: [`Nach ${days - 1} Tagen: ${fmt(before)} Algen. Das ist noch nicht mehr.`, `Nach ${days} Tagen: ${fmt(after)} Algen.`, `Gesucht sind ${days} Tage.`],
    bugs: numberBugs([
      { id: 'verdoppeln-schritt', match: days - 1, hint: 'Prüfe diesen Tag: Sind es dort schon mehr Algen als die Grenze?' },
      { id: 'verdoppeln-schritt-2', match: days + 1, hint: 'Prüfe den Tag davor: Sind es dort schon mehr Algen als die Grenze?' },
    ], days, true),
    praise: 'Du hast die Verdopplungen bis zur Grenze gezählt.',
    srText: `${algaeStart(start)} Nach wie vielen Tagen sind es erstmals mehr als ${limit} Algen?`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function stufe3(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  if (ab === 1) return doublingStory(rng, ab, false);
  if (ab === 2) return ctx.ranges.integersAsStates ? doublingStory(rng, ab, true) : negativeBase(rng, ab);
  return firstOver(rng, ab);
}

export const potenzenSkill: SkillDef = {
  ...SKILL,
  keys: { minus: true },
  title: 'Potenzen und Quadratzahlen',
  description: 'Du rechnest Potenzen und kennst die Quadratzahlen bis 400.',
  stufen: {
    1: 'Quadratzahlen bis 12²; Basis und Exponent benennen',
    2: 'Quadratzahlen bis 20²; Potenzen wie 2⁵ und 3³',
    3: 'Verdoppeln in Sachaufgaben; negative Basis',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) return powerTask(1, ab, rng.int(2, 10), 2);
      if (ab === 2) return rng.chance(0.3) ? powerTask(1, ab, rng.int(11, 12), 2) : namePart(rng, ab);
      return squareRootBack(ab, 1, rng.int(3, 12));
    }
    if (stufe === 2) {
      if (ab === 1) return powerTask(2, ab, rng.int(13, 20), 2);
      if (ab === 2) {
        const [base, exponent] = rng.pick<[number, number]>([[2, 5], [2, 6], [2, 7], [3, 3], [3, 4], [4, 3], [5, 3], [5, 4], [10, 4], [2, 8]]);
        return powerTask(2, ab, base, exponent);
      }
      return rng.chance(0.5) ? exponentBack(rng, ab) : squareRootBack(ab, 2, rng.int(13, 20));
    }
    return stufe3(rng, ab, ctx);
  },
};
