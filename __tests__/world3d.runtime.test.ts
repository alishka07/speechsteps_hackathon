import vm from 'node:vm';

import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { worldPage } from '@/data/world';

/**
 * Дымовой запуск мира без браузера.
 *
 * Разбор парсером ловит опечатки, но не ловит главного риска перестройки:
 * модуль обращается к тому, чего в его области видимости ещё нет. Поэтому здесь
 * мир собирается по-настоящему — на НАСТОЯЩЕЙ Three.js (r149, та же, что вшита
 * в страницу), с заглушками только там, где нужен GPU, микрофон и таймеры.
 * Затем прокручиваются кадры главного цикла: если зона, персонаж или тренер
 * сломаны, тест падает здесь, а не на устройстве.
 */

/**
 * THREE.Clock берёт время из глобального performance, а не из песочницы, —
 * поэтому кадры «пролетали» за микросекунды и ни одна шкала не успевала расти.
 * Здесь временем управляет тест: шаг кадра прибавляет ровно столько, сколько
 * прошло бы в игре.
 */
let clockMs = 0;
const realNow = performance.now.bind(performance);
beforeAll(() => {
  performance.now = () => clockMs;
});
afterAll(() => {
  performance.now = realNow;
});

interface WorldBridge {
  zone(): string | null;
  flags(): Record<string, boolean>;
  fills(): Record<string, number>;
  stars(): { total: number; taken: number };
  garden(): { active: boolean; complete: boolean; results: Array<{ id: string; source: string; repetitions: number }> };
  moveTo(x: number, z: number): void;
  position(): { x: number; y: number; z: number };
  mic(v: Record<string, number>): void;
  pose(): { seen: boolean; full: boolean; lean: number; walk: number; handUp: boolean; near: number };
  poseFrame(landmarks: Array<{ x: number; y: number; visibility: number }> | null): boolean;
  coach(): string | null;
  objective(): string;
  time(): number;
}

interface Harness {
  errors: string[];
  mediaRequests: Array<{ audio?: boolean; video?: unknown }>;
  mediaPending: Array<{ resolve: (stream: unknown) => void; reject: (error: unknown) => void }>;
  events: Array<Record<string, unknown>>;
  event: (name: string, data?: Record<string, unknown>) => void;
  visibility: (hidden: boolean) => void;
  scene: () => THREE.Scene | null;
  el: (id: string) => StubEl;
  /** Прокрутить кадры игрового цикла; ms — сколько времени «проходит» за кадр. */
  step: (frames?: number, ms?: number) => number;
  world: () => WorldBridge;
  start: () => void;
}

interface StubEl {
  id: string;
  style: Record<string, string>;
  classList: { add(c: string): void; remove(c: string): void; toggle(c: string, on?: boolean): void; contains(c: string): boolean };
  textContent: string;
  innerHTML: string;
  children: StubEl[];
  appendChild(c: StubEl): void;
  addEventListener(ev: string, fn: (data?: Record<string, unknown>) => void): void;
  fire(ev: string, data?: Record<string, unknown>): void;
  [k: string]: unknown;
}

function makeEl(id: string): StubEl {
  const classes = new Set<string>();
  const handlers: Record<string, Array<(data?: Record<string, unknown>) => void>> = {};
  let text = '';
  let html = '';
  const el: StubEl = {
    id,
    style: {},
    classList: {
      add: (c) => void classes.add(c),
      remove: (c) => void classes.delete(c),
      toggle: (c, on) => void (on ? classes.add(c) : classes.delete(c)),
      contains: (c) => classes.has(c),
    },
    // настоящий DOM приводит textContent к строке — заглушка обязана тоже,
    // иначе счётчики «проходят» тест числами, а в браузере ведут себя иначе
    get textContent() {
      return text;
    },
    set textContent(v: string) {
      text = String(v);
    },
    get innerHTML() { return html; },
    set innerHTML(value: string) {
      html = value;
      this.children = [];
    },
    children: [],
    appendChild(c) {
      this.children.push(c);
    },
    addEventListener(ev, fn) {
      (handlers[ev] ??= []).push(fn);
    },
    fire(ev, data = {}) {
      for (const fn of handlers[ev] ?? []) fn(data);
    },
    onclick: null,
    srcObject: null,
    videoWidth: 0,
    play: () => Promise.resolve(),
    focus: () => {},
    pause: () => {},
    setAttribute: () => {},
    currentTime: 0,
    setPointerCapture: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: id === 'knob' ? 60 : 128, height: id === 'knob' ? 60 : 128 }),
    getContext: () => ({
      createLinearGradient: () => ({ addColorStop: () => {} }),
      // Radial glow textures use the same CanvasGradient API as the sky.
      createRadialGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      set fillStyle(_v: unknown) {},
    }),
    width: 0,
    height: 0,
  };
  return el;
}

/** Минимальный AudioContext: мир только строит узлы и задаёт огибающие. */
function audioStub() {
  const param = () => ({
    value: 0,
    setValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
  });
  const node = () => ({ connect: () => {}, disconnect: () => {}, start: () => {}, stop: () => {}, frequency: param(), gain: param(), type: '' });
  return class {
    state = 'running';
    currentTime = 0;
    sampleRate = 44100;
    destination = {};
    resume() {}
    createOscillator() {
      return node();
    }
    createGain() {
      return node();
    }
    createBiquadFilter() {
      return { ...node(), frequency: param(), type: '' };
    }
    createBufferSource() {
      return { ...node(), buffer: null, loop: false };
    }
    createBuffer(_ch: number, len: number) {
      return { getChannelData: () => new Float32Array(len) };
    }
    createAnalyser() {
      return { ...node(), fftSize: 1024, frequencyBinCount: 512, getByteTimeDomainData: () => {}, getByteFrequencyData: () => {} };
    }
    createMediaStreamSource() {
      return node();
    }
  };
}

