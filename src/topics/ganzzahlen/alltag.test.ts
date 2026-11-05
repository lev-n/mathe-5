import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { fmt, fmtTemp, toSpeech } from '../../core/format';
import type { Exercise } from '../../core/types';
import { alltagSkill } from './alltag';
import { answerValue, calculatingLines, checkAll, correctLabel, fieldValues, items } from './checks';

describeSkill(alltagSkill);

/** The end of a story of Stufe 3 AB III, followed through its own words. */
function endOf(story: string): number {
  const [start, change] = [...story.matchAll(/\d+/g)].map((m) => Number(m[0]));
  const signedStart = /unter|Schulden/.test(story) ? -start : start;
  return /fällt|gehen|nach unten/.test(story) ? signedStart - change : signedStart + change;
}

describe('ganzzahlen.alltag', () => {
  it('worked steps add up and state the result', () => checkAll(alltagSkill));

  it('Stufe 1 reads a level from the picture: the answer is the value drawn', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex, form, num } of items(alltagSkill, 1, ab)) {
        const v = ex.visual;
        if (form === 'thermometer') {
          if (v?.type !== 'thermometer') throw new Error('thermometer');
          expect(answerValue(ex)).toBe(v.value);
          expect(v.value).toBe(num[3]);
          expect((v.max - v.min) / v.step).toBeLessThanOrEqual(30);
        } else {
          expect(form).toBe('hoehe');
          if (v?.type !== 'numberLine') throw new Error('numberLine');
          expect(answerValue(ex)).toBe(v.marks?.[0].value);
          expect(answerValue(ex)).toBeLessThan(0);
        }
      }
    }
  });

  it('AB III of Stufe 1 counts ticks, or reads between labelled ticks', () => {
    for (const { ex, form, num } of items(alltagSkill, 1, 3)) {
      if (form === 'striche') expect(answerValue(ex)).toBe(-num[1] / 2);
      else expect((answerValue(ex) as number) % 100).not.toBe(0);
    }
  });

  it('the word in the text decides the sign (Stufe 2)', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex } of items(alltagSkill, 2, ab)) {
        const n = Number((/\d[\d ]*/.exec(ex.context ?? '') ?? ['0'])[0].replace(/ /g, ''));
        const negative = /unter|Schulden|Minusgrade|Untergeschoss|tief im Meer|im Minus/.test(ex.context ?? '');
        expect(answerValue(ex)).toBe(negative ? -n : n);
      }
    }
    for (const { ex, num } of items(alltagSkill, 2, 3)) {
      const f = fieldValues(ex);
      expect([f.a, f.b]).toEqual([num[1], num[2]]);
      const parts = (ex.context ?? '').split('. ');
      expect(/unter|Schulden/.test(parts[0])).toBe(f.a < 0);
      expect(/unter|Schulden/.test(parts[1])).toBe(f.b < 0);
    }
  });

  it('every context keeps a believable range', () => {
    const all = [...items(alltagSkill, 2, 1, 1000), ...items(alltagSkill, 2, 3, 1000), ...items(alltagSkill, 3, 1, 500), ...items(alltagSkill, 3, 2, 500), ...items(alltagSkill, 3, 3, 500)];
    const texts = (ex: Exercise) => [ex.context ?? '', ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : [])];
    for (const { ex } of all) {
      for (const t of texts(ex)) {
        for (const m of t.matchAll(/(\d+) Grad (?:unter|über) null/g)) expect(Number(m[1]), t).toBeLessThanOrEqual(30);
        for (const m of t.matchAll(/Keller liegt (\d+) m/g)) expect(Number(m[1]), t).toBeLessThanOrEqual(10);
      }
    }
    for (const { ex, p, num } of items(alltagSkill, 2, 3, 1000)) {
      if (p[0] === 'tag') expect(Math.abs(num[1] - num[2]), ex.key).toBeLessThanOrEqual(20);
    }
  });

  it('Stufe 3 asks which story fits: the correct story lies below 0, or above it for "passt nicht"', () => {
    for (const { ex, num } of items(alltagSkill, 3, 1)) {
      expect(ex.prompt).toContain(fmt(-num[1]));
      expect(correctLabel(ex)).toMatch(/unter|Schulden/);
    }
    for (const { ex } of items(alltagSkill, 3, 2)) {
      const unit = /Stand −\d+\s(°C|m|€)/.exec(ex.prompt)?.[1];
      expect(correctLabel(ex)).toMatch(/unter|Schulden/);
      expect(correctLabel(ex)).toContain(unit === '°C' ? 'Grad' : unit);
    }
    for (const { ex, num } of items(alltagSkill, 3, 3)) {
      expect(ex.prompt).toContain(fmt(-num[num.length - 1]));
      expect(endOf(correctLabel(ex))).toBe(-num[num.length - 1]);
    }
  });

  it('Stufe 3 AB I: the word alone does not decide, a second story below 0 has another number', () => {
    for (const { ex, num } of items(alltagSkill, 3, 1, 500)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const below = ex.answer.options.filter((o) => /unter|Schulden/.test(o.label));
      expect(below, ex.key).toHaveLength(2);
      expect(below.filter((o) => new RegExp(`(?<!\\d)${num[1]}(?!\\d)`).test(o.label)), ex.key).toHaveLength(1);
    }
  });

  it('Stufe 3 AB III: only following each story finds the end, as all stories share the numbers and the words of direction', () => {
    for (const { ex, num } of items(alltagSkill, 3, 3, 500)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [start, n] = num.slice(-2);
      expect(ex.answer.options, ex.key).toHaveLength(4);
      ex.answer.options.forEach((o, i) => {
        expect(endOf(o.label) === -n, o.label).toBe(i === (ex.answer as { correct: number }).correct);
        expect(o.label, ex.key).toContain(`${start} `);
        expect(o.label, ex.key).toContain(`${start + n} `);
      });
      // the words of the right story are also in a wrong one
      expect(ex.answer.options.filter((o) => /über|Guthaben/.test(o.label)), ex.key).toHaveLength(2);
      expect(ex.answer.options.filter((o) => /fällt|gehen|nach unten/.test(o.label)), ex.key).toHaveLength(2);
    }
  });

  it('a height on the horizontal line: below sea level is never called left, and a tick is never counted as 1', () => {
    for (const ab of [1, 2, 3] as const) {
      const heights = items(alltagSkill, 1, ab, 400).filter(({ form }) => form === 'hoehe');
      expect(heights.length).toBeGreaterThan(0);
      for (const { ex } of heights) {
        const texts = [...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)), ...(ex.bugs ?? []).map((b) => b.hint)];
        for (const t of texts) expect(t, ex.key).not.toMatch(/\blinks\b|\brechts\b|nach unten|−1, −2/);
      }
    }
  });

  it('srText has the scale and the level, but not the value to read off', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex, form } of items(alltagSkill, 1, ab, 400)) {
        if (form !== 'thermometer') continue;
        if (ex.visual?.type !== 'thermometer') throw new Error('thermometer');
        expect(ex.srText, ex.key).toContain('über dem unteren Ende');
        expect(ex.srText, ex.key).not.toMatch(new RegExp(`(?<!\\d)${toSpeech(fmtTemp(ex.visual.value))}`));
      }
    }
  });

  it('no line calculates with signs under integersAsStates (§2.5)', () => expect(calculatingLines(alltagSkill)).toEqual([]));
});
