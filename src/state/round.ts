/**
 * Round planning (docs/research.md L2 spacing, L3 interleaving).
 * Pure and deterministic for a given rng state.
 */
import { ROUND_SIZE, abSequence, drawAb, mixedRoundSkills, roundSize } from '../core/age';
import type { Rng, SkillDef, Stufe, TopicId } from '../core/types';
import { isExtraSkill, dueReviews, practisedStufe, reviewBudget, stufeProgress, suggestedStufe } from './selectors';
import type { Day, PracticePlan, ProgressState, RoundSlot } from './types';

export { ROUND_SIZE };
/** Max. number of Zwillingsaufgaben inserted per round after a 2nd wrong attempt. */
export const MAX_TWINS = 2;
/** The warm-up "Heute wiederholen" has 3 to 5 items; a further round today only gets the rest of REVIEWS_PER_DAY (8). */
export const REVIEW_MIN = 3;
export const REVIEW_MAX = 5;

/** One slot still to place. */
type Seed = Pick<RoundSlot, 'stufe' | 'ab'>;

interface Group {
  id: string;
  /** Slots still to place, in order. */
  queue: Seed[];
}

/**
 * After placing one slot of `picked`, can the remaining slots still be ordered without two
 * neighbours from the same group? (Exact condition: with r slots left and the next slot not
 * allowed to be `picked`, `picked` fits at most ⌊r/2⌋ more times, every other group ⌈r/2⌉.)
 */
function stillSeparable(open: readonly Group[], picked: Group): boolean {
  const left = open.reduce((n, g) => n + g.queue.length, 0) - 1;
  return open.every((g) => {
    const n = g.queue.length - (g === picked ? 1 : 0);
    return n <= (g === picked ? Math.floor(left / 2) : Math.ceil(left / 2));
  });
}

/**
 * Orders the groups' slots so that no two consecutive slots share a group id whenever that is
 * possible. At each step `choose` picks among the groups that keep this possible (in insertion
 * order: priority order for reviews, a random pick for mixed practice). If the slots cannot be
 * separated at all, the group with the most remaining slots goes first to keep runs short.
 */
function interleave(groups: Group[], choose: (candidates: Group[]) => Group): (Seed & { id: string })[] {
  const out: (Seed & { id: string })[] = [];
  let prev: string | undefined;
  for (;;) {
    const open = groups.filter((g) => g.queue.length > 0);
    if (open.length === 0) return out;
    const others = open.filter((g) => g.id !== prev);
    const safe = others.filter((g) => stillSeparable(open, g));
    let g: Group;
    if (safe.length > 0) g = choose(safe);
    else {
      const pool = others.length > 0 ? others : open;
      const most = Math.max(...pool.map((c) => c.queue.length));
      g = choose(pool.filter((c) => c.queue.length === most));
    }
    out.push({ id: g.id, ...g.queue.shift()! });
    prev = g.id;
  }
}

/**
 * Stufe used for a skill in mixed practice: the suggested Stufe once the child has worked on it,
 * otherwise the Stufe the child has practised (so mixed practice does not open a new Stufe),
 * otherwise the suggested Stufe (docs/research.md §7.1).
 */
export function mixedStufe(state: ProgressState, skillId: string): Stufe {
  const suggested = suggestedStufe(state, skillId);
  if ((stufeProgress(state, skillId, suggested)?.attempts ?? 0) > 0) return suggested;
  return practisedStufe(state, skillId) ?? suggested;
}

