import * as THREE from 'three';
import type { BlockRegistry } from '../blocks/registry';
import type { System } from '../core/System';
import type { PlayerController } from '../physics/PlayerController';
import type { Ray } from '../physics/raycast';
import type { VoxelWorld } from '../world/VoxelWorld';
import { FollowBrain, WanderBrain, createBrain, type Brain, type BrainSense } from './Brain';
import { NeuralBrain } from '../ai/NeuralBrain';
import { buildBunny, buildButterfly, buildCat, buildChick, buildDog, buildLift, buildRobot, buildVillager, disposeGroup } from './bodies';
import { genderOfName, randomIdentity, type Gender } from './villagers';
import { RobotRunner, validateProgram, type RobotProgram } from './robot';
import { SetBlocksCommand, type BlockEdit } from '../commands/Command';
import { StayBrain } from './Brain';
import type { Entity, EntityKind, StoredEntity } from './Entity';
import { VEHICLE_COLORS, VEHICLE_KINDS, Vehicle, type DriveInput, type VehicleKind } from './vehicles';
import { PET_NAMES, jobById, randomJob, randomName, type TalkChoice } from './villagers';

let nextId = 1;

/**
 * Everything alive or drivable: animals, pets, villagers, vehicles.
 * Bodies in the scene, brains deciding where to go, ground-following
 * movement. Pets, villagers, and vehicles persist with the world.
 */
export class EntitySystem implements System {
  readonly name = 'entities';
  readonly entities: Entity[] = [];
  /** The vehicle the player is riding, if any. */
  mounted: Entity | null = null;
  driveInput: DriveInput | null = null;
  /** Up or down one floor, pressed this frame, while standing on a lift. */
  liftInput: { up: boolean; down: boolean } = { up: false, down: false };
  /** The lift the player is standing on right now. */
  ridingLift: Entity | null = null;
  private raycaster = new THREE.Raycaster();
  private spawnedAround: string | null = null;
  private elapsed = 0;
  /** Supplied by the engine so brains know about day and night. */
  timeOfDay: () => number = () => 0.3;
  /** A villager placed a block by hand (particles, sound). */
  onWorkBlock: ((x: number, y: number, z: number, id: number) => void) | null = null;
  /** A villager finished a job: the command to record for undo. */
  onWorkDone: ((entity: Entity, command: SetBlocksCommand) => void) | null = null;

  constructor(
    private scene: THREE.Scene,
    private world: VoxelWorld,
    private registry: BlockRegistry,
    private player: PlayerController,
  ) {}

  private standable(x: number, z: number): boolean {
    const top = this.world.height(x, z);
    if (top < 0) return false;
    const def = this.registry.get(this.world.getBlock(x, top, z));
    if (!def) return false;
    return def.collision === 'solid' && def.shape === 'cube' && def.id !== 'water';
  }

  private groundY(x: number, z: number): number {
    const top = this.world.height(Math.round(x), Math.round(z));
    return top >= 0 ? top + 0.5 : this.player.y;
  }

  /** Is the top block here water? Creatures swim in it instead of walking on it. */
  private waterAt(x: number, z: number): boolean {
    const top = this.world.height(Math.round(x), Math.round(z));
    if (top < 0) return false;
    return this.registry.get(this.world.getBlock(Math.round(x), top, Math.round(z)))?.collision === 'fluid';
  }

  private add(entity: Entity): Entity {
    this.scene.add(entity.group);
    this.entities.push(entity);
    return entity;
  }

  private base(kind: EntityKind, group: THREE.Group, x: number, z: number, brain: Brain, speed: number): Entity {
    return {
      id: `e${nextId++}`,
      kind,
      group,
      x,
      y: this.groundY(x, z),
      z,
      targetX: x,
      targetZ: z,
      speed,
      flies: false,
      restTimer: Math.random() * 2,
      happyTimer: 0,
      phase: Math.random() * Math.PI * 2,
      mood: 'curious',
      brain,
      persistent: false,
    };
  }

