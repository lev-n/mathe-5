import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { DEFAULT_CONTEXT } from '../../core/generate';
import type { Ab, Cell, Exercise, Stufe } from '../../core/types';
import { countAxes, symmetricAt, symmetrieSkill as skill } from './symmetrie';

describeSkill(skill);

const items = (stufe: Stufe, ab: Ab, n = 150): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 359 + 37), stufe, { ...DEFAULT_CONTEXT, ab }));
const label = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options[ex.answer.correct].label : '');
const ids = (cells: readonly Cell[]) => new Set(cells.map((c) => c.join()));

describe('Achsensymmetrie: independent checks', () => {
  it('Stufe 1, AB I: the answer fits the figure, recomputed at the axis', () => {
    for (const ex of items(1, 1)) {
      if (ex.visual?.type !== 'grid') throw new Error('grid expected');
      expect(label(ex)).toBe(symmetricAt(ex.visual.cells, ex.visual.axis!.at) ? 'Ja' : 'Nein');
    }
  });

  it('Stufe 1, AB II: the count on the grid is recomputed', () => {
    expect(countAxes([[0, 0], [1, 0], [0, 1], [1, 1]])).toBe(4);
    expect(countAxes([[0, 0], [1, 0], [2, 0]])).toBe(2);
    for (const ex of items(1, 2)) if (ex.visual?.type === 'grid') expect(label(ex)).toBe(String(countAxes(ex.visual.cells)));
  });

  it('Stufe 1, AB III: exactly one option is symmetric', () => {
    for (const ex of items(1, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const hits = ex.answer.options.filter((o) => o.visual?.type === 'grid' && symmetricAt(o.visual.cells, o.visual.axis!.at));
      expect(hits.map((o) => o.label)).toEqual([label(ex)]);
    }
  });

  it('Stufe 2: given and solution together are symmetric at the vertical axis', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(2, ab)) {
        if (ex.answer.kind !== 'cells') throw new Error('cells expected');
        expect(ex.answer.axis).toEqual({ orientation: 'vertical', at: 3 });
        expect(symmetricAt([...ex.answer.given, ...ex.answer.solution], 3)).toBe(true);
      }
    }
  });

  it('Stufe 3, AB II: the solution is exactly the mirror image at the diagonal', () => {
    for (const ex of items(3, 2)) {
      if (ex.answer.kind !== 'cells') throw new Error('cells expected');
      const n = ex.answer.width;
      const main = ex.prompt.includes('oben links');
      const mirror = ([x, y]: Cell): Cell => (main ? [y, x] : [n - 1 - y, n - 1 - x]);
      expect(ids(ex.answer.solution)).toEqual(ids(ex.answer.given.map(mirror)));
      expect(checkAnswer(ex.answer, { kind: 'cells', cells: [...ex.answer.solution] }).correct).toBe(true);
    }
  });

  it('Stufe 3, AB III: a figure is symmetric to the diagonal exactly when every mirror image is painted', () => {
    for (const ex of items(3, 3)) {
      if (ex.visual?.type !== 'grid') continue;
      const painted = ids(ex.visual.cells);
      const fits = ex.visual.cells.every(([x, y]) => painted.has([y, x].join()));
      expect(label(ex)).toBe(fits ? 'Ja' : 'Nein');
    }
  });

  it('Stufe 3: the caption fits the grid, and no task speaks of a line that is not drawn', () => {
    for (const ex of items(3, 2)) {
      if (ex.visual?.type !== 'grid') throw new Error('grid expected');
      // About 8.1 units per letter; the picture is 32 units per cell plus 28.
      expect(ex.visual.caption!.length * 8.1).toBeLessThanOrEqual(ex.visual.width * 32 + 28 - 4);
    }
    for (const ex of items(3, 3)) if (ex.visual?.type === 'grid') expect(ex.prompt).toContain('Die Spiegelachse läuft schräg von der Ecke oben links zur Ecke unten rechts.');
  });

  it('Stufe 3, AB I: the axes of the Vierecke are the known ones', () => {
    const axes: Record<string, string> = { quadrat: '4', rechteck: '2', raute: '2', parallelogramm: '0', drachen: '1', trapez: '1' };
    for (const ex of items(3, 1)) {
      if (ex.visual?.type !== 'shape') throw new Error('shape expected');
      expect(label(ex)).toBe(axes[ex.visual.shape]);
    }
  });

  it('Stufe 3, AB I: the text names the Viereck, because the picture alone does not tell a turned Raute from a Quadrat', () => {
    const names: Record<string, RegExp> = { quadrat: /Quadrat/, rechteck: /Rechteck/, raute: /Raute/, parallelogramm: /Parallelogramm/, drachen: /Drachenviereck/, trapez: /Trapez/ };
    for (const ex of items(3, 1)) {
      if (ex.visual?.type !== 'shape') throw new Error('shape expected');
      expect(ex.prompt).toMatch(names[ex.visual.shape]);
      expect(ex.srText).toMatch(names[ex.visual.shape]);
    }
  });
});
