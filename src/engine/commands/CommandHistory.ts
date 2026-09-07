import type { VoxelWorld } from '../world/VoxelWorld';
import type { Command } from './Command';

/** Undo/redo stack. Every world edit the player makes goes through here. */
export class CommandHistory {
  private past: Command[] = [];
  private future: Command[] = [];
  private listeners = new Set<() => void>();

  constructor(
    private world: VoxelWorld,
    private limit = 200,
  ) {}

  run(command: Command): void {
    command.execute(this.world);
    this.past.push(command);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    this.notify();
  }

  undo(): Command | null {
    const command = this.past.pop();
    if (!command) return null;
    command.undo(this.world);
    this.future.push(command);
    this.notify();
    return command;
  }

  redo(): Command | null {
    const command = this.future.pop();
    if (!command) return null;
    command.execute(this.world);
    this.past.push(command);
    this.notify();
    return command;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}
