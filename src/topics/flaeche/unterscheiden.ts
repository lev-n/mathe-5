/**
 * flaeche.unterscheiden (docs/research.md §6, [27]).
 * F7 (§3): every answer choice shows its unit, and the steps name Rand and Innenfläche.
 * Stufe 1: which fits, Zaun or Teppich. AB I one situation, AB II pick the situation, AB III judge a claim.
 * Stufe 2: compute both, choose cm or cm². AB I on the grid, AB II with lengths or the unit, AB III find the slip in a child's notes.
 * Stufe 3: doubling sides. AB I compute both after doubling, AB II how they change, AB III from given values, also with a factor 3.
 */
import { speak } from '../../core/format';
import type { MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, pickPerson } from '../shared';
import { HINT, bug, generator, gridRect, q, rectShape, type Forms, type Item } from './common';

const SKILL = { id: 'flaeche.unterscheiden', topicId: 'flaeche' } as const;
const KMK = ['GM.umfang-flaeche'];

type Need = 'umfang' | 'flaeche';

interface Situation {
  id: string;
  need: Need;
  /** After a name: 'Mia baut einen Zaun um den Garten.' */
  act: string;
  /** Option text. */
  short: string;
  subject: string;
  /** The length that fits this work. The area goes with its square. */
  unit: 'cm' | 'm';
}

const SITUATIONS: readonly Situation[] = [
  { id: 'zaun', need: 'umfang', act: 'baut einen Zaun um den Garten', short: 'Zaun um den Garten', subject: 'Der Zaun', unit: 'm' },
  { id: 'rahmen', need: 'umfang', act: 'klebt einen Rand um ein Bild', short: 'Rand um ein Bild', subject: 'Der Rand', unit: 'cm' },
  { id: 'lichter', need: 'umfang', act: 'hängt eine Lichterkette um das Fenster', short: 'Lichterkette um das Fenster', subject: 'Die Lichterkette', unit: 'm' },
  { id: 'leiste', need: 'umfang', act: 'legt eine Leiste um den Fußboden', short: 'Leiste um den Fußboden', subject: 'Die Leiste', unit: 'm' },
  { id: 'laufen', need: 'umfang', act: 'läuft einmal um den Sportplatz', short: 'Runde um den Sportplatz', subject: 'Die Runde', unit: 'm' },
  { id: 'band', need: 'umfang', act: 'näht ein Band um die Tischdecke', short: 'Band um die Tischdecke', subject: 'Das Band', unit: 'cm' },
  { id: 'teppich', need: 'flaeche', act: 'legt einen Teppich in das Zimmer', short: 'Teppich im Zimmer', subject: 'Der Teppich', unit: 'm' },
  { id: 'rasen', need: 'flaeche', act: 'sät Rasen im Garten', short: 'Rasen im Garten', subject: 'Der Rasen', unit: 'm' },
  { id: 'fliesen', need: 'flaeche', act: 'legt Fliesen im Bad', short: 'Fliesen im Bad', subject: 'Der Boden', unit: 'm' },
  { id: 'farbe', need: 'flaeche', act: 'streicht eine Wand', short: 'Farbe für eine Wand', subject: 'Die Farbe', unit: 'm' },
  { id: 'beet', need: 'flaeche', act: 'verteilt Erde auf dem Beet', short: 'Erde auf dem Beet', subject: 'Die Erde', unit: 'm' },
  { id: 'folie', need: 'flaeche', act: 'klebt Folie auf ein Fenster', short: 'Folie auf einem Fenster', subject: 'Die Folie', unit: 'cm' },
];

