import { blocks } from '../engine/blocks/blocks';
import { tileDataUrl } from '../engine/blocks/textures/painters';

/** A data URL icon for a block id (its side texture), or null without canvas. */
export function blockIconDataUrl(id: string): string | null {
  const def = blocks.byId(id);
  if (!def) return null;
  return tileDataUrl(def.textures.side) ?? tileDataUrl(def.textures.top);
}
