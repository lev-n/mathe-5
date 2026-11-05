import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { digitAt, numLength } from '../../core/written';
import { partialLines } from './common';
import { schriftlichMalSkill as skill } from './schriftlich-mal';
import { ABS, NO_THREE_DIGITS, items, stepProblems } from './test-helpers';

describeSkill(skill);

describe('rechnen.schriftlich-mal', () => {
  it('the praise of times one digit says what the calculation asked: a carry into a 0, a carry, or none', () => {
    const seen = new Set<string>();
    for (const ab of ABS) {
      for (const ex of items(skill, 1, ab, 800)) {
        if (ex.answer.kind !== 'written') continue;
        const [a, m] = ex.answer.operands;
        const into = Array.from({ length: numLength(a) }, () => 0);
        for (let p = 1; p < into.length; p++) into[p] = Math.floor((digitAt(a, p - 1) * m + into[p - 1]) / 10);
        seen.add(ex.praise);
        if (ex.praise.includes('bei der 0')) expect(into.some((c, p) => c > 0 && digitAt(a, p) === 0), ex.key).toBe(true);
        else if (ex.praise.includes('Übertrag')) expect(into.some((c) => c > 0) && !into.some((c, p) => c > 0 && digitAt(a, p) === 0), ex.key).toBe(true);
      }
    }
    expect([...seen].sort()).toEqual(['Du hast auch bei der 0 an den Übertrag gedacht.', 'Du hast jeden Übertrag erst danach dazugezählt.']);
  });

  it('the riddle for the ear: a digit 1 before a gap stays a digit, not "eine Lücke"', () => {
    let ones = 0;
    for (const ex of items(skill, 1, 3, 600)) {
      if (ex.answer.kind !== 'multi') continue;
      expect(ex.srText, ex.key).not.toMatch(/\b1 Lücke/);
      if (ex.srText.includes('eins Lücke')) ones++;
    }
    expect(ones).toBeGreaterThan(0);
  });

  it('Stufe 1: up to 4 digits times one digit; the riddle holds too', () => {
    for (const ab of ABS) {
      for (const ex of items(skill, 1, ab)) {
        const operands = ex.answer.kind === 'written' ? ex.answer.operands : ex.visual?.type === 'written' ? ex.visual.operands : [];
        expect(numLength(operands[0]), ex.key).toBeLessThanOrEqual(4);
        expect(numLength(operands[1]), ex.key).toBe(1);
        if (ab === 2 && ex.answer.kind === 'written') expect(String(operands[0]).slice(1, -1), ex.key).toContain('0');
      }
    }
  });

  it('the riddle on Stufe 1: the digit makes the multiplication true, and only this digit', () => {
    let riddles = 0;
    for (const ex of items(skill, 1, 3, 200)) {
      if (ex.answer.kind !== 'multi' || ex.visual?.type !== 'written') continue;
      riddles++;
      const [a, m] = ex.visual.operands;
      const product = ex.visual.shownResult!;
      const mask = ex.visual.masks![0];
      const fits = (d: number) => (mask.row === 'result' ? a * m === product + (d - digitAt(product, mask.place)) * 10 ** mask.place : (a + (d - digitAt(a, mask.place)) * 10 ** mask.place) * m === product);
      expect(Array.from({ length: 10 }, (_, d) => d).filter(fits), ex.key).toEqual([ex.answer.fields[0].value]);
    }
    expect(riddles).toBeGreaterThan(30);
  });

  it('the riddle on Stufe 1: the voice says where the gap is and never the hidden digit', () => {
    let riddles = 0;
    for (const ex of items(skill, 1, 3, 300)) {
      if (ex.answer.kind !== 'multi' || ex.visual?.type !== 'written') continue;
      riddles++;
      const mask = ex.visual.masks![0];
      const number = mask.row === 'result' ? ex.visual.shownResult! : ex.visual.operands[0];
      expect(ex.srText, ex.key).toContain('Lücke A');
      expect(ex.srText, ex.key).not.toMatch(new RegExp(`(?<!\\d)${number}(?!\\d)`));
    }
    expect(riddles).toBeGreaterThan(60);
  });

  it('the partial products: the first stands furthest left, and each next one is indented one place more', () => {
    expect(partialLines(815, 844)).toEqual(['Erstes Teilprodukt: 815 · 8 = 6520.', 'Zweites Teilprodukt: 815 · 4 = 3260, eine Stelle eingerückt.', 'Drittes Teilprodukt: 815 · 4 = 3260, zwei Stellen eingerückt.']);
    expect(partialLines(7207, 79)).toEqual(['Erstes Teilprodukt: 7207 · 7 = 50\u202F449.', 'Zweites Teilprodukt: 7207 · 9 = 64\u202F863, eine Stelle eingerückt.']);
  });

  it('Stufe 2: up to 4 digits times two digits; the Überschlag fits within 25 %', () => {
    for (const ab of ABS) {
      for (const ex of items(skill, 2, ab)) {
        if (ex.answer.kind !== 'written') throw new Error(ex.key);
        const [a, b] = ex.answer.operands;
        expect(numLength(a), ex.key).toBeLessThanOrEqual(4);
        expect(numLength(b), ex.key).toBe(2);
        if (ex.answer.ueberschlag !== undefined) expect(Math.abs(ex.answer.result - ex.answer.ueberschlag), ex.key).toBeLessThanOrEqual(0.25 * Math.max(ex.answer.result, ex.answer.ueberschlag));
        if (ab > 1) expect(ex.answer.ueberschlag, ex.key).toBeDefined();
      }
    }
  });

  it('Stufe 3: a three-digit factor with the range, a planted slip without it', () => {
    for (const ex of items(skill, 3, 1)) {
      if (ex.answer.kind !== 'written') throw new Error(ex.key);
      expect(numLength(ex.answer.operands[1]), ex.key).toBe(3);
    }
    for (const ab of ABS) {
      for (const ex of items(skill, 3, ab, 100, { ranges: NO_THREE_DIGITS })) {
        expect(ex.visual?.type, ex.key).toBe('written');
        if (ex.visual?.type === 'written') expect(numLength(ex.visual.operands[1]), ex.key).toBeLessThanOrEqual(2);
      }
    }
  });

  it('a planted slip: partial products add up to the shown result (or the sum itself is the slip), which is not the product', () => {
    let slips = 0;
    for (const ab of ABS) {
      for (const ex of items(skill, 3, ab, 150, { ranges: NO_THREE_DIGITS })) {
        if (ex.visual?.type !== 'written' || !ex.visual.shownPartials) continue;
        slips++;
        const { operands, shownPartials, shownResult } = ex.visual;
        const product = operands[0] * operands[1];
        expect(shownResult, ex.key).not.toBe(product);
        const sum = shownPartials.reduce((s, p) => s + p.value * 10 ** p.shift, 0);
        // the partial products add up to the shown result, unless the slip is the sum itself
        expect(sum === shownResult || sum === product, ex.key).toBe(true);
        if (ex.answer.kind === 'written') {
          const res = checkAnswer(ex.answer, { kind: 'written', result: String(shownResult) }, ex.bugs);
          expect(res.bugId, ex.key).toBe('fehler-uebernommen');
        }
      }
    }
    expect(slips).toBeGreaterThan(100);
  });

  it('mal-versatz computes from the partial products without shifts', () => {
    for (const ex of items(skill, 2, 2)) {
      if (ex.answer.kind !== 'written') continue;
      const [a, b] = ex.answer.operands;
      const bug = ex.bugs?.find((x) => x.id === 'mal-versatz');
      expect(bug?.match, ex.key).toBe(a * digitAt(b, 1) + a * digitAt(b, 0));
    }
  });

  it('every arithmetic line of the worked steps holds, and at most five lines', () => {
    for (const ab of ABS) {
      for (const stufe of [1, 2, 3] as const) {
        for (const ex of items(skill, stufe, ab, 80)) {
          expect(stepProblems(ex)).toEqual([]);
          expect(ex.steps.length, ex.key).toBeLessThanOrEqual(5);
        }
      }
    }
  });
});
