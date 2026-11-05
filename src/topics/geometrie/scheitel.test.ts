import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { DEFAULT_CONTEXT } from '../../core/generate';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { scheitelSkill as skill } from './scheitel';

describeSkill(skill);

const items = (stufe: Stufe, ab: Ab, n = 120): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 349 + 29), stufe, { ...DEFAULT_CONTEXT, ab }));
const label = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options[ex.answer.correct].label : '');
const NAMES = ['α', 'β', 'γ', 'δ'];
const values = (ex: Exercise) => { if (ex.answer.kind !== 'multi') throw new Error('multi expected'); return Object.fromEntries(ex.answer.fields.map((f) => [f.id, f.value])); };
const shown = (ex: Exercise) => [...ex.prompt.matchAll(/(\d+)°/g)].map((m) => Number(m[1]));

describe('Scheitel- und Nebenwinkel: independent checks', () => {
  it('Stufe 1: the Scheitelwinkel lies two places further round', () => {
    for (const ab of [1, 3] as const) {
      for (const ex of items(1, ab)) {
        const asked = NAMES.find((n) => ex.prompt.includes(n))!;
        expect(label(ex)).toBe(NAMES[(NAMES.indexOf(asked) + 2) % 4]);
      }
    }
  });

  it('Stufe 1, AB II: a Nebenwinkel pair is neighbours', () => {
    for (const ex of items(1, 2)) {
      const [a, b] = label(ex).split(' und ').map((n) => NAMES.indexOf(n));
      expect([1, 3]).toContain(b - a);
    }
  });

  it('the drawn angle at a crossing is the angle between the two lines', () => {
    for (const ex of items(2, 1)) {
      if (ex.visual?.type !== 'lines') throw new Error('lines expected');
      const [a, b] = ex.visual.lines;
      expect(b.angle - a.angle).toBe(shown(ex)[0]);
    }
  });

  it('Stufe 1, AB II: the right pair does not always stand at the same place', () => {
    const places = new Set(items(1, 2).map((ex) => (ex.answer.kind === 'choice' ? ex.answer.correct : -1)));
    expect(places).toEqual(new Set([0, 1, 2]));
  });

  it('Stufe 2: Nebenwinkel = 180° − given, also at AB III: only the right pair adds up to 180°', () => {
    for (const ab of [1, 2] as const) for (const ex of items(2, ab)) expect(ex.answer.kind === 'number' && ex.answer.value).toBe(180 - shown(ex)[0]);
    for (const ex of items(2, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const sums = ex.answer.options.map((o) => [...o.label.matchAll(/(\d+)°/g)].reduce((sum, m) => sum + Number(m[1]), 0));
      expect(sums.filter((s) => s === 180)).toHaveLength(1);
      expect(sums[ex.answer.correct]).toBe(180);
    }
  });

  it('Stufe 2, AB III needs no idea beyond 180° minus α: one calculation, below the two of Stufe 3', () => {
    const calculations = (ex: Exercise) => ex.steps.filter((s) => typeof s === 'string' && /[−:]\s\d/.test(s)).length;
    for (const ex of items(2, 3)) expect(calculations(ex)).toBe(1);
    for (const ex of items(3, 3)) expect(calculations(ex)).toBe(2);
  });

  it('Stufe 3: the four angles add up to 360°, opposite ones are equal', () => {
    for (const ex of items(3, 1)) {
      const v = values(ex);
      const alpha = shown(ex)[0];
      expect(alpha + v.beta + v.gamma + v.delta).toBe(360);
      expect(v.gamma).toBe(alpha);
      expect(v.beta).toBe(v.delta);
    }
    for (const ex of items(3, 3)) {
      const v = values(ex);
      expect(v.alpha + v.beta + v.gamma + v.delta).toBe(360);
      expect(v.alpha + v.gamma).toBe(shown(ex)[0]);
    }
    for (const ex of items(3, 2)) {
      const v = values(ex);
      const [alpha, beta] = shown(ex);
      expect(v.gamma).toBe(alpha);
      expect(v.delta).toBe(180 - beta);
    }
  });
});
