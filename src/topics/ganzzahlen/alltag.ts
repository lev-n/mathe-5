/**
 * Negative Zahlen im Alltag (docs/research.md §6). Stufe 1: read a thermometer or a height. Stufe 2: text to number. Stufe 3: which story fits a number.
 * AB varies the scale (Stufe 1), the wording (Stufe 2) and how much of a story has to be followed (Stufe 3). A height is read on a horizontal Zahlengerade, as the thermometer
 * visual only takes °C: its texts speak of the 0 and of negative numbers, never of left as below sea level.
 */
import { fmt, fmtQty, fmtTemp } from '../../core/format';
import type { Ab, Bug, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, multiBugs, numberBugs, signedNumber, targetAb } from '../shared';
import { assemble, bug, type Form, KMK_ZAHLEN, line, lineInWords, say, thermometerInWords } from './helpers';

const SKILL = { id: 'ganzzahlen.alltag', topicId: 'ganzzahlen' } as const;

const COUNT_FROM_ZERO = 'Unter der 0 zählst du von der 0 nach unten: −1, −2, −3.';
/** Deeper than this it is no cellar any more. */
const CELLAR_MAX = 10;
/** The largest number of a story: every context of stories() holds it. */
const STORY_MAX = 30;

// ─── Stufe 1: read ───────────────────────────────────────────────────────────

function readBugs(v: number, tick: number, wrongSide: Bug | false, what = 'Der Stand'): Bug[] {
  return numberBugs([
    bug('vorzeichen-vergessen', -v, v < 0 ? `${what} liegt unter der 0. Dort schreibst du ein Minus.` : `${what} liegt über der 0. Dort steht kein Minus.`),
    tick > 1 && bug('strich-zaehlt', v / tick, 'Schau zuerst: Wie viel zählt ein Strich?'),
    wrongSide,
  ], v, true);
}

function readThermometer(v: number, min: number, max: number, step: number, labelledEvery: number): Form {
  const between = step === 1 && labelledEvery === 2 && v < 0;
  const visual = { type: 'thermometer', min, max, step, value: v, unit: '°C' } as const;
  return {
    key: `thermometer:${min}:${max}:${step}:${v}`,
    prompt: 'Welche Temperatur zeigt das Thermometer?',
    visual,
    answer: signedNumber(v, { unit: '°C' }),
    hints: ['Such zuerst die 0 am Thermometer.', step === 1 ? 'Zähle von der 0 aus die Striche.' : `Ein Strich zählt ${step} Grad. Zähle von der 0 aus.`],
    steps: [
      `Ein Strich zählt ${step} Grad.`,
      `Der Stand liegt ${fmt(Math.abs(v))} Grad ${v < 0 ? 'unter' : 'über'} der 0.`,
      `Das Thermometer zeigt ${fmtTemp(v)}.`,
    ],
    bugs: readBugs(v, step, between && bug('richtung-negativ', v - 2, COUNT_FROM_ZERO)),
    praise: 'Du hast die Grad von der 0 aus gezählt.',
    srText: say(thermometerInWords(visual), 'Welche Temperatur zeigt das Thermometer?'),
  };
}

const DEEP = [
  { id: 'roboter', context: 'Der Pfeil R zeigt die Höhe eines Tauchroboters.', prompt: 'Auf welcher Höhe ist der Tauchroboter?', mark: 'R' },
  { id: 'uboot', context: 'Der Pfeil U zeigt die Höhe eines U-Boots.', prompt: 'Auf welcher Höhe ist das U-Boot?', mark: 'U' },
  { id: 'wrack', context: 'Der Pfeil W zeigt die Höhe eines Wracks.', prompt: 'Auf welcher Höhe liegt das Wrack?', mark: 'W' },
];

function readHeight(rng: Rng, v: number, min: number, max: number, major: number, minor: number): Form {
  const place = rng.pick(DEEP);
  const low = Math.floor(v / major) * major;
  const axis = line(min, max, major, minor, { marks: [{ value: v, label: place.mark }] });
  return {
    key: `hoehe:${place.id}:${min}:${max}:${minor}:${v}`,
    context: `${place.context} 0 m ist der Meeresspiegel.`,
    prompt: place.prompt,
    visual: axis,
    answer: signedNumber(v, { unit: 'm' }),
    hints: ['Such zuerst die 0. Das ist der Meeresspiegel.', 'Schau: Wie viel zählt ein Strich?'],
    steps: [
      `Ein Strich zählt ${fmt(minor)} m.`,
      `Der Pfeil steht ${fmtQty(Math.abs(v), 'm')} von der 0 entfernt, bei den negativen Zahlen.`,
      `Die Höhe ist ${fmtQty(v, 'm')}.`,
    ],
    bugs: readBugs(v, minor, v % major !== 0 && bug('richtung-negativ', low + (low + major) - v, `Zähle die Striche von der 0 bis zum Pfeil. Ein Strich zählt ${fmt(minor)} m.`), 'Die Höhe'),
    praise: 'Du hast den Abstand zum Meeresspiegel abgelesen.',
    srText: say(place.context, '0 m ist der Meeresspiegel.', lineInWords(axis), place.prompt),
  };
}

