// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Exercise, Visual } from '../../core/types';
import VisualView from '../../ui/visuals/Visual';
import topic from './index';
import { allItems } from './testing';

afterEach(cleanup);

function visualsOf(ex: Exercise): Visual[] {
  const options = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => (o.visual ? [o.visual] : [])) : [];
  const steps = ex.steps.flatMap((s) => (typeof s !== 'string' && s.visual ? [s.visual] : []));
  return [...(ex.visual ? [ex.visual] : []), ...options, ...steps];
}

describe('flaeche: every picture renders with a description', () => {
  it.each(topic.skills.map((s) => [s.id, s] as const))('%s', (_id, skill) => {
    let seen = 0;
    for (const ex of allItems(skill, undefined, 6)) {
      for (const visual of visualsOf(ex)) {
        const { container, unmount } = render(<VisualView visual={visual} />);
        const pic = container.querySelector('[role="img"], table');
        expect(pic, `${ex.key}: ${visual.type}`).not.toBeNull();
        if (pic?.getAttribute('role') === 'img') expect(pic.getAttribute('aria-label')?.length, ex.key).toBeGreaterThan(0);
        unmount();
        seen++;
      }
    }
    if (skill.id !== 'flaeche.koerper') expect(seen).toBeGreaterThan(0);
  });
});
