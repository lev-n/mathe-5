/** Topic "Größen und Maßstab" (docs/research.md §6), skills in teaching order. */
import type { TopicModule } from '../../core/types';
import { einheitenSkill } from './einheiten';
import { kommaSkill } from './komma';
import { massstabSkill } from './massstab';
import { rechnenSkill } from './rechnen';
import { sachaufgabenSkill } from './sachaufgaben';
import { schaetzenSkill } from './schaetzen';
import { schlussrechnungSkill } from './schlussrechnung';

const topic: TopicModule = {
  topicId: 'groessen',
  skills: [einheitenSkill, kommaSkill, schaetzenSkill, rechnenSkill, schlussrechnungSkill, massstabSkill, sachaufgabenSkill],
};
export default topic;
