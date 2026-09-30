import vm from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

import { vision } from '@/data/world/src/vision';

type Shape = { categoryName: string; score: number };
type FaceResult = { faceBlendshapes?: Array<{ categories: Shape[] }> };

function faceHarness() {
  let now = 1000;
  let result: FaceResult = { faceBlendshapes: [{ categories: [
    { categoryName: 'mouthSmileLeft', score: 0.8 },
    { categoryName: 'mouthSmileRight', score: 0.6 },
    { categoryName: 'mouthPucker', score: 0.2 },
    { categoryName: 'mouthFunnel', score: 0.5 },
    { categoryName: 'jawOpen', score: 0.4 },
  ] }] };
  const track = { readyState: 'live', enabled: true, stop: vi.fn() };
  const stream = { getVideoTracks: () => [track], getTracks: () => [track] };
  const video = {
    srcObject: stream as unknown,
    readyState: 4,
    videoWidth: 480,
    videoHeight: 360,
    paused: false,
    ended: false,
    currentTime: 1,
    play: vi.fn(async () => {}),
    pause: vi.fn(),
  };
  const model = { detectForVideo: vi.fn(() => result), close: vi.fn() };
  const createFace = vi.fn<(...args: unknown[]) => Promise<typeof model>>(async () => model);
  const lib = {
    FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
    FaceLandmarker: { createFromOptions: createFace },
  };
  const getUserMedia = vi.fn();
  const context = vm.createContext({
    document: { getElementById: () => video },
    navigator: { mediaDevices: { getUserMedia } },
    performance: { now: () => now },
    console: { warn: vi.fn() },
    setTimeout,
    stream,
    __loadVision: vi.fn(async () => lib),
    updateCamHud: vi.fn(),
  });
  vm.runInContext(vision().replace('import(VIS_CDN)', '__loadVision()'), context);
  const run = <T = unknown>(source: string): T => vm.runInContext(source, context) as T;
  const connect = (state = 'ready') => run(`camStream = stream; camWanted = true; camState = '${state}'; camv.srcObject = stream;`);
  const frame = (ms = 100) => { now += ms; video.currentTime += ms / 1000; };
  return { run, connect, frame, video, track, stream, model, createFace, lib, getUserMedia,
    time: (ms: number) => { now += ms; },
    result: (value: FaceResult) => { result = value; },
  };
}

describe('face controller lifecycle', () => {
  it('does not request media or load a model before the camera is explicitly active', async () => {
    const h = faceHarness();
    await h.run('initFace()');
    await h.run('retryFace()');
    expect(h.run('readFace()')).toBe(false);
    expect(h.createFace).not.toHaveBeenCalled();
    expect(h.getUserMedia).not.toHaveBeenCalled();
  });

  it('loads lazily once on the existing stream, independent of failed hand tracking', async () => {
    const h = faceHarness();
    h.connect('vision-error');
    await Promise.all([h.run('initFace()'), h.run('initFace()')]);
    expect(h.createFace).toHaveBeenCalledTimes(1);
    expect(h.run('mirrorReady()')).toBe(true);
    expect(h.run('mirrorDead()')).toBe(false);
    expect(h.run('readFace()')).toBe(true);
    expect(h.getUserMedia).not.toHaveBeenCalled();
    expect(h.createFace.mock.calls[0][1]).toMatchObject({
      outputFaceBlendshapes: true, runningMode: 'VIDEO', numFaces: 1,
      baseOptions: { delegate: 'CPU' },
    });
  });

  it('rejects and closes a model that finishes after camera stop', async () => {
    const h = faceHarness();
    h.connect();
    let resolve!: (model: typeof h.model) => void;
    h.createFace.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const pending = h.run<Promise<void>>('initFace()');
    await vi.waitFor(() => expect(h.createFace).toHaveBeenCalledTimes(1));
    h.run('stopCamera()');
    resolve(h.model);
    await pending;
    expect(h.model.close).toHaveBeenCalledTimes(1);
    expect(h.track.stop).toHaveBeenCalledTimes(1);
    expect(h.video.srcObject).toBeNull();
    expect(h.run('faceLm')).toBeNull();
    expect(h.run('faceLoading')).toBe(false);
  });

  it('an explicit retry cancels the old model request without overwriting the new one', async () => {
    const h = faceHarness();
    h.connect();
    const oldModel = { ...h.model, close: vi.fn() };
    let resolve!: (model: typeof h.model) => void;
    h.createFace.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const first = h.run<Promise<void>>('initFace()');
    await vi.waitFor(() => expect(h.createFace).toHaveBeenCalledTimes(1));
    await h.run('retryFace()');
    resolve(oldModel);
    await first;
    expect(oldModel.close).toHaveBeenCalledTimes(1);
    expect(h.run('faceLm')).toBe(h.model);
    expect(h.run('readFace()')).toBe(true);
  });

  it('failure is explicit and loading resumes only after retry', async () => {
    const h = faceHarness();
    h.connect();
    h.createFace.mockRejectedValueOnce(new Error('model unavailable'));
    await h.run('initFace()');
    expect(h.run('faceFailed')).toBe(true);
    expect(h.run('faceLoading')).toBe(false);
    expect(h.run('mirrorDead()')).toBe(true);
    expect(h.run('readFace()')).toBe(false);
    expect(h.createFace).toHaveBeenCalledTimes(1);
    await h.run('retryFace()');
    expect(h.createFace).toHaveBeenCalledTimes(2);
    expect(h.run('faceFailed')).toBe(false);
    expect(h.run('readFace()')).toBe(true);
  });
});

