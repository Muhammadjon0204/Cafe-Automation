import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
  /** Populated once the GLB finishes loading (see the loader callback below)
   * — mutated in place via push(), so this array reference stays valid to
   * read from even if applyCoffeeSceneTheme() runs before the load resolves. */
  ceramicMaterials: THREE.MeshStandardMaterial[];
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

  // The GLB's own authored colors/textures are left alone — only the
  // envMap contribution shifts with theme, so lighting carries the
  // difference instead of repainting the asset.
  scene.ceramicMaterials.forEach((material) => {
    material.envMapIntensity = isDark ? 0.7 : 0.85;
  });

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

    // ---- ceramic cup (loaded GLB, replaces the old procedural lathe cup) --
    // "Coffee Cup" by Šimon Ustal (https://sketchfab.com/simonustal),
    // CC-BY-4.0 — https://sketchfab.com/3d-models/coffee-cup-88be308975644de6b6d188915294f5c2
    const modelGroup = new THREE.Group();
    group.add(modelGroup);
    // Declared here (not inside the load callback) so applyCoffeeSceneTheme
    // — which reads themeScene.ceramicMaterials — can be defined and safely
    // called below before the GLB has actually finished loading; the array
    // is mutated in place once it has.
    const ceramicMaterials: THREE.MeshStandardMaterial[] = [];
    const gltfLoader = new GLTFLoader();
    let disposeModel = () => {};
    // Where the steam should emerge — a sane default until the GLB loads
    // and reports the cup's actual measured height (see the load callback).
    let steamAnchorY = 0.9;
    gltfLoader.load(
      '/models/coffee_cup.glb',
      (gltf) => {
        if (!mounted) return;
        const model = gltf.scene;

        // No rotation here — three of this file's nodes carry full baked
        // matrices (rotation + an ~83x scale) that a naive look at the raw
        // per-mesh accessor data misses entirely. Once those are respected
        // (which GLTFLoader does automatically, building gltf.scene's
        // world matrices from them), the asset is already Y-up: saucer
        // flat and low, cup body rising, the latte-art disc flat and high
        // near the rim. Rotating on top of that only knocks it back over.
        model.updateMatrixWorld(true);

        // Scale off the footprint (X/Z) rather than height (Y): one mesh
        // in this file has a visibly different Y-extent than the other
        // two, so sizing off height risks letting that one mesh dictate
        // the scale for everything. The footprint (X and Z both come out
        // to the same ~166 units) stays consistent across all three
        // meshes, so it's the stable thing to normalize against.
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const targetDiameter = 2.2;
        const scale = targetDiameter / Math.max(size.x, size.z);
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
        model.updateMatrixWorld(true);
        steamAnchorY = size.y * scale;

        const geometries: THREE.BufferGeometry[] = [];
        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = true;
          child.receiveShadow = true;
          geometries.push(child.geometry);
          ceramicMaterials.push(child.material as THREE.MeshStandardMaterial);
        });
        disposeModel = () => {
          geometries.forEach((g) => g.dispose());
          ceramicMaterials.forEach((m) => m.dispose());
        };

        modelGroup.add(model);
        applyCoffeeSceneTheme(themeScene, isDarkRef.current);
        setIsLoaded(true);
        onActiveRef.current();
      },
      undefined,
      (error) => {
        console.error('Failed to load /models/coffee_cup.glb', error);
      },
    );

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
      ceramicMaterials,
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

      steamMeshes.forEach((mesh, i) => {
        const cfg = STEAM_CONFIGS[i];
        steamAnchor.set(cfg.x, steamAnchorY + STEAM_HEIGHT * 0.5 * cfg.scale, cfg.z);
        steamWorld.copy(steamAnchor).applyQuaternion(group.quaternion).add(group.position);
        mesh.position.copy(steamWorld);
        mesh.quaternion.copy(camera.quaternion);
        (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

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

      disposeModel();

      contactShadowMaterial.dispose();
      contactShadowGeometry.dispose();
      contactShadowTexture.dispose();

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
