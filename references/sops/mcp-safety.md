# MCP Safety SOP

Reusable playbook for every MCP server in `~/Projects/mcps`. When adding a new MCP (Linear, Notion, Slack, whatever), walk this list top-to-bottom.

**Threat model in one sentence:** the model has access to the tools, so anything the tool can do, a prompt injection or a model misunderstanding can do. Secrets must not leak, destructive actions must not happen silently.

Two parallel stacks, both mandatory:
- **Phase S — secrets hardening.** Credentials never visible to the model, never on disk.
- **Phase I — irreversible-action protection.** Any write the model can call is gated.

Reference implementation: `~/Projects/mcps/servers/gmail`. Reusable primitives live in `@mcps/shared-secrets` and `@mcps/shared-safety`.

---

## Phase S — every MCP with secrets

Eight layers. Each one standalone; missing one doesn't void the rest.

### 1. Keychain-backed storage

Every secret as a `security` generic password, not a file.

```bash
security add-generic-password -a <server>-mcp -s <kind> -w "<value>" -T /usr/bin/security -U
```

Run once via `packages/shared-secrets/scripts/bootstrap.sh <server>-mcp --delete-files`. After that, no `.json` credential file exists on disk.

### 2. Shell-wrapper launcher

`~/.claude.json` mcpServers entry is a shell command, not `node foo.js`:

```json
{
  "command": "/bin/sh",
  "args": ["-c", "FOO_CRED=$(security find-generic-password -a foo-mcp -s credentials -w) FOO_TOKEN=$(security find-generic-password -a foo-mcp -s token -w) exec <NODE> <DIST>/index.mjs"]
}
```

Secrets exist only in the server subprocess's env, never exported to parent shell, never visible to Claude Code's Bash tool.

### 3. Server reads env, writes Keychain on rotation

In `auth.ts`:
- `loadCredentials()` / `loadToken()` read from `process.env.<VAR>` first, Keychain second, legacy disk only if explicitly opted in.
- OAuth `tokens` event → `keychainSet()`. **No disk write ever.**

### 4. Scope fail-fast

On startup: `assertExactScopes(token.scope, SCOPES)`. Catches:
- stale tokens with retired scopes
- accidental over-permissioning
- missing scopes after edit to `SCOPES`

Triggers a clear re-auth error instead of a runtime surprise.

### 5. Claude Code deny rules

In `~/.claude/settings.json`:

```json
"permissions": {
  "deny": [
    "Read(~/.mcps/**)",
    "Read(**/credentials.json)",
    "Read(**/token.json)",
    "Read(./.env)",
    "Read(./.env.*)",
    "Edit(~/.mcps/**)",
    "Edit(./.env)",
    "Edit(./.env.*)"
  ]
}
```

Deny beats allow; model can't even `Read` these paths.

### 6. PreToolUse hook: `block-env-bash.sh`

Ships with `@mcps/shared-secrets`. Blocks Bash commands that:
- `env` / `printenv` / `export -p` dump
- `echo $TOKEN` where TOKEN is a known sensitive prefix
- `security find-generic-password` / `dump-keychain` / `add-generic-password`
- `cat .env` / `cat *.mcps/...`
- `env > file`

### 7. Response + log sanitizer

`sanitizeValue()` wraps every tool return. `installLogScrubber()` wraps every `console.*` call. Regex-redacts:
- Google OAuth tokens (`ya29.*`, `1//…`, `GOCSPX-…`)
- `Bearer …` headers
- Sensitive JSON field values (`refresh_token`, `access_token`, `client_secret`, `id_token`, `private_key`, `api_key`)
- OpenAI / Anthropic key shapes (cross-MCP insurance)

### 8. Audit trail

`createAuditLogger({server, path: ~/.mcps/<server>/audit.log})`. Append-only. One line per tool call: `timestamp | server | tool | status | arg_count`. **No bodies, no addresses, no values.** Forensics-ready.

---

## Phase I — every MCP with writes

Only trigger this stack for tools that can change or destroy state. Read-only tools skip most of it.

### Layer 1 — split destructive tools

Never expose a raw one-shot send/delete. Split into:
- `create_<thing>` → returns `{id, payloadHash}`. Reversible.
- `commit_<thing>(id, payloadHash)` → verifies hash, commits.
- `soft_delete` (trash / archive) first; `hard_delete` behind an env flag.

