import { describe, expect, it } from 'vitest';
import { speak } from '../shared';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { frac, NBSP } from '../../core/format';
import { alltagSkill } from './alltag';

import { everyItem, fractionsIn, items, sameTaskTwoKeys } from './test-helpers';

describeSkill(alltagSkill);

const PER: Record<string, number> = { Stunde: 60, Stunden: 60, kg: 1000, l: 1000, m: 100 };

describe('brueche.alltag specifics', () => {
  it('worked steps calculate correctly', () => {
    for (const ex of everyItem(alltagSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('conversions recompute: fraction · unit size = answer', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of items(alltagSkill, stufe, 1)) {
        const [[n, d]] = fractionsIn(ex.expression!);
        const unit = /\} (\S+) =/.exec(ex.expression!)![1];
        expect(ex.answer.kind === 'number' && ex.answer.value).toBe((n * PER[unit]) / d);
      }
    }
  });

  it('Stufe 1 stays at one whole, Stufe 2 has mixed amounts', () => {
    for (const ex of items(alltagSkill, 1, 1)) expect(fractionsIn(ex.expression!)[0][0]).toBeLessThan(fractionsIn(ex.expression!)[0][1]);
    for (const ex of items(alltagSkill, 2, 1)) expect(fractionsIn(ex.expression!)[0][0]).toBeGreaterThan(fractionsIn(ex.expression!)[0][1]);
  });

  it('Stufe 3 orders by the real amount, and the unit-blind order is a bug', () => {
    for (const ex of items(alltagSkill, 3, 2)) {
      if (ex.answer.kind !== 'order') throw new Error('Stufe 3, AB II orders');
      const inSmall = ex.answer.items.map((label) => {
        const f = fractionsIn(label)[0];
        const unit = / (\S+)$/.exec(label)![1];
        if (f) return (f[0] * PER[unit]) / f[1];
        return Number(label.split(' ')[0]);
      });
      const sorted = ex.answer.correct.map((i) => inSmall[i]);
      for (let i = 1; i < sorted.length; i++) expect(ex.answer.direction === 'aufsteigend' ? sorted[i] > sorted[i - 1] : sorted[i] < sorted[i - 1]).toBe(true);
    }
  });

  it('answers stay whole numbers: no comma key', () => {
    expect(alltagSkill.keys).toBeUndefined();
    for (const ex of everyItem(alltagSkill)) if (ex.answer.kind === 'number') expect(Number.isInteger(ex.answer.value)).toBe(true);
  });

  it('Stufe 3, AB I compares a mixed amount: more than the conversion of Stufe 2, AB I', () => {
    for (const ex of items(alltagSkill, 3, 1)) {
      const [[n, d]] = fractionsIn(ex.expression!);
      expect(n, ex.expression).toBeGreaterThan(d);
    }
  });

  it('a story holds an amount that fits it', () => {
    const limits: [RegExp, number, number][] = [
      [/^Der Film dauert/, 75, 165], [/^Das Training dauert/, 30, 120], [/ übt /, 15, 105], [/^Die Pause dauert/, 15, 45],
      [/^Das Rezept braucht .* Mehl/, 250, 1250], [/^Das Rezept braucht .* Milch/, 250, 1000], [/^Der Krug enthält/, 250, 1750],
    ];
    let seen = 0;
    for (const [stufe, ab] of [[1, 2], [2, 2]] as const) {
      for (const ex of items(alltagSkill, stufe, ab, 400)) {
        if (!ex.context || ex.answer.kind !== 'number') continue;
        for (const [story, min, max] of limits) {
          if (!story.test(ex.context)) continue;
          seen++;
          expect(ex.answer.value, ex.context).toBeGreaterThanOrEqual(min);
          expect(ex.answer.value, ex.context).toBeLessThanOrEqual(max);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('the spoken text of a picture holds the reading, and a choice lists its options', () => {
    for (const ex of items(alltagSkill, 1, 3)) {
      const v = ex.visual!;
      if (v.type === 'scale') expect(ex.srText).toContain(`${v.grams} Gramm`);
      else if (v.type === 'container') expect(ex.srText).toContain(`${v.fillMl} Milliliter`);
      else if (v.type === 'clock') expect(ex.srText).toContain(`${v.hours}.${v.minutes} Uhr`);
      else throw new Error('a picture');
      expect(ex.srText).toContain('Wähle aus:');
    }
    for (const ex of items(alltagSkill, 2, 3)) if (ex.answer.kind === 'choice') expect(ex.srText).toContain('Wähle aus:');
  });

  it('speak(): a fraction takes its spoken form before a unit', () => {
    const cases: [string, string][] = [
      [`Der Film dauert ${frac(3, 4, 1)}${NBSP}Stunden.`, 'Der Film dauert eindreiviertel Stunden.'],
      [`Lea kauft ${frac(1, 4, 2)}${NBSP}kg Äpfel.`, 'Lea kauft zweieinviertel Kilogramm Äpfel.'],
      [`Der Krug enthält ${frac(1, 2, 1)}${NBSP}l Saft.`, 'Der Krug enthält eineinhalb Liter Saft.'],
      [`Der Krug enthält ${frac(1, 2)}${NBSP}l Saft.`, 'Der Krug enthält einen halben Liter Saft.'],
      [`Das Band ist ${frac(1, 2)}${NBSP}m lang.`, 'Das Band ist einen halben Meter lang.'],
      [`Rechne um: ${frac(1, 2)}${NBSP}m sind wie viele Zentimeter?`, 'Rechne um: ein halber Meter sind wie viele Zentimeter?'],
      [`Die Pause dauert ${frac(1, 2)}${NBSP}Stunde.`, 'Die Pause dauert eine halbe Stunde.'],
      [`Die Pause dauert ${frac(1, 4)}${NBSP}Stunde.`, 'Die Pause dauert eine Viertelstunde.'],
      [`Die Pause dauert ${frac(3, 4)}${NBSP}Stunde.`, 'Die Pause dauert eine Dreiviertelstunde.'],
      [`${frac(1, 2)} der Kinder fährt mit dem Bus.`, 'die Hälfte der Kinder fährt mit dem Bus.'],
    ];
    for (const [text, said] of cases) expect(speak(text)).toBe(said);
  });

  it('no spoken text keeps a broken fraction form', () => {
    for (const ex of everyItem(alltagSkill)) {
      expect(ex.srText, ex.key).not.toMatch(/ein Halb|Ganze(s)? und|Viertel Stunde/);
    }
  });

  it('a task that looks the same has one key, so a round never shows it twice', () => {
    expect(sameTaskTwoKeys(alltagSkill)).toEqual([]);
  });

  it('Stufe 3 compares or orders at every AB: what is left is measured against a fraction', () => {
    const per: Record<string, number> = { Stunde: 60, Stunden: 60, kg: 1000, l: 1000 };
    let left = 0;
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(alltagSkill, 3, ab, 400)) {
        expect(['choice', 'order'], ex.key).toContain(ex.answer.kind);
        if (!ex.context || ex.answer.kind !== 'choice') continue;
        left++;
        const [[n, d]] = fractionsIn(ex.context);
        const unit = /\}\s(\p{L}+)/u.exec(ex.context)![1];
        const taken = Number(/\.? (\d+)\s(?:min|g|ml)/.exec(ex.context)![1]);
        const label = ex.answer.options[ex.answer.correct].label;
        const [[mn, md]] = fractionsIn(label);
        const rest = (n * per[unit]) / d - taken;
        const mark = (mn * per[/\}\s(\S+)$/.exec(label)![1]]) / md;
        expect(label.split(' ')[0], ex.context).toBe(rest > mark ? 'Mehr' : rest < mark ? 'Weniger' : 'Genau');
        expect(Math.abs(rest - mark), ex.context).toBeLessThanOrEqual(per[unit] === 60 ? 10 : 100);
        expect(rest, ex.context).toBeGreaterThan(0);
      }
    }
    expect(left).toBeGreaterThan(0);
  });
});
