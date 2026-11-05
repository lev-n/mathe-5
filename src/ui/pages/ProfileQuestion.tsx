/**
 * The optional question (docs/research.md §2.5): shown once, skippable, it never gates practice. Stored only after consent, like every setting; without it the
 * answer holds for the session. After the question no school label is shown. ProfileSetting offers the same four answers later, under Einstellungen.
 */
import { useEffect, useState } from 'react';
import { PROFILE_AFTER, PROFILE_ANSWERS, PROFILE_QUESTION } from '../../data/profiles';
import type { ProfileId } from '../../core/types';
import { store } from '../../state/store';
import { useSettings } from '../../state/useProgress';

export function ProfileQuestion() {
  const { profileAsked } = useSettings();
  const [answered, setAnswered] = useState(false);
  // Not in the prerendered page: search engines and returning visitors never see it (nothing may flash before the stored settings are read). Its room is held, as the
  // answer buttons must not push the topics away under a finger on the way to a topic; without consent every visit is a first visit.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="profile-slot" aria-hidden="true" />;
  if (answered) {
    return (
      <p className="profile-after" role="status" data-testid="profile-after">
        {PROFILE_AFTER}
      </p>
    );
  }
  if (profileAsked) return null;

  const answer = (profile: ProfileId) => {
    store.updateSettings({ profile, profileAsked: true });
    setAnswered(true);
  };
  return (
    <section className="profile-question card" aria-labelledby="profile-title" data-testid="profile-question">
      <h2 id="profile-title">{PROFILE_QUESTION.title}</h2>
      <p>{PROFILE_QUESTION.text}</p>
      <div className="profile-question__answers">
        {PROFILE_ANSWERS.map((a) => (
          <button key={a.id} type="button" className="btn profile-question__answer" onClick={() => answer(a.id)}>
            {a.label}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn--text profile-question__skip" onClick={() => store.updateSettings({ profileAsked: true })}>
        Überspringen
      </button>
    </section>
  );
}

/** The question again, for later (Einstellungen). Says only what the choice changes. */
export function ProfileSetting({ intro }: { intro: string }) {
  const { profile } = useSettings();
  return (
    <fieldset className="choice-group setting" data-testid="profile-setting">
      <legend>{PROFILE_QUESTION.title}</legend>
      <p className="hint setting__hint">{intro}</p>
      <div className="check-list">
        {PROFILE_ANSWERS.map((a) => (
          <label key={a.id} className="check-row">
            <input type="radio" name="set-profile" value={a.id} checked={profile === a.id} onChange={() => store.updateSettings({ profile: a.id, profileAsked: true })} />
            <span>
              <span className="check-row__title">{a.label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
