import { describe, expect, it } from 'vitest';
import { numberWord } from '../../core/format';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import { RANGE_DEFAULTS } from '../../data/profiles';
import { checkWorkedSolution } from '../step-check';
import { CTX, samples } from '../test-utils';
import { asHeard, lesenSkill, milliardeAsMillion, withoutEmptyGroups, withoutGroupZero, withoutPadding } from './lesen';

describeSkill(lesenSkill);

describe('zahlen.lesen', () => {
  it('computes the wrong patterns of §5', () => {
    expect(withoutPadding(3_040_000)).toBe(340);
    expect(withoutEmptyGroups(3_040_000)).toBe(3040);
    expect(withoutGroupZero(304_120)).toBe(34_120);
    expect(asHeard(312_450)).toBe(312_000_450);
    expect(milliardeAsMillion(1e9)).toBe(1e6);
    expect(milliardeAsMillion(3e9 + 40_000)).toBe(3_040_000);
  });

  it('a written word gives back its number (the answer recomputed from the key)', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(lesenSkill, stufe)) {
        expect(checkWorkedSolution(ex)).toEqual([]);
        const [kind, value] = ex.key.split(':').slice(2);
        if (kind === 'wort') {
          expect(ex.answer).toMatchObject({ value: Number(value) });
          expect(ex.srText).toContain(numberWord(Number(value)));
        }
        if (kind === 'wahl' && ex.answer.kind === 'choice') {
          expect(ex.answer.options[ex.answer.correct].label.replace(/­/g, '')).toBe(numberWord(Number(value)));
          expect(ex.answer.silentOptions).toBe(true);
          expect(ex.srText, ex.key).toContain(value.split('').join(' '));
        }
      }
    }
  });

  it('each Stufe stays in its range: no inner zeros, then ≤ 1 Milliarde, then above', () => {
    for (const ex of samples(lesenSkill, 1)) {
      const n = Number(ex.key.split(':')[3]);
      expect(n).toBeLessThanOrEqual(1e6);
      expect(String(n)).not.toContain('0');
    }
    for (const ex of samples(lesenSkill, 2)) {
      const [kind, value] = ex.key.split(':').slice(2);
      expect(Number(value)).toBeLessThanOrEqual(1e9);
      if (kind === 'wort') expect(Number(value)).toBeGreaterThan(1e6);
    }
    for (const ex of samples(lesenSkill, 3)) expect(Number(ex.key.split(':')[3])).toBeGreaterThanOrEqual(1e9);
  });

  it('stays below a Milliarde without beyondMilliarde', () => {
    const ctx = { ...CTX, ranges: { ...RANGE_DEFAULTS.offen, beyondMilliarde: false } };
    for (let seed = 1; seed <= 200; seed++) {
      const ex = lesenSkill.generate(createRng(seed * 31), 3, ctx);
      expect(Number(ex.key.split(':')[3])).toBeLessThan(1e9);
    }
  });
});
