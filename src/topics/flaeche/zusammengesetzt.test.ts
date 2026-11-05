import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { lFormPoints } from '../../ui/visuals/ShapeVisual';
import { lSides } from './common';
import { allItems, fieldOf, numberOf, numbersIn } from './testing';
import { umfangSkill } from './umfang';
import { zusammengesetztSkill } from './zusammengesetzt';

describeSkill(zusammengesetztSkill);

describe('flaeche.zusammengesetzt: answers recomputed', () => {
  it('on a grid the answer is the number of cells, also when a Kästchen is worth more', () => {
    let seen = 0;
    for (const ex of allItems(zusammengesetztSkill)) {
      const v = ex.visual;
      if (v?.type !== 'grid') continue;
      if (ex.answer.kind === 'multi') {
        expect(fieldOf(ex, 'c'), ex.key).toBe(v.cells.length);
        expect(fieldOf(ex, 'a') + fieldOf(ex, 'b'), ex.key).toBe(v.cells.length);
      } else {
        const worth = /gitter-wert:(\d)/.exec(ex.key);
        const side = /:loch:.*:(\d)$/.exec(ex.key);
        expect(numberOf(ex), ex.key).toBe(v.cells.length * (worth ? Number(worth[1]) : side ? Number(side[1]) ** 2 : 1));
      }
      seen++;
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('the split line on a grid cuts the figure into two rectangles', () => {
    for (const ex of allItems(zusammengesetztSkill)) {
      const v = ex.visual;
      if (v?.type !== 'grid' || !v.axis) continue;
      const { orientation, at } = v.axis;
      const before = v.cells.filter(([x, y]) => (orientation === 'vertical' ? x : y) < at);
      const after = v.cells.filter(([x, y]) => (orientation === 'vertical' ? x : y) >= at);
      for (const part of [before, after]) {
        const xs = part.map((c) => c[0]);
        const ys = part.map((c) => c[1]);
        expect(part.length, ex.key).toBe((Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1));
      }
    }
  });

  it('an L-form with lengths: big rectangle minus corner, and both ways give the same', () => {
    let seen = 0;
    for (const ex of allItems(zusammengesetztSkill)) {
      const l = ex.visual?.type === 'shape' ? ex.visual.lForm : undefined;
      if (!l) continue;
      const area = l.w * l.h - l.cutW * l.cutH;
      if (ex.answer.kind === 'multi') {
        expect(fieldOf(ex, 'flaeche'), ex.key).toBe(area);
        expect(fieldOf(ex, 'links') + fieldOf(ex, 'rechts'), ex.key).toBe(area);
        expect(fieldOf(ex, 'gross') - fieldOf(ex, 'ecke'), ex.key).toBe(area);
      } else expect(numberOf(ex), ex.key).toBe(area);
      seen++;
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('stories and holes: the part is subtracted; a corner from the rest is exact', () => {
    for (const ex of allItems(zusammengesetztSkill)) {
      const m = /:(?:sache:[^:]+|loch):(\d+)x(\d+)-(\d+)x(\d+)/.exec(ex.key);
      if (m) {
        const [a, b, c, d] = m.slice(1).map(Number);
        expect(numberOf(ex), ex.key).toBe(a * b - c * d);
      }
      const corner = /:ecke-gesucht:(\d+)x(\d+)-(\d+)/.exec(ex.key);
      if (corner) expect(numberOf(ex), ex.key).toBe(Number(corner[3]));
    }
  });

  it('every Stufe keeps its content: grid on Stufe 1, lengths on Stufe 2, cut-outs on Stufe 3', () => {
    for (const ex of allItems(zusammengesetztSkill)) {
      if (ex.stufe === 1) expect(ex.visual?.type, ex.key).toBe('grid');
      if (ex.stufe === 2) expect(ex.key).toMatch(/:laengen/);
      if (ex.stufe === 3) expect(ex.key).toMatch(/:(ecke-abziehen|loch|sache|zwei-wege|ecke-gesucht):/);
    }
  });

  it('the hint for the large rectangle holds for every L-form: its sides are the side below and the side on the left', () => {
    let seen = 0;
    for (const ex of allItems(zusammengesetztSkill)) {
      if (!ex.key.includes(':ecke-abziehen:') || ex.visual?.type !== 'shape' || !ex.visual.lForm) continue;
      expect(ex.hints.join(' '), ex.key).not.toMatch(/längst/);
      expect(ex.hints[0], ex.key).toMatch(/unten.*links/);
      const labels = ex.visual.sideLabels!;
      expect(numbersIn(labels[4]!)[0], ex.key).toBe(ex.visual.lForm.w);
      expect(numbersIn(labels[5]!)[0], ex.key).toBe(ex.visual.lForm.h);
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('every labelled L-form keeps its labels apart and inside the picture (geometry of the shape visual)', () => {
    // Text boxes as ShapeVisual places them, 16 px type: a digit 9 px, a space 4 px, the unit up to 22 px, 19 px high.
    const width = (label: string) => label.replace(/\D/g, '').length * 9 + 4 + 22;
    let seen = 0;
    for (const skill of [zusammengesetztSkill, umfangSkill]) {
      for (const ex of allItems(skill, undefined, 200)) {
        if (ex.visual?.type !== 'shape' || !ex.visual.lForm) continue;
        const l = ex.visual.lForm;
        const labels = lSides(l).map((s) => `${s} cm`);
        const p = lFormPoints(l);
        // steep side at the cut: left aligned beside it; flat side at the cut: right aligned over it
        const steep = { x0: p[1][0] + 7, x1: p[1][0] + 7 + width(labels[1]), y0: (p[1][1] + p[2][1]) / 2 + 5 - 15, y1: (p[1][1] + p[2][1]) / 2 + 5 + 4 };
        const flat = { x0: p[3][0] - width(labels[2]), x1: p[3][0], y0: p[2][1] - 7 - 15, y1: p[2][1] - 7 + 4 };
        const overlap = steep.x0 < flat.x1 && flat.x0 < steep.x1 && steep.y0 < flat.y1 && flat.y0 < steep.y1;
        expect(overlap, ex.key).toBe(false);
        expect(flat.x0, `${ex.key}: the flat label stays over its side`).toBeGreaterThanOrEqual(p[2][0]);
        expect(p[0][0] - 7 - width(labels[5]), `${ex.key}: left label inside`).toBeGreaterThanOrEqual(-38);
        expect(p[4][0] + 7 + width(labels[3]), `${ex.key}: right label inside`).toBeLessThanOrEqual(238);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(200);
  });

  it('Stufe 3 AB II asks more than Stufe 2 AB II: two real products, nothing to count, no window of 1 m by 1 m', () => {
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const items = allItems(zusammengesetztSkill, undefined, 300);
    const s2 = items.filter((ex) => ex.stufe === 2 && ex.ab === 2).map(numberOf);
    const s3 = items.filter((ex) => ex.stufe === 3 && ex.ab === 2);
    expect(median(s3.map(numberOf))).toBeGreaterThan(median(s2));
    expect(Math.min(...s3.map(numberOf))).toBeGreaterThanOrEqual(Math.min(...s2));
    for (const ex of s3) {
      const [a, b, c, d] = /(\d+)x(\d+)-(\d+)x(\d+)/.exec(ex.key)!.slice(1).map(Number);
      expect(a * b, ex.key).toBeGreaterThanOrEqual(70);
      expect(Math.min(c, d), ex.key).toBeGreaterThanOrEqual(2);
      if (ex.key.includes(':loch:')) {
        expect(ex.prompt, ex.key).not.toMatch(/1 cm/);
        expect(numberOf(ex), `${ex.key}: more than counting`).not.toBe((ex.visual as { cells: unknown[] }).cells.length);
      }
    }
  });

  it('a Sandkasten stays smaller than a room', () => {
    for (const ex of allItems(zusammengesetztSkill)) {
      const m = /:sache:Ein Schulhof:\d+x\d+-(\d+)x(\d+)/.exec(ex.key);
      if (m) expect(Math.max(Number(m[1]), Number(m[2])), ex.key).toBeLessThanOrEqual(6);
    }
  });

  it('worked steps calculate correctly and end with the result', () => {
    for (const ex of allItems(zusammengesetztSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });
});
