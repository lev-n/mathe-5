import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { CTX, samples } from '../test-utils';
import { zehnerpotenzenSkill } from './zehnerpotenzen';

describeSkill(zehnerpotenzenSkill, { minDistinct: { 1: 15, 3: 20 } });

describe('zahlen.zehnerpotenzen', () => {
  it('answers recomputed from the key', () => {
    for (const ex of samples(zehnerpotenzenSkill, 1)) {
      const [kind, k] = ex.key.split(':').slice(2);
      if (kind === 'zahl') expect(ex.answer).toMatchObject({ value: 10 ** Number(k) });
      if (kind === 'exponent') expect(ex.answer).toMatchObject({ value: Number(k) });
      if (kind === 'stellen') expect(ex.answer).toMatchObject({ value: String(10 ** Number(k)).length });
    }
    for (const ex of samples(zehnerpotenzenSkill, 2)) {
      const [kind, a, b] = ex.key.split(':').slice(2);
      if (kind === 'produkt') expect(ex.answer).toMatchObject({ value: Number(a) * 10 ** Number(b) });
      if (kind === 'hoch') expect(ex.answer).toMatchObject({ value: Number(b) });
      if (kind === 'faktor') expect(ex.answer).toMatchObject({ value: Number(a) });
    }
  });

  it('a comparison has the sign of the two numbers', () => {
    const items = samples(zehnerpotenzenSkill, 2, 600).filter((ex) => ex.key.includes(':vergleich:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [a, k, b, k2] = ex.key.split(':').slice(3).map(Number);
      expect(ex.answer.options[ex.answer.correct].label).toBe(a * 10 ** k < b * 10 ** k2 ? '<' : '>');
    }
  });

  it('never gives the sign or the exponent away in a hint; steps add up', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(zehnerpotenzenSkill, stufe)) expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('the sizes of Stufe 3 say they are rounded', () => {
    const items = samples(zehnerpotenzenSkill, 3).filter((e) => e.key.includes(':zwei:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) expect(ex.context).toMatch(/etwa/);
  });

  const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const exponents = (text: string) => [...text.matchAll(/10([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g)].map((m) => Number([...m[1]].map((c) => SUPER.indexOf(c)).join('')));
  const atAb = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3, n = 300) => Array.from({ length: n }, (_, i) => zehnerpotenzenSkill.generate(createRng(i * 17 + 5), stufe, { ...CTX, ab }));

  it('Stufe 1 stays at 10³ to 10⁹, in the task and in every option', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(1, ab)) {
        const [kind, k] = ex.key.split(':').slice(2);
        if (kind === 'zahl' || kind === 'exponent' || kind === 'stellen') {
          expect(Number(k), ex.key).toBeGreaterThanOrEqual(3);
          expect(Number(k), ex.key).toBeLessThanOrEqual(9);
        }
        const labels = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : [];
        for (const e of exponents([ex.prompt, ex.expression ?? '', ...labels].join(' '))) {
          expect(e, ex.key).toBeGreaterThanOrEqual(3);
          expect(e, ex.key).toBeLessThanOrEqual(9);
        }
      }
    }
  });

  it('Stufe 3 compares sizes at every AB: AB I names the larger of two facts', () => {
    for (const ex of atAb(3, 1)) {
      expect(ex.key).toContain(':zwei:');
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const values = [...(ex.context ?? '').matchAll(/(\d+) · 10([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g)].map((m) => Number(m[1]) * 10 ** exponents(`10${m[2]}`)[0]);
      expect(values).toHaveLength(2);
      expect(values[0]).not.toBe(values[1]);
      const [first, second] = (ex.context ?? '').split('. ').map((t) => t.split(' ').slice(0, 2).join(' '));
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(values[0] > values[1] ? first : second);
    }
  });

  it('Stufe 3 comparisons need the powers: neutral names, and neither the exponent nor the factor decides alone', () => {
    const wins = { exponent: 0, factor: 0 };
    const threeWins = new Set<number>();
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(3, ab, 400)) {
        if (ex.answer.kind !== 'choice') throw new Error(ex.key);
        const sizes = ex.key.split(':')[4].split('|').map((t) => t.split('-').map(Number));
        const values = sizes.map(([m, k]) => m * 10 ** k);
        const best = values.indexOf(Math.max(...values));
        expect(new Set(values).size, ex.key).toBe(sizes.length);
        expect(ex.answer.options[ex.answer.correct].label, ex.key).toMatch(new RegExp(` ${['A', 'B', 'C'][best]}(:|$)`));
        expect([ex.context ?? '', ex.prompt, ...ex.answer.options.map((o) => o.label)].join(' '), ex.key).toMatch(/Stadt|Strecke/);
        expect([ex.context ?? '', ex.prompt, ...ex.answer.options.map((o) => o.label)].join(' '), ex.key).not.toMatch(/Deutschland|Berlin|Hamburg|München|Köln|Österreich|Luxemburg|Erde|Mond|Sonne|Mars|Jupiter|Neptun/);
        if (sizes[best][1] === Math.max(...sizes.map((x) => x[1]))) wins.exponent++;
        if (sizes[best][0] === Math.max(...sizes.map((x) => x[0]))) wins.factor++;
        if (ab === 2) threeWins.add(String(sizes[best][0]).length);
      }
    }
    expect(wins.exponent).toBeGreaterThan(200);
    expect(wins.exponent).toBeLessThan(600);
    expect(wins.factor).toBeGreaterThan(200);
    expect(wins.factor).toBeLessThan(600);
    expect(threeWins).toEqual(new Set([1, 2, 3]));
  });

  it('the ratio stories keep real sizes, and the answer speaks of the same quantity as the question', () => {
    // [largest small one, smallest big one, largest big one, suffix]: Dorf and Stadt, Foto and Film, Schulweg and Flugreise
    const LIMITS: readonly [number, number, number, string][] = [[9e3, 2e5, 3e6, 'mal so viele'], [9e6, 2e8, 9e9, 'mal so viel'], [5e3, 2e5, 9e6, 'mal so lang']];
    const seen = new Set<number>();
    for (const ex of atAb(3, 3, 800)) {
      if (ex.answer.kind !== 'number') throw new Error('number');
      const [story, m, low, high] = ex.key.split(':').slice(3).map(Number);
      const [smallMax, bigMin, bigMax, after] = LIMITS[story];
      seen.add(story);
      expect(m * 10 ** low, ex.key).toBeLessThanOrEqual(smallMax);
      expect(m * 10 ** high, ex.key).toBeGreaterThanOrEqual(bigMin);
      expect(m * 10 ** high, ex.key).toBeLessThanOrEqual(bigMax);
      expect(ex.answer.after, ex.key).toBe(after);
      expect(ex.answer.value).toBe(10 ** (high - low));
    }
    expect(seen.size).toBe(3);
  });
});
