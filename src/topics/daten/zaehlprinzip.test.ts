import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { taskSpeech } from '../../ui/practice/readAloud';
import { PEOPLE } from '../shared';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { zaehlprinzipSkill as skill } from './zaehlprinzip';

describeSkill(skill, { minDistinct: 30 });

const items = (stufe: Stufe, ab: Ab, n = 150): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 367 + 19), stufe, { ...CTX, ab }));

const ends = (ex: Exercise) => (ex.visual?.type === 'tree' ? ex.visual.levels.reduce((n, l) => n * l.length, 1) : null);

describe('daten.zaehlprinzip: answers recomputed', () => {
  it('worked steps add up and end in the result', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) for (const ab of [1, 2, 3] as Ab[]) for (const ex of items(stufe, ab, 60)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('Stufe 1: every item shows a tree of two stages', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(1, ab)) {
        if (ex.visual?.type !== 'tree') throw new Error('expected a tree');
        expect(ex.visual.levels.length).toBe(2);
      }
    }
  });

  it('Stufe 1, AB I: the answer is the number of ends of the tree', () => {
    for (const ex of items(1, 1)) expect(ex.answer).toMatchObject({ value: ends(ex) });
  });

  it('Stufe 1, AB II: more answers than the two a tree of two stages allows', () => {
    const answers = new Set(items(1, 2, 400).map((e) => (e.answer.kind === 'number' ? e.answer.value : null)));
    expect(answers.size).toBeGreaterThanOrEqual(6);
  });

  it('Stufe 1, a branch falls away: the answer counts the ends of the other branches', () => {
    for (const ex of items(1, 2, 400).filter((e) => e.key.includes(':ohne:'))) {
      if (ex.visual?.type !== 'tree') throw new Error('expected a tree');
      const [first, second] = ex.visual.levels;
      expect(first.some((o) => ex.context!.includes(`„${o}“`))).toBe(true);
      expect(ex.answer).toMatchObject({ value: (first.length - 1) * second.length });
    }
  });

  it('Stufe 2, AB I: three stages, as a tree whose ends are the answer or as three small numbers', () => {
    const answers = new Set<number | null>();
    for (const ex of items(2, 1, 400)) {
      if (ex.answer.kind !== 'number') throw new Error('expected a number answer');
      answers.add(ex.answer.value);
      if (ex.visual) {
        expect(ex.visual.type === 'tree' && ex.visual.levels.length).toBe(3);
        expect(ex.answer).toMatchObject({ value: ends(ex) });
      } else {
        const [a, b, c] = [.../Es gibt (\d+) .+?, (\d+) .+? und (\d+) /.exec(ex.context!)!].slice(1).map(Number);
        expect(ex.answer).toMatchObject({ value: a * b * c });
        expect(a * b * c).toBeLessThanOrEqual(20);
      }
    }
    expect(answers.size).toBeGreaterThanOrEqual(4);
  });

  it('Stufe 2, AB II: the answer is the product of the three numbers of the text', () => {
    for (const ex of items(2, 2)) {
      const [a, b, c] = [.../Es gibt (\d+) .+?, (\d+) .+? und (\d+) /.exec(ex.context!)!].slice(1).map(Number);
      expect(ex.answer).toMatchObject({ value: a * b * c });
    }
  });

  it('Stufe 2, AB III: the answer times the two stages gives the total', () => {
    for (const ex of items(2, 3)) {
      const [a, b, total] = [...ex.context!.matchAll(/\d+/g)].map((m) => Number(m[0]));
      if (ex.answer.kind !== 'number') throw new Error('expected a number answer');
      expect(a * b * ex.answer.value!).toBe(total);
    }
  });

  it('Stufe 3, AB I: orders of four things, counted by brute force, and the answer changes with the task', () => {
    const orders = (rest: number[]): number[][] => (rest.length === 0 ? [[]] : rest.flatMap((x) => orders(rest.filter((y) => y !== x)).map((o) => [x, ...o])));
    const all = orders([1, 2, 3, 4]);
    const answers = new Set<number | null>();
    for (const ex of items(3, 1)) {
      if (ex.answer.kind !== 'number') throw new Error('expected a number answer');
      answers.add(ex.answer.value);
      const fixed = /ganz vorn|zuerst|ganz links/.test(ex.context!);
      const firstTwo = ex.prompt.includes('die ersten zwei');
      const want = fixed ? all.filter((o) => o[0] === 1).length : firstTwo ? new Set(all.map((o) => o.slice(0, 2).join())).size : all.length;
      expect(ex.answer.value, ex.key).toBe(want);
    }
    expect([...answers].sort((a, b) => a! - b!)).toEqual([6, 12, 24]);
  });

  it('Stufe 3: a round has two AB I items, and most pairs need different answers', () => {
    const answers = items(3, 1, 400).map((e) => (e.answer.kind === 'number' ? e.answer.value : null));
    const same = answers.slice(1).filter((a, i) => a === answers[i]).length;
    expect(same / (answers.length - 1)).toBeLessThan(0.5);
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

  it('Stufe 3, handshakes: the answer is the number of pairs, counted by brute force', () => {
    for (const ex of items(3, 3).filter((e) => e.key.includes(':haende:'))) {
      const n = Number(/^(\d+) Kinder/.exec(ex.context!)![1]);
      let pairs = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs++;
      expect(ex.answer).toMatchObject({ value: pairs });
    }
  });

  it('every tree stays readable on a worksheet: at most 12 ends', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) for (const ab of [1, 2, 3] as Ab[]) for (const ex of items(stufe, ab)) if (ex.visual?.type === 'tree') expect(ends(ex), ex.key).toBeLessThanOrEqual(12);
  });

  it('T16: the voice says what the task says, no place value after a number', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab)) expect(taskSpeech(ex, ex.hints), ex.key).not.toMatch(/Tausender|Hunderter|Zehner|Einer\b/);
      }
    }
  });
});
