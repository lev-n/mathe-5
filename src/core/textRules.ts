/**
 * Checkable text rules for 10–11-year-olds (docs/research.md §4). Words are whitespace tokens; the symbols + − · : = □ < > and numbers with
 * their unit do not count. Pure, used by src/core/testing.ts. Each check returns its problems as text.
 */
import { TEXT_LIMITS } from './age';
import { FRAC_TOKEN } from './format';
import type { Exercise, Step, Stufe } from './types';

/** Fractions and points are numbers to the rules: they count as one number and as no word. */
const asNumbers = (text: string) => text.replace(FRAC_TOKEN, '#').replace(/\b[A-Z]\([^()|]*\|[^()|]*\)/g, '#');

/** Number with its unit, group spaces included: '1 250 000 km', '−3 °C', '90°', '3,50 €'. */
const QUANTITY = /[−-]?\d[\d\u202F\u2009.,]*(?:[\s\u00A0]?(?:€|ct|mm²|cm²|dm²|km²|m²|mm³|cm³|dm³|m³|mm|cm|dm|km|m|kg|mg|g|t|ml|hl|l|min|h|s|ha|a|°C|°)(?![\p{L}\p{N}]))?/gu;

export function wordCount(text: string): number {
  return asNumbers(text)
    .replace(QUANTITY, ' ')
    .split(/\s+/)
    .filter((t) => /\p{L}/u.test(t)).length;
}

/** Sentences: text up to . ! ? followed by a space or the end. A colon does not end a sentence. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

/** T5: always banned. */
const BANNED_CONJUNCTION = /(?<![\p{L}])(obwohl|nachdem|während|sodass|damit)(?![\p{L}])/iu;
/** T5: at most one of these per task on Stufe 2 and 3, none on Stufe 1. */
const WEIL_WENN_DASS = /(?<![\p{L}])(weil|wenn|dass)(?![\p{L}])/giu;

/** Words after a comma that can start a relative clause, with the rest of the clause. */
const RELATIVE = /,\s+(?:(?:in|an|auf|mit|von|zu|bei|für|aus)\s+)?(?:der|die|das|dem|den|denen|deren|dessen|welche[rsmn]?)\s+([^,.;:!?]+)/iu;
/** A clause end that is no verb: 'Der Zehner steht vorne, der Einer hinten.' */
const NO_VERB_END = /^(hinten|vorne|vorn|oben|unten|links|rechts|innen|außen|danach|davor|dabei|dazu)$/i;

/** T5 heuristic: a relative clause ends in a verb, a list has 'und'. It can miss or overreach: then the sentence is too long anyway. */
export function hasRelativeClause(text: string): boolean {
  const m = RELATIVE.exec(text);
  if (!m) return false;
  const clause = m[1].trim();
  if (/\bund\b/.test(clause)) return false;
  const last = clause.split(/\s+/).pop() ?? '';
  if (NO_VERB_END.test(last)) return false;
  return /^\p{Ll}/u.test(last) && /(t|e|en|st|n)$/.test(last);
}

/** Indirect question or free relative after a comma: 'Schau, wo Zehner und Einer gleich sind.' A comma inside a direct question stays fine. */
const INDIRECT = /,\s+(was|wie|wo|wer|wann|warum|ob|woher|wohin|woran)\s+([^,.;:!?]+)(?=[.,;:!]|$)/iu;
/** Free relative at the start of a sentence: 'Was links außen ist, kommt nach rechts außen.' */
const FREE_RELATIVE = /(?:^|:\s+)(was|wer|wo)\s+[^,?]+,[^?]*$/iu;

/** T5 heuristic: such a clause ends in a verb. 'wie ein Blatt Papier' ends in a noun, so a comparison passes. */
function indirectClause(text: string): string | null {
  const m = INDIRECT.exec(text);
  const last = m?.[2].trim().split(/\s+/).pop() ?? '';
  if (m && /^\p{Ll}/u.test(last) && !NO_VERB_END.test(last)) return m[1];
  for (const s of sentences(text)) {
    const free = FREE_RELATIVE.exec(s);
    if (free) return free[1];
  }
  return null;
}

