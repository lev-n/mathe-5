// The visuals and answers of docs/research.md §6 that a skill must really use, in its task, its options or its worked steps, on each Stufe that the catalogue names.
import { describe, expect, it } from 'vitest';
import { toneProblems } from '../core/textRules';
import type { Exercise, SkillDef, Stufe, Visual } from '../core/types';
import { loadAllTopics } from './registry';
import { samples } from './test-utils';

const visualsOf = (ex: Exercise): Visual[] => [
  ...(ex.visual ? [ex.visual] : []),
  ...(ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => (o.visual ? [o.visual] : [])) : []),
  ...ex.steps.flatMap((s) => (typeof s === 'string' || !s.visual ? [] : [s.visual])),
];

async function skillById(id: string): Promise<SkillDef> {
  const skill = (await loadAllTopics()).flatMap((m) => m.skills).find((s) => s.id === id);
  if (!skill) throw new Error(id);
  return skill;
}

describe('catalogue visuals (§6)', () => {
  it.each([
    ['brueche.vergleichen', 'fractionModel', [1, 2]],
    ['brueche.vergleichen', 'numberLine', [3]],
    ['brueche.dezimal-ordnen', 'placeValue', [1, 2, 3]],
    ['ganzzahlen.terme', 'term', [1, 2, 3]],
    ['zahlen.teilbarkeit', 'table', [1, 2, 3]],
    ['flaeche.einheiten', 'table', [1, 2, 3]],
    ['geometrie.lage', 'lines', [1]],
  ] as const)('%s draws %s', async (id, type, stufen) => {
    const skill = await skillById(id);
    for (const stufe of stufen as readonly Stufe[]) {
      const types = new Set(samples(skill, stufe, 200).flatMap((ex) => visualsOf(ex).map((v) => v.type)));
      expect(types.has(type), `Stufe ${stufe}: ${[...types].join()}`).toBe(true);
    }
  });

  it('a mark for parallel lines appears in a worked step of geometrie.lage', async () => {
    const marked = samples(await skillById('geometrie.lage'), 1, 200).flatMap(visualsOf).some((v) => v.type === 'lines' && (v.parallelMarks?.length ?? 0) > 0);
    expect(marked).toBe(true);
  });

  it('brueche.vergleichen, Stufe 3: a numberline answer, as the catalogue lists', async () => {
    expect(samples(await skillById('brueche.vergleichen'), 3, 200).some((ex) => ex.answer.kind === 'numberline')).toBe(true);
  });

  it('F2: at AB I of Stufe 1 and 2 the Stellentafel stands beside the comparison, in the worked steps every place is filled', async () => {
    const skill = await skillById('brueche.dezimal-ordnen');
    const compare = (stufe: Stufe) => samples(skill, stufe, 200).filter((ex) => ex.ab === 1);
    for (const stufe of [1, 2] as const) {
      for (const ex of compare(stufe)) {
        expect(ex.visual?.type, ex.key).toBe('placeValue');
        const step = ex.steps[0];
        if (typeof step === 'string' || step.visual?.type !== 'placeValue') throw new Error(ex.key);
        for (const row of step.visual.rows) expect(row.values).not.toContain(null);
      }
    }
  });
});

describe('F9: geometrie.koordinaten, Stufe 2', () => {
  it('a point and its swapped pair stand side by side, and setting the swapped place gives the koordinaten-getauscht hint', async () => {
    const pairs = samples(await skillById('geometrie.koordinaten'), 2, 200).filter((ex) => ex.key.includes('setzen-paar'));
    expect(pairs.length).toBeGreaterThan(0);
    for (const ex of pairs) {
      if (ex.answer.kind !== 'point') throw new Error(ex.key);
      const [x, y] = ex.answer.target;
      expect(x).not.toBe(y);
      expect(ex.answer.points).toEqual([expect.objectContaining({ x: y, y: x })]);
      expect(ex.bugs?.find((b) => b.id === 'koordinaten-getauscht')?.match).toEqual({ x: y, y: x });
    }
  });
});

describe('texts of the task library', () => {
  it('a bug never equals the answer, not even through float noise', async () => {
    const skill = await skillById('groessen.schlussrechnung');
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(skill, stufe, 400)) {
        if (ex.answer.kind !== 'number' || ex.answer.value === null) continue;
        for (const b of ex.bugs ?? []) {
          if (typeof b.match === 'number') expect(Math.abs(b.match - ex.answer.value), ex.key).toBeGreaterThan(1e-9);
        }
      }
    }
  });

  it('no text ends in two full stops, and a negative number after mal has brackets (T10)', async () => {
    for (const mod of await loadAllTopics()) {
      for (const skill of mod.skills) {
        for (const stufe of [1, 2, 3] as const) {
          for (const ex of samples(skill, stufe, 60)) {
            const whys = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : [];
            const steps = ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
            for (const t of [ex.context ?? '', ex.prompt, ...ex.hints, ...steps, ...whys]) {
              expect(t, ex.key).not.toMatch(/\.\.(?!\.)/);
              expect(t, ex.key).not.toMatch(/\bmal −/i);
            }
          }
        }
      }
    }
    expect(toneProblems(['Fläche C stößt an E.'])).toEqual([]);
  }, 120_000);

  it('one Zehntel takes a singular verb', async () => {
    const skill = await skillById('brueche.dezimal-ordnen');
    for (const stufe of [2] as const) {
      for (const ex of samples(skill, stufe, 400)) {
        const whys = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : [];
        for (const t of whys) expect(t, ex.key).not.toMatch(/\b1 Zehntel sind\b/);
      }
    }
  });
});
