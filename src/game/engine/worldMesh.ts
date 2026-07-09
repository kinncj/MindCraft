import * as THREE from 'three';
import type { BlockTypeId, PlacedBlock } from '../../types/game';
import { ALL_BLOCK_TYPES, BLOCK_DEFINITIONS } from './blockRegistry';
import { blockFaceCanvas, type BlockFace } from './textures';
import { lightIndex, type LightGrids } from './lighting';
import { WORLD_SIZE } from './world';

/**
 * Chunk meshing, the way voxel games actually render: instead of one
 * object per block, the whole world becomes a few merged meshes with
 * only the visible faces. A full MindCraft world is ~1 draw call and
 * ~20k triangles for all opaque terrain, which even a software
 * rasterizer renders comfortably.
 *
 * Buckets: opaque terrain, water (scrolling texture), alpha (glass,
 * cloud), and glow (light, star — emissive).
 */

export type BucketId = 'opaque' | 'water' | 'alpha' | 'glow';

export function bucketOf(type: BlockTypeId): BucketId {
  if (type === 'water') return 'water';
  if (type === 'glass' || type === 'cloud' || type === 'ice') return 'alpha';
  if ((BLOCK_DEFINITIONS[type].lightLevel ?? 0) > 0) return 'glow';
  return 'opaque';
}

const TILE = 16;
const FACES: BlockFace[] = ['top', 'side', 'bottom'];

type UVRect = { u0: number; v0: number; u1: number; v1: number };

/** All block face tiles packed into one texture. */
export class TextureAtlas {
  readonly texture: THREE.CanvasTexture | null;
  private rects = new Map<string, UVRect>();

  constructor() {
    const cols = 8;
    const tiles = ALL_BLOCK_TYPES.length * FACES.length;
    const rows = Math.ceil(tiles / cols);
    const canvas = document.createElement('canvas');
    canvas.width = cols * TILE;
    canvas.height = rows * TILE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.texture = null;
      return;
    }

    let index = 0;
    for (const type of ALL_BLOCK_TYPES) {
      for (const face of FACES) {
        const tile = blockFaceCanvas(type, face);
        const col = index % cols;
        const row = Math.floor(index / cols);
        if (tile) {
          // Clouds keep a little translucency baked into the atlas.
          ctx.globalAlpha = type === 'cloud' ? 0.85 : 1;
          ctx.drawImage(tile, col * TILE, row * TILE);
          ctx.globalAlpha = 1;
        }
        // Half-texel inset so neighboring tiles never bleed.
        const inset = 0.5;
        this.rects.set(`${type}:${face}`, {
          u0: (col * TILE + inset) / canvas.width,
          v0: 1 - (row * TILE + TILE - inset) / canvas.height,
          u1: (col * TILE + TILE - inset) / canvas.width,
          v1: 1 - (row * TILE + inset) / canvas.height,
        });
        index += 1;
      }
    }

    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  rect(type: BlockTypeId, face: BlockFace): UVRect {
    return this.rects.get(`${type}:${face}`) ?? { u0: 0, v0: 0, u1: 1, v1: 1 };
  }
}

const FACE_NORMALS: Array<[number, number, number]> = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

type FaceBasis = {
  normal: [number, number, number];
  right: [number, number, number];
  up: [number, number, number];
  face: BlockFace;
};

// right = up × normal gives counter-clockwise winding seen from outside.
const FACE_BASES: FaceBasis[] = FACE_NORMALS.map(([nx, ny, nz]) => {
  const up: [number, number, number] = ny !== 0 ? [0, 0, 1] : [0, 1, 0];
  const right: [number, number, number] = [
    up[1] * nz - up[2] * ny,
    up[2] * nx - up[0] * nz,
    up[0] * ny - up[1] * nx,
  ];
  return {
    normal: [nx, ny, nz],
    right,
    up,
    face: ny > 0 ? 'top' : ny < 0 ? 'bottom' : 'side',
  };
});

type Buffers = {
  positions: number[];
  normals: number[];
  uvs: number[];
  skylight: number[];
  blocklight: number[];
  indices: number[];
};

