/**
 * Erweitern und Kürzen: the division changes, the value stays.
 * Stufe 1 (Erweitern with a given factor, the picture refines): AB I erweitern, AB II read the refined picture, AB III find the factor.
 * Stufe 2 (Kürzen with a given factor, missing Zähler or Nenner): AB I kürzen, AB II a given Nenner or Zähler, AB III find the factor, or harder numbers.
 * Stufe 3 (vollständig kürzen, equal fractions): AB I kürzen as far as it goes, AB II find the equal fraction, AB III harder numbers, or the odd one out.
 */
import { frac } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Rng, SkillDef, Stufe } from '../../core/types';
import { build, fractionBugs, makeChoice, safeHints, speak } from '../shared';
import { byStufeAndAb, lowest, typedBugs, valueBugs, type Form, type Frac } from './helpers';

const SKILL = { id: 'brueche.erweitern', topicId: 'brueche' } as const;
const KMK = ['ZO.brueche'];

const BASES: readonly Frac[] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6], [3, 8], [5, 8], [7, 8]];

const multiplyBugs = (n: number, d: number, k: number): Bug[] => fractionBugs([
  { id: 'erweitern-plus', match: { numerator: n + k, denominator: d + k }, hint: 'Multipliziere Zähler und Nenner mit derselben Zahl. Addiere nicht.' },
  { id: 'nur-zaehler', match: { numerator: n * k, denominator: d }, hint: 'Erweitere auch den Nenner, nicht nur den Zähler.' },
  { id: 'nur-nenner', match: { numerator: n, denominator: d * k }, hint: 'Erweitere auch den Zähler, nicht nur den Nenner.' },
], { numerator: n * k, denominator: d * k });

const divideBugs = (n: number, d: number, k: number): Bug[] => fractionBugs([
  { id: 'kuerzen-eins', match: { numerator: n / k, denominator: d }, hint: 'Teile Zähler und Nenner durch dieselbe Zahl.' },
  { id: 'kuerzen-eins', match: { numerator: n, denominator: d / k }, hint: 'Teile auch den Zähler, nicht nur den Nenner.' },
  { id: 'kuerzen-minus', match: { numerator: n - k, denominator: d - k }, hint: 'Kürzen heißt teilen. Zieh die Zahl nicht ab.' },
], { numerator: n / k, denominator: d / k });

