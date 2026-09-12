import * as THREE from 'three';

/** Per-frame context handed to every chapter's update(). `presence` is how
 * "in focus" this chapter currently is (0 = camera nowhere near it, 1 = this
 * is the chapter the camera is currently visiting) — chapters use it to fade
 * secondary animation (steam intensity, ingredient settle) without ever
 * hiding the geometry itself via opacity; the camera's physical distance is
 * what actually keeps other chapters out of frame. */
export interface ChapterContext {
  elapsed: number;
  isDark: boolean;
  presence: number;
  quality: 'high' | 'low';
}

/** A chapter's lighting/atmosphere mood. Light offsets are chapter-local —
 * the orchestrator adds the chapter's fixed world position before blending
 * across chapters, so mood authoring never has to think in world space. */
export interface ChapterMood {
  keyColor: number;
  keyIntensity: number;
  keyOffset: THREE.Vector3;
  fillColor: number;
  fillIntensity: number;
  fillOffset: THREE.Vector3;
  rimColor: number;
  rimIntensity: number;
  rimOffset: THREE.Vector3;
  ambientColor: number;
  ambientIntensity: number;
  fogColor: number;
}

export interface Chapter {
  id: string;
  /** Local-origin container; the orchestrator positions it at a fixed world
   * offset along the journey so the camera travels between chapters instead
   * of them fading in/out via opacity. */
  group: THREE.Group;
  /** Local-space point the camera should look toward when visiting. */
  focalPoint: THREE.Vector3;
  update(localProgress: number, ctx: ChapterContext): void;
  applyTheme(isDark: boolean): void;
  getMood(isDark: boolean): ChapterMood;
  dispose(): void;
}
