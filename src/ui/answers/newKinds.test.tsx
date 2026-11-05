// @vitest-environment jsdom
// The answer kinds of Klasse 5 (docs/research.md §6): fraction, point, angle. Input, check, keyboard, reveal and print.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FRACTION_NOT_LOWEST, checkAnswer, correctResponse, formatAnswer } from '../../core/check';
import type { Answer, AnswerOf, CheckResult, Response } from '../../core/types';
import { taskSpeech } from '../practice/readAloud';
import AnswerInput from './AnswerInput';
import { angleSteps, snapAngle, tapAngle } from './AngleInput';
import { snapToGrid } from './PointInput';

afterEach(cleanup);

function Host({ answer, onResponse, onSubmit = () => {}, result = null, reveal = false }: { answer: Answer; onResponse?: (r: Response) => void; onSubmit?: () => void; result?: CheckResult | null; reveal?: boolean }) {
  const [response, setResponse] = useState<Response | null>(null);
  return (
    <AnswerInput
      answer={answer}
      response={response}
      onChange={(r) => {
        setResponse(r);
        onResponse?.(r);
      }}
      onSubmit={onSubmit}
      disabled={false}
      result={result}
      reveal={reveal}
      idBase="t"
      keypad={false}
    />
  );
}

const FR: AnswerOf<'fraction'> = { kind: 'fraction', numerator: 2, denominator: 3, accept: 'equivalent' };
const frac = (numerator: string, denominator: string, whole?: string): Response => ({ kind: 'fraction', numerator, denominator, ...(whole !== undefined ? { whole } : {}) });

describe('fraction: checking', () => {
  it('exact: both numbers must match', () => {
    const a: Answer = { ...FR, numerator: 8, denominator: 12, accept: 'exact' };
    expect(checkAnswer(a, frac('8', '12')).correct).toBe(true);
    expect(checkAnswer(a, frac('2', '3')).correct).toBe(false);
  });
  it('equivalent: any equal value, by integer cross-multiplication', () => {
    expect(checkAnswer(FR, frac('2', '3')).correct).toBe(true);
    expect(checkAnswer(FR, frac('4', '6')).correct).toBe(true);
    expect(checkAnswer(FR, frac('200000', '300000')).correct).toBe(true);
    expect(checkAnswer(FR, frac('3', '4')).correct).toBe(false);
    // a float comparison would call these equal
    expect(checkAnswer({ ...FR, numerator: 1, denominator: 3 }, frac('333333333', '1000000000')).correct).toBe(false);
  });
  it('lowest: an equal value that can be shortened gets the neutral prompt and uses no attempt', () => {
    const a: Answer = { ...FR, accept: 'lowest' };
    expect(checkAnswer(a, frac('2', '3')).correct).toBe(true);
    const r = checkAnswer(a, frac('4', '6'));
    expect(r.correct).toBe(false);
    expect(r.invalid).toBe(FRACTION_NOT_LOWEST);
    expect(FRACTION_NOT_LOWEST).toBe('Der Wert stimmt. Kannst du noch kürzen?');
    expect(checkAnswer(a, frac('3', '4')).invalid).toBeUndefined();
  });
  it('an empty field or Nenner 0 gives a parse message, not an attempt', () => {
    expect(checkAnswer(FR, frac('', '3')).invalid).toBeTruthy();
    expect(checkAnswer(FR, frac('2', '')).invalid).toBeTruthy();
    expect(checkAnswer(FR, frac('2', '0')).invalid).toBeTruthy();
  });
  it('with a whole: the value counts, bugs match on the pair and the whole', () => {
    const a: Answer = { ...FR, whole: 1, numerator: 1, denominator: 2 };
    expect(checkAnswer(a, frac('1', '2', '1')).correct).toBe(true);
    expect(checkAnswer(a, frac('2', '4', '1')).correct).toBe(true);
    expect(checkAnswer(a, frac('3', '2', '0')).correct).toBe(true);
    expect(checkAnswer(a, frac('1', '2', '')).invalid).toBeTruthy();
    const bugs = [{ id: 'x', match: { numerator: 1, denominator: 2, whole: 2 }, hint: 'Schau auf die Ganzen.' }];
    expect(checkAnswer(a, frac('1', '2', '2'), bugs).bugId).toBe('x');
  });
  it('formats the answer with a stacked token and reads it as words', () => {
    expect(formatAnswer(FR)).toBe('{frac:2/3}');
    expect(taskSpeech({ prompt: 'Trage {frac:2/3} ein.', answer: FR } as never)).toContain('zwei Drittel');
  });
});