/** Stufe 1, AB I. */
const extendPlain: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(BASES);
  const k = rng.int(2, 6);
  const prompt = `Erweitere ${frac(n, d)} mit ${k}.`;
  return build(SKILL, stufe, {
    key: `erw:${n}/${d}:${k}`,
    ab,
    prompt,
    answer: { kind: 'fraction', numerator: n * k, denominator: d * k, accept: 'exact' },
    hints: [`Multipliziere den Zähler mit ${k}.`, `Multipliziere auch den Nenner mit ${k}.`],
    steps: [`Zähler: ${n} · ${k} = ${n * k}`, `Nenner: ${d} · ${k} = ${d * k}`, `${frac(n, d)} = ${frac(n * k, d * k)}`],
    bugs: multiplyBugs(n, d, k),
    praise: 'Du hast Zähler und Nenner mit derselben Zahl multipliziert.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** Stufe 1, AB II: the finer lines of the picture show the erweiterter Bruch. */
const refinedPicture: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(BASES.filter(([, x]) => x <= 6));
  const k = rng.pick([2, 3, 4].filter((x) => d * x <= 24));
  const form = rng.pick(['bar', 'rect'] as const);
  const prompt = `Das Bild zeigt ${frac(n, d)}. Die feinen Linien teilen jeden Teil in ${k} Stücke. Welcher Bruch passt zu den Stücken?`;
  return build(SKILL, stufe, {
    key: `bild:${form}:${n}/${d}:${k}`,
    ab,
    prompt,
    visual: { type: 'fractionModel', form, parts: d, filled: n, refineTo: d * k },
    answer: { kind: 'fraction', numerator: n * k, denominator: d * k, accept: 'exact' },
    hints: ['Zähle alle kleinen Stücke. Das ist der neue Nenner.', 'Zähle die gefärbten Stücke. Das ist der neue Zähler.'],
    steps: [`Jeder Teil hat ${k} Stücke. Also: ${d} · ${k} = ${d * k} Stücke im Ganzen.`, `Gefärbt: ${n} · ${k} = ${n * k} Stücke.`, `${frac(n, d)} = ${frac(n * k, d * k)}. Die Fläche bleibt gleich.`],
    bugs: multiplyBugs(n, d, k),
    praise: 'Du hast die feinere Einteilung im Bild abgezählt.',
    srText: speak(`${prompt} Das Bild hat ${d} Teile, ${n} sind gefärbt.`),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

/** Find the factor between a fraction and its erweiterte form. */
function findFactor(pick: (rng: Rng) => { n: number; d: number; k: number }, down: boolean): Form {
  return (rng, stufe, ab) => {
    const { n, d, k } = pick(rng);
    const [from, to] = down ? [frac(n * k, d * k), frac(n, d)] : [frac(n, d), frac(n * k, d * k)];
    const verb = down ? 'gekürzt' : 'erweitert';
    const prompt = `Mit welcher Zahl ist der Bruch ${verb}?`;
    // with Zähler 1 the calculation would state the answer (1 · ? = 7), so the hint goes by the Nenner
    const part = n === 1 ? d : n;
    return build(SKILL, stufe, {
      key: `faktor:${down ? 'k' : 'e'}:${n}/${d}:${k}`,
      ab,
      prompt,
      expression: `${from} = ${to}`,
      answer: { kind: 'number', value: k, label: down ? 'Zahl zum Kürzen' : 'Zahl zum Erweitern' },
      hints: safeHints([down ? `Rechne: ${part * k} : ${part} = ?` : `Rechne: ${part} · ? = ${part * k}`, `Prüfe die Zahl auch am ${n === 1 ? 'Zähler' : 'Nenner'}.`], k, 'Vergleiche Nenner und Nenner.'),
      steps: [down ? `Zähler: ${n * k} : ${k} = ${n}` : `Zähler: ${n} · ${k} = ${n * k}`, down ? `Nenner: ${d * k} : ${k} = ${d}` : `Nenner: ${d} · ${k} = ${d * k}`, `Die Zahl ist ${k}.`],
      bugs: typedBugs([{ id: 'erweitern-plus', match: n * k - n, hint: down ? 'Kürzen heißt teilen, nicht abziehen.' : 'Erweitern heißt multiplizieren, nicht addieren.' }], k),
      praise: 'Du hast die Zahl an Zähler und Nenner geprüft.',
      srText: speak(`${prompt} ${from} gleich ${to}.`),
      kmk: KMK,
    });
  };
}

/** Kürzen with a given factor. */
function reduceGiven(factors: readonly number[], bases: readonly Frac[]): Form {
  return (rng, stufe, ab) => {
    const [n0, d0] = rng.pick(bases);
    const k = rng.pick(factors);
    const n = n0 * k;
    const d = d0 * k;
    const prompt = `Kürze ${frac(n, d)} mit ${k}.`;
    return build(SKILL, stufe, {
      key: `kuerzen:${n}/${d}:${k}`,
      ab,
      prompt,
      answer: { kind: 'fraction', numerator: n0, denominator: d0, accept: 'exact' },
      hints: [`Teile den Zähler durch ${k}.`, `Teile auch den Nenner durch ${k}.`],
      steps: [`Zähler: ${n} : ${k} = ${n0}`, `Nenner: ${d} : ${k} = ${d0}`, `${frac(n, d)} = ${frac(n0, d0)}`],
      bugs: divideBugs(n, d, k),
      praise: 'Du hast Zähler und Nenner durch dieselbe Zahl geteilt.',
      srText: speak(prompt),
      kmk: KMK,
    });
  };
}

/** Stufe 2, AB II: a given Nenner or Zähler; the missing part follows. */
const missingPart: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(BASES);
  const k = rng.int(2, 8);
  const kind = rng.pick(['nenner-auf', 'zaehler-auf', 'nenner-ab'] as const);
  const [from, target]: [Frac, Frac] = kind === 'nenner-ab' ? [[n * k, d * k], [n, d]] : [[n, d], [n * k, d * k]];
  const prompt = kind === 'zaehler-auf'
    ? `Schreibe ${frac(from[0], from[1])} als Bruch mit dem Zähler ${target[0]}.`
    : `Schreibe ${frac(from[0], from[1])} als Bruch mit dem Nenner ${target[1]}.`;
  const given = kind === 'zaehler-auf' ? [from[0], target[0]] : [from[1], target[1]];
  const factor = kind === 'nenner-ab' ? `${given[0]} : ${k} = ${given[1]}` : `${given[0]} · ${k} = ${given[1]}`;
  const other = kind === 'nenner-ab' ? `${from[0]} : ${k} = ${target[0]}` : kind === 'zaehler-auf' ? `${from[1]} · ${k} = ${target[1]}` : `${from[0]} · ${k} = ${target[0]}`;
  const gap = Math.abs(target[1] - from[1]);
  const gapN = Math.abs(target[0] - from[0]);
  return build(SKILL, stufe, {
    key: `luecke:${kind}:${n}/${d}:${k}`,
    ab,
    prompt,
    answer: { kind: 'fraction', numerator: target[0], denominator: target[1], accept: 'exact' },
    hints: [`Welche Zahl macht aus ${given[0]} die ${given[1]}?`, 'Rechne mit Zähler und Nenner dasselbe.'],
    steps: [factor, other, `${frac(from[0], from[1])} = ${frac(target[0], target[1])}`],
    bugs: fractionBugs([
      kind === 'nenner-auf' && { id: 'erweitern-plus', match: { numerator: n + gap, denominator: target[1] }, hint: 'Multipliziere Zähler und Nenner mit derselben Zahl. Addiere nicht.' },
      kind === 'zaehler-auf' && { id: 'erweitern-plus', match: { numerator: target[0], denominator: d + gapN }, hint: 'Multipliziere Zähler und Nenner mit derselben Zahl. Addiere nicht.' },
      kind === 'nenner-ab' && from[0] > gap && { id: 'kuerzen-minus', match: { numerator: from[0] - gap, denominator: target[1] }, hint: 'Teile Zähler und Nenner durch dieselbe Zahl. Zieh nicht ab.' },
    ], { numerator: target[0], denominator: target[1] }),
    praise: 'Du hast die Zahl gefunden und beide Teile verändert.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** Kürzen step by step with the smallest common Teiler, as the hints say: the ggT is no term of this skill (it belongs to zahlen.primfaktoren). */
function reductionLines(n: number, d: number): string[] {
  const lines: string[] = [];
  let [x, y] = [n, d];
  for (let p = 2; p <= x; p++) {
    while (x % p === 0 && y % p === 0) {
      lines.push(`Kürze mit ${p}: ${frac(x, y)} = ${frac(x / p, y / p)}`);
      x /= p;
      y /= p;
    }
  }
  return lines;
}

/** Vollständig kürzen; the lowest form is the only one accepted. */
function reduceFully(values: (rng: Rng) => { n: number; d: number }): Form {
  return (rng, stufe, ab) => {
    const { n, d } = values(rng);
    const [a, b] = lowest([n, d]);
    const prompt = `Kürze ${frac(n, d)} vollständig.`;
    const correct = { numerator: a, denominator: b };
    return build(SKILL, stufe, {
      key: `voll:${n}/${d}`,
      ab,
      prompt,
      answer: { kind: 'fraction', ...correct, accept: 'lowest' },
      hints: ['Suche einen gemeinsamen Teiler von Zähler und Nenner.', 'Kürze mit diesem Teiler. Gibt es danach noch einen?'],
      steps: [...reductionLines(n, d), `${a} und ${b} haben keinen gemeinsamen Teiler mehr.`],
      bugs: valueBugs([
        { id: 'kuerzen-eins', match: { numerator: a, denominator: d }, hint: 'Teile Zähler und Nenner durch dieselbe Zahl.' },
        { id: 'kuerzen-eins', match: { numerator: n, denominator: b }, hint: 'Teile auch den Zähler, nicht nur den Nenner.' },
      ], correct),
      praise: 'Du hast gekürzt, bis keine gemeinsame Zahl mehr blieb.',
      srText: speak(prompt),
      kmk: KMK,
    });
  };
}

/** Stufe 3, AB II: which fraction has the same value? */
const equalFraction: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(BASES);
  const k = rng.int(2, 6);
  const m = rng.pick([2, 3, 4].filter((x) => x !== k));
  const given = rng.chance(0.5) ? ([n, d] as Frac) : ([n * m, d * m] as Frac);
  const right = frac(n * k, d * k);
  const wrongs: ChoiceOption[] = [
    { label: frac(given[0] + k, given[1] + k), whyWrong: 'Hier ist zu Zähler und Nenner dieselbe Zahl addiert. Das ändert den Wert.' },
    { label: frac(n * k, d * k + 1), whyWrong: 'Bringe beide Brüche auf denselben Nenner. Vergleiche dann die Zähler.' },
    // the other part stays that of the given fraction, so 'nur' holds also when the given fraction is scaled
    { label: frac(n * k, given[1]), whyWrong: 'Hier ist nur der Zähler verändert. Das ändert den Wert.' },
    { label: frac(given[0], d * k), whyWrong: 'Hier ist nur der Nenner verändert. Das ändert den Wert.' },
  ].filter((o) => o.label !== frac(given[0], given[1]));
  const answer = makeChoice(rng, { label: right }, wrongs);
  const shown = frac(given[0], given[1]);
  const prompt = `Welcher Bruch hat denselben Wert wie ${shown}?`;
  return build(SKILL, stufe, {
    key: `gleich:${given.join('/')}:${k}`,
    ab,
    prompt,
    answer,
    hints: ['Kürze jeden Bruch so weit wie möglich. Vergleiche dann.', 'Gleich sind nur Brüche mit derselben gekürzten Form.'],
    steps: [given[0] === n ? `${shown} lässt sich nicht weiter kürzen.` : `${shown} ist gekürzt ${frac(n, d)}.`, `${right} ist gekürzt ${given[0] === n ? '' : 'auch '}${frac(n, d)}.`, `Also hat ${right} denselben Wert wie ${shown}.`],
    praise: 'Du hast die Brüche durch Kürzen verglichen.',
    srText: speak(`${prompt} Wähle aus: ${answer.options.map((o) => o.label).join(', ')}.`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

/** Stufe 3, AB III: three fractions have one value, one does not. */
const oddFraction: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(BASES.filter(([, x]) => x >= 3));
  const [k1, k2, k3] = rng.sample([2, 3, 4, 5, 6, 7, 8], 3);
  const oddN = n * k3 + 1;
  const right = frac(oddN, d * k3);
  const wrongs: ChoiceOption[] = [n * k1, n * k2].map((x, i) => ({ label: frac(x, d * [k1, k2][i]), whyWrong: `Gekürzt ist dieser Bruch ${frac(n, d)}. Zwei andere Brüche auch.` }));
  wrongs.push({ label: frac(n, d), whyWrong: `Das ist der Wert ${frac(n, d)}. Zwei andere Brüche haben denselben Wert.` });
  const answer = makeChoice(rng, { label: right }, wrongs);
  const prompt = 'Drei Brüche haben denselben Wert. Welcher Bruch passt nicht dazu?';
  const [oddLowN, oddLowD] = lowest([oddN, d * k3]);
  return build(SKILL, stufe, {
    key: `anders:${n}/${d}:${Math.min(k1, k2)}-${Math.max(k1, k2)}-${k3}`,
    ab,
    prompt,
    answer,
    hints: ['Kürze jeden Bruch so weit wie möglich.', 'Ein Bruch hat danach eine andere Form.'],
    steps: [`Drei Brüche lassen sich auf ${frac(n, d)} kürzen.`, oddLowN === oddN ? `${right} lässt sich nicht kürzen.` : `${right} hat gekürzt die Form ${frac(oddLowN, oddLowD)}.`, `Also passt ${right} nicht dazu.`],
    praise: 'Du hast jeden Bruch gekürzt und verglichen.',
    srText: speak(`${prompt} Wähle aus: ${answer.options.map((o) => o.label).join(', ')}.`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

const ANY_FACTOR = (rng: Rng) => {
  const [n, d] = rng.pick(BASES);
  return { n, d, k: rng.int(2, 8) };
};
const LARGE_FACTOR = (rng: Rng) => {
  const [n, d] = rng.pick(BASES);
  return { n, d, k: rng.int(6, 12) };
};
const reduceWithin = (factors: readonly number[]) => (rng: Rng) => {
  const [n, d] = rng.pick(BASES);
  const k = rng.pick(factors);
  return { n: n * k, d: d * k };
};

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [extendPlain], 2: [refinedPicture], 3: [findFactor(ANY_FACTOR, false)] },
  2: {
    1: [reduceGiven([2, 3, 4, 5], BASES)],
    2: [missingPart],
    3: [findFactor(LARGE_FACTOR, true), reduceGiven([6, 7, 8, 9, 12], BASES)],
  },
  3: {
    1: [reduceFully(reduceWithin([2, 3, 4, 6]))],
    2: [equalFraction],
    3: [reduceFully(reduceWithin([8, 9, 12, 14, 15, 16, 18, 21, 24])), oddFraction],
  },
};

export const erweiternSkill: SkillDef = {
  ...SKILL,
  title: 'Erweitern und Kürzen',
  description: 'Du änderst die Einteilung, und der Wert bleibt gleich.',
  stufen: { 1: 'Erweitern mit einer gegebenen Zahl, das Bild teilt feiner', 2: 'Kürzen mit einer gegebenen Zahl, Zähler oder Nenner ergänzen', 3: 'Vollständig kürzen, gleiche Brüche erkennen' },
  kmk: KMK,
  generate: byStufeAndAb(FORMS),
};

