/**
 * The versioned file format for MindCraft world backups.
 *
 * Version 2 (current): an infinite world is its seed plus the chunks that
 * were edited. Everything is plain JSON data; nothing is ever executed.
 * Version 1 files (the old 64×64 world) still import.
 */
export const EXPORT_SCHEMA_VERSION = 2 as const;

export type ExportedChunk = {
  cx: number;
  cz: number;
  /** Run-length encoded: [value, count, ...]. */
  blocks: number[];
  states: number[];
  entities: Array<{ index: number; kind: string; data: Record<string, unknown> }>;
};

export type MindCraftWorldExportV2 = {
  schemaVersion: 2;
  appVersion: string;
  exportedAt: string;
  world: {
    id: string;
    name: string;
    seed: number;
    generator: { kind: 'infinite' | 'flat'; surfaceY?: number; preset?: 'toyland' | 'town' };
    spawn: { x: number; y: number; z: number };
    player?: { x: number; y: number; z: number; yaw?: number; pitch?: number };
  };
  /** numeric id → block id, for the chunk data below. */
  palette: Record<number, string>;
  chunks: ExportedChunk[];
  settings: {
    selectedBlockType: string;
    hotbar: string[];
    visualMode: string;
    timeMode: string;
    weather: string;
    timeOfDay?: number;
  };
  /** Template blocks not yet written (world never explored that far). */
  template?: Array<{ x: number; y: number; z: number; id: string; state?: number; entity?: { kind: string; data: Record<string, unknown> } }>;
};

/** The v1 shape, kept for import. */
export type MindCraftWorldExportV1 = {
  schemaVersion: 1;
  appVersion: string;
  exportedAt: string;
  world: {
    id: string;
    name: string;
    size: { width: number; depth: number; height: number };
    blocks: Array<{ id: string; type: string; position: { x: number; y: number; z: number } }>;
  };
  inventory: { selectedBlockType: string };
  visualMode?: { selectedMode: string };
  magicDeliveryBoxes: Array<{
    id: string;
    name: string;
    position: { x: number; y: number; z: number };
    items: Array<{ blockType: string; quantity: number }>;
  }>;
  settings?: { timeMode?: string; weather?: string };
};

export type MindCraftWorldExport = MindCraftWorldExportV2;
