/**
 * Mit Größen rechnen.
 * Stufe 1: one unit: add, subtract, times a natural number; AB II with a carry or a times, money as coins; AB III finds the gap.
 * Stufe 2: different units: convert first; AB II time spans across hours; AB III with mixed quantities and back from an end time.
 * Stufe 3: Teilen: 12 m : 3 m = 4 and 2,40 € : 3; AB II converts first; AB III two steps in a story.
 * Time spans stay in h and min, never in decimal hours.
 */
import { BOX, fmt, fmtDuration, fmtMixed, fmtMoney } from '../../core/format';
import type { Ab, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { pickPerson, targetAb } from '../shared';
import { COMMA_FIELD, EURO_FIELD, clock, clockVisual, euro, finish, hundredMinuteHint, hundredMinuteSpan, moneyItems, moneyWords, q, speak } from './helpers';

const SKILL = { id: 'groessen.rechnen', topicId: 'groessen' } as const;
const KMK = ['GM.rechnen'];

const WHOLE_UNITS = ['m', 'km', 'kg', 'g', 'min'] as const;

/** A money value in cents, a multiple of 5. */
const cents5 = (rng: Rng, min: number, max: number) => rng.int(Math.ceil(min / 5), Math.floor(max / 5)) * 5;

interface Plain {
  key: string;
  ab: Ab;
  expression: string;
  /** Answer in its unit, and the unit; '€' takes two decimals. */
  value: number;
  unit?: string;
  hints: string[];
  steps: string[];
  bugs: Parameters<typeof finish>[2]['bugs'];
  praise: string;
  prompt?: string;
}

function plain(stufe: Stufe, p: Plain): Exercise {
  return finish(SKILL, stufe, {
    key: p.key,
    ab: p.ab,
    prompt: p.prompt ?? 'Rechne.',
    expression: p.expression,
    answer: { kind: 'number', value: p.value, ...(p.unit ? { unit: p.unit } : {}), decimals: p.unit === '€' ? EURO_FIELD : COMMA_FIELD },
    hints: p.hints,
    steps: p.steps,
    bugs: p.bugs,
    praise: p.praise,
    kmk: KMK,
  });
}

// ─── Stufe 1: one unit ───────────────────────────────────────────────────────

const SAME_HINTS = ['Beide Größen haben dieselbe Einheit.', 'Rechne mit den Zahlen. Die Einheit bleibt.'];

function moneySum(stufe: Stufe, ab: Ab, rng: Rng, carry: boolean): Exercise {
  const ca = rng.int(2, 18) * 5;
  const cb = carry ? rng.int(Math.ceil((105 - ca) / 5), 19) * 5 : rng.int(1, Math.floor((95 - ca) / 5) || 1) * 5;
  const a = rng.int(1, 8) * 100 + ca;
  const b = rng.int(1, 8) * 100 + Math.min(cb, 95);
  const minus = !carry && rng.chance(0.4);
  const [big, small] = a >= b ? [a, b] : [b, a];
  if (minus) {
    const value = big - small;
    return plain(stufe, {
      key: `geld-minus:${big}:${small}`,
      ab,
      expression: `${fmtMoney(big)} − ${fmtMoney(small)} = ${BOX} €`,
      value: value / 100,
      unit: '€',
      hints: SAME_HINTS,
      steps: [`${fmtMoney(big)} − ${fmtMoney(small)} = ${fmtMoney(value)}`],
      bugs: [{ id: 'rechenart-+', match: (big + small) / 100, hint: 'Hier steht ein Minus. Zieh den zweiten Betrag ab.' }],
      praise: 'Du hast Euro und Cent richtig abgezogen.',
    });
  }
  const sum = a + b;
  return plain(stufe, {
    key: `geld-plus:${a}:${b}`,
    ab,
    expression: `${fmtMoney(a)} + ${fmtMoney(b)} = ${BOX} €`,
    value: sum / 100,
    unit: '€',
    hints: carry ? ['Rechne die Cent zusammen. Über 100 ct gibt es einen Euro mehr.', 'Rechne dann die Euro zusammen.'] : SAME_HINTS,
    steps: [`${fmtMoney(a)} + ${fmtMoney(b)} = ${fmtMoney(sum)}`],
    bugs: [
      carry ? { id: 'cent-uebertrag', match: (sum - 100) / 100, hint: '100 ct sind 1 €. Zähl diesen Euro mit.' } : null,
      { id: 'rechenart--', match: Math.abs(a - b) / 100, hint: 'Hier steht ein Plus. Rechne beide Beträge zusammen.' },
    ],
    praise: carry ? 'Du hast aus 100 ct einen Euro gemacht.' : 'Du hast Euro und Cent richtig addiert.',
  });
}

function wholeSum(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const unit = rng.pick(WHOLE_UNITS);
  const a = rng.int(120, 900);
  const b = rng.int(30, 110);
  const plus = rng.chance(0.5);
  const value = plus ? a + b : a - b;
  return plain(stufe, {
    key: `ganz:${unit}:${a}:${plus ? '+' : '-'}:${b}`,
    ab,
    expression: `${q(a, unit)} ${plus ? '+' : '−'} ${q(b, unit)} = ${BOX} ${unit}`,
    value,
    unit,
    hints: SAME_HINTS,
    steps: [`${fmt(a)} ${plus ? '+' : '−'} ${fmt(b)} = ${fmt(value)}`, `Das Ergebnis: ${q(value, unit)}`],
    bugs: [plus ? { id: 'rechenart--', match: a - b, hint: 'Hier steht ein Plus. Rechne beide Größen zusammen.' } : { id: 'rechenart-+', match: a + b, hint: 'Hier steht ein Minus. Zieh die zweite Größe ab.' }],
    praise: 'Du hast gerechnet und die Einheit behalten.',
  });
}

function times(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const k = rng.int(3, 9);
  if (rng.chance(0.6)) {
    const c = cents5(rng, 105, 695);
    const total = c * k;
    return plain(stufe, {
      key: `geld-mal:${c}:${k}`,
      ab,
      expression: `${fmtMoney(c)} · ${k} = ${BOX} €`,
      value: total / 100,
      unit: '€',
      hints: [`Rechne zuerst die Euro mal ${k}.`, `Rechne dann die Cent mal ${k} und zähl zusammen.`],
      steps: [`${fmtMoney(c - (c % 100))} · ${k} = ${fmtMoney((c - (c % 100)) * k)}`, `${q(c % 100, 'ct')} · ${k} = ${q((c % 100) * k, 'ct')}`, `Zusammen: ${fmtMoney(total)}`],
      bugs: [
        c % 100 > 0 ? { id: 'nur-euro', match: (Math.floor(c / 100) * k * 100 + (c % 100)) / 100, hint: `Auch die Cent gehören ${k}-mal dazu.` } : null,
        { id: 'rechenart-+', match: (c + k * 100) / 100, hint: 'Hier steht ein Mal. Der Betrag kommt mehrmals vor.' },
      ],
      praise: 'Du hast Euro und Cent beide malgenommen.',
    });
  }
  const unit = rng.pick(WHOLE_UNITS);
  const a = rng.int(12, 95) * 5;
  const total = a * k;
  return plain(stufe, {
    key: `mal:${unit}:${a}:${k}`,
    ab,
    expression: `${q(a, unit)} · ${k} = ${BOX} ${unit}`,
    value: total,
    unit,
    hints: ['Die Größe kommt mehrmals vor.', 'Rechne erst mit den Zahlen. Die Einheit bleibt.'],
    steps: [`${fmt(a)} · ${k} = ${fmt(total)}`, `Das Ergebnis: ${q(total, unit)}`],
    bugs: [{ id: 'rechenart-+', match: a + k, hint: 'Hier steht ein Mal. Die Größe kommt mehrmals vor.' }],
    praise: 'Du hast multipliziert und die Einheit behalten.',
  });
}

/** Money drawn as coins and notes, plus an amount in the text. */
function coinsPlus(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const have = cents5(rng, 205, 895);
  const more = cents5(rng, 105, 395);
  const person = pickPerson(rng).name;
  const sum = have + more;
  return finish(SKILL, stufe, {
    key: `muenzen:${have}:${more}`,
    ab,
    context: `${person} hat dieses Geld. ${person} bekommt noch ${fmtMoney(more)} dazu.`,
    prompt: `Wie viel Geld hat ${person} jetzt?`,
    visual: { type: 'money', items: moneyItems(have) },
    answer: { kind: 'number', value: sum / 100, unit: '€', decimals: EURO_FIELD, before: `${person} hat` },
    hints: ['Zähl zuerst das Geld im Bild.', 'Rechne dann den Betrag dazu.'],
    steps: [`Im Bild: ${fmtMoney(have)}`, `${fmtMoney(have)} + ${fmtMoney(more)} = ${fmtMoney(sum)}`],
    bugs: [
      (have % 100) + (more % 100) >= 100 ? { id: 'cent-uebertrag', match: (sum - 100) / 100, hint: '100 ct sind 1 €. Zähl diesen Euro mit.' } : null,
      { id: 'rechenart--', match: Math.abs(have - more) / 100, hint: 'Es kommt Geld dazu. Rechne plus.' },
    ],
    praise: 'Du hast das Bild gelesen und den Betrag dazugezählt.',
    srText: speak(`${person} hat dieses Geld: ${moneyWords(have)}. ${person} bekommt noch ${fmtMoney(more)} dazu. Wie viel Geld hat ${person} jetzt?`),
    kmk: KMK,
  });
}

/** □ € + 2,35 € = 5,00 €, 4 · □ m = 100 m. */
function gap(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  if (rng.chance(0.5)) {
    const part = cents5(rng, 105, 695);
    const other = cents5(rng, 105, 695);
    const total = part + other;
    return plain(stufe, {
      key: `luecke-plus:${part}:${other}`,
      ab,
      prompt: 'Welcher Betrag fehlt?',
      expression: `${BOX} € + ${fmtMoney(other)} = ${fmtMoney(total)}`,
      value: part / 100,
      unit: '€',
      hints: ['Das Ergebnis steht schon da. Rechne rückwärts.', 'Zieh den bekannten Betrag vom Ergebnis ab.'],
      steps: [`${fmtMoney(total)} − ${fmtMoney(other)} = ${fmtMoney(part)}`],
      bugs: [{ id: 'rechenart-+', match: (total + other) / 100, hint: 'Rechne rückwärts: Zieh den bekannten Betrag ab.' }],
      praise: 'Du hast mit der Umkehraufgabe gerechnet.',
    });
  }
  const unit = rng.pick(WHOLE_UNITS);
  const k = rng.int(3, 9);
  const part = rng.int(11, 95);
  const total = k * part;
  return plain(stufe, {
    key: `luecke-mal:${unit}:${k}:${part}`,
    ab,
    prompt: 'Welche Größe fehlt?',
    expression: `${k} · ${BOX} ${unit} = ${q(total, unit)}`,
    value: part,
    unit,
    hints: ['Das Ergebnis steht schon da. Rechne rückwärts.', `Teile das Ergebnis durch ${k}.`],
    steps: [`${fmt(total)} : ${k} = ${fmt(part)}`, `Die Lücke ist ${q(part, unit)}.`],
    bugs: [{ id: 'rechenart--', match: total - k, hint: `Vor der Lücke steht ein Mal. Teile durch ${k}.` }],
    praise: 'Du hast mit der Umkehraufgabe gerechnet.',
  });
}

// ─── Stufe 2: different units, time spans ────────────────────────────────────

/** Convert first: 2 m + 40 cm, 3,50 € + 80 ct, 2 kg − 250 g, 1 h + 25 min. */
function convertFirst(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const kind = rng.int(1, 4);
  const convertHints = (small: string) => [`Die Einheiten sind verschieden. Rechne zuerst alles in ${small} um.`, 'Rechne dann mit den Zahlen weiter.'];
  const praise = 'Du hast die Einheit zuerst umgerechnet.';
  if (kind === 1) {
    const a = rng.int(2, 9);
    const b = rng.int(11, 95);
    const value = a * 100 + b;
    return plain(stufe, {
      key: `m+cm:${a}:${b}`,
      ab,
      expression: `${q(a, 'm')} + ${q(b, 'cm')} = ${BOX} cm`,
      value,
      unit: 'cm',
      hints: convertHints('cm'),
      steps: [`${q(a, 'm')} = ${q(a * 100, 'cm')}`, `${q(a * 100, 'cm')} + ${q(b, 'cm')} = ${q(value, 'cm')}`],
      bugs: [{ id: 'einheit-ignoriert', match: a + b, hint: 'Die Einheiten sind verschieden. Rechne zuerst alles in cm um.' }],
      praise,
    });
  }
  if (kind === 2) {
    const a = cents5(rng, 205, 895);
    const b = rng.int(1, 18) * 5;
    const sum = a + b;
    return plain(stufe, {
      key: `eur+ct:${a}:${b}`,
      ab,
      expression: `${fmtMoney(a)} + ${q(b, 'ct')} = ${BOX} €`,
      value: sum / 100,
      unit: '€',
      hints: ['Die Einheiten sind verschieden. Schreib zuerst alles in €.', 'Rechne dann mit dem Komma zusammen.'],
      steps: [`${q(b, 'ct')} = ${fmtMoney(b)}`, `${fmtMoney(a)} + ${fmtMoney(b)} = ${fmtMoney(sum)}`],
      bugs: [{ id: 'einheit-ignoriert', match: a / 100 + b, hint: 'Die Einheiten sind verschieden. Schreib zuerst alles in €.' }],
      praise,
    });
  }
  if (kind === 3) {
    const a = rng.int(2, 9);
    const b = rng.int(3, 19) * 50;
    const value = a * 1000 - b;
    return plain(stufe, {
      key: `kg-g:${a}:${b}`,
      ab,
      expression: `${q(a, 'kg')} − ${q(b, 'g')} = ${BOX} g`,
      value,
      unit: 'g',
      hints: convertHints('g'),
      steps: [`${q(a, 'kg')} = ${q(a * 1000, 'g')}`, `${q(a * 1000, 'g')} − ${q(b, 'g')} = ${q(value, 'g')}`],
      bugs: [{ id: 'einheit-ignoriert', match: b - a, hint: 'Die Einheiten sind verschieden. Rechne zuerst alles in g um.' }],
      praise,
    });
  }
  const h = rng.int(1, 5);
  const m = rng.int(1, 11) * 5;
  const value = h * 60 + m;
  return plain(stufe, {
    key: `h+min:${h}:${m}`,
    ab,
    expression: `${q(h, 'h')} + ${q(m, 'min')} = ${BOX} min`,
    value,
    unit: 'min',
    hints: ['Rechne zuerst die Stunden in Minuten um.', 'Eine Stunde hat 60 Minuten.'],
    steps: [`${q(h, 'h')} = ${q(h * 60, 'min')}`, `${q(h * 60, 'min')} + ${q(m, 'min')} = ${q(value, 'min')}`],
    bugs: [
      { id: 'zeit-hundert', match: h * 100 + m, hint: hundredMinuteHint(value) },
      { id: 'einheit-ignoriert', match: h + m, hint: 'Die Einheiten sind verschieden. Rechne zuerst alles in min um.' },
    ],
    praise,
  });
}

/** The start of a story with a clock time, for a span or an end. */
const EVENTS = [
  { noun: 'der Film', start: 'beginnt', end: 'endet' },
  { noun: 'die Wanderung', start: 'beginnt', end: 'endet' },
  { noun: 'die Zugfahrt', start: 'beginnt', end: 'endet' },
  { noun: 'das Schulfest', start: 'beginnt', end: 'endet' },
] as const;

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const durationFields = (d: number): MultiField[] => [
  { id: 'h', value: Math.floor(d / 60), after: 'h', decimals: COMMA_FIELD, label: 'Stunden' },
  { id: 'min', value: d % 60, after: 'min', decimals: COMMA_FIELD, label: 'Minuten' },
];

const clockFields = (t: number): MultiField[] => [
  { id: 'h', value: Math.floor(t / 60), after: '.', decimals: COMMA_FIELD, label: 'Stunde' },
  { id: 'min', value: t % 60, after: 'Uhr', decimals: COMMA_FIELD, label: 'Minuten' },
];

/** A start with minutes and a duration of at least an hour that goes over the next full hour. */
function timeTask(rng: Rng): { start: number; dur: number; end: number } {
  const start = rng.int(8, 17) * 60 + rng.int(3, 11) * 5;
  const dur = rng.int(1, 3) * 60 + rng.int(4, 11) * 5;
  return { start, dur, end: start + dur };
}

function span(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const { start, dur, end } = timeTask(rng);
  const e = rng.pick(EVENTS);
  const fullHour = Math.ceil(start / 60) * 60;
  const wrong = hundredMinuteSpan(start, end);
  return finish(SKILL, stufe, {
    key: `spanne:${start}:${end}:${e.noun}`,
    ab,
    context: `${capitalized(e.noun)} ${e.start} um ${clock(start)}. Um ${clock(end)} ${e.end} ${e.noun}.`,
    prompt: `Wie lange dauert ${e.noun}?`,
    expression: `${BOX} h ${BOX} min`,
    visual: clockVisual(start),
    answer: { kind: 'multi', fields: durationFields(dur) },
    hints: ['Ergänze zuerst bis zur vollen Stunde.', 'Eine Stunde hat 60 Minuten, nicht 100.'],
    steps: [`${clock(start)} bis ${clock(fullHour)}: ${fmtDuration(fullHour - start)}`, `${clock(fullHour)} bis ${clock(end)}: ${fmtDuration(end - fullHour)}`, `${fmtDuration(fullHour - start)} + ${fmtDuration(end - fullHour)} = ${fmtDuration(dur)}`],
    bugs: [{ id: 'zeit-hundert', match: wrong, hint: 'Eine Stunde hat 60 Minuten, nicht 100. Ergänze bis zur vollen Stunde.' }],
    praise: 'Du bist über die volle Stunde gegangen.',
    kmk: KMK,
  });
}

function endTime(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const { start, dur, end } = timeTask(rng);
  const e = rng.pick(EVENTS);
  const fullHour = Math.ceil(start / 60) * 60;
  const hop = fullHour - start;
  const steps = dur > hop
    ? [`${clock(start)} + ${fmtDuration(hop)} = ${clock(fullHour)}`, `${clock(fullHour)} + ${fmtDuration(dur - hop)} = ${clock(end)}`]
    : [`${clock(start)} + ${fmtDuration(dur)} = ${clock(end)}`];
  return finish(SKILL, stufe, {
    key: `ende:${start}:${dur}:${e.noun}`,
    ab,
    context: `${capitalized(e.noun)} ${e.start} um ${clock(start)}. Die Dauer ist ${fmtDuration(dur)}.`,
    prompt: `Wann ${e.end} ${e.noun}?`,
    visual: clockVisual(start),
    answer: { kind: 'multi', fields: clockFields(end) },
    hints: ['Rechne zuerst bis zur vollen Stunde.', 'Rechne dann die restliche Zeit dazu.'],
    steps,
    bugs: [{ id: 'zeit-hundert', match: { h: Math.floor(start / 60) + Math.floor(dur / 60), min: (start % 60) + (dur % 60) }, hint: 'Eine Stunde hat 60 Minuten. Bei 60 Minuten beginnt die nächste Stunde.' }],
    praise: 'Du hast die Zeit über die volle Stunde weitergezählt.',
    kmk: KMK,
  });
}

/** Back from an end time. */
function startTime(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const { start, dur, end } = timeTask(rng);
  const e = rng.pick(EVENTS);
  const fullHour = Math.floor(end / 60) * 60;
  const hop = end - fullHour;
  const asDecimal = Math.floor(end / 60) * 100 + (end % 60) - (Math.floor(dur / 60) * 100 + (dur % 60));
  const steps = dur > hop && hop > 0
    ? [`${clock(end)} − ${fmtDuration(hop)} = ${clock(fullHour)}`, `${clock(fullHour)} − ${fmtDuration(dur - hop)} = ${clock(start)}`]
    : [`${clock(end)} − ${fmtDuration(dur)} = ${clock(start)}`];
  return finish(SKILL, stufe, {
    key: `anfang:${end}:${dur}:${e.noun}`,
    ab,
    context: `${capitalized(e.noun)} ${e.end} um ${clock(end)}. Die Dauer ist ${fmtDuration(dur)}.`,
    prompt: `Wann ${e.start} ${e.noun}?`,
    visual: clockVisual(end),
    answer: { kind: 'multi', fields: clockFields(start) },
    hints: ['Rechne rückwärts: zuerst bis zur vollen Stunde.', 'Zieh dann die restliche Zeit ab.'],
    steps,
    bugs: [{ id: 'zeit-hundert', match: { h: Math.floor(asDecimal / 100), min: asDecimal % 100 }, hint: 'Eine Stunde hat 60 Minuten, nicht 100. Geh über die volle Stunde.' }],
    praise: 'Du hast über die volle Stunde rückwärts gerechnet.',
    kmk: KMK,
  });
}

/** With mixed quantities: 5 kg − 1 kg 250 g, 2 h 15 min − 40 min, 2 km − 350 m. */
function mixedMinus(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const kind = rng.int(1, 3);
  if (kind === 1) {
    const a = rng.int(3, 9) * 1000;
    const b = rng.int(1, 2) * 1000 + rng.int(1, 19) * 50;
    const value = a - b;
    return plain(stufe, {
      key: `kg-mix:${a}:${b}`,
      ab,
      expression: `${q(a / 1000, 'kg')} − ${fmtMixed(b, 1000, 'kg', 'g')} = ${BOX} g`,
      value,
      unit: 'g',
      hints: ['Schreib beide Größen in g.', '1 kg sind 1000 g.'],
      steps: [`${q(a / 1000, 'kg')} = ${q(a, 'g')}`, `${fmtMixed(b, 1000, 'kg', 'g')} = ${q(b, 'g')}`, `${q(a, 'g')} − ${q(b, 'g')} = ${q(value, 'g')}`],
      bugs: [{ id: 'einheit-ignoriert', match: a / 1000 - Math.floor(b / 1000), hint: 'Die Gramm zählen auch. Schreib beide Größen in g.' }],
      praise: 'Du hast beide Größen in Gramm geschrieben.',
    });
  }
  if (kind === 2) {
    const h = rng.int(1, 3);
    const m = rng.int(1, 5) * 5;
    const off = rng.int(6, 11) * 5;
    const value = h * 60 + m - off;
    return plain(stufe, {
      key: `h-mix:${h}:${m}:${off}`,
      ab,
      expression: `${fmtMixed(h * 60 + m, 60, 'h', 'min')} − ${q(off, 'min')} = ${BOX} min`,
      value,
      unit: 'min',
      hints: ['Schreib zuerst alles in Minuten.', 'Eine Stunde hat 60 Minuten.'],
      steps: [`${fmtMixed(h * 60 + m, 60, 'h', 'min')} = ${q(h * 60 + m, 'min')}`, `${q(h * 60 + m, 'min')} − ${q(off, 'min')} = ${q(value, 'min')}`],
      bugs: [{ id: 'zeit-hundert', match: h * 100 + m - off, hint: hundredMinuteHint(value) }],
      praise: 'Du hast die Zeit in Minuten umgerechnet.',
    });
  }
  const km = rng.int(2, 9);
  const m = rng.int(11, 95) * 10;
  const value = km * 1000 - m;
  return plain(stufe, {
    key: `km-m:${km}:${m}`,
    ab,
    expression: `${q(km, 'km')} − ${q(m, 'm')} = ${BOX} m`,
    value,
    unit: 'm',
    hints: ['Rechne zuerst alles in m um.', '1 km sind 1000 m.'],
    steps: [`${q(km, 'km')} = ${q(km * 1000, 'm')}`, `${q(km * 1000, 'm')} − ${q(m, 'm')} = ${q(value, 'm')}`],
    bugs: [{ id: 'einheit-ignoriert', match: m - km, hint: 'Die Einheiten sind verschieden. Rechne zuerst alles in m um.' }],
    praise: 'Du hast zuerst alles in Meter umgerechnet.',
  });
}

// ─── Stufe 3: Teilen, two steps ──────────────────────────────────────────────

/** 12 m : 3 m = 4: the result counts how often. 2,40 € : 3 = 0,80 €: the result keeps the unit. */
function divide(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  if (rng.chance(0.6)) {
    const unit = rng.pick(WHOLE_UNITS);
    // The whole expression stays on one line of a phone, so 'min', the longest unit, has the smaller numbers.
    const part = rng.int(2, unit === 'min' ? 9 : 12);
    const count = rng.int(3, unit === 'min' ? 10 : 12);
    const total = part * count;
    return plain(stufe, {
      key: `wie-oft:${unit}:${total}:${part}`,
      ab,
      prompt: 'Wie oft passt die zweite Größe in die erste?',
      expression: `${q(total, unit)} : ${q(part, unit)} = ${BOX}`,
      value: count,
      hints: ['Beide Größen haben dieselbe Einheit. Teile die Zahlen.', 'Das Ergebnis hat keine Einheit. Es ist eine Anzahl.'],
      steps: [`${q(total, unit)} : ${q(part, unit)} = ${fmt(count)}`, `${q(part, unit)} passen ${fmt(count)}-mal hinein.`],
      bugs: [{ id: 'rechenart--', match: total - part, hint: 'Hier steht ein Geteilt. Wie oft passt die zweite Größe hinein?' }],
      praise: 'Du hast gesehen: Das Ergebnis ist eine Anzahl.',
    });
  }
  const k = rng.int(3, 9);
  const part = cents5(rng, 25, 295);
  const total = part * k;
  return plain(stufe, {
    key: `teilen:${total}:${k}`,
    ab,
    expression: `${fmtMoney(total)} : ${k} = ${BOX} €`,
    value: part / 100,
    unit: '€',
    hints: ['Hier teilst du den Betrag gleichmäßig.', 'Rechne in Cent. Dann teilst du ohne Komma.'],
    steps: [`${fmtMoney(total)} = ${q(total, 'ct')}`, `${q(total, 'ct')} : ${k} = ${q(part, 'ct')}`, `${q(part, 'ct')} = ${fmtMoney(part)}`],
    bugs: [{ id: 'rechenart--', match: (total - k * 100) / 100, hint: 'Hier steht ein Geteilt. Verteile den Betrag gleichmäßig.' }],
    praise: 'Du hast in Cent gerechnet und richtig geteilt.',
  });
}

/** 2 m : 40 cm, 3 kg : 250 g, 1 h 30 min : 15 min, 4,50 € : 50 ct. */
function divideConvert(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const kind = rng.int(1, 4);
  const prompt = 'Wie oft passt die zweite Größe in die erste?';
  const praise = 'Du hast erst dieselbe Einheit hergestellt.';
  if (kind === 1) {
    const part = rng.pick([20, 25, 40, 50]);
    // The answer is a count: 40 cm fits a whole number of times only into an even number of metres.
    const m = part === 40 ? rng.int(1, 3) * 2 : rng.int(1, 6);
    const count = (m * 100) / part;
    return plain(stufe, {
      key: `m:cm:${m}:${part}`,
      ab,
      prompt,
      expression: `${q(m, 'm')} : ${q(part, 'cm')} = ${BOX}`,
      value: count,
      hints: ['Beide Größen brauchen dieselbe Einheit.', 'Schreib die erste Größe in cm.'],
      steps: [`${q(m, 'm')} = ${q(m * 100, 'cm')}`, `${q(m * 100, 'cm')} : ${q(part, 'cm')} = ${fmt(count)}`],
      bugs: [{ id: 'einheit-ignoriert', match: m / part, hint: 'Die Einheiten sind verschieden. Schreib zuerst beide Größen in cm.' }],
      praise,
    });
  }
  if (kind === 2) {
    const part = rng.pick([100, 125, 200, 250, 500]);
    const kg = rng.int(1, 5);
    const count = (kg * 1000) / part;
    return plain(stufe, {
      key: `kg:g:${kg}:${part}`,
      ab,
      prompt,
      expression: `${q(kg, 'kg')} : ${q(part, 'g')} = ${BOX}`,
      value: count,
      hints: ['Beide Größen brauchen dieselbe Einheit.', 'Schreib die erste Größe in g.'],
      steps: [`${q(kg, 'kg')} = ${q(kg * 1000, 'g')}`, `${q(kg * 1000, 'g')} : ${q(part, 'g')} = ${fmt(count)}`],
      bugs: [{ id: 'einheit-ignoriert', match: kg / part, hint: 'Die Einheiten sind verschieden. Schreib zuerst beide Größen in g.' }],
      praise,
    });
  }
  if (kind === 3) {
    const part = rng.pick([10, 15, 20, 30]);
    const count = rng.int(3, 12);
    const total = part * count;
    return plain(stufe, {
      key: `h:min:${total}:${part}`,
      ab,
      prompt,
      expression: `${fmtDuration(total)} : ${q(part, 'min')} = ${BOX}`,
      value: count,
      hints: ['Schreib die erste Größe nur in Minuten.', 'Eine Stunde hat 60 Minuten.'],
      steps: [`${fmtDuration(total)} = ${q(total, 'min')}`, `${q(total, 'min')} : ${q(part, 'min')} = ${fmt(count)}`],
      bugs: [{ id: 'zeit-hundert', match: (Math.floor(total / 60) * 100 + (total % 60)) / part, hint: 'Eine Stunde hat 60 Minuten, nicht 100.' }],
      praise,
    });
  }
  const part = rng.pick([20, 25, 50]);
  const count = rng.int(3, 12);
  const total = part * count;
  return plain(stufe, {
    key: `eur:ct:${total}:${part}`,
    ab,
    prompt,
    expression: `${fmtMoney(total)} : ${q(part, 'ct')} = ${BOX}`,
    value: count,
    hints: ['Beide Größen brauchen dieselbe Einheit.', 'Schreib den Betrag in ct.'],
    steps: [`${fmtMoney(total)} = ${q(total, 'ct')}`, `${q(total, 'ct')} : ${q(part, 'ct')} = ${fmt(count)}`],
    bugs: [{ id: 'einheit-ignoriert', match: total / 100 / part, hint: 'Die Einheiten sind verschieden. Schreib den Betrag zuerst in ct.' }],
    praise,
  });
}

/** A story with two steps. nur-erster-schritt: the child stops after the first. */
function twoSteps(stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const kind = rng.int(1, 4);
  const person = pickPerson(rng).name;
  const praise = 'Du hast beide Schritte gerechnet.';
  if (kind === 1) {
    const total = rng.int(8, 20);
    const n = rng.int(2, 5);
    const each = rng.pick([50, 75, 125, 150]);
    const cut = n * each;
    const value = total * 100 - cut;
    return finish(SKILL, stufe, {
      key: `seil:${total}:${n}:${each}`,
      ab,
      context: `Ein Seil ist ${q(total, 'm')} lang. ${person} schneidet ${n} Stücke ab. Jedes Stück ist ${q(each, 'cm')} lang.`,
      prompt: 'Wie viele Meter bleiben übrig?',
      answer: { kind: 'number', value: value / 100, unit: 'm', decimals: COMMA_FIELD },
      hints: ['Rechne zuerst die abgeschnittene Länge aus.', 'Zieh diese Länge vom ganzen Seil ab.'],
      steps: [`${n} · ${q(each, 'cm')} = ${q(cut, 'cm')}`, `${q(total, 'm')} = ${q(total * 100, 'cm')}`, `${q(total * 100, 'cm')} − ${q(cut, 'cm')} = ${q(value, 'cm')}`, `Das sind ${q(value / 100, 'm')}.`],
      bugs: [{ id: 'nur-erster-schritt', match: cut / 100, hint: 'Das ist der abgeschnittene Teil. Gefragt ist der Rest.' }],
      praise,
      kmk: [...KMK, 'PK.modellieren'],
    });
  }
  if (kind === 2) {
    const n = rng.int(2, 6);
    const price = cents5(rng, 95, 240);
    const pay = Math.ceil((n * price) / 500) * 500 + 500;
    const cost = n * price;
    return finish(SKILL, stufe, {
      key: `rueckgeld:${n}:${price}:${pay}`,
      ab,
      context: `${person} kauft ${n} Hefte zu je ${fmtMoney(price)}. ${person} bezahlt mit ${euro(pay)}.`,
      prompt: `Wie viel Geld bekommt ${person} zurück?`,
      answer: { kind: 'number', value: (pay - cost) / 100, unit: '€', decimals: EURO_FIELD },
      hints: ['Rechne zuerst den Preis aller Hefte aus.', 'Zieh diesen Preis vom bezahlten Betrag ab.'],
      steps: [`${n} · ${fmtMoney(price)} = ${fmtMoney(cost)}`, `${euro(pay)} − ${fmtMoney(cost)} = ${fmtMoney(pay - cost)}`],
      bugs: [{ id: 'nur-erster-schritt', match: cost / 100, hint: 'Das ist der Preis der Hefte. Gefragt ist das Rückgeld.' }],
      praise,
      kmk: [...KMK, 'PK.modellieren'],
    });
  }
  if (kind === 3) {
    const round = rng.pick([200, 250, 400]);
    const n = rng.int(3, 12);
    const m = round * n;
    return finish(SKILL, stufe, {
      key: `runden:${round}:${n}`,
      ab,
      context: `Eine Runde auf dem Sportplatz ist ${q(round, 'm')} lang. ${person} läuft ${n} Runden.`,
      prompt: `Wie viele Kilometer läuft ${person} zusammen?`,
      answer: { kind: 'number', value: m / 1000, unit: 'km', decimals: COMMA_FIELD },
      hints: ['Rechne zuerst die Meter für alle Runden aus.', '1000 m sind 1 km.'],
      steps: [`${n} · ${q(round, 'm')} = ${q(m, 'm')}`, `${q(m, 'm')} = ${q(m / 1000, 'km')}`],
      bugs: [{ id: 'nur-erster-schritt', match: m, hint: 'Das sind noch Meter. Gefragt sind Kilometer.' }],
      praise,
      kmk: [...KMK, 'PK.modellieren'],
    });
  }
  const box = rng.int(1, 3);
  const n = rng.int(2, 8) * 2;
  const each = rng.pick([250, 500, 750]);
  const content = n * each;
  const total = box * 1000 + content;
  return finish(SKILL, stufe, {
    key: `kiste:${box}:${n}:${each}`,
    ab,
    context: `Eine leere Kiste wiegt ${q(box, 'kg')}. In der Kiste liegen ${n} Pakete. Jedes Paket wiegt ${q(each, 'g')}.`,
    prompt: 'Wie schwer ist die volle Kiste in kg?',
    answer: { kind: 'number', value: total / 1000, unit: 'kg', decimals: COMMA_FIELD },
    hints: ['Rechne zuerst das Gewicht aller Pakete aus.', 'Zähl dann die leere Kiste dazu.'],
    steps: [`${n} · ${q(each, 'g')} = ${q(content, 'g')}`, `${q(content, 'g')} + ${q(box * 1000, 'g')} = ${q(total, 'g')}`, `Das sind ${q(total / 1000, 'kg')}.`],
    bugs: [{ id: 'nur-erster-schritt', match: content / 1000, hint: 'Das sind nur die Pakete. Die Kiste wiegt auch etwas.' }],
    praise,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

export const rechnenSkill: SkillDef = {
  ...SKILL,
  title: 'Mit Größen rechnen',
  description: 'Du rechnest mit Einheiten und achtest darauf, dass sie passen.',
  stufen: {
    1: 'Gleiche Einheit: plus, minus, mal einer Zahl',
    2: 'Verschiedene Einheiten umrechnen; Zeitspannen über volle Stunden',
    3: 'Teilen wie 12 m : 3 m; zwei Rechenschritte',
  },
  kmk: KMK,
  keys: { comma: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) return rng.chance(0.5) ? moneySum(stufe, ab, rng, false) : wholeSum(stufe, ab, rng);
      if (ab === 2) {
        const kind = rng.int(1, 3);
        if (kind === 1) return moneySum(stufe, ab, rng, true);
        return kind === 2 ? times(stufe, ab, rng) : coinsPlus(stufe, ab, rng);
      }
      return gap(stufe, ab, rng);
    }
    if (stufe === 2) {
      if (ab === 1) return convertFirst(stufe, ab, rng);
      if (ab === 2) return rng.chance(0.5) ? span(stufe, ab, rng) : endTime(stufe, ab, rng);
      return rng.chance(0.4) ? startTime(stufe, ab, rng) : mixedMinus(stufe, ab, rng);
    }
    if (ab === 1) return divide(stufe, ab, rng);
    if (ab === 2) return divideConvert(stufe, ab, rng);
    return twoSteps(stufe, ab, rng);
  },
};
