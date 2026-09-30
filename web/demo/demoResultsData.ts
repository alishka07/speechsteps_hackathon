import { parseWorldProgress, type WorldProgress } from '@/data/worldProgress';

export type DemoController = 'camera' | 'keyboard' | 'mixed';
export type GardenActivityId = 'smile-flower' | 'round-fish' | 'open-lantern';
export interface GardenActivityResult {
  id: GardenActivityId;
  source: 'camera' | 'manual' | 'mixed';
  repetitions: 2;
}
interface RouteMetrics {
  version: 1;
  completedAt: string;
  durationSeconds: number;
  collectedCount: 3;
  controller: DemoController;
  cameraDistance: number;
  manualDistance: number;
}
export type CameraRouteResult = RouteMetrics & (
  { exercise?: undefined; activities?: undefined } |
  { exercise: 'speech-garden'; activities: GardenActivityResult[] }
);
export type CameraRouteSnapshot = {
  status: 'ready' | 'session' | 'empty' | 'unavailable' | 'invalid';
  result: CameraRouteResult | null;
};

// Keep the latest confirmed route available across SPA navigation when storage
// is blocked or full. This map is intentionally lost when the page reloads.
const sessionResults = new Map<string, { result: CameraRouteResult; persisted: boolean }>();

function key(childId: string) {
  return `speechsteps:camera-route:v1:${encodeURIComponent(childId)}`;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function validMetrics(item: Record<string, unknown>, garden = false) {
  if (item.collectedCount !== 3 || typeof item.durationSeconds !== 'number' || !Number.isFinite(item.durationSeconds) ||
    item.durationSeconds < 0 || item.durationSeconds > 86400 ||
    typeof item.cameraDistance !== 'number' || !Number.isFinite(item.cameraDistance) || item.cameraDistance < 0 ||
    typeof item.manualDistance !== 'number' || !Number.isFinite(item.manualDistance) || item.manualDistance < 0) return false;
  const expected: DemoController = item.cameraDistance > 0 ? (item.manualDistance > 0 ? 'mixed' : 'camera') : 'keyboard';
  return (garden || item.cameraDistance > 0 || item.manualDistance > 0) && item.controller === expected;
}

function gardenActivities(value: unknown): GardenActivityResult[] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const ids: GardenActivityId[] = ['smile-flower', 'round-fish', 'open-lantern'];
  const seen = new Set<string>();
  const activities: GardenActivityResult[] = [];
  for (const raw of value) {
    const item = record(raw);
    if (!item || !ids.includes(item.id as GardenActivityId) || seen.has(item.id as string) ||
      !['camera', 'manual', 'mixed'].includes(item.source as string) || item.repetitions !== 2) return null;
    seen.add(item.id as string);
    activities.push({ id: item.id as GardenActivityId, source: item.source as GardenActivityResult['source'], repetitions: 2 });
  }
  return activities.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
}

function resultFields(item: Record<string, unknown>, completedAt: string): CameraRouteResult | null {
  const base: RouteMetrics = { version: 1, completedAt, durationSeconds: Math.floor(item.durationSeconds as number),
    collectedCount: 3, controller: item.controller as DemoController,
    cameraDistance: item.cameraDistance as number, manualDistance: item.manualDistance as number };
  if (item.exercise === 'speech-garden') {
    const activities = gardenActivities(item.activities);
    return activities ? { ...base, exercise: 'speech-garden', activities } : null;
  }
  if (item.activities !== undefined) return null;
  return base;
}

/** Scores sent by the legacy game bridge are deliberately not part of this record. */
export function cameraRouteResultFromEvent(payload: unknown, completedAt = new Date().toISOString()): CameraRouteResult | null {
  const item = record(payload);
  if (!item || !['gesture-route', 'speech-garden'].includes(item.exercise as string) ||
    !validMetrics(item, item.exercise === 'speech-garden') ||
    !Number.isFinite(Date.parse(completedAt))) return null;
  const expectedEvent = item.exercise === 'speech-garden' ? 'speech-garden-complete' :
    item.controller === 'keyboard' ? 'keyboard-route-complete' : 'camera-route-complete';
  if (item.event !== expectedEvent) return null;
  return resultFields(item, completedAt);
}

