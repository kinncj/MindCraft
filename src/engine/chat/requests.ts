/**
 * A whole sentence, turned into everything the child asked for. Kids do
 * not say one thing at a time: "build a school with a playground and dig
 * a big lake and then make it night" is three requests, in order. The
 * sentence is cut into clauses by the intent model, and each clause goes
 * through the same parsers a single request would.
 */

import { buildActionsFor, parseBuildRequest, parseEarthwork, parseFeature, type BuildSpec, type EarthworkSpec, type FeatureSpec } from './buildRequest';
import { classifyIntent, intentIsClear, splitClauses } from './intent';
import { FEATURE_SIZE } from '../build/BuildTools';
import { EARTHWORK_SIZE } from '../build/buildingKit';
import type { IntentLabel } from './intentFeatures';
import type { ChatAction, ChatContext } from './types';

export type Request =
  | { kind: 'building'; spec: BuildSpec; clause: string }
  | { kind: 'earthwork'; spec: EarthworkSpec; clause: string }
  | { kind: 'feature'; spec: FeatureSpec; clause: string }
  | { kind: 'action'; label: IntentLabel; clause: string };

/** Everything the sentence asks for, in the order the child said it. */
export function parseRequests(raw: string): Request[] {
  const out: Request[] = [];
  const seen = new Set<string>();
  for (const clause of splitClauses(raw)) {
    const request = parseClause(clause);
    if (!request) continue;
    const key = request.kind === 'action' ? `action:${request.label}` : `${request.kind}:${JSON.stringify('spec' in request ? request.spec : '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(request);
  }
  return out;
}

function parseClause(clause: string): Request | null {
  const building = parseBuildRequest(clause);
  if (building) return { kind: 'building', spec: building, clause };
  const dig = parseEarthwork(clause);
  if (dig) return { kind: 'earthwork', spec: dig, clause };
  const feature = parseFeature(clause);
  if (feature) return { kind: 'feature', spec: feature, clause };
  const guess = classifyIntent(clause);
  if (guess.kind === 'action' && intentIsClear(guess)) return { kind: 'action', label: guess.label, clause };
  return null;
}

/** What each request tells the villager to do. */
export function actionsFor(request: Request, ctx: ChatContext): ChatAction[] {
  switch (request.kind) {
    case 'building':
      return buildActionsFor(request.spec, ctx);
    case 'earthwork': {
      const d = request.spec;
      const size = EARTHWORK_SIZE[d.kind];
      const at = ctx.plot?.(d.width ?? size[0], d.length ?? size[1]) ?? ctx.site;
      return [{ tool: 'build_dig', args: { x: at.x, y: at.y, z: at.z, kind: d.kind, ...(d.width ? { width: d.width } : {}), ...(d.length ? { length: d.length } : {}), ...(d.depth ? { depth: d.depth } : {}) } }];
    }
    case 'feature': {
      const f = request.spec;
      const size = FEATURE_SIZE[f.kind];
      const at = ctx.plot?.(f.width ?? size.w, f.length ?? size.d) ?? ctx.site;
      return [{ tool: 'build_feature', args: { x: at.x, y: at.y, z: at.z, kind: f.kind, ...(f.width ? { width: f.width } : {}), ...(f.length ? { length: f.length } : {}), ...(f.color ? { color: f.color } : {}) } }];
    }
    case 'action':
      return actionForLabel(request.label, request.clause, ctx);
  }
}

const VEHICLES: Array<[RegExp, string]> = [
  [/\b(plane|airplane|aeroplane|jet)\b/, 'plane'],
  [/\b(helicopter|chopper|heli)\b/, 'helicopter'],
  [/\b(motorbike|motorcycle|bike|scooter)\b/, 'motorcycle'],
  [/\bboat\b|\bship\b|\bsail/, 'boat'],
  [/\bcar\b|\btruck\b|\bvan\b/, 'car'],
];

/** Which pet, which ride, which shape: read straight out of the words, where it is exact. */
function actionForLabel(label: IntentLabel, clause: string, ctx: ChatContext): ChatAction[] {
  const id = ctx.villager.id;
  const at = ctx.site;
  const vehicle = VEHICLES.find(([pattern]) => pattern.test(clause))?.[1] ?? 'car';
  switch (label) {
    case 'follow':
      return [{ tool: 'villager_talk', args: { id, choice: 'play' } }];
    case 'stay':
      return [{ tool: 'villager_stay', args: { id } }];
    case 'dance':
      return [{ tool: 'villager_dance', args: { id } }, { tool: 'player_dance', args: {} }];
    case 'gift':
      return [{ tool: 'villager_talk', args: { id, choice: 'gift' } }];
    case 'time_night':
      return [{ tool: 'time_set', args: { mode: 'night' } }];
    case 'time_day':
      return [{ tool: 'time_set', args: { mode: 'day' } }];
    case 'weather_rain':
      return [{ tool: 'weather_set', args: { weather: 'rain' } }];
    case 'weather_snow':
      return [{ tool: 'weather_set', args: { weather: 'snow' } }];
    case 'weather_sunny':
      return [{ tool: 'weather_set', args: { weather: 'sunny' } }];
    case 'pet':
      return [{ tool: 'pet_adopt', args: { kind: /\b(cat|kitty|kitten)\b/.test(clause) ? 'cat' : 'dog' } }];
    case 'creature':
      return [{ tool: 'entity_spawn', args: { kind: /\b(chick|chicken|birdie)\b/.test(clause) ? 'chick' : /\bbutterfl/.test(clause) ? 'butterfly' : 'bunny' } }];
    case 'ride':
      return [{ tool: 'vehicle_ride', args: { kind: vehicle } }];
    case 'vehicle':
      return [{ tool: 'vehicle_spawn', args: { kind: vehicle } }];
    case 'fly':
      return [{ tool: 'player_fly', args: { on: true } }];
    case 'land':
      return [{ tool: 'player_fly', args: { on: false } }];
    case 'stop_riding':
      return [{ tool: 'vehicle_stop', args: {} }];
    case 'shape': {
      const shape = /\bpyramid\b/.test(clause) ? 'pyramid' : /\b(tower|lighthouse)\b/.test(clause) ? 'tower' : /\b(cube|box)\b/.test(clause) ? 'cube' : /\b(wall|fence)\b/.test(clause) ? 'wall' : /\b(arch|gate)\b/.test(clause) ? 'arch' : /\btrees?\b/.test(clause) ? 'tree' : /\b(ring|circle)\b/.test(clause) ? 'ring' : /\b(road|path|line)\b/.test(clause) ? 'line' : /\b(platform|stage|deck)\b/.test(clause) ? 'platform' : 'pyramid';
      const size = /\b(huge|giant|big|large|tall)\b/.test(clause) ? 9 : /\b(tiny|small|little|mini)\b/.test(clause) ? 3 : 5;
      return [{ tool: 'build_shape', args: { shape, size, x: at.x, y: at.y, z: at.z } }];
    }
    default:
      return [];
  }
}

/** "a" or "an", so the villager sounds like a person. */
function article(word: string): string {
  return /^[aeiou]/.test(word) ? 'an' : 'a';
}

/** How the villager says what it is about to do. */
export function describeRequest(request: Request): string {
  switch (request.kind) {
    case 'building':
    case 'earthwork':
    case 'feature':
      return `${article(request.spec.label)} ${request.spec.label}`;
    case 'action':
      return ACTION_WORDS[request.label] ?? 'that';
  }
}

const ACTION_WORDS: Partial<Record<IntentLabel, string>> = {
  follow: 'come with you 🚶',
  stay: 'wait right here 🛑',
  dance: 'a dance 💃',
  gift: 'a present 🎁',
  time_night: 'night time 🌙',
  time_day: 'daytime ☀️',
  weather_rain: 'rain 🌧️',
  weather_snow: 'snow ❄️',
  weather_sunny: 'sunshine 😎',
  pet: 'a pet 🐶',
  creature: 'a little friend 🐰',
  ride: 'a spin in it 🚗',
  vehicle: 'a ride for you 🚗',
  fly: 'flying 🪽',
  land: 'landing 🛬',
  stop_riding: 'hopping off 🛑',
  shape: 'a shape 🔺',
};
