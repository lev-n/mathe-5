/**
 * Helpers of the topic 'flaeche': the generator frame (Stufe picks the forms, AB the demand), text of quantities, rectangles and L-forms, and the bug
 * hints of docs/research.md §5, word for word where the text rules allow it.
 */
import { fmt, speak } from '../../core/format';
import type { Ab, Answer, Bug, Cell, GenContext, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, multiBugs, numberBugs, safeHints, targetAb, type ExerciseBody, type MaybeBug } from '../shared';

/** A task as a form returns it. The frame adds AB and KMK tags, cleans the bugs and hints and writes srText from the text if none is given. */
export type Item = Omit<ExerciseBody, 'ab' | 'kmk' | 'bugs' | 'srText'> & { kmk?: string[]; bugs?: MaybeBug[]; srText?: string };
export type Form = (rng: Rng, ctx: GenContext) => Item;
export type Forms = Readonly<Record<Stufe, Readonly<Record<Ab, Form>>>>;

/** Instead of a hint that would state the answer. */
const NEUTRAL_HINT = 'Prüfe deine Rechnung Schritt für Schritt.';

const fits = (x: number, decimals = 0) => x >= 0 && Math.abs(x * 10 ** decimals - Math.round(x * 10 ** decimals)) < 1e-9;

/** The numbers a hint must not state. */
function answerNumbers(answer: Answer): number[] {
  if (answer.kind === 'number') return answer.value === null ? [] : [answer.value];
  if (answer.kind === 'multi') return answer.fields.map((f) => f.value);
  if (answer.kind === 'choice' && /^\d+$/.test(answer.options[answer.correct].label)) return [Number(answer.options[answer.correct].label)];
  return [];
}

/** Bugs that a child can type in this answer's fields, none equal to the answer. */
function usableBugs(bugs: MaybeBug[], answer: Answer): Bug[] {
  if (answer.kind === 'number') {
    return numberBugs(bugs, answer.value).filter((b) => fits(b.match as number, answer.decimals));
  }
  if (answer.kind === 'multi') {
    return multiBugs(bugs, answer.fields).filter((b) => answer.fields.every((f) => {
      const m = (b.match as Record<string, number>)[f.id];
      return m === undefined || fits(m, f.decimals);
    }));
  }
  return bugs.filter((b): b is Bug => !!b);
}

/** The exercise generator of a skill: the Stufe chooses the content, the AB the form inside it. */
export function generator(skill: Pick<SkillDef, 'id' | 'topicId'>, kmk: string[], forms: Forms): SkillDef['generate'] {
  return (rng, stufe, ctx) => {
    const ab = targetAb(rng, stufe, ctx);
    const item = forms[stufe][ab](rng, ctx);
    const numbers = answerNumbers(item.answer);
    const safe = (hint: string) => numbers.reduce((text, value) => safeHints([text], value, NEUTRAL_HINT)[0], hint);
    const answer: Answer = item.answer.kind === 'choice'
      ? { ...item.answer, options: item.answer.options.map((o) => (o.whyWrong ? { ...o, whyWrong: safe(o.whyWrong) } : o)) }
      : item.answer;
    return build(skill, stufe, {
      ...item,
      ab,
      answer,
      hints: [...new Set(item.hints.map(safe))],
      bugs: usableBugs(item.bugs ?? [], answer).map((b) => ({ ...b, hint: safe(b.hint) })),
      kmk: item.kmk ?? kmk,
      srText: item.srText ?? speak([item.context, item.prompt, item.expression].filter(Boolean).join(' ')),
    });
  };
}

// ─── Text ────────────────────────────────────────────────────────────────────

/** A quantity: q(12500, 'cm²') → '12 500 cm²'. */
export const q = (n: number, unit: string) => `${fmt(n)} ${unit}`;

/** The number of a typed answer with its unit behind the field. */
export const numberAnswer = (value: number, unit: string, before?: string) => ({ kind: 'number' as const, value, unit, ...(before ? { before } : {}) });

export const bug = (id: string, match: Bug['match'], hint: string): Bug => ({ id, match, hint });

/** Letters of the faces and of picture options. */
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

// ─── Hints (docs/research.md §5) ─────────────────────────────────────────────