export function parseCameraRouteResult(raw: string | null): CameraRouteResult | null {
  if (!raw) return null;
  try {
    const item = record(JSON.parse(raw));
    if (!item || item.version !== 1 || typeof item.completedAt !== 'string' || !Number.isFinite(Date.parse(item.completedAt)) ||
      (item.exercise !== undefined && item.exercise !== 'speech-garden') ||
      !validMetrics(item, item.exercise === 'speech-garden')) return null;
    return resultFields(item, item.completedAt);
  } catch { return null; }
}

export function saveCameraRouteResult(childId: string, payload: unknown): { status: 'saved' | 'unavailable' | 'invalid' } {
  const result = cameraRouteResultFromEvent(payload);
  if (!result || !childId) return { status: 'invalid' };
  sessionResults.set(childId, { result, persisted: false });
  try {
    localStorage.setItem(key(childId), JSON.stringify(result));
    sessionResults.set(childId, { result, persisted: true });
    return { status: 'saved' };
  } catch { return { status: 'unavailable' }; }
}

export function loadCameraRouteResult(childId: string): CameraRouteSnapshot {
  const currentSession = sessionResults.get(childId);
  const fromSession = (): CameraRouteSnapshot => ({ status: 'session', result: currentSession
    ? currentSession.result.exercise === 'speech-garden'
      ? { ...currentSession.result, activities: currentSession.result.activities.map(activity => ({ ...activity })) }
      : { ...currentSession.result }
    : null });
  try {
    const raw = localStorage.getItem(key(childId));
    if (!raw) return currentSession ? fromSession() : { status: 'empty', result: null };
    const result = parseCameraRouteResult(raw);
    // A failed write must not make an older persisted route replace the one the
    // player just completed. A newer result from another tab still takes priority.
    if (currentSession && (!result || (!currentSession.persisted &&
      Date.parse(currentSession.result.completedAt) >= Date.parse(result.completedAt)))) return fromSession();
    return { status: result ? 'ready' : 'invalid', result };
  } catch { return currentSession ? fromSession() : { status: 'unavailable', result: null }; }
}

export function readLegacyWorldResult(raw: string | undefined): {
  status: 'ready' | 'empty' | 'invalid'; progress: WorldProgress | null;
} {
  if (!raw) return { status: 'empty', progress: null };
  try {
    const item = record(JSON.parse(raw));
    if (!item) return { status: 'invalid', progress: null };
    const flags = ['gateOpen', 'bridgeBuilt', 'flewUp', 'treasureOpen', 'fountainDone', 'roarDone',
      'lullabyDone', 'trafficDone', 'mirrorDone', 'dungeonDone', 'rhythmDone'];
    const counters = ['collected', 'stagesTotal', 'starsTotal'];
    const hasProgress = [...flags, ...counters, 'taken'].some(field => Object.hasOwn(item, field));
    if (!hasProgress) return { status: 'empty', progress: null };
    if (flags.some(field => Object.hasOwn(item, field) && typeof item[field] !== 'boolean') ||
      counters.some(field => Object.hasOwn(item, field) && (!Number.isSafeInteger(item[field]) || Number(item[field]) < 0))) {
      return { status: 'invalid', progress: null };
    }
    if (Object.hasOwn(item, 'taken')) {
      const taken = record(item.taken);
      if (!taken || Object.values(taken).some(value => typeof value !== 'boolean')) return { status: 'invalid', progress: null };
    }
    return { status: 'ready', progress: parseWorldProgress(raw) };
  } catch { return { status: 'invalid', progress: null }; }
}
