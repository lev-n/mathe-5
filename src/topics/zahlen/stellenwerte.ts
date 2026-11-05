/**
 * zahlen.stellenwerte: what a digit is worth, and bundling. The Stufe chooses the content (S1 the value of one digit, S2 unordered parts and
 * bundling, S3 Stufenzahlen as a sum and the largest number from digits, with a condition at AB III); AB varies the demand inside it.
 */
import { BOX, TIMES, fmt } from '../../core/format';
import type { Ab, Exercise, GenContext, MultiField, Rng, SkillDef, Visual } from '../../core/types';
import { build, joinDe, multiBugs, numberBugs, targetAb } from '../shared';
import { COLUMNS, PLACE_DATIVE, PLACE_NAME, PV, countOf, digitAt, emptyTable, larger, placeTable, type WholeColumn } from './helpers';

const SKILL = { id: 'zahlen.stellenwerte', topicId: 'zahlen' } as const;
const KMK = ['ZO.grosse-zahlen'];

/** Number from these digits, largest place first. */
const fromDigits = (digits: readonly number[]) => digits.reduce((a, d) => a * 10 + d, 0);

const valueBugs = (digit: number, value: number) => numberBugs([
  { id: 'nur-ziffer', match: digit, hint: 'Die Ziffer allein ist noch nicht ihr Wert. In welcher Spalte steht die Ziffer?' },
  { id: 'stelle-daneben', match: value * 10, hint: 'Zähle die Stellen noch einmal von rechts: Einer, Zehner, Hunderter.' },
  { id: 'stelle-daneben-2', match: value / 10, hint: 'Zähle die Stellen noch einmal von rechts: Einer, Zehner, Hunderter.' },
], value);

function valueOfDigit(rng: Rng, ab: Ab): Exercise {
  // AB I reads the marked column; AB II finds the place without a table
  const digits = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], ab === 1 ? 6 : 7);
  const n = fromDigits(digits);
  const places = COLUMNS.slice(COLUMNS.length - digits.length, COLUMNS.length - 1);
  const c = rng.pick(places) as WholeColumn;
  const digit = digitAt(n, c);
  const value = digit * PV[c];
  return build(SKILL, 1, {
    key: `wert:${n}:${c}`,
    ab,
    prompt: ab === 1 ? 'Welchen Wert hat die Ziffer im markierten Feld?' : `Welchen Wert hat die Ziffer ${digit} in ${fmt(n)}?`,
    ...(ab === 1 ? { visual: placeTable(n, c) } : {}),
    answer: { kind: 'number', value, label: 'Wert der Ziffer' },
    hints: ab === 1 ? ['Lies den Kopf der markierten Spalte.', 'Rechne dann Ziffer mal Stellenwert.'] : ['Trag die Zahl in die Stellentafel ein.', 'Rechne dann Ziffer mal Stellenwert.'],
    steps: [
      { text: `Die ${digit} steht bei den ${PLACE_DATIVE[c]}.`, visual: placeTable(n, c) },
      `Ein Stellenwert dort zählt ${fmt(PV[c])}.`,
      `${digit} ${TIMES} ${fmt(PV[c])} = ${fmt(value)}`,
    ],
    bugs: valueBugs(digit, value),
    praise: 'Du hast die Stelle der Ziffer bestimmt.',
    srText: `Welchen Wert hat die Ziffer ${digit} in der Zahl ${n}?`,
    kmk: KMK,
  });
}