function buildMixed(topicId: TopicId, state: ProgressState, rng: Rng, skills: readonly SkillDef[]): RoundSlot[] {
  const isPractised = (s: SkillDef) => practisedStufe(state, s.id) !== undefined;
  // Extras depend on the Land: mixed rounds use only those the child has chosen to practise.
  const eligible = skills.filter((s) => s.topicId === topicId && (!isExtraSkill(state, s.id) || isPractised(s)));
  if (eligible.length === 0) return [];
  const practised = rng.shuffle(eligible.filter(isPractised));
  const fresh = rng.shuffle(eligible.filter((s) => !isPractised(s)));
  // Prefer skills the child has already worked on; fall back to the whole topic if fewer than 2.
  const chosen = practised.length >= 2 ? practised : [...practised, ...fresh];
  // Written items cost more, so a mixed round holds fewer of them (src/core/age.ts).
  const planned = mixedRoundSkills(chosen.map((s) => s.id));
  const groups: Group[] = chosen
    .map((s) => {
      const stufe = mixedStufe(state, s.id);
      const size = planned.filter((id) => id === s.id).length;
      return { id: s.id, queue: Array.from({ length: size }, () => ({ stufe, ab: drawAb(rng, stufe, roundSize(s.id)) })) };
    })
    .filter((g) => g.queue.length > 0);
  return interleave(groups, (candidates) => rng.pick(candidates)).map(({ id, stufe, ab }) => ({ skillId: id, stufe, purpose: 'mixed', ...(ab ? { ab } : {}) }));
}

/** A due item can be built if its topic is not loaded (unknown) or the loaded topic still has the skill. */
function makeAvailable(skills: readonly SkillDef[]): (skillId: string) => boolean {
  const loadedTopics = new Set(skills.map((s) => s.topicId as string));
  return (skillId) => {
    const def = skills.find((s) => s.id === skillId);
    if (def) return true;
    return !loadedTopics.has(skillId.split('.')[0]);
  };
}

function buildReview(state: ProgressState, day: Day, skills: readonly SkillDef[]): RoundSlot[] {
  // The cap is per day: review answers already given today use it up (a 2nd round only gets the rest).
  const budget = reviewBudget(state, day);
  if (budget <= 0) return [];
  const items = dueReviews(state, day, Number.MAX_SAFE_INTEGER).filter((i) => makeAvailable(skills)(i.skillId));
  if (items.length === 0) return [];
  // 3 to 5 items: every due skill-Stufe once, most overdue first, then round by round again up to 2 each (a single due Stufe: 3).
  const size = Math.min(budget, REVIEW_MAX, Math.max(REVIEW_MIN, items.length * 2));
  const groups: Group[] = [];
  const groupOf = (id: string): Group => {
    let g = groups.find((x) => x.id === id);
    if (!g) groups.push((g = { id, queue: [] }));
    return g;
  };
  // Groups are per skill (not per Stufe) so two Stufen of one skill are not placed back to back either.
  for (let i = 0; i < size; i++) {
    const item = items[i % items.length];
    groupOf(item.skillId).queue.push({ stufe: item.stufe });
  }
  // Most overdue first wherever the interleaving allows it (groups are in priority order).
  return interleave(groups, (candidates) => candidates[0]).map(({ id, stufe }) => ({ skillId: id, stufe, purpose: 'review' }));
}

/**
 * Build the slots of one round.
 * - 'skill': roundSize(skill) practice slots (10, 6 in rechnen.schriftlich-*) of one skill-Stufe with the AB mix of the Stufe (src/core/age.ts), easier items first.
 * - 'mixed': slots over the topic's skills (Extras of the profile only once practised), preferring skills the child has practised, at their
 *   practised/suggested Stufe, never the same skill twice in a row when the topic offers ≥ 2 skills. Written items cost more (mixedRoundSkills), and each
 *   slot draws its AB level with the weights of its Stufe and skill.
 * - 'review': a warm-up of 3 to 5 slots, and at most REVIEWS_PER_DAY a day (review answers already given today count), most overdue first, interleaved;
 *   [] if nothing is due or today's 8 are done.
 * @param skills all SkillDefs of the topics involved (the UI loads the topic modules first).
 */
export function buildRound(plan: PracticePlan, state: ProgressState, day: Day, rng: Rng, skills: SkillDef[]): RoundSlot[] {
  switch (plan.mode) {
    case 'skill':
      return abSequence(plan.stufe, roundSize(plan.skillId)).map((ab) => ({ skillId: plan.skillId, stufe: plan.stufe, purpose: 'practice' as const, ab }));
    case 'mixed':
      return buildMixed(plan.topicId, state, rng, skills);
    case 'review':
      return buildReview(state, day, skills);
  }
}
