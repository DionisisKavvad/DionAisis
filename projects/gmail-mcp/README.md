# gmail-mcp

- **Code:** `/Users/dionisis/Projects/mcps/servers/gmail`
- **Monorepo:** `/Users/dionisis/Projects/mcps` (home for all personal MCP servers, future public GitHub project)
- **Description:** Gmail MCP server for Claude Code. v1 = read-only + label management (5 tools).
- **Status:** Live. v1 tools shipped 2026-04-18. Phase S (secrets hardening) + Phase I (irreversible-action primitives) shipped 2026-04-19.
- **Key date:** 2026-04-18 v1 ship. 2026-04-19 Phase S + I hardening.

## 📖 Setup instructions & troubleshooting
Full setup walkthrough, including every problem we actually hit (Internal vs External, "ineligible account" typo, unverified-app warning, new Google Auth Platform UI, tsdown ESM quirks) and how they were resolved, lives in the server repo README:

**[`/Users/dionisis/Projects/mcps/servers/gmail/README.md`](/Users/dionisis/Projects/mcps/servers/gmail/README.md)**

Read that file if you need to:
- Redo the setup on a new machine
- Understand why the weekly re-auth exists
- Add scopes for v2 (`send_email`)
- Debug OAuth issues

## Why it exists
First MCP connected to Dionisis's Claude Code. Ladders up to the north star (automate manual work at scale) by letting Claude search, read, and label emails directly. Foundation for later agentic inbox triage.

## v1 tools
- `gmail_search` — Gmail query syntax
- `gmail_list_emails` — label filter + pagination
- `gmail_get_email` — full content, decoded body, attachment metadata
- `gmail_list_labels` — system + custom labels with counts
- `gmail_modify_labels` — archive, star, mark read, any label add/remove

## Phase S + I (shipped 2026-04-19)
- `@mcps/shared-secrets` package: Keychain reader, sanitizer, scope fail-fast, audit trail, bootstrap script, `block-env-bash.sh` hook
- `@mcps/shared-safety` package: payload hash, rate limiter + dedup, dry-run, elicitation helper, destructive annotation bundles
- Gmail server migrated: reads credentials/token from env (launcher wrapper) or Keychain; token rotation writes back to Keychain; no plaintext JSON on disk after `bootstrap.sh --delete-files`
- Server startup asserts exact scope match; response + console output sanitized; every tool call audited
- `hooks/gmail-guard.sh` + `config/secure-defaults.json` ready for Phase 2 (send/delete tools arrive with 10-layer defense already wired)

## v2 backlog (Phase 2+)
- `gmail_send_email`, `gmail_create_draft`, `gmail_send_draft` — all behind elicitation + ask permission + payload-hash two-phase commit
- `gmail_get_thread`, `gmail_get_attachment` (content variant), `gmail_trash_message`
- Requires adding `gmail.compose` scope and one re-auth event

## Status checklist
- [x] Monorepo scaffolded (`~/Projects/mcps/`)
- [x] Gmail server code written (auth, client, 5 tools, index, auth script)
- [x] `npm install` + `tsdown` build green
- [x] Google Cloud project `dion-mcp-tools` + Gmail API enabled
- [x] OAuth consent screen (External, Testing, personal `dionisiskavvadias@gmail.com` as test user)
- [x] OAuth Desktop client → `~/.mcps/gmail/credentials.json`
- [x] `npm run auth -w @mcps/gmail` → token in `~/.mcps/gmail/token.json`
- [x] Registered in `~/.claude.json` (user scope) via `claude mcp add`
- [x] `claude mcp list` → `gmail ✓ Connected`
- [x] Smoke tests: `gmail_list_labels` (15 labels), `gmail_search` (real results)

## Caveat: weekly re-auth
Because the app is External + Testing (not Workspace Internal, and not verified), Google expires the refresh token every 7 days. Every ~week you run:

```bash
cd ~/Projects/mcps && npm run auth -w @mcps/gmail
```

## Using the MCP
Restart any Claude Code session to pick up the new tools. Then:
- "List my unread emails from today"
- "Search is:unread from:someone newer_than:7d"
- "Archive email <id>" (removes INBOX label)
- "Star email <id>" (adds STARRED label)

## Next
v2 (Phase 2) adds `gmail_send_email`, `gmail_create_draft`, `gmail_send_draft`. Requires adding `gmail.compose` scope and one re-auth. Plan: `projects/gmail-mcp/v2-plan.md`. Hardening primitives already shipped in Phase S + I — Phase 2 tools plug into them directly.
