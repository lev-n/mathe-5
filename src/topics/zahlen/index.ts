/** Topic "Große Zahlen und Teiler" (docs/research.md §6), skills in teaching order. */
import type { TopicModule } from '../../core/types';
import { lesenSkill } from './lesen';
import { potenzenSkill } from './potenzen';
import { primfaktorenSkill } from './primfaktoren';
import { rundenSkill } from './runden';
import { stellenwerteSkill } from './stellenwerte';
import { teilbarkeitSkill } from './teilbarkeit';
import { zahlensystemeSkill } from './zahlensysteme';
import { zahlenstrahlSkill } from './zahlenstrahl';
import { zehnerpotenzenSkill } from './zehnerpotenzen';

const topic: TopicModule = {
  topicId: 'zahlen',
  skills: [lesenSkill, stellenwerteSkill, zahlenstrahlSkill, rundenSkill, zehnerpotenzenSkill, zahlensystemeSkill, teilbarkeitSkill, primfaktorenSkill, potenzenSkill],
};
export default topic;
