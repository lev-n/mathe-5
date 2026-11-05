import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { DEFAULT_CONTEXT } from '../../core/generate';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { grundbegriffeSkill as skill } from './grundbegriffe';

describeSkill(skill, { minDistinct: { 1: 25, 2: 30, 3: 30 } });

const items = (stufe: Stufe, ab: Ab, n = 120): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 311 + 7), stufe, { ...DEFAULT_CONTEXT, ab }));
const label = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options[ex.answer.correct].label : '');

describe('Punkt, Strecke, Gerade: independent checks', () => {
  it('Stufe 2: the letter of a point on the line stands clear of the line', () => {
    for (const ex of items(2, 1, 300)) {
      if (ex.visual?.type !== 'lines') throw new Error('lines expected');
      // Up and to the right of the dot; a line falling to the right stays below it.
      for (const l of ex.visual.lines) expect(l.angle % 180, ex.key).toBeGreaterThan(90);
    }
  });

  it('Stufe 1: the right name fits the drawn line', () => {
    const names = { strecke: 'Strecke', gerade: 'Gerade', halbgerade: 'Halbgerade' };
    for (const ex of items(1, 1)) {
      if (ex.visual?.type !== 'lines') throw new Error('lines expected');
      expect(label(ex)).toBe(names[ex.visual.lines[0].kind!]);
    }
  });

  it('Stufe 2: the Abstand is the difference to the Gerade, recomputed from the picture', () => {
    for (const ex of items(2, 2)) {
      if (ex.visual?.type !== 'coordinateGrid' || ex.answer.kind !== 'number') throw new Error('grid and number expected');
      const [a, b] = ex.visual.segments![0];
      const p = ex.visual.points[0];
      expect(ex.answer.value).toBe(a.y === b.y ? Math.abs(p.y - a.y) : Math.abs(p.x - a.x));
    }
  });

  it('Stufe 2: only one point has the asked Abstand, and only the perpendicular line shows it', () => {
    for (const ex of items(2, 3)) {
      if (ex.visual?.type === 'coordinateGrid') {
        const line = ex.visual.segments![0][0].y;
        const asked = Number(/Abstand (\d+)/.exec(ex.prompt)![1]);
        const hits = ex.visual.points.filter((p) => Math.abs(p.y - line) === asked);
        expect(hits.map((p) => p.label)).toEqual([label(ex)]);
      } else if (ex.visual?.type === 'lines') {
        const [g, ...through] = ex.visual.lines;
        const perp = through.filter((l) => (l.angle - g.angle + 360) % 180 === 90);
        expect(perp.map((l) => l.label)).toEqual([label(ex)]);
      } else throw new Error('picture expected');
    }
  });

  it('Stufe 3: Durchmesser is twice the Radius; the position follows from the radius', () => {
    for (const ex of items(3, 1)) {
      if (ex.answer.kind !== 'number') throw new Error('number expected');
      const given = Number(/(\d+)/.exec(ex.prompt)![1]);
      expect(ex.answer.value).toBe(ex.prompt.includes('den Radius') ? 2 * given : given / 2);
    }
    for (const ex of items(3, 2)) {
      if (!ex.prompt.includes('Wo liegt P')) continue;
      const [first, dist] = [...ex.prompt.matchAll(/(\d+)/g)].map((m) => Number(m[1]));
      const r = ex.prompt.includes('Durchmesser') ? first / 2 : first;
      expect(label(ex)).toBe(dist < r ? 'Innerhalb des Kreises' : dist === r ? 'Auf dem Kreis' : 'Außerhalb des Kreises');
    }
    for (const ex of items(3, 3)) {
      const [diameter, dist] = [...ex.prompt.matchAll(/(\d+)/g)].map((m) => Number(m[1]));
      const r = diameter / 2;
      if (ex.answer.kind === 'number') expect(ex.answer.value).toBe(Math.abs(dist - r));
      else expect(Number(label(ex).replace(/\D/g, '')) > r).toBe(ex.prompt.includes('außerhalb'));
    }
  });

  it('Stufe 3 stays with the Kreis and its points: no Gerade, no Tangente (§2.6), and M is introduced', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(3, ab)) {
        expect(JSON.stringify([ex.prompt, ex.steps, ex.hints])).not.toMatch(/Gerade|berührt|Tangente/);
        if (ex.prompt.includes('M')) expect(ex.prompt).toMatch(/um M|Punkt M/);
      }
    }
  });

  it('Stufe 2, AB III: no two lines share a letter, and the voice is told which line stands at the right angle', () => {
    for (const ex of items(2, 3, 300)) {
      if (ex.visual?.type !== 'lines') continue;
      const names = ex.visual.lines.map((l) => l.label);
      expect(new Set(names).size).toBe(names.length);
      expect(ex.srText).toContain(`Linie ${label(ex)} bildet mit`);
    }
  });
});
