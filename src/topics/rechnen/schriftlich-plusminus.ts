/**
 * Schriftlich plus und minus (docs/research.md §6). Stufe 1: two numbers up to 6 digits, at most two carries. Stufe 2: up to 9 digits, zeros, three
 * Summanden. Stufe 3: beyond 1 Milliarde, Fehlerdetektiv, missing digits. The subtraction method comes from the context and is never mixed.
 */
import { BOX, MINUS, fmt, toSpeech } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, MultiField, Rng, SkillDef, Stufe, SubtractionMethod, WrittenMask, WrittenOp } from '../../core/types';
import { digitAt, layoutAdd, layoutSub, numLength, placeDative, placeName, writtenVisual } from '../../core/written';
import { multiBugs, pickPerson, targetAb } from '../shared';
import { addLines, attempt, canon, carryCount, equationOf, expressionOf, item, maskedSpeech, randLen, reverseItem, subLines, withInnerZeros, writtenItem, writtenSteps } from './common';

const SKILL = { id: 'rechnen.schriftlich-plusminus', topicId: 'rechnen' } as const;
const KMK = ['ZO.schriftlich'];
const LABELS = ['A', 'B', 'C'];

/** Number of carries (add) or regroupings (sub). */
function hard(op: WrittenOp, operands: number[], method: SubtractionMethod): number {
  return op === 'add' ? carryCount(operands) : layoutSub(operands[0], operands[1], method).regroupings;
}

/** A regrouping across a zero, or an extension at a zero, by either method: the content of Stufe 2, where one regrouping changes more than two columns. */
const zeroRegrouping = (a: number, b: number) => layoutSub(a, b, 'abziehen').acrossZero || layoutSub(a, b, 'ergaenzen').acrossZero;

/** Two numbers of the given lengths with a limit on carries or regroupings. plain: no regrouping at a zero, and then both methods count alike. */
function pair(rng: Rng, op: 'add' | 'sub', lenA: number, lenB: number, method: SubtractionMethod, minHard: number, maxHard: number, plain = false): number[] {
  return attempt<number[]>(
    () => {
      const a = randLen(rng, lenA);
      const b = randLen(rng, lenB);
      const ops = op === 'add' ? [a, b] : [Math.max(a, b), Math.min(a, b)];
      if (op === 'sub' && (ops[0] === ops[1] || (plain && zeroRegrouping(ops[0], ops[1])))) return null;
      const h = hard(op, ops, method);
      return h >= minHard && h <= maxHard ? ops : null;
    },
    () => (op === 'add' ? [47_385, 21_547] : [73_452, 21_687]),
  );
}

/** A Minuend with a run of zeros, so that the regrouping goes across them. */
function acrossZero(rng: Rng, lenA: number, lenB: number, method: SubtractionMethod): number[] {
  return attempt<number[]>(
    () => {
      const ds = String(randLen(rng, lenA)).split('');
      const start = rng.int(1, lenA - 3);
      const run = rng.int(2, 3);
      for (let i = start; i < Math.min(start + run, lenA - 1); i++) ds[i] = '0';
      const a = Number(ds.join(''));
      const b = randLen(rng, lenB);
      if (b >= a) return null;
      return layoutSub(a, b, method).acrossZero ? [a, b] : null;
    },
    () => [30_040_052, 1_234_567],
  );
}

/** Three Summanden of the given lengths, the sum staying under `max`, with a carry of 2 somewhere. */
function threeSummanden(rng: Rng, lens: [number, number, number], zeros: boolean, max: number): number[] {
  return attempt<number[]>(
    () => {
      const ops = lens.map((l, i) => (zeros && i === 0 ? withInnerZeros(rng, l, 2) : randLen(rng, l)));
      return ops.reduce((s, n) => s + n, 0) <= max && layoutAdd(ops).carries.some((c) => c >= 2) ? ops : null;
    },
    () => [4_805_079, 678_945, 2_789_368],
  );
}

