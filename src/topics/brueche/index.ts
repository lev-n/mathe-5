/** Topic "Brüche und Dezimalzahlen" (docs/research.md §6), skills in teaching order. */
import type { TopicModule } from '../../core/types';
import { alltagSkill } from './alltag';
import { anteileSkill } from './anteile';
import { bruchteileSkill } from './bruchteile';
import { dezimalLesenSkill } from './dezimal-lesen';
import { dezimalOrdnenSkill } from './dezimal-ordnen';
import { dezimalRechnenSkill } from './dezimal-rechnen';
import { erweiternSkill } from './erweitern';
import { gleichnamigSkill } from './gleichnamig';
import { vergleichenSkill } from './vergleichen';

const topic: TopicModule = {
  topicId: 'brueche',
  skills: [alltagSkill, anteileSkill, bruchteileSkill, erweiternSkill, vergleichenSkill, gleichnamigSkill, dezimalLesenSkill, dezimalOrdnenSkill, dezimalRechnenSkill],
};
export default topic;
