import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceJourneyWind, awardJourneySpark, beginJourney, bloomJourneyFlower, initialJourney,
  microphoneNoiseFloor, resumeJourney, saveJourney,
  type JourneyInputMode, type JourneyState, type JourneyStep, type SavedJourney } from './journeyState';
import { clearJourneyCheckpoint, persistJourneyCheckpoint, readJourneyCheckpoint,
  type JourneyStorageStatus } from './journeyStorage';

export type MicrophoneStatus = 'idle' | 'requesting' | 'calibrating' | 'listening' | 'denied' | 'unavailable' | 'paused';
export type { JourneyStorageStatus } from './journeyStorage';
export interface EchoJourneySummary {
  durationSeconds: number;
  inputMode: JourneyInputMode;
  inputSources: JourneyInputMode[];
  completedSteps: JourneyStep[];
  completedAt: string;
}
interface EchoJourneyOptions {
  childId: string;
  resumeOnLoad?: boolean;
  onComplete?: (summary: EchoJourneySummary) => void;
}
interface MicrophoneSession {
  stream: MediaStream;
  context: AudioContext;
  analyser: AnalyserNode;
  samples: Float32Array<ArrayBuffer>;
  noiseSamples: number[];
  calibrationMs: number;
  floor: number;
  signalMs: number;
}
interface PendingMicrophone {
  stream: MediaStream | null;
  context: AudioContext;
}

