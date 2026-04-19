# Gmail MCP — v2+ implementation plan

## Context
v1 shipped (5 tools: search, list, get, list-labels, modify-labels). Everything is read + label-modify. No writes, no send, no drafts, no thread ops, no attachment content.

Official Anthropic Gmail connector covers: search, read, draft creation, label metadata, attachment metadata. **No send, no archive, no label modification, no attachment content**. Our differentiation lives in the write side + attachment content + reactive automation.

Three functional phases we want: compose/send, threads+attachments, reactive. Plus two cross-cutting safety phases before Phase 2 can ship:
- **Phase S** — secrets hardening (the aws-vault pattern, against AI-side leakage).
- **Phase I** — irreversible action protection (defense-in-depth against "Claude misunderstood and sent an email to the wrong person").

---

## Guiding principles

1. **Scope additions hurt users** (weekly re-auth already painful). Bundle re-auth events: add multiple new scopes in one phase, not trickle them.
2. **Writes need confirmation layer at the Claude level**, not in the server. The MCP exposes the action; the client is responsible for "are you sure?" prompts.
3. **Idempotency where possible.** Labels yes. Send: no, handle carefully.
4. **Reversible-first.** Favor actions that can be undone.
5. **Secrets never touch AI context.** This becomes a first-class invariant in Phase S. See below.

---

## Phase S — Secrets hardening (parallel, ship-before-Phase-2)

**Goal:** guarantee that OAuth credentials and refresh tokens cannot leak through any path, including Claude Code itself reading files, tool outputs echoing values, logs, or error messages.

**Inspiration + reference pattern:** [Securing MCP Server Secrets with macOS Keychain](https://kahunam.com/articles/automations-ai/securing-mcp-server-secrets-with-macos-keychain/) (Kahunam). Uses native `security` CLI + shell-wrapper launcher. Zero runtime deps. Simpler and stronger than a node-side keychain library.

### Threat model (why this exists)

Real incidents the layer defends against:
- **Rules File Backdoor (2025):** invisible Unicode in config files exfiltrating creds.
- **LiteLLM compromise (March 2026):** malicious code harvesting SSH keys + API tokens.
- **29M+ secrets leaked on public GitHub in 2026**, with AI-assisted code leaking at ~2x baseline.
- Everyday risk: Claude Code inadvertently reading `credentials.json`, echoing tokens in a tool response, or exposing via `echo $TOKEN` in Bash.

### Architecture

**1. Storage: native macOS Keychain (no node deps)**

Store each secret as a Keychain generic password using the `security` CLI:

```bash
security add-generic-password \
  -a gmail-mcp \
  -s credentials \
  -w "$(cat ~/.mcps/gmail/credentials.json)" \
  -T /usr/bin/security -U

security add-generic-password \
  -a gmail-mcp \
  -s token \
  -w "$(cat ~/.mcps/gmail/token.json)" \
  -T /usr/bin/security -U
```

- `-a` = account (identifier), `-s` = service, `-w` = value
- `-T /usr/bin/security` grants direct access, no confirmation dialogs
- `-U` upserts (create or update)

After migration: **delete the on-disk JSON files**. There is no "plaintext token" file on disk anymore, anywhere.

**2. Runtime: shell-wrapper launcher in `.mcp.json`**

The MCP server never reads from disk. The shell wrapper fetches secrets and `exec`s the server with them as env vars:

```json
{
  "mcpServers": {
    "gmail": {
      "command": "/bin/sh",
      "args": [
        "-c",
        "GMAIL_CREDENTIALS=$(security find-generic-password -a gmail-mcp -s credentials -w) GMAIL_TOKEN=$(security find-generic-password -a gmail-mcp -s token -w) exec node /Users/dionisis/Projects/mcps/servers/gmail/dist/index.js"
      ]
    }
  }
}
```

- `security find-generic-password -w` prints only the value
- `exec` replaces the shell (no extra process in tree)
- Env vars exist only in the MCP server's process, never exported to the parent shell or Claude Code

**3. Server reads from env, writes back on rotation**

- On startup: `GMAIL_CREDENTIALS` and `GMAIL_TOKEN` parsed from env into memory.
- On Google refresh-token rotation: server calls `security add-generic-password -U` to update Keychain directly. Still no disk write.
- Token lives in process memory only.

**4. AI-side isolation (Claude Code settings deny rules)**

In `~/.claude/settings.json` or project `.claude/settings.json`:

```json
{
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
}
```

Deny rules run before tool execution and take precedence over allow rules.

**5. PreToolUse hook (the crucial one) — block Bash env-var leaks**

Deny rules alone don't stop `echo $GMAIL_TOKEN` or `env | grep GMAIL`. Stack a `PreToolUse` hook on `Bash` that blocks commands mentioning sensitive env vars or secret-reading patterns:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": ".claude/hooks/block-env-bash.sh"
      }]
    }]
  }
}
```

Hook script (`.claude/hooks/block-env-bash.sh`) inspects the proposed command and returns exit code `2` to block if it matches:
- `echo\s+\$(GMAIL_|ANTHROPIC_|AWS_|...)`
- `env\s*($|\|)`
- `printenv`
- `security\s+find-generic-password` (don't let AI read Keychain directly)
- `cat\s+.*\.env`

Exit 2 blocks the action at the Claude Code layer before it runs.

**6. Response + log sanitization (defense-in-depth)**

Even with above, add server-side scrubbing:
- Every tool response runs through a regex sanitizer: `ya29\.*`, `1//[A-Za-z0-9_-]+`, `Bearer\s+\S+`, `"refresh_token"\s*:\s*"..."`, client-secret shapes.
- Error messages sanitized before return.
- Logs strip `Authorization` headers and token-shaped strings before write.

