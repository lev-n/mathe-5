/**
 * Dezimalzahlen ordnen: compare, order and round. All values are built from whole thousandths, so the comparison never depends on a float.
 * Stufe 1 (same length): AB I compare, AB II order, AB III place on the Zahlenstrahl, or find the number between.
 * Stufe 2 (different length): AB I compare, AB II order four, AB III is the claim right?, or equal values.
 * Stufe 3 (order five, a number between, runden): AB I runden, AB II order five, AB III a number between, also on a fine Zahlenstrahl.
 * The comma key holds for the whole skill, so every number answer sets decimals. The Stellentafel extended to the right is the anchor (F2): it stands beside a comparison at AB I of
 * Stufe 1 and 2, as the numbers are written, and in the worked steps with every place filled.
 */
import { BOX, fmt } from '../../core/format';
import type { Ab, ChoiceOption, PlaceColumn, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, pickPerson, speak } from '../shared';
import { byStufeAndAb, orderBugs, orderWith, relationOf, symbolChoice, typedBugs, type Form } from './helpers';

const SKILL = { id: 'brueche.dezimal-ordnen', topicId: 'brueche' } as const;
const KMK = ['ZO.dezimalzahlen'];
const DECIMALS = 3;

/** A Dezimalzahl: its value in thousandths and the places it is written with. */
interface Dec {
  milli: number;
  places: number;
}

const dec = (milli: number, places: number): Dec => ({ milli, places });
const text = (x: Dec) => fmt(x.milli / 1000, x.places);
const value = (x: Dec) => x.milli / 1000;
/** The digits after the comma read as a whole number: the mistake of 0,45 > 0,5. */
const tailNumber = (x: Dec) => Number(text(x).split(',')[1] ?? 0);
const sign = (dir: 'aufsteigend' | 'absteigend') => (dir === 'aufsteigend' ? ' < ' : ' > ');
/** '1 Zehntel ist', '3 Zehntel sind'. */
const tenthsVerb = (n: number) => `${n} Zehntel ${n === 1 ? 'ist' : 'sind'}`;
const orderPrompt = (dir: 'aufsteigend' | 'absteigend') => `Ordne die Zahlen von ${dir === 'aufsteigend' ? 'klein nach groß' : 'groß nach klein'}.`;

/** A number with exactly these places: the last digit is not 0. */
function sized(rng: Rng, places: number, maxWhole: number): Dec {
  const unit = 10 ** (3 - places);
  const count = 10 ** places;
  let tail = rng.int(1, count - 1);
  while (tail % 10 === 0) tail = rng.int(1, count - 1);
  return dec(rng.int(0, maxWhole) * 1000 + tail * unit, places);
}

/** A Stellentafel with one row per number. A place the number does not write stays empty, or shows its 0 with `padded`. */
function table(numbers: readonly Dec[], padded: boolean): VisualOf<'placeValue'> {
  const places = Math.max(...numbers.map((x) => x.places));
  const after: readonly PlaceColumn[] = ['z', 'h', 't'];
  return {
    type: 'placeValue',
    columns: ['E', ...after.slice(0, places)],
    rows: numbers.map((x) => ({
      values: [Math.floor(x.milli / 1000), ...after.slice(0, places).map((_, i) => (padded || i < x.places ? Math.floor(x.milli / 10 ** (2 - i)) % 10 : null))],
    })),
  };
}

function compareTask(stufe: Stufe, ab: Ab, rng: Rng, a: Dec, b: Dec, why: string, hints: string[], praise: string, picture = false) {
  const relation = relationOf(a.milli - b.milli);
  const places = Math.max(a.places, b.places);
  return build(SKILL, stufe, {
    key: `vergleich:${text(a)}:${text(b)}`,
    ab,
    prompt: 'Setze das passende Zeichen ein.',
    expression: `${text(a)} ${BOX} ${text(b)}`,
    ...(picture ? { visual: table([a, b], false) } : {}),
    answer: symbolChoice(rng, relation, { '<': why, '>': why, '=': why }),
    hints,
    steps: [{ text: `Mit gleich vielen Stellen: ${fmt(value(a), places)} und ${fmt(value(b), places)}`, visual: table([a, b], true) }, 'Vergleiche von links nach rechts, Stelle für Stelle.', `Also: ${text(a)} ${relation} ${text(b)}`],
    praise,
    srText: speak(`Setze das passende Zeichen ein: ${text(a)} und ${text(b)}.`),
    kmk: KMK,
  });
}

