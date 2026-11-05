// The round flow with the real skills: the state code and the generators have to agree on slots and levels.
import { beforeAll, describe, expect, it } from 'vitest';
import { abSequence, roundSize } from '../core/age';
import { DEFAULT_CONTEXT } from '../core/generate';
import { createRng } from '../core/rng';
import type { ProfileId, SkillDef, Stufe } from '../core/types';
import { STUFEN } from '../core/types';
import { TOPICS, loadTopic } from '../topics/registry';
import { CORE_SKILLS, PROFILE_IDS, RANGE_DEFAULTS, SCHWERPUNKT } from '../data/profiles';
import { buildRound } from './round';
import { suggestedStufe } from './selectors';
import { emptyState } from './store';

const DAY = '2026-10-19';
let skills: SkillDef[] = [];
const skillOf = (id: string) => skills.find((s) => s.id === id)!;

beforeAll(async () => {
  skills = (await Promise.all(TOPICS.map((t) => loadTopic(t.id)))).flatMap((m) => m.skills);
});

describe('skill rounds', () => {
  it('every skill: 10 items, 6 in rechnen.schriftlich-*, with the AB mix of the Stufe, easier items first, each item at its planned level', () => {
    expect(skills).toHaveLength(68);
    for (const skill of skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        const slots = buildRound({ mode: 'skill', skillId: skill.id, stufe }, emptyState(), DAY, createRng(1), skills);
        expect(slots).toHaveLength(skill.id.startsWith('rechnen.schriftlich-') ? 6 : 10);
        expect(slots.map((s) => s.ab), `${skill.id} Stufe ${stufe}`).toEqual(abSequence(stufe, roundSize(skill.id)));
        expect(slots.map((s) => s.ab), skill.id).toEqual([...slots.map((s) => s.ab)].sort());
        slots.forEach((slot, i) => {
          const ex = skill.generate(createRng(i * 37 + 5), stufe, { ...DEFAULT_CONTEXT, ab: slot.ab });
          expect(ex.ab, `${ex.key} planned AB ${slot.ab}`).toBe(slot.ab);
          expect(ex.skillId).toBe(skill.id);
          expect(ex.stufe).toBe(stufe);
        });
      }
    }
  });
});

describe('the profile changes order and range defaults only', () => {
  const withProfile = (profile: ProfileId) => {
    const s = emptyState();
    return { ...s, settings: { ...s.settings, profile, profileAsked: true } };
  };

  it('every id of the Schwerpunkt table is a real skill, and every skill stays reachable', () => {
    const ids = new Set(skills.map((s) => s.id));
    for (const p of PROFILE_IDS) for (const id of SCHWERPUNKT[p]) expect(ids.has(id), `${p}: ${id}`).toBe(true);
    for (const id of CORE_SKILLS) expect(ids.has(id), id).toBe(true);
  });

  it('a round of a skill has the same plan under every profile, and the suggested Stufe is the same', () => {
    for (const skill of skills) {
      const plans = PROFILE_IDS.map((p) => buildRound({ mode: 'skill', skillId: skill.id, stufe: 2 }, withProfile(p), DAY, createRng(1), skills));
      for (const plan of plans) expect(plan).toEqual(plans[0]);
      const suggested = PROFILE_IDS.map((p) => suggestedStufe(withProfile(p), skill.id));
      for (const stufe of suggested) expect(stufe).toBe(suggested[0]);
    }
  });

  it('every skill generates under every range default, at the same Stufe and AB', () => {
    for (const skill of skills) {
      for (const p of PROFILE_IDS) {
        const ex = skill.generate(createRng(3), 3, { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS[p], ab: 2 });
        expect([ex.skillId, ex.stufe, ex.ab]).toEqual([skill.id, 3, 2]);
      }
    }
  });
});

describe('the keys of the Ziffernblock', () => {
  it('follow the skill, never the item: every field of a skill agrees with its keys', () => {
    for (const skill of skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        for (const ab of [1, 2, 3] as const) {
          for (let seed = 1; seed <= 6; seed++) {
            const a = skill.generate(createRng(seed * 41 + ab), stufe, { ...DEFAULT_CONTEXT, ab }).answer;
            const fields = a.kind === 'number' ? [a] : a.kind === 'multi' ? a.fields : [];
            for (const f of fields) {
              expect(f.signed === true, `${skill.id}: signed`).toBe(skill.keys?.minus === true);
              expect(f.decimals !== undefined, `${skill.id}: decimals`).toBe(skill.keys?.comma === true);
            }
          }
        }
      }
    }
  });
});

describe('mixed rounds', () => {
  it('Extras only once practised; every slot is a skill of the topic whose generator accepts it', () => {
    for (const topic of TOPICS) {
      const skill = skills.find((x) => x.topicId === topic.id)!;
      const state = { ...emptyState(), skills: { [`${skill.id}#1`]: { attempts: 1, recent: [true], practiceDays: 1, state: 'geuebt' as const, box: 0, checks: [] } } };
      const slots = buildRound({ mode: 'mixed', topicId: topic.id }, state, DAY, createRng(5), skills);
      expect(slots.length, topic.id).toBeGreaterThan(0);
      for (const slot of slots) {
        const def = skillOf(slot.skillId);
        expect(def.topicId).toBe(topic.id);
        expect(def.generate(createRng(9), slot.stufe, DEFAULT_CONTEXT).skillId).toBe(slot.skillId);
      }
    }
  });
});
