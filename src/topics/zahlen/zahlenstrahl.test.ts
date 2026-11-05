import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import { fmt } from '../../core/format';
import { NL, layoutLabels, xScale } from '../../ui/visuals/NumberLineVisual';
import { CTX, samples } from '../test-utils';
import { zahlenstrahlSkill } from './zahlenstrahl';

describeSkill(zahlenstrahlSkill);

describe('zahlen.zahlenstrahl', () => {
  it('Stufe 1 ticks are Stufenzahlen, Stufe 2 ticks are not, Stufe 3 starts above zero', () => {
    const isPowerOfTen = (n: number) => /^10*$/.test(String(n));
    for (const ex of samples(zahlenstrahlSkill, 1)) {
      const line = ex.visual?.type === 'numberLine' ? ex.visual : ex.answer.kind === 'numberline' ? { minorStep: ex.answer.minorStep, min: ex.answer.min } : null;
      expect(line).not.toBeNull();
      expect(isPowerOfTen(line!.minorStep)).toBe(true);
      expect(line!.min).toBe(0);
    }
    for (const ex of samples(zahlenstrahlSkill, 2)) {
      const minor = ex.visual?.type === 'numberLine' ? ex.visual.minorStep : ex.answer.kind === 'numberline' ? ex.answer.minorStep : NaN;
      expect(isPowerOfTen(minor)).toBe(false);
    }
    for (const ex of samples(zahlenstrahlSkill, 3)) {
      if (ex.answer.kind === 'numberline') expect(ex.answer.min).toBeGreaterThan(0);
      if (ex.visual?.type === 'numberLine') expect(ex.visual.min).toBeGreaterThan(0);
    }
  });

  it('a read arrow shows its answer on the line, a placed arrow lands on a tick', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(zahlenstrahlSkill, stufe)) {
        if (ex.key.includes(':ablesen:') && ex.visual?.type === 'numberLine' && ex.answer.kind === 'number') {
          expect(ex.visual.marks?.[0].value).toBe(ex.answer.value);
          expect(((ex.answer.value as number) - ex.visual.min) % ex.visual.minorStep).toBe(0);
        }
        if (ex.answer.kind === 'numberline') {
          expect((ex.answer.value - ex.answer.min) % ex.answer.step).toBe(0);
          for (const b of ex.bugs ?? []) expect((b.match as number) >= ex.answer.min && (b.match as number) <= ex.answer.max, `${ex.key} ${b.id}`).toBe(true);
        }
      }
    }
  });

  it('counts a tick as 1 in the strahl-schritt bug of a read arrow', () => {
    const read = samples(zahlenstrahlSkill, 1).filter((ex) => ex.key.includes(':ablesen:') && ex.key.endsWith(':m'));
    expect(read.length).toBeGreaterThan(0);
    for (const ex of read) {
      if (ex.visual?.type !== 'numberLine' || ex.answer.kind !== 'number') throw new Error('line');
      const v = ex.answer.value as number;
      const from = Math.floor(v / ex.visual.majorStep) * ex.visual.majorStep;
      expect(ex.bugs?.find((b) => b.id === 'strahl-schritt')?.match).toBe(from + (v - from) / ex.visual.minorStep);
    }
  });

  it('Stufe 1 reads at every AB: placing an arrow belongs to Stufe 2; AB II labels only the ends', () => {
    for (const ab of [1, 2, 3] as const) {
      for (let seed = 1; seed <= 150; seed++) {
        const ex = zahlenstrahlSkill.generate(createRng(seed * 19 + ab), 1, { ...CTX, ab });
        expect(ex.answer.kind, ex.key).toBe('number');
        expect(ex.key, ex.key).not.toContain(':setzen:');
        if (ab === 2) {
          expect(ex.key).toMatch(/:e$/);
          expect(ex.visual).toMatchObject({ labelMajor: false });
        }
      }
    }
  });

  it('only the fitting scale holds all three numbers on different ticks', () => {
    const scales = samples(zahlenstrahlSkill, 3, 600).filter((ex) => ex.key.includes(':skala:'));
    expect(scales.length).toBeGreaterThan(0);
    for (const ex of scales) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const numbers = ex.expression!.split('; ').map((t) => Number(t.replace(/\D/g, '')));
      const spread = Math.max(...numbers) - Math.min(...numbers);
      const fits = ex.answer.options.map((o, i) => {
        const [range, tick] = o.label.split(', ein Strich zählt ');
        const [lo, hi] = range.split(' bis ').map((t) => Number(t.replace(/\D/g, '')));
        return { i, ok: numbers.every((n) => n >= lo && n <= hi) && spread >= Number(tick.replace(/\D/g, '')) };
      });
      expect(fits.filter((f) => f.ok).map((f) => f.i), ex.key).toEqual([ex.answer.correct]);
    }
  });

  const everyItem = ([1, 2, 3] as const).flatMap((stufe) => ([1, 2, 3] as const).flatMap((ab) => Array.from({ length: 200 }, (_, i) => zahlenstrahlSkill.generate(createRng(i * 41 + stufe * 3 + ab), stufe, { ...CTX, ab }))));

  it('every label fits the drawing of the line, in the task, the field and the worked steps, and at least two stay', () => {
    const lines = everyItem.flatMap((ex) => [ex.visual, ex.answer.kind === 'numberline' ? ex.answer : undefined, ...ex.steps.map((s) => (typeof s === 'string' ? undefined : s.visual))]);
    let checked = 0;
    for (const v of lines) {
      if (!v || !('majorStep' in v)) continue;
      const shown = layoutLabels(v);
      const xOf = xScale(v.min, v.max);
      const halfOf = (value: number) => {
        const text = fmt(value);
        const digits = text.replace(/\D/g, '').length;
        return (digits * 10.4 + (text.length - digits) * 3.6) / 2;
      };
      expect(shown.length).toBeGreaterThanOrEqual(2);
      for (const label of shown) {
        expect(xOf(label.value) - halfOf(label.value), String(label.value)).toBeGreaterThanOrEqual(0);
        expect(xOf(label.value) + halfOf(label.value), String(label.value)).toBeLessThanOrEqual(NL.W);
        for (const other of shown) {
          if (other.value <= label.value || other.row !== label.row) continue;
          expect(xOf(other.value) - xOf(label.value), `${label.value} ${other.value}`).toBeGreaterThanOrEqual(halfOf(label.value) + halfOf(other.value));
        }
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('a labelled value stands left of every arrow', () => {
    for (const ex of everyItem) {
      if (!ex.key.includes(':ablesen:') && !ex.key.includes(':setzen:')) continue;
      const v = ex.visual?.type === 'numberLine' ? ex.visual : ex.answer.kind === 'numberline' ? ex.answer : null;
      if (!v) throw new Error(ex.key);
      const target = ex.answer.kind === 'number' ? ex.answer.value! : ex.answer.kind === 'numberline' ? ex.answer.value : NaN;
      expect(layoutLabels(v).some((l) => l.value <= target), ex.key).toBe(true);
    }
  });

  it('the srText holds the data of the task: ticks, labels and the place of the arrows', () => {
    for (const ex of everyItem) {
      if (ex.key.includes(':skala:')) continue;
      expect(ex.srText, ex.key).toMatch(/kleine Abschnitte\./);
      expect(ex.srText, ex.key).toMatch(/Beschriftet: \d/);
      const v = ex.visual?.type === 'numberLine' ? ex.visual : ex.answer.kind === 'numberline' ? ex.answer : null;
      if (!v) throw new Error(ex.key);
      for (const label of layoutLabels(v)) expect(ex.srText, ex.key).toContain(String(label.value));
      if (ex.key.includes(':ablesen:')) expect(ex.srText, ex.key).toMatch(/Der Pfeil steht \d+ kleine\w* Abschnitte? rechts von \d+\./);
      if (ex.key.includes(':abstand:')) {
        expect(ex.srText, ex.key).toMatch(/Der Pfeil A steht \d+ kleine\w* Abschnitte? rechts von/);
        expect(ex.srText, ex.key).toMatch(/Der Pfeil B steht \d+ kleine\w* Abschnitte? rechts von/);
      }
      if (ex.key.includes(':setzen:')) expect(ex.srText, ex.key).toContain('Pfeiltasten');
    }
  });
});
