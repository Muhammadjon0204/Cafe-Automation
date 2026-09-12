import * as THREE from 'three';

/** One authored camera "shot": at global scroll-progress `t`, the camera
 * should be at `position` looking toward `lookAt` with the given `fov`. The
 * path between consecutive keyframes is a Catmull-Rom spline through their
 * neighbors, so the camera drifts smoothly rather than snapping — this is
 * the "physical camera travel" the whole cinematic sequence hinges on. */
export interface CameraKeyframe {
  t: number;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov: number;
}

function smootherstep(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

export class CameraPath {
  private keyframes: CameraKeyframe[];
  private positionCurve: THREE.CatmullRomCurve3;
  private lookAtCurve: THREE.CatmullRomCurve3;

  constructor(keyframes: CameraKeyframe[]) {
    this.keyframes = keyframes;
    this.positionCurve = new THREE.CatmullRomCurve3(
      keyframes.map((k) => k.position),
      false,
      'catmullrom',
      0.5,
    );
    this.lookAtCurve = new THREE.CatmullRomCurve3(
      keyframes.map((k) => k.lookAt),
      false,
      'catmullrom',
      0.5,
    );
  }

  /** Evaluates the path at global progress `t` (0..1). Reversible by
   * construction — it's a pure function of t, not accumulated state, so
   * scrolling backward retraces exactly the same curve. */
  sample(t: number, out: { position: THREE.Vector3; lookAt: THREE.Vector3 }): number {
    const clamped = Math.min(1, Math.max(0, t));
    const keyframes = this.keyframes;
    const last = keyframes.length - 1;

    let i = 0;
    while (i < last - 1 && keyframes[i + 1].t <= clamped) i++;

    const k0 = keyframes[i];
    const k1 = keyframes[Math.min(i + 1, last)];
    const span = k1.t - k0.t;
    const alpha = span > 1e-6 ? smootherstep((clamped - k0.t) / span) : 0;

    const u = (i + alpha) / last;
    this.positionCurve.getPoint(u, out.position);
    this.lookAtCurve.getPoint(u, out.lookAt);
    return THREE.MathUtils.lerp(k0.fov, k1.fov, alpha);
  }
}