export function useEchoJourney({ childId, onComplete, resumeOnLoad = false }: EchoJourneyOptions) {
  const [state, setState] = useState<JourneyState>(initialJourney);
  const [micStatus, setMicStatus] = useState<MicrophoneStatus>('idle');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedJourney, setHasSavedJourney] = useState(false);
  const [storageStatus, setStorageStatus] = useState<JourneyStorageStatus>('idle');
  const stateRef = useRef(state);
  const savedRef = useRef<SavedJourney | null>(null);
  const microphone = useRef<MicrophoneSession | null>(null);
  const pendingMicrophone = useRef<PendingMicrophone | null>(null);
  const held = useRef(false);
  const narration = useRef({ active: false, quietUntil: 0 });
  const mounted = useRef(false);
  const requestId = useRef(0);
  const reported = useRef(false);
  const wakeFrame = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const update = useCallback((next: JourneyState) => {
    stateRef.current = next;
    if (mounted.current) setState(next);
    if (next.phase !== 'complete') wakeFrame.current?.();
  }, []);

  const persist = useCallback(() => {
    const saved = saveJourney(stateRef.current);
    if (!saved) return;
    savedRef.current = saved;
    const status = persistJourneyCheckpoint(childId, saved);
    if (mounted.current) {
      // This flag means a chapter can be resumed. storageStatus describes
      // whether that checkpoint will survive a page reload.
      setHasSavedJourney(status !== 'invalid');
      setStorageStatus(status === 'saved' ? 'saved' : 'unavailable');
    }
  }, [childId]);

  const stopMicrophone = useCallback(() => {
    requestId.current += 1;
    const session = microphone.current;
    const pending = pendingMicrophone.current;
    microphone.current = null;
    pendingMicrophone.current = null;
    held.current = false;
    if (session) {
      session.stream.getTracks().forEach((track) => track.stop());
      session.analyser.disconnect();
      void session.context.close().catch(() => undefined);
    }
    if (pending) {
      pending.stream?.getTracks().forEach((track) => track.stop());
      void pending.context.close().catch(() => undefined);
    }
    if (mounted.current) { setMicStatus('idle'); setLevel(0); }
  }, []);

  const begin = useCallback((inputMode: JourneyInputMode) => {
    const current = stateRef.current;
    const next = beginJourney(current, inputMode, savedRef.current);
    if (current.phase === 'welcome') reported.current = next.phase === 'complete';
    held.current = false;
    update(next);
    return next;
  }, [update]);

  const startWithMicrophone = useCallback(async () => {
    stopMicrophone();
    setError(null);
    if (begin('microphone').phase === 'complete') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicStatus('unavailable');
      setError('Микрофон недоступен в этом браузере. Можно пройти историю касаниями.');
      return;
    }
    const generation = requestId.current;
    setMicStatus('requesting');
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    try {
      const AudioContextConstructor = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) throw new Error('AudioContext unavailable');
      // Resume inside the click gesture, before permission UI consumes user activation.
      context = new AudioContextConstructor();
      pendingMicrophone.current = { stream: null, context };
      const audioReady = context.resume().then(() => true, () => false);
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false }, video: false,
      });
      if (!mounted.current || generation !== requestId.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      // Keep ownership while resume is pending so a mode switch can stop tracks now.
      pendingMicrophone.current = { stream, context };
      const ready = await audioReady;
      if (!mounted.current || generation !== requestId.current) {
        stream.getTracks().forEach((track) => track.stop());
        void context.close().catch(() => undefined);
        return;
      }
      if (!ready || context.state !== 'running' || !stream.getAudioTracks().some(track => track.readyState === 'live')) {
        throw new Error('Microphone audio is not running');
      }
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      // The microphone graph intentionally has no connection to speakers.
      microphone.current = { stream, context, analyser, samples: new Float32Array(analyser.fftSize),
        noiseSamples: [], calibrationMs: 0, floor: 0.008, signalMs: 0 };
      pendingMicrophone.current = null;
      setMicStatus('calibrating');
      stream.getAudioTracks().forEach((track) => track.addEventListener('ended', () => {
        if (microphone.current?.stream !== stream || !mounted.current) return;
        stopMicrophone();
        setMicStatus('unavailable');
        setError('Микрофон отключился. Подключи его снова или продолжи касаниями.');
      }, { once: true }));
      if (document.hidden) {
        void context.suspend().catch(() => undefined);
        setMicStatus('paused');
      }
    } catch (cause) {
      if (pendingMicrophone.current?.context === context) pendingMicrophone.current = null;
      if (microphone.current?.context === context) microphone.current = null;
      stream?.getTracks().forEach((track) => track.stop());
      if (context) void context.close().catch(() => undefined);
      if (!mounted.current || generation !== requestId.current) return;
      const name = cause instanceof DOMException ? cause.name : '';
      const denied = name === 'NotAllowedError' || name === 'PermissionDeniedError';
      setMicStatus(denied ? 'denied' : 'unavailable');
      setError(denied ? 'Доступ к микрофону не разрешён. Историю можно пройти касаниями.'
        : 'Не удалось включить микрофон. Попробуй снова или продолжи касаниями.');
    }
  }, [begin, stopMicrophone]);

  const startWithTouch = useCallback(() => {
    stopMicrophone();
    setError(null);
    begin('touch');
  }, [begin, stopMicrophone]);

  const setNarrating = useCallback((active: boolean) => {
    narration.current = { active, quietUntil: active ? Infinity : performance.now() + 350 };
    held.current = false;
    if (microphone.current) microphone.current.signalMs = 0;
    if (mounted.current) setLevel(0);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const checkpoint = readJourneyCheckpoint(childId);
    savedRef.current = checkpoint.saved;
    setStorageStatus(checkpoint.storageStatus);
    setHasSavedJourney(!!savedRef.current);
    setMicStatus('idle');
    setLevel(0);
    setError(null);
    reported.current = resumeOnLoad && savedRef.current?.phase === 'complete';
    narration.current = { active: false, quietUntil: 0 };
    // Opening a checkpoint never reconnects a device. Incomplete chapters
    // resume with touch controls until the player explicitly chooses a mic.
    update(resumeOnLoad && savedRef.current ? resumeJourney(savedRef.current) : initialJourney());
    let last = performance.now();
    let lastPublished = 0;
    let frame = 0;
    let pageHidden = false;
    let smoothedLevel = 0;

    const tick = (now: number) => {
      frame = 0;
      const visibleElapsed = Math.max(0, now - last);
      const dt = Math.min(100, visibleElapsed);
      last = now;
      let current = stateRef.current;
      if (!document.hidden && current.phase !== 'welcome' && current.phase !== 'complete') {
        current = { ...current, elapsedMs: current.elapsedMs + visibleElapsed };
        const inputAllowed = !narration.current.active && now >= narration.current.quietUntil;
        let active = inputAllowed && current.inputMode === 'touch' && held.current;
        const mic = microphone.current;
        if (inputAllowed && current.inputMode === 'microphone' && mic && mic.context.state === 'running') {
          mic.analyser.getFloatTimeDomainData(mic.samples);
          let squareSum = 0;
          for (const sample of mic.samples) squareSum += sample * sample;
          const rms = Math.sqrt(squareSum / mic.samples.length);
          if (mic.calibrationMs < 700) {
            mic.noiseSamples.push(rms);
            mic.calibrationMs += dt;
            if (mic.calibrationMs >= 700) {
              mic.floor = microphoneNoiseFloor(mic.noiseSamples);
              mic.noiseSamples = [];
              setMicStatus('listening');
            }
          } else {
            const threshold = Math.max(0.012, mic.floor * 2.5 + 0.004);
            active = rms > threshold;
            // Follow slow background changes only while the input is quiet.
            if (!active) mic.floor = Math.max(0.001, mic.floor * 0.997 + rms * 0.003);
            mic.signalMs = active ? mic.signalMs + dt : Math.max(0, mic.signalMs - dt * 2);
            smoothedLevel += (Math.min(1, rms / Math.max(0.06, threshold * 3)) - smoothedLevel) * 0.3;
            if (current.phase === 'arrival' && (mic.signalMs >= 90 || rms > threshold * 3)) {
              current = awardJourneySpark(current);
            }
          }
        } else smoothedLevel = 0;
        if (inputAllowed) current = advanceJourneyWind(current, active, dt);
        stateRef.current = current;
        if (current.phase === 'complete' && !reported.current) {
          reported.current = true;
          persist();
          stopMicrophone();
          update(current);
          onCompleteRef.current?.({ durationSeconds: Math.floor(current.elapsedMs / 1000),
            inputMode: current.inputMode, inputSources: [...current.inputSources],
            completedSteps: [...current.completed], completedAt: new Date().toISOString() });
        } else if (now - lastPublished >= 80) {
          lastPublished = now;
          setLevel(current.inputMode === 'touch' ? (active ? 0.65 : 0) : smoothedLevel);
          setState(current);
        }
      }
      if (!frame && !pageHidden && !document.hidden && stateRef.current.phase !== 'complete') frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (frame || pageHidden || document.hidden || !mounted.current) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    wakeFrame.current = wake;
    frame = requestAnimationFrame(tick);

    const release = () => { held.current = false; };
    const hide = () => {
      persist();
      pageHidden = true;
      cancelAnimationFrame(frame);
      frame = 0;
      stopMicrophone();
    };
    const show = () => {
      pageHidden = false;
      if (stateRef.current.phase !== 'complete') wake();
    };
    const visibility = () => {
      last = performance.now();
      release();
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (stateRef.current.phase !== 'complete') wake();
      const mic = microphone.current;
      if (!mic) return;
      if (document.hidden) {
        setMicStatus('paused');
        setLevel(0);
        void mic.context.suspend().catch(() => undefined);
      } else {
        void mic.context.resume().then(() => {
          if (microphone.current === mic && mounted.current) {
            setMicStatus(mic.calibrationMs < 700 ? 'calibrating' : 'listening');
          }
        }).catch(() => { if (mounted.current) setMicStatus('paused'); });
      }
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      mounted.current = false;
      persist();
      cancelAnimationFrame(frame);
      wakeFrame.current = null;
      stopMicrophone();
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [childId, persist, stopMicrophone, update, resumeOnLoad]);

  useEffect(() => { persist(); }, [state.phase, state.rounds, state.completed.length, persist]);

  const createTouchSpark = useCallback(() => {
    if (stateRef.current.inputMode === 'touch') update(awardJourneySpark(stateRef.current));
  }, [update]);
  const bloomFlower = useCallback(() => {
    update(bloomJourneyFlower(stateRef.current));
  }, [update]);
  const continueToWind = useCallback(() => {
    const current = stateRef.current;
    if (current.phase === 'flower' && current.completed.includes('flower')) {
      update({ ...current, phase: 'wind', progress: 0, restMs: 0 });
    }
  }, [update]);
  const startTouchWind = useCallback(() => {
    // Preserve an intentional click during the brief narration tail; the frame
    // loop still waits for the audio gate before progressing the gust.
    if (stateRef.current.inputMode === 'touch' && stateRef.current.phase === 'wind' && !document.hidden) held.current = true;
  }, []);
  const stopTouchWind = useCallback(() => { held.current = false; }, []);
  const restart = useCallback(() => {
    stopMicrophone();
    setError(null);
    reported.current = false;
    narration.current = { active: false, quietUntil: 0 };
    savedRef.current = null;
    setHasSavedJourney(false);
    setStorageStatus(clearJourneyCheckpoint(childId));
    update(initialJourney());
  }, [childId, stopMicrophone, update]);
  const resume = useCallback(() => {
    const saved = savedRef.current;
    if (!saved) return;
    stopMicrophone();
    setError(null);
    reported.current = saved.phase === 'complete';
    update(resumeJourney(saved));
  }, [stopMicrophone, update]);

  return { ...state, micStatus, level, error, hasSavedJourney, storageStatus,
    savedJourneyComplete: savedRef.current?.phase === 'complete',
    elapsedSeconds: Math.floor(state.elapsedMs / 1000), restSeconds: Math.ceil(state.restMs / 1000),
    startWithMicrophone, startWithTouch, retryMicrophone: startWithMicrophone,
    createTouchSpark, bloomFlower, startTouchWind, stopTouchWind, continueToWind, restart, resume, setNarrating };
}
