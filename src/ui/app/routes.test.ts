import { describe, expect, it } from 'vitest';
import { PATHS, exitPath, matchRoute, mixPath, planPath, practicePath, topicPath } from './routes';

describe('matchRoute', () => {
  it('matches the static routes', () => {
    expect(matchRoute('/')).toEqual({ name: 'home' });
    expect(matchRoute('/fortschritt')).toEqual({ name: 'progress' });
    expect(matchRoute('/abzeichen')).toEqual({ name: 'badges' });
    expect(matchRoute('/arbeitsblatt')).toEqual({ name: 'worksheet' });
    expect(matchRoute('/erwachsene')).toEqual({ name: 'adults' });
    expect(matchRoute('/datenschutz')).toEqual({ name: 'privacy' });
    expect(matchRoute('/impressum')).toEqual({ name: 'imprint' });
    expect(matchRoute('/wiederholen')).toEqual({ name: 'practice', plan: { mode: 'review' } });
  });

  it('matches parameterised routes', () => {
    expect(matchRoute('/thema/geometrie')).toEqual({ name: 'topic', topicId: 'geometrie' });
    expect(matchRoute('/mix/daten')).toEqual({ name: 'practice', plan: { mode: 'mixed', topicId: 'daten' } });
    expect(matchRoute('/ueben/zahlen.lesen/2')).toEqual({ name: 'practice', plan: { mode: 'skill', skillId: 'zahlen.lesen', stufe: 2 } });
  });

  it('ignores a trailing slash', () => {
    expect(matchRoute('/fortschritt/')).toEqual({ name: 'progress' });
    expect(matchRoute('/thema/zahlen/')).toEqual({ name: 'topic', topicId: 'zahlen' });
  });

  it('returns notFound for unknown paths and invalid parameters', () => {
    for (const p of [
      '/gibt-es-nicht',
      '/thema/physik',
      '/thema',
      '/mix/xyz',
      '/ueben/zahlen.lesen/4',
      '/ueben/zahlen.lesen/0',
      '/ueben/zahlen.lesen',
      '/ueben/physik.kraft/1',
      '/ueben/runden/1',
      '/fortschritt/extra',
      '/%E0%A4%A',
    ]) {
      expect(matchRoute(p), p).toEqual({ name: 'notFound' });
    }
  });

  it('round-trips the path builders', () => {
    expect(matchRoute(topicPath('rechnen'))).toEqual({ name: 'topic', topicId: 'rechnen' });
    expect(matchRoute(practicePath('groessen.komma', 3))).toEqual({ name: 'practice', plan: { mode: 'skill', skillId: 'groessen.komma', stufe: 3 } });
    expect(matchRoute(mixPath('flaeche'))).toEqual({ name: 'practice', plan: { mode: 'mixed', topicId: 'flaeche' } });
    for (const plan of [
      { mode: 'review' as const },
      { mode: 'mixed' as const, topicId: 'zahlen' as const },
      { mode: 'skill' as const, skillId: 'zahlen.lesen', stufe: 1 as const },
    ]) {
      expect(matchRoute(planPath(plan))).toEqual({ name: 'practice', plan });
    }
  });

  it('exits a round to the topic (skill/mixed) or home', () => {
    expect(exitPath({ mode: 'skill', skillId: 'zahlen.lesen', stufe: 1 })).toBe('/thema/zahlen');
    expect(exitPath({ mode: 'mixed', topicId: 'daten' })).toBe('/thema/daten');
    expect(exitPath({ mode: 'review' })).toBe(PATHS.home);
  });
});
