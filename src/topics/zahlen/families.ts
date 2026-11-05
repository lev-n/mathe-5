/**
 * Misconception families of the topic 'zahlen'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'zahlen-null-vergessen': { 'zahlen.lesen': 'null-vergessen nullen-innen' },
  'zahlen-wie-gehoert': { 'zahlen.lesen': 'wie-gehoert zahl-dreher' },
  'zahlen-milliarde-million': { 'zahlen.lesen': 'milliarde-million' },
  'zahlen-dazu-zaehlen': { 'zahlen.lesen': 'nicht-addiert falsche-stelle' },
  'zahlen-wert-der-ziffer': { 'zahlen.stellenwerte': 'nur-ziffer stelle-daneben stellen-gezaehlt stellen-plus' },
  'zahlen-ziffern-hintereinander': { 'zahlen.stellenwerte': 'ziffern-hintereinander buendel-getauscht buendel-vergessen ziffern-addiert nur-grosse-stelle' },
  'zahlen-stellen-ordnen': { 'zahlen.stellenwerte': 'reihenfolge-gezeigt leere-stelle ohne-faktor wert-statt-ziffer' },
  'zahlen-groesste-zahl': { 'zahlen.stellenwerte': 'groesste-kleinste null-vorn ohne-bedingung' },
  'zahlen-strahl-schritt': { 'zahlen.zahlenstrahl': 'strahl-schritt strahl-stufenzahl strahl-beschriftung' },
  'zahlen-strahl-anfang': { 'zahlen.zahlenstrahl': 'strahl-anfang' },
  'zahlen-strahl-abstand': { 'zahlen.zahlenstrahl': 'strahl-summe' },
  'zahlen-runden-stelle': { 'zahlen.runden': 'runden-stelle' },
  'zahlen-runden-uebertrag': { 'zahlen.runden': 'runden-uebertrag' },
  'zahlen-runden-richtung': { 'zahlen.runden': 'runden-richtung runden-nullen runden-unveraendert' },
  'zahlen-runden-grenze': { 'zahlen.runden': 'grenze-mitte grenze-abschneiden grenze-ziel' },
  'zahlen-potenz-mal': {
    'zahlen.zehnerpotenzen': 'potenz-mal exponent-mal',
    'zahlen.potenzen': 'potenz-mal potenz-plus basis-exponent',
  },
  'zahlen-nullen-exponent': { 'zahlen.zehnerpotenzen': 'null-zu-viel null-zu-wenig stellen-statt-nullen null-statt-stelle' },
  'zahlen-exponent-vergleich': { 'zahlen.zehnerpotenzen': 'exponent-differenz' },
  'zahlen-roemisch-links': { 'zahlen.zahlensysteme': 'roemisch-addiert roemisch-zeichen' },
  'zahlen-dual-stellen': { 'zahlen.zahlensysteme': 'dual-dezimal dual-umgedreht dual-ziffern dual-null-vergessen' },
  'zahlen-teilbar-endziffer': { 'zahlen.teilbarkeit': 'teilbar-endziffer ziffer-nicht-kleinste' },
  'zahlen-teiler-finden': { 'zahlen.teilbarkeit': 'teiler-reihenfolge teiler-ohne-rand' },
  'zahlen-primzahl-pruefen': { 'zahlen.primfaktoren': 'primzahl-ungerade primzahl-eins' },
  'zahlen-primfaktoren': { 'zahlen.primfaktoren': 'faktor-nicht-prim faktoren-absteigend' },
  'zahlen-potenzschreibweise': { 'zahlen.primfaktoren': 'wert-statt-exponent exponenten-getauscht' },
  'zahlen-ggt-kgv': { 'zahlen.primfaktoren': 'ggt-kgv ggt-produkt ggt-eins alle-zahlen' },
  'zahlen-exponent-finden': { 'zahlen.potenzen': 'exponent-eins-weniger' },
  'zahlen-verdoppeln': { 'zahlen.potenzen': 'verdoppeln-mal verdoppeln-plus verdoppeln-schritt' },
  'zahlen-negative-basis': { 'zahlen.potenzen': 'vorzeichen-potenz wurzel-negativ' },
};
export default families;
