/** Wording checks of the whole topic, over every text a child sees or hears from a generator. */
import { describe, expect, it } from 'vitest';
import { spokenWords } from '../../core/format';
import { createRng } from '../../core/rng';
import type { Exercise } from '../../core/types';
import { CTX } from '../test-utils';
import topic from './index';

function textsOf(ex: Exercise): string[] {
  const answer = ex.answer;
  return [
    ex.context ?? '', ex.prompt, ex.expression ?? '', ex.srText, ex.praise, ...ex.hints,
    ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)),
    ...(ex.bugs ?? []).map((b) => b.hint),
    ...(answer.kind === 'choice' ? answer.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : []),
    ...(answer.kind === 'multi' ? answer.fields.flatMap((f) => [f.label ?? '', f.before ?? '', f.after ?? '']) : []),
    ...(answer.kind === 'number' ? [answer.label ?? '', answer.before ?? '', answer.after ?? ''] : []),
  ];
}

const items = topic.skills.flatMap((skill) => ([1, 2, 3] as const).flatMap((stufe) => ([1, 2, 3] as const).flatMap((ab) =>
  Array.from({ length: 120 }, (_, i) => skill.generate(createRng(i * 53 + stufe * 7 + ab), stufe, { ...CTX, ab })))));

describe('zahlen: wording', () => {
  it('place names take the Dativ after von, bei, aus and zwischen', () => {
    const nominative = /\b(?:[Vv]on den|[Bb]ei den|[Bb]ei|[Aa]us|zwischen zwei|[Vv]on \d+|[Aa]us \d+) (?:Hunderttausender|Zehntausender|Tausender|Hunderter|Zehner|Einer)(?!\p{L})/u;
    for (const ex of items) for (const text of textsOf(ex)) expect(text, ex.key).not.toMatch(nominative);
  });

  it('no text reads as a date: "der 1." would be said "der erste"', () => {
    const date = /\b(?:der|am|vom|zum|den) \d{1,2}\./;
    for (const ex of items) for (const text of textsOf(ex)) expect(text, ex.key).not.toMatch(date);
    expect(spokenWords('Der Exponent zählt die Nullen hinter der Ziffer 1.')).toContain('Ziffer eins');
  });
});
