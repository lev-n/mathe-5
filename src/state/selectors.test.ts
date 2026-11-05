import { describe, expect, it } from 'vitest';
import { TOPICS } from '../topics/registry';
import { TOPIC_IDS } from './mastery';
import {
  dueReviews,
  isExtraSkill,
  masteryOf,
  practisedStufe,
  practisedTopics,
  skillKey,
  starsOf,
  suggestedStufe,
  topicOrder,
  topicStars,
  weekProgress,
} from './selectors';
import { emptyState } from './store';
import { entry, skillDef, withSkills } from './testkit';
import type { ProfileId } from '../core/types';
import type { ProgressState } from './types';

describe('basic selectors', () => {
  it('skillKey / masteryOf / starsOf', () => {
    const s = withSkills({ 'zahlen.lesen#1': entry('sicher'), 'zahlen.lesen#2': entry('geuebt'), 'zahlen.lesen#3': entry('gemeistert') });
    expect(skillKey('zahlen.lesen', 2)).toBe('zahlen.lesen#2');
    expect(masteryOf(s, 'zahlen.lesen', 1)).toBe('sicher');
    expect(masteryOf(s, 'zahlen.runden', 1)).toBe('neu');
    expect([1, 2, 3].map((n) => starsOf(s, 'zahlen.lesen', n as 1 | 2 | 3))).toEqual([2, 1, 3]);
  });

  it('suggestedStufe: defaultStufe for a new skill, else the first Stufe from the lowest practised one that is not sicher (3 if all are)', () => {
    expect(suggestedStufe(emptyState(), 'zahlen.potenzen')).toBe(1);
    // Grundschule-near skills start at Stufe 2, never based on the profile (§7.1)
    expect(suggestedStufe(emptyState(), 'zahlen.lesen')).toBe(2);
    for (const profile of ['ganzzahl', 'anschaulich', 'bruch', 'offen'] as const) {
      expect(suggestedStufe({ ...emptyState(), settings: { ...emptyState().settings, profile } }, 'zahlen.lesen')).toBe(2);
      expect(suggestedStufe({ ...emptyState(), settings: { ...emptyState().settings, profile } }, 'ganzzahlen.alltag')).toBe(1);
    }
    expect(suggestedStufe(withSkills({ 'zahlen.lesen#1': entry('geuebt') }), 'zahlen.lesen')).toBe(1);
    expect(suggestedStufe(withSkills({ 'zahlen.lesen#1': entry('gemeistert') }), 'zahlen.lesen')).toBe(2);
    expect(suggestedStufe(withSkills({ 'zahlen.lesen#1': entry('sicher'), 'zahlen.lesen#2': entry('geuebt') }), 'zahlen.lesen')).toBe(2);
    expect(suggestedStufe(withSkills({ 'zahlen.lesen#2': entry('geuebt') }), 'zahlen.lesen')).toBe(2);
    // started at Stufe 2 and it is sicher: move up, never back to Stufe 1
    expect(suggestedStufe(withSkills({ 'zahlen.lesen#2': entry('sicher') }), 'zahlen.lesen')).toBe(3);
    const all = withSkills({ 'zahlen.lesen#1': entry('sicher'), 'zahlen.lesen#2': entry('sicher'), 'zahlen.lesen#3': entry('gemeistert') });
    expect(suggestedStufe(all, 'zahlen.lesen')).toBe(3);
  });

  it('practisedStufe = highest Stufe with answers', () => {
    expect(practisedStufe(emptyState(), 'zahlen.lesen')).toBeUndefined();
    expect(practisedStufe(withSkills({ 'zahlen.lesen#1': entry('sicher'), 'zahlen.lesen#2': entry('geuebt') }), 'zahlen.lesen')).toBe(2);
    expect(practisedStufe(withSkills({ 'zahlen.lesen#3': entry('neu') }), 'zahlen.lesen')).toBeUndefined();
  });
});

describe('dueReviews', () => {
  const s = withSkills({
    'zahlen.lesen#1': entry('sicher', { box: 2, due: '2026-10-19' }),
    'zahlen.runden#2': entry('sicher', { box: 1, due: '2026-10-10' }),
    'flaeche.rechteck#1': entry('gemeistert', { box: 4, due: '2026-10-15' }),
    'daten.median#3': entry('sicher', { box: 3, due: '2026-10-20' }),
    'zahlen.zahlenstrahl2#1': entry('geuebt', { box: 0 }),
  });

  it('returns box ≥ 1 items due on or before the day, most overdue first', () => {
    expect(dueReviews(s, '2026-10-19')).toEqual([
      { skillId: 'zahlen.runden', stufe: 2, due: '2026-10-10' },
      { skillId: 'flaeche.rechteck', stufe: 1, due: '2026-10-15' },
      { skillId: 'zahlen.lesen', stufe: 1, due: '2026-10-19' },
    ]);
    expect(dueReviews(s, '2026-10-09')).toEqual([]);
    expect(dueReviews(s, '2026-10-19', 1)).toHaveLength(1);
  });

  it('caps the list at 8 by default with a stable order for equal days', () => {
    const many: Record<string, ReturnType<typeof entry>> = {};
    for (let i = 0; i < 12; i++) many[`zahlen.s${String(i).padStart(2, '0')}#1`] = entry('sicher', { box: 1, due: i < 6 ? '2026-10-18' : '2026-10-17' });
    const due = dueReviews(withSkills(many), '2026-10-19');
    expect(due).toHaveLength(8);
    expect(due.map((d) => d.skillId)).toEqual(['zahlen.s06', 'zahlen.s07', 'zahlen.s08', 'zahlen.s09', 'zahlen.s10', 'zahlen.s11', 'zahlen.s00', 'zahlen.s01']);
  });
});

