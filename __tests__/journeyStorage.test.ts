import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearJourneyCheckpoint, persistJourneyCheckpoint, readJourneyCheckpoint } from '../web/echo/journeyStorage';
import { resumeJourney, type SavedJourney } from '../web/echo/journeyState';

const wind: SavedJourney = { version: 1, phase: 'wind', inputMode: 'microphone', inputSources: ['microphone'],
  completed: ['arrival', 'flower'], rounds: 1, elapsedSeconds: 38 };
const complete: SavedJourney = { ...wind, phase: 'complete', completed: ['arrival', 'flower', 'wind'], rounds: 3, elapsedSeconds: 58 };
const storageKey = (childId: string) => `speechsteps:echo-journey:v1:${encodeURIComponent(childId)}`;

afterEach(() => vi.unstubAllGlobals());

function memoryStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => map.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { map.set(key, value); }),
    removeItem: vi.fn((key: string) => { map.delete(key); }),
  };
  vi.stubGlobal('localStorage', storage);
  return { map, storage };
}

describe('shared journey checkpoints', () => {
  it('persists and reloads the real chapter independently for each child', () => {
    memoryStorage();
    expect(persistJourneyCheckpoint('storage-a', wind)).toBe('saved');
    expect(readJourneyCheckpoint('storage-a')).toEqual({ status: 'ready', saved: wind, storageStatus: 'saved' });
    expect(readJourneyCheckpoint('storage-b')).toEqual({ status: 'empty', saved: null, storageStatus: 'idle' });
  });

  it('shares a completed chapter across navigation even when every storage operation fails', () => {
    const blocked = () => { throw new Error('blocked'); };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(persistJourneyCheckpoint('blocked-complete', complete)).toBe('unavailable');
    const resultsScreen = readJourneyCheckpoint('blocked-complete');
    expect(resultsScreen.status).toBe('session');
    expect(resultsScreen.storageStatus).toBe('unavailable');
    expect(resultsScreen.saved).toEqual(complete);
    expect(resumeJourney(resultsScreen.saved!).phase).toBe('complete');
    expect(readJourneyCheckpoint('blocked-new-child').saved).toBeNull();
  });

  it('keeps an unsaved latest checkpoint ahead of an older persistent chapter', () => {
    const { map, storage } = memoryStorage();
    map.set(storageKey('quota'), JSON.stringify(wind));
    storage.setItem.mockImplementation(() => { throw new Error('quota'); });
    expect(persistJourneyCheckpoint('quota', complete)).toBe('unavailable');
    expect(readJourneyCheckpoint('quota').saved?.phase).toBe('complete');
    expect(readJourneyCheckpoint('quota').status).toBe('session');
    expect(JSON.parse(map.get(storageKey('quota'))!).phase).toBe('wind');
  });

  it('can persist a formerly session-only checkpoint when storage becomes available', () => {
    const { storage } = memoryStorage();
    storage.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    expect(persistJourneyCheckpoint('recovered-storage', wind)).toBe('unavailable');
    expect(readJourneyCheckpoint('recovered-storage').status).toBe('session');
    expect(persistJourneyCheckpoint('recovered-storage', complete)).toBe('saved');
    expect(readJourneyCheckpoint('recovered-storage').status).toBe('ready');
    expect(readJourneyCheckpoint('recovered-storage').saved?.phase).toBe('complete');
  });

  it('resumes a session-only partial chapter with touch and no partial input', () => {
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('quota'); } });
    persistJourneyCheckpoint('safe-resume', wind);
    const state = resumeJourney(readJourneyCheckpoint('safe-resume').saved!);
    expect(state.inputMode).toBe('touch');
    expect(state.inputSources).toEqual(['microphone']);
    expect(state.rounds).toBe(1);
    expect(state.progress).toBe(0);
    expect(state.needsRelease).toBe(true);
  });

  it('restart clears both storage and the in-memory result', () => {
    const { map, storage } = memoryStorage();
    persistJourneyCheckpoint('reset-ok', complete);
    expect(clearJourneyCheckpoint('reset-ok')).toBe('idle');
    expect(storage.removeItem).toHaveBeenCalledWith(storageKey('reset-ok'));
    expect(map.has(storageKey('reset-ok'))).toBe(false);
    expect(readJourneyCheckpoint('reset-ok').saved).toBeNull();
  });

  it('restart never resurrects old progress when removal is blocked', () => {
    const { map, storage } = memoryStorage();
    persistJourneyCheckpoint('reset-blocked', complete);
    storage.removeItem.mockImplementation(() => { throw new Error('blocked'); });
    expect(clearJourneyCheckpoint('reset-blocked')).toBe('unavailable');
    expect(map.has(storageKey('reset-blocked'))).toBe(true);
    expect(readJourneyCheckpoint('reset-blocked')).toEqual({ status: 'empty', saved: null, storageStatus: 'unavailable' });
    // A new run can replace the reset marker; the old complete chapter stays hidden.
    storage.setItem.mockImplementation(() => { throw new Error('quota'); });
    expect(persistJourneyCheckpoint('reset-blocked', wind)).toBe('unavailable');
    expect(readJourneyCheckpoint('reset-blocked').saved?.phase).toBe('wind');
  });

  it('copies arrays on input and output so screens cannot corrupt the shared checkpoint', () => {
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('quota'); } });
    const source: SavedJourney = { ...wind, completed: [...wind.completed], inputSources: [...wind.inputSources] };
    persistJourneyCheckpoint('immutable', source);
    source.completed.pop();
    const first = readJourneyCheckpoint('immutable').saved!;
    first.inputSources.push('touch');
    first.completed.pop();
    expect(readJourneyCheckpoint('immutable').saved).toEqual(wind);
  });

  it('rejects malformed checkpoints without overwriting a valid session', () => {
    const { storage } = memoryStorage();
    persistJourneyCheckpoint('malformed', wind);
    expect(persistJourneyCheckpoint('malformed', { ...wind, rounds: 99 })).toBe('invalid');
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(readJourneyCheckpoint('malformed').saved).toEqual(wind);
  });

  it('distinguishes empty, damaged and unreadable persisted chapters', () => {
    const { map, storage } = memoryStorage();
    expect(readJourneyCheckpoint('none').status).toBe('empty');
    map.set(storageKey('damaged'), '{oops');
    expect(readJourneyCheckpoint('damaged').status).toBe('invalid');
    storage.getItem.mockImplementation(() => { throw new Error('blocked'); });
    expect(readJourneyCheckpoint('unreadable').status).toBe('unavailable');
  });

  it('still exposes the session if storage becomes unreadable after a successful save', () => {
    const { storage } = memoryStorage();
    persistJourneyCheckpoint('became-blocked', complete);
    storage.getItem.mockImplementation(() => { throw new Error('blocked'); });
    const result = readJourneyCheckpoint('became-blocked');
    expect(result.status).toBe('session');
    expect(result.storageStatus).toBe('unavailable');
    expect(result.saved?.phase).toBe('complete');
  });
});