/** T5: a word that opens a subordinate clause that is too much here, or a relative clause; null if none. */
export function subordinateClause(text: string, stufe: Stufe = 1): string | null {
  const m = BANNED_CONJUNCTION.exec(text);
  if (m) return m[1];
  const clauses = [...text.matchAll(WEIL_WENN_DASS)];
  if (clauses.length > TEXT_LIMITS.subordinateClauses[stufe]) return clauses[0][1];
  if (hasRelativeClause(text)) return 'Relativsatz';
  return indirectClause(text);
}

/** T5 on every text the child reads; on Stufe 2 and 3 one 'weil', 'wenn' or 'dass' per text is allowed (pass the whole task as one text). */
export function clauseProblems(texts: readonly string[], stufe: Stufe = 1): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = subordinateClause(t, stufe);
    if (found) out.push(`T5: "${found}" in "${t}"`);
  }
  return out;
}

/** T9: a pronoun for a noun of an earlier sentence, or across a colon. 'es' is not checked: it is mostly impersonal ('Es sind 7.'). */
const BACK_PRONOUN = /(?<![\p{L}])(sie|er|ihn|ihm|ihnen)(?![\p{L}])/iu;
/** T9: idioms and double negatives (what a test can find). */
const IDIOM_OR_DOUBLE_NEGATIVE = /(?<![\p{L}])(kinderleicht|im handumdrehen|auf anhieb klar|ein klacks|kein problem|ein kinderspiel|nicht ohne|nicht un\p{L}+|nie nicht|kein nicht)(?![\p{L}])/iu;

export function pronounProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = t.split(/(?<=[.!?:])\s+/).slice(1).map((part) => BACK_PRONOUN.exec(part)).find(Boolean);
    if (found) out.push(`T9: "${found[1]}" in "${t}"`);
    const idiom = IDIOM_OR_DOUBLE_NEGATIVE.exec(t);
    if (idiom) out.push(`T9: "${idiom[1]}" in "${t}"`);
  }
  return out;
}

const stepText = (step: Step) => (typeof step === 'string' ? step : step.text);

/** T8: letters of a word outside the allowlist. */
export const MAX_WORD_LETTERS = 14;

/**
 * T8: the long words children may meet, for reading review with real children (docs/research.md §4): the plans' Fachwörter and the
 * names of pictures and skills. Add a word only if a simpler one would change the maths.
 */
export const LONG_WORD_ALLOWLIST: ReadonlySet<string> = new Set([
  'Achsensymmetrie',
  'Balkendiagramm',
  'Balkendiagramme',
  'Bruchschreibweise',
  'Dezimalschreibweise',
  'Einheitenumrechnung',
  'Einheitentafel',
  'Fehlerdetektiv',
  'Flächeneinheit',
  'Flächeneinheiten',
  'Flächeninhalt',
  'Flächeninhalte',
  'Flächeninhalts',
  'Häufigkeitstabelle',
  'Häufigkeitstabellen',
  'Hundertmilliarden',
  'Hundertmillionen',
  'Hunderttausender',
  'Hunderttausendern',
  'Kommaschreibweise',
  'Koordinatensystem',
  'Primfaktorzerlegung',
  'Quadratdezimeter',
  'Quadratkilometer',
  'Quadratmeter',
  'Quadratmillimeter',
  'Quadratzentimeter',
  'Rechengesetze',
  'Säulendiagramm',
  'Säulendiagramme',
  'Symmetrieachse',
  'Symmetrieachsen',
  'Stellenwerttafel',
  'Stellenwerttafeln',
  'Überschlagsrechnung',
  'Verbindungsgesetz',
  'Vertauschungsgesetz',
  'Vierfeldertafel',
  'Vorzeichenregel',
  'Vorzeichenregeln',
  'Zehnmilliarden',
  'Zehnerpotenzen',
  'Zehntausendern',
  'achsensymmetrisch',
  'achsensymmetrische',
  'hintereinander',
  'unterschiedlich',
]);

/** Number words ('neunhunderteinundfünfzigtausend'): zahlen.lesen teaches them. */
const NUMBER_WORD = /^((ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)?hundert)?((ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)und)?(eins?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig)?(tausend)?((ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)?hundert)?((ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)und)?(eine|eins?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig)?$/iu;

