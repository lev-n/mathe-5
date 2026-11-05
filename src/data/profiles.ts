/**
 * The optional profile question (docs/research.md §2.5) as data: the exact wording, the four answers, the Schwerpunkt lists, the order of the
 * topics and the range defaults. A profile changes order, Schwerpunkt or Extra and the range defaults passed through GenContext. It never sets a
 * Stufe, a target or a message, nothing is hidden for good, and it never appears in a URL, a worksheet, a badge, a summary or a request.
 * After the question no school label is shown: the stored value is the profile id, not the school type.
 *
 * Skill ids are the catalogue's (§6). src/data/profiles.test.ts checks them against docs/research.md and against the registry.
 */
import type { ProfileId, RangeDefaults, Stufe, TopicId } from '../core/types';
import { STUFEN } from '../core/types';

export const DEFAULT_PROFILE: ProfileId = 'offen';

export const PROFILE_IDS: readonly ProfileId[] = ['ganzzahl', 'anschaulich', 'bruch', 'offen'];

/** §2.5, word for word. */
export const PROFILE_QUESTION = {
  title: 'Was passt zu deiner Klasse?',
  text: 'Dann zeigen wir zuerst die passenden Themen. Du kannst das jederzeit ändern. Es bleibt nur auf diesem Gerät.',
} as const;

/** The four answers, in the order of §2.5. */
export const PROFILE_ANSWERS: readonly { id: ProfileId; label: string }[] = [
  { id: 'ganzzahl', label: 'Bayern: Gymnasium oder Realschule' },
  { id: 'anschaulich', label: 'Bayern: Mittelschule' },
  { id: 'bruch', label: 'NRW, Berlin oder Brandenburg' },
  { id: 'offen', label: 'Anderes Land oder weiß ich nicht' },
];

/** M15 "Profile": shown after the answer, never a school label. */
export const PROFILE_AFTER = 'Passt das nicht? Du kannst es jederzeit ändern.';

export function isProfileId(v: unknown): v is ProfileId {
  return typeof v === 'string' && (PROFILE_IDS as readonly string[]).includes(v);
}

/** Every skill of the catalogue (§6), by topic, in teaching order. */
export const CATALOGUE: Readonly<Record<TopicId, readonly string[]>> = {
  zahlen: ['zahlen.lesen', 'zahlen.stellenwerte', 'zahlen.zahlenstrahl', 'zahlen.runden', 'zahlen.zehnerpotenzen', 'zahlen.zahlensysteme', 'zahlen.teilbarkeit', 'zahlen.primfaktoren', 'zahlen.potenzen'],
  rechnen: ['rechnen.schriftlich-plusminus', 'rechnen.schriftlich-mal', 'rechnen.schriftlich-geteilt', 'rechnen.punkt-vor-strich', 'rechnen.klammern', 'rechnen.rechengesetze', 'rechnen.distributiv', 'rechnen.gleichungen', 'rechnen.sachaufgaben'],
  ganzzahlen: ['ganzzahlen.alltag', 'ganzzahlen.zahlengerade', 'ganzzahlen.vergleichen', 'ganzzahlen.aenderungen', 'ganzzahlen.betrag', 'ganzzahlen.plusminus', 'ganzzahlen.vorzeichen', 'ganzzahlen.malgeteilt', 'ganzzahlen.terme'],
  brueche: ['brueche.alltag', 'brueche.anteile', 'brueche.bruchteile', 'brueche.erweitern', 'brueche.vergleichen', 'brueche.gleichnamig', 'brueche.dezimal-lesen', 'brueche.dezimal-ordnen', 'brueche.dezimal-rechnen'],
  groessen: ['groessen.einheiten', 'groessen.komma', 'groessen.schaetzen', 'groessen.rechnen', 'groessen.schlussrechnung', 'groessen.massstab', 'groessen.sachaufgaben'],
  geometrie: ['geometrie.grundbegriffe', 'geometrie.lage', 'geometrie.koordinaten', 'geometrie.winkel-arten', 'geometrie.winkel-messen', 'geometrie.winkel-zeichnen', 'geometrie.scheitel', 'geometrie.vierecke', 'geometrie.symmetrie'],
  flaeche: ['flaeche.umfang', 'flaeche.rechteck', 'flaeche.unterscheiden', 'flaeche.einheiten', 'flaeche.zusammengesetzt', 'flaeche.koerper', 'flaeche.netze', 'flaeche.oberflaeche', 'flaeche.volumen'],
  daten: ['daten.strichliste', 'daten.diagramme', 'daten.vierfelder', 'daten.pruefen', 'daten.zaehlprinzip', 'daten.mittelwert', 'daten.median'],
};

