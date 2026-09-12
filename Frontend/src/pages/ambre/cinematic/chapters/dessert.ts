import * as THREE from 'three';
import {
  buildBlobGeometry,
  buildLatheVessel,
  buildTaperedTube,
  createContactShadow,
  createMoteField,
  createRadialAlphaTexture,
  createSeededRandom,
} from '../craft';
import type { Chapter, ChapterMood } from './types';

const PLATE_Y = 0.0;
const CAKE_Y = 0.06;

/** Chapter 04 — signature dessert, the visual climax. A glazed dark-
 * chocolate fondant with ganache drips and gold leaf, a cream quenelle,
 * fresh berries, and a slow field of floating gilded motes. */
export function createDessertChapter(quality: 'high' | 'low'): Chapter {
  const seg = quality === 'high' ? 80 : 36;
  const group = new THREE.Group();

  // ---- fine-dining plate --------------------------------------------------
  const ceramic = new THREE.MeshPhysicalMaterial({
    color: 0xf4efe6,
    roughness: 0.35,
    clearcoat: 0.3,
    clearcoatRoughness: 0.22,
    envMapIntensity: 0.9,
  });
  const plateGeometry = buildLatheVessel(
    [
      [0.0, 0.05],
      [1.3, 0.05],
      [1.5, 0.065],
      [1.68, 0.095],
      [1.72, 0.11],
      [1.6, 0.125],
      [0.0, 0.125],
    ],
    seg,
    { noiseAmount: 0.004, seed: 8 },
  );
  const plate = new THREE.Mesh(plateGeometry, ceramic);
  plate.receiveShadow = true;
  plate.castShadow = true;
  group.add(plate);

  // ---- glazed chocolate fondant --------------------------------------------
  const glazeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1c110b,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.1,
  });
  const cakeGeometry = buildLatheVessel(
    [
      [0.0, 0.0],
      [0.38, 0.0],
      [0.4, 0.05],
      [0.39, 0.35],
      [0.42, 0.46],
      [0.36, 0.52],
      [0.2, 0.555],
      [0.0, 0.56],
    ],
    seg,
    { noiseAmount: 0.01, seed: 9 },
  );
  const cake = new THREE.Mesh(cakeGeometry, glazeMaterial);
  cake.position.y = CAKE_Y;
  cake.castShadow = true;
  cake.receiveShadow = true;
  group.add(cake);

  // ---- ganache drips -----------------------------------------------------------
  const dripGeometry = buildTaperedTube(
    [new THREE.Vector3(0.4, 0.42, 0), new THREE.Vector3(0.47, 0.32, 0), new THREE.Vector3(0.45, 0.2, 0), new THREE.Vector3(0.42, 0.12, 0)],
    {
      tubularSegments: quality === 'high' ? 20 : 12,
      radialSegments: quality === 'high' ? 8 : 6,
      baseRadius: 0.03,
      profile: (t) => 1 - t * 0.85,
    },
  );
  const dripAngles = [0.2, 1.1, 2.3, 3.4, 4.5, 5.4];
  const dripGroup = new THREE.Group();
  dripAngles.forEach((angle, i) => {
    const drip = new THREE.Mesh(dripGeometry, glazeMaterial);
    drip.position.y = CAKE_Y;
    drip.rotation.y = angle;
    drip.scale.setScalar(0.85 + (i % 3) * 0.12);
    drip.castShadow = true;
    dripGroup.add(drip);
  });
  group.add(dripGroup);

  // ---- gold leaf flecks -----------------------------------------------------------
  const goldMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd4af37,
    roughness: 0.28,
    metalness: 1.0,
    envMapIntensity: 1.3,
  });
  const goldGroup = new THREE.Group();
  {
    const rng = createSeededRandom(31);
    for (let i = 0; i < 5; i++) {
      // Small, thin, gently crinkled flecks — a delicate garnish, not a
      // sculptural centerpiece, so both size and noise stay subtle.
      const geometry = buildBlobGeometry([0.017, 0.0018, 0.011], 8, i + 0.4, 0.06);
      const fleck = new THREE.Mesh(geometry, goldMaterial);
      const angle = rng() * Math.PI * 2;
      const r = rng() * 0.13;
      fleck.position.set(Math.cos(angle) * r, CAKE_Y + 0.54 + rng() * 0.01, Math.sin(angle) * r);
      fleck.rotation.set(rng() * 0.5, rng() * Math.PI, rng() * 0.5);
      goldGroup.add(fleck);
    }
  }
  group.add(goldGroup);

  // ---- cream quenelle + berries + mint -------------------------------------------
  const creamMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf5efdf,
    roughness: 0.3,
    clearcoat: 0.45,
    clearcoatRoughness: 0.22,
    envMapIntensity: 0.7,
  });
  const creamGeometry = buildBlobGeometry([0.16, 0.13, 0.11], 18, 12, 0.05);
  const cream = new THREE.Mesh(creamGeometry, creamMaterial);
  cream.position.set(0.68, PLATE_Y + 0.16, 0.5);
  cream.rotation.set(0.3, 0.6, 0.1);
  cream.castShadow = true;
  cream.receiveShadow = true;
  group.add(cream);

  const berryMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x7a1224,
    roughness: 0.32,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
    envMapIntensity: 0.85,
  });
  const berryGroup = new THREE.Group();
  const berryLayout = [
    { x: -0.65, z: 0.45 },
    { x: -0.5, z: 0.62 },
    { x: -0.72, z: 0.6 },
  ];
  berryLayout.forEach((cfg, i) => {
    const geometry = buildBlobGeometry([0.055, 0.052, 0.055], 16, i + 5.5, 0.09);
    const berry = new THREE.Mesh(geometry, berryMaterial);
    berry.position.set(cfg.x, PLATE_Y + 0.16, cfg.z);
    berry.castShadow = true;
    berryGroup.add(berry);
  });
  group.add(berryGroup);

  const mintMaterial = new THREE.MeshPhysicalMaterial({ color: 0x2f5a34, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const mintGeometry = buildBlobGeometry([0.075, 0.007, 0.045], 10, 44, 0.12);
  const mint = new THREE.Mesh(mintGeometry, mintMaterial);
  mint.position.set(-0.55, PLATE_Y + 0.17, 0.52);
  mint.rotation.set(0.1, 1.0, 0.1);
  group.add(mint);

  // ---- contact shadow + climactic gilded motes --------------------------------
  const shadowTexture = createRadialAlphaTexture(256, [
    [0, 'rgba(10,6,4,0.45)'],
    [0.55, 'rgba(10,6,4,0.16)'],
    [1, 'rgba(10,6,4,0)'],
  ]);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.7 });
  const contactShadow = createContactShadow(2.4, 2.0, shadowMaterial);
  contactShadow.position.y = 0.005;
  group.add(contactShadow);

  const motes = createMoteField(quality === 'high' ? 70 : 28, [2.2, 2.0, 2.2], 17);
  motes.position.set(0, 0.2, 0);
  group.add(motes);
  const moteBase = (motes.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;

  function applyTheme(isDark: boolean) {
    ceramic.color.set(isDark ? 0xe6ddc9 : 0xf4efe6);
    creamMaterial.color.set(isDark ? 0xe9decb : 0xf5efdf);
    shadowMaterial.opacity = isDark ? 0.82 : 0.62;
  }
  applyTheme(false);

  function getMood(isDark: boolean): ChapterMood {
    return {
      keyColor: isDark ? 0xffcf8a : 0xffe0b0,
      keyIntensity: isDark ? 2.35 : 2.1,
      keyOffset: new THREE.Vector3(-3.4, 5.0, 2.6),
      fillColor: isDark ? 0x7f95c9 : 0xcdd9ff,
      fillIntensity: isDark ? 0.16 : 0.12,
      fillOffset: new THREE.Vector3(3.6, 1.2, 3.0),
      rimColor: isDark ? 0xffb15c : 0xffca8a,
      rimIntensity: isDark ? 1.5 : 1.05,
      rimOffset: new THREE.Vector3(2.6, 3.0, -3.8),
      ambientColor: isDark ? 0x6a5a4a : 0xfff2df,
      ambientIntensity: isDark ? 0.11 : 0.13,
      fogColor: isDark ? 0x0b0706 : 0xcbb89e,
    };
  }

  function update(localProgress: number, ctx: { elapsed: number; presence: number }) {
    group.rotation.y = -0.2 + localProgress * 0.55;
    goldGroup.rotation.y = ctx.elapsed * 0.04;

    const positions = motes.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const idx = i * 3 + 1;
      const rise = (ctx.elapsed * 0.05 + i * 0.07) % 1;
      positions.array[idx] = moteBase[idx] * 0.3 + rise * 1.6;
    }
    positions.needsUpdate = true;
    (motes.material as THREE.PointsMaterial).opacity = 0.5 + 0.5 * ctx.presence;
  }

  function dispose() {
    ceramic.dispose();
    plateGeometry.dispose();
    glazeMaterial.dispose();
    cakeGeometry.dispose();
    dripGeometry.dispose();
    goldMaterial.dispose();
    goldGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    creamMaterial.dispose();
    creamGeometry.dispose();
    berryMaterial.dispose();
    berryGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    mintMaterial.dispose();
    mintGeometry.dispose();
    shadowMaterial.dispose();
    shadowTexture.dispose();
    contactShadow.geometry.dispose();
    motes.geometry.dispose();
    (motes.material as THREE.PointsMaterial).dispose();
  }

  return {
    id: 'dessert',
    group,
    focalPoint: new THREE.Vector3(0, 0.4, 0),
    update,
    applyTheme,
    getMood,
    dispose,
  };
}
