/**
 * Test support of the topic (imported only by *.test.ts): an independent evaluator for terms with signs, used to recompute the lines of worked steps, and the
 * checks every skill test of this topic runs.
 */
import { expect } from 'vitest';
import { fmt, fmtTemp, toSpeech } from '../../core/format';
import { createRng } from '../../core/rng';
import { RANGE_DEFAULTS } from '../../data/profiles';
import { CTX } from '../test-utils';
import { GEGENZAHL_NEAR, VORZEICHEN_GLOSS } from './helpers';
import type { Ab, Exercise, SkillDef, Step, Stufe } from '../../core/types';

type Tok = number | '+' | '−' | '·' | ':' | '(' | ')' | '|';

function tokens(src: string): Tok[] | null {
  const out: Tok[] = [];
  for (const m of src.replace(/[   ]/g, (c) => (c === ' ' ? ' ' : '')).matchAll(/\d+|[+−·:()|]|\S/g)) {
    const t = m[0];
    if (/^\d+$/.test(t)) out.push(Number(t));
    else if ('+−·:()|'.includes(t)) out.push(t as Tok);
    else return null;
  }
  return out.length ? out : null;
}

/** The value of a term with integers, signs, brackets, · : and |…|; null if the text is anything else. */
export function evalTerm(src: string): number | null {
  const toks = tokens(src);
  if (!toks) return null;
  let i = 0;
  const atom = (): number | null => {
    const t = toks[i++];
    if (typeof t === 'number') return t;
    if (t === '−') {
      const v = atom();
      return v === null ? null : -v;
    }
    if (t === '(' || t === '|') {
      const v = sum();
      const close = toks[i++];
      if (v === null || close !== (t === '(' ? ')' : '|')) return null;
      return t === '|' ? Math.abs(v) : v;
    }
    return null;
  };
  const product = (): number | null => {
    let v = atom();
    while (v !== null && (toks[i] === '·' || toks[i] === ':')) {
      const op = toks[i++];
      const r = atom();
      if (r === null) return null;
      v = op === '·' ? v * r : v / r;
    }
    return v;
  };
  const sum = (): number | null => {
    let v = product();
    while (v !== null && (toks[i] === '+' || toks[i] === '−')) {
      const op = toks[i++];
      const r = product();
      if (r === null) return null;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const v = sum();
  return i === toks.length ? v : null;
}

const textOf = (s: Step) => (typeof s === 'string' ? s : s.text);

/** A line 'Text: a = b = c': every side that is a pure term must have the same value. Returns the lines that do not add up. */
export function wrongStepLines(ex: Exercise): string[] {
  const out: string[] = [];
  for (const raw of ex.steps.map(textOf)) {
    const body = raw.replace(/^[^=]*?\p{L}:\s/u, '').replace(/\.$/, '');
    if (!body.includes(' = ')) continue;
    const values = body.split(' = ').map(evalTerm);
    if (values.some((v) => v === null)) continue;
    if (values.some((v) => v !== values[0])) out.push(`${ex.key}: ${raw} → ${values.join(' vs ')}`);
  }
  return out;
}

/** The worked steps state the result: a number answer in the last step, each field of a multi answer in some step (with U+2212, as the child reads it). */
export function missingResult(ex: Exercise): string[] {
  const texts = ex.steps.map(textOf);
  const last = texts[texts.length - 1];
  const a = ex.answer;
  if (a.kind === 'number' && a.value !== null) return last.includes(fmt(a.value)) ? [] : [`${ex.key}: last step "${last}" does not state ${fmt(a.value)}`];
  if (a.kind !== 'multi') return [];
  return a.fields.filter((f) => !texts.some((t) => t.includes(fmt(f.value)))).map((f) => `${ex.key}: no step states ${fmt(f.value)}`);
}

/** Items of one Stufe and AB; the parts of the key after the skill, Stufe and AB. */
export function items(skill: SkillDef, stufe: Stufe, ab: Ab, n = 200): { ex: Exercise; form: string; p: string[]; num: number[] }[] {
  return Array.from({ length: n }, (_, i) => {
    const ex = skill.generate(createRng(i * 7717 + 13 + stufe * 101 + ab), stufe, { ...CTX, ab });
    const [, , , form, ...p] = ex.key.split(':');
    return { ex, form, p, num: p.map(Number) };
  });
}

/** All the sentences a child can read on an item. */
function shownTexts(ex: Exercise): string[] {
  const options = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : [];
  return [ex.context ?? '', ex.prompt, ex.praise, ...ex.hints, ...ex.steps.map(textOf), ...(ex.bugs ?? []).map((b) => b.hint), ...options];
}

/** '1 Striche', 'sind es 1 Grad', 'Es bleiben 1 Grad': the noun or the verb does not fit the number 1. */
export function singularProblems(ex: Exercise): string[] {
  return shownTexts(ex).filter((t) => /(?<![\d,])1 (Striche|Schritte|Stockwerke)\b|\bsind es 1 |\bbleiben 1 /.test(t)).map((t) => `${ex.key}: ${t}`);
}

/** The Fachwörter of T11, the skill that teaches each, and the words that explain it elsewhere (Rechenzeichen has none: outside its skill it stays out). */
const FACHWOERTER: { word: RegExp; home: string; gloss: string | null }[] = [
  { word: /Betr[aä]g/, home: 'ganzzahlen.betrag', gloss: 'Der Betrag ist der Abstand zur 0.' },
  { word: /Gegenzahl/, home: 'ganzzahlen.betrag', gloss: GEGENZAHL_NEAR },
  { word: /Vorzeichen/, home: 'ganzzahlen.vorzeichen', gloss: VORZEICHEN_GLOSS },
  { word: /Rechenzeichen/, home: 'ganzzahlen.vorzeichen', gloss: null },
];

/**
 * T11: outside the skill that teaches it, a Fachwort comes with its gloss, in the same text or in the context that is always on screen. A later text cannot count on an earlier
 * one: praise and worked steps also show when no hint was opened.
 */
export function fachwortWithoutGloss(skill: SkillDef, ex: Exercise): string[] {
  return FACHWOERTER.filter((f) => f.home !== skill.id).flatMap((f) => {
    const glossed = (t: string) => f.gloss !== null && (t.includes(f.gloss) || !!ex.context?.includes(f.gloss));
    return shownTexts(ex).filter((t) => f.word.test(t) && !glossed(t)).map((t) => `${ex.key}: ${t}`);
  });
}

/** The data of the picture stands in srText, which ItemView attaches to the task and the field: a child who tabs to the field skips the image or table. */
export function pictureNotSaid(ex: Exercise): string[] {
  const said = (text: string) => ex.srText.includes(toSpeech(text));
  const out: string[] = [];
  const v = ex.visual;
  const a = ex.answer;
  if (a.kind === 'numberline' && !said(`von ${fmt(a.min)} bis ${fmt(a.max)}`)) out.push(`${ex.key}: the ends of the line`);
  if (v?.type === 'numberLine' && (v.labels || v.marks?.some((m) => /^[A-Z]$|\d/.test(m.label)))) {
    if (!said(`von ${fmt(v.min)} bis ${fmt(v.max)}`)) out.push(`${ex.key}: the ends of the line`);
    for (const m of v.marks ?? []) if (/^[A-Z]$/.test(m.label) && !said(`Pfeil ${m.label}`)) out.push(`${ex.key}: Pfeil ${m.label}`);
  }
  if (v?.type === 'thermometer' && !ex.context && !said(`von ${fmtTemp(v.min)} bis ${fmtTemp(v.max)}`)) out.push(`${ex.key}: the thermometer`);
  if (v?.type === 'table') for (const row of v.rows) for (const cell of row.slice(1)) if (!said(cell)) out.push(`${ex.key}: ${cell}`);
  return out;
}

/** §2.5: a line that calculates with signs, which a profile with integers as states and changes must not show. */
export function calculatingLines(skill: SkillDef): string[] {
  const out: string[] = [];
  for (const stufe of [1, 2, 3] as Stufe[]) {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (let seed = 1; seed <= 200; seed++) {
        const ex = skill.generate(createRng(seed * 41 + stufe * 7 + ab), stufe, { ...CTX, ranges: RANGE_DEFAULTS.bruch, ab });
        for (const t of [...ex.steps.map(textOf), ...ex.hints]) if (/\d\s*[+−]\s*\(?−?\d/.test(t)) out.push(`${ex.key}: ${t}`);
      }
    }
  }
  return out;
}

/** Plain natural numbers: no negative number in the task and none as the result, so the item is no task about integers. */
export function naturalOnly(ex: Exercise): boolean {
  const fields = ex.answer.kind === 'multi' ? ex.answer.fields : [];
  const options = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : [];
  const task = [ex.expression ?? '', ex.context ?? '', ...options, ...fields.map((f) => f.before ?? '')].join(' ');
  const values = ex.answer.kind === 'number' ? [ex.answer.value ?? 0] : fields.map((f) => f.value);
  return !/−\d/.test(task) && values.every((v) => v >= 0);
}

/** T16: a sign or a grouping bracket left in the spoken text, which the voice reads as something else or not at all. */
export function spokenProblems(ex: Exercise): string[] {
  return /[()<>]/.test(ex.srText) ? [`${ex.key}: ${ex.srText}`] : [];
}

/** Labels above a Zahlengerade that overprint each other: the marks' labels and the jumps' labels share one band (geometry of NumberLineVisual). */
export function labelOverlaps(ex: Exercise): string[] {
  const out: string[] = [];
  const visuals = [ex.visual, ...ex.steps.map((s) => (typeof s === 'string' ? undefined : s.visual))];
  for (const v of visuals) {
    if (v?.type !== 'numberLine') continue;
    const x = (value: number) => ((value - v.min) / (v.max - v.min)) * 340;
    const boxes = [
      ...(v.marks ?? []).map((m) => ({ x: x(m.value), w: m.label.length * 11.6 + 6, text: m.label })),
      ...(v.jumps ?? []).filter((j) => j.label).map((j) => ({ x: (x(j.from) + x(j.to)) / 2, w: (j.label as string).length * 9.3 + 6, text: j.label as string })),
    ];
    boxes.forEach((p, i) => boxes.slice(i + 1).forEach((q) => {
      if (Math.abs(p.x - q.x) < (p.w + q.w) / 2) out.push(`${ex.key}: ${p.text} and ${q.text}`);
    }));
  }
  return out;
}

/** Every item of every Stufe and AB: worked steps add up and state the result, at least two hints, only signed fields, and the text and label checks above. */
export function checkAll(skill: SkillDef): void {
  for (const stufe of [1, 2, 3] as Stufe[]) {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const { ex } of items(skill, stufe, ab, 80)) {
        expect(wrongStepLines(ex)).toEqual([]);
        expect(missingResult(ex)).toEqual([]);
        expect(ex.hints.length, ex.key).toBeGreaterThanOrEqual(2);
        expect(singularProblems(ex)).toEqual([]);
        expect(fachwortWithoutGloss(skill, ex)).toEqual([]);
        expect(pictureNotSaid(ex)).toEqual([]);
        expect(spokenProblems(ex)).toEqual([]);
        expect(labelOverlaps(ex)).toEqual([]);
      }
    }
  }
}

export const answerValue = (ex: Exercise): number | null => (ex.answer.kind === 'number' ? ex.answer.value : ex.answer.kind === 'numberline' ? ex.answer.value : null);

export const correctLabel = (ex: Exercise): string => {
  if (ex.answer.kind !== 'choice') throw new Error(`${ex.key}: a choice answer`);
  return ex.answer.options[ex.answer.correct].label;
};

export const fieldValues = (ex: Exercise): Record<string, number> => {
  if (ex.answer.kind !== 'multi') throw new Error(`${ex.key}: a multi answer`);
  return Object.fromEntries(ex.answer.fields.map((f) => [f.id, f.value]));
};
