/**
 * Phrases of the misconception families of the topic 'ganzzahlen':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'ganzzahlen-vorzeichen': { phrase: { object: 'das Vorzeichen', participle: 'richtig gesetzt' } },
  'ganzzahlen-strichwert': { phrase: { object: 'den Wert eines Strichs', participle: 'richtig genutzt' } },
  'ganzzahlen-ablesen': { phrase: { object: 'die Marken auf der Zahlengeraden', participle: 'richtig abgelesen' } },
  'ganzzahlen-richtung': { phrase: { object: 'die Richtung unter und über der 0', participle: 'richtig beachtet' } },
  'ganzzahlen-negative-vergleichen': { phrase: { object: 'negative Zahlen', participle: 'nach ihrer Lage verglichen' } },
  'ganzzahlen-erstes-vorzeichen': { phrase: { object: 'jedes Vorzeichen in der Aufgabe', participle: 'mitgerechnet' } },
  'ganzzahlen-ueber-null': { phrase: { object: 'den Schritt über die 0', participle: 'richtig gerechnet' } },
  'ganzzahlen-bis-zum-ende': { phrase: { object: 'alle Schritte bis zum Ergebnis', participle: 'gerechnet' } },
  'ganzzahlen-aenderung': { phrase: { object: 'den Weg von Stand zu Stand', participle: 'richtig bestimmt' } },
  'ganzzahlen-gegenzahl': { phrase: { object: 'die Gegenzahl', participle: 'richtig gefunden' } },
  'ganzzahlen-betrag': { phrase: { object: 'den Betrag als Abstand zur 0', participle: 'richtig genutzt' } },
  'ganzzahlen-negative-zweite-zahl': { phrase: { object: 'Plus und Minus mit einer negativen Zahl', participle: 'richtig gerechnet' } },
  'ganzzahlen-umkehr': { phrase: { object: 'die Umkehraufgabe', participle: 'richtig genutzt' } },
  'ganzzahlen-zeichen': { phrase: { object: 'Vorzeichen und Rechenzeichen', participle: 'richtig getrennt' } },
  'ganzzahlen-regel': { phrase: { object: 'die Vorzeichen beim Mal und Geteilt', participle: 'richtig bestimmt' } },
  'ganzzahlen-reihenfolge': { phrase: { object: 'die Reihenfolge im Term', participle: 'eingehalten' } },
};
export default phrases;
