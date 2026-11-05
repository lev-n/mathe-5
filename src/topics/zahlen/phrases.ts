/**
 * Phrases of the misconception families of the topic 'zahlen':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'zahlen-null-vergessen': { phrase: { object: 'die Nullen im Inneren einer Zahl', participle: 'beachtet' } },
  'zahlen-wie-gehoert': { phrase: { object: 'ein Zahlwort in die passenden Stellen', participle: 'übertragen' } },
  'zahlen-milliarde-million': { phrase: { object: 'Millionen und Milliarden', participle: 'unterschieden' } },
  'zahlen-dazu-zaehlen': { phrase: { object: 'eine Stufenzahl an der passenden Stelle', participle: 'dazugezählt' } },
  'zahlen-wert-der-ziffer': { phrase: { object: 'den Wert einer Ziffer an ihrer Stelle', participle: 'erkannt' } },
  'zahlen-ziffern-hintereinander': { phrase: { object: 'zehn gleiche Stellen', participle: 'gebündelt' } },
  'zahlen-stellen-ordnen': { phrase: { object: 'Ziffern nach ihrer Stelle', participle: 'geordnet' } },
  'zahlen-groesste-zahl': { phrase: { object: 'aus Ziffern die gesuchte Zahl', participle: 'gebildet' } },
  'zahlen-strahl-schritt': { phrase: { object: 'den Wert eines Strichs', participle: 'bestimmt' } },
  'zahlen-strahl-anfang': { phrase: { object: 'den Anfang eines Zahlenstrahls', participle: 'abgelesen' } },
  'zahlen-strahl-abstand': { phrase: { object: 'den Abstand zweier Pfeile', participle: 'bestimmt' } },
  'zahlen-runden-stelle': { phrase: { object: 'die passende Stelle beim Runden', participle: 'gefunden' } },
  'zahlen-runden-uebertrag': { phrase: { object: 'den Übertrag beim Runden', participle: 'weitergegeben' } },
  'zahlen-runden-richtung': { phrase: { object: 'die Ziffer rechts neben der Rundungsstelle', participle: 'genutzt' } },
  'zahlen-runden-grenze': { phrase: { object: 'die Grenzen beim Runden', participle: 'bestimmt' } },
  'zahlen-potenz-mal': { phrase: { object: 'den Exponenten als Zahl der Faktoren', participle: 'gelesen' } },
  'zahlen-nullen-exponent': { phrase: { object: 'die Nullen einer Zehnerpotenz', participle: 'gezählt' } },
  'zahlen-exponent-vergleich': { phrase: { object: 'Exponenten beim Vergleich', participle: 'genutzt' } },
  'zahlen-roemisch-links': { phrase: { object: 'römische Zeichen mit ihrem Wert', participle: 'gelesen' } },
  'zahlen-dual-stellen': { phrase: { object: 'die Stellen einer Dualzahl', participle: 'genutzt' } },
  'zahlen-teilbar-endziffer': { phrase: { object: 'die Quersumme bei der Regel für die 3', participle: 'genutzt' } },
  'zahlen-teiler-finden': { phrase: { object: 'alle Teiler einer Zahl', participle: 'gefunden' } },
  'zahlen-primzahl-pruefen': { phrase: { object: 'Primzahlen an ihren zwei Teilern', participle: 'erkannt' } },
  'zahlen-primfaktoren': { phrase: { object: 'eine Zahl in Primfaktoren', participle: 'zerlegt' } },
  'zahlen-potenzschreibweise': { phrase: { object: 'gleiche Primfaktoren als Potenz', participle: 'geschrieben' } },
  'zahlen-ggt-kgv': { phrase: { object: 'ggT und kgV', participle: 'unterschieden' } },
  'zahlen-exponent-finden': { phrase: { object: 'den Exponenten einer Potenz', participle: 'gefunden' } },
  'zahlen-verdoppeln': { phrase: { object: 'das Verdoppeln als Potenz', participle: 'gerechnet' } },
  'zahlen-negative-basis': { phrase: { object: 'das Vorzeichen einer Potenz', participle: 'bestimmt' } },
};
export default phrases;
