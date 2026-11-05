/**
 * Topic metadata (always loaded) and lazy loaders for the topic modules (one chunk per topic).
 */
import type { TopicId, TopicMeta, TopicModule } from '../core/types';

export const TOPICS: readonly TopicMeta[] = [
  { id: 'zahlen', title: 'Große Zahlen und Teiler', shortTitle: 'Zahlen', description: 'Große Zahlen lesen, Stellenwerte, Runden, Teiler und Potenzen', color: 'zahlen' },
  { id: 'rechnen', title: 'Rechnen, Klammern, Rechengesetze', shortTitle: 'Rechnen', description: 'Schriftlich rechnen, Punkt vor Strich, Klammern, Sachaufgaben', color: 'rechnen' },
  { id: 'ganzzahlen', title: 'Negative Zahlen', shortTitle: 'Negative Zahlen', description: 'Temperaturen und Höhen, die Zahlengerade, Rechnen mit Vorzeichen', color: 'ganzzahlen' },
  { id: 'brueche', title: 'Brüche und Dezimalzahlen', shortTitle: 'Brüche', description: 'Anteile, Erweitern und Kürzen, Dezimalzahlen ordnen und rechnen', color: 'brueche' },
  { id: 'groessen', title: 'Größen und Maßstab', shortTitle: 'Größen', description: 'Einheiten umrechnen, Komma, Schätzen, Dreisatz und Maßstab', color: 'groessen' },
  { id: 'geometrie', title: 'Figuren, Lage, Winkel', shortTitle: 'Geometrie', description: 'Parallel und senkrecht, Koordinaten, Winkel, Vierecke, Symmetrie', color: 'geometrie' },
  { id: 'flaeche', title: 'Umfang, Fläche, Quader', shortTitle: 'Fläche', description: 'Umfang und Fläche, Flächeneinheiten, Netze, Oberfläche und Volumen', color: 'flaeche' },
  { id: 'daten', title: 'Daten und Zählen', shortTitle: 'Daten', description: 'Tabellen und Diagramme, Mittelwert und Median, systematisch zählen', color: 'daten' },
];

const LOADERS: Record<TopicId, () => Promise<{ default: TopicModule }>> = {
  zahlen: () => import('./zahlen'),
  rechnen: () => import('./rechnen'),
  ganzzahlen: () => import('./ganzzahlen'),
  brueche: () => import('./brueche'),
  groessen: () => import('./groessen'),
  geometrie: () => import('./geometrie'),
  flaeche: () => import('./flaeche'),
  daten: () => import('./daten'),
};

const cache = new Map<TopicId, Promise<TopicModule>>();
const loaded = new Map<TopicId, TopicModule>();

export function isTopicId(id: string): id is TopicId {
  return Object.prototype.hasOwnProperty.call(LOADERS, id);
}

export function getTopicMeta(id: TopicId): TopicMeta {
  const meta = TOPICS.find((t) => t.id === id);
  if (!meta) throw new Error(`Unknown topic ${id}`);
  return meta;
}

export function loadTopic(id: TopicId): Promise<TopicModule> {
  let p = cache.get(id);
  if (!p) {
    p = LOADERS[id]().then((m) => {
      loaded.set(id, m.default);
      return m.default;
    });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

/** The module if loadTopic() has already delivered it, else undefined (no loading starts). */
export function loadedTopic(id: TopicId): TopicModule | undefined {
  return loaded.get(id);
}

export function loadAllTopics(): Promise<TopicModule[]> {
  return Promise.all(TOPICS.map((t) => loadTopic(t.id)));
}

/** Skill ids are `${topicId}.${slug}`. */
export function topicOfSkill(skillId: string): TopicId {
  const id = skillId.split('.')[0];
  if (!isTopicId(id)) throw new Error(`Skill id without valid topic prefix: ${skillId}`);
  return id;
}

