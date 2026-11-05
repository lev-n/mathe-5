import { createRng, deriveSeed } from './rng';
import type { Exercise, GenContext, RangeDefaults, SkillDef, Stufe } from './types';

/** The widest range, offered by Stufe: the defaults of the profile 'offen' (docs/research.md §2.5; src/data/profiles.ts lists all four). */
export const WIDEST_RANGES: RangeDefaults = { maxAngle: 360, fourQuadrants: true, beyondMilliarde: true, threeDigitFactor: true, areaUnits: 'wide', integersAsStates: false };

export const DEFAULT_CONTEXT: GenContext = { subtractionMethod: 'abziehen', ranges: WIDEST_RANGES };

/**
 * Generate an exercise whose key is not in `recent` (tries up to 30 derived seeds).
 * Falls back to the last attempt if the skill's variety is exhausted.
 */
export function generateUnique(
  skill: SkillDef,
  stufe: Stufe,
  seed: number,
  ctx: GenContext = DEFAULT_CONTEXT,
  recent: ReadonlySet<string> = new Set(),
): Exercise {
  let ex = skill.generate(createRng(seed), stufe, ctx);
  for (let i = 1; i < 30 && recent.has(ex.key); i++) {
    ex = skill.generate(createRng(deriveSeed(seed, i)), stufe, ctx);
  }
  return ex;
}