  spawn(kind: EntityKind, x: number, z: number, brain?: Brain, name?: string): Entity {
    brain ??= kind === 'bunny' || kind === 'chick' || kind === 'butterfly' ? new NeuralBrain(kind) : new WanderBrain();
    let group: THREE.Group;
    let wings: [THREE.Mesh, THREE.Mesh] | undefined;
    if (kind === 'butterfly') {
      const built = buildButterfly();
      group = built.group;
      wings = built.wings;
    } else if (kind === 'chick') {
      group = buildChick();
    } else {
      group = buildBunny();
    }
    const entity = this.base(kind, group, x, z, brain, kind === 'butterfly' ? 1.6 : kind === 'chick' ? 1.0 : 1.2);
    entity.name = name;
    entity.flies = kind === 'butterfly';
    entity.wings = wings;
    return this.add(entity);
  }

  spawnPet(variant: 'dog' | 'cat', x: number, z: number, name = randomName(PET_NAMES), brainName = 'neural'): Entity {
    const group = variant === 'dog' ? buildDog() : buildCat();
    const entity = this.base('pet', group, x, z, createBrain(brainName, undefined, variant), variant === 'dog' ? 3.2 : 2.8);
    entity.name = name;
    entity.variant = variant;
    entity.persistent = true;
    entity.data = { brain: brainName };
    return this.add(entity);
  }

  spawnVillager(jobId: string | 'random', x: number, z: number, name?: string, home?: { x: number; z: number }, gender?: Gender): Entity {
    const job = jobId === 'random' ? randomJob() : (jobById(jobId) ?? randomJob());
    // The name always matches the villager: a given name decides, otherwise both are drawn together.
    const identity = name ? { gender: genderOfName(name, gender), name } : randomIdentity(gender);
    const entity = this.base('villager', buildVillager({ ...job.look, long: identity.gender === 'girl' }), x, z, new NeuralBrain('villager', home ?? { x, z }), 1.3);
    entity.name = identity.name;
    entity.variant = job.id;
    entity.home = home ?? { x, z };
    entity.persistent = true;
    entity.gender = identity.gender;
    entity.data = { job: job.id, gender: identity.gender };
    return this.add(entity);
  }

  /** A villager being chatted with stands still and faces the child until the chat ends. */
  setTalking(villagerId: string, on: boolean): void {
    const entity = this.byId(villagerId);
    if (!entity || entity.kind !== 'villager') return;
    entity.talking = on;
    if (on) {
      entity.targetX = entity.x;
      entity.targetZ = entity.z;
    }
  }

  spawnVehicle(kind: VehicleKind, x: number, y: number, z: number, color?: string): Entity {
    const vehicle = new Vehicle(kind, this.world, this.registry, { x, y, z }, color ?? VEHICLE_COLORS[kind]);
    const entity = this.base('vehicle', vehicle.group, x, z, new WanderBrain(0), 0);
    entity.y = y;
    entity.variant = kind;
    entity.vehicle = vehicle;
    entity.persistent = true;
    entity.data = { color: vehicle.color };
    return this.add(entity);
  }

  /** An elevator platform that stops at the given heights (its top surface). */
  spawnLift(x: number, y: number, z: number, stops: number[]): Entity {
    const sorted = [...new Set(stops)].sort((a, b) => a - b);
    const entity = this.base('lift', buildLift(), x, z, new WanderBrain(0), 0);
    entity.y = sorted[0] ?? y;
    entity.variant = 'lift';
    entity.persistent = true;
    entity.lift = { stops: sorted, target: 0 };
    entity.data = { stops: sorted };
    entity.group.position.set(x, entity.y - 0.25, z);
    return this.add(entity);
  }

