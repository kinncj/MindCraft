---
applyTo: "tests/**/*.ts"
---

Unit tests run in Vitest; browser tests in Playwright (`npm run test:e2e`).

A test earns its place by failing without the change it covers. Anything a character
walks through — doors, stairs, tunnels, bridges, ladders — is proven by driving the real
`PlayerController`, not by asserting a rule. Blocks are centred on their coordinates, so
a one-wide doorway is walked down its middle.

Browser tests start the game with `?mouse=tap` (click-to-build); `{ mouse: 'game' }`
drives the desktop grab-the-pointer scheme.