/** Reversed: from the level to the count of ticks, so the value of a tick has to be used. */
function countTicks(rng: Rng): Form {
  const min = rng.pick([-30, -24, -20]);
  const max = min + 30;
  const v = 2 * rng.int(min / 2 + 1, -2);
  const ticks = -v / 2;
  const visual = { type: 'thermometer', min, max, step: 2, value: v, unit: '°C' } as const;
  return {
    key: `striche:${min}:${v}`,
    prompt: 'Wie viele Striche liegt der Stand unter der 0?',
    visual,
    answer: signedNumber(ticks, { after: 'Striche' }),
    hints: ['Ein Strich zählt 2 Grad.', 'Lies den Stand ab. Teile dann durch 2.'],
    steps: [`Das Thermometer zeigt ${fmtTemp(v)}.`, `Ein Strich zählt 2 Grad.`, `${fmt(-v)} : 2 = ${fmt(ticks)}`],
    bugs: numberBugs([bug('strich-zaehlt', -v, 'Das sind die Grad. Ein Strich zählt aber 2 Grad.')], ticks, true),
    praise: 'Du hast den Wert eines Strichs genutzt.',
    srText: say(thermometerInWords(visual), 'Wie viele Striche liegt der Stand unter der 0?'),
  };
}

function stufe1(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    if (rng.chance(0.75)) {
      const min = rng.pick([-15, -12, -10]);
      const max = min + 15;
      const v = max >= 2 && rng.chance(0.2) ? rng.int(1, max - 1) : rng.int(min + 1, -1);
      return readThermometer(v, min, max, 1, 1);
    }
    const min = -100 * rng.int(4, 6);
    return readHeight(rng, -100 * rng.int(1, -min / 100 - 1), min, 200, 100, 100);
  }
  if (ab === 2) {
    if (rng.chance(0.5)) {
      const min = rng.pick([-16, -12, -10]);
      // with 20 ticks every second one is labelled: an odd distance from the lower end lies between two labels
      const between = Array.from({ length: -min - 1 }, (_, i) => min + 1 + i).filter((t) => (t - min) % 2 !== 0);
      return readThermometer(rng.pick(between), min, min + 20, 1, 2);
    }
    if (rng.chance(0.5)) {
      const min = rng.pick([-30, -24, -20]);
      return readThermometer(2 * rng.int(min / 2 + 1, -1), min, min + 30, 2, 1);
    }
    const min = -100 * rng.int(4, 6);
    return readHeight(rng, -50 * (2 * rng.int(1, -min / 100 - 1) - 1), min, 200, 100, 50);
  }
  if (rng.chance(0.5)) return countTicks(rng);
  const min = -100 * rng.int(3, 5);
  let v = -20 * rng.int(1, (-min - 20) / 20);
  if (v % 100 === 0) v -= 20;
  return readHeight(rng, v, min, 100, 100, 20);
}

// ─── Stufe 2: text to number ─────────────────────────────────────────────────

interface Statement {
  id: string;
  text: string;
  value: number;
  unit?: string;
  /** The word that decides the sign. */
  cue: string;
}

function direct(rng: Rng): Statement {
  const neg = rng.chance(0.7);
  const v = (n: number) => (neg ? -n : n);
  // each context has its own range
  const kind = rng.int(0, 3);
  if (kind === 0) { const n = rng.int(2, 25); return { id: 'wetter', text: `Das Thermometer zeigt ${n} Grad ${neg ? 'unter' : 'über'} null.`, value: v(n), unit: '°C', cue: neg ? 'unter null' : 'über null' }; }
  if (kind === 1) { const n = rng.int(2, 40); return { id: 'meer', text: neg ? `Ein Taucher ist ${n} m unter dem Meeresspiegel.` : `Ein Vogel fliegt ${n} m über dem Meeresspiegel.`, value: v(n), unit: 'm', cue: neg ? 'unter dem Meeresspiegel' : 'über dem Meeresspiegel' }; }
  if (kind === 2) { const n = neg ? rng.int(2, CELLAR_MAX) : rng.int(3, 30); return { id: 'keller', text: neg ? `Der Keller liegt ${n} m unter der Straße.` : `Der Balkon liegt ${n} m über der Straße.`, value: v(n), unit: 'm', cue: neg ? 'unter der Straße' : 'über der Straße' }; }
  const n = rng.int(2, 40);
  return { id: 'konto', text: neg ? `Das Konto zeigt ${n} € Schulden.` : `Das Konto zeigt ${n} € Guthaben.`, value: v(n), unit: '€', cue: neg ? 'Schulden' : 'Guthaben' };
}

