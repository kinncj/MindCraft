# Teach the model something new

MindCraft ships its own small language-understanding model (~42 KB, trained in
this repo, no download). It turns a child's sentence into the things the game can
build. The full story is in
[`docs/ai/how-we-built-the-little-model.md`](../ai/how-we-built-the-little-model.md);
this is the recipe.

## Add a new thing the villagers understand

1. **A label** in `src/engine/chat/intentFeatures.ts` — one of `BUILDING_LABELS`,
   `EARTHWORK_LABELS`, `FEATURE_LABELS`, or `ACTION_LABELS`.
2. **Words for it** in `src/engine/chat/intentCorpus.ts`: the plain name first,
   then the roundabout ways a kid says it.

   ```ts
   lighthouse: ['lighthouse', 'light house', 'tower with a big light',
                'place that shines a light out to sea'],
   ```

   For an action (not a building), write whole sentences in `ACTION_SENTENCES`.
3. **An exact pattern** in `src/engine/chat/buildRequest.ts` (`TYPE_WORDS`,
   `EARTHWORK_WORDS`, `STANDALONE_FEATURES`) plus its defaults, so the words work
   even without the model. **The words always win; the model fills the gaps.**
4. **Something to build**: a generator case (see
   [add-a-building.md](add-a-building.md)) or an action in
   `src/engine/chat/requests.ts`.
5. **Retrain and test**:

   ```bash
   npm run train:intent      # rewrites src/engine/chat/intentWeights.ts
   npm test
   ```

## Teach it better spelling or phrasing

Add sentences to `intentCorpus.ts` and retrain. The corpus is generated from
templates crossed with label words, then knocked about with typos, so a handful of
new phrasings becomes thousands of training sentences.

## Rules of thumb

- **Add negatives too.** If a phrase should mean nothing, put it in `CHIT_CHAT`;
  without enough of those, everything starts to look like a building request.
- **Watch the size.** A test fails if the weights pass 50 KB gzipped. If they do,
  raise `PRUNE` in `scripts/train-intent.ts` and check the tests still pass —
  accuracy on paper is not the contract, the sentences in
  `tests/unit/intent.test.ts` are.
- **Add a sentence to the tests**, not just to the corpus. A model that only
  passes on its own training data has taught you nothing.
- The docs quote the model's shape and size, and a test checks they still match.
  Retraining updates the generated header for you.
