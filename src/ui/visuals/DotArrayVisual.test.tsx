// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DotArrayVisual, { dotArrayAriaLabel } from './DotArrayVisual';

describe('DotArrayVisual', () => {
  it('draws rows × cols dots with a German aria-label', () => {
    const { container } = render(<DotArrayVisual visual={{ type: 'dotArray', rows: 6, cols: 7 }} />);
    expect(container.querySelectorAll('circle')).toHaveLength(42);
    const label = screen.getByRole('img').getAttribute('aria-label');
    expect(label).toBe('Punktefeld: 6 Reihen mit je 7 Punkten.');
  });

  it('calls one box a pile, not a group: a task may ask how many groups it makes', () => {
    expect(dotArrayAriaLabel({ type: 'dotArray', groups: [12] })).toBe('12 Punkte.');
    expect(dotArrayAriaLabel({ type: 'dotArray', groups: [1] })).toBe('1 Punkt.');
    expect(dotArrayAriaLabel({ type: 'dotArray', groups: [4, 4] })).toBe('Punkte in 2 Gruppen mit je 4 Punkten.');
  });

  it('uses singular forms', () => {
    expect(dotArrayAriaLabel({ type: 'dotArray', rows: 1, cols: 1 })).toBe('Punktefeld: 1 Reihe mit je 1 Punkt.');
  });
});

describe('DotArrayVisual: repeated splits and groups', () => {
  it('draws equal groups, each in a frame', () => {
    const { container } = render(<DotArrayVisual visual={{ type: 'dotArray', groups: [4, 4, 4] }} print />);
    expect(container.querySelectorAll('[data-group]')).toHaveLength(3);
    expect(container.querySelectorAll('circle')).toHaveLength(12);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Punkte in 3 Gruppen mit je 4 Punkten.');
  });

  it('names unequal groups, draws dot pairs, and wraps to a phone width', () => {
    expect(dotArrayAriaLabel({ type: 'dotArray', groups: [5, 5, 2] })).toBe('Punkte in 3 Gruppen: 5, 5 und 2 Punkte.');
    const { container } = render(<DotArrayVisual visual={{ type: 'dotArray', groups: Array.from({ length: 10 }, () => 10), perRow: 5 }} />);
    const svg = screen.getByRole('img');
    expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(310);
    expect(container.querySelectorAll('circle')).toHaveLength(100);
  });
});