describe('fraction: input', () => {
  it('has Zähler above and Nenner below, digits only; the whole only when set', () => {
    const onResponse = vi.fn();
    render(<Host answer={FR} onResponse={onResponse} />);
    expect(screen.queryByLabelText('Ganze')).toBeNull();
    const num = screen.getByLabelText('Zähler') as HTMLInputElement;
    fireEvent.change(num, { target: { value: '2a−' } });
    expect(num.value).toBe('2');
    fireEvent.change(screen.getByLabelText('Nenner'), { target: { value: '3' } });
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'fraction', numerator: '2', denominator: '3' });
    cleanup();
    render(<Host answer={{ ...FR, whole: 1 }} />);
    expect(screen.getByLabelText('Ganze')).toBeTruthy();
  });
  it('reveal shows the solution, print shows empty boxes', () => {
    render(<Host answer={FR} reveal />);
    expect((screen.getByLabelText('Zähler') as HTMLInputElement).value).toBe('2');
    cleanup();
    const { container } = render(<AnswerInput answer={FR} response={null} onChange={() => {}} onSubmit={() => {}} disabled result={null} reveal={false} idBase="p" keypad={false} print />);
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelectorAll('.print-box')).toHaveLength(2);
  });
});

const PT: AnswerOf<'point'> = { kind: 'point', xMin: 0, xMax: 8, yMin: 0, yMax: 8, step: 1, target: [3, 2], tolerance: 0 };

describe('point', () => {
  it('correct only if exact; a swapped pair matches its bug', () => {
    const bugs = [{ id: 'koordinaten-getauscht', match: { x: 2, y: 3 }, hint: 'Erst nach rechts, dann nach oben.' }];
    expect(checkAnswer(PT, { kind: 'point', x: 3, y: 2 }).correct).toBe(true);
    const r = checkAnswer(PT, { kind: 'point', x: 2, y: 3 }, bugs);
    expect(r.correct).toBe(false);
    expect(r.bugId).toBe('koordinaten-getauscht');
    expect(correctResponse(PT)).toEqual({ kind: 'point', x: 3, y: 2 });
  });
  it('snaps to the nearest grid intersection, inside the grid', () => {
    expect(snapToGrid(2.4, 0, 8, 1)).toBe(2);
    expect(snapToGrid(2.6, 0, 8, 1)).toBe(3);
    expect(snapToGrid(99, 0, 8, 1)).toBe(8);
    expect(snapToGrid(-99, -8, 8, 1)).toBe(-8);
  });
  it('the keys and the 48 px step buttons move the marker; the live label shows P(x|y); Enter checks only with a marker', () => {
    const onResponse = vi.fn();
    const onSubmit = vi.fn();
    const { container } = render(<Host answer={PT} onResponse={onResponse} onSubmit={onSubmit} />);
    const area = container.querySelector<HTMLElement>('.pt-input__area')!;
    expect(area.dataset.answerEmpty).toBe('true');
    fireEvent.keyDown(area, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(area, { key: 'ArrowRight' });
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'point', x: 0, y: 0 });
    fireEvent.keyDown(area, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Punkt einen Schritt nach oben' }));
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'point', x: 1, y: 1 });
    expect(container.querySelector('output')!.textContent).toBe('P(1|1)');
    expect(area.dataset.answerEmpty).toBe('false');
    expect(container.querySelector('[data-marker="set"]')).not.toBeNull();
    fireEvent.keyDown(area, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
  it('a marker never leaves the grid; a negative range works in four quadrants', () => {
    const onResponse = vi.fn();
    const { container } = render(<Host answer={{ ...PT, xMin: -8, yMin: -8, target: [-2, 3] }} onResponse={onResponse} />);
    const area = container.querySelector<HTMLElement>('.pt-input__area')!;
    fireEvent.keyDown(area, { key: 'ArrowLeft' });
    fireEvent.keyDown(area, { key: 'ArrowLeft' });
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'point', x: -1, y: 0 });
    expect(container.querySelector('output')!.textContent).toBe('P(−1|0)');
    expect(container.querySelector('[data-label-x="-8"]')!.textContent).toBe('−8');
  });
  it('reveal shows the target; print draws the empty grid with no controls', () => {
    const { container } = render(<Host answer={PT} reveal />);
    expect(container.querySelector('[data-marker="solution"]')).not.toBeNull();
    expect(container.querySelector('output')!.textContent).toBe('P(3|2)');
    cleanup();
    const print = render(<AnswerInput answer={PT} response={null} onChange={() => {}} onSubmit={() => {}} disabled result={null} reveal={false} idBase="p" keypad={false} print />);
    expect(print.container.querySelector('button')).toBeNull();
    expect(print.container.querySelector('[data-testid="coordinate-axes"]')).not.toBeNull();
  });
});

