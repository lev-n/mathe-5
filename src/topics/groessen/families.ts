/**
 * Misconception families of the topic 'groessen'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'groessen-einheit-faktor': { 'groessen.einheiten': 'einheit-faktor' },
  'groessen-einheit-richtung': { 'groessen.einheiten': 'einheit-richtung' },
  'groessen-zeit-sechzig': { 'groessen.einheiten': 'zeit-hundert zeit-hintereinander zeit-dezimal', 'groessen.rechnen': 'zeit-hundert', 'groessen.sachaufgaben': 'zeit-hundert' },
  'groessen-stellen-auffuellen': { 'groessen.einheiten': 'stelle-null' },
  'groessen-gleiche-einheit': { 'groessen.einheiten': 'nur-zahl', 'groessen.komma': 'nur-zahl', 'groessen.rechnen': 'einheit-ignoriert' },
  'groessen-lineal-anfang': { 'groessen.einheiten': 'lineal-start' },
  'groessen-komma-stellen': { 'groessen.komma': 'komma-einheit komma-stelle' },
  'groessen-komma-gewicht': { 'groessen.komma': 'komma-gewicht' },
  'groessen-komma-null': { 'groessen.komma': 'komma-null' },
  'groessen-schaetzen-rechnen': { 'groessen.schaetzen': 'schaetzen-addiert' },
  'groessen-schaetzen-einheit': { 'groessen.schaetzen': 'schaetzen-einheit' },
  'groessen-euro-und-cent': { 'groessen.rechnen': 'cent-uebertrag nur-euro' },
  'groessen-rechenart': { 'groessen.rechnen': 'rechenart', 'groessen.sachaufgaben': 'rechenart' },
  'groessen-zwei-schritte': { 'groessen.rechnen': 'nur-erster-schritt', 'groessen.sachaufgaben': 'schritt-vergessen' },
  'groessen-auf-eins': { 'groessen.schlussrechnung': 'dreisatz-addiert dreisatz-mal' },
  'groessen-immer-proportional': { 'groessen.schlussrechnung': 'immer-proportional' },
  'groessen-massstab-richtung': { 'groessen.massstab': 'massstab-richtung' },
  'groessen-massstab-einheit': { 'groessen.massstab': 'massstab-einheit' },
  'groessen-alle-zahlen': { 'groessen.sachaufgaben': 'alle-zahlen' },
};
export default families;
