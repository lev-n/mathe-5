/**
 * Vierecke (docs/research.md §6). Stufe 1: Quadrat, Rechteck, Parallelogramm and Raute by their sides. Stufe 2: Trapez and Drachenviereck, parallel sides.
 * Stufe 3: statements such as "Jedes Quadrat ist ein Rechteck". The plans define the Trapez differently (at least one or exactly one pair of parallel
 * sides), so no statement depends on it: "Jedes Parallelogramm ist ein Trapez" stays out.
 */
import { fmtQty, toSpeech } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, MultiField, Rng, ShapeKind, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, multiBugs, targetAb } from '../shared';
import { yesNo } from './helpers';

const SKILL = { id: 'geometrie.vierecke', topicId: 'geometrie' } as const;
const KMK = ['RF.figuren'];

type Kind = 'quadrat' | 'rechteck' | 'raute' | 'parallelogramm' | 'trapez' | 'drachen';
const NAME: Record<Kind, string> = { quadrat: 'Quadrat', rechteck: 'Rechteck', raute: 'Raute', parallelogramm: 'Parallelogramm', trapez: 'Trapez', drachen: 'Drachenviereck' };
const DEFINE: Record<Kind, string> = {
  quadrat: 'Ein Quadrat hat vier gleich lange Seiten und vier rechte Winkel.',
  rechteck: 'Ein Rechteck hat vier rechte Winkel.',
  raute: 'Eine Raute hat vier gleich lange Seiten.',
  parallelogramm: 'Beim Parallelogramm sind die Seiten gegenüber parallel und gleich lang.',
  trapez: 'Ein Trapez hat ein Paar paralleler Seiten.',
  drachen: 'Beim Drachenviereck sind je zwei benachbarte Seiten gleich lang.',
};
/** Every figure of the key also is each figure of its list. */
const IS_ALSO: Record<Kind, readonly Kind[]> = { quadrat: ['rechteck', 'raute', 'parallelogramm', 'drachen', 'trapez'], rechteck: ['parallelogramm', 'trapez'], raute: ['parallelogramm', 'drachen', 'trapez'], parallelogramm: ['trapez'], trapez: [], drachen: [] };
const SIDES_FIRST: readonly Kind[] = ['quadrat', 'rechteck', 'raute', 'parallelogramm'];
const ROTATIONS = [0, 10, 15, 20, 30, 40, 330, 340, 345, 350, 90, 180];

/** A name that also fits gets no definition: that would read as a yes. For the Trapez it stays open whether the name fits, as the plans differ (see above). */
function whyName(right: Kind, picked: Kind): string {
  if (!IS_ALSO[right].includes(picked)) return DEFINE[picked];
  return picked === 'trapez' ? 'Ein Trapez braucht nur ein Paar paralleler Seiten. Gibt es einen genaueren Namen?' : 'Der Name passt auch. Gibt es einen genaueren Namen?';
}
const wrongNames = (right: Kind, pool: readonly Kind[]): ChoiceOption[] => pool.filter((k) => k !== right).map((k) => ({ label: NAME[k], whyWrong: whyName(right, k) }));
const article = (k: Kind) => (k === 'raute' ? 'eine Raute' : `ein ${NAME[k]}`);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Side lengths clockwise from the top: all equal, or two different ones. The figures are drawn with a long top side (about 1.7 to 1.9 times the right one),
 * so the first length is the longer one and at most 2.5 times the other: the labels fit the picture.
 */
function sides(rng: Rng, kind: Kind): [number, number] {
  if (kind === 'quadrat' || kind === 'raute') {
    const a = rng.int(3, 12);
    return [a, a];
  }
  const a = rng.int(5, 12);
  return [a, rng.pick([3, 4, 5, 6, 7, 8, 9, 10].filter((b) => 1.25 * b <= a && a <= 2.5 * b))];
}

function labelled(kind: Kind, [a, b]: [number, number]): VisualOf<'shape'> {
  return { type: 'shape', shape: kind as ShapeKind, sideLabels: [fmtQty(a, 'cm'), fmtQty(b, 'cm'), fmtQty(a, 'cm'), fmtQty(b, 'cm')] };
}

const ANGLE_WORDS: Record<Kind, string> = { quadrat: 'vier rechte Winkel', rechteck: 'vier rechte Winkel', raute: 'keinen rechten Winkel', parallelogramm: 'keinen rechten Winkel', trapez: '', drachen: '' };

