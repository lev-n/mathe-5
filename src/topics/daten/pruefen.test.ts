import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { taskSpeech } from '../../ui/practice/readAloud';
import { PEOPLE } from '../shared';
import { checkStepText } from '../step-check';
import { CTX } from '../test-utils';
import { pruefenSkill as skill } from './pruefen';

describeSkill(skill, { minDistinct: { 1: 30, 2: 30, 3: 20 } });

const items = (stufe: Stufe, ab: Ab, n = 150): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 271 + 7), stufe, { ...CTX, ab }));

/** The numbers of an axis table, from 0 upwards. */
const axisOf = (ex: Exercise) => {
  if (ex.visual?.type !== 'table') throw new Error('expected a table');
  return ex.visual.rows.map((r) => Number(r[1].replace(/\u202F/g, ''))).reverse();
};

describe('daten.pruefen: answers recomputed', () => {
  it('every item is a choice, and the arithmetic lines of its steps hold', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab, 60)) {
          expect(ex.answer.kind).toBe('choice');
          for (const s of ex.steps) expect(checkStepText(typeof s === 'string' ? s : s.text)).toBeNull();
        }
      }
    }
  });

  it('Stufe 1: the right option names the bar that differs from the list, or none', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of items(1, ab)) {
        if (ex.visual?.type !== 'barChart' || ex.answer.kind !== 'choice') throw new Error('expected a chart and a choice');
        const { categories, values } = ex.visual;
        // the list names the values in the order of the chart
        const listed = [...ex.context!.matchAll(/\d+/g)].map((m) => Number(m[0]));
        expect(listed.length).toBe(categories.length);
        const off = categories.filter((_, i) => listed[i] !== values[i]);
        const right = ex.answer.options[ex.answer.correct].label;
        if (off.length === 0) expect(right).toMatch(/^Ja/);
        else {
          expect(off.length).toBe(1);
          expect(right).toContain(`„${off[0]}“`);
        }
      }
    }
  });

  it('Stufe 1, T16: the voice says the values of the list as numbers, never as dates', () => {
    let wheels = 0;
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(1, ab, 600)) {
        const voice = taskSpeech(ex, ex.hints);
        expect(voice, ex.key).not.toMatch(/\p{L}(?:zig|ßig|zehn|hundert)ste[n]?\b|\b(?:zehn|elf|zwölf|fünf|sechs|sieben|acht|neun|zwanzig)te[n]?\b/u);
        if (/\bRäder\b|Rädern\b/.test(ex.context ?? '')) wheels++;
      }
    }
    expect(wheels).toBeGreaterThan(0);
  });

  it('a first name is not part of the key: the same task with another name is a repeat', () => {
    const names = new RegExp(`\\b(${PEOPLE.map((p) => p.name).join('|')})\\b`, 'g');
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        const keyOf = new Map<string, string>();
        for (const ex of items(stufe, ab, 400)) {
          expect(ex.key, ex.key).not.toMatch(names);
          const options = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => (o.visual ? JSON.stringify(o.visual) : o.label)).sort() : [];
          const task = JSON.stringify([ex.context, ex.prompt, ex.visual, options]).replace(names, '#');
          if (keyOf.has(task)) expect(ex.key).toBe(keyOf.get(task));
          keyOf.set(task, ex.key);
        }
      }
    }
  });

  it('Stufe 3, uneven axis: enough axes for a worksheet without a repeat', () => {
    const keys = new Set(items(3, 2, 800).filter((e) => e.key.includes(':ungleich:')).map((e) => e.key));
    expect(keys.size).toBeGreaterThanOrEqual(20);
  });

  it('Stufe 2: every axis is cut, and the values stay inside it', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(2, ab)) {
        if (ex.visual?.type !== 'barChart') throw new Error('expected a chart');
        expect(ex.visual.axisStart).toBeGreaterThan(0);
        for (const v of ex.visual.values) expect(v).toBeGreaterThan(ex.visual.axisStart!);
        for (const v of ex.visual.values) expect((v - ex.visual.axisStart!) % (ex.visual.axisStep / 2)).toBe(0);
      }
    }
  });

  it('Stufe 2, AB III: the claim "mehr als doppelt so groß" never holds', () => {
    for (const ex of items(2, 3)) {
      if (ex.visual?.type !== 'barChart') throw new Error('expected a chart');
      expect(Math.max(...ex.visual.values)).toBeLessThan(2 * Math.min(...ex.visual.values));
    }
  });

  it('Stufe 3, AB I: the only chart from 0 is the right one, all show the same values', () => {
    for (const ex of items(3, 1)) {
      if (ex.answer.kind !== 'choice') throw new Error('expected a choice');
      const charts = ex.answer.options.map((o) => o.visual);
      expect(new Set(charts.map((c) => (c?.type === 'barChart' ? c.values.join() : ''))).size).toBe(1);
      const fromZero = charts.map((c) => (c?.type === 'barChart' ? (c.axisStart ?? 0) === 0 : false));
      expect(fromZero.filter(Boolean).length).toBe(1);
      expect(fromZero[ex.answer.correct]).toBe(true);
    }
  });

  it('Stufe 3, uneven axes: a table shows the axis, its steps really differ, and no sentence lists its numbers', () => {
    for (const ex of [...items(3, 3), ...items(3, 2).filter((e) => e.visual)]) {
      const ticks = axisOf(ex);
      expect(ticks.length).toBe(5);
      expect(ticks[0]).toBe(0);
      const steps = ticks.slice(1).map((t, i) => t - ticks[i]);
      expect(new Set(steps).size).toBeGreaterThan(1);
      expect(ex.expression).toBeUndefined();
      expect(`${ex.context} ${ex.prompt}`).not.toMatch(/\d/);
    }
  });

  it('Stufe 3, honest axis: from 0, in even steps of a usual size, and it reaches the top of the uneven axis', () => {
    for (const ex of items(3, 2).filter((e) => !e.visual)) {
      if (ex.answer.kind !== 'choice') throw new Error('expected a choice');
      const axis = (label: string) => label.split(', ').map((t) => Number(t.replace(/\u202F/g, '')));
      const right = axis(ex.answer.options[ex.answer.correct].label);
      const step = right[1];
      expect([5, 10, 20, 25, 50, 100, 200, 250, 500]).toContain(step);
      expect(right).toEqual([0, 1, 2, 3, 4].map((i) => i * step));
      const uneven = ex.answer.options.map((o) => axis(o.label)).find((a) => new Set(a.slice(1).map((t, i) => t - a[i])).size > 1);
      expect(right[4]).toBeGreaterThanOrEqual(uneven![4]);
    }
  });

  it('Stufe 3, AB III: the right option follows from lines against values', () => {
    for (const ex of items(3, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('expected a choice');
      if (ex.visual?.type !== 'table') throw new Error('expected a table');
      const ticks = axisOf(ex);
      const bars = ex.visual.rows.filter((r) => r[2] !== '').map((r) => Number(r[1].replace(/\u202F/g, '')));
      const [lo, hi] = [Math.min(...bars), Math.max(...bars)];
      expect(bars.length).toBe(2);
      const looks = ticks.indexOf(hi) / ticks.indexOf(lo);
      expect(ex.answer.options[ex.answer.correct].label).toMatch(looks < hi / lo ? /^Kleiner/ : /^Größer/);
    }
  });
});
