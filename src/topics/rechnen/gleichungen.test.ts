import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { gleichungenSkill as skill } from './gleichungen';
import { ABS, items, rightLabel, stepProblems, stepTexts, termValue } from './test-helpers';

describeSkill(skill);

/** x put into the Gleichung: both sides agree. */
function holds(ex: Exercise): boolean {
  if (ex.answer.kind !== 'number' || !ex.expression) throw new Error(ex.key);
  const [left, right] = ex.expression.split(' = ');
  return termValue(left.replace('x', String(ex.answer.value))) === termValue(right);
}

const ops = (ex: Exercise) => (ex.expression?.split(' = ')[0].match(/ [+−·:] /g) ?? []).length;

describe('rechnen.gleichungen', () => {
  it.each([[1, 1], [1, 2], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2]] as [Stufe, Ab][])('Stufe %i, AB %i: x makes the Gleichung true', (stufe, ab) => {
    for (const ex of items(skill, stufe, ab)) {
      expect(holds(ex), ex.key).toBe(true);
      expect(Number.isInteger((ex.answer as { value: number }).value), ex.key).toBe(true);
    }
  });

  it('Stufe 1: plus and minus only, one step', () => {
    for (const ab of ABS) {
      for (const ex of items(skill, 1, ab)) {
        if (ex.expression) {
          expect(ops(ex), ex.key).toBe(1);
          expect(ex.expression, ex.key).toMatch(/ [+−] /);
          expect(holds(ex), ex.key).toBe(true);
        }
      }
    }
  });

  it('Stufe 2: mal and geteilt, x behind a minus or a geteilt, one step', () => {
    const shapes = new Set<string>();
    for (const ab of ABS) {
      for (const ex of items(skill, 2, ab)) {
        expect(ops(ex), ex.key).toBe(1);
        const term = ex.expression!.split(' = ')[0];
        if (/\d − x/.test(term)) shapes.add('minus x');
        if (/\d : x/.test(term)) shapes.add('durch x');
        if (/x : \d/.test(term)) shapes.add('x durch');
        if (/· x|x ·/.test(term)) shapes.add('mal');
      }
    }
    expect([...shapes].sort()).toEqual(['durch x', 'mal', 'minus x', 'x durch']);
  });

  it('Stufe 3: two operations, or a riddle that names the same Gleichung', () => {
    for (const ab of [1, 2] as const) for (const ex of items(skill, 3, ab)) expect(ops(ex), ex.key).toBe(2);
    let riddles = 0;
    for (const ex of items(skill, 3, 3)) {
      if (ex.answer.kind === 'number') {
        riddles++;
        const eq = stepTexts(ex)[0].replace('Als Gleichung: ', '').replace(/\.$/, '');
        const [left, right] = eq.split(' = ');
        expect(termValue(left.replace('x', String(ex.answer.value))), ex.key).toBe(termValue(right));
      } else if (ex.answer.kind === 'choice') {
        const right = ex.answer.options[ex.answer.correct].label;
        expect(right, ex.key).toMatch(/^\d+ · x \+ \d+ = /);
      }
    }
    expect(riddles).toBeGreaterThan(30);
  });

  it('the riddle as a Gleichung: no wrong option is the same Gleichung as the right one', () => {
    let seen = 0;
    const same = (a: string, b: string, x: number) => termValue(a.split(' = ')[0].replace('x', String(x))) === termValue(b.split(' = ')[0].replace('x', String(x)));
    for (const ex of items(skill, 3, 3, 3000)) {
      if (ex.answer.kind !== 'choice') continue;
      seen++;
      const right = rightLabel(ex);
      for (const o of ex.answer.options) if (o.label !== right) expect(same(o.label, right, 0) && same(o.label, right, 1), `${ex.key}: ${o.label}`).toBe(false);
    }
    expect(seen).toBeGreaterThan(500);
  });

  it('the voice says the bracket of a Gleichung', () => {
    let brackets = 0;
    for (const ex of items(skill, 3, 2, 300)) {
      expect(ex.srText, ex.key).not.toMatch(/[()]/);
      if (!ex.expression?.includes('(')) continue;
      brackets++;
      expect(ex.srText, ex.key).toContain('Klammer auf x plus');
      expect(ex.srText, ex.key).toContain('Klammer zu mal');
    }
    expect(brackets).toBeGreaterThan(50);
  });

  it('bugs are other numbers than x and name the misconception', () => {
    const ids = new Set<string>();
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS) {
        for (const ex of items(skill, stufe, ab)) {
          for (const bug of ex.bugs ?? []) {
            ids.add(bug.id);
            if (ex.answer.kind === 'number') expect(bug.match, ex.key).not.toBe(ex.answer.value);
          }
        }
      }
    }
    expect([...ids].sort()).toEqual(['umkehr-reihenfolge', 'umkehr-richtung', 'umkehr-schritt']);
  });

  it('the worked steps hold, with a Probe at the end', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS) {
        for (const ex of items(skill, stufe, ab, 80)) {
          expect(stepProblems(ex)).toEqual([]);
          if (ex.answer.kind === 'number') expect(stepTexts(ex).at(-1), ex.key).toContain('Probe:');
        }
      }
    }
  });
});
