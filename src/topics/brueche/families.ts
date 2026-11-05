/**
 * Misconception families of the topic 'brueche'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'brueche-von-nenner': {
    'brueche.alltag': 'von-nur-nenner',
    'brueche.bruchteile': 'von-nur-nenner nur-zaehler von-nur-zaehler',
  },
  'brueche-einheit-faktor': {
    'brueche.alltag': 'stunde-hundert faktor-klein zeit-dezimal',
    'brueche.bruchteile': 'stunde-hundert faktor-klein',
  },
  'brueche-ganze-dazu': { 'brueche.alltag': 'ganze-vergessen' },
  'brueche-alles-umrechnen': { 'brueche.alltag': 'einheit-ignoriert' },
  'brueche-zweiter-schritt': {
    'brueche.alltag': 'nur-eine-menge',
    'brueche.bruchteile': 'nur-teil',
    'brueche.gleichnamig': 'summe-statt-rest',
  },
  'brueche-rechenart': {
    'brueche.bruchteile': 'mal-statt-geteilt minus-nenner',
    'brueche.gleichnamig': 'plus-statt-minus zaehler-mal',
    'brueche.dezimal-rechnen': 'plus-statt-minus',
  },
  'brueche-nenner-zaehlt-alle': { 'brueche.anteile': 'anteil-rest vertauscht' },
  'brueche-gesuchter-teil': { 'brueche.anteile': 'gefaerbt ungefaerbt' },
  'brueche-das-ganze': {
    'brueche.anteile': 'ganzes-plus ganzes-teilen ganzes-einteil ganzes-mal-nenner',
    'brueche.bruchteile': 'ganzes-plus ganzes-einteil ganzes-mal-nenner ganzes-rueckwaerts rest-als-teil',
  },
  'brueche-erweitern': { 'brueche.erweitern': 'erweitern-plus nur-zaehler nur-nenner' },
  'brueche-kuerzen': { 'brueche.erweitern': 'kuerzen-eins kuerzen-minus' },
  'brueche-teilgroesse': { 'brueche.vergleichen': 'nenner-groesser kleinere-zahlen' },
  'brueche-strahl': { 'brueche.vergleichen': 'strahl-striche strahl-fein' },
  'brueche-nenner-bleibt': { 'brueche.gleichnamig': 'bruch-plus nenner-mal' },
  'brueche-nenner-gleich': { 'brueche.gleichnamig': 'nenner-addiert nicht-erweitert' },
  'brueche-dezimal-stelle': { 'brueche.dezimal-lesen': 'null-stelle komma-nenner null-vergessen stellen-zaehlen reihenfolge stelle-verwechselt' },
  'brueche-dezimal-komma': {
    'brueche.dezimal-lesen': 'ohne-komma',
    'brueche.dezimal-rechnen': 'komma-vergessen komma-verschoben',
  },
  'brueche-bruch-dezimal': { 'brueche.dezimal-lesen': 'bruch-komma' },
  'brueche-dezimal-vergleich': { 'brueche.dezimal-ordnen': 'komma-laenger komma-kuerzer' },
  'brueche-runden': { 'brueche.dezimal-ordnen': 'abgeschnitten immer-auf runden-stelle runden-uebertrag' },
  'brueche-zwischen': { 'brueche.dezimal-ordnen': 'zwischen-grenze' },
  'brueche-komma-unter-komma': { 'brueche.dezimal-rechnen': 'komma-ausrichten null-ergaenzen komma-getrennt kleiner-von-groesser' },
};
export default families;
