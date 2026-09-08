# Add a block

Blocks are data. One entry in the catalog gives you a block that renders, lights,
collides, can be crafted, saved, exported, and asked for by name in chat.

## Steps

1. **Pick a permanent numeric id.** `src/engine/blocks/blocks.ts` groups ids by
   range (ground 1–19, building 20–39, nature 60–79, light 80–99, special 100+,
   friends 110+). Add at the **end of its range**. Numeric ids are permanent: a
   saved world stores them, so never renumber and never reuse one.
2. **Add the definition** to the catalog:

   ```ts
   { id: 'lantern_post', numericId: 96, label: 'Lantern Post', category: 'light',
     emoji: '🏮', color: '#ffd94a', lightLevel: 12, shape: 'fence',
     textures: { top: 'lantern', side: 'lantern', bottom: 'lantern' } }
   ```

   Behaviour, shape, collision, light and textures all live here. **Engine code
   must never compare a block id to a string** — if your block needs to act, give
   it a `behavior` or a shape module instead.
3. **Paint its texture** in `src/engine/blocks/textures/painters.ts` if it needs
   one of its own. Textures are drawn in code — no image files.
4. **A new shape?** Add a module in `src/engine/blocks/shapes/index.ts` with its
   quads and collision boxes, and use its name in the definition.
5. **Let kids reach it**: the palette shows every non-spawn block automatically.
   For crafting, add a recipe in `src/engine/crafting/recipes.ts`.

## Check it

```bash
npm test                     # blocks.test.ts checks ids are unique and permanent
npm run lint
```

Add a case to `tests/unit/blocks.test.ts` if the block has behaviour, and to
`tests/unit/mesher.test.ts` if it has an unusual shape or render bucket.

## Gotchas

- A block that renders as a plant belongs in the `plants` render bucket, not
  `alpha`: far-away plants are dropped on weak GPUs, glass and ladders are not.
- `collision: 'none'` still blocks nothing but is still pickable — that is what
  flowers do.
- Anything that stores things needs `behavior: containerBehavior` and shows up in
  the storage sheet automatically.
