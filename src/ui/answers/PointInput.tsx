/**
 * Plot a point (docs/research.md §6): a tap moves the marker to the nearest grid intersection, no drag is needed. Four step buttons and the arrow keys
 * move it one step. The live label shows P(x|y). Prüfen stays disabled until a marker exists (isEmptyResponse), and the answer is correct only if exact.
 */
import { type KeyboardEvent, type PointerEvent, useRef } from 'react';
import { fmtPoint, toSpeech } from '../../core/format';
import type { AnswerOf, GridPoint } from '../../core/types';
import { CoordinateAxes, coordinateAriaLabel, gridGeometry, type GridSpec } from '../visuals/CoordinateGridVisual';
import { describedByIds, type AnswerInputProps } from './types';
import './PointInput.css';

type Marker = 'set' | 'wrong' | 'right' | 'solution';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** The nearest grid value to v on an axis from min to max. */
export function snapToGrid(v: number, min: number, max: number, step: number): number {
  return clamp(min + Math.round((v - min) / step) * step, min, max);
}

const DIRS = [
  { key: 'ArrowUp', dx: 0, dy: 1, label: 'Punkt einen Schritt nach oben', path: 'M12 5l7 9H5z' },
  { key: 'ArrowLeft', dx: -1, dy: 0, label: 'Punkt einen Schritt nach links', path: 'M5 12l9-7v14z' },
  { key: 'ArrowRight', dx: 1, dy: 0, label: 'Punkt einen Schritt nach rechts', path: 'M19 12l-9 7V5z' },
  { key: 'ArrowDown', dx: 0, dy: -1, label: 'Punkt einen Schritt nach unten', path: 'M12 19l-7-9h14z' },
] as const;

function PointMark({ x, y, state, label, flip }: { x: number; y: number; state: Marker; label?: string; flip?: boolean }) {
  const colour = state === 'wrong' ? 'var(--retry)' : state === 'set' ? 'var(--primary)' : 'var(--ok)';
  return (
    <g data-marker={state}>
      <circle cx={x} cy={y} r={9} style={{ fill: state === 'wrong' ? 'var(--retry-soft)' : colour, stroke: colour, strokeWidth: 3, strokeDasharray: state === 'wrong' ? '4 3' : undefined }} />
      {label && (
        <text x={flip ? x - 13 : x + 13} y={y < 30 ? y + 26 : y - 11} textAnchor={flip ? 'end' : undefined} style={{ fill: colour, fontSize: 18, fontWeight: 700 }}>
          {label}
        </text>
      )}
    </g>
  );
}

export default function PointInput({ answer, response, onChange, onSubmit, disabled, result, reveal, idBase, print, describedBy }: AnswerInputProps<AnswerOf<'point'>>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const name = answer.name ?? 'P';
  const spec: GridSpec = { xMin: answer.xMin, xMax: answer.xMax, yMin: answer.yMin, yMax: answer.yMax, step: answer.step, labelStep: answer.labelStep ?? answer.step, axisNames: answer.axisNames };
  const geo = gridGeometry(spec);
  const given: GridPoint[] = answer.points ?? [];
  const value = response?.kind === 'point' && Number.isFinite(response.x) && Number.isFinite(response.y) ? { x: response.x, y: response.y } : null;
  const label = `${coordinateAriaLabel({ ...spec, points: given, segments: answer.segments })} Punkt ${name} setzen.`;

  if (print) {
    return (
      <div className="pt-input pt-input--print">
        <svg className="visual pt-input__svg" viewBox={`0 0 ${geo.W} ${geo.H}`} width={geo.W} height={geo.H} role="img" aria-label={label}>
          <CoordinateAxes spec={spec} points={given} segments={answer.segments} print />
        </svg>
      </div>
    );
  }

  const set = (x: number, y: number) => {
    if (disabled) return;
    const nx = snapToGrid(x, answer.xMin, answer.xMax, answer.step);
    const ny = snapToGrid(y, answer.yMin, answer.yMax, answer.step);
    if (!value || nx !== value.x || ny !== value.y) onChange({ kind: 'point', x: nx, y: ny });
  };
  /** One step; the first press sets the marker at the origin, or as near to it as the grid allows. */
  const step = (dx: number, dy: number) => {
    if (!value) return set(clamp(0, answer.xMin, answer.xMax), clamp(0, answer.yMin, answer.yMax));
    set(value.x + dx * answer.step, value.y + dy * answer.step);
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const { x, y } = geo.valueAt(((e.clientX - rect.left) / rect.width) * geo.W, ((e.clientY - rect.top) / rect.height) * geo.H);
    set(x, y);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = DIRS.find((d) => d.key === e.key);
    if (dir) {
      e.preventDefault();
      step(dir.dx, dir.dy);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (value) onSubmit();
    }
  };

  const checked = result !== null && !result.invalid && !reveal;
  const state: Marker = checked ? (result.correct ? 'right' : 'wrong') : reveal ? (value && value.x === answer.target[0] && value.y === answer.target[1] ? 'right' : 'wrong') : 'set';
  const showOwn = value !== null && !(reveal && state === 'right');
  const liveId = `${idBase}-point-live`;
  const helpId = `${idBase}-point-help`;
  const shown = value ? fmtPoint(name, value.x, value.y) : null;

  return (
    <div className="pt-input">
      <p className="pt-input__help" id={helpId}>
        Tippe auf einen Gitterpunkt. Mit den Knöpfen oder den Pfeiltasten schiebst du den Punkt um einen Schritt.
      </p>
      <div
        className={`pt-input__area${disabled ? ' is-disabled' : ''}`}
        role="group"
        tabIndex={0}
        aria-label={label}
        aria-describedby={describedByIds(describedBy, helpId, liveId)}
        data-answer-field=""
        data-answer-enter="self"
        data-answer-empty={String(value === null)}
        data-answer-wrong={checked && !result.correct ? '' : undefined}
        onKeyDown={onKeyDown}
      >
        <svg ref={svgRef} className="visual pt-input__svg" viewBox={`0 0 ${geo.W} ${geo.H}`} width={geo.W} height={geo.H} aria-hidden="true" focusable="false" onPointerUp={onPointerUp}>
          <rect x={0} y={0} width={geo.W} height={geo.H} style={{ fill: 'transparent' }} />
          <CoordinateAxes spec={spec} points={given} segments={answer.segments} />
          {showOwn && value && <PointMark x={geo.xOf(value.x)} y={geo.yOf(value.y)} state={state} />}
          {reveal && <PointMark x={geo.xOf(answer.target[0])} y={geo.yOf(answer.target[1])} state="solution" label={name} flip={answer.target[0] === answer.xMax} />}
        </svg>
      </div>
      <div className="pt-input__controls">
        <output className="pt-input__live" id={liveId} aria-live="polite" aria-label={shown ? toSpeech(shown) : 'Noch kein Punkt gesetzt'}>
          {reveal ? fmtPoint(name, answer.target[0], answer.target[1]) : (shown ?? `${name}(?|?)`)}
        </output>
        <div className="pt-input__steps">
          {DIRS.map((d) => (
            <button key={d.key} type="button" className={`pt-input__step pt-input__step--${d.key}`} aria-label={d.label} disabled={disabled} onClick={() => step(d.dx, d.dy)}>
              <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden="true" focusable="false">
                <path d={d.path} style={{ fill: 'currentColor' }} />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
