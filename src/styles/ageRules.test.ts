// The type and touch rules for 10–11-year-olds in the shared CSS (docs/research.md §7.1).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');
const tokens = read('./tokens.css');
const value = (name: string) => new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens)?.[1] ?? '';

describe('type', () => {
  it('body is 18 px, 19 px on tablet and desktop, at most 65ch; the task expression at least 2rem', () => {
    expect(parseFloat(value('fs-body')) * 16).toBe(18);
    expect(tokens).toMatch(/@media \(min-width: 600px\) \{\s*:root \{ --fs-body: 1\.1875rem; \}/);
    expect(parseFloat(value('measure'))).toBeLessThanOrEqual(65);
    expect(parseFloat(value('fs-task'))).toBeGreaterThanOrEqual(2);
  });

  it('stacked fractions are at least 1.5 times the body height', () => {
    expect(read('./base.css')).toMatch(/\.frac \{[^}]*min-height:\s*calc\(1\.5em \* var\(--lh\)\)/);
  });

  it('the task text keeps the measure', () => {
    const css = read('../ui/practice/practice.css');
    for (const cls of ['pr-prompt', 'pr-context', 'pr-solution', 'pr-feedback__text']) {
      const rule = new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      expect(rule, cls).toMatch(/max-width:\s*var\(--measure\)/);
    }
  });
});

describe('touch', () => {
  it('keypad and primary buttons are 56 px, everything else 48 px, step controls at least 44 px', () => {
    expect(value('tap-lg')).toBe('56px');
    expect(value('tap')).toBe('48px');
    expect(value('tap-cell')).toBe('48px');
    expect(value('tap-step')).toBe('44px');
    expect(read('../ui/keypad/keypad.css')).toMatch(/\.keypad__key\s*\{[^}]*min-height:\s*var\(--tap-lg\)/);
    expect(read('../ui/answers/ChoiceInput.css')).toMatch(/\.ans-choice__option\s*\{[^}]*min-height:\s*var\(--tap-lg\)/);
    expect(read('../ui/answers/OrderInput.css')).toMatch(/\.ans-order__item\s*\{[^}]*min-height:\s*var\(--tap-lg\)/);
    expect(read('./base.css')).toMatch(/\.btn\s*\{[^}]*min-height:\s*var\(--tap\)/);
    expect(read('../ui/answers/PointInput.css')).toMatch(/\.pt-input__step\s*\{[^}]*width:\s*48px/);
    expect(read('../ui/answers/AngleInput.css')).toMatch(/\.ang-input__step\s*\{[^}]*min-height:\s*48px/);
  });

  it('keeps the compact short-phone rule, so that Prüfen stays visible', () => {
    expect(read('../ui/keypad/keypad.css')).toMatch(/@media \(max-width: 899px\) and \(max-height: 740px\) \{[^}]*\.keypad__submit \{ min-height: var\(--tap\)/);
  });

  it('no bouncing rewards: the summary has no pop or fade', () => {
    const css = read('../ui/practice/practice.css');
    expect(css).not.toMatch(/pr-pop|pr-fade|bounce/);
  });

  it('written calculations scroll inside their box, never the page', () => {
    expect(read('../ui/answers/WrittenInput.css')).toMatch(/\.wi-scroll\s*\{[^}]*overflow-x:\s*auto/);
    expect(read('../ui/visuals/WrittenVisual.css')).toMatch(/\.written-visual\s*\{[^}]*overflow-x:\s*auto/);
  });

  it('hit areas reach into the gaps', () => {
    const gap = 'inset:\\s*calc\\(var\\(--gap-tap\\) / -2\\)';
    expect(read('../ui/keypad/keypad.css')).toMatch(new RegExp(`\\.keypad__key::before[^}]*${gap}`));
    expect(read('./base.css')).toMatch(new RegExp(`\\.btn::before\\s*\\{[^}]*${gap}`));
    expect(read('../ui/answers/ChoiceInput.css')).toMatch(new RegExp(`\\.ans-choice__option::before\\s*\\{[^}]*${gap}`));
    expect(read('../ui/answers/OrderInput.css')).toMatch(new RegExp(`\\.ans-order__item::before\\s*\\{[^}]*${gap}`));
  });

  it('on phones the outer keys reach to the screen edge', () => {
    const css = read('../ui/keypad/keypad.css');
    expect(css).toMatch(/\.keypad__key--d7::before[^}]*left:\s*calc\(-1 \* var\(--space-4\)\)/);
    expect(css).toMatch(/\.keypad__key--back::before[^}]*right:\s*calc\(-1 \* var\(--space-4\)\)/);
  });

  it('nothing clips the hit areas', () => {
    const btn = /\.btn\s*\{([^}]*)\}/.exec(read('./base.css'))?.[1] ?? '';
    expect(btn).not.toMatch(/overflow:\s*hidden/);
    const key = /\.keypad__key\s*\{([^}]*)\}/.exec(read('../ui/keypad/keypad.css'))?.[1] ?? '';
    expect(key).not.toMatch(/overflow:\s*hidden/);
  });
});
