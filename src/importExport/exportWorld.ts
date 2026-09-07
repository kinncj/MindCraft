import type { StoredChunk, StoredWorld } from '../storage/db';
import { EXPORT_SCHEMA_VERSION, type MindCraftWorldExportV2 } from './exportTypes';

export const APP_VERSION = '2.0.0';

export function buildWorldExport(
  world: StoredWorld,
  chunks: StoredChunk[],
  exportedAt: Date = new Date(),
): MindCraftWorldExportV2 {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: exportedAt.toISOString(),
    world: {
      id: world.id,
      name: world.name,
      seed: world.seed,
      generator: { ...world.generator },
      spawn: { ...world.spawn },
      ...(world.player ? { player: { ...world.player } } : {}),
    },
    palette: { ...world.palette },
    chunks: chunks.map((c) => ({ cx: c.cx, cz: c.cz, blocks: c.blocks, states: c.states, entities: c.entities })),
    settings: { ...world.settings },
    ...(world.template && world.template.length > 0 ? { template: world.template } : {}),
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
export function downloadWorldExport(data: MindCraftWorldExportV2): void {
  const json = JSON.stringify(data);
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
