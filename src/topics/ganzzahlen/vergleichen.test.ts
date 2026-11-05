import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { fmt } from '../../core/format';
import { answerValue, calculatingLines, checkAll, correctLabel, fachwortWithoutGloss, items, labelOverlaps } from './checks';
import { VORZEICHEN_GLOSS } from './helpers';
import { vergleichenSkill } from './vergleichen';

describeSkill(vergleichenSkill);

const parse = (t: string) => Number(t.replace('−', '-').replace(/[^\d-]/g, ''));

describe('ganzzahlen.vergleichen', () => {
  it('worked steps add up and state the result', () => checkAll(vergleichenSkill));

  it('Stufe 1 compares a negative with a positive number; Stufe 2 two negatives', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex, form, num } of items(vergleichenSkill, 1, ab)) {
        expect(form).toBe('zeichen');
        const [a, b] = num;
        expect(Math.min(a, b)).toBeLessThan(0);
        expect(Math.max(a, b)).toBeGreaterThanOrEqual(0);
        expect(correctLabel(ex)).toBe(a < b ? '<' : '>');
      }
    }
    for (const { ex, form, num } of items(vergleichenSkill, 2, 1)) {
      expect(form).toBe('zeichen');
      const [a, b] = num;
      expect(Math.max(a, b)).toBeLessThan(0);
      expect(a).not.toBe(b);
      expect(correctLabel(ex)).toBe(a < b ? '<' : '>');
    }
    for (const { ex, form, num } of items(vergleichenSkill, 2, 2)) {
      if (form === 'zeichen') {
        expect(Math.max(num[0], num[1])).toBeLessThan(0);
        expect(correctLabel(ex)).toBe(num[0] < num[1] ? '<' : '>');
      } else {
        expect(parse(correctLabel(ex))).toBe(Math.min(num[0], num[1]));
      }
    }
    for (const { ex, form, num, p } of items(vergleichenSkill, 2, 3)) {
      if (form === 'zwischen') expect(answerValue(ex)).toBe(num[0]);
      else expect(answerValue(ex)).toBe(p[1] === 'r' ? num[0] + 1 : num[0] - 1);
    }
  });

  it('Stufe 3 orders five numbers by their value, not their Betrag', () => {
    for (const ab of [1, 2] as const) {
      for (const { ex } of items(vergleichenSkill, 3, ab)) {
        if (ex.answer.kind !== 'order') throw new Error('order');
        const { items: shown, correct, direction } = ex.answer;
        expect(shown).toHaveLength(5);
        const inOrder = correct.map((i) => parse(shown[i]));
        const wanted = [...inOrder].sort((x, y) => (direction === 'aufsteigend' ? x - y : y - x));
        expect(inOrder).toEqual(wanted);
        expect(new Set(inOrder).size).toBe(5);
        expect(ex.bugs?.some((b) => b.id === 'betrag-groesser')).toBe(true);
      }
    }
  });

  it('a sign item is read aloud without raw signs, also in the words of the prompt', () => {
    for (const stufe of [1, 2] as const) {
      for (const { ex, form } of items(vergleichenSkill, stufe, 1)) {
        expect(form).toBe('zeichen');
        expect(ex.prompt, ex.key).not.toMatch(/[<>]/);
        expect(ex.srText, ex.key).toContain('kleiner als oder größer als');
      }
    }
    for (const { ex } of items(vergleichenSkill, 3, 3)) {
      for (const h of ex.hints) expect(h, ex.key).not.toMatch(/ [<>] /);
    }
  });

  it('a temperature to compare stays believable', () => {
    for (const { ex, p, num } of items(vergleichenSkill, 1, 2, 800)) {
      if (p[2] === 'grad') expect(Math.max(Math.abs(num[0]), Math.abs(num[1])), ex.key).toBeLessThanOrEqual(30);
    }
  });

  it('the marks of a worked step stay apart, also for two close numbers on a wide scale', () => {
    const close = items(vergleichenSkill, 2, 2, 600).filter(({ form, num }) => form === 'zeichen' && Math.abs(num[0] - num[1]) < 10);
    expect(close.length).toBeGreaterThan(0);
    for (const { ex } of close) expect(labelOverlaps(ex)).toEqual([]);
  });

  it('AB III of Stufe 3: the counterexample breaks the claim, the other pairs keep it', () => {
    for (const { ex, form } of items(vergleichenSkill, 3, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      if (form === 'gegenbeispiel') {
        ex.answer.options.forEach((o, i) => {
          const [x, y] = o.label.split(' und ').map(parse);
          const bigger = Math.abs(x) > Math.abs(y) ? x : y;
          const other = bigger === x ? y : x;
          expect(bigger < other, o.label).toBe(i === (ex.answer as { correct: number }).correct);
        });
      } else {
        expect(form).toBe('reihe');
        const values = correctLabel(ex).split(' < ').map(parse);
        expect(values).toEqual([...values].sort((x, y) => x - y));
        expect(correctLabel(ex)).toBe(values.map((v) => fmt(v)).join(' < '));
      }
    }
  });

  it('no line calculates with signs under integersAsStates (§2.5)', () => expect(calculatingLines(vergleichenSkill)).toEqual([]));

  it('T11: this core skill glosses Vorzeichen where it uses the word, and the check notices a word without a gloss', () => {
    const used = items(vergleichenSkill, 1, 2, 300).flatMap(({ ex }) => ex.hints).filter((h) => h.includes('Vorzeichen'));
    expect(used.length).toBeGreaterThan(0);
    for (const h of used) expect(h).toContain(VORZEICHEN_GLOSS);
    const { ex } = items(vergleichenSkill, 1, 1, 1)[0];
    expect(fachwortWithoutGloss(vergleichenSkill, { ...ex, praise: 'Du hast das Vorzeichen geprüft.' })).toHaveLength(1);
    expect(fachwortWithoutGloss(vergleichenSkill, { ...ex, praise: 'Du nutzt die Gegenzahl.' })).toHaveLength(1);
  });
});
