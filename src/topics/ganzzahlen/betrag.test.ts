import { describe, expect, it } from 'vitest';
import { fmt } from '../../core/format';
import { describeSkill } from '../../core/testing';
import { betragSkill } from './betrag';
import { answerValue, checkAll, correctLabel, fieldValues, items } from './checks';

describeSkill(betragSkill);

const parse = (t: string) => Number(t.replace('−', '-'));

describe('ganzzahlen.betrag', () => {
  it('worked steps add up and state the result', () => checkAll(betragSkill));

  it('Stufe 1 finds the Gegenzahl', () => {
    for (const { ex, num } of items(betragSkill, 1, 1)) expect(answerValue(ex)).toBe(-num[0]);
    for (const { ex, num } of items(betragSkill, 1, 2)) expect(fieldValues(ex)).toEqual({ a: -num[0], b: -num[1] });
    for (const { ex, num } of items(betragSkill, 1, 3)) expect(answerValue(ex)).toBe(num[0] / 2);
  });

  it('Stufe 2 reads the Betrag as a distance', () => {
    for (const { ex, num } of items(betragSkill, 2, 1)) expect(answerValue(ex)).toBe(Math.abs(num[0]));
    for (const { ex, form, num } of items(betragSkill, 2, 2)) {
      if (form === 'entfernt') expect(answerValue(ex)).toBe(Math.abs(num[0]));
      else expect(Math.abs(parse(correctLabel(ex)))).toBe(Math.max(Math.abs(num[0]), Math.abs(num[1])));
    }
    for (const { ex } of items(betragSkill, 2, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const row = (label: string) => label.split(', ').map((t) => Math.abs(parse(t)));
      const inOrder = row(correctLabel(ex));
      expect(inOrder).toEqual([...inOrder].sort((x, y) => x - y));
      ex.answer.options.forEach((o, i) => {
        const sizes = row(o.label);
        expect(sizes.every((s, k) => k === 0 || sizes[k - 1] < s), o.label).toBe(i === (ex.answer as { correct: number }).correct);
      });
    }
  });

  it('numbers ordered by their Betrag are never joined with < or >: −8 < 9 < −14 is false', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const { ex } of items(betragSkill, stufe, ab)) {
          expect(ex.answer.kind, ex.key).not.toBe('order');
          for (const s of ex.steps) expect(typeof s === 'string' ? s : s.text, ex.key).not.toMatch(/\d [<>] /);
        }
      }
    }
  });

  it('Stufe 3: two numbers have one Betrag, and the counterexample breaks the claim', () => {
    for (const { ex, num } of items(betragSkill, 3, 1)) expect(fieldValues(ex)).toEqual({ neg: -num[0], pos: num[0] });
    for (const { ex, form, num, p } of items(betragSkill, 3, 2)) {
      if (form === 'auseinander') expect(answerValue(ex)).toBe(2 * num[0]);
      else expect(answerValue(ex)).toBe(p[2] === 'p' ? num[0] : -num[0]);
    }
    const holds: Record<string, (v: number) => boolean> = {
      groesser: (v) => Math.abs(v) > v,
      gegenzahl: (v) => -v < 0,
      kleiner: (v) => -v < v,
    };
    for (const { ex, p } of items(betragSkill, 3, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const claim = holds[p[0]];
      ex.answer.options.forEach((o, i) => expect(claim(parse(o.label)), o.label).toBe(i !== (ex.answer as { correct: number }).correct));
    }
  });

  it('"which has the bigger Betrag": the place in the task says nothing', () => {
    const shown = items(betragSkill, 2, 2, 1500).filter(({ form }) => form === 'groesserer');
    const first = shown.filter(({ num }) => Math.abs(num[0]) > Math.abs(num[1])).length;
    expect(first / shown.length).toBeGreaterThan(0.35);
    expect(first / shown.length).toBeLessThan(0.65);
    // the worked step reads in the same order as the task
    for (const { ex, num } of shown) expect(ex.steps[0], ex.key).toContain(`|${fmt(num[0])}|`);
  });
});