/** Stufe 1, AB I: 0,4 and 0,7. */
const compareSame: Form = (rng, stufe, ab) => {
  const places = rng.int(1, 2);
  const a = sized(rng, places, 0);
  let b = sized(rng, places, 0);
  while (b.milli === a.milli) b = sized(rng, places, 0);
  return compareTask(stufe, ab, rng, a, b, 'Vergleiche von links nach rechts, zuerst die Zehntel.', ['Beide Zahlen haben gleich viele Stellen.', 'Schau zuerst auf die Zehntel.'], 'Du hast Stelle für Stelle verglichen.', true);
};

/** Stufe 2, AB I: 0,5 and 0,45, in both traps. */
const compareDifferent: Form = (rng, stufe, ab) => {
  const short = dec(rng.int(1, 9) * 100, 1);
  const tenth = short.milli / 100;
  const trap = rng.pick(['laenger', 'kuerzer'] as const);
  // 'laenger': the longer number looks larger; 'kuerzer': the shorter number looks larger, as tenths beat hundredths
  const firstDigit = trap === 'laenger' ? rng.int(0, Math.max(0, tenth - 1)) : rng.int(Math.min(9, tenth), 9);
  const last = rng.int(1, 9);
  const long = dec((firstDigit * 10 + last) * 10, 2);
  const [a, b] = rng.chance(0.5) ? [short, long] : [long, short];
  const why = trap === 'laenger'
    ? `Schau auf die Zehntel: ${tenthsVerb(tenth)} mehr als ${firstDigit}.`
    : `Schreib beide mit zwei Stellen: ${fmt(value(short), 2)} und ${text(long)}.`;
  return compareTask(stufe, ab, rng, a, b, why, ['Hänge eine 0 an, bis beide gleich viele Stellen haben.', 'Vergleiche dann von links nach rechts.'], 'Du hast zuerst beide Zahlen gleich lang geschrieben.', true);
};

/** Stufe 2, AB III: 0,50 and 0,5 have the same value. */
const compareEqual: Form = (rng, stufe, ab) => {
  const base = sized(rng, rng.int(1, 2), 3);
  const longer = dec(base.milli, base.places + 1);
  const endsInZero = rng.chance(0.5);
  const other = endsInZero ? longer : dec(base.milli + rng.pick([-1, 1]) * 10 ** (3 - longer.places), longer.places);
  const [a, b] = rng.chance(0.5) ? [base, other] : [other, base];
  // only 3,30 against 3,3 has a final 0 to talk about; 3,31 against 3,3 is about the length
  return endsInZero
    ? compareTask(stufe, ab, rng, a, b, 'Hänge eine 0 an, bis beide gleich viele Stellen haben.', ['Eine 0 am Ende ändert den Wert nicht.', 'Schreib beide Zahlen mit gleich vielen Stellen.'], 'Du hast die 0 am Ende richtig eingeordnet.')
    : compareTask(stufe, ab, rng, a, b, 'Hänge eine 0 an, bis beide gleich viele Stellen haben.', ['Hänge an die kürzere Zahl eine 0 an.', 'Vergleiche dann von links nach rechts.'], 'Du hast zuerst beide Zahlen gleich lang geschrieben.');
};

function distinct(rng: Rng, count: number, make: () => Dec): Dec[] {
  const out: Dec[] = [];
  while (out.length < count) {
    const x = make();
    if (!out.some((y) => y.milli === x.milli)) out.push(x);
  }
  return rng.shuffle(out);
}

