/**
 * Разбор сохранённого прогресса 3D-мира «Остров Эха» (worldStateByChild)
 * в сводку для экранов логопеда и родителя.
 *
 * Базовые этапы (4): ворота (крик) → мост (Ссс) → полёт на шаре (выдох) →
 * сундук (тянуть голосом). Плюс управляемые логопедом мини-игры: фонтан,
 * дракон, колыбельная, светофор (каждая = этап) и бонус-ритм.
 * Итоги зависят от включённых игр и приходят из сохранения (stagesTotal/
 * starsTotal); константы ниже — дефолт (все игры включены).
 * Звёзды по умолчанию: 7 наземных + 3 ритм + 2 сундук + 2 фонтан + 2 дракон
 * + 2 колыбельная + 2 светофор + 2 зеркало + 2 подземелье = 24. Этапов: 4 + 6 = 10.
 */
export const WORLD_STAGES_TOTAL = 10;
export const WORLD_STARS_TOTAL = 24;

export interface WorldProgress {
  /** Пройдено этапов. */
  stages: number;
  /** Сколько этапов всего (зависит от включённых логопедом игр). */
  stagesTotal: number;
  /** Выполнена ритм-задача. */
  rhythmDone: boolean;
  /** Собрано звёзд. */
  stars: number;
  /** Сколько звёзд всего достижимо (зависит от включённых игр). */
  starsTotal: number;
  /** Мир пройден на 100%. */
  completed: boolean;
  /** Есть ли вообще сохранённый прогресс. */
  started: boolean;
}

export function parseWorldProgress(json: string | undefined | null): WorldProgress {
  const empty: WorldProgress = {
    stages: 0,
    stagesTotal: WORLD_STAGES_TOTAL,
    rhythmDone: false,
    stars: 0,
    starsTotal: WORLD_STARS_TOTAL,
    completed: false,
    started: false,
  };
  if (!json) return empty;
  try {
    const d = JSON.parse(json) as {
      gateOpen?: boolean;
      bridgeBuilt?: boolean;
      flewUp?: boolean;
      treasureOpen?: boolean;
      fountainDone?: boolean;
      roarDone?: boolean;
      lullabyDone?: boolean;
      trafficDone?: boolean;
      mirrorDone?: boolean;
      dungeonDone?: boolean;
      rhythmDone?: boolean;
      collected?: number;
      taken?: Record<string, boolean>;
      stagesTotal?: number;
      starsTotal?: number;
    };
    const stages =
      (d.gateOpen ? 1 : 0) +
      (d.bridgeBuilt ? 1 : 0) +
      (d.flewUp ? 1 : 0) +
      (d.treasureOpen ? 1 : 0) +
      (d.fountainDone ? 1 : 0) +
      (d.roarDone ? 1 : 0) +
      (d.lullabyDone ? 1 : 0) +
      (d.trafficDone ? 1 : 0) +
      (d.mirrorDone ? 1 : 0) +
      (d.dungeonDone ? 1 : 0);
    const stars =
      typeof d.collected === 'number'
        ? d.collected
        : d.taken
          ? Object.values(d.taken).filter(Boolean).length
          : 0;
    // Итоги зависят от включённых логопедом игр (мир их сохраняет); иначе — дефолт.
    const stagesTotal = typeof d.stagesTotal === 'number' ? d.stagesTotal : WORLD_STAGES_TOTAL;
    const starsTotal = typeof d.starsTotal === 'number' ? d.starsTotal : WORLD_STARS_TOTAL;
    const rhythmDone = !!d.rhythmDone;
    const completed = stages >= stagesTotal && stars >= starsTotal;
    const started = stages > 0 || stars > 0 || rhythmDone;
    return { stages, stagesTotal, rhythmDone, stars, starsTotal, completed, started };
  } catch {
    return empty;
  }
}
