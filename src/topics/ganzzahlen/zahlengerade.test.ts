import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { answerValue, calculatingLines, checkAll, correctLabel, fieldValues, items, pictureNotSaid } from './checks';
import { zahlengeradeSkill } from './zahlengerade';

describeSkill(zahlengeradeSkill);

describe('ganzzahlen.zahlengerade', () => {
  it('worked steps add up and state the result', () => checkAll(zahlengeradeSkill));

  it('Stufe 1: −10 to 10, step 1; the answer is the marked value', () => {
    for (const { ex } of items(zahlengeradeSkill, 1, 1)) {
      if (ex.visual?.type !== 'numberLine') throw new Error('numberLine');
      expect([ex.visual.min, ex.visual.max, ex.visual.minorStep]).toEqual([-10, 10, 1]);
      expect(answerValue(ex)).toBe(ex.visual.marks?.[0].value);
    }
    for (const { ex } of items(zahlengeradeSkill, 1, 2)) {
      if (ex.visual?.type !== 'numberLine') throw new Error('numberLine');
      const f = fieldValues(ex);
      expect([f.a, f.b]).toEqual(ex.visual.marks?.map((m) => m.value));
      expect(f.a).not.toBe(f.b);
    }
    for (const { ex, form, num } of items(zahlengeradeSkill, 1, 3)) {
      const v = answerValue(ex) as number;
      expect(Math.abs(v)).toBeLessThanOrEqual(10);
      expect(v).toBe(form === 'schritte' ? num[0] - num[1] : num[0]);
    }
  });

  it('Stufe 2: places tens on −100 to 100', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const { ex, form, num } of items(zahlengeradeSkill, 2, ab)) {
        const v = answerValue(ex) as number;
        expect(Math.abs(v) % 10).toBe(0);
        expect(Math.abs(v)).toBeLessThanOrEqual(100);
        if (ex.answer.kind === 'numberline') {
          expect([ex.answer.min, ex.answer.max, ex.answer.step]).toEqual([-100, 100, 10]);
          expect(ex.answer.arrows).toBe('both');
        }
        if (form === 'gehen') expect(v).toBe(num[0] - num[1]);
        if (form === 'mitte') expect(v).toBe((num[0] + num[1]) / 2);
      }
    }
  });

  it('Stufe 3: a section without zero, or a scale to choose', () => {
    for (const { ex } of items(zahlengeradeSkill, 3, 1)) {
      if (ex.answer.kind !== 'numberline') throw new Error('numberline');
      expect(ex.answer.max).toBeLessThan(0);
      expect(ex.prompt).toContain('fehlt die 0');
    }
    for (const { ex } of items(zahlengeradeSkill, 3, 2)) {
      if (ex.visual?.type !== 'numberLine') throw new Error('numberLine');
      expect(ex.visual.max).toBeLessThan(0);
      expect(answerValue(ex)).toBe(ex.visual.marks?.[0].value);
    }
    for (const { ex, form, num } of items(zahlengeradeSkill, 3, 3)) {
      if (form === 'abschnitt') {
        const [min, max, sections] = num;
        expect(answerValue(ex)).toBe((max - min) / sections);
        continue;
      }
      expect(form).toBe('skala');
      const [a, b, c] = num;
      const m = /von (\S+) bis (\S+), ein Strich zählt (\d+)/.exec(correctLabel(ex));
      if (!m) throw new Error(correctLabel(ex));
      const [lo, hi, step] = [m[1], m[2], m[3]].map((t) => Number(t.replace('−', '-')));
      for (const v of [a, b, c]) {
        expect(v).toBeGreaterThanOrEqual(lo);
        expect(v).toBeLessThanOrEqual(hi);
        expect((v - lo) % step).toBe(0);
      }
      expect((hi - lo) / step).toBeLessThanOrEqual(20);
    }
  });

  it('a scale to choose: only the right one holds all three numbers on at most 20 ticks', () => {
    for (const { ex, form, num } of items(zahlengeradeSkill, 3, 3, 3000)) {
      if (form !== 'skala') continue;
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      ex.answer.options.forEach((o, i) => {
        const m = /von (\S+) bis (\S+), ein Strich zählt (\d+)/.exec(o.label);
        if (!m) throw new Error(o.label);
        const [lo, hi, step] = [m[1], m[2], m[3]].map((t) => Number(t.replace('−', '-')));
        const holds = num.every((v) => v >= lo && v <= hi && (v - lo) % step === 0);
        const ticks = (hi - lo) / step + 1;
        expect(holds && ticks <= 20, `${ex.key}: ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct);
      });
    }
  });

  it('the count of ticks fits the number 1', () => {
    const first = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3) => items(zahlengeradeSkill, stufe, ab, 400).map(({ ex }) => ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).join(' '));
    const texts = [...first(1, 1), ...first(2, 1), ...first(3, 1)];
    expect(texts.some((t) => /\b1 Strich\b/.test(t))).toBe(true);
    expect(texts.some((t) => /(?<!\d)1 Striche/.test(t))).toBe(false);
  });

  it('srText says what the picture holds: the ends of the line and each arrow, never the value to read off', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const { ex } of items(zahlengeradeSkill, stufe, ab, 200)) {
          expect(pictureNotSaid(ex)).toEqual([]);
          const v = answerValue(ex);
          const read = ex.visual?.type === 'numberLine' && !!ex.visual.marks?.length && ex.answer.kind === 'number';
          if (read && v !== null && v < 0 && !ex.srText.includes('genau bei') && !ex.key.includes(':schritte:')) {
            expect(ex.srText, ex.key).not.toMatch(new RegExp(`minus ${-v}(?!\\d)`));
          }
        }
      }
    }
    const walk = items(zahlengeradeSkill, 1, 3, 200).find(({ form }) => form === 'schritte');
    expect(walk?.ex.srText).toContain('Pfeil A');
    const tick = items(zahlengeradeSkill, 3, 3, 200).find(({ form }) => form === 'abschnitt');
    expect(tick?.ex.srText).toContain('Beschriftet sind nur');
  });

  it('no line calculates with signs under integersAsStates (§2.5)', () => expect(calculatingLines(zahlengeradeSkill)).toEqual([]));
});
