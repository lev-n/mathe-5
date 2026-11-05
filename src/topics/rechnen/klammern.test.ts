import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { fmt } from '../../core/format';
import { klammernSkill as skill } from './klammern';
import { ABS, firstStepOption, items, rightLabel, stepProblems, stepTexts, strategyQuestion, termValue } from './test-helpers';

describeSkill(skill);

const brackets = (t: string) => (t.match(/\(/g) ?? []).length;
const deepest = (t: string) => {
  let depth = 0;
  let max = 0;
  for (const c of t) {
    if (c === '(') max = Math.max(max, ++depth);
    if (c === ')') depth--;
  }
  return max;
};
const termOf = (expression: string) => expression.split(' = ')[0];

describe('rechnen.klammern', () => {
  it('Stufe 1: one bracket and one more sign; the answer recomputes', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 1, ab)) {
        if (ex.answer.kind !== 'number' || !ex.expression) throw new Error(ex.key);
        const term = termOf(ex.expression);
        expect(brackets(term), ex.key).toBe(1);
        expect((term.match(/ [+−·:] /g) ?? []).length, ex.key).toBe(2);
        expect(termValue(term), ex.key).toBe(ex.answer.value);
      }
    }
  });

  it('Stufe 1, AB III: the gap fills the bracket, or only the right term has the value', () => {
    for (const ex of items(skill, 1, 3)) {
      if (ex.answer.kind === 'number' && ex.expression) {
        const [left, right] = ex.expression.split(' = ');
        expect(termValue(left.replace('□', String(ex.answer.value))), ex.key).toBe(Number(right.replace(/\u202F/g, '')));
      } else if (ex.answer.kind === 'choice') {
        const value = Number(/den Wert (\S+)\?/.exec(ex.prompt)?.[1]?.replace(/\u202F/g, ''));
        expect(ex.answer.options.filter((o) => termValue(o.label) === value).map((o) => o.label), ex.key).toEqual([rightLabel(ex)]);
      } else throw new Error(ex.key);
    }
  });

  it('Stufe 1, AB III: any shape of term can be the one asked for', () => {
    const shapes = new Set<string>();
    for (const ex of items(skill, 1, 3, 400)) {
      if (ex.answer.kind === 'choice') shapes.add(rightLabel(ex).replace(/\d+/g, 'n'));
    }
    expect([...shapes].sort()).toEqual(['(n + n) · n', 'n + n · n', 'n · (n + n)']);
  });

  it('Stufe 2: two brackets side by side have no first one, so each field says which it means', () => {
    let two = 0;
    for (const ab of [2, 3] as const) {
      for (const ex of items(skill, 2, ab, 400)) {
        if (ex.answer.kind !== 'multi' || !ex.expression) continue;
        const groups = [...ex.expression.matchAll(/\(([^()]*)\)/g)].map((m) => m[1]);
        if (groups.length < 2) {
          expect(ex.answer.fields[0].before, ex.key).toBe('Zuerst:');
          continue;
        }
        two++;
        const [left, right, result] = ex.answer.fields;
        expect([left.before, right.before, result.before], ex.key).toEqual(['Linke Klammer:', 'Rechte Klammer:', 'Ergebnis:']);
        expect(left.value, ex.key).toBe(termValue(groups[0]));
        expect(right.value, ex.key).toBe(termValue(groups[1]));
        // the fields as they read are accepted
        const res = checkAnswer(ex.answer, { kind: 'multi', values: { s0: String(termValue(groups[0])), s1: String(termValue(groups[1])), s2: String(result.value) } }, ex.bugs);
        expect(res.correct, ex.key).toBe(true);
      }
    }
    expect(two).toBeGreaterThan(30);
  });

  it('Stufe 2: a bracket together with more to do; a Minus before the bracket has its own bug', () => {
    let minus = 0;
    for (const ab of ABS) {
      for (const ex of items(skill, 2, ab)) {
        if (ex.expression && ex.answer.kind === 'number' && !ex.key.includes('unterschied:')) expect(termValue(termOf(ex.expression)), ex.key).toBe(ex.answer.value);
        if (ex.expression && ex.answer.kind === 'multi') expect(ex.answer.fields.at(-1)?.value, ex.key).toBe(termValue(ex.expression));
        if (ex.expression && ex.answer.kind === 'choice') expect(firstStepOption(rightLabel(ex)).value, ex.key).toBe(termValue(ex.expression));
        const bug = ex.bugs?.find((b) => b.id === 'minus-klammer');
        if (bug && ex.expression && typeof bug.match === 'number') {
          minus++;
          expect(termOf(ex.expression), ex.key).toContain('− (');
          expect(bug.match, ex.key).toBe(termValue(termOf(ex.expression).replace(/[()]/g, '')));
        }
      }
    }
    expect(minus).toBeGreaterThan(5);
  });

  it('a Minus before a bracket: the hint and the bug take away the value of the whole bracket, never its first step', () => {
    const seen = { nested: 0, plain: 0, more: 0 };
    for (const [stufe, ab] of [[2, 1], [2, 2], [3, 1]] as const) {
      for (const ex of items(skill, stufe, ab, 800)) {
        const term = termOf(ex.expression ?? '');
        if (ex.answer.kind === 'choice' || !/^\d+ − \(/.test(term)) continue;
        const says = [...(ex.answer.kind === 'number' ? [ex.hints[1]] : []), ...(ex.bugs ?? []).filter((b) => b.id === 'minus-klammer').map((b) => b.hint)];
        // the bracket closes the term, and more than its one step is inside
        const closes = term.endsWith(')');
        const steps = (term.match(/ [+−·:] /g) ?? []).length - 1;
        for (const hint of says) {
          if (!closes) {
            expect(hint, ex.key).not.toContain('ab.');
            seen.more++;
          } else if (steps > 1) {
            expect(hint, ex.key).not.toContain('Ergebnis');
            expect(hint, ex.key).toContain('Rechne die ganze Klammer aus');
            seen.nested++;
          } else {
            expect(hint, ex.key).toContain('Zieh dann das Ergebnis ab.');
            seen.plain++;
          }
        }
      }
    }
    expect(seen.nested).toBeGreaterThan(100);
    expect(seen.plain).toBeGreaterThan(50);
    expect(seen.more).toBeGreaterThan(20);
  });

  it('every Stufe asks more than the one before it: Stufe 1 divides by one digit, Stufe 2 from AB II on has three signs with a Punkt and always calculates', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 1, ab, 400)) {
        const divisor = /\) : (\d+)/.exec(ex.expression ?? '');
        if (divisor) expect(Number(divisor[1]), ex.key).toBeLessThanOrEqual(9);
        // no three-digit number inside the bracket's sum
        for (const n of (ex.expression ?? '').match(/\(.*\)/)?.[0].match(/\d+/g) ?? []) expect(Number(n), ex.key).toBeLessThan(250);
      }
    }
    for (const ab of [2, 3] as const) {
      for (const ex of items(skill, 2, ab, 400)) {
        if (ex.answer.kind === 'choice') {
          // the right step comes twice, so only the calculation decides
          const value = termValue(ex.expression!);
          const options = ex.answer.options.map((o) => firstStepOption(o.label));
          expect(options.length, ex.key).toBeGreaterThanOrEqual(3);
          const right = firstStepOption(rightLabel(ex));
          expect(options.filter((o) => o.step === right.step).map((o) => o.value === value).sort(), ex.key).toEqual([false, true]);
          expect(options.filter((o) => o.value === value).length, ex.key).toBe(1);
        }
        if (ab === 2) {
          expect(ex.expression, ex.key).toMatch(/[·:]/);
          expect((ex.expression!.match(/ [+−·:] /g) ?? []).length, ex.key).toBe(3);
        }
      }
    }
  });

  it('T7: no strategy question stands in front of a field that wants the result', () => {
    for (const stufe of [1, 2, 3] as const) for (const ab of ABS) for (const ex of items(skill, stufe, ab, 60)) expect(strategyQuestion(ex), `${ex.key}: ${ex.prompt}`).toBe(false);
  });

  it('the difference a bracket makes recomputes', () => {
    let seen = 0;
    for (const ex of items(skill, 2, 3, 200)) {
      if (!ex.key.includes('unterschied:') || !ex.expression || ex.answer.kind !== 'number') continue;
      seen++;
      const [withBracket, without] = ex.expression.split(' und ');
      expect(termValue(withBracket) - termValue(without), ex.key).toBe(ex.answer.value);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('Stufe 3: nested brackets, or exactly one bracket that reaches the value', () => {
    const kinds = new Set<string>();
    for (const ab of ABS) {
      // enough items to meet a term that goes below 0 without its bracket
      for (const ex of items(skill, 3, ab, 600)) {
        if (!ex.expression) throw new Error(ex.key);
        if (ex.answer.kind === 'number') {
          kinds.add('verschachtelt');
          expect(deepest(ex.expression), ex.key).toBe(2);
          expect(termValue(termOf(ex.expression)), ex.key).toBe(ex.answer.value);
        } else if (ex.answer.kind === 'choice') {
          kinds.add('setzen');
          const [bare, target] = ex.expression.split(' = ');
          const value = Number(target.replace(/\u202F/g, ''));
          const brackets2 = ex.answer.options.filter((o) => o.label.includes('('));
          expect(brackets2.filter((o) => termValue(o.label) === value).map((o) => o.label), ex.key).toEqual([rightLabel(ex)]);
          expect(termValue(bare), ex.key).not.toBe(value);
          brackets2.forEach((o) => expect(o.label.replace(/[()]/g, ''), ex.key).toBe(bare));
          // the option without a bracket says the term's real value, or that it goes below 0
          const without = ex.answer.options.find((o) => !o.label.includes('('))!;
          expect(without.whyWrong, ex.key).toBe(termValue(bare) < 0 ? 'Ohne Klammer kommst du unter 0. Das passt nicht.' : `Ohne Klammer kommt ${fmt(termValue(bare))} heraus. Das passt nicht.`);
        } else throw new Error(ex.key);
      }
    }
    expect([...kinds].sort()).toEqual(['setzen', 'verschachtelt']);
  });

  it('every arithmetic line of the worked steps holds, and the last one states the result', () => {
    for (const ab of ABS) {
      for (const stufe of [1, 2, 3] as const) {
        for (const ex of items(skill, stufe, ab, 80)) {
          expect(stepProblems(ex)).toEqual([]);
          expect(ex.steps.length, ex.key).toBeLessThanOrEqual(5);
          if (ex.answer.kind === 'number' && !ex.key.includes('luecke')) expect(stepTexts(ex).at(-1), ex.key).toContain(String(ex.answer.value));
        }
      }
    }
  });
});
