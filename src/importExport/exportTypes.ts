/**
 * The versioned file format for MindCraft world backups.
 *
 * Rules:
 * - schemaVersion bumps whenever the shape changes in a way old readers
 *   cannot handle. Readers reject files with a newer schemaVersion.
 * - Everything is plain JSON data. Nothing in the file is ever executed,
 *   fetched, or treated as a URL.
 */
export const EXPORT_SCHEMA_VERSION = 1 as const;

export type MindCraftWorldExport = {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  appVersion: string;
  exportedAt: string;
  world: {
    id: string;
    name: string;
    size: {
      width: number;
      depth: number;
      height: number;
    };
    blocks: Array<{
      id: string;
      type: string;
      position: {
        x: number;
        y: number;
        z: number;
      };
    }>;
  };
  inventory: {
    selectedBlockType: string;
  };
  magicDeliveryBoxes: Array<{
    id: string;
    name: string;
    position: {
      x: number;
      y: number;
      z: number;
    };
    items: Array<{
      blockType: string;
      quantity: number;
    }>;
  }>;
  player?: {
    position?: { x: number; y: number; z: number };
    camera?: { yaw?: number; pitch?: number; zoom?: number };
  };
  settings?: {
    soundEnabled?: boolean;
    reducedMotion?: boolean;
  };
};
