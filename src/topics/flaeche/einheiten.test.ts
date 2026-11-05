import { describe, expect, it } from 'vitest';
import { formatAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { RANGE_DEFAULTS } from '../../data/profiles';
import { checkWorkedSolution } from '../step-check';
import { einheitenSkill } from './einheiten';
import { WIDE, allItems, correctLabel, fieldOf, numberOf, numbersIn } from './testing';

describeSkill(einheitenSkill);

/** Size of a unit in mm². */
const UNIT: Record<string, number> = { 'mm²': 1, 'cm²': 100, 'dm²': 10_000, 'm²': 1_000_000, a: 100_000_000, ha: 10_000_000_000, 'km²': 1_000_000_000_000 };
const close = (x: number, y: number) => Math.abs(x - y) < 1e-6 * Math.max(1, Math.abs(y));
const NARROW = { subtractionMethod: 'abziehen', ranges: RANGE_DEFAULTS.anschaulich } as const;

/** '2,5 m²' as mm². */
function inMm2(text: string): number {
  const m = /([\d ,]+)\s*(km²|ha|a|m²|dm²|cm²|mm²)/.exec(text);
  if (!m) throw new Error(text);
  return numbersIn(m[1])[0] * UNIT[m[2]];
}

describe('flaeche.einheiten: answers recomputed', () => {
  it('a conversion in the expression keeps its area', () => {
    let seen = 0;
    for (const ex of allItems(einheitenSkill)) {
      if (!ex.expression || ex.answer.kind !== 'number') continue;
      const [left, right] = ex.expression.split(' = □ ');
      const given = /(\d+) (m²|dm²|cm²) (\d+) (dm²|cm²|mm²)/.exec(left);
      const total = given ? Number(given[1]) * UNIT[given[2]] + Number(given[3]) * UNIT[given[4]] : inMm2(left);
      expect(close(numberOf(ex) * UNIT[right], total), `${ex.key}: ${ex.expression} = ${numberOf(ex)}`).toBe(true);
      seen++;
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('splitting into two units keeps the area', () => {
    for (const ex of allItems(einheitenSkill)) {
      if (ex.answer.kind !== 'multi') continue;
      const m = /^([\d ]+) (\S+) = □ (\S+) □ (\S+)$/.exec(ex.expression!)!;
      expect(fieldOf(ex, 'g') * 100 + fieldOf(ex, 'k'), ex.key).toBe(numbersIn(m[1])[0]);
      expect(fieldOf(ex, 'k'), ex.key).toBeLessThan(100);
    }
  });

  it('an order answer sorts by real size, not by the number shown', () => {
    let seen = 0;
    for (const ex of allItems(einheitenSkill)) {
      if (ex.answer.kind !== 'order' || !/ordnen:[^:]*²/.test(ex.key)) continue;
      const a = ex.answer;
      const sizes = a.correct.map((i) => inMm2(a.items[i]));
      const sorted = [...sizes].sort((x, y) => (a.direction === 'aufsteigend' ? x - y : y - x));
      expect(sizes, ex.key).toEqual(sorted);
      seen++;
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('every item of the skill has the comma key, so a field never gives the answer type away', () => {
    expect(einheitenSkill.keys).toEqual({ comma: true });
    for (const ex of allItems(einheitenSkill)) {
      if (ex.answer.kind === 'number') expect(ex.answer.decimals, ex.key).toBeGreaterThan(0);
      if (ex.answer.kind === 'multi') ex.answer.fields.forEach((f) => expect(f.decimals, ex.key).toBeGreaterThan(0));
    }
  });

  it('range default m2ToMm2: no a, ha or km² in task or answer; wide uses them from Stufe 2 on', () => {
    const wideUnit = /\d\s(a|ha|km²)(?![\p{L}²])/u;
    const text = (ex: Exercise) => [ex.prompt, ex.context, ex.expression, ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : []), ...(ex.answer.kind === 'order' ? ex.answer.items : [])].filter(Boolean).join(' ');
    for (const ex of allItems(einheitenSkill, NARROW)) expect(text(ex), ex.key).not.toMatch(wideUnit);
    const wide = allItems(einheitenSkill, WIDE);
    expect(wide.some((ex) => ex.stufe === 2 && wideUnit.test(text(ex)))).toBe(true);
    for (const ex of wide) if (ex.stufe === 1) expect(text(ex), ex.key).not.toMatch(wideUnit);
  });

  it('every Stufe keeps its content', () => {
    for (const ex of allItems(einheitenSkill)) {
      if (ex.stufe === 1) expect(ex.key).toMatch(/:(runter|hoch|gemischt|aufteilen):/);
      if (ex.stufe === 2) expect(ex.key).not.toMatch(/ordnen|vergleich|alltag|fliesen|fussballfeld/);
      if (ex.stufe === 3) expect(ex.key).toMatch(/:(ordnen|vergleich|alltag|fliesen|fussballfeld):/);
    }
  });

  it('a Lösung never shows money-style decimals on an area or a count', () => {
    for (const ex of allItems(einheitenSkill)) {
      if (ex.answer.kind !== 'number' && ex.answer.kind !== 'multi') continue;
      expect(formatAnswer(ex.answer), ex.key).not.toMatch(/,\d*0(?!\d)/);
    }
  });

  it('Stufe 2 AB III always has a comma, and the factor is not in the prompt', () => {
    const seen = new Set<string>();
    for (const ctx of [WIDE, NARROW]) {
      for (const ex of allItems(einheitenSkill, ctx, 200)) {
        if (ex.stufe !== 2 || ex.ab !== 3 || ex.answer.kind !== 'number') continue;
        const written = `${ex.expression} ${formatAnswer(ex.answer)}`;
        expect(written, ex.key).toMatch(/\d,\d/);
        expect(ex.prompt, ex.key).not.toMatch(/\b(ha|a) sind/);
        seen.add(/:2:([a-z0-9-]+):/.exec(ex.key)![1]);
      }
    }
    expect([...seen].sort()).toEqual(['a-ha', 'a-m2', 'ha-a', 'ha-km2', 'ha-m2', 'km2-ha', 'zwei-schritte-komma']);
  });

  it('wide practises km² in conversions and orders, and no item teaches it only as a distractor', () => {
    const shown = (ex: Exercise) => [ex.expression, ...(ex.answer.kind === 'order' ? ex.answer.items : [])].filter(Boolean).join(' ');
    const cells = new Set<string>();
    for (const ex of allItems(einheitenSkill, WIDE, 200)) if (shown(ex).includes('km²')) cells.add(`${ex.stufe}/${ex.ab}`);
    expect([...cells].sort()).toEqual(['2/1', '2/3', '3/1']);
    for (const ex of allItems(einheitenSkill, NARROW, 200)) expect(JSON.stringify(ex), ex.key).not.toContain('km²');
  });

  it('Stufe 3 AB II needs units: nothing there is decided by everyday knowledge of bare words', () => {
    for (const ctx of [WIDE, NARROW]) {
      for (const ex of allItems(einheitenSkill, ctx, 200)) {
        if (ex.stufe !== 3 || ex.ab !== 2) continue;
        expect(ex.answer.kind, ex.key).toBe('choice');
        if (ex.answer.kind === 'choice') for (const o of ex.answer.options) expect(o.label, ex.key).toMatch(/\d.*(mm²|cm²|dm²|m²|km²|ha|a)$/);
      }
    }
  });

  it('larger than a benchmark: exactly one option is larger, and another option can carry the larger number', () => {
    let seen = 0;
    let trap = 0;
    for (const ctx of [WIDE, NARROW]) {
      for (const ex of allItems(einheitenSkill, ctx, 200)) {
        if (!ex.key.includes(':vergleich:') || ex.answer.kind !== 'choice') continue;
        const benchmark = inMm2(ex.context!);
        const larger = ex.answer.options.filter((o) => inMm2(o.label) > benchmark);
        expect(larger.map((o) => o.label), ex.key).toEqual([correctLabel(ex)]);
        if (ex.answer.options.some((o) => numbersIn(o.label)[0] > numbersIn(correctLabel(ex))[0])) trap++;
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(50);
    expect(trap).toBeGreaterThan(seen / 2);
  });

  it('the hints for a fitting size give a picture that fits the object', () => {
    let seen = 0;
    for (const ex of allItems(einheitenSkill, WIDE, 200)) {
      if (!ex.key.includes(':alltag:') || ex.answer.kind !== 'choice') continue;
      const hints = ex.hints.join(' ');
      // squares are laid on the object only when one of them fits on it
      if (/passen darauf/.test(hints) && !/Handfläche/.test(hints)) expect(inMm2(ex.hints[0]), ex.key).toBeLessThanOrEqual(inMm2(correctLabel(ex)));
      if (/:(Fingernagel|Briefmarke|Heftseite):/.test(ex.key)) expect(hints, ex.key).not.toMatch(/\b1 m²/);
      seen++;
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('a hint about the comma stands only where a comma is written', () => {
    for (const ex of allItems(einheitenSkill)) {
      if (ex.stufe !== 2 || ex.answer.kind !== 'number' || !ex.hints.some((h) => /Komma/.test(h))) continue;
      expect(`${ex.expression} ${formatAnswer(ex.answer)}`, ex.key).toMatch(/\d,\d/);
    }
  });

  it('worked steps calculate correctly and end with the result', () => {
    for (const ex of allItems(einheitenSkill)) {
      if (ex.answer.kind === 'number') expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });
});
