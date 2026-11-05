import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { sachaufgabenSkill as skill } from './sachaufgaben';
import { ABS, childStrings, items, rightLabel, stepProblems, stepTexts } from './test-helpers';
import { sentences } from '../../core/testing';

describeSkill(skill);

const numbersIn = (text: string) => (text.replace(/\{frac:[^}]*\}/g, '#').match(/\d[\d\u202F]*/g) ?? []).map((n) => Number(n.replace(/\u202F/g, '')));
/** The calculations of the worked steps: a line that states a result. */
const calculations = (ex: Exercise) => stepTexts(ex).filter((t) => /\d = \d/.test(t)).length;

describe('rechnen.sachaufgaben', () => {
  it('Stufe 1: one step, with all numbers in use', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 1, ab)) {
        if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error(ex.key);
        expect(numbersIn(ex.context ?? '').length, ex.key).toBeLessThanOrEqual(2);
        expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      }
    }
  });

  it('T13: "mehr" goes with a subtraction and "weniger" with an addition, and the keyword bug is the other operation', () => {
    const seen = new Set<string>();
    for (const ex of items(skill, 1, 2, 300)) {
      if (!ex.key.includes('mehr:') && !ex.key.includes('weniger:')) continue;
      if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error(ex.key);
      const [a, b] = numbersIn(ex.context ?? '');
      const up = ex.key.includes('mehr:');
      seen.add(up ? 'mehr' : 'weniger');
      expect(ex.answer.value, ex.key).toBe(up ? a - b : a + b);
      expect(ex.context, ex.key).toContain(up ? ' mehr ' : ' weniger ');
      // a negative value is no answer a child types here
      if (up || a > b) expect(ex.bugs?.find((x) => x.id === 'signalwort')?.match, ex.key).toBe(up ? a + b : a - b);
    }
    expect([...seen].sort()).toEqual(['mehr', 'weniger']);
  });

  it('Stufe 1: every item is one calculation; the money picture is one note', () => {
    let pictures = 0;
    for (const ab of ABS) {
      for (const ex of items(skill, 1, ab)) {
        expect(calculations(ex), ex.key).toBeLessThanOrEqual(1);
        if (ex.visual?.type === 'money') {
          pictures++;
          expect(ex.visual.items.length, ex.key).toBe(1);
        }
      }
    }
    expect(pictures).toBeGreaterThan(10);
  });

  it('Stufe 2: two calculations and one number not needed, at every AB', () => {
    for (const ab of [1, 2] as const) {
      let extra = 0;
      for (const ex of items(skill, 2, ab)) {
        if (ex.answer.kind !== 'number') throw new Error(ex.key);
        expect(checkWorkedSolution(ex), ex.key).toEqual([]);
        expect(calculations(ex), ex.key).toBe(2);
        // two steps use three numbers, the fourth is not needed
        expect(numbersIn(ex.context ?? '').length, ex.key).toBe(4);
        if (ex.bugs?.some((b) => b.id === 'alle-zahlen')) extra++;
      }
      expect(extra, `AB ${ab}`).toBeGreaterThan(100);
    }
    for (const ex of items(skill, 2, 3)) {
      if (ex.answer.kind === 'number') expect(calculations(ex), ex.key).toBe(2);
    }
  });

  it('"Welche Angabe brauchst du nicht?": the marked number stands only in the sentence not needed', () => {
    let seen = 0;
    for (const ex of items(skill, 2, 3, 1500)) {
      if (ex.answer.kind !== 'choice') continue;
      seen++;
      const sentences = (ex.context ?? '').split(/(?<=\.)\s/);
      const label = rightLabel(ex);
      const holding = sentences.filter((s) => numbersIn(s).includes(Number(label.replace(/\u202F/g, ''))));
      expect(holding.length, ex.key).toBe(1);
      expect(stepTexts(ex)[0], ex.key).toContain(holding[0]);
      expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
    }
    expect(seen).toBeGreaterThan(400);
  });

  it('Stufe 2, AB III: the table carries more rows than the question needs, or the extra number is the option', () => {
    for (const ex of items(skill, 2, 3)) {
      if (ex.answer.kind === 'number') {
        if (ex.visual?.type !== 'table') throw new Error(ex.key);
        expect(ex.visual.rows.length, ex.key).toBe(4);
        expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      } else if (ex.answer.kind === 'choice') {
        const sentences = (ex.context ?? '').split(/(?<=\.)\s/);
        const extra = sentences.find((s) => stepTexts(ex)[0].includes(s));
        expect(extra, ex.key).toBeDefined();
        expect(extra, ex.key).toContain(rightLabel(ex));
      } else throw new Error(ex.key);
    }
  });

  it('Stufe 3: every number item offers "Nicht lösbar"; a null answer ends with that in its steps', () => {
    let missing = 0;
    for (const ab of ABS) {
      for (const ex of items(skill, 3, ab)) {
        if (ex.answer.kind !== 'number') continue;
        expect(ex.answer.offerUnsolvable, ex.key).toBe(true);
        expect(checkWorkedSolution(ex), ex.key).toEqual([]);
        if (ex.answer.value === null) missing++;
      }
    }
    expect(missing).toBeGreaterThan(30);
  });

  it('Stufe 3, AB II: with or without a gap the text looks the same, so only reading tells them apart', () => {
    const counts = { lösbar: new Set<string>(), offen: new Set<string>() };
    const seen = { lösbar: 0, offen: 0 };
    for (const ex of items(skill, 3, 2, 1000)) {
      if (ex.answer.kind !== 'number') throw new Error(ex.key);
      const form = ex.answer.value === null ? 'offen' : 'lösbar';
      seen[form]++;
      // more than the story of Stufe 2: its facts one per sentence, with the number too many
      expect(sentences(ex.context ?? '').length, ex.key).toBe(4);
      counts[form].add(`${sentences(ex.context ?? '').length}:${numbersIn(ex.context ?? '').length}`);
      if (form === 'offen') {
        expect(stepTexts(ex).at(-1), ex.key).toContain('nicht lösbar');
        expect(ex.bugs?.some((b) => b.id === 'alle-zahlen') ?? false, ex.key).toBe(ex.bugs !== undefined);
      }
    }
    expect(seen.lösbar).toBeGreaterThan(300);
    expect(seen.offen).toBeGreaterThan(300);
    expect([...counts.offen]).toEqual(['4:4']);
    expect([...counts.lösbar]).toEqual(['4:4']);
  });

  it('prices fit their context, and a Rückgeld starts from a note', () => {
    let games = 0;
    let comics = 0;
    for (const ab of [1, 2] as const) {
      for (const stufe of [1, 2, 3] as const) {
        for (const ex of items(skill, stufe, ab, 500)) {
          const context = ex.context ?? '';
          expect(context, ex.key).not.toMatch(/Klassenfahrt zahlt|Hefte/);
          const game = /ein Spiel für (\d+)\s€/.exec(context);
          if (game) {
            games++;
            expect(Number(game[1]), ex.key).toBeLessThanOrEqual(80);
          }
          const paid = /bezahlt mit (\d+)\s€/.exec(context);
          if (paid) {
            comics++;
            expect([10, 20, 50, 100], ex.key).toContain(Number(paid[1]));
          }
        }
      }
    }
    expect(games).toBeGreaterThan(20);
    expect(comics).toBeGreaterThan(50);
  });

  it('what a child needs is in the screen reader text too, not only in the picture', () => {
    let money = 0;
    let tables = 0;
    for (const ex of [...items(skill, 1, 1, 400), ...items(skill, 2, 3, 400)]) {
      if (ex.visual?.type === 'money') {
        money++;
        expect(ex.srText, ex.key).toContain(`${ex.visual.items[0] / 100} Euro`);
      }
      if (ex.visual?.type === 'table') {
        tables++;
        for (const [name, price] of ex.visual.rows) {
          expect(ex.srText, ex.key).toContain(name);
          expect(ex.srText, ex.key).toMatch(new RegExp(`${name} ${parseInt(price, 10)} Euro`));
        }
      }
    }
    expect(money).toBeGreaterThan(20);
    expect(tables).toBeGreaterThan(20);
  });

  it('Stufe 3: the meaning of the Rest is what the story asks; the Probe holds', () => {
    let rest = 0;
    for (const ab of [1, 3] as const) {
      for (const ex of items(skill, 3, ab)) {
        if (ex.answer.kind !== 'number' || ex.answer.value === null || !ex.key.includes('rest')) continue;
        rest++;
        expect(stepTexts(ex).some((t) => /\d+ · \d+ \+ \d+ = \d+/.test(t)), ex.key).toBe(true);
        const m = /(\d+) : (\d+) = (\d+) Rest (\d+)/.exec(stepTexts(ex).join(' '));
        expect(m, ex.key).not.toBeNull();
        const [n, k, q, r] = m!.slice(1).map(Number);
        expect(q * k + r, ex.key).toBe(n);
        expect(r, ex.key).toBeLessThan(k);
        expect(ex.answer.value, ex.key).toBe(/Platz/.test(stepTexts(ex).at(-1)!) ? q + 1 : q);
      }
    }
    expect(rest).toBeGreaterThan(100);
  });

  it('Stufe 3: the group fits together: an adult per vehicle, and not a hundred children to two adults', () => {
    let groups = 0;
    for (const ex of items(skill, 3, 3, 500)) {
      if (!ex.key.includes('rest2:') || ex.answer.kind !== 'number' || ex.answer.value === null) continue;
      groups++;
      const [children, adults] = numbersIn(ex.context ?? '');
      expect(children, ex.key).toBeGreaterThan(adults);
      expect(children, ex.key).toBeLessThanOrEqual(adults * 12);
      if (ex.key.includes('kleinbus')) expect(adults, ex.key).toBeGreaterThanOrEqual(ex.answer.value);
    }
    expect(groups).toBeGreaterThan(100);
  });

  it('Stufe 3: the words of a Rest fit its number and the noun', () => {
    const sawOne = new Set<string>();
    for (const ex of items(skill, 3, 1, 1500)) {
      const text = childStrings(ex);
      expect(text, ex.key).not.toMatch(/\b1 (Eier|Kinder|Bücher)\b/);
      expect(text, ex.key).not.toMatch(/bleiben nur 1\b/);
      expect(text, ex.key).not.toMatch(/ein ganzes(?! Stück)|noch eins|die ganzen|ein ganze /);
      for (const one of ['1 Ei', '1 Kind', '1 Buch', '1 cm Band']) if (text.includes(one)) sawOne.add(one);
    }
    expect([...sawOne].sort()).toEqual(['1 Buch', '1 Ei', '1 Kind', '1 cm Band']);
  });

  it('Stufe 3: the plausibility answer follows the claim and the Überschlag', () => {
    let seen = 0;
    for (const ex of items(skill, 3, 3, 300)) {
      if (ex.answer.kind !== 'choice') continue;
      seen++;
      const [n, p, claimed] = numbersIn(ex.context ?? '');
      const exact = n * p;
      const label = rightLabel(ex);
      if (claimed === exact) expect(label, ex.key).toContain('passt');
      else if (claimed > exact) expect(label, ex.key).toContain('groß');
      else expect(label, ex.key).toContain('klein');
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('every arithmetic line of the worked steps holds', () => {
    for (const ab of ABS) for (const stufe of [1, 2, 3] as const) for (const ex of items(skill, stufe, ab, 100)) expect(stepProblems(ex)).toEqual([]);
  });
});
