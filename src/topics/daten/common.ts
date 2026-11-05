/**
 * Building blocks of the topic 'daten': data themes for charts, Urlisten as tables, small statistics and the spoken task text. Pure, randomness only
 * through the Rng parameter. Only this topic imports it (src/topics/contract.test.ts).
 */
import { fmt, speak } from '../../core/format';
import type { Bug, Rng, VisualOf } from '../../core/types';
import { numberBugs, type MaybeBug } from '../shared';

export type BarChart = VisualOf<'barChart'>;
export type Table = VisualOf<'table'>;
export type Tally = VisualOf<'tally'>;

// ─── Numbers ─────────────────────────────────────────────────────────────────

export const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
export const mean = (values: readonly number[]) => sum(values) / values.length;
export const ascending = (values: readonly number[]) => [...values].sort((a, b) => a - b);

/** A sum as written in a step: sumLine([3, 5]) → '3 + 5 = 8'. */
export const sumLine = (values: readonly number[]) => `${values.map((v) => fmt(v)).join(' + ')} = ${fmt(sum(values))}`;

/** The list as written in a step: '3, 5 und 8'. */
export const listLine = (values: readonly number[]) => `${values.slice(0, -1).map((v) => fmt(v)).join(', ')} und ${fmt(values[values.length - 1])}`;

/** Rounded to one decimal place, which is what the answers of mittelwert and median allow. */
export const oneDecimal = (value: number) => Math.round(value * 10) / 10;
const fitsOneDecimal = (value: number) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;

/** numberBugs for an answer with one decimal place: a value the field cannot take is no bug a child can show. */
export function decimalBugs(bugs: MaybeBug[], correct: number): Bug[] {
  return numberBugs(bugs, correct).filter((b) => fitsOneDecimal(b.match as number));
}

/** The middle of a list: the middle value, or the mean of the two middle values. */
export function median(values: readonly number[]): number {
  const s = ascending(values);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** n distinct multiples of step in [min, max], in random order. */
export function distinctMultiples(rng: Rng, n: number, min: number, max: number, step: number): number[] {
  const pool: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) pool.push(v);
  return rng.sample(pool, n);
}

/** `total` split into `parts` distinct whole numbers, each at least min. */
export function partition(rng: Rng, total: number, parts: number, min = 2): number[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const some = Array.from({ length: parts - 1 }, () => rng.int(min, Math.floor((2 * total) / parts)));
    const last = total - sum(some);
    if (last >= min && new Set([...some, last]).size === parts) return [...some, last];
  }
  const some = Array.from({ length: parts - 1 }, (_, i) => min + i);
  return [...some, total - sum(some)];
}

// ─── Strichliste ─────────────────────────────────────────────────────────────

/** A count as bundles and single strokes, for a step: '5 + 5 + 3 = 13'; below 6 strokes just the number. */
export function bundleLine(count: number): string {
  if (count <= 5) return `${fmt(count)} ${count === 1 ? 'Strich' : 'Striche'}`;
  const parts = Array.from<number>({ length: Math.floor(count / 5) }).fill(5);
  if (count % 5 > 0) parts.push(count % 5);
  return sumLine(parts);
}

// ─── Urliste ─────────────────────────────────────────────────────────────────

/** A list of values in the order they came, five in a row: an Urliste. The first column says which values the row holds. */
export function listTable(caption: string, values: readonly string[]): Table {
  const rows: string[][] = [];
  for (let i = 0; i < values.length; i += 5) {
    const chunk = values.slice(i, i + 5);
    const label = chunk.length === 1 ? `Nr. ${i + 1}` : `${i + 1}–${i + chunk.length}`;
    rows.push([label, ...chunk, ...Array.from({ length: 5 - chunk.length }, () => '')]);
  }
  return { type: 'table', caption, header: ['Nr.', '', '', '', '', ''], rows };
}

// ─── School classes ──────────────────────────────────────────────────────────

/**
 * A school class as it is written and said: '5 b'. spokenWords() turns '5b' into 'fünfb', so the letter stands apart, on a fixed space. There is no
 * 5 a: speak() reads an 'a' after a number as the unit Ar.
 */
export const schoolClass = (letter: 'b' | 'c' | 'd' | 'e' | 'f') => `5\u00A0${letter}`;

// ─── Charts ──────────────────────────────────────────────────────────────────

export interface ChartTheme {
  id: string;
  title: string;
  /** Plural of what is counted: 'Kinder'. */
  unit: string;
  /** Head of the first table column. */
  header: string;
  /** Short enough for a phone: the chart shows these as they are. */
  cats: readonly string[];
  /** Weekdays and months keep their order in a chart. */
  ordered: boolean;
  /** Where a value belongs in a sentence: 'am Montag', 'bei „Judo“'. */
  at(cat: string): string;
}

