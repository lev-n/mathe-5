/**
 * Misconception families of the topic 'daten'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 * daten.pruefen has no entry: all its items are choices, whose wrong options answer with whyWrong and carry no Bug id.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'daten-buendel': { 'daten.strichliste': 'buendel-vier buendel-eins' },
  'daten-alle-werte': { 'daten.strichliste': 'alle-gezaehlt andere-summe nur-eine-zeile' },
  'daten-bereich-grenze': { 'daten.strichliste': 'bereich-grenze' },
  'daten-rechenart': {
    'daten.strichliste': 'plus-statt-minus',
    'daten.diagramme': 'summe-statt-unterschied unterschied-statt-summe',
    'daten.vierfelder': 'plus-statt-minus',
  },
  'daten-achse-schritt': { 'daten.diagramme': 'achse-schritt halber-schritt' },
  'daten-legende': { 'daten.diagramme': 'legende-vergessen' },
  'daten-teilschritt': { 'daten.diagramme': 'schritt-vergessen nur-eine-saeule' },
  'daten-feld-summe': { 'daten.vierfelder': 'zelle-statt-summe falsche-summe' },
  'daten-zeile-spalte': { 'daten.vierfelder': 'zeile-spalte' },
  'daten-gruppen': { 'daten.vierfelder': 'gruppen-groesse' },
  'daten-baum-addiert': { 'daten.zaehlprinzip': 'baum-addiert minus-statt-geteilt' },
  'daten-wege-zaehlen': { 'daten.zaehlprinzip': 'alle-wege nur-eins-dazu nur-zwei' },
  'daten-ohne-verbrauch': { 'daten.zaehlprinzip': 'ohne-verbrauch' },
  'daten-regel-passt': { 'daten.zaehlprinzip': 'immer-mal ganze-wahl-weg' },
  'daten-mittel-ohne-teilen': { 'daten.mittelwert': 'mittel-ohne-teilen falsche-anzahl' },
  'daten-mittel-haeufigster': { 'daten.mittelwert': 'mittel-haeufigster' },
  'daten-mittel-null': { 'daten.mittelwert': 'mittel-null' },
  'daten-ausgleich': { 'daten.mittelwert': 'unterschied-ganz mittel-statt-abgabe' },
  'daten-fehlwert': { 'daten.mittelwert': 'fehlwert-summe fehlwert-mittel fehlwert-bekannte' },
  'daten-ausreisser': {
    'daten.mittelwert': 'ausreisser-mit ausreisser-wert',
    'daten.median': 'ausreisser-mit mittel-ganz',
  },
  'daten-min-max': { 'daten.median': 'min-max-tausch' },
  'daten-spannweite': { 'daten.median': 'spannweite-summe spannweite-reihe spannweite-nur-max' },
  'daten-median-unsortiert': { 'daten.median': 'median-unsortiert' },
  'daten-median-mitte': { 'daten.median': 'median-eine-mitte median-plus' },
  'daten-median-mittelwert': { 'daten.median': 'mittel-statt-median median-statt-unterschied median-statt-mittel' },
};
export default families;