/** The Umkehraufgabe: one number of a sum or a difference is missing, and the written calculation finds it. */
function reversed(rng: Rng, stufe: Stufe, ab: Ab, lenA: number, lenB: number, method: SubtractionMethod, maxHard: number): Exercise {
  const form = rng.pick(['summand', 'minuend', 'subtrahend'] as const);
  const op = form === 'minuend' ? 'add' : 'sub';
  const plain = stufe === 1;
  // a sum as the missing Minuend stays inside the Stufe's digits
  const operands = attempt(() => {
    const ops = pair(rng, op, lenA, lenB, method, 1, maxHard, plain);
    return op === 'add' && numLength(ops[0] + ops[1]) > lenA ? null : ops;
  }, () => pair(rng, op, lenA - 1, lenB - 1, method, 1, maxHard, plain));
  // summand: operands[1] + □ = operands[0]. subtrahend: operands[0] − □ = operands[1]. minuend: □ − operands[1] = operands[0].
  const expression = form === 'summand'
    ? `${fmt(operands[1])} + ${BOX} = ${fmt(operands[0])}`
    : form === 'subtrahend'
      ? `${fmt(operands[0])} ${MINUS} ${BOX} = ${fmt(operands[1])}`
      : `${BOX} ${MINUS} ${fmt(operands[1])} = ${fmt(operands[0])}`;
  const wrong = form === 'minuend' ? Math.abs(operands[0] - operands[1]) : operands[0] + operands[1];
  const undo = form === 'minuend' ? 'Was hebt das Minus auf?' : form === 'summand' ? 'Was hebt das Plus auf?' : 'Die fehlende Zahl ist kleiner als die erste Zahl.';
  return reverseItem(SKILL, stufe, {
    ab,
    op,
    operands,
    method,
    kmk: KMK,
    keyPart: `umkehr-${form}`,
    expression,
    extraBugs: [{ id: 'umkehr-richtung', match: wrong, hint: `Mach die Probe. ${undo}` }],
    hints: [form === 'minuend' ? 'Die fehlende Zahl ist die größte. Addiere die beiden anderen.' : 'Zieh die bekannte Zahl von der größeren Zahl ab.', 'Setz dein Ergebnis zum Schluss ein. Stimmt die Gleichung?'],
    praise: 'Du hast die passende Umkehraufgabe gewählt.',
  });
}

// ─── Fehlerdetektiv ──────────────────────────────────────────────────────────

interface Planted {
  op: 'add' | 'sub';
  operands: number[];
  /** Wrong result, with one carry or regrouping lost. */
  shown: number;
  /** Rightmost place where it differs. */
  place: number;
}

/** One carry or regrouping lost at a place where the shown digit really changes and the length stays. */
function plant(rng: Rng, len: number, method: SubtractionMethod): Planted {
  return attempt<Planted>(
    () => {
      const op = rng.pick(['add', 'sub'] as const);
      const operands = pair(rng, op, len, rng.int(len - 2, len), method, 2, len);
      const correct = op === 'add' ? operands[0] + operands[1] : operands[0] - operands[1];
      const places = op === 'add'
        ? layoutAdd(operands).carries.flatMap((c, p) => (c > 0 && p < numLength(correct) - 1 ? [p] : []))
        : layoutSub(operands[0], operands[1], method).columns.flatMap((c, p) => ((c.regrouped || c.extended) && p + 1 < numLength(correct) - 1 ? [p + 1] : []));
      if (places.length === 0) return null;
      const place = rng.pick(places);
      const shown = op === 'add' ? correct - 10 ** place : correct + 10 ** place;
      return numLength(shown) === numLength(correct) && digitAt(shown, place) !== digitAt(correct, place) ? { op, operands, shown, place } : null;
    },
    () => ({ op: 'add', operands: [47_385_216, 21_547_318], shown: 68_932_434, place: 2 }),
  );
}

function shownVisual(pl: Planted, method: SubtractionMethod) {
  return writtenVisual({ type: 'written', op: pl.op, operands: [...pl.operands], method: pl.op === 'sub' ? method : undefined, showSolution: false, shownResult: pl.shown });
}

const shownSpeech = (pl: Planted) => `${toSpeech(expressionOf(pl.op, pl.operands))} gleich ${toSpeech(fmt(pl.shown))}`;

/** The worked line of the place where the mistake shows. */
function placeLine(pl: Planted, method: SubtractionMethod): string {
  return pl.op === 'add' ? addLines(pl.operands)[pl.place] : subLines(pl.operands[0], pl.operands[1], method)[pl.place];
}

