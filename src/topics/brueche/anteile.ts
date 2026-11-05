/**
 * Anteile erkennen: the shaded part as a fraction, and the idea behind it (equal parts, the whole).
 * Stufe 1 (bar or circle, Nenner ≤ 8): AB I write the fraction, AB II find the picture, AB III the part without colour.
 * Stufe 2 (Nenner ≤ 12, other shapes): AB I write the fraction, AB II the same fraction in another shape, AB III the picture that differs.
 * Stufe 3 (unequal parts, whole from part): AB I is it a Viertel?, AB II the whole from a Stammbruch, AB III the whole from any fraction.
 */
import { fractionWords, frac } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, Rng, SkillDef, Stufe, Visual, VisualOf } from '../../core/types';
import { build, makeChoice, safeHints, speak } from '../shared';
import { byStufeAndAb, gcd, pictureChoice, typedBugs, valueBugs, type Form } from './helpers';

const SKILL = { id: 'brueche.anteile', topicId: 'brueche' } as const;
const KMK = ['ZO.brueche', 'PK.darstellen'];

type Model = VisualOf<'fractionModel'>;
type Shape = Model['form'];

const model = (form: Shape, parts: number, filled: number): Model => ({ type: 'fractionModel', form, parts, filled });
const shapeWord: Record<Shape, string> = { bar: 'Streifen', circle: 'Kreis', rect: 'Rechteck' };

/** The name of one part, as a child reads it: 'Viertel'. */
const partName = (d: number) => fractionWords(1, d).replace(/^ein /, '');

function partsAndFilled(rng: Rng, denominators: readonly number[]): [n: number, d: number] {
  const d = rng.pick(denominators);
  return [rng.int(1, d - 1), d];
}

/** Write the shaded part as a fraction. */
function readShaded(denominators: readonly number[], shapes: readonly Shape[]): Form {
  return (rng, stufe, ab) => {
    const [n, d] = partsAndFilled(rng, denominators);
    const form = rng.pick(shapes);
    const correct = { numerator: n, denominator: d };
    const prompt = 'Welcher Bruchteil ist gefärbt?';
    return build(SKILL, stufe, {
      key: `lesen:${form}:${n}/${d}`,
      ab,
      prompt,
      visual: model(form, d, n),
      answer: { kind: 'fraction', ...correct, accept: 'equivalent' },
      hints: ['Zähle alle Teile. Das ist der Nenner.', 'Zähle die gefärbten Teile. Das ist der Zähler.'],
      steps: [`Das Ganze hat ${d} gleich große Teile. Der Nenner ist ${d}.`, `Davon ${n === 1 ? 'ist' : 'sind'} ${n} gefärbt. Der Zähler ist ${n}.`, `Gefärbt ${n === 1 ? 'ist' : 'sind'} ${frac(n, d)}.`],
      bugs: valueBugs([
        { id: 'anteil-rest', match: { numerator: n, denominator: d - n }, hint: 'Der Nenner zählt alle Teile, auch die gefärbten.' },
        { id: 'vertauscht', match: { numerator: d, denominator: n }, hint: 'Der Zähler steht oben. Der Nenner unten zählt alle Teile.' },
        { id: 'ungefaerbt', match: { numerator: d - n, denominator: d }, hint: 'Das sind die Teile ohne Farbe. Zähle die gefärbten Teile.' },
      ], correct),
      praise: 'Du hast für den Nenner alle Teile gezählt.',
      srText: speak(`${prompt} Das Bild zeigt einen ${shapeWord[form]} mit ${d} gleich großen Teilen, ${n} sind gefärbt.`),
      kmk: KMK,
    });
  };
}

