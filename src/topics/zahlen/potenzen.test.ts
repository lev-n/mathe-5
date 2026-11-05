import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import { RANGE_DEFAULTS } from '../../data/profiles';
import { CTX, samples } from '../test-utils';
import { potenzenSkill } from './potenzen';

describeSkill(potenzenSkill, { minDistinct: { 1: 20, 2: 20, 3: 25 } });

describe('zahlen.potenzen', () => {
  it('answers recomputed from the key', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(potenzenSkill, stufe)) {
        const [kind, a, b] = ex.key.split(':').slice(2);
        const value = (ex.answer as { value: number }).value;
        if (kind === 'wert') expect(value).toBe(Number(a) ** Number(b));
        if (kind === 'negativ') expect(value).toBe(Number(a) ** Number(b));
        if (kind === 'zurueck') expect(value * value).toBe(Number(ex.expression!.split(' = ')[1].replace(/\D/g, '')));
        if (kind === 'exponent') expect(Number(a) ** value).toBe(Number(ex.expression!.split(' = ')[1].replace(/\D/g, '')));
        if (kind === 'grenze') {
          expect(Number(a) * 2 ** value).toBeGreaterThan(Number(b));
          expect(Number(a) * 2 ** (value - 1)).toBeLessThanOrEqual(Number(b));
        }
      }
    }
  });

  it('keeps Stufe 1 at squares to 12² and Stufe 2 at squares to 20²', () => {
    for (const ex of samples(potenzenSkill, 1).filter((e) => e.key.includes(':wert:'))) expect(Number(ex.key.split(':')[3])).toBeLessThanOrEqual(12);
    for (const ex of samples(potenzenSkill, 2).filter((e) => e.key.includes(':wert:'))) {
      const [, base, exponent] = ex.key.split(':').slice(2);
      if (exponent === '2') expect(Number(base)).toBeLessThanOrEqual(20);
    }
  });

  it('the 3² = 6 bug is the product of Basis and Exponent', () => {
    for (const ex of samples(potenzenSkill, 1).filter((e) => e.key.includes(':wert:'))) {
      const [, base, exponent] = ex.key.split(':').slice(2);
      const bug = ex.bugs?.find((b) => b.id === 'potenz-mal');
      if (bug) expect(bug.match).toBe(Number(base) * Number(exponent));
    }
  });

  it('□² = n asks for the root above 0, and the negative root gets a hint', () => {
    for (const stufe of [1, 2] as const) {
      const items = Array.from({ length: 200 }, (_, i) => potenzenSkill.generate(createRng(i * 11 + 3), stufe, { ...CTX, ab: 3 })).filter((ex) => ex.key.includes(':zurueck:'));
      expect(items.length).toBeGreaterThan(0);
      for (const ex of items) {
        expect(ex.prompt).toContain('größer als 0');
        expect(ex.srText).toContain('größer als 0');
        const value = (ex.answer as { value: number }).value;
        const result = checkAnswer(ex.answer, { kind: 'number', text: `\u2212${value}` }, ex.bugs);
        expect(result.correct).toBe(false);
        expect(result.bugHint, ex.key).toBeTruthy();
      }
    }
  });

  it('one alga is singular in text and srText, in every algae story', () => {
    const items = [1, 2, 3].flatMap((ab) => Array.from({ length: 300 }, (_, i) => potenzenSkill.generate(createRng(i * 13 + ab), 3, { ...CTX, ab: ab as 1 | 2 | 3 })));
    const algae = items.filter((ex) => /Alge/.test(ex.context ?? ''));
    expect(algae.some((ex) => /liegt 1 Alge\./.test(ex.context ?? ''))).toBe(true);
    for (const ex of algae) {
      for (const text of [ex.context ?? '', ex.srText]) {
        expect(text, ex.key).not.toMatch(/\b1 Algen\b|liegen 1 /);
        expect(text, ex.key).not.toMatch(/liegt (?!1 Alge\.)/);
      }
    }
  });

  it('a negative Basis only where integers are more than states', () => {
    const negatives = (ctx: typeof CTX) => Array.from({ length: 200 }, (_, i) => potenzenSkill.generate(createRng(i * 13 + 5), 3, { ...ctx, ab: 2 })).filter((ex) => ex.key.includes(':negativ:')).length;
    expect(negatives({ ...CTX, ranges: RANGE_DEFAULTS.offen })).toBeGreaterThan(0);
    expect(negatives({ ...CTX, ranges: RANGE_DEFAULTS.bruch })).toBe(0);
  });

  it('a doubling story only speaks of what it defines: Lagen, Tage or Fassungen, no Schritte', () => {
    const items = Array.from({ length: 300 }, (_, i) => potenzenSkill.generate(createRng(i * 41 + 3), 3, { ...CTX, ab: 1 }));
    const stories = items.filter((ex) => ex.key.includes(':verdoppeln:'));
    expect(stories.some((ex) => ex.context?.includes('Fassung'))).toBe(true);
    for (const ex of stories) {
      const texts = [ex.context, ex.prompt, ex.srText, ...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)), ...(ex.bugs ?? []).map((b) => b.hint)];
      for (const text of texts) expect(text, ex.key).not.toMatch(/Schritt/);
    }
  });
});
