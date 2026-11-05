/**
 * Curriculum tags for Klasse 5 (docs/research.md §2). The KMK Bildungsstandards ESA and MSA (i. d. F. vom 23.06.2022, Korrektur 18.06.2026)
 * describe the school-leaving qualifications and set no Klasse-5 waypoint: they give the Leitideen and a frame, while the scope comes from the
 * plans of Bayern, NRW and Berlin-Brandenburg (§2.2, §2.3). Tags are paraphrased content foci in that frame.
 *
 * Every generator references the tag ids and the shared tests check them (isKmkTag): never rename or remove an id once released.
 */
import type { TopicId } from '../core/types';

export type Leitidee =
  | 'Zahl und Operation'
  | 'Größen und Messen'
  | 'Strukturen und funktionaler Zusammenhang'
  | 'Raum und Form'
  | 'Daten und Zufall';

export interface KmkTag {
  leitidee: Leitidee | 'Prozessbezogene Kompetenz';
  text: string;
}

export const KMK_TAGS = {
  'ZO.grosse-zahlen': { leitidee: 'Zahl und Operation', text: 'Große natürliche Zahlen lesen, schreiben, darstellen und ordnen; Stellenwerte, Stufenzahlen und Zehnerpotenzen' },
  'ZO.runden': { leitidee: 'Zahl und Operation', text: 'Zahlen sachgerecht runden und Rechenergebnisse überschlagen' },
  'ZO.zahlensysteme': { leitidee: 'Zahl und Operation', text: 'Andere Zahlensysteme mit dem Stellenwertsystem vergleichen' },
  'ZO.teilbarkeit': { leitidee: 'Zahl und Operation', text: 'Teiler, Vielfache, Teilbarkeitsregeln, Primzahlen und Primfaktoren nutzen' },
  'ZO.potenzen': { leitidee: 'Zahl und Operation', text: 'Potenzen und Quadratzahlen berechnen' },
  'ZO.schriftlich': { leitidee: 'Zahl und Operation', text: 'Schriftliche Rechenverfahren der vier Grundrechenarten ausführen und mit Überschlag prüfen' },
  'ZO.terme': { leitidee: 'Zahl und Operation', text: 'Terme berechnen: Klammern, Punkt vor Strich; Rechenwege strukturieren' },
  'ZO.rechengesetze': { leitidee: 'Zahl und Operation', text: 'Rechengesetze nutzen, auch zum vorteilhaften Rechnen' },
  'ZO.ganze-zahlen': { leitidee: 'Zahl und Operation', text: 'Ganze Zahlen darstellen und ordnen; Zustände und Änderungen beschreiben; Betrag und Gegenzahl' },
  'ZO.ganze-rechnen': { leitidee: 'Zahl und Operation', text: 'Mit ganzen Zahlen rechnen; Vorzeichen und Rechenzeichen unterscheiden' },
  'ZO.brueche': { leitidee: 'Zahl und Operation', text: 'Brüche darstellen, erweitern, kürzen, vergleichen und mit gleichem oder passendem Nenner addieren und subtrahieren' },
  'ZO.bruchteile': { leitidee: 'Zahl und Operation', text: 'Bruchteile von Größen berechnen und das Ganze bestimmen' },
  'ZO.dezimalzahlen': { leitidee: 'Zahl und Operation', text: 'Dezimalzahlen darstellen, ordnen, runden und mit ihnen rechnen' },
  'ZO.sachrechnen': { leitidee: 'Zahl und Operation', text: 'Rechnen in Sachsituationen, Ergebnisse auf Plausibilität prüfen' },
  'GM.einheiten': { leitidee: 'Größen und Messen', text: 'Einheiten von Länge, Masse und Zeit umrechnen; Einheitentafel und Kommaschreibweise' },
  'GM.schaetzen': { leitidee: 'Größen und Messen', text: 'Größen mit Stützpunkten schätzen und Ergebnisse prüfen' },
  'GM.rechnen': { leitidee: 'Größen und Messen', text: 'Mit Größen rechnen, auch in Sachsituationen wie Fahrplänen und Preislisten' },
  'GM.massstab': { leitidee: 'Größen und Messen', text: 'Mit Maßstäben zwischen Plan und Wirklichkeit umrechnen' },
  'GM.umfang-flaeche': { leitidee: 'Größen und Messen', text: 'Umfang und Flächeninhalt von Rechtecken und zusammengesetzten Figuren bestimmen und unterscheiden' },
  'GM.flaecheneinheiten': { leitidee: 'Größen und Messen', text: 'Flächeneinheiten umrechnen und vergleichen' },
  'GM.oberflaeche-volumen': { leitidee: 'Größen und Messen', text: 'Oberfläche und Volumen von Quadern bestimmen' },
  'GM.winkel': { leitidee: 'Größen und Messen', text: 'Winkel schätzen, messen und einstellen' },
  'SF.gleichungen': { leitidee: 'Strukturen und funktionaler Zusammenhang', text: 'Einfache Gleichungen mit Umkehraufgabe oder Probieren lösen' },
  'SF.dreisatz': { leitidee: 'Strukturen und funktionaler Zusammenhang', text: 'Proportionale Zusammenhänge mit dem Dreisatz nutzen und prüfen' },
  'SF.koordinaten': { leitidee: 'Strukturen und funktionaler Zusammenhang', text: 'Punkte im Koordinatensystem ablesen und eintragen' },
  'RF.grundbegriffe': { leitidee: 'Raum und Form', text: 'Punkt, Strecke, Gerade, Halbgerade, Kreis und Abstand beschreiben' },
  'RF.lage': { leitidee: 'Raum und Form', text: 'Parallele und senkrechte Lage erkennen und mit Fachzeichen beschreiben' },
  'RF.winkelarten': { leitidee: 'Raum und Form', text: 'Winkelarten unterscheiden, Scheitel- und Nebenwinkel nutzen' },
  'RF.figuren': { leitidee: 'Raum und Form', text: 'Vierecke nach ihren Eigenschaften ordnen' },
  'RF.symmetrie': { leitidee: 'Raum und Form', text: 'Achsensymmetrie erkennen und Figuren spiegeln' },
  'RF.koerper': { leitidee: 'Raum und Form', text: 'Körper mit Ecken, Kanten und Flächen beschreiben; Netze und Schrägbilder' },
  'DZ.erheben': { leitidee: 'Daten und Zufall', text: 'Daten in Urlisten, Strichlisten und Häufigkeitstabellen ordnen' },
  'DZ.diagramme': { leitidee: 'Daten und Zufall', text: 'Diagramme lesen und erstellen, Vierfeldertafeln nutzen, täuschende Darstellungen erkennen' },
  'DZ.kennwerte': { leitidee: 'Daten und Zufall', text: 'Minimum, Maximum, Spannweite, Mittelwert und Median bestimmen und vergleichen' },
  'DZ.zaehlen': { leitidee: 'Daten und Zufall', text: 'Möglichkeiten systematisch zählen, auch mit Baumdiagramm' },
  'PK.argumentieren': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematisch argumentieren (Aussagen prüfen, begründen, Gegenbeispiele finden)' },
  'PK.modellieren': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematisch modellieren (Sachsituation und Rechnung verbinden)' },
  'PK.problemloesen': { leitidee: 'Prozessbezogene Kompetenz', text: 'Probleme mathematisch lösen (Rückwärtsarbeiten, systematisches Probieren)' },
  'PK.darstellen': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematische Darstellungen verwenden und wechseln' },
} as const satisfies Record<string, KmkTag>;

