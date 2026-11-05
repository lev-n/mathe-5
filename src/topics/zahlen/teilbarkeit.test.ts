import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { samples } from '../test-utils';
import { teilbarkeitSkill } from './teilbarkeit';

describeSkill(teilbarkeitSkill);

const asNumber = (label: string) => Number(label.replace(/\D/g, ''));

describe('zahlen.teilbarkeit', () => {
  it('exactly one option of a choice is divisible, recomputed with %', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(teilbarkeitSkill, stufe)) {
        if (!ex.key.includes(':welche:') || ex.answer.kind !== 'choice') continue;
        const d = Number(ex.key.split(':')[3]);
        expect([1, 2, 3][stufe - 1] === 1 ? [2, 5, 10] : stufe === 2 ? [3, 4] : [6, 15]).toContain(d);
        const hits = ex.answer.options.map((o, i) => [asNumber(o.label) % d, i] as const).filter(([r]) => r === 0).map(([, i]) => i);
        expect(hits, ex.key).toEqual([ex.answer.correct]);
      }
    }
  });

  it('gaps of a Teilermenge are real divisors in ascending order', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(teilbarkeitSkill, stufe)) {
        if (!ex.key.includes(':menge:') || ex.answer.kind !== 'multi') continue;
        const n = Number(ex.key.split(':')[3]);
        expect(n).toBeLessThanOrEqual(stufe === 1 ? 30 : 100);
        const values = ex.answer.fields.map((f) => f.value);
        for (const v of values) expect(n % v).toBe(0);
        expect(values).toEqual([...values].sort((a, b) => a - b));
      }
    }
  });

  it('the end-digit task names 2, 5 and 10, so its answer is true of these three; the steps state each rule', () => {
    const items = samples(teilbarkeitSkill, 1, 800).filter((ex) => ex.key.includes(':zusammen:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const n = Number(ex.key.split(':')[3]);
      expect(ex.prompt).toMatch(/nur die Zahlen 2, 5 und 10/);
      expect(ex.srText).toMatch(/nur die Zahlen 2, 5 und 10/);
      const hits = [2, 5, 10].filter((d) => n % d === 0);
      const expected = hits.length === 3 ? 'alle drei' : hits.length === 0 ? 'keine davon' : `nur die ${hits[0]}`;
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(expected);
      const steps = ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).join(' ');
      for (const d of [2, 5, 10]) expect(steps, ex.key).toContain(`Regel für die ${d}:`);
    }
  });

  it('the missing digit is the smallest that fits', () => {
    const items = samples(teilbarkeitSkill, 3, 800).filter((ex) => ex.key.includes(':ziffer:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      if (ex.answer.kind !== 'multi') throw new Error('multi');
      const [d, shown] = ex.key.split(':').slice(3);
      const fits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => Number(shown.replace('□', String(x))) % Number(d) === 0);
      expect(ex.answer.fields[0].value, ex.key).toBe(fits[0]);
    }
  });

  it('the 3 bug appears when a final 3 does not fit', () => {
    const items = samples(teilbarkeitSkill, 3, 1500).filter((ex) => ex.bugs?.some((b) => b.id === 'teilbar-endziffer'));
    expect(items.length).toBeGreaterThan(0);
  });
});
