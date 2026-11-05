import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WIDEST_RANGES } from '../core/generate';
import type { ProfileId } from '../core/types';
import { STUFEN } from '../core/types';
import { TOPICS, loadAllTopics } from '../topics/registry';
import { CATALOGUE, CORE_SKILLS, DEFAULT_PROFILE, PROFILE_ANSWERS, PROFILE_IDS, PROFILE_QUESTION, RANGE_DEFAULTS, SCHWERPUNKT, TOPIC_ORDER, isSchwerpunkt, schwerpunktStufen } from './profiles';

const file = '../../docs/research.md'; // (a variable: Vite would turn a literal new URL(…) into an asset URL)
const research = readFileSync(new URL(file, import.meta.url), 'utf8');
/** The catalogue rows of §6: id → status. */
const rows = new Map(
  [...research.slice(research.indexOf('## 6. Skill catalogue'), research.indexOf('### New answer types')).matchAll(/^\| `([a-z]+\.[a-z-]+)` \|.*\| (core|opt) \| [^|]*\|$/gm)].map((m) => [m[1], m[2]]),
);
const allIds = Object.values(CATALOGUE).flat();

describe('the catalogue table', () => {
  it('has the 68 skills of §6, by topic', () => {
    expect(rows.size).toBe(68);
    expect([...allIds].sort()).toEqual([...rows.keys()].sort());
    for (const [topic, ids] of Object.entries(CATALOGUE)) ids.forEach((id) => expect(id.split('.')[0], id).toBe(topic));
  });

  it('marks the 31 core skills of §6', () => {
    expect([...CORE_SKILLS].sort()).toEqual([...rows].filter(([, status]) => status === 'core').map(([id]) => id).sort());
  });

  it('every Schwerpunkt id is a catalogue skill that is not already core', () => {
    for (const p of PROFILE_IDS) {
      for (const id of SCHWERPUNKT[p]) {
        expect(allIds, `${p}: ${id}`).toContain(id);
        if (p !== 'ganzzahl') expect(CORE_SKILLS, `${p}: ${id}`).not.toContain(id);
      }
    }
  });

  it('every id exists in the registry, and the registry has no other skill', async () => {
    const modules = await loadAllTopics();
    const built = modules.flatMap((m) => m.skills.map((s) => s.id));
    expect([...built].sort()).toEqual([...allIds].sort());
    // in the catalogue's teaching order
    for (const m of modules) expect(m.skills.map((s) => s.id), m.topicId).toEqual([...CATALOGUE[m.topicId]]);
  });
});

describe('the profiles of §2.5', () => {
  it('asks the question word for word, with four answers', () => {
    expect(research).toContain(`**${PROFILE_QUESTION.title}** ${PROFILE_QUESTION.text}`);
    for (const a of PROFILE_ANSWERS) expect(research).toContain(`\`${a.label}\``);
    expect(PROFILE_ANSWERS.map((a) => a.id)).toEqual(['ganzzahl', 'anschaulich', 'bruch', 'offen']);
    expect(DEFAULT_PROFILE).toBe('offen');
  });

  it('offen: core first, every other skill is an Extra', () => {
    expect(allIds.filter((id) => isSchwerpunkt('offen', id)).sort()).toEqual([...CORE_SKILLS].sort());
  });

  it('never leaves a topic out of the order', () => {
    for (const p of PROFILE_IDS) expect([...TOPIC_ORDER[p]].sort()).toEqual(TOPICS.map((t) => t.id).sort());
  });

  it('counts only Stufe 1 of ganzzahlen.plusminus for anschaulich', () => {
    expect(schwerpunktStufen('anschaulich', 'ganzzahlen.plusminus')).toEqual([1]);
    expect(schwerpunktStufen('ganzzahl', 'ganzzahlen.plusminus')).toEqual(STUFEN);
    expect(schwerpunktStufen('bruch', 'ganzzahlen.plusminus')).toEqual([]);
  });

  it('bruch takes daten.* except daten.vierfelder, and all of brueche', () => {
    expect(isSchwerpunkt('bruch', 'daten.vierfelder')).toBe(false);
    expect(isSchwerpunkt('bruch', 'daten.median')).toBe(true);
    for (const id of CATALOGUE.brueche) expect(isSchwerpunkt('bruch', id), id).toBe(true);
  });

  it('range defaults: the wide profile matches the shared default, the narrow one holds its limits', () => {
    expect(RANGE_DEFAULTS.offen).toEqual(WIDEST_RANGES);
    const a = RANGE_DEFAULTS.anschaulich;
    expect([a.maxAngle, a.fourQuadrants, a.threeDigitFactor, a.areaUnits]).toEqual([180, false, false, 'm2ToMm2']);
    expect(RANGE_DEFAULTS.bruch.integersAsStates).toBe(true);
    (Object.keys(RANGE_DEFAULTS) as ProfileId[]).forEach((p) => expect(PROFILE_IDS).toContain(p));
  });
});