function launch(page: string, savedState: string | null = null, options: { vision?: () => Promise<unknown>; demoOnly?: boolean } = {}): Harness {
  const open = page.lastIndexOf('<script>');
  let src = page.slice(open + '<script>'.length, page.indexOf('<\/script>', open));
  // Only the network import is replaced; the production permission, model
  // creation, video lifecycle and detection code still run in the VM.
  if (options.vision) src = src.replace('import(VIS_CDN)', 'window.__loadVision()');

  const els = new Map<string, StubEl>();
  const el = (id: string) => {
    let e = els.get(id);
    if (!e) els.set(id, (e = makeEl(id)));
    return e;
  };
  const errors: string[] = [];
  const mediaRequests: Harness['mediaRequests'] = [];
  const mediaPending: Harness['mediaPending'] = [];
  const events: Harness['events'] = [];
  const windowEvents: Record<string, Array<(event: Record<string, unknown>) => void>> = {};
  let renderedScene: THREE.Scene | null = null;
  let frames = 0;
  // очередь, а не один слот: мир заказывает кадр и из главного цикла, и из
  // всплывающей реплики — одиночный слот терял главный цикл
  let queue: Array<() => void> = [];

  const documentEvents: Record<string, Array<() => void>> = {};
  const document = {
    hidden: false,
    getElementById: (id: string) => el(id),
    createElement: (tag: string) => makeEl(tag),
    addEventListener: (name: string, fn: () => void) => { (documentEvents[name] ??= []).push(fn); },
  };
  const win: Record<string, unknown> = {
    THREE,
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    addEventListener: (name: string, fn: (event: Record<string, unknown>) => void) => {
      (windowEvents[name] ??= []).push(fn);
    },
    focus: () => {},
    AudioContext: audioStub(),
    __loadVision: options.vision,
    SpeechSteps: {
      getConfig: () => JSON.stringify({ difficulty: 'normal', demoOnly: options.demoOnly }),
      getMissions: () => JSON.stringify({}),
      loadState: () => savedState,
      saveState: () => {},
      onEvent: (data: string) => events.push(JSON.parse(data)),
    },
  };

  // GPU нет — рендер заглушаем, остальная Three.js работает по-настоящему
  const ThreeStub = Object.create(THREE) as Record<string, unknown>;
  ThreeStub.WebGLRenderer = class {
    shadowMap = { enabled: false, type: 0 };
    setPixelRatio() {}
    setSize() {}
    render(scene: THREE.Scene) {
      renderedScene = scene;
      frames++;
    }
  };
  win.THREE = ThreeStub;

  const ctx: Record<string, unknown> = {
    window: win,
    document,
    navigator: {
      mediaDevices: {
        getUserMedia: (constraints: Harness['mediaRequests'][number]) => {
          mediaRequests.push(constraints);
          // Permission remains unanswered: tests can still exercise local input
          // and inject microphone features without creating a real device stream.
          return new Promise((resolve, reject) => mediaPending.push({ resolve, reject }));
        },
      },
    },
    performance: { now: () => clockMs },
    requestAnimationFrame: (fn: () => void) => queue.push(fn),
    setTimeout: () => 0,
    clearTimeout: () => {},
    atob: (s: string) => Buffer.from(s, 'base64').toString('binary'),
    console: { log: () => {}, warn: () => {}, error: (m: unknown) => errors.push(String(m)) },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'world.js' });

  const step = (count = 40, ms = 33) => {
    // каждый кадр сам заказывает следующий — прокручиваем очередь вручную
    for (let i = 0; i < count && queue.length; i++) {
      clockMs += ms;
      const video = el('camv');
      if (video.srcObject) video.currentTime = Number(video.currentTime) + ms / 1000;
      const due = queue;
      queue = [];
      for (const fn of due) fn();
    }
    return frames;
  };

  return {
    errors,
    mediaRequests,
    mediaPending,
    events,
    event: (name, data = {}) => {
      for (const fn of windowEvents[name] ?? []) fn(data);
    },
    visibility: (hidden) => {
      document.hidden = hidden;
      for (const fn of documentEvents.visibilitychange ?? []) fn();
    },
    scene: () => renderedScene,
    el,
    step,
    world: () => win.__world as WorldBridge,
    start: () => {
      el('goKeyboard').fire('click');
      step(1);
    },
  };
}

/** Похоже на настоящий гласный: звонко, низкий центроид, без шипения. */
const VOWEL = { rms: 0.55, lo: 0.4, mid: 0.3, hiss: 0.05, centroid: 900 };
/** Похоже на «С»: шумно на высоких, без голоса. */
const HISS = { rms: 0.35, hiss: 0.6, sh: 0.15, centroid: 5200 };


describe('мир запускается', () => {
  const page = worldPage();

  it('собирает сцену без ошибок', () => {
    const h = launch(page);
    expect(h.errors).toEqual([]);
    expect(h.mediaRequests).toEqual([]);
  });

  it('проходит вступление и крутит главный цикл', () => {
    const h = launch(page);
    h.start();
    expect(h.step()).toBeGreaterThan(30);
    expect(h.errors).toEqual([]);
  });

  it('показывает цель и трекер этапов после старта', () => {
    const h = launch(page);
    h.start();
    h.step();
    expect(h.el('objTitle').textContent.length).toBeGreaterThan(0);
    expect(h.el('objHint').textContent.length).toBeGreaterThan(0);
    // 4 базовых этапа + 6 мини-игр: «Зеркало» выпадает, камеры в песочнице нет
    expect(h.el('track').children.length).toBe(10);
    expect(h.el('scTotal').textContent).toBe('10');
  });

  it('без камеры мир всё равно проходится, только без зеркала', () => {
    // Камеры в песочнице нет — ровно тот случай, когда жюри открывает проект
    // на машине без веб-камеры. Мир не должен запираться на недоступной зоне.
    const h = launch(page);
    h.start();
    h.step();
    expect(h.el('camText').textContent).toContain('джойстик');
    expect(h.mediaRequests).toEqual([]);
    expect(h.el('camv').srcObject).toBeNull();
    expect(h.el('scTotal').textContent).toBe('10');
    expect(h.errors).toEqual([]);
  });

  it('восстанавливает сохранённый прогресс', () => {
    const saved = JSON.stringify({
      gateOpen: true, bridgeBuilt: true, flewUp: true, treasureOpen: true,
      rhythmDone: true, fountainDone: true, roarDone: true, lullabyDone: true,
      trafficDone: true, mirrorDone: true, dungeonDone: true,
      collected: 3, taken: { g0: true, g1: true, g2: true },
    });
    const h = launch(page, saved);
    h.start();
    h.step();
    expect(h.errors).toEqual([]);
    // Saved mirror progress is retained, but the disabled camera zone does not
    // inflate today's counter to 11/10.
    expect(h.el('scStages').textContent).toBe('10');
    expect(h.el('scStages').textContent).toBe(h.el('scTotal').textContent);
    expect(Number(h.el('scStars').textContent)).toBeGreaterThanOrEqual(3);
  });

  it('перезапуск сбрасывает мир без ошибок', () => {
    const h = launch(page);
    h.start();
    h.step();
    h.el('again').fire('click');
    h.step();
    expect(h.errors).toEqual([]);
    expect(h.el('scStages').textContent).toBe('0');
  });

  it('после перезапуска пройденная зона не засчитывается заново', () => {
    const h = launch(page);
    h.start();
    h.world().moveTo(18, 0);
    h.world().mic(VOWEL);
    h.step(60);
    expect(h.world().flags().gate).toBe(true);

    h.el('again').fire('click');
    // молча возвращаемся к воротам: шкала должна начаться с нуля
    h.start();
    h.world().moveTo(18, 0);
    h.world().mic({ rms: 0 });
    h.step(3);
    expect(h.world().flags().gate).toBeFalsy();
    expect(h.world().fills().gate ?? 0).toBeLessThan(0.2);
  });
});

