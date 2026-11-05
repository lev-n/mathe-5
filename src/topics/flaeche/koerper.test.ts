import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { koerperSkill } from './koerper';
import { allItems, correctLabel, numberOf } from './testing';

// The content is a small fixed set: six solids, their properties and the Prisma family.
describeSkill(koerperSkill, { minDistinct: { 1: 20, 2: 20, 3: 20 } });

const items = allItems(koerperSkill);
/** Euler for the solids with flat faces, as an independent check of the tables. */
const euler = (e: number, k: number, f: number) => e - k + f;

describe('flaeche.koerper: answers recomputed', () => {
  it('counted solids: the table agrees with Euler, and the visible count stays below the real one', () => {
    const facts: Record<string, Record<string, number>> = {};
    for (const ex of items) {
      const m = /:zaehlen:(\w+):(\p{L}+)/u.exec(ex.key);
      if (!m) continue;
      (facts[m[1]] ??= {})[m[2]] = numberOf(ex);
      for (const b of ex.bugs ?? []) expect(b.match as number, ex.key).toBeLessThan(numberOf(ex));
    }
    expect(Object.keys(facts).sort()).toEqual(['pyramide', 'quader', 'wuerfel']);
    for (const f of Object.values(facts)) expect(euler(f.Ecken, f.Kanten, f['Flächen'])).toBe(2);
  });

  it('a Prisma on an n-gon has 2n Ecken, 3n Kanten and n + 2 Flächen', () => {
    let seen = 0;
    for (const ex of items) {
      const m = /:prisma:(\d):(\p{L}+)/u.exec(ex.key);
      if (!m) continue;
      const n = Number(m[1]);
      expect(numberOf(ex), ex.key).toBe({ Ecken: 2 * n, Kanten: 3 * n, 'Flächen': n + 2 }[m[2]]);
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('a Prisma reversed: from Ecken to Kanten, from Flächen to the figure', () => {
    const FIGURE: Record<number, string> = { 3: 'Dreieck', 4: 'Viereck', 5: 'Fünfeck', 6: 'Sechseck', 7: 'Siebeneck', 8: 'Achteck' };
    for (const ex of items) {
      const k = /:prisma-rueck-kanten:(\d+)/.exec(ex.key);
      if (k) expect(numberOf(ex), ex.key).toBe((Number(k[1]) / 2) * 3);
      const f = /:prisma-rueck-form:(\d+)/.exec(ex.key);
      if (f) expect(correctLabel(ex), ex.key).toBe(FIGURE[Number(f[1]) - 2]);
    }
  });

  it('tape on all edges', () => {
    for (const ex of items) {
      const w = /:band-wuerfel:(\d+)/.exec(ex.key);
      if (w) expect(numberOf(ex), ex.key).toBe(12 * Number(w[1]));
      const q = /:band-quader:(\d+)-(\d+)-(\d+)/.exec(ex.key);
      if (q) expect(numberOf(ex), ex.key).toBe(4 * (Number(q[1]) + Number(q[2]) + Number(q[3])));
    }
  });

  it('a Würfel never has Quader as a wrong option', () => {
    for (const ex of items) {
      if (ex.answer.kind !== 'choice' || correctLabel(ex) !== 'Würfel') continue;
      expect(ex.answer.options.map((o) => o.label), ex.key).not.toContain('Quader');
    }
  });

  it('a wrong option is never true as well: a Würfel or Quader is also a Prisma, a Quadrat also a Rechteck', () => {
    let riddles = 0;
    let shapes = 0;
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') continue;
      const labels = ex.answer.options.map((o) => o.label);
      const right = correctLabel(ex);
      if (ex.key.includes(':steckbrief:') && (right === 'Würfel' || right === 'Quader')) {
        expect(labels, ex.key).not.toContain('Prisma');
        expect(labels.length, ex.key).toBe(4);
        riddles++;
      }
      if (ex.key.includes(':flaechenform:')) {
        if (/^Quadrat/.test(right)) {
          expect(labels.join(), ex.key).not.toMatch(/Rechteck/);
          shapes++;
        }
        expect(labels.length, ex.key).toBe(4);
      }
    }
    expect(riddles).toBeGreaterThan(0);
    expect(shapes).toBeGreaterThan(0);
  });

  it('a drawing of a Würfel is never the wrong drawing for a Quader', () => {
    for (const ex of items) {
      if (!ex.key.includes(':bild-suchen:quader') || ex.answer.kind !== 'choice') continue;
      expect(ex.answer.options.map((o) => (o.visual?.type === 'solid' ? o.visual.solid : '')), ex.key).not.toContain('wuerfel');
    }
  });

  it('the base of a Pyramide is explained by the base, not by the sides', () => {
    let seen = 0;
    for (const ex of items) {
      if (!ex.key.includes(':flaechenform:pyr-boden') || ex.answer.kind !== 'choice') continue;
      expect(ex.steps[0], ex.key).toMatch(/Boden/);
      ex.answer.options.forEach((o) => { if (o.whyWrong) expect(o.whyWrong, ex.key).toMatch(/Boden/); });
      seen++;
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('the field never gives a count away: no singular unit, whatever the answer', () => {
    let seen = 0;
    for (const ex of allItems(koerperSkill, undefined, 200)) {
      if (ex.answer.kind !== 'number') continue;
      expect(ex.answer.unit ?? '', ex.key).not.toMatch(/^(Kante|Fläche|Ecke)$/);
      if (ex.key.includes(':rund-zaehlen:')) {
        expect(ex.answer.unit, ex.key).toBeUndefined();
        expect(ex.answer.before, ex.key).toMatch(/^(Kanten|Flächen):$/);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('every Stufe keeps its content: the Prisma only on Stufe 3, counting from Stufe 2', () => {
    for (const ex of items) {
      if (ex.stufe < 3) expect(ex.key, ex.key).not.toMatch(/prisma|steckbrief/);
      if (ex.stufe === 1) expect(ex.key, ex.key).toMatch(/:(name|gegenstand|bild-suchen|passt-nicht):/);
    }
  });
});
