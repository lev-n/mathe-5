// T16 for this topic; src/ui/practice/speech.test.ts covers all topics at once.
import { describe, expect, it } from 'vitest';
import { taskSpeech } from '../../ui/practice/readAloud';
import topic from './index';
import { allItems } from './testing';
import { umfangSkill } from './umfang';

const RAW_SIGN = /[·□−<>=+]|(^|\s):(\s|$)/;

describe('flaeche: read-aloud', () => {
  it('a formula is never read with the unit Ar', () => {
    for (const ex of allItems(umfangSkill, undefined, 60)) {
      expect(taskSpeech(ex, ex.hints), ex.key).not.toMatch(/\bAr\b/);
      expect(ex.srText, ex.key).not.toMatch(/\bAr\b/);
    }
  });

  it.each(topic.skills.map((s) => [s.id, s] as const))('%s says signs as words and no raw unit symbol', (_id, skill) => {
    for (const ex of allItems(skill, undefined, 12)) {
      const said = taskSpeech(ex, ex.hints);
      expect(said, ex.key).not.toMatch(RAW_SIGN);
      expect(said, `${ex.key}: ${said}`).not.toMatch(/(mm|cm|dm|km|m)[²³]/);
      expect(ex.srText, ex.key).not.toMatch(/[·□−]/);
    }
  });
});