/** Stufe 1, AB II: the fraction is given, the picture is sought. */
const findPicture: Form = (rng, stufe, ab) => {
  const [n, d] = partsAndFilled(rng, [3, 4, 5, 6, 8]);
  const form = rng.pick(['bar', 'circle'] as const);
  const wrong: { visual: Visual; whyWrong: string }[] = [
    { visual: model(form, d, d - n), whyWrong: 'Der Zähler zählt die gefärbten Teile. Zähle noch einmal.' },
    { visual: model(form, d, n === d - 1 ? n - 1 : n + 1), whyWrong: `Zähle die gefärbten Teile. Es müssen ${n} sein.` },
    { visual: model(form, d + 2 <= 8 ? d + 2 : d - 1, n), whyWrong: `Zähle alle Teile. Es müssen ${d} sein.` },
    { visual: model(form, n + d <= 12 ? n + d : d + 1, n), whyWrong: `Zähle alle Teile. Der Nenner sagt: ${d} Teile.` },
  ];
  const answer = pictureChoice(rng, model(form, d, n), wrong);
  const prompt = `Welches Bild zeigt ${frac(n, d)}?`;
  return build(SKILL, stufe, {
    key: `bild:${form}:${n}/${d}`,
    ab,
    prompt,
    answer,
    hints: [`Der Nenner sagt: Es gibt ${d} gleich große Teile.`, `Der Zähler sagt: ${n} davon sind gefärbt.`],
    steps: [`${frac(n, d)} heißt: ${d} gleich große Teile, ${n} davon gefärbt.`, { text: `So sieht ${frac(n, d)} aus.`, visual: model(form, d, n) }],
    praise: 'Du hast Zähler und Nenner im Bild gesucht.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** Stufe 1, AB III: the part that is not shaded. */
const readEmpty: Form = (rng, stufe, ab) => {
  const [n, d] = partsAndFilled(rng, [3, 4, 5, 6, 8]);
  const form = rng.pick(['bar', 'circle'] as const);
  const empty = d - n;
  const correct = { numerator: empty, denominator: d };
  const prompt = 'Welcher Bruchteil ist nicht gefärbt?';
  return build(SKILL, stufe, {
    key: `leer:${form}:${n}/${d}`,
    ab,
    prompt,
    visual: model(form, d, n),
    answer: { kind: 'fraction', ...correct, accept: 'equivalent' },
    hints: ['Zähle die Teile ohne Farbe. Das ist der Zähler.', 'Der Nenner zählt weiter alle Teile.'],
    steps: [`Das Ganze hat ${d} gleich große Teile.`, `Ohne Farbe: ${d} − ${n} = ${empty}`, `Ohne Farbe ${empty === 1 ? 'ist' : 'sind'} ${frac(empty, d)}.`],
    bugs: valueBugs([
      { id: 'gefaerbt', match: { numerator: n, denominator: d }, hint: 'Das ist der gefärbte Teil. Gefragt ist der Teil ohne Farbe.' },
      { id: 'anteil-rest', match: { numerator: empty, denominator: n }, hint: 'Der Nenner zählt alle Teile, auch die gefärbten.' },
    ], correct),
    praise: 'Du hast die Teile ohne Farbe gezählt.',
    srText: speak(`${prompt} Das Bild zeigt einen ${shapeWord[form]} mit ${d} gleich großen Teilen, ${n} sind gefärbt.`),
    kmk: KMK,
  });
};

/** Fractions that can be drawn with finer parts and stay at Nenner ≤ 12. */
const SHAPE_BASES: readonly (readonly [n: number, d: number])[] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 6], [5, 6]];

function refinements(d: number): number[] {
  return [1, 2, 3, 4, 6].filter((k) => d * k <= 12);
}

/** Stufe 2, AB II: the same fraction in another shape. */
const sameInOtherShape: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(SHAPE_BASES);
  const k = rng.pick(refinements(d).filter((x) => x > 1));
  const form = rng.pick(['circle', 'rect'] as const);
  const shown = model('bar', d, n);
  const fine = n * k;
  const parts = d * k;
  const wrong: { visual: Visual; whyWrong: string }[] = [
    { visual: model(form, parts, fine + 1 < parts ? fine + 1 : fine - 1), whyWrong: `Vergleiche die gefärbte Fläche. Hier ist es nicht genauso viel wie ${frac(n, d)}.` },
    { visual: model(form, parts, n), whyWrong: 'Hier sind gleich viele Teile gefärbt, aber die Teile sind kleiner.' },
    { visual: model(form, d, d - n === n ? (n > 1 ? n - 1 : n + 1) : d - n), whyWrong: 'Hier stimmt die Zahl der Teile, aber nicht der gefärbte Teil.' },
  ];
  const answer = pictureChoice(rng, model(form, parts, fine), wrong);
  const prompt = 'Welches Bild zeigt denselben Bruchteil wie der Streifen?';
  return build(SKILL, stufe, {
    key: `form:${form}:${n}/${d}:${k}`,
    ab,
    prompt,
    visual: shown,
    answer,
    hints: ['Lies zuerst den Bruch am Streifen ab.', 'Teile können kleiner sein. Die gefärbte Fläche zählt.'],
    steps: [`Der Streifen zeigt ${frac(n, d)}.`, `Gleich viel ist ${frac(fine, parts)}: ${n} · ${k} = ${fine} und ${d} · ${k} = ${parts}.`, { text: `Das Bild mit ${frac(fine, parts)} passt.`, visual: model(form, parts, fine) }],
    praise: 'Du hast auf die gefärbte Fläche geschaut.',
    srText: speak(`${prompt} Der Streifen hat ${d} gleich große Teile, ${n} sind gefärbt.`),
    kmk: KMK,
  });
};