**7. Scope enforcement fail-fast**

On startup, introspect the token (via `tokeninfo` endpoint or parse), verify granted scopes match declared scope set. Fail-fast if broader than needed. Catches stale tokens or accidental over-permissioning.

**8. Audit trail**

Local append-only: `timestamp | tool | count` (no bodies, no addresses, no tokens). Separate sqlite or protected file. Forensics-ready, no sensitive content.

### Monorepo pattern

Extract the launcher-wrapper pattern and the hook script into `mcps/shared/secrets/`:
- Shared `block-env-bash.sh` template, parameterized per MCP.
- Shared setup script: `bootstrap-secrets.sh <mcp-name>` that migrates on-disk JSONs into Keychain and prints the `.mcp.json` snippet to paste.
- Same wrapper pattern works for **1Password (`op read`), Doppler (`doppler run`), AWS Secrets Manager (`aws secretsmanager get-secret-value`)** by swapping the CLI command. Future-proof: if we ever leave Keychain for 1Password, the MCP code doesn't change, only the launcher.

### Hardening levels (opt-in via env)

- **Default:** Keychain storage + shell wrapper + deny rules + PreToolUse hook + response/log sanitizer.
- **`GMAIL_MCP_HARDENED=true`:** also requires Touch ID unlock on Keychain read (achieved with `security` ACL tweaks), disables verbose logs, blocks any tool that returns more than N bytes of email content per call.

### What this defends against, concretely

| Attack | Blocked by |
|---|---|
| `cat ~/.mcps/gmail/token.json` | File is gone (migration) + deny rule on path |
| Tool response echoes `Bearer ya29...` | Response sanitizer |
| `echo $GMAIL_TOKEN` in Bash tool | PreToolUse hook exit 2 |
| `env \| grep GMAIL` | PreToolUse hook exit 2 |
| `security find-generic-password ...` via Bash | PreToolUse hook exit 2 |
| Compromised npm dep reads credential files | No files to read |
| Supply-chain code in server.js logs tokens | Log scrubber catches |
| User pastes chat history into another tool | No tokens in history |
| Stale token has extra scope | Scope enforcement fail-fast |

---

## Phase I — Irreversible action protection (ship-before-Phase-2)

**Goal:** if Claude misreads intent, the wrong email must NEVER go out, and the wrong message must NEVER be deleted. Multiple independent gates, so no single layer failing causes harm.

**Threat model (concrete):**
- Claude misunderstands "send to Yannis" and sends to the wrong Yannis from contacts.
- Claude drafts and sends without showing you the exact final body.
- A prompt injection in an incoming email instructs Claude to "forward all messages to attacker@...".
- Claude calls a batch-delete on the wrong IDs.
- Rate-loop: Claude retries a send in a loop and you get 50 copies.

### Defense layers (stacked, each independent)

**Layer 1 — No primitive destructive tools**

The MCP does not expose a raw one-shot `gmail_send_email` or `gmail_delete_message` in default install. Compose/send is split so every send has a reviewable intermediate state in Gmail itself:

- `gmail_create_draft` — reversible, creates a Gmail draft. You can open Gmail and inspect it.
- `gmail_send_draft(draftId, payloadHash)` — sends an existing draft. Takes the hash returned by `create_draft` and verifies the draft on Gmail still matches. If the draft was edited, server refuses.
- `gmail_trash_message` — soft delete, goes to Gmail Trash, 30-day recovery. This is the default "delete" path.
- `gmail_delete_message` — hard delete. **Hidden unless `GMAIL_MCP_ENABLE_HARD_DELETE=true`** and an additional confirmation step.