describe('weekProgress (Mon–Sun)', () => {
  const s = { ...emptyState(), days: ['2026-10-11', '2026-10-12', '2026-10-14', '2026-10-18', '2026-10-19'] };

  it('counts distinct practice days of the current week only', () => {
    // week of 12.–18.10.2026
    expect(weekProgress(s, '2026-10-18')).toEqual({ days: 3, goal: 3, reached: true });
    expect(weekProgress(s, '2026-10-12')).toEqual({ days: 3, goal: 3, reached: true });
    // Monday 19.10. starts a new week quietly
    expect(weekProgress(s, '2026-10-19')).toEqual({ days: 1, goal: 3, reached: false });
    expect(weekProgress(s, '2026-10-25')).toEqual({ days: 1, goal: 3, reached: false });
  });

  it('uses the weekly goal (1–5) from the settings', () => {
    const g5 = { ...s, settings: { ...s.settings, weeklyGoal: 5 } };
    expect(weekProgress(g5, '2026-10-18')).toEqual({ days: 3, goal: 5, reached: false });
    const g1 = { ...s, settings: { ...s.settings, weeklyGoal: 1 } };
    expect(weekProgress(g1, '2026-10-19').reached).toBe(true);
  });

  it('works for weeks across the year boundary', () => {
    const y = { ...emptyState(), days: ['2026-12-27', '2026-12-28', '2026-12-31', '2027-01-03', '2027-01-04'] };
    expect(weekProgress(y, '2027-01-01').days).toBe(3);
  });
});

describe('topicStars / practisedTopics', () => {
  // core: zahlen.lesen, zahlen.runden. zahlen.potenzen: Schwerpunkt only in the profile 'ganzzahl'.
  const skills = [skillDef('zahlen.lesen'), skillDef('zahlen.runden'), skillDef('zahlen.potenzen')];
  const s = withSkills({
    'zahlen.lesen#1': entry('gemeistert'),
    'zahlen.lesen#2': entry('sicher'),
    'zahlen.lesen#3': entry('geuebt'),
    'zahlen.runden#1': entry('geuebt'),
    'zahlen.potenzen#1': entry('sicher'),
    'flaeche.rechteck#1': entry('neu'),
  });
  const inProfile = (profile: ProfileId): ProgressState => ({ ...s, settings: { ...s.settings, profile } });

  it('counts Schwerpunkt skills only: an Extra never makes a topic look unfinished (§2.5, rule 2)', () => {
    expect(topicStars(s, skills)).toEqual({ stars: 3 + 2 + 1 + 1, max: 18, sicher: 2, total: 6 });
    expect(topicStars(inProfile('ganzzahl'), skills)).toEqual({ stars: 3 + 2 + 1 + 1 + 2, max: 27, sicher: 3, total: 9 });
    expect(topicStars(emptyState(), [])).toEqual({ stars: 0, max: 0, sicher: 0, total: 0 });
  });

  it('only Stufe 1 of ganzzahlen.plusminus counts in the profile anschaulich', () => {
    const plus = [skillDef('ganzzahlen.plusminus')];
    expect(topicStars({ ...emptyState(), settings: { ...emptyState().settings, profile: 'anschaulich' } }, plus).total).toBe(1);
    expect(topicStars(emptyState(), plus).total).toBe(0);
  });

  it('order and Extra follow the profile; nothing is removed', () => {
    expect(topicOrder(inProfile('bruch'))[0]).toBe('daten');
    expect([...topicOrder(inProfile('bruch'))].sort()).toEqual([...TOPIC_IDS].sort());
    expect(isExtraSkill(s, 'zahlen.potenzen')).toBe(true);
    expect(isExtraSkill(inProfile('ganzzahl'), 'zahlen.potenzen')).toBe(false);
    expect(isExtraSkill(s, 'zahlen.lesen')).toBe(false);
  });

  it('lists topics with at least one practised skill, in topic order', () => {
    const t = withSkills({ 'daten.median#1': entry('geuebt'), 'rechnen.rechengesetze#1': entry('sicher') }, s);
    expect(practisedTopics(t)).toEqual(['zahlen', 'rechnen', 'daten']);
    expect(practisedTopics(emptyState())).toEqual([]);
  });

  it('TOPIC_IDS follow the registry order', () => {
    expect(TOPIC_IDS).toEqual(TOPICS.map((t) => t.id));
  });
});
