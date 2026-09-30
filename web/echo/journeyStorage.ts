import { readSavedJourney, type SavedJourney } from './journeyState';

export type JourneyStorageStatus = 'saved' | 'unavailable' | 'idle';
export interface JourneyCheckpointSnapshot {
  status: 'ready' | 'session' | 'empty' | 'unavailable' | 'invalid';
  saved: SavedJourney | null;
  storageStatus: JourneyStorageStatus;
}
interface SessionCheckpoint {
  saved: SavedJourney | null;
  persisted: boolean;
}

// Shared by the game hook and results screen across SPA navigation. No audio,
// media handles, or incomplete input is stored here or in localStorage.
const checkpoints = new Map<string, SessionCheckpoint>();

function key(childId: string) {
  return `speechsteps:echo-journey:v1:${encodeURIComponent(childId)}`;
}

function copy(saved: SavedJourney): SavedJourney {
  return { ...saved, completed: [...saved.completed], inputSources: [...saved.inputSources] };
}

export function persistJourneyCheckpoint(childId: string, saved: SavedJourney): 'saved' | 'unavailable' | 'invalid' {
  const validated = readSavedJourney(JSON.stringify(saved));
  if (!childId || !validated) return 'invalid';
  checkpoints.set(childId, { saved: validated, persisted: false });
  try {
    localStorage.setItem(key(childId), JSON.stringify(validated));
    checkpoints.set(childId, { saved: validated, persisted: true });
    return 'saved';
  } catch { return 'unavailable'; }
}

export function readJourneyCheckpoint(childId: string): JourneyCheckpointSnapshot {
  const session = checkpoints.get(childId);
  // A failed write/removal must never allow an older persistent chapter to win.
  // A null unsaved entry is the explicit restart tombstone for this session.
  if (session && !session.persisted) {
    return { status: session.saved ? 'session' : 'empty',
      saved: session.saved ? copy(session.saved) : null, storageStatus: 'unavailable' };
  }
  try {
    const raw = localStorage.getItem(key(childId));
    if (!raw) return { status: 'empty', saved: null, storageStatus: 'idle' };
    const saved = readSavedJourney(raw);
    if (saved) return { status: 'ready', saved, storageStatus: 'saved' };
    if (session?.saved) return { status: 'session', saved: copy(session.saved), storageStatus: 'unavailable' };
    return { status: 'invalid', saved: null, storageStatus: 'unavailable' };
  } catch {
    return session?.saved
      ? { status: 'session', saved: copy(session.saved), storageStatus: 'unavailable' }
      : { status: 'unavailable', saved: null, storageStatus: 'unavailable' };
  }
}

export function clearJourneyCheckpoint(childId: string): 'idle' | 'unavailable' {
  checkpoints.set(childId, { saved: null, persisted: false });
  try {
    localStorage.removeItem(key(childId));
    checkpoints.delete(childId);
    return 'idle';
  } catch { return 'unavailable'; }
}
