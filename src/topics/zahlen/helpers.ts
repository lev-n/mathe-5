/**
 * Helpers of the topic 'zahlen': places of the Stellentafel, digits, rounding, number words and small number theory. Pure; randomness only
 * through the Rng parameter.
 */
import { fmt, numberWord } from '../../core/format';
import type { PlaceColumn, Rng, Visual } from '../../core/types';

/** The places of a whole number the generators use, largest first. HMrd and B exist for the Stellentafel (§6), and no number of a task reaches them yet. */
export type WholeColumn = Exclude<PlaceColumn, 'B' | 'HMrd' | 'z' | 'h' | 't'>;

export const COLUMNS: readonly WholeColumn[] = ['ZMrd', 'Mrd', 'HM', 'ZM', 'M', 'HT', 'ZT', 'T', 'H', 'Z', 'E'];

export const PV: Readonly<Record<WholeColumn, number>> = {
  ZMrd: 1e10, Mrd: 1e9, HM: 1e8, ZM: 1e7, M: 1e6, HT: 1e5, ZT: 1e4, T: 1e3, H: 100, Z: 10, E: 1,
};

/** Written out, never ZT or HT: the voice says these names as words (T16), and a 'Hunderter' needs no gloss. */
export const PLACE_NAME: Readonly<Record<WholeColumn, string>> = {
  ZMrd: 'Zehnmilliarden', Mrd: 'Milliarden', HM: 'Hundertmillionen', ZM: 'Zehnmillionen', M: 'Millionen',
  HT: 'Hunderttausender', ZT: 'Zehntausender', T: 'Tausender', H: 'Hunderter', Z: 'Zehner', E: 'Einer',
};

/** Dativ plural, after 'von den', 'bei den', 'zwischen zwei', 'aus 199': 'Rechts von den Hundertern', 'Aus 199 Zehntausendern werden 200.' */
export const PLACE_DATIVE: Readonly<Record<WholeColumn, string>> = {
  ...PLACE_NAME,
  HT: 'Hunderttausendern', ZT: 'Zehntausendern', T: 'Tausendern', H: 'Hundertern', Z: 'Zehnern', E: 'Einern',
};

/** '1 Million', '3 Millionen', '1 Hunderter'. */
export function countOf(k: number, c: WholeColumn): string {
  if (k !== 1) return `${fmt(k)} ${PLACE_NAME[c]}`;
  return `1 ${c === 'M' ? 'Million' : c === 'Mrd' ? 'Milliarde' : PLACE_NAME[c]}`;
}

/** The next smaller place. */
export function smaller(c: WholeColumn): WholeColumn {
  return COLUMNS[Math.min(COLUMNS.indexOf(c) + 1, COLUMNS.length - 1)];
}

/** The next larger place. */
export function larger(c: WholeColumn): WholeColumn {
  return COLUMNS[Math.max(COLUMNS.indexOf(c) - 1, 0)];
}

export function digitAt(n: number, c: WholeColumn): number {
  return Math.floor(n / PV[c]) % 10;
}

/** The places of n, from its highest digit down to the Einer. */
export function columnsFor(n: number): WholeColumn[] {
  const from = COLUMNS.findIndex((c) => n >= PV[c]);
  return COLUMNS.slice(from < 0 ? COLUMNS.length - 1 : from) as WholeColumn[];
}

/** Stellentafel of n. */
export function placeTable(n: number, highlight?: WholeColumn): Visual {
  const columns = columnsFor(n);
  return { type: 'placeValue', columns, rows: [{ values: columns.map((c) => digitAt(n, c)) }], ...(highlight ? { highlight } : {}) };
}

/** Empty Stellentafel with room for n: the structure, without the digits. */
export function emptyTable(n: number): Visual {
  const columns = columnsFor(n);
  return { type: 'placeValue', columns, rows: [{ values: columns.map(() => null) }] };
}

/** Number of `digits` digits, none of them 0. */
export function noZeroNumber(rng: Rng, digits: number): number {
  let n = 0;
  for (let i = 0; i < digits; i++) n = n * 10 + rng.int(1, 9);
  return n;
}

