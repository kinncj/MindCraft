# ADR-0016: A small model of our own, trained on how kids type

Status: accepted (2026-09-07)

Originating idea: Kinn. A didactic walkthrough of how the model was built lives
in `docs/ai/how-we-built-the-little-model.md`.

## Context

Free-form building has to work for every child on every device (ADR-0015).
The word lists carry it a long way, but a six-year-old types "hosptial",
"skool", "a brige across the river", "somewhere for the sick people to go".
The optional helper model (ADR-0012) handles phrasing like that — when a
grown-up has downloaded it, on a device that can run it. Everyone else falls
back to the word lists, and the word lists say nothing.

Training a general small language model of our own was considered and
rejected: pretraining needs GPUs and a hosted download, and the result would
still be worse at chatting than the 0.5B model we already offer. The gap
worth closing is narrower than chat — recognising *which* of the things the
generator can already build a child is asking for.

## Decision

Ship a tiny model trained in this repo, inside the bundle.

- **What it is.** A multinomial logistic regression over hashed features:
  word unigrams and bigrams, character 3- and 4-grams, the first four
  letters, and a rough *sound* of each word (`phonetic`, so "skool" and
  "school" both become "skl", "hosptial" and "hospital" both "hosptl").
  Words also carry where they sit ("a house with a garden" is a house; "a
  garden next to the house" is a garden). 4096 buckets × 50 labels, one
  byte per weight, 90% of the weights pruned to zero — 41.5 KB gzipped
  (43 KB of the page a child downloads, measured against a build without
  it), recorded in the generated file's own header. No download, no network, the same answer on a
  phone as on a desktop.
- **What it answers.** Which building, dig, feature, or villager action
  this is — and, because a sentence usually holds more than one, where one
  request ends and the next begins (`splitClauses`, guarded so that "a
  school with 6 classrooms and a computer room" stays one school while
  "build a school and dig a big lake and make it night" becomes three
  jobs). Everything else — sizes, colours, rooms, counts, people, flags,
  which pet, which ride — stays with the parsers, which are exact and easy
  to read.
- **What it learns from.** `intentCorpus.ts`: sentences generated from
  templates crossed with the words kids use for each thing, then knocked
  about with dropped words and typos (dropped, doubled, swapped, and
  neighbouring-key letters). The corpus lives in the repo, so what the
  model was taught is readable and can be grown. `npm run train:intent`
  rewrites `intentWeights.ts`; held-out accuracy is printed and recorded
  in the generated file's header.
- **Where it sits.** The written words always win. The model is consulted
  only when no pattern matched, and only acted on when its guess is clearly
  ahead of "this is just chatting" (`intentIsClear`). A misspelled word that
  sounds like one the parser knows is also corrected before the patterns run
  (`correctSpelling`), guarded by an edit-distance check and a list of
  ordinary words that must never be rewritten.

## Consequences

- The floor under every provider is the same: rules, built-in model, and
  helper all end up building the thing the child described.
- Growing the vocabulary means adding phrasings to the corpus and
  retraining, not writing more regular expressions.
- The model can be wrong. It is gated by confidence, and a shrug is the
  designed failure: the villager asks what the child meant instead of
  building the wrong thing.

## Addendum (2026-09-07): what one real sentence taught us

A child typed "build a school with 6 classrooms and a computer room, and dig a
big lake and then an airport with an airstrip for airplanes." and got only the
school. Three separate faults, all now covered by tests:

1. The clause splitter matched ", " before ", and ", so the second request began
   with a stray "and" and was rejected. Separators are now matched longest-first.
2. There was no such thing as an airport or a runway. Both are generated now: an
   airport is a glass terminal with a control tower and a runway beside it, and a
   runway is a long tarmac strip with a dashed centre line, threshold bars, edge
   lights, and eight blocks of clear air for the wings. Rides named in the
   sentence ("for airplanes") are parked there.
3. Public buildings (airport, hospital, shop) now get sliding doors by default,
   which is both how real ones work and what makes a one-wide doorway usable
   without stopping to open it.

Blocks are centred on their coordinates (the physics rounds), so a one-wide
doorway is walked down its middle. A test now walks a character through a plain
house door for exactly that reason.