const inQuotes = (cat: string) => `bei „${cat}“`;
const WEEKDAY: Readonly<Record<string, string>> = { Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag', Fr: 'Freitag', Sa: 'Samstag', So: 'Sonntag' };
const onDay = (cat: string) => `am ${WEEKDAY[cat]}`;
const MONTH: Readonly<Record<string, string>> = { Apr: 'April', Mai: 'Mai', Jun: 'Juni', Jul: 'Juli', Aug: 'August', Sep: 'September' };
const inMonth = (cat: string) => `im ${MONTH[cat]}`;

const VEHICLE_DATIVE: Readonly<Record<string, string>> = { Busse: 'Bussen', Räder: 'Rädern' };

/** Counts up to about 100: axis step 5 or 10. */
export const SMALL_THEMES: readonly ChartTheme[] = [
  { id: 'ag', title: 'Gewählte AGs', unit: 'Kinder', header: 'AG', cats: ['Chor', 'Judo', 'Kunst', 'Schach', 'Tanz', 'Technik'], ordered: false, at: inQuotes },
  { id: 'schulweg', title: 'Schulweg', unit: 'Kinder', header: 'Weg', cats: ['Bus', 'Rad', 'zu Fuß', 'Bahn', 'Auto'], ordered: false, at: inQuotes },
  { id: 'ausleihe', title: 'Ausgeliehene Bücher', unit: 'Bücher', header: 'Tag', cats: ['Mo', 'Di', 'Mi', 'Do', 'Fr'], ordered: true, at: onDay },
  { id: 'flaschen', title: 'Gesammelte Flaschen', unit: 'Flaschen', header: 'Klasse', cats: [schoolClass('b'), schoolClass('c'), schoolClass('d'), schoolClass('e'), schoolClass('f')], ordered: true, at: (c) => `in der ${c}` },
  { id: 'verkehr', title: 'Fahrzeuge vor der Schule', unit: 'Fahrzeuge', header: 'Art', cats: ['Autos', 'Busse', 'Räder', 'Mopeds'], ordered: false, at: (c) => `bei den ${VEHICLE_DATIVE[c] ?? c}` },
];

/** Counts in the hundreds: axis step 50. */
export const HUNDRED_THEMES: readonly ChartTheme[] = [
  { id: 'schwimmbad', title: 'Besucher im Schwimmbad', unit: 'Besucher', header: 'Tag', cats: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], ordered: true, at: onDay },
  { id: 'buecherei', title: 'Besucher der Bücherei', unit: 'Besucher', header: 'Tag', cats: ['Mo', 'Di', 'Mi', 'Do', 'Fr'], ordered: true, at: onDay },
  { id: 'schulbus', title: 'Fahrgäste im Schulbus', unit: 'Fahrgäste', header: 'Tag', cats: ['Mo', 'Di', 'Mi', 'Do', 'Fr'], ordered: true, at: onDay },
];

/** Counts in the thousands: axis step 1 000. */
export const THOUSAND_THEMES: readonly ChartTheme[] = [
  { id: 'museum', title: 'Besucher im Museum', unit: 'Besucher', header: 'Monat', cats: ['Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep'], ordered: true, at: inMonth },
  { id: 'sportfest', title: 'Zuschauer beim Sportfest', unit: 'Zuschauer', header: 'Tag', cats: ['Do', 'Fr', 'Sa', 'So'], ordered: true, at: onDay },
];

/** n categories of a theme: a run of neighbours if the order means something. */
export function pickCats(rng: Rng, theme: ChartTheme, n: number): string[] {
  if (!theme.ordered) return rng.sample(theme.cats, n);
  const start = rng.int(0, theme.cats.length - n);
  return theme.cats.slice(start, start + n);
}

/** A Säulendiagramm with one step of headroom above the tallest bar. */
export function chart(theme: Pick<ChartTheme, 'title' | 'unit'>, cats: readonly string[], values: readonly number[], step: number, extra: Partial<BarChart> = {}): BarChart {
  return {
    type: 'barChart',
    title: theme.title,
    categories: [...cats],
    values: [...values],
    axisMax: (Math.floor(Math.max(...values) / step) + 1) * step,
    axisStep: step,
    valueLabel: `Anzahl: ${theme.unit}`,
    ...extra,
  };
}

/** The same data as a table. A null value is the gap '?'; total adds a last row. */
export function dataTable(theme: Pick<ChartTheme, 'title' | 'header'>, cats: readonly string[], values: readonly (number | null)[], total?: number): Table {
  const rows = cats.map((c, i) => [c, values[i] === null ? '?' : fmt(values[i] as number)]);
  if (total !== undefined) rows.push(['Zusammen', fmt(total)]);
  return { type: 'table', caption: theme.title, header: [theme.header, 'Anzahl'], rows };
}

// ─── Text ────────────────────────────────────────────────────────────────────

/** The srText of a task: the sentences as they are said. The visuals describe themselves (aria-label, or a native table). */
export function spoken(prompt: string, context?: string, expression?: string): string {
  return speak([context, prompt, expression].filter(Boolean).join(' '));
}
