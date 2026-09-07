import { blocks } from '../blocks/blocks';
import { ChunkMesher, type ChunkMeshes, type MeshData } from './ChunkMesher';
import { RegionWorld, type MeshRegion } from './meshRegion';
import type { SmoothMeshData } from './SmoothMesher';
import { TextureAtlas } from './TextureAtlas';

/**
 * Chunk meshing off the main thread. One message in (a packed region and
 * the smooth flag), one out (typed-array buffers, transferred). The atlas
 * here only knows UV rectangles; no canvas is needed for that.
 */
export type MeshRequest = { id: number; region: MeshRegion; smooth: boolean };
export type MeshResponse = { id: number; cx: number; cz: number; meshes: ChunkMeshes };

const atlas = new TextureAtlas();

self.onmessage = (event: MessageEvent<MeshRequest>) => {
  const { id, region, smooth } = event.data;
  const view = new RegionWorld(region);
  const mesher = new ChunkMesher(view, blocks, atlas);
  mesher.smooth = smooth;
  const meshes = mesher.build(view.chunk());
  const response: MeshResponse = { id, cx: region.cx, cz: region.cz, meshes };
  (self as unknown as Worker).postMessage(response, transferables(meshes));
};

function transferables(meshes: ChunkMeshes): ArrayBuffer[] {
  const out: ArrayBuffer[] = [];
  const push = (data: MeshData | SmoothMeshData | null | undefined): void => {
    if (!data) return;
    for (const value of Object.values(data)) if (ArrayBuffer.isView(value)) out.push(value.buffer as ArrayBuffer);
  };
  push(meshes.opaque);
  push(meshes.water);
  push(meshes.alpha);
  push(meshes.plants);
  push(meshes.glow);
  for (const data of Object.values(meshes.smooth ?? {})) push(data);
  return out;
}