function indirect(rng: Rng): Statement {
  const kind = rng.int(0, 5);
  if (kind === 0) { const n = rng.int(3, 25); return { id: 'minusgrade', text: `Heute Nacht sind es ${n} Minusgrade.`, value: -n, unit: '°C', cue: 'Minusgrade' }; }
  if (kind === 1) { const n = rng.int(1, 6); return { id: 'aufzug', text: `Der Aufzug hält im ${n}. Untergeschoss.`, value: -n, cue: 'Untergeschoss' }; }
  if (kind === 2) { const n = 10 * rng.int(4, 90); return { id: 'wrack', text: `Das Wrack liegt ${n} m tief im Meer.`, value: -n, unit: 'm', cue: 'tief im Meer' }; }
  if (kind === 3) { const n = 10 * rng.int(3, 60); return { id: 'minus', text: `Das Konto steht mit ${n} € im Minus.`, value: -n, unit: '€', cue: 'im Minus' }; }
  if (kind === 4) { const n = rng.int(90, 290) * 10; return { id: 'gipfel', text: `Der Gipfel liegt ${fmt(n)} m über dem Meer.`, value: n, unit: 'm', cue: 'über dem Meer' }; }
  const n = 10 * rng.int(3, 60);
  return { id: 'plus', text: `Das Konto steht mit ${n} € im Plus.`, value: n, unit: '€', cue: 'im Plus' };
}

function statementForm(s: Statement): Form {
  const shown = s.unit ? fmtQty(s.value, s.unit) : fmt(s.value);
  return {
    key: `text:${s.id}:${s.value}`,
    context: s.text,
    prompt: 'Welche Zahl passt dazu?',
    answer: signedNumber(s.value, s.unit ? { unit: s.unit } : {}),
    hints: ['Such das Wort für die Richtung: unter oder über, Schulden oder Guthaben?', 'Werte unter 0 bekommen ein Minus.'],
    steps: [`„${s.cue}“ heißt: Der Wert liegt ${s.value < 0 ? 'unter' : 'über'} 0.`, `Die Zahl ist ${shown}.`],
    bugs: numberBugs([
      s.value < 0
        ? bug('vorzeichen-vergessen', -s.value, `„${s.cue}“ heißt: unter 0. Schreib ein Minus vor die Zahl.`)
        : bug('vorzeichen-umgekehrt', -s.value, `„${s.cue}“ heißt: über 0. Diese Zahl ist positiv.`),
    ], s.value, true),
    praise: `Du hast auf „${s.cue}“ geachtet.`,
    srText: say(s.text, 'Welche Zahl passt dazu?'),
  };
}

