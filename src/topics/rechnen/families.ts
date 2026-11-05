/**
 * Misconception families of the topic 'rechnen'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const PLUSMINUS = 'rechnen.schriftlich-plusminus';
const MAL = 'rechnen.schriftlich-mal';
const GETEILT = 'rechnen.schriftlich-geteilt';

const families: TopicFamilies = {
  'rechnen-uebertrag': { [PLUSMINUS]: 'uebertrag-vergessen uebertrag-zu-klein', [MAL]: 'uebertrag-vergessen uebertrag-null', [GETEILT]: 'uebertrag-vergessen' },
  'rechnen-entbuendeln': { [PLUSMINUS]: 'kleiner-von-groesser regroup-vergessen' },
  'rechnen-umkehr': { [PLUSMINUS]: 'umkehr-richtung', [GETEILT]: 'umkehr-richtung', 'rechnen.gleichungen': 'umkehr-richtung' },
  'rechnen-umkehr-schritte': { 'rechnen.gleichungen': 'umkehr-schritt umkehr-reihenfolge' },
  'rechnen-fehler-finden': { [PLUSMINUS]: 'fehler-uebernommen', [MAL]: 'fehler-uebernommen' },
  'rechnen-teilprodukte': { [MAL]: 'mal-versatz null-im-faktor' },
  'rechnen-null-im-ergebnis': { [GETEILT]: 'null-im-quotient' },
  'rechnen-rest': { [GETEILT]: 'rest-zu-gross rest-vergessen' },
  'rechnen-punkt-vor-strich': { 'rechnen.punkt-vor-strich': 'links-nach-rechts strich-zuerst' },
  'rechnen-klammer': { 'rechnen.klammern': 'klammer-ignoriert' },
  'rechnen-nach-klammer': { 'rechnen.klammern': 'nur-klammer' },
  'rechnen-minus-klammer': { 'rechnen.klammern': 'minus-klammer' },
  'rechnen-glattes-paar': { 'rechnen.rechengesetze': 'nur-paar' },
  'rechnen-tauschen': { 'rechnen.rechengesetze': 'tausch-minus' },
  'rechnen-verteilen': { 'rechnen.distributiv': 'verteilen-halb ausklammern-doppelt vorzeichen-verteilen' },
  'rechnen-rechenart': { 'rechnen.sachaufgaben': 'rechenart signalwort' },
  'rechnen-rechenschritte': { 'rechnen.sachaufgaben': 'erster-schritt' },
  'rechnen-noetige-zahlen': { 'rechnen.sachaufgaben': 'alle-zahlen' },
  'rechnen-rest-deuten': { 'rechnen.sachaufgaben': 'rest-sache rest-als-antwort' },
};
export default families;
