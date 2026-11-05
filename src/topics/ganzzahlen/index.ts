/** Topic "Negative Zahlen" (docs/research.md §6): the skills in teaching order. */
import type { TopicModule } from '../../core/types';
import { aenderungenSkill } from './aenderungen';
import { alltagSkill } from './alltag';
import { betragSkill } from './betrag';
import { malgeteiltSkill } from './malgeteilt';
import { plusminusSkill } from './plusminus';
import { termeSkill } from './terme';
import { vergleichenSkill } from './vergleichen';
import { vorzeichenSkill } from './vorzeichen';
import { zahlengeradeSkill } from './zahlengerade';

const topic: TopicModule = {
  topicId: 'ganzzahlen',
  skills: [alltagSkill, zahlengeradeSkill, vergleichenSkill, aenderungenSkill, betragSkill, plusminusSkill, vorzeichenSkill, malgeteiltSkill, termeSkill],
};
export default topic;
