import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise, VisualOf } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { dezimalLesenSkill } from './dezimal-lesen';
import { decimal, everyItem, fractionsIn, items, milli, sameTaskTwoKeys } from './test-helpers';

describeSkill(dezimalLesenSkill);

const SIZE: Record<string, number> = { E: 1000, z: 100, h: 10, t: 1 };
const tableMilli = (ex: Exercise) => {
  const v = ex.visual as VisualOf<'placeValue'>;
  return v.columns.reduce((sum, c, i) => sum + (v.rows[0].values[i] ?? 0) * SIZE[c], 0);
};
const valueOf = (ex: Exercise) => (ex.answer as { value: number }).value;

describe('brueche.dezimal-lesen specifics', () => {
  it('worked steps calculate correctly', () => {
    for (const ex of everyItem(dezimalLesenSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('the Stellentafel gives the answer, at the places of the Stufe', () => {
    for (const ex of items(dezimalLesenSkill, 1, 1)) {
      expect(milli(valueOf(ex))).toBe(tableMilli(ex));
      expect((ex.visual as VisualOf<'placeValue'>).columns).not.toContain('t');
    }
    for (const ex of items(dezimalLesenSkill, 2, 1)) {
      expect(milli(valueOf(ex))).toBe(tableMilli(ex));
      expect((ex.visual as VisualOf<'placeValue'>).columns).toContain('t');
    }
  });

  it('a fraction to a Dezimalzahl recomputes', () => {
    for (const [stufe, ab] of [[2, 2], [3, 2]] as const) {
      for (const ex of items(dezimalLesenSkill, stufe, ab)) {
        const [[n, d]] = fractionsIn(ex.expression!);
        expect(milli(valueOf(ex))).toBe((n * 1000) / d);
      }
    }
  });

  it('a Dezimalzahl to a fraction keeps the value', () => {
    for (const [stufe, ab] of [[1, 2], [3, 3]] as const) {
      for (const ex of items(dezimalLesenSkill, stufe, ab)) {
        const shown = decimal(/(\d+,\d+)/.exec(ex.prompt)![1]);
        const a = ex.answer as { numerator: number; denominator: number };
        expect((a.numerator * 1000) / a.denominator).toBe(milli(shown));
      }
    }
  });

  it('inner zeros belong to Stufe 3: Stufe 1 and 2 have none', () => {
    for (const ex of items(dezimalLesenSkill, 1, 2)) expect(ex.prompt).not.toMatch(/,0/);
    for (const ex of items(dezimalLesenSkill, 2, 1)) expect((ex.visual as VisualOf<'placeValue'>).rows[0].values.slice(1)).not.toContain(null);
    const zeros = items(dezimalLesenSkill, 3, 1).filter((ex) => milli(valueOf(ex)) % 1000 < 100);
    expect(zeros.length).toBeGreaterThan(0);
  });

  it('the comma key holds for every number answer', () => {
    for (const ex of everyItem(dezimalLesenSkill)) if (ex.answer.kind === 'number') expect(ex.answer.decimals).toBeGreaterThan(0);
  });

  it('following the hint for a dropped zero gives the answer: the digit it names has the zeros right before it', () => {
    let seen = 0;
    for (const ex of items(dezimalLesenSkill, 3, 1, 400)) {
      if (ex.visual?.type !== 'placeValue') continue;
      const bug = ex.bugs?.find((b) => b.id === 'null-vergessen');
      if (!bug) continue;
      seen++;
      const m = /^Die (\d) steht bei den (Zehnteln|Hundertsteln|Tausendsteln)\. Schreib (die 0|die beiden Nullen) davor\.$/.exec(bug.hint)!;
      expect(m, bug.hint).not.toBeNull();
      const cells = ex.visual.rows[0].values.slice(1);
      const place = ['Zehnteln', 'Hundertsteln', 'Tausendsteln'].indexOf(m[2]);
      const zeros = m[3] === 'die 0' ? 1 : 2;
      expect(cells[place], ex.key).toBe(Number(m[1]));
      // exactly that many empty places right before the digit, and no other place left to fill
      expect(place, bug.hint).toBeGreaterThanOrEqual(zeros);
      expect(cells.slice(place - zeros, place), bug.hint).toEqual(Array(zeros).fill(null));
      expect(cells[place - zeros - 1] ?? 'none', bug.hint).not.toBeNull();
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('Stufe 2, AB III works in Tausendstel, with no Nenner of Stufe 1', () => {
    for (const ex of items(dezimalLesenSkill, 2, 3)) {
      if (ex.answer.kind === 'fraction') expect(ex.answer.denominator, ex.prompt).toBe(1000);
      for (const hint of ex.hints) expect(hint).not.toContain('schon gegeben');
    }
  });

  it('Stufe 3 stays with its label: ¼ and ¾ as Dezimalzahl, and an inner zero or 0,25 and 0,75 back to a fraction', () => {
    for (const ex of items(dezimalLesenSkill, 3, 2)) {
      const [[n, d]] = fractionsIn(ex.expression!);
      expect(d, ex.expression).toBe(4);
      expect(n % 2, ex.expression).toBe(1);
    }
    for (const ex of items(dezimalLesenSkill, 3, 3)) expect(ex.prompt).toMatch(/\b0,(0|25\b|75\b)/);
  });

  it('a task that looks the same has one key, so a round never shows it twice', () => {
    expect(sameTaskTwoKeys(dezimalLesenSkill)).toEqual([]);
  });

  it('the hint for Tausendstel says nothing untrue about the answer typed: 11/1000 are no Hundertstel', () => {
    let seen = 0;
    for (const ex of items(dezimalLesenSkill, 2, 3, 400)) {
      for (const bug of ex.bugs ?? []) {
        if (bug.id !== 'null-stelle' || !/Nenner 1000/.test(ex.prompt)) continue;
        seen++;
        expect(bug.hint, ex.prompt).not.toMatch(/Das (?:sind|ist) \d+ (?:Zehntel|Hundertstel)/);
        const shown = /^Schreibe (\S+) als/.exec(ex.prompt)![1];
        expect(bug.hint.startsWith(`${shown} hat nur ${shown.length === 3 ? 'eine Stelle' : 'zwei Stellen'}.`), bug.hint).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
