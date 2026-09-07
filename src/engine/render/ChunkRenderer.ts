import * as THREE from 'three';
import type { RenderBucket } from '../blocks/BlockDefinition';
import type { Chunk } from '../world/Chunk';
import { chunkKey } from '../world/coords';
import type { ChunkMeshes, MeshData } from './ChunkMesher';
import { createBucketMaterials } from './voxelMaterial';

const BUCKETS: RenderBucket[] = ['opaque', 'water', 'alpha', 'glow'];

/** Owns the Three.js meshes for every loaded chunk. */
export class ChunkRenderer {
  readonly group = new THREE.Group();
  readonly materials: Record<RenderBucket, THREE.Material>;
  private meshes = new Map<string, Partial<Record<RenderBucket, THREE.Mesh>>>();

  constructor(atlas: THREE.Texture | null, dayLight: { value: number }, private shadows: boolean) {
    this.materials = createBucketMaterials(atlas, dayLight);
    this.group.name = 'chunks';
  }

  setMeshes(chunk: Chunk, data: ChunkMeshes): void {
    const key = chunkKey(chunk.cx, chunk.cz);
    let entry = this.meshes.get(key);
    if (!entry) {
      entry = {};
      this.meshes.set(key, entry);
    }
    for (const bucket of BUCKETS) {
      const existing = entry[bucket];
      const next = data[bucket];
      if (!next) {
        if (existing) {
          this.group.remove(existing);
          existing.geometry.dispose();
          delete entry[bucket];
        }
        continue;
      }
      const geometry = toGeometry(next);
      if (existing) {
        existing.geometry.dispose();
        existing.geometry = geometry;
      } else {
        const mesh = new THREE.Mesh(geometry, this.materials[bucket]);
        mesh.castShadow = this.shadows && (bucket === 'opaque' || bucket === 'glow');
        mesh.receiveShadow = this.shadows;
        mesh.frustumCulled = true;
        mesh.name = `${key}:${bucket}`;
        this.group.add(mesh);
        entry[bucket] = mesh;
      }
    }
  }

  removeChunk(key: string): void {
    const entry = this.meshes.get(key);
    if (!entry) return;
    for (const mesh of Object.values(entry)) {
      if (!mesh) continue;
      this.group.remove(mesh);
      mesh.geometry.dispose();
    }
    this.meshes.delete(key);
  }

  get meshCount(): number {
    let n = 0;
    for (const entry of this.meshes.values()) n += Object.keys(entry).length;
    return n;
  }

  dispose(): void {
    for (const key of [...this.meshes.keys()]) this.removeChunk(key);
    for (const material of Object.values(this.materials)) material.dispose();
  }
}

function toGeometry(data: MeshData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
  geometry.setAttribute('skylight', new THREE.BufferAttribute(data.skylight, 1));
  geometry.setAttribute('blocklight', new THREE.BufferAttribute(data.blocklight, 1));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
