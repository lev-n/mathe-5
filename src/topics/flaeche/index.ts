/** Topic "Umfang, Fläche, Quader" (docs/research.md §6), in teaching order. */
import type { TopicModule } from '../../core/types';
import { einheitenSkill } from './einheiten';
import { koerperSkill } from './koerper';
import { netzeSkill } from './netze';
import { oberflaecheSkill } from './oberflaeche';
import { rechteckSkill } from './rechteck';
import { umfangSkill } from './umfang';
import { unterscheidenSkill } from './unterscheiden';
import { volumenSkill } from './volumen';
import { zusammengesetztSkill } from './zusammengesetzt';

const topic: TopicModule = {
  topicId: 'flaeche',
  skills: [umfangSkill, rechteckSkill, unterscheidenSkill, einheitenSkill, zusammengesetztSkill, koerperSkill, netzeSkill, oberflaecheSkill, volumenSkill],
};
export default topic;