Gmail example: `create_draft` + `send_draft(draftId, payloadHash)` instead of `send_email`. Trash before delete.

### Layer 2 — `destructiveHint: true`

Tool annotation. Claude Code surfaces extra UI. Use `destructive` bundle from `@mcps/shared-safety`.

### Layer 3 — elicitation from authoritative source

Before committing a destructive action, fetch the current upstream state and pass it through `elicitConfirmation()` from `@mcps/shared-safety`. User sees what will actually happen, not what Claude claims will happen. Optional typed-token field (e.g. "type the first 4 chars of the recipient email") catches wrong-target mistakes.

### Layer 4 — `ask` permissions in Claude Code

```json
"permissions": {
  "ask": [
    "mcp__<server>__<destructive_tool>",
    "..."
  ]
}
```

`ask` cannot be auto-approved by an `allow` rule. Every invocation prompts the user.

### Layer 5 — PreToolUse hook for write tools

Per-server script (e.g. `hooks/gmail-guard.sh`). Arg-level sanity checks before the tool even runs:
- empty / wildcard args
- recipient / target count caps
- allowlist enforcement (optional, env-driven)
- duplicate within N seconds

Exit 2 = block.

### Layer 6 — payload-hash two-phase commit

`payloadHash()` from `@mcps/shared-safety`. Tie `create_*` output to its `commit_*` input. Refuses if the target was silently edited between the two calls.

### Layer 7 — server-side rate limiter + dedup

`createRateLimiter()` from `@mcps/shared-safety`:
- sliding-window N writes/hour
- M-second dedup on identical payload hash
- circuit breaker on K failures in T minutes

Last line of defense. Even if every client-side gate is bypassed, the server refuses to hammer the upstream API.

### Layer 8 — dry-run env switch

`GMAIL_MCP_DRY_RUN=true` (pattern, adapt per server). `withDryRun()` wraps destructive tools so they return a fake success without hitting the upstream. Required for recording demos without risking a real send.

### Layer 9 — allowlist (optional hardening)

Env-driven list of permitted recipients / targets. Start tight when onboarding a new MCP, relax later. Enforce strictly (`GMAIL_MCP_STRICT_ALLOWLIST=true`) once trust is established.

---

## Minimum install checklist for any new MCP

Copy this into the new server's README and walk it:

- [ ] `~/.mcps/<server>/` has mode 0700; files 0600
- [ ] Ran `bootstrap.sh <server>-mcp --delete-files` after first auth
- [ ] `~/.claude.json` entry uses `/bin/sh -c` launcher wrapper (not bare `node`)
- [ ] `~/.claude/settings.json` has the Phase S deny rules
- [ ] `~/.claude/settings.json` has `PreToolUse` hook on `Bash` → `block-env-bash.sh`
- [ ] Server calls `installLogScrubber()` in its entry point
- [ ] Every tool handler wrapped with `sanitizeValue()` on return
- [ ] Every tool handler calls `audit({tool, status})`
- [ ] Startup calls `assertExactScopes()` (or equivalent for non-OAuth APIs)
- [ ] For every write tool: annotation `destructive` or `reversibleWrite`
- [ ] For every write tool: `runWrite()`-style wrapper with rate limiter + hash
- [ ] For every destructive tool: entry in `permissions.ask`
- [ ] For every destructive tool: `hooks/<server>-guard.sh` matcher
- [ ] `config/secure-defaults.json` shipped with the server, easy to merge

## When to update this SOP

- New class of credential appears (e.g. first WebAuthn/passkey MCP) → extend the sanitizer
- A real incident happens → add a layer, don't just patch the specific bug
- A new MCP pattern emerges (streaming, background watchers) → document the safety dance for it

Keep this doc skeptical. Every layer earns its place by defending against a named attack.

## References

- `~/Projects/mcps/packages/shared-secrets/README.md`
- `~/Projects/mcps/packages/shared-safety/README.md`
- `~/Projects/mcps/servers/gmail/ARCHITECTURE.md` (reference implementation)
- `projects/gmail-mcp/v2-plan.md` (full threat model with concrete attacks per layer)
- [Kahunam post on Keychain + MCP](https://kahunam.com/articles/automations-ai/securing-mcp-server-secrets-with-macos-keychain/) — the macOS pattern
