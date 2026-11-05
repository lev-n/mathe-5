import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { NBSP } from '../../core/format';
import { createRng } from '../../core/rng';
import { STUFEN, type Ab } from '../../core/types';
import { evalSide } from '../step-check';
import { CTX, samples } from '../test-utils';
import { kommaSkill } from './komma';
import { assertFitsPhone, assertSteps } from './testkit';

describeSkill(kommaSkill);

const clean = (s: string) => s.replace(/ /g, '');

const atAb = (stufe: 1 | 2 | 3, ab: Ab, n = 1500) => Array.from({ length: n }, (_, i) => kommaSkill.generate(createRng(i * 29 + ab), stufe, { ...CTX, ab }));

describe('groessen.komma specifics', () => {
  it('the steps are right and end with the result', () => {
    for (const stufe of STUFEN) for (const ex of samples(kommaSkill, stufe)) assertSteps(ex);
  });

  it('conversions: the left side and the answer are the same quantity', () => {
    let seen = 0;
    for (const stufe of STUFEN) {
      for (const ex of samples(kommaSkill, stufe)) {
        if (!ex.expression) continue;
        const left = evalSide(clean(ex.expression.split(' = ')[0]));
        if (!left) continue;
        const given = ex.answer.kind === 'number'
          ? evalSide(`${String(ex.answer.value).replace('.', ',')} ${ex.answer.unit}`)
          : ex.answer.kind === 'multi'
            ? evalSide(ex.answer.fields.map((f) => `${f.value} ${f.after}`).join(' '))
            : null;
        if (!given) continue;
        seen++;
        expect(given.value, ex.key).toBeCloseTo(left.value, 6);
      }
    }
    expect(seen).toBeGreaterThan(300);
  });

  it('Stufe 3 orders by value, and the trap of 1 m 3 cm has its own bug', () => {
    let seen = 0;
    for (const ex of samples(kommaSkill, 3)) {
      if (ex.answer.kind !== 'order') continue;
      seen++;
      const a = ex.answer;
      const values = a.correct.map((i) => evalSide(clean(a.items[i]))!.value);
      const sorted = [...values].sort((x, y) => (a.direction === 'aufsteigend' ? x - y : y - x));
      expect(values, ex.key).toEqual(sorted);
      expect(ex.bugs?.some((b) => b.id === 'komma-einheit' || b.id === 'komma-gewicht'), ex.key).toBe(true);
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('how far 1,30 m = 1 m 3 cm is off: the answer is the difference, and "it is right" is a known mistake', () => {
    let seen = 0;
    for (const ex of atAb(3, 3)) {
      if (!ex.key.includes(':pruefen:') || ex.answer.kind !== 'number') continue;
      seen++;
      const comma = /\d+,(\d+)/.exec(ex.context!)![1];
      const told = Number(new RegExp(`(\\d+)${NBSP}\\S+\\.$`).exec(ex.context!)![1]);
      const factor = ex.answer.unit === 'g' ? 1000 : 100;
      const small = Number(`0.${comma}`) * factor;
      expect(ex.answer.value, ex.key).toBeCloseTo(small - told, 6);
      expect(ex.answer.value!, ex.key).toBeGreaterThan(0);
      expect(checkAnswer(ex.answer, { kind: 'number', text: '0' }, ex.bugs).bugId, ex.key).toMatch(/komma-(einheit|gewicht)/);
    }
    expect(seen).toBeGreaterThan(500);
  });

  it('Stufe 3 at AB III is no Stufe 1 task with a story in front, and no task of Stufe 2', () => {
    const lower = new Set(([1, 2] as const).flatMap((stufe) => ([1, 2, 3] as Ab[]).flatMap((ab) => atAb(stufe, ab).map((ex) => ex.expression ?? ''))));
    for (const ex of atAb(3, 3)) {
      if (ex.expression) expect(lower.has(ex.expression), ex.key).toBe(false);
      expect(`${ex.context ?? ''} ${ex.prompt}`, ex.key).not.toMatch(/Wie heißt es richtig/);
    }
  });

  it('the same quantity starts from the two parts with a 0 straight after the comma, and every option is another writing', () => {
    let seen = 0;
    for (const ex of atAb(3, 3)) {
      if (!ex.key.includes(':gleich:') || ex.answer.kind !== 'choice') continue;
      seen++;
      expect(ex.prompt, ex.key).toMatch(new RegExp(`wie \\d+${NBSP}\\S+ \\d+${NBSP}\\S+\\?$`));
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toMatch(/^\d+,0\d/);
      expect(ex.answer.options.length, ex.key).toBe(4);
    }
    expect(seen).toBeGreaterThan(300);
  });

  it('with 0 before the comma, the item keeps its bugs: 0,8 kg typed as 8 g gets the place hint and feeds its family', () => {
    let seen = 0;
    for (const ex of atAb(2, 2, 3000)) {
      if (!/^0,/.test(ex.expression ?? '') || ex.answer.kind !== 'number') continue;
      seen++;
      expect(ex.bugs?.length, ex.key).toBeGreaterThan(0);
      const tenth = Number(/^0,(\d)/.exec(ex.expression!)![1]);
      const typed = checkAnswer(ex.answer, { kind: 'number', text: String(tenth) }, ex.bugs);
      expect(typed.bugId, ex.key).toMatch(/komma-(gewicht|einheit)/);
      expect(typed.bugHint, ex.key).toBeTruthy();
      for (const text of [...ex.hints, ...ex.bugs!.map((b) => b.hint)]) expect(text, ex.key).not.toMatch(new RegExp(`(?<!\\d)${ex.answer.value}(?!\\d)`));
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('a short comma keeps its bugs at every number', () => {
    for (const stufe of [1, 2] as const) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of atAb(stufe, ab, 500)) if (ex.key.includes(':kurz:')) expect(ex.bugs?.length, ex.key).toBeGreaterThan(0);
      }
    }
  });

  it('the screen reader hears the comma and its 0, and never the split that is asked for', () => {
    let seen = 0;
    for (const stufe of STUFEN) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of atAb(stufe, ab, 400)) {
          const shown = [ex.context, ex.prompt, ex.expression, ...(ex.answer.kind === 'order' ? ex.answer.items : [])].filter(Boolean).join(' ');
          for (const [, int, dec] of shown.matchAll(/(\d+),(\d+)/g)) {
            seen++;
            expect(ex.srText, `${ex.key}: ${ex.srText}`).toContain(`${int} Komma ${dec.split('').join(' ')}`);
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(1000);
  });

  it('money shown only as a picture is listed for the screen reader, without its sum', () => {
    let seen = 0;
    for (const ex of atAb(1, 2)) {
      if (!ex.key.includes(':geld:') || ex.visual?.type !== 'money' || ex.answer.kind !== 'number') continue;
      seen++;
      expect(ex.srText, ex.key).toMatch(/Münzen? zu|Scheine? zu/);
      const pieces = [...ex.srText.matchAll(/(\d+) (?:Münzen?|Scheine?) zu (\d+) (Euro|Cent)/g)];
      expect(pieces.reduce((sum, m) => sum + Number(m[1]) * Number(m[2]) * (m[3] === 'Euro' ? 100 : 1), 0), ex.key).toBe(Math.round(ex.answer.value! * 100));
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('an order task says its direction in the prompt', () => {
    let seen = 0;
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of atAb(3, ab, 300)) {
        if (ex.answer.kind !== 'order') continue;
        seen++;
        expect(ex.prompt, ex.key).toBe(ex.answer.direction === 'aufsteigend' ? 'Ordne die Größen vom Kleinsten zum Größten.' : 'Ordne die Größen vom Größten zum Kleinsten.');
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('Stufe 1 has the short form 1,5 m of its label, and the 105 cm trap of it', () => {
    const short = ([1, 2, 3] as Ab[]).flatMap((ab) => atAb(1, ab)).filter((ex) => new RegExp(`^\\d,\\d${NBSP}m `).test(ex.expression ?? ''));
    expect(short.length).toBeGreaterThan(100);
    const toCm = short.filter((ex) => ex.key.includes(':kurz:'));
    expect(toCm.length).toBeGreaterThan(50);
    for (const ex of toCm) {
      if (ex.answer.kind !== 'number') continue;
      const [big, tenth] = /^(\d),(\d)/.exec(ex.expression!)!.slice(1).map(Number);
      expect(ex.answer.value, ex.key).toBe(big * 100 + tenth * 10);
      expect(ex.bugs?.some((b) => b.match === big * 100 + tenth), ex.key).toBe(true);
    }
  });

  it('a hint or praise about filling up only stands where places are missing', () => {
    const filling = /füll[^.]* auf|aufgefüllt/i;
    for (const stufe of STUFEN) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of atAb(stufe, ab, 500)) {
          const said = [...ex.hints, ex.praise].filter((t) => filling.test(t));
          if (said.length === 0) continue;
          const shown = `${ex.expression ?? ''} ${ex.context ?? ''} ${ex.prompt}`;
          const short = [...shown.matchAll(new RegExp(`(\\d+),(\\d+)${NBSP}(€|m|km|kg|t)(?![\\p{L}])`, 'gu'))].some((m) => m[2].length < (m[3] === '€' || m[3] === 'm' ? 2 : 3));
          expect(short, `${ex.key}: ${said.join(' ')} / ${shown}`).toBe(true);
        }
      }
    }
  });

  it('a step about the places states the truth about the number it shows', () => {
    let seen = 0;
    for (const ex of atAb(3, 3)) {
      for (const step of ex.steps) {
        const m = new RegExp(`(\\d+,(\\d+))${NBSP}\\S+ hat (zwei|drei) Stellen`).exec(String(step));
        if (!m) continue;
        seen++;
        expect(m[2].length, `${ex.key}: ${step}`).toBe(m[3] === 'zwei' ? 2 : 3);
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('expressions and answers fit a phone', () => {
    for (const stufe of STUFEN) for (const ab of [1, 2, 3] as Ab[]) atAb(stufe, ab, 300).forEach(assertFitsPhone);
  });

  it('every field offers the comma, so the key gives nothing away', () => {
    for (const stufe of STUFEN) {
      for (const ex of samples(kommaSkill, stufe)) {
        if (ex.answer.kind === 'number') expect(ex.answer.decimals, ex.key).toBeGreaterThan(0);
        if (ex.answer.kind === 'multi') ex.answer.fields.forEach((f) => expect(f.decimals, ex.key).toBeGreaterThan(0));
      }
    }
  });
});
