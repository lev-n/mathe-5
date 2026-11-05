import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { sameFractionValue } from '../../core/check';
import type { VisualOf } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { anteileSkill } from './anteile';
import { everyItem, fractionsIn, items, sameTaskTwoKeys } from './test-helpers';

describeSkill(anteileSkill);

const modelOf = (v: unknown) => v as VisualOf<'fractionModel'>;

describe('brueche.anteile specifics', () => {
  it('worked steps calculate correctly', () => {
    for (const ex of everyItem(anteileSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('the fraction read off is the picture, within the Nenner of the Stufe', () => {
    for (const [stufe, max] of [[1, 8], [2, 12]] as const) {
      for (const ex of items(anteileSkill, stufe, 1)) {
        const m = modelOf(ex.visual);
        expect(ex.answer).toMatchObject({ kind: 'fraction', numerator: m.filled, denominator: m.parts });
        expect(m.parts).toBeLessThanOrEqual(max);
      }
    }
    for (const ex of items(anteileSkill, 2, 1)) expect(modelOf(ex.visual).parts).toBeGreaterThan(8);
  });

  it('the part without colour is the rest', () => {
    for (const ex of items(anteileSkill, 1, 3)) {
      const m = modelOf(ex.visual);
      expect(ex.answer).toMatchObject({ numerator: m.parts - m.filled, denominator: m.parts });
    }
  });

  it('picture tasks have exactly one picture of that value', () => {
    for (const ex of items(anteileSkill, 1, 2)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [[n, d]] = fractionsIn(ex.prompt);
      const right = ex.answer.options.filter((o) => sameFractionValue({ n: modelOf(o.visual).filled, d: modelOf(o.visual).parts }, { n, d }));
      expect(right.length).toBe(1);
      expect(ex.answer.options.indexOf(right[0])).toBe(ex.answer.correct);
    }
    for (const ex of items(anteileSkill, 2, 2)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const shown = modelOf(ex.visual);
      const right = ex.answer.options.filter((o) => sameFractionValue({ n: modelOf(o.visual).filled, d: modelOf(o.visual).parts }, { n: shown.filled, d: shown.parts }));
      expect(right.length).toBe(1);
      expect(modelOf(right[0].visual).form).not.toBe('bar');
    }
  });

  it('the odd picture is the only one of its value', () => {
    for (const ex of items(anteileSkill, 2, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const value = (i: number) => modelOf(ex.answer.kind === 'choice' && ex.answer.options[i].visual);
      const others = ex.answer.options.map((_, i) => i).filter((i) => i !== (ex.answer as { correct: number }).correct);
      const first = value(others[0]);
      for (const i of others) expect(sameFractionValue({ n: value(i).filled, d: value(i).parts }, { n: first.filled, d: first.parts })).toBe(true);
      const odd = value(ex.answer.correct);
      expect(sameFractionValue({ n: odd.filled, d: odd.parts }, { n: first.filled, d: first.parts })).toBe(false);
    }
  });

  it('an unequal picture is never a Viertel, an equal one is', () => {
    for (const ex of items(anteileSkill, 3, 1)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const label = ex.answer.options[ex.answer.correct].label;
      expect(label.startsWith('Nein')).toBe(modelOf(ex.visual).unequal === true);
    }
  });

  it('the whole recomputes from the shown part', () => {
    for (const ab of [2, 3] as const) {
      for (const ex of items(anteileSkill, 3, ab)) {
        const [[n, d]] = fractionsIn(ex.prompt);
        expect(ex.answer.kind === 'number' && ex.answer.value).toBe((modelOf(ex.visual).parts / n) * d);
      }
    }
  });

  it('a task that looks the same has one key, so a round never shows it twice', () => {
    expect(sameTaskTwoKeys(anteileSkill)).toEqual([]);
  });

  it('the verb of a step agrees with its fraction', () => {
    for (const ex of everyItem(anteileSkill, 200)) {
      for (const step of ex.steps) expect(typeof step === 'string' ? step : step.text, ex.key).not.toMatch(/^(?:Gefärbt|Ohne Farbe) (?:sind \{frac:1\/|ist \{frac:[2-9])/);
    }
  });
});
