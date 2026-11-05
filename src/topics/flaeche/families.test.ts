// The shared sweep in errorFamilies.test.ts covers all topics at once; this one needs only this topic, with the same seeds.
import { describe, expect, it } from 'vitest';
import { WIDEST_RANGES } from '../../core/generate';
import { createRng } from '../../core/rng';
import type { GenContext, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { bugKey, tagFor } from '../errorFamilies';
import families from './families';
import topic from './index';
import phrases from './phrases';

const CONTEXTS: GenContext[] = (['abziehen', 'ergaenzen'] as const).map((subtractionMethod) => ({ subtractionMethod, ranges: WIDEST_RANGES }));

describe('flaeche: families', () => {
  it('every Bug id has a family of its skill, and every table entry is emitted', () => {
    const emitted = new Set<string>();
    const unmapped = new Set<string>();
    for (const skill of topic.skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        for (let seed = 1; seed <= 400; seed++) {
          const ex = skill.generate(createRng(seed * 104_729 + stufe * 31), stufe, CONTEXTS[seed % 2]);
          for (const b of ex.bugs ?? []) {
            emitted.add(`${skill.id}|${bugKey(b.id)}`);
            const tag = tagFor(skill.id, b.id)!;
            if (!families[tag]?.[skill.id]) unmapped.add(`${skill.id} ${b.id}`);
          }
        }
      }
    }
    expect([...unmapped]).toEqual([]);
    const entries = Object.values(families).flatMap((skills) => Object.entries(skills).flatMap(([skillId, keys]) => keys.split(/\s+/).map((key) => `${skillId}|${key}`)));
    expect(entries.filter((k) => !emitted.has(k))).toEqual([]);
  });

  it('every family has a phrase, ids carry the prefix, and no id is also a bug key', () => {
    expect(Object.keys(phrases).sort()).toEqual(Object.keys(families).sort());
    const keys = new Set(Object.values(families).flatMap((skills) => Object.values(skills).flatMap((k) => k.split(/\s+/))));
    for (const id of Object.keys(families)) {
      expect(id).toMatch(/^flaeche-/);
      expect(keys.has(id), id).toBe(false);
    }
  });
});