const NEED_LABEL: Record<Need, string> = { umfang: 'Umfang', flaeche: 'Flächeninhalt' };
const OUTSIDE = 'läuft außen herum';
const INSIDE = 'bedeckt alles innen';
const place = (need: Need) => (need === 'umfang' ? OUTSIDE : INSIDE);
const other = (need: Need): Need => (need === 'umfang' ? 'flaeche' : 'umfang');
const PART: Record<Need, string> = { umfang: 'der Rand', flaeche: 'die Innenfläche' };
/** The size with its unit, as an option shows it: 'Flächeninhalt in m²'. */
const sized = (need: Need, s: Situation) => (need === 'umfang' ? `${NEED_LABEL.umfang} in ${s.unit}` : `${NEED_LABEL.flaeche} in ${s.unit}²`);
const whatItIs = (s: Situation) => `${s.subject} ${place(s.need)}. Das ist ${PART[s.need]}.`;

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1Which: Forms[1][1] = (rng) => {
  const s = rng.pick(SITUATIONS);
  const { name } = pickPerson(rng);
  const right = sized(s.need, s);
  const wrong = sized(other(s.need), s);
  return {
    key: `welche-groesse:${s.id}`,
    context: `${name} ${s.act}.`,
    prompt: `Was muss ${name} ausrechnen?`,
    answer: makeChoice(rng, { label: right }, [{ label: wrong, whyWrong: HINT.umfangFlaeche }], { order: [sized('umfang', s), sized('flaeche', s)] }),
    hints: ['Stell dir die Arbeit vor: Geht es außen herum oder über alles innen?', HINT.umfangFlaeche],
    steps: [whatItIs(s), `${name} braucht den ${right}.`],
    praise: `Du hast geprüft: außen herum oder alles innen.`,
    srText: speak(`${name} ${s.act}. Was muss ${name} ausrechnen? ${sized('umfang', s)} oder ${sized('flaeche', s)}?`),
  };
};

const s1Pick: Forms[1][2] = (rng) => {
  const need: Need = rng.pick(['umfang', 'flaeche']);
  const right = rng.pick(SITUATIONS.filter((s) => s.need === need));
  // a wrong work always carries the size of the other kind, and one of them the size of the right option: the unit alone never decides, the child checks each pair
  const decoy = rng.pick(SITUATIONS.filter((s) => s.need !== need));
  const wrong = [decoy, ...rng.sample(SITUATIONS.filter((s) => s !== right && s !== decoy), 2)];
  const paired = (s: Situation, n: Need) => `${s.short}: ${sized(n, s)}`;
  return {
    key: `welche-aufgabe:${need}:${right.id}:${wrong.map((s) => s.id).sort().join('-')}`,
    prompt: 'Bei welcher Arbeit passt die Angabe dahinter?',
    answer: makeChoice(rng, { label: paired(right, need) }, wrong.map((s) => ({ label: paired(s, other(s.need)), whyWrong: `${s.subject} ${place(s.need)}: ${sized(s.need, s)}.` }))),
    hints: [HINT.umfangFlaeche, 'Prüfe jede Arbeit: außen herum oder alles innen?'],
    steps: [whatItIs(right), `Passend ist: ${paired(right, need)}.`],
    praise: 'Du hast jede Arbeit einzeln geprüft.',
  };
};

