import { describe, expect, it } from 'vitest';
import { AB_MIX, AB_MIX_WRITTEN, WRITTEN_ROUND_SIZE, defaultStufe, mixedRoundSkills } from '../core/age';
import { createRng } from '../core/rng';
import type { Stufe } from '../core/types';
import { addDays } from './dates';
import { applyAnswer } from './mastery';
import { MAX_TWINS, REVIEW_MAX, ROUND_SIZE, buildRound, mixedStufe } from './round';
import { REVIEWS_PER_DAY, dueReviews, reviewBudget } from './selectors';
import { emptyState } from './store';
import { entry, skillDef, withSkills } from './testkit';
import type { ProgressState, RoundSlot, StufeProgress } from './types';

const DAY = '2026-10-19';
// Five core skills of one topic, as the tests of the round's shape need them (ids of other topics are not looked at here).
const ZAHLEN = ['zahlen.lesen', 'zahlen.stellenwerte', 'zahlen.zahlenstrahl', 'zahlen.runden', 'zahlen.platz5'].map((id) => skillDef(id));
const SKILLS = [...ZAHLEN, skillDef('zahlen.potenzen'), skillDef('flaeche.rechteck')];

function noAdjacentRepeats(slots: RoundSlot[]): boolean {
  return slots.every((s, i) => i === 0 || s.skillId !== slots[i - 1].skillId);
}

function counts(slots: RoundSlot[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of slots) m.set(s.skillId, (m.get(s.skillId) ?? 0) + 1);
  return m;
}

/** An arrangement without neighbours of the same skill exists iff the largest group ≤ others + 1. */
function separable(slots: RoundSlot[]): boolean {
  const max = Math.max(...counts(slots).values());
  return max <= slots.length - max + 1;
}

describe("plan 'skill'", () => {
  it('gives 10 practice slots of the chosen skill and Stufe', () => {
    const slots = buildRound({ mode: 'skill', skillId: 'zahlen.lesen', stufe: 2 }, emptyState(), DAY, createRng(1), SKILLS);
    expect(ROUND_SIZE).toBe(10);
    expect(slots).toHaveLength(ROUND_SIZE);
    expect(slots.every((s) => s.skillId === 'zahlen.lesen' && s.stufe === 2 && s.purpose === 'practice')).toBe(true);
    expect(MAX_TWINS).toBe(2);
  });

  it.each([
    [1, [1, 1, 1, 1, 1, 1, 2, 2, 2, 3]],
    [2, [1, 1, 1, 2, 2, 2, 2, 2, 3, 3]],
    [3, [1, 1, 2, 2, 2, 2, 3, 3, 3, 3]],
  ] as const)('Stufe %i has the AB mix of the research, easier items first', (stufe, abs) => {
    const slots = buildRound({ mode: 'skill', skillId: 'zahlen.lesen', stufe }, emptyState(), DAY, createRng(1), SKILLS);
    expect(slots.map((s) => s.ab)).toEqual(abs);
    expect(AB_MIX[stufe].reduce((a, b) => a + b, 0)).toBe(ROUND_SIZE);
  });

  it.each([
    [1, [1, 1, 1, 1, 2, 3]],
    [2, [1, 1, 2, 2, 2, 3]],
    [3, [1, 2, 2, 2, 3, 3]],
  ] as const)('rechnen.schriftlich-*, Stufe %i: 6 slots with the written mix', (stufe, abs) => {
    const slots = buildRound({ mode: 'skill', skillId: 'rechnen.schriftlich-plusminus', stufe }, emptyState(), DAY, createRng(1), SKILLS);
    expect(slots.map((s) => s.ab)).toEqual(abs);
    expect(AB_MIX_WRITTEN[stufe].reduce((a, b) => a + b, 0)).toBe(WRITTEN_ROUND_SIZE);
  });
});

describe('mixedRoundSkills: the round size works per skill', () => {
  const W = 'rechnen.schriftlich-mal';
  it('all written gives 6 items, none written 10, a mix something between', () => {
    expect(mixedRoundSkills([W])).toHaveLength(6);
    expect(mixedRoundSkills(['rechnen.klammern'])).toHaveLength(10);
    const mix = mixedRoundSkills([W, 'rechnen.klammern']);
    expect(mix.length).toBeGreaterThan(6);
    expect(mix.length).toBeLessThan(10);
  });
});

