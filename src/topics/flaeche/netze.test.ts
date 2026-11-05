import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Cell, Exercise, Visual } from '../../core/types';
import { QUADER_OPPOSITE, completions, fold, oppositeFace } from './nets';
import { netzeSkill } from './netze';
import { allItems, correctLabel, numbersIn } from './testing';

describeSkill(netzeSkill, { minDistinct: { 1: 30, 2: 30, 3: 30 } });

const items = allItems(netzeSkill);
const correctVisual = (ex: Exercise): Visual | undefined => (ex.answer.kind === 'choice' ? ex.answer.options[ex.answer.correct].visual : undefined);

describe('flaeche.netze: answers recomputed', () => {
  it('yes or no: the answer is what folding says', () => {
    let seen = 0;
    for (const ex of items) {
      if (!ex.key.includes(':ist-netz:') || ex.visual?.type !== 'net') continue;
      expect(correctLabel(ex), ex.key).toBe(fold(ex.visual.cells) ? 'Ja' : 'Nein');
      seen++;
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('cube net: the correct letter lies opposite the asked one', () => {
    for (const ex of items) {
      if (!/:1:gegenueber:/.test(ex.key) || ex.visual?.type !== 'net') continue;
      const faces = fold(ex.visual.cells)!;
      const letters = ex.visual.faces!;
      const asked = /gegenüber von ([A-F])/.exec(ex.prompt)![1];
      expect(faces[letters.indexOf(correctLabel(ex))], ex.key).toBe(oppositeFace(faces[letters.indexOf(asked)]));
    }
  });

  it('four nets: exactly the correct picture is the odd one', () => {
    for (const ex of items) {
      const m = /:welches-netz:(ist|kein):/.exec(ex.key);
      if (!m || ex.answer.kind !== 'choice') continue;
      const folds = ex.answer.options.map((o) => (o.visual?.type === 'net' ? !!fold(o.visual.cells) : null));
      const wanted = m[1] === 'ist';
      expect(folds.filter((f) => f === wanted).length, ex.key).toBe(1);
      expect(folds[ex.answer.correct], ex.key).toBe(wanted);
    }
  });

  it('Quader net: the partner has the same number of cells, no other face does', () => {
    for (const ex of items) {
      if (!ex.key.includes(':quadernetz:') || ex.visual?.type !== 'net') continue;
      const { faces, groups } = ex.visual;
      const size = (letter: string) => faces!.filter((f) => f === letter).length;
      const asked = /(?:wie|von) ([A-F])\?/.exec(ex.prompt)![1];
      expect(size(correctLabel(ex)), ex.key).toBe(size(asked));
      const group = groups![faces!.indexOf(asked)];
      expect(groups![faces!.indexOf(correctLabel(ex))], ex.key).toBe(QUADER_OPPOSITE[group]);
    }
  });

  it('the face too long: it has more cells than the face opposite, the other pairs agree', () => {
    for (const ex of items) {
      if (!ex.key.includes(':flaeche-passt-nicht:') || ex.visual?.type !== 'net') continue;
      const { faces, groups } = ex.visual;
      const count = (g: number) => groups!.filter((x) => x === g).length;
      const wrong = groups![faces!.indexOf(correctLabel(ex))];
      expect(count(wrong), ex.key).toBeGreaterThan(count(QUADER_OPPOSITE[wrong]));
      for (let g = 0; g < 6; g++) if (g !== wrong && g !== QUADER_OPPOSITE[wrong]) expect(count(g)).toBe(count(QUADER_OPPOSITE[g]));
    }
  });

  it('missing face: only the solution completes the net, and other cells are not accepted', () => {
    let seen = 0;
    for (const ex of items) {
      if (ex.answer.kind !== 'cells') continue;
      const a = ex.answer;
      expect(completions(a.given as Cell[], a.width, a.height), ex.key).toEqual(a.solution);
      expect(checkAnswer(a, { kind: 'cells', cells: [...a.given, ...a.solution] }).correct, ex.key).toBe(true);
      seen++;
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('Stufe 2 AB I: the answer comes from the edges in the picture, not from the shape of the options', () => {
    const seen = allItems(netzeSkill, undefined, 300).filter((ex) => /:2:schraegbild:/.test(ex.key));
    expect(seen.length).toBeGreaterThan(100);
    const optionSets = new Set<string>();
    for (const ex of seen) {
      if (ex.visual?.type !== 'quader' || ex.answer.kind !== 'choice') throw new Error(ex.key);
      const { a, b, c, showLabels } = ex.visual;
      expect(showLabels, ex.key).toBe(true);
      const groups = ex.key.includes(':verdeckt:') ? 1 : 3;
      expect(numbersIn(correctLabel(ex))[0], ex.key).toBe(groups * (a + b + c));
      expect(ex.prompt, ex.key).not.toMatch(/gestrichelt/);
      optionSets.add(ex.answer.options.map((o) => o.label).sort().join('|'));
    }
    expect(optionSets.size).toBeGreaterThan(30);
  });

  it('Schrägbild options: the right one has the sizes of the text and dashed edges', () => {
    for (const ex of items) {
      if (!ex.key.includes(':richtiges-schraegbild:')) continue;
      const v = correctVisual(ex);
      const [a, b, c] = /:(\d)-(\d)-(\d)/.exec(ex.key)!.slice(1).map(Number);
      expect(v, ex.key).toMatchObject({ type: 'quader', a, b, c, hiddenEdges: 'dashed' });
    }
  });

  it('the odd Schrägbild has another set of edges, the others share one', () => {
    for (const ex of items) {
      if (!ex.key.includes(':schraegbild-passt-nicht:') || ex.answer.kind !== 'choice') continue;
      const sets = ex.answer.options.map((o) => (o.visual?.type === 'quader' ? [o.visual.a, o.visual.b, o.visual.c].sort().join() : ''));
      const right = sets[ex.answer.correct];
      expect(sets.filter((s) => s === right).length, ex.key).toBe(1);
      expect(new Set(sets.filter((s) => s !== right)).size, ex.key).toBe(1);
    }
  });

  it('every Stufe keeps its content', () => {
    for (const ex of items) {
      if (ex.stufe === 1) expect(ex.key).toMatch(/:(ist-netz|gegenueber|welches-netz):/);
      if (ex.stufe === 2) expect(ex.key).toMatch(/:(schraegbild|quadernetz|flaeche-passt-nicht|kanten-aus-netz):/);
      if (ex.stufe === 3) expect(ex.key).toMatch(/:(fehlende-flaeche|richtiges-schraegbild|schraegbild-passt-nicht|netz-zu-schraegbild):/);
    }
  });
});
