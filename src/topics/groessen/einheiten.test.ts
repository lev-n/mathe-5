import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { STUFEN, type Ab } from '../../core/types';
import { CTX, samples } from '../test-utils';
import { einheitenSkill } from './einheiten';
import { assertFitsPhone, assertSteps } from './testkit';

describeSkill(einheitenSkill);

const SIZE: Record<string, number> = { mm: 1, cm: 10, dm: 100, m: 1000, km: 1e6, mg: 1, g: 1000, kg: 1e6, t: 1e9, s: 1, min: 60, h: 3600 };

/** A quantity in base units, with parts: '2 km 500 m'. Own reader: the shared evalSide() does not know dm and mg. */
function valueOf(text: string): number | null {
  const parts = [...text.replace(/[\u202F\u2009]/g, '').matchAll(/(\d+(?:,\d+)?)\s(mm|cm|dm|km|mg|kg|min|m|g|t|h|s)(?![\p{L}])/gu)];
  return parts.length ? parts.reduce((sum, m) => sum + Number(m[1].replace(',', '.')) * SIZE[m[2]], 0) : null;
}

const atAb = (stufe: 1 | 2 | 3, ab: Ab, n = 1000) => Array.from({ length: n }, (_, i) => einheitenSkill.generate(createRng(i * 41 + ab), stufe, { ...CTX, ab }));