/** T8: words of more than MAX_WORD_LETTERS letters outside the allowlist; a hyphen joins two words. */
export function longWords(text: string): string[] {
  const words = text.match(/\p{L}+/gu) ?? [];
  return words.filter((w) => [...w].length > MAX_WORD_LETTERS && !LONG_WORD_ALLOWLIST.has(w) && !NUMBER_WORD.test(w));
}

/** T8 on every text the child reads. */
export function longWordProblems(texts: readonly string[]): string[] {
  return texts.flatMap((t) => longWords(t).map((w) => `T8: "${w}" in "${t}"`));
}

/** T1–T4: the task text. An exercise with `context` counts as a Sachaufgabe (T2). */
export function taskTextProblems(ex: Pick<Exercise, 'prompt' | 'context' | 'expression'>, stufe: Stufe): string[] {
  const out: string[] = [];
  const story = [ex.context, ex.prompt].filter(Boolean).join(' ');
  const all = [story, ex.expression].filter(Boolean).join(' ');
  const words = wordCount(all);
  if (ex.context) {
    if (words > TEXT_LIMITS.storyWords[stufe]) out.push(`T2: ${words} words on Stufe ${stufe} (at most ${TEXT_LIMITS.storyWords[stufe]}): "${all}"`);
  } else if (words > TEXT_LIMITS.taskWords) {
    out.push(`T1: ${words} words (at most ${TEXT_LIMITS.taskWords}): "${all}"`);
  }
  const parts = sentences(story);
  if (parts.length > TEXT_LIMITS.sentences[stufe]) out.push(`T3: ${parts.length} sentences (at most ${TEXT_LIMITS.sentences[stufe]}): "${story}"`);
  for (const s of parts) {
    if (wordCount(s) > TEXT_LIMITS.sentenceWords[stufe]) out.push(`T4: ${wordCount(s)} words in a sentence on Stufe ${stufe} (at most ${TEXT_LIMITS.sentenceWords[stufe]}): "${s}"`);
  }
  return out;
}