describe("plan 'mixed'", () => {
  const mixed = (state: ProgressState, seed: number, skills = SKILLS) => buildRound({ mode: 'mixed', topicId: 'zahlen' }, state, DAY, createRng(seed), skills);

  it('new topic: 10 slots spread evenly over the Schwerpunkt skills, never the same skill twice in a row', () => {
    for (let seed = 0; seed < 200; seed++) {
      const slots = mixed(emptyState(), seed);
      expect(slots).toHaveLength(10);
      expect(slots.every((s) => s.purpose === 'mixed' && s.stufe === defaultStufe(s.skillId))).toBe(true); // new skills: the default Stufe
      expect(noAdjacentRepeats(slots)).toBe(true);
      const c = counts(slots);
      // zahlen.platz5 stands for an Extra here: only the four core skills, spread evenly
      expect([...c.keys()].sort()).toEqual(ZAHLEN.map((s) => s.id).filter((id) => id !== 'zahlen.platz5').sort());
      expect(Math.max(...c.values()) - Math.min(...c.values())).toBeLessThanOrEqual(1);
    }
  });

  it('prefers practised skills, each at its practised/suggested Stufe', () => {
    const state = withSkills({
      'zahlen.lesen#1': entry('sicher'),
      'zahlen.lesen#2': entry('geuebt'),
      'zahlen.runden#1': entry('geuebt'),
      'zahlen.zahlenstrahl#1': entry('gemeistert'),
      'flaeche.rechteck#1': entry('sicher'),
    });
    for (let seed = 0; seed < 100; seed++) {
      const slots = mixed(state, seed);
      expect(slots).toHaveLength(10);
      expect(noAdjacentRepeats(slots)).toBe(true);
      const c = counts(slots);
      expect([...c.keys()].sort()).toEqual(['zahlen.lesen', 'zahlen.runden', 'zahlen.zahlenstrahl']);
      expect(Math.max(...c.values()) - Math.min(...c.values())).toBeLessThanOrEqual(1);
      for (const s of slots) {
        // zahlen.zahlenstrahl#1 is mastered and the new Stufe 2 is not opened yet: practised Stufe
        const expected: Record<string, Stufe> = { 'zahlen.lesen': 2, 'zahlen.runden': 1, 'zahlen.zahlenstrahl': 1 };
        expect(s.stufe).toBe(expected[s.skillId]);
      }
    }
  });

  it('mixedStufe: suggested Stufe once worked on, otherwise the practised one', () => {
    const s = withSkills({
      'zahlen.lesen#1': entry('sicher'),
      'zahlen.runden#2': entry('geuebt'),
      'zahlen.zahlenstrahl#1': entry('sicher'),
      'zahlen.zahlenstrahl#2': entry('sicher'),
      'zahlen.zahlenstrahl#3': entry('sicher'),
    });
    expect(mixedStufe(s, 'zahlen.lesen')).toBe(1); // Stufe 2 not opened yet
    expect(mixedStufe(s, 'zahlen.runden')).toBe(2); // works on Stufe 2
    expect(mixedStufe(s, 'zahlen.zahlenstrahl')).toBe(3);
    expect(mixedStufe(s, 'zahlen.zahlenstrahl2')).toBe(1); // new: the default suggestion
  });

  it('with fewer than 2 practised skills the whole topic is used, practised skills first for extra slots', () => {
    const three = ZAHLEN.slice(0, 3);
    const state = withSkills({ 'zahlen.stellenwerte#1': entry('geuebt') });
    for (let seed = 0; seed < 50; seed++) {
      const slots = mixed(state, seed, three);
      expect(noAdjacentRepeats(slots)).toBe(true);
      expect(counts(slots).get('zahlen.stellenwerte')).toBe(4);
    }
  });

  it('includes an Extra only once the child has practised it, whatever the profile', () => {
    expect(mixed(emptyState(), 3).some((s) => s.skillId === 'zahlen.potenzen')).toBe(false);
    const practised = withSkills({ 'zahlen.potenzen#1': entry('geuebt'), 'zahlen.lesen#1': entry('geuebt') });
    expect(counts(mixed(practised, 3)).get('zahlen.potenzen')).toBeGreaterThan(0);
    const ganzzahl = { ...emptyState(), settings: { ...emptyState().settings, profile: 'ganzzahl' as const } };
    expect(mixed(ganzzahl, 3).some((s) => s.skillId === 'zahlen.potenzen')).toBe(true);
  });

  it('is deterministic per rng seed and varies between seeds', () => {
    expect(mixed(emptyState(), 42)).toEqual(mixed(emptyState(), 42));
    const orders = new Set(Array.from({ length: 20 }, (_, seed) => mixed(emptyState(), seed).map((s) => s.skillId).join()));
    expect(orders.size).toBeGreaterThan(10);
  });

  it('handles tiny and huge topics', () => {
    expect(mixed(emptyState(), 1, [])).toEqual([]);
    const one = mixed(emptyState(), 1, [skillDef('zahlen.lesen')]);
    expect(one).toHaveLength(10);
    expect(one.every((s) => s.skillId === 'zahlen.lesen')).toBe(true);
    const twelve = Array.from({ length: 12 }, (_, i) => skillDef(`zahlen.s${i}`));
    const practisedAll: Record<string, StufeProgress> = {};
    twelve.forEach((s) => (practisedAll[`${s.id}#1`] = entry('geuebt')));
    const slots = mixed(withSkills(practisedAll), 9, twelve);
    expect(slots).toHaveLength(10);
    expect(new Set(slots.map((s) => s.skillId)).size).toBe(10);
  });
});

