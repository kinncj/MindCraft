import { buildActionsFor, parseBuildRequest } from './buildRequest';
import type { ChatAction, ChatContext, ChatProvider, ChatReply } from './types';

/**
 * Works everywhere, understands the things small kids actually ask
 * for, and never says anything it was not written to say. Also the
 * fallback when a smarter provider fails.
 */

const BLUEPRINT_WORDS: Array<[RegExp, string, string]> = [
  [/\b(house|home|cottage|hut|cabin)\b/, 'cozy_house', '🏠 a cozy house'],
  [/\b(castle|fort|palace)\b/, 'castle_tower', '🏰 a castle tower'],
  [/\bbridge\b/, 'bridge', '🌉 a bridge'],
  [/\b(garden|flower ?bed)\b/, 'garden', '🌷 a flower garden'],
  [/\b(pool|swimming)\b/, 'pool', '🏊 a swimming pool'],
  [/\b(tree ?house|treehouse)\b/, 'treehouse', '🌳 a treehouse'],
];

const SHAPE_WORDS: Array<[RegExp, string, string, string]> = [
  [/\bpyramid\b/, 'pyramid', '🔺 a pyramid', 'sandstone'],
  [/\b(tower|lighthouse)\b/, 'tower', '🗼 a tall tower', 'stone_bricks'],
  [/\b(cube|box|block of blocks)\b/, 'cube', '🧊 a big cube', 'color_blue'],
  [/\b(platform|floor|stage|deck)\b/, 'platform', '▬ a platform', 'planks'],
  [/\b(wall|fence)\b/, 'wall', '🧱 a wall', 'brick'],
  [/\b(ring|circle|round)\b/, 'ring', '⭕ a ring', 'color_yellow'],
  [/\b(road|path|line)\b/, 'line', '🛣️ a path', 'cobblestone'],
  [/\btrees?\b/, 'tree', '🌳 a tree', 'wood'],
  [/\b(arch|gate|doorway)\b/, 'arch', '🌈 an arch', 'rainbow'],
];

const BUILD_VERB = /\b(build|make|put|create|stamp|place|construct|dig)\b/;
const COLOR_WORDS: Record<string, string> = { red: 'color_red', orange: 'color_orange', yellow: 'color_yellow', green: 'color_green', blue: 'color_blue', purple: 'color_purple', pink: 'color_pink', white: 'color_white', black: 'color_black', brown: 'color_brown', gold: 'color_yellow', rainbow: 'rainbow', glass: 'glass', stone: 'stone', brick: 'brick', wood: 'planks', snow: 'snow', ice: 'ice', sand: 'sand' };

const FAVORITES: Record<string, { color: string; food: string; thing: string }> = {
  baker: { color: 'pink like frosting', food: 'warm cinnamon buns', thing: 'the smell of fresh bread' },
  farmer: { color: 'green like new grass', food: 'crunchy carrots', thing: 'sunrise over the fields' },
  builder: { color: 'orange like my helmet', food: 'a big sandwich', thing: 'a wall that stands up straight' },
  doctor: { color: 'white like a clean coat', food: 'apples, of course', thing: 'when everyone feels better' },
  teacher: { color: 'purple like my favorite pen', food: 'blueberries', thing: 'a good question' },
  firefighter: { color: 'red like the fire truck', food: 'spaghetti', thing: 'helping a kitten down from a tree' },
  shopkeeper: { color: 'blue like my shop', food: 'lemonade', thing: 'a happy customer' },
  musician: { color: 'every color at once', food: 'popcorn', thing: 'a song everyone can sing' },
};

export class RuleChatProvider implements ChatProvider {
  readonly name = 'rules';

  async available(): Promise<boolean> {
    return true;
  }

