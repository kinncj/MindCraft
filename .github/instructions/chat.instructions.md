---
applyTo: "src/engine/chat/**/*.ts"
---

Three layers: the written word lists win, the small trained model in the bundle fills
the gaps, the optional downloaded helper only adds conversation. A building request is
always rebuilt from the child's own words, whatever a model replies.

To teach something new: label in `intentFeatures.ts`, words in `intentCorpus.ts`, an
exact pattern in `buildRequest.ts`, `npm run train:intent`, and a sentence added to
`tests/unit/intent.test.ts`. Full playbook: `docs/contributing/teach-the-model.md`.