/** Whole numbers, decimals and grouped numbers of a text; a mixed quantity ('3 € 40 ct', '1 h 25 min') and a fraction or point count as one. */
function numbersIn(text: string): number {
  const merged = asNumbers(text).replace(/\d+\s(€|km|m|cm|kg|h|min)\s\d+\s(ct|m|cm|mm|g|min|s)(?!\p{L})/gu, '#');
  return (merged.match(/#|\d[\d\u202F\u2009]*(?:[.,]\d+)?/g) ?? []).length;
}

/**
 * T7: one question, always last; at most three numbers per sentence of the task, and data belongs in a table or chart once there are more
 * than four numbers (`hasData`: the exercise shows such a picture).
 */
export function questionProblems(ex: Pick<Exercise, 'prompt' | 'context'>, hasData = false): string[] {
  const out: string[] = [];
  const story = [ex.context, ex.prompt].filter(Boolean).join(' ');
  const questions = (story.match(/\?/g) ?? []).length;
  if (questions > 1) out.push(`T7: ${questions} questions: "${story}"`);
  if (questions === 1 && !story.trim().endsWith('?')) out.push(`T7: the question must come last: "${story}"`);
  for (const s of sentences(story)) {
    const count = numbersIn(s);
    if (count > TEXT_LIMITS.sentenceNumbers) out.push(`T7: ${count} numbers in a sentence (at most ${TEXT_LIMITS.sentenceNumbers}): "${s}"`);
  }
  const all = numbersIn(story);
  if (!hasData && all > TEXT_LIMITS.taskNumbers) out.push(`T7: ${all} numbers in a task without a table or chart: "${story}"`);
  return out;
}

/**
 * T10: number format. Thin-space groups from 5 digits and none below; decimal comma; minus as U+2212; negatives after an operator in brackets;
 * · and : for mal and geteilt; points as P(3|2); a space before units, '−3 °C', but '90°'; money with two decimals; no 3/4 in text.
 */
export function numberFormatProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of texts) {
    const t = raw.replace(FRAC_TOKEN, '#');
    const problem = (what: string) => out.push(`T10: ${what} in "${raw}"`);
    if (/(?<![\d\u202F\u2009.,])\d{5,}(?![\d,]*[\u202F\u2009])/.test(t.replace(/,\d+/g, ''))) problem('5 or more digits without thin-space groups');
    if (/(?<![\d\u202F\u2009,])\d[\u202F\u2009]\d{3}(?![\d\u202F\u2009])/.test(t)) problem('a thin space in a 4-digit number');
    if (/(?<![\d.,])\d{1,3}(?:[. \u00A0]\d{3})+(?![\d.,])/.test(t)) problem('groups need a thin space');
    if (/(?<![\d.])\d+\.\d+(?![\d.])(?![\s\u00A0]*Uhr)/.test(t)) problem('a decimal point (use a comma; clock times need "Uhr")');
    if (/(^|[\s(=])-\d/.test(t) || /\d\s-\s\d/.test(t)) problem('a hyphen as a minus (use U+2212)');
    if (/[\d)]\s*[+\u2212\u00B7:]\s*\u2212\d/.test(t)) problem('a negative after an operator needs brackets');
    if (/\d\s*[*×÷xX]\s*\d/.test(t)) problem('use · and : for mal and geteilt');
    if (/\b[A-Z]\s?\(\s*[−-]?\d+\s*[;,/]\s*[−-]?\d+\s*\)/.test(t) || /\b[A-Z]\s\(\s*[−-]?\d+\s*\|/.test(t) || /\b[A-Z]\(\s*[−-]?\d+\s+\|\s*[−-]?\d+\s*\)/.test(t)) problem('a point is written P(3|2)');
    if (/\d\s*\/\s*\d/.test(t)) problem('a fraction belongs in {frac:3/4}');
    if (/\d(?:€|ct|mm|cm|dm|km|kg|mg|ml|min|°C)(?![\p{L}\p{N}])/u.test(t) || /\d(?:m|g|l|h|s|t)(?![\p{L}\p{N}²³])/u.test(t)) problem('a space before the unit');
    if (/\d[\s\u00A0]°(?!C)/.test(t)) problem('no space before ° in an angle');
    if (/\d°C/.test(t)) problem('a space before °C');
    for (const m of t.matchAll(/\d,(\d+)[\s\u00A0]?€(?!\p{L})/gu)) if (m[1].length !== 2) problem('money with two decimals');
  }
  return out;
}

/** T12 of the method setting: the words of the two subtraction methods never meet in one written exercise. */
export function methodWordProblems(texts: readonly string[]): string[] {
  const all = texts.join(' ');
  return /entbünd/i.test(all) && /erweiter/i.test(all) ? [`Method: "Entbündeln" and "Erweitern" in one exercise: "${all}"`] : [];
}

/** Catalogue: Rest in full, with a Probe line in the worked steps; never 'R' and never two Rest results chained with '='. */
export function restProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    if (/\d\s*R\s*\d/.test(t)) out.push(`Rest: write "Rest" out: "${t}"`);
    if (/Rest\s*\d+\s*=[^.!?]*Rest/.test(t)) out.push(`Rest: two Rest results chained with "=": "${t}"`);
  }
  return out;
}

/** §7.2: a catchphrase as a rule on its own. Hints name the step (F5). */
const CATCHPHRASE = /minus\s+mal\s+minus|aus\s+minus\s+wird\s+plus|zwei\s+minus\s+(?:ergeben|geben)\s+plus/iu;

/** T15: one hint (strategy hint, bug hint or whyWrong). */
export function hintProblems(hint: string): string[] {
  const out: string[] = [];
  if (wordCount(hint) > TEXT_LIMITS.hintWords) out.push(`T15: ${wordCount(hint)} words in a hint (at most ${TEXT_LIMITS.hintWords}): "${hint}"`);
  if (sentences(hint).length > TEXT_LIMITS.hintSentences) out.push(`T15: ${sentences(hint).length} sentences in a hint (at most ${TEXT_LIMITS.hintSentences}): "${hint}"`);
  if (CATCHPHRASE.test(hint)) out.push(`§7.2: a catchphrase instead of a step: "${hint}"`);
  return out;
}

