import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import { CTX, samples } from '../test-utils';
import { primfaktorenSkill } from './primfaktoren';

describeSkill(primfaktorenSkill);

/** Independent checks. */
const prime = (n: number) => n > 1 && Array.from({ length: n - 2 }, (_, i) => i + 2).every((d) => n % d !== 0);
const gcdRef = (a: number, b: number): number => { for (let d = Math.min(a, b); d > 1; d--) if (a % d === 0 && b % d === 0) return d; return 1; };

describe('zahlen.primfaktoren', () => {
  it('Stufe 1: prime answers recomputed, numbers ≤ 50', () => {
    for (const ex of samples(primfaktorenSkill, 1)) {
      const [kind, a, b] = ex.key.split(':').slice(2);
      if (kind === 'prim' && ex.answer.kind === 'choice') {
        expect(Number(a)).toBeLessThanOrEqual(50);
        expect(ex.answer.options[ex.answer.correct].label).toBe(prime(Number(a)) ? 'Ja' : 'Nein');
      }
      if (kind === 'wahl' && ex.answer.kind === 'choice') {
        const hits = ex.answer.options.filter((o) => prime(Number(o.label)));
        expect(hits.map((o) => o.label)).toEqual([ex.answer.options[ex.answer.correct].label]);
      }
      if (kind === 'zaehlen' && ex.answer.kind === 'multi') {
        const inside = Array.from({ length: Number(b) - Number(a) - 1 }, (_, i) => Number(a) + 1 + i);
        expect(ex.answer.fields[0].value).toBe(inside.filter(prime).length);
      }
    }
  });

  it('a hint that lists divisors to test excludes the number itself, so it never rejects 2, 3, 5 or 7', () => {
    const items = ([1, 2, 3] as const).flatMap((ab) => Array.from({ length: 300 }, (_, i) => primfaktorenSkill.generate(createRng(i * 11 + 2), 1, { ...CTX, ab })));
    for (const ex of items) {
      const lists = ex.hints.filter((h) => /Teiler \d/.test(h));
      expect(lists.length, ex.key).toBe(1);
      expect(lists[0], ex.key).toContain('Die Zahl selbst zählt dabei nicht.');
    }
  });

  it('Stufe 2: the fields multiply back to the number, all prime and ascending; n ≤ 200', () => {
    for (const ex of samples(primfaktorenSkill, 2)) {
      const [kind, value] = ex.key.split(':').slice(2);
      const n = Number(value);
      expect(n).toBeLessThanOrEqual(200);
      if (kind === 'alle' && ex.answer.kind === 'multi') {
        const f = ex.answer.fields.map((x) => x.value);
        expect(f.reduce((a, b) => a * b, 1)).toBe(n);
        f.forEach((x) => expect(prime(x)).toBe(true));
        expect(f).toEqual([...f].sort((a, b) => a - b));
      }
      if (kind === 'wahl' && ex.answer.kind === 'choice') {
        const label = ex.answer.options[ex.answer.correct].label;
        const f = label.split(' · ').map(Number);
        expect(f.reduce((a, b) => a * b, 1)).toBe(n);
        f.forEach((x) => expect(prime(x)).toBe(true));
      }
    }
  });

  it('Stufe 3: the bus story stays within two hours, and its steps show how the kgV comes from the factors', () => {
    const items = Array.from({ length: 400 }, (_, i) => primfaktorenSkill.generate(createRng(i * 29 + 7), 3, { ...CTX, ab: 3 }));
    const buses = items.filter((ex) => ex.key.includes(':kgv:'));
    expect(buses.length).toBeGreaterThan(0);
    for (const ex of buses) {
      if (ex.answer.kind !== 'multi') throw new Error('multi');
      const [a, b] = ex.key.split(':').slice(3).map(Number);
      const value = ex.answer.fields[0].value;
      expect(a, ex.key).toBeLessThanOrEqual(30);
      expect(b, ex.key).toBeLessThanOrEqual(30);
      expect(value, ex.key).toBeLessThanOrEqual(120);
      const line = ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).find((s) => s.startsWith('kgV('))!;
      const factors = line.split(' = ')[1].split(' · ').map(Number);
      factors.forEach((f) => expect(prime(f), ex.key).toBe(true));
      expect(factors.reduce((x, y) => x * y, 1), ex.key).toBe(value);
    }
    const strips = items.filter((ex) => ex.key.includes(':ggts:'));
    expect(strips.length).toBeGreaterThan(0);
    for (const ex of strips) expect(ex.steps.some((s) => typeof s === 'string' && s.startsWith('Gemeinsam')), ex.key).toBe(true);
  });

  it('Stufe 3: ggT and kgV recomputed; exponents give the number back', () => {
    for (const ex of samples(primfaktorenSkill, 3, 500)) {
      if (ex.answer.kind !== 'multi') throw new Error('multi');
      const p = ex.key.split(':').slice(2);
      const v = ex.answer.fields[0].value;
      if (p[0] === 'ggt') expect(v).toBe(gcdRef(Number(p[1]), Number(p[2])));
      if (p[0] === 'ggts') expect(v).toBe(gcdRef(Number(p[2]), Number(p[3])));
      if (p[0] === 'kgv') expect(v).toBe((Number(p[1]) * Number(p[2])) / gcdRef(Number(p[1]), Number(p[2])));
      if (p[0] === 'potenzform') {
        const n = Number(ex.expression!.split(' = ')[0].replace(/\D/g, ''));
        const bases = ex.answer.fields.map((f) => Number(f.id.slice(1)));
        expect(ex.answer.fields.reduce((a, f, i) => a * bases[i] ** f.value, 1)).toBe(n);
      }
    }
  });
});