  async reply(ctx: ChatContext): Promise<ChatReply> {
    const text = ctx.message.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const v = ctx.villager;
    const say = (s: string, actions: ChatAction[] = []): ChatReply => ({ say: `${v.emoji} ${s}`, actions });
    const at = ctx.site;
    const fav = FAVORITES[v.job] ?? FAVORITES.builder;
    const night = ctx.world.timeOfDay > 0.55 || ctx.world.timeOfDay < 0.05;
    const dusk = !night && (ctx.world.timeOfDay > 0.45 || ctx.world.timeOfDay < 0.12);

    if (!text) return say(`Hi! I'm ${v.name} the ${v.jobLabel}. What should we do?`);

    // --- Questions about the world (honest answers from real state) ---
    if (/\b(what|which) (colou?r|color) (is|s) (the )?sky\b|\bsky (colou?r|color)\b/.test(text)) {
      const sky = ctx.world.weather !== 'sunny' ? 'grey and cloudy ☁️' : night ? 'dark blue with twinkly stars 🌌' : dusk ? 'orange and pink, like a peach 🍑' : 'bright blue 💙';
      return say(`Right now the sky is ${sky}!`);
    }
    if (/\b(what|how)('s| is) the (weather|whether)\b|\bis it (raining|snowing|sunny)\b/.test(text)) {
      const w = ctx.world.weather === 'rain' ? 'raining! Pitter patter 🌧️' : ctx.world.weather === 'snow' ? 'snowing! ❄️' : 'sunny and lovely ☀️';
      return say(`It's ${w}`);
    }
    if (/\b(what time|is it (night|day|morning)|what day)\b/.test(text)) {
      return say(night ? `It's night time! 🌙 Sleepy stars everywhere.` : dusk ? `It's almost evening! 🌇` : `It's daytime! ☀️ Perfect for building.`);
    }
    if (/\b(where are we|where am i|what place|what is this place|which biome)\b/.test(text)) {
      return say(`We're in ${ctx.world.worldName}, in the ${ctx.world.biome}! 🗺️`);
    }
    if (/\b(favou?rite|favorite) (colou?r|color)\b/.test(text)) return say(`My favorite color is ${fav.color}! 🎨 What's yours?`);
    if (/\b(favou?rite|favorite) (food|snack|thing to eat)\b/.test(text)) return say(`I love ${fav.food}! 😋`);
    if (/\b(favou?rite|favorite)\b/.test(text)) return say(`My favorite thing is ${fav.thing}! 💛`);
    if (/\b(how old|your age|birthday)\b/.test(text)) return say(`Old enough to be a ${v.jobLabel}, young enough to play! 🎈`);
    if (/\b(do you like|do you love)\b/.test(text)) return say(`I do! ${text.replace(/.*do you (like|love)\s*/, '').trim() || 'That'} is wonderful. 😊`);
    if (/\b(what is|whats|what's) (a|an|the)? ?(\w+)\b/.test(text) && /\b(block|brick|wire|piston|lever|robot|blueprint)\b/.test(text)) {
      return say(`Tap the ➕ More button to see every block, or ask me to build with one! 🧱`);
    }
    if (/\b(why|how come)\b/.test(text)) return say(`Great question! I think it's because it's fun. 😄`);
    if (/\b(can you|could you) (fly|swim|jump|sing|dance|cook|read)\b/.test(text)) return say(`I can try! Watch me! 🎉`, [{ tool: 'villager_dance', args: { id: v.id } }]);

    // --- Building ---
    const wantsBuild = BUILD_VERB.test(text) || /\b(please|now|here|i want|can i have)\b/.test(text);
    const color = Object.keys(COLOR_WORDS).find((c) => new RegExp(`\\b${c}\\b`).test(text));
    const sizeWord = /\b(huge|giant|big|large|tall)\b/.test(text) ? 9 : /\b(tiny|small|little|mini)\b/.test(text) ? 3 : 5;
    const numberMatch = /\b(\d{1,2})\b/.exec(text);
    const size = numberMatch ? Math.max(2, Math.min(16, Number(numberMatch[1]))) : sizeWord;
    const spec = parseBuildRequest(text);
    if (spec && wantsBuild) {
      const extras = [spec.furnish ? 'furnished' : '', spec.people.length ? `with ${spec.people.map((p) => `${p.count} ${(p.name ?? p.job).toLowerCase()}${p.count > 1 ? 's' : ''}`).join(' and ')}` : '', spec.flag ? `and a ${spec.flag} flag` : ''].filter(Boolean).join(', ');
      return say(`A ${spec.label} with ${spec.floors} floor${spec.floors === 1 ? '' : 's'}${extras ? `, ${extras}` : ''}, coming right up! ${spec.kind === 'castle' ? '🏰' : '🏠'} Watch me build it!`, buildActionsFor(spec, ctx));
    }
    for (const [pattern, blueprint, label] of BLUEPRINT_WORDS) {
      if (pattern.test(text) && wantsBuild) {
        const paint = color && COLOR_WORDS[color].startsWith('color_') ? COLOR_WORDS[color] : undefined;
        return say(`On it! I'll build ${label}${paint ? ` in ${color}` : ''} right over there. Watch me go! 🔨`, [
          { tool: 'build_stamp_blueprint', args: { blueprint, x: at.x, y: at.y, z: at.z, rotation: rotationFromYaw(ctx.player.yaw), ...(paint ? { color: paint } : {}) } },
        ]);
      }
    }
    for (const [pattern, shape, label, defaultBlock] of SHAPE_WORDS) {
      if (pattern.test(text) && wantsBuild) {
        const block = color ? COLOR_WORDS[color] : defaultBlock;
        return say(`${label.replace(/^\S+ /, '')}, coming right up! ${label.split(' ')[0]} Let me get my hammer. 🔨`, [
          { tool: 'build_shape', args: { shape, block, size, x: at.x, y: at.y, z: at.z } },
        ]);
      }
    }
    const block = findBlock(text, ctx.blocks);
    if (block && BUILD_VERB.test(text)) {
      if (/\b(lots|many|bunch|some|pile|wall of|row of)\b/.test(text)) {
        return say(`A pile of ${block.label}! Coming right up. 🧱`, [{ tool: 'build_shape', args: { shape: 'wall', block: block.id, size, x: at.x, y: at.y, z: at.z } }]);
      }
      return say(`One ${block.label}, coming up! ✨`, [{ tool: 'world_place_block', args: { x: at.x, y: at.y, z: at.z, block: block.id } }]);
    }
    if (/\b(room|walls|floor)\b/.test(text) && BUILD_VERB.test(text)) {
      return say('A little room! I love building rooms. 🏠', [
        { tool: 'build_room', args: { x1: at.x - 3, y1: at.y - 1, z1: at.z - 3, x2: at.x + 3, z2: at.z + 3, block: color ? COLOR_WORDS[color] : 'planks' } },
      ]);
    }

    // --- Company ---
    if (/\b(follow|come with|come here|come on|with me|let'?s go|walk with)\b/.test(text)) return say(`Okay! I'll come along! 🚶`, [{ tool: 'villager_talk', args: { id: v.id, choice: 'play' } }]);
    if (/\b(stay|stop|wait|sit)\b/.test(text)) return say(`Sure, I'll wait right here. 🛑`, [{ tool: 'villager_stay', args: { id: v.id } }]);
    if (/\b(dance|party|sing|music|song|boogie|wiggle)\b/.test(text)) return say(`Dance party! 💃🎵 La la la!`, [{ tool: 'villager_dance', args: { id: v.id } }, { tool: 'player_dance', args: {} }]);
    if (/\b(gift|present|give me|can i have something|something for me|treat)\b/.test(text)) return say(`Of course! Here you go! 🎁`, [{ tool: 'villager_talk', args: { id: v.id, choice: 'gift' } }]);

    // --- World changes ---
    if (/\b(night|dark|stars|bedtime|moon)\b/.test(text) && !/\b(what|is it|why)\b/.test(text)) return say(`Nighty night! 🌙 Look at the stars!`, [{ tool: 'time_set', args: { mode: 'night' } }]);
    if (/\b(morning|daytime|wake up|make it day|sun come)\b/.test(text)) return say(`Rise and shine! ☀️`, [{ tool: 'time_set', args: { mode: 'day' } }]);
    if (/\brain\b/.test(text) && !BUILD_VERB.test(text)) return say(`Pitter patter! 🌧️ Grab a coat!`, [{ tool: 'weather_set', args: { weather: 'rain' } }]);
    if (/\bsnow\b/.test(text) && !BUILD_VERB.test(text)) return say(`Snow day! ❄️ Let's make a snowman!`, [{ tool: 'weather_set', args: { weather: 'snow' } }]);
    if (/\b(sunny|nice weather|stop rain|no rain|sunshine)\b/.test(text)) return say(`Sunshine it is! 😎`, [{ tool: 'weather_set', args: { weather: 'sunny' } }]);

    // --- Friends and rides ---
    if (/\b(puppy|dog|doggy)\b/.test(text)) return say(`A puppy for you! 🐶 Take good care of it!`, [{ tool: 'pet_adopt', args: { kind: 'dog' } }]);
    if (/\b(kitty|cat|kitten)\b/.test(text)) return say(`A kitty! 🐱 So soft!`, [{ tool: 'pet_adopt', args: { kind: 'cat' } }]);
    if (/\b(bunny|rabbit)\b/.test(text)) return say(`Hop hop! 🐰 Here comes a bunny!`, [{ tool: 'entity_spawn', args: { kind: 'bunny' } }]);
    const rideKind = /\b(plane|airplane|aeroplane|jet)\b/.test(text) ? 'plane' : /\b(helicopter|chopper|heli)\b/.test(text) ? 'helicopter' : /\b(motorbike|motorcycle|bike)\b/.test(text) ? 'motorcycle' : /\bboat\b/.test(text) ? 'boat' : /\bcar\b/.test(text) && !/\bcarpet\b/.test(text) ? 'car' : null;
    if (/\b(hop off|get off|get out|stop (driving|flying|riding)|land)\b/.test(text)) return say(`Okay, hopping off! 🛑`, [{ tool: 'vehicle_stop', args: {} }]);
    if (rideKind && /\b(fly|drive|ride|pilot|take|go in|get in|hop in)\b/.test(text) && /\b(that|the|this|your|my|a)\b/.test(text)) {
      const verb = rideKind === 'plane' || rideKind === 'helicopter' ? 'fly' : 'drive';
      return say(`Watch me ${verb} it! ${rideKind === 'plane' ? '✈️' : rideKind === 'helicopter' ? '🚁' : rideKind === 'boat' ? '⛵' : rideKind === 'motorcycle' ? '🏍️' : '🚗'} Wheee!`, [{ tool: 'vehicle_ride', args: { kind: rideKind } }]);
    }
    if (/\b(fly|flying|wings)\b/.test(text) && !/\b(butterfly|fly (a )?(plane|kite))\b/.test(text)) {
      const off = /\b(stop|land|no more|down)\b/.test(text);
      return say(off ? `Coming in to land! 🛬` : `Up, up, and away! 🪽 Hold Jump to rise, Sneak to come down.`, [{ tool: 'player_fly', args: { on: !off } }]);
    }
    if (/\b(chick|chicken|birdie)\b/.test(text)) return say(`Cheep cheep! 🐤`, [{ tool: 'entity_spawn', args: { kind: 'chick' } }]);
    if (/\bbutterfly\b/.test(text)) return say(`A butterfly! 🦋 So pretty!`, [{ tool: 'entity_spawn', args: { kind: 'butterfly' } }]);
    if (/\bcar\b/.test(text) && !/\bcarpet\b/.test(text)) return say(`Vroom vroom! 🚗 Here's a car!`, [{ tool: 'vehicle_spawn', args: { kind: 'car' } }]);
    if (/\bboat\b/.test(text)) return say(`Ahoy! ⛵ Put it on the water!`, [{ tool: 'vehicle_spawn', args: { kind: 'boat' } }]);
    if (/\b(motorbike|motorcycle|bike)\b/.test(text)) return say(`Brrrm! 🏍️ Lean into the turns!`, [{ tool: 'vehicle_spawn', args: { kind: 'motorcycle' } }]);
    if (/\b(plane|airplane|aeroplane|jet)\b/.test(text)) return say(`✈️ Go fast, then hold Jump to take off!`, [{ tool: 'vehicle_spawn', args: { kind: 'plane' } }]);
    if (/\b(helicopter|chopper|heli)\b/.test(text)) return say(`🚁 Hold Jump to lift off!`, [{ tool: 'vehicle_spawn', args: { kind: 'helicopter' } }]);

    // --- Chit-chat ---
    if (/\b(hi|hello|hey|howdy|yo|good morning|good night)\b/.test(text)) return say(`Hi there! I'm ${v.name} the ${v.jobLabel}! 👋`);
    if (/\b(who are you|your name|what do you do|your job|what are you)\b/.test(text)) return say(`I'm ${v.name}, the ${v.jobLabel} of this town! I can build things for you. 🔨`);
    if (/\b(how are you|you ok|feeling|how's it going)\b/.test(text)) return say(`I'm great! It's a beautiful day to build. 😊`);
    if (/\b(thank|thanks|love you|awesome|cool|great job|good job|nice)\b/.test(text)) return say(`Aww, thank you! You're the best! 💛`);
    if (/\b(bye|goodbye|see you|later)\b/.test(text)) return say(`Bye bye! Come back soon! 👋`);
    if (/\b(joke|funny)\b/.test(text)) return say(`Why did the block go to school? To get a little smarter! 😆`);
    if (/\b(help|what can (you|we) do|what should we do|what (do|can) we do|what to do|what now|ideas|bored)\b/.test(text)) {
      return say(`I can build a house, a castle, a pyramid, a tower, a bridge, a pool, a tree… any color you like! Or say "follow me", "dance", or "make it night". 🏠🏰🔺`);
    }
    return say(`Hmm, I'm not sure about "${ctx.message.slice(0, 40)}". Try "build a pink house", "make a pyramid", "what color is the sky", or "let's dance"! 😊`);
  }
}

/** Quarter turns from a camera yaw, matching CameraSystem.rotationQuarter. */
export function rotationFromYaw(yaw: number): number {
  const turns = Math.round(-yaw / (Math.PI / 2));
  return ((turns % 4) + 4) % 4;
}

/** The block whose label (or id) appears in the text; longest match wins. */
export function findBlock(text: string, blocks: Array<{ id: string; label: string }>): { id: string; label: string } | null {
  let best: { id: string; label: string } | null = null;
  for (const b of blocks) {
    const label = b.label.toLowerCase();
    const id = b.id.replace(/_/g, ' ');
    const hit = text.includes(label) ? label : text.includes(id) ? id : null;
    if (hit && (!best || hit.length > best.label.length)) best = { id: b.id, label: b.label.toLowerCase() };
  }
  return best;
}
