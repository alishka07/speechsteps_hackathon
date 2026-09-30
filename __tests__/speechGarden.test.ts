import vm from 'node:vm';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { speechGarden } from '@/data/world/src/speechGarden';

function harness(demoOnly = true) {
  let now = 1_000;
  const elements = new Map<string, ReturnType<typeof makeElement>>();
  function makeElement() {
    const classes = new Set<string>();
    const handlers: Record<string, () => void> = {};
    return {
      style: {} as Record<string, string>, textContent: '', innerHTML: '', disabled: false,
      setAttribute() {},
      classList: { add: (v: string) => classes.add(v), remove: (v: string) => classes.delete(v),
        toggle: (v: string, on: boolean) => on ? classes.add(v) : classes.delete(v) },
      addEventListener: (event: string, handler: () => void) => { handlers[event] = handler; },
      click: () => handlers.click?.(),
    };
  }
  function el(id: string) {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id)!;
  }
  function mat(color: number, options = {}) { return new THREE.MeshStandardMaterial({ color, ...options }); }
  const ctx = vm.createContext({
    CFG: { demoOnly }, THREE, scene: new THREE.Scene(),
    grp: (x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; },
    matOwn: mat, mat, basic: mat, basicOwn: mat,
    at: (mesh: THREE.Object3D, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); return mesh; },
    shade: (mesh: THREE.Object3D) => mesh,
    sph: (r: number, color: number | THREE.Material, opts = {}, seg = 12) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), typeof color === 'number' ? mat(color, opts) : color),
    cyl: (rt: number, rb: number, h: number, seg: number, color: number | THREE.Material) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'number' ? mat(color) : color),
    cone: (r: number, h: number, seg: number, color: number | THREE.Material) => new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), typeof color === 'number' ? mat(color) : color),
    torus: (r: number, tube: number, seg: number, color: number | THREE.Material) => new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, seg), typeof color === 'number' ? mat(color) : color),
    glowSprite: (_c: number, _s: number, opacity: number) => new THREE.Sprite(new THREE.SpriteMaterial({ opacity })),
    dist: (x: number, z: number, xx: number, zz: number) => Math.hypot(x - xx, z - zz),
    ease: (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt)),
    clamp01: (n: number) => Math.max(0, Math.min(1, n)),
    player: new THREE.Group(), jumping: false, gamePaused: false,
    cameraOn: false, faceSeen: false, faceFreshAt: 0, faceFrameSerial: 0, faceLoading: false, faceFailed: false,
    signals: { smile: 0, round: 0, open: 0 },
    document: { getElementById: el }, window: { addEventListener() {} },
    performance: { now: () => now },
    clearInput() {}, clearFinger() {}, resetCoach() {}, canvas: { focus() {} },
    setMood() {}, speak() {}, tone() {}, chime() {}, initFace() {}, retryFace() {}, setObj() {},
  });
  vm.runInContext('function cameraConnected(){return cameraOn;} function readFace(){return faceSeen;} function faceSignal(kind){return signals[kind]||0;}', ctx);
  vm.runInContext(speechGarden(), ctx);
  const run = <T = unknown>(code: string) => vm.runInContext(code, ctx) as T;
  const tick = (ms = 100) => { now += ms; run(`gardenTick(${ms / 1000})`); };
  const at = (i: number) => { run(`player.position.set(GARDEN[${i}].x,0,GARDEN[${i}].z)`); tick(); };
  const frame = (shape: 'smile' | 'round' | 'open' | 'rest', ms = 100) => {
    now += ms;
    run(`cameraOn=true;faceSeen=true;faceFreshAt=${now};faceFrameSerial++;signals={smile:0,round:0,open:0};${shape === 'rest' ? '' : `signals.${shape}=0.8;`}gardenTick(${ms / 1000});`);
  };
  const hold = (shape: 'smile' | 'round' | 'open' | 'rest', count = 9) => { for (let i = 0; i < count; i++) frame(shape); };
  const results = () => JSON.parse(JSON.stringify(run('gardenResults()')));
  return { ctx, run, tick, at, frame, hold, el, results };
}

