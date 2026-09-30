import { afterEach, describe, expect, it, vi } from 'vitest';
import { cameraRouteResultFromEvent, loadCameraRouteResult, parseCameraRouteResult, readLegacyWorldResult, saveCameraRouteResult } from '../web/demo/demoResultsData';

const complete = { event: 'camera-route-complete', exercise: 'gesture-route', best: 100,
  durationSeconds: 25.9, collectedCount: 3, controller: 'camera', cameraDistance: 8, manualDistance: 0 };
const timestamp = '2026-09-29T00:00:00.000Z';
const garden = { ...complete, event: 'speech-garden-complete', exercise: 'speech-garden', activities: [
  { id: 'smile-flower', source: 'camera', repetitions: 2 },
  { id: 'round-fish', source: 'mixed', repetitions: 2 },
  { id: 'open-lantern', source: 'manual', repetitions: 2 },
] };

afterEach(() => vi.unstubAllGlobals());

describe('confirmed demo route results', () => {
  it('records real route metrics without converting the legacy bridge score into a result', () => {
    const result = cameraRouteResultFromEvent(complete, timestamp)!;
    expect(result).toEqual({ version: 1, completedAt: timestamp, durationSeconds: 25,
      collectedCount: 3, controller: 'camera', cameraDistance: 8, manualDistance: 0 });
    expect(result).not.toHaveProperty('best');
    expect(result).not.toHaveProperty('score');
  });

  it('distinguishes camera, mixed and manual routes from actual movement distances', () => {
    expect(cameraRouteResultFromEvent({ ...complete, controller: 'mixed', manualDistance: 2 })?.controller).toBe('mixed');
    expect(cameraRouteResultFromEvent({ ...complete, event: 'keyboard-route-complete', controller: 'keyboard', cameraDistance: 0, manualDistance: 8 })?.controller).toBe('keyboard');
    expect(cameraRouteResultFromEvent({ ...complete, cameraDistance: 0 })).toBeNull();
  });

  it.each([
    { event: 'keyboard-route-complete' }, { exercise: 'mirror' }, { collectedCount: 2 },
    { collectedCount: '3' }, { durationSeconds: -1 }, { durationSeconds: NaN },
    { durationSeconds: Infinity }, { controller: 'mixed' }, { cameraDistance: -1 },
    { manualDistance: Infinity }, { cameraDistance: 0, manualDistance: 0 },
  ])('rejects unsupported or contradictory event fields %j', change => {
    expect(cameraRouteResultFromEvent({ ...complete, ...change })).toBeNull();
  });

  it('rejects non-object messages and malformed persisted records', () => {
    for (const payload of [null, [], 'camera-route-complete', 100]) expect(cameraRouteResultFromEvent(payload)).toBeNull();
    expect(parseCameraRouteResult('{oops')).toBeNull();
    expect(parseCameraRouteResult(JSON.stringify({ ...cameraRouteResultFromEvent(complete), version: 2 }))).toBeNull();
    expect(parseCameraRouteResult(JSON.stringify({ ...cameraRouteResultFromEvent(complete), completedAt: 'yesterday' }))).toBeNull();
  });

  it('keeps results isolated by child and restores saved metrics', () => {
    const memory = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value) });
    expect(saveCameraRouteResult('child-a', complete).status).toBe('saved');
    expect(loadCameraRouteResult('child-a').result?.controller).toBe('camera');
    expect(loadCameraRouteResult('child-b').status).toBe('empty');
    expect(loadCameraRouteResult('child-a').result?.durationSeconds).toBe(25);
  });

  it('reports blocked storage honestly and never stores an invalid event', () => {
    const setItem = vi.fn(() => { throw new Error('quota'); });
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem });
    expect(saveCameraRouteResult('child-a', complete).status).toBe('unavailable');
    expect(loadCameraRouteResult('child-a').status).toBe('session');
    expect(loadCameraRouteResult('child-a').result?.collectedCount).toBe(3);
    expect(loadCameraRouteResult('never-played').status).toBe('unavailable');
    expect(saveCameraRouteResult('child-a', { ...complete, collectedCount: 1 }).status).toBe('invalid');
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it('keeps the newly completed route ahead of an older saved result when the write fails', () => {
    const older = cameraRouteResultFromEvent({ ...complete, durationSeconds: 12 }, '2020-01-01T00:00:00.000Z')!;
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(older), setItem: () => { throw new Error('quota'); } });
    expect(saveCameraRouteResult('quota-child', { ...complete, durationSeconds: 48 }).status).toBe('unavailable');
    const current = loadCameraRouteResult('quota-child');
    expect(current.status).toBe('session');
    expect(current.result?.durationSeconds).toBe(48);
    expect(loadCameraRouteResult('other-quota-child').result?.durationSeconds).toBe(12);
  });

  it('keeps an unsaved result when storage returns nothing or damaged data', () => {
    const getItem = vi.fn((): string | null => null);
    vi.stubGlobal('localStorage', { getItem, setItem: () => { throw new Error('quota'); } });
    saveCameraRouteResult('memory-only', complete);
    expect(loadCameraRouteResult('memory-only').status).toBe('session');
    getItem.mockReturnValue('{broken');
    expect(loadCameraRouteResult('memory-only').result?.collectedCount).toBe(3);
    expect(loadCameraRouteResult('no-memory').status).toBe('invalid');
  });

  it('allows a newer result from another tab to take priority over an unsaved session', () => {
    const getItem = vi.fn((): string | null => null);
    vi.stubGlobal('localStorage', { getItem, setItem: () => { throw new Error('quota'); } });
    saveCameraRouteResult('concurrent-tab', complete);
    const newer = cameraRouteResultFromEvent({ ...complete, durationSeconds: 77 }, '2099-01-01T00:00:00.000Z');
    getItem.mockReturnValue(JSON.stringify(newer));
    expect(loadCameraRouteResult('concurrent-tab').status).toBe('ready');
    expect(loadCameraRouteResult('concurrent-tab').result?.durationSeconds).toBe(77);
  });

  it('does not expose mutable session records or replace them with invalid events', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } });
    saveCameraRouteResult('isolated-session', complete);
    const firstRead = loadCameraRouteResult('isolated-session');
    firstRead.result!.durationSeconds = 999;
    expect(loadCameraRouteResult('isolated-session').result?.durationSeconds).toBe(25);
    expect(saveCameraRouteResult('isolated-session', { ...complete, collectedCount: 2 }).status).toBe('invalid');
    expect(loadCameraRouteResult('isolated-session').result?.collectedCount).toBe(3);
  });
});

