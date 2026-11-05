import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { CTX, samples } from '../test-utils';
import { rundenSkill } from './runden';

describeSkill(rundenSkill);

const PV: Record<string, number> = { Mrd: 1e9, M: 1e6, HT: 1e5, ZT: 1e4, T: 1e3, H: 100, Z: 10 };

/** Independent rounding on the digit string. */
function roundRef(n: number, p: number): number {
  const text = String(n);
  const keep = text.length - String(p).length + 1;
  if (keep <= 0) return Number(text[0]) >= 5 ? p : 0;
  const head = Number(text.slice(0, keep));
  return (Number(text[keep] ?? '0') >= 5 ? head + 1 : head) * p;
}

describe('zahlen.runden', () => {
  it('answers recomputed from the key; steps add up', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(rundenSkill, stufe)) {
        const errors = checkWorkedSolution(ex).filter((e) => !/does not contain field/.test(e));
        expect(errors).toEqual([]);
        const [kind, a, c] = ex.key.split(':').slice(2);
        if (kind === 'runden') expect(ex.answer).toMatchObject({ value: roundRef(Number(a), PV[c]) });
        if (kind === 'groesste') {
          const value = (ex.answer as { value: number }).value;
          expect(roundRef(value, PV[c])).toBe(Number(a));
          expect(roundRef(value + 1, PV[c])).not.toBe(Number(a));
        }
      }
    }
  });

  it('Stufe 1 stays below a Million without a carry; Stufe 2 carries', () => {
    for (const ex of samples(rundenSkill, 1).filter((e) => e.key.includes(':runden:'))) {
      const [, n, c] = ex.key.split(':').slice(2);
      expect(Number(n)).toBeLessThanOrEqual(1e6);
      expect(Math.floor(Number(n) / PV[c]) % 10).not.toBe(9);
    }
    const carried = samples(rundenSkill, 2).filter((e) => e.key.includes(':runden:'));
    expect(carried.length).toBeGreaterThan(0);
    for (const ex of carried) {
      const [, n, c] = ex.key.split(':').slice(2);
      expect(Math.floor(Number(n) / PV[c]) % 10).toBe(9);
      expect(ex.bugs?.some((b) => b.id === 'runden-uebertrag')).toBe(true);
    }
  });

  it('which-number items have exactly one option that rounds to the target', () => {
    const items = samples(rundenSkill, 2).filter((e) => e.key.includes(':welche:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [, t, c] = ex.key.split(':').slice(2);
      const hits = ex.answer.options.map((o, i) => [roundRef(Number(o.label.replace(/\D/g, '')), PV[c]), i] as const).filter(([r]) => r === Number(t));
      expect(hits.map(([, i]) => i)).toEqual([ex.answer.correct]);
    }
  });

  it('the range stories stay real: no Milliarden of Aufrufe or Besucher', () => {
    const items = Array.from({ length: 800 }, (_, i) => rundenSkill.generate(createRng(i * 23 + 9), 3, { ...CTX, ab: 3 }));
    expect(items.some((ex) => ex.key.includes(':Mrd:'))).toBe(true);
    for (const ex of items.filter((e) => e.key.includes(':bereich:'))) {
      const [, t, , things] = ex.key.split(':').slice(2);
      if (things === 'Besucher') expect(Number(t), ex.key).toBeLessThanOrEqual(1e7);
      if (things === 'Aufrufe') expect(Number(t), ex.key).toBeLessThanOrEqual(1e8);
    }
  });

  it('both bounds round to the target, and one more does not', () => {
    const items = samples(rundenSkill, 3, 600).filter((e) => e.key.includes(':bereich:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      if (ex.answer.kind !== 'multi') throw new Error('multi');
      const [, t, c] = ex.key.split(':').slice(2);
      const [low, high] = ex.answer.fields.map((f) => f.value);
      expect(roundRef(low, PV[c])).toBe(Number(t));
      expect(roundRef(high, PV[c])).toBe(Number(t));
      expect(roundRef(high + 1, PV[c])).not.toBe(Number(t));
      expect(roundRef(low - 1, PV[c])).not.toBe(Number(t));
    }
  });

  const THIN = /\u202F/g;
  const digitsOf = (text: string) => Number(text.replace(THIN, ''));

  it('Stufe 3 AB I needs rounding too: common sense leaves three lines, and only one is rounded right, with a carry', () => {
    const items = Array.from({ length: 400 }, (_, i) => rundenSkill.generate(createRng(i * 29 + 4), 3, { ...CTX, ab: 1 }));
    const CONTEXTS = /Zuschauer|Einwohner|Besucher|Schritte|Bücher|Bäume/;
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      expect(ex.key).toContain(':sinn:');
      const sensible = ex.answer.options.filter((o) => CONTEXTS.test(o.label));
      expect(sensible.length, ex.key).toBe(3);
      // 5 digits round to Tausender, 6 digits to Zehntausender
      const right = sensible.filter((o) => {
        const m = /: ([\d\u202F]+) .* ≈ ([\d\u202F]+)$/.exec(o.label)!;
        const n = digitsOf(m[1]);
        return roundRef(n, n >= 1e5 ? 1e4 : 1e3) === digitsOf(m[2]);
      });
      expect(right.map((o) => o.label), ex.key).toContain(ex.answer.options[ex.answer.correct].label);
      expect(right.length, ex.key).toBe(1);
      const carried = /: ([\d\u202F]+) .* ≈ ([\d\u202F]+)$/.exec(right[0].label)!;
      expect(carried[1][0], ex.key).not.toBe(carried[2][0]);
    }
  });

  it('a rounding line keeps room on both sides: the labels never sit at the ends of the drawing', () => {
    const lines = [...Array.from({ length: 200 }, (_, i) => rundenSkill.generate(createRng(i * 3 + 1), 1, { ...CTX, ab: 1 })), ...Array.from({ length: 200 }, (_, i) => rundenSkill.generate(createRng(i * 3 + 1), 3, { ...CTX, ab: 2 }))]
      .flatMap((ex) => [ex.visual, ...ex.steps.map((s) => (typeof s === 'string' ? undefined : s.visual))])
      .filter((v) => v?.type === 'numberLine');
    expect(lines.length).toBeGreaterThan(0);
    for (const v of lines) {
      if (v?.type !== 'numberLine') throw new Error('line');
      expect(v.labelMajor).toBe(false);
      expect(v.labels).toHaveLength(3);
      expect(v.labels![0]).toBeGreaterThan(v.min);
      expect(v.labels![2]).toBeLessThan(v.max);
    }
  });
});
