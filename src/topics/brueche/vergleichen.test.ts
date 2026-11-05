import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { vergleichenSkill } from './vergleichen';
import { everyItem, fractionsIn, items, sameTaskTwoKeys } from './test-helpers';

describeSkill(vergleichenSkill);

/** Both sides of an expression; a whole number counts as n/1. */
function sides(ex: Exercise): [number, number][] {
  return ex.expression!.split('□').flatMap((part) => (part.includes('{frac') ? fractionsIn(part) : [[Number(part.trim()), 1] as [number, number]]));
}
/** The two fractions of a picture pair, from their bars. */
const pictured = (ex: Exercise): [number, number][] => {
  if (ex.answer.kind !== 'choice') throw new Error(ex.key);
  return ex.answer.options.map((o) => {
    if (o.visual?.type !== 'fractionModel') throw new Error(ex.key);
    return [o.visual.filled, o.visual.parts] as [number, number];
  });
};
const symbol = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options[ex.answer.correct].label : '');
const relation = ([a, b]: [number, number], [c, d]: [number, number]) => (a * d < c * b ? '<' : a * d > c * b ? '>' : '=');

describe('brueche.vergleichen specifics', () => {
  it('worked steps calculate correctly', () => {
    for (const ex of everyItem(vergleichenSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('the sign recomputes by cross-multiplication wherever an expression is shown', () => {
    for (const ex of everyItem(vergleichenSkill)) {
      if (!ex.expression) continue;
      const [a, b] = sides(ex);
      expect(symbol(ex), ex.key).toBe(relation(a, b));
    }
  });

  it('Stufe 1: same Nenner or same Zähler, up to 12', () => {
    for (const ex of items(vergleichenSkill, 1, 1)) {
      const [a, b] = ex.expression ? sides(ex) : pictured(ex);
      expect(a[1]).toBe(b[1]);
      expect(a[1]).toBeLessThanOrEqual(12);
    }
    for (const ex of items(vergleichenSkill, 1, 2)) {
      const [a, b] = ex.expression ? sides(ex) : pictured(ex);
      expect(a[0]).toBe(b[0]);
      expect(Math.max(a[1], b[1])).toBeLessThanOrEqual(12);
    }
  });

  it('Stufe 2: one Nenner is a multiple of the other, and they differ', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(vergleichenSkill, 2, ab)) {
        const [a, b] = sides(ex);
        const [lo, hi] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
        expect(lo).not.toBe(hi);
        expect(hi % lo).toBe(0);
      }
    }
  });

  it('order tasks are sorted by value', () => {
    for (const ex of everyItem(vergleichenSkill)) {
      if (ex.answer.kind !== 'order') continue;
      const { items: shown, correct, direction } = ex.answer;
      const values = correct.map((i) => (shown[i].includes('{frac') ? fractionsIn(shown[i])[0] : ([Number(shown[i]), 1] as [number, number])));
      for (let i = 1; i < values.length; i++) expect(relation(values[i - 1], values[i])).toBe(direction === 'aufsteigend' ? '<' : '>');
    }
  });

  it('the right arrow stands at the fraction asked for', () => {
    let arrows = 0;
    for (const ex of items(vergleichenSkill, 3, 2, 400)) {
      if (ex.visual?.type !== 'numberLine' || ex.answer.kind !== 'choice') continue;
      arrows++;
      const [[n, d]] = fractionsIn(ex.prompt);
      const letter = ex.answer.options[ex.answer.correct].label.replace('Pfeil ', '');
      const mark = ex.visual.marks!.find((m) => m.label === letter)!;
      expect(mark.value * d).toBeCloseTo(2 * n, 9);
    }
    expect(arrows).toBeGreaterThan(0);
  });

  it('Stufe 3 Zahlenstrahl asks more than Stufe 2: no Abschnitte to count, only the comparison with ½ and 1 places the fraction', () => {
    let lines = 0;
    for (const ab of [2, 3] as const) {
      for (const ex of items(vergleichenSkill, 3, ab, 400)) {
        if (ex.visual?.type !== 'numberLine') continue;
        lines++;
        // ticks only at each half, and the Nenner is odd: neither counting nor erweitern to ½ gives the place
        expect(ex.visual.denominator, ex.key).toBe(2);
        expect(ex.visual.minorStep, ex.key).toBe(1);
        for (const [, d] of [...fractionsIn(ex.prompt), ...(ex.answer.kind === 'choice' && ab === 3 ? [fractionsIn(ex.answer.options[ex.answer.correct].label)[0]] : [])]) expect(d % 2, ex.key).toBe(1);
        expect(ex.prompt, ex.key).not.toContain('{frac:1/2}');
        for (const text of [...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))]) expect(text, ex.key).not.toMatch(/\bZähle\b|Abschnitt/);
        // one stretch against ½ and 1 per arrow
        const stretch = (x: number) => (x < 1 ? 0 : x < 2 ? 1 : 2);
        const marks = ex.visual.marks!;
        expect(new Set(marks.map((m) => stretch(m.value))).size, ex.key).toBe(marks.length);
      }
    }
    expect(lines).toBeGreaterThan(0);
  });

  it('Stufe 3, AB III reversed: exactly one option lies where the arrow stands, and the arrow stands at that fraction', () => {
    let seen = 0;
    const stretch = ([n, d]: [number, number]) => (2 * n < d ? 0 : n < d && 2 * n > d ? 1 : n > d ? 2 : -1);
    for (const ex of items(vergleichenSkill, 3, 3, 400)) {
      if (ex.visual?.type !== 'numberLine' || ex.answer.kind !== 'choice') continue;
      seen++;
      const [mark] = ex.visual.marks!;
      const values = ex.answer.options.map((o) => fractionsIn(o.label)[0]);
      const right = values[ex.answer.correct];
      expect(mark.value * right[1], ex.key).toBeCloseTo(2 * right[0], 9);
      expect(values.filter((f) => stretch(f) === stretch(right)), ex.key).toEqual([right]);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('Stufe 3, AB I asks more than Stufe 2, AB I: no bare 1, and no Nenner that erweitern solves', () => {
    for (const ex of items(vergleichenSkill, 3, 1, 400)) {
      const [a, b] = sides(ex);
      expect(a[1] === 1 || b[1] === 1, ex.expression).toBe(false);
      const [lo, hi] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
      expect(hi % lo === 0 && lo !== 2 ? 'multiple' : 'ok', ex.expression).toBe('ok');
      if (lo === 2) expect(hi % 2, ex.expression).toBe(1);
    }
  });

  it('the spoken text of the Zahlenstrahl says where each arrow stands', () => {
    let seen = 0;
    for (const ab of [2, 3] as const) {
      for (const ex of items(vergleichenSkill, 3, ab)) {
        if (ex.visual?.type !== 'numberLine') continue;
        seen++;
        for (const m of ex.visual.marks!) expect(ex.srText, ex.key).toContain(`Pfeil ${m.label} steht zwischen`);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('F1: a picture pair shows both fractions as bars, its label matches its picture, and the larger one is right', () => {
    let seen = 0;
    for (const ex of [...items(vergleichenSkill, 1, 1), ...items(vergleichenSkill, 1, 2)]) {
      if (ex.expression || ex.answer.kind !== 'choice') continue;
      seen++;
      const [a, b] = pictured(ex);
      ex.answer.options.forEach((o, i) => expect(o.label).toBe(`{frac:${[a, b][i][0]}/${[a, b][i][1]}}`));
      const [own, other] = ex.answer.correct === 0 ? [a, b] : [b, a];
      expect(own[0] * other[1]).toBeGreaterThan(other[0] * own[1]);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('Stufe 3: a fraction is placed on a Zahlenstrahl of 0 to 2 that counts d-ths, and only at the place of its value', () => {
    const lines = (ab: 2 | 3) => items(vergleichenSkill, 3, ab).flatMap((ex) => (ex.answer.kind === 'numberline' ? [{ ex, a: ex.answer }] : []));
    expect(lines(2).length).toBeGreaterThan(0);
    expect(lines(3).length).toBeGreaterThan(0);
    for (const ab of [2, 3] as const) {
      for (const { ex, a } of lines(ab)) {
        const [[n, d]] = fractionsIn(ex.prompt);
        expect(a.max).toBe(2 * a.denominator!);
        expect(a.value * d).toBe(n * a.denominator!);
        expect(a.denominator).toBe(ab === 2 ? d : 2 * d);
        expect(a.value % a.denominator!, ex.key).not.toBe(0);
      }
    }
  });

  it('a task that looks the same has one key, so a round never shows it twice', () => {
    expect(sameTaskTwoKeys(vergleichenSkill)).toEqual([]);
  });
});