export type KmkTagId = keyof typeof KMK_TAGS;

export function isKmkTag(id: string): id is KmkTagId {
  return Object.prototype.hasOwnProperty.call(KMK_TAGS, id);
}

/**
 * Where each topic sits in the plans (shown on the page for parents and teachers). The school year of a topic is firm only in Bayern. NRW names
 * the end of 5/6, Berlin-Brandenburg levels (docs/research.md §2.2), so the app can say only "in Klasse 5 oder 6" there.
 */
export const TOPIC_ALIGNMENT: Record<TopicId, { kmk: Leitidee[]; bayern: string; nrw: string; bb: string }> = {
  zahlen: {
    kmk: ['Zahl und Operation'],
    bayern: 'Jgst. 5: große Zahlen, Runden und Zahlenstrahl in allen Schularten; Zehnerpotenzen und Primfaktoren an Gymnasium und Realschule',
    nrw: 'Ende 5/6: Stellenwerttafel, Zahlenstrahl, Runden, Teilbarkeit, an Gymnasium und Realschule auch Primzahlen',
    bb: 'Niveau C bis D: Zahlen bis 1 Million, große Zahlen vergleichen, Teilbarkeit und Primzahlen',
  },
  rechnen: {
    kmk: ['Zahl und Operation', 'Strukturen und funktionaler Zusammenhang'],
    bayern: 'Jgst. 5: schriftliche Verfahren, Klammern, Punkt vor Strich; die Mittelschule rechnet mit höchstens zweistelligen Faktoren und Divisoren',
    nrw: 'Ende 5/6: schriftliche Division, Rechenterme, Rechengesetze; Hauptschule mit Dezimalzahlen',
    bb: 'In diesem Bereich nicht im Einzelnen gelesen',
  },
  ganzzahlen: {
    kmk: ['Zahl und Operation'],
    bayern: 'Jgst. 5: an Gymnasium und Realschule alle vier Rechenarten; an der Mittelschule Thermometer, Höhen und a ± b mit natürlichem b',
    nrw: 'Ende 5/6: ganze Zahlen als Zustände und Änderungen, das Rechnen später',
    bb: 'Niveau E: erkennen, Zahlengerade, Betrag',
  },
  brueche: {
    kmk: ['Zahl und Operation'],
    bayern: 'Jgst. 6; in Jgst. 5 nur Alltagsbrüche bei Größen (Realschule, Mittelschule)',
    nrw: 'Ende 5/6: Brüche, Kürzen und Erweitern, Rechnen mit einfachen Brüchen, Dezimalzahlen',
    bb: 'Niveau D: gemeine Brüche, Kürzen, gleichnamig machen, Dezimalzahlen ordnen und runden',
  },
  groessen: {
    kmk: ['Größen und Messen', 'Strukturen und funktionaler Zusammenhang'],
    bayern: 'Jgst. 5: Einheiten und Kommaschreibweise in allen Schularten; Dreisatz und Maßstab an Gymnasium und Realschule',
    nrw: 'Ende 5/6: Größen, Maßstäbe; Dreisatz am Gymnasium',
    bb: 'Niveau C bis D: Größen; Maßstab auf einer höheren Niveaustufe',
  },
  geometrie: {
    kmk: ['Raum und Form', 'Größen und Messen', 'Strukturen und funktionaler Zusammenhang'],
    bayern: 'Jgst. 5: parallel und senkrecht, Koordinaten, Winkel; Gymnasium und Realschule bis 360°, Mittelschule bis 180° und nur 1. Quadrant',
    nrw: 'Ende 5/6: Grundbegriffe, Koordinaten, Winkel messen und zeichnen, Vierecke, Achsensymmetrie',
    bb: 'Niveau D: 1. Quadrant, Winkel, Vierecke, Symmetrie; Niveau E: vier Quadranten',
  },
  flaeche: {
    kmk: ['Größen und Messen', 'Raum und Form'],
    bayern: 'Jgst. 5: Umfang und Fläche klar unterscheiden; Oberfläche am Gymnasium; Volumen in Jgst. 6',
    nrw: 'Ende 5/6: Umfang, Fläche, Netze, Schrägbild, Oberfläche, Volumen',
    bb: 'Niveau D: Fläche, Körper, Netze, Oberfläche, Volumen',
  },
  daten: {
    kmk: ['Daten und Zufall'],
    bayern: 'Jgst. 5: Daten und Diagramme an Realschule und Mittelschule, am Gymnasium Zählprinzip und Baumdiagramm; Mittelwert in Jgst. 6',
    nrw: 'Ende 5/6: Daten, Diagramme, Mittelwert, Median; Klasse 5 beginnt im Musterplan damit',
    bb: 'Niveau D: Diagramme; Niveau E: Mittelwert und Median',
  },
};

