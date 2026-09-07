import type { BlockRegistry } from '../blocks/registry';
import { DIRECTIONS, WORLD_HEIGHT, type Direction, DIR_NX, DIR_NZ, DIR_PX, DIR_PZ } from '../world/coords';
import type { VoxelWorld } from '../world/VoxelWorld';

/**
 * Robot programs: a list of picture cards. `repeat` nests one level so a
 * kid can say "forward, place, ×4". The robot flies (no gravity) and
 * moves one block per step so it is easy to follow with the eyes.
 */
export type RobotCard =
  | { op: 'forward' | 'back' | 'left' | 'right' | 'up' | 'down' | 'place' | 'remove' | 'wait' | 'turn_left' | 'turn_right' }
  | { op: 'repeat'; times: number; body: RobotCard[] };

export type RobotProgram = RobotCard[];

export const CARD_LABELS: Record<string, { emoji: string; label: string }> = {
  forward: { emoji: '⬆️', label: 'Forward' },
  back: { emoji: '⬇️', label: 'Back' },
  left: { emoji: '⬅️', label: 'Left' },
  right: { emoji: '➡️', label: 'Right' },
  turn_left: { emoji: '↪️', label: 'Turn left' },
  turn_right: { emoji: '↩️', label: 'Turn right' },
  up: { emoji: '🆙', label: 'Up' },
  down: { emoji: '⏬', label: 'Down' },
  place: { emoji: '🧱', label: 'Place' },
  remove: { emoji: '🧽', label: 'Remove' },
  wait: { emoji: '⏳', label: 'Wait' },
  repeat: { emoji: '🔁', label: 'Repeat' },
};

const STEP_SECONDS = 0.45;
const MAX_STEPS = 2000;

const HEADINGS: Direction[] = [DIR_NZ, DIR_PX, DIR_PZ, DIR_NX];

/** Flattens a program into steps, expanding repeats (bounded). */
export function flatten(program: RobotProgram): Array<Exclude<RobotCard, { op: 'repeat' }>> {
  const out: Array<Exclude<RobotCard, { op: 'repeat' }>> = [];
  const walk = (cards: RobotCard[]): void => {
    for (const card of cards) {
      if (out.length >= MAX_STEPS) return;
      if (card.op === 'repeat') {
        for (let i = 0; i < Math.min(50, Math.max(0, card.times)); i++) walk(card.body);
      } else out.push(card);
    }
  };
  walk(program);
  return out;
}

export function validateProgram(raw: unknown): RobotProgram | null {
  if (!Array.isArray(raw)) return null;
  const out: RobotProgram = [];
  for (const card of raw) {
    if (!card || typeof card !== 'object') return null;
    const op = (card as { op?: unknown }).op;
    if (op === 'repeat') {
      const times = (card as { times?: unknown }).times;
      const body = validateProgram((card as { body?: unknown }).body);
      if (!Number.isInteger(times) || !body) return null;
      out.push({ op: 'repeat', times: Math.max(0, Math.min(50, times as number)), body });
    } else if (typeof op === 'string' && op in CARD_LABELS && op !== 'repeat') {
      out.push({ op } as RobotCard);
    } else return null;
  }
  return out;
}

export class RobotRunner {
  program: RobotProgram = [];
  /** Block the robot places, by numeric id. */
  blockId = 0;
  heading = 0; // index into HEADINGS
  private steps: ReturnType<typeof flatten> = [];
  private index = 0;
  private timer = 0;
  running = false;
  /** Called with a short description whenever a step happens. */
  onStep: ((op: string, ok: boolean) => void) | null = null;

  constructor(
    private world: VoxelWorld,
    private registry: BlockRegistry,
    public x: number,
    public y: number,
    public z: number,
  ) {}

  setProgram(program: RobotProgram): void {
    this.program = program;
    this.stop();
  }

  run(): void {
    this.steps = flatten(this.program);
    this.index = 0;
    this.timer = 0;
    this.running = this.steps.length > 0;
  }

  stop(): void {
    this.running = false;
    this.index = 0;
  }

  get progress(): { index: number; total: number } {
    return { index: this.index, total: this.steps.length };
  }

  private free(x: number, y: number, z: number): boolean {
    if (y < 0 || y >= WORLD_HEIGHT || !this.world.isLoaded(x, z)) return false;
    const id = this.world.getBlock(x, y, z);
    if (id === 0) return true;
    return this.registry.get(id)?.collision !== 'solid';
  }

  private facing(): { x: number; y: number; z: number } {
    return DIRECTIONS[HEADINGS[this.heading]];
  }

  /** Runs one card now. Returns whether it succeeded. */
  step(card: Exclude<RobotCard, { op: 'repeat' }>): boolean {
    const f = this.facing();
    const move = (dx: number, dy: number, dz: number): boolean => {
      const nx = this.x + dx;
      const ny = this.y + dy;
      const nz = this.z + dz;
      if (!this.free(nx, ny, nz)) return false;
      this.x = nx;
      this.y = ny;
      this.z = nz;
      return true;
    };
    switch (card.op) {
      case 'forward':
        return move(f.x, 0, f.z);
      case 'back':
        return move(-f.x, 0, -f.z);
      case 'left': {
        const l = DIRECTIONS[HEADINGS[(this.heading + 3) % 4]];
        return move(l.x, 0, l.z);
      }
      case 'right': {
        const r = DIRECTIONS[HEADINGS[(this.heading + 1) % 4]];
        return move(r.x, 0, r.z);
      }
      case 'up':
        return move(0, 1, 0);
      case 'down':
        return move(0, -1, 0);
      case 'turn_left':
        this.heading = (this.heading + 3) % 4;
        return true;
      case 'turn_right':
        this.heading = (this.heading + 1) % 4;
        return true;
      case 'place': {
        // Place under the robot's front cell (where it would walk next) at its own height - 1, so it builds floors and walls it walks on.
        const tx = this.x + f.x;
        const ty = this.y;
        const tz = this.z + f.z;
        if (this.blockId === 0 || !this.world.isLoaded(tx, tz)) return false;
        if (this.world.getBlock(tx, ty, tz) !== 0) return false;
        return this.world.setBlock(tx, ty, tz, this.blockId, 0) !== null;
      }
      case 'remove': {
        const tx = this.x + f.x;
        const tz = this.z + f.z;
        if (this.world.getBlock(tx, this.y, tz) === 0) return false;
        return this.world.setBlock(tx, this.y, tz, 0, 0) !== null;
      }
      case 'wait':
        return true;
    }
  }

  update(dt: number): void {
    if (!this.running) return;
    this.timer += dt;
    while (this.timer >= STEP_SECONDS && this.running) {
      this.timer -= STEP_SECONDS;
      const card = this.steps[this.index++];
      const ok = this.step(card);
      this.onStep?.(card.op, ok);
      if (this.index >= this.steps.length) this.running = false;
    }
  }

  /** Yaw for the body, from the heading. */
  get yaw(): number {
    return [0, -Math.PI / 2, Math.PI, Math.PI / 2][this.heading];
  }
}
