import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import type { Exercise } from '../../core/types';
import { punktVorStrichSkill as skill } from './punkt-vor-strich';
import { ABS, firstStepOption, items, rightLabel, stepProblems, stepTexts, strategyQuestion, termValue } from './test-helpers';

describeSkill(skill);

const signs = (term: string) => (term.match(/ [+−·:] /g) ?? []).length;
const termOf = (expression: string) => expression.split(' = ')[0];
const startsWithPunkt = (ex: Exercise) => /^(\d+|□) [·:] /.test(ex.expression ?? '');
/** The strategy "always the sign on the right first": a op (b op c). */
const rightSignFirst = (term: string) => {
  const [a, op, b, op2, c] = term.split(' ');
  return termValue(`${a} ${op} (${b} ${op2} ${c})`);
};

describe('rechnen.punkt-vor-strich', () => {
  it('Stufe 1: two operations, values up to 100; the answer recomputes', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 1, ab)) {
        if (ex.answer.kind !== 'number' || !ex.expression) throw new Error(ex.key);
        const term = termOf(ex.expression);
        expect(signs(term), ex.key).toBe(2);
        expect(termValue(term), ex.key).toBe(ex.answer.value);
        expect(ex.answer.value!, ex.key).toBeLessThanOrEqual(100);
      }
    }
  });

  it('Stufe 1, AB III: the gap fills the equation, or the option says the value of the term', () => {
    for (const ex of items(skill, 1, 3)) {
      if (!ex.expression) throw new Error(ex.key);
      const [left, right] = ex.expression.split(' = ');
      if (ex.answer.kind === 'number') {
        expect(termValue(left.replace('□', String(ex.answer.value))), ex.key).toBe(Number(right));
        expect(Number(right), ex.key).toBeLessThanOrEqual(100);
      } else {
        // the claim can hold: then only "Ja" is right
        const holds = Number(right) === termValue(left);
        expect(rightLabel(ex), ex.key).toContain(holds ? `Ja, ${right} stimmt.` : `richtig ist ${termValue(left)}.`);
      }
    }
  });

  it('Stufe 2: three operations; the first step is the Punktrechnung; the fields follow the steps', () => {
    const kinds = new Set<string>();
    for (const ab of ABS) {
      for (const ex of items(skill, 2, ab)) {
        kinds.add(ex.answer.kind);
        if (ex.answer.kind === 'number' && ex.expression) {
          expect(signs(termOf(ex.expression)), ex.key).toBe(3);
          expect(termValue(termOf(ex.expression)), ex.key).toBe(ex.answer.value);
        } else if (ex.answer.kind === 'multi' && ex.expression) {
          expect(signs(ex.expression), ex.key).toBe(3);
          expect(ex.answer.fields.at(-1)?.value, ex.key).toBe(termValue(ex.expression));
        } else if (ex.answer.kind === 'choice' && ex.expression) {
          const right = firstStepOption(rightLabel(ex));
          expect(right.step, ex.key).toMatch(/[·:]/);
          expect(ex.expression, ex.key).toContain(right.step);
          expect(right.value, ex.key).toBe(termValue(ex.expression));
        }
      }
    }
    expect([...kinds].sort()).toEqual(['choice', 'multi', 'number']);
  });

  it('Stufe 2, AB II: the first step alone is no task: the Punkt comes twice, and only the calculation decides', () => {
    let chosen = 0;
    for (const ex of items(skill, 2, 2, 400)) {
      if (ex.answer.kind !== 'choice' || !ex.expression) continue;
      chosen++;
      const value = termValue(ex.expression);
      const options = ex.answer.options.map((o) => firstStepOption(o.label));
      const right = firstStepOption(rightLabel(ex));
      expect(options.filter((o) => o.step === right.step).map((o) => o.value === value).sort(), ex.key).toEqual([false, true]);
      // no value repeats, so that no option stands out by its value
      expect(new Set(options.map((o) => o.value)).size, ex.key).toBe(options.length);
    }
    expect(chosen).toBeGreaterThan(100);
  });

  it('T7: no strategy question stands in front of a field that wants the result', () => {
    for (const stufe of [1, 2, 3] as const) for (const ab of ABS) for (const ex of items(skill, stufe, ab, 60)) expect(strategyQuestion(ex), `${ex.key}: ${ex.prompt}`).toBe(false);
  });

  it('Stufe 2, finding the step: the marked line pair is the first one that breaks the value', () => {
    let found = 0;
    for (const ex of items(skill, 2, 3, 200)) {
      if (ex.visual?.type !== 'term' || ex.answer.kind !== 'choice') continue;
      found++;
      const values = ex.visual.lines.map(termValue);
      const firstOff = values.findIndex((v) => v !== values[0]);
      expect(rightLabel(ex), ex.key).toBe(`Von Zeile ${firstOff} zu Zeile ${firstOff + 1}`);
    }
    expect(found).toBeGreaterThan(30);
  });

  it('Stufe 3: exactly one option of signs reaches the target, and the signs in the task stay', () => {
    for (const ab of ABS) {
      for (const ex of items(skill, 3, ab)) {
        if (ex.answer.kind !== 'choice' || !ex.expression) throw new Error(ex.key);
        const [shown, target] = ex.expression.split(' = ');
        expect((shown.match(/□/g) ?? []).length, ex.key).toBe(ab === 1 ? 1 : ab === 2 ? 2 : 3);
        // exactly, by the evaluator of the tests: a step below 0 or with a Rest can reach the target too
        const reaching = ex.answer.options.filter((o) => Math.abs(termValue(o.label) - Number(target)) < 1e-9);
        expect(reaching.map((o) => o.label), ex.key).toEqual([rightLabel(ex)]);
        const pattern = new RegExp(`^${shown.replace(/[+·:]/g, (c) => `\\${c}`).replace(/□/g, '[+−·:]')}$`);
        ex.answer.options.forEach((o) => expect(o.label, ex.key).toMatch(pattern));
      }
    }
  });

  it('Stufe 3: a second term that reaches the target exactly (below 0 or with a Rest on the way) is never a wrong option', () => {
    for (const ab of ABS) {
      for (const ex of items(skill, 3, ab, 2500)) {
        if (ex.answer.kind !== 'choice' || !ex.expression) throw new Error(ex.key);
        const target = Number(ex.expression.split(' = ')[1]);
        ex.answer.options.forEach((o, i) => {
          const res = checkAnswer(ex.answer, { kind: 'choice', index: i }, ex.bugs);
          expect(res.correct, `${ex.key}: ${o.label}`).toBe(Math.abs(termValue(o.label) - target) < 1e-9);
        });
      }
    }
  });

  it('Stufe 3: no hint names a sign, and the hint fits one gap as well as more', () => {
    for (const ab of ABS) {
      for (const ex of items(skill, 3, ab)) {
        for (const hint of ex.hints) {
          expect(hint, ex.key).not.toMatch(/\b(Plus|Minus|Mal|Geteilt)\b/);
          expect(hint, ex.key).not.toContain('in einer Lücke');
        }
      }
    }
  });

  it('Stufe 1: the Punkt also stands in front, so "the sign on the right first" does not work', () => {
    for (const ab of [1, 2] as const) {
      const all = items(skill, 1, ab, 300);
      const front = all.filter(startsWithPunkt);
      expect(front.length, `AB ${ab}`).toBeGreaterThan(50);
      expect(all.length - front.length, `AB ${ab}`).toBeGreaterThan(50);
      let telling = 0;
      for (const ex of front) {
        const term = termOf(ex.expression!);
        if (ex.answer.kind !== 'number') throw new Error(ex.key);
        if (rightSignFirst(term) !== ex.answer.value) telling++;
        const bug = ex.bugs?.find((b) => b.id === 'strich-zuerst');
        if (bug) expect(bug.match, ex.key).toBe(rightSignFirst(term));
      }
      expect(telling, `AB ${ab}`).toBe(front.length);
    }
    const reasoning = items(skill, 1, 3, 300);
    expect(reasoning.filter((ex) => ex.answer.kind === 'number' && startsWithPunkt(ex)).length).toBeGreaterThan(30);
    expect(reasoning.filter((ex) => ex.answer.kind === 'choice' && startsWithPunkt(ex)).length).toBeGreaterThan(20);
  });

  it('Stufe 1, AB III: judging a calculation has no fixed answer', () => {
    const judged = items(skill, 1, 3, 400).filter((ex) => ex.answer.kind === 'choice');
    const places = new Set(judged.map((ex) => (ex.answer.kind === 'choice' ? ex.answer.correct : -1)));
    expect([...places].sort()).toEqual([0, 1, 2]);
    expect(judged.filter((ex) => rightLabel(ex).startsWith('Ja')).length).toBeGreaterThan(30);
    expect(judged.filter((ex) => rightLabel(ex).startsWith('Nein')).length).toBeGreaterThan(30);
  });

  it('the wrong order: the bug is the value from left to right', () => {
    for (const ex of items(skill, 1, 1)) {
      if (!ex.expression) throw new Error(ex.key);
      const bug = ex.bugs?.find((b) => b.id === 'links-nach-rechts');
      if (!bug) continue;
      const [x, op1, y, op2, z] = termOf(ex.expression).split(' ');
      const first = op1 === '+' ? Number(x) + Number(y) : Number(x) * Number(y);
      expect(bug.match, ex.key).toBe(op2 === '·' ? first * Number(z) : first + Number(z));
    }
  });

  it('every arithmetic line of the worked steps holds, and the last one states the result', () => {
    for (const ab of ABS) {
      for (const stufe of [1, 2, 3] as const) {
        for (const ex of items(skill, stufe, ab, 80)) {
          expect(stepProblems(ex)).toEqual([]);
          if (ex.answer.kind === 'number' && stufe > 1) expect(stepTexts(ex).at(-1), ex.key).toContain(String(ex.answer.value));
          if (ex.answer.kind === 'multi') expect(stepTexts(ex).at(-1), ex.key).toContain(String(ex.answer.fields.at(-1)?.value));
        }
      }
    }
  });
});