describe('3D геометрия и управление без камеры', () => {
  const page = worldPage();
  const key = (code: string, value: string) => ({ code, key: value, preventDefault: () => {} });

  it('передаёт рендереру конечные координаты всей новой сцены', () => {
    const h = launch(page);
    h.start();
    h.step(5);
    const scene = h.scene();
    expect(scene).not.toBeNull();
    const geometries = new Set<THREE.BufferGeometry>();
    scene!.updateMatrixWorld(true);
    scene!.traverse((object) => {
      expect(object.matrixWorld.elements.every(Number.isFinite), object.type).toBe(true);
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
    });
    expect(geometries.size).toBeGreaterThan(100);
    for (const geometry of geometries) {
      const positions = geometry.getAttribute('position');
      if (positions) expect(Array.from(positions.array).every(Number.isFinite), geometry.type).toBe(true);
    }
    expect(h.errors).toEqual([]);
  });

  it.each([
    ['KeyW', 'ц', 'x', 1], ['KeyS', 'ы', 'x', -1],
    ['KeyA', 'ф', 'z', -1], ['KeyD', 'в', 'z', 1],
  ] as const)('%s работает с русской раскладкой и отпускается', (code, value, axis, sign) => {
    const h = launch(page);
    h.start();
    const from = h.world().position();
    h.event('keydown', key(code, value));
    h.step(15);
    expect((h.world().position()[axis] - from[axis]) * sign).toBeGreaterThan(1);
    h.event('keyup', key(code, value));
    h.step(35);
    const stopped = h.world().position();
    h.step(15);
    expect(h.world().position()[axis]).toBeCloseTo(stopped[axis], 3);
  });

  it('потеря фокуса останавливает ходьбу без потерянного keyup', () => {
    const h = launch(page);
    h.start();
    h.event('keydown', key('KeyW', 'w'));
    h.step(10);
    h.event('blur');
    const stopped = h.world().position();
    h.step(30);
    expect(h.world().position()).toEqual(stopped);
    expect(h.el('pause').style.display).toBe('flex');
    h.event('focus'); h.step(10);
    expect(h.world().position()).toEqual(stopped);
    h.el('resumeGame').fire('click');
    h.event('keydown', key('KeyW', 'w')); h.step(10);
    expect(h.world().position().x).toBeGreaterThan(stopped.x);
  });

  it.each([[104, 48], [88, 40]])('джойстик %spx центрирует ручку %spx и держит её внутри', (size, knob) => {
    const h = launch(page); h.start();
    h.el('joy').getBoundingClientRect = () => ({ left: 0, top: 0, width: size, height: size });
    h.el('joy').clientWidth = h.el('joy').clientHeight = size - 4;
    h.el('knob').getBoundingClientRect = () => ({ left: 0, top: 0, width: knob, height: knob });
    h.el('joy').fire('pointerdown', { pointerId: 1, clientX: size / 2, clientY: size / 2 });
    expect(h.el('knob').style.left).toBe((size - 4) / 2 + 'px');
    expect(h.el('knob').style.top).toBe((size - 4) / 2 + 'px');
    const before = h.world().position(); h.step(5); expect(h.world().position()).toEqual(before);
    h.el('joy').fire('pointermove', { pointerId: 1, clientX: size * 2, clientY: size / 2 });
    expect(parseFloat(h.el('knob').style.left) + knob / 2).toBeLessThanOrEqual(size - 4);
    h.step(8); expect(h.world().position().z).toBeGreaterThan(before.z);
    h.el('joy').fire('lostpointercapture', { pointerId: 1 });
    expect(h.el('knob').style.left).toBe('50%'); expect(h.el('knob').style.top).toBe('50%');
  });

  it('повторный выбор управления сбрасывает поворот камеры и не принимает скрытый ввод', () => {
    const h = launch(page); h.start();
    h.event('keydown', key('KeyQ', 'q')); h.step(30); h.event('keyup', key('KeyQ', 'q'));
    h.el('again').fire('click');
    expect(h.el('start').style.display).toBe('flex');
    h.event('keydown', key('KeyW', 'w')); h.step(10);
    expect(h.world().position()).toEqual({ x: -6, y: 0, z: 0 });
    h.start(); h.event('keydown', key('KeyW', 'w')); h.step(15);
    expect(h.world().position().x).toBeGreaterThan(-5);
    expect(h.world().position().z).toBeCloseTo(0, 6);
    expect(h.mediaRequests).toEqual([]);
  });

  it('Space на кнопке камеры не перехватывается прыжком', () => {
    const h = launch(page); h.start();
    let prevented = false;
    h.event('keydown', { code: 'Space', key: ' ', target: { closest: (selector: string) => selector === 'button' ? { tagName: 'BUTTON' } : null }, preventDefault() { prevented = true; } });
    h.step(8);
    expect(prevented).toBe(false);
    expect(h.world().position().y).toBe(0);
  });

  it('WASD работает с фокусом на кнопке после отключения камеры', () => {
    const h = launch(page); h.start(); h.el('camToggle').fire('click'); h.el('camToggle').fire('click');
    const before = h.world().position();
    h.event('keydown', { code: 'KeyW', key: 'ц', target: { closest: (selector: string) => selector === 'button' ? { tagName: 'BUTTON' } : null }, preventDefault() {} });
    h.step(12);
    expect(h.world().position().x - before.x).toBeGreaterThan(1);
  });

  it.each([null, JSON.stringify({ gateOpen: true, bridgeBuilt: true })])(
    'Space поднимает героя и приземляет один раз за нажатие (прогресс %s)', (saved) => {
      const h = launch(page, saved);
      h.start();
      h.event('keydown', key('Space', ' '));
      h.step(8);
      expect(h.world().position().y).toBeGreaterThan(0.8);
      h.step(75);
      expect(h.world().position().y).toBe(0);
      h.step(20);
      expect(h.world().position().y).toBe(0);
      h.event('keyup', key('Space', ' '));
      h.step(1);
      h.event('keydown', key('Space', ' '));
      h.step(3);
      expect(h.world().position().y).toBeGreaterThan(0);
      expect(h.errors).toEqual([]);
    },
  );

  it('прыжок приземляется и внутри активной игровой зоны', () => {
    const h = launch(page);
    h.start();
    h.world().moveTo(2, 8);
    h.event('keydown', key('Space', ' '));
    h.step(8);
    expect(h.world().position().y).toBeGreaterThan(0.8);
    h.step(80);
    expect(h.world().position().y).toBe(0);
  });
});

