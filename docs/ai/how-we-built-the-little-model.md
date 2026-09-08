# How we built MindCraft's little model

*A walkthrough of the small language-understanding model that ships inside the
game: what it is, why it exists, how it was trained, and how to change it.*

Training a model of our own was **Kinn's idea, and his alone**. The question was
put plainly — *"should we train our very own small model, like an SLM, to ensure
it can understand natural language?"* — followed by the standard he wanted it
held to: *"it needs to be badass."* The instinct was right, though not in the
shape it first sounds like. This document is the long answer.

---

## 1. The problem

MindCraft has one hard rule: **no backend, no accounts, no network at runtime.**
A child types something to a villager and the game has to work out what they
meant, on the device, offline, on a phone as easily as a desktop.

Kids type like this:

```
build me a beautiful and colourful brick and mortar mansion, like a massive house
i want a skool with 6 clasrooms and a computr room
can you put up a big hosptial for me
build a school with 6 classrooms and a computer room, and dig a big lake and
then an airport with an airstrip for airplanes.
somewhere for the sick people to go
```

Word lists get you a long way. They do not get you `hosptial`, and they do not
tell you that the last sentence contains *three* requests while the first
contains *one*.

There is an optional downloadable helper (Qwen2.5, ADR-0012) that handles all of
this beautifully — for the children whose grown-up downloaded 400 MB of weights
onto a device that can run them. That is a minority. The floor under everyone
else had to get better.

## 2. Why not train a real language model

The honest answer to *"can we train our own SLM?"*:

| Option | What it costs | What you get |
|---|---|---|
| Pretrain a small LLM from scratch | GPU-months, billions of tokens, a hosted download | Something worse than a 0.5B model that already exists |
| Fine-tune an existing 0.5B model (LoRA) | A training rig, an MLC/WebGPU compile step, a hosted download | Better tool-calling, still a 400 MB download, still not offline for everyone |
| **Train a tiny task model in-repo** | **Minutes on a laptop, ~42 KB in the bundle** | **Understands the sentences this game actually gets** |

The third one wins because the task is narrow. The villager does not need to
discuss the weather in prose. It needs to know: *which of the things I can build
is this, and how many things did the child just ask for?* That is a
classification problem, and classification is exactly what a small linear model
is good at.

So: **not an LLM. A trained language-understanding model, shipped in the
bundle.**

## 3. The three layers

```
  the child's words
        │
        ▼
  ┌───────────────┐   exact, readable, always right when it matches
  │  word lists   │   "hospital" → hospital, "30 by 20" → 30 × 20
  └───────┬───────┘
          │ nothing matched
          ▼
  ┌───────────────┐   trained here, 42 KB, offline, every device
  │ little model  │   "hosptial" → hospital, and where one request ends
  └───────┬───────┘
          │ still nothing
          ▼
  ┌───────────────┐   optional, downloaded on purpose by a grown-up
  │ helper (LLM)  │   chats nicely; its building calls are still replaced
  └───────────────┘   by what the words say
```

The order matters. **The written words always win.** The model is only asked
when the patterns say nothing, and its answer is only used when it is confident.
Even when the big helper model is loaded, the *building* it asks for is replaced
by the one the child's words describe — a 0.5B model copies the example in its
prompt more often than you would like.

## 4. What the model is

A **multinomial logistic regression over hashed features**. In plain terms:

1. Turn a sentence into a bag of little clues (each clue is a number).
2. Every clue has a weight for every possible answer.
3. Add up the weights for the clues present, per answer.
4. The biggest total wins; a softmax turns the totals into probabilities.

That is the entire model. It has no hidden layers and no attention. Its power
comes almost entirely from **choosing good clues**, which is where the
interesting work went.

Current shape (from the generated header of `src/engine/chat/intentWeights.ts`):

```
8192 hashed feature buckets × 78 labels
one byte per weight, 90% of them pruned to zero
134,841 generated training sentences
held-out accuracy 97.8%
126 KB gzipped — 832 KB of base64 in the source
```

Two numbers get quoted for size, and they measure different things: **41.5 KB**
is the weights on their own, gzipped, which is what the training run prints and
what the generated file's header records. **43 KB** is what a child's browser
actually pays for them — the gzipped page with the model minus the gzipped page
without it, slightly more because compressed base64 does not overlap with the
code around it. Either way the model is a rounding error next to Three.js.