/** Number of `digits` digits, first digit not 0, the others free. */
export function anyNumber(rng: Rng, digits: number): number {
  let n = rng.int(1, 9);
  for (let i = 1; i < digits; i++) n = n * 10 + rng.int(0, 9);
  return n;
}

/** Groups of three, largest first: 3 040 000 → [3, 40, 0]. */
export function groupsOf(n: number): number[] {
  const out: number[] = [];
  let rest = n;
  do {
    out.unshift(rest % 1000);
    rest = Math.floor(rest / 1000);
  } while (rest > 0);
  return out;
}

const fromGroups = (groups: readonly number[]) => groups.reduce((a, g) => a * 1000 + g, 0);

/** A group of three with holes: 0, 7, 40, 300, 305, 340 or free. */
function holeyGroup(rng: Rng): number {
  const d = () => rng.int(1, 9);
  return rng.pick<() => number>([() => 0, d, () => d() * 10, () => d() * 100, () => d() * 100 + d(), () => d() * 100 + d() * 10, () => rng.int(11, 999)])();
}

/** Number of `digits` digits with at least one 0 between its digits (never only at the end). */
export function innerZeroNumber(rng: Rng, digits: number): number {
  const count = Math.ceil(digits / 3);
  const headDigits = digits - (count - 1) * 3;
  for (let tries = 0; tries < 40; tries++) {
    const groups = [rng.int(10 ** (headDigits - 1), 10 ** headDigits - 1), ...Array.from({ length: count - 1 }, () => holeyGroup(rng))];
    const n = fromGroups(groups);
    if (hasInnerZero(n)) return n;
  }
  // 3 040 500 style, always has one
  return fromGroups([rng.int(10 ** (headDigits - 1), 10 ** headDigits - 1), ...Array.from({ length: count - 1 }, (_, i) => (i === 0 ? rng.int(1, 9) * 10 : rng.int(1, 9) * 100))]);
}

/** A 0 somewhere before the last non-zero digit. */
export function hasInnerZero(n: number): boolean {
  return /0[1-9]/.test(String(n));
}

/** Soft hyphens after 'tausend' and 'hundert', so a long number word can wrap on a 360 px phone. The voice drops them. */
export function softWord(word: string): string {
  return word.replace(/(tausend|hundert)(?=[a-zäöüß])/g, '$1­');
}

/** The number word as it is shown. */
export function shownWord(n: number): string {
  return softWord(numberWord(n));
}

const GROUP_NAMES = ['Einer', 'Tausender', 'Millionen', 'Milliarden', 'Billionen'];

/** 'Millionen: 3, Tausender: 040, Einer: 000' */
export function groupLine(n: number): string {
  const groups = groupsOf(n);
  return groups.map((g, i) => `${GROUP_NAMES[groups.length - 1 - i]}: ${i === 0 ? g : String(g).padStart(3, '0')}`).join(', ');
}

export function floorTo(n: number, p: number): number {
  return Math.floor(n / p) * p;
}

/** Round to the multiple of p: from the middle upward. */
export function roundTo(n: number, p: number): number {
  return Math.floor((n + p / 2) / p) * p;
}

// ─── Teiler ──────────────────────────────────────────────────────────────────

export function divisors(n: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) out.push(d);
  return out;
}

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** The prime factors of n ≥ 2, ascending with repeats: 60 → [2, 2, 3, 5]. */
export function primeFactors(n: number): number[] {
  const out: number[] = [];
  let rest = n;
  for (let d = 2; rest > 1; d++) {
    while (rest % d === 0) {
      out.push(d);
      rest /= d;
    }
  }
  return out;
}

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function digitSum(n: number): number {
  return String(n).split('').reduce((s, d) => s + Number(d), 0);
}

// ─── Potenzen ────────────────────────────────────────────────────────────────

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** A power as it is written: power(10, 6) → '10⁶'. */
export function power(base: number | string, exponent: number): string {
  return `${base}${String(exponent).split('').map((d) => SUPERSCRIPT[Number(d)]).join('')}`;
}

/** The same in words, for srText: '10 hoch 6'. */
export function powerSaid(base: number | string, exponent: number): string {
  return `${base} hoch ${exponent}`;
}
