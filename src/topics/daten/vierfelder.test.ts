import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { taskSpeech } from '../../ui/practice/readAloud';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { vierfelderSkill as skill } from './vierfelder';

describeSkill(skill, { minDistinct: 30 });

const items = (stufe: Stufe, ab: Ab, n = 150): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 433 + 11), stufe, { ...CTX, ab }));

/** Rows of the table without their label; numbers where the table shows a number. */
const grid = (ex: Exercise): (number | null)[][] => {
  if (ex.visual?.type !== 'table') throw new Error('expected a table');
  return ex.visual.rows.map((r) => r.slice(1).map((c) => (/^\d+$/.test(c) ? Number(c) : null)));
};

/** The class sizes a table shows: its first two rows. A blank or a gap says nothing. */
const shownClassSizes = (ex: Exercise): number[] => {
  if (ex.visual?.type !== 'table') throw new Error('expected a table');
  const at = ex.visual.header.indexOf('Kinder') > 0 ? ex.visual.header.indexOf('Kinder') : ex.visual.header.indexOf('Summe');
  return ex.visual.rows.filter((r) => r[0] !== 'Summe').map((r) => Number(r[at])).filter((n) => n > 0);
};

describe('daten.vierfelder: answers recomputed', () => {
  it('worked steps add up and end in the result', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) for (const ab of [1, 2, 3] as Ab[]) for (const ex of items(stufe, ab, 60)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('Stufe 1: a complete table whose rows and columns add up', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(1, ab)) {
        const g = grid(ex) as number[][];
        for (const row of g) expect(row[0] + row[1]).toBe(row[2]);
        for (const col of [0, 1, 2]) expect(g[0][col] + g[1][col]).toBe(g[2][col]);
      }
    }
  });

  it('Stufe 2, one cell: the answer is the row total minus the other cell', () => {
    for (const ex of items(2, 1)) {
      const g = grid(ex);
      const r = g.findIndex((row) => row.includes(null));
      const c = g[r].indexOf(null);
      expect(ex.answer).toMatchObject({ value: (g[r][2] as number) - (g[r][1 - c] as number) });
    }
  });

  it('Stufe 2, chain: the shown numbers determine the answer', () => {
    for (const ex of items(2, 3)) {
      const g = grid(ex);
      const [a, rowSum, colSum, total] = [g[0][0]!, g[0][2]!, g[2][0]!, g[2][2]!];
      expect(ex.answer).toMatchObject({ value: total - rowSum - (colSum - a) });
    }
  });

  it('Stufe 3, text: the numbers of the story determine every cell', () => {
    for (const ex of items(3, 2)) {
      if (ex.answer.kind !== 'multi') throw new Error('expected a multi answer');
      const [total, rowSum, colSum, a] = [...ex.context!.matchAll(/(\d+) Kinder/g)].map((m) => Number(m[1]));
      const v = Object.fromEntries(ex.answer.fields.map((f) => [f.id, f.value]));
      expect(v.A).toBe(a);
      expect(v.B).toBe(rowSum - a);
      expect(v.C).toBe(colSum - a);
      expect(v.D).toBe(total - rowSum - colSum + a);
    }
  });

  it('Stufe 3, two groups: the shares of the table give the answer', () => {
    const SHARE: Record<string, number> = { 'die Hälfte': 2, 'ein Drittel': 3, 'ein Viertel': 4 };
    for (const ex of items(3, 3)) {
      if (ex.visual?.type !== 'table') throw new Error('expected a table');
      const parts = ex.visual.rows.map((r) => Number(r[1]) / SHARE[r[2]]);
      parts.forEach((p) => expect(Number.isInteger(p)).toBe(true));
      expect(ex.answer).toMatchObject({ value: Math.abs(parts[0] - parts[1]) });
      expect(Math.abs(parts[0] - parts[1])).toBeGreaterThan(0);
    }
  });

  it('every class has the size of a real school class, in the table and in the text', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab)) {
          for (const n of shownClassSizes(ex)) expect(n, ex.key).toBeLessThanOrEqual(32);
          const told = /^In der 5\s\w und der 5\s\w sind \d+ Kinder\. Die 5\s\w hat (\d+) Kinder/.exec(ex.context ?? '');
          if (told) expect(Number(told[1]), ex.key).toBeLessThanOrEqual(32);
        }
      }
    }
  });

  it('T16: the voice says a class as a number and a letter, never as one word or as a unit', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab, 60)) {
          const voice = taskSpeech(ex, ex.hints);
          expect(voice, ex.key).not.toMatch(/fünf[a-f]\b|\bAr\b/);
          if (stufe > 1 && ab === 3) expect(voice, ex.key).toMatch(/fünf [b-f]\b/);
        }
      }
    }
  });

  it('Stufe 3, text: the size check above still recognises the story', () => {
    for (const ex of items(3, 1)) expect(ex.context).toMatch(/^In der 5\s\w und der 5\s\w sind \d+ Kinder\. Die 5\s\w hat \d+ Kinder/);
  });

  it('Stufe 2, all totals: the two classes stay within a real size', () => {
    for (const ex of items(2, 2)) {
      if (ex.answer.kind !== 'multi') throw new Error('expected a multi answer');
      for (const f of ex.answer.fields.filter((x) => x.id !== 'g')) {
        expect(f.value).toBeGreaterThanOrEqual(18);
        expect(f.value).toBeLessThanOrEqual(32);
      }
    }
  });

  it('Stufe 3, two groups: the text names no class as larger or as the one with more', () => {
    for (const ex of items(3, 3)) {
      expect(`${ex.context} ${ex.prompt}`).not.toMatch(/\bmehr\b/);
      if (ex.visual?.type !== 'table') throw new Error('expected a table');
      for (const r of ex.visual.rows) expect(Number(r[1])).toBeLessThanOrEqual(32);
    }
  });

  it('the Tafel fits a 375 px phone: short heads beside Klasse and Summe', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab, 60).filter((e) => !e.key.includes(':gruppen:'))) {
          if (ex.visual?.type !== 'table') throw new Error('expected a table');
          expect(ex.visual.header).toEqual(['Klasse', 'ja', 'nein', 'Summe']);
        }
      }
    }
  });
});