  private updateLift(entity: Entity, dt: number): void {
    const lift = entity.lift!;
    const p = this.player;
    const top = entity.y;
    const onIt = Math.abs(p.x - entity.x) <= 1.05 && Math.abs(p.z - entity.z) <= 1.05 && p.y >= top - 0.35 && p.y <= top + 0.6 && !p.mounted;
    if (onIt) {
      if (this.liftInput.up && lift.target < lift.stops.length - 1) lift.target += 1;
      if (this.liftInput.down && lift.target > 0) lift.target -= 1;
    }
    const goal = lift.stops[lift.target] ?? entity.y;
    const speed = 2.5;
    const dy = goal - entity.y;
    const step = Math.sign(dy) * Math.min(Math.abs(dy), speed * dt);
    entity.y += step;
    if (onIt) {
      p.teleport(p.x, entity.y, p.z);
      p.vy = 0;
      p.onGround = true;
      p.onLift = true;
      this.ridingLift = entity;
    } else if (this.ridingLift === entity) {
      this.ridingLift = null;
      p.onLift = false;
    }
    entity.group.position.set(entity.x, entity.y - 0.25, entity.z);
  }

  spawnRobot(x: number, y: number, z: number, name = 'Beep', program: RobotProgram = [], blockId = 0): Entity {
    const entity = this.base('robot', buildRobot(), Math.round(x), Math.round(z), new WanderBrain(0), 0);
    entity.y = Math.round(y);
    entity.name = name;
    entity.variant = 'robot';
    entity.persistent = true;
    entity.robot = new RobotRunner(this.world, this.registry, Math.round(x), Math.round(y), Math.round(z));
    entity.robot.program = program;
    entity.robot.blockId = blockId;
    entity.data = { program, blockId };
    return this.add(entity);
  }

  remove(id: string): boolean {
    const index = this.entities.findIndex((e) => e.id === id);
    if (index < 0) return false;
    const [entity] = this.entities.splice(index, 1);
    if (this.mounted === entity) this.dismount();
    this.scene.remove(entity.group);
    disposeGroup(entity.group);
    return true;
  }

  /** Every entity, read-only (panels list the neighbors). */
  all(): readonly Entity[] {
    return this.entities;
  }

  byId(id: string): Entity | undefined {
    return this.entities.find((e) => e.id === id);
  }

  /** A friendly flock near a point. Called once the ground has loaded. */
  spawnFlock(cx: number, cz: number): void {
    const key = `${Math.round(cx / 32)},${Math.round(cz / 32)}`;
    if (this.spawnedAround === key) return;
    this.spawnedAround = key;
    const flock: EntityKind[] = ['bunny', 'bunny', 'bunny', 'chick', 'chick', 'chick', 'butterfly', 'butterfly'];
    for (const kind of flock) {
      for (let attempt = 0; attempt < 24; attempt++) {
        const x = Math.round(cx + (Math.random() * 2 - 1) * 18);
        const z = Math.round(cz + (Math.random() * 2 - 1) * 18);
        if (this.standable(x, z)) {
          this.spawn(kind, x, z);
          break;
        }
      }
    }
  }

  // --- riding ---------------------------------------------------------------

  /** A villager takes a ride and drives or flies it around on autopilot. */
  ride(villagerId: string, vehicleId: string): boolean {
    const villager = this.byId(villagerId);
    const vehicle = this.byId(vehicleId);
    if (!villager || villager.kind !== 'villager' || !vehicle?.vehicle) return false;
    if (this.mounted === vehicle) return false;
    if (vehicle.driver && vehicle.driver !== villagerId) this.stopRiding(vehicle.driver);
    if (villager.riding) this.stopRiding(villagerId);
    villager.riding = vehicleId;
    villager.work = undefined;
    villager.danceUntil = undefined;
    villager.mood = 'excited';
    vehicle.driver = villagerId;
    vehicle.auto = { turn: 0, until: 0, reverseUntil: 0, lastX: vehicle.x, lastZ: vehicle.z, stuck: 0 };
    return true;
  }