function fakeStream(kind: 'video' | 'audio') {
  const handlers: Record<string, () => void> = {};
  const track = {
    readyState: 'live', enabled: true, stopped: 0,
    stop() { this.stopped++; this.readyState = 'ended'; },
    addEventListener(name: string, fn: () => void) { handlers[name] = fn; },
    end() { this.readyState = 'ended'; handlers.ended?.(); },
  };
  return { track, getTracks: () => [track], getVideoTracks: () => kind === 'video' ? [track] : [], getAudioTracks: () => kind === 'audio' ? [track] : [] };
}

function handFixture() {
  let points: Array<{ x: number; y: number }> | null = null;
  let faceScores: Record<string, number> | null = null;
  let poseLoads = 0, handLoads = 0, closed = 0;
  const model = { close() { closed++; }, detectForVideo: () => ({ landmarks: points ? [points] : [] }) };
  const lib = {
    FilesetResolver: { forVisionTasks: async () => ({}) },
    HandLandmarker: { createFromOptions: async () => { handLoads++; return model; } },
    FaceLandmarker: { createFromOptions: async () => ({ close() {}, detectForVideo: () => ({
      faceBlendshapes: faceScores ? [{ categories: Object.entries(faceScores).map(([categoryName, score]) => ({ categoryName, score })) }] : [],
    }) }) },
    PoseLandmarker: { createFromOptions: async () => { poseLoads++; throw new Error('Pose must not block hand control'); } },
  };
  return {
    lib, model, counts: () => ({ poseLoads, handLoads, closed }),
    point(x = 0.5, y = 0.1) {
      points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.9 }));
      points[0] = { x: 0.5, y: 0.95 }; points[6] = { x: 0.5, y: 0.72 }; points[8] = { x, y };
    },
    lose() { points = null; },
    face(shape: 'smile' | 'round' | 'open' | 'rest' | null) {
      faceScores = shape === null ? null : {
        mouthSmileLeft: shape === 'smile' ? 0.8 : 0.05,
        mouthSmileRight: shape === 'smile' ? 0.8 : 0.05,
        mouthPucker: shape === 'round' ? 0.8 : 0.05,
        jawOpen: shape === 'open' ? 0.8 : 0.05,
      };
    },
  };
}

async function settleMedia() { for (let i = 0; i < 16; i++) await Promise.resolve(); }

