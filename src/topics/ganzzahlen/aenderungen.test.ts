import { describe, expect, it } from 'vitest';
import { fmtTemp, toSpeech } from '../../core/format';
import { describeSkill } from '../../core/testing';
import { RANGE_DEFAULTS } from '../../data/profiles';
import { createRng } from '../../core/rng';
import { CTX } from '../test-utils';
import type { Ab, Stufe } from '../../core/types';
import { aenderungenSkill } from './aenderungen';
import { answerValue, checkAll, items } from './checks';
import type { Exercise } from '../../core/types';

describeSkill(aenderungenSkill);

describe('ganzzahlen.aenderungen', () => {
  it('worked steps add up and state the result', () => checkAll(aenderungenSkill));

  it('Stufe 1 stays on one side of the 0', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex, num } of items(aenderungenSkill, 1, ab)) {
        const [a, d] = num;
        expect(answerValue(ex)).toBe(a + d);
        expect(a * (a + d)).toBeGreaterThan(0);
      }
    }
    for (const { ex, num } of items(aenderungenSkill, 1, 3)) {
      const [a, d] = num;
      expect(answerValue(ex)).toBe(a);
      expect(a * (a + d)).toBeGreaterThan(0);
    }
  });

  it('Stufe 2 crosses the 0', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex, num } of items(aenderungenSkill, 2, ab)) {
        const [a, d] = num;
        expect(answerValue(ex)).toBe(a + d);
        expect(a * (a + d)).toBeLessThan(0);
      }
    }
    for (const { ex, form, num } of items(aenderungenSkill, 2, 3)) {
      if (form === 'zwei') {
        const [a, up, down] = num;
        expect(answerValue(ex)).toBe(a + up - down);
        expect(a + up).toBeGreaterThan(0);
        expect(a + up - down).toBeLessThan(0);
      } else {
        const [a, d] = num;
        expect(answerValue(ex)).toBe(a);
        expect(a * (a + d)).toBeLessThan(0);
      }
    }
  });

  it('Stufe 3 AB I crosses the 0 and asks for the change: it is harder than Stufe 2 AB I', () => {
    for (const { ex, num } of items(aenderungenSkill, 3, 1, 500)) {
      expect(num[0] * num[1], ex.key).toBeLessThan(0);
      if (ex.visual?.type !== 'thermometer') throw new Error('thermometer');
      expect(answerValue(ex), ex.key).toBe(Math.abs(num[1] - num[0]));
    }
  });

  it('the task never draws an arrow, as its head would stand on the answer; the worked step does', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const { ex } of items(aenderungenSkill, stufe, ab, 300)) {
          if (ex.visual?.type === 'thermometer') expect(ex.visual.change, ex.key).toBeUndefined();
        }
      }
    }
    for (const stufe of [1, 2] as Stufe[]) {
      for (const { ex, num } of items(aenderungenSkill, stufe, 1)) {
        const first = ex.steps[0];
        if (typeof first === 'string' || first.visual?.type !== 'thermometer') throw new Error('thermometer');
        expect(first.visual.change, ex.key).toBe(num[1]);
      }
    }
  });

  it('temperatures are believable: no state over 18 Grad from a thermometer form, no change of a day over 20 Grad', () => {
    for (const stufe of [1, 2] as const) {
      for (const ab of [1, 2] as const) {
        for (const { ex, form, num } of items(aenderungenSkill, stufe, ab, 800)) {
          if (form !== 'nah' && form !== 'weit') continue;
          expect(Math.abs(num[0] + num[1]), ex.key).toBeLessThanOrEqual(18);
          expect(Math.abs(num[1]), ex.key).toBeLessThanOrEqual(20);
        }
      }
    }
    for (const { ex, p } of items(aenderungenSkill, 3, 2, 800)) {
      const [a, e] = [Number(p[1]), Number(p[2])];
      if (p[0] === 'c') {
        expect(Math.abs(e - a), ex.key).toBeLessThanOrEqual(20);
      } else {
        expect(Math.min(a, e), ex.key).toBeGreaterThanOrEqual(-20);
      }
    }
  });

  it('a thermometer fits a phone: at most 30 ticks, the states on ticks, the labels on round values', () => {
    const shown = (ex: Exercise) => [ex.visual, ...ex.steps.map((s) => (typeof s === 'string' ? undefined : s.visual))];
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const { ex } of items(aenderungenSkill, stufe, ab, 400)) {
          for (const v of shown(ex)) {
            if (v?.type !== 'thermometer') continue;
            const count = (v.max - v.min) / v.step;
            expect(count, ex.key).toBeLessThanOrEqual(30);
            expect((v.value - v.min) % v.step, ex.key).toBe(0);
            // the rule of ThermometerVisual: every tick, every 2nd or every 5th from the lower end
            const every = count <= 15 ? 1 : count <= 21 ? 2 : 5;
            expect(Math.abs((v.min / v.step) % every), ex.key).toBe(0);
          }
        }
      }
    }
  });

  it('the table fits a phone without sideways scrolling: one row per day, with every temperature also in srText', () => {
    const tables = items(aenderungenSkill, 3, 3, 300).filter(({ form }) => form === 'tabelle');
    expect(tables.length).toBeGreaterThan(0);
    for (const { ex, num } of tables) {
      if (ex.visual?.type !== 'table') throw new Error('table');
      expect(ex.visual.header, ex.key).toEqual(['Tag', 'Temperatur']);
      expect(ex.visual.rows.map((r) => r[1]), ex.key).toEqual(num.map((t) => fmtTemp(t)));
      for (const t of num) expect(ex.srText, ex.key).toContain(toSpeech(fmtTemp(t)));
    }
  });

  it('Stufe 3 finds the change', () => {
    for (const { ex, num } of items(aenderungenSkill, 3, 1)) expect(answerValue(ex)).toBe(Math.abs(num[1] - num[0]));
    for (const { ex, p } of items(aenderungenSkill, 3, 2)) expect(answerValue(ex)).toBe(Number(p[2]) - Number(p[1]));
    for (const { ex, form, num } of items(aenderungenSkill, 3, 3)) {
      if (form === 'gipfel') {
        expect(answerValue(ex)).toBe(num[0] + num[1]);
      } else {
        const changes = num.slice(1).map((t, i) => Math.abs(t - num[i]));
        const top = Math.max(...changes);
        expect(answerValue(ex)).toBe(top);
        expect(changes.filter((c) => c === top)).toHaveLength(1);
      }
    }
  });

  it('integers stay states and changes under integersAsStates: no calculating line with signs (§2.5)', () => {
    const ctx = { ...CTX, ranges: RANGE_DEFAULTS.bruch };
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (let seed = 1; seed <= 80; seed++) {
          const ex = aenderungenSkill.generate(createRng(seed * 31 + stufe + ab), stufe, { ...ctx, ab });
          const text = ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).join(' ');
          expect(text, ex.key).not.toContain('Rechnung');
          expect(text, ex.key).not.toContain('(−');
        }
      }
    }
    // the other profiles do show it
    const shown = items(aenderungenSkill, 2, 1).some(({ ex }) => ex.steps.some((s) => typeof s === 'string' && s.includes('Rechnung')));
    expect(shown).toBe(true);
  });
});
