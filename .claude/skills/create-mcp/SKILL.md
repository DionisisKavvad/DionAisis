# Skill: create-mcp

Scaffold and harden a new MCP server inside the `~/Projects/mcps/` monorepo.

## Triggers
- "new mcp", "create mcp", "mcp for X", "/create-mcp"

## Prerequisites
- Monorepo at `~/Projects/mcps/` with shared packages (`@mcps/shared-secrets`, `@mcps/shared-safety`)
- Reference implementation: `~/Projects/mcps/servers/gmail`

## Steps

### 1. Scope

Ask:
- What service? (e.g. Notion, Linear, Slack)
- Read-only first or reads + writes? (recommend read-only v1)
- What tools? (list them)
- Auth type? (OAuth, API key, token)

### 2. Scaffold server

Create `~/Projects/mcps/servers/<name>/` following the gmail structure:
- `src/index.ts` (entry point, server setup)
- `src/auth.ts` (credential loading, Keychain integration)
- `src/tools/` (one file per tool)
- `package.json` (workspace member of monorepo)
- `tsconfig.json`
- `README.md`

### 3. Phase S: Secrets Hardening (all servers)

Eight layers, each standalone. Walk top-to-bottom:

1. **Keychain-backed storage.** Every secret as `security` generic password. Run `bootstrap.sh <name>-mcp --delete-files` after first auth. No credential files on disk.

2. **Shell-wrapper launcher.** `~/.claude.json` entry uses `/bin/sh -c` with inline `security find-generic-password` calls. Secrets exist only in server subprocess env.

3. **Server reads env, writes Keychain.** `loadCredentials()`/`loadToken()` read `process.env` first, Keychain second. OAuth token events write to Keychain, never disk.

4. **Scope fail-fast.** `assertExactScopes(token.scope, SCOPES)` on startup. Catches stale tokens, over-permissioning, missing scopes.

5. **Claude Code deny rules.** Add to `~/.claude/settings.json`:
   ```json
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
   ```

6. **PreToolUse hook: block-env-bash.sh.** Blocks Bash commands that dump env, echo tokens, access Keychain, or cat .env files.

7. **Response + log sanitizer.** `sanitizeValue()` on every tool return. `installLogScrubber()` on every `console.*`. Regex-redacts OAuth tokens, Bearer headers, sensitive JSON fields, API key shapes.

8. **Audit trail.** `createAuditLogger({server, path: ~/.mcps/<name>/audit.log})`. Append-only. One line per tool call: `timestamp | server | tool | status | arg_count`. No bodies, no values.

### 4. Phase I: Write Protection (servers with writes only)

Skip for read-only servers. Nine layers:

1. **Split destructive tools.** `create_<thing>` (returns id + payloadHash) + `commit_<thing>` (verifies hash, commits). Soft delete before hard delete.

2. **destructiveHint annotation.** Use `destructive` bundle from `@mcps/shared-safety`.

3. **Elicitation.** `elicitConfirmation()` from `@mcps/shared-safety`. Fetch upstream state, show user what will actually happen. Optional typed-token field.

4. **ask permissions.** Add destructive tools to `permissions.ask` in `~/.claude/settings.json`.

5. **PreToolUse hook.** Per-server `hooks/<name>-guard.sh`. Arg-level checks: empty/wildcard args, target count caps, allowlist enforcement, dedup within N seconds.

6. **Payload-hash two-phase commit.** `payloadHash()` from `@mcps/shared-safety`. Ties create output to commit input.

7. **Rate limiter + dedup.** `createRateLimiter()`: sliding-window N writes/hour, M-second dedup, circuit breaker on K failures.

8. **Dry-run switch.** `<NAME>_MCP_DRY_RUN=true`. `withDryRun()` wraps destructive tools for demos.

9. **Allowlist (optional).** Env-driven permitted targets. Start tight, relax later.

### 5. Registration

- Register via `claude mcp add -s user`
- Verify with `claude mcp list`
- Test each tool manually

### 6. Track in DionAi

- Create `projects/<name>-mcp/README.md`
- Update `projects/INDEX.md`
- Log decision in `decisions/log.md`

## Minimum Install Checklist

Copy into new server's README:

- [ ] `~/.mcps/<server>/` has mode 0700; files 0600
- [ ] Ran `bootstrap.sh <server>-mcp --delete-files` after first auth
- [ ] `~/.claude.json` entry uses `/bin/sh -c` launcher wrapper
- [ ] `~/.claude/settings.json` has Phase S deny rules
- [ ] `~/.claude/settings.json` has `PreToolUse` hook on `Bash` for block-env-bash.sh
- [ ] Server calls `installLogScrubber()` in entry point
- [ ] Every tool handler wrapped with `sanitizeValue()` on return
- [ ] Every tool handler calls `audit({tool, status})`
- [ ] Startup calls `assertExactScopes()` (or equivalent)
- [ ] For every write tool: annotation `destructive` or `reversibleWrite`
- [ ] For every write tool: `runWrite()` wrapper with rate limiter + hash
- [ ] For every destructive tool: entry in `permissions.ask`
- [ ] For every destructive tool: `hooks/<server>-guard.sh`

## References

- `~/Projects/mcps/packages/shared-secrets/README.md`
- `~/Projects/mcps/packages/shared-safety/README.md`
- `~/Projects/mcps/servers/gmail/ARCHITECTURE.md` (reference implementation)

## When to update this skill

- New class of credential (e.g. WebAuthn/passkey) appears
- A real incident happens (add a layer, don't just patch)
- New MCP pattern emerges (streaming, background watchers)
