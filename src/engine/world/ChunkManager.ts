import type { System } from '../core/System';
import type { LightEngine } from '../lighting/LightEngine';
import type { ChunkMesher, ChunkMeshes } from '../render/ChunkMesher';
import { Chunk } from './Chunk';
import { CHUNK_SIZE, chunkKey, parseChunkKey, toChunkCoord } from './coords';
import type { GeneratorConfig, WorldGenerator } from './generation/Generator';
import type { GenerateRequest } from './generation/generation.worker';
import { fromWorkerResponse, type GenerateResponse } from './generation/workerChunk';
import { packRegion } from '../render/meshRegion';
import type { MeshRequest, MeshResponse } from '../render/mesh.worker';
import type { VoxelWorld } from './VoxelWorld';

/** Persisted chunk contents, or null when the chunk was never edited. */
export type StoredChunkData = {
  blocks: Uint16Array;
  states: Uint8Array;
  entities: Array<{ index: number; kind: string; data: Record<string, unknown> }>;
};

export type ChunkStorage = {
  load(cx: number, cz: number): Promise<StoredChunkData | null>;
  save(chunk: Chunk): Promise<void>;
};

export type ChunkManagerOptions = {
  /** Chunks kept loaded around the focus, in chunk units. */
  viewRadius: number;
  /** Generate this many chunks per frame at most. */
  generateBudget: number;
  /** Mesh this many chunks per frame at most. */
  meshBudget: number;
  useWorker: boolean;
  /** Mesh in background workers (default: when workers exist). */
  meshWorkers: number;
};

const DEFAULTS: ChunkManagerOptions = { viewRadius: 6, generateBudget: 2, meshBudget: 3, useWorker: true, meshWorkers: 2 };

/**
 * Streams the world around a focus point: loads saved chunks or generates
 * new ones (in a worker when possible), lights them, meshes dirty ones
 * nearest-first, and unloads far chunks after saving edits.
 */
export class ChunkManager implements System {
  readonly name = 'chunks';
  readonly options: ChunkManagerOptions;
  private focus = { cx: 0, cz: 0 };
  private pending = new Map<string, Promise<void>>();
  private worker: Worker | null = null;
  private workerJobs = new Map<number, (r: GenerateResponse) => void>();
  private nextJob = 1;
  private meshSink: ((chunk: Chunk, meshes: ChunkMeshes) => void) | null = null;
  private removeSink: ((key: string) => void) | null = null;
  private meshWorkers: Worker[] = [];
  private meshJobs = new Map<number, string>();
  private nextMeshJob = 1;
  private nextWorker = 0;
  /** Chunks meshed in a worker so far (debug). */
  meshedInWorker = 0;
  private applyTemplate: ((chunk: Chunk) => void) | null = null;
  /** Chunks fully loaded (generated + lit). Read by tests and the spawn logic. */
  readonly readyKeys = new Set<string>();

