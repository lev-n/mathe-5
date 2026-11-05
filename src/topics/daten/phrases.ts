/**
 * Phrases of the misconception families of the topic 'daten':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'daten-buendel': { phrase: { object: 'die Fünferbündel', participle: 'richtig gezählt' } },
  'daten-alle-werte': { phrase: { object: 'nur die gefragten Werte', participle: 'gezählt' } },
  'daten-bereich-grenze': { phrase: { object: 'die Grenzen eines Bereichs', participle: 'mitgezählt' } },
  'daten-rechenart': { phrase: { object: 'Summe und Unterschied', participle: 'richtig unterschieden' } },
  'daten-achse-schritt': { phrase: { object: 'den Schritt der Achse', participle: 'richtig gelesen' } },
  'daten-legende': { phrase: { object: 'die Legende im Bilddiagramm', participle: 'richtig genutzt' } },
  'daten-teilschritt': { phrase: { object: 'alle Säulen der Rechnung', participle: 'berücksichtigt' } },
  'daten-feld-summe': { phrase: { object: 'Feld und Summe einer Tafel', participle: 'richtig getrennt' } },
  'daten-zeile-spalte': { phrase: { object: 'Zeile und Spalte einer Tafel', participle: 'richtig gelesen' } },
  'daten-gruppen': { phrase: { object: 'die Anteile zweier Gruppen', participle: 'richtig verglichen' } },
  'daten-baum-addiert': { phrase: { object: 'die Stufen eines Baums', participle: 'richtig multipliziert' } },
  'daten-wege-zaehlen': { phrase: { object: 'alle Wege eines Baums', participle: 'richtig erfasst' } },
  'daten-ohne-verbrauch': { phrase: { object: 'die Plätze einer Reihenfolge', participle: 'richtig gezählt' } },
  'daten-regel-passt': { phrase: { object: 'die Grenzen der Malregel', participle: 'beachtet' } },
  'daten-mittel-ohne-teilen': { phrase: { object: 'die Summe auf alle Werte', participle: 'verteilt' } },
  'daten-mittel-haeufigster': { phrase: { object: 'den Mittelwert aus allen Werten', participle: 'berechnet' } },
  'daten-mittel-null': { phrase: { object: 'die 0 als Wert', participle: 'mitgezählt' } },
  'daten-ausgleich': { phrase: { object: 'zwei Werte', participle: 'richtig ausgeglichen' } },
  'daten-fehlwert': { phrase: { object: 'einen fehlenden Wert', participle: 'aus dem Mittelwert berechnet' } },
  'daten-ausreisser': { phrase: { object: 'die Wirkung eines Ausreißers', participle: 'richtig berechnet' } },
  'daten-min-max': { phrase: { object: 'Minimum und Maximum', participle: 'richtig unterschieden' } },
  'daten-spannweite': { phrase: { object: 'die Spannweite', participle: 'richtig berechnet' } },
  'daten-median-unsortiert': { phrase: { object: 'die Werte vor dem Median', participle: 'sortiert' } },
  'daten-median-mitte': { phrase: { object: 'die Mitte einer Liste', participle: 'richtig bestimmt' } },
  'daten-median-mittelwert': { phrase: { object: 'Median und Mittelwert', participle: 'richtig unterschieden' } },
};
export default phrases;