function pairForm(rng: Rng): Form {
  const kind = rng.int(0, 2);
  // two temperatures of one morning stay close together
  const size = kind === 0 ? 10 : 30;
  const x = rng.int(2, size);
  const y = rng.int(2, size);
  const [firstNeg, secondNeg] = rng.pick([[true, false], [false, true], [true, true]] as const);
  const a = firstNeg ? -x : x;
  const b = secondNeg ? -y : y;
  const pair = [
    {
      id: 'tag', unit: '°C', names: ['Morgens', 'Mittags'],
      text: `Morgens sind es ${x} Grad ${firstNeg ? 'unter' : 'über'} null. Mittags sind es ${y} Grad ${secondNeg ? 'unter' : 'über'} null.`,
    },
    {
      id: 'meer', unit: 'm', names: ['Punkt A', 'Punkt B'],
      text: `Punkt A liegt ${x} m ${firstNeg ? 'unter' : 'über'} dem Meeresspiegel. Punkt B liegt ${y} m ${secondNeg ? 'unter' : 'über'} dem Meeresspiegel.`,
    },
    {
      id: 'konto', unit: '€', names: ['Konto A', 'Konto B'],
      text: `Konto A zeigt ${x} € ${firstNeg ? 'Schulden' : 'Guthaben'}. Konto B zeigt ${y} € ${secondNeg ? 'Schulden' : 'Guthaben'}.`,
    },
  ][kind];
  const fields = [
    { id: 'a', value: a, signed: true, before: `${pair.names[0]}:`, after: pair.unit, label: pair.names[0] },
    { id: 'b', value: b, signed: true, before: `${pair.names[1]}:`, after: pair.unit, label: pair.names[1] },
  ];
  return {
    key: `paar:${pair.id}:${a}:${b}`,
    context: pair.text,
    prompt: 'Schreib beide Werte als Zahlen.',
    answer: { kind: 'multi', fields },
    hints: ['Prüfe jede Angabe einzeln: Liegt der Wert unter 0 oder über 0?', 'Werte unter 0 bekommen ein Minus.'],
    steps: [`${pair.names[0]}: ${fmtQty(a, pair.unit)}`, `${pair.names[1]}: ${fmtQty(b, pair.unit)}`],
    bugs: multiBugs([
      bug('vorzeichen-vergessen', { a: Math.abs(a), b: Math.abs(b) }, 'Mindestens ein Wert liegt unter 0. Dort fehlt ein Minus.'),
      bug('vorzeichen-umgekehrt', { a: -a, b: -b }, 'Unter 0 bekommt ein Minus. Über 0 bleibt positiv.'),
    ], fields),
    praise: 'Du hast jede Angabe einzeln geprüft.',
    srText: say(pair.text, 'Schreib beide Werte als Zahlen.'),
  };
}

// ─── Stufe 3: which story fits ───────────────────────────────────────────────

function stories(n: number) {
  return [
    { id: 'wetter', unit: '°C', neg: `Es sind ${n} Grad unter null.`, pos: `Es sind ${n} Grad über null.`, change: `Die Temperatur fällt um ${n} Grad.` },
    { id: 'meer', unit: 'm', neg: `Ein Taucher ist ${n} m unter dem Meeresspiegel.`, pos: `Ein Vogel fliegt ${n} m über dem Meeresspiegel.`, change: `Ein Taucher taucht ${n} m tiefer.` },
    { id: 'konto', unit: '€', neg: `Ein Konto zeigt ${n} € Schulden.`, pos: `Ein Konto zeigt ${n} € Guthaben.`, change: `Von einem Konto gehen ${n} € ab.` },
    { id: 'keller', unit: 'm', neg: `${n <= CELLAR_MAX ? 'Der Keller' : 'Der Tunnel'} liegt ${n} m unter der Straße.`, pos: `Der Balkon liegt ${n} m über der Straße.`, change: `Der Aufzug fährt ${n} m nach unten.` },
  ];
}

const POSITIVE_STORY = 'Diese Geschichte gehört zu einer positiven Zahl. Such einen Wert unter 0.';

function storyDirect(rng: Rng): Form {
  const n = rng.int(4, STORY_MAX);
  const all = rng.shuffle(stories(n));
  const prompt = `Welche Geschichte passt zu ${fmt(-n)}?`;
  // a second story below 0 with another number: the word alone does not decide
  const other = n < STORY_MAX / 2 ? n + rng.int(1, 5) : n - rng.int(1, 3);
  const near = stories(other).find((s) => s.id === all[1].id)!;
  return {
    key: `geschichte:${all[0].id}:${n}:${other}`,
    prompt,
    answer: makeChoice(rng, { label: all[0].neg }, [
      { label: near.neg, whyWrong: `Diese Geschichte gehört zu ${fmt(-other)}. Prüfe auch die Zahl.` },
      ...all.slice(2).map((s) => ({ label: s.pos, whyWrong: POSITIVE_STORY })),
    ]),
    hints: ['Eine negative Zahl steht für einen Wert unter 0.', 'Such „unter“ oder „Schulden“. Prüfe dann auch die Zahl.'],
    steps: [`${fmt(-n)} liegt ${n} unter der 0.`, `Das passt: ${all[0].neg}`],
    praise: 'Du hast die Zahl mit der Geschichte verbunden.',
    srText: say(prompt),
    kmk: ['PK.modellieren'],
  };
}

