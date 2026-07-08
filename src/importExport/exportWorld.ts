import type { MagicDeliveryBox, PlacedBlock, WorldSize } from '../types/game';
import { EXPORT_SCHEMA_VERSION, type MindCraftWorldExport } from './exportTypes';

export const APP_VERSION = '1.0.0';

export type ExportInput = {
  worldId: string;
  worldName: string;
  size: WorldSize;
  blocks: PlacedBlock[];
  boxes: MagicDeliveryBox[];
  selectedBlockType: string;
  exportedAt?: Date;
};

export function buildWorldExport(input: ExportInput): MindCraftWorldExport {
  const exportedAt = (input.exportedAt ?? new Date()).toISOString();
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt,
    world: {
      id: input.worldId,
      name: input.worldName,
      size: { ...input.size },
      blocks: input.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        position: { ...b.position },
      })),
    },
    inventory: {
      selectedBlockType: input.selectedBlockType,
    },
    magicDeliveryBoxes: input.boxes.map((box) => ({
      id: box.id,
      name: box.name,
      position: { ...box.position },
      items: box.items.map((item) => ({ ...item })),
    })),
  };
}

export function exportFileName(worldName: string, date: Date = new Date()): string {
  const slug = worldName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const stamp = date.toISOString().slice(0, 10);
  return slug ? `mindcraft-world-${slug}-${stamp}.json` : `mindcraft-world-${stamp}.json`;
}

/** Turns the export into a downloadable file in the browser. */
export function downloadWorldExport(data: MindCraftWorldExport): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(data.world.name);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
