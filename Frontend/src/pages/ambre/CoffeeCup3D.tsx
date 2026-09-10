import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildCoffeeBeanGeometry, buildCroissantGeometry } from './heroSceneObjects';

interface CoffeeCup3DProps {
  enabled: boolean;
  isDark: boolean;
  onActive: () => void;
}

/** Refs into the parts of the scene whose look depends on the light/dark
 * theme — mutated in place by applyCoffeeSceneTheme() on toggle instead of
 * tearing down and rebuilding the whole WebGL scene, which would stutter
 * during the circle-reveal theme transition. */
interface ThemeableScene {
  renderer: THREE.WebGLRenderer;
  ambient: THREE.AmbientLight;
  hemi: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  ceramic: THREE.MeshPhysicalMaterial;
  beanMaterial: THREE.MeshPhysicalMaterial;
  pastryMaterial: THREE.MeshPhysicalMaterial;
  contactShadowMaterial: THREE.MeshBasicMaterial;
  groundMaterial: THREE.ShadowMaterial;
  steamMaterials: THREE.ShaderMaterial[];
}

function applyCoffeeSceneTheme(scene: ThemeableScene, isDark: boolean) {
  // Slightly reduced exposure in dark mode reads as calmer/cinematic rather
  // than just "the same scene with darker paint".
  scene.renderer.toneMappingExposure = isDark ? 0.96 : 1.05;

  scene.ambient.color.set(isDark ? 0xffe9d2 : 0xfff4e8);
  scene.ambient.intensity = isDark ? 0.26 : 0.32;

  scene.hemi.color.set(isDark ? 0xd2bfa8 : 0xfff3e5);
  scene.hemi.groundColor.set(isDark ? 0x111211 : 0xd9e1dc);
  scene.hemi.intensity = isDark ? 0.42 : 0.5;

  scene.key.color.set(isDark ? 0xffdcb0 : 0xfff1e0);
  scene.key.intensity = isDark ? 1.55 : 1.35;

  scene.fill.color.set(isDark ? 0xbfd9ce : 0xd7e4ff);
  scene.fill.intensity = isDark ? 0.4 : 0.28;

  // Rim runs hotter in dark mode — it's the main thing separating the pale
  // ceramic edge from the graphite background instead of just ambient fill.
  scene.rim.color.set(isDark ? 0xffe0b8 : 0xffd9ac);
  scene.rim.intensity = isDark ? 0.95 : 0.6;

  // Nearly the same ivory in both themes on purpose — the cup must not read
  // as "gray" in dark mode, so it stays close to its light-mode albedo and
  // lets the lighting (not the base color) carry the theme difference.
  scene.ceramic.color.set(isDark ? 0xeae3da : 0xf2ede7);

  // Roasted-bean brown and baked-croissant gold both stay close to their
  // light-mode albedo too, same reasoning as the ceramic above — only a
  // touch darker so they don't glow against the graphite background.
  scene.beanMaterial.color.set(isDark ? 0x241209 : 0x2b1710);
  scene.pastryMaterial.color.set(isDark ? 0xa66d2e : 0xb87a35);

  scene.contactShadowMaterial.opacity = isDark ? 0.92 : 0.75;
  scene.groundMaterial.opacity = isDark ? 0.22 : 0.14;

  scene.steamMaterials.forEach((material, i) => {
    const cfg = STEAM_CONFIGS[i];
    // Warm taupe in light mode has no contrast against a dark backdrop, so
    // dark mode shifts toward a soft ivory (never pure white) and a touch
    // more opacity to stay visible without looking like glowing smoke.
    material.uniforms.uColor.value.set(isDark ? 0xcdc3b2 : 0x94806b);
    material.uniforms.uOpacity.value = cfg.opacity * (isDark ? 1.35 : 1);
  });
}

// ---------------------------------------------------------------------------
// Procedural geometry helpers
// ---------------------------------------------------------------------------

/** Cheap deterministic value noise built from a few sine waves — good enough
 * for a barely-visible hand-thrown wobble, no need for a noise dependency. */
function craftNoise(theta: number, y: number, seed: number) {
  return (
    Math.sin(theta * 3.1 + seed * 1.7 + y * 0.6) * 0.5 +
    Math.sin(theta * 7.3 - y * 4.1 + seed * 3.3) * 0.3 +
    Math.sin(theta * 1.7 + y * 9.7 + seed * 5.1) * 0.2
  );
}

