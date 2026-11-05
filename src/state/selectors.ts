/**
 * Read-only views on ProgressState for the UI. All functions are pure.
 */
import { defaultStufe } from '../core/age';
import type { SkillDef, Stufe, TopicId } from '../core/types';
import { TOPIC_ORDER, isSchwerpunkt, schwerpunktStufen } from '../data/profiles';
import { addDays, weekStart } from './dates';
import { TOPIC_IDS, isAtLeastSicher, parseSkillKey } from './mastery';
import type { Day, MasteryState, ProgressState, ReviewItem, StufeProgress } from './types';

export const skillKey = (skillId: string, stufe: Stufe) => `${skillId}#${stufe}`;

export function stufeProgress(state: ProgressState, skillId: string, stufe: Stufe): StufeProgress | undefined {
  return state.skills[skillKey(skillId, stufe)];
}

export function masteryOf(state: ProgressState, skillId: string, stufe: Stufe): MasteryState {
  return stufeProgress(state, skillId, stufe)?.state ?? 'neu';
}

/** Stars per mastery state: 0 = neu, 1 = geübt, 2 = sicher, 3 = gemeistert. */
export const MASTERY_STARS: Readonly<Record<MasteryState, 0 | 1 | 2 | 3>> = { neu: 0, geuebt: 1, sicher: 2, gemeistert: 3 };

/** 0 = neu, 1 = geübt, 2 = sicher, 3 = gemeistert */
export function starsOf(state: ProgressState, skillId: string, stufe: Stufe): 0 | 1 | 2 | 3 {
  return MASTERY_STARS[masteryOf(state, skillId, stufe)];
}

/**
 * The recommended Stufe ("Empfohlen"). For an untouched skill it is defaultStufe(), never based on the profile (docs/research.md §7.1). Otherwise,
 * from the lowest Stufe the child has worked on, the first Stufe that is not yet 'sicher'/'gemeistert' (3 if all are).
 */
export function suggestedStufe(state: ProgressState, skillId: string): Stufe {
  const start = ([1, 2, 3] as Stufe[]).find((s) => (stufeProgress(state, skillId, s)?.attempts ?? 0) > 0) ?? defaultStufe(skillId);
  for (const s of [1, 2, 3] as Stufe[]) {
    if (s < start) continue;
    if (!isAtLeastSicher(masteryOf(state, skillId, s))) return s;
  }
  return 3;
}

/** Highest Stufe with at least one answer, if any. */
export function practisedStufe(state: ProgressState, skillId: string): Stufe | undefined {
  for (const s of [3, 2, 1] as Stufe[]) {
    if ((stufeProgress(state, skillId, s)?.attempts ?? 0) > 0) return s;
  }
  return undefined;
}

/** "Heute wiederholen" is capped at 8 review answers a day (docs/research.md §7.1), not per round. */
export const REVIEWS_PER_DAY = 8;

/** Review answers still possible on `day` (REVIEWS_PER_DAY minus those already given that day). */
export function reviewBudget(state: ProgressState, day: Day): number {
  const done = state.reviewed?.day === day ? state.reviewed.count : 0;
  return Math.max(0, REVIEWS_PER_DAY - done);
}

/** Due skill-Stufen, most overdue first, capped at `limit` (default REVIEWS_PER_DAY). */
export function dueReviews(state: ProgressState, day: Day, limit = REVIEWS_PER_DAY): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const [key, p] of Object.entries(state.skills)) {
    if (p.box < 1 || !p.due || p.due > day) continue;
    const parsed = parseSkillKey(key);
    if (parsed) items.push({ skillId: parsed.skillId, stufe: parsed.stufe, due: p.due });
  }
  items.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : skillKey(a.skillId, a.stufe) < skillKey(b.skillId, b.stufe) ? -1 : 1));
  return items.slice(0, Math.max(0, limit));
}

function clampGoal(goal: number): number {
  return Number.isInteger(goal) ? Math.min(5, Math.max(1, goal)) : 3;
}

/** Übungstage in the current week (Mon–Sun) vs weekly goal. */
export function weekProgress(state: ProgressState, day: Day): { days: number; goal: number; reached: boolean } {
  const from = weekStart(day);
  const to = addDays(from, 6);
  const days = new Set(state.days.filter((d) => d >= from && d <= to)).size;
  const goal = clampGoal(state.settings.weeklyGoal);
  return { days, goal, reached: days >= goal };
}

/** The topics in the order of the profile ("zuerst die passenden Themen", docs/research.md §2.5). */
export function topicOrder(state: Pick<ProgressState, 'settings'>): readonly TopicId[] {
  return TOPIC_ORDER[state.settings.profile];
}

/** A skill's place in this profile: Schwerpunkt, or an Extra (never hidden for good: "Mehr Themen" opens it). */
export function isExtraSkill(state: Pick<ProgressState, 'settings'>, skillId: string): boolean {
  return !isSchwerpunkt(state.settings.profile, skillId);
}

/**
 * Stars per topic for overview cards. Topic progress counts Schwerpunkt skills only, so an Extra never makes a topic look unfinished
 * (docs/research.md §2.5, rule 2); max is 0 when the topic has no Schwerpunkt skill in this profile.
 */
export function topicStars(state: ProgressState, skills: readonly SkillDef[]): { stars: number; max: number; sicher: number; total: number } {
  let stars = 0;
  let sicher = 0;
  let total = 0;
  for (const skill of skills) {
    for (const s of schwerpunktStufen(state.settings.profile, skill.id)) {
      total += 1;
      stars += starsOf(state, skill.id, s);
      if (isAtLeastSicher(masteryOf(state, skill.id, s))) sicher += 1;
    }
  }
  return { stars, max: total * 3, sicher, total };
}

/** Topics with at least one practised skill (in the order of TOPICS). */
export function practisedTopics(state: ProgressState): TopicId[] {
  const found = new Set<TopicId>();
  for (const [key, p] of Object.entries(state.skills)) {
    if (p.attempts <= 0) continue;
    const parsed = parseSkillKey(key);
    if (parsed) found.add(parsed.topicId);
  }
  return TOPIC_IDS.filter((t) => found.has(t));
}
