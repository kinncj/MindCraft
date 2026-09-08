import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The per-tool assistant configs (.claude, .cursor, .github, .kiro, .qwen,
 * .opencode) are thin: each one points at a playbook in docs/contributing/.
 * That only works while the pointers are real, so this checks them. It is the
 * same guard as the one on the model's numbers: prose drifts silently.
 */

const PLAYBOOKS = ['add-a-block', 'add-a-character', 'add-a-scenario', 'add-a-tool', 'teach-the-model', 'add-a-building', 'configuration'];

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    return e.isDirectory() ? walk(path) : [path];
  });
}

const CONFIG_DIRS = ['.claude/agents', '.claude/skills', '.claude/commands', '.cursor/rules', '.cursor/commands', '.github/instructions', '.github/prompts', '.kiro/steering', '.qwen/commands', '.opencode/command', '.opencode/agent'];

describe('assistant configs', () => {
  it('every playbook exists and is linked from AGENTS.md', () => {
    const agents = readFileSync('AGENTS.md', 'utf8');
    for (const name of PLAYBOOKS) {
      expect(existsSync(`docs/contributing/${name}.md`), `docs/contributing/${name}.md`).toBe(true);
      expect(agents, `AGENTS.md does not link ${name}`).toContain(`docs/contributing/${name}.md`);
    }
  });

  it('every tool config points at files that are really there', () => {
    const files = CONFIG_DIRS.flatMap(walk);
    expect(files.length, 'no assistant configs found').toBeGreaterThan(20);
    const broken: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const ref of text.match(/(?:docs|src|tests|scripts)\/[A-Za-z0-9_./-]+\.(?:md|ts|tsx|mjs)/g) ?? []) {
        if (!existsSync(ref)) broken.push(`${file} → ${ref}`);
      }
      for (const root of text.match(/\b(?:AGENTS|CLAUDE|QWEN)\.md\b/g) ?? []) {
        if (!existsSync(root)) broken.push(`${file} → ${root}`);
      }
    }
    expect(broken, broken.join('; ')).toEqual([]);
  });

  it('every config carries the frontmatter its tool needs', () => {
    const needs: Array<[string, RegExp]> = [
      ['.claude/agents', /^---\nname: .+\ndescription: .+/s],
      ['.claude/commands', /^---\ndescription: .+/s],
      ['.cursor/rules', /^---\ndescription: .+/s],
      ['.github/instructions', /^---\napplyTo: .+/s],
      ['.github/prompts', /^---\nmode: .+/s],
      ['.kiro/steering', /^---\ninclusion: .+/s],
    ];
    for (const [dir, pattern] of needs) {
      for (const file of walk(dir)) {
        expect(readFileSync(file, 'utf8'), `${file} frontmatter`).toMatch(pattern);
      }
    }
    for (const file of walk('.claude/skills')) {
      expect(file.endsWith('SKILL.md'), `${file} should be <skill>/SKILL.md`).toBe(true);
      expect(readFileSync(file, 'utf8')).toMatch(/^---\nname: .+\ndescription: .+/s);
    }
    for (const file of walk('.qwen/commands')) {
      expect(readFileSync(file, 'utf8'), file).toMatch(/^description = ".+"\nprompt = """/s);
    }
  });

  it('only names npm scripts that exist', () => {
    const scripts = Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts);
    const files = [...CONFIG_DIRS.flatMap(walk), 'AGENTS.md', 'CLAUDE.md', ...PLAYBOOKS.map((p) => `docs/contributing/${p}.md`)];
    const missing = new Set<string>();
    for (const file of files) {
      for (const match of readFileSync(file, 'utf8').matchAll(/npm run ([a-z0-9:]+)/g)) {
        if (!scripts.includes(match[1])) missing.add(`${file} → npm run ${match[1]}`);
      }
    }
    expect([...missing], [...missing].join('; ')).toEqual([]);
  });
});
