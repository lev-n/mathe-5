/**
 * Text with tappable Fachwörter (docs/research.md T11, F17): a tap opens a short gloss in the text, never a pop-up, and a second tap closes it. Fractions still draw stacked (MathText).
 */
import { useId, useState } from 'react';
import type { GlossSegment } from '../../data/glossary';
import { MathText } from './MathText';

function GlossWord({ word, gloss }: { word: string; gloss: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button type="button" className="gloss-word" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {word}
      </button>
      <span id={id} className="gloss-text" hidden={!open}>
        {gloss}
      </span>
    </>
  );
}

/** keyBase: new for a new task, so that an open gloss does not carry over. */
export function GlossedText({ segments, keyBase }: { segments: readonly GlossSegment[]; keyBase: string }) {
  return (
    <>
      {segments.map((s, i) => ('word' in s ? <GlossWord key={`${keyBase}:${i}`} word={s.word} gloss={s.gloss} /> : <MathText key={i} text={s.text} />))}
    </>
  );
}