/** Stufe 1, AB I: name the drawn figure with its side lengths. */
function namePicture(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick(SIDES_FIRST);
  const s = sides(rng, kind);
  const question = 'Wie heißt diese Figur am genauesten?';
  // Raute and Quadrat differ only by their angles, so the text states them; a picture must not decide by the position of the figure.
  const prompt = kind === 'quadrat' || kind === 'raute' ? `Die Figur hat ${ANGLE_WORDS[kind]}. ${question}` : question;
  return build(SKILL, 1, {
    key: `name:${kind}:${s.join('.')}`,
    ab,
    prompt,
    visual: labelled(kind, s),
    answer: makeChoice(rng, { label: NAME[kind] }, wrongNames(kind, SIDES_FIRST), { order: SIDES_FIRST.map((k) => NAME[k]) }),
    hints: ['Vergleiche zuerst die Längen der Seiten.', 'Prüfe dann: Hat die Figur rechte Winkel?'],
    steps: [s[0] === s[1] ? 'Alle vier Seiten sind gleich lang.' : 'Je zwei Seiten gegenüber sind gleich lang.', `Die Figur hat ${ANGLE_WORDS[kind]}.`, `Die Figur ist ${article(kind)}.`],
    praise: rng.pick(['Du hast Seiten und Winkel beide geprüft.', 'Du hast zuerst die Seitenlängen verglichen.']),
    srText: toSpeech(`Ein Viereck mit den Seiten ${s[0]} Zentimeter und ${s[1]} Zentimeter, im Wechsel. Es hat ${ANGLE_WORDS[kind]}. ${question}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB II: the figure from a description, no picture. */
function nameFromText(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick(SIDES_FIRST);
  const [a, b] = sides(rng, kind);
  // "Gegenüber" belongs to the data: two pairs of equal sides alone also fit a Drachenviereck.
  const sideText = a === b ? `Alle vier Seiten sind ${fmtQty(a, 'cm')} lang.` : `Die Seiten gegenüber sind gleich lang: ${fmtQty(a, 'cm')} und ${fmtQty(b, 'cm')}.`;
  const angleText = kind === 'quadrat' || kind === 'rechteck' ? 'Alle Winkel sind rechte Winkel.' : 'Es gibt keinen rechten Winkel.';
  const prompt = `${sideText} ${angleText} Wie heißt die Figur am genauesten?`;
  return build(SKILL, 1, {
    key: `text:${kind}:${a}.${b}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: NAME[kind] }, wrongNames(kind, SIDES_FIRST), { order: SIDES_FIRST.map((k) => NAME[k]) }),
    hints: ['Zeichne die Figur grob auf ein Blatt.', 'Sind alle Seiten gleich lang? Gibt es rechte Winkel?'],
    steps: [sideText, angleText, `Die Figur ist ${article(kind)}.`],
    praise: 'Du hast aus Seiten und Winkeln den Namen gefunden.',
    srText: toSpeech(prompt),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: reversed. The lengths of the sides not labelled. */
function missingSides(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick<Kind>(['quadrat', 'rechteck', 'parallelogramm']);
  const [a, b] = sides(rng, kind);
  const fields: MultiField[] = [{ id: 'unten', value: a, before: 'unten', after: 'cm', label: 'Seite unten' }, { id: 'links', value: b, before: 'links', after: 'cm', label: 'Seite links' }];
  const prompt = `Das ist ${article(kind)}. Wie lang sind die Seiten unten und links?`;
  return build(SKILL, 1, {
    key: `seiten:${kind}:${a}.${b}`,
    ab,
    prompt,
    visual: { type: 'shape', shape: kind as ShapeKind, named: true, sideLabels: [fmtQty(a, 'cm'), fmtQty(b, 'cm'), null, null] },
    answer: { kind: 'multi', fields },
    hints: [kind === 'quadrat' ? 'Alle vier Seiten sind gleich lang.' : 'Die Seiten gegenüber sind gleich lang.', 'Unten liegt gegenüber von oben. Links liegt gegenüber von rechts.'],
    steps: [`Unten liegt gegenüber von oben: ${fmtQty(a, 'cm')}.`, `Links liegt gegenüber von rechts: ${fmtQty(b, 'cm')}.`, `unten ${fmtQty(a, 'cm')}, links ${fmtQty(b, 'cm')}`],
    bugs: multiBugs([{ id: 'seiten-getauscht', match: { unten: b, links: a }, hint: 'Schau auf die Seite gegenüber. Unten liegt gegenüber von oben.' }], fields),
    praise: 'Du hast die Seiten gegenüber genutzt.',
    srText: toSpeech(`Das ist ${article(kind)}. Die Seite oben ist ${a} Zentimeter lang, die Seite rechts ${b} Zentimeter. Wie lang sind die Seiten unten und links?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const S2_POOL: readonly Kind[] = ['trapez', 'drachen', 'parallelogramm', 'raute'];
const SPOKEN: Record<'trapez' | 'drachen', string> = { trapez: 'Ein Viereck, zwei Seiten sind parallel, die anderen beiden nicht.', drachen: 'Ein Viereck, je zwei benachbarte Seiten sind gleich lang.' };

/** Stufe 2, AB I: Trapez or Drachenviereck in a picture, also turned. */
function nameSpecial(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick<'trapez' | 'drachen'>(['trapez', 'drachen']);
  const rotate = rng.pick(ROTATIONS);
  const prompt = 'Wie heißt dieses Viereck?';
  return build(SKILL, 2, {
    key: `spezial:${kind}:${rotate}`,
    ab,
    prompt,
    visual: { type: 'shape', shape: kind, rotate },
    answer: makeChoice(rng, { label: NAME[kind] }, wrongNames(kind, S2_POOL), { order: S2_POOL.map((k) => NAME[k]) }),
    hints: ['Dreh das Bild im Kopf. Suche parallele Seiten.', 'Prüfe auch: Sind benachbarte Seiten gleich lang?'],
    steps: [kind === 'trapez' ? 'Zwei Seiten gegenüber sind parallel.' : 'Je zwei benachbarte Seiten sind gleich lang.', kind === 'trapez' ? 'Die anderen zwei Seiten sind nicht parallel.' : 'Das Viereck hat keine parallelen Seiten.', `Das Viereck ist ${article(kind)}.`],
    praise: rng.pick(['Du hast die Seiten auch in schräger Lage verglichen.', 'Du hast nach parallelen Seiten gesucht.']),
    srText: toSpeech(`${SPOKEN[kind]}${rotate ? ' Die Figur ist gedreht.' : ''} ${prompt}`),
    kmk: KMK,
  });
}

const PAIRS: { kind: Kind; pairs: number; spoken: string }[] = [
  { kind: 'trapez', pairs: 1, spoken: 'Ein Trapez.' },
  { kind: 'parallelogramm', pairs: 2, spoken: 'Ein Parallelogramm.' },
  { kind: 'rechteck', pairs: 2, spoken: 'Ein Rechteck.' },
  { kind: 'raute', pairs: 2, spoken: 'Eine Raute.' },
  { kind: 'quadrat', pairs: 2, spoken: 'Ein Quadrat.' },
  { kind: 'drachen', pairs: 0, spoken: 'Ein Drachenviereck.' },
];

/** Stufe 2, AB II: how many pairs of parallel sides? */
function parallelSides(rng: Rng, ab: Ab): Exercise {
  const item = rng.pick(PAIRS);
  const rotate = rng.pick(ROTATIONS);
  const why = 'Verlängere je zwei Seiten gegenüber. Treffen sich die Seiten irgendwann?';
  const prompt = 'Wie viele Paare paralleler Seiten hat dieses Viereck?';
  return build(SKILL, 2, {
    key: `parallel:${item.kind}:${rotate}`,
    ab,
    prompt,
    visual: { type: 'shape', shape: item.kind as ShapeKind, rotate, named: true },
    answer: makeChoice(rng, { label: String(item.pairs) }, ['0', '1', '2'].filter((l) => l !== String(item.pairs)).map((label) => ({ label, whyWrong: why })), { order: ['0', '1', '2'] }),
    hints: ['Ein Viereck hat zwei Paare von Seiten gegenüber.', 'Prüfe jedes Paar: Bleibt der Abstand gleich?'],
    steps: ['Prüfe die zwei Paare von Seiten gegenüber.', DEFINE[item.kind], `Das Viereck hat ${item.pairs} ${item.pairs === 1 ? 'Paar' : 'Paare'}.`],
    praise: 'Du hast beide Paare von Seiten geprüft.',
    srText: toSpeech(`${item.spoken} ${prompt}`),
    kmk: KMK,
  });
}

const STATEMENTS_S2: { text: string; yes: boolean; why: string }[] = [
  { text: 'Ein Viereck hat parallele Seiten nur an einem Paar. Kann das ein Trapez sein?', yes: true, why: DEFINE.trapez },
  { text: 'Hat ein Drachenviereck immer parallele Seiten?', yes: false, why: 'Ein Drachenviereck wie ein Flugdrachen hat keine parallelen Seiten.' },
  { text: 'Sind beim Drachenviereck benachbarte Seiten gleich lang?', yes: true, why: DEFINE.drachen },
  { text: 'Sind bei jedem Trapez alle vier Seiten gleich lang?', yes: false, why: 'Bei einem Trapez können die Seiten verschieden lang sein.' },
  { text: 'Hat jedes Trapez vier rechte Winkel?', yes: false, why: 'Ein Trapez braucht nur ein Paar paralleler Seiten.' },
  { text: 'Kann ein Trapez zwei rechte Winkel haben?', yes: true, why: 'Eine Seite kann senkrecht auf den parallelen Seiten stehen.' },
];

/** Stufe 2, AB III: reasoning about Trapez and Drachenviereck. */
function reasoningS2(rng: Rng, ab: Ab): Exercise {
  const s = rng.pick(STATEMENTS_S2);
  return build(SKILL, 2, {
    key: `aussage:${STATEMENTS_S2.indexOf(s)}`,
    ab,
    prompt: s.text,
    answer: yesNo(rng, s.yes, s.why, s.why),
    hints: ['Zeichne die Figur auf ein Blatt.', 'Suche ein Beispiel. Passt die Aussage dazu?'],
    steps: [s.why, `Die Antwort ist ${s.yes ? 'Ja' : 'Nein'}.`],
    praise: 'Du hast die Aussage an einer Figur geprüft.',
    srText: toSpeech(s.text),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const YES = 'Stimmt';
const NO = 'Stimmt nicht';

/** A statement "Jede … ist …" with its answer. */
function everyText(x: Kind, y: Kind): string {
  return `${x === 'raute' ? 'Jede Raute' : `Jedes ${NAME[x]}`} ist ${article(y)}.`;
}

const PROPERTY: Record<Kind, string> = {
  quadrat: 'gleich lange Seiten und rechte Winkel',
  rechteck: 'vier rechte Winkel',
  raute: 'vier gleich lange Seiten',
  parallelogramm: 'zwei Paare paralleler Seiten',
  trapez: 'ein Paar paralleler Seiten',
  drachen: 'gleich lange benachbarte Seiten',
};

function statement(rng: Rng, ab: Ab, x: Kind, y: Kind, kmk: string[], key: string): Exercise {
  const holds = IS_ALSO[x].includes(y);
  const text = everyText(x, y);
  const whyYes = `Nicht jede solche Figur hat ${PROPERTY[y]}.`;
  const whyNo = x === 'quadrat' && y === 'rechteck' ? 'Ein Quadrat hat auch vier rechte Winkel.' : `Prüfe: ${capital(article(y))} braucht ${PROPERTY[y]}. Das gilt hier immer.`;
  return build(SKILL, 3, {
    key,
    ab,
    prompt: `${text} Stimmt diese Aussage?`,
    answer: holds ? makeChoice(rng, { label: YES }, [{ label: NO, whyWrong: whyNo }], { order: [YES, NO] }) : makeChoice(rng, { label: NO }, [{ label: YES, whyWrong: whyYes }], { order: [YES, NO] }),
    hints: [`${capital(article(y))} braucht ${PROPERTY[y]}.`, `Hat ${x === 'raute' ? 'jede Raute' : `jedes ${NAME[x]}`} diese Eigenschaft immer?`],
    steps: [`${capital(article(y))} braucht ${PROPERTY[y]}.`, holds ? `${x === 'raute' ? 'Jede Raute' : `Jedes ${NAME[x]}`} hat das auch.` : `Nicht ${x === 'raute' ? 'jede Raute' : `jedes ${NAME[x]}`} hat das.`, `Die Aussage ${holds ? 'stimmt' : 'stimmt nicht'}.`],
    praise: rng.pick(['Du hast die Eigenschaften der Figuren verglichen.', 'Du hast die Aussage an den Eigenschaften geprüft.']),
    srText: toSpeech(`${text} Stimmt diese Aussage?`),
    kmk,
  });
}

const CORE_PAIRS: readonly [Kind, Kind][] = [['quadrat', 'rechteck'], ['rechteck', 'quadrat'], ['quadrat', 'raute'], ['raute', 'quadrat'], ['rechteck', 'parallelogramm'], ['raute', 'parallelogramm']];

/** Stufe 3, AB I: the central statements. */
function coreStatement(rng: Rng, ab: Ab): Exercise {
  const [x, y] = rng.pick(CORE_PAIRS);
  return statement(rng, ab, x, y, [...KMK, 'PK.argumentieren'], `kern:${x}.${y}`);
}

/** Stufe 3, AB II: any two figures. */
function anyStatement(rng: Rng, ab: Ab): Exercise {
  const kinds: Kind[] = ['quadrat', 'rechteck', 'raute', 'parallelogramm', 'trapez', 'drachen'];
  const pairs: [Kind, Kind][] = kinds.flatMap((x) => kinds.filter((y) => y !== x && !(y === 'trapez' && x !== 'drachen')).map((y): [Kind, Kind] => [x, y]));
  const [x, y] = rng.pick(pairs);
  return statement(rng, ab, x, y, [...KMK, 'PK.argumentieren'], `paar:${x}.${y}`);
}

const SPECIAL: { text: string; right: Kind; pool: Kind[]; why: string }[] = [
  { text: 'Eine Figur ist Rechteck und Raute zugleich. Wie heißt die Figur am genauesten?', right: 'quadrat', pool: ['quadrat', 'parallelogramm', 'trapez', 'drachen'], why: 'Rechte Winkel vom Rechteck, gleich lange Seiten von der Raute.' },
  { text: 'Ein Parallelogramm hat einen rechten Winkel. Wie heißt die Figur am genauesten?', right: 'rechteck', pool: ['rechteck', 'raute', 'trapez', 'drachen'], why: 'Mit einem rechten Winkel sind alle vier Winkel rechte Winkel.' },
  { text: 'Eine Raute hat einen rechten Winkel. Wie heißt die Figur am genauesten?', right: 'quadrat', pool: ['quadrat', 'rechteck', 'trapez', 'drachen'], why: 'Die Seiten bleiben gleich lang, alle Winkel sind rechte Winkel.' },
  { text: 'Ein Rechteck hat vier gleich lange Seiten. Wie heißt die Figur am genauesten?', right: 'quadrat', pool: ['quadrat', 'raute', 'parallelogramm', 'trapez'], why: 'Rechte Winkel und gleich lange Seiten ergeben ein Quadrat.' },
  { text: 'Ein Drachenviereck hat vier gleich lange Seiten. Wie heißt die Figur am genauesten?', right: 'raute', pool: ['raute', 'rechteck', 'trapez', 'parallelogramm'], why: 'Vier gleich lange Seiten ohne weitere Angabe ergeben eine Raute.' },
  { text: 'Ein Viereck hat zwei Paare paralleler Seiten. Wie heißt die Figur am genauesten?', right: 'parallelogramm', pool: ['parallelogramm', 'quadrat', 'drachen', 'raute'], why: 'Zwei Paare paralleler Seiten ergeben ein Parallelogramm.' },
];

/** Stufe 3, AB III: a special case gets a more exact name. */
function specialCase(rng: Rng, ab: Ab): Exercise {
  const s = rng.pick(SPECIAL);
  return build(SKILL, 3, {
    key: `sonderfall:${SPECIAL.indexOf(s)}`,
    ab,
    prompt: s.text,
    answer: makeChoice(rng, { label: NAME[s.right] }, wrongNames(s.right, s.pool)),
    hints: ['Zeichne die Figur mit der neuen Eigenschaft.', 'Welche Seiten und Winkel hat deine Zeichnung jetzt?'],
    steps: [s.why, `Die Figur ist ${article(s.right)}.`],
    praise: 'Du hast zwei Eigenschaften zusammen gedacht.',
    srText: toSpeech(s.text),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: namePicture, 2: nameFromText, 3: missingSides },
  2: { 1: nameSpecial, 2: parallelSides, 3: reasoningS2 },
  3: { 1: coreStatement, 2: anyStatement, 3: specialCase },
};

export const viereckeSkill: SkillDef = {
  ...SKILL,
  title: 'Vierecke',
  description: 'Du ordnest Vierecke nach ihren Eigenschaften.',
  stufen: {
    1: 'Quadrat, Rechteck, Parallelogramm und Raute nach Seiten',
    2: 'Trapez und Drachenviereck; parallele Seiten',
    3: 'Stimmt es: Jedes Quadrat ist ein Rechteck?',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
