// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Visual } from '../../core/types';
import VisualView from './Visual';

afterEach(cleanup);

/** Width for a picture in a practice card on a 375 px phone: 343 px page minus 16 px card padding on both sides. */
const PHONE_CONTENT = 311;

const WIDEST: Visual[] = [
  { type: 'dotArray', groups: Array.from({ length: 10 }, () => 10) },
  { type: 'money', items: [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] },
];

describe('new visuals on a phone', () => {
  it.each(WIDEST.map((v, i) => [`${v.type} ${i}`, v] as const))('%s fits the card at 375 px without shrinking', (_name, visual) => {
    const { container } = render(<VisualView visual={visual} />);
    const svg = container.querySelector('svg.visual')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')?.length).toBeGreaterThan(0);
    expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(PHONE_CONTENT);
    // A picture narrower than its container never overflows: base.css sets .visual { max-width: 100%; height: auto }.
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 \d/);
  });

  it('the Zahlenstrahl keeps a minimum width that fits the card', () => {
    const { container } = render(<VisualView visual={{ type: 'numberLine', min: 0, max: 100, majorStep: 10, minorStep: 5, labelMajor: true, jumps: [{ from: 40, to: 45, label: '+ 5' }] }} />);
    const box = container.querySelector<HTMLElement>('.nl-scroll')!;
    expect(parseInt(box.style.getPropertyValue('--nl-min-width'), 10)).toBeLessThanOrEqual(PHONE_CONTENT);
  });

  it('a long label at the end of a Zahlenstrahl is never cut: the drawing widens by the room it needs', () => {
    const { container } = render(<VisualView visual={{ type: 'numberLine', min: 10_000_000_000, max: 10_500_000_000, majorStep: 100_000_000, minorStep: 50_000_000, labelMajor: false, labels: [10_000_000_000, 10_500_000_000] }} />);
    const [x, , w] = container.querySelector('svg')!.getAttribute('viewBox')!.split(' ').map(Number);
    // '10 000 000 000': 14 characters of 18 px at about 0.58 em, centred on the first tick at x = 30
    expect(x).toBeLessThanOrEqual(-40);
    expect(w).toBeGreaterThanOrEqual(480);
  });
});