describe('явное управление камерой и микрофоном', () => {
  const page = worldPage();

  async function cameraHarness() {
    const hand = handFixture();
    const h = launch(page, null, { vision: async () => hand.lib });
    h.el('go').fire('click');
    const stream = fakeStream('video'); h.el('camv').videoWidth = 480;
    h.mediaPending[0].resolve(stream); await settleMedia();
    return { h, stream, hand };
  }

  it('не просит устройства на mount/клавиатурном старте; явный старт запрашивает только видео', () => {
    const h = launch(page);
    expect(h.mediaRequests).toEqual([]);
    h.start(); expect(h.mediaRequests).toEqual([]);
    h.el('camToggle').fire('click');
    expect(h.mediaRequests).toEqual([{ video: { facingMode: 'user', width: 480, height: 360 }, audio: false }]);
    expect(h.el('camText').textContent).toContain('Разреши');
    expect(h.el('camToggle').textContent).toBe('Выключить камеру');
  });

  it('HandLandmarker начинает работу без Pose и двигает лисёнка кончиком пальца', async () => {
    const { h, hand } = await cameraHarness();
    expect(hand.counts()).toMatchObject({ poseLoads: 0, handLoads: 1 });
    expect(h.el('camPreview').style.display).toBe('block');
    const start = h.world().position(); hand.point(); h.step(25);
    expect(h.world().position().x - start.x).toBeGreaterThan(1);
    expect(h.el('camText').textContent).toContain('Палец виден');
    hand.lose(); h.step(4);
    const stopped = h.world().position(); h.step(20);
    expect(h.world().position()).toEqual(stopped);
    expect(h.el('camText').textContent).toContain('Рука не видна');
  });

  it('кнопка выключения освобождает поток и модель, повторное включение работает', async () => {
    const { h, stream, hand } = await cameraHarness();
    h.el('camToggle').fire('click');
    expect(stream.track.stopped).toBe(1); expect(hand.counts().closed).toBe(1);
    expect(h.el('camv').srcObject).toBeNull();
    expect(h.el('camToggle').textContent).toBe('Включить камеру');
    h.el('camToggle').fire('click');
    const second = fakeStream('video'); h.mediaPending[1].resolve(second); await settleMedia();
    hand.point(); h.step(4);
    expect(h.el('camText').textContent).toContain('Палец виден');
    expect(hand.counts().handLoads).toBe(2);
  });

  it('отказ в камере оставляет понятную подсказку и клавиатуру', async () => {
    const h = launch(page); h.el('go').fire('click');
    h.mediaPending[0].reject({ name: 'NotAllowedError' }); await settleMedia();
    expect(h.el('camText').textContent).toContain('Доступ к камере закрыт');
    expect(h.el('camToggle').textContent).toBe('Включить камеру');
    const from = h.world().position();
    h.event('keydown', { code: 'KeyW', key: 'w', preventDefault() {} }); h.step(12);
    expect(h.world().position().x).toBeGreaterThan(from.x);
  });

  it('не называет живую камеру выключенной при ошибке распознавания', async () => {
    const hand = handFixture();
    hand.lib.HandLandmarker.createFromOptions = async () => { throw new Error('model unavailable'); };
    const h = launch(page, null, { vision: async () => hand.lib }); h.el('go').fire('click');
    const stream = fakeStream('video'); h.mediaPending[0].resolve(stream); await settleMedia();
    expect(h.el('camText').textContent).toBe('Камера включена, распознавание не загрузилось');
    expect(h.el('camRetry').style.display).toBe('inline-flex');
    expect(h.el('camv').srcObject).toBe(stream);
    h.el('camToggle').fire('click'); expect(stream.track.stopped).toBe(1);
  });

  it('закрывает поток, если разрешение пришло после отмены', async () => {
    const h = launch(page); h.el('go').fire('click'); h.el('camToggle').fire('click');
    const late = fakeStream('video'); h.mediaPending[0].resolve(late); await settleMedia();
    expect(late.track.stopped).toBe(1); expect(h.el('camv').srcObject).toBeNull();
    expect(h.el('camToggle').textContent).toBe('Включить камеру');
  });

  it('закрывает модель, если она загрузилась после выключения камеры', async () => {
    const hand = handFixture(); let resolveModel!: (value: typeof hand.model) => void;
    hand.lib.HandLandmarker.createFromOptions = () => new Promise((resolve) => { resolveModel = resolve; });
    const h = launch(page, null, { vision: async () => hand.lib }); h.el('go').fire('click');
    const stream = fakeStream('video'); h.mediaPending[0].resolve(stream); await settleMedia();
    h.el('camToggle').fire('click'); resolveModel(hand.model); await settleMedia();
    expect(hand.counts().closed).toBe(1); expect(h.el('camv').srcObject).toBeNull();
  });

  it('микрофон включается отдельно без видео и оба устройства освобождаются на pagehide', async () => {
    const { h, stream, hand } = await cameraHarness();
    expect(h.mediaRequests).toHaveLength(1);
    h.el('micToggle').fire('click'); expect(h.mediaRequests[1]).toEqual({ audio: true, video: false });
    const audio = fakeStream('audio'); h.mediaPending[1].resolve(audio); await settleMedia();
    expect(h.el('micStatus').textContent).toBe('Микрофон включён');
    h.event('pagehide');
    expect(stream.track.stopped).toBe(1); expect(audio.track.stopped).toBe(1); expect(hand.counts().closed).toBe(1);
    expect(h.el('micToggle').textContent).toBe('Включить микрофон');
    expect(h.el('camv').srcObject).toBeNull();
  });

  it('закрывает поздно выданный микрофон после pagehide', async () => {
    const h = launch(page); h.start(); h.el('micToggle').fire('click'); h.event('pagehide');
    const late = fakeStream('audio'); h.mediaPending[0].resolve(late); await settleMedia();
    expect(late.track.stopped).toBe(1); expect(h.el('micStatus').textContent).toBe('Для голосовых заданий');
  });

  it('потеря фокуса останавливает жесты и требует явного продолжения', async () => {
    const { h, stream, hand } = await cameraHarness();
    hand.point(); h.step(12); h.event('blur');
    const stopped = h.world().position();
    h.step(40); h.event('focus'); h.step(10);
    expect(h.world().position()).toEqual(stopped);
    expect(stream.track.stopped).toBe(1); expect(hand.counts().closed).toBe(1);
    expect(h.el('pause').style.display).toBe('flex');
    expect(h.mediaRequests).toHaveLength(1);
    h.el('resumeGame').fire('click'); h.step(10);
    expect(h.world().position()).toEqual(stopped);
    expect(h.mediaRequests).toHaveLength(1);
  });

  it('разрешение камеры может завершиться после blur собственного диалога', async () => {
    const hand = handFixture(); const h = launch(page, null, { vision: async () => hand.lib });
    h.el('go').fire('click'); h.event('blur');
    const stream = fakeStream('video'); h.el('camv').videoWidth = 480;
    h.mediaPending[0].resolve(stream); await settleMedia();
    expect(stream.track.stopped).toBe(0);
    h.event('focus'); hand.point(); h.step(15);
    expect(h.world().position().x).toBeGreaterThan(-5);
    expect(h.mediaRequests).toHaveLength(1);
    expect(h.el('pause').style.display).not.toBe('flex');
  });

  it('скрытая вкладка отменяет pending camera и не включает её при возврате', async () => {
    const hand = handFixture(); const h = launch(page, null, { vision: async () => hand.lib });
    h.el('go').fire('click'); h.event('blur'); h.visibility(true);
    const late = fakeStream('video'); h.mediaPending[0].resolve(late); await settleMedia();
    expect(late.track.stopped).toBe(1);
    h.visibility(false); h.event('focus'); h.step(10);
    expect(h.mediaRequests).toHaveLength(1);
    expect(h.el('pause').style.display).toBe('flex');
    h.el('resumeCamera').fire('click');
    expect(h.mediaRequests).toHaveLength(2);
    const stream = fakeStream('video'); h.el('camv').videoWidth = 480;
    h.mediaPending[1].resolve(stream); await settleMedia(); hand.point(); h.step(15);
    expect(h.world().position().x).toBeGreaterThan(-5);
  });

  it('подсказка потерянной руки описывает только действующий контроллер', async () => {
    const { h } = await cameraHarness(); h.step(45);
    expect(h.el('coachTitle').textContent).toBe('Покажи руку');
    expect(h.el('coachText').textContent).toContain('указательный палец');
    expect(h.el('coachText').textContent).not.toMatch(/корпус|плечи|остальные пальцы согни/);
  });
});

