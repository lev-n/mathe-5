/**
 * Netz (hexomino) on a grid. faces[i] labels cells[i]: a letter, a number, '?' or a word ('oben').
 * groups[i]: the face cells[i] belongs to, for a Quader net whose faces span several cells. Lines inside a face are thin, fold lines between faces thick; a label is drawn once per face.
 */
import type { Cell, VisualOf } from '../../core/types';
import type { VisualProps } from './types';

const CELL = 68;
const PAD = 6;

export function netAriaLabel(cells: readonly Cell[], faces?: readonly (string | null)[], groups?: readonly number[]): string {
  const order = cells.map((c, i) => ({ c, i })).sort((a, b) => a.c[1] - b.c[1] || a.c[0] - b.c[0]);
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  const rows = new Map<number, string[]>();
  for (const { c, i } of order) {
    const label = faces?.[i];
    const text = `Spalte ${c[0] - minX + 1}${label ? ` (${label === '?' ? 'Fragezeichen' : label})` : ''}`;
    const y = c[1] - minY;
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y)!.push(text);
  }
  const faceCount = groups ? new Set(groups).size : cells.length;
  const head = groups ? `Netz aus ${faceCount} Flächen auf ${cells.length} Kästchen.` : `Netz aus ${cells.length} Quadraten.`;
  return `${head} ${[...rows.entries()].map(([y, t]) => `Zeile ${y + 1}: ${t.join(', ')}`).join('. ')}.`;
}

export default function NetVisual({ visual, print }: VisualProps<VisualOf<'net'>>) {
  const { cells, faces, groups } = visual;
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  const w = Math.max(...cells.map((c) => c[0])) - minX + 1;
  const h = Math.max(...cells.map((c) => c[1])) - minY + 1;
  const W = w * CELL + 2 * PAD;
  const H = h * CELL + 2 * PAD;
  return (
    <svg className="visual visual-net" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={netAriaLabel(cells, faces, groups)}>
      {cells.map(([cx, cy], i) => {
        const x = PAD + (cx - minX) * CELL;
        const y = PAD + (cy - minY) * CELL;
        // In a group the first cell carries the face's label.
        const label = groups && groups.indexOf(groups[i]) !== i ? null : (faces?.[i] ?? null);
        const long = !!label && label.length > 2;
        return (
          <g key={`${cx},${cy}`} data-cell={`${cx},${cy}`}>
            <rect
              x={x} y={y} width={CELL} height={CELL}
              style={{ fill: (print ? 'var(--surface)' : 'var(--primary-soft)'), stroke: groups ? 'none' : 'var(--ink)', strokeWidth: 2.5 }}
            />
            {label && (
              <text
                x={x + CELL / 2}
                y={y + CELL / 2}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fill: 'var(--text)', fontSize: long ? 16 : 28, fontWeight: 700 }}
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
      {groups && cells.map(([cx, cy], i) => {
        const x = PAD + (cx - minX) * CELL;
        const y = PAD + (cy - minY) * CELL;
        const neighbour = (dx: number, dy: number) => cells.findIndex((c) => c[0] === cx + dx && c[1] === cy + dy);
        const edges: [number, number, number, number, number, number][] = [[0, -1, x, y, x + CELL, y], [1, 0, x + CELL, y, x + CELL, y + CELL], [0, 1, x, y + CELL, x + CELL, y + CELL], [-1, 0, x, y, x, y + CELL]];
        return edges.map(([dx, dy, x1, y1, x2, y2]) => {
          const n = neighbour(dx, dy);
          const inner = n >= 0 && groups[n] === groups[i];
          return <line key={`${i}:${dx},${dy}`} x1={x1} y1={y1} x2={x2} y2={y2} data-edge={inner ? 'inner' : 'fold'} style={{ stroke: 'var(--ink)', strokeWidth: inner ? 1 : 3 }} />;
        });
      })}
    </svg>
  );
}
