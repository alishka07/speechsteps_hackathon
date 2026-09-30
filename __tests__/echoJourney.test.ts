import { describe, expect, it } from 'vitest';
import {
  advanceJourneyWind, awardJourneySpark, beginJourney, bloomJourneyFlower, initialJourney,
  microphoneNoiseFloor, readSavedJourney, resumeJourney, saveJourney,
  type JourneyInputMode, type JourneyState, type SavedJourney,
} from '../web/echo/journeyState';

function advance(state: JourneyState, active: boolean, milliseconds: number): JourneyState {
  let next = state;
  for (let remaining = milliseconds; remaining > 0; remaining -= 100) {
    next = advanceJourneyWind(next, active, Math.min(100, remaining));
  }
  return next;
}
function windState(inputMode: JourneyInputMode = 'touch'): JourneyState {
  const arrival = { ...initialJourney(), phase: 'arrival' as const, inputMode };
  const flower = bloomJourneyFlower(awardJourneySpark(arrival));
  return { ...flower, phase: 'wind' };
}
function finish(inputMode: JourneyInputMode = 'touch'): JourneyState {
  let state = windState(inputMode);
  for (let round = 0; round < 3; round++) {
    if (round) state = advance(state, false, 1000);
    state = advance(state, true, 1200);
  }
  return state;
}
function roundTrip(state: JourneyState): SavedJourney {
  const result = readSavedJourney(JSON.stringify(saveJourney(state)));
  expect(result).not.toBeNull();
  return result!;
}

describe('Echo Journey milestones', () => {
  it('requires arrival input and awards exactly one spendable spark', () => {
    expect(awardJourneySpark(initialJourney())).toEqual(initialJourney());
    const arrival = { ...initialJourney(), phase: 'arrival' as const, inputMode: 'touch' as const };
    const spark = awardJourneySpark(arrival);
    expect(spark.phase).toBe('flower');
    expect(spark.sparks).toBe(1);
    expect(spark.completed).toEqual(['arrival']);
    expect(spark.inputSources).toEqual(['touch']);
    expect(awardJourneySpark(spark)).toBe(spark);
    const bloomed = bloomJourneyFlower(spark);
    expect(bloomed.sparks).toBe(0);
    expect(bloomed.completed).toEqual(['arrival', 'flower']);
    expect(bloomJourneyFlower(bloomed)).toBe(bloomed);
    expect(bloomJourneyFlower(arrival)).toBe(arrival);
  });

  it('finishes only after three separate 1.2 second rounds', () => {
    let state = advance(windState(), true, 1199);
    expect(state.rounds).toBe(0);
    state = advance(state, true, 1);
    expect(state.rounds).toBe(1);
    expect(state.needsRelease).toBe(true);
    expect(state.phase).toBe('wind');
    const complete = finish();
    expect(complete.phase).toBe('complete');
    expect(complete.rounds).toBe(3);
    expect(complete.completed).toEqual(['arrival', 'flower', 'wind']);
    expect(advance(complete, true, 3000)).toBe(complete);
  });

  it('cannot advance past one round by continuously holding or making sound', () => {
    const state = advance(windState(), true, 10000);
    expect(state.rounds).toBe(1);
    expect(state.progress).toBe(0);
    expect(state.needsRelease).toBe(true);
    expect(state.restMs).toBe(0);
  });

  it('requires 200 continuous milliseconds of quiet, not isolated quiet frames', () => {
    let state = advance(windState(), true, 1200);
    state = advance(state, false, 100);
    state = advance(state, true, 1000);
    state = advance(state, false, 100);
    expect(state.needsRelease).toBe(true);
    state = advance(state, false, 100);
    expect(state.needsRelease).toBe(false);
    expect(advance(state, true, 1200).rounds).toBe(2);
  });

  it('keeps a full second of rest even when release happens immediately', () => {
    let state = advance(windState(), true, 1200);
    state = advance(state, false, 200);
    expect(state.needsRelease).toBe(false);
    expect(state.restMs).toBe(800);
    state = advance(state, true, 800);
    expect(state.progress).toBe(0);
    expect(state.rounds).toBe(1);
    expect(advance(state, true, 1200).rounds).toBe(2);
  });

  it('gradually loses a paused attempt but retains completed rounds', () => {
    let state = advance(windState(), true, 1200);
    state = advance(state, false, 1000);
    state = advance(state, true, 600);
    const partial = state.progress;
    state = advance(state, false, 200);
    expect(state.progress).toBeLessThan(partial);
    expect(state.progress).toBeGreaterThan(0);
    state = advance(state, false, 1600);
    expect(state.rounds).toBe(1);
    expect(state.progress).toBe(0);
  });

  it('does not count stalled frames as a complete breath or accept invalid time', () => {
    const state = windState();
    const stalled = advanceJourneyWind(state, true, 60000);
    expect(stalled.rounds).toBe(0);
    expect(stalled.progress).toBeCloseTo(1 / 12);
    for (const dt of [NaN, Infinity, -1, 0]) expect(advanceJourneyWind(state, true, dt)).toBe(state);
  });

  it('records mixed successful input without counting the flower tap as a second mode', () => {
    const microphone = windState('microphone');
    expect(microphone.inputSources).toEqual(['microphone']);
    const touch = advance({ ...microphone, inputMode: 'touch' }, true, 1200);
    expect(touch.inputSources).toEqual(['microphone', 'touch']);
    const anotherTouchRound = advance(advance(touch, false, 1000), true, 1200);
    expect(anotherTouchRound.inputSources).toEqual(['microphone', 'touch']);
    expect(microphone.inputSources).toEqual(['microphone']);
  });
});

