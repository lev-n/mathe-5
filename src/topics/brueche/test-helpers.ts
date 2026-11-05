/** Test support of the topic 'brueche' (imported only by *.test.ts): samples per Stufe and AB, and independent readers of the task text. */
import { DEFAULT_CONTEXT } from '../../core/generate';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';

export function items(skill: SkillDef, stufe: Stufe, ab: Ab, n = 200): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 2053 + stufe * 7 + ab), stufe, { ...DEFAULT_CONTEXT, ab }));
}

export function everyItem(skill: SkillDef, n = 120): Exercise[] {
  return ([1, 2, 3] as Stufe[]).flatMap((s) => ([1, 2, 3] as Ab[]).flatMap((a) => items(skill, s, a, n)));
}

/** What a child sees of a task; the order of its options or order items does not make it another task. */
function shownTask(ex: Exercise): string {
  const a = ex.answer;
  const options = a.kind === 'choice' ? a.options.map((o) => JSON.stringify([o.label, o.visual ?? null])).sort() : a.kind === 'order' ? [...a.items].sort() : [];
  return JSON.stringify([ex.context, ex.prompt, ex.expression, ex.visual, options]);
}

/** Tasks that look the same under two keys at one Stufe: generateUnique avoids repeats by key alone, so a round could show them twice. */
export function sameTaskTwoKeys(skill: SkillDef, n = 300): string[] {
  const out: string[] = [];
  for (const stufe of [1, 2, 3] as Stufe[]) {
    const keyOf = new Map<string, string>();
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(skill, stufe, ab, n)) {
        const task = shownTask(ex);
        const known = keyOf.get(task);
        if (known !== undefined && known !== ex.key) out.push(`${known} and ${ex.key}`);
        keyOf.set(task, ex.key);
      }
    }
  }
  return out;
}

/** All fractions of a text as [Zähler, Nenner], a mixed number counted in its Nenner: '{frac:1 3/4}' → [7, 4]. */
export function fractionsIn(text: string): [number, number][] {
  return [...text.matchAll(/\{frac:(?:(\d+) )?(\d+)\/(\d+)\}/g)].map((m) => [(m[1] ? Number(m[1]) * Number(m[3]) : 0) + Number(m[2]), Number(m[3])]);
}

/** A German Dezimalzahl, thin spaces allowed: '1,25' → 1.25. */
export const decimal = (text: string) => Number(text.replace(/[  ]/g, '').replace(',', '.'));

/** Exact equality of two decimals in thousandths. */
export const milli = (x: number) => Math.round(x * 1000);
