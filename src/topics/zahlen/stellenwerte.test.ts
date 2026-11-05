import { describe, expect, it } from 'vitest';
import { formatAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { CTX, samples } from '../test-utils';
import { stellenwerteSkill } from './stellenwerte';

describeSkill(stellenwerteSkill);

const bug = (ex: { bugs?: { id: string; match: unknown }[] }, id: string) => ex.bugs?.find((b) => b.id === id)?.match;

describe('zahlen.stellenwerte', () => {
  it('worked steps add up and state the result', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(stellenwerteSkill, stufe)) {
        const errors = checkWorkedSolution(ex).filter((e) => !/does not contain field/.test(e));
        expect(errors).toEqual([]);
      }
    }
  });

  it('Stufe 1: the value is the digit times its place', () => {
    const PV: Record<string, number> = { HT: 1e5, ZT: 1e4, T: 1e3, H: 100, Z: 10, M: 1e6 };
    for (const ex of samples(stellenwerteSkill, 1)) {
      const [kind, n, c] = ex.key.split(':').slice(2);
      if (kind !== 'wert') continue;
      const digit = Math.floor(Number(n) / PV[c]) % 10;
      expect(ex.answer).toMatchObject({ value: digit * PV[c] });
    }
  });

  it('Stufe 2: a bundled table glues its digits in the bug (6 | 3 | 12 | 5 → 63 125)', () => {
    const tables = samples(stellenwerteSkill, 2).filter((ex) => ex.key.includes(':tafel:'));
    expect(tables.length).toBeGreaterThan(0);
    for (const ex of tables) {
      if (ex.visual?.type !== 'placeValue' || ex.answer.kind !== 'number') throw new Error('table with a number answer');
      const cells = ex.visual.rows[0].values.map((v) => v ?? 0);
      expect(bug(ex, 'ziffern-hintereinander')).toBe(Number(cells.join('')));
      const places = ex.visual.columns.length;
      expect(ex.answer.value).toBe(cells.reduce((s: number, v, i) => s + v * 10 ** (places - 1 - i), 0));
    }
  });

  it('Stufe 1: the hint for two equal digits counts steps, and a child who follows it gets the factor', () => {
    const items = Array.from({ length: 100 }, (_, i) => stellenwerteSkill.generate(createRng(i * 41 + 2), 1, { ...CTX, ab: 3 }));
    for (const ex of items) {
      expect(ex.key).toContain(':zweimal:');
      expect(ex.hints.join(' ')).not.toMatch(/zwischen den beiden/);
      expect(ex.hints.join(' ')).toMatch(/Schritte von der rechten Ziffer bis zur linken/);
    }
  });

  /** All arrangements of the digits that do not start with 0. */
  function arrangements(digits: readonly number[]): number[] {
    if (digits.length === 1) return [digits[0]];
    const out: number[] = [];
    const walk = (rest: readonly number[], text: string) => {
      if (rest.length === 0) { out.push(Number(text)); return; }
      rest.forEach((d, i) => { if (text !== '' || d !== 0) walk([...rest.slice(0, i), ...rest.slice(i + 1)], text + d); });
    };
    walk(digits, '');
    return out;
  }

  it('Stufe 3 AB III: a condition beyond sorting, and the answer is the true extreme, recomputed over all arrangements', () => {
    const PV: Record<string, number> = { HT: 1e5, ZT: 1e4, T: 1e3, H: 100, Z: 10, E: 1 };
    const forms = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const ex = stellenwerteSkill.generate(createRng(seed * 37 + 1), 3, { ...CTX, ab: 3 });
      if (ex.answer.kind !== 'number') throw new Error('number');
      const parts = ex.key.split(':').slice(3);
      const digits = ex.expression!.split(', ').map(Number);
      const all = arrangements(digits);
      const sorted = Number([...digits].sort((a, b) => b - a).join(''));
      forms.add(parts[0]);
      if (parts[0] === 'gerade' || parts[0] === 'ungerade') {
        const rest = parts[0] === 'gerade' ? 0 : 1;
        expect(ex.answer.value, ex.key).toBe(Math.max(...all.filter((n) => n % 2 === rest)));
        expect(ex.answer.value, ex.key).not.toBe(sorted);
      } else {
        const [form, d, c] = parts;
        const fixed = all.filter((n) => Math.floor(n / PV[c]) % 10 === Number(d));
        expect(ex.answer.value, ex.key).toBe(form === 'g' ? Math.max(...fixed) : Math.min(...fixed));
        expect(ex.answer.value, ex.key).not.toBe(form === 'g' ? Math.max(...all) : Math.min(...all));
      }
    }
    expect(forms.size).toBeGreaterThan(1);
  });

  it('Stufe 3: largest and smallest numbers use each digit once and never start with 0', () => {
    for (const ex of samples(stellenwerteSkill, 3).filter((e) => e.key.includes(':ziffern:'))) {
      if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error('number answer');
      const shown = ex.expression!.split(', ').sort().join('');
      expect(String(ex.answer.value).split('').sort().join('')).toBe(shown);
      expect(String(ex.answer.value)[0]).not.toBe('0');
    }
  });
});

describe('zahlen.stellenwerte: grammar of the place names', () => {
  it('never says 1 with a plural place', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(stellenwerteSkill, stufe)) {
        const text = [ex.prompt, ex.expression ?? '', ...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))].join(' ');
        expect(text, ex.key).not.toMatch(/(?<![\d ])1 (Millionen|Milliarden|Zehnmillionen|Hundertmillionen)/);
      }
    }
  });

  it('a bundled answer is grammatical: never "1 Millionen"', () => {
    const items = Array.from({ length: 600 }, (_, i) => stellenwerteSkill.generate(createRng(i * 37 + 1), 2, { ...CTX, ab: 2 })).filter((ex) => ex.key.includes(':buendeln:'));
    expect(items.some((ex) => ex.key.endsWith(':HT'))).toBe(true);
    for (const ex of items) {
      expect(formatAnswer(ex.answer), ex.key).not.toMatch(/(^|\s)1 (Millionen|Milliarden|Billionen)/);
      for (const step of ex.steps) expect(typeof step === 'string' ? step : step.text, ex.key).not.toMatch(/(^|\s)1 (Millionen|Milliarden|Billionen)/);
    }
  });
});