describe('face controller fresh samples', () => {
  it('returns normalized movement signals, preserving mirror scoring', async () => {
    const h = faceHarness(); h.connect(); await h.run('initFace()');
    expect(h.run('readFace()')).toBe(true);
    expect(h.run('faceSignal("smile")')).toBeCloseTo(0.7);
    expect(h.run('faceSignal("round")')).toBe(0.5);
    expect(h.run('faceSignal("open")')).toBe(0.4);
    expect(h.run('faceSignal("unknown")')).toBe(0);
    expect(h.run('grimaceVal("Рот")')).toBe(0.4);
    expect(h.run('grimaceVal("Улыбка")')).toBe(0.8);
  });

  it('clamps finite scores and rejects malformed scores and prototype keys', async () => {
    const h = faceHarness(); h.connect(); await h.run('initFace()');
    h.result({ faceBlendshapes: [{ categories: [
      { categoryName: 'jawOpen', score: 5 },
      { categoryName: 'mouthPucker', score: -4 },
      { categoryName: 'mouthFunnel', score: Infinity },
      { categoryName: 'mouthSmileLeft', score: NaN },
      { categoryName: '__proto__', score: 1 },
    ] }] });
    expect(h.run('readFace()')).toBe(true);
    expect(h.run('faceSignal("open")')).toBe(1);
    expect(h.run('faceSignal("round")')).toBe(0);
    expect(h.run('faceSignal("smile")')).toBe(0);
    expect(h.run('Object.keys(visBlend)')).toEqual(['jawOpen', 'mouthPucker']);
  });

  it('throttles inference and advances serial only for a fresh decoded frame', async () => {
    const h = faceHarness(); h.connect(); await h.run('initFace()');
    h.run('readFace()');
    expect(h.run('faceFrameSerial')).toBe(1);
    h.frame(30); h.run('readFace()');
    expect(h.run('faceFrameSerial')).toBe(1);
    h.frame(60); h.run('readFace()');
    expect(h.run('faceFrameSerial')).toBe(2);
    expect(h.model.detectForVideo).toHaveBeenCalledTimes(2);
    expect(h.run('faceFreshAt')).toBe(1090);
  });

  it('a frozen video frame expires by wall time without another inference or hold credit', async () => {
    const h = faceHarness(); h.connect(); await h.run('initFace()');
    h.run('readFace()');
    h.time(250);
    expect(h.run('readFace()')).toBe(true);
    expect(h.run('faceFrameSerial')).toBe(1);
    h.time(101);
    expect(h.run('readFace()')).toBe(false);
    expect(h.run('faceFreshAt')).toBe(0);
    expect(h.run('visBlend')).toEqual({});
    expect(h.model.detectForVideo).toHaveBeenCalledTimes(1);
  });

  it('signal getters discard stale cached scores even if readFace has not run again', async () => {
    const h = faceHarness(); h.connect(); await h.run('initFace()'); h.run('readFace()');
    h.time(400);
    expect(h.run('faceSignal("open")')).toBe(0);
    expect(h.run('grimaceVal("Улыбка")')).toBe(0);
    expect(h.run('faceSeen')).toBe(false);
  });

  it.each(['missing', 'empty', 'invalid'] as const)('clears all scores on %s face output', async (shape) => {
    const h = faceHarness(); h.connect(); await h.run('initFace()'); h.run('readFace()');
    h.result(shape === 'missing' ? {} : { faceBlendshapes: [{ categories:
      shape === 'empty' ? [] : [{ categoryName: 'jawOpen', score: NaN }],
    }] });
    h.frame();
    expect(h.run('readFace()')).toBe(false);
    expect(h.run('faceFrameSerial')).toBe(2);
    expect(h.run('faceFreshAt')).toBe(0);
    expect(h.run('visBlend')).toEqual({});
  });

  it.each(['paused', 'ended', 'not-ready', 'zero-width', 'zero-height', 'wrong-stream', 'dead-track', 'disabled-track', 'invalid-time'] as const)(
    'clears detection when video is %s', async (reason) => {
      const h = faceHarness(); h.connect(); await h.run('initFace()'); h.run('readFace()'); h.frame();
      if (reason === 'paused') h.video.paused = true;
      if (reason === 'ended') h.video.ended = true;
      if (reason === 'not-ready') h.video.readyState = 1;
      if (reason === 'zero-width') h.video.videoWidth = 0;
      if (reason === 'zero-height') h.video.videoHeight = 0;
      if (reason === 'wrong-stream') h.video.srcObject = {};
      if (reason === 'dead-track') h.track.readyState = 'ended';
      if (reason === 'disabled-track') h.track.enabled = false;
      if (reason === 'invalid-time') h.video.currentTime = NaN;
      expect(h.run('readFace()')).toBe(false);
      expect(h.run('faceSeen')).toBe(false);
      expect(h.run('visBlend')).toEqual({});
      expect(h.model.detectForVideo).toHaveBeenCalledTimes(1);
    },
  );

  it('closes an inference failure and accepts an explicit retry without media requests', async () => {
    const h = faceHarness(); h.connect(); await h.run('initFace()'); h.run('readFace()'); h.frame();
    h.model.detectForVideo.mockImplementationOnce(() => { throw new Error('inference failed'); });
    expect(h.run('readFace()')).toBe(false);
    expect(h.model.close).toHaveBeenCalledTimes(1);
    expect(h.run('faceFailed')).toBe(true);
    expect(h.run('visBlend')).toEqual({});
    await h.run('retryFace()');
    expect(h.run('readFace()')).toBe(true);
    expect(h.run('faceFrameSerial')).toBe(2);
    expect(h.getUserMedia).not.toHaveBeenCalled();
  });

  it('reset invalidates scores and keeps serial monotonic across exercise sessions', async () => {
    const h = faceHarness(); h.connect(); await h.run('initFace()'); h.run('readFace()');
    h.run('resetFaceTracking()');
    expect(h.run('faceSeen')).toBe(false);
    expect(h.run('faceFreshAt')).toBe(0);
    expect(h.run('faceFrameSerial')).toBe(1);
    h.frame(); h.run('readFace()');
    expect(h.run('faceFrameSerial')).toBe(2);
    h.run('stopCamera()');
    expect(h.run('faceSeen')).toBe(false);
    expect(h.run('faceFailed')).toBe(false);
    expect(h.model.close).toHaveBeenCalledTimes(1);
  });
});
