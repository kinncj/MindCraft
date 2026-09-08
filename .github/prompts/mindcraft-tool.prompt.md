---
mode: agent
description: Add a capability or MCP tool
---

Follow the playbook in [docs/contributing/add-a-tool.md](../../docs/contributing/add-a-tool.md),
obeying the rules in [AGENTS.md](../../AGENTS.md).

Add: ${input:what:What should be added?}

Finish with `npm test` and `npm run lint` green, and include a test that fails
without the change.
