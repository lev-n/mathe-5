/**
 * zahlen.teilbarkeit: Teiler und Teilbarkeit. The Stufe chooses the content (S1 rules for 2, 5, 10 and divisors ≤ 30, S2 rules for 3, 4 and the
 * Teilermenge ≤ 100, S3 combined rules for 6, 15 and a missing digit); AB varies the demand inside it.
 */
import { BOX, fmt } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, MultiField, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, joinDe, makeChoice, multiBugs, targetAb } from '../shared';
import { digitSum, divisors } from './helpers';

const SKILL = { id: 'zahlen.teilbarkeit', topicId: 'zahlen' } as const;
const KMK = ['ZO.teilbarkeit'];

const lastDigit = (n: number) => n % 10;
/** A number of `digits` digits with this last digit. */
const withEnding = (rng: Rng, digits: number, ending: number) => rng.int(10 ** (digits - 2), 10 ** (digits - 1) - 1) * 10 + ending;

/** Why a number is not divisible by d, in the words of the rule. */
function whyNot(n: number, d: number): string {
  const end = lastDigit(n);
  switch (d) {
    case 2: return `Die Zahl endet auf ${end}. Bei der 2 zählt: gerade Endziffer.`;
    case 5: return `Die Zahl endet auf ${end}. Bei der 5 zählt: Endziffer 0 oder 5.`;
    case 10: return `Die Zahl endet auf ${end}. Bei der 10 zählt: Endziffer 0.`;
    case 3: return end % 3 === 0 && end !== 0 ? 'Bei der 3 zählt die Quersumme, nicht die letzte Ziffer.' : `Die Quersumme ist ${digitSum(n)}. Das ist kein Vielfaches von 3.`;
    case 4: return `Die letzten zwei Ziffern sind ${String(n % 100).padStart(2, '0')}. Die 4 teilt diese Zahl nicht.`;
    case 6: return n % 2 !== 0 ? 'Die Zahl ist ungerade. Für die 6 brauchst du 2 und 3.' : `Die Quersumme ist ${digitSum(n)}. Für die 6 brauchst du 2 und 3.`;
    default: return n % 5 !== 0 ? 'Die Endziffer passt nicht zur 5. Für die 15 brauchst du 3 und 5.' : `Die Quersumme ist ${digitSum(n)}. Für die 15 brauchst du 3 und 5.`;
  }
}

/** A divisor of n by the rule of d, with its reason, for the worked steps. */
function reason(n: number, d: number): string {
  switch (d) {
    case 2: case 5: case 10: return `${fmt(n)} endet auf ${lastDigit(n)}. Also teilt die ${d} diese Zahl.`;
    case 3: return `Die Quersumme von ${fmt(n)} ist ${digitSum(n)}. Das ist ein Vielfaches von 3.`;
    case 4: return `Die letzten zwei Ziffern sind ${String(n % 100).padStart(2, '0')}. Die 4 teilt diese Zahl.`;
    case 6: return `${fmt(n)} ist gerade, und die Quersumme ${digitSum(n)} ist ein Vielfaches von 3.`;
    default: return `${fmt(n)} endet auf ${lastDigit(n)}, und die Quersumme ${digitSum(n)} ist ein Vielfaches von 3.`;
  }
}

const RULE_HINTS: Readonly<Record<number, string[]>> = {
  2: ['Schau auf die letzte Ziffer.', 'Bei der 2 ist die letzte Ziffer gerade.'],
  5: ['Schau auf die letzte Ziffer.', 'Bei der 5 ist die letzte Ziffer eine 0 oder eine 5.'],
  10: ['Schau auf die letzte Ziffer.', 'Bei der 10 ist die letzte Ziffer eine 0.'],
  3: ['Bilde die Quersumme: Addiere alle Ziffern.', 'Ist die Quersumme ein Vielfaches von 3?'],
  4: ['Schau nur auf die letzten zwei Ziffern.', 'Teilt die 4 diese zweistellige Zahl?'],
  6: ['Die 6 braucht zwei Regeln: die Regel für 2 und für 3.', 'Prüfe zuerst die letzte Ziffer, dann die Quersumme.'],
  15: ['Die 15 braucht zwei Regeln: die Regel für 3 und für 5.', 'Prüfe zuerst die letzte Ziffer, dann die Quersumme.'],
};