describe('сад звуков хакатона', () => {
  const page = worldPage();
  const targets = [[-2, 0], [3, -5], [5, 4]];

  function collectRoute(h: Harness, hand?: ReturnType<typeof handFixture>, ms = 33) {
    targets.forEach(([x, z], index) => {
      for (let frame = 0; frame < 250 && !h.world().garden().active; frame++) {
        const pos = h.world().position(), dx = x - pos.x, dz = z - pos.z;
        if (hand) {
          const length = Math.max(1, Math.hypot(dx, dz));
          hand.point(0.5 - dz / length * 0.4, 0.5 - dx / length * 0.4);
        } else {
          for (const [code, key] of [['KeyW', 'w'], ['KeyS', 's'], ['KeyA', 'a'], ['KeyD', 'd']])
            h.event('keyup', { code, key });
          const keys = [[dx > 0 ? 'KeyW' : 'KeyS', dx > 0 ? 'w' : 's']];
          if (Math.abs(dz) > 0.3) keys.push([dz > 0 ? 'KeyD' : 'KeyA', dz > 0 ? 'd' : 'a']);
          for (const [code, key] of keys) h.event('keydown', { code, key, preventDefault() {} });
        }
        h.step(1, ms);
      }
      expect(h.world().garden().active).toBe(true);
      h.el('gardenHelp').fire('click'); h.step(15, ms);
      h.el('gardenHelp').fire('click');
      for (let frame = 0; frame < 100 && h.world().garden().active; frame++) h.step(1, ms);
      expect(h.world().stars().taken).toBe(index + 1);
    });
  }

  it('ограничен тремя заданиями и не восстанавливает старые 11 задач', () => {
    const h = launch(page, JSON.stringify({ gateOpen: true, treasureOpen: true, taken: { g0: true } }), { demoOnly: true });
    h.start();
    expect(h.world().stars()).toEqual({ total: 3, taken: 0 });
    expect(h.el('scTotal').textContent).toBe('3');
    expect(h.el('mic').style.display).toBe('none');
    h.world().moveTo(2, 8); h.step(1);
    expect(h.world().zone()).toBeNull();
    expect(h.world().objective()).toContain('Сад звуков');
  });

  it('фиксирует настоящий путь от руки и освобождает камеру при завершении', async () => {
    const hand = handFixture();
    const h = launch(page, null, { demoOnly: true, vision: async () => hand.lib });
    h.el('go').fire('click');
    const stream = fakeStream('video'); h.el('camv').videoWidth = 480;
    h.mediaPending[0].resolve(stream); await settleMedia();
    collectRoute(h, hand);
    const results = h.events.filter((event) => event.event === 'speech-garden-complete');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ controller: 'camera', collectedCount: 3, manualDistance: 0 });
    expect(results[0].cameraDistance).toBeGreaterThan(5);
    expect(results[0].activities).toEqual(targets.map((_, i) => ({
      id: ['smile-flower', 'round-fish', 'open-lantern'][i], source: 'manual', repetitions: 2,
    })));
    expect(results[0].durationSeconds).toBeGreaterThan(1);
    expect(h.el('win').style.display).toBe('flex');
    expect(stream.track.stopped).toBe(1);
    expect(h.errors).toEqual([]);
  });

  it('клавиатурный маршрут не объявляет работу камеры', () => {
    const h = launch(page, null, { demoOnly: true }); h.start(); collectRoute(h);
    const results = h.events.filter((event) => event.event === 'speech-garden-complete');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ controller: 'keyboard', collectedCount: 3, cameraDistance: 0 });
    expect(results[0].manualDistance).toBeGreaterThan(5);
    expect(h.mediaRequests).toEqual([]);
  });

  it('связывает движение пальцем и два свежих движения лица с каждым изменением мира', async () => {
    const hand = handFixture();
    const h = launch(page, null, { demoOnly: true, vision: async () => hand.lib });
    h.el('go').fire('click');
    Object.assign(h.el('camv'), { videoWidth: 480, videoHeight: 360, readyState: 4, paused: false, ended: false });
    const stream = fakeStream('video'); h.mediaPending[0].resolve(stream); await settleMedia();
    hand.point(); h.step(6); hand.lose();
    for (const [index, [x, z]] of targets.entries()) {
      h.world().moveTo(x, z); h.step(1); await settleMedia();
      hand.face((['smile', 'round', 'open'] as const)[index]); h.step(36);
      expect(h.el('gardenCount').textContent).toBe('Повтор 2 из 2');
      // A continuous expression cannot count as the second repetition.
      h.step(35); expect(h.world().garden().results).toHaveLength(index);
      hand.face('rest'); h.step(20);
      hand.face((['smile', 'round', 'open'] as const)[index]); h.step(36);
      h.step(60);
      expect(h.world().garden().results).toHaveLength(index + 1);
    }
    expect(h.events).toHaveLength(1);
    expect(h.events[0]).toMatchObject({ event: 'speech-garden-complete', controller: 'camera', collectedCount: 3 });
    expect(h.events[0].activities).toEqual(targets.map((_, i) => ({
      id: ['smile-flower', 'round-fish', 'open-lantern'][i], source: 'camera', repetitions: 2,
    })));
    expect(h.mediaRequests).toEqual([{ video: { facingMode: 'user', width: 480, height: 360 }, audio: false }]);
    expect(stream.track.stopped).toBe(1);
    expect(h.errors).toEqual([]);
  });

  it('путь с клавишами и жестами честно помечается mixed', async () => {
    const hand = handFixture();
    const h = launch(page, null, { demoOnly: true, vision: async () => hand.lib }); h.start();
    h.event('keydown', { code: 'KeyW', key: 'w', preventDefault() {} }); h.step(8);
    h.event('keyup', { code: 'KeyW', key: 'w' });
    h.el('camToggle').fire('click'); h.el('camv').videoWidth = 480;
    h.mediaPending[0].resolve(fakeStream('video')); await settleMedia(); collectRoute(h, hand);
    const result = h.events.find((event) => event.event === 'speech-garden-complete');
    expect(result).toMatchObject({ controller: 'mixed', collectedCount: 3 });
    expect(result?.cameraDistance).toBeGreaterThan(0);
    expect(result?.manualDistance).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('best');
  });

  it('палец в центре останавливает остаточное движение клавиш и не приписывает его камере', async () => {
    const hand = handFixture();
    const h = launch(page, null, { demoOnly: true, vision: async () => hand.lib }); h.start();
    h.event('keydown', { code: 'KeyW', key: 'w', preventDefault() {} }); h.step(8);
    h.event('keyup', { code: 'KeyW', key: 'w' });
    h.el('camToggle').fire('click'); h.el('camv').videoWidth = 480;
    h.mediaPending[0].resolve(fakeStream('video')); await settleMedia(); hand.point(0.5, 0.5);
    const before = h.world().position(); h.step(8);
    expect(h.world().position()).toEqual(before);
    collectRoute(h);
    expect(h.events).toHaveLength(1);
    expect(h.events[0]).toMatchObject({ event: 'speech-garden-complete', controller: 'keyboard', cameraDistance: 0 });
    expect(h.events[0]).not.toHaveProperty('best');
  });

  it('после camera win повторяется только по новому явному выбору', async () => {
    const hand = handFixture(); const h = launch(page, null, { demoOnly: true, vision: async () => hand.lib });
    h.el('go').fire('click'); h.el('camv').videoWidth = 480;
    h.mediaPending[0].resolve(fakeStream('video')); await settleMedia(); collectRoute(h, hand);
    expect(h.events).toHaveLength(1); h.el('again').fire('click'); h.step(25);
    expect(h.el('start').style.display).toBe('flex');
    expect(h.world().stars()).toEqual({ total: 3, taken: 0 });
    expect(h.mediaRequests).toHaveLength(1);
    h.el('go').fire('click'); expect(h.mediaRequests).toHaveLength(2);
    h.mediaPending[1].resolve(fakeStream('video')); await settleMedia(); collectRoute(h, hand);
    expect(h.events).toHaveLength(2);
    expect(h.events[1]).toMatchObject({ controller: 'camera', manualDistance: 0, collectedCount: 3 });
    expect(h.errors).toEqual([]);
  });

  it('длительность на 10 FPS считает реальные секунды, а не урезанные шаги физики', () => {
    const h = launch(page, null, { demoOnly: true }); const began = clockMs;
    h.start(); collectRoute(h, undefined, 100);
    expect(h.events).toHaveLength(1);
    expect(h.events[0].durationSeconds).toBeCloseTo((clockMs - began) / 1000, 5);
    expect(Number(h.events[0].durationSeconds)).toBeGreaterThan(h.world().time() * 1.8);
  });

  it('время скрытой вкладки исключено из попытки и после возврата ждёт продолжения', () => {
    const h = launch(page, null, { demoOnly: true }); const began = clockMs;
    h.start(); h.step(5); h.visibility(true);
    const stopped = h.world().position(); const hiddenAt = clockMs;
    h.step(50, 100); h.visibility(false); h.event('focus'); h.step(10, 100);
    expect(h.world().position()).toEqual(stopped);
    const pausedMs = clockMs - hiddenAt;
    h.el('resumeGame').fire('click'); collectRoute(h);
    expect(h.events).toHaveLength(1);
    expect(h.events[0].durationSeconds).toBeCloseTo((clockMs - began - pausedMs) / 1000, 5);
  });
});