/** Order numbers; `make` chooses their length. */
function orderTask(lengths: readonly number[], maxWhole: number): Form {
  return (rng, stufe, ab) => {
    const count = lengths.length;
    const whole = rng.int(0, 3);
    let index = 0;
    // Same whole part most of the time, as only the places after the comma are the point of this skill.
    const values = distinct(rng, count, () => {
      const x = sized(rng, lengths[index % count], 0);
      index++;
      return dec(x.milli + (whole + rng.int(0, maxWhole)) * 1000, x.places);
    });
    const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
    const { answer, sorted, wrongOrder } = orderWith(rng, values, (a, b) => a.milli - b.milli, text, direction);
    const places = Math.max(...values.map((x) => x.places));
    const prompt = orderPrompt(direction);
    const mixed = values.some((x) => x.places !== places);
    return build(SKILL, stufe, {
      key: `ordnen:${count}:${direction}:${sorted.map(text).join('|')}`,
      ab,
      prompt,
      answer,
      hints: mixed ? ['Hänge Nullen an, bis alle gleich viele Stellen haben.', 'Vergleiche dann von links nach rechts.'] : ['Vergleiche zuerst die Stellen vor dem Komma.', 'Vergleiche dann die Zehntel, danach die Hundertstel.'],
      steps: [{ text: `Mit gleich vielen Stellen: ${sorted.map((x) => fmt(value(x), places)).join(', ')}`, visual: table(sorted, true) }, `Also: ${sorted.map(text).join(sign(direction))}`],
      bugs: orderBugs(answer.correct, [
        ['komma-laenger', wrongOrder((a, b) => Math.floor(a.milli / 1000) - Math.floor(b.milli / 1000) || tailNumber(a) - tailNumber(b)), 'Mehr Stellen heißt nicht größer. Schau zuerst auf die Zehntel.'],
        ['komma-kuerzer', wrongOrder((a, b) => Math.floor(a.milli / 1000) - Math.floor(b.milli / 1000) || b.places - a.places || a.milli - b.milli), 'Schreib alle Zahlen mit gleich vielen Stellen. Vergleiche dann.'],
      ]),
      praise: mixed ? 'Du hast alle Zahlen gleich lang geschrieben.' : 'Du hast Stelle für Stelle verglichen.',
      srText: speak(`${prompt} ${answer.items.join(', ')}.`),
      kmk: KMK,
    });
  };
}

/** Place a number on a Zahlenstrahl with a marked scale. */
function placeOnLine(stufe: Stufe, ab: Ab, min: number, max: number, step: number, target: number, places: number) {
  const shown = fmt(target, places);
  const prompt = `Setze den Pfeil auf ${shown}.`;
  return build(SKILL, stufe, {
    key: `strahl:${min}:${shown}`,
    ab,
    prompt,
    answer: { kind: 'numberline' as const, min, max, majorStep: max - min, minorStep: step, step, value: target, tolerance: 0, labelMajor: true },
    hints: [`Der Zahlenstrahl geht von ${fmt(min)} bis ${fmt(max)}. Wie viel zählt ein Strich?`, `Ein kleiner Strich zählt ${fmt(step)}. Zähle ab ${fmt(min)}.`],
    steps: [`Ein kleiner Strich zählt ${fmt(step)}.`, `Von ${fmt(min)} bis ${shown}: ${Math.round((target - min) / step)} ${Math.round((target - min) / step) === 1 ? 'Strich' : 'Striche'}`, `Der Pfeil steht bei ${shown}.`],
    praise: 'Du hast zuerst den Wert eines Strichs geprüft.',
    srText: speak(`${prompt} Der Zahlenstrahl geht von ${fmt(min)} bis ${fmt(max)}, ein Strich zählt ${fmt(step)}.`),
    kmk: [...KMK, 'PK.darstellen'],
  });
}

/** Stufe 1, AB III: tenths on a line from a whole number to the next. */
const lineTenths: Form = (rng, stufe, ab) => {
  const start = rng.int(0, 4);
  return placeOnLine(stufe, ab, start, start + 1, 0.1, (start * 10 + rng.int(1, 9)) / 10, 1);
};

/** Stufe 3, AB III: hundredths on a line from one tenth to the next. */
const lineHundredths: Form = (rng, stufe, ab) => {
  const start = rng.int(1, 8);
  return placeOnLine(stufe, ab, start / 10, (start + 1) / 10, 0.01, (start * 10 + rng.int(1, 9)) / 100, 2);
};

/** Stufe 1, AB III: which number lies between two others of the same length? */
const betweenSame: Form = (rng, stufe, ab) => {
  const low = rng.int(1, 6);
  const mid = low + 1;
  const high = low + 2;
  const a = dec(low * 100, 1);
  const b = dec(high * 100, 1);
  const right = dec(mid * 100, 1);
  const wrongs: ChoiceOption[] = [
    { label: text(dec(((high + 1) % 10 || 9) * 100, 1)), whyWrong: `Diese Zahl ist nicht kleiner als ${text(b)}.` },
    { label: fmt(mid), whyWrong: `Diese Zahl ist größer als ${text(b)}. Achte auf die 0 vor dem Komma.` },
    { label: `0,0${mid}`, whyWrong: `Das sind Hundertstel. Die Zahl ist kleiner als ${text(a)}.` },
  ];
  const prompt = `Welche Zahl liegt zwischen ${text(a)} und ${text(b)}?`;
  const answer = makeChoice(rng, { label: text(right) }, wrongs);
  return build(SKILL, stufe, {
    key: `zwischen-wahl:${low}`,
    ab,
    prompt,
    answer,
    hints: ['Schau auf die Zehntel der beiden Zahlen.', 'Die gesuchte Zahl ist größer als die erste und kleiner als die zweite.'],
    steps: [`${text(a)}: ${low} Zehntel, ${text(b)}: ${high} Zehntel`, `Dazwischen liegen ${mid} Zehntel.`, `${text(a)} < ${text(right)} < ${text(b)}`],
    praise: 'Du hast die Zehntel der Zahlen verglichen.',
    srText: speak(`${prompt} Wähle aus: ${answer.options.map((o) => o.label).join('; ')}.`),
    kmk: KMK,
  });
};

