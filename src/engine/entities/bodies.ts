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

export function buildDog(color = '#c98d4b'): THREE.Group {
  const group = new THREE.Group();
  const body = box(0.7, 0.4, 0.4, color);
  body.position.y = 0.45;
  const head = box(0.36, 0.34, 0.36, color);
  head.position.set(0.45, 0.68, 0);
  const snout = box(0.16, 0.14, 0.2, '#f3efe7');
  snout.position.set(0.66, 0.6, 0);
  const earL = box(0.1, 0.22, 0.08, '#8a6238');
  earL.position.set(0.4, 0.86, -0.16);
  const earR = earL.clone();
  earR.position.z = 0.16;
  const tail = box(0.28, 0.08, 0.08, color);
  tail.position.set(-0.45, 0.6, 0);
  tail.rotation.z = 0.6;
  group.add(body, head, snout, earL, earR, tail);
  for (const [dx, dz] of [[0.22, 0.14], [0.22, -0.14], [-0.22, 0.14], [-0.22, -0.14]]) {
    const leg = box(0.12, 0.3, 0.12, color);
    leg.position.set(dx, 0.15, dz);
    group.add(leg);
  }
  return group;
}

export function buildCat(color = '#f2903c'): THREE.Group {
  const group = new THREE.Group();
  const body = box(0.6, 0.32, 0.32, color);
  body.position.y = 0.38;
  const head = box(0.3, 0.28, 0.3, color);
  head.position.set(0.4, 0.58, 0);
  const earL = box(0.08, 0.12, 0.06, color);
  earL.position.set(0.42, 0.78, -0.1);
  const earR = earL.clone();
  earR.position.z = 0.1;
  const tail = box(0.34, 0.06, 0.06, color);
  tail.position.set(-0.42, 0.55, 0);
  tail.rotation.z = 0.9;
  const nose = box(0.04, 0.04, 0.06, '#f291bb');
  nose.position.set(0.56, 0.54, 0);
  group.add(body, head, earL, earR, tail, nose);
  for (const [dx, dz] of [[0.2, 0.1], [0.2, -0.1], [-0.2, 0.1], [-0.2, -0.1]]) {
    const leg = box(0.1, 0.24, 0.1, color);
    leg.position.set(dx, 0.12, dz);
    group.add(leg);
  }
  return group;
}

export type VillagerLook = { shirt: string; pants: string; skin: string; hair: string; hat?: string };

export function buildVillager(look: VillagerLook): THREE.Group {
  const group = new THREE.Group();
  const body = box(0.5, 0.62, 0.3, look.shirt);
  body.position.y = 1.06;
  const head = box(0.46, 0.46, 0.46, look.skin);
  head.position.y = 1.6;
  const hair = box(0.48, 0.14, 0.48, look.hair);
  hair.position.y = 1.78;
  const eyeL = box(0.06, 0.06, 0.02, '#3a3226');
  eyeL.position.set(-0.1, 1.64, 0.24);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  const smile = box(0.16, 0.03, 0.02, '#d8735f');
  smile.position.set(0, 1.5, 0.24);
  group.add(body, head, hair, eyeL, eyeR, smile);
  const limbs = [[-0.33, look.shirt, 0.55, 1.35, 'arm-l'], [0.33, look.shirt, 0.55, 1.35, 'arm-r'], [-0.13, look.pants, 0.75, 0.75, 'leg-l'], [0.13, look.pants, 0.75, 0.75, 'leg-r']] as const;
  for (const [dx, color, h, y, name] of limbs) {
    const limb = box(0.16, h, 0.16, color);
    limb.geometry.translate(0, -h / 2, 0);
    limb.position.set(dx, y, 0);
    limb.name = name;
    group.add(limb);
  }
  if (look.hat) {
    const hat = box(0.56, 0.12, 0.56, look.hat);
    hat.position.y = 1.9;
    const top = box(0.36, 0.22, 0.36, look.hat);
    top.position.y = 2.05;
    group.add(hat, top);
  }
  return group;
}

export function buildRobot(): THREE.Group {
  const group = new THREE.Group();
  const body = box(0.6, 0.6, 0.6, '#9aa2ab');
  body.position.y = 0.5;
  const eyeL = box(0.12, 0.12, 0.04, '#b8f0ff');
  eyeL.position.set(-0.14, 0.6, 0.31);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.14;
  const antenna = box(0.06, 0.3, 0.06, '#3a3a3a');
  antenna.position.y = 0.95;
  const bulb = box(0.14, 0.14, 0.14, '#e8574f');
  bulb.position.y = 1.12;
  const legL = box(0.14, 0.24, 0.14, '#3a3a3a');
  legL.position.set(-0.16, 0.12, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;
  group.add(body, eyeL, eyeR, antenna, bulb, legL, legR);
  return group;
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
