import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import type { Exercise } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { dezimalOrdnenSkill } from './dezimal-ordnen';
import { decimal, everyItem, items, milli, sameTaskTwoKeys } from './test-helpers';

describeSkill(dezimalOrdnenSkill);

const places = (text: string) => text.split(',')[1]?.length ?? 0;
const symbol = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options[ex.answer.correct].label : '');

describe('brueche.dezimal-ordnen specifics', () => {
  it('worked steps calculate correctly', () => {
    for (const ex of everyItem(dezimalOrdnenSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('the sign recomputes in thousandths', () => {
    for (const ex of everyItem(dezimalOrdnenSkill)) {
      if (!ex.expression) continue;
      const [a, b] = ex.expression.split('□').map((p) => milli(decimal(p.trim())));
      expect(symbol(ex), ex.key).toBe(a < b ? '<' : a > b ? '>' : '=');
    }
  });

  it('Stufe 1 has the same length, Stufe 2 different lengths', () => {
    for (const ex of items(dezimalOrdnenSkill, 1, 1)) {
      const [a, b] = ex.expression!.split('□').map((p) => p.trim());
      expect(places(a)).toBe(places(b));
    }
    for (const ex of items(dezimalOrdnenSkill, 2, 1)) {
      const [a, b] = ex.expression!.split('□').map((p) => p.trim());
      expect(places(a)).not.toBe(places(b));
    }
    for (const ex of items(dezimalOrdnenSkill, 1, 2)) if (ex.answer.kind === 'order') expect(new Set(ex.answer.items.map(places)).size).toBe(1);
    for (const ex of items(dezimalOrdnenSkill, 2, 2)) if (ex.answer.kind === 'order') expect(new Set(ex.answer.items.map(places)).size).toBeGreaterThan(1);
  });

  it('order tasks are sorted by value; Stufe 3 orders five', () => {
    for (const ex of everyItem(dezimalOrdnenSkill)) {
      if (ex.answer.kind !== 'order') continue;
      const sorted = ex.answer.correct.map((i) => milli(decimal((ex.answer as { items: string[] }).items[i])));
      for (let i = 1; i < sorted.length; i++) expect(ex.answer.direction === 'aufsteigend' ? sorted[i] > sorted[i - 1] : sorted[i] < sorted[i - 1]).toBe(true);
    }
    for (const ex of items(dezimalOrdnenSkill, 3, 2)) expect(ex.answer.kind === 'order' && ex.answer.items.length).toBe(5);
  });

  it('runden recomputes: half up, at the place asked for', () => {
    const unit: Record<string, number> = { Ganze: 1000, Zehntel: 100, Hundertstel: 10 };
    for (const ex of items(dezimalOrdnenSkill, 3, 1)) {
      const m = /^Runde ([\d, ]+) auf (\S+)\.$/.exec(ex.prompt)!;
      const value = milli(decimal(m[1]));
      expect(milli((ex.answer as { value: number }).value)).toBe(Math.floor((value + unit[m[2]] / 2) / unit[m[2]]) * unit[m[2]]);
    }
  });

  it('a number between: all numbers strictly inside count, the borders do not', () => {
    for (const ex of items(dezimalOrdnenSkill, 3, 3)) {
      if (ex.answer.kind !== 'number') continue;
      const [low, high] = [...ex.prompt.matchAll(/\d+,\d+/g)].map((m) => m[0]);
      const tail = (text: string) => ({ kind: 'number' as const, text });
      expect(checkAnswer(ex.answer, tail(low)).correct).toBe(false);
      expect(checkAnswer(ex.answer, tail(high)).correct).toBe(false);
      expect(checkAnswer(ex.answer, tail(`${low}1`)).correct).toBe(true);
      expect(checkAnswer(ex.answer, tail(`${low}9`)).correct).toBe(true);
      expect(checkAnswer(ex.answer, tail(`${low}01`)).correct).toBe(true);
    }
  });

  it('the Zahlenstrahl holds the number asked for', () => {
    for (const [stufe, ab] of [[1, 3], [3, 3]] as const) {
      for (const ex of items(dezimalOrdnenSkill, stufe, ab)) {
        if (ex.answer.kind !== 'numberline') continue;
        expect(milli(ex.answer.value)).toBe(milli(decimal(/auf ([\d,]+)\.$/.exec(ex.prompt)![1])));
      }
    }
  });

  it('the final 0 is talked about only where a number has one', () => {
    let withZero = 0;
    let without = 0;
    for (const ex of items(dezimalOrdnenSkill, 2, 3, 400)) {
      if (!ex.expression) continue;
      const endsInZero = ex.expression.split('□').some((p) => /,\d*0$/.test(p.trim()));
      if (endsInZero) withZero++;
      else without++;
      const said = [...ex.hints, ex.praise].some((t) => t.includes('0 am Ende'));
      expect(said, ex.expression).toBe(endsInZero);
    }
    expect(withZero).toBeGreaterThan(0);
    expect(without).toBeGreaterThan(0);
  });

  it('a task that looks the same has one key, so a round never shows it twice', () => {
    expect(sameTaskTwoKeys(dezimalOrdnenSkill)).toEqual([]);
  });

  it('the hint for runden names the place in the genitive', () => {
    let wholes = 0;
    for (const ex of items(dezimalOrdnenSkill, 3, 1, 300)) {
      expect(ex.hints.join(' '), ex.key).not.toContain('der Ganze.');
      if (ex.prompt.endsWith('auf Ganze.')) {
        wholes++;
        expect(ex.hints[0]).toBe('Markiere die Stelle der Ganzen.');
      }
    }
    expect(wholes).toBeGreaterThan(0);
  });
});
