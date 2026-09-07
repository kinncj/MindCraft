import { B } from '../blocks/blocks';
import type { VillagerLook } from './bodies';

/**
 * Villager jobs: a look, a gift, and picture-heavy lines. All pretend
 * play, no economy. Lines are short so a beginning reader can follow.
 */
export type VillagerJob = {
  id: string;
  label: string;
  emoji: string;
  look: VillagerLook;
  gift: () => number;
  giftLabel: string;
  greeting: string;
  giftLine: string;
  playLine: string;
  byeLine: string;
};

export const JOBS: VillagerJob[] = [
  { id: 'baker', label: 'Baker', emoji: '🥖', look: { shirt: '#f3efe7', pants: '#d3a35e', skin: '#f2c79a', hair: '#6b4a26', hat: '#ffffff' }, gift: () => B.cake, giftLabel: 'Cake', greeting: '👋 Hi! I bake yummy bread and cake! 🍞🎂', giftLine: '🎂 Here, a cake for you! Share it!', playLine: '🏃 Let’s go! I’ll follow you!', byeLine: '👋 Bye bye! Come back for cookies! 🍪' },
  { id: 'farmer', label: 'Farmer', emoji: '🌾', look: { shirt: '#67c23a', pants: '#8a6238', skin: '#c68642', hair: '#3a3226', hat: '#d9b53c' }, gift: () => B.hay, giftLabel: 'Hay', greeting: '👋 Howdy! I grow pumpkins and hay! 🎃🌾', giftLine: '🌾 A hay bale for your farm!', playLine: '🐔 Race you to the field!', byeLine: '👋 See you at harvest time! 🎃' },
  { id: 'builder', label: 'Builder', emoji: '🔨', look: { shirt: '#f2903c', pants: '#4a7fd6', skin: '#f2c79a', hair: '#c98d4b', hat: '#ffd94a' }, gift: () => B.brick, giftLabel: 'Brick', greeting: '👋 Hello! I build big houses! 🏠🔨', giftLine: '🧱 Take a brick! Build something tall!', playLine: '🔨 Let’s build together!', byeLine: '👋 Keep building! 🏗️' },
  { id: 'doctor', label: 'Doctor', emoji: '🩺', look: { shirt: '#ffffff', pants: '#4a7fd6', skin: '#8d5524', hair: '#3a3226' }, gift: () => B.flower_red, giftLabel: 'Red Flower', greeting: '👋 Hi there! I help everyone feel great! 🩺💛', giftLine: '🌹 A flower to make you smile!', playLine: '🚶 Walks are healthy! Let’s go!', byeLine: '👋 Stay happy and healthy! 🍎' },
  { id: 'teacher', label: 'Teacher', emoji: '📚', look: { shirt: '#9b6bd8', pants: '#3a3a3a', skin: '#f2c79a', hair: '#e8574f' }, gift: () => B.bookshelf, giftLabel: 'Bookshelf', greeting: '👋 Hello! I love books and questions! 📚❓', giftLine: '📚 A bookshelf full of stories!', playLine: '🔍 Let’s explore and learn!', byeLine: '👋 Keep asking questions! 🌟' },
  { id: 'firefighter', label: 'Firefighter', emoji: '🚒', look: { shirt: '#e8574f', pants: '#3a3a3a', skin: '#c68642', hair: '#6b4a26', hat: '#e8574f' }, gift: () => B.water, giftLabel: 'Water', greeting: '👋 Hi! I keep everyone safe! 🚒💧', giftLine: '💧 Water! Splash splash!', playLine: '🚒 Let’s zoom around!', byeLine: '👋 Stay safe, friend! 🧯' },
  { id: 'shopkeeper', label: 'Shopkeeper', emoji: '🏪', look: { shirt: '#4fa8e8', pants: '#8a6238', skin: '#f2c79a', hair: '#ffd94a' }, gift: () => B.rainbow, giftLabel: 'Rainbow', greeting: '👋 Welcome to my shop! Everything is free! 🏪🎁', giftLine: '🌈 A rainbow block! On the house!', playLine: '🛒 Let’s go window shopping!', byeLine: '👋 Thanks for visiting! 🛍️' },
  { id: 'musician', label: 'Musician', emoji: '🎵', look: { shirt: '#f291bb', pants: '#9b6bd8', skin: '#8d5524', hair: '#3a3226', hat: '#9b6bd8' }, gift: () => B.star, giftLabel: 'Star', greeting: '👋 La la la! I make music! 🎵🎶', giftLine: '⭐ A star for my biggest fan!', playLine: '💃 Dance party! Follow me!', byeLine: '👋 Keep singing! 🎤' },
];

export type Gender = 'girl' | 'boy';

export const GIRL_NAMES = ['Mia', 'Zoe', 'Ava', 'Lily', 'Nia', 'Ruby', 'Ivy', 'Luna', 'Emma', 'Sofia', 'Maya', 'Rosa', 'Nora', 'Ella', 'Aria', 'Yara'];
export const BOY_NAMES = ['Leo', 'Max', 'Sam', 'Ben', 'Kai', 'Eli', 'Noah', 'Theo', 'Omar', 'Luca', 'Finn', 'Jude', 'Milo', 'Ravi', 'Owen', 'Hugo'];
/** Every villager name (kept for older code and saves). */
export const VILLAGER_NAMES = [...GIRL_NAMES, ...BOY_NAMES];

/** A villager is a girl or a boy, and the name always matches. */
export function randomIdentity(gender?: Gender): { gender: Gender; name: string } {
  const g: Gender = gender ?? (Math.random() < 0.5 ? 'girl' : 'boy');
  return { gender: g, name: randomName(g === 'girl' ? GIRL_NAMES : BOY_NAMES) };
}

/** The gender a saved name implies; a name we do not know keeps whatever was stored, or is a coin flip. */
export function genderOfName(name: string | undefined, fallback?: Gender): Gender {
  const first = (name ?? '').split(' ')[0];
  if (GIRL_NAMES.includes(first)) return 'girl';
  if (BOY_NAMES.includes(first)) return 'boy';
  return fallback ?? (Math.random() < 0.5 ? 'girl' : 'boy');
}
export const PET_NAMES = ['Rex', 'Biscuit', 'Pickles', 'Waffles', 'Nugget', 'Mochi', 'Pepper', 'Coco', 'Ziggy', 'Bean', 'Peanut', 'Sunny'];

export function jobById(id: string): VillagerJob | undefined {
  return JOBS.find((j) => j.id === id);
}

export function randomJob(rand = Math.random): VillagerJob {
  return JOBS[Math.floor(rand() * JOBS.length)];
}

export function randomName(list: string[], rand = Math.random): string {
  return list[Math.floor(rand() * list.length)];
}

export type TalkChoice = 'hi' | 'gift' | 'play' | 'bye';

export const TALK_CHOICES: Array<{ id: TalkChoice; label: string }> = [
  { id: 'hi', label: '👋 Hi!' },
  { id: 'gift', label: '🎁 Got something for me?' },
  { id: 'play', label: '🤝 Let’s play!' },
  { id: 'bye', label: '👋 Bye!' },
];
