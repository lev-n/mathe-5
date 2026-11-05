import { describe, expect, it } from 'vitest';
import { hintProblems, toneProblems } from '../core/textRules';
import { samples } from '../topics/test-utils';
import { loadAllTopics } from '../topics/registry';
import { FACHWOERTER, glossTexts, type GlossSegment } from './glossary';

const words = (s: readonly GlossSegment[]) => s.flatMap((x) => ('word' in x ? [x.word] : []));
const textOf = (s: readonly GlossSegment[]) => s.map((x) => ('word' in x ? x.word : x.text)).join('');

describe('glossary (T11)', () => {
  it('names every Fachwort of T11', () => {
    expect(FACHWOERTER.map((f) => f.word).sort()).toEqual(
      ['Summe', 'Differenz', 'Produkt', 'Quotient', 'Stellenwert', 'Stufenzahl', 'Vorzeichen', 'Rechenzeichen', 'Betrag', 'Gegenzahl', 'Zähler', 'Nenner', 'kürzen', 'erweitern', 'Teiler', 'Vielfaches', 'Primzahl', 'Scheitel', 'Schenkel', 'parallel', 'senkrecht', 'Rechtswert', 'Hochwert'].sort(),
    );
  });

  it('a gloss is short, plain and keeps the tone (T15, T17)', () => {
    for (const f of FACHWOERTER) {
      expect(hintProblems(f.gloss), f.word).toEqual([]);
      expect(toneProblems([f.gloss]), f.word).toEqual([]);
    }
  });

  it('glosses only the first use across the texts of a task, in any form, and keeps the text', () => {
    const [context, prompt, hint] = glossTexts(['Berechne die Summe.', 'Erweitere den Bruch. Die Summen stimmen.', 'Der Nenner bleibt, der Zähler auch.'], 'brueche');
    expect(words(context)).toEqual(['Summe']);
    expect(words(prompt)).toEqual(['Erweitere']);
    expect(words(hint)).toEqual(['Nenner', 'Zähler']);
    expect(textOf(prompt)).toBe('Erweitere den Bruch. Die Summen stimmen.');
  });

  it('leaves longer words and other meanings alone', () => {
    expect(words(glossTexts(['Die Stellenwerttafel, die Teilermenge, der Scheitelwinkel. Zähle und nenne.'], 'zahlen')[0])).toEqual([]);
    expect(words(glossTexts(['Welcher Betrag fehlt?'], 'groessen')[0])).toEqual([]);
    expect(words(glossTexts(['Wie groß ist der Betrag?'], 'ganzzahlen')[0])).toEqual(['Betrag']);
  });

  it('a text without a Fachwort stays one text, and fractions stay whole', () => {
    expect(glossTexts(['Rechne.', ''], 'zahlen')).toEqual([[{ text: 'Rechne.' }], [{ text: '' }]]);
    expect(textOf(glossTexts(['{frac:3/4} hat den Nenner 4.'], 'brueche')[0])).toBe('{frac:3/4} hat den Nenner 4.');
  });

  it('never hands over a right choice: no gloss of a task holds the label of its answer', async () => {
    for (const mod of await loadAllTopics()) {
      for (const skill of mod.skills) {
        for (const stufe of [1, 2, 3] as const) {
          for (const ex of samples(skill, stufe, 60)) {
            if (ex.answer.kind !== 'choice') continue;
            const right = ex.answer.options[ex.answer.correct].label;
            const glosses = glossTexts([ex.context ?? '', ex.prompt, ...ex.hints], ex.topicId).flat().flatMap((s) => ('gloss' in s ? [s.gloss] : []));
            for (const g of glosses) expect(g.includes(right) && right.length > 2, `${ex.key}: ${right}`).toBe(false);
          }
        }
      }
    }
  }, 120_000);
});
