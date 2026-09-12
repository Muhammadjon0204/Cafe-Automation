import * as THREE from 'three';

/** Shared procedural-modelling toolkit for every chapter in the cinematic
 * scene. Everything here is generated at runtime (noise-perturbed primitives
 * + canvas textures) — no external model files — following the same
 * hand-crafted-primitive technique the original hero coffee cup used, now
 * generalized so the other three dishes can share it. */

// ---------------------------------------------------------------------------
// Noise
// ---------------------------------------------------------------------------

/** Cheap deterministic value noise built from a few sine waves. */
export function valueNoise(a: number, b: number, seed: number): number {
  return (
    Math.sin(a * 3.1 + seed * 1.7 + b * 0.6) * 0.5 +
    Math.sin(a * 7.3 - b * 4.1 + seed * 3.3) * 0.3 +
    Math.sin(a * 1.7 + b * 9.7 + seed * 5.1) * 0.2
  );
}

/** Perturbs a lathe-revolved (cylindrically symmetric) geometry's radius
 * per-vertex so it reads as a hand-made vessel instead of a perfectly
 * machine-turned surface. */
export function applyRadialNoise(geometry: THREE.BufferGeometry, amount: number, seed: number) {
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const radius = Math.hypot(v.x, v.z);
    if (radius < 1e-4) continue;
    const theta = Math.atan2(v.z, v.x);
    const n = valueNoise(theta, v.y, seed);
    const scale = 1 + n * amount;
    pos.setXYZ(i, v.x * scale, v.y, v.z * scale);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

/** Perturbs every vertex along its own normal — for organic, non-radially-
 * symmetric forms (egg whites, tomato mounds, meat, fruit) rather than the
 * cylindrical vessels applyRadialNoise targets. */
export function applyNormalNoise(geometry: THREE.BufferGeometry, amount: number, seed: number, frequency = 5) {
  geometry.computeVertexNormals();
  const pos = geometry.attributes.position;
  const nrm = geometry.attributes.normal;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nrm, i);
    const noise = valueNoise(v.x * frequency + v.y * frequency, v.z * frequency, seed);
    v.addScaledVector(n, noise * amount);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

/** Tiny seeded PRNG (mulberry32) — deterministic scatter placement for
 * instanced rice/spice/sparkle fields, so a chapter looks the same on every
 * mount instead of re-rolling its garnish on every reload. */
export function createSeededRandom(seed: number): () => number {
  let a = seed * 0x9e3779b9;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Vessels & organic primitives
// ---------------------------------------------------------------------------

/** Builds a lathe-revolved vessel (cup, skillet, plate, stand …) from a 2D
 * profile, with an optional hand-thrown radial wobble. */
export function buildLatheVessel(
  points: Array<[number, number]>,
  segments: number,
  opts: { noiseAmount?: number; seed?: number } = {},
): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
  if (opts.noiseAmount) applyRadialNoise(geometry, opts.noiseAmount, opts.seed ?? 1);
  else geometry.computeVertexNormals();
  return geometry;
}

/** Builds a tapered, optionally rippled tube along a Catmull-Rom curve —
 * generalized from the original cup-handle/croissant technique. `profile(t)`
 * scales the radius along the curve (0=start,1=end); `ridge(t,angle)` adds a
 * per-angle surface ripple (laminated pastry layers, herb-leaf ribbing …). */
export function buildTaperedTube(
  curvePoints: THREE.Vector3[],
  opts: {
    tubularSegments?: number;
    radialSegments?: number;
    baseRadius: number;
    closed?: boolean;
    profile?: (t: number) => number;
    ridge?: (t: number, angle: number) => number;
  },
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(curvePoints, opts.closed ?? false, 'catmullrom', 0.45);
  const tubularSegments = opts.tubularSegments ?? 40;
  const radialSegments = opts.radialSegments ?? 10;
  const tube = new THREE.TubeGeometry(curve, tubularSegments, opts.baseRadius, radialSegments, opts.closed ?? false);

  const pos = tube.attributes.position;
  const center = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  const dir = new THREE.Vector3();

  for (let ring = 0; ring <= tubularSegments; ring++) {
    const t = ring / tubularSegments;
    curve.getPointAt(t, center);
    const profileScale = opts.profile ? opts.profile(t) : 1;
    for (let j = 0; j <= radialSegments; j++) {
      const idx = ring * (radialSegments + 1) + j;
      vertex.fromBufferAttribute(pos, idx);
      dir.subVectors(vertex, center);
      const len = dir.length();
      if (len < 1e-6) continue;
      const angle = (j / radialSegments) * Math.PI * 2;
      const ridgeScale = opts.ridge ? opts.ridge(t, angle) : 1;
      dir.multiplyScalar((opts.baseRadius * profileScale * ridgeScale) / len);
      vertex.copy(center).add(dir);
      pos.setXYZ(idx, vertex.x, vertex.y, vertex.z);
    }
  }
  pos.needsUpdate = true;
  tube.computeVertexNormals();
  return tube;
}

/** An ellipsoid with independent per-axis radii plus optional normal-noise
 * roughening — the base shape for beans, eggs, meat chunks, fruit, yolks. */
export function buildBlobGeometry(
  radius: [number, number, number],
  detail: number,
  seed: number,
  noiseAmount = 0,
): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1, detail, Math.max(8, Math.round(detail * 0.7)));
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) * radius[0], pos.getY(i) * radius[1], pos.getZ(i) * radius[2]);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  if (noiseAmount) applyNormalNoise(geometry, noiseAmount, seed);
  return geometry;
}

