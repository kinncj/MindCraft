# Add a character

Villagers with jobs, pets, and wild creatures are three different things.

## A villager job (baker, doctor, …)

1. Add an entry to `JOBS` in `src/engine/entities/villagers.ts`: id, label, emoji,
   `look` (shirt, pants, skin, hair, optional hat), a `gift` block, and the four
   lines it says (greeting, gift, play, bye). Keep every line kid-safe and warm.
2. Villager names are gendered: `GIRL_NAMES` / `BOY_NAMES` in the same file, and
   the look picks long hair for girls. A new job needs no name work.
3. Give the job a favourite colour, food and thing in `FAVORITES`
   (`src/engine/chat/RuleChatProvider.ts`) so "what's your favourite food?" has an
   honest answer.
4. If a kid should be able to ask for one — "build a school with a **librarian**" —
   add the word to `PEOPLE_WORDS` in `src/engine/chat/buildRequest.ts`, and teach
   the sentence model the phrasing (see [teach-the-model.md](teach-the-model.md)).

## A pet or wild creature

1. Add the species to `SPECIES` in `src/engine/ai/features.ts`.
2. Teach the brain what it does: add its personality to the teacher in
   `scripts/train-brain.mjs`, then `npm run train:brain`, which rewrites
   `src/engine/ai/weights.ts`. The policy is ~600 weights and runs on every
   decision, offline.
3. Give it a body in `src/engine/entities/bodies.ts` and a spawn block in the
   catalog (`spawns: { kind: 'pet', variant: 'parrot' }`).
4. Add it to `entity_spawn` / `pet_adopt` in `src/engine/tools/lifeTools.ts` so
   agents and chat can ask for it.

## Check it

```bash
npm test          # neuralBrain.test.ts, entities tests
npm run lint
```

New creatures must never be hostile, never damage anything, and never speak
free text: brains decide movement only.
