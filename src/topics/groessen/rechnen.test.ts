import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { STUFEN, type Ab } from '../../core/types';
import { evalSide } from '../step-check';
import { CTX, samples, times } from '../test-utils';
import { rechnenSkill } from './rechnen';
import { assertFitsPhone, assertSteps } from './testkit';

describeSkill(rechnenSkill);

const clean = (s: string) => s.replace(/ /g, '');

describe('groessen.rechnen specifics', () => {
  it('an answer of 60 or 100 minutes keeps the bug of the hour with 100 minutes', () => {
    let seen = 0;
    for (let i = 0; i < 4000; i++) {
      const ab = (i % 2 === 0 ? 1 : 3) as Ab;
      const ex = rechnenSkill.generate(createRng(i * 53 + ab), 2, { ...CTX, ab });
      if (!/:(h\+min|h-mix):/.test(ex.key) || ex.answer.kind !== 'number' || (ex.answer.value !== 60 && ex.answer.value !== 100)) continue;
      seen++;
      expect(ex.bugs?.some((b) => b.id === 'zeit-hundert'), ex.key).toBe(true);
    }
    expect(seen).toBeGreaterThan(5);
  });

  it('money shown only as a picture is listed for the screen reader', () => {
    let seen = 0;
    for (let i = 0; i < 1000; i++) {
      const ex = rechnenSkill.generate(createRng(i * 53 + 2), 1, { ...CTX, ab: 2 });
      if (ex.visual?.type !== 'money') continue;
      seen++;
      const pieces = [...ex.srText.matchAll(/(\d+) (?:Münzen?|Scheine?) zu (\d+) (Euro|Cent)/g)];
      expect(pieces.reduce((sum, m) => sum + Number(m[1]) * Number(m[2]) * (m[3] === 'Euro' ? 100 : 1), 0), ex.key).toBe(ex.visual.items.reduce((sum, c) => sum + c, 0));
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('the steps are right and end with the result', () => {
    for (const stufe of STUFEN) for (const ex of samples(rechnenSkill, stufe)) assertSteps(ex);
  });

  it('an expression without a gap on the left recomputes to the answer', () => {
    let seen = 0;
    for (const stufe of STUFEN) {
      for (const ex of samples(rechnenSkill, stufe)) {
        if (ex.answer.kind !== 'number' || !ex.expression || ex.expression.startsWith('□') || ex.answer.value === null) continue;
        const [left, right] = ex.expression.split(' = ');
        // the step checker reads '8 kg − 2 kg 850 g' as 8 kg − 2 kg + 850 g, so mixed quantities in a term stay out
        if (!right?.includes('□') || left.includes('□') || /-mix|:h:min:/.test(ex.key)) continue;
        const value = evalSide(clean(left));
        if (!value) continue;
        seen++;
        const answer = ex.answer.unit ? evalSide(`${String(ex.answer.value).replace('.', ',')} ${ex.answer.unit}`)!.value : ex.answer.value;
        expect(answer, ex.key).toBeCloseTo(value.value, 6);
      }
    }
    expect(seen).toBeGreaterThan(200);
  });

  it('time spans: the fields are the difference of the two clock times', () => {
    let seen = 0;
    for (const ex of samples(rechnenSkill, 2)) {
      if (!ex.key.includes('spanne') || ex.answer.kind !== 'multi') continue;
      seen++;
      const [start, end] = times(ex.context!);
      const [h, min] = ex.answer.fields;
      expect(h.value * 60 + min.value, ex.key).toBe(end - start);
      expect(min.value, ex.key).toBeLessThan(60);
    }
    expect(seen).toBeGreaterThan(5);
  });

  it('end and start times stay on the clock, and minutes below 60', () => {
    for (const ex of samples(rechnenSkill, 2)) {
      if (!/ende|anfang/.test(ex.key) || ex.answer.kind !== 'multi') continue;
      const [h, min] = ex.answer.fields;
      expect(h.value, ex.key).toBeLessThan(24);
      expect(min.value, ex.key).toBeLessThan(60);
    }
  });

  it('Stufe 1 keeps one unit in an expression; Stufe 3 divides or has two steps', () => {
    for (const ex of samples(rechnenSkill, 1)) {
      if (!ex.expression) continue;
      const units = new Set(ex.expression.match(/(?:€|km|kg|min|ct|m|g)(?![\p{L}])/gu) ?? []);
      expect(units.size, `${ex.key}: ${ex.expression}`).toBeLessThanOrEqual(1);
    }
    for (const ex of samples(rechnenSkill, 3)) expect(ex.expression?.includes(':') || ex.steps.length >= 2, ex.key).toBe(true);
  });

  it('"Wie oft passt …?" always has a whole count, and the expression fits a phone', () => {
    let seen = 0;
    for (const ab of [1, 2, 3] as Ab[]) {
      for (let i = 0; i < 1500; i++) {
        const ex = rechnenSkill.generate(createRng(i * 53 + ab), 3, { ...CTX, ab });
        assertFitsPhone(ex);
        if (!/passt/.test(ex.prompt) || ex.answer.kind !== 'number') continue;
        seen++;
        expect(Number.isInteger(ex.answer.value), `${ex.key}: ${ex.answer.value}`).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(500);
  });

  it('every number and multi field offers the comma', () => {
    for (const stufe of STUFEN) {
      for (const ex of samples(rechnenSkill, stufe)) {
        if (ex.answer.kind === 'number') expect(ex.answer.decimals, ex.key).toBeGreaterThan(0);
        if (ex.answer.kind === 'multi') ex.answer.fields.forEach((f) => expect(f.decimals, ex.key).toBeGreaterThan(0));
      }
    }
  });
});
