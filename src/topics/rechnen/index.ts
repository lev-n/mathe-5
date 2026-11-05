/** Topic "Rechnen, Klammern, Rechengesetze" (docs/research.md §6): the skills in teaching order. */
import type { TopicModule } from '../../core/types';
import { distributivSkill } from './distributiv';
import { gleichungenSkill } from './gleichungen';
import { klammernSkill } from './klammern';
import { punktVorStrichSkill } from './punkt-vor-strich';
import { rechengesetzeSkill } from './rechengesetze';
import { sachaufgabenSkill } from './sachaufgaben';
import { schriftlichGeteiltSkill } from './schriftlich-geteilt';
import { schriftlichMalSkill } from './schriftlich-mal';
import { schriftlichPlusMinusSkill } from './schriftlich-plusminus';

const topic: TopicModule = {
  topicId: 'rechnen',
  skills: [
    schriftlichPlusMinusSkill,
    schriftlichMalSkill,
    schriftlichGeteiltSkill,
    punktVorStrichSkill,
    klammernSkill,
    rechengesetzeSkill,
    distributivSkill,
    gleichungenSkill,
    sachaufgabenSkill,
  ],
};
export default topic;