function emitFace(
  buffers: Buffers,
  x: number,
  y: number,
  z: number,
  basis: FaceBasis,
  rect: UVRect,
  sky: number,
  block: number,
): void {
  const { normal, right, up } = basis;
  const base = buffers.positions.length / 3;
  // Corner order: (-r,-u), (+r,-u), (+r,+u), (-r,+u).
  const signs: Array<[number, number]> = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (const [sr, su] of signs) {
    buffers.positions.push(
      x + (normal[0] + sr * right[0] + su * up[0]) * 0.5,
      y + (normal[1] + sr * right[1] + su * up[1]) * 0.5,
      z + (normal[2] + sr * right[2] + su * up[2]) * 0.5,
    );
    buffers.normals.push(normal[0], normal[1], normal[2]);
    buffers.skylight.push(sky);
    buffers.blocklight.push(block);
  }
  buffers.uvs.push(rect.u0, rect.v0, rect.u1, rect.v0, rect.u1, rect.v1, rect.u0, rect.v1);
  buffers.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

/**
 * Builds one merged geometry per bucket, emitting only faces that can
 * actually be seen: a face is hidden when its neighbor is opaque, or is
 * transparent of the same type (no walls inside a lake).
 */
export function buildWorldGeometries(
  blocks: Record<string, PlacedBlock>,
  atlas: TextureAtlas,
  light: LightGrids,
): Record<BucketId, THREE.BufferGeometry | null> {
  const empty = (): Buffers => ({
    positions: [],
    normals: [],
    uvs: [],
    skylight: [],
    blocklight: [],
    indices: [],
  });
  const buffers: Record<BucketId, Buffers> = {
    opaque: empty(),
    water: empty(),
    alpha: empty(),
    glow: empty(),
  };

  for (const block of Object.values(blocks)) {
    const { x, y, z } = block.position;
    const bucket = bucketOf(block.type);
    const selfGlow = (BLOCK_DEFINITIONS[block.type].lightLevel ?? 0) / 15;
    for (const basis of FACE_BASES) {
      const nx = x + basis.normal[0];
      const ny = y + basis.normal[1];
      const nz = z + basis.normal[2];
      const neighbor = blocks[`${nx},${ny},${nz}`];
      if (neighbor) {
        const def = BLOCK_DEFINITIONS[neighbor.type];
        if (!def.transparent) continue; // hidden behind solid rock
        if (neighbor.type === block.type) continue; // inside a lake / glass wall
      }
      // A face is lit by the air cell it looks into. Outside the world
      // (above the ceiling, past the edges) counts as full sky.
      let sky = 1;
      let blockLight = selfGlow;
      if (
        nx >= 0 &&
        nx < WORLD_SIZE.width &&
        ny >= 0 &&
        ny < WORLD_SIZE.height &&
        nz >= 0 &&
        nz < WORLD_SIZE.depth
      ) {
        const index = lightIndex(nx, ny, nz);
        sky = light.sky[index] / 15;
        blockLight = Math.max(blockLight, light.block[index] / 15);
      }
      emitFace(buffers[bucket], x, y, z, basis, atlas.rect(block.type, basis.face), sky, blockLight);
    }
  }

  const result = {} as Record<BucketId, THREE.BufferGeometry | null>;
  for (const bucket of Object.keys(buffers) as BucketId[]) {
    const data = buffers[bucket];
    if (data.indices.length === 0) {
      result[bucket] = null;
      continue;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
    geometry.setAttribute('skylight', new THREE.Float32BufferAttribute(data.skylight, 1));
    geometry.setAttribute('blocklight', new THREE.Float32BufferAttribute(data.blocklight, 1));
    geometry.setIndex(data.indices);
    result[bucket] = geometry;
  }
  return result;
}

/**
 * Teaches a material about the baked voxel light attributes. The
 * shared dayLight uniform dims sky light at night while block light
 * (torches, campfires) keeps glowing warm.
 */
export function patchVoxelLighting(
  material: THREE.Material,
  dayLight: { value: number },
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.dayLight = dayLight;
    shader.vertexShader =
      'attribute float skylight;\nattribute float blocklight;\nvarying float vSky;\nvarying float vBlock;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvSky = skylight;\nvBlock = blocklight;',
      );
    shader.fragmentShader =
      'uniform float dayLight;\nvarying float vSky;\nvarying float vBlock;\n' +
      shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        [
          'float voxelLight = max(vBlock, vSky * dayLight);',
          // Never pitch black (scary), and warm-tint torch-lit areas.
          'float lightAmount = 0.07 + 0.93 * voxelLight;',
          'float warmth = clamp(vBlock - vSky * dayLight, 0.0, 1.0);',
          'vec3 lightTint = mix(vec3(1.0), vec3(1.08, 0.95, 0.78), warmth);',
          'gl_FragColor.rgb *= lightAmount * lightTint;',
          '#include <dithering_fragment>',
        ].join('\n'),
      );
  };
}
