import { describe, expect, it } from 'vitest';
import { spokenWords, unitWord } from '../../core/format';
import { DEFAULT_CONTEXT } from '../../core/generate';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Visual } from '../../core/types';
import { STUFEN } from '../../core/types';
import { CATALOGUE, RANGE_DEFAULTS } from '../../data/profiles';
import { lineEnds } from '../../ui/visuals/LinesVisual';
import { bugKey } from '../errorFamilies';
import families from './families';
import topic from './index';

const contexts = [DEFAULT_CONTEXT, { ...DEFAULT_CONTEXT, ranges: RANGE_DEFAULTS.anschaulich }];

/** Every sample of the topic: all skills, both ranges, all Stufen and AB levels. */
function* everyExercise(seeds: number): Generator<Exercise> {
  for (const skill of topic.skills) {
    for (const ctx of contexts) {
      for (const stufe of STUFEN) {
        for (const ab of [1, 2, 3] as Ab[]) {
          for (let seed = 1; seed <= seeds; seed++) yield skill.generate(createRng(seed * 401 + stufe * 7 + ab), stufe, { ...ctx, ab });
        }
      }
    }
  }
}

/** The pictures of an exercise: the task, its options, its worked steps. */
function picturesOf(ex: Exercise): Visual[] {
  const options = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.visual) : [];
  const steps = ex.steps.map((s) => (typeof s === 'string' ? undefined : s.visual));
  return [ex.visual, ...options, ...steps].filter((v): v is Visual => !!v);
}

