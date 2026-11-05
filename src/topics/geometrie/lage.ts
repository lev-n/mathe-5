/**
 * Parallel und senkrecht (docs/research.md §6). Stufe 1: the usual position (waagerecht and senkrecht). Stufe 2: turned lines, the signs ∥ and ⊥ and the
 * Geodreieck. Stufe 3: counting pairs in a figure and reasoning about three lines.
 */
import { toSpeech } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, numberBugs, targetAb } from '../shared';
import { BASE_LINE, LINE_LETTERS, fitLabels, labelledChoice, placeLabels, yesNo } from './helpers';

const SKILL = { id: 'geometrie.lage', topicId: 'geometrie' } as const;
const KMK = ['RF.lage'];

type Relation = 'parallel' | 'senkrecht' | 'weder';
const WORD: Record<Relation, string> = { parallel: 'parallel', senkrecht: 'senkrecht', weder: 'weder noch' };
const TURNS = [20, 25, 30, 35, 40, 50, 55, 60, 65, 70, 110, 115, 120, 125, 130, 140, 145, 150, 155, 160];

const WHY_PARALLEL = 'Parallele Linien haben überall denselben Abstand und treffen sich nie.';
const WHY_SENKRECHT = 'Senkrechte Linien bilden einen rechten Winkel. Prüfe den Winkel an der Kreuzung.';
const WHY_WEDER = 'Prüfe zuerst den Abstand. Prüfe dann den Winkel an der Kreuzung.';
const WHY: Record<Relation, string> = { parallel: WHY_PARALLEL, senkrecht: WHY_SENKRECHT, weder: WHY_WEDER };

/** Two lines in this relation, the first at `angle`. */
function pair(rng: Rng, relation: Relation, angle: number, letters: readonly string[]): VisualOf<'lines'>['lines'] {
  if (relation === 'parallel') {
    const gap = rng.pick([30, 40, 50, 60, 70]);
    return [{ angle, offset: -gap, label: letters[0] }, { angle, offset: gap, label: letters[1] }];
  }
  const second = relation === 'senkrecht' ? angle + 90 : angle + rng.pick([50, 60, 70, 110, 120]);
  return [{ angle, offset: rng.pick([-25, 0, 25]), label: letters[0] }, { angle: second, offset: rng.pick([-25, 0, 25]), label: letters[1] }];
}

/** A pair in this relation at one of these angles, with its labels inside the picture. */
const fittedPair = (rng: Rng, relation: Relation, angles: readonly number[], letters: readonly string[]) => fitLabels(() => ({ lines: pair(rng, relation, rng.pick(angles), letters) })).lines;

const lineId = (lines: VisualOf<'lines'>['lines']) => lines.map((l) => `${l.angle}.${l.offset}`).join('-');

function relationOptions(right: Relation, withWeder: boolean): ChoiceOption[] {
  const all: Relation[] = withWeder ? ['parallel', 'senkrecht', 'weder'] : ['parallel', 'senkrecht'];
  return all.filter((r) => r !== right).map((r) => ({ label: WORD[r], whyWrong: WHY[r] }));
}

function relationSteps(relation: Relation, a: string, b: string): string[] {
  if (relation === 'parallel') return [`${a} und ${b} treffen sich auch verlängert nie.`, 'Der Abstand bleibt überall gleich.', `${a} und ${b} sind parallel.`];
  if (relation === 'senkrecht') return [`${a} und ${b} kreuzen sich.`, 'An der Kreuzung ist ein rechter Winkel.', `${a} und ${b} sind senkrecht zueinander.`];
  return [`${a} und ${b} kreuzen sich. Parallel sind die Linien also nicht.`, 'An der Kreuzung ist kein rechter Winkel.', `${a} und ${b} sind weder parallel noch senkrecht.`];
}

const SPOKEN: Record<Relation, string> = { parallel: 'Zwei Linien.', senkrecht: 'Zwei Linien, die sich kreuzen.', weder: 'Zwei Linien, die sich kreuzen.' };

