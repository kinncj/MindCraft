---
mode: agent
description: Add a block to MindCraft
---

Follow the playbook in [docs/contributing/add-a-block.md](../../docs/contributing/add-a-block.md),
obeying the rules in [AGENTS.md](../../AGENTS.md).

Add: ${input:what:What should be added?}

Finish with `npm test` and `npm run lint` green, and include a test that fails
without the change.
