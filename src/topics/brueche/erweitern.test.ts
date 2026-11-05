import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { erweiternSkill } from './erweitern';
import { gcd } from './helpers';
import { everyItem, fractionsIn, items, sameTaskTwoKeys } from './test-helpers';

describeSkill(erweiternSkill);

const fractionOf = (ex: { answer: unknown }) => ex.answer as { numerator: number; denominator: number; accept: string };

describe('brueche.erweitern specifics', () => {
  it('worked steps calculate correctly', () => {
    for (const ex of everyItem(erweiternSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('Stufe 1: multiplied by the given number, exact', () => {
    for (const ex of items(erweiternSkill, 1, 1)) {
      const [[n, d]] = fractionsIn(ex.prompt);
      const k = Number(/mit (\d+)\.$/.exec(ex.prompt)![1]);
      expect(fractionOf(ex)).toMatchObject({ numerator: n * k, denominator: d * k, accept: 'exact' });
    }
  });

  it('Stufe 1, picture: the finer lines give the fraction', () => {
    for (const ex of items(erweiternSkill, 1, 2)) {
      if (ex.visual?.type !== 'fractionModel') throw new Error('picture');
      const k = ex.visual.refineTo! / ex.visual.parts;
      expect(fractionOf(ex)).toMatchObject({ numerator: ex.visual.filled * k, denominator: ex.visual.refineTo });
    }
  });

  it('the factor recomputes from the expression', () => {
    for (const ex of items(erweiternSkill, 1, 3)) {
      const [[a, b], [c, d]] = fractionsIn(ex.expression!);
      expect(ex.answer.kind === 'number' && ex.answer.value).toBe(c / a);
      expect(d / b).toBe(c / a);
    }
  });

  it('Stufe 2: divided by the given number; a given Nenner or Zähler keeps the value', () => {
    for (const ex of items(erweiternSkill, 2, 1)) {
      const [[n, d]] = fractionsIn(ex.prompt);
      const k = Number(/mit (\d+)\.$/.exec(ex.prompt)![1]);
      expect(fractionOf(ex)).toMatchObject({ numerator: n / k, denominator: d / k });
    }
    for (const ex of items(erweiternSkill, 2, 2)) {
      const [[n, d]] = fractionsIn(ex.prompt);
      const a = fractionOf(ex);
      expect(a.numerator * d).toBe(n * a.denominator);
      const given = Number(/dem (?:Nenner|Zähler) (\d+)\.$/.exec(ex.prompt)![1]);
      expect(ex.prompt.includes('Nenner') ? a.denominator : a.numerator).toBe(given);
    }
  });

  it('Stufe 3: vollständig kürzen ends in lowest terms, with the same value', () => {
    for (const ex of items(erweiternSkill, 3, 1)) {
      const [[n, d]] = fractionsIn(ex.prompt);
      const a = fractionOf(ex);
      expect(a.accept).toBe('lowest');
      expect(gcd(a.numerator, a.denominator)).toBe(1);
      expect(a.numerator * d).toBe(n * a.denominator);
    }
  });

  it('Stufe 3: exactly one option has the value, or exactly one differs', () => {
    for (const ex of items(erweiternSkill, 3, 2)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [[n, d]] = fractionsIn(ex.prompt);
      const same = ex.answer.options.map((o, i) => [fractionsIn(o.label)[0], i] as const).filter(([[x, y]]) => x * d === n * y);
      expect(same.map(([, i]) => i)).toEqual([ex.answer.correct]);
    }
    for (const ex of items(erweiternSkill, 3, 3)) {
      if (ex.answer.kind !== 'choice') continue;
      const correct = ex.answer.correct;
      const values = ex.answer.options.map((o) => fractionsIn(o.label)[0]);
      const others = values.filter((_, i) => i !== correct);
      for (const [x, y] of others) expect(x * others[0][1]).toBe(others[0][0] * y);
      expect(values[correct][0] * others[0][1]).not.toBe(others[0][0] * values[correct][1]);
    }
  });

  it('a hint for the factor never has the answer as its own calculation', () => {
    for (const [stufe, ab] of [[1, 3], [2, 3]] as const) {
      for (const ex of items(erweiternSkill, stufe, ab)) {
        for (const hint of ex.hints) expect(hint, ex.key).not.toMatch(/Rechne: 1 · \?|: 1 = \?/);
      }
    }
  });

  it('a text about an option holds for the fraction shown', () => {
    for (const ex of items(erweiternSkill, 3, 2)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [[n, d]] = fractionsIn(ex.prompt);
      for (const o of ex.answer.options) {
        const [[x, y]] = fractionsIn(o.label);
        if (o.whyWrong?.includes('nur der Zähler')) {
          expect(y, ex.prompt + o.label).toBe(d);
          expect(x).not.toBe(n);
        }
        if (o.whyWrong?.includes('nur der Nenner')) {
          expect(x, ex.prompt + o.label).toBe(n);
          expect(y).not.toBe(d);
        }
      }
    }
  });

  it('a step never reduces a fraction to itself', () => {
    for (const ex of items(erweiternSkill, 3, 2).concat(items(erweiternSkill, 3, 3))) {
      for (const step of ex.steps) {
        const text = typeof step === 'string' ? step : step.text;
        const m = /(\{frac:[^}]+\}) (?:ist gekürzt(?: auch)?|hat gekürzt die Form) (\{frac:[^}]+\})/.exec(text);
        if (m) expect(m[1], text).not.toBe(m[2]);
      }
    }
  });

  it('a task that looks the same has one key, so a round never shows it twice', () => {
    expect(sameTaskTwoKeys(erweiternSkill)).toEqual([]);
  });

  it('vollständig kürzen goes step by step, as the hints say, with no ggT', () => {
    for (const ab of [1, 3] as const) {
      for (const ex of items(erweiternSkill, 3, ab, 300)) {
        if (!ex.prompt.includes('vollständig')) continue;
        const lines = ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
        for (const line of lines) expect(line, ex.prompt).not.toMatch(/größte|ggT/i);
        // each line divides the fraction of the line before by a factor that divides both parts, down to the answer
        let [n, d] = fractionsIn(ex.prompt)[0];
        for (const line of lines.slice(0, -1)) {
          const m = /^Kürze mit (\d+): /.exec(line)!;
          const k = Number(m[1]);
          const [[fromN, fromD], [toN, toD]] = fractionsIn(line);
          expect([fromN, fromD], line).toEqual([n, d]);
          expect([toN, toD], line).toEqual([n / k, d / k]);
          [n, d] = [toN, toD];
        }
        const a = fractionOf(ex);
        expect([n, d], ex.prompt).toEqual([a.numerator, a.denominator]);
      }
    }
  });
});