/** Stufe 1, AB I: two lines in the usual position. */
function usualPair(rng: Rng, ab: Ab): Exercise {
  const letters = rng.pick(LINE_LETTERS);
  const relation = rng.pick<Relation>(['parallel', 'senkrecht']);
  const lines = fittedPair(rng, relation, [0, 90], letters);
  const [a, b] = letters;
  return build(SKILL, 1, {
    key: `paar:${relation}:${lineId(lines)}:${a}`,
    ab,
    prompt: `Wie liegen die Linien ${a} und ${b} zueinander?`,
    visual: { type: 'lines', lines },
    answer: makeChoice(rng, { label: WORD[relation] }, relationOptions(relation, false), { order: ['parallel', 'senkrecht'] }),
    hints: ['Verlängere die Linien im Kopf. Treffen sich die Linien?', 'Prüfe den Winkel an der Kreuzung.'],
    steps: relationSteps(relation, a, b),
    praise: rng.pick(['Du hast die Linien im Kopf verlängert.', 'Du hast auf den Winkel und den Abstand geachtet.']),
    srText: toSpeech(`${SPOKEN[relation]} ${relation === 'parallel' ? 'Beide laufen in dieselbe Richtung.' : 'Eine liegt waagerecht, eine steht aufrecht.'} Wie liegen ${a} und ${b} zueinander?`),
    kmk: KMK,
  });
}