/** T15: praise and worked steps. */
export function praiseAndStepProblems(ex: Pick<Exercise, 'praise' | 'steps'>): string[] {
  const out: string[] = [];
  if (wordCount(ex.praise) > TEXT_LIMITS.praiseWords) out.push(`T15: ${wordCount(ex.praise)} words of praise (at most ${TEXT_LIMITS.praiseWords}): "${ex.praise}"`);
  if (ex.steps.length > TEXT_LIMITS.steps) out.push(`T15: ${ex.steps.length} worked steps (at most ${TEXT_LIMITS.steps})`);
  for (const step of ex.steps) {
    const text = stepText(step);
    if (/\n/.test(text)) out.push(`T15: a worked step with a line break: "${text}"`);
    if (wordCount(text) > TEXT_LIMITS.stepWords) out.push(`T15: ${wordCount(text)} words in a worked step (at most ${TEXT_LIMITS.stepWords}): "${text}"`);
  }
  return out;
}

/** T6: 'würde, hätte, wäre', past forms, and 'wird/werden' with a participle. 'Der Hunderter wird größer.' stays fine. */
const SUBJUNCTIVE = /(?<![\p{L}])(wurde|wurden|würde|würden|hätte|hätten|wäre|wären)(?![\p{L}])/iu;
const PASSIVE = /(?<![\p{L}])(wird|werden)(?![\p{L}])[^.!?,;:]*(?<![\p{L}])(?:ge|be|ver|er|zer|ent)\p{L}{3,}(?:t|en)(?![\p{L}])/iu;
/** T6: the one allowed Konjunktiv, a Stufe 3 "Was wäre, wenn". */
const WAS_WAERE = /Was wäre, wenn/g;

/** T6 on every text the child reads. */
export function passiveProblems(texts: readonly string[], stufe: Stufe = 1): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const allowed = stufe === 3 && (t.match(WAS_WAERE) ?? []).length === 1;
    const found = SUBJUNCTIVE.exec(allowed ? t.replace(WAS_WAERE, '') : t) ?? PASSIVE.exec(t);
    if (found) out.push(`T6: "${found[0]}" in "${t}"`);
  }
  return out;
}

/** T17 word list: diminutives and baby talk, 'Kinder' or 'Kids' as address, 'wir' as a fake teacher voice, rhyme openers. */
const TONE_WORDS = /(?<![\p{L}])(aufgäbchen|zählerchen|nennerchen|zahlenfreund\p{L}*|mathe-?held\p{L}*|kleine matheheldin|rechenkünstler\p{L}*|mathefuchs|mathe-?profi\p{L}*|superstar|kids?|liebe kinder|hallo kinder|ihr kinder|wir|uns|unser\p{L}*|na,)(?![\p{L}])/iu;
const EMOJI = /\p{Extended_Pictographic}/u;

/** T17: the word list, emoji, and more than one exclamation mark per screen (`texts`: what one screen shows). */
export function toneProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const word = TONE_WORDS.exec(t);
    if (word) out.push(`T17: "${word[1]}" in "${t}"`);
    if (EMOJI.test(t.replace(/[\u00A9\u00AE]/g, ''))) out.push(`T17: an emoji in "${t}"`);
  }
  const marks = texts.join(' ').match(/!/g)?.length ?? 0;
  if (marks > 1) out.push(`T17: ${marks} exclamation marks on one screen: "${texts.join(' ')}"`);
  return out;
}

/** T4–T6, T8, T9 and T17 on a text outside the generators (badges, phrases, privacy text). */
export function childTextProblems(text: string): string[] {
  const out = [...clauseProblems([text], 2), ...longWordProblems([text]), ...pronounProblems([text]), ...passiveProblems([text]), ...toneProblems([text])];
  for (const s of sentences(text)) {
    if (wordCount(s) > TEXT_LIMITS.sentenceWords[1]) out.push(`T4: ${wordCount(s)} words in a sentence: "${s}"`);
  }
  return out;
}