/** Three numbers that miss d in the ways children expect. */
function nearMisses(rng: Rng, digits: number, d: number): number[] {
  const pick = (test: (x: number) => boolean, make: () => number) => {
    for (let tries = 0; tries < 200; tries++) {
      const x = make();
      if (x % d !== 0 && test(x)) return x;
    }
    return make() * 10 + 1;
  };
  const any = () => rng.int(10 ** (digits - 1), 10 ** digits - 1);
  switch (d) {
    case 2: return [1, 3, 7].map((e) => withEnding(rng, digits, e));
    case 5: return [2, 3, 6].map((e) => withEnding(rng, digits, e));
    case 10: return [5, 2, 1].map((e) => withEnding(rng, digits, e));
    // ends in 3, 6 or 9: the digit looks right, the Quersumme does not
    case 3: return [pick((x) => lastDigit(x) === 3, () => withEnding(rng, digits, 3)), pick((x) => lastDigit(x) === 6, () => withEnding(rng, digits, 6)), pick((x) => lastDigit(x) === 9, () => withEnding(rng, digits, 9))];
    // ends in 4, or is even but its last two digits miss the 4
    case 4: return [pick((x) => lastDigit(x) === 4, () => withEnding(rng, digits, 4)), pick((x) => x % 2 === 0, any), pick(() => true, any)];
    case 6: return [pick((x) => x % 2 === 0, any), pick((x) => x % 3 === 0, any), pick((x) => lastDigit(x) === 6, () => withEnding(rng, digits, 6))];
    default: return [pick((x) => x % 5 === 0, any), pick((x) => x % 3 === 0, any), pick((x) => x % 100 === 15, () => rng.int(10 ** (digits - 3), 10 ** (digits - 2) - 1) * 100 + 15)];
  }
}

/** What a rule looks at, with the heading of its column. */
function ruleClue(d: number): { head: string; of: (x: number) => string } {
  const end = (x: number) => String(lastDigit(x));
  if (d === 2 || d === 5 || d === 10) return { head: 'Letzte Ziffer', of: end };
  if (d === 3) return { head: 'Quersumme', of: (x) => String(digitSum(x)) };
  if (d === 4) return { head: 'Letzte zwei Ziffern', of: (x) => String(x % 100).padStart(2, '0') };
  return { head: 'Letzte Ziffer, Quersumme', of: (x) => `${end(x)}, ${digitSum(x)}` };
}

/** The rule applied to every number of the task, for a worked step. */
function ruleTable(numbers: readonly number[], d: number): VisualOf<'table'> {
  const clue = ruleClue(d);
  return { type: 'table', caption: `Teilbar durch ${d}?`, header: ['Zahl', clue.head, 'Teilbar'], rows: [...numbers].sort((a, b) => a - b).map((x) => [fmt(x), clue.of(x), x % d === 0 ? 'ja' : 'nein']) };
}

/** Teiler in pairs, for a worked step. */
const pairTable = (n: number, inner: readonly number[]): VisualOf<'table'> => ({ type: 'table', caption: `Teilerpaare von ${n}`, header: ['Teiler', 'Partner'], rows: [1, ...inner].filter((d) => d * d <= n).map((d) => [String(d), String(n / d)]) });

function pickDivisible(rng: Rng, stufe: Stufe, ab: Ab, d: number, digits: number): Exercise {
  const low = Math.ceil(10 ** (digits - 1) / d);
  const n = rng.int(low, Math.floor((10 ** digits - 1) / d)) * d;
  const misses = nearMisses(rng, digits, d);
  const wrongs: ChoiceOption[] = misses.map((x) => ({ label: fmt(x), whyWrong: whyNot(x, d) }));
  return build(SKILL, stufe, {
    key: `welche:${d}:${n}:${wrongs.map((w) => w.label).join('|')}`,
    ab,
    prompt: `Welche Zahl ist durch ${d} teilbar?`,
    answer: makeChoice(rng, { label: fmt(n) }, wrongs),
    hints: RULE_HINTS[d],
    steps: [{ text: reason(n, d), visual: ruleTable([n, ...misses], d) }, `Durch ${d} teilbar ist ${fmt(n)}.`],
    praise: d >= 6 ? 'Du hast beide Regeln nacheinander geprüft.' : 'Du hast die passende Regel genutzt.',
    srText: `Welche Zahl ist durch ${d} teilbar?`,
    kmk: KMK,
  });
}

