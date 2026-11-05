import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { BOX, keepTermsTogether } from '../../core/format';
import { answerValue, checkAll, correctLabel, evalTerm, items } from './checks';
import { fmt } from '../../core/format';
import { malgeteiltSkill } from './malgeteilt';

describeSkill(malgeteiltSkill);

const fill = (expression: string, value: number) => expression.replace(BOX, value < 0 ? `(−${-value})` : String(value));

function balanced(expression: string, value: number): boolean {
  const [left, right] = fill(expression, value).split(' = ');
  return evalTerm(left) === evalTerm(right);
}

describe('ganzzahlen.malgeteilt', () => {
  it('worked steps add up and state the result', () => checkAll(malgeteiltSkill));

  it('Stufe 1: a positive number times a negative one', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex } of items(malgeteiltSkill, 1, ab)) {
        const v = answerValue(ex) as number;
        expect(v).toBeLessThan(0);
        expect(balanced(ex.expression as string, v), ex.key).toBe(true);
      }
    }
    for (const { ex, form, num } of items(malgeteiltSkill, 1, 3)) {
      if (form === 'geschichte') expect(answerValue(ex)).toBe(-num[0] * num[1]);
      else expect(balanced(ex.expression as string, answerValue(ex) as number), ex.key).toBe(true);
    }
  });

  it('Stufe 2: the rules, with whole results up to 100', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex } of items(malgeteiltSkill, 2, ab)) {
        const v = answerValue(ex) as number;
        expect(Number.isInteger(v)).toBe(true);
        expect(Math.abs(v)).toBeLessThanOrEqual(100);
        expect(balanced(ex.expression as string, v), ex.key).toBe(true);
        expect(ex.expression).toMatch(/\(−/);
      }
    }
    for (const { ex, form, p, num } of items(malgeteiltSkill, 2, 3)) {
      if (form === 'ergebnis') {
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        const target = evalTerm(correctLabel(ex));
        expect(ex.prompt).toContain(`Ergebnis ${fmt(target as number)}?`);
        expect(target).toBe(p[0] === 'm' ? num[1] * num[2] : num[1] / num[2]);
        expect(ex.answer.options.filter((o) => evalTerm(o.label) === target)).toHaveLength(1);
      } else {
        expect(balanced(ex.expression as string, answerValue(ex) as number), ex.key).toBe(true);
      }
    }
  });

  it('Stufe 2 stays inside "bis 100" at every AB, in the options too', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const { ex } of items(malgeteiltSkill, 2, ab, 1500)) {
        const options = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : [];
        for (const text of [ex.expression ?? '', ex.prompt, ...options]) {
          for (const n of text.match(/\d+/g) ?? []) expect(Number(n), ex.key).toBeLessThanOrEqual(100);
        }
        for (const o of options) expect(Math.abs(evalTerm(o) as number), ex.key).toBeLessThanOrEqual(100);
      }
    }
  });

  it('Stufe 1: the walk lands on ticks, and a tick is one jump', () => {
    for (const { ex } of items(malgeteiltSkill, 1, 1, 500)) {
      const walk = ex.steps[1];
      if (typeof walk === 'string' || walk.visual?.type !== 'numberLine') throw new Error('numberLine');
      const { min, minorStep, jumps } = walk.visual;
      for (const j of jumps ?? []) {
        expect((j.to - min) % minorStep, ex.key).toBe(0);
        expect(Math.abs(j.to - j.from), ex.key).toBe(minorStep);
      }
    }
  });

  it('a day\'s falling temperature stays within 20 Grad', () => {
    for (const { ex, form, num } of items(malgeteiltSkill, 1, 3, 500)) {
      if (form === 'geschichte') expect(num[0] * num[1], ex.key).toBeLessThanOrEqual(20);
    }
  });

  it('a long product may break between factors, never inside one', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex } of items(malgeteiltSkill, 3, ab, 500)) {
        // at 375 px about 24 characters fit on a line
        for (const piece of keepTermsTogether(ex.expression as string).split(' ')) expect(piece.length, ex.key).toBeLessThanOrEqual(14);
      }
    }
  });

  it('spoken terms are separate sentences', () => {
    const pattern = items(malgeteiltSkill, 3, 3, 300).find(({ form }) => form === 'muster');
    expect(pattern?.ex.srText).toMatch(/gleich (minus )?\d+\. /);
  });

  it('Stufe 3: the sign of a long product follows from the negative factors', () => {
    for (const { ex, num } of items(malgeteiltSkill, 3, 1)) {
      expect(num.length).toBeGreaterThanOrEqual(5);
      expect(correctLabel(ex)).toBe(num.filter((v) => v < 0).length % 2 === 0 ? 'positiv' : 'negativ');
    }
    for (const { ex, num } of items(malgeteiltSkill, 3, 2)) {
      expect(answerValue(ex)).toBe(num.reduce((p, v) => p * v, 1));
      expect(evalTerm((ex.expression as string).split(' = ')[0])).toBe(answerValue(ex));
    }
    for (const { ex, form, num } of items(malgeteiltSkill, 3, 3)) {
      if (ex.visual?.type !== 'term') throw new Error('term');
      const lines = ex.visual.lines;
      for (const line of lines.slice(0, -1)) {
        const [left, right] = line.split(' = ');
        expect(evalTerm(left)).toEqual(evalTerm(right) === 0 ? expect.closeTo(0) : evalTerm(right));
      }
      if (form === 'muster') expect(answerValue(ex)).toBe(-num[1] * num[0]);
    }
  });

  it('never a catchphrase as a rule (§7.2)', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const { ex } of items(malgeteiltSkill, stufe, 2)) {
        for (const h of ex.hints) expect(h).not.toMatch(/minus mal minus|aus minus wird plus/i);
      }
    }
  });

  it('Stufe 1 stays positive times negative, also on AB II: the worked steps solve the term of the task', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex } of items(malgeteiltSkill, 1, ab, 800)) {
        expect(ex.expression, ex.key).toMatch(/^\d+ · \(−\d+\) = /);
        const shown = ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).join(' ');
        expect(shown, ex.key).toContain((ex.expression as string).split(' = ')[0]);
      }
    }
  });

  it('Stufe 2 goes beyond Stufe 1: a multiplication never has the form positive times negative', () => {
    for (const { ex } of items(malgeteiltSkill, 2, 1, 800)) expect(ex.expression, ex.key).toMatch(/^\(−\d+\) · /);
    const missing = items(malgeteiltSkill, 2, 3, 800).filter(({ form, p }) => form === 'luecke' && p[0] === 'm');
    expect(missing.length).toBeGreaterThan(0);
    for (const { ex } of missing) expect(ex.expression, ex.key).toMatch(/^\(−\d+\) · /);
    // and the rule for two negative factors really comes up
    expect(items(malgeteiltSkill, 2, 1, 300).some(({ ex }) => (answerValue(ex) as number) > 0)).toBe(true);
  });
});