/** Where the plans differ at this level, and what the app does about it (docs/research.md §2.3, §2.4, §2.5; for the page for adults). */
export const LAENDER_DIFFERENCES: readonly { topic: string; text: string }[] = [
  { topic: 'Negative Zahlen', text: 'Gymnasium und Realschule in Bayern rechnen schon in Klasse 5 mit allen vier Rechenarten. Die bayerische Mittelschule bleibt bei Thermometer, Höhen und einfachem Plus und Minus. NRW verwendet ganze Zahlen bis zum Ende von Klasse 6 nur als Zustände und Änderungen. Deshalb gehören Bedeutung, Zahlengerade, Ordnen und Änderungen zum festen Teil, das Rechnen ist ein Extra.' },
  { topic: 'Brüche und Dezimalzahlen', text: 'In Bayern stehen sie in Klasse 6, in Klasse 5 nur Alltagsbrüche und das Komma bei Größen. In NRW und Berlin-Brandenburg kommen sie meist zuerst. Multiplizieren und Dividieren von Brüchen gehört nicht zu dieser App.' },
  { topic: 'Schriftliche Subtraktion', text: 'Die Realschule und die Mittelschule in Bayern nennen das Abziehen mit Entbündeln, in NRW unterscheidet es sich nach Schule und Lehrbuch. Voreingestellt ist Abziehen, in den Einstellungen unten lässt sich auf Ergänzen umstellen. Die beiden Verfahren werden nie gemischt.' },
  { topic: 'Schriftlich malnehmen und teilen', text: 'Die Mittelschule in Bayern begrenzt Faktor und Divisor auf höchstens zwei Stellen. Dreistellige Faktoren und Divisoren gibt es nur auf Stufe 3, und nur wenn die Klassenangabe nicht dagegen spricht. Das schriftliche Teilen ist für manche Kinder ganz neu, weil NRW es in der Grundschule nur erläutern lässt.' },
  { topic: 'Winkel und Koordinaten', text: 'Die Mittelschule in Bayern arbeitet bis 180° und im 1. Quadranten, Gymnasium und Realschule bis 360° und mit vier Quadranten. Auf Stufe 1 und 2 bleibt es für alle bis 180° und im 1. Quadranten.' },
  { topic: 'Daten', text: 'Das NRW-Musterbeispiel beginnt Klasse 5 mit Daten, am bayerischen Gymnasium kommen Diagramme erst in Klasse 6. Daten bleiben deshalb für alle sichtbar und sind ein Extra, außer bei der Angabe NRW, Berlin oder Brandenburg.' },
  { topic: 'Mittelwert', text: 'In Bayern steht er nicht in Klasse 5. In NRW gehört er zum Stoff bis Klasse 6, dort auch mit Median.' },
  { topic: 'Hauptschule in NRW', text: 'Der Kernlehrplan von 2011 ist der einzige, den wir gelesen haben. Er setzt Grenzen, die sich hier über die Stufen abbilden: ganze Zahlen nur darstellen, Brüche nur gleichnamig, Flächen umwandeln erst bis Klasse 8.' },
  { topic: 'Andere Bundesländer', text: 'Gelesen wurden nur Bayern, NRW und Berlin-Brandenburg. Für die übrigen Länder gilt deshalb die Voreinstellung: der gemeinsame Kern zuerst, alles andere sichtbar als Extra. Eine Lehrkraft aus einem anderen Land sollte das noch prüfen.' },
];