The training script measures this on every run and writes it into the header, and
a unit test checks the header against the file and fails if the weights ever grow
past 50 KB. That is deliberate: an earlier version of this model was 15 KB, the
README said so for a while after it had grown, and nobody noticed until a reader
did.

## 5. The clues (features)

`src/engine/chat/intentFeatures.ts`. For every word in the sentence we add:

| Clue | Example from `build a big skool` | Why it exists |
|---|---|---|
| the word | `w:skool` | the obvious one |
| the pair of words | `b:big skool` | "computer room" is not "computer" |
| where it sits | `e:skool` (early) / `l:...` (late) | *a house with a garden* is a house; *a garden by the house* is a garden |
| letter runs of 3 and 4 | `c:<sk`, `c:skoo`, `c:ool>` | survives a wrong letter or two |
| the first four letters | `p:skoo` | kids get the end of a word wrong more than the start |
| how the word **sounds** | `k:skl` | the one that does the heavy lifting |

The sound clue is a tiny phonetic key: collapse letters that sound alike, drop
doubled letters, keep only the first vowel.

```
school   → skl      skool    → skl       ← same clue, so both find "school"
hospital → hsptl    hosptial → hsptl
castle   → kstl     castel   → kstl
lake     → lk       laek     → lk
```

Before this clue existed the model got 9 of 12 misspelled test sentences right.
After it: 12 of 12. Letter n-grams alone do not survive a transposition in the
middle of a word — `hosptial` and `hospital` share almost no 4-grams — but they
sound identical, and kids spell by sound.

Every clue is hashed (FNV-1a) into one of 8192 buckets, and the vector is
L2-normalised so a long sentence does not shout over a short one. Hashing means
we never ship a vocabulary; collisions are absorbed during training. A short
sentence produces around 40 clues.

## 6. The teaching material

`src/engine/chat/intentCorpus.ts` — the whole training set is **generated in the
repo**, so anyone can read exactly what the model was taught and add to it.

**Label words**: how a kid names each thing, including the roundabout ways.

```ts
hospital: ['hospital', 'clinic', 'doctors office', 'medical centre',
           'place where sick people go', 'place with doctors',
           'place where you get better', 'emergency room'],
```

**Templates** crossed with those words, with adjectives and trailing bits:

```
'build me a {}', 'can you make me a {}', 'i want a {}', 'lets build a {}', …
× '', 'big ', 'huge ', 'tiny ', 'pink ', 'brick ', 'beautiful ', …
× '', ' with three floors', ' with a garden', ' with lots of classrooms', …
```

**Typos, the way a six-year-old makes them** — a letter dropped, a letter
doubled, two letters swapped, or a neighbouring key hit:

```ts
export function typo(word, rand) { … }        // one of the four, at random
export function typoPhrase(phrase, rand) { … } // aimed at the longest word
```

Two knocked-about copies of every sentence go in alongside the clean one, and
the *head noun* gets its own misspelled variants, because that is the word a kid
gets wrong and the word the answer depends on.

**Actions**, written out plainly — follow, stay, dance, gift, night, day, rain,
snow, sunshine, pets, creatures, riding, spawning a ride, flying, landing,
hopping off, shapes, greetings, questions.

**Negatives**, so it learns to say nothing: `'i had pizza for lunch'`, `'blah
blah blah'`, `'my brother is six'`. Without a healthy pile of these, everything
starts to look like a building request.

That grammar expands to 77,490 sentences, 10% held out for testing.

## 7. Training

`scripts/train-intent.ts`, run with `npm run train:intent`. It is plain
TypeScript run by Node's built-in type stripping — no training framework, no
Python, no dependencies at all.

```
134841 sentences, 78 labels, 8192 buckets
epoch 5:  loss 0.1051
epoch 10: loss 0.0673
epoch 20: loss 0.0458
epoch 30: loss 0.0394
train accuracy 99.5%, held out 97.5%
```

Stochastic gradient descent on cross-entropy: shuffle the sentences, take each
one, work out what the model currently believes, nudge every weight that was
involved towards the right answer. The learning rate decays over 30 epochs, and
a whisper of L2 keeps the weights from running away. A full run takes about
55 seconds on a laptop, single-threaded, with nothing installed.

## 8. Making it small enough to ship

Two steps, in this order:

