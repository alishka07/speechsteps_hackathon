import vm from 'node:vm';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { props } from '@/data/world/src/props';

function cameraView(demoOnly = true) {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 2, 10);
  const context = vm.createContext({ THREE, CFG: { demoOnly }, camera });
  vm.runInContext(props(), context);
  const tree = new THREE.Group();
  const sphere = new THREE.Sphere(new THREE.Vector3(0, 2, 5), 1);
  context.cameraTrees.push({ tree, sphere });
  return { tree, sphere, update: () => vm.runInContext('clearCameraView(0, 2, 0)', context) };
}

describe('garden camera view', () => {
  it('hides foreground trees and restores them when the view is clear', () => {
    const h = cameraView();
    h.update();
    expect(h.tree.visible).toBe(false);
    h.sphere.center.x = 5;
    h.update();
    expect(h.tree.visible).toBe(true);
  });

  it('keeps trees behind the target visible and uses a stable boundary', () => {
    const h = cameraView();
    h.sphere.center.z = -2;
    h.update();
    expect(h.tree.visible).toBe(true);
    h.sphere.center.set(1.4, 2, 5);
    h.update();
    expect(h.tree.visible).toBe(false);
    h.sphere.center.x = 1.6;
    h.update();
    expect(h.tree.visible).toBe(false);
    h.sphere.center.x = 2;
    h.update();
    expect(h.tree.visible).toBe(true);
  });

  it('preserves scenery in the full platform', () => {
    const h = cameraView(false);
    h.update();
    expect(h.tree.visible).toBe(true);
  });
});
