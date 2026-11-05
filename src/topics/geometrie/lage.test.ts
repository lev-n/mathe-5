import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { DEFAULT_CONTEXT } from '../../core/generate';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { lageSkill as skill } from './lage';

describeSkill(skill);

const items = (stufe: Stufe, ab: Ab, n = 120): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 313 + 11), stufe, { ...DEFAULT_CONTEXT, ab }));
const label = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options[ex.answer.correct].label : '');
const relation = (a: number, b: number) => { const d = ((a - b) % 180 + 180) % 180; return d === 0 ? 'parallel' : d === 90 ? 'senkrecht' : 'weder noch'; };

describe('Parallel und senkrecht: independent checks', () => {
  it('Stufe 2, AB II: the spoken text says which option in their fixed order means what', () => {
    for (const ex of items(2, 2)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      expect(ex.answer.options.map((o) => (o.label.includes('∥') ? 'parallel' : 'senkrecht'))).toEqual(['parallel', 'senkrecht']);
      expect(ex.srText).toMatch(/die erste Antwort \w parallel zu \w oder die zweite Antwort \w senkrecht zu \w/);
    }
  });

  it('Stufe 3, AB II: one line of a direction stays in the singular', () => {
    const texts = items(3, 2, 300).flatMap((ex) => [ex.srText, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))]);
    expect(texts.some((t) => t.includes('die eine Linie'))).toBe(true);
    expect(texts.some((t) => t.includes('1 Linie steht senkrecht'))).toBe(true);
    for (const t of texts) expect(t).not.toMatch(/\b1 Linien\b/);
  });

  it('Stufe 1 and 2: the answer follows from the angles of the lines', () => {
    for (const [stufe, ab] of [[1, 1], [2, 1]] as const) {
      for (const ex of items(stufe, ab)) {
        if (ex.visual?.type !== 'lines') throw new Error('lines expected');
        expect(label(ex)).toBe(relation(ex.visual.lines[0].angle, ex.visual.lines[1].angle));
      }
    }
  });

  it('Stufe 1 stays in the usual position, Stufe 2 is turned', () => {
    for (const ex of items(1, 1)) if (ex.visual?.type === 'lines') for (const l of ex.visual.lines) expect(l.angle % 90).toBe(0);
    for (const ex of items(2, 1)) if (ex.visual?.type === 'lines') expect(ex.visual.lines[0].angle % 90).not.toBe(0);
  });

  it('Stufe 1, AB III: lines of different direction do not meet in the picture', () => {
    for (const ex of items(1, 3)) {
      if (ex.visual?.type !== 'lines') throw new Error('lines expected');
      const [a, b] = ex.visual.lines;
      expect(label(ex)).toBe(a.angle === b.angle ? 'Ja' : 'Nein');
      expect(Math.abs(a.offset) + Math.abs(b.offset)).toBeGreaterThanOrEqual(110);
    }
  });

  it('Stufe 3: counted pairs are recomputed from the lines', () => {
    const pairsWith = (ex: Exercise, test: (a: number, b: number) => boolean) => {
      if (ex.visual?.type !== 'lines') throw new Error('lines expected');
      const { lines } = ex.visual;
      let n = 0;
      for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) if (test(lines[i].angle, lines[j].angle)) n++;
      return n;
    };
    for (const ex of items(3, 1)) expect(ex.answer.kind === 'number' && ex.answer.value).toBe(pairsWith(ex, (a, b) => relation(a, b) === 'parallel'));
    for (const ex of items(3, 2)) expect(ex.answer.kind === 'number' && ex.answer.value).toBe(pairsWith(ex, (a, b) => relation(a, b) === 'senkrecht'));
  });

  it('Stufe 3, AB III: the conclusion follows from the two statements', () => {
    for (const ex of items(3, 3)) {
      const senkrecht = (ex.prompt.match(/senkrecht/g) ?? []).length;
      expect(label(ex)).toBe(senkrecht === 1 ? 'senkrecht' : 'parallel');
    }
  });
});