/** Perturbs a lathe-revolved geometry's radius per-vertex so it reads as
 * hand-thrown ceramic instead of a perfect machine-turned surface. */
function applyHandThrownNoise(geometry: THREE.BufferGeometry, amount: number, seed: number) {
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const radius = Math.hypot(v.x, v.z);
    if (radius < 1e-4) continue;
    const theta = Math.atan2(v.z, v.x);
    const n = craftNoise(theta, v.y, seed);
    const scale = 1 + n * amount;
    pos.setXYZ(i, v.x * scale, v.y, v.z * scale);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

/** Builds an organic, elliptical handle with non-uniform thickness (thicker
 * where it meets the cup wall, thinner through the arc) via a tapered tube. */
function buildHandleGeometry(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.545, 0.78, 0),
      new THREE.Vector3(0.88, 0.8, 0.015),
      new THREE.Vector3(1.02, 0.62, 0.02),
      new THREE.Vector3(1.0, 0.44, 0.01),
      new THREE.Vector3(0.86, 0.3, -0.005),
      new THREE.Vector3(0.52, 0.3, 0),
    ],
    false,
    'catmullrom',
    0.4,
  );

  const tubularSegments = 48;
  const radialSegments = 12;
  const baseRadius = 0.052;
  const tube = new THREE.TubeGeometry(curve, tubularSegments, baseRadius, radialSegments, false);

  const pos = tube.attributes.position;
  const center = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  const dir = new THREE.Vector3();

  for (let ring = 0; ring <= tubularSegments; ring++) {
    const t = ring / tubularSegments;
    curve.getPointAt(t, center);
    // thicker at the two attachment points (t=0, t=1), thinner mid-arc
    const profile = 1 + 0.5 * Math.pow(Math.abs(2 * t - 1), 1.6);
    for (let j = 0; j <= radialSegments; j++) {
      const idx = ring * (radialSegments + 1) + j;
      vertex.fromBufferAttribute(pos, idx);
      dir.subVectors(vertex, center);
      const len = dir.length();
      if (len < 1e-6) continue;
      dir.multiplyScalar((baseRadius * profile) / len);
      vertex.copy(center).add(dir);
      pos.setXYZ(idx, vertex.x, vertex.y, vertex.z);
    }
  }
  pos.needsUpdate = true;
  tube.computeVertexNormals();
  return tube;
}

/** Subtle grayscale concentric-ripple heightfield, used as a bump map so the
 * coffee surface reads as liquid rather than a flat painted disc. */
function createRippleBumpTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const cx = size / 2;
  const cy = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy) / (size / 2);
      const wave = Math.sin(r * 26) * 0.5 + 0.5;
      const falloff = Math.max(0, 1 - r);
      const v = 128 + (wave - 0.5) * 60 * falloff;
      const i = (y * size + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Soft radial-gradient alpha texture for a stretched contact shadow —
 * generated on a canvas so no external asset is needed. */
function createContactShadowTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(20,12,6,0.55)');
  grad.addColorStop(0.55, 'rgba(20,12,6,0.22)');
  grad.addColorStop(1, 'rgba(20,12,6,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

const STEAM_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const STEAM_FRAGMENT_SHADER = /* glsl */ `
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

    // Push the noise through a steep smoothstep instead of using it
    // directly — raw value-noise fills the whole plane as a haze, this
    // carves it into a few thin wisps with gaps between them.
    float wisp = smoothstep(0.4, 0.82, n);
    float alpha = wisp * vFade * hFade * uOpacity;
    // uColor is theme-driven (see applyCoffeeSceneTheme) since a fixed tone
    // can't have contrast against both a cream and a graphite backdrop.
    gl_FragColor = vec4(uColor, alpha);
  }
`;

interface SteamConfig {
  x: number;
  z: number;
  seed: number;
  opacity: number;
  scale: number;
}

const STEAM_CONFIGS: SteamConfig[] = [
  { x: -0.16, z: 0.06, seed: 0.15, opacity: 0.16, scale: 1.0 },
  { x: 0.15, z: -0.05, seed: 0.55, opacity: 0.13, scale: 0.82 },
  { x: 0.02, z: 0.11, seed: 0.85, opacity: 0.11, scale: 1.2 },
];
const STEAM_HEIGHT = 1.5;

export function CoffeeCup3D({ enabled, isDark, onActive }: CoffeeCup3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onActiveRef = useRef(onActive);
  onActiveRef.current = onActive;
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const themeSceneRef = useRef<ThemeableScene | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Theme toggles mutate the existing lights/materials in place (see
  // applyCoffeeSceneTheme) instead of going through the [enabled]-gated
  // effect below, which would tear down and rebuild the whole WebGL scene
  // and stutter during the circle-reveal transition.
  useEffect(() => {
    const themeScene = themeSceneRef.current;
    if (!themeScene) return;
    applyCoffeeSceneTheme(themeScene, isDark);
  }, [isDark]);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia('(max-width: 819px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    const wrap = canvas?.parentElement;
    if (!canvas || !wrap) return;

    let mounted = true;
    let raf = 0;

    const w = wrap.clientWidth || 480;
    const h = wrap.clientHeight || 480;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
    // A ~37° top-down angle: steep enough that the coffee surface clears
    // the near rim and is actually in frame (a camera at/below rim height
    // can never see it), and steep enough that Fresnel reflectance off the
    // glossy coffee stays low — at the previous ~12° angle it measured
    // rgb(150,150,150) instead of a dark liquid, purely from grazing-angle
    // reflectance, independent of the material's own albedo/roughness.
    camera.position.set(0, 3.7, 4.9);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    // Explicit transparent clear so the cup composites over the hero's own
    // CSS atmosphere (.coffee-scene::before/::after) instead of any renderer
    // default backdrop — this is what removes the old flat white canvas.
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // Procedural studio environment for soft physical-material reflections —
    // no external HDR asset, generated from a small in-memory room scene.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    const envRenderTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
    scene.environment = envRenderTarget.texture;

    // ---- lighting: warm key (45° upper side), cool dim fill, warm rim,
    // plus a hemisphere fill for a soft top/bottom tonal split. All colors
    // and intensities are theme-driven — see applyCoffeeSceneTheme, called
    // once below with the initial theme and again on every toggle.
    const ambient = new THREE.AmbientLight(0xfff4e8, 0.32);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xfff3e5, 0xd9e1dc, 0.5);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff1e0, 1.35);
    key.position.set(3.2, 5.4, 4.0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 9;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 22;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xd7e4ff, 0.28);
    fill.position.set(-4.4, 2.0, 2.6);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffd9ac, 0.6);
    rim.position.set(-2.2, 3.4, -4.4);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);

    // ---- ceramic (cup + handle + saucer) --------------------------------
    const ceramic = new THREE.MeshPhysicalMaterial({
      color: 0xece3d6,
      roughness: 0.46,
      metalness: 0.02,
      clearcoat: 0.18,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.85,
    });

    const cupPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.4, 0.0),
      new THREE.Vector2(0.465, 0.045),
      new THREE.Vector2(0.5, 0.1),
      new THREE.Vector2(0.545, 0.55),
      new THREE.Vector2(0.565, 0.8),
      new THREE.Vector2(0.6, 0.9),
      new THREE.Vector2(0.645, 0.955),
      new THREE.Vector2(0.625, 1.0),
      new THREE.Vector2(0.575, 1.012),
      new THREE.Vector2(0.525, 1.0),
      new THREE.Vector2(0.535, 0.955),
      new THREE.Vector2(0.5, 0.85),
      new THREE.Vector2(0.44, 0.14),
      new THREE.Vector2(0.0, 0.14),
    ];
    const cupGeometry = new THREE.LatheGeometry(cupPts, 96);
    applyHandThrownNoise(cupGeometry, 0.016, 1.0);
    const cup = new THREE.Mesh(cupGeometry, ceramic);
    cup.castShadow = true;
    cup.receiveShadow = true;
    group.add(cup);

    const handleGeometry = buildHandleGeometry();
    const handle = new THREE.Mesh(handleGeometry, ceramic);
    handle.castShadow = true;
    handle.receiveShadow = true;
    group.add(handle);

    const saucerPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(1.02, 0.0),
      new THREE.Vector2(1.07, 0.03),
      new THREE.Vector2(1.1, 0.055),
      new THREE.Vector2(1.05, 0.075),
      new THREE.Vector2(0.34, 0.07),
      new THREE.Vector2(0.3, 0.03),
      new THREE.Vector2(0.0, 0.03),
    ];
    const saucerGeometry = new THREE.LatheGeometry(saucerPts, 96);
    const saucer = new THREE.Mesh(saucerGeometry, ceramic);
    saucer.position.y = -0.2;
    saucer.castShadow = true;
    saucer.receiveShadow = true;
    group.add(saucer);

    // ---- coffee surface ---------------------------------------------------
    const coffeeY = 0.9;
    const coffeeRadius = 0.49;
    const rippleTexture = createRippleBumpTexture();
    const coffeeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x160d07,
      roughness: 0.07,
      metalness: 0.0,
      clearcoat: 0.0,
      clearcoatRoughness: 0.0,
      envMapIntensity: 0.15,
      bumpMap: rippleTexture,
      bumpScale: 0.004,
      side: THREE.DoubleSide,
    });
    const coffeeGeometry = new THREE.CircleGeometry(coffeeRadius, 64);
    const coffee = new THREE.Mesh(coffeeGeometry, coffeeMaterial);
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.y = coffeeY;
    coffee.receiveShadow = true;
    group.add(coffee);

    // ---- contact shadow (soft, stretched, separate from the shadow map) --
    const contactShadowTexture = createContactShadowTexture();
    const contactShadowMaterial = new THREE.MeshBasicMaterial({
      map: contactShadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });
    const contactShadowGeometry = new THREE.PlaneGeometry(1.75, 1.2);
    const contactShadow = new THREE.Mesh(contactShadowGeometry, contactShadowMaterial);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -0.298;
    scene.add(contactShadow);

    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.14 });
    const groundGeometry = new THREE.PlaneGeometry(24, 24);
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.3;
    ground.receiveShadow = true;
    scene.add(ground);

    group.position.y = -0.08;

    // ---- foreground coffee beans -----------------------------------------
    // Loose on the table, not part of `group` — they must not spin with the
    // cup. Depth-parallax comes from real placement (closer to the camera
    // than the cup) plus a small independent nudge in the tick loop below.
    const beanMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2b1710,
      roughness: 0.55,
      clearcoat: 0.12,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.5,
    });
    const beanGroup = new THREE.Group();
    const beanLayout = [
      { x: -0.18, z: 1.05, rotY: 0.4, rotX: 0.15, scale: 1.0, seed: 0.2 },
      { x: 0.14, z: 1.16, rotY: -0.6, rotX: -0.1, scale: 0.85, seed: 0.7 },
      { x: 0.02, z: 0.96, rotY: 1.1, rotX: 0.3, scale: 0.92, seed: 1.4 },
    ];
    const beanGeometries = beanLayout.map((cfg) => buildCoffeeBeanGeometry(cfg.seed));
    beanLayout.forEach((cfg, i) => {
      const bean = new THREE.Mesh(beanGeometries[i], beanMaterial);
      bean.position.set(cfg.x, -0.255, cfg.z);
      bean.rotation.set(cfg.rotX, cfg.rotY, 0.2);
      bean.scale.setScalar(cfg.scale);
      bean.castShadow = true;
      bean.receiveShadow = true;
      beanGroup.add(bean);
    });
    scene.add(beanGroup);

    // ---- background pastry (croissant) -------------------------------------
    const pastryMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xb87a35,
      roughness: 0.62,
      clearcoat: 0.04,
      clearcoatRoughness: 0.6,
      envMapIntensity: 0.35,
    });
    const croissantGeometry = buildCroissantGeometry();
    const croissant = new THREE.Mesh(croissantGeometry, pastryMaterial);
    croissant.castShadow = true;
    croissant.receiveShadow = true;
    // Mostly flat with a gentle tilt — read from nearly above (like the
    // saucer) so the camera's steep top-down angle shows its crescent
    // silhouette clearly instead of viewing it edge-on.
    croissant.rotation.set(0.06, 1.0, 0);
    const pastryGroup = new THREE.Group();
    pastryGroup.add(croissant);
    pastryGroup.scale.setScalar(1.2);
    const pastryBaseX = -0.98;
    pastryGroup.position.set(pastryBaseX, -0.26, 0.1);
    scene.add(pastryGroup);

    // ---- secondary contact shadows (beans + pastry) -----------------------
    // Reuses the cup's own contact-shadow material (created above) so every
    // grounded object in the scene shares the same soft-shadow language.
    // Parented to the same group as the object they sit under (local
    // coordinates, not world) so they track the tick loop's small parallax
    // nudge instead of drifting away from it.
    const beanShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), contactShadowMaterial);
    beanShadow.rotation.x = -Math.PI / 2;
    beanShadow.position.set(-0.02, -0.255 - 0.043, 1.06);
    beanGroup.add(beanShadow);

    const pastryShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.75), contactShadowMaterial);
    pastryShadow.rotation.x = -Math.PI / 2;
    pastryShadow.position.set(0, -0.028, 0);
    pastryGroup.add(pastryShadow);

    // ---- steam: cheap shader-noise billboards, world-space so they stay --
    // ---- screen-facing regardless of the cup's own rotation ---------------
    const steamGeometry = new THREE.PlaneGeometry(0.3, STEAM_HEIGHT, 1, 1);
    const steamMeshes = STEAM_CONFIGS.map((cfg) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: STEAM_VERTEX_SHADER,
        fragmentShader: STEAM_FRAGMENT_SHADER,
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: cfg.seed },
          uOpacity: { value: cfg.opacity },
          uColor: { value: new THREE.Color(0x94806b) },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(steamGeometry, material);
      mesh.scale.setScalar(cfg.scale);
      scene.add(mesh);
      return mesh;
    });
    const steamAnchor = new THREE.Vector3();
    const steamWorld = new THREE.Vector3();

    const steamMaterials = steamMeshes.map((mesh) => mesh.material as THREE.ShaderMaterial);
    const themeScene: ThemeableScene = {
      renderer,
      ambient,
      hemi,
      key,
      fill,
      rim,
      ceramic,
      beanMaterial,
      pastryMaterial,
      contactShadowMaterial,
      groundMaterial,
      steamMaterials,
    };
    themeSceneRef.current = themeScene;
    applyCoffeeSceneTheme(themeScene, isDarkRef.current);

    // ---- interaction: hover parallax + drag-to-spin for closer review ----
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let isDragging = false;
    let dragLastX = 0;
    let idleSpin = -0.5;
    let dragOffset = 0;

    // ---- scroll-linked camera: 0 at the top of .hero, 1 once it has
    // scrolled fully past — read fresh every frame instead of via a scroll
    // listener so it never falls out of sync with the rAF loop.
    const heroEl = wrap.closest('.hero') as HTMLElement | null;
    let scrollSmoothed = 0;

    // ---- pause the render loop while the hero is off-screen instead of
    // burning GPU/CPU on a scene nobody sees.
    let isVisible = true;
    const visibilityObserver = heroEl
      ? new IntersectionObserver(
          (entries) => {
            const wasVisible = isVisible;
            isVisible = entries[0]?.isIntersecting ?? true;
            if (isVisible && !wasVisible && mounted) tick();
          },
          { threshold: 0 },
        )
      : null;
    visibilityObserver?.observe(heroEl!);

    const handleMouseMove = (e: MouseEvent) => {
      const r = wrap.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width - 0.5;
      mouse.y = (e.clientY - r.top) / r.height - 0.5;
    };
    const handleMouseLeave = () => {
      mouse.x = 0;
      mouse.y = 0;
    };
    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragLastX = e.clientX;
      wrap.setPointerCapture(e.pointerId);
      wrap.style.cursor = 'grabbing';
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragLastX;
      dragLastX = e.clientX;
      dragOffset += dx * 0.008;
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      wrap.style.cursor = 'grab';
      if (wrap.hasPointerCapture(e.pointerId)) wrap.releasePointerCapture(e.pointerId);
    };

    wrap.addEventListener('mousemove', handleMouseMove);
    wrap.addEventListener('mouseleave', handleMouseLeave);
    wrap.addEventListener('pointerdown', handlePointerDown);
    wrap.addEventListener('pointermove', handlePointerMove);
    wrap.addEventListener('pointerup', handlePointerUp);
    wrap.addEventListener('pointercancel', handlePointerUp);
    wrap.style.cursor = 'grab';
    canvas.style.touchAction = 'none';

    const handleResize = () => {
      const ww = wrap.clientWidth;
      const wh = wrap.clientHeight;
      if (!ww || !wh) return;
      camera.aspect = ww / wh;
      camera.updateProjectionMatrix();
      renderer.setSize(ww, wh, false);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    const tick = () => {
      if (!mounted || !isVisible) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      target.x += (mouse.x - target.x) * 0.05;
      target.y += (mouse.y - target.y) * 0.05;

      if (heroEl) {
        const rect = heroEl.getBoundingClientRect();
        const rawProgress = rect.height > 0 ? -rect.top / rect.height : 0;
        const clamped = Math.min(1, Math.max(0, rawProgress));
        scrollSmoothed += (clamped - scrollSmoothed) * 0.06;
      }

      if (!isDragging) idleSpin += dt * 0.28;
      // Scroll adds a slow extra turn on top of the idle spin/manual drag —
      // by the time .hero has scrolled fully past, the cup has eased into a
      // slightly different resting angle instead of jumping there.
      group.rotation.y = idleSpin + dragOffset + scrollSmoothed * 0.35;
      group.rotation.x = target.y * 0.28;
      camera.position.x = target.x * 0.9;
      // Subtle dolly-out on scroll — the composition breathes instead of
      // just cutting to the next section.
      camera.position.z = 4.9 + scrollSmoothed * 0.45;
      camera.lookAt(0, 0.5, 0);

      // Foreground beans sit closer to the camera than the cup, so the same
      // mouse-driven camera shift already parallaxes them further via pure
      // perspective — this adds a small extra nudge on top so the layering
      // reads clearly even on a shallow mouse movement.
      beanGroup.position.x = target.x * 0.06;
      beanGroup.position.y = target.y * 0.02;

      // Background pastry moves less than the beans (it's farther from the
      // camera) and slides further into view as the user scrolls, so it
      // becomes "more visible" the way a background object naturally would
      // when the camera eases back — see brief's hero scroll section.
      pastryGroup.position.x = pastryBaseX + target.x * 0.025 + scrollSmoothed * 0.15;
      pastryGroup.rotation.z = target.x * 0.05;

      steamMeshes.forEach((mesh, i) => {
        const cfg = STEAM_CONFIGS[i];
        steamAnchor.set(cfg.x, coffeeY + STEAM_HEIGHT * 0.5 * cfg.scale, cfg.z);
        steamWorld.copy(steamAnchor).applyQuaternion(group.quaternion).add(group.position);
        mesh.position.copy(steamWorld);
        mesh.quaternion.copy(camera.quaternion);
        (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    setIsLoaded(true);
    onActiveRef.current();

    return () => {
      mounted = false;
      themeSceneRef.current = null;
      cancelAnimationFrame(raf);
      visibilityObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      wrap.removeEventListener('mousemove', handleMouseMove);
      wrap.removeEventListener('mouseleave', handleMouseLeave);
      wrap.removeEventListener('pointerdown', handlePointerDown);
      wrap.removeEventListener('pointermove', handlePointerMove);
      wrap.removeEventListener('pointerup', handlePointerUp);
      wrap.removeEventListener('pointercancel', handlePointerUp);

      renderer.dispose();
      pmremGenerator.dispose();
      roomEnvironment.dispose();
      envRenderTarget.dispose();

      ceramic.dispose();
      cupGeometry.dispose();
      handleGeometry.dispose();
      saucerGeometry.dispose();

      coffeeMaterial.dispose();
      coffeeGeometry.dispose();
      rippleTexture.dispose();

      contactShadowMaterial.dispose();
      contactShadowGeometry.dispose();
      contactShadowTexture.dispose();
      beanShadow.geometry.dispose();
      pastryShadow.geometry.dispose();

      beanMaterial.dispose();
      beanGeometries.forEach((geometry) => geometry.dispose());

      pastryMaterial.dispose();
      croissantGeometry.dispose();

      groundMaterial.dispose();
      groundGeometry.dispose();

      steamGeometry.dispose();
      steamMeshes.forEach((mesh) => (mesh.material as THREE.ShaderMaterial).dispose());
    };
  }, [enabled]);

  return (
    <div className={`coffee-scene__canvas${isLoaded ? ' is-loaded' : ''}`}>
      <canvas ref={canvasRef} className="hero-canvas" />
    </div>
  );
}