describe('groessen.einheiten specifics', () => {
  it('the steps are right and end with the result', () => {
    for (const stufe of STUFEN) for (const ex of samples(einheitenSkill, stufe)) assertSteps(ex);
  });

  it('conversions: the value follows from the expression, recomputed in base units', () => {
    let seen = 0;
    for (const stufe of STUFEN) {
      for (const ex of samples(einheitenSkill, stufe)) {
        if (ex.answer.kind !== 'number' || !ex.expression) continue;
        const [left] = ex.expression.split(' = ');
        const a = valueOf(left);
        const unit = valueOf(`${ex.answer.value} ${ex.answer.unit}`);
        if (a !== null && unit !== null) {
          seen++;
          expect(unit, ex.key).toBeCloseTo(a, 6);
        }
      }
    }
    expect(seen).toBeGreaterThan(200);
  });

  it('Stufe 1 stays with one pair of units, Stufe 3 has a mixed quantity or time in every item', () => {
    for (const ex of samples(einheitenSkill, 1)) {
      if (ex.expression) expect(ex.expression.match(/(?:km|kg|cm|mm|min|m|g|t|h|s)(?![\p{L}])/gu)?.length ?? 0, ex.key).toBeLessThanOrEqual(2);
    }
    for (const ex of samples(einheitenSkill, 3)) {
      const shown = `${ex.expression ?? ''} ${ex.answer.kind === 'order' ? ex.answer.items.join(' ') : ''}`;
      const mixed = /\d\s(?:h|km|kg|m|min|t|cm)\s\d+\s(?:min|m|g|cm|s|kg|mm)/.test(shown) || /□ \w+ □ \w+/.test(shown);
      expect(mixed, `${ex.key}: ${shown}`).toBe(true);
    }
  });

  it('every expression and answer fits a phone at every AB, and t to g stays in the Stufe', () => {
    const items = STUFEN.flatMap((stufe) => [1, 2, 3].flatMap((ab) => Array.from({ length: 300 }, (_, i) => einheitenSkill.generate(createRng(i * 41 + ab), stufe, { ...CTX, ab: ab as Ab }))));
    items.forEach(assertFitsPhone);
    expect(items.some((ex) => ex.key.includes(':auf:g:t:'))).toBe(true);
  });

  it('order items are in the asked order by value', () => {
    let seen = 0;
    for (const stufe of STUFEN) {
      for (const ex of samples(einheitenSkill, stufe)) {
        if (ex.answer.kind !== 'order') continue;
        seen++;
        const values = ex.answer.correct.map((i) => valueOf((ex.answer as { items: string[] }).items[i])!);
        const sorted = [...values].sort((x, y) => (ex.answer.kind === 'order' && ex.answer.direction === 'aufsteigend' ? x - y : y - x));
        expect(values, ex.key).toEqual(sorted);
        expect(new Set(values).size, ex.key).toBe(values.length);
      }
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('the Einheitentafel is whole: dm and mg come up, and m and cm are no neighbours, dm lies between them', () => {
    const stufe1 = ([1, 2, 3] as Ab[]).flatMap((ab) => atAb(1, ab));
    const pairs = (list: typeof stufe1) => new Set(list.flatMap((ex) => /^einheiten|:(?:ab|auf):/.test(ex.key) ? [ex.key.split(':').slice(3, 5).sort().join('-')] : []));
    const neighbours = pairs(stufe1);
    for (const pair of [['dm', 'm'], ['cm', 'dm'], ['g', 'mg']]) expect(neighbours.has([...pair].sort().join('-')), pair.join()).toBe(true);
    expect(neighbours.has(['cm', 'm'].sort().join('-'))).toBe(false);
    expect(stufe1.some((ex) => ex.expression && /\bm\b.* cm$/.test(ex.expression.replace(/\u00A0/g, ' ')))).toBe(false);
    expect(pairs(([1, 2, 3] as Ab[]).flatMap((ab) => atAb(2, ab))).has(['cm', 'm'].sort().join('-'))).toBe(true);
  });

  it('a skipped m to cm names dm as the step between', () => {
    let seen = 0;
    for (const ex of atAb(2, 1)) {
      if (!ex.key.includes(':ab:m:cm:')) continue;
      seen++;
      expect(ex.steps.join(' '), ex.key).toContain('dm');
      expect(ex.bugs?.some((b) => b.id === 'einheit-faktor' && b.hint.includes('dm')), ex.key).toBe(true);
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('a ruler with a mixed length can be read on a 375 px phone: drawn unshrunk, both ends on a long or middle tick', () => {
    let seen = 0;
    for (const ex of atAb(3, 2)) {
      if (ex.visual?.type !== 'ruler') continue;
      seen++;
      // RulerVisual draws 28 px per cm below 14 cm plus 60 px of margins, and a phone card has 311 px
      expect(60 + 28 * ex.visual.maxCm, ex.key).toBeLessThanOrEqual(312);
      const end = ex.visual.startMm + ex.visual.lengthMm;
      expect(end, ex.key).toBeLessThanOrEqual(ex.visual.maxCm * 10);
      expect(ex.visual.startMm % 5, ex.key).toBe(0);
      expect(end % 5, ex.key).toBe(0);
      expect(ex.visual.lengthMm % 10, ex.key).not.toBe(0);
      expect(ex.visual.lengthMm, ex.key).toBeGreaterThan(10);
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('an order task says its direction in the prompt, for the voice and on paper', () => {
    let seen = 0;
    for (const stufe of STUFEN) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of atAb(stufe, ab, 300)) {
          if (ex.answer.kind !== 'order') continue;
          seen++;
          expect(ex.prompt, ex.key).toBe(ex.answer.direction === 'aufsteigend' ? 'Ordne die Größen vom Kleinsten zum Größten.' : 'Ordne die Größen vom Größten zum Kleinsten.');
        }
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('decimal hours: 1,5 h is 1 h 30 min, and the typical answer gets the time hint', () => {
    let seen = 0;
    for (const ex of samples(einheitenSkill, 3)) {
      if (!ex.key.includes('dezimal') || ex.answer.kind !== 'multi') continue;
      seen++;
      const [, hours, dec] = /^(\d),(\d+)/.exec(ex.expression!)!;
      expect(ex.answer.fields[0].value).toBe(Number(hours));
      expect(ex.answer.fields[1].value).toBe((Number(`0.${dec}`) * 60));
      expect(ex.bugs?.some((b) => b.id === 'zeit-dezimal')).toBe(true);
    }
    expect(seen).toBeGreaterThan(10);
  });
});
