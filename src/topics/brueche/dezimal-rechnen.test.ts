import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { formatAnswer } from '../../core/check';
import type { Exercise } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { dezimalRechnenSkill } from './dezimal-rechnen';
import { decimal, everyItem, items, milli, sameTaskTwoKeys } from './test-helpers';

describeSkill(dezimalRechnenSkill);

const valueOf = (ex: Exercise) => (ex.answer as { value: number }).value;
const places = (text: string) => text.split(',')[1]?.length ?? 0;

/** '3,5 + 1,25 = □' as [left, sign, right]; money and units stay out. */
function terms(expression: string): [string, string, string] {
  const m = /^([\d, ]+)(?: €)? ([+−·:]) ([\d, ]+)(?: €)? = /.exec(expression)!;
  return [m[1], m[2], m[3]];
}

function exact(a: string, op: string, b: string): number {
  const [x, y] = [milli(decimal(a)), milli(decimal(b))];
  if (op === '+') return x + y;
  if (op === '−') return x - y;
  if (op === '·') return x * Number(b);
  return x / Number(b);
}

describe('brueche.dezimal-rechnen specifics', () => {
  it('worked steps calculate correctly', () => {
    for (const ex of everyItem(dezimalRechnenSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('the answer recomputes in thousandths, never in floats', () => {
    for (const [stufe, ab] of [[1, 1], [2, 1], [2, 2], [3, 1]] as const) {
      for (const ex of items(dezimalRechnenSkill, stufe, ab)) {
        const [a, op, b] = terms(ex.expression!);
        expect(milli(valueOf(ex)), ex.key).toBe(exact(a, op, b));
      }
    }
  });

  it('Stufe 1 plus and minus of the same length, Stufe 2 of different lengths', () => {
    for (const ex of items(dezimalRechnenSkill, 1, 1)) {
      const [a, op, b] = terms(ex.expression!);
      expect(['+', '−']).toContain(op);
      expect(places(a)).toBe(places(b));
    }
    for (const ex of items(dezimalRechnenSkill, 2, 1)) {
      const [a, op, b] = terms(ex.expression!);
      expect(op).toBe('+');
      expect(places(a)).not.toBe(places(b));
    }
    for (const ex of items(dezimalRechnenSkill, 2, 2)) {
      const [a, op, b] = terms(ex.expression!);
      expect(op).toBe('−');
      expect(places(a)).not.toBe(places(b));
    }
  });

  it('Stufe 3 multiplies or divides by a natural number, with a Überschlag in the steps', () => {
    for (const ex of items(dezimalRechnenSkill, 3, 1)) {
      const [, op, b] = terms(ex.expression!);
      expect(['·', ':']).toContain(op);
      expect(Number.isInteger(Number(b))).toBe(true);
      expect(typeof ex.steps[0] === 'string' && ex.steps[0]).toMatch(/^Überschlag/);
    }
  });

  it('placing the comma: the digits of the prompt are the digits of the answer', () => {
    for (const ex of items(dezimalRechnenSkill, 3, 3)) {
      if (!ex.expression) continue;
      const product = /= (\d+)\./.exec(ex.prompt)![1];
      expect(String(milli(valueOf(ex))).replace(/0+$/, '')).toBe(product.replace(/0+$/, ''));
    }
  });

  it('the comma key holds for every number answer', () => {
    for (const ex of everyItem(dezimalRechnenSkill)) if (ex.answer.kind === 'number') expect(ex.answer.decimals).toBeGreaterThan(0);
  });

  it('money and metres show both places in the solution (T10)', () => {
    let seen = 0;
    for (const ex of everyItem(dezimalRechnenSkill)) {
      if (ex.answer.kind !== 'number' || (ex.answer.unit !== '€' && ex.answer.unit !== 'm')) continue;
      seen++;
      expect(ex.answer.decimals, ex.key).toBe(2);
      expect(formatAnswer(ex.answer), ex.key).toMatch(/^\d+,\d{2}\s(€|m)$/u);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('the hint about carrying a whole has a whole to carry', () => {
    let seen = 0;
    for (const ex of items(dezimalRechnenSkill, 3, 1, 600)) {
      if (!ex.bugs?.some((b) => b.id === 'komma-getrennt')) continue;
      seen++;
      const [a, , b] = terms(ex.expression!);
      expect(Number(a.split(',')[1]) * Number(b), ex.expression).toBeGreaterThanOrEqual(10);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('a price fits its item, and a payment is a banknote', () => {
    const euros = (text: string, re: RegExp) => (re.test(text) ? decimal(re.exec(text)![1]) : null);
    for (const ex of items(dezimalRechnenSkill, 1, 2, 400)) {
      const heft = euros(ex.context!, /ein Heft für ([\d,]+)/);
      if (heft !== null) expect(heft, ex.context).toBeLessThanOrEqual(2.9);
      const book = euros(ex.context!, /Ein Buch kostet ([\d,]+)/);
      if (book !== null) expect(book, ex.context).toBeGreaterThanOrEqual(4.5);
      if (ex.context!.includes('Springseil')) expect(valueOf(ex), ex.context).toBeGreaterThanOrEqual(2.5);
    }
    for (const ex of items(dezimalRechnenSkill, 1, 3, 400)) {
      if (!ex.context) continue;
      expect([5, 10, 20], ex.context).toContain(euros(ex.context, /bezahlt mit ([\d,]+)/));
    }
    const limits: Record<string, [number, number]> = { Hefte: [0.8, 2.95], Stifte: [0.6, 2.5], Bälle: [3, 9.95], Karten: [0.55, 2.5] };
    for (const ex of items(dezimalRechnenSkill, 3, 3, 400)) {
      const item = /kauft \d+ (\S+) für/.exec(ex.context ?? '')?.[1];
      if (!item) continue;
      expect(valueOf(ex), ex.context).toBeGreaterThanOrEqual(limits[item][0]);
      expect(valueOf(ex), ex.context).toBeLessThanOrEqual(limits[item][1]);
    }
  });

  it('a Überschlag of a price divides without a Rest', () => {
    let seen = 0;
    for (const ex of items(dezimalRechnenSkill, 3, 3, 400)) {
      const m = ex.hints.map((h) => /Der Überschlag (\d+) € : (\d+)/.exec(h)).find(Boolean);
      if (!m) continue;
      seen++;
      expect(Number(m[1]) % Number(m[2]), m[0]).toBe(0);
      expect(Number(m[1]), m[0]).toBeGreaterThanOrEqual(Number(m[2]));
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('a task that looks the same has one key, so a round never shows it twice', () => {
    expect(sameTaskTwoKeys(dezimalRechnenSkill)).toEqual([]);
  });
});
