# Contributing to MindCraft (with or without an AI assistant)

Every common job has a playbook here. They are the single source of truth: the
assistant configs for each tool are thin wrappers that point back at these files, so
there is one place to keep correct.

| Playbook | What it covers |
|---|---|
| [add-a-block.md](add-a-block.md) | A new block: catalog entry, permanent id, texture, shape |
| [add-a-character.md](add-a-character.md) | A villager job, a pet, or a wild creature (and retraining its brain) |
| [add-a-scenario.md](add-a-scenario.md) | A prebuilt world drawn with `MapBuilder` |
| [add-a-tool.md](add-a-tool.md) | A capability in the tool registry — which is also the MCP surface |
| [teach-the-model.md](teach-the-model.md) | Teaching the in-bundle sentence model new things kids can ask for |
| [add-a-building.md](add-a-building.md) | A building type, outdoor feature, or dig for the generator |
| [add-a-monument.md](add-a-monument.md) | A famous place, drawn in blocks, and the cities that bring several at once |
| [configuration.md](configuration.md) | Where everything configurable lives, and what is not configurable |

The rules that override everything are in [`AGENTS.md`](../../AGENTS.md) (the same rules
as `CLAUDE.md`). The design decisions behind them are the ADRs in
[`docs/architecture/`](../architecture).

## Assistant setup, per tool

Each of these reads the same playbooks. A test (`tests/unit/agentConfigs.test.ts`)
checks that every pointer still resolves and every file carries the frontmatter its
tool expects.

| Tool | Files | Notes |
|---|---|---|
| **Claude Code** | `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `.claude/commands/*.md`, `CLAUDE.md` | Three subagents (builder, model-trainer, reviewer), six skills, six `/mindcraft-*` commands |
| **Cursor** | `.cursor/rules/*.mdc`, `.cursor/commands/*.md` | One always-on rule plus path-scoped rules for the engine and chat |
| **GitHub Copilot** | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`, `.github/prompts/*.prompt.md` | Repo-wide instructions, path-scoped instructions, prompt files |
| **Kiro** | `.kiro/steering/*.md` | One always-included steering doc, two matched by file pattern |
| **Qwen Code** | `QWEN.md`, `.qwen/commands/*.toml` | Context file plus TOML commands |
| **opencode** | `AGENTS.md`, `.opencode/command/*.md`, `.opencode/agent/*.md` | Reads `AGENTS.md` natively |
| **Anything else** — Codex, Jules, Hermes, Pi, Aider, Continue, Cline… | [`AGENTS.md`](../../AGENTS.md) | `AGENTS.md` is the portable brief; point the tool at it and at `docs/contributing/` |

The formats above follow each tool's documented convention at the time of writing.
They are plain Markdown (and one TOML), so if a tool changes its format the content
still reads fine — and the playbooks it points to are the part that matters.

## Adding support for another tool

1. Create whatever file that tool reads.
2. Make it three things: the non-negotiable rules, a pointer to `AGENTS.md`, and a
   pointer to the relevant playbook in this folder. Do not restate the playbook.
3. Add its directory to `CONFIG_DIRS` in `tests/unit/agentConfigs.test.ts` so its
   pointers are checked too.
4. Add a row to the table above.
