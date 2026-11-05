/**
 * Phrases of the misconception families of the topic 'groessen':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'groessen-einheit-faktor': { phrase: { object: 'den Faktor zwischen zwei Einheiten', participle: 'richtig gewählt' } },
  'groessen-einheit-richtung': { phrase: { object: 'die Richtung beim Umrechnen', participle: 'richtig erkannt' } },
  'groessen-zeit-sechzig': { phrase: { object: 'Stunden und Minuten', participle: 'mit dem Faktor 60 gerechnet' } },
  'groessen-stellen-auffuellen': { phrase: { object: 'leere Stellen', participle: 'mit einer 0 gefüllt' } },
  'groessen-gleiche-einheit': { phrase: { object: 'Größen', participle: 'zuerst in dieselbe Einheit gebracht' } },
  'groessen-lineal-anfang': { phrase: { object: 'den Anfang am Lineal', participle: 'beachtet' } },
  'groessen-komma-stellen': { phrase: { object: 'die Stellen nach dem Komma', participle: 'richtig gelesen' } },
  'groessen-komma-gewicht': { phrase: { object: 'die drei Stellen bei Gewichten', participle: 'beachtet' } },
  'groessen-komma-null': { phrase: { object: 'die 0 nach dem Komma', participle: 'mitgezählt' } },
  'groessen-schaetzen-rechnen': { phrase: { object: 'eine bekannte Größe', participle: 'mehrmals genommen' } },
  'groessen-schaetzen-einheit': { phrase: { object: 'dein geschätztes Ergebnis', participle: 'in die gefragte Einheit umgerechnet' } },
  'groessen-euro-und-cent': { phrase: { object: 'Euro und Cent', participle: 'beide richtig gerechnet' } },
  'groessen-rechenart': { phrase: { object: 'die passende Rechenart', participle: 'gewählt' } },
  'groessen-zwei-schritte': { phrase: { object: 'beide Rechenschritte', participle: 'zu Ende gerechnet' } },
  'groessen-auf-eins': { phrase: { object: 'den Dreisatz', participle: 'über den Wert für eins gerechnet' } },
  'groessen-immer-proportional': { phrase: { object: 'eine Geschichte', participle: 'geprüft, bevor du gerechnet hast' } },
  'groessen-massstab-richtung': { phrase: { object: 'den Maßstab', participle: 'in die richtige Richtung gerechnet' } },
  'groessen-massstab-einheit': { phrase: { object: 'das Ergebnis beim Maßstab', participle: 'in die gefragte Einheit umgerechnet' } },
  'groessen-alle-zahlen': { phrase: { object: 'nur die nötigen Zahlen', participle: 'benutzt' } },
};
export default phrases;
