/**
 * Phrases of the misconception families of the topic 'rechnen':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const say = (object: string, participle: string): FamilyPhrases => ({ phrase: { object, participle } });

const phrases: Record<string, FamilyPhrases> = {
  'rechnen-uebertrag': say('den Übertrag', 'richtig mitgerechnet'),
  // the same words for both subtraction methods: the phrase does not know the child's method
  'rechnen-entbuendeln': say('das Minus bei einer kleineren Ziffer oben', 'richtig gerechnet'),
  'rechnen-umkehr': say('die passende Umkehraufgabe', 'gewählt'),
  'rechnen-umkehr-schritte': say('alle Schritte rückwärts', 'zu Ende gerechnet'),
  'rechnen-fehler-finden': say('den Fehler in einer Rechnung', 'gefunden und berichtigt'),
  'rechnen-teilprodukte': say('alle Teilprodukte', 'an die passende Stelle geschrieben'),
  'rechnen-null-im-ergebnis': say('die 0 im Ergebnis', 'mitgeschrieben'),
  'rechnen-rest': say('den Rest', 'richtig bestimmt'),
  'rechnen-punkt-vor-strich': say('Punkt vor Strich', 'beachtet'),
  'rechnen-klammer': say('die Klammer', 'zuerst gerechnet'),
  'rechnen-nach-klammer': say('nach der Klammer Punkt vor Strich', 'beachtet'),
  'rechnen-minus-klammer': say('die Klammer nach einem Minus', 'richtig gerechnet'),
  'rechnen-glattes-paar': say('nach dem glatten Paar auch die anderen Zahlen', 'mitgerechnet'),
  'rechnen-tauschen': say('Minus und Geteilt', 'in der richtigen Reihenfolge gerechnet'),
  'rechnen-verteilen': say('den Faktor bei beiden Teilen', 'richtig eingesetzt'),
  'rechnen-rechenart': say('die passende Rechenart', 'gewählt'),
  'rechnen-rechenschritte': say('alle Rechenschritte', 'zu Ende gerechnet'),
  'rechnen-noetige-zahlen': say('die nötigen Zahlen', 'herausgesucht'),
  'rechnen-rest-deuten': say('den Rest', 'passend zur Geschichte gedeutet'),
};
export default phrases;
