import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import { STUFEN, type Ab } from '../../core/types';
import { CTX, samples } from '../test-utils';
import { schlussrechnungSkill } from './schlussrechnung';
import { assertFitsPhone, assertSteps } from './testkit';

describeSkill(schlussrechnungSkill);

const atAb = (stufe: 1 | 2 | 3, ab: Ab, n = 1000) => Array.from({ length: n }, (_, i) => schlussrechnungSkill.generate(createRng(i * 43 + ab), stufe, { ...CTX, ab }));

/** Every text of an item a child sees or hears. */
const allText = (ex: ReturnType<typeof atAb>[number]) => JSON.stringify([ex.context, ex.prompt, ex.srText, ex.hints, ex.steps, ex.visual, ex.answer, ex.bugs?.map((b) => b.hint)]);

describe('groessen.schlussrechnung specifics', () => {
  it('the steps are right and end with the result', () => {
    for (const stufe of STUFEN) for (const ex of samples(schlussrechnungSkill, stufe)) assertSteps(ex);
  });

  it('Stufe 2: the table recomputes to the answer over one', () => {
    const number = (cell: string) => Number(cell.replace(/[^\d,]/g, '').replace(',', '.'));
    let seen = 0;
    for (const ex of samples(schlussrechnungSkill, 2)) {
      if (ex.visual?.type !== 'table' || ex.answer.kind === 'choice') continue;
      const rows = ex.visual.rows;
      const [a, total] = [number(rows[0][0]), number(rows[0][1])];
      if (ex.key.includes(':tabelle:') && ex.answer.kind === 'multi') {
        seen++;
        const [one, target] = ex.answer.fields;
        expect(one.value, ex.key).toBeCloseTo(total / a, 6);
        expect(target.value, ex.key).toBeCloseTo((total / a) * number(rows[2][0]), 6);
      } else if (ex.key.includes(':ziel:') && ex.answer.kind === 'number') {
        seen++;
        expect(ex.answer.value!, ex.key).toBeCloseTo((total / a) * number(rows[1][0]), 6);
      } else if (ex.key.includes(':menge:') && ex.answer.kind === 'number') {
        seen++;
        expect(ex.answer.value!, ex.key).toBeCloseTo(number(rows[1][1]) / (total / a), 6);
      }
    }
    expect(seen).toBeGreaterThan(200);
  });

  it('one person is "1 Person" in every text', () => {
    let seen = 0;
    for (const stufe of STUFEN) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of atAb(stufe, ab, 400)) {
          if (ex.key.includes(':mehl:') && ex.key.includes(':tabelle:')) {
            seen++;
            expect(allText(ex), ex.key).toContain('1 Person');
          }
          expect(allText(ex), ex.key).not.toMatch(/\b1[\s\u00A0]Personen/);
        }
      }
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('Stufe 2: the fields of a table fit a phone', () => {
    for (const ab of [1, 2, 3] as Ab[]) atAb(2, ab).forEach(assertFitsPhone);
  });

  it('Stufe 3 at AB II: nothing of Stufe 2 comes back: no table, the check comes first, harder numbers', () => {
    let fitting = 0;
    for (const ex of atAb(3, 2)) {
      expect(ex.key, ex.key).not.toContain(':ziel:');
      expect(ex.visual, ex.key).toBeUndefined();
      expect(ex.hints[0], ex.key).toMatch(/Situation/);
      if (!ex.key.includes(':passt-rechnen:')) continue;
      fitting++;
      expect(Number(ex.key.split(':')[4]), ex.key).toBeGreaterThanOrEqual(6);
    }
    expect(fitting).toBeGreaterThan(200);
  });

  it('Stufe 3 at AB II: no story of Stufe 2 comes back, and a story that fits needs the check', () => {
    const text = (ex: ReturnType<typeof atAb>[number]) => `${ex.context ?? ''} ${ex.prompt}`;
    const lower = new Set(([1, 2, 3] as Ab[]).flatMap((ab) => atAb(2, ab, 1500).map(text)));
    let fitting = 0;
    for (const ex of atAb(3, 2, 1500)) {
      expect(lower.has(text(ex)), text(ex)).toBe(false);
      if (!ex.key.includes(':passt-rechnen:')) continue;
      fitting++;
      expect(text(ex), ex.key).toMatch(/nacheinander/);
      expect(ex.hints.join(' '), ex.key).toMatch(/Doppelte Menge/);
      expect(ex.bugs?.some((b) => b.id === 'immer-proportional'), ex.key).toBe(true);
    }
    expect(fitting).toBeGreaterThan(300);
    // A story with 'zusammen' or 'gleich' keeps its value; only 'nacheinander' grows.
    for (const ex of atAb(3, 2, 800)) if (ex.key.includes(':gleich:')) expect(text(ex), ex.key).not.toMatch(/nacheinander/);
  });

  it('prices fit the noun in every form: pens, Hefte, apples', () => {
    let packs = 0;
    let howMany = 0;
    let apples = 0;
    for (const ex of atAb(1, 3, 1500)) {
      if (ex.key.includes(':angebot:') && ex.visual?.type === 'table') {
        packs++;
        for (const row of ex.visual.rows) {
          const perPen = Number(row[2].replace(/[^\d,]/g, '').replace(',', '.')) / Number(row[1]);
          expect(perPen, ex.key).toBeLessThanOrEqual(2);
          expect(perPen, ex.key).toBeGreaterThanOrEqual(0.5);
        }
      }
      if (ex.key.includes(':wie-viele:')) {
        howMany++;
        const price = Number(ex.key.split(':')[4]);
        const low = /Heft/.test(ex.key) ? 75 : 50;
        const top = /Heft/.test(ex.key) ? 200 : /Stift/.test(ex.key) ? 150 : 100;
        expect(price, ex.key).toBeGreaterThanOrEqual(low);
        expect(price, ex.key).toBeLessThanOrEqual(top);
      }
    }
    for (const ex of atAb(2, 1, 1500)) {
      if (!ex.key.includes(':aepfel:')) continue;
      apples++;
      expect(Number(ex.key.split(':').pop()), ex.key).toBeLessThanOrEqual(500);
    }
    expect(packs).toBeGreaterThan(300);
    expect(howMany).toBeGreaterThan(300);
    expect(apples).toBeGreaterThan(100);
    for (const ex of atAb(3, 3, 800)) {
      if (!ex.key.includes(':geschichte:')) continue;
      expect(Number(ex.key.split(':')[4]), ex.key).toBeLessThanOrEqual(300);
    }
  });

  it('Stufe 1: a price or a size fits the noun', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of atAb(1, ab)) {
        if (ex.answer.kind !== 'number' || ex.answer.value === null) continue;
        const v = ex.answer.value;
        if (/Brötchen/.test(ex.prompt)) expect(v, ex.key).toBeLessThanOrEqual(1);
        if (/Heft|Stift/.test(ex.prompt)) {
          expect(v, ex.key).toBeLessThanOrEqual(3);
          expect(v, ex.key).toBeGreaterThanOrEqual(0.5);
        }
        expect(ex.prompt, ex.key).not.toMatch(/Flasche/);
      }
    }
  });

  it('the typical additive answer is recognised', () => {
    const bugs = samples(schlussrechnungSkill, 2).flatMap((ex) => ex.bugs ?? []);
    expect(bugs.some((b) => b.id === 'dreisatz-addiert')).toBe(true);
  });

  it('Stufe 3: a story without proportion keeps its value, and the proportional answer gets the hint', () => {
    let seen = 0;
    for (const ex of samples(schlussrechnungSkill, 3)) {
      if (!ex.key.includes(':gleich:') || ex.answer.kind !== 'number') continue;
      seen++;
      const [, , v, n] = ex.key.split(':').slice(2);
      expect(ex.answer.value, ex.key).toBe(Number(v));
      expect(ex.bugs?.some((b) => b.id === 'immer-proportional' && b.match === Number(v) * Number(n)), ex.key).toBe(true);
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('Stufe 3: the price with a fixed part is not twice the price', () => {
    let seen = 0;
    for (const ex of samples(schlussrechnungSkill, 3)) {
      if (!ex.key.includes('grundpreis') || ex.answer.kind !== 'number' || ex.visual?.type !== 'table') continue;
      seen++;
      const given = Number(ex.visual.rows[0][1].replace(/[^\d]/g, ''));
      expect(ex.answer.value, ex.key).toBeLessThan(2 * given);
      expect(ex.bugs?.some((b) => b.id === 'immer-proportional' && b.match === 2 * given), ex.key).toBe(true);
    }
    expect(seen).toBeGreaterThan(5);
  });
});
