# Add a capability (a tool, and MCP)

Every capability in MindCraft is a tool in one registry. The UI, the villagers,
and outside agents all go through the same path, so a new tool is available to
all three at once — including over WebMCP (`navigator.modelContext`) and
`window.mindcraftTools`.

There is no MCP *server* to run: the game is the MCP surface, in the browser.

## Steps

1. **Register it** in the file that fits: `src/engine/tools/coreTools.ts` (player,
   world, history), `buildTools.ts` (building), `lifeTools.ts` (pets, rides,
   villagers), `automationTools.ts` (logic, robots).

   ```ts
   tools.register({
     name: 'weather_rainbow',                    // always domain_verb
     description: 'Puts a rainbow in the sky for a while.',
     inputSchema: { type: 'object', properties: { minutes: { type: 'integer' } } },
     execute: ({ minutes }: { minutes?: number }) => engine.environment.rainbow(minutes ?? 2),
   });
   ```

2. **Every world edit goes through a `Command`** so Undo removes it. Use
   `build.run(label, edits)` or a `SetBlocksCommand`; never write blocks directly.
3. **Villagers may only call safe tools.** To let a kid ask for it in chat, add the
   name to `CHAT_TOOL_ALLOWLIST` in `src/engine/chat/types.ts`, and — if the
   villager should do it by hand rather than instantly — to `HANDS_ON_TOOLS` in
   `ChatAgent.ts` with a `plan()` case that returns edits.
4. **Teach the words**, so a child can ask for it without knowing tool names: see
   [teach-the-model.md](teach-the-model.md).
5. **Describe it for models**: a one-line `description` and a `TOOL_TEMPLATES`
   entry in `src/engine/chat/WebLlmProvider.ts` if a downloaded helper should call it.

## Check it

```bash
npm test              # tools.test.ts asserts names, schemas, and the allowlist
npm run test:e2e      # tools.spec.ts drives them through the real browser
```

## Rules

- `domain_verb` naming, always.
- Schemas are JSON Schema and are what agents see; keep them honest and small.
- Nothing may collect data, call the network, or reach outside the tab.