/** Fill the gaps of a Teilermenge, in order. */
function divisorGaps(rng: Rng, stufe: Stufe, ab: Ab, pool: readonly number[], gapCount: () => number): Exercise {
  const n = rng.pick(pool);
  const all = divisors(n);
  const inner = all.slice(1, -1);
  const count = Math.min(gapCount(), inner.length);
  const gaps = rng.sample(inner, count).sort((a, b) => a - b);
  const shown = all.map((d) => (gaps.includes(d) ? BOX : String(d))).join(', ');
  const fields: MultiField[] = gaps.map((g, i) => ({ id: `t${i}`, value: g, label: `Lücke ${i + 1}` }));
  const swapped = Object.fromEntries(gaps.map((_, i) => [`t${i}`, gaps[gaps.length - 1 - i]]));
  const pair = (d: number) => `${d} · ${n / d}`;
  return build(SKILL, stufe, {
    key: `menge:${n}:${gaps.join('-')}`,
    ab,
    prompt: 'Ergänze die Teilermenge. Schreib die Teiler der Größe nach.',
    expression: `Teiler von ${n}: ${shown}`,
    answer: { kind: 'multi', fields },
    hints: ['Teiler kommen als Paare: Suche zu jedem Teiler seinen Partner.', `Prüfe der Reihe nach: Teilt die 2 die ${n}? Teilt die 3 die ${n}?`],
    steps: [
      { text: `Teilerpaare: ${inner.filter((d) => d * d <= n).map(pair).join(', ') || `1 · ${n}`}.`, visual: pairTable(n, inner) },
      `Alle Teiler von ${n}: ${joinDe(all.map(String))}.`,
      `Die Lücken sind ${joinDe(gaps.map(String))}.`,
    ],
    bugs: multiBugs([{ id: 'teiler-reihenfolge', match: swapped, hint: 'Die Teiler stehen der Größe nach. Prüfe die Reihenfolge.' }], fields),
    praise: 'Du hast die Teiler als Paare gefunden.',
    srText: `Ergänze die Teilermenge von ${n}: ${all.map((d) => (gaps.includes(d) ? 'Lücke' : String(d))).join(', ')}.`,
    kmk: KMK,
  });
}

