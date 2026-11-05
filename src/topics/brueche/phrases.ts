/**
 * Phrases of the misconception families of the topic 'brueche':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'brueche-von-nenner': { phrase: { object: 'Zähler und Nenner beim Bruchteil', participle: 'beide genutzt' } },
  'brueche-einheit-faktor': { phrase: { object: 'die Einheit', participle: 'mit dem passenden Faktor umgerechnet' } },
  'brueche-ganze-dazu': { phrase: { object: 'die Ganzen vor dem Bruch', participle: 'mitgerechnet' } },
  'brueche-alles-umrechnen': { phrase: { object: 'alle Angaben in dieselbe Einheit', participle: 'umgerechnet' } },
  'brueche-zweiter-schritt': { phrase: { object: 'auch den zweiten Rechenschritt', participle: 'gemacht' } },
  'brueche-rechenart': { phrase: { object: 'die passende Rechenart', participle: 'gewählt' } },
  'brueche-nenner-zaehlt-alle': { phrase: { object: 'im Nenner alle Teile', participle: 'gezählt' } },
  'brueche-gesuchter-teil': { phrase: { object: 'genau den gesuchten Teil des Bildes', participle: 'gezählt' } },
  'brueche-das-ganze': { phrase: { object: 'vom Teil aus das Ganze', participle: 'bestimmt' } },
  'brueche-erweitern': { phrase: { object: 'Zähler und Nenner mit derselben Zahl', participle: 'multipliziert' } },
  'brueche-kuerzen': { phrase: { object: 'Zähler und Nenner durch dieselbe Zahl', participle: 'geteilt' } },
  'brueche-teilgroesse': { phrase: { object: 'die Größe der Teile beim Vergleichen', participle: 'beachtet' } },
  'brueche-strahl': { phrase: { object: 'die Abschnitte am Zahlenstrahl', participle: 'richtig gezählt' } },
  'brueche-nenner-bleibt': { phrase: { object: 'den gleichen Nenner', participle: 'behalten' } },
  'brueche-nenner-gleich': { phrase: { object: 'die Nenner zuerst', participle: 'gleich gemacht' } },
  'brueche-dezimal-stelle': { phrase: { object: 'jede Ziffer an ihre Stelle', participle: 'gesetzt' } },
  'brueche-dezimal-komma': { phrase: { object: 'das Komma an die passende Stelle', participle: 'gesetzt' } },
  'brueche-bruch-dezimal': { phrase: { object: 'Bruch und Dezimalzahl', participle: 'passend ineinander übersetzt' } },
  'brueche-dezimal-vergleich': { phrase: { object: 'Dezimalzahlen Stelle für Stelle', participle: 'verglichen' } },
  'brueche-runden': { phrase: { object: 'die entscheidende Ziffer beim Runden', participle: 'beachtet' } },
  'brueche-zwischen': { phrase: { object: 'eine Zahl zwischen den Grenzen', participle: 'gefunden' } },
  'brueche-komma-unter-komma': { phrase: { object: 'Komma unter Komma', participle: 'gerechnet' } },
};
export default phrases;