const s1Claim: Forms[1][3] = (rng) => {
  const s = rng.pick(SITUATIONS);
  const { name } = pickPerson(rng);
  const claimRight = rng.chance(0.4);
  const claimed = claimRight ? s.need : other(s.need);
  const right = `${claimRight ? 'Ja' : 'Nein'}. ${s.subject} ${place(s.need)}: ${sized(s.need, s)}.`;
  return {
    key: `behauptung:${s.id}:${claimRight ? 'ja' : 'nein'}`,
    context: `Die Arbeit heißt: ${s.short}. ${name} sagt: Dafür brauche ich den ${sized(claimed, s)}.`,
    prompt: 'Stimmt das?',
    answer: makeChoice(rng, { label: right }, [
      { label: `${claimRight ? 'Nein' : 'Ja'}. ${s.subject} ${place(other(s.need))}: ${sized(other(s.need), s)}.`, whyWrong: HINT.umfangFlaeche },
      { label: `${claimRight ? 'Nein' : 'Ja'}. ${s.subject} ${place(s.need)}: ${sized(s.need, s)}.`, whyWrong: `${s.subject} ${place(s.need)}: Das passt zum ${NEED_LABEL[s.need]}.` },
    ]),
    hints: ['Stell dir die Arbeit vor: außen herum oder alles innen?', HINT.umfangFlaeche],
    steps: [whatItIs(s), `Gebraucht ist hier der ${sized(s.need, s)}.`, right],
    praise: 'Du hast die Aussage an der Arbeit geprüft.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const bothFields = (U: number, A: number): MultiField[] => [
  { id: 'u', value: U, before: 'Umfang:', after: 'cm', label: 'Umfang' },
  { id: 'a', value: A, before: 'Flächeninhalt:', after: 'cm²', label: 'Flächeninhalt' },
];

/** The worked lines of a rectangle with both sizes: the Rand gives the Umfang, the Innenfläche the Flächeninhalt. */
const bothLines = (a: number, b: number) => [
  `Rand, also Umfang: 2 · ${a} cm + 2 · ${b} cm = ${2 * a + 2 * b} cm`,
  `Innenfläche, also Flächeninhalt: ${a} · ${b} = ${a * b}`,
];

function distinctRect(rng: Rng, aMin: number, aMax: number, bMin: number): [number, number] {
  for (;;) {
    const a = rng.int(aMin, aMax);
    const b = rng.int(bMin, a - 1);
    if (2 * a + 2 * b !== a * b && a + b !== a * b) return [a, b];
  }
}

const s2Grid: Forms[2][1] = (rng) => {
  const [w, h] = distinctRect(rng, 3, 6, 2);
  const U = 2 * w + 2 * h;
  const A = w * h;
  return {
    key: `beides-gitter:${w}x${h}`,
    prompt: 'Ein Kästchen ist 1 cm lang. Wie groß sind Umfang und Flächeninhalt?',
    visual: gridRect(w, h),
    answer: { kind: 'multi', fields: bothFields(U, A) },
    hints: ['Umfang: Zähle die Längen am Rand.', 'Flächeninhalt: Zähle die Kästchen innen.'],
    steps: [...bothLines(w, h), `Der Umfang ist ${U} cm, der Flächeninhalt ${A} cm².`],
    bugs: [
      bug('umfang-flaeche', { u: A, a: U }, HINT.umfangFlaeche),
      bug('umfang-halb', { u: w + h, a: A }, HINT.umfangHalb),
    ],
    praise: 'Du hast Rand und Innenfläche getrennt gezählt.',
    srText: speak(`Ein Rechteck im Gitter, ${w} Kästchen breit und ${h} Kästchen hoch. Ein Kästchen ist 1 cm lang. Wie groß sind Umfang und Flächeninhalt?`),
  };
};

const s2LengthsOrUnit: Forms[2][2] = (rng) => {
  const [a, b] = distinctRect(rng, 8, 19, 3);
  const U = 2 * a + 2 * b;
  const A = a * b;
  if (rng.chance(0.6)) {
    return {
      key: `beides:${a}x${b}`,
      prompt: 'Wie groß sind Umfang und Flächeninhalt vom Rechteck?',
      visual: rectShape(a, b, 'cm', 2),
      answer: { kind: 'multi', fields: bothFields(U, A) },
      hints: ['Umfang: alle vier Seiten addieren.', 'Flächeninhalt: Länge · Breite rechnen.'],
      steps: [...bothLines(a, b), `Der Umfang ist ${U} cm, der Flächeninhalt ${A} cm².`],
      bugs: [
        bug('umfang-flaeche', { u: A, a: U }, HINT.umfangFlaeche),
        bug('umfang-halb', { u: a + b, a: A }, HINT.umfangHalb),
      ],
      praise: 'Du hast beide Größen mit der richtigen Rechnung bestimmt.',
      srText: speak(`Ein Rechteck, ${q(a, 'cm')} lang und ${q(b, 'cm')} breit. Wie groß sind Umfang und Flächeninhalt?`),
    };
  }
  const asked: Need = rng.pick(['umfang', 'flaeche']);
  const value = asked === 'umfang' ? U : A;
  const right = asked === 'umfang' ? 'cm' : 'cm²';
  return {
    key: `einheit:${asked}:${a}x${b}`,
    prompt: `Das Rechteck hat den ${NEED_LABEL[asked]} ${value}. Welche Einheit passt?`,
    visual: rectShape(a, b, 'cm', 2),
    answer: makeChoice(rng, { label: right }, [
      { label: asked === 'umfang' ? 'cm²' : 'cm', whyWrong: asked === 'umfang' ? 'Der Umfang ist eine Länge: cm, nicht cm².' : HINT.einheitCm },
      { label: 'cm³', whyWrong: 'cm³ gehört zu Körpern. Hier geht es um eine ebene Figur.' },
    ], { order: ['cm', 'cm²', 'cm³'] }),
    hints: ['Ist die Zahl eine Länge oder eine Anzahl von Quadraten?', HINT.umfangFlaeche],
    steps: [asked === 'umfang' ? 'Der Umfang ist eine Länge: der Rand.' : 'Der Flächeninhalt zählt Quadrate: die Innenfläche.', `Die Einheit ist ${right}.`],
    praise: 'Du hast die Einheit passend zur Größe gewählt.',
    srText: speak(`Ein Rechteck, ${q(a, 'cm')} lang und ${q(b, 'cm')} breit. Es hat den ${NEED_LABEL[asked]} ${value}. Welche Einheit passt?`),
  };
};

const s2Check: Forms[2][3] = (rng) => {
  const { name } = pickPerson(rng);
  const [a, b] = distinctRect(rng, 6, 15, 3);
  const U = 2 * a + 2 * b;
  const A = a * b;
  const OPTIONS = { tausch: 'Die Zahlen sind vertauscht. Die Einheiten cm und cm² stimmen.', einheit: 'Die Einheiten cm und cm² sind vertauscht.', halb: 'Beim Umfang in cm fehlen zwei Seiten.', ok: 'Alles stimmt: Umfang in cm, Flächeninhalt in cm².' } as const;
  const slip = rng.pick(['tausch', 'einheit', 'halb', 'ok'] as const);
  const shown = {
    tausch: `Umfang ${q(A, 'cm')}, Flächeninhalt ${q(U, 'cm²')}`,
    einheit: `Umfang ${q(U, 'cm²')}, Flächeninhalt ${q(A, 'cm')}`,
    halb: `Umfang ${q(a + b, 'cm')}, Flächeninhalt ${q(A, 'cm²')}`,
    ok: `Umfang ${q(U, 'cm')}, Flächeninhalt ${q(A, 'cm²')}`,
  }[slip];
  return {
    key: `pruefen:${slip}:${a}x${b}`,
    context: `Ein Rechteck ist ${q(a, 'cm')} lang und ${q(b, 'cm')} breit. ${name} schreibt: ${shown}.`,
    prompt: 'Was stimmt?',
    answer: makeChoice(rng, { label: OPTIONS[slip] }, (['tausch', 'einheit', 'halb', 'ok'] as const).filter((k) => k !== slip).map((k) => ({ label: OPTIONS[k], whyWrong: 'Rechne Umfang und Flächeninhalt selbst aus. Vergleiche dann.' }))),
    hints: ['Rechne zuerst beide Größen selbst aus.', 'Vergleiche danach Zahl und Einheit.'],
    steps: [...bothLines(a, b), `Richtig ist: ${OPTIONS[slip]}`],
    praise: 'Du hast Zahl und Einheit selbst nachgerechnet.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const scaledBugs = (U: number, A: number, k: number) => [
  bug('flaeche-verdoppelt', { u: k * U, a: k * A }, 'Beide Seiten wachsen. Zeichne das neue Rechteck und zähle die alten hinein.'),
  bug('umfang-vervielfacht', { u: k * k * U, a: k * k * A }, `Der Umfang ist eine Länge. Alle Seiten sind ${k === 2 ? 'doppelt' : 'dreimal'} so lang, mehr nicht.`),
  bug('umfang-flaeche', { u: k * k * A, a: k * U }, HINT.umfangFlaeche),
];

const s3Compute: Forms[3][1] = (rng) => {
  const { name } = pickPerson(rng);
  const [a, b] = distinctRect(rng, 4, 12, 2);
  const U = 2 * (2 * a + 2 * b);
  const A = 4 * a * b;
  return {
    key: `verdoppelt-rechnen:${a}x${b}`,
    context: `Ein Rechteck ist ${q(a, 'cm')} lang und ${q(b, 'cm')} breit. ${name} verdoppelt beide Seiten.`,
    prompt: 'Wie groß sind jetzt Umfang und Flächeninhalt?',
    answer: { kind: 'multi', fields: bothFields(U, A) },
    hints: ['Schreib zuerst die neuen Seiten auf.', 'Rechne dann mit den neuen Seiten wie immer.'],
    steps: [`Neue Seiten: ${q(2 * a, 'cm')} und ${q(2 * b, 'cm')}`, ...bothLines(2 * a, 2 * b), `Der Umfang ist ${U} cm, der Flächeninhalt ${A} cm².`],
    bugs: scaledBugs(2 * a + 2 * b, a * b, 2),
    praise: 'Du hast mit den neuen Seiten gerechnet.',
  };
};

/** How a size changes, with the factor behind the words. */
const CHANGE = [['bleibt gleich', 1], ['doppelt so groß', 2], ['dreimal so groß', 3], ['viermal so groß', 4]] as const;

const s3How: Forms[3][2] = (rng) => {
  const [a, b] = distinctRect(rng, 3, 9, 2);
  const kind = rng.pick(['beide-flaeche', 'beide-umfang', 'eine-flaeche'] as const);
  const scaled = kind === 'eine-flaeche' ? [2 * a, b] : [2 * a, 2 * b];
  const told = kind === 'eine-flaeche' ? `Die Länge ${q(a, 'cm')} ist jetzt doppelt so lang.` : 'Beide Seiten sind jetzt doppelt so lang.';
  const asked = kind === 'beide-umfang' ? 'Umfang' : 'Flächeninhalt';
  const old = kind === 'beide-umfang' ? 2 * a + 2 * b : a * b;
  const now = kind === 'beide-umfang' ? 2 * scaled[0] + 2 * scaled[1] : scaled[0] * scaled[1];
  const unit = kind === 'beide-umfang' ? 'cm' : 'cm²';
  const option = ([words, factor]: (typeof CHANGE)[number]) => `${words}: ${q(factor * old, unit)}`;
  const right = CHANGE.find(([, factor]) => factor * old === now)!;
  return {
    key: `wie-aendert:${kind}:${a}x${b}`,
    context: `${told}`,
    prompt: `Wie ändert sich der ${asked}?`,
    visual: rectShape(a, b, 'cm', 2),
    answer: makeChoice(rng, { label: option(right) }, CHANGE.filter((c) => c !== right).map((c) => ({ label: option(c), whyWrong: 'Rechne beide Rechtecke aus und vergleiche.' })), { max: 4 }),
    hints: ['Rechne mit den alten Seiten und mit den neuen Seiten.', 'Vergleiche dann die beiden Ergebnisse.'],
    steps: [`Gefragt ist ${kind === 'beide-umfang' ? PART.umfang : PART.flaeche}: der ${asked}.`, `Vorher: ${asked} ${q(old, unit)}`, `Nachher: Seiten ${q(scaled[0], 'cm')} und ${q(scaled[1], 'cm')}, ${asked} ${q(now, unit)}`, `Der ${asked} ist ${right[0]}.`],
    praise: 'Du hast vorher und nachher verglichen.',
    srText: speak(`Ein Rechteck, ${q(a, 'cm')} lang und ${q(b, 'cm')} breit. ${told} Wie ändert sich der ${asked}?`),
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

const s3FromValues: Forms[3][3] = (rng): Item => {
  const { name } = pickPerson(rng);
  const [a, b] = distinctRect(rng, 5, 12, 2);
  const k = rng.pick([2, 3]);
  const U = 2 * a + 2 * b;
  const A = a * b;
  const fields = bothFields(k * U, k * k * A);
  return {
    key: `aus-werten:${U}-${A}-${k}:${a}x${b}`,
    context: `Ein Rechteck hat den Umfang ${q(U, 'cm')} und den Flächeninhalt ${q(A, 'cm²')}. ${name} macht alle Seiten ${k === 2 ? 'doppelt' : 'dreimal'} so lang.`,
    prompt: 'Wie groß sind jetzt Umfang und Flächeninhalt?',
    answer: { kind: 'multi', fields },
    hints: ['Der Umfang wächst so wie die Seiten.', k === 2 ? 'Beim Flächeninhalt passen 2 · 2 alte Rechtecke hinein.' : 'Beim Flächeninhalt passen 3 · 3 alte Rechtecke hinein.'],
    steps: [`Rand, also Umfang: ${k} · ${U} cm = ${k * U} cm`, `Innenfläche, also Flächeninhalt: ${k} · ${k} = ${k * k}, also ${k * k} · ${A} = ${k * k * A}`, `Der Umfang ist ${k * U} cm, der Flächeninhalt ${k * k * A} cm².`],
    bugs: scaledBugs(U, A, k),
    praise: 'Du weißt: Längen und Flächen wachsen verschieden.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

const FORMS: Forms = {
  1: { 1: s1Which, 2: s1Pick, 3: s1Claim },
  2: { 1: s2Grid, 2: s2LengthsOrUnit, 3: s2Check },
  3: { 1: s3Compute, 2: s3How, 3: s3FromValues },
};

const STUFEN: Record<Stufe, string> = {
  1: 'Was passt: Zaun, Teppich, Rand, Rasen?',
  2: 'Beides rechnen, cm oder cm² wählen',
  3: 'Seiten verdoppeln: Wie ändern sich Umfang und Fläche?',
};

export const unterscheidenSkill: SkillDef = {
  ...SKILL,
  title: 'Umfang oder Fläche?',
  description: 'Du entscheidest, was gefragt ist, und nimmst die passende Einheit.',
  stufen: STUFEN,
  kmk: KMK,
  generate: generator(SKILL, KMK, FORMS),
};
