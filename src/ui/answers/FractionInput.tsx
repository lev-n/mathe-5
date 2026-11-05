/**
 * Fraction answer (docs/research.md §6): Zähler field above a bar, Nenner field below, a whole field to the left only when `whole` is set. Digits only.
 * An empty field, a Nenner 0 or (accept 'lowest') an equal value that can still be shortened gives a calm message and uses no attempt (src/core/check.ts).
 */
import { fieldText } from '../../core/check';
import type { AnswerOf } from '../../core/types';
import { describedByIds, type AnswerInputProps } from './types';
import { FieldMark, type MarkState } from './NumberInput';
import './FractionInput.css';

const digitsOnly = (raw: string) => raw.replace(/\D/g, '');

export default function FractionInput({ answer, response, onChange, disabled, result, reveal, idBase, keypad, print, describedBy }: AnswerInputProps<AnswerOf<'fraction'>>) {
  const hasWhole = answer.whole !== undefined;
  const current = response?.kind === 'fraction' ? response : { kind: 'fraction' as const, numerator: '', denominator: '', whole: '' };
  const around = [answer.unit, answer.after].filter(Boolean).join(' ');

  if (print) {
    return (
      <div className="ans-fraction ans-fraction--print">
        {answer.before && <span className="ans-number__text">{answer.before}</span>}
        {hasWhole && <span className="print-box print-box--sm" aria-hidden="true" />}
        <span className="ans-fraction__stack" aria-hidden="true">
          <span className="print-box print-box--sm" />
          <span className="ans-fraction__bar" />
          <span className="print-box print-box--sm" />
        </span>
        {around && <span className="ans-number__text">{around}</span>}
      </div>
    );
  }

  const checked = result && !result.invalid ? result : null;
  const mark: MarkState = reveal ? 'solution' : checked ? (checked.correct ? 'right' : 'wrong') : null;
  const readOnly = disabled || reveal;
  const markId = `${idBase}-fraction-mark`;
  const emit = (patch: Partial<Pick<typeof current, 'numerator' | 'denominator' | 'whole'>>) => {
    const next = { ...current, ...patch };
    onChange({ kind: 'fraction', numerator: next.numerator, denominator: next.denominator, ...(hasWhole ? { whole: next.whole ?? '' } : {}) });
  };
  const field = (part: 'numerator' | 'denominator' | 'whole', label: string, solution: number | undefined) => {
    const cls = `num-input ans-fraction__input${mark === 'wrong' ? ' is-wrong' : ''}${mark === 'right' || mark === 'solution' ? ' is-right' : ''}`;
    return (
      <input
        id={`${idBase}-fraction-${part}`}
        type="text"
        className={cls}
        inputMode={keypad ? 'none' : 'numeric'}
        enterKeyHint={part === 'denominator' ? 'done' : 'next'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={label}
        aria-invalid={mark === 'wrong' || undefined}
        aria-describedby={describedByIds(describedBy, mark && markId)}
        aria-readonly={readOnly || undefined}
        readOnly={readOnly}
        data-answer-field=""
        data-answer-wrong={mark === 'wrong' ? '' : undefined}
        value={reveal ? fieldText(solution ?? 0) : (current[part] ?? '')}
        onChange={(e) => emit({ [part]: digitsOnly(e.target.value) })}
      />
    );
  };

  return (
    <div className="ans-fraction" role="group" aria-label="Bruch">
      {answer.before && <span className="ans-number__text">{answer.before}</span>}
      {hasWhole && field('whole', 'Ganze', answer.whole)}
      <span className="ans-fraction__stack">
        {field('numerator', 'Zähler', answer.numerator)}
        <span className="ans-fraction__bar" aria-hidden="true" />
        {field('denominator', 'Nenner', answer.denominator)}
      </span>
      {around && <span className="ans-number__text">{around}</span>}
      <FieldMark state={mark} id={markId} />
    </div>
  );
}