function countDivisors(rng: Rng, ab: Ab): Exercise {
  const n = rng.pick([24, 30, 36, 40, 42, 48, 54, 56, 60, 64, 66, 70, 72, 78, 80, 84, 88, 90, 96, 100]);
  const all = divisors(n);
  const fields: MultiField[] = [{ id: 'c', value: all.length, label: 'Anzahl der Teiler' }];
  return build(SKILL, 2, {
    key: `anzahl:${n}`,
    ab,
    prompt: `Wie viele Teiler hat ${n}?`,
    answer: { kind: 'multi', fields },
    hints: ['Suche die Teiler als Paare.', 'Auch 1 und die Zahl selbst sind Teiler.'],
    steps: [{ text: `Die Teiler von ${n}: ${all.join(', ')}.`, visual: pairTable(n, all.slice(1, -1)) }, `Das sind ${all.length} Teiler.`],
    bugs: multiBugs([
      { id: 'teiler-ohne-rand', match: { c: all.length - 2 }, hint: 'Auch 1 und die Zahl selbst sind Teiler.' },
      { id: 'teiler-ohne-rand-2', match: { c: all.length - 1 }, hint: 'Auch 1 und die Zahl selbst sind Teiler.' },
    ], fields),
    praise: 'Du hast auch 1 und die Zahl selbst gezählt.',
    srText: `Wie viele Teiler hat ${n}?`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

const fits = (ok: boolean) => (ok ? 'Das passt.' : 'Das passt nicht.');

/** Which of 2, 5, 10 divide n: the three end-digit rules at once. The task names the three numbers: n can have other divisors, and 'nur die 2' only speaks of these. */
function rulesTogether(rng: Rng, ab: Ab): Exercise {
  const end = rng.pick([0, 0, 5, 2, 4, 6, 8, 1, 3, 7, 9]);
  const n = withEnding(rng, rng.int(4, 5), end);
  const OPTIONS = ['alle drei', 'nur die 2', 'nur die 5', 'keine davon'];
  const right = end === 0 ? 0 : end === 5 ? 2 : end % 2 === 0 ? 1 : 3;
  const answer = makeChoice(rng, { label: OPTIONS[right] }, OPTIONS.filter((_, i) => i !== right).map((label) => ({ label, whyWrong: `Die Zahl endet auf ${end}. Prüfe die Regeln für 2, 5 und 10.` })), { max: 4 });
  const task = 'Prüfe nur die Zahlen 2, 5 und 10. Welche davon sind Teiler von';
  return build(SKILL, 1, {
    key: `zusammen:${n}`,
    ab,
    prompt: `${task} ${fmt(n)}?`,
    answer,
    hints: ['Schau auf die letzte Ziffer.', 'Prüfe die Regeln für 2, für 5 und für 10 nacheinander.'],
    steps: [
      `${fmt(n)} endet auf ${end}.`,
      { text: `Regel für die 2: letzte Ziffer gerade. ${fits(end % 2 === 0)}`, visual: { type: 'table', caption: `Letzte Ziffer: ${end}`, header: ['Regel', 'Passt'], rows: [['2: gerade', end % 2 === 0 ? 'ja' : 'nein'], ['5: 0 oder 5', end % 5 === 0 ? 'ja' : 'nein'], ['10: 0', end === 0 ? 'ja' : 'nein']] } },
      `Regel für die 5: letzte Ziffer 0 oder 5. ${fits(end % 5 === 0)}`,
      `Regel für die 10: letzte Ziffer 0. ${fits(end === 0)}`,
      `Von den drei Zahlen sind Teiler: ${OPTIONS[right]}.`,
    ],
    praise: 'Du hast alle drei Regeln an der Endziffer geprüft.',
    srText: `${task} ${n}?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** A missing digit: the smallest one that fits, since several can. */
function missingDigit(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick([3, 3, 6]);
  const length = rng.int(3, 5);
  let digits = Array.from({ length }, (_, i) => (i === 0 ? rng.int(1, 9) : rng.int(0, 9)));
  const gapLast = d === 3 && rng.chance(0.5);
  const gap = gapLast ? length - 1 : rng.int(1, length - 2);
  if (d === 6 && digits[length - 1] % 2 === 1) digits = digits.map((x, i) => (i === length - 1 ? (x + 1) % 10 : x));
  const value = (x: number) => digits.reduce((a, c, i) => a * 10 + (i === gap ? x : c), 0);
  const fits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => value(x) % d === 0);
  const smallest = fits[0];
  const shown = digits.map((c, i) => (i === gap ? BOX : String(c))).join('');
  const known = digitSum(value(0));
  const fields: MultiField[] = [{ id: 'z', value: smallest, label: 'Ziffer' }];
  return build(SKILL, 3, {
    key: `ziffer:${d}:${shown}`,
    ab,
    prompt: `Die Zahl soll durch ${d} teilbar sein. Welche kleinste Ziffer passt in die Lücke?`,
    expression: shown,
    answer: { kind: 'multi', fields },
    hints: ['Bilde die Quersumme der bekannten Ziffern.', d === 6 ? 'Für die 6 muss die Zahl gerade sein und die Quersumme zur 3 passen.' : 'Die Quersumme muss ein Vielfaches von 3 werden.'],
    steps: [`Die bekannten Ziffern haben die Quersumme ${known}.`, { text: `Mit ${smallest} ist die Quersumme ${known + smallest}, ein Vielfaches von 3.`, visual: { type: 'table', caption: 'Quersumme mit jeder passenden Ziffer', header: ['Ziffer', 'Quersumme'], rows: fits.map((x) => [String(x), String(known + x)]) } }, `Die kleinste Ziffer ist ${smallest}.`],
    bugs: multiBugs([
      gapLast && !fits.includes(3) && { id: 'teilbar-endziffer', match: { z: 3 }, hint: 'Bei der 3 zählt die Quersumme, nicht die letzte Ziffer.' },
      fits.length > 1 && { id: 'ziffer-nicht-kleinste', match: { z: fits[1] }, hint: 'Diese Ziffer passt. Es gibt aber noch eine kleinere.' },
    ], fields),
    praise: 'Du hast die Quersumme gezielt ergänzt.',
    srText: `Die Zahl ${digits.map((c, i) => (i === gap ? 'Lücke' : String(c))).join(' ')} soll durch ${d} teilbar sein. Welche kleinste Ziffer passt in die Lücke?`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

export const teilbarkeitSkill: SkillDef = {
  ...SKILL,
  title: 'Teiler und Teilbarkeit',
  description: 'Du findest Teiler und nutzt Regeln für die Teilbarkeit.',
  stufen: {
    1: 'Regeln für 2, 5 und 10; Teiler bis 30',
    2: 'Regeln für 3 und 4; Teilermenge bis 100',
    3: 'Regeln verbinden: 6 und 15; fehlende Ziffer finden',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) return pickDivisible(rng, 1, ab, rng.pick([2, 5, 10]), rng.int(3, 5));
      return ab === 2 ? divisorGaps(rng, 1, ab, [12, 16, 18, 20, 24, 28, 30], () => 2) : rulesTogether(rng, ab);
    }
    if (stufe === 2) {
      if (ab === 1) return pickDivisible(rng, 2, ab, rng.pick([3, 4]), rng.int(3, 4));
      return ab === 2 ? divisorGaps(rng, 2, ab, [36, 40, 42, 48, 54, 56, 60, 66, 70, 72, 78, 80, 84, 88, 90, 96, 100], () => rng.int(2, 4)) : countDivisors(rng, ab);
    }
    if (ab === 1) return pickDivisible(rng, 3, ab, 6, rng.int(3, 4));
    return ab === 2 ? pickDivisible(rng, 3, ab, 15, rng.int(4, 5)) : missingDigit(rng, ab);
  },
};
