---
mode: agent
description: Teach the sentence model something new
---

Follow the playbook in [docs/contributing/teach-the-model.md](../../docs/contributing/teach-the-model.md),
obeying the rules in [AGENTS.md](../../AGENTS.md).

Add: ${input:what:What should be added?}

Finish with `npm test` and `npm run lint` green, and include a test that fails
without the change.
