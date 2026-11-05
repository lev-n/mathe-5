import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { q } from './common';
import { allItems, correctLabel, fieldOf } from './testing';
import { unterscheidenSkill } from './unterscheiden';

describeSkill(unterscheidenSkill);

const AROUND = /zaun|rahmen|lichter|leiste|laufen|band/;

describe('flaeche.unterscheiden: answers recomputed', () => {
  it('Stufe 1: a situation around the outside needs the Umfang, the others the Flächeninhalt', () => {
    let seen = 0;
    for (const ex of allItems(unterscheidenSkill)) {
      const m = /:welche-groesse:(\w+)/.exec(ex.key);
      if (!m) continue;
      expect(correctLabel(ex), ex.key).toMatch(AROUND.test(m[1]) ? /^Umfang in (cm|m)$/ : /^Flächeninhalt in (cm|m)²$/);
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('compute both: fields follow from the sides, also after doubling', () => {
    for (const ex of allItems(unterscheidenSkill)) {
      const both = /:beides(?:-gitter)?:(\d+)x(\d+)/.exec(ex.key);
      if (both) {
        const [a, b] = [Number(both[1]), Number(both[2])];
        expect(fieldOf(ex, 'u'), ex.key).toBe(2 * a + 2 * b);
        expect(fieldOf(ex, 'a'), ex.key).toBe(a * b);
      }
      const doubled = /:verdoppelt-rechnen:(\d+)x(\d+)/.exec(ex.key);
      if (doubled) {
        const [a, b] = [2 * Number(doubled[1]), 2 * Number(doubled[2])];
        expect(fieldOf(ex, 'u'), ex.key).toBe(2 * a + 2 * b);
        expect(fieldOf(ex, 'a'), ex.key).toBe(a * b);
      }
      const scaled = /:aus-werten:(\d+)-(\d+)-(\d):/.exec(ex.key);
      if (scaled) {
        const [U, A, k] = scaled.slice(1).map(Number);
        expect(fieldOf(ex, 'u'), ex.key).toBe(k * U);
        expect(fieldOf(ex, 'a'), ex.key).toBe(k * k * A);
      }
    }
  });

  it('how sides change the size: both doubled gives four times the area, otherwise double', () => {
    for (const ex of allItems(unterscheidenSkill)) {
      const m = /:wie-aendert:([a-z-]+):/.exec(ex.key);
      if (m) expect(correctLabel(ex), ex.key).toMatch(m[1] === 'beide-flaeche' ? /^viermal so groß: / : /^doppelt so groß: /);
    }
  });

  it('F7: every answer choice shows its unit, and a size stands with the unit that fits it', () => {
    let seen = 0;
    for (const ex of allItems(unterscheidenSkill, undefined, 200)) {
      if (ex.answer.kind !== 'choice') continue;
      for (const o of ex.answer.options) {
        expect(o.label, ex.key).toMatch(/(^|\s)(cm|m)[²³]?([\s.,:]|$)/);
        expect(o.label, ex.key).not.toMatch(/Umfang in (cm|m)²|Flächeninhalt in (cm|m)(?!²)/);
      }
      seen++;
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('Stufe 1 AB II: the unit alone never decides, over the items both sizes stand on wrong works too', () => {
    let sameSizeAsRight = 0;
    let seen = 0;
    for (const ex of allItems(unterscheidenSkill, undefined, 200)) {
      if (!ex.key.includes(':welche-aufgabe:') || ex.answer.kind !== 'choice') continue;
      const size = (label: string) => label.split(': ')[1].split(' ')[0];
      const right = size(correctLabel(ex));
      expect(ex.answer.options.length, ex.key).toBe(4);
      if (ex.answer.options.some((o, i) => i !== (ex.answer as { correct: number }).correct && size(o.label) === right)) sameSizeAsRight++;
      seen++;
    }
    expect(sameSizeAsRight).toBe(seen);
  });

  it('F7: the worked steps name Rand or Innenfläche, and both when both sizes are computed', () => {
    for (const ex of allItems(unterscheidenSkill, undefined, 200)) {
      const steps = ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).join(' ');
      expect(steps, ex.key).toMatch(/\b(Rand|Innenfläche)\b/);
      if (ex.answer.kind === 'multi') {
        expect(steps, ex.key).toMatch(/\bRand\b/);
        expect(steps, ex.key).toMatch(/\bInnenfläche\b/);
      }
    }
  });

  it('how sides change: the steps and every option show the unit, and the option value follows its words', () => {
    let seen = 0;
    for (const ex of allItems(unterscheidenSkill, undefined, 200)) {
      const m = /:wie-aendert:([a-z-]+):(\d+)x(\d+)/.exec(ex.key);
      if (!m || ex.answer.kind !== 'choice') continue;
      const [a, b] = [Number(m[2]), Number(m[3])];
      const old = m[1] === 'beide-umfang' ? 2 * a + 2 * b : a * b;
      const unit = m[1] === 'beide-umfang' ? 'cm' : 'cm²';
      const FACTOR: Record<string, number> = { 'bleibt gleich': 1, 'doppelt so groß': 2, 'dreimal so groß': 3, 'viermal so groß': 4 };
      for (const o of ex.answer.options) {
        const [words, value] = o.label.split(': ');
        expect(value, ex.key).toBe(q(FACTOR[words] * old, unit));
      }
      const steps = ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
      expect(steps.join(' '), ex.key).toContain(q(old, unit));
      seen++;
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('every Stufe keeps its content', () => {
    for (const ex of allItems(unterscheidenSkill)) {
      if (ex.stufe === 1) expect(ex.answer.kind).toBe('choice');
      if (ex.stufe !== 3) expect(ex.key).not.toMatch(/verdoppelt|wie-aendert|aus-werten/);
    }
  });

  it('worked steps calculate correctly and end with the result', () => {
    for (const ex of allItems(unterscheidenSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });
});
