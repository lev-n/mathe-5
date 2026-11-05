import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { layoutAdd, layoutSub, numLength, digitAt } from '../../core/written';
import { schriftlichPlusMinusSkill as skill } from './schriftlich-plusminus';
import { ABS, NO_MILLIARDE, childStrings, items, stepProblems } from './test-helpers';

describeSkill(skill);

/** The calculation of an item: the written answer, or the Umkehraufgabe read from its gap. */
function calculationOf(ex: Exercise): { op: 'add' | 'sub'; operands: number[] } {
  if (ex.answer.kind === 'written') return { op: ex.answer.op as 'add' | 'sub', operands: ex.answer.operands };
  const [, op, a, b] = /umkehr-\w+:(add|sub):(\d+)_(\d+)/.exec(ex.key)!;
  return { op: op as 'add' | 'sub', operands: [Number(a), Number(b)] };
}

describe('rechnen.schriftlich-plusminus', () => {
  it('Stufe 1: two numbers up to 6 digits, at most two carries or regroupings', () => {
    for (const ab of ABS) {
      for (const method of ['abziehen', 'ergaenzen'] as const) {
        for (const ex of items(skill, 1, ab, 300, { subtractionMethod: method })) {
          const { op, operands } = calculationOf(ex);
          expect(operands.length, ex.key).toBe(2);
          operands.forEach((n) => expect(numLength(n), ex.key).toBeLessThanOrEqual(6));
          if (op === 'add') {
            expect(layoutAdd(operands).carries.filter((c) => c > 0).length, ex.key).toBeLessThanOrEqual(2);
            continue;
          }
          // the zeros are Stufe 2: both methods count alike here, and a regrouping changes two columns
          const [taken, added] = [layoutSub(operands[0], operands[1], 'abziehen'), layoutSub(operands[0], operands[1], 'ergaenzen')];
          expect(taken.acrossZero || added.acrossZero, ex.key).toBe(false);
          expect(taken.regroupings, ex.key).toBe(added.regroupings);
          expect(taken.regroupings, ex.key).toBeLessThanOrEqual(ab === 1 ? 1 : 2);
        }
      }
    }
  });

  it('Stufe 2: up to 9 digits, longer than Stufe 1; AB II has three Summanden or a regrouping across zeros', () => {
    for (const ab of ABS) {
      for (const ex of items(skill, 2, ab)) {
        const { operands } = calculationOf(ex);
        expect(Math.max(...operands.map(numLength)), ex.key).toBeGreaterThanOrEqual(7);
        if (ab === 2) expect(operands.length === 3 || layoutSub(operands[0], operands[1], 'abziehen').acrossZero, ex.key).toBe(true);
        if (ex.answer.kind === 'written') expect(numLength(ex.answer.result), ex.key).toBeLessThanOrEqual(9);
      }
    }
  });

  it('Stufe 3 goes beyond 1 Milliarde at AB I, or keeps the Fehlerdetektiv without that range', () => {
    for (const ex of items(skill, 3, 1)) {
      if (ex.answer.kind !== 'written') throw new Error(ex.key);
      expect(Math.max(...ex.answer.operands)).toBeGreaterThanOrEqual(1_000_000_000);
    }
    for (const ab of ABS) {
      for (const ex of items(skill, 3, ab, 80, { ranges: NO_MILLIARDE })) {
        const numbers = ex.answer.kind === 'written' ? ex.answer.operands : ex.visual?.type === 'written' ? ex.visual.operands : [];
        numbers.forEach((n) => expect(n, ex.key).toBeLessThan(1_000_000_000));
        expect(ex.visual?.type, ex.key).toBe('written');
      }
    }
  });

  it('the Umkehraufgabe: the child finds the calculation, no columns show it, and the voice says the equation with its gap', () => {
    for (const stufe of [1, 2] as const) {
      let seen = 0;
      for (const ex of items(skill, stufe, 3)) {
        if (!ex.key.includes('umkehr-')) continue;
        seen++;
        if (ex.answer.kind !== 'number' || !ex.expression) throw new Error(ex.key);
        expect(ex.visual, ex.key).toBeUndefined();
        const filled = ex.expression.replace('□', String(ex.answer.value)).replace(/\u202F/g, '');
        const [left, right] = filled.split(' = ');
        const [a, op, b] = left.split(' ');
        expect(op === '+' ? Number(a) + Number(b) : Number(a) - Number(b), ex.key).toBe(Number(right));
        expect(ex.srText, ex.key).toContain('Lücke');
        expect(ex.srText, ex.key).toContain(ex.expression.includes('+') ? 'plus' : 'minus');
      }
      expect(seen).toBeGreaterThan(20);
    }
  });

  it('the Ziffernrätsel: the voice says where the gaps are and never the hidden digits', () => {
    let riddles = 0;
    for (const ab of [2, 3] as const) {
      for (const ex of items(skill, 3, ab, 300)) {
        if (ex.answer.kind !== 'multi' || ex.visual?.type !== 'written') continue;
        riddles++;
        const { operands, masks = [] } = ex.visual;
        for (const m of masks) {
          expect(ex.srText, ex.key).toContain(`Lücke ${m.label}`);
          const number = m.row === 'result' ? ex.visual.shownResult! : operands[m.index ?? 0];
          expect(ex.srText, ex.key).not.toMatch(new RegExp(`(?<!\\d)${number}(?!\\d)`));
          // digit by digit, as many places as the number has
          expect(ex.srText.split(/ (?:plus|minus|gleich) /).some((part) => part.includes(`Lücke ${m.label}`) && (part.match(/\b\d\b|\beins\b|Lücke [A-C]/g) ?? []).length === String(number).length), ex.key).toBe(true);
        }
      }
    }
    expect(riddles).toBeGreaterThan(60);
  });

  it('the planted slip: the shown result differs at the place of the right option, and places to the right of it agree', () => {
    let where = 0;
    for (const ex of items(skill, 3, 2, 200)) {
      if (ex.answer.kind !== 'choice' || ex.visual?.type !== 'written') continue;
      where++;
      const { op, operands, shownResult } = ex.visual;
      const correct = op === 'add' ? operands[0] + operands[1] : operands[0] - operands[1];
      expect(shownResult, ex.key).not.toBe(correct);
      const place = Number(ex.key.split(':')[5]);
      for (let p = 0; p < place; p++) expect(digitAt(shownResult!, p), ex.key).toBe(digitAt(correct, p));
      expect(digitAt(shownResult!, place), ex.key).not.toBe(digitAt(correct, place));
    }
    expect(where).toBeGreaterThan(30);
  });

  it('the Fehlerdetektiv with a written answer: the planted result is a bug, and the right result is accepted', () => {
    let fixed = 0;
    for (const ex of items(skill, 3, 3, 200)) {
      if (ex.answer.kind !== 'written' || ex.visual?.type !== 'written') continue;
      fixed++;
      const res = checkAnswer(ex.answer, { kind: 'written', result: String(ex.visual.shownResult) }, ex.bugs);
      expect(res.correct, ex.key).toBe(false);
      expect(res.bugId, ex.key).toBe('fehler-uebernommen');
    }
    expect(fixed).toBeGreaterThan(20);
  });

  it('missing digits have exactly one solution, by trying all digits', () => {
    let riddles = 0;
    for (const ab of [2, 3] as const) {
      for (const ex of items(skill, 3, ab, 200)) {
        if (ex.answer.kind !== 'multi' || ex.visual?.type !== 'written') continue;
        riddles++;
        const { op, operands, masks = [] } = ex.visual;
        const result = ex.visual.shownResult!;
        const fill = (digits: number[]) => {
          const ops = [...operands];
          let res = result;
          masks.forEach((m, i) => {
            const change = (n: number) => n + (digits[i] - digitAt(n, m.place)) * 10 ** m.place;
            if (m.row === 'result') res = change(res);
            else ops[m.index ?? 0] = change(ops[m.index ?? 0]);
          });
          return op === 'add' ? ops[0] + ops[1] === res : ops[0] - ops[1] === res;
        };
        let solutions = 0;
        for (let code = 0; code < 10 ** masks.length; code++) {
          if (fill(masks.map((_, i) => Math.floor(code / 10 ** i) % 10))) solutions++;
        }
        expect(solutions, ex.key).toBe(1);
        expect(fill(ex.answer.fields.map((f) => f.value)), ex.key).toBe(true);
      }
    }
    expect(riddles).toBeGreaterThan(30);
  });

  it('never mixes the words of the two subtraction methods', () => {
    for (const ab of ABS) {
      for (const stufe of [1, 2, 3] as const) {
        for (const ex of items(skill, stufe, ab, 60, { subtractionMethod: 'ergaenzen' })) expect(childStrings(ex), ex.key).not.toMatch(/entbünd/i);
        for (const ex of items(skill, stufe, ab, 60, { subtractionMethod: 'abziehen' })) expect(childStrings(ex), ex.key).not.toMatch(/erweiter|gemerkt/i);
      }
    }
  });

  it('every arithmetic line of the worked steps holds', () => {
    for (const ab of ABS) for (const stufe of [1, 2, 3] as const) for (const ex of items(skill, stufe, ab, 80)) expect(stepProblems(ex)).toEqual([]);
  });

  it('the bugs compute from their pattern', () => {
    for (const ex of items(skill, 2, 1, 80)) {
      if (ex.answer.kind !== 'written' || ex.answer.op !== 'add') continue;
      const bug = ex.bugs?.find((b) => b.id === 'uebertrag-vergessen');
      if (!bug) continue;
      const [a, b] = ex.answer.operands;
      const len = Math.max(numLength(a), numLength(b));
      const expected = Array.from({ length: len }, (_, p) => ((digitAt(a, p) + digitAt(b, p)) % (p === len - 1 ? 100 : 10)) * 10 ** p).reduce((x, y) => x + y, 0);
      expect(bug.match, ex.key).toBe(expected);
    }
  });
});
