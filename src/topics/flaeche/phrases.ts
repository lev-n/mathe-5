/**
 * Phrases of the misconception families of the topic 'flaeche':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'flaeche-umfang-flaeche': { phrase: { object: 'Umfang und Flächeninhalt', participle: 'richtig getrennt' } },
  'flaeche-alle-seiten': { phrase: { object: 'alle Seiten einer Figur', participle: 'mitgerechnet' } },
  'flaeche-rand-zaehlen': { phrase: { object: 'die Längen am Rand', participle: 'richtig gezählt' } },
  'flaeche-seite-rueckwaerts': { phrase: { object: 'eine fehlende Seite', participle: 'richtig rückwärts gerechnet' } },
  'flaeche-zaun-tor': { phrase: { object: 'das Tor im Zaun', participle: 'richtig abgezogen' } },
  'flaeche-alle-reihen': { phrase: { object: 'alle Reihen eines Rechtecks', participle: 'mitgerechnet' } },
  'flaeche-gleiche-summe': { phrase: { object: 'gleich große Flächen mit anderen Seiten', participle: 'richtig gerechnet' } },
  'flaeche-quadrat-seite': { phrase: { object: 'die Seite eines Quadrats', participle: 'aus der Fläche bestimmt' } },
  'flaeche-gedreht-doppelt': { phrase: { object: 'gedrehte Rechtecke', participle: 'nur einmal gezählt' } },
  'flaeche-seiten-wachsen': { phrase: { object: 'Umfang und Fläche bei längeren Seiten', participle: 'richtig gerechnet' } },
  'flaeche-faktor-hundert': { phrase: { object: 'den Faktor 100 bei Flächeneinheiten', participle: 'richtig genutzt' } },
  'flaeche-richtung': { phrase: { object: 'die Richtung beim Umrechnen', participle: 'beachtet' } },
  'flaeche-gemischte-einheiten': { phrase: { object: 'zwei verschiedene Flächeneinheiten', participle: 'zuerst umgerechnet' } },
  'flaeche-ein-schritt': { phrase: { object: 'beide Schritte beim Umrechnen', participle: 'geschafft' } },
  'flaeche-komma': { phrase: { object: 'das Komma bei Flächeneinheiten', participle: 'richtig gesetzt' } },
  'flaeche-einheit-ordnen': { phrase: { object: 'die Einheiten beim Ordnen', participle: 'beachtet' } },
  'flaeche-zerlegen-doppelt': { phrase: { object: 'das gemeinsame Stück', participle: 'nur einmal gezählt' } },
  'flaeche-fehlendes-stueck': { phrase: { object: 'ein fehlendes Stück', participle: 'richtig abgezogen' } },
  'flaeche-passende-seite': { phrase: { object: 'die passenden Seiten eines Rechtecks', participle: 'gefunden' } },
  'flaeche-kaestchen-wert': { phrase: { object: 'den Wert eines Kästchens', participle: 'beachtet' } },
  'flaeche-alle-flaechen': { phrase: { object: 'alle Flächen eines Körpers', participle: 'mitgezählt' } },
  'flaeche-kanten-verdeckt': { phrase: { object: 'verdeckte Kanten und Ecken', participle: 'mitgezählt' } },
  'flaeche-prisma': { phrase: { object: 'alle Teile eines Prismas', participle: 'mitgezählt' } },
  'flaeche-volumen-oberflaeche': { phrase: { object: 'Volumen und Oberfläche', participle: 'richtig getrennt' } },
  'flaeche-kanten-flaechen': { phrase: { object: 'Kanten und Flächen', participle: 'richtig getrennt' } },
  'flaeche-ohne-deckel': { phrase: { object: 'eine offene Schachtel', participle: 'richtig gerechnet' } },
  'flaeche-flaechenpaar': { phrase: { object: 'die Flächenpaare eines Quaders', participle: 'richtig genutzt' } },
  'flaeche-papier': { phrase: { object: 'das Papier für ein Geschenk', participle: 'richtig gerechnet' } },
  'flaeche-beruehrflaeche': { phrase: { object: 'die Fläche zwischen zwei Quadern', participle: 'richtig abgezogen' } },
  'flaeche-lagen-zaehlen': { phrase: { object: 'die Würfel in allen Lagen', participle: 'gezählt' } },
  'flaeche-mal-statt-plus': { phrase: { object: 'die Kanten beim Volumen', participle: 'mal gerechnet' } },
  'flaeche-kante-verdoppeln': { phrase: { object: 'das Volumen bei längeren Kanten', participle: 'richtig gerechnet' } },
  'flaeche-liter': { phrase: { object: 'Volumen in Liter', participle: 'richtig umgerechnet' } },
  'flaeche-beide-quader': { phrase: { object: 'beide Quader eines Körpers', participle: 'mitgerechnet' } },
};
export default phrases;
