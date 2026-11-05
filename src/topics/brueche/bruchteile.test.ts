import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { bruchteileSkill } from './bruchteile';
import { everyItem, fractionsIn, items, sameTaskTwoKeys } from './test-helpers';

describeSkill(bruchteileSkill);

const valueOf = (ex: { answer: unknown }) => (ex.answer as { value: number }).value;
const numberAfter = (expr: string) => Number(/von ([\d ]+) /.exec(expr)![1].replace(/ /g, ''));

describe('brueche.bruchteile specifics', () => {
  it('worked steps calculate correctly', () => {
    for (const ex of everyItem(bruchteileSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('Stufe 1 is a Stammbruch, and the value is whole : Nenner', () => {
    for (const ex of items(bruchteileSkill, 1, 1)) {
      const [[n, d]] = fractionsIn(ex.expression!);
      expect(n).toBe(1);
      expect(valueOf(ex)).toBe(numberAfter(ex.expression!) / d);
    }
  });

  it('Stufe 2 is any fraction, with a unit change at AB II', () => {
    for (const ex of items(bruchteileSkill, 2, 1)) {
      const [[n, d]] = fractionsIn(ex.expression!);
      expect(n).toBeGreaterThan(1);
      expect(valueOf(ex)).toBe((numberAfter(ex.expression!) * n) / d);
    }
    const per: Record<string, number> = { h: 60, kg: 1000, km: 1000, l: 1000, m: 100, '€': 100 };
    for (const ex of items(bruchteileSkill, 2, 2)) {
      const [[n, d]] = fractionsIn(ex.expression!);
      const unit = /von \d+ (\S+) =/.exec(ex.expression!)![1];
      expect(valueOf(ex)).toBe((numberAfter(ex.expression!) * per[unit] * n) / d);
    }
  });

  it('Stufe 3 goes back to the whole: the part of the answer is the amount in the story', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(bruchteileSkill, 3, ab)) {
        const story = ex.context!;
        const [[n, d]] = fractionsIn(story);
        const amount = Number([...story.replace(/\{frac:[^}]*\}/g, '').matchAll(/\d+/g)].pop()![0]);
        expect((valueOf(ex) * n) / d).toBe(amount);
      }
    }
  });

  it('the whole is larger than the part, at every AB of Stufe 3', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(bruchteileSkill, 3, ab)) {
        const amount = Number([...ex.context!.replace(/\{frac:[^}]*\}/g, '').matchAll(/\d+/g)].pop()![0]);
        expect(valueOf(ex)).toBeGreaterThan(amount);
      }
    }
  });

  it('no comma key: every answer is a whole number and no bug needs a comma', () => {
    expect(bruchteileSkill.keys).toBeUndefined();
    for (const ex of everyItem(bruchteileSkill)) {
      expect(Number.isInteger(valueOf(ex))).toBe(true);
      for (const b of ex.bugs ?? []) expect(Number.isInteger(b.match)).toBe(true);
    }
  });

  it('a story holds a quantity that fits it', () => {
    const inRange = (text: string, re: RegExp, min: number, max: number) => {
      const m = re.exec(text);
      if (!m) return 0;
      expect(Number(m[1]), text).toBeGreaterThanOrEqual(min);
      expect(Number(m[1]), text).toBeLessThanOrEqual(max);
      return 1;
    };
    let classes = 0;
    let hikes = 0;
    for (const ex of items(bruchteileSkill, 1, 2, 400)) {
      classes += inRange(ex.context!, /In der Klasse sind (\d+) Kinder/, 15, 32);
      hikes += inRange(ex.context!, /Die Wanderung ist (\d+)\s*km/, 4, 25);
    }
    expect(classes).toBeGreaterThan(0);
    expect(hikes).toBeGreaterThan(0);
    for (const ex of items(bruchteileSkill, 1, 3, 400)) inRange(ex.context!, /Auf dem Blech liegen (\d+) Kekse/, 12, 48);
    for (const ex of items(bruchteileSkill, 3, 3, 400)) {
      if (!ex.context!.includes('der Strecke')) continue;
      expect(valueOf(ex), ex.context).toBeLessThanOrEqual(60);
    }
  });

  it('every spoken story says ½ as die Hälfte', () => {
    for (const ex of everyItem(bruchteileSkill)) expect(ex.srText, ex.key).not.toMatch(/ein Halb (der|des|davon|von)\b/);
    for (const ex of items(bruchteileSkill, 1, 2, 300)) expect(ex.context, ex.key).not.toMatch(/^Nach|\. Nach /);
  });

  it('a task that looks the same has one key, so a round never shows it twice', () => {
    expect(sameTaskTwoKeys(bruchteileSkill)).toEqual([]);
  });

  it('the bus is in the story, and the ride and the walk fit a way to school', () => {
    let ways = 0;
    for (const ex of items(bruchteileSkill, 2, 3, 400)) {
      if (!ex.context!.includes('Schulweg')) continue;
      ways++;
      expect(ex.context, ex.key).toContain('mit dem Bus');
      const big = Number(/ist (\d+)\s*km/.exec(ex.context!)![1]);
      const walk = valueOf(ex);
      expect(big * 1000 - walk, ex.context).toBeGreaterThanOrEqual(1000);
      expect(walk, ex.context).toBeLessThanOrEqual(2000);
    }
    expect(ways).toBeGreaterThan(0);
  });

  it('verb and number agree with a fraction or an amount of 1', () => {
    const texts = (ex: Exercise) => [ex.context ?? '', ex.prompt, ex.praise, ...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))];
    for (const ex of everyItem(bruchteileSkill, 300)) {
      for (const text of texts(ex)) {
        expect(text, ex.key).not.toMatch(/stehen 1\s*kg|Es fehlen \{frac:1\/|liegt \{frac:[2-9]|liegen \{frac:1\/|\{frac:1\/\d+\} der Kinder im Verein spielen|\{frac:[2-9]\/\d+\} der Kinder im Verein spielt|ein Teil und/);
      }
    }
  });
});
