/**
 * Badges (docs/research.md §7.1, M6–M8): a plain list, named by the act, awarded as a surprise, never announced in advance. No participation badge
 * and no badge for trying all topics, none naming a track or trait. Every condition needs solved tasks (sicher/gemeistert Stufen, passed spaced
 * checks, improvements); none is earned for practice days or time spent (M6, M12). The weekly goal has its own gentle display and is never turned
 * into a badge. Conditions use only topic prefixes, counts and totals, so they do not depend on other modules' exact skill ids or on the profile.
 *
 * Improvement badges (docs/research.md M16, src/state/growth.ts) are the most significant ones: they reward getting better than one's own earlier
 * self, and each needs evidence from a later day or from a spaced review, so wrong answers alone never earn one. Small improvements (a 2nd try, a
 * twin task) get only a calm line in the round, never a badge.
 */
import type { TopicId } from '../core/types';
import { growthFacts, type GrowthFacts } from './growth';
import { TOPIC_IDS, isAtLeastSicher, parseSkillKey } from './mastery';
import type { BadgeDef, ProgressState } from './types';

/** Numbers the conditions look at, computed once per evaluation. */
export interface BadgeFacts {
  /** Distinct skills with ≥ 1 Stufe sicher/gemeistert, per topic. */
  sicherSkills: Record<TopicId, number>;
  /** Skill-Stufen at 'gemeistert', per topic. */
  gemeistert: Record<TopicId, number>;
  gemeistertTotal: number;
  /** Topics with ≥ 1 skill sicher on Stufe 3. */
  stufe3Topics: number;
  /** Improvements. */
  growth: GrowthFacts;
}

interface BadgeRule extends BadgeDef {
  met(state: ProgressState, f: BadgeFacts): boolean;
}

const LATER = 'Du kannst diese Stufe auch nach ein paar Tagen noch.';

type TopicTexts = { name: string; dative: string };

/** Names the topic, never a trait: 'Große Zahlen: eine Stufe sicher', never 'Zahlen-Profi'. */
const TOPIC_TEXTS: Record<TopicId, TopicTexts> = {
  zahlen: { name: 'Große Zahlen', dative: 'bei den großen Zahlen' },
  rechnen: { name: 'Rechnen', dative: 'beim Rechnen' },
  ganzzahlen: { name: 'Negative Zahlen', dative: 'bei den negativen Zahlen' },
  brueche: { name: 'Brüche', dative: 'bei den Brüchen' },
  groessen: { name: 'Größen', dative: 'bei den Größen' },
  geometrie: { name: 'Geometrie', dative: 'in der Geometrie' },
  flaeche: { name: 'Fläche', dative: 'bei Umfang und Fläche' },
  daten: { name: 'Daten', dative: 'bei den Daten' },
};

/** Thresholds (heuristics; documented so they can be tuned in a pilot). */
export const BADGE_THRESHOLDS = {
  wiederholung: 10,
  sicherInTopic: 3,
  stufe3Topics: 3,
  gedaechtnis: 5,
  /** Topics with a lasting improvement for 'Vieles behalten' (the largest improvement badge). */
  vielesBehaltenTopics: 3,
} as const;