describe('speech garden route results', () => {
  it('stores the three completed activities and their actual sources without speech scores', () => {
    const result = cameraRouteResultFromEvent({ ...garden,
      faceLandmarks: [1, 2], speechScore: 99, activities: garden.activities.map(activity => ({ ...activity, blendshapes: [1] })),
    }, timestamp)!;
    expect(result).toEqual({ version: 1, completedAt: timestamp, durationSeconds: 25, collectedCount: 3,
      controller: 'camera', cameraDistance: 8, manualDistance: 0, exercise: 'speech-garden', activities: garden.activities });
    expect(parseCameraRouteResult(JSON.stringify(result))).toEqual(result);
    expect(result).not.toHaveProperty('speechScore');
    expect(result).not.toHaveProperty('faceLandmarks');
    expect(result.activities![0]).not.toHaveProperty('blendshapes');
  });

  it('keeps movement controller separate from camera recognition at a station', () => {
    const result = cameraRouteResultFromEvent({ ...garden, controller: 'keyboard', cameraDistance: 0, manualDistance: 5 });
    expect(result?.controller).toBe('keyboard');
    expect(result?.activities?.[0].source).toBe('camera');
    expect(cameraRouteResultFromEvent({ ...garden, controller: 'mixed', manualDistance: 1 })?.controller).toBe('mixed');
  });

  it('accepts stationary garden play without crediting camera movement and keeps legacy strict', () => {
    const still = { controller: 'keyboard', cameraDistance: 0, manualDistance: 0 };
    const result = cameraRouteResultFromEvent({ ...garden, ...still }, timestamp);
    expect(result?.controller).toBe('keyboard');
    expect(parseCameraRouteResult(JSON.stringify(result))).toEqual(result);
    expect(cameraRouteResultFromEvent({ ...garden, ...still, controller: 'camera' })).toBeNull();
    expect(cameraRouteResultFromEvent({ ...complete, ...still, event: 'keyboard-route-complete' })).toBeNull();
  });

  it.each([
    undefined, null, [], garden.activities.slice(0, 2), [...garden.activities, garden.activities[0]],
    [garden.activities[0], garden.activities[0], garden.activities[2]],
    [{ ...garden.activities[0], id: 'unknown' }, ...garden.activities.slice(1)],
    [{ ...garden.activities[0], source: 'microphone' }, ...garden.activities.slice(1)],
    [{ ...garden.activities[0], source: undefined }, ...garden.activities.slice(1)],
    [{ ...garden.activities[0], repetitions: 1 }, ...garden.activities.slice(1)],
    [{ ...garden.activities[0], repetitions: '2' }, ...garden.activities.slice(1)],
    [{ ...garden.activities[0], repetitions: 3 }, ...garden.activities.slice(1)],
    [null, ...garden.activities.slice(1)],
  ])('rejects incomplete or malformed activities %j', activities => {
    expect(cameraRouteResultFromEvent({ ...garden, activities })).toBeNull();
    expect(parseCameraRouteResult(JSON.stringify({ ...garden, version: 1, completedAt: timestamp, activities }))).toBeNull();
  });

  it.each([
    { event: 'camera-route-complete' }, { event: 'keyboard-route-complete' }, { durationSeconds: NaN },
    { durationSeconds: Infinity }, { durationSeconds: 86401 }, { cameraDistance: -1 },
    { manualDistance: Infinity }, { controller: 'keyboard' }, { collectedCount: 2 },
  ])('rejects contradictory garden event fields %j', changes => {
    expect(cameraRouteResultFromEvent({ ...garden, ...changes })).toBeNull();
  });

  it('does not upgrade old routes to completed garden activities', () => {
    const legacy = cameraRouteResultFromEvent(complete, timestamp)!;
    expect(parseCameraRouteResult(JSON.stringify(legacy))).toEqual(legacy);
    expect(parseCameraRouteResult(JSON.stringify({ ...legacy, activities: garden.activities }))).toBeNull();
    expect(parseCameraRouteResult(JSON.stringify({ ...legacy, exercise: 'unknown' }))).toBeNull();
    expect(cameraRouteResultFromEvent({ ...complete, activities: garden.activities })).toBeNull();
  });

  it('normalizes activity order and does not expose nested session state', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } });
    const payload = { ...garden, activities: garden.activities.map(activity => ({ ...activity })).reverse() };
    expect(saveCameraRouteResult('garden-memory', payload).status).toBe('unavailable');
    const result = loadCameraRouteResult('garden-memory').result!;
    expect(result.activities?.map(activity => activity.id)).toEqual(['smile-flower', 'round-fish', 'open-lantern']);
    payload.activities[0].source = 'camera';
    result.activities![0].source = 'manual';
    result.activities!.pop();
    const next = loadCameraRouteResult('garden-memory');
    expect(next.status).toBe('session');
    expect(next.result?.activities).toEqual(garden.activities);
  });
});