  constructor(
    private world: VoxelWorld,
    private generator: WorldGenerator,
    private lighting: LightEngine,
    private mesher: ChunkMesher,
    private storage: ChunkStorage | null,
    options: Partial<ChunkManagerOptions> = {},
  ) {
    this.options = { ...DEFAULTS, ...options };
    if (this.options.useWorker && this.options.meshWorkers > 0 && typeof Worker !== 'undefined') {
      for (let i = 0; i < this.options.meshWorkers; i++) {
        try {
          const worker = new Worker(new URL('../render/mesh.worker.ts', import.meta.url), { type: 'module' });
          worker.onmessage = (event: MessageEvent<MeshResponse>) => this.onMeshed(event.data);
          worker.onerror = () => {
            // Fall back to meshing on the main thread for the rest of the session.
            for (const w of this.meshWorkers) w.terminate();
            this.meshWorkers = [];
            for (const key of this.meshJobs.values()) {
              const { cx, cz } = parseChunkKey(key);
              this.world.getChunk(cx, cz)?.setDirty();
            }
            this.meshJobs.clear();
          };
          this.meshWorkers.push(worker);
        } catch {
          break;
        }
      }
    }
    if (this.options.useWorker && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./generation/generation.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (event: MessageEvent<GenerateResponse>) => {
          const done = this.workerJobs.get(event.data.id);
          if (done) {
            this.workerJobs.delete(event.data.id);
            done(event.data);
          }
        };
        this.worker.onerror = () => {
          // Fall back to inline generation for the rest of the session.
          this.worker?.terminate();
          this.worker = null;
        };
      } catch {
        this.worker = null;
      }
    }
  }

  onMeshes(sink: (chunk: Chunk, meshes: ChunkMeshes) => void): void {
    this.meshSink = sink;
  }

  onChunkRemoved(sink: (key: string) => void): void {
    this.removeSink = sink;
  }

  /** One-time writes on first generation (spawn landmarks, Toy Land). */
  onFirstGenerate(apply: (chunk: Chunk) => void): void {
    this.applyTemplate = apply;
  }

  setFocus(x: number, z: number): void {
    this.focus = { cx: toChunkCoord(Math.round(x)), cz: toChunkCoord(Math.round(z)) };
  }

  private view = { x: 0, z: -1 };

  /** Where the camera looks: chunks in front load and mesh before chunks behind. */
  setViewDirection(x: number, z: number): void {
    const len = Math.hypot(x, z) || 1;
    this.view = { x: x / len, z: z / len };
  }

  /** Chebyshev distance plus a penalty for being behind the camera. */
  private priority(cx: number, cz: number): number {
    const dx = cx - this.focus.cx;
    const dz = cz - this.focus.cz;
    const d = Math.max(Math.abs(dx), Math.abs(dz));
    if (d === 0) return 0;
    const dot = (dx * this.view.x + dz * this.view.z) / (Math.hypot(dx, dz) || 1);
    return d + (1 - dot) * 1.5; // straight ahead: +0, straight behind: +3
  }

  get config(): GeneratorConfig {
    return this.generator.config;
  }

  isReady(x: number, z: number): boolean {
    return this.readyKeys.has(chunkKey(toChunkCoord(x), toChunkCoord(z)));
  }

  /** Loads everything within the radius and waits. For tests and world start. */
  async preload(x: number, z: number, radius = 1): Promise<void> {
    this.setFocus(x, z);
    const jobs: Promise<void>[] = [];
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        jobs.push(this.ensure(this.focus.cx + dx, this.focus.cz + dz));
      }
    }
    await Promise.all(jobs);
    this.meshDirty(Infinity, true);
  }

  update(): void {
    const { viewRadius, generateBudget, meshBudget } = this.options;
    // Load nearest missing chunks first.
    let started = 0;
    const missing: Array<{ cx: number; cz: number; p: number }> = [];
    for (const { cx, cz } of this.spiral(viewRadius)) {
      const key = chunkKey(cx, cz);
      if (this.world.hasChunk(cx, cz) || this.pending.has(key)) continue;
      missing.push({ cx, cz, p: this.priority(cx, cz) });
    }
    missing.sort((a, b) => a.p - b.p);
    for (const { cx, cz } of missing) {
      if (started >= generateBudget) break;
      void this.ensure(cx, cz);
      started++;
    }
    // Unload chunks well outside the radius.
    for (const chunk of this.world.allChunks()) {
      const d = Math.max(Math.abs(chunk.cx - this.focus.cx), Math.abs(chunk.cz - this.focus.cz));
      if (d > viewRadius + 2) this.unload(chunk);
    }
    this.meshDirty(meshBudget);
  }

  private *spiral(radius: number): Generator<{ cx: number; cz: number }> {
    const { cx, cz } = this.focus;
    yield { cx, cz };
    for (let r = 1; r <= radius; r++) {
      for (let i = -r; i <= r; i++) {
        yield { cx: cx + i, cz: cz - r };
        yield { cx: cx + i, cz: cz + r };
      }
      for (let i = -r + 1; i <= r - 1; i++) {
        yield { cx: cx - r, cz: cz + i };
        yield { cx: cx + r, cz: cz + i };
      }
    }
  }

  private ensure(cx: number, cz: number): Promise<void> {
    const key = chunkKey(cx, cz);
    const existing = this.pending.get(key);
    if (existing) return existing;
    if (this.world.hasChunk(cx, cz)) return Promise.resolve();
    const job = this.load(cx, cz).finally(() => this.pending.delete(key));
    this.pending.set(key, job);
    return job;
  }

  private async load(cx: number, cz: number): Promise<void> {
    let chunk: Chunk;
    const stored = this.storage ? await this.storage.load(cx, cz).catch(() => null) : null;
    if (stored) {
      chunk = new Chunk(cx, cz, { blocks: stored.blocks, states: stored.states });
      for (const e of stored.entities) chunk.entities.set(e.index, { kind: e.kind, data: e.data });
      chunk.generated = true;
      chunk.modified = true; // it is already in storage; keep it that way on unload
    } else {
      chunk = await this.generate(cx, cz);
      this.applyTemplate?.(chunk);
    }
    if (this.world.hasChunk(cx, cz)) return; // raced with another load
    this.world.addChunk(chunk);
    const touched = this.lighting.initChunk(chunk);
    for (const k of touched) {
      const { cx: tx, cz: tz } = parseChunkKey(k);
      this.world.getChunk(tx, tz)?.setDirty();
    }
    // Neighbors need a remesh so their border faces cull against us.
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      this.world.getChunk(cx + dx, cz + dz)?.setDirty();
    }
    this.readyKeys.add(chunkKey(cx, cz));
  }

  private generate(cx: number, cz: number): Promise<Chunk> {
    if (!this.worker) {
      const chunk = new Chunk(cx, cz);
      this.generator.generate(chunk);
      return Promise.resolve(chunk);
    }
    return new Promise<Chunk>((resolve) => {
      const id = this.nextJob++;
      this.workerJobs.set(id, (response) => {
        resolve(fromWorkerResponse(response));
      });
      const request: GenerateRequest = { id, config: this.generator.config, cx, cz };
      this.worker!.postMessage(request);
    });
  }

  private unload(chunk: Chunk): void {
    const key = chunkKey(chunk.cx, chunk.cz);
    if (chunk.modified && this.storage) void this.storage.save(chunk);
    this.world.removeChunk(chunk.cx, chunk.cz);
    this.readyKeys.delete(key);
    this.removeSink?.(key);
  }

  /** Persist every edited chunk now (autosave, before unload, on exit). */
  async saveAll(): Promise<void> {
    if (!this.storage) return;
    const jobs = this.world.allChunks().filter((c) => c.modified).map((c) => this.storage!.save(c));
    await Promise.all(jobs);
  }

  private meshDirty(budget: number, sync = false): void {
    if (!this.meshSink) return;
    const dirty = this.world
      .allChunks()
      .filter((c) => c.dirtyMesh && c.lit)
      .map((c) => ({
        chunk: c,
        d: this.priority(c.cx, c.cz),
      }))
      .sort((a, b) => a.d - b.d);
    const useWorkers = !sync && this.meshWorkers.length > 0;
    // Workers take a few jobs at a time; more only queues memory.
    const inFlightCap = this.meshWorkers.length * 3;
    let done = 0;
    for (const { chunk } of dirty) {
      if (done >= budget) break;
      const key = chunkKey(chunk.cx, chunk.cz);
      if (useWorkers) {
        if (this.meshJobs.size >= inFlightCap) break;
        chunk.dirtyMesh = false;
        const id = this.nextMeshJob++;
        this.meshJobs.set(id, key);
        const region = packRegion(this.world, chunk.cx, chunk.cz);
        const request: MeshRequest = { id, region, smooth: this.mesher.smooth };
        const worker = this.meshWorkers[this.nextWorker++ % this.meshWorkers.length];
        worker.postMessage(request, [region.blocks, region.states, region.sky, region.light, region.heights]);
      } else {
        chunk.dirtyMesh = false;
        this.meshSink(chunk, this.mesher.build(chunk));
      }
      done++;
    }
  }

  private onMeshed(response: MeshResponse): void {
    const key = this.meshJobs.get(response.id);
    this.meshJobs.delete(response.id);
    if (!key) return;
    const chunk = this.world.getChunk(response.cx, response.cz);
    if (!chunk) return; // unloaded meanwhile
    this.meshedInWorker += 1;
    this.meshSink?.(chunk, response.meshes);
  }

  get meshJobsInFlight(): number {
    return this.meshJobs.size;
  }

  /** World-space center of the loaded area, for effects that follow the player. */
  focusCenter(): { x: number; z: number } {
    return { x: this.focus.cx * CHUNK_SIZE + CHUNK_SIZE / 2, z: this.focus.cz * CHUNK_SIZE + CHUNK_SIZE / 2 };
  }

  dispose(): void {
    for (const w of this.meshWorkers) w.terminate();
    this.meshWorkers = [];
    this.worker?.terminate();
    this.worker = null;
  }
}
