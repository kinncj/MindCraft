/**
 * Cities a kid can ask for by name. Each one is a handful of its monuments
 * plus a sign, built side by side on their own patches of ground.
 */

import type { MonumentKind } from './index';

export type CityName = 'curitiba' | 'saopaulo' | 'ottawa' | 'toronto' | 'paris' | 'tokyo' | 'vancouver' | 'rio';

export const CITY_PACKS: Record<CityName, { label: string; emoji: string; monuments: MonumentKind[]; sign: string }> = {
  curitiba: { label: 'Curitiba', emoji: '🌲', monuments: ['niemeyer_eye', 'wire_opera', 'botanical_garden'], sign: 'CURITIBA' },
  saopaulo: { label: 'São Paulo', emoji: '🏙️', monuments: ['masp', 'copan', 'ibirapuera'], sign: 'SAO PAULO' },
  ottawa: { label: 'Ottawa', emoji: '🍁', monuments: ['peace_tower', 'rideau_canal'], sign: 'OTTAWA' },
  toronto: { label: 'Toronto', emoji: '🇨🇦', monuments: ['cn_tower', 'rogers_dome'], sign: 'TORONTO' },
  paris: { label: 'Paris', emoji: '🗼', monuments: ['eiffel'], sign: 'PARIS' },
  tokyo: { label: 'Tokyo', emoji: '🎌', monuments: ['tokyo_tower', 'skytree', 'sensoji'], sign: 'TOKYO' },
  vancouver: { label: 'Vancouver', emoji: '🏔️', monuments: ['canada_place', 'science_world', 'lions_gate'], sign: 'VANCOUVER' },
  rio: { label: 'Rio de Janeiro', emoji: '🌴', monuments: ['christ_redeemer', 'sugarloaf'], sign: 'RIO' },
};

export const CITY_NAMES = Object.keys(CITY_PACKS) as CityName[];

export function isCityName(value: unknown): value is CityName {
  return typeof value === 'string' && (CITY_NAMES as string[]).includes(value);
}