describe("plan 'review'", () => {
  const review = (state: ProgressState, seed = 1, skills = SKILLS) => buildRound({ mode: 'review' }, state, DAY, createRng(seed), skills);
  const due = (d: string, extra: Partial<StufeProgress> = {}) => entry('sicher', { box: 2, due: d, ...extra });

  it('is empty when nothing is due', () => {
    const s = withSkills({ 'zahlen.lesen#1': due('2026-10-20'), 'zahlen.runden#1': entry('geuebt') });
    expect(review(s)).toEqual([]);
    expect(review(emptyState())).toEqual([]);
  });

  it('one due skill-Stufe gets 3 slots, the smallest warm-up', () => {
    const slots = review(withSkills({ 'zahlen.lesen#2': due('2026-10-18') }));
    expect(slots).toHaveLength(3);
    expect(slots.every((s) => s.skillId === 'zahlen.lesen' && s.stufe === 2 && s.purpose === 'review')).toBe(true);
  });

  it('many due items: at most 5 slots', () => {
    const many: Record<string, StufeProgress> = {};
    for (let i = 0; i < 12; i++) many[`zahlen.s${i}#1`] = due(`2026-10-${String(i + 1).padStart(2, '0')}`);
    expect(review(withSkills(many), 1, Object.keys(many).map((k) => skillDef(k.split('#')[0])))).toHaveLength(REVIEW_MAX);
    expect(REVIEW_MAX).toBe(5);
  });

  it('the cap of 8 is per day: a second warm-up gets the rest, then nothing more today, the rest comes tomorrow', () => {
    const many: Record<string, StufeProgress> = {};
    for (let i = 0; i < 12; i++) many[`zahlen.s${i}#1`] = due(`2026-10-${String(i + 1).padStart(2, '0')}`);
    const defs = Object.keys(many).map((k) => skillDef(k.split('#')[0]));
    let s = withSkills(many);
    const answerAll = (slots: RoundSlot[]) => {
      for (const slot of slots) s = applyAnswer(s, { skillId: slot.skillId, topicId: 'zahlen', stufe: slot.stufe, firstTry: true, solved: true, usedHint: false, purpose: 'review', day: DAY }).state;
    };
    const first = review(s, 1, defs);
    expect(first).toHaveLength(5);
    answerAll(first);
    expect(reviewBudget(s, DAY)).toBe(3);
    const second = review(s, 1, defs);
    expect(second).toHaveLength(3);
    answerAll(second);
    expect(s.reviewed).toEqual({ day: DAY, count: REVIEWS_PER_DAY });
    expect(reviewBudget(s, DAY)).toBe(0);
    // 4 skill-Stufen are still due, but today's 8 are done
    expect(dueReviews(s, DAY, 100)).toHaveLength(4);
    expect(review(s, 2, defs)).toEqual([]);
    // tomorrow the rest comes back
    const tomorrow = buildRound({ mode: 'review' }, s, addDays(DAY, 1), createRng(3), defs);
    expect(tomorrow).toHaveLength(5);
    expect(new Set(tomorrow.map((x) => x.skillId))).toEqual(new Set(['zahlen.s8', 'zahlen.s9', 'zahlen.s10', 'zahlen.s11']));
  });

  it('a budget of 1 still gives one slot, and a count from an earlier day does not limit today', () => {
    const s = withSkills({ 'zahlen.runden#1': due('2026-10-10'), 'zahlen.lesen#1': due('2026-10-12') });
    expect(reviewBudget({ ...s, reviewed: { day: '2026-10-18', count: 8 } }, DAY)).toBe(REVIEWS_PER_DAY);
    expect(review({ ...s, reviewed: { day: DAY, count: 7 } })).toHaveLength(1);
  });

  it('two Stufen of one skill are treated as one skill for interleaving', () => {
    const s = withSkills({ 'zahlen.lesen#1': due('2026-10-10'), 'zahlen.lesen#2': due('2026-10-11'), 'zahlen.runden#1': due('2026-10-12'), 'zahlen.zahlenstrahl#1': due('2026-10-13') });
    const slots = review(s);
    expect(slots).toHaveLength(5);
    expect(counts(slots).get('zahlen.lesen')).toBe(3);
    expect(noAdjacentRepeats(slots)).toBe(true);
  });

  it('drops skills that no longer exist in a loaded topic; keeps skills of topics not loaded', () => {
    const s = withSkills({
      'zahlen.alt#1': due('2026-10-10'),
      'zahlen.potenzen#1': due('2026-10-10'),
      'daten.median#1': due('2026-10-11'),
    });
    expect(new Set(review(s).map((x) => x.skillId))).toEqual(new Set(['zahlen.potenzen', 'daten.median']));
  });

  it('random states: 3 to 5 slots, only due items, every slot purpose review, no neighbours when separable, deterministic', () => {
    const rng = createRng(2024);
    const ids = ['zahlen.a', 'zahlen.b', 'geometrie.c', 'daten.d', 'groessen.e', 'rechnen.f'];
    for (let trial = 0; trial < 300; trial++) {
      const skills: Record<string, StufeProgress> = {};
      for (const id of ids) {
        for (const st of [1, 2, 3] as Stufe[]) {
          if (rng.chance(0.3)) skills[`${id}#${st}`] = due(`2026-10-${String(rng.int(10, 25)).padStart(2, '0')}`, { box: rng.int(1, 5) });
        }
      }
      const s = withSkills(skills);
      // alternately with all topics loaded and with no topic loaded (nothing can be verified → keep)
      const defs = trial % 2 ? ids.map((id) => skillDef(id)) : [];
      const slots = review(s, trial, defs);
      expect(slots.length).toBeLessThanOrEqual(REVIEW_MAX);
      const dueIds = new Set(dueReviews(s, DAY, 100).map((d) => `${d.skillId}#${d.stufe}`));
      for (const x of slots) {
        expect(x.purpose).toBe('review');
        expect(dueIds.has(`${x.skillId}#${x.stufe}`)).toBe(true);
      }
      if (dueIds.size > 0) expect(slots.length).toBeGreaterThanOrEqual(3);
      if (slots.length > 0 && separable(slots)) expect(noAdjacentRepeats(slots), JSON.stringify(slots)).toBe(true);
      expect(review(s, trial, defs)).toEqual(slots);
    }
  });
});

