// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { glossTexts } from '../../data/glossary';
import { GlossedText } from './GlossedText';

afterEach(cleanup);

describe('GlossedText (T11)', () => {
  const [segments] = glossTexts(['Welche Zahl ist ein Teiler von {frac:3/4}?'], 'zahlen');

  it('a tap opens the gloss in the text, a second tap closes it, nothing else moves', () => {
    const { container } = render(<p><GlossedText segments={segments} keyBase="a" /></p>);
    const word = screen.getByRole('button', { name: 'Teiler' });
    const gloss = () => container.querySelector('.gloss-text') as HTMLElement;
    expect(word.getAttribute('aria-expanded')).toBe('false');
    expect(gloss().hidden).toBe(true);
    expect(word.getAttribute('aria-controls')).toBe(gloss().id);
    fireEvent.click(word);
    expect(word.getAttribute('aria-expanded')).toBe('true');
    expect(gloss().hidden).toBe(false);
    expect(gloss().textContent).toBe('Diese Zahl teilt eine andere ohne Rest.');
    fireEvent.click(word);
    expect(gloss().hidden).toBe(true);
    expect(container.querySelector('.frac')).not.toBeNull();
  });

  it('closes on a new task', () => {
    const { container, rerender } = render(<p><GlossedText segments={segments} keyBase="a" /></p>);
    fireEvent.click(screen.getByRole('button', { name: 'Teiler' }));
    rerender(<p><GlossedText segments={segments} keyBase="b" /></p>);
    expect((container.querySelector('.gloss-text') as HTMLElement).hidden).toBe(true);
  });

  it('text without a Fachwort has no button', () => {
    render(<p><GlossedText segments={glossTexts(['Rechne.'], 'zahlen')[0]} keyBase="a" /></p>);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
