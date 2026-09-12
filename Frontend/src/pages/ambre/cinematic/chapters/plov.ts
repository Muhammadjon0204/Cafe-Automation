import * as THREE from 'three';
import {
  buildBlobGeometry,
  buildLatheVessel,
  createContactShadow,
  createRadialAlphaTexture,
  createSeededRandom,
  createWispMaterial,
} from '../craft';
import type { Chapter, ChapterMood } from './types';

const MOUND_RADIUS: [number, number] = [0.92, 0.68];
const MOUND_HEIGHT = 0.22;
const PLATE_Y = 0.0;

/** Chapter 03 — Tajik plov. A wide ceramic plate, an instanced field of rice
 * grains built up into a mound (one draw call regardless of count), glazed
 * meat chunks, carrot batons, chickpeas, a whole garlic head, and herbs. */
export function createPlovChapter(quality: 'high' | 'low'): Chapter {
  const seg = quality === 'high' ? 80 : 36;
  const group = new THREE.Group();

  // ---- plate ------------------------------------------------------------------
  const ceramic = new THREE.MeshPhysicalMaterial({
    color: 0xf0e9dc,
    roughness: 0.4,
    clearcoat: 0.22,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.8,
  });
  const plateGeometry = buildLatheVessel(
    [
      [0.0, 0.06],
      [1.15, 0.06],
      [1.35, 0.075],
      [1.55, 0.11],
      [1.6, 0.13],
      [1.5, 0.15],
      [0.0, 0.15],
    ],
    seg,
    { noiseAmount: 0.006, seed: 5 },
  );
  const plate = new THREE.Mesh(plateGeometry, ceramic);
  plate.receiveShadow = true;
  plate.castShadow = true;
  group.add(plate);

  // ---- rice mound (instanced) --------------------------------------------------
  const riceGeometry = buildBlobGeometry([0.036, 0.0075, 0.0075], 6, 5, 0.08);
  const riceMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xdcaa4a,
    roughness: 0.5,
    clearcoat: 0.15,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.6,
  });
  const riceCount = quality === 'high' ? 280 : 100;
  const riceMesh = new THREE.InstancedMesh(riceGeometry, riceMaterial, riceCount);
  riceMesh.castShadow = true;
  riceMesh.receiveShadow = true;
  {
    const rng = createSeededRandom(11);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < riceCount; i++) {
      const angle = rng() * Math.PI * 2;
      const radiusT = Math.sqrt(rng());
      const x = Math.cos(angle) * radiusT * MOUND_RADIUS[0];
      const z = Math.sin(angle) * radiusT * MOUND_RADIUS[1];
      const domeT = 1 - radiusT * radiusT;
      const y = PLATE_Y + 0.15 + Math.sqrt(Math.max(0, domeT)) * MOUND_HEIGHT + rng() * 0.03;
      dummy.position.set(x, y, z);
      dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      const scale = 0.75 + rng() * 0.6;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      riceMesh.setMatrixAt(i, dummy.matrix);
      const toast = rng();
      color.setHSL(0.1 - toast * 0.04, 0.55 + rng() * 0.15, 0.42 + rng() * 0.16 - toast * 0.08);
      riceMesh.setColorAt(i, color);
    }
  }
  riceMesh.instanceMatrix.needsUpdate = true;
  if (riceMesh.instanceColor) riceMesh.instanceColor.needsUpdate = true;
  group.add(riceMesh);

  // ---- meat, carrots, chickpeas -------------------------------------------------
  const meatMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x7a4321,
    roughness: 0.48,
    clearcoat: 0.3,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.65,
  });
  const meatGroup = new THREE.Group();
  const meatLayout = [
    { x: -0.32, z: 0.12, scale: 1.0, rot: 0.4 },
    { x: 0.28, z: -0.1, scale: 0.85, rot: -0.8 },
    { x: -0.02, z: -0.32, scale: 0.9, rot: 1.3 },
  ];
  meatLayout.forEach((cfg, i) => {
    const geometry = buildBlobGeometry([0.16, 0.1, 0.13], 16, i + 2.2, 0.06);
    const chunk = new THREE.Mesh(geometry, meatMaterial);
    chunk.position.set(cfg.x, PLATE_Y + 0.15 + MOUND_HEIGHT * 0.72, cfg.z);
    chunk.rotation.set(0.2, cfg.rot, 0.1);
    chunk.scale.setScalar(cfg.scale);
    chunk.castShadow = true;
    chunk.receiveShadow = true;
    meatGroup.add(chunk);
  });
  group.add(meatGroup);

  const carrotMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd97b2e,
    roughness: 0.45,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.6,
  });
  const carrotGroup = new THREE.Group();
  {
    const rng = createSeededRandom(23);
    for (let i = 0; i < 9; i++) {
      const angle = rng() * Math.PI * 2;
      const radiusT = 0.3 + rng() * 0.6;
      const x = Math.cos(angle) * radiusT * MOUND_RADIUS[0];
      const z = Math.sin(angle) * radiusT * MOUND_RADIUS[1];
      const geometry = buildBlobGeometry([0.075, 0.02, 0.02], 8, i + 3.1, 0.08);
      const baton = new THREE.Mesh(geometry, carrotMaterial);
      baton.position.set(x, PLATE_Y + 0.16 + MOUND_HEIGHT * 0.6 * rng(), z);
      baton.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      baton.castShadow = true;
      carrotGroup.add(baton);
    }
  }
  group.add(carrotGroup);

  // ---- whole garlic head (signature editorial prop) -----------------------------
  const garlicMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe8dfc8,
    roughness: 0.42,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.7,
  });
  const garlicGeometry = buildBlobGeometry([0.155, 0.14, 0.155], 20, 9, 0.05);
  const garlic = new THREE.Mesh(garlicGeometry, garlicMaterial);
  garlic.position.set(0.05, PLATE_Y + 0.15 + MOUND_HEIGHT + 0.09, 0.28);
  garlic.castShadow = true;
  garlic.receiveShadow = true;
  group.add(garlic);

  // ---- contact shadow + rising warmth ---------------------------------------
  const shadowTexture = createRadialAlphaTexture(256, [
    [0, 'rgba(30,18,6,0.48)'],
    [0.55, 'rgba(30,18,6,0.18)'],
    [1, 'rgba(30,18,6,0)'],
  ]);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.75 });
  const contactShadow = createContactShadow(3.6, 3.0, shadowMaterial);
  contactShadow.position.y = -0.01;
  group.add(contactShadow);

  const steamMaterial = createWispMaterial(0xd8b98c, 0.07, 5.1);
  const steamMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.4), steamMaterial);
  steamMesh.position.set(-0.1, PLATE_Y + 0.55, 0);
  group.add(steamMesh);

  function applyTheme(isDark: boolean) {
    ceramic.color.set(isDark ? 0xe1d8c4 : 0xf0e9dc);
    riceMaterial.color.set(isDark ? 0xc99843 : 0xdcaa4a);
    meatMaterial.color.set(isDark ? 0x603118 : 0x7a4321);
    carrotMaterial.color.set(isDark ? 0xc06a24 : 0xd97b2e);
    garlicMaterial.color.set(isDark ? 0xd7cbac : 0xe8dfc8);
    shadowMaterial.opacity = isDark ? 0.85 : 0.68;
    steamMaterial.uniforms.uColor.value.set(isDark ? 0xd8c4a4 : 0xd8b98c);
  }
  applyTheme(false);

  function getMood(isDark: boolean): ChapterMood {
    return {
      keyColor: isDark ? 0xffb95e : 0xffc978,
      keyIntensity: isDark ? 2.2 : 2.0,
      keyOffset: new THREE.Vector3(0.5, 6.2, 2.4),
      fillColor: isDark ? 0xb98a52 : 0xffe2b0,
      fillIntensity: isDark ? 0.18 : 0.14,
      fillOffset: new THREE.Vector3(-3.8, 1.4, -2.0),
      rimColor: isDark ? 0xff8f3d : 0xffa859,
      rimIntensity: isDark ? 1.25 : 0.9,
      rimOffset: new THREE.Vector3(3.2, 2.2, -3.0),
      ambientColor: isDark ? 0xffbe80 : 0xffe9c8,
      ambientIntensity: isDark ? 0.14 : 0.15,
      fogColor: isDark ? 0x130c07 : 0xd6bd9a,
    };
  }

  function update(localProgress: number, ctx: { elapsed: number; presence: number }) {
    group.rotation.y = -0.35 + localProgress * 0.5;
    meatGroup.children.forEach((chunk, i) => {
      chunk.position.y += Math.sin(ctx.elapsed * 0.5 + i) * 0.0004 * ctx.presence;
    });
    garlic.rotation.y = ctx.elapsed * 0.05;
    steamMaterial.uniforms.uTime.value = ctx.elapsed;
    steamMaterial.uniforms.uOpacity.value = 0.07 * (0.3 + 0.7 * ctx.presence);
  }

  function dispose() {
    ceramic.dispose();
    plateGeometry.dispose();
    riceGeometry.dispose();
    riceMaterial.dispose();
    meatMaterial.dispose();
    meatGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    carrotMaterial.dispose();
    carrotGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    garlicMaterial.dispose();
    garlicGeometry.dispose();
    shadowMaterial.dispose();
    shadowTexture.dispose();
    contactShadow.geometry.dispose();
    steamMaterial.dispose();
    steamMesh.geometry.dispose();
  }

  return {
    id: 'plov',
    group,
    focalPoint: new THREE.Vector3(0, 0.35, 0),
    update,
    applyTheme,
    getMood,
    dispose,
  };
}