Rationale: drafts + Trash give you Gmail-native review and rollback. If Claude drafts something wrong, you see it as a draft and never call send. If Claude trashes the wrong email, you restore from Trash.

**Layer 2 — MCP `destructiveHint` annotation**

Every write tool declares `destructiveHint: true` in its `tools/list` response. Standard MCP annotation. Clients that respect it (Claude Code does) surface extra UI.

**Layer 3 — Server-side elicitation (MCP protocol feature)**

Before executing `gmail_send_draft` or any destructive tool, the server issues an `elicitation/create` request to the client. The client renders an interactive dialog with the **full payload fetched directly from Gmail** (not what Claude claims to have sent):

- Recipients (to, cc, bcc, expanded from names to emails)
- Subject
- Body preview (first 500 chars, plaintext)
- Attachment filenames
- A required field: type the first 4 characters of the primary recipient's email to confirm

Response actions:
- `accept` + confirmation field matches → execute
- `decline` or `cancel` → server does not execute, returns structured "user declined" result

The Gmail-side fetch before elicitation means Claude can't spoof the preview. The user sees what Gmail will actually send.

**Layer 4 — Payload hash verification (two-phase commit)**

`gmail_create_draft` returns `{ draftId, payloadHash }` where `payloadHash = SHA-256(to + cc + bcc + subject + body + attachment_hashes)`.

`gmail_send_draft(draftId, payloadHash)` re-fetches the draft from Gmail, recomputes the hash, refuses if mismatch.

Defends against: a second Claude call or background agent silently editing the draft between create and send.

**Layer 5 — Claude Code permissions (`ask` mode, client-side gate)**

In `~/.claude/settings.json`:

```json
{
  "permissions": {
    "ask": [
      "mcp__gmail__send_draft",
      "mcp__gmail__trash_message",
      "mcp__gmail__delete_message"
    ]
  }
}
```

Behavior: Claude Code prompts EVERY TIME these tools run. `ask` cannot be auto-approved by an allow rule higher in precedence. This is the second independent gate after elicitation.

**Layer 6 — PreToolUse hook (arg inspection + sanity checks)**

A Bash hook script inspects the full tool call before it runs. Blocks on:
- Recipient list is empty or wildcard-like
- Recipient not in `GMAIL_MCP_ALLOWED_RECIPIENTS` (optional env, list of domains or addresses)
- Subject empty + body empty (likely a mistake)
- Same payload hash sent in the last 60 seconds (anti-loop)
- More than N recipients (default N=10, configurable via `GMAIL_MCP_MAX_RECIPIENTS`)

Exit code 2 blocks the action. This is the third independent gate.

**Layer 7 — Server-side rate limits + duplicate detection**

- Max sends per hour (default 20, env-configurable)
- Refuse identical payload within 60 seconds (even if hashes differ slightly, fuzzy match on recipient + subject)
- Circuit breaker: 3 failed sends in 5 minutes → server refuses further sends for 10 minutes, writes audit entry

**Layer 8 — Optional delayed-send window (macOS native)**

With `GMAIL_MCP_DELAYED_SEND_SECONDS=60` (or similar), `gmail_send_draft` schedules the send for N seconds from now, posts a macOS notification with Cancel button, and only executes after the window. If user clicks Cancel, the draft remains a draft.

Defends against: everything caught too late by the earlier gates, gives a final "oh no" window.

**Layer 9 — Recipient allowlist (opt-in hardening)**

`GMAIL_MCP_ALLOWED_RECIPIENTS` env var with domains/addresses. If set, any send to a recipient outside the list:
- Requires elicitation confirmation with the full email typed, not just first 4 chars
- Writes prominent audit entry
- Optionally (with `GMAIL_MCP_STRICT_ALLOWLIST=true`) blocks entirely

Useful for: onboarding the server with a trusted circle first, then widening.

**Layer 10 — Dry-run mode for demos / video**

`GMAIL_MCP_DRY_RUN=true` → every destructive tool logs what it would do, returns a fake success, never calls Gmail API. Required for recording video demos without risking a real send.

### Summary matrix