describe('3D speech garden', () => {
  it('creates no minigame props and never opens in the full platform', () => {
    const h = harness(false);
    h.at(0);
    expect(h.run('scene.children.length')).toBe(0);
    expect(h.run('gardenActive()')).toBe(false);
    expect(h.results()).toEqual([]);
  });

  it('opens the first nearby task with a mouth example and two repetitions', () => {
    const h = harness(); h.at(0);
    expect(h.run('gardenActive()')).toBe(true);
    expect(h.el('gardenTitle').textContent).toBe('Разбуди цветок');
    expect(h.el('gardenExample').innerHTML).toContain('Улыбка');
    expect(h.el('gardenCount').textContent).toBe('Повтор 1 из 2');
    expect(h.ctx.cameraOn).toBe(false);
  });

  it('never credits a static face frame or an absent camera', () => {
    const h = harness(); h.at(0);
    for (let i = 0; i < 40; i++) h.tick();
    h.frame('smile');
    for (let i = 0; i < 40; i++) h.tick();
    expect(h.run('gardenReps[0].length')).toBe(0);
    expect(h.results()).toEqual([]);
  });

  it('requires a relaxed mouth between two camera repetitions', () => {
    const h = harness(); h.at(0);
    h.hold('smile', 25);
    expect(h.run('gardenReps[0].length')).toBe(1);
    h.hold('rest', 5); h.hold('smile');
    expect(h.results()).toEqual([{ id: 'smile-flower', source: 'camera', repetitions: 2 }]);
  });

  it('discards partial holds after missing face and after a long sample gap', () => {
    const h = harness(); h.at(0);
    h.hold('smile', 4);
    h.run('faceSeen=false'); h.tick();
    h.hold('smile', 4);
    expect(h.run('gardenReps[0].length')).toBe(0);
    h.frame('smile', 800);
    expect(h.run('gardenHold')).toBe(0);
    h.hold('smile', 7);
    expect(h.run('gardenReps[0].length')).toBe(1);
  });

  it('keeps manual help separate from camera repetitions and does not complete on one click', () => {
    const h = harness(); h.at(0);
    h.el('gardenHelp').click();
    expect(h.results()).toEqual([]);
    expect(h.run('gardenReps[0].length')).toBe(1);
    h.el('gardenHelp').click();
    expect(h.results()).toEqual([{ id: 'smile-flower', source: 'manual', repetitions: 2 }]);
    h.el('gardenHelp').click();
    expect(h.run('gardenReps[0].length')).toBe(2);
  });

  it('reports mixed assistance honestly', () => {
    const h = harness(); h.at(0);
    h.hold('smile'); h.el('gardenHelp').click();
    expect(h.results()[0].source).toBe('mixed');
  });

  it('retains completed repetitions while cancel blocks reopening until leaving the station', () => {
    const h = harness(); h.at(0); h.el('gardenHelp').click(); h.el('gardenClose').click();
    h.tick(); expect(h.run('gardenActive()')).toBe(false);
    h.run('player.position.set(-7,0,0)'); h.tick(); h.at(0);
    expect(h.run('gardenActive()')).toBe(true);
    expect(h.run('gardenReps[0].length')).toBe(1);
  });

  it('pause clears partial holds without clearing completed repetitions', () => {
    const h = harness(); h.at(0); h.hold('smile'); h.hold('rest', 5); h.hold('smile', 3);
    h.run('gardenPause()');
    expect(h.run('gardenHold')).toBe(0);
    expect(h.run('gardenReps[0].length')).toBe(1);
    h.run('gamePaused=true'); h.el('gardenHelp').click();
    expect(h.run('gardenReps[0].length')).toBe(1);
  });

  it('finishes three stations in order after their visible celebrations and resets for replay', () => {
    const h = harness();
    h.at(2); expect(h.run('gardenActive()')).toBe(false);
    for (let i = 0; i < 3; i++) {
      h.at(i); h.el('gardenHelp').click(); h.el('gardenHelp').click();
      expect(h.run('gardenActive()')).toBe(true);
      for (let f = 0; f < 20; f++) h.tick();
    }
    expect(h.results().map((r: { id: string }) => r.id)).toEqual(['smile-flower', 'round-fish', 'open-lantern']);
    expect(h.run('gardenComplete()')).toBe(true);
    h.run('gardenReset()');
    expect(h.results()).toEqual([]);
    expect(h.run('gardenComplete()')).toBe(false);
    h.at(0); expect(h.run('gardenActive()')).toBe(true);
  });
});
