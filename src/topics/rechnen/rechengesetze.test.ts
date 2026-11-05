import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { rechengesetzeSkill as skill } from './rechengesetze';
import { ABS, NO_THREE_DIGITS, childStrings, items, rightLabel, stepProblems, strategyQuestion, termValue } from './test-helpers';

describeSkill(skill);

const termOf = (expression: string) => expression.split(' = ')[0];
const round = (n: number) => n % 10 === 0;

describe('rechnen.rechengesetze', () => {
  it('Stufe 1: a sum where two numbers make a round number; the answer recomputes', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 1, ab)) {
        if (ex.answer.kind !== 'number' || !ex.expression) throw new Error(ex.key);
        const term = termOf(ex.expression);
        expect(termValue(term), ex.key).toBe(ex.answer.value);
        const numbers = term.split(' + ').map((n) => Number(n.replace(/\u202F/g, '')));
        expect(numbers.some((a, i) => numbers.some((b, j) => i < j && round(a + b))), ex.key).toBe(true);
      }
    }
  });

  it('Stufe 1, AB III: the gap fills the sum, or the right pair has the round sum', () => {
    for (const ex of items(skill, 1, 3)) {
      if (ex.answer.kind === 'number' && ex.expression) {
        const [left, right] = ex.expression.split(' = ');
        expect(termValue(left.replace('□', String(ex.answer.value))), ex.key).toBe(Number(right.replace(/\u202F/g, '')));
      } else if (ex.answer.kind === 'choice') {
        const sums = ex.answer.options.map((o) => termValue(o.label));
        expect(sums.filter(round).length, ex.key).toBe(1);
        expect(round(termValue(rightLabel(ex))), ex.key).toBe(true);
      } else throw new Error(ex.key);
    }
  });

  it('Stufe 2: products; the easier order has the round first product, and only the calculation with it decides', () => {
    let orders = 0;
    for (const ab of ABS) {
      for (const ex of items(skill, 2, ab)) {
        if (!ex.expression) throw new Error(ex.key);
        if (ex.answer.kind === 'number') expect(termValue(termOf(ex.expression)), ex.key).toBe(ex.answer.value);
        if (ex.answer.kind === 'choice') {
          orders++;
          const value = termValue(ex.expression);
          const parsed = ex.answer.options.map((o) => {
            const [term, shown] = o.label.split(' = ');
            return { first: termValue(/\((.*)\)/.exec(term)![1]), order: termValue(term), shown: Number(shown.replace(/\u202F/g, '')) };
          });
          // every order has one value; every shown value stands on two options, and the round product on two
          parsed.forEach((p) => expect(p.order, ex.key).toBe(value));
          expect(parsed.filter((p) => p.shown === value).length, ex.key).toBe(2);
          expect(parsed.filter((p) => round(p.first)).length, ex.key).toBe(2);
          const right = rightLabel(ex).split(' = ');
          expect(round(termValue(/\((.*)\)/.exec(right[0])![1])), ex.key).toBe(true);
          expect(Number(right[1].replace(/\u202F/g, '')), ex.key).toBe(value);
        }
      }
    }
    expect(orders).toBeGreaterThan(100);
  });

  it('Stufe 1, AB II: the sums stay below the products of Stufe 2, and every item of Stufe 2 calculates', () => {
    for (const ex of items(skill, 1, 2, 400)) {
      for (const n of termOf(ex.expression!).split(' + ')) expect(Number(n.replace(/\u202F/g, '')), ex.key).toBeLessThan(500);
    }
    for (const ab of ABS) {
      for (const ex of items(skill, 2, ab, 60)) {
        if (ex.answer.kind === 'choice') ex.answer.options.forEach((o) => expect(o.label, ex.key).toContain(' = '));
      }
    }
  });

  it('T7: no strategy question stands in front of a field that wants the result', () => {
    for (const stufe of [1, 2, 3] as const) for (const ab of ABS) for (const ex of items(skill, stufe, ab, 60)) expect(strategyQuestion(ex), `${ex.key}: ${ex.prompt}`).toBe(false);
  });

  it('Stufe 3: the law shown is the law named; both sides hold', () => {
    for (const ex of items(skill, 3, 1)) {
      if (!ex.expression) throw new Error(ex.key);
      const [left, right] = ex.expression.split(' = ');
      expect(termValue(left), ex.key).toBe(termValue(right));
      expect(ex.key.split(':')[3], ex.key).toBe(rightLabel(ex).split(':')[0].toLowerCase());
    }
  });

  it('Stufe 3: the distributive law stays in its own skill, for every profile', () => {
    for (const ctx of [{}, { ranges: NO_THREE_DIGITS }]) {
      for (const ab of ABS) {
        for (const ex of items(skill, 3, ab, 150, ctx)) {
          expect(childStrings(ex), ex.key).not.toMatch(/verteil|Summanden/i);
          if (ex.expression?.includes('·')) expect(ex.expression, ex.key).not.toMatch(/\d+ · \(\d+ \+ \d+\)/);
        }
      }
    }
  });

  it('Stufe 3, AB I: three numbers to compare, never a one-glance swap of two', () => {
    const kinds = new Set<string>();
    for (const ex of items(skill, 3, 1)) {
      if (!ex.expression) throw new Error(ex.key);
      kinds.add(ex.key.split(':')[3]);
      const [left, right] = ex.expression.split(' = ');
      expect((left.match(/\d+/g) ?? []).length, ex.key).toBe(3);
      // three different numbers, so that both sides really differ
      expect(new Set(left.match(/\d+/g)).size, ex.key).toBe(3);
      expect(left, ex.key).not.toBe(right);
    }
    expect([...kinds].sort()).toEqual(['beides', 'tauschen', 'verbinden']);
  });

  it('Stufe 3: judging both sides: the right option says what the two values show, and "Ja" and "Nein" can both be right', () => {
    for (const ab of [2, 3] as const) {
      let yes = 0;
      let no = 0;
      const places = new Set<number>();
      for (const ex of items(skill, 3, ab)) {
        if (ex.answer.kind !== 'choice' || !ex.expression) continue;
        const [left, right] = ex.expression.split(' = ');
        const [l, r] = [termValue(left), termValue(right)];
        expect(Number.isInteger(l) && Number.isInteger(r), ex.key).toBe(true);
        expect(rightLabel(ex), ex.key).toContain(l === r ? `Ja: Beide Seiten ergeben ${l}.` : `Nein: links ${l}, rechts ${r}.`);
        places.add(ex.answer.correct);
        if (l === r) yes++;
        else no++;
      }
      expect(yes, `AB ${ab}`).toBeGreaterThan(15);
      expect(no, `AB ${ab}`).toBeGreaterThan(15);
      expect([...places].sort(), `AB ${ab}`).toEqual([0, 1, 2]);
    }
  });

  it('Stufe 3: AB III asks more than AB II, with another form and larger numbers', () => {
    const top = (ex: { expression?: string }) => Math.max(...(ex.expression?.match(/\d+/g) ?? []).map(Number));
    const second = items(skill, 3, 2).filter((ex) => ex.answer.kind === 'choice');
    const third = items(skill, 3, 3);
    third.forEach((ex) => {
      expect(ex.answer.kind, ex.key).toBe('choice');
      // a sign changes across the bracket, or a chain without one on the left
      expect(ex.expression, ex.key).not.toMatch(/^\(/);
    });
    second.forEach((ex) => expect(ex.expression, ex.key).toMatch(/^\(/));
    const mean = (list: { expression?: string }[]) => list.reduce((sum, ex) => sum + top(ex), 0) / list.length;
    expect(mean(third)).toBeGreaterThan(mean(second));
  });

  it('Stufe 3, AB II: the chain says no method, and the right grouping is the one the law allows', () => {
    let chains = 0;
    for (const ex of items(skill, 3, 2, 200)) {
      if (ex.answer.kind !== 'number' || !ex.expression) continue;
      chains++;
      expect(ex.prompt, ex.key).not.toContain('von links nach rechts');
      const bug = ex.bugs?.find((b) => b.id === 'tausch-minus');
      expect(bug, ex.key).toBeDefined();
      const [a, op, b, , c] = termOf(ex.expression).split(' ');
      expect(termValue(termOf(ex.expression)), ex.key).toBe(ex.answer.value);
      expect(termValue(`${a} ${op} (${b} ${op === '−' ? '+' : '·'} ${c})`), ex.key).toBe(ex.answer.value);
      expect(bug!.match, ex.key).toBe(termValue(`${a} ${op} (${b} ${op} ${c})`));
      expect(Number(b) * Number(c) % 10 === 0 || (Number(b) + Number(c)) % 10 === 0, ex.key).toBe(true);
    }
    expect(chains).toBeGreaterThan(50);
  });

  it('every arithmetic line of the worked steps holds', () => {
    for (const ab of ABS) for (const stufe of [1, 2, 3] as const) for (const ex of items(skill, stufe, ab, 80)) expect(stepProblems(ex)).toEqual([]);
  });
});
