import * as THREE from 'three';

/** Little block bodies for the creatures. All original, all friendly. */

export function box(w: number, h: number, d: number, color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  mesh.castShadow = true;
  return mesh;
}

export function buildBunny(): THREE.Group {
  const group = new THREE.Group();
  const body = box(0.55, 0.38, 0.42, '#f3efe7');
  body.position.y = 0.19;
  const head = box(0.3, 0.28, 0.3, '#f3efe7');
  head.position.set(0.32, 0.42, 0);
  const earLeft = box(0.08, 0.3, 0.08, '#f3efe7');
  earLeft.position.set(0.32, 0.68, -0.08);
  const earRight = earLeft.clone();
  earRight.position.z = 0.08;
  const tail = box(0.14, 0.14, 0.14, '#ffffff');
  tail.position.set(-0.3, 0.28, 0);
  const nose = box(0.05, 0.05, 0.08, '#e8a0b4');
  nose.position.set(0.48, 0.42, 0);
  group.add(body, head, earLeft, earRight, tail, nose);
  return group;
}

export function buildChick(): THREE.Group {
  const group = new THREE.Group();
  const body = box(0.34, 0.32, 0.32, '#ffd94a');
  body.position.y = 0.16;
  const head = box(0.24, 0.22, 0.24, '#ffd94a');
  head.position.set(0.16, 0.42, 0);
  const beak = box(0.1, 0.06, 0.08, '#f2903c');
  beak.position.set(0.32, 0.42, 0);
  group.add(body, head, beak);
  return group;
}

export function buildButterfly(): { group: THREE.Group; wings: [THREE.Mesh, THREE.Mesh] } {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color: '#f291bb', side: THREE.DoubleSide });
  const wingGeometry = new THREE.PlaneGeometry(0.28, 0.2);
  const left = new THREE.Mesh(wingGeometry, material);
  const right = new THREE.Mesh(wingGeometry, material);
  left.position.x = -0.14;
  right.position.x = 0.14;
  const bodyMesh = box(0.06, 0.06, 0.16, '#6b4a26');
  group.add(left, right, bodyMesh);
  return { group, wings: [left, right] };
}

export function disposeGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const material = child.material;
      for (const m of Array.isArray(material) ? material : [material]) m.dispose();
    }
  });
}
