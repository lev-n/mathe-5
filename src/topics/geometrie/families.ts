/**
 * Misconception families of the topic 'geometrie'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'geometrie-abstand': { 'geometrie.grundbegriffe': 'abstand-achse' },
  'geometrie-kreis': { 'geometrie.grundbegriffe': 'radius-gleich radius-richtung' },
  'geometrie-paare': { 'geometrie.lage': 'paare-linien paare-nachbarn paare-plus' },
  'geometrie-koordinaten-getauscht': { 'geometrie.koordinaten': 'koordinaten-getauscht' },
  'geometrie-koordinaten-eins': { 'geometrie.koordinaten': 'koordinaten-eins' },
  'geometrie-koordinaten-vorzeichen': { 'geometrie.koordinaten': 'koordinaten-vorzeichen' },
  'geometrie-ecke': { 'geometrie.koordinaten': 'ecke-gegenueber' },
  'geometrie-mitte': { 'geometrie.koordinaten': 'mitte-laenge' },
  'geometrie-winkel-skala': { 'geometrie.winkel-messen': 'winkel-skala', 'geometrie.winkel-zeichnen': 'winkel-skala' },
  'geometrie-winkel-teilstrich': { 'geometrie.winkel-messen': 'winkel-teilstrich', 'geometrie.winkel-zeichnen': 'winkel-teilstrich' },
  'geometrie-rest': { 'geometrie.winkel-messen': 'rest-abgelesen' },
  'geometrie-ueberstumpf': { 'geometrie.winkel-messen': 'ueberstumpf-rest ueberstumpf-gerade', 'geometrie.winkel-zeichnen': 'ueberstumpf-rest ueberstumpf-gerade' },
  'geometrie-beschreibung': { 'geometrie.winkel-zeichnen': 'beschreibung-richtung' },
  'geometrie-nebenwinkel': { 'geometrie.scheitel': 'neben-gleich neben-rechter neben-voll' },
  'geometrie-scheitelwinkel': { 'geometrie.scheitel': 'scheitel-neben scheitel-summe' },
  'geometrie-seiten': { 'geometrie.vierecke': 'seiten-getauscht' },
};
export default families;