| Tool | Reversible? | Destructive hint | Elicitation | Ask rule | PreToolUse hook | Two-phase hash | Rate-limit | Delayed send |
|------|-------------|------------------|-------------|----------|------------------|----------------|------------|--------------|
| `gmail_create_draft` | Yes (draft) | No | No | No | Light check | N/A | Yes | No |
| `gmail_send_draft` | No | Yes | **Yes** | **Yes** | **Yes** | **Yes** | Yes | Optional |
| `gmail_trash_message` | Yes (Trash) | Yes | Yes (batch only) | Yes | Yes | No | Yes | No |
| `gmail_delete_message` | No | Yes | **Yes + typed full email** | **Yes** | **Yes** | Yes | Yes | Yes |
| `gmail_modify_labels` | Yes | No | No | No (v1 already shipped) | Light | No | Soft | No |
| `gmail_batch_modify_messages` | Yes | No | Yes if > 50 msgs | No | Yes | No | Yes | No |

### Configuration bundle (drop-in)

Ship a `secure-defaults.json` in the repo that users can merge into their Claude Code settings:

```json
{
  "permissions": {
    "ask": [
      "mcp__gmail__send_draft",
      "mcp__gmail__delete_message",
      "mcp__gmail__trash_message"
    ],
    "deny": [
      "mcp__gmail__send_email"
    ]
  },
  "hooks": {
    "PreToolUse": [{
      "matcher": "mcp__gmail__(send_draft|delete_message|trash_message|batch_modify_messages)",
      "hooks": [{
        "type": "command",
        "command": ".claude/hooks/gmail-guard.sh"
      }]
    }]
  }
}
```

`gmail-guard.sh` lives in the monorepo, symlinked/copied on install.

### What this buys us

- **No single point of failure.** Elicitation, `ask` rule, PreToolUse hook, and two-phase hash are independent. Bypassing one doesn't help.
- **No silent action.** Every destructive action surfaces the real payload from Gmail to you, not what Claude thinks it's doing.
- **Reversibility by default.** Default install has only reversible destructive tools (drafts + Trash). Hard-delete requires explicit opt-in.
- **Rate-limited.** Even worst-case (all gates bypassed somehow), max N/hour and no duplicates.
- **Demo-safe.** Dry-run for video recording, no accidental client emails.

### Monorepo pattern

Extract layers 2-4, 6, 7, 10 into `mcps/shared/safety/`:
- Elicitation helper for destructive actions (pluggable: pass a `describePayload(args)` function)
- Payload hash + verification utilities
- Rate limiter + dedup
- Dry-run switch helper
- Standard `destructiveHint` tool annotation helper

Every future MCP in the monorepo with write actions uses these. One safety primitive, reused across Gmail/Linear/Notion/etc.

---

## Phase 2 — Compose + Send

**Goal:** close the biggest functional gap vs. connector. Unblock "Claude replies to my email" demos.

**New tools:**
- `gmail_create_draft` — create draft, optional thread-reply context (`In-Reply-To`, `References` headers set correctly)
- `gmail_update_draft` — edit existing draft by ID
- `gmail_send_draft` — send an existing draft by ID
- `gmail_send_email` — create + send in one call
- `gmail_delete_draft` — remove a draft
- `gmail_list_drafts` — list drafts (paginated, filterable)

**OAuth scope add:** `https://www.googleapis.com/auth/gmail.compose` (covers draft create/edit/delete + send). One re-auth event.

**Implementation notes:**
- Reply threading: fetch parent `Message-ID` header, set `In-Reply-To` and `References` on the draft. Include `threadId` in the API call.
- `sendAs`: fetch `users.settings.sendAs.list`, default to primary, include signature if present.
- Quoted reply body: build the "On [date], [sender] wrote:" block manually.
- Proper MIME: use `nodemailer` or hand-roll `multipart/alternative` for HTML + plaintext.
- Encoding: base64url the RFC 2822 message before POST.

**Tests:**
- Send to self, verify arrival
- Reply to a thread, verify Gmail UI keeps the thread intact
- Draft with HTML, verify formatting preserved
- Attachment send (file-path based for v2)
- Delete draft, verify gone

**Video payoff:** Video 002 "I replied to 12 client emails with one prompt".

---

## Phase 3 — Threads + Attachment content

**Goal:** proper conversation handling + full email content including attachments.

**New tools:**
- `gmail_get_thread` — fetch full thread with all messages in one call
- `gmail_modify_thread` — apply label changes to all messages in a thread at once
- `gmail_get_attachment` — fetch base64-decoded attachment content by `messageId` + `attachmentId`
- `gmail_list_attachments` — list attachments for a message with metadata

**OAuth scope:** covered by `gmail.modify` + `gmail.compose`. No re-auth.

