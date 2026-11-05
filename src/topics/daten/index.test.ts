/** The topic as a whole. The sweep repeats the one of errorFamilies.test.ts for this topic alone, so it holds while another topic is mid-work. */
import { describe, expect, it } from 'vitest';
import { WIDEST_RANGES } from '../../core/generate';
import { createRng } from '../../core/rng';
import type { GenContext, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { CATALOGUE } from '../../data/profiles';
import { bugKey, TOPIC_FAMILIES, tagFor } from '../errorFamilies';
import topic from './index';
import phrases from './phrases';

const SEEDS = 400;
const CONTEXTS: GenContext[] = (['abziehen', 'ergaenzen'] as const).map((subtractionMethod) => ({ subtractionMethod, ranges: WIDEST_RANGES }));

describe('topic daten', () => {
  it('has the skills of the catalogue, in teaching order', () => {
    expect(topic.skills.map((s) => s.id)).toEqual([...CATALOGUE.daten]);
  });

  it('every family id starts with daten- and has a phrase', () => {
    const ids = Object.keys(TOPIC_FAMILIES.daten);
    for (const id of ids) expect(id).toMatch(/^daten-/);
    expect(Object.keys(phrases).sort()).toEqual([...ids].sort());
  });

  it(`every Bug id has a family of its skill, and every table entry is emitted (${SEEDS} seeds)`, () => {
    const emitted = new Set<string>();
    const unmapped = new Set<string>();
    for (const skill of topic.skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        for (let seed = 1; seed <= SEEDS; seed++) {
          const ex = skill.generate(createRng(seed * 104_729 + stufe * 31), stufe, CONTEXTS[seed % 2]);
          for (const { id } of ex.bugs ?? []) {
            emitted.add(`${skill.id}|${bugKey(id)}`);
            const tag = tagFor(skill.id, id);
            if (!tag || !TOPIC_FAMILIES.daten[tag]?.[skill.id]) unmapped.add(`${skill.id} ${id}`);
          }
        }
      }
    }
    expect([...unmapped]).toEqual([]);
    const entries = Object.values(TOPIC_FAMILIES.daten).flatMap((skills) => Object.entries(skills).flatMap(([skillId, keys]) => keys.split(/\s+/).map((key) => `${skillId}|${key}`)));
    expect(entries.filter((e) => !emitted.has(e))).toEqual([]);
  });

  it('within a skill, every family has its own sentence', () => {
    const bySkill = new Map<string, string[]>();
    for (const [id, skills] of Object.entries(TOPIC_FAMILIES.daten)) {
      const { object, participle } = phrases[id].phrase;
      for (const skillId of Object.keys(skills)) bySkill.set(skillId, [...(bySkill.get(skillId) ?? []), `${object} ${participle}`]);
    }
    for (const [skillId, texts] of bySkill) expect(new Set(texts).size, skillId).toBe(texts.length);
  });
});
