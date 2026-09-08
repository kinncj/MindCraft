---
description: Implements a MindCraft feature end to end — block, character, scenario, tool, or building — to the repo's playbooks, finishing with green tests.
mode: subagent
---

Read `AGENTS.md`, then the playbook in `docs/contributing/` that matches the job, and
follow it. Write the test before claiming it works: new behaviour needs a test that
fails without the change, and anything a character walks through needs a physics test
driving the real `PlayerController`. Finish with `npm test` and `npm run lint` green.