**Implementation notes:**
- `threads.get` with `format=full` returns all messages with content.
- Attachment content decoding: Gmail returns base64url. Return base64 from tool; Claude decides what to do.
- Large attachments: size guard, refuse >20MB to avoid context blowup.
- MIME type pass-through from Gmail's `mimeType` field.
- **Secrets note:** attachment tool output goes through the Phase S sanitizer too. If someone emailed a credential in an attachment, the sanitizer should redact on return.

**Tests:**
- Fetch thread with 10+ messages, verify order
- Attachment types: PDF, image, DOCX; verify roundtrip
- Modify thread label, verify all messages updated

**Video payoff:** Video 003 "Claude read my client's contract PDF and flagged the risky clauses".

---

## Phase 5 — Reactive / agentic foundation

**Goal:** enable Claude to **respond** to new emails, not just act on demand. North-star automation.

**New tools:**
- `gmail_create_filter` — create a Gmail server-side filter (criteria + action)
- `gmail_list_filters`
- `gmail_delete_filter`
- `gmail_watch` — register a Pub/Sub push notification for new emails
- `gmail_stop_watch` — unregister

**OAuth scope add:** `gmail.settings.basic` for filters. Watch uses existing `gmail.modify`. One re-auth event.

**Implementation notes:**
- Filter actions limited to Gmail's built-in set (apply/remove label, mark important, forward). Light automation layer.
- `gmail_watch` is the real unlock: GCP Pub/Sub topic → webhook → local agent listener → Claude runs. Infra-heavy.
- **Split:** ship `gmail_create_filter` + `gmail_list_filters` + `gmail_delete_filter` first. Defer `gmail_watch` + `gmail_stop_watch` to immediately after, as a separate pass, since Pub/Sub setup is non-trivial.
- **Secrets note:** Pub/Sub creds go through the same Keychain storage pattern as Gmail OAuth. Shared secrets package (Phase S) makes this clean.

**Tests:**
- Create filter "from:noreply@ apply label:promos", verify in Gmail settings
- List filters, verify all
- Delete filter, verify gone
- `watch`: seed an email, verify webhook fires, verify Claude receives event

**Video payoff:** Video 004 "Claude handles incoming email in real time". This is the one that changes mental models.

---

## OAuth scope roadmap

| Phase | Scopes active |
|-------|---------------|
| v1 (current) | `gmail.readonly` + `gmail.modify` |
| Phase 2 | + `gmail.compose` |
| Phase 3 | (no new scopes) |
| Phase 5 | + `gmail.settings.basic` |

**Re-auth events total:** 2 (Phase 2, Phase 5). Bundle work within each phase.

---

## Suggested rollout order

1. **Phase S** — secrets hardening. Every subsequent phase inherits it. Retrofitting later is painful.
2. **Phase I** — irreversibility protection. MUST ship before Phase 2 because Phase 2 introduces send.
3. **Phase 2** — send + drafts (with Phase I layers already wrapping them). Unblocks video 002.
4. **Phase 3** — threads + attachments. Unblocks video 003.
5. **Phase 5.1** — filters only. Quick win.
6. **Phase 5.2** — watch + webhook. Separate pass, more infra. Unblocks video 004.

---

## Open questions / decisions

1. **Safety layer:** keep "Claude asks before destructive action" at the client level only, or add a confirmation-required flag to destructive tools? **Proposed:** client only, MCP stays pure.
2. **Multi-account:** defer until a real second account exists (own second Gmail or client install).
3. **Draft attachments:** yes in Phase 2, file path or base64.
4. **Public release timing:** after Phase 3, so there's a story + enough features to attract contributors. Phase S is a selling point ("secrets never leak through AI") — use it in the public README.
5. **Hardened mode default:** ship `GMAIL_MCP_HARDENED` as opt-in or default-on? **Proposed:** opt-in at first, flip to default-on after public release once UX is smooth (Touch ID prompts etc.).

---

## Links back to content-engine

- **Video 001 (current):** v1 + the "connector can't" framing. No code changes needed.
- **Video 002:** after Phase 2. "Claude now replies to my emails (and can't get it wrong)."
- **Video 003:** after Phase 3. "Claude read my contract PDF." Agentic angle.
- **Video 004:** after Phase 5.2. "Claude handles email autonomously." The big one.
- **Bonus video (Phase S):** "How I made sure an AI can't leak my credentials, even when it has them." Dev-audience, security angle.
- **Bonus video (Phase I):** "I gave AI send+delete access to my Gmail. Here are the 10 layers stopping it from going wrong." Security-focused, massive trust-builder, differentiates the monorepo.

Each phase = one video. Natural cadence.