const RULES: BadgeRule[] = [
  ...TOPIC_IDS.flatMap((t): BadgeRule[] => {
    const { name, dative } = TOPIC_TEXTS[t];
    return [
      { id: `${t}-sicher`, title: `${name}: eine Stufe sicher`, description: `Du kannst eine Stufe ${dative} sicher.`, met: (_s, f) => f.sicherSkills[t] >= 1 },
      { id: `${t}-gemeistert`, title: `${name}: eine Stufe gemeistert`, description: `Du hast eine Stufe ${dative} gemeistert. ${LATER}`, met: (_s, f) => f.gemeistert[t] >= 1 },
    ];
  }),
  {
    id: 'drei-uebungen',
    title: 'Drei Übungen sicher',
    description: 'Du kannst in einem Thema 3 Übungen sicher.',
    met: (_s, f) => TOPIC_IDS.some((t) => f.sicherSkills[t] >= BADGE_THRESHOLDS.sicherInTopic),
  },
  {
    id: 'stufe3',
    title: 'Stufe 3 in drei Themen',
    description: 'Du kannst in 3 Themen die Stufe 3 sicher.',
    met: (_s, f) => f.stufe3Topics >= BADGE_THRESHOLDS.stufe3Topics,
  },
  {
    id: 'gedaechtnis',
    title: 'Fünf Stufen gemeistert',
    description: 'Du hast 5 Stufen gemeistert. Du kannst die Stufen auch nach Tagen noch.',
    met: (_s, f) => f.gemeistertTotal >= BADGE_THRESHOLDS.gedaechtnis,
  },
  {
    id: 'wiederholung',
    title: 'Zehn Wiederholungen',
    description: 'Du hast beim Wiederholen 10 Aufgaben auf Anhieb gelöst.',
    met: (s) => s.totals.checksPassed >= BADGE_THRESHOLDS.wiederholung,
  },
  // ── Improvement badges (docs/research.md M16), from the 3rd kind of improvement upwards ──
  {
    id: 'fehler-ueberwunden',
    title: 'Stolperstein überwunden',
    description: 'Du bist oft an derselben Stelle gestolpert. Danach hast du 5 solche Aufgaben auf Anhieb gelöst. Das hat auch an einem anderen Tag geklappt.',
    improvement: true,
    met: (_s, f) => f.growth.overcome >= 1,
  },
  {
    id: 'besser-geworden',
    title: 'Besser geworden',
    description: 'Du fandest eine Aufgabenart am Anfang noch knifflig. Später hast du dreimal mindestens 8 von 10 gelöst.',
    improvement: true,
    met: (_s, f) => f.growth.improved >= 1,
  },
  {
    id: 'behalten',
    title: 'Gut behalten',
    description: 'Du hast Tage später etwas auf Anhieb gelöst. Das war vorher noch knifflig.',
    improvement: true,
    met: (_s, f) => f.growth.kept >= 1,
  },
  {
    id: 'vieles-behalten',
    title: 'Vieles behalten',
    description: 'Du hast in 3 Themen später etwas auf Anhieb gelöst. Das war vorher noch knifflig.',
    improvement: true,
    met: (_s, f) => f.growth.keptTopics >= BADGE_THRESHOLDS.vielesBehaltenTopics,
  },
];

/** Badges named by the act (no participation badges, never announced in advance). */
export const BADGES: BadgeDef[] = RULES.map(({ id, title, description, improvement }) => (improvement ? { id, title, description, improvement } : { id, title, description }));

const zeroPerTopic = (): Record<TopicId, number> => Object.fromEntries(TOPIC_IDS.map((t) => [t, 0])) as Record<TopicId, number>;

export function badgeFacts(state: ProgressState): BadgeFacts {
  const sicherSkillIds: Record<TopicId, Set<string>> = Object.fromEntries(TOPIC_IDS.map((t) => [t, new Set<string>()])) as Record<TopicId, Set<string>>;
  const gemeistert = zeroPerTopic();
  const stufe3 = new Set<TopicId>();
  let gemeistertTotal = 0;
  for (const [key, p] of Object.entries(state.skills)) {
    const parsed = parseSkillKey(key);
    if (!parsed || !isAtLeastSicher(p.state)) continue;
    sicherSkillIds[parsed.topicId].add(parsed.skillId);
    if (parsed.stufe === 3) stufe3.add(parsed.topicId);
    if (p.state === 'gemeistert') {
      gemeistert[parsed.topicId] += 1;
      gemeistertTotal += 1;
    }
  }
  const sicherSkills = zeroPerTopic();
  for (const t of TOPIC_IDS) sicherSkills[t] = sicherSkillIds[t].size;
  return { sicherSkills, gemeistert, gemeistertTotal, stufe3Topics: stufe3.size, growth: growthFacts(state) };
}

/** Ids of badges whose condition is met but that are not yet in state.badges. */
export function evaluateBadges(state: ProgressState): string[] {
  const f = badgeFacts(state);
  return RULES.filter((r) => !Object.prototype.hasOwnProperty.call(state.badges, r.id) && r.met(state, f)).map((r) => r.id);
}

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}
