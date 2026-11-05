/** Topic "Geometrie": Figuren, Lage, Winkel (docs/research.md §6). Skills in teaching order. */
import type { TopicModule } from '../../core/types';
import { grundbegriffeSkill } from './grundbegriffe';
import { koordinatenSkill } from './koordinaten';
import { lageSkill } from './lage';
import { scheitelSkill } from './scheitel';
import { symmetrieSkill } from './symmetrie';
import { viereckeSkill } from './vierecke';
import { winkelArtenSkill } from './winkel-arten';
import { winkelMessenSkill } from './winkel-messen';
import { winkelZeichnenSkill } from './winkel-zeichnen';

const topic: TopicModule = {
  topicId: 'geometrie',
  skills: [grundbegriffeSkill, lageSkill, koordinatenSkill, winkelArtenSkill, winkelMessenSkill, winkelZeichnenSkill, scheitelSkill, viereckeSkill, symmetrieSkill],
};
export default topic;