**Quantise.** Weights are floats; we keep one byte each. Divide every weight by
the largest magnitude, round to −127…127, store as base64 with the scale
alongside. Accuracy is unchanged at this resolution.

**Prune.** Most buckets say nothing about most labels. Zeroing the smallest 90%
of the weights costs half a point of accuracy and makes the file compress far
better, because a run of zeros is nearly free in gzip:

| Buckets | Pruned | Held-out | Weights alone, gzipped | Verdict |
|---|---|---|---|---|
| 4096 | 90% | 98.0% | 57.2 KB | fine until the labels grew |
| 4096 | 93% | 97.3% | 44.4 KB | small, but real sentences started failing |
| 8192 | 80% | 98.1% | 173.5 KB | best of all, and not worth the bytes |
| **8192** | **90%** | **97.8%** | **126.2 KB** | **what ships** |
| 8192 | 97% | 97.0% | 46.3 KB | squeezed; one or two sentences slip |
| 8192 | 98% | 96.7% | 40.2 KB | "can we have a storm" → a shop |

Two things to take from that table.

**More buckets pruned harder beats fewer buckets kept denser.** At the same file
size, 8192 buckets at 97% read more sentences correctly than 4096 at 93%, because
most of the loss at 4096 was hash collisions rather than missing weights. When the
labels nearly doubled (50 → 70, after the monuments), widening the table was the
fix, not shrinking it.

**Size is measured against the alternative.** A downloaded helper model is 400 MB
and up. This one ships with the page, so it only has to stay a small fraction of
it; the test's line is a megabyte, and under that the model is trained for
accuracy rather than for bytes. Chasing tens of kilobytes was costing real
sentences.

Some failures are fixed by teaching, not tuning: "wait right here until i come
back", "can we have a storm" and "plant a tree" (which briefly built a *tree
house*) each got more phrasings in the corpus, and then even the squeezed model
handled them. That is the usual answer.

(Measured on this corpus with a 30-epoch run; each run takes about a minute on a
laptop.)

The tests decide, not the accuracy number. At 93% the held-out score barely
moves but sentences a child would actually type start breaking, which is why the
setting is 90% (`PRUNE` in the training script, overridable via the environment
for experiments).

## 9. Using it at runtime

`src/engine/chat/intent.ts` decodes the base64 into a `Float32Array` once, then
scoring a sentence is one pass over ~40 clues per label — microseconds.

Two things it returns beyond the label:

- `confidence` — the softmax probability of the winner.
- `none` — the probability that this is not a request at all.

And the gate that decides whether to act:

```ts
export function intentIsClear(intent: Intent): boolean {
  if (intent.kind === 'none') return false;
  return intent.confidence >= 0.25 && intent.confidence > intent.none * 6;
}
```

Why a *margin over `none`* rather than a plain threshold? Because a second
misspelling in the same sentence spreads probability around without changing the
ranking. `i want a skool with 6 clasrooms` ranked "school" first but with only
0.275 confidence — a flat threshold rejected a perfectly good answer. What
matters is how far the guess is ahead of "the child is just chatting".

## 10. Reading a whole sentence

A bag of clues cannot tell you that a sentence contains three requests. So
before classifying, the sentence is cut into clauses (`splitClauses`), and each
piece is classified on its own.

The cut points are `, and`, `and`, `then`, `also`, `plus`, `after that`, a
comma — matched **longest first**, which matters more than it sounds:

> A real bug from a real screenshot. `", "` matched before `", and "`, so the
> right-hand side began with a stray `and`, which is not how a request starts,
> so the split was rejected — and a child who asked for a school, a lake and an
> airport got only the school.

A cut is only taken when three things hold (`canSplit`):

1. **Both halves are requests on their own.** Otherwise you are cutting a noun
   phrase in half.
2. **The right-hand side starts like a new request** — a verb (`build`, `dig`,
   `make`) or a determiner and a noun (`a treehouse`) — and, in the determiner
   case, names something different from the left-hand side. This is what keeps
   *"a beautiful and colourful mansion"* in one piece.
3. **The left-hand side is not still describing its own thing.** Anything after
   `with`, `made of`, `like`, `next to` belongs to what came before, so
   *"a school with 6 classrooms and a computer room"* stays one school while
   *"build a school and dig a big lake"* becomes two jobs.

Worked example — the sentence from the screenshot:

