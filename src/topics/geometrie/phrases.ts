/**
 * Phrases of the misconception families of the topic 'geometrie':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'geometrie-abstand': { phrase: { object: 'den Abstand', participle: 'ab der Geraden gezählt' } },
  'geometrie-kreis': { phrase: { object: 'Radius und Durchmesser', participle: 'richtig unterschieden' } },
  'geometrie-paare': { phrase: { object: 'die Paare von Linien', participle: 'richtig gezählt' } },
  'geometrie-koordinaten-getauscht': { phrase: { object: 'Rechtswert (x) und Hochwert (y)', participle: 'in der richtigen Reihenfolge genutzt' } },
  'geometrie-koordinaten-eins': { phrase: { object: 'die Schritte', participle: 'ab dem Ursprung gezählt' } },
  'geometrie-koordinaten-vorzeichen': { phrase: { object: 'die Vorzeichen der Koordinaten', participle: 'beachtet' } },
  'geometrie-ecke': { phrase: { object: 'die fehlende Ecke', participle: 'richtig bestimmt' } },
  'geometrie-mitte': { phrase: { object: 'die Mitte einer Strecke', participle: 'ab ihrem Anfang gezählt' } },
  'geometrie-winkel-skala': { phrase: { object: 'die passende Skala', participle: 'gewählt' } },
  'geometrie-winkel-teilstrich': { phrase: { object: 'die Striche am Geodreieck', participle: 'genau gezählt' } },
  'geometrie-rest': { phrase: { object: 'den Rest', participle: 'nach dem Ablesen ausgerechnet' } },
  'geometrie-ueberstumpf': { phrase: { object: 'den großen Winkel', participle: 'über den vollen Kreis bestimmt' } },
  'geometrie-beschreibung': { phrase: { object: 'den Winkel aus einer Beschreibung', participle: 'richtig berechnet' } },
  'geometrie-nebenwinkel': { phrase: { object: 'den Nebenwinkel', participle: 'von 180° aus berechnet' } },
  'geometrie-scheitelwinkel': { phrase: { object: 'Scheitelwinkel und Nebenwinkel', participle: 'richtig unterschieden' } },
  'geometrie-seiten': { phrase: { object: 'die Seiten gegenüber', participle: 'richtig zugeordnet' } },
};
export default phrases;
