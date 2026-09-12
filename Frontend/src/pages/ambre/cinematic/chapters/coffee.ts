import * as THREE from 'three';
import {
  buildBlobGeometry,
  buildLatheVessel,
  buildTaperedTube,
  createContactShadow,
  createNoiseBumpTexture,
  createRadialAlphaTexture,
  createWispMaterial,
} from '../craft';
import type { Chapter, ChapterMood } from './types';

const STEAM_CONFIGS = [
  { x: -0.16, z: 0.06, seed: 0.15, opacity: 0.15, scale: 1.0 },
  { x: 0.15, z: -0.05, seed: 0.55, opacity: 0.12, scale: 0.82 },
  { x: 0.02, z: 0.11, seed: 0.85, opacity: 0.1, scale: 1.2 },
];
const STEAM_HEIGHT = 1.5;
const COFFEE_Y = 0.9;

/** Chapter 01 — signature coffee. A hand-thrown ceramic cup and saucer,
 * a glossy coffee surface with crema-catching highlights, drifting steam,
 * and loose beans/a croissant as foreground/background props. */
export function createCoffeeChapter(quality: 'high' | 'low'): Chapter {
  const seg = quality === 'high' ? 96 : 40;
  const group = new THREE.Group();

  const ceramic = new THREE.MeshPhysicalMaterial({
    color: 0xece3d6,
    roughness: 0.46,
    metalness: 0.02,
    clearcoat: 0.18,
    clearcoatRoughness: 0.32,
    envMapIntensity: 0.85,
  });

  const cupGeometry = buildLatheVessel(
    [
      [0.0, 0.0],
      [0.4, 0.0],
      [0.465, 0.045],
      [0.5, 0.1],
      [0.545, 0.55],
      [0.565, 0.8],
      [0.6, 0.9],
      [0.645, 0.955],
      [0.625, 1.0],
      [0.575, 1.012],
      [0.525, 1.0],
      [0.535, 0.955],
      [0.5, 0.85],
      [0.44, 0.14],
      [0.0, 0.14],
    ],
    seg,
    { noiseAmount: 0.016, seed: 1 },
  );
  const cup = new THREE.Mesh(cupGeometry, ceramic);
  cup.castShadow = true;
  cup.receiveShadow = true;
  group.add(cup);

  const handleGeometry = buildTaperedTube(
    [
      new THREE.Vector3(0.545, 0.78, 0),
      new THREE.Vector3(0.88, 0.8, 0.015),
      new THREE.Vector3(1.02, 0.62, 0.02),
      new THREE.Vector3(1.0, 0.44, 0.01),
      new THREE.Vector3(0.86, 0.3, -0.005),
      new THREE.Vector3(0.52, 0.3, 0),
    ],
    {
      tubularSegments: quality === 'high' ? 48 : 24,
      radialSegments: quality === 'high' ? 12 : 8,
      baseRadius: 0.052,
      profile: (t) => 1 + 0.5 * Math.pow(Math.abs(2 * t - 1), 1.6),
    },
  );
  const handle = new THREE.Mesh(handleGeometry, ceramic);
  handle.castShadow = true;
  handle.receiveShadow = true;
  group.add(handle);

  const saucerGeometry = buildLatheVessel(
    [
      [0.0, 0.0],
      [1.02, 0.0],
      [1.07, 0.03],
      [1.1, 0.055],
      [1.05, 0.075],
      [0.34, 0.07],
      [0.3, 0.03],
      [0.0, 0.03],
    ],
    seg,
  );
  const saucer = new THREE.Mesh(saucerGeometry, ceramic);
  saucer.position.y = -0.2;
  saucer.castShadow = true;
  saucer.receiveShadow = true;
  group.add(saucer);

  const rippleTexture = createNoiseBumpTexture(128, 26, 0.24, 3);
  const coffeeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x160d07,
    roughness: 0.07,
    metalness: 0.0,
    envMapIntensity: 0.15,
    bumpMap: rippleTexture,
    bumpScale: 0.004,
    side: THREE.DoubleSide,
  });
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.49, seg > 48 ? 64 : 32), coffeeMaterial);
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = COFFEE_Y;
  coffee.receiveShadow = true;
  group.add(coffee);

  const contactShadowTexture = createRadialAlphaTexture(256, [
    [0, 'rgba(20,12,6,0.55)'],
    [0.55, 'rgba(20,12,6,0.22)'],
    [1, 'rgba(20,12,6,0)'],
  ]);
  const contactShadowMaterial = new THREE.MeshBasicMaterial({
    map: contactShadowTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.85,
  });
  const contactShadow = createContactShadow(1.75, 1.2, contactShadowMaterial);
  contactShadow.position.y = -0.298;
  group.add(contactShadow);

  group.position.y = -0.08;

  // ---- loose beans (foreground prop) --------------------------------------
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
  beanLayout.forEach((cfg) => {
    const geometry = buildBlobGeometry([0.135, 0.066, 0.052], 18, cfg.seed, 0.04);
    const bean = new THREE.Mesh(geometry, beanMaterial);
    bean.position.set(cfg.x, -0.255, cfg.z);
    bean.rotation.set(cfg.rotX, cfg.rotY, 0.2);
    bean.scale.setScalar(cfg.scale);
    bean.castShadow = true;
    bean.receiveShadow = true;
    beanGroup.add(bean);
  });
  const beanShadow = createContactShadow(0.6, 0.42, contactShadowMaterial);
  beanShadow.position.set(-0.02, -0.298, 1.06);
  beanGroup.add(beanShadow);
  group.add(beanGroup);

  // ---- background croissant -------------------------------------------------
  const pastryMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb87a35,
    roughness: 0.62,
    clearcoat: 0.04,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.35,
  });
  const croissantGeometry = buildTaperedTube(
    [
      new THREE.Vector3(-0.5, 0, 0.05),
      new THREE.Vector3(-0.32, 0.05, 0.22),
      new THREE.Vector3(0, 0.07, 0.28),
      new THREE.Vector3(0.32, 0.05, 0.22),
      new THREE.Vector3(0.5, 0, 0.05),
    ],
    {
      tubularSegments: quality === 'high' ? 40 : 22,
      radialSegments: quality === 'high' ? 10 : 7,
      baseRadius: 0.085,
      profile: (t) => Math.pow(Math.sin(Math.PI * t), 1.15),
      ridge: (t, angle) => 1 + 0.09 * Math.sin(angle * 3 + t * 5.5),
    },
  );
  const croissant = new THREE.Mesh(croissantGeometry, pastryMaterial);
  croissant.castShadow = true;
  croissant.receiveShadow = true;
  croissant.rotation.set(0.06, 1.0, 0);
  const pastryGroup = new THREE.Group();
  pastryGroup.add(croissant);
  pastryGroup.scale.setScalar(1.2);
  pastryGroup.position.set(-0.98, -0.26, 0.1);
  const pastryShadow = createContactShadow(1.15, 0.75, contactShadowMaterial);
  pastryShadow.position.y = -0.028;
  pastryGroup.add(pastryShadow);
  group.add(pastryGroup);

  // ---- steam ----------------------------------------------------------------
  const steamGeometry = new THREE.PlaneGeometry(0.3, STEAM_HEIGHT, 1, 1);
  const steamMaterials = STEAM_CONFIGS.map((cfg) => createWispMaterial(0x94806b, cfg.opacity, cfg.seed));
  const steamMeshes = STEAM_CONFIGS.map((cfg, i) => {
    const mesh = new THREE.Mesh(steamGeometry, steamMaterials[i]);
    mesh.scale.setScalar(cfg.scale);
    group.add(mesh);
    return mesh;
  });

  const steamAnchor = new THREE.Vector3();

  function applyTheme(isDark: boolean) {
    ceramic.color.set(isDark ? 0xeae3da : 0xf2ede7);
    beanMaterial.color.set(isDark ? 0x241209 : 0x2b1710);
    pastryMaterial.color.set(isDark ? 0xa66d2e : 0xb87a35);
    contactShadowMaterial.opacity = isDark ? 0.92 : 0.75;
    steamMaterials.forEach((material, i) => {
      const cfg = STEAM_CONFIGS[i];
      material.uniforms.uColor.value.set(isDark ? 0xcdc3b2 : 0x94806b);
      material.uniforms.uOpacity.value = cfg.opacity * (isDark ? 1.35 : 1);
    });
  }
  applyTheme(false);

  function getMood(isDark: boolean): ChapterMood {
    return {
      keyColor: isDark ? 0xffdcb0 : 0xfff1e0,
      keyIntensity: isDark ? 2.05 : 1.9,
      keyOffset: new THREE.Vector3(3.2, 5.4, 4.0),
      fillColor: isDark ? 0xbfd9ce : 0xd7e4ff,
      fillIntensity: isDark ? 0.22 : 0.16,
      fillOffset: new THREE.Vector3(-4.4, 2.0, 2.6),
      rimColor: isDark ? 0xffe0b8 : 0xffd9ac,
      rimIntensity: isDark ? 1.1 : 0.75,
      rimOffset: new THREE.Vector3(-2.2, 3.4, -4.4),
      ambientColor: isDark ? 0xffe9d2 : 0xfff4e8,
      ambientIntensity: isDark ? 0.15 : 0.16,
      fogColor: isDark ? 0x0e0c0a : 0xdccbb3,
    };
  }

  function update(localProgress: number, ctx: { elapsed: number; presence: number }) {
    const spin = ctx.elapsed * 0.16 + localProgress * 0.6;
    group.rotation.y = spin;

    const beanBob = Math.sin(ctx.elapsed * 0.6) * 0.01 * ctx.presence;
    beanGroup.position.y = beanBob;
    pastryGroup.rotation.z = Math.sin(ctx.elapsed * 0.35) * 0.02 * ctx.presence;

    steamMeshes.forEach((mesh, i) => {
      const cfg = STEAM_CONFIGS[i];
      steamAnchor.set(cfg.x, COFFEE_Y + STEAM_HEIGHT * 0.5 * cfg.scale, cfg.z);
      mesh.position.copy(steamAnchor);
      mesh.rotation.y = -group.rotation.y;
      (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = ctx.elapsed;
      (mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value =
        STEAM_CONFIGS[i].opacity * (0.4 + 0.6 * ctx.presence);
    });
  }

  function dispose() {
    ceramic.dispose();
    cupGeometry.dispose();
    handleGeometry.dispose();
    saucerGeometry.dispose();
    coffeeMaterial.dispose();
    coffee.geometry.dispose();
    rippleTexture.dispose();
    contactShadowMaterial.dispose();
    contactShadowTexture.dispose();
    contactShadow.geometry.dispose();
    beanShadow.geometry.dispose();
    pastryShadow.geometry.dispose();
    beanMaterial.dispose();
    beanGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    pastryMaterial.dispose();
    croissantGeometry.dispose();
    steamGeometry.dispose();
    steamMaterials.forEach((m) => m.dispose());
  }

  return {
    id: 'coffee',
    group,
    focalPoint: new THREE.Vector3(0, 0.7, 0),
    update,
    applyTheme,
    getMood,
    dispose,
  };
}
