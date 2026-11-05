import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import { STUFEN, type Ab } from '../../core/types';
import { CTX, samples } from '../test-utils';
import { massstabSkill } from './massstab';
import { assertSteps } from './testkit';

describeSkill(massstabSkill);

/** The numbers of a task in their order, groups and comma read. */
const numbers = (text: string) => [...text.matchAll(/\d[\d ]*(?:,\d+)?/g)].map((m) => Number(m[0].replace(/ /g, '').replace(',', '.')));

describe('groessen.massstab specifics', () => {
  it('the steps are right and end with the result', () => {
    for (const stufe of STUFEN) for (const ex of samples(massstabSkill, stufe)) assertSteps(ex);
  });

  it('Stufe 1: 1 : 100 gives as many metres as the plan has centimetres', () => {
    for (const ex of samples(massstabSkill, 1)) {
      expect(ex.context, ex.key).toContain('1 : 100');
      if (ex.answer.kind !== 'number') continue;
      const [, , cm] = numbers(ex.context!);
      expect(ex.answer.value, ex.key).toBeCloseTo(cm, 6);
      expect(ex.answer.unit).toBe('m');
    }
  });

  it('Stufe 2: plan and reality fit the Maßstab, recomputed in cm', () => {
    let seen = 0;
    for (const ex of samples(massstabSkill, 2)) {
      if (ex.answer.kind !== 'number' || ex.answer.value === null) continue;
      seen++;
      const ns = numbers(ex.context!);
      if (ex.key.includes(':karte:')) {
        const [, s, cm] = ns;
        expect(ex.answer.value * 100_000, ex.key).toBeCloseTo(cm * s, 4);
      } else if (ex.key.includes(':zurueck:')) {
        const [km, , s] = ns;
        expect(ex.answer.value * s, ex.key).toBeCloseTo(km * 100_000, 4);
      } else {
        const [m, , s] = ns;
        expect(ex.answer.value * s, ex.key).toBeCloseTo(m * 100, 4);
      }
    }
    expect(seen).toBeGreaterThan(200);
  });

  it('Stufe 3: an enlargement makes the picture larger than reality', () => {
    let seen = 0;
    for (const ex of samples(massstabSkill, 3)) {
      if (!ex.key.includes('vergroessert') || ex.answer.kind !== 'number') continue;
      seen++;
      const [f, , given] = numbers(ex.context!);
      // the real length stands in mm, the picture in cm
      expect(ex.answer.value, ex.key).toBeCloseTo(/auf dem Poster lang/.test(ex.prompt) ? (given * f) / 10 : (given * 10) / f, 6);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('Stufe 3 is harder than Stufe 2 at every AB: enlargements change the unit and have two steps', () => {
    for (const ab of [2, 3] as Ab[]) {
      let seen = 0;
      for (let i = 0; i < 800; i++) {
        const ex = massstabSkill.generate(createRng(i * 59 + ab), 3, { ...CTX, ab });
        if (!/vergroessert|bild-finden/.test(ex.key)) continue;
        seen++;
        expect(ex.steps.length, ex.key).toBeGreaterThanOrEqual(2);
        expect(`${ex.context} ${ex.prompt}`, ex.key).toMatch(/mm/);
        expect(`${ex.context} ${ex.prompt}`, ex.key).toMatch(/cm/);
        if (ab === 2 && ex.answer.kind === 'number') expect(ex.bugs?.some((b) => b.id === 'massstab-einheit'), ex.key).toBe(true);
      }
      expect(seen, `AB ${ab}`).toBeGreaterThan(200);
    }
  });

  const everyItem = () => STUFEN.flatMap((stufe) => ([1, 2, 3] as Ab[]).flatMap((ab) => Array.from({ length: 500 }, (_, i) => massstabSkill.generate(createRng(i * 59 + ab), stufe, { ...CTX, ab }))));

  it('a real length fits its thing', () => {
    const range: Record<string, [number, number]> = { Wand: [3, 9], Flur: [4, 12], Garten: [8, 30], Terrasse: [3, 8], Klassenraum: [7, 11], Schulhof: [30, 90] };
    const seen = new Set<string>();
    for (const ex of everyItem()) {
      const text = `${ex.context ?? ''} ${ex.prompt}`;
      const thing = /(Wand|Flur|Garten|Terrasse|Klassenraum|Schulhof)/.exec(text)?.[1];
      if (!thing) continue;
      seen.add(thing);
      const told = /in Wirklichkeit ist \S+ \S+ ([\d,]+)\u00A0m lang|in Wirklichkeit ([\d,]+)\u00A0m lang/i.exec(text);
      const asked = ex.answer.kind === 'number' && ex.answer.unit === 'm' ? ex.answer.value : null;
      const m = told ? Number((told[1] ?? told[2]).replace(',', '.')) : asked;
      if (m === null) continue;
      expect(m, `${ex.key}: ${text}`).toBeGreaterThanOrEqual(range[thing][0]);
      expect(m, `${ex.key}: ${text}`).toBeLessThanOrEqual(range[thing][1]);
    }
    expect(seen.size).toBe(6);
  });

  it('a Wanderweg has at least 1 km, an animal its own size, a poster at most 40 cm', () => {
    const size: Record<string, [number, number]> = { Ameise: [4, 8], Biene: [12, 15], Mücke: [4, 8], Fliege: [6, 9], Spinne: [6, 12] };
    let animals = 0;
    for (const ex of everyItem()) {
      const way = /Wanderweg ist ([\d,]+)\u00A0km/.exec(ex.context ?? '');
      if (way) expect(Number(way[1].replace(',', '.')), ex.key).toBeGreaterThanOrEqual(1);
      const animal = /(Ameise|Biene|Mücke|Fliege|Spinne)/.exec(ex.context ?? '')?.[1];
      if (!animal) continue;
      animals++;
      const f = ex.key.split(':');
      const mm = Number(f[5]);
      expect(mm, ex.key).toBeGreaterThanOrEqual(size[animal][0]);
      expect(mm, ex.key).toBeLessThanOrEqual(size[animal][1]);
      expect(mm * Number(f[4]), ex.key).toBeLessThanOrEqual(400);
    }
    expect(animals).toBeGreaterThan(100);
  });

  it('no text points at a picture that is not there', () => {
    for (const ex of everyItem()) {
      if (ex.visual) continue;
      const shown = JSON.stringify([ex.context, ex.prompt, ex.srText, ex.hints, ex.steps, ex.praise, ex.bugs?.map((b) => b.hint)]);
      expect(shown, ex.key).not.toMatch(/\bBild\b/);
    }
  });

  it('the voice says a Maßstab with "zu", never as a division', () => {
    for (const stufe of STUFEN) {
      for (const ex of samples(massstabSkill, stufe)) expect(ex.srText, ex.key).not.toMatch(/geteilt durch/);
    }
  });
});
