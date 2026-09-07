import { blocks } from '../../src/engine/blocks/blocks';
import { CommandHistory } from '../../src/engine/commands/CommandHistory';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';
import { setEngine } from '../../src/game/engineRef';
import { useGameStore } from '../../src/game/gameStore';
import type { Engine } from '../../src/engine/core/Engine';

/** Puts the store back to a clean slate between tests. */
export function resetGameStore(): void {
  useGameStore.setState(useGameStore.getInitialState(), true);
  setEngine(null);
}

/**
 * A stand-in engine for component tests: a real world and history,
 * but no WebGL. Only the members the UI touches exist.
 */
export function installFakeEngine(): { world: VoxelWorld; history: CommandHistory } {
  const world = new VoxelWorld(blocks);
  for (let cx = -1; cx <= 4; cx++) for (let cz = -1; cz <= 4; cz++) world.addChunk(new Chunk(cx, cz));
  const history = new CommandHistory(world);
  const fake = {
    world,
    history,
    registry: blocks,
    environment: { time: 0.3, setTime: () => undefined },
    save: async () => undefined,
    setViewMode: () => undefined,
    setVisualMode: () => undefined,
    setTimeMode: () => undefined,
    setWeather: () => undefined,
    playerState: () => ({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }),
    pendingTemplate: () => [],
  } as unknown as Engine;
  setEngine(fake);
  return { world, history };
}
