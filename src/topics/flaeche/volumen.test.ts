import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { allItems, numberOf } from './testing';
import { volumenSkill } from './volumen';

describeSkill(volumenSkill);

const items = allItems(volumenSkill);
const nums = (s: string) => s.split(/[-+]/).map(Number);

describe('flaeche.volumen: answers recomputed', () => {
  it('Stufe 1: the picture holds the cubes of the answer, never more than 60', () => {
    let seen = 0;
    for (const ex of items) {
      if (ex.stufe !== 1 || ex.visual?.type !== 'cubeBuilding') continue;
      const inPicture = ex.visual.heights.flat().reduce((x, y) => x + y, 0);
      expect(inPicture, ex.key).toBeLessThanOrEqual(60);
      const full = ex.visual.heights.length * ex.visual.heights[0].length * Math.max(...ex.visual.heights.flat());
      expect(numberOf(ex), ex.key).toBe(ex.key.includes(':wuerfel-fehlen:') ? full - inPicture : inPicture);
      seen++;
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('every other form follows from the numbers in its key', () => {
    for (const ex of items) {
      const product = /:(?:quader-lagen|quader|sache:[^:]+|liter-dm|liter-cm):([\d-]+)/.exec(ex.key);
      if (product) {
        const [a, b, c] = nums(product[1]);
        expect(numberOf(ex), ex.key).toBe(ex.key.includes('liter-cm') ? (a * b * c) / 1000 : a * b * c);
        if (ex.stufe === 1) expect(a * b * c).toBeLessThanOrEqual(60);
      }
      const layers = /:lagen-rueck:(\d+)-(\d+)/.exec(ex.key);
      if (layers) expect(numberOf(ex) * Number(layers[2]), ex.key).toBe(Number(layers[1]));
      const floor = /:bodenflaeche:(\d+)-(\d+)/.exec(ex.key);
      if (floor) expect(numberOf(ex), ex.key).toBe(Number(floor[1]) * Number(floor[2]));
      const twice = /:verdoppeln:(alle|hoehe):([\d-]+)/.exec(ex.key);
      if (twice) {
        const [a, b, c] = nums(twice[2]);
        expect(numberOf(ex), ex.key).toBe(twice[1] === 'alle' ? 8 * a * b * c : 2 * a * b * c);
      }
      const back = /:(?:fehlende-kante|wasserstand):(\d+):(\d+)-(\d+)/.exec(ex.key);
      if (back) expect(numberOf(ex) * Number(back[2]) * Number(back[3]), ex.key).toBe(Number(back[1]));
      const two = /:zwei-quader:([\d+-]+)/.exec(ex.key);
      if (two) {
        const [a1, b1, c1, a2, b2, c2] = nums(two[1]);
        expect(numberOf(ex), ex.key).toBe(a1 * b1 * c1 + a2 * b2 * c2);
      }
    }
  });

  it('every Stufe keeps its content', () => {
    for (const ex of items) {
      if (ex.stufe === 1) expect(ex.key).toMatch(/:(gebaeude|bauplan|quader-lagen|lagen-rueck|wuerfel-fehlen):/);
      if (ex.stufe === 2) expect(ex.key).toMatch(/:(quader|sache|bodenflaeche|verdoppeln):/);
      if (ex.stufe === 3) expect(ex.key).toMatch(/:(liter-dm|liter-cm|fehlende-kante|zwei-quader|wasserstand):/);
    }
  });

  it('Stufe 2 stays in cm³, and a story has sizes that fit its thing', () => {
    let stories = 0;
    for (const ex of items) {
      if (ex.stufe === 2 && ex.answer.kind === 'number') expect(ex.answer.unit, ex.key).toBe('cm³');
      const m = /:sache:([^:]+):(\d+)-(\d+)-(\d+)/.exec(ex.key);
      if (!m) continue;
      expect(ex.context, ex.key).not.toMatch(/Schrank|Truhe|\bdm\b/);
      expect(Math.max(Number(m[2]), Number(m[3]), Number(m[4])), ex.key).toBeLessThanOrEqual(40);
      stories++;
    }
    expect(stories).toBeGreaterThan(5);
  });

  it('worked steps calculate correctly and end with the result', () => {
    for (const ex of items) expect(checkWorkedSolution(ex)).toEqual([]);
  });
});
