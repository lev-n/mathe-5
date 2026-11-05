/** Test support of the topic 'flaeche' (imported only by *.test.ts). */
import { WIDEST_RANGES } from '../../core/generate';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, GenContext, SkillDef, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';

export const WIDE: GenContext = { subtractionMethod: 'abziehen', ranges: WIDEST_RANGES };

/** Items of every Stufe and AB. */
export function allItems(skill: SkillDef, ctx: GenContext = WIDE, perCell = 60): Exercise[] {
  const out: Exercise[] = [];
  for (const stufe of STUFEN as readonly Stufe[]) {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (let seed = 1; seed <= perCell; seed++) out.push(skill.generate(createRng(seed * 8831 + stufe * 13 + ab), stufe, { ...ctx, ab }));
    }
  }
  return out;
}

/** The value of a number answer. */
export function numberOf(ex: Exercise): number {
  if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error(`${ex.key}: no number answer`);
  return ex.answer.value;
}

/** The value of a field of a multi answer. */
export function fieldOf(ex: Exercise, id: string): number {
  if (ex.answer.kind !== 'multi') throw new Error(`${ex.key}: no multi answer`);
  const field = ex.answer.fields.find((f) => f.id === id);
  if (!field) throw new Error(`${ex.key}: no field ${id}`);
  return field.value;
}

/** The label of the correct option. */
export function correctLabel(ex: Exercise): string {
  if (ex.answer.kind !== 'choice') throw new Error(`${ex.key}: no choice answer`);
  return ex.answer.options[ex.answer.correct].label;
}

/** The numbers of a text, with their groups and commas: '12 500 cm² und 2,5' → [12500, 2.5]. */
export function numbersIn(text: string): number[] {
  return [...text.matchAll(/\d[\d  ]*(?:,\d+)?/g)].map((m) => Number(m[0].replace(/[  ]/g, '').replace(',', '.')));
}