/** The same digit twice: how much more is the left one worth? */
function twoSameDigits(rng: Rng, ab: Ab): Exercise {
  const length = rng.int(6, 7);
  const [digit, ...others] = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const left = rng.int(0, length - 2);
  const right = rng.int(left + 1, Math.min(left + 4, length - 1));
  const digits = Array.from({ length }, (_, i) => (i === left || i === right ? digit : others[i]));
  const n = fromDigits(digits);
  const distance = right - left;
  const factor = 10 ** distance;
  return build(SKILL, 1, {
    key: `zweimal:${n}:${digit}`,
    ab,
    prompt: `In ${fmt(n)} steht die ${digit} zweimal. Wievielmal so viel ist die linke ${digit} wert wie die rechte ${digit}?`,
    visual: placeTable(n),
    answer: { kind: 'number', value: factor, after: 'mal so viel', label: 'Faktor' },
    hints: ['Jede Stelle nach links ist zehnmal so viel wert.', 'Zähle die Schritte von der rechten Ziffer bis zur linken Ziffer.'],
    steps: [
      { text: `Die linke ${digit} steht ${distance} ${distance === 1 ? 'Stelle' : 'Stellen'} weiter links.`, visual: placeTable(n) },
      'Jede Stelle nach links ist zehnmal so viel wert.',
      `Die linke ${digit} ist ${fmt(factor)}-mal so viel wert.`,
    ],
    bugs: numberBugs([
      { id: 'stellen-gezaehlt', match: distance, hint: 'Du hast die Stellen gezählt. Jede Stelle bedeutet zehnmal so viel.' },
      { id: 'stellen-plus', match: distance * 10, hint: 'Jede Stelle nimmt noch einmal mal zehn, nicht plus zehn.' },
    ], factor),
    praise: 'Du hast den Abstand der Stellen genutzt.',
    srText: `In der Zahl ${n} steht die ${digit} zweimal. Wievielmal so viel ist die linke ${digit} wert wie die rechte?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function unorderedParts(rng: Rng, ab: Ab): Exercise {
  const places = rng.sample(COLUMNS.slice(COLUMNS.indexOf('M')), rng.int(3, 4)).sort((a, b) => PV[b] - PV[a]);
  const parts = places.map((c) => ({ c, d: rng.int(1, 9) }));
  const n = parts.reduce((s, p) => s + p.d * PV[p.c], 0);
  let shown = rng.shuffle(parts);
  if (shown.every((p, i) => p === parts[i])) shown = [...shown.slice(1), shown[0]];
  const text = shown.map((p) => countOf(p.d, p.c)).join(' + ');
  return build(SKILL, 2, {
    key: `teile:${shown.map((p) => `${p.d}${p.c}`).join('+')}`,
    ab,
    prompt: 'Schreibe als Zahl.',
    expression: `${text} = ${BOX}`,
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: ['Die Teile stehen durcheinander. Ordne die Teile nach Stellen.', 'Leere Stellen bekommen eine 0.'],
    steps: [`Geordnet: ${parts.map((p) => countOf(p.d, p.c)).join(', ')}.`, { text: 'Leere Stellen bekommen eine 0.', visual: placeTable(n) }, `Zusammen: ${fmt(n)}.`],
    bugs: numberBugs([
      { id: 'reihenfolge-gezeigt', match: fromDigits(shown.map((p) => p.d)), hint: 'Die Teile stehen durcheinander. Ordne zuerst nach Stellen.' },
      { id: 'leere-stelle', match: fromDigits(parts.map((p) => p.d)), hint: 'Trag die Teile in die Stellentafel ein. Leere Stellen bekommen eine 0.' },
    ], n),
    praise: 'Du hast die Teile nach ihren Stellen geordnet.',
    srText: `${text.replace(/ \+ /g, ' plus ')}. Schreibe als Zahl.`,
    kmk: KMK,
  });
}

const BUNDLE_PLACES: readonly WholeColumn[] = ['Z', 'H', 'T', 'ZT', 'HT'];

function bundle(rng: Rng, ab: Ab): Exercise {
  const c = rng.pick(BUNDLE_PLACES);
  const big = larger(c);
  const name = PLACE_NAME[c];
  const tenHint = `10 ${name} sind ${countOf(1, big)}. Bündle zuerst.`;
  if (rng.chance(0.65)) {
    // into Millionen from 2 on: 'Millionen' after the field has to fit the value, and a singular there would give the 1 away
    const bundles = big === 'M' ? 2 : 1;
    const k = rng.int(bundles * 10 + 1, bundles * 10 + 9);
    const ones = k - bundles * 10;
    const fields: MultiField[] = [{ id: 'g', value: bundles, after: PLACE_NAME[big], label: PLACE_NAME[big] }, { id: 'k', value: ones, after: name, label: name }];
    return build(SKILL, 2, {
      key: `buendeln:${k}:${c}`,
      ab,
      prompt: 'Bündle.',
      expression: `${k} ${name} = ${BOX} ${PLACE_NAME[big]} ${BOX} ${name}`,
      answer: { kind: 'multi', fields },
      hints: [`Wie viele ${name} ergeben ${countOf(1, big)}?`, 'Nimm diese Menge weg. Der Rest bleibt an seiner Stelle.'],
      steps: [`10 ${name} sind ${countOf(1, big)}.`, `${k} ${name} sind ${bundles * 10} ${name} und ${ones} ${name}.`, `Also ${countOf(bundles, big)} und ${ones} ${name}.`],
      bugs: multiBugs([
        { id: 'buendel-getauscht', match: { g: ones, k: bundles }, hint: 'Die Zehnerziffer gehört zur größeren Stelle. Prüfe die Reihenfolge.' },
        { id: 'buendel-vergessen', match: { g: 0, k }, hint: tenHint },
      ], fields),
      praise: 'Du hast zehn gleiche Stellen zu einer größeren gebündelt.',
      srText: `Bündle ${k} ${name}. Wie viele ${PLACE_NAME[big]} und wie viele ${name} sind das?`,
      kmk: KMK,
    });
  }
  // reversed: unbundle into the smaller place
  const a = rng.int(2, 9);
  const b = rng.int(1, 9);
  const value = a * 10 + b;
  const fields: MultiField[] = [{ id: 'k', value, after: name, label: name }];
  return build(SKILL, 2, {
    key: `entbuendeln:${a}:${b}:${c}`,
    ab,
    prompt: 'Schreibe alles in der kleineren Stelle.',
    expression: `${countOf(a, big)} ${countOf(b, c)} = ${BOX} ${name}`,
    answer: { kind: 'multi', fields },
    hints: [`${countOf(1, big)} sind 10 ${name}.`, 'Rechne die große Stelle um. Zähle dann die kleine dazu.'],
    steps: [`${countOf(1, big)} sind 10 ${name}.`, `${countOf(a, big)} sind ${a * 10} ${name}.`, `${a * 10} + ${b} = ${value}`],
    bugs: multiBugs([
      { id: 'ziffern-addiert', match: { k: a + b }, hint: `${countOf(1, big)} zählt so viel wie 10 ${name}.` },
      { id: 'nur-grosse-stelle', match: { k: a * 10 }, hint: `Zähle auch die ${countOf(b, c)} dazu.` },
    ], fields),
    praise: 'Du hast die große Stelle in die kleine umgerechnet.',
    srText: `${countOf(a, big)} und ${countOf(b, c)}. Wie viele ${name} sind das?`,
    kmk: KMK,
  });
}

/** A Stellentafel with one cell above 9: 6 | 3 | 12 | 5. */
function bundledTable(rng: Rng, ab: Ab): Exercise {
  const start = rng.pick<WholeColumn>(['HT', 'ZT', 'T', 'M']);
  const columns = COLUMNS.slice(COLUMNS.indexOf(start)) as WholeColumn[];
  const shownCount = rng.int(3, Math.min(5, columns.length));
  const places = columns.slice(0, shownCount);
  const at = rng.int(1, places.length - 1);
  const values = places.map((_, i) => (i === at ? rng.int(11, 19) : rng.int(1, 8)));
  const n = places.reduce((s, c, i) => s + values[i] * PV[c], 0);
  const table: Visual = { type: 'placeValue', columns, rows: [{ values: columns.map((c) => { const i = places.indexOf(c); return i < 0 ? null : values[i]; }) }] };
  const big = places[at];
  const k = values[at];
  const glued = Number(columns.map((c) => { const i = places.indexOf(c); return i < 0 ? 0 : values[i]; }).join(''));
  const dropped = n - 10 * PV[big];
  return build(SKILL, 2, {
    key: `tafel:${columns[0]}:${values.join('-')}`,
    ab,
    prompt: 'Welche Zahl zeigt die Stellentafel?',
    visual: table,
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: ['In einer Spalte steht mehr als eine Ziffer. Bündle dort zuerst.', 'Leere Spalten bekommen eine 0.'],
    steps: [
      `${k} ${PLACE_NAME[big]} sind ${countOf(1, larger(big))} und ${k - 10} ${PLACE_NAME[big]}.`,
      { text: 'Trag den gebündelten Teil eine Stelle weiter links ein.', visual: placeTable(n) },
      `Zusammen: ${fmt(n)}.`,
    ],
    bugs: numberBugs([
      { id: 'ziffern-hintereinander', match: glued, hint: `${k} ${PLACE_NAME[big]} sind ${countOf(1, larger(big))} und ${k - 10} ${PLACE_NAME[big]}. Bündle zuerst.` },
      { id: 'buendel-vergessen', match: dropped, hint: `Der gebündelte Teil von ${k} ${PLACE_DATIVE[big]} zählt mit. Zähle diesen Teil dazu.` },
    ], n),
    praise: 'Du hast zuerst gebündelt und dann die Zahl geschrieben.',
    srText: `Stellentafel: ${places.map((c, i) => countOf(values[i], c)).join(', ')}. Welche Zahl ist das?`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

/** Places of a sum of Stufenzahlen, with Milliarden if the range allows them. */
function sumPlaces(rng: Rng, ctx: GenContext, count: number): WholeColumn[] {
  const from = ctx.ranges.beyondMilliarde ? 'Mrd' : 'HM';
  return rng.sample(COLUMNS.slice(COLUMNS.indexOf(from), COLUMNS.length - 1), count).sort((a, b) => PV[b] - PV[a]);
}

function sumToNumber(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const places = sumPlaces(rng, ctx, rng.int(3, 4));
  const parts = places.map((c) => ({ c, d: rng.int(1, 9) }));
  const n = parts.reduce((s, p) => s + p.d * PV[p.c], 0);
  const term = parts.map((p) => `${p.d} ${TIMES} ${fmt(PV[p.c])}`).join(' + ');
  return build(SKILL, 3, {
    key: `summe:${parts.map((p) => `${p.d}${p.c}`).join('+')}`,
    ab,
    prompt: 'Berechne die Summe aus Stufenzahlen.',
    expression: `${term} = ${BOX}`,
    answer: { kind: 'number', value: n, label: 'Summe' },
    hints: ['Jede Stufenzahl sagt dir eine Stelle.', 'Leere Stellen bekommen eine 0.'],
    steps: [{ text: `Die Ziffern ${joinDe(parts.map((p) => String(p.d)))} kommen an ihre Stellen.`, visual: placeTable(n) }, 'Leere Stellen bekommen eine 0.', `Die Summe ist ${fmt(n)}.`],
    bugs: numberBugs([
      { id: 'leere-stelle', match: fromDigits(parts.map((p) => p.d)), hint: 'Jede Stufenzahl hat ihre Stelle. Leere Stellen bekommen eine 0.' },
      { id: 'ohne-faktor', match: parts.reduce((s, p) => s + PV[p.c], 0), hint: 'Die Ziffer davor sagt: So oft zählt die Stufenzahl.' },
    ], n),
    praise: 'Du hast jede Ziffer an ihre Stufenzahl gesetzt.',
    srText: `${parts.map((p) => `${p.d} mal ${PV[p.c]}`).join(' plus ')}. Berechne die Summe.`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

function numberToSum(rng: Rng, ab: Ab, ctx: GenContext): Exercise {
  const places = sumPlaces(rng, ctx, rng.int(3, 4));
  const parts = places.map((c) => ({ c, d: rng.int(2, 9) }));
  const n = parts.reduce((s, p) => s + p.d * PV[p.c], 0);
  const fields: MultiField[] = parts.map((p, i) => ({ id: `s${i}`, value: p.d, after: `${TIMES} ${fmt(PV[p.c])}`, label: `Ziffer bei den ${PLACE_DATIVE[p.c]}` }));
  const asValues = Object.fromEntries(parts.map((p, i) => [`s${i}`, p.d * PV[p.c]]));
  return build(SKILL, 3, {
    key: `zerlegen:${n}`,
    ab,
    prompt: `Zerlege ${fmt(n)} in Stufenzahlen.`,
    expression: `${fmt(n)} = ${parts.map((p) => `${BOX} ${TIMES} ${fmt(PV[p.c])}`).join(' + ')}`,
    answer: { kind: 'multi', fields },
    hints: ['Trag die Zahl in die Stellentafel ein.', 'In jede Lücke kommt nur eine Ziffer.'],
    steps: [{ text: `Die Ziffern außer 0: ${joinDe(parts.map((p) => `${p.d} bei den ${PLACE_DATIVE[p.c]}`))}.`, visual: placeTable(n) }, `Also die Lücken ${parts.map((p) => p.d).join(', ')}.`],
    bugs: multiBugs([{ id: 'wert-statt-ziffer', match: asValues, hint: 'In die Lücke kommt nur die Ziffer. Die Stufenzahl steht schon da.' }], fields),
    praise: 'Du hast jede Ziffer ihrer Stufenzahl zugeordnet.',
    srText: `Zerlege ${n} in Stufenzahlen: ${parts.map((p) => `Lücke mal ${PV[p.c]}`).join(' plus ')}.`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

const descending = (digits: readonly number[]) => [...digits].sort((a, b) => b - a);
const ascending = (digits: readonly number[]) => [...digits].sort((a, b) => a - b);

/** Digits for AB III: both even and odd ones are always among them, as 6 of the digits 1 to 9 or the 0 and 5 of them hold both. */
function givenDigits(rng: Rng): number[] {
  const count = rng.int(6, 7);
  return rng.chance(0.6) ? [0, ...rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], count - 1)] : rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], count);
}

/** The largest even or odd number from the digits. Sorting alone misses it: the Endziffer asked for is never the smallest digit. */
function largestWithEnding(rng: Rng, ab: Ab): Exercise {
  const digits = givenDigits(rng);
  const shown = rng.shuffle(digits);
  const down = descending(digits);
  const up = ascending(digits);
  // the plain largest number ends in the smallest digit, so the other kind of ending is a real condition
  const even = up[0] % 2 === 1;
  const word = even ? 'gerade' : 'ungerade';
  const last = up.find((d) => (d % 2 === 0) === even) as number;
  const front = down.filter((d) => d !== last);
  const value = fromDigits([...front, last]);
  return build(SKILL, 3, {
    key: `ziffern:${word}:${shown.join('')}`,
    ab,
    prompt: `Bilde aus diesen Ziffern die größte ${word} Zahl. Nimm jede Ziffer genau einmal.`,
    expression: shown.join(', '),
    answer: { kind: 'number', value, label: 'Größte Zahl' },
    hints: ['Schau zuerst auf die letzte Stelle: Welche Ziffern passen dort?', 'Setz dort die kleinste passende Ziffer. Die anderen sortierst du von groß nach klein.'],
    steps: [
      `Eine ${word} Zahl hat eine ${word} Ziffer an der letzten Stelle.`,
      `Die kleinste ${word} Ziffer ist ${last}. Die ${last} kommt nach hinten.`,
      `Die anderen Ziffern von groß nach klein: ${front.join(', ')}.`,
      `Die Zahl heißt ${fmt(value)}.`,
    ],
    bugs: numberBugs([
      { id: 'ohne-bedingung', match: fromDigits(down), hint: `Das ist die größte Zahl. Die Zahl soll aber ${word} sein.` },
      { id: 'groesste-kleinste', match: fromDigits(up), hint: 'Lies noch einmal: Gesucht ist die größte Zahl.' },
      { id: 'reihenfolge-gezeigt', match: fromDigits(shown), hint: 'Du darfst die Ziffern umstellen. Sortiere zuerst.' },
    ], value),
    praise: 'Du hast zuerst die letzte Stelle besetzt.',
    srText: `Bilde aus den Ziffern ${shown.join(', ')} die größte ${word} Zahl. Nimm jede Ziffer genau einmal.`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** The largest or smallest number with one digit fixed at a named place below the first one, never where plain sorting would put it. */
function withFixedDigit(rng: Rng, ab: Ab): Exercise {
  const digits = givenDigits(rng);
  const shown = rng.shuffle(digits);
  const wantLargest = rng.chance(0.5);
  const sorted = wantLargest ? descending(digits) : ascending(digits);
  const zeroLeads = sorted[0] === 0;
  const plain = zeroLeads ? [sorted[1], 0, ...sorted.slice(2)] : sorted;
  const candidates = digits.flatMap((d) => (d === 0 ? [] : plain.flatMap((_, at) => (at > 0 && plain[at] !== d ? [{ d, at }] : []))));
  const { d, at } = rng.pick(candidates);
  const c = COLUMNS[COLUMNS.length - digits.length + at] as WholeColumn;
  const rest = sorted.filter((x) => x !== d);
  // the first place never takes the 0: the next digit moves up
  const free = rest[0] === 0 ? [rest[1], 0, ...rest.slice(2)] : rest;
  const withD = (others: readonly number[]) => fromDigits([...others.slice(0, at), d, ...others.slice(at)]);
  const value = withD(free);
  const word = wantLargest ? 'größte' : 'kleinste';
  return build(SKILL, 3, {
    key: `ziffern:${wantLargest ? 'g' : 'k'}:${d}:${c}:${shown.join('')}`,
    ab,
    prompt: `Bilde aus diesen Ziffern die ${word} Zahl. Die ${d} steht bei den ${PLACE_DATIVE[c]}. Nimm jede Ziffer genau einmal.`,
    expression: shown.join(', '),
    visual: emptyTable(10 ** (digits.length - 1)),
    answer: { kind: 'number', value, label: wantLargest ? 'Größte Zahl' : 'Kleinste Zahl' },
    hints: wantLargest
      ? ['Setz die feste Ziffer zuerst in die Stellentafel.', 'Fülle dann von links: immer die größte übrige Ziffer.']
      : ['Setz die feste Ziffer zuerst in die Stellentafel.', 'Fülle von links mit der kleinsten übrigen Ziffer. Eine Zahl beginnt nicht mit 0.'],
    steps: [
      `Die ${d} steht fest bei den ${PLACE_DATIVE[c]}.`,
      wantLargest ? `Die anderen Ziffern von groß nach klein: ${rest.join(', ')}.` : `Die anderen Ziffern von klein nach groß: ${rest.join(', ')}.`,
      ...(rest[0] === 0 ? ['Eine Zahl beginnt nicht mit 0. Die 0 kommt an die zweite freie Stelle.'] : []),
      { text: 'Diese Ziffern kommen der Reihe nach auf die freien Stellen.', visual: placeTable(value, c) },
      `Die Zahl heißt ${fmt(value)}.`,
    ],
    bugs: numberBugs([
      { id: 'ohne-bedingung', match: fromDigits(plain), hint: `Prüfe die Stelle der ${d}: Die ${d} steht bei den ${PLACE_DATIVE[c]}.` },
      { id: 'groesste-kleinste', match: withD(wantLargest ? ascending(rest) : descending(rest)), hint: `Lies noch einmal: Gesucht ist die ${word} Zahl.` },
      { id: 'reihenfolge-gezeigt', match: fromDigits(shown), hint: 'Du darfst die Ziffern umstellen. Sortiere zuerst.' },
      rest[0] === 0 && { id: 'null-vorn', match: withD(rest), hint: 'Eine Zahl beginnt nicht mit 0. Setz die 0 an die zweite freie Stelle.' },
    ], value),
    praise: 'Du hast die feste Ziffer und die freien Stellen beachtet.',
    srText: `Bilde aus den Ziffern ${shown.join(', ')} die ${word} Zahl. Die ${d} steht bei den ${PLACE_DATIVE[c]}. Nimm jede Ziffer genau einmal.`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** AB III: a condition on top of the digits, so the task needs more than sorting. */
const fromGivenDigits = (rng: Rng, ab: Ab): Exercise => (rng.chance(0.5) ? largestWithEnding(rng, ab) : withFixedDigit(rng, ab));

export const stellenwerteSkill: SkillDef = {
  ...SKILL,
  title: 'Stellenwerte',
  description: 'Du erkennst, was jede Ziffer wert ist, und bündelst.',
  stufen: {
    1: 'Wert einer Ziffer in der Stellentafel',
    2: 'Teile ungeordnet; Bündeln: 14 Zehntausender sind 1 Hunderttausender und 4 Zehntausender',
    3: 'Stufenzahlen als Summe; größte Zahl aus gegebenen Ziffern',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 3 ? twoSameDigits(rng, ab) : valueOfDigit(rng, ab);
    if (stufe === 2) return ab === 1 ? unorderedParts(rng, ab) : ab === 2 ? bundle(rng, ab) : bundledTable(rng, ab);
    return ab === 1 ? sumToNumber(rng, ab, ctx) : ab === 2 ? numberToSum(rng, ab, ctx) : fromGivenDigits(rng, ab);
  },
};
