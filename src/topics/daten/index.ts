/** Topic "Daten und Zählen" (docs/research.md §6). Skills in teaching order. */
import type { TopicModule } from '../../core/types';
import { diagrammeSkill } from './diagramme';
import { medianSkill } from './median';
import { mittelwertSkill } from './mittelwert';
import { pruefenSkill } from './pruefen';
import { strichlisteSkill } from './strichliste';
import { vierfelderSkill } from './vierfelder';
import { zaehlprinzipSkill } from './zaehlprinzip';

const topic: TopicModule = {
  topicId: 'daten',
  skills: [strichlisteSkill, diagrammeSkill, vierfelderSkill, pruefenSkill, zaehlprinzipSkill, mittelwertSkill, medianSkill],
};
export default topic;