/** Stufe 2, AB III: three pictures show one fraction, the fourth differs. */
const oddPicture: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(SHAPE_BASES);
  const shapes = rng.shuffle(['bar', 'circle', 'rect'] as const);
  const factors = rng.sample(refinements(d), Math.min(3, refinements(d).length));
  while (factors.length < 3) factors.push(factors[0]);
  const same = factors.map((k, i) => model(shapes[i], d * k, n * k));
  const k = Math.max(...factors);
  const oddFilled = n * k + 1 < d * k ? n * k + 1 : n * k - 1;
  const odd = model(rng.pick(shapes), d * k, oddFilled);
  const answer = pictureChoice(rng, odd, same.map((visual) => ({ visual, whyWrong: `Dieses Bild zeigt ${frac(n, d)}. Zwei andere Bilder zeigen denselben Wert.` })));
  const prompt = 'Drei Bilder zeigen denselben Bruchteil. Welches Bild zeigt einen anderen Bruchteil?';
  return build(SKILL, stufe, {
    key: `anders:${n}/${d}:${[...factors].sort((x, y) => x - y).join('-')}:${oddFilled}:${odd.form}`,
    ab,
    prompt,
    answer,
    hints: ['Schreibe zu jedem Bild den Bruch auf.', 'Prüfe: Lassen sich die Brüche kürzen? Vergleiche dann.'],
    steps: [`Drei Bilder zeigen den Wert ${frac(n, d)}.`, { text: `Dieses Bild zeigt ${frac(oddFilled, d * k)}.`, visual: odd }, `${frac(oddFilled, d * k)} ist nicht gleich ${frac(n, d)}.`],
    praise: 'Du hast zu jedem Bild den Bruch geprüft.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

/** Stufe 3, AB I: equal or unequal parts. Is the shaded part a Viertel? */
const equalParts: Form = (rng, stufe, ab) => {
  const d = rng.pick([3, 4, 5, 6, 8]);
  const form = rng.pick(['bar', 'rect'] as const);
  const unequal = rng.chance(0.6);
  const name = partName(d);
  const visual: Model = { ...model(form, d, 1), ...(unequal ? { unequal: true } : {}) };
  const prompt = `Ein Teil ist gefärbt. Ist das ${frac(1, d)} vom ${shapeWord[form]}?`;
  const rule = `${name} heißt: ${d} gleich große Teile.`;
  const yes = 'Ja, alle Teile sind gleich groß.';
  const no = 'Nein, die Teile sind nicht gleich groß.';
  const trap: ChoiceOption = unequal ? { label: `Ja, es sind ${d} Teile.`, whyWrong: rule } : { label: `Nein, es sind zu viele Teile.`, whyWrong: `Zähle die Teile. Es sind genau ${d} Teile.` };
  const answer = makeChoice(rng, { label: unequal ? no : yes }, [{ label: unequal ? yes : no, whyWrong: unequal ? 'Vergleiche die Breite der Teile.' : 'Vergleiche die Teile. Alle sind gleich breit.' }, trap]);
  return build(SKILL, stufe, {
    key: `gleich:${form}:${d}:${unequal ? 'u' : 'g'}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Zähle nicht nur die Teile. Vergleiche auch ihre Größe.', `${frac(1, d)} heißt: eines von ${d} gleich großen Teilen.`],
    steps: [rule, unequal ? 'Im Bild sind die Teile verschieden groß.' : 'Im Bild sind alle Teile gleich groß.', unequal ? `Der Teil mit Farbe ist also nicht ${frac(1, d)}.` : `Der Teil mit Farbe ist also ${frac(1, d)}.`],
    praise: 'Du hast die Größe der Teile geprüft.',
    srText: speak(`${prompt} Das Bild zeigt einen ${shapeWord[form]} mit ${d} ${unequal ? 'ungleich' : 'gleich'} großen Teilen, ein Teil ist gefärbt.`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

function wholeBugs(shown: number, n: number, d: number, whole: number): Bug[] {
  const onePart = shown / n;
  return typedBugs([
    { id: 'ganzes-plus', match: shown + d, hint: `Das Ganze besteht aus ${d} gleich großen Teilen. Addiere nicht den Nenner.` },
    n > 1 && { id: 'ganzes-mal-nenner', match: shown * d, hint: `Das Bild zeigt schon ${n} Teile. Wie viele Kästchen hat ein Teil?` },
    n > 1 && { id: 'ganzes-einteil', match: onePart, hint: `Das ist ein Teil. Das Ganze hat ${d} solche Teile.` },
    n === 1 && shown % d === 0 && { id: 'ganzes-teilen', match: shown / d, hint: 'Das Bild zeigt nur einen Teil. Das Ganze ist größer.' },
  ], whole);
}

/** Stufe 3, AB II and III: from the shown part to the whole. */
function wholeFromPart(stufe: Stufe, ab: Ab, n: number, d: number, perPart: number): Exercise {
  const shown = n * perPart;
  const whole = d * perPart;
  const prompt = `Das Bild zeigt ${frac(n, d)} vom Ganzen. Wie viele Kästchen hat das Ganze?`;
  const picture = model('rect', whole, shown);
  return build(SKILL, stufe, {
    key: `ganzes:${n}/${d}:${perPart}`,
    ab,
    prompt,
    visual: model('rect', shown, shown),
    answer: { kind: 'number', value: whole, unit: 'Kästchen', label: 'Kästchen im Ganzen' },
    hints: safeHints(n === 1 ? [`Das Ganze hat ${d} solche Teile.`, `Rechne ${d}-mal die ${shown} Kästchen.`] : [`Das Bild zeigt ${n} Teile. Wie viele Kästchen hat ein Teil?`, `Das Ganze hat ${d} Teile.`], whole, 'Überlege: Wie viele solche Teile hat das Ganze?'),
    steps: [
      n === 1 ? `Ein Teil hat ${perPart} Kästchen.` : `${n} Teile haben ${shown} Kästchen. Also: ${shown} : ${n} = ${perPart}.`,
      { text: `Das Ganze hat ${d} Teile: ${d} · ${perPart} = ${whole}.`, ...(whole <= 24 ? { visual: picture } : {}) },
      `Das Ganze hat ${whole} Kästchen.`,
    ],
    bugs: wholeBugs(shown, n, d, whole),
    praise: n === 1 ? 'Du hast vom Teil auf das Ganze geschlossen.' : 'Du hast zuerst einen einzelnen Teil bestimmt.',
    srText: speak(`${prompt} Das Bild zeigt ${shown} Kästchen.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

const wholeFromStamm: Form = (rng, stufe, ab) => {
  const d = rng.pick([2, 3, 4, 5, 6]);
  return wholeFromPart(stufe, ab, 1, d, rng.int(2, Math.floor(24 / d)));
};

const wholeFromAny: Form = (rng, stufe, ab) => {
  const d = rng.pick([3, 4, 5, 6, 8]);
  const n = rng.pick(Array.from({ length: d - 2 }, (_, i) => i + 2).filter((x) => gcd(x, d) === 1));
  return wholeFromPart(stufe, ab, n, d, rng.int(2, Math.floor(24 / d)));
};

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: {
    1: [readShaded([2, 3, 4, 5, 6, 8], ['bar', 'circle'])],
    2: [findPicture],
    3: [readEmpty],
  },
  2: {
    1: [readShaded([9, 10, 12], ['bar', 'circle', 'rect'])],
    2: [sameInOtherShape],
    3: [oddPicture],
  },
  3: {
    1: [equalParts],
    2: [wholeFromStamm],
    3: [wholeFromAny],
  },
};

export const anteileSkill: SkillDef = {
  ...SKILL,
  title: 'Anteile erkennen',
  description: 'Du siehst, welcher Bruchteil gefärbt ist, und schreibst den Bruch.',
  stufen: { 1: 'Gefärbter Teil von Streifen oder Kreis, Nenner bis 8', 2: 'Nenner bis 12, derselbe Bruch in anderen Formen', 3: 'Ungleiche Teile prüfen, das Ganze aus einem Teil' },
  kmk: KMK,
  generate: byStufeAndAb(FORMS),
};
