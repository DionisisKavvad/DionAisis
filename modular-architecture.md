# Modular Architecture: DionAi as a Template

Design doc for turning DionAi from a personal workspace into a reusable, modular template that any developer can init and customize.

## Core Idea

CLAUDE.md is the router. If a section isn't there, Claude doesn't know the capability exists. Modularity = which CLAUDE.md sections exist + which folders are present.

Each module is self-contained: metadata, a CLAUDE.md section to inject, and scaffold files to copy.

## Template Repo Structure

```
create-second-brain/
  core/                           # always installed
    CLAUDE.md.header              # project name, top priority, format
    context/
      me.md.template              # {{NAME}}, {{ROLE}}, {{TIMEZONE}}
      work.md.template            # business, stage, tools
      team.md.template            # solo or team info
      current-priorities.md       # empty, user fills
      goals.md                    # empty, user fills
    .claude/rules/
      communication-style.md.example
    .gitignore
    .env.example

  modules/
    project-tracker/
      MODULE.md
      claude-section.md
      scaffold/
        projects/INDEX.md

    decision-log/
      MODULE.md
      claude-section.md
      scaffold/
        decisions/log.md

    memory/
      MODULE.md
      claude-section.md

    advisor/
      MODULE.md                   # deps: [skills-framework, agents-framework]
      claude-section.md
      scaffold/
        advisor/thesis.md.template
        .claude/skills/advisor/SKILL.md
        .claude/agents/advisor-reviewer.md

    skills-framework/
      MODULE.md
      claude-section.md
      scaffold/
        .claude/skills/.gitkeep

    agents-framework/
      MODULE.md
      claude-section.md
      scaffold/
        .claude/agents/.gitkeep

    archives/
      MODULE.md
      claude-section.md
      scaffold/
        archives/.gitkeep

    references/
      MODULE.md
      claude-section.md
      scaffold/
        references/sops/.gitkeep
        references/examples/.gitkeep

    templates/
      MODULE.md
      claude-section.md
      scaffold/
        templates/.gitkeep

  init.sh                         # entry point
```

## Module Anatomy

Every module follows the same 3-file pattern:

### MODULE.md (metadata)

```yaml
name: project-tracker
description: Track multiple projects with status, type, and key dates
dependencies: []
```

### claude-section.md (CLAUDE.md injection)

The exact markdown section that gets appended to CLAUDE.md when the module is enabled. Example for project-tracker:

```markdown
## Projects
Active workstreams live in `projects/`. Each has its own folder with a `README.md`
(type, status, description, key dates). When starting work on one, read its README
first. Update the README when status or dates change.

Every project README has a `- **Type:**` line (`work` or `personal`) as the first
metadata field. A summary table lives at `projects/INDEX.md`. Update both the README
and the INDEX row when status, type, or key date changes.
```

### scaffold/ (files to copy)

Directory tree copied verbatim into the user's workspace. Paths are relative to the workspace root. Files ending in `.template` get variable substitution, others are copied as-is.

## Available Modules (v1)

| Module | Description | Dependencies |
|---|---|---|
| project-tracker | Track projects with status, type, key dates, INDEX | none |
| decision-log | Append-only log of non-trivial decisions | none |
| memory | Persistent memory system across conversations | none |
| skills-framework | Pattern for building reusable Claude Code skills | none |
| agents-framework | Pattern for specialized sub-agents | none |
| advisor | Maieutic advisor for big abstract questions + drift reviews | skills-framework, agents-framework |
| archives | "Never delete" rule, move outdated material with date prefix | none |
| references | SOPs and example outputs | none |
| templates | Reusable templates (session summaries, etc.) | none |

## Init Flow

### First-time setup

```
$ ./init.sh

What's your name? Maria
What's your role? Full-stack developer
What timezone? UTC+1

Select modules (space to toggle, enter to confirm):
  [x] project-tracker
  [x] decision-log
  [x] memory
  [ ] advisor
  [x] skills-framework
  [ ] agents-framework
  [ ] archives
  [ ] references
  [ ] templates

Resolving dependencies... done
Copying core files... done
Installing 4 modules... done
Assembling CLAUDE.md... done

Workspace ready. Open in Claude Code.
```

### Adding a module later

```
$ ./init.sh add advisor

"advisor" requires: skills-framework, agents-framework
skills-framework: already installed
agents-framework: not installed, will be added

Install advisor + agents-framework? [y/n] y

Copying scaffold files... done
Updating CLAUDE.md... done

2 modules added.
```

### CLAUDE.md Assembly

The final CLAUDE.md is built by concatenation:

```
CLAUDE.md = core/CLAUDE.md.header
          + "\n## Context\n" + context references (always)
          + "\n## Rules\n" + rules references (always)
          + modules/project-tracker/claude-section.md
          + modules/decision-log/claude-section.md
          + modules/memory/claude-section.md
          + modules/skills-framework/claude-section.md
```

Order follows a fixed priority list defined in the init script, so modules always appear in a predictable sequence regardless of install order.

## What Stays Personal (not in template)

These are generated organically during use, never shipped:

- Specific project READMEs and content
- Decision log entries
- Memory files
- Advisor thesis, sessions, reviews
- Custom skills (aws-investigate, perplexity-research, etc.)
- Custom agents (aws-investigator, perplexity-researcher, etc.)
- Context file content beyond the template placeholders

## Dependency Resolution

Simple graph. Each MODULE.md declares `dependencies: [...]`. On install:

1. Collect selected modules
2. For each, check deps recursively
3. Add missing deps, inform user
4. Install in topological order

No circular deps allowed (enforced by validation in init.sh).

## Upgrade Story

**v1: No automatic upgrades.** Once you init, the workspace is yours. If the template repo updates a module, you:

1. Check the template repo changelog
2. Manually apply changes you want

This is intentional. Every dev customizes heavily. Automatic merges would cause more problems than they solve.

**Future (v2, maybe):** A `./init.sh diff` command that shows what changed in each module since your install, without auto-applying.

## Effort Estimate

- **init.sh script:** ~half day (bash or node, variable substitution, module selection UI, dependency resolution)
- **Extracting modules from current DionAi:** ~half day (split CLAUDE.md sections, organize scaffolds, write MODULE.md for each)
- **Testing:** ~2 hours (init from scratch, verify CLAUDE.md assembly, test `add` command)
- **Total: ~1 day**

## Open Questions

1. **Naming:** `create-second-brain`? `claude-workspace`? `ai-assistant-template`? Something else?
2. **Distribution:** GitHub template repo? npx CLI? Just a git clone?
3. **Rules:** Ship example rules (communication-style.md.example) or let users create their own from scratch?
4. **Pre-built skills:** Include any generic skills (project-context-restore?) or keep the skills-framework empty?
5. **Init script language:** Bash (zero deps, works everywhere) or Node (richer UI with inquirer/prompts)?
