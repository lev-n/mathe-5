/**
 * Misconception families of the topic 'ganzzahlen'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'ganzzahlen-vorzeichen': {
    'ganzzahlen.alltag': 'vorzeichen-vergessen vorzeichen-umgekehrt',
    'ganzzahlen.zahlengerade': 'vorzeichen-vergessen',
    'ganzzahlen.vergleichen': 'vorzeichen-vergessen',
    'ganzzahlen.aenderungen': 'vorzeichen-vergessen',
    'ganzzahlen.betrag': 'vorzeichen-umgekehrt',
    'ganzzahlen.plusminus': 'vorzeichen-vergessen',
    'ganzzahlen.vorzeichen': 'vorzeichen-vergessen',
    'ganzzahlen.malgeteilt': 'vorzeichen-vergessen',
    'ganzzahlen.terme': 'vorzeichen-vergessen',
  },
  'ganzzahlen-strichwert': {
    'ganzzahlen.alltag': 'strich-zaehlt',
    'ganzzahlen.zahlengerade': 'strich-zaehlt abstand-ganz',
  },
  'ganzzahlen-ablesen': {
    'ganzzahlen.zahlengerade': 'null-mitgezaehlt links-gezaehlt marken-getauscht',
  },
  'ganzzahlen-richtung': {
    'ganzzahlen.alltag': 'richtung-negativ',
    'ganzzahlen.zahlengerade': 'richtung-negativ richtung-links',
    'ganzzahlen.aenderungen': 'richtung unter-null-weiter',
    'ganzzahlen.plusminus': 'richtung unter-null-weiter',
  },
  'ganzzahlen-negative-vergleichen': {
    'ganzzahlen.vergleichen': 'betrag-groesser negative-umgedreht',
  },
  'ganzzahlen-erstes-vorzeichen': {
    'ganzzahlen.zahlengerade': 'vorzeichen-ignoriert',
    'ganzzahlen.aenderungen': 'vorzeichen-ignoriert',
    'ganzzahlen.plusminus': 'vorzeichen-ignoriert',
    'ganzzahlen.vorzeichen': 'vorzeichen-ignoriert',
    'ganzzahlen.terme': 'vorzeichen-ignoriert',
  },
  'ganzzahlen-ueber-null': {
    'ganzzahlen.aenderungen': 'null-stopp',
    'ganzzahlen.plusminus': 'vorzeichen-behalten tausch-minus',
  },
  'ganzzahlen-bis-zum-ende': {
    'ganzzahlen.aenderungen': 'zwischenstand',
    'ganzzahlen.plusminus': 'zwischenstand',
    'ganzzahlen.terme': 'nur-mal',
  },
  'ganzzahlen-aenderung': {
    'ganzzahlen.aenderungen': 'aenderung-zustand nur-endstand aenderung-vorzeichen',
  },
  'ganzzahlen-gegenzahl': {
    'ganzzahlen.betrag': 'gegenzahl-negativ gegenzahl-betrag',
    'ganzzahlen.vorzeichen': 'gegenzahl-vergessen',
  },
  'ganzzahlen-betrag': {
    'ganzzahlen.betrag': 'ganzer-abstand betrag-minus betrag-gegenzahl betrag-nur-positiv reihenfolge',
  },
  'ganzzahlen-negative-zweite-zahl': {
    'ganzzahlen.plusminus': 'minus-minus regel-uebertragen',
  },
  'ganzzahlen-umkehr': {
    'ganzzahlen.plusminus': 'umkehr-richtung',
    'ganzzahlen.terme': 'umkehr-richtung',
  },
  'ganzzahlen-zeichen': {
    'ganzzahlen.vorzeichen': 'alle-minus rechenzeichen-gezaehlt',
  },
  'ganzzahlen-regel': {
    'ganzzahlen.malgeteilt': 'plus-statt-mal regel-mal regel-uebertragen',
    'ganzzahlen.terme': 'regel-mal',
  },
  'ganzzahlen-reihenfolge': {
    'ganzzahlen.terme': 'links-nach-rechts klammer-ignoriert nur-klammer',
  },
};
export default families;
