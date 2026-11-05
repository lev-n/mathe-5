import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { createRng } from '../../core/rng';
import { taskSpeech } from '../../ui/practice/readAloud';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { strichlisteSkill as skill } from './strichliste';

describeSkill(skill, { minDistinct: 30 });

const items = (stufe: Stufe, ab: Ab, n = 150): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 613 + 5), stufe, { ...CTX, ab }));

/** The values of an Urliste table, without the row labels and the padding. */
const listValues = (ex: Exercise) => (ex.visual?.type === 'table' ? ex.visual.rows.flatMap((r) => r.slice(1)).filter(Boolean) : []);

describe('daten.strichliste: answers recomputed', () => {
  it('worked steps add up and end in the result', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) for (const ab of [1, 2, 3] as Ab[]) for (const ex of items(stufe, ab, 60)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('Stufe 1: every task works on an Urliste or a Strichliste with at most 30 values', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(1, ab)) {
        if (ex.visual?.type === 'table') expect(listValues(ex).length).toBeLessThanOrEqual(30);
        if (ex.visual?.type === 'tally') expect(ex.visual.rows.reduce((n, r) => n + r.count, 0)).toBeLessThanOrEqual(30);
      }
    }
  });

  it('Stufe 1, counting one word: the answer is the count in the Urliste', () => {
    for (const ex of items(1, 1).filter((e) => e.visual?.type === 'table' && e.answer.kind === 'number')) {
      const word = /„(.+)“/.exec(ex.prompt)![1];
      expect(ex.answer).toMatchObject({ value: listValues(ex).filter((v) => v === word).length });
    }
  });

  it('Stufe 1, filling in the counts: each field is the count in the Urliste', () => {
    for (const ex of items(1, 2).filter((e) => e.answer.kind === 'multi')) {
      if (ex.answer.kind !== 'multi') continue;
      for (const f of ex.answer.fields) expect(f.value).toBe(listValues(ex).filter((v) => v === f.label).length);
    }
  });

  it('Stufe 1, which Strichliste: the right one has the counts of the Urliste, the others do not', () => {
    for (const ex of items(1, 2).filter((e) => e.answer.kind === 'choice')) {
      if (ex.answer.kind !== 'choice') continue;
      const matches = ex.answer.options.map((o) => (o.visual?.type === 'tally' ? o.visual.rows.every((r) => r.count === listValues(ex).filter((v) => v === r.label).length) : false));
      expect(matches.filter(Boolean).length).toBe(1);
      expect(matches[ex.answer.correct]).toBe(true);
    }
  });

  it('Stufe 2, one range: the answer counts the values with both bounds', () => {
    for (const ex of items(2, 1)) {
      const [, a, b] = /von (\d+) bis (\d+)/.exec(ex.prompt)!.map(Number);
      expect(ex.answer).toMatchObject({ value: listValues(ex).map(Number).filter((v) => v >= a && v <= b).length });
    }
  });

  it('Stufe 2: every item works with ranges', () => {
    for (const ab of [1, 2, 3] as Ab[]) for (const ex of items(2, ab, 60)) expect(JSON.stringify(ex.visual) + ex.prompt).toMatch(/\d+–\d+|von \d+ bis \d+/);
  });

  it('Stufe 3, Nicht lösbar: both kinds of item come up and offer the button', () => {
    const answers = items(3, 3).map((e) => e.answer);
    expect(answers.some((a) => a.kind === 'number' && a.value === null)).toBe(true);
    expect(answers.some((a) => a.kind === 'number' && a.value !== null)).toBe(true);
    for (const a of answers) expect(a).toMatchObject({ offerUnsolvable: true });
  });

  it('no number 1 stands in front of a plural, in the task or in the steps', () => {
    const plural = /(^|[\s„(])1 (Bücher|Minuten|Punkte|Seiten|Kinder|Teams|Tage|Fahrzeuge|Striche|Werte|Bündel)\b/;
    const seen = new Set<string>();
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab, 800)) {
          const text = [ex.context, ex.prompt, ...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))].join(' ');
          expect(text, ex.key).not.toMatch(plural);
          for (const m of text.matchAll(/genau 1 \p{L}+|Es ist 1 \p{L}+/gu)) seen.add(m[0]);
        }
      }
    }
    expect(seen.has('Es ist 1 Kind')).toBe(true);
    expect(seen.has('genau 1 Buch')).toBe(true);
    for (const singular of seen) expect(['Es ist 1 Fahrzeug', 'Es ist 1 Kind', 'genau 1 Buch', 'genau 1 Minute', 'genau 1 Punkt', 'genau 1 Seite']).toContain(singular);
  });

  it('Stufe 2: a school way takes at least a minute, in the Urliste, the ranges and the task', () => {
    let urlisten = 0;
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(2, ab, 400)) {
        if (ex.visual?.type !== 'table' || !ex.visual.caption?.includes('Schulweg')) continue;
        expect(`${ex.prompt} ${ex.hints.join(' ')}`, ex.key).not.toMatch(/\b0\b/);
        if (ex.visual.caption.startsWith('Urliste')) {
          urlisten++;
          expect(listValues(ex).map(Number), ex.key).not.toContain(0);
        } else {
          expect(ex.visual.rows[0][0], ex.key).toBe('1–9');
        }
      }
    }
    expect(urlisten).toBeGreaterThan(0);
  });

  it('T16: the voice says a class as a number and a letter, never as one word or as a unit', () => {
    for (const ex of items(3, 2, 200)) {
      const voice = taskSpeech(ex, ex.hints);
      expect(voice, ex.key).not.toMatch(/fünf[a-f]\b|\bAr\b/);
      if (/\b5\u00A0[b-f]/.test(`${ex.context} ${ex.prompt}`)) expect(voice).toMatch(/fünf [b-f]\b/);
    }
  });

  it('Stufe 2, AB III: a gap alone does not answer it: the ranges decide, and the answer is not the missing row', () => {
    const gaps = items(2, 3).filter((e) => e.answer.kind === 'number');
    expect(gaps.length).toBeGreaterThan(0);
    for (const ex of gaps) {
      if (ex.visual?.type !== 'table') throw new Error('expected a table');
      const bound = Number(/mindestens (\d+)/.exec(ex.prompt)![1]);
      const rows = ex.visual.rows.filter((r) => r[0] !== 'Zusammen');
      const total = Number(ex.visual.rows.find((r) => r[0] === 'Zusammen')![1]);
      const lower = (r: string[]) => Number(/^\d+/.exec(r[0])![0]);
      const under = rows.filter((r) => lower(r) < bound);
      expect(under.every((r) => r[1] !== '?')).toBe(true);
      expect(rows.filter((r) => lower(r) >= bound).length).toBeGreaterThanOrEqual(2);
      expect(ex.answer).toMatchObject({ value: total - under.reduce((n, r) => n + Number(r[1]), 0) });
    }
  });
});