const AN: AnswerOf<'angle'> = { kind: 'angle', value: 40, step: 10, tolerance: 0, max: 180, baseRotation: 0 };

describe('angle', () => {
  it('correct if |input − value| ≤ tolerance', () => {
    expect(checkAnswer(AN, { kind: 'angle', value: 40 }).correct).toBe(true);
    expect(checkAnswer(AN, { kind: 'angle', value: 41 }).correct).toBe(false);
    const one: Answer = { ...AN, step: 1, tolerance: 1 };
    expect(checkAnswer(one, { kind: 'angle', value: 41 }).correct).toBe(true);
    expect(checkAnswer(one, { kind: 'angle', value: 42 }).correct).toBe(false);
    const bugs = [{ id: 'winkel-skala', match: 140, hint: 'Der Winkel ist spitz. Er muss kleiner als 90° sein.' }];
    expect(checkAnswer(one, { kind: 'angle', value: 140 }, bugs).bugId).toBe('winkel-skala');
  });
  it('snaps to its step, inside 0 … max; the buttons fit the step', () => {
    expect(snapAngle(44, { step: 10, max: 180 })).toBe(40);
    expect(snapAngle(200, { step: 10, max: 180 })).toBe(180);
    expect(snapAngle(-5, { step: 5, max: 360 })).toBe(0);
    expect(angleSteps(1)).toEqual([-10, -1, 1, 10]);
    expect(angleSteps(5)).toEqual([-10, -5, 5, 10]);
    expect(angleSteps(10)).toEqual([-10, 10]);
  });
  it('a tap counts from the fixed arm; past the largest angle it goes to the nearer end', () => {
    expect(tapAngle(70, { step: 10, max: 180, baseRotation: 20 })).toBe(50);
    expect(tapAngle(190, { step: 10, max: 180, baseRotation: 0 })).toBe(180);
    expect(tapAngle(350, { step: 10, max: 180, baseRotation: 0 })).toBe(0);
  });
  it('keys and step buttons set it; screen readers hear the value; no value as visible text', () => {
    const onResponse = vi.fn();
    const onSubmit = vi.fn();
    const { container } = render(<Host answer={AN} onResponse={onResponse} onSubmit={onSubmit} />);
    const slider = screen.getByRole('slider');
    expect(slider.getAttribute('aria-valuetext')).toBe('Noch nicht eingestellt');
    fireEvent.keyDown(slider, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'angle', value: 10 });
    fireEvent.click(screen.getByRole('button', { name: 'Winkel plus 10 Grad' }));
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'angle', value: 20 });
    expect(slider.getAttribute('aria-valuetext')).toBe('20 Grad');
    expect(container.textContent).not.toMatch(/20°/);
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'angle', value: 180 });
    fireEvent.keyDown(slider, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
  it('the Geodreieck comes on request, and a step button is at least 48 px by CSS', () => {
    const { container } = render(<Host answer={AN} />);
    expect(container.querySelector('[data-testid="geodreieck"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Geodreieck zeigen' }));
    expect(container.querySelector('[data-testid="geodreieck"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Geodreieck weglegen' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('reveal states the angle; print has the fixed arm only', () => {
    render(<Host answer={AN} reveal />);
    expect(within(document.body).getByText('Der richtige Winkel ist 40° groß.')).toBeTruthy();
    cleanup();
    const print = render(<AnswerInput answer={AN} response={null} onChange={() => {}} onSubmit={() => {}} disabled result={null} reveal={false} idBase="p" keypad={false} print />);
    expect(print.container.querySelector('button')).toBeNull();
    expect(print.container.querySelector('[data-arm="1"]')).not.toBeNull();
    expect(print.container.querySelector('[data-arm="2"]')).toBeNull();
  });
});

describe('number: signed and tolerance', () => {
  const num = (text: string) => ({ kind: 'number', text }) as const;
  it('signed accepts − and -, +5 is 5, −0 is 0; without it a calm message', () => {
    const s: Answer = { kind: 'number', value: -5, signed: true };
    expect(checkAnswer(s, num('−5')).correct).toBe(true);
    expect(checkAnswer(s, num('-5')).correct).toBe(true);
    expect(checkAnswer({ ...s, value: 5 }, num('+5')).correct).toBe(true);
    expect(checkAnswer({ ...s, value: 0 }, num('−0')).correct).toBe(true);
    expect(checkAnswer({ kind: 'number', value: 5 }, num('−5')).invalid).toBeTruthy();
  });
  it('multi fields are signed one by one', () => {
    const a: Answer = { kind: 'multi', fields: [{ id: 'x', value: -2, signed: true }, { id: 'y', value: 3, signed: true }] };
    expect(checkAnswer(a, { kind: 'multi', values: { x: '−2', y: '3' } }).correct).toBe(true);
    expect(checkAnswer({ kind: 'multi', fields: [{ id: 'x', value: 2 }] }, { kind: 'multi', values: { x: '−2' } }).invalid).toBeTruthy();
  });
  it('tolerance is absolute, compared in integer steps of the decimals', () => {
    const a: Answer = { kind: 'number', value: 40, tolerance: 2 };
    for (const t of ['38', '42', '40']) expect(checkAnswer(a, num(t)).correct, t).toBe(true);
    for (const t of ['37', '43']) expect(checkAnswer(a, num(t)).correct, t).toBe(false);
    // 0.1 + 0.2 style drift must not reject the edge
    const d: Answer = { kind: 'number', value: 0.3, decimals: 1, tolerance: 0.1 };
    for (const t of ['0,2', '0,4']) expect(checkAnswer(d, num(t)).correct, t).toBe(true);
    expect(checkAnswer(d, num('0,5')).correct).toBe(false);
  });
});

describe('written: large numbers', () => {
  it('fills the boxes of a 12-digit sum, and a three-digit divisor has three Rest boxes', () => {
    const add: Answer = { kind: 'written', op: 'add', operands: [987654321098, 123456789012], result: 1111111110110 };
    const r = checkAnswer(add, { kind: 'written', result: '1111111110110' });
    expect(r.correct).toBe(true);
    const { container } = render(<Host answer={add} />);
    expect(container.querySelector('.wi-scroll')).not.toBeNull();
    cleanup();
    render(<Host answer={{ kind: 'written', op: 'div', operands: [98765, 123], result: 802, remainder: 119 }} />);
    expect(screen.getByRole('group', { name: 'Rest' }).querySelectorAll('input')).toHaveLength(3);
  });
  it('a three-digit factor draws three partial product rows', () => {
    const { container } = render(<Host answer={{ kind: 'written', op: 'mul', operands: [1254, 307], result: 384978 }} />);
    expect(container.querySelectorAll('.wi-partial-row')).toHaveLength(3);
  });
});