/** Stufe 2, AB III: is a claim about two numbers of different length right? */
const claim: Form = (rng, stufe, ab) => {
  const name = pickPerson(rng).name;
  const tenth = rng.int(3, 9);
  const first = rng.int(1, tenth - 1);
  const last = rng.int(1, 9);
  const short = dec(tenth * 100, 1);
  const long = dec((first * 10 + last) * 10, 2);
  const wrongClaim = rng.chance(0.6);
  const [big, small] = wrongClaim ? [long, short] : [short, long];
  const yes = `${name} hat recht: ${tenth} Zehntel sind mehr als ${first} Zehntel.`;
  const no = `${name} hat nicht recht: ${tenthsVerb(first)} weniger als ${tenth} Zehntel.`;
  const trap = `${name} hat recht: ${first}${last} ist mehr als ${tenth}.`;
  const why = 'Schau auf die Zehntel. Mehr Stellen heißt nicht größer.';
  const options: ChoiceOption[] = wrongClaim
    ? [{ label: trap, whyWrong: why }, { label: `${name} hat nicht recht: Die Zahlen sind gleich groß.`, whyWrong: 'Schreib beide mit zwei Stellen. Vergleiche dann.' }]
    : [{ label: no, whyWrong: 'Vergleiche die Zehntel noch einmal.' }, { label: `${name} hat nicht recht: ${first}${last} ist mehr als ${tenth}.`, whyWrong: why }];
  const answer = makeChoice(rng, { label: wrongClaim ? no : yes }, options);
  const prompt = `${name} sagt: ${text(big)} ist größer als ${text(small)}. Was stimmt?`;
  return build(SKILL, stufe, {
    key: `aussage:${name}:${text(big)}:${text(small)}`,
    ab,
    prompt,
    answer,
    hints: ['Schreib beide Zahlen mit zwei Stellen nach dem Komma.', 'Vergleiche zuerst die Zehntel.'],
    steps: [`${text(short)} = ${fmt(value(short), 2)}`, `${tenth} Zehntel sind mehr als ${first} Zehntel.`, `Also: ${text(short)} > ${text(long)}`],
    praise: 'Du hast die Aussage an den Zehnteln geprüft.',
    srText: speak(`${prompt} Wähle aus: ${answer.options.map((o) => o.label).join('; ')}.`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

const ROUND_PLACE = [
  { name: 'Ganze', ofPlace: 'Ganzen', unit: 1000, places: 0, next: 'Zehntel' },
  { name: 'Zehntel', ofPlace: 'Zehntel', unit: 100, places: 1, next: 'Hundertstel' },
  { name: 'Hundertstel', ofPlace: 'Hundertstel', unit: 10, places: 2, next: 'Tausendstel' },
] as const;

/** Stufe 3, AB I: runden. */
const roundTask: Form = (rng, stufe, ab) => {
  const place = rng.pick(ROUND_PLACE);
  const places = place.places + rng.int(1, Math.min(2, 3 - place.places));
  const carry = rng.chance(0.25);
  const low = 10 ** (3 - places);
  let milli = rng.int(1, 19) * 1000 + rng.int(1, 999);
  milli -= milli % low;
  if (carry) milli = milli - (milli % (place.unit * 10)) + place.unit * 9 + Math.max(low, place.unit / 2);
  if (milli % low !== 0) milli -= milli % low;
  // the last digit shown is no 0, so there is always something to round
  if (milli % (low * 10) === 0) milli += low;
  const rounded = Math.round(milli / place.unit) * place.unit;
  const truncated = Math.floor(milli / place.unit) * place.unit;
  const shown = fmt(milli / 1000, places);
  const answerValue = rounded / 1000;
  const nextDigit = Math.floor((milli % place.unit) / (place.unit / 10));
  const up = rounded > truncated;
  const prompt = `Runde ${shown} auf ${place.name}.`;
  const finer = place.places < 2 ? Math.round(milli / (place.unit / 10)) * (place.unit / 10) : null;
  const wrongCarry = up && (truncated / place.unit) % 10 === 9 ? (truncated - 9 * place.unit + place.unit) / 1000 : null;
  return build(SKILL, stufe, {
    key: `runden:${shown}:${place.name}`,
    ab,
    prompt,
    answer: { kind: 'number', value: answerValue, decimals: DECIMALS, label: 'Gerundete Zahl' },
    hints: [`Markiere die Stelle der ${place.ofPlace}.`, `Schau auf die nächste Stelle rechts davon: Ab 5 rundest du auf.`],
    steps: [`Gerundet auf ${place.name}: Die ${place.next} entscheiden.`, `Dort steht ${nextDigit}, also ${up ? 'rundest du auf' : 'rundest du ab'}.`, `${shown} ≈ ${fmt(answerValue, place.places)}`],
    bugs: typedBugs([
      up && { id: 'abgeschnitten', match: truncated / 1000, hint: `Die nächste Ziffer ist ${nextDigit}. Ab 5 rundest du auf.` },
      !up && { id: 'immer-auf', match: (truncated + place.unit) / 1000, hint: `Die nächste Ziffer ist ${nextDigit}. Unter 5 rundest du ab.` },
      finer !== null && finer !== milli && { id: 'runden-stelle', match: finer / 1000, hint: 'Markiere zuerst die Stelle zum Runden.' },
      wrongCarry !== null && { id: 'runden-uebertrag', match: wrongCarry, hint: 'Aus der 9 wird beim Aufrunden 10. Das ändert auch die Stelle davor.' },
    ], answerValue, DECIMALS),
    praise: `Du hast die ${place.next} für das Runden geprüft.`,
    srText: speak(prompt),
    kmk: [...KMK, 'ZO.runden'],
  });
};

/** Stufe 3, AB III: any number between two neighbouring tenths counts. */
const betweenFree: Form = (rng, stufe, ab) => {
  const tenths = rng.int(1, 49);
  const low = tenths / 10;
  const high = (tenths + 1) / 10;
  const middle = (tenths * 10 + 5) / 100;
  const prompt = `Nenne eine Zahl zwischen ${fmt(low, 1)} und ${fmt(high, 1)}.`;
  const shown = fmt(middle, 2);
  return build(SKILL, stufe, {
    key: `zwischen:${tenths}`,
    ab,
    prompt,
    // Every number strictly between them with up to three places is right, compared in thousandths.
    answer: { kind: 'number', value: middle, decimals: DECIMALS, tolerance: 0.049, label: 'Zahl dazwischen' },
    hints: [`Schreib beide Zahlen mit zwei Stellen: ${fmt(low, 2)} und ${fmt(high, 2)}.`, 'Welche Hundertstel liegen dazwischen?'],
    steps: [`${fmt(low, 1)} = ${fmt(low, 2)} und ${fmt(high, 1)} = ${fmt(high, 2)}`, `Dazwischen liegt zum Beispiel ${shown}.`],
    bugs: typedBugs([
      { id: 'zwischen-grenze', match: low, hint: 'Diese Zahl ist eine der beiden Grenzen. Gesucht ist eine Zahl dazwischen.' },
      { id: 'zwischen-grenze', match: high, hint: 'Diese Zahl ist eine der beiden Grenzen. Gesucht ist eine Zahl dazwischen.' },
    ], middle, DECIMALS),
    praise: 'Du hast eine Stelle angehängt und so Platz gefunden.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [compareSame], 2: [orderTask([2, 2, 2, 2], 1)], 3: [lineTenths, betweenSame] },
  2: { 1: [compareDifferent], 2: [orderTask([1, 2, 1, 2], 0)], 3: [claim, compareEqual] },
  3: { 1: [roundTask], 2: [orderTask([1, 2, 3, 1, 2], 1)], 3: [betweenFree, lineHundredths] },
};

export const dezimalOrdnenSkill: SkillDef = {
  ...SKILL,
  title: 'Dezimalzahlen ordnen',
  description: 'Du vergleichst, ordnest und rundest Dezimalzahlen.',
  stufen: { 1: 'Gleich viele Stellen: 0,4 und 0,7', 2: 'Verschieden viele Stellen: 0,5 und 0,45', 3: 'Fünf Zahlen ordnen, Zahl zwischen 0,3 und 0,4, runden' },
  kmk: KMK,
  keys: { comma: true },
  generate: byStufeAndAb(FORMS),
};
