import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise } from '../../core/types';
import { CTX, samples } from '../test-utils';
import { schaetzenSkill } from './schaetzen';
import { assertSteps } from './testkit';

describeSkill(schaetzenSkill, { minDistinct: { 1: 30, 2: 30, 3: 25 } });

const atAb = (stufe: 1 | 2 | 3, ab: Ab, n = 800): Exercise[] => Array.from({ length: n }, (_, i) => schaetzenSkill.generate(createRng(i * 31 + ab), stufe, { ...CTX, ab }));

const SIZE: Record<string, number> = { mm: 1, cm: 10, m: 1000, km: 1e6, g: 1, kg: 1000, t: 1e6, s: 1, min: 60, h: 3600, ml: 1, l: 1000 };

/** The first quantity of a text in base units. */
function quantityOf(text: string): number {
  const m = /([\d]+)\s(mm|cm|km|kg|min|ml|m|g|t|s|h|l)(?![\p{L}])/u.exec(text)!;
  return Number(m[1]) * SIZE[m[2]];
}

describe('groessen.schaetzen specifics', () => {
  it('no hint and no whyWrong names the correct quantity, and a value keeps its comparison', () => {
    const plain = (text: string) => text.replace(/\u00A0/g, ' ');
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of atAb(stufe, ab, 1500)) {
          if (ex.answer.kind !== 'choice') continue;
          const label = plain(ex.answer.options[ex.answer.correct].label);
          if (!/^\d/.test(label) || plain(`${ex.context ?? ''} ${ex.prompt}`).includes(label)) continue;
          const stated = new RegExp(`(?<![\\d,])${label}(?![\\p{L}\\d])`, 'u');
          for (const text of [...ex.hints, ...ex.answer.options.flatMap((o) => o.whyWrong ?? [])]) expect(plain(text), `${ex.key}: ${text}`).not.toMatch(stated);
          if (stufe === 2 && ab === 1) expect(ex.hints[1], ex.key).toMatch(/^Vergleiche: /);
        }
      }
    }
  });

  it('a claim is compared with something else than the right value', () => {
    for (const ex of atAb(2, 3, 1500)) {
      if (ex.answer.kind !== 'choice' || !ex.key.includes('Flasche')) continue;
      for (const o of ex.answer.options) expect(o.whyWrong ?? '', ex.key).not.toMatch(/\b1\skg/);
    }
  });

  it('Stufe 1: the correct option is a unit, and the sentence with it stands in the steps', () => {
    for (const ex of samples(schaetzenSkill, 1)) {
      expect(ex.answer.kind).toBe('choice');
      if (ex.answer.kind !== 'choice') continue;
      const label = ex.answer.options[ex.answer.correct].label;
      expect(label, ex.key).toMatch(/^(mm|cm|m|km|g|kg|t|s|min|h|ml|l)$/);
      expect(ex.steps.join(' '), ex.key).toMatch(new RegExp(`\\u00A0${label}(?![\\p{L}])`, 'u'));
    }
  });

  it('Stufe 2: every other option lies far from the answer, so that the choice is not a matter of taste', () => {
    const baseOf = (label: string) => {
      const m = /^([\d ]+) ?\s?(\w+)$/u.exec(label)!;
      const size: Record<string, number> = { mm: 1, cm: 10, m: 1000, km: 1e6, g: 1, kg: 1000, t: 1e6, s: 1, min: 60, h: 3600, ml: 1, l: 1000 };
      return Number(m[1].replace(/ /g, '')) * size[m[2]];
    };
    let seen = 0;
    for (const ex of samples(schaetzenSkill, 2)) {
      if (ex.answer.kind !== 'choice' || !/\d/.test(ex.answer.options[0].label)) continue;
      seen++;
      const right = baseOf(ex.answer.options[ex.answer.correct].label);
      for (const o of ex.answer.options) {
        if (o === ex.answer.options[ex.answer.correct]) continue;
        const ratio = baseOf(o.label) / right;
        expect(ratio >= 5 || ratio <= 1 / 5, `${ex.key}: ${o.label}`).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('Stufe 3: the tolerance fits the size, and the steps are right', () => {
    for (const ex of samples(schaetzenSkill, 3)) {
      assertSteps(ex);
      if (ex.answer.kind !== 'number' || ex.answer.value === null) continue;
      expect(ex.answer.tolerance, ex.key).toBe(ex.key.includes(':tropfen:') ? 1 : Math.floor(ex.answer.value / 10));
    }
  });

  it('Stufe 3: an estimate is off by at most a tenth, 0 is never right, and a wrong method stays outside', () => {
    let added = 0;
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(3, ab)) {
        const a = ex.answer;
        if (a.kind !== 'number' || a.value === null) continue;
        if (!ex.key.includes(':tropfen:')) expect(a.tolerance, ex.key).toBeLessThanOrEqual(a.value / 10);
        expect(checkAnswer(a, { kind: 'number', text: '0' }).correct, ex.key).toBe(false);
        if (ex.key.includes(':haus:')) {
          added++;
          expect(ex.bugs?.some((b) => b.id === 'schaetzen-addiert'), ex.key).toBe(true);
        }
      }
    }
    expect(added).toBeGreaterThan(20);
  });

  it('Stufe 1 without a number: the question names what is measured, and no defensible unit is marked wrong', () => {
    let seen = 0;
    for (const ex of atAb(1, 2)) {
      if (ex.answer.kind !== 'choice') continue;
      seen++;
      expect(ex.prompt, ex.key).not.toMatch(/Länge eines Kinofilms|Länge einer Schulstunde|Länge einer Nacht/);
      if (ex.prompt.includes('Lauf')) expect(ex.prompt, ex.key).toContain('Dauer');
      if (ex.prompt.includes('Kinofilm')) expect(ex.answer.options.map((o) => o.label), ex.key).not.toContain('min');
      if (/Eimer|Teelöffel|Badewanne|Trinkglas/.test(ex.prompt)) expect(ex.answer.options.map((o) => o.label).some((l) => ['g', 'kg', 't'].includes(l)), ex.key).toBe(false);
    }
    expect(seen).toBeGreaterThan(200);
  });

  it('a reference helps: Stufe 1 the neighbouring unit, Stufe 2 a known size of about the same scale', () => {
    const order = [['mm', 'cm', 'm', 'km'], ['g', 'kg', 't'], ['s', 'min', 'h'], ['ml', 'l']];
    for (const ex of atAb(1, 1)) {
      if (ex.answer.kind !== 'choice') continue;
      const u = ex.answer.options[ex.answer.correct].label;
      const hint = ex.hints.find((h) => h.startsWith('Vergleiche'))!;
      const used = /\s(mm|cm|km|kg|min|ml|m|g|t|s|h|l)(?![\p{L}])/u.exec(hint)![1];
      const units = order.find((o) => o.includes(u))!;
      expect(Math.abs(units.indexOf(used) - units.indexOf(u)), `${ex.key}: ${hint}`).toBe(1);
    }
    let seen = 0;
    for (const ex of atAb(2, 1)) {
      if (ex.answer.kind !== 'choice') continue;
      seen++;
      const hint = ex.hints.find((h) => h.startsWith('Vergleiche'))!;
      const ratio = quantityOf(hint) / quantityOf(ex.answer.options[ex.answer.correct].label);
      expect(ratio >= 1 / 100 && ratio <= 100, `${ex.key}: ${hint}`).toBe(true);
      // never the item's own sentence as its reference
      expect(ex.steps.join(' '), ex.key).not.toContain(hint.replace('Vergleiche: ', ''));
    }
    expect(seen).toBeGreaterThan(200);
  });

  it('a judged claim: the verdict names the number it is about', () => {
    for (const ex of atAb(2, 3, 300)) {
      const last = String(ex.steps[ex.steps.length - 1]);
      expect(last, ex.key).toMatch(/sagt \d/);
    }
  });

  it('no people as a size (T12)', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(schaetzenSkill, stufe)) expect(`${ex.context ?? ''} ${ex.prompt}`, ex.key).not.toMatch(/\bKind|\bMensch|\bBruder|\bSchwester|\bGewicht von/);
    }
  });
});