/** What went wrong at this place. */
function slipText(pl: Planted, method: SubtractionMethod): string {
  return pl.op === 'add' ? 'Dort fehlt der Übertrag.' : method === 'abziehen' ? 'Nach dem Entbündeln ist diese Stelle 1 kleiner.' : 'Dort fehlt die gemerkte 1.';
}

/** "Wo steckt der Fehler?": choose the place. */
function whereItem(rng: Rng, stufe: Stufe, ab: Ab, len: number, method: SubtractionMethod): Exercise {
  const pl = plant(rng, len, method);
  const correct = pl.op === 'add' ? pl.operands[0] + pl.operands[1] : pl.operands[0] - pl.operands[1];
  const width = numLength(correct);
  const low = Math.max(0, Math.min(pl.place - rng.int(0, 2), width - 4));
  const places = Array.from({ length: Math.min(4, width) }, (_, i) => low + i).reverse();
  const options: ChoiceOption[] = places.map((q) => {
    const label = `Bei den ${placeDative(q)}`;
    if (q === pl.place) return { label };
    if (q < pl.place) return { label, whyWrong: `${label} stimmt die Ziffer. Prüfe weiter links.` };
    return { label, whyWrong: digitAt(correct, q) !== digitAt(pl.shown, q) ? 'Hier stimmt die Ziffer auch nicht. Der Fehler fängt aber weiter rechts an.' : `${label} stimmt die Ziffer. Prüfe Spalte für Spalte von rechts.` };
  });
  const who = pickPerson(rng).name;
  const prompt = 'Prüfe Spalte für Spalte von rechts. Wo steckt der Fehler?';
  return item(SKILL, stufe, {
    key: `wo:${canon(pl.op, pl.operands)}:${pl.place}:${method[0]}`,
    ab,
    context: `${who} rechnet schriftlich.`,
    prompt,
    visual: shownVisual(pl, method),
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Rechne jede Spalte selbst nach. Fang bei den Einern an.', 'Vergleiche deine Ziffer mit der Ziffer im Ergebnis. Wo ist die Ziffer zuerst anders?'],
    steps: [
      ...(pl.place > 0 ? [`Bis zu den ${placeDative(pl.place - 1)} stimmt alles.`] : []),
      `So geht es richtig. ${placeLine(pl, method)}`,
      slipText(pl, method),
      { text: `Der Fehler steckt bei den ${placeDative(pl.place)}. Richtig ist ${equationOf(pl.op, pl.operands)}.`, visual: writtenVisual({ type: 'written', op: pl.op, operands: [...pl.operands], method: pl.op === 'sub' ? method : undefined, showSolution: true }) },
    ],
    praise: 'Du hast Spalte für Spalte genau geprüft.',
    srText: `${who} rechnet schriftlich: ${shownSpeech(pl)}. ${prompt}`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** "Rechne die Aufgabe richtig": the written answer, with the wrong result still on the screen. */
function fixItem(rng: Rng, stufe: Stufe, ab: Ab, len: number, method: SubtractionMethod): Exercise {
  const pl = plant(rng, len, method);
  const who = pickPerson(rng).name;
  const prompt = 'Such den Fehler. Rechne die Aufgabe dann richtig.';
  return writtenItem(SKILL, stufe, {
    ab,
    op: pl.op,
    operands: pl.operands,
    method,
    kmk: [...KMK, 'PK.argumentieren'],
    keyPart: 'berichtigen',
    context: `${who} rechnet schriftlich.`,
    prompt,
    visual: shownVisual(pl, method),
    extraBugs: [{ id: 'fehler-uebernommen', match: pl.shown, hint: 'Das ist noch das Ergebnis mit dem Fehler. Rechne jede Spalte selbst.' }],
    hints: ['Rechne selbst Spalte für Spalte und vergleiche mit der Rechnung oben.', `Schau besonders genau auf die ${placeName(pl.place)}.`],
    steps: [`Der Fehler steckt bei den ${placeDative(pl.place)}. ${slipText(pl, method)}`, ...writtenSteps(pl.op, pl.operands, method, false).slice(-4)],
    praise: 'Du hast den Fehler gefunden und richtig gerechnet.',
    say: `${who} rechnet schriftlich: ${shownSpeech(pl)}. ${prompt}`,
  });
}

// ─── Ziffernrätsel ───────────────────────────────────────────────────────────

/**
 * Missing digits: at most one gap in each column, so the digits follow from the columns one by one (a column with one unknown has one solution).
 * The first digit of a number stays visible. A difference is read as the sum Ergebnis + untere Zahl = obere Zahl.
 */
function digitsItem(rng: Rng, stufe: Stufe, ab: Ab, len: number, gaps: number, method: SubtractionMethod): Exercise {
  const op = rng.pick(['add', 'sub'] as const);
  const operands = pair(rng, op, len, len - 1, method, 2, len);
  const result = op === 'add' ? operands[0] + operands[1] : operands[0] - operands[1];
  // as a sum: two Summanden and their sum
  const [x, y] = op === 'add' ? operands : [result, operands[1]];
  const lay = layoutAdd([x, y]);
  // a place every number of the column has; the leading digits stay visible
  const free = Array.from({ length: Math.min(numLength(result), numLength(operands[1])) - 1 }, (_, p) => p);
  const places = rng.sample(free, Math.min(gaps, free.length)).sort((p, q) => p - q);
  const masks: WrittenMask[] = places.map((place, i) => {
    const row = rng.pick(['a', 'b', 'r'] as const);
    return row === 'r' ? { row: 'result', place, label: LABELS[i] } : { row: 'operand', index: row === 'a' ? 0 : 1, place, label: LABELS[i] };
  });
  const digitOf = (m: WrittenMask) => digitAt(m.row === 'result' ? result : operands[m.index ?? 0], m.place);
  const fields: MultiField[] = masks.map((m) => ({ id: m.label, value: digitOf(m), before: `${m.label} =`, label: `Ziffer ${m.label}` }));
  /** This gap stands in the sum, not in a Summand: it is the digit of the column sum. */
  const inSum = (m: WrittenMask) => (op === 'add' ? m.row === 'result' : m.row === 'operand' && (m.index ?? 0) === 0);
  const noCarry = masks.find((m) => lay.carries[m.place] > 0);
  const lines = masks.map((m) => {
    const p = m.place;
    const carry = lay.carries[p] ? ` + ${lay.carries[p]}` : '';
    return `Bei den ${placeDative(p)} passt nur ${m.label} = ${digitOf(m)}: ${digitAt(x, p)} + ${digitAt(y, p)}${carry} = ${digitAt(x, p) + digitAt(y, p) + lay.carries[p]}.`;
  });
  const prompt = 'Rechne die Spalten von rechts. Welche Ziffern fehlen?';
  return item(SKILL, stufe, {
    key: `raetsel:${canon(op, operands)}:${masks.map((m) => `${m.row[0]}${m.index ?? ''}${m.place}`).join('-')}`,
    ab,
    prompt,
    visual: writtenVisual({ type: 'written', op, operands: [...operands], method: op === 'sub' ? method : undefined, showSolution: false, shownResult: result, masks }),
    answer: { kind: 'multi', fields },
    hints: [op === 'add' ? 'Rechne die Spalten von rechts. Achte auf jeden Übertrag.' : 'Mach die Probe: Ergebnis plus untere Zahl ergibt die obere Zahl.', 'In jeder Spalte fehlt höchstens eine Ziffer. Die Ziffer passt genau zur Spalte.'],
    steps: [...lines, `Also: ${fields.map((f) => `${f.id} = ${f.value}`).join(', ')}.`],
    bugs: multiBugs([
      noCarry && {
        id: 'uebertrag-vergessen',
        match: { [noCarry.label]: inSum(noCarry) ? (digitOf(noCarry) - lay.carries[noCarry.place] + 10) % 10 : (digitOf(noCarry) + lay.carries[noCarry.place]) % 10 },
        hint: 'Prüfe die Stelle mit dem Übertrag noch einmal.',
      },
    ], fields),
    praise: 'Du hast die Ziffern aus den Spalten erschlossen.',
    srText: `${prompt} ${maskedSpeech(operands[0], masks, 'operand', 0)} ${op === 'add' ? 'plus' : 'minus'} ${maskedSpeech(operands[1], masks, 'operand', 1)} gleich ${maskedSpeech(result, masks, 'result')}.`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

// ─── The skill ───────────────────────────────────────────────────────────────

function stufe1(rng: Rng, ab: Ab, method: SubtractionMethod): Exercise {
  if (ab === 3) return reversed(rng, 1, ab, rng.int(5, 6), 5, method, 2);
  const op = rng.pick(['add', 'sub'] as const);
  const operands = ab === 1 ? pair(rng, op, rng.int(4, 5), 4, method, 0, 1, true) : pair(rng, op, rng.int(5, 6), 5, method, 2, 2, true);
  return writtenItem(SKILL, 1, { ab, op, operands, method, kmk: KMK });
}

function stufe2(rng: Rng, ab: Ab, method: SubtractionMethod): Exercise {
  if (ab === 1) {
    const op = rng.pick(['add', 'sub'] as const);
    return writtenItem(SKILL, 2, { ab, op, operands: pair(rng, op, rng.int(7, 8), 7, method, 2, 8), method, kmk: KMK });
  }
  if (ab === 2) {
    if (rng.chance(0.5)) return writtenItem(SKILL, 2, { ab, op: 'add', operands: threeSummanden(rng, [8, rng.int(6, 7), 7], false, 999_999_999), method, kmk: KMK });
    return writtenItem(SKILL, 2, { ab, op: 'sub', operands: acrossZero(rng, 8, rng.int(6, 7), method), method, kmk: KMK });
  }
  const kind = rng.pick(['drei', 'null', 'umkehr'] as const);
  if (kind === 'umkehr') return reversed(rng, 2, ab, 9, 8, method, 9);
  if (kind === 'null') return writtenItem(SKILL, 2, { ab, op: 'sub', operands: acrossZero(rng, 9, rng.int(7, 8), method), method, kmk: KMK });
  return writtenItem(SKILL, 2, { ab, op: 'add', operands: threeSummanden(rng, [8, 8, rng.int(6, 7)], true, 999_999_999), method, kmk: KMK });
}

function stufe3(rng: Rng, ab: Ab, method: SubtractionMethod, beyond: boolean): Exercise {
  // without "beyond 1 Milliarde" the Stufe keeps its other content, the Fehlerdetektiv and the missing digits
  if (ab === 1) {
    if (!beyond) return whereItem(rng, 3, ab, 9, method);
    const op = rng.pick(['add', 'sub'] as const);
    return writtenItem(SKILL, 3, { ab, op, operands: pair(rng, op, rng.int(10, 11), rng.int(9, 10), method, 2, 11), method, kmk: KMK });
  }
  const len = beyond ? 10 : 9;
  if (ab === 2) return rng.chance(0.5) ? whereItem(rng, 3, ab, len, method) : digitsItem(rng, 3, ab, len, 2, method);
  const kind = rng.pick(beyond ? (['berichtigen', 'raetsel', 'gross'] as const) : (['berichtigen', 'raetsel'] as const));
  if (kind === 'berichtigen') return fixItem(rng, 3, ab, len, method);
  if (kind === 'raetsel') return digitsItem(rng, 3, ab, len, 3, method);
  return writtenItem(SKILL, 3, { ab, op: 'add', operands: threeSummanden(rng, [12, 11, 10], true, 9_999_999_999_999), method, kmk: KMK });
}

export const schriftlichPlusMinusSkill: SkillDef = {
  ...SKILL,
  title: 'Schriftlich plus und minus',
  description: 'Du rechnest auch sehr große Zahlen schriftlich.',
  stufen: {
    1: 'Zwei Zahlen bis 6 Stellen, höchstens zwei Überträge',
    2: 'Bis 9 Stellen, Nullen und drei Summanden',
    3: 'Über 1 Milliarde, Fehlerdetektiv und fehlende Ziffern',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const method = ctx.subtractionMethod;
    if (stufe === 1) return stufe1(rng, ab, method);
    if (stufe === 2) return stufe2(rng, ab, method);
    return stufe3(rng, ab, method, ctx.ranges.beyondMilliarde);
  },
};