  /** The villager hops off beside the ride; a plane or helicopter glides down on its own. */
  stopRiding(villagerId: string): boolean {
    const villager = this.byId(villagerId);
    if (!villager?.riding) return false;
    const vehicle = this.byId(villager.riding);
    villager.riding = undefined;
    if (vehicle) {
      vehicle.driver = undefined;
      const yaw = vehicle.vehicle?.yaw ?? 0;
      const x = vehicle.x + Math.cos(yaw + Math.PI / 2) * 1.6;
      const z = vehicle.z - Math.sin(yaw + Math.PI / 2) * 1.6;
      villager.x = x;
      villager.z = z;
      villager.y = this.groundY(x, z);
      villager.targetX = x;
      villager.targetZ = z;
    }
    villager.mood = 'happy';
    return true;
  }

  /** Who is riding what, for panels. */
  driverOf(vehicleId: string): Entity | null {
    const id = this.byId(vehicleId)?.driver;
    return id ? (this.byId(id) ?? null) : null;
  }

  /** Nearest ride of a kind to a point, if any within `range`. */
  nearestVehicle(kind: string | undefined, x: number, z: number, range = 48): Entity | null {
    let best: Entity | null = null;
    let bestD = range;
    for (const e of this.entities) {
      if (!e.vehicle || (kind && e.variant !== kind) || e === this.mounted) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** What a villager at the wheel does: cruise, turn now and then, back out of corners, keep aircraft up. */
  private autopilot(vehicle: Entity, dt: number, elapsed: number): DriveInput {
    const v = vehicle.vehicle!;
    const a = (vehicle.auto ??= { turn: 0, until: 0, reverseUntil: 0, lastX: vehicle.x, lastZ: vehicle.z, stuck: 0 });
    const ground = this.groundY(vehicle.x, vehicle.z);
    if (elapsed > a.until) {
      const r = Math.random();
      a.turn = r < 0.45 ? 0 : r < 0.72 ? 1 : -1;
      a.until = elapsed + 1.5 + Math.random() * 3;
    }
    if (v.flies) {
      const target = v.kind === 'plane' ? 16 : 9;
      const altitude = vehicle.y - ground;
      return { forward: true, back: false, left: a.turn > 0, right: a.turn < 0, up: altitude < target, down: v.kind === 'helicopter' && altitude > target + 4 };
    }
    const moved = Math.hypot(vehicle.x - a.lastX, vehicle.z - a.lastZ);
    a.lastX = vehicle.x;
    a.lastZ = vehicle.z;
    if (elapsed < a.reverseUntil) return { forward: false, back: true, left: a.turn > 0, right: a.turn < 0 };
    a.stuck = moved < dt * 0.5 ? a.stuck + dt : 0;
    if (a.stuck > 0.6) {
      a.stuck = 0;
      a.reverseUntil = elapsed + 1.2;
      a.turn = Math.random() < 0.5 ? 1 : -1;
    }
    return { forward: true, back: false, left: a.turn > 0, right: a.turn < 0 };
  }

  mount(entity: Entity): boolean {
    if (!entity.vehicle || this.mounted) return false;
    if (entity.driver) this.stopRiding(entity.driver);
    this.mounted = entity;
    this.player.mounted = true;
    return true;
  }

  dismount(): boolean {
    const entity = this.mounted;
    if (!entity) return false;
    this.mounted = null;
    this.player.mounted = false;
    // Step off beside the vehicle onto the ground.
    const x = entity.x + Math.cos((entity.vehicle?.yaw ?? 0) + Math.PI / 2) * 1.4;
    const z = entity.z - Math.sin((entity.vehicle?.yaw ?? 0) + Math.PI / 2) * 1.4;
    this.player.teleport(x, this.groundY(x, z), z);
    return true;
  }

  // --- talking --------------------------------------------------------------

  /** A villager answers a picture choice; may hand over a gift block id. */
  talk(entity: Entity, choice: TalkChoice): { line: string; gift?: number; giftLabel?: string } {
    const job = jobById(entity.variant ?? '') ?? randomJob();
    entity.happyTimer = 0.6;
    switch (choice) {
      case 'hi':
        return { line: job.greeting };
      case 'gift':
        return { line: job.giftLine, gift: job.gift(), giftLabel: job.giftLabel };
      case 'play':
        entity.savedBrain = entity.savedBrain ?? entity.brain;
        entity.brain = new FollowBrain(2.5);
        entity.brainUntil = this.elapsed + 45;
        entity.restTimer = 0;
        return { line: job.playLine };
      default:
        return { line: job.byeLine };
    }
  }

  /** Give a villager a list of blocks to lay by hand. Queues behind current work. */
  assignWork(villagerId: string, label: string, edits: BlockEdit[]): boolean {
    if (this.byId(villagerId)?.riding) this.stopRiding(villagerId);
    const entity = this.byId(villagerId);
    if (!entity || entity.kind !== 'villager' || edits.length === 0) return false;
    if (entity.work) {
      entity.work.edits.push(...edits);
      return true;
    }
    const command = new SetBlocksCommand(label, edits);
    command.capture(this.world);
    // Small jobs go block by block; a mansion should still finish in about fifteen seconds.
    const interval = Math.max(0.005, Math.min(0.12, 15 / Math.max(1, edits.length)));
    entity.work = { label, edits, index: 0, timer: 0, command, interval };
    entity.mood = 'busy';
    entity.savedBrain = entity.savedBrain ?? entity.brain;
    entity.brain = new StayBrain();
    entity.brainUntil = undefined;
    return true;
  }

  /** A creature dances: spins, hops, waves. */
  dance(entity: Entity, seconds = 6): void {
    entity.danceUntil = this.elapsed + seconds;
    entity.mood = 'dancing';
    entity.targetX = entity.x;
    entity.targetZ = entity.z;
  }

  private updateDance(entity: Entity, dt: number, elapsed: number): void {
    const t = elapsed * 9;
    entity.group.rotation.y += dt * 5;
    const groundY = this.groundY(entity.x, entity.z);
    entity.group.position.set(entity.x, groundY + Math.abs(Math.sin(t)) * 0.35, entity.z);
    const armL = entity.group.getObjectByName('arm-l');
    const armR = entity.group.getObjectByName('arm-r');
    if (armL && armR) {
      armL.rotation.z = 2.6 + Math.sin(t) * 0.5;
      armR.rotation.z = -2.6 - Math.sin(t + 1) * 0.5;
    }
    if (elapsed > (entity.danceUntil ?? 0)) {
      entity.danceUntil = undefined;
      if (armL && armR) {
        armL.rotation.z = 0;
        armR.rotation.z = 0;
      }
      entity.mood = 'happy';
    }
  }

  /** Make a villager wait where it is for a while. */
  stay(entity: Entity, seconds = 60): void {
    entity.savedBrain = entity.savedBrain ?? entity.brain;
    entity.brain = new StayBrain();
    entity.brainUntil = this.elapsed + seconds;
    entity.targetX = entity.x;
    entity.targetZ = entity.z;
    entity.restTimer = 0;
    entity.mood = 'patient';
  }

  private updateWork(entity: Entity, dt: number): void {
    const work = entity.work!;
    if (work.index >= work.edits.length) {
      entity.work = undefined;
      entity.brain = entity.savedBrain ?? entity.brain;
      entity.savedBrain = undefined;
      entity.mood = 'proud';
      entity.happyTimer = 1.2;
      this.onWorkDone?.(entity, work.command);
      return;
    }
    const next = work.edits[work.index];
    const dx = next.x - entity.x;
    const dz = next.z - entity.z;
    const distance = Math.hypot(dx, dz);
    // Big jobs are laid from the middle of the site: a builder with a long reach.
    const reach = Math.max(4, Math.min(12, Math.sqrt(work.edits.length) / 2));
    if (distance > reach) {
      // Walk toward the job site first.
      const step = Math.min(distance - reach + 1, entity.speed * dt);
      entity.x += (dx / distance) * step;
      entity.z += (dz / distance) * step;
      entity.group.rotation.y = Math.atan2(dz, dx) * -1 + Math.PI / 2;
      const groundY = this.groundY(entity.x, entity.z);
      entity.y += (groundY - entity.y) * Math.min(1, dt * 10);
      entity.group.position.set(entity.x, entity.y + Math.abs(Math.sin(this.elapsed * 7)) * 0.1, entity.z);
      return;
    }
    entity.group.rotation.y = Math.atan2(dz, dx) * -1 + Math.PI / 2;
    work.timer += dt;
    while (work.timer >= work.interval && work.index < work.edits.length) {
      work.timer -= work.interval;
      const e = work.edits[work.index++];
      if (!this.world.isLoaded(e.x, e.z)) continue;
      this.world.setBlock(e.x, e.y, e.z, e.id, e.state);
      if (e.entity !== undefined) this.world.setEntity(e.x, e.y, e.z, e.entity);
      if (e.id !== 0) this.onWorkBlock?.(e.x, e.y, e.z, e.id);
    }
    // Hammering bob.
    entity.group.position.set(entity.x, entity.y + Math.abs(Math.sin(this.elapsed * 12)) * 0.12, entity.z);
  }

  setPetBrain(entity: Entity, brainName: 'follow' | 'stay' | 'wander' | 'neural'): void {
    entity.brain = createBrain(brainName, undefined, entity.variant);
    entity.data = { ...entity.data, brain: brainName };
    entity.targetX = entity.x;
    entity.targetZ = entity.z;
    entity.restTimer = 0;
  }

  // --- persistence ----------------------------------------------------------

  serialize(): StoredEntity[] {
    return this.entities
      .filter((e) => e.persistent)
      .map((e) => ({
        id: e.id,
        kind: e.kind,
        variant: e.variant,
        name: e.name,
        x: e.x,
        y: e.y,
        z: e.z,
        brain: (e.savedBrain ?? e.brain).kind,
        home: e.home,
        data: e.data,
      }));
  }

  restore(list: StoredEntity[]): void {
    for (const s of list) {
      let entity: Entity | null = null;
      if (s.kind === 'pet' && (s.variant === 'dog' || s.variant === 'cat')) {
        entity = this.spawnPet(s.variant, s.x, s.z, s.name, typeof s.data?.brain === 'string' ? (s.data.brain as string) : 'neural');
      } else if (s.kind === 'villager') {
        entity = this.spawnVillager(s.variant ?? 'random', s.x, s.z, s.name, s.home, s.data?.gender === 'girl' || s.data?.gender === 'boy' ? (s.data.gender as Gender) : undefined);
      } else if (s.kind === 'vehicle' && (VEHICLE_KINDS as string[]).includes(s.variant ?? '')) {
        entity = this.spawnVehicle(s.variant as VehicleKind, s.x, s.y, s.z, typeof s.data?.color === 'string' ? (s.data.color as string) : undefined);
      } else if (s.kind === 'lift') {
        const stops = Array.isArray(s.data?.stops) ? (s.data!.stops as unknown[]).filter((v): v is number => typeof v === 'number') : [s.y];
        entity = this.spawnLift(s.x, s.y, s.z, stops.length ? stops : [s.y]);
      } else if (s.kind === 'robot') {
        const program = validateProgram(s.data?.program) ?? [];
        const blockId = typeof s.data?.blockId === 'number' ? (s.data.blockId as number) : 0;
        entity = this.spawnRobot(s.x, s.y, s.z, s.name, program, blockId);
      }
      if (entity) entity.id = s.id;
    }
    const max = this.entities.reduce((m, e) => Math.max(m, Number(e.id.slice(1)) || 0), 0);
    nextId = Math.max(nextId, max + 1);
  }

  // --- interaction ------------------------------------------------------------

  /** Did a ray hit a creature or vehicle? Returns it (does not pet it). */
  pick(ray: Ray): Entity | null {
    this.raycaster.set(new THREE.Vector3(ray.ox, ray.oy, ray.oz), new THREE.Vector3(ray.dx, ray.dy, ray.dz));
    this.raycaster.far = 42; // as far as blocks can be tapped in third person (REACH * 6)
    let best: { entity: Entity; d: number } | null = null;
    for (const entity of this.entities) {
      if (entity === this.mounted) continue;
      const hit = this.raycaster.intersectObject(entity.group, true)[0];
      if (hit && (!best || hit.distance < best.d)) best = { entity, d: hit.distance };
    }
    return best?.entity ?? null;
  }

  /** Did a ray hit a creature? Pets it and returns it. */
  tap(ray: Ray): Entity | null {
    const entity = this.pick(ray);
    if (entity && !entity.vehicle) this.pet(entity);
    return entity;
  }

  pet(entity: Entity): void {
    entity.happyTimer = 0.9;
    const intent = entity.brain.onPet?.(this.sense(entity, 0, this.elapsed));
    if (intent) {
      entity.restTimer = intent.restFor;
      entity.mood = intent.mood ?? entity.mood;
    }
  }

  private sense(entity: Entity, dt: number, elapsed: number): BrainSense {
    let friends = 0;
    for (const other of this.entities) {
      if (other !== entity && !other.vehicle && Math.hypot(other.x - entity.x, other.z - entity.z) < 5) friends++;
    }
    const speed = Math.hypot(this.player.vx, this.player.vz);
    return {
      x: entity.x,
      y: entity.y,
      z: entity.z,
      playerX: this.player.x,
      playerZ: this.player.z,
      dt,
      elapsed,
      timeOfDay: this.timeOfDay(),
      playerMoving: speed > 0.5,
      playerFast: speed > 5,
      friendsNearby: friends,
      standable: (x, z) => this.standable(x, z),
      random: Math.random,
    };
  }

  update(dt: number, elapsed: number): void {
    this.elapsed = elapsed;
    // Rides move first so their riders (player or villager) sit exactly in the seat this frame.
    for (const entity of this.entities) {
      if (!entity.vehicle || !this.world.isLoaded(Math.round(entity.x), Math.round(entity.z))) continue;
      const riding = this.mounted === entity;
      const input = riding ? this.driveInput : entity.driver ? this.autopilot(entity, dt, elapsed) : null;
      entity.vehicle.update(dt, input, elapsed);
      entity.x = entity.vehicle.x;
      entity.y = entity.vehicle.y;
      entity.z = entity.vehicle.z;
      if (riding) {
        const seat = entity.vehicle.seat();
        this.player.teleport(seat.x, seat.y, seat.z);
        this.player.facing = entity.vehicle.yaw + Math.PI / 2;
      }
    }
    for (const entity of this.entities) {
      if (entity.vehicle) continue;
      if (!this.world.isLoaded(Math.round(entity.x), Math.round(entity.z))) continue;

      if (entity.lift) {
        this.updateLift(entity, dt);
        continue;
      }
      if (entity.robot) {
        const r = entity.robot;
        r.update(dt);
        entity.data = { program: r.program, blockId: r.blockId };
        entity.x += (r.x - entity.x) * Math.min(1, dt * 8);
        entity.y += (r.y - entity.y) * Math.min(1, dt * 8);
        entity.z += (r.z - entity.z) * Math.min(1, dt * 8);
        entity.group.position.set(entity.x, entity.y - 0.5 + (r.running ? Math.sin(elapsed * 10) * 0.05 : 0), entity.z);
        entity.group.rotation.y = r.yaw;
        continue;
      }
      if (entity.riding) {
        const ride = this.byId(entity.riding);
        if (!ride?.vehicle || ride.driver !== entity.id) {
          entity.riding = undefined;
        } else {
          const seat = ride.vehicle.seat();
          entity.x = seat.x;
          entity.y = seat.y;
          entity.z = seat.z;
          entity.group.position.set(seat.x, seat.y, seat.z);
          entity.group.rotation.y = ride.vehicle.yaw + Math.PI / 2;
          continue;
        }
      }
      if (entity.work) {
        this.updateWork(entity, dt);
        continue;
      }
      if (entity.danceUntil !== undefined) {
        this.updateDance(entity, dt, elapsed);
        continue;
      }

      if (entity.brainUntil !== undefined && elapsed > entity.brainUntil) {
        entity.brain = entity.savedBrain ?? entity.brain;
        entity.savedBrain = undefined;
        entity.brainUntil = undefined;
      }

      if (entity.happyTimer > 0) {
        entity.happyTimer -= dt;
        const wiggle = Math.sin(entity.happyTimer * 24) * 0.25;
        entity.group.rotation.y += wiggle * dt * 20;
        const groundY = this.groundY(entity.x, entity.z);
        entity.group.position.set(entity.x, groundY + Math.abs(Math.sin(entity.happyTimer * 12)) * 0.5, entity.z);
        continue;
      }

      if (entity.talking) {
        // Chatting: hold still, face the child, breathe a little.
        entity.group.rotation.y = Math.atan2(this.player.z - entity.z, this.player.x - entity.x) * -1 + Math.PI / 2;
        entity.y += (this.groundY(entity.x, entity.z) - entity.y) * Math.min(1, dt * 10);
        entity.group.position.set(entity.x, entity.y + Math.sin(elapsed * 2 + entity.phase) * 0.02, entity.z);
        continue;
      }
      const dx = entity.targetX - entity.x;
      const dz = entity.targetZ - entity.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.1) {
        entity.restTimer -= dt;
        if (entity.restTimer <= 0) {
          const intent = entity.brain.decide(this.sense(entity, dt, elapsed));
          if (intent.target) {
            entity.targetX = intent.target.x;
            entity.targetZ = intent.target.z;
          }
          entity.restTimer = intent.restFor;
          entity.mood = intent.mood ?? entity.mood;
          if (intent.celebrate) entity.happyTimer = 0.7;
        }
      } else {
        const step = Math.min(distance, entity.speed * dt * (entity.swimming ? 0.5 : 1));
        const nx = entity.x + (dx / distance) * step;
        const nz = entity.z + (dz / distance) * step;
        if (!entity.flies && this.groundY(nx, nz) > entity.y + 1.1) {
          entity.targetX = entity.x;
          entity.targetZ = entity.z;
        } else {
          entity.x = nx;
          entity.z = nz;
        }
        entity.group.rotation.y = Math.atan2(dz, dx) * -1 + Math.PI / 2;
      }

      entity.swimming = !entity.flies && this.waterAt(entity.x, entity.z);
      // Swimmers float with their body in the water, not on top of it.
      const groundY = this.groundY(entity.x, entity.z) - (entity.swimming ? 0.45 : 0);
      entity.y += (groundY - entity.y) * Math.min(1, dt * (entity.swimming ? 4 : 10));
      if (entity.flies) {
        entity.group.position.set(entity.x, entity.y + 1.1 + Math.sin(elapsed * 2 + entity.phase) * 0.25, entity.z);
        const flap = Math.sin(elapsed * 14 + entity.phase) * 0.9;
        if (entity.wings) {
          entity.wings[0].rotation.y = flap;
          entity.wings[1].rotation.y = -flap;
        }
      } else {
        const moving = distance >= 0.1;
        const hop = entity.swimming
          ? Math.sin(elapsed * 3 + entity.phase) * 0.06
          : moving && entity.kind !== 'villager'
            ? Math.abs(Math.sin(elapsed * 7 + entity.phase)) * 0.18
            : 0;
        entity.group.position.set(entity.x, entity.y + hop, entity.z);
      }
    }
  }

  dispose(): void {
    for (const entity of this.entities) {
      this.scene.remove(entity.group);
      disposeGroup(entity.group);
    }
    this.entities.length = 0;
  }
}
