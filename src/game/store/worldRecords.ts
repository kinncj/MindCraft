import { blocks as registry } from '../../engine/blocks/blocks';
import { InfiniteGenerator } from '../../engine/world/generation/InfiniteGenerator';
import { starterPlazaTemplate, toyLandTemplate, type TemplateBlock } from '../../engine/world/generation/structures';
import { LEGACY_SURFACE_Y } from '../../storage/worldStore';
import { JOBS, VILLAGER_NAMES } from '../../engine/entities/villagers';
import type { StoredWorld } from '../../storage/db';
import { DEFAULT_SETTINGS } from '../../storage/settingsRepository';
import type { WorldPreset } from './types';

function toStoredTemplate(template: TemplateBlock[]): NonNullable<StoredWorld['template']> {
  return template.map((b) => ({
    x: b.x,
    y: b.y,
    z: b.z,
    id: registry.get(b.id)?.id ?? 'grass',
    state: b.state,
    entity: b.entity,
  }));
}

export function newWorldId(): string {
  return `world-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** A brand-new world record for a preset, ready to save and open. */
export function createWorldRecord(name: string, preset: WorldPreset): StoredWorld {
  const now = new Date().toISOString();
  const base = {
    id: newWorldId(),
    name,
    createdAt: now,
    updatedAt: now,
    settings: { ...DEFAULT_SETTINGS },
    palette: registry.toPalette(),
  };
  if (preset === 'toyland') {
    const spawn = { x: 32, y: LEGACY_SURFACE_Y + 1, z: 32 };
    return {
      ...base,
      seed: 7,
      generator: { kind: 'flat', surfaceY: LEGACY_SURFACE_Y },
      spawn,
      template: toStoredTemplate(toyLandTemplate(spawn)),
    };
  }
  const seed = Math.floor(Math.random() * 2 ** 31);
  const spawn = new InfiniteGenerator(seed).spawn();
  // Two neighbors to meet on day one.
  const jobs = [JOBS[Math.floor(Math.random() * JOBS.length)], JOBS[Math.floor(Math.random() * JOBS.length)]];
  const names = [...VILLAGER_NAMES].sort(() => Math.random() - 0.5);
  const entities: NonNullable<StoredWorld['entities']> = jobs.map((job, i) => ({
    id: `v${i + 1}`,
    kind: 'villager',
    variant: job.id,
    name: names[i],
    x: spawn.x + (i === 0 ? -4 : 5),
    y: spawn.y,
    z: spawn.z + (i === 0 ? 5 : -6),
    brain: 'home',
    home: { x: spawn.x + (i === 0 ? -4 : 5), z: spawn.z + (i === 0 ? 5 : -6) },
    data: { job: job.id },
  }));
  return {
    ...base,
    seed,
    generator: { kind: 'infinite' },
    spawn,
    template: toStoredTemplate(starterPlazaTemplate(spawn)),
    entities,
  };
}
