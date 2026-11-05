/**
 * The Fachwörter of T11 (docs/research.md §4) with a short gloss. ItemView lets the child tap the first use of a word in a task to read it, inline and not as a pop-up;
 * this holds on every task of a skill, so nothing about a visit has to be remembered. Forms lists the inflected words as they occur in the task texts.
 */
import type { TopicId } from '../core/types';

export interface Fachwort {
  word: string;
  forms: string;
  gloss: string;
  /** Only in this topic: outside it the word means something else (a Betrag of money). */
  topic?: TopicId;
}

export const FACHWOERTER: readonly Fachwort[] = [
  { word: 'Summe', forms: 'Summen?', gloss: 'Das Ergebnis beim Plusrechnen.' },
  { word: 'Differenz', forms: 'Differenz(?:en)?', gloss: 'Das Ergebnis beim Minusrechnen.' },
  { word: 'Produkt', forms: 'Produkte?s?', gloss: 'Das Ergebnis beim Malrechnen.' },
  { word: 'Quotient', forms: 'Quotient(?:en)?', gloss: 'Das Ergebnis beim Geteiltrechnen.' },
  { word: 'Stellenwert', forms: 'Stellenwert(?:e|en|es)?', gloss: 'So viel ist eine Ziffer an ihrer Stelle wert.' },
  { word: 'Stufenzahl', forms: 'Stufenzahl(?:en)?', gloss: 'Eine 1 mit Nullen dahinter: 10, 100, 1 000 und so weiter.' },
  { word: 'Vorzeichen', forms: 'Vorzeichen', gloss: 'Plus oder Minus vor einer Zahl.' },
  { word: 'Rechenzeichen', forms: 'Rechenzeichen', gloss: 'Das Zeichen für die Rechenart: +, −, · oder :.' },
  { word: 'Betrag', forms: 'Betrag|Beträge|Beträgen', gloss: 'Der Abstand einer Zahl zur 0.', topic: 'ganzzahlen' },
  { word: 'Gegenzahl', forms: 'Gegenzahl(?:en)?', gloss: 'Gleich weit von der 0, auf der anderen Seite.' },
  { word: 'Zähler', forms: 'Zählern?|Zählers', gloss: 'Die Zahl über dem Bruchstrich: So viele Teile zählst du.' },
  { word: 'Nenner', forms: 'Nennern?|Nenners', gloss: 'Die Zahl unter dem Bruchstrich: In so viele Teile ist das Ganze geteilt.' },
  { word: 'kürzen', forms: 'kürzen|kürze|kürzt|gekürzt', gloss: 'Zähler und Nenner durch dieselbe Zahl teilen.' },
  { word: 'erweitern', forms: 'erweitern|erweitere|erweitert', gloss: 'Zähler und Nenner mit derselben Zahl malnehmen.' },
  { word: 'Teiler', forms: 'Teilern?|Teilers', gloss: 'Diese Zahl teilt eine andere ohne Rest.' },
  { word: 'Vielfaches', forms: 'Vielfaches|Vielfache|Vielfachen', gloss: 'Eine Zahl mal 1, mal 2, mal 3 und so weiter.' },
  { word: 'Primzahl', forms: 'Primzahl(?:en)?', gloss: 'Eine Zahl mit genau zwei Teilern: 1 und sich selbst.' },
  { word: 'Scheitel', forms: 'Scheitels?', gloss: 'Der Punkt, an dem die zwei Linien eines Winkels beginnen.' },
  { word: 'Schenkel', forms: 'Schenkeln?|Schenkels', gloss: 'Die zwei Linien, die einen Winkel bilden.' },
  { word: 'parallel', forms: 'parallel|parallele|parallelen|paralleler', gloss: 'Zwei Linien mit überall gleichem Abstand.' },
  { word: 'senkrecht', forms: 'senkrecht|senkrechte|senkrechten|senkrechter', gloss: 'Zwei Linien bilden einen rechten Winkel.' },
  { word: 'Rechtswert', forms: 'Rechtswert(?:e|es)?', gloss: 'Die erste Zahl eines Punktes: So weit geht es nach rechts.' },
  { word: 'Hochwert', forms: 'Hochwert(?:e|es)?', gloss: 'Die zweite Zahl eines Punktes: So weit geht es nach oben.' },
];

const WORDS = new RegExp(`(?<![\\p{L}\\p{N}-])(?:${FACHWOERTER.map((f, i) => `(?<w${i}>${f.forms})`).join('|')})(?![\\p{L}\\p{N}-])`, 'giu');

export type GlossSegment = { text: string } | { word: string; gloss: string };

/** One text in segments: the first use of each Fachwort in `seen` becomes a word with its gloss. Adds what it finds to `seen`. */
function glossSegments(text: string, seen: Set<string>, topic: TopicId): GlossSegment[] {
  const out: GlossSegment[] = [];
  let from = 0;
  for (const m of text.matchAll(WORDS)) {
    const f = FACHWOERTER[Object.keys(m.groups ?? {}).findIndex((k) => m.groups?.[k] !== undefined)];
    if (seen.has(f.word) || (f.topic && f.topic !== topic)) continue;
    seen.add(f.word);
    if (m.index > from) out.push({ text: text.slice(from, m.index) });
    out.push({ word: m[0], gloss: f.gloss });
    from = m.index + m[0].length;
  }
  if (from < text.length || out.length === 0) out.push({ text: text.slice(from) });
  return out;
}

/** The texts of a task in reading order: only the first use across all of them gets a gloss. */
export function glossTexts(texts: readonly string[], topic: TopicId): GlossSegment[][] {
  const seen = new Set<string>();
  return texts.map((t) => glossSegments(t, seen, topic));
}
