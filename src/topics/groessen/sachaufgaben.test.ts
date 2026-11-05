import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import { STUFEN, type Ab } from '../../core/types';
import { CTX, cents, samples, times } from '../test-utils';
import { sachaufgabenSkill } from './sachaufgaben';
import { assertSteps } from './testkit';

describeSkill(sachaufgabenSkill);

const atAb = (stufe: 1 | 2 | 3, ab: Ab, n = 1500) => Array.from({ length: n }, (_, i) => sachaufgabenSkill.generate(createRng(i * 37 + ab), stufe, { ...CTX, ab }));

describe('groessen.sachaufgaben specifics', () => {
  it('the steps are right and end with the result', () => {
    for (const stufe of STUFEN) for (const ex of samples(sachaufgabenSkill, stufe)) assertSteps(ex);
  });

  it('Stufe 1 has an Antwortsatz in every item', () => {
    for (const ex of samples(sachaufgabenSkill, 1)) {
      expect(ex.answer.kind, ex.key).toBe('number');
      if (ex.answer.kind === 'number') expect(ex.answer.before, ex.key).toBeTruthy();
    }
  });

  it('Stufe 2 reads from a table in every item', () => {
    for (const ex of samples(sachaufgabenSkill, 2)) expect(ex.visual?.type, ex.key).toBe('table');
  });

  it('a Fahrplan ride is the difference of the two times in the table', () => {
    let seen = 0;
    for (const ex of samples(sachaufgabenSkill, 2)) {
      if (!ex.key.includes('fahrplan') || ex.answer.kind !== 'number') continue;
      seen++;
      const [start, end] = times(ex.steps[0] as string);
      expect(ex.answer.value, ex.key).toBe(end - start);
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('the latest bus arrives on time, and the next one does not', () => {
    let seen = 0;
    for (const ex of samples(sachaufgabenSkill, 2)) {
      if (!ex.key.includes('spaetestens') || ex.answer.kind !== 'choice' || ex.visual?.type !== 'table') continue;
      seen++;
      const target = times(ex.context!)[0];
      const arrivals = ex.visual.rows[3].slice(1).map((t) => {
        const [h, m] = t.split('.').map(Number);
        return h * 60 + m;
      });
      const right = ex.answer.correct;
      expect(arrivals[right], ex.key).toBeLessThanOrEqual(target);
      expect(arrivals[right + 1], ex.key).toBeGreaterThan(target);
    }
    expect(seen).toBeGreaterThan(5);
  });

  it('the latest bus: the task itself asks for the latest one, so one option fits', () => {
    let seen = 0;
    for (const ex of atAb(2, 3)) {
      if (!ex.key.includes('spaetestens') || ex.answer.kind !== 'choice') continue;
      seen++;
      expect(`${ex.context} ${ex.prompt}`, ex.key).toMatch(/spätestens.*möglichst spät/);
      expect(ex.srText, ex.key).toMatch(/möglichst spät/);
      expect(ex.prompt, ex.key).not.toMatch(/am besten/);
    }
    expect(seen).toBeGreaterThan(300);
  });

  it('a ride of 60 minutes keeps the bug of the hour with 100 minutes', () => {
    let seen = 0;
    for (const ex of atAb(3, 2, 6000)) {
      if (!ex.key.includes(':offen-zug:false:') || ex.answer.kind !== 'number' || ex.answer.value !== 60) continue;
      seen++;
      expect(ex.bugs?.some((b) => b.id === 'zeit-hundert'), ex.key).toBe(true);
    }
    expect(seen).toBeGreaterThan(5);
  });

  it('a price fits its thing', () => {
    const range: Record<string, [number, number]> = { Heft: [80, 250], Buch: [600, 1800], Stift: [60, 300], Block: [120, 350], Lineal: [80, 250], Saft: [90, 220] };
    const check = (key: string, thing: string, price: number) => {
      expect(price, `${key}: ${thing}`).toBeGreaterThanOrEqual(range[thing][0]);
      expect(price, `${key}: ${thing}`).toBeLessThanOrEqual(range[thing][1]);
    };
    let bought = 0;
    let backwards = 0;
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(1, ab)) {
        const text = ex.context ?? '';
        for (const [, thing, price] of text.matchAll(/(?:ein|einen) (Heft|Buch|Stift|Block|Lineal|Saft) für (\d+,\d{2})/g)) {
          bought++;
          check(ex.key, thing, cents(price + '\u00A0€'));
        }
        const paid = /bezahlt (?:ein|einen) (Heft|Buch|Stift|Block|Lineal|Saft) mit/.exec(text);
        if (paid && ex.answer.kind === 'number') {
          backwards++;
          check(ex.key, paid[1], Math.round(ex.answer.value! * 100));
        }
      }
    }
    expect(bought).toBeGreaterThan(500);
    expect(backwards).toBeGreaterThan(500);
  });

  it('money shown only as a picture is listed for the screen reader', () => {
    let seen = 0;
    for (const ex of atAb(1, 2)) {
      if (ex.visual?.type !== 'money') continue;
      seen++;
      const pieces = [...ex.srText.matchAll(/(\d+) (?:Münzen?|Scheine?) zu (\d+) (Euro|Cent)/g)];
      expect(pieces.reduce((sum, m) => sum + Number(m[1]) * Number(m[2]) * (m[3] === 'Euro' ? 100 : 1), 0), ex.key).toBe(ex.visual.items.reduce((sum, c) => sum + c, 0));
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('a Preisliste and a Fahrplan are in the screen-reader text with all their data', () => {
    const said = { list: 0, plan: 0 };
    for (const ex of [...atAb(2, 1, 300), ...atAb(2, 2, 300), ...atAb(2, 3, 600)]) {
      if (ex.visual?.type !== 'table') continue;
      if (ex.visual.caption === 'Preisliste') {
        said.list++;
        expect(ex.srText, ex.key).toMatch(/^Preisliste:/);
        for (const [good] of ex.visual.rows) expect(ex.srText, ex.key).toContain(good);
        for (const [, price] of ex.visual.rows) {
          const c = cents(price);
          expect(ex.srText, `${ex.key}: ${price} in ${ex.srText}`).toContain(c < 100 ? `${c} Cent` : `${Math.floor(c / 100)} Euro`);
        }
      } else {
        said.plan++;
        expect(ex.srText, ex.key).toMatch(/^Fahrplan\./);
        for (const row of ex.visual.rows) {
          expect(ex.srText, ex.key).toContain(`${row[0]}:`);
          for (const t of row.slice(1)) expect(ex.srText, `${ex.key}: ${t}`).toContain(`um ${t} Uhr`);
        }
      }
    }
    expect(said.list).toBeGreaterThan(300);
    expect(said.plan).toBeGreaterThan(300);
  });

  it('a bus ride always goes over the full hour, as its hints and praise say', () => {
    let seen = 0;
    for (const ex of atAb(1, 2)) {
      if (!ex.key.includes(':bus:')) continue;
      seen++;
      const [start, end] = times(ex.context!);
      expect(end, ex.key).toBeGreaterThan(Math.ceil(start / 60) * 60);
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('a Fahrplan has stop names short enough for three buses on a 375 px phone', () => {
    for (const ex of atAb(2, 3, 300)) {
      if (ex.visual?.type !== 'table' || !ex.key.includes('spaetestens')) continue;
      for (const row of ex.visual.rows) expect(row[0].length, ex.key).toBeLessThanOrEqual(6);
    }
  });

  it('a plausibility verdict names the number it is about, not the right result', () => {
    let seen = 0;
    for (const ex of atAb(3, 3, 400)) {
      if (!ex.key.includes(':plausibel:')) continue;
      seen++;
      const last = String(ex.steps[ex.steps.length - 1]);
      const said = /schreibt (\S+\s\S+)\./.exec(last)?.[1];
      expect(said, `${ex.key}: ${last}`).toBeTruthy();
      expect(ex.context, ex.key).toContain(said);
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('"Nicht lösbar": offered in solvable tasks too, and only then with a value', () => {
    const offered = samples(sachaufgabenSkill, 3).flatMap((ex) => (ex.answer.kind === 'number' && ex.answer.offerUnsolvable ? [ex.answer.value] : []));
    expect(offered.some((v) => v === null)).toBe(true);
    expect(offered.some((v) => v !== null)).toBe(true);
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(sachaufgabenSkill, stufe)) if (ex.answer.kind === 'number') expect(ex.answer.offerUnsolvable, ex.key).toBeUndefined();
    }
  });

  it('extra information: the sum of every number is a known mistake', () => {
    const extra = samples(sachaufgabenSkill, 3).filter((ex) => ex.key.includes(':extra-'));
    expect(extra.length).toBeGreaterThan(10);
    expect(extra.some((ex) => ex.bugs?.some((b) => b.id === 'alle-zahlen'))).toBe(true);
  });

  it('every number field offers the comma', () => {
    for (const stufe of STUFEN) {
      for (const ex of samples(sachaufgabenSkill, stufe)) if (ex.answer.kind === 'number') expect(ex.answer.decimals, ex.key).toBeGreaterThan(0);
    }
  });
});