// ---------------------------------------------------------------------------
// Canvas textures
// ---------------------------------------------------------------------------

/** Grayscale noise heightfield used as a bump map — liquid ripples, glaze
 * drips, grain/roughness variation. */
export function createNoiseBumpTexture(size: number, freq: number, contrast: number, seed = 0): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * freq;
      const ny = (y / size) * freq;
      const n = valueNoise(nx, ny, seed) * 0.5 + valueNoise(nx * 2.3 + 5, ny * 2.3, seed + 2) * 0.3;
      const v = 128 + n * contrast * 128;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Soft radial-gradient alpha disc — grounded contact shadows and (at low
 * opacity, warm color) sparkle/dust sprites. */
export function createRadialAlphaTexture(size: number, stops: Array<[number, string]>): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([offset, color]) => grad.addColorStop(offset, color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Soft stretched contact-shadow mesh, ready to drop under any grounded
 * object — every chapter's plate/cup shares this one shadow language. */
export function createContactShadow(width: number, height: number, material: THREE.MeshBasicMaterial): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// ---------------------------------------------------------------------------
// Steam / warm-air wisp shader
// ---------------------------------------------------------------------------

const WISP_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const WISP_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  uniform vec3 uColor;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed * 13.1) * 43758.5453123);
  }
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    vec2 drift = vec2(sin(uTime * 0.22 + uSeed * 6.2831) * 0.4, -uTime * 0.42);
    vec2 p = vUv * vec2(2.4, 5.0) + drift + uSeed * 10.0;
    float n = valueNoise(p) * 0.6 + valueNoise(p * 2.15 + 4.0) * 0.4;

    float vFade = smoothstep(0.0, 0.16, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
    float hFade = 1.0 - smoothstep(0.05, 0.26, abs(vUv.x - 0.5));
    float wisp = smoothstep(0.4, 0.82, n);
    float alpha = wisp * vFade * hFade * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function createWispMaterial(color: number, opacity: number, seed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: WISP_VERTEX_SHADER,
    fragmentShader: WISP_FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uOpacity: { value: opacity },
      uColor: { value: new THREE.Color(color) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** A small field of warm floating motes (dust / sparkle) as a single Points
 * cloud — cheap regardless of count, used for the dessert chapter's
 * climactic atmosphere. */
export function createMoteField(count: number, spread: [number, number, number], seed: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (valueNoise(i * 0.7, seed, 1) ) * spread[0];
    positions[i * 3 + 1] = (valueNoise(i * 0.31 + 4, seed, 2) * 0.5 + 0.5) * spread[1];
    positions[i * 3 + 2] = (valueNoise(i * 0.53 + 9, seed, 3)) * spread[2];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const sprite = createRadialAlphaTexture(32, [
    [0, 'rgba(255,244,224,0.9)'],
    [0.4, 'rgba(255,224,180,0.5)'],
    [1, 'rgba(255,224,180,0)'],
  ]);
  const material = new THREE.PointsMaterial({
    size: 0.028,
    map: sprite,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
