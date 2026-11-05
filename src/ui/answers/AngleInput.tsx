/**
 * Set an angle (docs/research.md §6): one arm is fixed at baseRotation, and the child sets the other by tapping near the arc or with step buttons and
 * arrow keys. The value snaps to `step`. The Geodreieck is shown on request, as in class. The value is never shown as visible text (reading it off
 * the tool is the task); screen readers get it through aria-valuetext. This replaces free drawing, which is not auto-checkable.
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { fmtAngle } from '../../core/format';
import type { AnswerOf } from '../../core/types';
import { ANGLE, AngleDrawing, angleGeometry } from '../visuals/AngleVisual';
import { describedByIds, type AnswerInputProps } from './types';
import './AngleInput.css';

/** Snap to the step and keep the value in 0 … max. */
export function snapAngle(v: number, a: Pick<AnswerOf<'angle'>, 'step' | 'max'>): number {
  return Math.min(a.max, Math.max(0, Math.round(v / a.step) * a.step));
}

/**
 * The angle of a tap, counterclockwise from the fixed arm: `degrees` is the direction of the tap (0 = right, counterclockwise). A tap past the largest
 * angle goes to the nearer end.
 */
export function tapAngle(direction: number, a: Pick<AnswerOf<'angle'>, 'step' | 'max' | 'baseRotation'>): number {
  const relative = ((direction - a.baseRotation) % 360 + 360) % 360;
  if (relative <= a.max) return snapAngle(relative, a);
  return relative - a.max < 360 - relative ? a.max : 0;
}

/** The step buttons of §6, those that fit the step: −10, −1, +1, +10 (step 1), −10, −5, +5, +10 (step 5), −10, +10 (step 10). */
export function angleSteps(step: 1 | 5 | 10): number[] {
  return step === 10 ? [-10, 10] : step === 5 ? [-10, -5, 5, 10] : [-10, -1, 1, 10];
}

const signed = (d: number) => `${d > 0 ? '+' : '−'}${Math.abs(d)}`;

export default function AngleInput({ answer, response, onChange, onSubmit, disabled, result, reveal, idBase, print, describedBy }: AnswerInputProps<AnswerOf<'angle'>>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState(false);
  const value = response?.kind === 'angle' && Number.isFinite(response.value) ? response.value : null;
  const geo = angleGeometry(answer.baseRotation, answer.max);

  if (print) {
    return (
      <div className="ang-input ang-input--print">
        <svg className="visual ang-input__svg" viewBox={geo.viewBox} width={geo.W} height={geo.H} role="img" aria-label="Ein fester Schenkel mit Scheitel. Zeichne den zweiten Schenkel ein.">
          <AngleDrawing degrees={0} baseRotation={answer.baseRotation} arm1={1} arm2={0} showArc={false} print />
        </svg>
      </div>
    );
  }

  const set = (v: number) => {
    if (disabled) return;
    const s = snapAngle(v, answer);
    if (s !== value) onChange({ kind: 'angle', value: s });
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const dir = geo.directionAt(((e.clientX - rect.left) / rect.width) * geo.W, ((e.clientY - rect.top) / rect.height) * geo.H);
    if (dir !== null) onChange({ kind: 'angle', value: tapAngle(dir, answer) });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const base = value ?? 0;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        set(base + answer.step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        set(base - answer.step);
        break;
      case 'PageUp':
        set(base + 10);
        break;
      case 'PageDown':
        set(base - 10);
        break;
      case 'Home':
        set(0);
        break;
      case 'End':
        set(answer.max);
        break;
      case 'Enter':
        if (value !== null) onSubmit();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const checked = result !== null && !result.invalid && !reveal;
  const fits = value !== null && Math.abs(value - answer.value) <= answer.tolerance;
  const own = checked ? (result.correct ? 'right' : 'wrong') : reveal ? (fits ? 'right' : 'wrong') : 'set';
  const statusId = `${idBase}-angle-status`;
  const helpId = `${idBase}-angle-help`;
  const shown = reveal && !fits ? answer.value : value;

  return (
    <div className="ang-input">
      <p className="ang-input__help" id={helpId}>
        Tippe in die Richtung des zweiten Schenkels. Mit den Knöpfen oder den Pfeiltasten stellst du den Winkel genau ein.
      </p>
      <div
        className={`ang-input__area${disabled ? ' is-disabled' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label="Zweiter Schenkel des Winkels"
        aria-describedby={describedByIds(describedBy, helpId, (checked || reveal) && statusId)}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={answer.max}
        aria-valuenow={value ?? 0}
        aria-valuetext={value === null ? 'Noch nicht eingestellt' : `${value} Grad`}
        aria-disabled={disabled || undefined}
        data-answer-field=""
        data-answer-enter="self"
        data-answer-empty={String(value === null)}
        data-answer-wrong={checked && !result.correct ? '' : undefined}
        onKeyDown={onKeyDown}
      >
        <svg ref={svgRef} className="visual ang-input__svg" viewBox={geo.viewBox} width={geo.W} height={geo.H} aria-hidden="true" focusable="false" onPointerUp={onPointerUp}>
          <rect x={geo.x0} y={geo.y0} width={geo.W} height={geo.H} style={{ fill: 'transparent' }} />
          <AngleDrawing degrees={shown ?? 0} baseRotation={answer.baseRotation} arm1={1} arm2={shown === null ? 0 : 1} showArc={shown !== null && shown > 0} tool={tool ? 'geodreieck' : 'none'} state={reveal ? 'solution' : own} />
          {reveal && !fits && value !== null && (
            <line x1={ANGLE.CX} y1={ANGLE.CY} x2={ANGLE.CX + ANGLE.R * Math.cos(((answer.baseRotation + value) * Math.PI) / 180)} y2={ANGLE.CY - ANGLE.R * Math.sin(((answer.baseRotation + value) * Math.PI) / 180)} data-own-arm="" style={{ stroke: 'var(--retry)', strokeWidth: 3, strokeDasharray: '6 5' }} />
          )}
        </svg>
      </div>
      <div className="ang-input__controls">
        <div className="ang-input__steps">
          {angleSteps(answer.step).map((d) => (
            <button key={d} type="button" className="ang-input__step" aria-label={`Winkel ${d > 0 ? 'plus' : 'minus'} ${Math.abs(d)} Grad`} disabled={disabled} onClick={() => set((value ?? 0) + d)}>
              {signed(d)}
            </button>
          ))}
        </div>
        <button type="button" className="btn ang-input__tool" aria-pressed={tool} onClick={() => setTool((t) => !t)}>
          {tool ? 'Geodreieck weglegen' : 'Geodreieck zeigen'}
        </button>
      </div>
      {(checked || reveal) && (
        <p className={`ang-input__status ang-input__status--${reveal ? 'solution' : own}`} id={statusId}>
          {reveal ? `Der richtige Winkel ist ${fmtAngle(answer.value)} groß.` : own === 'right' ? 'Dein Winkel stimmt.' : 'Dein Winkel stimmt noch nicht.'}
        </p>
      )}
    </div>
  );
}