```
build a school with 6 classrooms and a computer room, and dig a big lake and
then an airport with an airstrip for airplanes.

  ↓ splitClauses
["build a school with 6 classrooms and a computer room",
 "dig a big lake",
 "an airport with an airstrip for airplanes."]

  ↓ each clause through the ordinary parsers
building school  rooms=[classroom×6, computer room×1]
earthwork lake   width=22 length=16
building airport features=[runway] vehicles=[plane]
```

## 11. Spelling help for everything else

The model handles the *kind* of thing. The numbers, colours, room names and
counts are still read by exact patterns — and those patterns deserve correct
spelling, so a small correction pass runs first (`correctSpelling`): a word that
is not in the parser's vocabulary but *sounds* like one that is, and is within
two edits of it, gets rewritten.

```
"6 clasrooms and a computr room"  →  "6 classrooms and a computer room"
"a hosptial with docters"         →  "a hospital with doctors"
```

Two guards, both added because of real breakage:

- **An edit-distance check.** Sounding alike is not enough.
- **A never-correct list** of ordinary words. `long` sounds like `lounge`, and
  `what` sounds like `white`. Without the list, *"build a long bridge"* became
  *"build a lounge bridge"* and lost its size.

Punctuation is preserved through the pass, because a comma is the only thing
keeping *"6 classrooms, a computer room"* from reading as six computer rooms.

## 12. Where it plugs into the game

```
message
  → parseRequests()            split, then parse each clause
      → parseBuildRequest()    buildings  (words first, model as fallback)
      → parseEarthwork()       digs
      → parseFeature()         bridges, treehouses, runways, playgrounds…
      → classifyIntent()       villager actions (follow, dance, weather, pets…)
  → actionsFor()               each request becomes tool calls
      → SitePlanner.place()    each one gets its own patch of open ground
  → ToolRegistry / villager work
```

The model never invents arguments. It says *"this clause is about a school"*;
the parsers say *how big, what colour, how many classrooms*; the site planner
says *where*. Each piece is separately testable, and the failure of any one of
them is legible.

## 13. Changing it

Adding a new thing the villagers understand is four steps and about ten minutes:

1. **A label** in `intentFeatures.ts` (`BUILDING_LABELS`, `EARTHWORK_LABELS`,
   `FEATURE_LABELS` or `ACTION_LABELS`).
2. **Words for it** in `intentCorpus.ts` — the plain name first, then the
   roundabout ways a kid might say it.
3. **A pattern and a default** in `buildRequest.ts`, so the exact path works too,
   and whatever the generator needs to actually build it.
4. **`npm run train:intent`**, then `npm test`.

That is exactly how airports and runways were added after a child asked for one.

**The tests are the contract**, not the accuracy number:

- `tests/unit/intent.test.ts` — sentences nobody wrote down for it, the shrug at
  chit-chat, the spelling pass.
- `tests/unit/wholeSentence.test.ts` — splitting both ways, every provider
  ending up doing the whole sentence, the exact airport sentence from the
  screenshot.
- `tests/unit/siteFinder.test.ts` — each thing on its own ground.

If a change to the corpus makes the model cleverer on paper and breaks one of
those, the change is wrong.

## 14. What it cannot do

It is worth being straight about this.

- **It does not converse.** It has no memory of the last turn and no idea what
  words mean beyond which label they point at.
- **It only knows the things this game can build.** A brand-new noun lands on
  the nearest thing it knows, or on `none`.
- **It can be wrong**, and the honest failure is the point: a villager saying
  *"Hmm, I'm not sure about that"* is better than a villager building the wrong
  thing on a child's world.

What it *is* is a floor that never disappears: every child, every device, no
download, no network, the same answer every time.

## 15. Try it

```bash
npm run train:intent          # retrain, watch the loss and held-out accuracy
PRUNE=0.95 npm run train:intent   # see how far it can be squeezed
npm test                      # see which sentences break when you go too far
```

Then open `src/engine/chat/intentCorpus.ts`, add a sentence a child in your
house would say, retrain, and watch the villager understand it.

---

*Related: `docs/architecture/adr-0016-intent-model.md` (the decision and its
consequences), `docs/architecture/adr-0015-building-generator-and-livability.md`
(what gets built once the sentence is understood), and
`docs/architecture/adr-0012-downloadable-helper-model.md` (the optional big
model).*
