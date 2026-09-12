import * as THREE from 'three';
import {
  buildBlobGeometry,
  buildLatheVessel,
  buildTaperedTube,
  createContactShadow,
  createRadialAlphaTexture,
  createWispMaterial,
  valueNoise,
} from '../craft';
import type { Chapter, ChapterMood } from './types';

const PAN_Y = 0.0;
const EGG_WELLS = [
  { x: -0.34, z: 0.1, r: 0.32 },
  { x: 0.3, z: -0.18, r: 0.3 },
  { x: -0.02, z: -0.4, r: 0.28 },
];

/** A shallow, slightly domed sauce bed with hollows carved out under each
 * egg well — built as a displaced disc rather than a flat circle so the
 * baked tomato base reads as real volume, not a painted plane. */
function buildSauceGeometry(radius: number, segments: number): THREE.BufferGeometry {
  const geometry = new THREE.CircleGeometry(radius, segments, 0, Math.PI * 2);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let height = 0.05 + valueNoise(v.x * 3.2, v.y * 3.2, 4) * 0.028;
    for (const well of EGG_WELLS) {
      const d = Math.hypot(v.x - well.x, v.y - well.z);
      if (d < well.r) height -= (1 - d / well.r) * 0.045;
    }
    pos.setZ(i, height);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Chapter 02 — shakshuka. A cast-iron skillet, a baked tomato-pepper base
 * with three egg wells (glossy yolk + soft-white), scattered herbs, and a
 * thin ribbon of aromatic steam. */
export function createShakshukaChapter(quality: 'high' | 'low'): Chapter {
  const seg = quality === 'high' ? 80 : 36;
  const group = new THREE.Group();

  // ---- cast-iron skillet ----------------------------------------------------
  const iron = new THREE.MeshPhysicalMaterial({
    color: 0x2a2724,
    roughness: 0.55,
    metalness: 0.22,
    clearcoat: 0.1,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.7,
  });
  const panGeometry = buildLatheVessel(
    [
      [0.0, 0.0],
      [1.02, 0.0],
      [1.12, 0.02],
      [1.18, 0.06],
      [1.14, 0.095],
      [1.06, 0.1],
      [0.0, 0.1],
    ],
    seg,
    { noiseAmount: 0.008, seed: 2 },
  );
  const pan = new THREE.Mesh(panGeometry, iron);
  pan.castShadow = true;
  pan.receiveShadow = true;
  group.add(pan);

  const handleGeometry = buildTaperedTube(
    [
      new THREE.Vector3(1.1, 0.06, 0),
      new THREE.Vector3(1.55, 0.08, 0),
      new THREE.Vector3(1.95, 0.1, 0),
      new THREE.Vector3(2.15, 0.1, 0),
    ],
    {
      tubularSegments: quality === 'high' ? 28 : 16,
      radialSegments: quality === 'high' ? 10 : 6,
      baseRadius: 0.05,
      profile: (t) => 1 - 0.25 * t,
    },
  );
  const handle = new THREE.Mesh(handleGeometry, iron);
  handle.castShadow = true;
  handle.receiveShadow = true;
  group.add(handle);

  // ---- tomato-pepper base -----------------------------------------------------
  const sauceMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xa4341c,
    roughness: 0.38,
    clearcoat: 0.35,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.6,
  });
  const sauceGeometry = buildSauceGeometry(1.0, seg);
  const sauce = new THREE.Mesh(sauceGeometry, sauceMaterial);
  sauce.position.y = PAN_Y + 0.1;
  sauce.receiveShadow = true;
  sauce.castShadow = true;
  group.add(sauce);

  // ---- eggs -------------------------------------------------------------------
  const whiteMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf1ead9,
    roughness: 0.3,
    transmission: quality === 'high' ? 0.18 : 0,
    thickness: 0.3,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.55,
  });
  const yolkMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe8a020,
    roughness: 0.22,
    clearcoat: 0.75,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.9,
  });
  const eggGroup = new THREE.Group();
  const yolkMeshes: THREE.Mesh[] = [];
  EGG_WELLS.forEach((well, i) => {
    const whiteGeometry = buildBlobGeometry([well.r * 0.98, 0.065, well.r * 0.9], 20, i + 0.3, 0.035);
    const white = new THREE.Mesh(whiteGeometry, whiteMaterial);
    white.position.set(well.x, PAN_Y + 0.1 + 0.02, well.z);
    white.castShadow = true;
    white.receiveShadow = true;
    eggGroup.add(white);

    const yolkGeometry = buildBlobGeometry([0.115, 0.05, 0.115], 16, i + 0.7, 0.02);
    const yolk = new THREE.Mesh(yolkGeometry, yolkMaterial);
    yolk.position.set(well.x + 0.03, PAN_Y + 0.1 + 0.075, well.z - 0.02);
    yolk.castShadow = true;
    eggGroup.add(yolk);
    yolkMeshes.push(yolk);
  });
  group.add(eggGroup);

  // ---- herbs ------------------------------------------------------------------
  const herbMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x3f5c2c,
    roughness: 0.45,
    clearcoat: 0.3,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.5,
  });
  const herbGroup = new THREE.Group();
  const herbLayout = [
    { x: -0.6, z: 0.35, rot: 0.4 },
    { x: 0.55, z: 0.42, rot: -0.7 },
    { x: 0.05, z: 0.62, rot: 1.2 },
    { x: -0.5, z: -0.55, rot: -0.3 },
    { x: 0.62, z: -0.5, rot: 0.9 },
  ];
  herbLayout.forEach((cfg, i) => {
    const geometry = buildBlobGeometry([0.085, 0.008, 0.028], 10, i + 1.1, 0.15);
    const leaf = new THREE.Mesh(geometry, herbMaterial);
    leaf.position.set(cfg.x, PAN_Y + 0.16, cfg.z);
    leaf.rotation.set(0.1, cfg.rot, 0.2);
    leaf.castShadow = true;
    herbGroup.add(leaf);
  });
  group.add(herbGroup);

  // ---- contact shadow + steam ---------------------------------------------
  const shadowTexture = createRadialAlphaTexture(256, [
    [0, 'rgba(20,12,6,0.5)'],
    [0.55, 'rgba(20,12,6,0.2)'],
    [1, 'rgba(20,12,6,0)'],
  ]);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.8 });
  const contactShadow = createContactShadow(2.9, 2.4, shadowMaterial);
  contactShadow.position.y = -0.02;
  group.add(contactShadow);

  const steamMaterial = createWispMaterial(0xd8b98c, 0.09, 2.4);
  const steamMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.3), steamMaterial);
  steamMesh.position.set(0, PAN_Y + 0.6, -0.1);
  group.add(steamMesh);

  function applyTheme(isDark: boolean) {
    iron.color.set(isDark ? 0x201d1b : 0x2a2724);
    sauceMaterial.color.set(isDark ? 0x8c2c17 : 0xa4341c);
    whiteMaterial.color.set(isDark ? 0xe4dcc9 : 0xf1ead9);
    yolkMaterial.color.set(isDark ? 0xdb9418 : 0xe8a020);
    herbMaterial.color.set(isDark ? 0x334a24 : 0x3f5c2c);
    shadowMaterial.opacity = isDark ? 0.88 : 0.7;
    steamMaterial.uniforms.uColor.value.set(isDark ? 0xd8c4a4 : 0xd8b98c);
  }
  applyTheme(false);

  function getMood(isDark: boolean): ChapterMood {
    return {
      keyColor: isDark ? 0xffc98a : 0xffdba0,
      keyIntensity: isDark ? 2.1 : 1.9,
      keyOffset: new THREE.Vector3(-2.6, 4.6, 3.2),
      fillColor: isDark ? 0xd9a35f : 0xffe8c8,
      fillIntensity: isDark ? 0.2 : 0.16,
      fillOffset: new THREE.Vector3(3.6, 1.6, 2.2),
      rimColor: isDark ? 0xff9d52 : 0xffb066,
      rimIntensity: isDark ? 1.2 : 0.85,
      rimOffset: new THREE.Vector3(2.0, 2.6, -3.6),
      ambientColor: isDark ? 0xffcf9e : 0xfff0da,
      ambientIntensity: isDark ? 0.15 : 0.16,
      fogColor: isDark ? 0x120d0a : 0xd9c3a8,
    };
  }

  function update(localProgress: number, ctx: { elapsed: number; presence: number }) {
    group.rotation.y = -0.15 + localProgress * 0.32;
    yolkMeshes.forEach((yolk, i) => {
      yolk.position.y = PAN_Y + 0.1 + 0.075 + Math.sin(ctx.elapsed * 0.8 + i) * 0.003 * ctx.presence;
    });
    herbGroup.children.forEach((leaf, i) => {
      leaf.rotation.z = 0.2 + Math.sin(ctx.elapsed * 0.5 + i) * 0.03 * ctx.presence;
    });
    steamMaterial.uniforms.uTime.value = ctx.elapsed;
    steamMaterial.uniforms.uOpacity.value = 0.09 * (0.3 + 0.7 * ctx.presence);
  }

  function dispose() {
    iron.dispose();
    panGeometry.dispose();
    handleGeometry.dispose();
    sauceMaterial.dispose();
    sauceGeometry.dispose();
    whiteMaterial.dispose();
    yolkMaterial.dispose();
    eggGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    herbMaterial.dispose();
    herbGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    shadowMaterial.dispose();
    shadowTexture.dispose();
    contactShadow.geometry.dispose();
    steamMaterial.dispose();
    steamMesh.geometry.dispose();
  }

  return {
    id: 'shakshuka',
    group,
    focalPoint: new THREE.Vector3(0, 0.2, 0),
    update,
    applyTheme,
    getMood,
    dispose,
  };
}