export const HINT = {
  umfangFlaeche: 'Umfang: einmal außen herum. Fläche: alles innen.',
  umfangHalb: 'Geh einmal ganz herum: alle vier Seiten.',
  einheitCm: 'Fläche misst du in Quadraten: cm², nicht cm.',
  zerlegenDoppelt: 'Zähle das gemeinsame Stück nur einmal.',
  quaderSichtbar: 'Du siehst drei Flächen. Der Quader hat sechs.',
  kantenVerdeckt: 'Denk auch an die verdeckten Kanten.',
  lagenZaehlen: 'Zähle eine Lage. Wie viele Lagen hat der Quader?',
  volumenOberflaeche: 'Oberfläche in cm², Volumen in cm³. Was ist gefragt?',
  netzUeberlappt: 'Falte im Kopf: Liegen zwei Flächen übereinander?',
} as const;

// ─── Figures ─────────────────────────────────────────────────────────────────

/** The cells of a rectangle whose top left cell is (x, y). */
export function rectCells(x: number, y: number, w: number, h: number): Cell[] {
  const out: Cell[] = [];
  for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) out.push([col, row]);
  return out;
}

/** A rectangle of w × h Kästchen on a grid with a margin of one Kästchen. */
export function gridRect(w: number, h: number): VisualOf<'grid'> {
  return { type: 'grid', width: w + 2, height: h + 2, cells: rectCells(1, 1, w, h), showOutline: true };
}

/** A rectangle or square with its side lengths, clockwise from the top side. */
export function rectShape(a: number, b: number, unit: string, labelled = 4): VisualOf<'shape'> {
  const sides = [q(a, unit), q(b, unit), q(a, unit), q(b, unit)];
  return { type: 'shape', shape: a === b ? 'quadrat' : 'rechteck', named: true, sideLabels: sides.map((s, i) => (i < labelled ? s : null)) };
}

/** Bounding box w × h with its top right corner cut out, as in the shape visual. */
export interface LForm {
  w: number;
  h: number;
  cutW: number;
  cutH: number;
}

/**
 * Can a child read all side labels of this L-form? The shape visual (src/ui/visuals/ShapeVisual.tsx) fits w × h into 180 × 140 and writes labels about 46 px wide at most.
 * At the cut, the flat side must hold its label, and that label must clear the one beside the steep side. A two-digit label needs room beside the figure.
 */
export function lLabelsFit({ w, h, cutW, cutH }: LForm): boolean {
  const scale = Math.min(180 / w, 140 / h);
  const clear = cutH * scale >= 66 || cutW * scale >= 100;
  const room = (200 - w * scale) / 2 + 31;
  return cutW * scale >= 46 && clear && (h < 10 || room >= 46);
}

/** An L-form whose cut takes at least a quarter of each side. labelled: its side labels can all be read (a grid has none). */
export function pickL(rng: Rng, w: [number, number], h: [number, number], labelled = true): LForm {
  const part = (n: number) => rng.int(Math.ceil(n / 4), n - Math.ceil(n / 4));
  for (;;) {
    const W = rng.int(w[0], w[1]);
    const H = rng.int(h[0], h[1]);
    const l = { w: W, h: H, cutW: part(W), cutH: part(H) };
    if (!labelled || lLabelsFit(l)) return l;
  }
}

export const lArea = (l: LForm) => l.w * l.h - l.cutW * l.cutH;
export const lPerimeter = (l: LForm) => 2 * (l.w + l.h);

/** The six sides clockwise from the top: w − cutW, cutH, cutW, h − cutH, w, h. */
export const lSides = (l: LForm) => [l.w - l.cutW, l.cutH, l.cutW, l.h - l.cutH, l.w, l.h];

/** The L-form drawn to scale. shown: the indices of lSides() that carry a label. */
export function lShape(l: LForm, unit: string, shown: readonly number[] = [0, 1, 2, 3, 4, 5], split?: 'horizontal' | 'vertical'): VisualOf<'shape'> {
  return { type: 'shape', shape: 'l-form', named: true, lForm: { ...l }, sideLabels: lSides(l).map((s, i) => (shown.includes(i) ? q(s, unit) : null)), ...(split ? { split } : {}) };
}