describe('topic geometrie', () => {
  it('the voice never hears a line letter as a unit', () => {
    for (const ex of everyExercise(12)) {
      const options = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : [];
      for (const o of options) expect(unitWord(o), `${ex.key}: option ${o}`).toBeUndefined();
      const whys = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => o.whyWrong ?? []) : [];
      const steps = ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
      const texts = [ex.prompt, ...ex.hints, ...options, ...whys, ...steps, ...(ex.bugs ?? []).map((b) => b.hint)];
      for (const t of texts) expect(spokenWords(t), ex.key).not.toMatch(/\b(Gramm|Stunden?|Sekunden?|Ar|Tonnen?|Liter|Meter)\b/);
    }
  });

  it('labels of line pictures stay inside the picture of 300 × 200', () => {
    for (const ex of everyExercise(25)) {
      for (const v of picturesOf(ex)) {
        if (v.type !== 'lines') continue;
        for (const l of v.lines) {
          if (!l.label) continue;
          const { b, dir } = lineEnds(l);
          const [x, y] = [b[0] - dir[1] * 14, b[1] + dir[0] * 14 + 5];
          expect(x - 6 >= 0 && x + 6 <= 300 && y - 16 >= 0 && y + 5 <= 200, `${ex.key}: line ${l.label} at ${x}, ${y}`).toBe(true);
        }
        for (const p of v.points ?? []) {
          const [x, y] = [150 + p.x + 8, 100 - p.y - 8];
          expect(x >= 0 && x + 14 <= 300 && y - 16 >= 0 && y + 5 <= 200, `${ex.key}: point ${p.label} at ${x}, ${y}`).toBe(true);
        }
      }
    }
  });

  it('in a line picture, labels and point letters stand clear of the lines and of each other', () => {
    type Box = [number, number, number, number];
    const meet = (a: Box, b: Box) => a[0] < b[1] && a[1] > b[0] && a[2] < b[3] && a[3] > b[2];
    const onLine = (l: Parameters<typeof lineEnds>[0], box: Box) => {
      const { a, b } = lineEnds(l);
      for (let i = 0; i <= 300; i++) {
        const [x, y] = [a[0] + ((b[0] - a[0]) * i) / 300, a[1] + ((b[1] - a[1]) * i) / 300];
        if (x > box[0] && x < box[1] && y > box[2] && y < box[3]) return true;
      }
      return false;
    };
    for (const ex of everyExercise(25)) {
      for (const v of picturesOf(ex)) {
        if (v.type !== 'lines') continue;
        const labels = v.lines.map((l): Box | null => {
          if (!l.label) return null;
          const { b, dir } = lineEnds(l);
          const [x, y] = [b[0] - dir[1] * 14, b[1] + dir[0] * 14 + 5];
          return [x - 6, x + 6, y - 14, y + 2];
        });
        v.lines.forEach((l, i) => labels.forEach((box, j) => {
          if (box && i !== j) expect(onLine(l, box), `${ex.key}: line ${l.label ?? i} through label ${v.lines[j].label}`).toBe(false);
          if (box && labels[i] && i < j) expect(meet(labels[i]!, box), `${ex.key}: labels ${l.label} and ${v.lines[j].label}`).toBe(false);
        }));
        // Capital letters of points; the Greek angle letters have their own check below.
        for (const p of v.points ?? []) {
          if (!p.label || !/[A-Z]/.test(p.label)) continue;
          const letter: Box = [150 + p.x + 8, 150 + p.x + 21, 100 - p.y - 21, 100 - p.y - 8];
          for (const l of v.lines) expect(onLine(l, letter), `${ex.key}: a line through ${p.label}`).toBe(false);
          for (const box of labels) if (box) expect(meet(box, letter), `${ex.key}: a label on ${p.label}`).toBe(false);
        }
      }
    }
  });

  it('the second arm on a Geodreieck strikes no printed number (the size near a border in Winkelarten is read on purpose beside one)', () => {
    const struck = new Set<string>();
    for (const ex of everyExercise(25)) {
      if (ex.key.includes(':grenze:')) continue;
      for (const v of picturesOf(ex)) {
        if (v.type !== 'angle' || v.tool !== 'geodreieck' || v.toolOffset) continue;
        const rad = (d: number) => ((v.baseRotation + d) * Math.PI) / 180;
        for (let r = 0; r <= 130 * v.arm2; r += 1) {
          const [x, y] = [r * Math.cos(rad(v.degrees)), r * Math.sin(rad(v.degrees))];
          for (let d = 0; d <= 180; d += 20) {
            const at = rad(Math.min(174, Math.max(6, d)));
            for (const [ring, shown] of [[102, d], [82, 180 - d]]) {
              const [cx, cy] = [ring * Math.cos(at), ring * Math.sin(at)];
              // The core of the number: a corner of its box may be grazed.
              if (Math.abs(x - cx) < String(shown).length * 4 - 3 && Math.abs(y - cy) < 2.5) struck.add(`${ex.key}: the arm through ${shown}`);
            }
          }
        }
      }
    }
    expect([...struck]).toEqual([]);
  });

  it('no form of a choice has its right option always at the same place', () => {
    const places = new Map<string, Set<number>>();
    const counts = new Map<string, number>();
    for (const ex of everyExercise(40)) {
      if (ex.answer.kind !== 'choice') continue;
      const form = ex.key.split(':').slice(0, 3).join(':');
      places.set(form, (places.get(form) ?? new Set()).add(ex.answer.correct));
      counts.set(form, (counts.get(form) ?? 0) + 1);
    }
    expect([...places].filter(([form, seen]) => seen.size === 1 && counts.get(form)! >= 20).map(([form]) => form)).toEqual([]);
  });

  it('a count of 1 stays in the singular', () => {
    for (const ex of everyExercise(40)) {
      const texts = [ex.prompt, ex.srText, ...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))];
      for (const t of texts) expect(t, ex.key).not.toMatch(/\b1 (Linien|Schritte|Paare|Spiegelachsen|Achsen|Punkte|Seiten|Ecken|Figuren)\b/);
    }
  });

  it('a point letter does not print over the axis names of a coordinate grid', () => {
    for (const ex of everyExercise(25)) {
      for (const v of picturesOf(ex)) {
        if (v.type !== 'coordinateGrid' || v.axisNames !== 'rechtsHoch') continue;
        const xOf = (x: number) => 30 + (x - v.xMin) * 40;
        const yOf = (y: number) => 24 + (v.yMax - y) * 40;
        const boxes = [[xOf(v.xMax) + 18 - 92, xOf(v.xMax) + 18, yOf(0) - 26, yOf(0) - 10], [xOf(0) + 12, xOf(0) + 12 + 77, yOf(v.yMax) - 22, yOf(v.yMax) - 4]];
        for (const p of v.points) {
          if (!p.label) continue;
          const [l, r, t, u] = [xOf(p.x) + 9, xOf(p.x) + 23, yOf(p.y) - 22, yOf(p.y) - 5];
          for (const [bl, br, bt, bu] of boxes) expect(l < br && r > bl && t < bu && u > bt, `${ex.key}: ${p.label} at (${p.x}|${p.y})`).toBe(false);
        }
      }
    }
  });

  it('at a crossing, each angle letter and its dot lie inside their angle, clear of the lines', () => {
    for (const skill of topic.skills.filter((s) => s.id === 'geometrie.scheitel')) {
      for (const stufe of STUFEN) {
        for (const ab of [1, 2, 3] as Ab[]) {
          for (let seed = 1; seed <= 80; seed++) {
            const ex = skill.generate(createRng(seed * 409 + stufe + ab), stufe, { ...DEFAULT_CONTEXT, ab });
            if (ex.visual?.type !== 'lines') continue;
            for (const p of ex.visual.points ?? []) {
              // The letter is about 14 wide, up and to the right of the dot; y upward, as in the data.
              for (const [dx, dy] of [[0, 0], [8, 3], [22, 3], [8, 19], [22, 19]]) {
                for (const l of ex.visual.lines) {
                  const r = (l.angle * Math.PI) / 180;
                  const gap = (p.x + dx) * Math.sin(r) - (p.y + dy) * Math.cos(r) - l.offset;
                  expect(Math.abs(gap), `${ex.key}: ${p.label}`).toBeGreaterThan(1.5);
                }
              }
            }
          }
        }
      }
    }
  });

  it('has the skills of the catalogue, in teaching order', () => {
    expect(topic.skills.map((s) => s.id)).toEqual([...CATALOGUE.geometrie]);
  });

  // The same sweep as src/topics/errorFamilies.test.ts, on this topic alone, so it does not depend on the other topics; here also with the narrow ranges of a profile.
  it('every Bug id has a family of its skill, and every table entry is emitted', () => {
    const table = new Set(Object.values(families).flatMap((skills) => Object.entries(skills).flatMap(([id, keys]) => keys.split(/\s+/).map((key) => `${id}|${key}`))));
    const emitted = new Set<string>();
    for (const skill of topic.skills) {
      for (const ctx of contexts) {
        for (const stufe of STUFEN) {
          for (let seed = 1; seed <= 400; seed++) {
            const ex = skill.generate(createRng(seed * 104_729 + stufe * 31), stufe, ctx);
            for (const bug of ex.bugs ?? []) emitted.add(`${skill.id}|${bugKey(bug.id)}`);
          }
        }
      }
    }
    expect([...emitted].filter((k) => !table.has(k))).toEqual([]);
    expect([...table].filter((k) => !emitted.has(k))).toEqual([]);
  });

  it('srText says signs as words, for a screen reader', () => {
    for (const skill of topic.skills) {
      for (const ctx of contexts) {
        for (const stufe of STUFEN) {
          for (const ab of [1, 2, 3] as Ab[]) {
            for (let seed = 1; seed <= 30; seed++) {
              const ex = skill.generate(createRng(seed * 383 + stufe + ab), stufe, { ...ctx, ab });
              expect(ex.srText, ex.key).not.toMatch(/[°|−·]|\s=\s/);
            }
          }
        }
      }
    }
  });

  it('Stufe 3 differs from Stufe 2 at every AB, by the form of the task', () => {
    for (const skill of topic.skills) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (let seed = 1; seed <= 30; seed++) {
          const form = (stufe: 2 | 3) => skill.generate(createRng(seed * 389), stufe, { ...DEFAULT_CONTEXT, ab }).key.split(':')[2];
          expect(form(2), `${skill.id}, AB ${ab}`).not.toBe(form(3));
        }
      }
    }
  });
});
