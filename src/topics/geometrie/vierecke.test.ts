import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { DEFAULT_CONTEXT } from '../../core/generate';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { viereckeSkill as skill } from './vierecke';

describeSkill(skill, { minDistinct: { 1: 30, 2: 25, 3: 25 } });

const items = (stufe: Stufe, ab: Ab, n = 200): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 353 + 31), stufe, { ...DEFAULT_CONTEXT, ab }));
const label = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options[ex.answer.correct].label : '');

describe('Vierecke: independent checks', () => {
  it('Stufe 3, AB III: a more general name is not answered with its definition, which would read as a yes', () => {
    const general: Record<string, string[]> = { Quadrat: ['Rechteck', 'Raute', 'Parallelogramm', 'Drachenviereck', 'Trapez'], Rechteck: ['Parallelogramm', 'Trapez'], Raute: ['Parallelogramm', 'Drachenviereck', 'Trapez'], Parallelogramm: ['Trapez'] };
    for (const ex of items(3, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      for (const o of ex.answer.options) {
        if (o.label === label(ex)) continue;
        const moreGeneral = general[label(ex)].includes(o.label);
        if (moreGeneral) expect(o.whyWrong, `${ex.prompt} ${o.label}`).toContain('genaueren Namen');
        else expect(o.whyWrong, `${ex.prompt} ${o.label}`).not.toContain('genaueren Namen');
        if (o.label === 'Trapez') expect(o.whyWrong).not.toContain('passt auch');
      }
    }
  });

  it('Stufe 1: the name fits the drawn shape and its labels', () => {
    const names: Record<string, string> = { quadrat: 'Quadrat', rechteck: 'Rechteck', raute: 'Raute', parallelogramm: 'Parallelogramm' };
    for (const ex of items(1, 1)) {
      if (ex.visual?.type !== 'shape') throw new Error('shape expected');
      expect(label(ex)).toBe(names[ex.visual.shape]);
      const [a, b] = ex.visual.sideLabels!;
      expect(a === b).toBe(ex.visual.shape === 'quadrat' || ex.visual.shape === 'raute');
    }
  });

  it('Stufe 1, AB III: the side opposite has the same length', () => {
    for (const ex of items(1, 3)) {
      if (ex.visual?.type !== 'shape' || ex.answer.kind !== 'multi') throw new Error('shape and multi expected');
      const [top, right] = ex.visual.sideLabels!.map((s) => (s ? Number(s.replace(/\D/g, '')) : null));
      expect(ex.answer.fields.map((f) => f.value)).toEqual([top, right]);
    }
  });

  it('Stufe 1: the side drawn longer carries the longer length, not to a wildly different scale', () => {
    for (const ab of [1, 3] as const) {
      for (const ex of items(1, ab, 400)) {
        if (ex.visual?.type !== 'shape') throw new Error('shape expected');
        if (ex.visual.shape !== 'rechteck' && ex.visual.shape !== 'parallelogramm') continue;
        const [top, right] = ex.visual.sideLabels!.slice(0, 2).map((t) => Number(t!.replace(/\D/g, '')));
        expect(top).toBeGreaterThan(right);
        expect(top / right).toBeLessThanOrEqual(2.5);
      }
    }
  });

  it('Stufe 1, AB I: Quadrat and Raute are told apart by a stated angle, not by the position of the figure', () => {
    for (const ex of items(1, 1, 300)) {
      if (ex.visual?.type !== 'shape') throw new Error('shape expected');
      if (ex.visual.shape === 'quadrat') expect(ex.prompt).toContain('vier rechte Winkel');
      if (ex.visual.shape === 'raute') expect(ex.prompt).toContain('keinen rechten Winkel');
    }
  });

  it('Stufe 1, AB II: the text fixes the figure, by an inclusion table', () => {
    const also: Record<string, string[]> = { Quadrat: ['Rechteck', 'Raute', 'Parallelogramm'], Rechteck: ['Parallelogramm'], Raute: ['Parallelogramm'], Parallelogramm: [] };
    for (const ex of items(1, 2, 400)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      expect(ex.prompt).toContain('am genauesten');
      expect(ex.prompt).toMatch(/Alle vier Seiten|Die Seiten gegenüber/);
      for (const o of ex.answer.options) if (also[label(ex)].includes(o.label)) expect(o.whyWrong).toContain('Der Name passt auch');
    }
  });

  it('Stufe 2: the pairs of parallel sides fit the figure', () => {
    const pairs: Record<string, string> = { trapez: '1', parallelogramm: '2', rechteck: '2', raute: '2', quadrat: '2', drachen: '0' };
    for (const ex of items(2, 2)) {
      if (ex.visual?.type !== 'shape') throw new Error('shape expected');
      expect(label(ex)).toBe(pairs[ex.visual.shape]);
    }
  });

  it('Stufe 3: "Jedes Quadrat ist ein Rechteck" holds, its reverse does not, and no statement needs a Trapez definition', () => {
    const all = [...items(3, 1), ...items(3, 2)];
    const quadrat = all.find((ex) => ex.prompt.includes('Jedes Quadrat ist ein Rechteck'))!;
    expect(label(quadrat)).toBe('Stimmt');
    const rechteck = all.find((ex) => ex.prompt.includes('Jedes Rechteck ist ein Quadrat'))!;
    expect(label(rechteck)).toBe('Stimmt nicht');
    for (const ex of all) if (/ist ein Trapez/.test(ex.prompt)) expect(ex.prompt).toContain('Drachenviereck');
    for (const ex of all) expect(ex.prompt).not.toMatch(/Parallelogramm ist ein Trapez/);
    for (const ex of items(3, 3)) expect(ex.prompt).not.toContain('Trapez');
  });
});