describe('зона отыгрывается движком', () => {
  const page = worldPage();

  /** Встать у зоны и «говорить» заданным образом N кадров. */
  function play(h: Harness, x: number, z: number, mic: Record<string, number>, frames = 60) {
    h.world().moveTo(x, z);
    h.world().mic(mic);
    h.step(frames);
  }

  it('громкий голос у ворот открывает путь', () => {
    const h = launch(page);
    h.start();
    h.world().moveTo(18, 0);
    h.step(1);
    expect(h.world().zone()).toBe('gate');

    play(h, 18, 0, VOWEL);
    expect(h.world().flags().gate).toBe(true);
    expect(h.errors).toEqual([]);
  });

  it('следующая зона открывается только после предыдущей', () => {
    const h = launch(page);
    h.start();
    // тотем стоит за воротами: пока они закрыты, зона не активна
    h.world().moveTo(48, 0);
    h.step(1);
    expect(h.world().zone()).not.toBe('vine');

    play(h, 18, 0, VOWEL);
    play(h, 48, 0, HISS, 1);
    expect(h.world().zone()).toBe('vine');
  });

  it('шкала растёт на верном звуке и падает на молчании', () => {
    const h = launch(page);
    h.start();
    play(h, 18, 0, VOWEL);          // открыть ворота
    play(h, 48, 0, HISS, 10);       // тянем «с» у тотема
    const grown = h.world().fills().vine;
    expect(grown).toBeGreaterThan(0);

    play(h, 48, 0, { rms: 0 }, 20); // замолчали
    expect(h.world().fills().vine).toBeLessThan(grown);
  });

  it('пройденная зона выдаёт звёзды и сохраняет этап', () => {
    const h = launch(page);
    h.start();
    const before = h.world().stars().total;
    play(h, 0, -40, VOWEL, 120);    // музыкальный фонтан
    expect(h.world().flags().fountain).toBe(true);
    expect(h.world().stars().total).toBe(before + 2);
    expect(h.el('scStages').textContent).toBe('1');
  });
});

describe('режим «ошибка» подсказывает по делу', () => {
  const page = worldPage();

  function coachAt(x: number, z: number, mic: Record<string, number>, saved?: string) {
    const h = launch(page, saved ?? null);
    h.start();
    h.world().moveTo(x, z);
    h.world().mic(mic);
    h.step(60);                     // ~2 с: подсказка ждёт 1.1 с ошибки
    return { coach: h.world().coach(), errors: h.errors };
  }

  /** Ворота уже открыты — чтобы добраться до зон за ними. */
  const PAST_GATE = JSON.stringify({ gateOpen: true });

  it('молчание: зовёт сказать громче, а не «не распознано»', () => {
    const r = coachAt(18, 0, { rms: 0 });
    expect(r.coach).toBe('Тебя не слышно');
    expect(r.errors).toEqual([]);
  });

  it('тихо там, где нужно громко', () => {
    const r = coachAt(0, -40, { ...VOWEL, rms: 0.1 });
    expect(r.coach).toBe('Чуть громче');
  });

  it('громко там, где нужен шёпот', () => {
    const r = coachAt(-9, 7, { ...VOWEL, rms: 0.7 });
    expect(r.coach).toBe('Слишком громко');
  });

  it('голос вместо свистящего у тотема', () => {
    // цель — «С», а ребёнок гудит голосом: это разные ошибки и разные советы
    const r = coachAt(48, 0, VOWEL, PAST_GATE);
    expect(r.coach).toBe('Лишний голос');
  });

  it('«ш» вместо «с»: тренер называет подмену', () => {
    const r = coachAt(48, 0, { rms: 0.35, hiss: 0.2, sh: 0.45, centroid: 3000 }, PAST_GATE);
    expect(r.coach).toBe('Получается «ш»');
  });

  it('выдох вместо голоса у дракона', () => {
    // «Р» без дрожи амплитуды — язык не вибрирует
    const r = coachAt(0, 40, { rms: 0.5, lo: 0.4, mid: 0.3, hiss: 0.05, centroid: 800, flux: 0 });
    expect(r.coach).toBe('Язык не дрожит');
  });

  it('пока звук верный, подсказки нет', () => {
    const r = coachAt(0, -40, VOWEL);
    expect(r.coach).toBe(null);
  });
});