describe('safe journey persistence', () => {
  it('resumes a partial chapter from either main start button without losing completed rounds', () => {
    const saved = roundTrip(advance(windState('microphone'), true, 1200));
    for (const inputMode of ['microphone', 'touch'] as const) {
      const next = beginJourney(initialJourney(), inputMode, saved);
      expect(next.phase).toBe('wind');
      expect(next.inputMode).toBe(inputMode);
      expect(next.rounds).toBe(1);
      expect(next.completed).toEqual(['arrival', 'flower']);
      expect(next.needsRelease).toBe(true);
    }
  });

  it('opens a saved result instead of silently starting over or changing how it was earned', () => {
    const saved = roundTrip(finish('microphone'));
    const next = beginJourney(initialJourney(), 'touch', saved);
    expect(next.phase).toBe('complete');
    expect(next.inputMode).toBe('microphone');
    expect(next.inputSources).toEqual(['microphone']);
    expect(beginJourney(next, 'touch')).toBe(next);
  });

  it('starts a fresh arrival only when there is no saved history', () => {
    expect(beginJourney(initialJourney(), 'touch').phase).toBe('arrival');
    expect(beginJourney(initialJourney(), 'touch').inputMode).toBe('touch');
  });

  it('does not save the welcome screen or partial hold/audio data', () => {
    expect(saveJourney(initialJourney())).toBeNull();
    const saved = roundTrip({ ...advance(windState('microphone'), true, 600), elapsedMs: 12345 });
    expect(Object.keys(saved).sort()).toEqual(['completed', 'elapsedSeconds', 'inputMode', 'inputSources', 'phase', 'rounds', 'version']);
    const resumed = resumeJourney(saved);
    expect(resumed.phase).toBe('wind');
    expect(resumed.progress).toBe(0);
    expect(resumed.inputMode).toBe('touch');
    expect(resumed.inputSources).toEqual(['microphone']);
    expect(resumed.elapsedMs).toBe(12000);
  });

  it('restores an unspent spark only before the flower has bloomed', () => {
    const spark = awardJourneySpark({ ...initialJourney(), phase: 'arrival' });
    expect(resumeJourney(roundTrip(spark)).sparks).toBe(1);
    expect(resumeJourney(roundTrip(bloomJourneyFlower(spark))).sparks).toBe(0);
  });

  it('restores completed rounds with a release and rest before continuing', () => {
    const resumed = resumeJourney(roundTrip(advance(windState(), true, 1200)));
    expect(resumed.rounds).toBe(1);
    expect(resumed.needsRelease).toBe(true);
    expect(resumed.restMs).toBe(1000);
    expect(resumed.progress).toBe(0);
  });

  it.each(['microphone', 'touch'] as const)('preserves %s history when reopening a completed session', inputMode => {
    const resumed = resumeJourney(roundTrip(finish(inputMode)));
    expect(resumed.phase).toBe('complete');
    expect(resumed.inputMode).toBe(inputMode);
    expect(resumed.inputSources).toEqual([inputMode]);
    expect(resumed.progress).toBe(1);
    expect(resumed.needsRelease).toBe(false);
  });

  it('keeps saved arrays independent of subsequent state mutations', () => {
    const state = finish();
    const saved = saveJourney(state)!;
    const resumed = resumeJourney(saved);
    resumed.completed.pop();
    resumed.inputSources.push('microphone');
    expect(saved.completed).toHaveLength(3);
    expect(saved.inputSources).toEqual(['touch']);
    expect(state.completed).toHaveLength(3);
  });

  it('accepts an earlier save without sources while keeping its actual input mode', () => {
    const saved = { ...saveJourney(finish('microphone')) } as Record<string, unknown>;
    delete saved.inputSources;
    const restored = readSavedJourney(JSON.stringify(saved))!;
    expect(restored.inputSources).toEqual(['microphone']);
    expect(resumeJourney(restored).inputMode).toBe('microphone');
  });

  it.each([null, '', '{oops', 'null', '[]', 'true', '12'])('rejects invalid JSON save %s', raw => {
    expect(readSavedJourney(raw)).toBeNull();
  });

  it.each([
    { phase: ['wind'] }, { inputMode: ['touch'] }, { version: 2 }, { rounds: 3 },
    { rounds: -1 }, { rounds: 1.5 }, { elapsedSeconds: -1 }, { elapsedSeconds: '20' },
    { completed: ['wind'] }, { completed: ['arrival', 'arrival'] }, { completed: [] },
    { inputSources: [] }, { inputSources: ['touch', 'touch'] }, { inputSources: ['camera'] },
  ])('rejects malformed or contradictory fields %j', change => {
    const saved = saveJourney(windState());
    expect(readSavedJourney(JSON.stringify({ ...saved, ...change }))).toBeNull();
  });

  it('rejects impossible arrival and completed metadata', () => {
    const complete = saveJourney(finish())!;
    expect(readSavedJourney(JSON.stringify({ ...complete, inputMode: 'microphone' }))).toBeNull();
    expect(readSavedJourney(JSON.stringify({ ...complete, rounds: 2 }))).toBeNull();
    const arrival = saveJourney({ ...initialJourney(), phase: 'arrival' })!;
    expect(readSavedJourney(JSON.stringify({ ...arrival, inputSources: ['touch'] }))).toBeNull();
  });
});

describe('ambient microphone calibration', () => {
  it('uses the quiet portion of samples so a clap does not inflate the threshold', () => {
    expect(microphoneNoiseFloor([0.004, 0.004, 0.005, 0.003, 0.3])).toBe(0.004);
    expect(microphoneNoiseFloor([0.03, 0.032, 0.031, 0.3])).toBe(0.031);
  });
  it('keeps floor estimates finite and bounded for silence or unusable samples', () => {
    expect(microphoneNoiseFloor([0, 0, 0])).toBe(0.001);
    expect(microphoneNoiseFloor([NaN, -1, Infinity])).toBe(0.008);
    expect(microphoneNoiseFloor([1, 1, 1])).toBe(0.08);
    const samples = [0.03, 0.001, 0.004];
    microphoneNoiseFloor(samples);
    expect(samples).toEqual([0.03, 0.001, 0.004]);
  });
});