/** Status `core` in the catalogue (§6): 31 of the 68 skills. */
export const CORE_SKILLS: readonly string[] = [
  'zahlen.lesen', 'zahlen.stellenwerte', 'zahlen.zahlenstrahl', 'zahlen.runden',
  'rechnen.schriftlich-plusminus', 'rechnen.schriftlich-mal', 'rechnen.schriftlich-geteilt', 'rechnen.punkt-vor-strich', 'rechnen.klammern', 'rechnen.rechengesetze', 'rechnen.sachaufgaben',
  'ganzzahlen.alltag', 'ganzzahlen.zahlengerade', 'ganzzahlen.vergleichen', 'ganzzahlen.aenderungen',
  'groessen.einheiten', 'groessen.komma', 'groessen.schaetzen', 'groessen.rechnen', 'groessen.sachaufgaben',
  'geometrie.grundbegriffe', 'geometrie.lage', 'geometrie.koordinaten', 'geometrie.winkel-arten', 'geometrie.winkel-messen', 'geometrie.winkel-zeichnen',
  'flaeche.umfang', 'flaeche.rechteck', 'flaeche.unterscheiden', 'flaeche.einheiten', 'flaeche.zusammengesetzt',
];

const allOf = (topic: TopicId): readonly string[] => CATALOGUE[topic];

/** What each profile adds to the core (§2.5). Only Stufe 1 of ganzzahlen.plusminus for 'anschaulich', named in SCHWERPUNKT_STUFEN. */
export const SCHWERPUNKT: Readonly<Record<ProfileId, readonly string[]>> = {
  ganzzahl: [...allOf('ganzzahlen'), 'zahlen.teilbarkeit', 'zahlen.primfaktoren', 'zahlen.potenzen', 'zahlen.zehnerpotenzen', 'rechnen.distributiv', 'groessen.schlussrechnung', 'groessen.massstab', 'geometrie.vierecke', 'flaeche.netze', 'daten.zaehlprinzip'],
  anschaulich: ['brueche.alltag', 'rechnen.gleichungen', 'daten.strichliste', 'daten.diagramme', 'ganzzahlen.plusminus'],
  bruch: [...allOf('brueche'), 'zahlen.teilbarkeit', 'geometrie.symmetrie', 'flaeche.volumen', 'flaeche.oberflaeche', ...allOf('daten').filter((id) => id !== 'daten.vierfelder')],
  offen: [],
};

/** A Schwerpunkt skill of which only some Stufen count (§2.5). */
const SCHWERPUNKT_STUFEN: Readonly<Partial<Record<ProfileId, Readonly<Record<string, readonly Stufe[]>>>>> = {
  anschaulich: { 'ganzzahlen.plusminus': [1] },
};

/** The Stufen of a skill that count as Schwerpunkt in this profile; empty: the skill is an Extra here. */
export function schwerpunktStufen(profile: ProfileId, skillId: string): readonly Stufe[] {
  if (CORE_SKILLS.includes(skillId)) return STUFEN;
  if (!SCHWERPUNKT[profile].includes(skillId)) return [];
  return SCHWERPUNKT_STUFEN[profile]?.[skillId] ?? STUFEN;
}

/** Schwerpunkt in this profile; everything else is marked "Extra" (never hidden for good: "Mehr Themen" opens it). */
export function isSchwerpunkt(profile: ProfileId, skillId: string): boolean {
  return schwerpunktStufen(profile, skillId).length > 0;
}

/**
 * The order of the topics on the start page ("zuerst die passenden Themen"). Bayern goes from ℕ to ℤ in Klasse 5 and to ℚ in Klasse 6; the NRW order
 * follows the QUA-LiS sample plan (data first, §2.2), which is an example and not a rule.
 */
export const TOPIC_ORDER: Readonly<Record<ProfileId, readonly TopicId[]>> = {
  ganzzahl: ['zahlen', 'rechnen', 'ganzzahlen', 'groessen', 'geometrie', 'flaeche', 'daten', 'brueche'],
  anschaulich: ['zahlen', 'rechnen', 'ganzzahlen', 'groessen', 'geometrie', 'flaeche', 'daten', 'brueche'],
  bruch: ['daten', 'zahlen', 'groessen', 'rechnen', 'geometrie', 'flaeche', 'brueche', 'ganzzahlen'],
  offen: ['zahlen', 'rechnen', 'ganzzahlen', 'brueche', 'groessen', 'geometrie', 'flaeche', 'daten'],
};

/** §2.5, column "Range defaults". Defaults, never locks; the Stufe keeps its meaning. */
export const RANGE_DEFAULTS: Readonly<Record<ProfileId, RangeDefaults>> = {
  ganzzahl: { maxAngle: 360, fourQuadrants: true, beyondMilliarde: true, threeDigitFactor: true, areaUnits: 'wide', integersAsStates: false },
  anschaulich: { maxAngle: 180, fourQuadrants: false, beyondMilliarde: true, threeDigitFactor: false, areaUnits: 'm2ToMm2', integersAsStates: false },
  bruch: { maxAngle: 360, fourQuadrants: true, beyondMilliarde: true, threeDigitFactor: true, areaUnits: 'wide', integersAsStates: true },
  offen: { maxAngle: 360, fourQuadrants: true, beyondMilliarde: true, threeDigitFactor: true, areaUnits: 'wide', integersAsStates: false },
};
