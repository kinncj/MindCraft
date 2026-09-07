import type { ChatAction, ChatContext, ChatProvider, ChatReply } from './types';

/**
 * Works everywhere, understands the things a six-year-old actually asks
 * for, and never says anything it was not written to say. Also the
 * fallback when a smarter provider fails.
 */

const BLUEPRINT_WORDS: Array<[RegExp, string, string]> = [
  [/\b(house|home|cottage)\b/, 'cozy_house', '🏠 a cozy house'],
  [/\b(castle|tower|fort)\b/, 'castle_tower', '🏰 a castle tower'],
  [/\bbridge\b/, 'bridge', '🌉 a bridge'],
  [/\b(garden|flowers?)\b/, 'garden', '🌷 a flower garden'],
  [/\b(pool|swimming)\b/, 'pool', '🏊 a swimming pool'],
  [/\b(tree ?house|treehouse)\b/, 'treehouse', '🌳 a treehouse'],
];

const BUILD_VERB = /\b(build|make|put|create|stamp|place|construct)\b/;

export class RuleChatProvider implements ChatProvider {
  readonly name = 'rules';

  async available(): Promise<boolean> {
    return true;
  }

  async reply(ctx: ChatContext): Promise<ChatReply> {
    const text = ctx.message.toLowerCase().trim();
    const v = ctx.villager;
    const say = (s: string, actions: ChatAction[] = []): ChatReply => ({ say: `${v.emoji} ${s}`, actions });
    const at = ctx.site;

    if (!text) return say(`Hi! I'm ${v.name} the ${v.jobLabel}. What should we do?`);

    // Building.
    for (const [pattern, blueprint, label] of BLUEPRINT_WORDS) {
      if (pattern.test(text) && (BUILD_VERB.test(text) || /\b(please|now|here)\b/.test(text))) {
        return say(`On it! I'll build ${label} right over there. Watch me go! 🔨`, [
          { tool: 'build_stamp_blueprint', args: { blueprint, x: at.x, y: at.y, z: at.z, rotation: rotationFromYaw(ctx.player.yaw) } },
        ]);
      }
    }
    // World.
    if (/\b(night|dark|stars|bedtime|moon)\b/.test(text)) return say(`Nighty night! 🌙 Look at the stars!`, [{ tool: 'time_set', args: { mode: 'night' } }]);
    if (/\b(morning|day|daytime|sun|wake up)\b/.test(text)) return say(`Rise and shine! ☀️`, [{ tool: 'time_set', args: { mode: 'day' } }]);
    if (/\brain\b/.test(text) && !BUILD_VERB.test(text)) return say(`Pitter patter! 🌧️ Grab a coat!`, [{ tool: 'weather_set', args: { weather: 'rain' } }]);
    if (/\bsnow\b/.test(text) && !BUILD_VERB.test(text)) return say(`Snow day! ❄️ Let's make a snowman!`, [{ tool: 'weather_set', args: { weather: 'snow' } }]);
    if (/\b(sunny|nice weather|stop rain|no rain)\b/.test(text)) return say(`Sunshine it is! 😎`, [{ tool: 'weather_set', args: { weather: 'sunny' } }]);

    // Friends and rides.
    if (/\b(puppy|dog|doggy)\b/.test(text)) return say(`A puppy for you! 🐶 Take good care of it!`, [{ tool: 'pet_adopt', args: { kind: 'dog' } }]);
    if (/\b(kitty|cat|kitten)\b/.test(text)) return say(`A kitty! 🐱 So soft!`, [{ tool: 'pet_adopt', args: { kind: 'cat' } }]);
    if (/\b(bunny|rabbit)\b/.test(text)) return say(`Hop hop! 🐰 Here comes a bunny!`, [{ tool: 'entity_spawn', args: { kind: 'bunny' } }]);
    if (/\bcar\b/.test(text) && !/\bcarpet\b/.test(text)) return say(`Vroom vroom! 🚗 Here's a car!`, [{ tool: 'vehicle_spawn', args: { kind: 'car' } }]);
    if (/\bboat\b/.test(text)) return say(`Ahoy! ⛵ Put it on the water!`, [{ tool: 'vehicle_spawn', args: { kind: 'boat' } }]);

    const block = findBlock(text, ctx.blocks);
    if (block && BUILD_VERB.test(text)) {
      const count = /\b(wall|row|line|lots|many|bunch)\b/.test(text) ? 'wall' : 'one';
      if (count === 'wall') {
        return say(`A wall of ${block.label}! Coming right up. 🧱`, [
          { tool: 'world_fill', args: { x1: at.x - 2, y1: at.y, z1: at.z, x2: at.x + 2, y2: at.y + 2, z2: at.z, block: block.id } },
        ]);
      }
      return say(`One ${block.label}, coming up! ✨`, [{ tool: 'world_place_block', args: { x: at.x, y: at.y, z: at.z, block: block.id } }]);
    }
    if (/\b(room|walls|floor)\b/.test(text) && BUILD_VERB.test(text)) {
      return say('A little room! I love building rooms. 🏠', [
        { tool: 'build_room', args: { x1: at.x - 3, y1: at.y - 1, z1: at.z - 3, x2: at.x + 3, z2: at.z + 3, block: 'planks' } },
      ]);
    }

    // Company.
    if (/\b(follow|come with|come here|come on|with me|let'?s go|walk with)\b/.test(text)) {
      return say(`Okay! I'll come along! 🚶`, [{ tool: 'villager_talk', args: { id: v.id, choice: 'play' } }]);
    }
    if (/\b(stay|stop|wait|sit)\b/.test(text)) {
      return say(`Sure, I'll wait right here. 🛑`, [{ tool: 'villager_stay', args: { id: v.id } }]);
    }
    if (/\b(dance|party|sing|music|song)\b/.test(text)) {
      return say(`Dance party! 💃🎵 La la la!`, [{ tool: 'audio_play', args: { sound: 'happy' } }, { tool: 'villager_talk', args: { id: v.id, choice: 'play' } }]);
    }
    if (/\b(gift|present|give me|can i have|something for me|treat)\b/.test(text)) {
      return say(`Of course! Here you go! 🎁`, [{ tool: 'villager_talk', args: { id: v.id, choice: 'gift' } }]);
    }

    // Chit-chat.
    if (/\b(hi|hello|hey|howdy|yo|good morning)\b/.test(text)) return say(`Hi there! I'm ${v.name} the ${v.jobLabel}! 👋`);
    if (/\b(who are you|your name|what do you do|your job|what are you)\b/.test(text)) return say(`I'm ${v.name}, the ${v.jobLabel} of this town! I can build things for you. 🔨`);
    if (/\b(how are you|you ok|feeling)\b/.test(text)) return say(`I'm great! It's a beautiful day to build. 😊`);
    if (/\b(thank|thanks|love you|awesome|cool|great job)\b/.test(text)) return say(`Aww, thank you! You're the best! 💛`);
    if (/\b(bye|goodbye|see you|later)\b/.test(text)) return say(`Bye bye! Come back soon! 👋`);
    if (/\b(help|what can you do|ideas)\b/.test(text)) {
      return say(`I can build a house, a castle, a bridge, a garden, a pool, or a treehouse! Or say "follow me", "dance", or "make it night". 🏠🏰🌉`);
    }
    return say(`Hmm! Try "build a house", "follow me", "make it rain", or "give me a gift"! 😊`);
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