describe('legacy world summaries', () => {
  it('reads true completed flags and exact collected counts', () => {
    const result = readLegacyWorldResult(JSON.stringify({ gateOpen: true, bridgeBuilt: false, collected: 4 }));
    expect(result.status).toBe('ready');
    expect(result.progress?.stages).toBe(1);
    expect(result.progress?.stars).toBe(4);
    expect(readLegacyWorldResult(JSON.stringify({ taken: { a: true, b: false } })).progress?.stars).toBe(1);
  });

  it.each([
    { gateOpen: 'false' }, { gateOpen: 1 }, { collected: -1 }, { collected: '3' },
    { starsTotal: 2.5 }, { stagesTotal: -1 }, { taken: [true] }, { taken: { a: 'yes' } },
  ])('rejects malformed fields instead of converting them into achievements: %j', fields => {
    expect(readLegacyWorldResult(JSON.stringify(fields)).status).toBe('invalid');
  });

  it('distinguishes empty progress from unreadable saved data', () => {
    expect(readLegacyWorldResult(undefined).status).toBe('empty');
    expect(readLegacyWorldResult('{}').status).toBe('empty');
    expect(readLegacyWorldResult('{bad').status).toBe('invalid');
    expect(readLegacyWorldResult('[]').status).toBe('invalid');
    expect(readLegacyWorldResult('null').status).toBe('invalid');
    expect(readLegacyWorldResult(JSON.stringify({ gateOpen: false, collected: 0 })).status).toBe('ready');
  });
});
