/**
 * Онлайн-синхронизация прогресса 3D-мира «Остров Эха» через ваш REST API.
 * Offline-first: игра всегда сохраняется локально (zustand persist), а сюда
 * прогресс «дозаписывается» в облако, чтобы логопед видел его с другого
 * устройства. Если URL не задан — все функции это no-op (работаем локально).
 *
 * Конфигурация: переменная окружения VITE_WORLD_SYNC_URL — базовый
 * адрес API (например, https://api.example.com). Положите её в файл .env
 * в корне проекта (см. .env.example) и перезапустите `npm run web`.
 *
 * Контракт REST (по childId):
 *   GET  {BASE}/world-progress/{childId}
 *        → 200 { "state": "<строка состояния>", "updatedAt": 1700000000000 }
 *        → 404, если прогресса ещё нет
 *   PUT  {BASE}/world-progress/{childId}
 *        body { "childId": "...", "state": "<строка>", "updatedAt": 1700000000000 }
 *        → 200 (тело не важно)
 * «state» — это непрозрачная строка состояния игры (мы её не парсим на сервере).
 * Свежесть определяется по updatedAt (больше — новее).
 */

const BASE = (import.meta.env.VITE_WORLD_SYNC_URL ?? '').replace(/\/+$/, '');

/** Включена ли облачная синхронизация (задан ли URL). */
export const worldSyncEnabled = BASE.length > 0;

function endpoint(childId: string): string {
  return `${BASE}/world-progress/${encodeURIComponent(childId)}`;
}

export interface RemoteWorldProgress {
  state: string;
  updatedAt: number;
}

/** Отправить прогресс в облако (fire-and-forget; ошибки/офлайн проглатываем). */
export async function pushWorldProgress(
  childId: string,
  state: string,
  updatedAt: number,
): Promise<void> {
  if (!worldSyncEnabled) return;
  try {
    await fetch(endpoint(childId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, state, updatedAt }),
    });
  } catch {
    /* офлайн или сеть недоступна — синхронизируется при следующем сохранении */
  }
}

/** Сбросить прогресс в облаке (для кнопки «сбросить» у логопеда/родителя). */
export async function deleteWorldProgress(childId: string): Promise<void> {
  if (!worldSyncEnabled) return;
  try {
    await fetch(endpoint(childId), { method: 'DELETE' });
  } catch {
    /* офлайн — локальный сброс уже выполнен, облако подчистится позже */
  }
}

/** Забрать прогресс из облака. null — нет данных / нет сети / синк выключен. */
export async function pullWorldProgress(childId: string): Promise<RemoteWorldProgress | null> {
  if (!worldSyncEnabled) return null;
  try {
    // Таймаут, чтобы медленная сеть не подвешивала загрузку игры.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(endpoint(childId), { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const d = (await r.json()) as { state?: unknown; updatedAt?: unknown };
    if (d && typeof d.state === 'string') {
      return { state: d.state, updatedAt: Number(d.updatedAt) || 0 };
    }
    return null;
  } catch {
    return null;
  }
}
