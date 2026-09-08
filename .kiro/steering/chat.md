---
inclusion: fileMatch
fileMatchPattern: 'src/engine/chat/**/*.ts'
---

Word lists win, the in-bundle trained model fills the gaps, a downloaded helper only
adds conversation. Building requests are always rebuilt from the child's own words.

Teaching it something new: `docs/contributing/teach-the-model.md`, then
`npm run train:intent` and a new sentence in `tests/unit/intent.test.ts`.
