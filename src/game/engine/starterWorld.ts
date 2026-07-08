import type { MagicDeliveryBox, PlacedBlock } from '../../types/game';
import { WORLD_SIZE, makeBlock, newBlockId } from './world';

export type StarterWorldData = {
  blocks: PlacedBlock[];
  boxes: MagicDeliveryBox[];
};

/**
 * The friendly scene a new player sees: a grass floor, a few colorful
 * blocks to poke at, and one Magic Delivery Box near the middle.
 */
export function createStarterWorld(): StarterWorldData {
  const blocks: PlacedBlock[] = [];

  // Grass floor across the whole ground level.
  for (let x = 0; x < WORLD_SIZE.width; x++) {
    for (let z = 0; z < WORLD_SIZE.depth; z++) {
      blocks.push(makeBlock('grass', { x, y: 0, z }));
    }
  }

  // A little rainbow arch to show off the fun blocks.
  blocks.push(makeBlock('rainbow', { x: 12, y: 1, z: 12 }));
  blocks.push(makeBlock('rainbow', { x: 12, y: 2, z: 12 }));
  blocks.push(makeBlock('rainbow', { x: 13, y: 3, z: 12 }));
  blocks.push(makeBlock('rainbow', { x: 14, y: 3, z: 12 }));
  blocks.push(makeBlock('rainbow', { x: 15, y: 2, z: 12 }));
  blocks.push(makeBlock('rainbow', { x: 15, y: 1, z: 12 }));

  // A tiny tree. Kept away from the x=z diagonal so it never blocks the
  // camera's opening view of the Magic Delivery Box.
  blocks.push(makeBlock('wood', { x: 24, y: 1, z: 8 }));
  blocks.push(makeBlock('wood', { x: 24, y: 2, z: 8 }));
  blocks.push(makeBlock('leaves', { x: 24, y: 3, z: 8 }));
  blocks.push(makeBlock('leaves', { x: 23, y: 3, z: 8 }));
  blocks.push(makeBlock('leaves', { x: 25, y: 3, z: 8 }));
  blocks.push(makeBlock('leaves', { x: 24, y: 3, z: 7 }));
  blocks.push(makeBlock('leaves', { x: 24, y: 3, z: 9 }));
  blocks.push(makeBlock('leaves', { x: 24, y: 4, z: 8 }));

  // A star and a light to spark curiosity.
  blocks.push(makeBlock('star', { x: 10, y: 1, z: 20 }));
  blocks.push(makeBlock('light', { x: 22, y: 1, z: 10 }));

  // The Magic Delivery Box, placed as a block AND registered as storage.
  const boxPosition = { x: 16, y: 1, z: 16 };
  blocks.push(makeBlock('magic-box', boxPosition));

  const boxes: MagicDeliveryBox[] = [
    {
      id: newBlockId(),
      name: 'Magic Delivery Box',
      position: boxPosition,
      items: [
        { blockType: 'star', quantity: 3 },
        { blockType: 'rainbow', quantity: 2 },
      ],
    },
  ];

  return { blocks, boxes };
}
