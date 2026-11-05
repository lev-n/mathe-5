import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { taskSpeech } from '../../ui/practice/readAloud';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { sum } from './common';
import { diagrammeSkill as skill } from './diagramme';

describeSkill(skill, { minDistinct: 30 });

const items = (stufe: Stufe, ab: Ab, n = 150): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 509 + 3), stufe, { ...CTX, ab }));

describe('daten.diagramme: answers recomputed', () => {
  it('worked steps add up and end in the result', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab, 60)) {
          expect(checkWorkedSolution(ex)).toEqual([]);
        }
      }
    }
  });

  it('Stufe 1 uses the axis steps 5 and 10, Stufe 2 the steps 50 and 1 000', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(1, ab)) if (ex.visual?.type === 'barChart') expect([5, 10]).toContain(ex.visual.axisStep);
      for (const ex of items(2, ab)) if (ex.visual?.type === 'barChart') expect([50, 1000]).toContain(ex.visual.axisStep);
    }
  });

  it('every value of a chart can be read: on a line or halfway between two', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab)) {
          if (ex.visual?.type !== 'barChart') continue;
          const halfStep = ex.visual.axisStep / 2;
          for (const v of ex.visual.values) expect(v % halfStep).toBe(0);
        }
      }
    }
  });

  it('Stufe 1, AB I: the answer is the value of the asked bar', () => {
    for (const ex of items(1, 1)) {
      if (ex.visual?.type !== 'barChart' || ex.answer.kind !== 'number') throw new Error('expected a chart with a number answer');
      expect(ex.visual.values).toContain(ex.answer.value);
    }
  });

  it('Stufe 2, AB I: the answer is a sum or a difference of two bars', () => {
    for (const ex of items(2, 1)) {
      if (ex.visual?.type !== 'barChart' || ex.answer.kind !== 'number') throw new Error('expected a chart with a number answer');
      const v = ex.visual.values;
      const pairs = v.flatMap((a, i) => v.flatMap((b, j) => (i === j ? [] : [a + b, a - b])));
      expect(pairs).toContain(ex.answer.value);
    }
  });

  it('Stufe 2, AB II: the answer is the sum of all bars', () => {
    for (const ex of items(2, 2)) {
      if (ex.visual?.type !== 'barChart') throw new Error('expected a chart');
      expect(ex.answer).toMatchObject({ value: sum(ex.visual.values) });
    }
  });

  it('Stufe 3, legend: only the right value divides all values of the table', () => {
    for (const ex of items(3, 2).filter((e) => e.key.includes(':legende:'))) {
      if (ex.answer.kind !== 'choice' || ex.visual?.type !== 'table') throw new Error('expected a table and a choice');
      const values = ex.visual.rows.map((r) => Number(r[1]));
      const divides = ex.answer.options.map((o) => values.every((v) => v % Number(/\d+/.exec(o.label)![0]) === 0));
      expect(divides.filter(Boolean).length).toBe(1);
      expect(divides[ex.answer.correct]).toBe(true);
    }
  });

  it('Stufe 3, chart choices: only the right chart has the values of the table', () => {
    for (const ab of [1, 3] as Ab[]) {
      for (const ex of items(3, ab)) {
        if (ex.answer.kind !== 'choice' || ex.visual?.type !== 'table') throw new Error('expected a table and a choice');
        const rows = ex.visual.rows.filter((r) => r[0] !== 'Zusammen');
        const totalRow = ex.visual.rows.find((r) => r[0] === 'Zusammen');
        const num = (cell: string) => Number(cell.replace(/\u202F/g, ''));
        const known = rows.map((r) => (r[1] === '?' ? null : num(r[1])));
        const missing = totalRow ? num(totalRow[1]) - sum(known.filter((k): k is number => k !== null)) : null;
        const want = known.map((k) => k ?? missing);
        const fitting = ex.answer.options.map((o) => (o.visual?.type === 'barChart' ? o.visual.values.every((v, i) => v === want[i]) : false));
        expect(fitting.filter(Boolean).length).toBe(1);
        expect(fitting[ex.answer.correct]).toBe(true);
      }
    }
  });

  it('Stufe 2, AB III, one bar against two: never a tie, so a smaller number exists', () => {
    const items2 = items(2, 3, 800).filter((e) => e.key.includes(':vergleich:'));
    expect(items2.length).toBeGreaterThan(100);
    for (const ex of items2) {
      if (ex.answer.kind !== 'number') throw new Error('expected a number');
      expect(ex.answer.value, ex.key).toBeGreaterThan(0);
    }
  });

  it('Stufe 3, axis step: the right step alone has 5 to 10 lines, and its place among the options says nothing', () => {
    const places = new Set<number>();
    const rightSteps = new Set<number>();
    for (const ex of items(3, 2, 500).filter((e) => e.key.includes(':schritt:'))) {
      if (ex.answer.kind !== 'choice' || ex.visual?.type !== 'table') throw new Error('expected a table and a choice');
      const stepOf = (label: string) => Number(label.replace(/\D/g, ''));
      const top = Math.max(...ex.visual.rows.map((r) => Number(r[1].replace(/\D/g, ''))));
      const steps = ex.answer.options.map((o) => stepOf(o.label));
      const fitting = steps.filter((s) => top / s + 1 >= 5 && top / s + 1 <= 10);
      const right = steps[ex.answer.correct];
      expect(fitting, ex.key).toEqual([right]);
      places.add([...steps].sort((a, b) => a - b).indexOf(right));
      rightSteps.add(right);
    }
    expect([...places].sort()).toEqual([0, 1, 2]);
    expect(rightSteps.size).toBeGreaterThanOrEqual(4);
  });

  it('Stufe 3, legend: the right and the wrong legends vary, and a wrong one mostly fits some values', () => {
    const rights = new Set<number>();
    const wrongs = new Set<number>();
    let traps = 0;
    let all = 0;
    for (const ex of items(3, 2, 800).filter((e) => e.key.includes(':legende:'))) {
      if (ex.answer.kind !== 'choice' || ex.visual?.type !== 'table') throw new Error('expected a table and a choice');
      const values = ex.visual.rows.map((r) => Number(r[1]));
      const correct = ex.answer.correct;
      ex.answer.options.forEach((o, i) => {
        const n = Number(/\d+/.exec(o.label)![0]);
        if (i === correct) {
          rights.add(n);
        } else {
          wrongs.add(n);
          all++;
          if (values.some((v) => v % n === 0)) traps++;
        }
      });
    }
    expect(rights.size).toBeGreaterThanOrEqual(8);
    expect(wrongs.size).toBeGreaterThanOrEqual(8);
    expect(traps / all).toBeGreaterThan(0.9);
  });

  it('T16: the voice says a class as a number and a letter, never as one word or as a unit', () => {
    let classes = 0;
    for (const stufe of [1, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab, 200)) {
          const voice = taskSpeech(ex, ex.hints);
          expect(voice, ex.key).not.toMatch(/fünf[a-f]\b|\bAr\b/);
          if (/fünf [b-f]\b/.test(voice)) classes++;
        }
      }
    }
    expect(classes).toBeGreaterThan(0);
  });

  it('Stufe 1, half a Kästchen: the hints speak of the chart on screen', () => {
    const halves = items(1, 2, 400).filter((e) => e.visual?.type === 'barChart');
    const hints = (e: Exercise) => (e.bugs ?? []).map((b) => b.hint).join(' ');
    const lying = halves.filter((e) => e.visual?.type === 'barChart' && e.visual.horizontal);
    expect(lying.length).toBeGreaterThan(0);
    for (const ex of lying) {
      expect(hints(ex)).not.toMatch(/über|unter|Säule/);
      expect(hints(ex)).toMatch(/rechts von/);
    }
    for (const ex of halves.filter((e) => !lying.includes(e))) expect(hints(ex)).not.toMatch(/rechts|links|Balken/);
  });

  it('Stufe 3: option charts read at least as hard as Stufe 2, and fit one printed page as Balkendiagramme on one axis', () => {
    for (const ab of [1, 3] as Ab[]) {
      for (const ex of items(3, ab)) {
        if (ex.answer.kind !== 'choice') throw new Error('expected a choice');
        const charts = ex.answer.options.map((o) => o.visual);
        for (const c of charts) {
          if (c?.type !== 'barChart') throw new Error('expected a chart');
          expect([50, 1000]).toContain(c.axisStep);
          expect(c.categories.length).toBe(4);
          expect(c.horizontal).toBe(true);
          expect(c.axisMax).toBe(5 * c.axisStep);
          for (const v of c.values) expect(v).toBeLessThanOrEqual(c.axisMax);
        }
        const right = charts[ex.answer.correct];
        if (right?.type !== 'barChart') throw new Error('expected a chart');
        expect(right.values.some((v) => v % right.axisStep !== 0)).toBe(true);
      }
    }
  });

  it('Stufe 3, AB II: the data on screen decide every choice', () => {
    for (const ex of items(3, 2)) {
      expect(ex.visual?.type).toBe('table');
      if (ex.answer.kind !== 'choice') throw new Error('expected a choice');
      for (const o of ex.answer.options) expect(o.label).not.toMatch(/Text|Urliste/);
    }
    for (const ex of items(3, 2).filter((e) => /:form:(lang|genau):/.test(e.key))) {
      if (ex.visual?.type !== 'table') throw new Error('expected a table');
      for (const r of ex.visual.rows) expect(Number(r[1]) % 5).not.toBe(0);
    }
  });
});
