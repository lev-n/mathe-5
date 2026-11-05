/**
 * Misconception families of the topic 'flaeche'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'flaeche-umfang-flaeche': {
    'flaeche.umfang': 'umfang-flaeche',
    'flaeche.rechteck': 'umfang-flaeche',
    'flaeche.unterscheiden': 'umfang-flaeche',
    'flaeche.zusammengesetzt': 'umfang-flaeche',
  },
  'flaeche-alle-seiten': {
    'flaeche.umfang': 'umfang-halb seite-vergessen nur-eine-seite nur-beschriftete',
    'flaeche.unterscheiden': 'umfang-halb',
  },
  'flaeche-rand-zaehlen': { 'flaeche.umfang': 'rand-kaestchen' },
  'flaeche-seite-rueckwaerts': {
    'flaeche.umfang': 'seite-nicht-halbiert seite-zwei-abziehen quadrat-halb',
    'flaeche.rechteck': 'seite-minus seite-mal',
    'flaeche.volumen': 'kante-minus kante-nur-eine',
  },
  'flaeche-zaun-tor': { 'flaeche.umfang': 'tor-vergessen tor-doppelt' },
  'flaeche-alle-reihen': { 'flaeche.rechteck': 'nur-reihe nur-rand ganzes-rechteck' },
  'flaeche-gleiche-summe': { 'flaeche.rechteck': 'gleiche-summe' },
  'flaeche-quadrat-seite': {
    'flaeche.rechteck': 'quadrat-durch-vier quadrat-halb',
    'flaeche.zusammengesetzt': 'ecke-flaeche',
  },
  'flaeche-gedreht-doppelt': { 'flaeche.rechteck': 'gedreht-doppelt' },
  'flaeche-seiten-wachsen': { 'flaeche.unterscheiden': 'flaeche-verdoppelt umfang-vervielfacht' },
  'flaeche-faktor-hundert': { 'flaeche.einheiten': 'flaeche-faktor laengen-faktor' },
  'flaeche-richtung': { 'flaeche.einheiten': 'richtung' },
  'flaeche-gemischte-einheiten': { 'flaeche.einheiten': 'einheit-addiert ziffern-ohne-null ohne-umrechnen' },
  'flaeche-ein-schritt': { 'flaeche.einheiten': 'ein-schritt' },
  'flaeche-komma': { 'flaeche.einheiten': 'komma-weg' },
  'flaeche-einheit-ordnen': { 'flaeche.einheiten': 'nach-zahl' },
  'flaeche-zerlegen-doppelt': { 'flaeche.zusammengesetzt': 'zerlegen-doppelt' },
  'flaeche-fehlendes-stueck': { 'flaeche.zusammengesetzt': 'huelle ausschnitt-addiert nur-ausschnitt' },
  'flaeche-passende-seite': { 'flaeche.zusammengesetzt': 'falsche-seite' },
  'flaeche-kaestchen-wert': { 'flaeche.zusammengesetzt': 'kaestchen-wert kaestchen-einmal' },
  'flaeche-alle-flaechen': {
    'flaeche.koerper': 'flaechen-sichtbar gebogene-vergessen',
    'flaeche.oberflaeche': 'quader-sichtbar eine-flaeche',
  },
  'flaeche-kanten-verdeckt': { 'flaeche.koerper': 'kanten-verdeckt ecken-verdeckt kanten-rund kanten-drei' },
  'flaeche-prisma': { 'flaeche.koerper': 'prisma-grund prisma-grund-oben' },
  'flaeche-volumen-oberflaeche': {
    'flaeche.oberflaeche': 'volumen-oberflaeche',
    'flaeche.volumen': 'volumen-oberflaeche',
  },
  'flaeche-kanten-flaechen': { 'flaeche.oberflaeche': 'kanten-summe' },
  'flaeche-ohne-deckel': { 'flaeche.oberflaeche': 'ohne-deckel boden-fehlt' },
  'flaeche-flaechenpaar': { 'flaeche.oberflaeche': 'nur-paar alle-gleich' },
  'flaeche-papier': { 'flaeche.oberflaeche': 'oberflaeche-statt-rest' },
  'flaeche-beruehrflaeche': { 'flaeche.oberflaeche': 'klebe-doppelt klebe-einmal' },
  'flaeche-lagen-zaehlen': { 'flaeche.volumen': 'lagen-zaehlen eine-lage lagen-minus alle-gezaehlt' },
  'flaeche-mal-statt-plus': { 'flaeche.volumen': 'plus-statt-mal' },
  'flaeche-kante-verdoppeln': { 'flaeche.volumen': 'nur-verdoppelt' },
  'flaeche-liter': { 'flaeche.volumen': 'liter-faktor liter-tausend' },
  'flaeche-beide-quader': { 'flaeche.volumen': 'nur-ein-quader' },
};
export default families;