function storyWithUnit(rng: Rng): Form {
  const n = rng.int(4, STORY_MAX);
  const all = rng.shuffle(stories(n));
  const pick = all[0];
  const otherUnit = all.find((s) => s.unit !== pick.unit)!;
  const prompt = `Welche Geschichte beschreibt den Stand ${fmtQty(-n, pick.unit)}?`;
  return {
    key: `stand:${pick.id}:${n}`,
    prompt,
    answer: makeChoice(rng, { label: pick.neg }, [
      { label: pick.pos, whyWrong: POSITIVE_STORY },
      { label: pick.change, whyWrong: 'Das ist eine Änderung. Gesucht ist ein Stand.' },
      { label: otherUnit.neg, whyWrong: 'Schau auf die Einheit. Diese Geschichte hat eine andere.' },
    ]),
    hints: ['Prüfe zuerst die Einheit.', 'Ein Stand zeigt einen Wert. Eine Änderung zeigt einen Weg.'],
    steps: [`Die Einheit ist ${pick.unit}, und der Wert liegt unter 0.`, `Das passt: ${pick.neg}`],
    praise: 'Du hast Stand und Änderung getrennt.',
    srText: say(prompt),
    kmk: ['PK.modellieren'],
  };
}

/** A start and one change, in the contexts of the catalogue. */
const CHAINS = {
  wetter: { unit: '°C', story: (s: number, m: number, above: boolean, up: boolean) => `Es sind ${s} Grad ${above ? 'über' : 'unter'} null. Dann ${up ? 'steigt' : 'fällt'} die Temperatur um ${m} Grad.` },
  konto: { unit: '€', story: (s: number, m: number, above: boolean, up: boolean) => `Ein Konto zeigt ${s} € ${above ? 'Guthaben' : 'Schulden'}. Dann ${up ? `kommen ${m} € dazu` : `gehen ${m} € ab`}.` },
  aufzug: { unit: 'm', story: (s: number, m: number, above: boolean, up: boolean) => `Ein Aufzug ist ${s} m ${above ? 'über' : 'unter'} der Straße. Dann fährt der Aufzug ${m} m ${up ? 'nach oben' : 'nach unten'}.` },
};

type ChainId = keyof typeof CHAINS;
const CHAIN_IDS: ChainId[] = ['wetter', 'konto', 'aufzug'];

/**
 * Reasoning: every story holds the same two numbers and every story is a start with a change, so no single word and no number picks it out. Only the correct one ends at the
 * number, after going over the 0. A change stays within a day's 20 Grad.
 */
function storyEnd(rng: Rng): Form {
  const n = rng.int(4, 12);
  const s = rng.int(2, 8);
  const m = s + n;
  const [right, ...others] = rng.shuffle([...CHAIN_IDS, rng.pick(CHAIN_IDS)]);
  const shapes = [{ above: false, up: false, end: -s - m }, { above: true, up: true, end: s + m }, { above: false, up: true, end: n }];
  const prompt = `Welche Geschichte endet bei ${fmt(-n)}?`;
  return {
    key: `endet:${right}:${others.join('-')}:${s}:${n}`,
    prompt,
    answer: makeChoice(rng, { label: CHAINS[right].story(s, m, true, false) }, others.map((id, i) => ({
      label: CHAINS[id].story(s, m, shapes[i].above, shapes[i].up),
      whyWrong: `Diese Geschichte endet bei ${fmtQty(shapes[i].end, CHAINS[id].unit)}.`,
    }))),
    hints: ['Geh jede Geschichte Schritt für Schritt durch.', 'Wo endet die Geschichte: unter 0 oder über 0? Prüfe auch die Zahl.'],
    steps: [`Der Start liegt ${s} über der 0. Dann geht es ${m} nach unten.`, `Bis zur 0 sind es ${s}. Dann geht es noch ${n} weiter.`, `Diese Geschichte endet bei ${fmtQty(-n, CHAINS[right].unit)}.`],
    praise: 'Du hast jede Geschichte bis zum Ende verfolgt.',
    srText: say(prompt),
    kmk: ['PK.argumentieren'],
  };
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = {
  1: stufe1,
  2: (rng, ab) => (ab === 1 ? statementForm(direct(rng)) : ab === 2 ? statementForm(indirect(rng)) : pairForm(rng)),
  3: (rng, ab) => (ab === 1 ? storyDirect(rng) : ab === 2 ? storyWithUnit(rng) : storyEnd(rng)),
};

export const alltagSkill: SkillDef = {
  ...SKILL,
  title: 'Negative Zahlen im Alltag',
  description: 'Du liest Temperaturen und Höhen unter null.',
  stufen: { 1: 'Thermometer und Höhen ablesen: −5 °C, −200 m', 2: 'Text als Zahl: 8 Grad unter null', 3: 'Welche Geschichte passt zu −12? Guthaben, Keller, Wetter' },
  kmk: [...KMK_ZAHLEN, 'PK.modellieren', 'PK.argumentieren'],
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_ZAHLEN, FORMS[stufe](rng, ab));
  },
};
