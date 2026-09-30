/**
 * Настройки 3D-мира «Остров Эха» для конкретного ребёнка — логопед
 * включает/выключает мини-игры, задаёт сложность и целевой звук каждой
 * игры. Конфиг хранится в сторе (worldConfigByChild) и передаётся в мир
 * через мост getConfig().
 *
 * Базовые зоны пути (ворота/мост/шар/сундук) всегда активны — управляемы
 * только дополнительные мини-игры из WORLD_GAMES.
 */
export type WorldDifficulty = 'easy' | 'normal' | 'hard';

export interface WorldGameConfig {
  difficulty: WorldDifficulty;
  /** Включена ли мини-игра (ключ из WORLD_GAMES). */
  games: Record<string, boolean>;
  /** Целевой звук/слог мини-игры (ключ → звук), где это применимо. */
  sounds: Record<string, string>;
}

/** Дополнительные (управляемые) мини-игры мира. */
export const WORLD_GAMES = [
  { key: 'rhythm', emoji: '🥁', title: 'Барабан-ритм', hint: 'Повтори слог в ритме' },
  { key: 'fountain', emoji: '⛲', title: 'Музыкальный фонтан', hint: 'Пой громко гласный' },
  { key: 'dragon', emoji: '🐉', title: 'Разбуди дракона', hint: 'Рычи «Р-р-р»' },
  { key: 'lullaby', emoji: '🌙', title: 'Колыбельная', hint: 'Пой тихим голосом' },
  { key: 'trafficlight', emoji: '🚦', title: 'Светофор', hint: 'Тихо/громко по сигналу' },
  { key: 'mirror', emoji: '🪞', title: 'Волшебное зеркало', hint: 'Гримаса в камеру (зрение)' },
  { key: 'dungeon', emoji: '🏰', title: 'Подземелье эха', hint: 'Крикни звук — зажги факелы' },
] as const;

/** Варианты целевого звука/гримасы по играм (пусто → нет выбора). */
export const WORLD_GAME_SOUNDS: Record<string, string[]> = {
  rhythm: ['ПА', 'ТА', 'КА', 'БА', 'ДА'],
  fountain: ['А', 'О', 'У', 'И', 'Э'],
  dragon: ['Р', 'Рь'],
  lullaby: ['А', 'О', 'У', 'М'],
  mirror: ['Улыбка', 'Рот', 'Трубочка', 'Щёки'],
  dungeon: ['А', 'О', 'У', 'Р'],
};

/** Игры, где «звук» на самом деле мимическая гримаса (computer vision). */
export const GRIMACE_GAMES = ['mirror'];

export const WORLD_DIFFICULTIES: { key: WorldDifficulty; label: string }[] = [
  { key: 'easy', label: 'Легко' },
  { key: 'normal', label: 'Норма' },
  { key: 'hard', label: 'Сложно' },
];

function defaultSounds(): Record<string, string> {
  const s: Record<string, string> = {};
  for (const key of Object.keys(WORLD_GAME_SOUNDS)) s[key] = WORLD_GAME_SOUNDS[key][0];
  return s;
}

export function defaultWorldConfig(): WorldGameConfig {
  const games: Record<string, boolean> = {};
  for (const g of WORLD_GAMES) games[g.key] = true;
  return { difficulty: 'normal', games, sounds: defaultSounds() };
}

/** Привести (возможно частичный/старый) конфиг к полному виду. */
export function normalizeWorldConfig(c?: Partial<WorldGameConfig> | null): WorldGameConfig {
  const base = defaultWorldConfig();
  if (!c) return base;
  return {
    difficulty: c.difficulty ?? base.difficulty,
    games: { ...base.games, ...(c.games ?? {}) },
    sounds: { ...base.sounds, ...(c.sounds ?? {}) },
  };
}
