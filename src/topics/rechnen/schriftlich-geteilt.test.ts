import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { layoutDiv, numLength } from '../../core/written';
import { schriftlichGeteiltSkill as skill } from './schriftlich-geteilt';
import { ABS, NO_THREE_DIGITS, items, rightLabel, stepProblems, stepTexts, termValue } from './test-helpers';

describeSkill(skill);

describe('rechnen.schriftlich-geteilt', () => {
  it('Stufe 1: up to 4 digits by one digit, no Rest; AB III is the Umkehraufgabe', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 1, ab)) {
        if (ex.answer.kind !== 'written') throw new Error(ex.key);
        const [a, d] = ex.answer.operands;
        expect(numLength(a), ex.key).toBeLessThanOrEqual(4);
        expect(numLength(d), ex.key).toBe(1);
        expect(ex.answer.remainder ?? 0, ex.key).toBe(0);
        if (ab === 2) expect(layoutDiv(a, d).firstTwoDigits, ex.key).toBe(true);
      }
    }
    for (const ex of items(skill, 1, 3)) {
      // a number field: the columns of a written answer would already show the Umkehraufgabe
      if (ex.answer.kind !== 'number' || ex.answer.value === null || !ex.expression) throw new Error(ex.key);
      const [, right] = ex.expression.split(' = ');
      const d = Number(ex.expression.split(' : ')[1].split(' = ')[0]);
      expect(ex.answer.value / d, ex.key).toBe(Number(right.replace(/\u202F/g, '')));
      expect(ex.visual, ex.key).toBeUndefined();
      expect(ex.srText, ex.key).toContain('Lücke geteilt durch');
    }
  });

  it('Stufe 2: by 11 to 25; AB II with a Rest, AB III with a 0 in the quotient or the Rest to judge', () => {
    for (const ab of ABS) {
      for (const ex of items(skill, 2, ab)) {
        const [a, d] = ex.answer.kind === 'written' ? ex.answer.operands : (ex.expression?.match(/\d+/g) ?? []).map(Number);
        expect(d, ex.key).toBeGreaterThanOrEqual(11);
        expect(d, ex.key).toBeLessThanOrEqual(25);
        if (ab === 2) expect(a % d, ex.key).toBeGreaterThan(0);
        if (ab === 3 && ex.answer.kind === 'written') expect(layoutDiv(a, d).quotientZeros, ex.key).toBeGreaterThan(0);
      }
    }
  });

  it('the Rest to judge: the shown division fits the Dividend, and the right option follows the shown Rest, at any place', () => {
    let judged = 0;
    let fine = 0;
    const places = new Set<number>();
    for (const ex of items(skill, 2, 3, 400)) {
      if (ex.answer.kind !== 'choice') continue;
      judged++;
      // a line of text, which wraps on a phone: the one-line visual would start with the Rest off the screen
      expect(ex.visual, ex.key).toBeUndefined();
      expect(ex.expression, ex.key).toMatch(/^\d+ : \d+ = \d+ Rest \d+$/);
      const [a, d, shownResult, shownRemainder] = ex.expression!.match(/\d+/g)!.map(Number);
      expect(shownResult * d + shownRemainder, ex.key).toBe(a);
      places.add(ex.answer.correct);
      if (shownRemainder < d) {
        fine++;
        expect(rightLabel(ex), ex.key).toBe('Alles stimmt.');
      } else expect(rightLabel(ex), ex.key).toContain('Der Rest ist zu groß.');
    }
    expect(judged).toBeGreaterThan(40);
    expect(fine).toBeGreaterThan(10);
    expect(judged - fine).toBeGreaterThan(10);
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
  });

  it('Stufe 3: a divisor of 100 or more with the range, at most 99 without it', () => {
    for (const ab of ABS) {
      for (const ex of items(skill, 3, ab)) {
        if (ex.answer.kind === 'written') expect(ex.answer.operands[1], ex.key).toBeGreaterThanOrEqual(100);
      }
      for (const ex of items(skill, 3, ab, 100, { ranges: NO_THREE_DIGITS })) {
        if (ex.answer.kind === 'written') {
          expect(ex.answer.operands[1], ex.key).toBeLessThanOrEqual(99);
          expect(ex.answer.operands[1], ex.key).toBeGreaterThan(25);
        }
      }
    }
  });

  it('Stufe 3, AB III: mostly a written division with the hardest numbers, which asks more than Stufe 2', () => {
    for (const ranges of [undefined, NO_THREE_DIGITS]) {
      const all = items(skill, 3, 3, 400, ranges ? { ranges } : {});
      const written = all.filter((ex) => ex.answer.kind === 'written');
      expect(written.length).toBeGreaterThan(all.length / 2);
      for (const ex of written) {
        if (ex.answer.kind !== 'written') continue;
        const [a, d] = ex.answer.operands;
        expect(d, ex.key).toBeGreaterThan(25);
        expect(numLength(a), ex.key).toBeGreaterThanOrEqual(5);
        expect(layoutDiv(a, d).quotientZeros, ex.key).toBeGreaterThan(0);
        expect(ex.answer.remainder, ex.key).toBeGreaterThan(0);
        expect(ex.answer.ueberschlag, ex.key).toBeDefined();
      }
    }
  });

  it('the Überschlag picks the quotient: no pattern of the options names the right one', () => {
    for (const ranges of [undefined, NO_THREE_DIGITS]) {
      for (const ab of [2, 3] as const) {
        for (const ex of items(skill, 3, ab, 400, ranges ? { ranges } : {})) {
          if (ex.answer.kind !== 'choice') continue;
          const values = ex.answer.options.map((o) => Number(o.label.replace(/\u202F/g, '')));
          const q = values[ex.answer.correct];
          // never the option whose ten times and tenth are listed too, or whose digits another option repeats
          for (const v of values) {
            expect(values.includes(v * 10) && values.includes(Math.floor(v / 10)), ex.key).toBe(false);
            if (v !== q) expect(String(v).startsWith(String(q)), ex.key).toBe(false);
          }
        }
      }
    }
  });

  it('the Überschlag picks the quotient: the right option is the exact quotient, nothing else is near the Überschlag', () => {
    let picked = 0;
    for (const ranges of [undefined, NO_THREE_DIGITS]) {
      for (const ex of items(skill, 3, 3, 150, ranges ? { ranges } : {})) {
        if (ex.answer.kind !== 'choice' || !ex.expression) continue;
        picked++;
        const [term] = ex.expression.split(' = ');
        const q = termValue(term);
        expect(Number(rightLabel(ex).replace(/\u202F/g, '')), ex.key).toBe(q);
        expect(Number.isInteger(q), ex.key).toBe(true);
        const near = ex.answer.options.filter((o) => Math.abs(Number(o.label.replace(/\u202F/g, '')) - q) <= q * 0.3);
        expect(near.length, ex.key).toBe(1);
      }
    }
    expect(picked).toBeGreaterThan(40);
  });

  it('the Überschlag picks the quotient: each wrong option is called too big or too small as it is, and the place changes', () => {
    const places = new Set<number>();
    const ranks = new Set<number>();
    for (const ranges of [undefined, NO_THREE_DIGITS]) {
      for (const ab of [2, 3] as const) {
        for (const ex of items(skill, 3, ab, 400, ranges ? { ranges } : {})) {
          if (ex.answer.kind !== 'choice') continue;
          const values = ex.answer.options.map((o) => Number(o.label.replace(/\u202F/g, '')));
          const { correct } = ex.answer;
          const q = values[correct];
          ex.answer.options.forEach((o, i) => {
            if (i !== correct) expect(o.whyWrong, ex.key).toContain(values[i] > q ? 'zu groß' : 'zu klein');
          });
          // the hint must help where the far option has as many digits as the quotient
          ex.hints.forEach((h) => expect(h, ex.key).not.toContain('Stellen'));
          places.add(correct);
          ranks.add(values.filter((v) => v < q).length);
        }
      }
    }
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
    expect([...ranks].sort()).toEqual([0, 1, 2, 3]);
  });

  it('bugs: 0 left out of the quotient, a Rest too big and a Rest forgotten', () => {
    const seen = new Set<string>();
    for (const ex of items(skill, 2, 3, 200)) {
      if (ex.answer.kind !== 'written') continue;
      const [a, d] = ex.answer.operands;
      const q = ex.answer.result;
      const r = ex.answer.remainder ?? 0;
      for (const bug of ex.bugs ?? []) {
        seen.add(bug.id);
        if (bug.id === 'null-im-quotient') expect(bug.match, ex.key).toBe(Number(String(q).replace(/0/g, '')));
        if (bug.id === 'rest-zu-gross') expect((bug.match as number) * d + bug.remainder!, ex.key).toBe(a);
        if (bug.id === 'rest-vergessen') {
          const res = checkAnswer(ex.answer, { kind: 'written', result: String(q), remainder: '' }, ex.bugs);
          expect(res.bugId, ex.key).toBe('rest-vergessen');
          expect(r, ex.key).toBeGreaterThan(0);
        }
      }
    }
    expect([...seen].sort()).toEqual(['null-im-quotient', 'rest-vergessen', 'rest-zu-gross']);
  });

  it('the worked steps end with the Probe, and every line holds', () => {
    for (const ab of ABS) {
      for (const stufe of [1, 2, 3] as const) {
        for (const ex of items(skill, stufe, ab, 80)) {
          expect(stepProblems(ex)).toEqual([]);
          if (ex.answer.kind === 'written' && ex.answer.op === 'div') expect(stepTexts(ex).at(-1), ex.key).toContain('Probe:');
        }
      }
    }
  });
});
