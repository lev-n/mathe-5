import { describe, expect, it } from 'vitest';
import { correctResponse, formatAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { CTX, samples } from '../test-utils';
import { dualReversed, dualShown, dualTyped, romanAllAdded, toRoman, zahlensystemeSkill } from './zahlensysteme';

describeSkill(zahlensystemeSkill, { minDistinct: { 3: 25 } });

/** Independent reader: a smaller sign before a larger one is subtracted. */
function readRoman(text: string): number {
  const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  return text.split('').reduce((s, c, i, all) => s + (v[c] < (v[all[i + 1]] ?? 0) ? -v[c] : v[c]), 0);
}

describe('zahlen.zahlensysteme', () => {
  it('Roman numerals round-trip up to 3000', () => {
    for (let n = 1; n <= 3000; n++) expect(readRoman(toRoman(n))).toBe(n);
    expect(toRoman(49)).toBe('XLIX');
    expect(romanAllAdded('XLIX')).toBe(71);
  });

  it('Dualzahlen: shown digit by digit, typed as one number', () => {
    expect(dualShown(11)).toBe('1 0 1 1');
    expect(dualTyped(11)).toBe(1011);
    expect(dualReversed(11)).toBe(13);
  });

  it('answers recomputed from the key, and each Stufe stays in its range', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(zahlensystemeSkill, stufe)) {
        const [kind, value] = ex.key.split(':').slice(2);
        const n = Number(value);
        if (kind === 'roemisch') {
          expect(ex.answer).toMatchObject({ value: n });
          expect(readRoman(ex.expression!.split(' ')[0])).toBe(n);
          expect(n).toBeLessThanOrEqual(stufe === 1 ? 100 : 3000);
        }
        if (kind === 'dual') {
          expect(n).toBeLessThanOrEqual(15);
          expect(ex.answer).toMatchObject({ value: parseInt(ex.expression!.replace(/ /g, ''), 2) });
        }
        if (kind === 'nachdual' && ex.answer.kind === 'multi') {
          expect(n).toBeLessThanOrEqual(63);
          expect(parseInt(`1${ex.answer.fields.map((f) => f.value).join('')}`, 2)).toBe(n);
        }
        if (kind === 'nachroemisch' && ex.answer.kind === 'choice') {
          const labels = ex.answer.options.map((o) => o.label);
          expect(labels[ex.answer.correct]).toBe(toRoman(n));
          expect(labels.filter((l) => l === toRoman(n))).toHaveLength(1);
        }
      }
    }
  });

  it('steps add up and state the answer', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(zahlensystemeSkill, stufe)) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
    }
  });

  const atAb = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3, n = 400) => Array.from({ length: n }, (_, i) => zahlensystemeSkill.generate(createRng(i * 13 + 3), stufe, { ...CTX, ab }));

  it('a Dualzahl answer stays digit by digit: no thousands gap in the solution, the field or the voice', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(3, ab)) {
        if (ex.answer.kind !== 'multi') throw new Error(ex.key);
        const n = Number(ex.key.split(':')[3]);
        const shown = formatAnswer(ex.answer);
        expect(shown, ex.key).toBe(n.toString(2).split('').join(', '));
        const response = correctResponse(ex.answer);
        if (response.kind !== 'multi') throw new Error(ex.key);
        for (const text of Object.values(response.values)) expect(text, ex.key).toMatch(/^[01]$/);
      }
    }
  });

  it('the hints of the reversed Roman task never name its answer', () => {
    const reversed = [...atAb(1, 3, 1200), ...atAb(2, 3)].filter((ex) => ex.key.includes(':nachroemisch:'));
    expect(reversed.some((ex) => ex.key.endsWith(':40'))).toBe(true);
    expect(reversed.some((ex) => ex.key.endsWith(':90'))).toBe(true);
    for (const ex of reversed) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const label = ex.answer.options[ex.answer.correct].label;
      for (const hint of ex.hints) expect(hint, ex.key).not.toMatch(new RegExp(`\\b${label}\\b`));
      for (const step of ex.steps) expect(typeof step === 'string' ? step : step.text, ex.key).not.toMatch(/ und 0\./);
    }
  });

  it('Stufe 2 AB III adds demand to AB II: the Roman task is reversed, with at least two pairs', () => {
    for (const ex of atAb(2, 3)) {
      expect(ex.key, ex.key).toMatch(/:(nachroemisch|waehldual):/);
      if (ex.key.includes(':nachroemisch:')) expect(toRoman(Number(ex.key.split(':')[3])).match(/IV|IX|XL|XC|CD|CM/g)!.length, ex.key).toBeGreaterThanOrEqual(2);
    }
  });

  it('Stufe 3 AB III always needs a calculation: a number field, and many different answers', () => {
    const items = atAb(3, 3);
    const answers = new Set<number>();
    for (const ex of items) {
      if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error(ex.key);
      answers.add(ex.answer.value);
    }
    for (const form of ['ziffern', 'tausch', 'dual']) expect(items.some((ex) => ex.key.includes(`:warum:${form}:`)), form).toBe(true);
    expect(answers.size).toBeGreaterThan(30);
  });

  it('turning a pair gives a proper Roman number, and the answer is the difference of the two values', () => {
    for (const ex of atAb(3, 3).filter((e) => e.key.includes(':tausch:'))) {
      const [first, second] = ex.expression!.split(' und ');
      expect(toRoman(readRoman(second)), ex.key).toBe(second);
      expect(ex.answer, ex.key).toMatchObject({ value: readRoman(second) - readRoman(first) });
    }
  });
});
