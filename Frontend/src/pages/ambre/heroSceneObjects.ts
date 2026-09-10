import * as THREE from 'three';

/** Placeholder procedural geometry for the hero composition's secondary
 * objects — stylized enough to read correctly at hero scale, built with the
 * same hand-perturbed-primitive technique as the cup (see CoffeeCup3D.tsx)
 * so the whole scene shares one visual language. Swap for real .glb assets
 * under /public/models/ (coffee-bean.glb, croissant.glb) without touching
 * the scene assembly in CoffeeCup3D.tsx — callers only depend on the
 * BufferGeometry these return. */

/** A small ellipsoid with a tapered silhouette and an indented central
 * groove on one face — reads as a coffee bean at foreground-prop scale. */
export function buildCoffeeBeanGeometry(seed = 0, radius = 0.1): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(radius, 22, 16);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    let x = v.x * 1.35;
    let y = v.y * 0.66;
    let z = v.z * 0.52;

    // Taper both tips so the silhouette reads as a bean, not an egg.
    const tipFactor = Math.min(1, Math.abs(x) / (radius * 1.35));
    const taper = 1 - 0.22 * Math.pow(tipFactor, 3);
    y *= taper;
    z *= taper;

    // Flatten and groove the "belly" face — the crease that sells the shape.
    if (z > 0) {
      const nearCenter = Math.max(0, 1 - Math.abs(x) / (radius * 1.1));
      const wobble = Math.sin(x * 9 + seed * 6.28) * 0.05;
      z *= 1 - 0.55 * nearCenter;
      z -= nearCenter * radius * 0.16 * (1 + wobble);
    }

    pos.setXYZ(i, x, y, z);
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** A tapered, gently ridged crescent tube — a stylized croissant, built the
 * same way as the cup handle (CatmullRomCurve3 + tapered TubeGeometry). */
export function buildCroissantGeometry(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-0.5, 0, 0.05),
      new THREE.Vector3(-0.32, 0.05, 0.22),
      new THREE.Vector3(0, 0.07, 0.28),
      new THREE.Vector3(0.32, 0.05, 0.22),
      new THREE.Vector3(0.5, 0, 0.05),
    ],
    false,
    'catmullrom',
    0.5,
  );

  const tubularSegments = 40;
  const radialSegments = 10;
  const baseRadius = 0.085;
  const tube = new THREE.TubeGeometry(curve, tubularSegments, baseRadius, radialSegments, false);

  const pos = tube.attributes.position;
  const center = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  const dir = new THREE.Vector3();

  for (let ring = 0; ring <= tubularSegments; ring++) {
    const t = ring / tubularSegments;
    curve.getPointAt(t, center);
    // Pointed ends like a real croissant tip, plus a few soft lengthwise
    // lobes suggesting laminated layers without needing a flaky texture.
    const endTaper = Math.pow(Math.sin(Math.PI * t), 1.15);
    for (let j = 0; j <= radialSegments; j++) {
      const idx = ring * (radialSegments + 1) + j;
      vertex.fromBufferAttribute(pos, idx);
      dir.subVectors(vertex, center);
      const len = dir.length();
      if (len < 1e-6) continue;
      const angle = (j / radialSegments) * Math.PI * 2;
      const ridge = 1 + 0.09 * Math.sin(angle * 3 + t * 5.5);
      dir.multiplyScalar((baseRadius * endTaper * ridge) / len);
      vertex.copy(center).add(dir);
      pos.setXYZ(idx, vertex.x, vertex.y, vertex.z);
    }
  }

  pos.needsUpdate = true;
  tube.computeVertexNormals();
  return tube;
}
