import * as THREE from 'three';
import type { CameraKeyframe } from './cameraPath';
import { WORLD_STEP } from './dishes';

const C = 0; // coffee world Z
const S = -WORLD_STEP; // shakshuka
const P = -WORLD_STEP * 2; // plov
const D = -WORLD_STEP * 3; // dessert

/** The master shot list. Position/lookAt are world-space; `t` is the global
 * scroll progress at which the camera should be exactly at that shot — see
 * CameraPath for how the spline is built and sampled between these. Numbers
 * were tuned by eye against the chapter progress windows in dishes.ts. */
export function buildDesktopKeyframes(): CameraKeyframe[] {
  return [
    { t: 0.0, position: new THREE.Vector3(0, 2.2, C + 6.2), lookAt: new THREE.Vector3(0, 0.6, C), fov: 32 },
    { t: 0.1, position: new THREE.Vector3(0.9, 1.3, C + 3.6), lookAt: new THREE.Vector3(0, 0.75, C), fov: 28 },
    { t: 0.19, position: new THREE.Vector3(-1.3, 1.0, C + 1.6), lookAt: new THREE.Vector3(0, 0.85, C), fov: 24 },
    { t: 0.27, position: new THREE.Vector3(-1.6, 1.8, C - 1.0), lookAt: new THREE.Vector3(0, 0.6, C - 1), fov: 26 },
    { t: 0.35, position: new THREE.Vector3(0.8, 2.6, S + 4.0), lookAt: new THREE.Vector3(0, 0.4, S + 1), fov: 30 },
    { t: 0.42, position: new THREE.Vector3(1.4, 1.2, S + 1.4), lookAt: new THREE.Vector3(0, 0.5, S), fov: 26 },
    { t: 0.49, position: new THREE.Vector3(-1.5, 0.9, S - 0.6), lookAt: new THREE.Vector3(0, 0.5, S), fov: 22 },
    { t: 0.56, position: new THREE.Vector3(-1.0, 2.0, S - 3.0), lookAt: new THREE.Vector3(0, 0.4, S - 5), fov: 27 },
    { t: 0.62, position: new THREE.Vector3(0.6, 3.2, P + 3.0), lookAt: new THREE.Vector3(0, 0.2, P), fov: 30 },
    { t: 0.69, position: new THREE.Vector3(1.8, 2.6, P + 1.0), lookAt: new THREE.Vector3(0, 0.3, P), fov: 24 },
    { t: 0.76, position: new THREE.Vector3(0.2, 1.1, P - 1.3), lookAt: new THREE.Vector3(0, 0.45, P), fov: 20 },
    { t: 0.82, position: new THREE.Vector3(-1.2, 2.0, D + 5.0), lookAt: new THREE.Vector3(0, 0.4, D + 3), fov: 26 },
    { t: 0.88, position: new THREE.Vector3(1.3, 1.3, D + 1.4), lookAt: new THREE.Vector3(0, 0.65, D), fov: 24 },
    { t: 0.95, position: new THREE.Vector3(-1.6, 1.1, D - 0.6), lookAt: new THREE.Vector3(0, 0.75, D), fov: 20 },
    { t: 1.0, position: new THREE.Vector3(0, 2.6, D + 4.0), lookAt: new THREE.Vector3(0, 0.6, D), fov: 34 },
  ];
}

/** A gentler, closer-cropped path for small screens — same beats, less
 * distance travelled per scroll-inch and a narrower lateral swing so the
 * dish stays framed on a portrait viewport. */
export function buildMobileKeyframes(): CameraKeyframe[] {
  const desktop = buildDesktopKeyframes();
  return desktop.map((k) => ({
    t: k.t,
    position: new THREE.Vector3(k.position.x * 0.55, k.position.y * 0.92, k.position.z),
    lookAt: k.lookAt.clone(),
    fov: k.fov + 6,
  }));
}