/** Stufe 1, AB II: three lines. Find the parallel pair or the line senkrecht to a given one. */
function threeLines(rng: Rng, ab: Ab): Exercise {
  const letters = rng.shuffle(rng.pick(LINE_LETTERS));
  const [a, b, c] = letters;
  const angle = rng.pick([0, 90]);
  const gap = rng.pick([40, 50, 60]);
  const { lines } = fitLabels(() => ({ lines: [{ angle, offset: -gap, label: a }, { angle, offset: gap, label: b }, { angle: angle + 90, offset: rng.pick([-40, 0, 40]), label: c }] }));
  const asksPair = rng.chance(0.5);
  const key = `drei:${asksPair ? 'paar' : 'senkrecht'}:${lineId(lines)}:${letters.join('')}`;
  const steps = [`${a} und ${b} laufen in dieselbe Richtung.`, `${c} kreuzt ${a} und ${b} im rechten Winkel.`];
  const text = `Drei Linien. ${a} und ${b} laufen in dieselbe Richtung. ${c} steht quer dazu.`;
  if (asksPair) {
    const order = [`${a} und ${b}`, `${a} und ${c}`, `${b} und ${c}`].sort();
    return build(SKILL, 1, {
      key,
      ab,
      prompt: 'Welche zwei Linien sind parallel?',
      visual: { type: 'lines', lines },
      answer: labelledChoice(rng, { label: `${a} und ${b}` }, [{ label: `${a} und ${c}`, whyWrong: `${a} und ${c} kreuzen sich. Parallele Linien treffen sich nie.` }, { label: `${b} und ${c}`, whyWrong: `${b} und ${c} kreuzen sich. Parallele Linien treffen sich nie.` }], order),
      hints: ['Parallele Linien treffen sich nie.', 'Suche die zwei Linien mit derselben Richtung.'],
      steps: [...steps, { text: `${a} und ${b} sind parallel.`, visual: { type: 'lines', lines, parallelMarks: [[0, 1]] } }],
      praise: 'Du hast die Richtungen der Linien verglichen.',
      srText: toSpeech(`${text} Welche zwei Linien sind parallel?`),
      kmk: KMK,
    });
  }
  const order = [...letters].sort().filter((l) => l !== a);
  return build(SKILL, 1, {
    key,
    ab,
    prompt: `Welche Linie steht senkrecht zu ${a}?`,
    visual: { type: 'lines', lines },
    answer: labelledChoice(rng, { label: c }, [{ label: b, whyWrong: `${b} läuft in dieselbe Richtung wie ${a}. Die zwei Linien sind parallel.` }], order),
    hints: ['Senkrecht heißt: Die Linien bilden einen rechten Winkel.', `Suche die Linie quer zu ${a}.`],
    steps: [...steps, `${c} steht senkrecht zu ${a}.`],
    praise: 'Du hast den rechten Winkel an der Kreuzung gefunden.',
    srText: toSpeech(`${text} Welche Linie steht senkrecht zu ${a}?`),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: lines that do not meet in the picture need not be parallel (parallel-kurz). */
function shortLines(rng: Rng, ab: Ab): Exercise {
  const letters = rng.pick(LINE_LETTERS);
  const [a, b] = letters;
  const isParallel = rng.chance(0.5);
  const { lines } = fitLabels(() => {
    const base = rng.pick([0, 90]);
    const slant = isParallel ? 0 : rng.pick([12, 15, 18, 20]) * (rng.chance(0.5) ? 1 : -1);
    const gap = rng.pick([55, 60, 65, 70]);
    return { lines: [{ angle: base, offset: -gap, label: a }, { angle: base + slant, offset: gap, label: b }] };
  });
  return build(SKILL, 1, {
    key: `kurz:${lineId(lines)}:${a}`,
    ab,
    prompt: `Im Bild treffen sich ${a} und ${b} nicht. Sind ${a} und ${b} parallel?`,
    visual: { type: 'lines', lines },
    answer: yesNo(rng, isParallel, 'Verlängere die Linien. Der Abstand bleibt nicht gleich.', 'Miss den Abstand an zwei Stellen. Der Abstand bleibt gleich.'),
    hints: ['Verlängere die Linien im Kopf. Treffen sich die Linien irgendwann?', 'Vergleiche den Abstand der Linien links und rechts im Bild.'],
    steps: isParallel
      ? ['Der Abstand bleibt überall gleich.', 'Auch verlängert treffen sich die Linien nie.', `${a} und ${b} sind parallel.`]
      : ['Der Abstand ändert sich von einem Ende zum anderen.', 'Verlängert treffen sich die Linien irgendwo.', `${a} und ${b} sind nicht parallel.`],
    praise: 'Du hast über den Bildrand hinaus gedacht.',
    srText: toSpeech(`Zwei Linien ${a} und ${b}, die sich im Bild nicht treffen. ${isParallel ? 'Beide laufen genau in dieselbe Richtung.' : 'Die Richtungen unterscheiden sich ein wenig.'} Sind ${a} und ${b} parallel?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const TURNED_WHY: Record<Relation, string> = {
  parallel: 'Dreh das Bild im Kopf. Parallele Linien treffen sich nie.',
  senkrecht: 'Dreh das Bild im Kopf. Prüfe den rechten Winkel.',
  weder: 'Prüfe zuerst den Abstand. Prüfe dann den Winkel an der Kreuzung.',
};

/** Stufe 2, AB I: turned lines. */
function turnedPair(rng: Rng, ab: Ab): Exercise {
  const letters = rng.pick(LINE_LETTERS);
  const [a, b] = letters;
  const relation = rng.pick<Relation>(['parallel', 'senkrecht', 'weder']);
  const lines = fittedPair(rng, relation, TURNS, letters);
  return build(SKILL, 2, {
    key: `gedreht:${relation}:${lineId(lines)}:${a}`,
    ab,
    prompt: `Wie liegen ${a} und ${b} zueinander?`,
    visual: { type: 'lines', lines },
    answer: makeChoice(rng, { label: WORD[relation] }, (['parallel', 'senkrecht', 'weder'] as Relation[]).filter((r) => r !== relation).map((r) => ({ label: WORD[r], whyWrong: TURNED_WHY[r] })), { order: ['parallel', 'senkrecht', 'weder noch'] }),
    hints: ['Dreh das Bild im Kopf, bis eine Linie waagerecht liegt.', 'Prüfe an der Kreuzung den Winkel. Ohne Kreuzung prüfst du den Abstand.'],
    steps: relationSteps(relation, a, b),
    praise: rng.pick(['Du hast das Bild im Kopf gedreht.', 'Du hast den Winkel auch in schräger Lage geprüft.']),
    srText: toSpeech(`${SPOKEN[relation]} Beide liegen schräg im Bild. ${relation === 'parallel' ? 'Sie laufen in dieselbe Richtung.' : relation === 'senkrecht' ? 'An der Kreuzung ist ein rechter Winkel.' : 'An der Kreuzung ist kein rechter Winkel.'} Wie liegen ${a} und ${b} zueinander?`),
    kmk: KMK,
  });
}

/** Stufe 2, AB II: the signs ∥ and ⊥. The options stay silent, as the voice has no word for these signs; so the spoken text says which option in their fixed order means what. */
function symbols(rng: Rng, ab: Ab): Exercise {
  const letters = rng.pick(LINE_LETTERS);
  const [a, b] = letters;
  const relation = rng.pick<Relation>(['parallel', 'senkrecht']);
  const lines = fittedPair(rng, relation, TURNS, letters);
  const par = `${a} ∥ ${b}`;
  const perp = `${a} ⊥ ${b}`;
  const whyPar = 'Das Zeichen ∥ heißt parallel. Parallele Linien treffen sich nie.';
  const whyPerp = 'Das Zeichen ⊥ heißt senkrecht. Senkrechte Linien bilden einen rechten Winkel.';
  const answer = relation === 'parallel' ? makeChoice(rng, { label: par }, [{ label: perp, whyWrong: whyPerp }], { order: [par, perp] }) : makeChoice(rng, { label: perp }, [{ label: par, whyWrong: whyPar }], { order: [par, perp] });
  return build(SKILL, 2, {
    key: `zeichen:${relation}:${lineId(lines)}:${a}`,
    ab,
    prompt: 'Welche Schreibweise passt zum Bild?',
    visual: { type: 'lines', lines },
    answer: { ...answer, silentOptions: true },
    hints: ['Das Zeichen ∥ zeigt zwei parallele Striche.', 'Das Zeichen ⊥ zeigt zwei Striche im rechten Winkel.'],
    steps: [...relationSteps(relation, a, b).slice(0, 2), `Die Schreibweise ist ${relation === 'parallel' ? par : perp}.`],
    praise: 'Du hast das Bild in Fachzeichen übersetzt.',
    srText: toSpeech(`${SPOKEN[relation]} ${relation === 'parallel' ? 'Beide laufen in dieselbe Richtung.' : 'An der Kreuzung ist ein rechter Winkel.'} Welche Schreibweise passt: die erste Antwort ${a} parallel zu ${b} oder die zweite Antwort ${a} senkrecht zu ${b}?`),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: the Geodreieck lies on a line. Which line goes along its middle? */
function setSquare(rng: Rng, ab: Ab): Exercise {
  const [p, q] = rng.pick([['b', 'c'], ['p', 'q'], ['e', 'f']]);
  const withRight = rng.chance(0.75);
  const right = withRight ? rng.int(0, 1) : -1;
  const { lines, angle, away } = fitLabels(() => {
    const angle = rng.pick([0, 10, 15, 20, 30, 150, 160, 165, 170]);
    const away = rng.pick([25, 30, 35]);
    const lineOf = (i: number) => (i === right ? angle + 90 : angle + 90 + (i === 0 ? away : -away));
    return { angle, away, lines: [{ angle, offset: 0, label: BASE_LINE }, { angle: lineOf(0), offset: 0, label: p }, { angle: lineOf(1), offset: 0, label: q }] };
  });
  const none = 'keine von beiden';
  const why = 'Folge der Mitte des Geodreiecks bis zur Spitze. Dort läuft die senkrechte Linie.';
  const options: [string, ChoiceOption[]] = withRight ? [right === 0 ? p : q, [{ label: right === 0 ? q : p, whyWrong: why }, { label: none, whyWrong: why }]] : [none, [{ label: p, whyWrong: why }, { label: q, whyWrong: why }]];
  const answerLine = withRight ? `Linie ${right === 0 ? p : q} geht durch die Spitze.` : 'Keine der Linien geht durch die Spitze.';
  return build(SKILL, 2, {
    key: `geodreieck:${angle}:${right}:${away}:${p}`,
    ab,
    prompt: `Das Geodreieck liegt auf ${BASE_LINE}. Welche Linie steht senkrecht zu ${BASE_LINE}?`,
    visual: { type: 'lines', lines, geodreieck: 0 },
    answer: makeChoice(rng, { label: options[0] }, options[1], { order: [p, q, none] }),
    hints: [`Die lange Seite des Geodreiecks liegt auf ${BASE_LINE}.`, 'Eine senkrechte Linie geht von der Mitte der langen Seite zur Spitze.'],
    steps: [`Die lange Seite liegt auf ${BASE_LINE}.`, 'Von der Mitte zur Spitze läuft die senkrechte Richtung.', answerLine],
    praise: 'Du hast die Mitte und die Spitze genutzt.',
    srText: toSpeech(`Das Geodreieck liegt auf der Linie ${BASE_LINE}. ${withRight ? `Linie ${right === 0 ? p : q} geht durch die Spitze des Geodreiecks, die andere Linie daneben.` : 'Beide anderen Linien gehen neben der Spitze des Geodreiecks vorbei.'} Welche Linie steht senkrecht zu ${BASE_LINE}?`),
    kmk: KMK,
  });
}

const LETTERS = ['b', 'c', 'd', 'e', 'f', 'n'];
const pairsOf = (n: number) => (n * (n - 1)) / 2;

/** Lines in two directions, evenly spaced. */
function bundles(first: number, second: number, angle: number, turn: number): VisualOf<'lines'>['lines'] {
  const row = (n: number, a: number) => Array.from({ length: n }, (_, i) => ({ angle: a, offset: (i - (n - 1) / 2) * (n > 3 ? 34 : 48) }));
  return [...row(first, angle), ...row(second, angle + turn)].map((l, i) => ({ ...l, label: LETTERS[i] }));
}

const BUNDLE_ANGLES = [0, 10, 15, 20, 30, 150, 160, 170];

/** Two bundles at an angle and a turn whose labels all stay inside the picture. */
function fitBundles(rng: Rng, k: number, m: number, turns: readonly number[]) {
  const fits = BUNDLE_ANGLES.flatMap((angle) => turns.flatMap((turn) => {
    const lines = placeLabels(bundles(k, m, angle, turn));
    return lines ? [{ angle, turn, lines }] : [];
  }));
  return rng.pick(fits);
}

/** Stufe 3, AB I: count the pairs of parallel lines. */
function countParallel(rng: Rng, ab: Ab): Exercise {
  const [k, m] = rng.pick([[3, 2], [4, 1], [3, 3], [2, 2], [3, 1], [4, 2]] as const);
  const { angle, turn, lines } = fitBundles(rng, k, m, [60, 70, 90, 110, 120]);
  const value = pairsOf(k) + pairsOf(m);
  return build(SKILL, 3, {
    key: `paare-parallel:${k}.${m}:${angle}:${turn}`,
    ab,
    prompt: 'Wie viele Paare paralleler Linien hat die Figur?',
    visual: { type: 'lines', lines },
    answer: { kind: 'number', value, unit: value === 1 ? 'Paar' : 'Paare' },
    hints: ['Sortiere die Linien zuerst nach ihrer Richtung.', 'Paare jede Linie mit jeder anderen derselben Richtung. Zähle jedes Paar einmal.'],
    steps: [
      `In der einen Richtung liegen ${k} Linien: ${pairsOf(k)} ${pairsOf(k) === 1 ? 'Paar' : 'Paare'}.`,
      m > 1 ? `In der anderen Richtung liegen ${m} Linien: ${pairsOf(m)} ${pairsOf(m) === 1 ? 'Paar' : 'Paare'}.` : 'In der anderen Richtung liegt nur 1 Linie: kein Paar.',
      `${pairsOf(k)} + ${pairsOf(m)} = ${value}`,
      `Die Figur hat ${value} ${value === 1 ? 'Paar' : 'Paare'}.`,
    ],
    bugs: numberBugs([
      { id: 'paare-linien', match: k, hint: 'Du hast Linien gezählt. Gesucht sind Paare aus zwei Linien.' },
      { id: 'paare-linien', match: k + m, hint: 'Du hast Linien gezählt. Gesucht sind Paare aus zwei Linien.' },
      { id: 'paare-nachbarn', match: k - 1 + Math.max(m - 1, 0), hint: 'Auch Linien mit einer anderen Linie dazwischen bilden ein Paar.' },
    ], value),
    praise: rng.pick(['Du hast jede Linie mit jeder anderen gepaart.', 'Du hast die Linien nach Richtungen sortiert.']),
    srText: toSpeech(`${k + m} Linien. ${k} Linien laufen in eine Richtung, ${m} in eine andere. Wie viele Paare paralleler Linien hat die Figur?`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Stufe 3, AB II: count the pairs of senkrechte lines. */
function countPerpendicular(rng: Rng, ab: Ab): Exercise {
  const [k, m] = rng.pick([[2, 2], [3, 2], [3, 3], [4, 2], [2, 1], [3, 1]] as const);
  const { angle, lines } = fitBundles(rng, k, m, [90]);
  const value = k * m;
  return build(SKILL, 3, {
    key: `paare-senkrecht:${k}.${m}:${angle}`,
    ab,
    prompt: 'Wie viele Paare senkrechter Linien hat die Figur?',
    visual: { type: 'lines', lines },
    answer: { kind: 'number', value, unit: 'Paare' },
    hints: ['Jede Kreuzung mit rechtem Winkel ist ein Paar.', 'Zähle die Kreuzungen einer Linie. Wie viele Linien laufen so?'],
    steps: [`${k} Linien laufen in die eine Richtung, ${m} quer dazu.`, `Jede der ${k} Linien kreuzt ${m === 1 ? 'die eine Linie' : `alle ${m} Linien`} im rechten Winkel.`, `${k} · ${m} = ${value}`, `Die Figur hat ${value} Paare.`],
    bugs: numberBugs([
      { id: 'paare-plus', match: k + m, hint: 'Jede Linie kreuzt alle Linien der anderen Richtung. Rechne mal, nicht plus.' },
      { id: 'paare-linien', match: pairsOf(k) + pairsOf(m), hint: 'Das sind die parallelen Paare. Gesucht sind die senkrechten.' },
    ], value),
    praise: rng.pick(['Du hast die Kreuzungen als Paare gezählt.', 'Du hast Linien mal Linien gerechnet.']),
    srText: toSpeech(`${k + m} Linien. ${k} Linien laufen in eine Richtung, ${m === 1 ? '1 Linie steht' : `${m} Linien stehen`} senkrecht dazu. Wie viele Paare senkrechter Linien hat die Figur?`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

const RULE: Record<string, Relation> = { 'parallel|parallel': 'parallel', 'parallel|senkrecht': 'senkrecht', 'senkrecht|parallel': 'senkrecht', 'senkrecht|senkrecht': 'parallel' };

/** Stufe 3, AB III: what follows for two lines from two statements? */
function threeStatements(rng: Rng, ab: Ab): Exercise {
  const [a, b, c] = rng.shuffle(rng.pick(LINE_LETTERS));
  const first = rng.pick<Relation>(['parallel', 'senkrecht']);
  const second = rng.pick<Relation>(['parallel', 'senkrecht']);
  const result = RULE[`${first}|${second}`];
  const say = (x: string, y: string, r: Relation) => `Linie ${x} ist ${r} zu ${y}`;
  const unknown = 'Das lässt sich nicht sagen';
  const why = 'Zeichne die drei Linien. Dreh dann das Bild, bis eine Linie waagerecht liegt.';
  return build(SKILL, 3, {
    key: `aussagen:${first}:${second}:${a}${b}${c}`,
    ab,
    prompt: `${say(a, b, first)}. ${say(b, c, second)}. Wie liegen ${a} und ${c} zueinander?`,
    answer: makeChoice(rng, { label: WORD[result] }, [{ label: WORD[result === 'parallel' ? 'senkrecht' : 'parallel'], whyWrong: why }, { label: unknown, whyWrong: 'Beide Aussagen zusammen legen die Lage fest. Zeichne die Linien.' }], { order: ['parallel', 'senkrecht', unknown] }),
    hints: [`Zeichne zuerst ${b}. Zeichne dann ${a} und ${c} dazu.`, 'Dreh dein Bild, bis eine Linie waagerecht liegt.'],
    steps: [`${say(a, b, first)}.`, `${say(b, c, second)}.`, `Also sind ${a} und ${c} ${WORD[result]}${result === 'senkrecht' ? ' zueinander' : ''}.`],
    praise: rng.pick(['Du hast die Lage aus zwei Aussagen gefolgert.', 'Du hast dir die drei Linien gezeichnet.']),
    srText: toSpeech(`${say(a, b, first)}. ${say(b, c, second)}. Wie liegen ${a} und ${c} zueinander?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: usualPair, 2: threeLines, 3: shortLines },
  2: { 1: turnedPair, 2: symbols, 3: setSquare },
  3: { 1: countParallel, 2: countPerpendicular, 3: threeStatements },
};

export const lageSkill: SkillDef = {
  ...SKILL,
  title: 'Parallel und senkrecht',
  description: 'Du erkennst parallele und senkrechte Linien.',
  stufen: {
    1: 'Parallel oder senkrecht, in gewohnter Lage',
    2: 'Gedrehte Linien, die Zeichen ∥ und ⊥, Geodreieck',
    3: 'Paare in einer Figur zählen; Aussagen über drei Linien',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