/**
 * Скелет как его отдаёт MediaPipe: 33 нормализованные точки.
 * Строим только те, что читает разбор, остальные — вне кадра.
 *   shift — насколько ребёнок сместился вбок (его шаг вправо уменьшает x);
 *   knee  — высота поднятого колена (1 = стоит, 0.32 = колено у бедра);
 *   hands — подняты ли руки выше плеч;
 *   legs  — попадают ли ноги в кадр вообще.
 */
function skeleton(o: { shift?: number; kneeL?: number; kneeR?: number; hands?: boolean; legs?: boolean; bob?: number } = {}) {
  const shift = o.shift ?? 0;
  const legs = o.legs !== false;
  const shY = 0.35 - (o.bob ?? 0), hipY = 0.6, torso = hipY - shY;
  const pt = (x: number, y: number, v = 1) => ({ x, y, visibility: v });
  const L: Array<{ x: number; y: number; visibility: number }> = [];
  for (let i = 0; i < 33; i++) L.push(pt(0.5, 0.5, 0));
  L[11] = pt(0.42 - shift, shY);
  L[12] = pt(0.58 - shift, shY);
  L[23] = pt(0.45 - shift, hipY);
  L[24] = pt(0.55 - shift, hipY);
  // колено: 1.0 = опущено, меньше = поднято (доля торса ниже бедра)
  L[25] = pt(0.45 - shift, hipY + torso * (o.kneeL ?? 1), legs ? 1 : 0);
  L[26] = pt(0.55 - shift, hipY + torso * (o.kneeR ?? 1), legs ? 1 : 0);
  const wristY = o.hands ? shY - 0.1 : 0.7;
  L[15] = pt(0.38 - shift, wristY);
  L[16] = pt(0.62 - shift, wristY);
  return L;
}

describe('камера ведёт героя', () => {
  const page = worldPage();

  /** Постоять ровно, пока мир запомнит нейтральную стойку. */
  function calibrate(h: Harness) {
    for (let i = 0; i < 50; i++) {
      h.world().poseFrame(skeleton());
      h.step(1);
    }
  }

  it('сначала калибруется по нейтральной стойке', () => {
    const h = launch(page);
    h.start();
    h.world().poseFrame(skeleton());
    h.step(1);
    // до калибровки руль молчит, даже если ребёнок уже наклонился
    h.world().poseFrame(skeleton({ shift: 0.1 }));
    expect(h.world().pose().lean).toBe(0);

    calibrate(h);
    expect(h.world().pose().seen).toBe(true);
  });

  it('наклон вбок поворачивает, ровная стойка — нет', () => {
    const h = launch(page);
    h.start();
    calibrate(h);

    h.world().poseFrame(skeleton());
    expect(Math.abs(h.world().pose().lean)).toBeLessThan(0.05);

    // шаг вправо своим телом: в кадре x уменьшается, руль должен идти вправо
    h.world().poseFrame(skeleton({ shift: 0.1 }));
    expect(h.world().pose().lean).toBeGreaterThan(0.3);

    h.world().poseFrame(skeleton({ shift: -0.1 }));
    expect(h.world().pose().lean).toBeLessThan(-0.3);
  });

  it('мелкое покачивание не считается наклоном', () => {
    const h = launch(page);
    h.start();
    calibrate(h);
    h.world().poseFrame(skeleton({ shift: 0.02 }));
    expect(h.world().pose().lean).toBe(0);
  });

  it('марш на месте везёт вперёд, стояние — нет', () => {
    const h = launch(page);
    h.start();
    calibrate(h);
    expect(h.world().pose().walk).toBe(0);

    // попеременно поднимаем колени — это и есть шаг на месте
    for (let i = 0; i < 6; i++) {
      h.world().poseFrame(skeleton({ kneeL: i % 2 ? 1 : 0.3, kneeR: i % 2 ? 0.3 : 1 }));
      h.step(1);
    }
    expect(h.world().pose().walk).toBeGreaterThan(0.5);
    expect(h.world().pose().full).toBe(true);
  });

  it('марш ловится и когда ноги не попали в кадр', () => {
    // самый частый случай: ноутбук на столе, в кадре только голова и плечи
    const h = launch(page);
    h.start();
    for (let i = 0; i < 50; i++) {
      h.world().poseFrame(skeleton({ legs: false }));
      h.step(1);
    }
    expect(h.world().pose().full).toBe(false);
    expect(h.world().pose().walk).toBe(0);

    // шаг на месте раскачивает плечи по вертикали — этого хватает без коленей
    for (let i = 0; i < 24; i++) {
      h.world().poseFrame(skeleton({ legs: false, bob: i % 2 ? 0.02 : 0 }));
      h.step(1);
    }
    expect(h.world().pose().seen).toBe(true);
    expect(h.world().pose().walk).toBeGreaterThan(0);
  });

  it('поднятая рука читается как жест', () => {
    const h = launch(page);
    h.start();
    calibrate(h);
    expect(h.world().pose().handUp).toBe(false);
    h.world().poseFrame(skeleton({ hands: true }));
    expect(h.world().pose().handUp).toBe(true);
  });

  it('герой идёт по миру от марша, без джойстика и клавиш', () => {
    const h = launch(page);
    h.start();
    calibrate(h);
    const from = { ...h.world().position() };
    for (let i = 0; i < 40; i++) {
      h.world().poseFrame(skeleton({ kneeL: i % 2 ? 1 : 0.3, kneeR: i % 2 ? 0.3 : 1 }));
      h.step(1);
    }
    const to = h.world().position();
    const moved = Math.hypot(to.x - from.x, to.z - from.z);
    expect(moved).toBeGreaterThan(1);
    expect(h.errors).toEqual([]);
  });

  it('пустой кадр: тренер подсказывает жест для управления', () => {
    const h = launch(page);
    h.start();
    calibrate(h);
    for (let i = 0; i < 60; i++) {
      h.world().poseFrame(null);
      h.step(1);
    }
    expect(h.world().coach()).toBe('Покажи руку');
  });
});
