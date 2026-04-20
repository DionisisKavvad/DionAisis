# Video 001 — Shot list & recording checklist

## Pre-record checklist
- [ ] Re-auth Gmail MCP (weekly token): `cd ~/Projects/mcps && npm run auth -w @mcps/gmail`
- [ ] Restart Claude Code session to refresh MCP tools
- [ ] Close all notifications (macOS Do Not Disturb on)
- [ ] Clean desktop, hide personal files from dock
- [ ] Claude Code font size up (readability at YouTube compression)
- [ ] Terminal theme: high contrast, zoom level +2
- [ ] Mic check: 30sec test recording, listen back
- [ ] Seed a test Gmail account with realistic but non-sensitive emails, OR blur real sender names in edit
- [ ] Prepare one long thread for Demo 3 (pre-pick it)

## Screen recordings needed

### Main captures
1. **Inbox overview (cold open)** — Gmail UI, 400+ unread, scroll to show chaos. 10sec.
2. **Demo 1: triage query** — full interaction from prompt to output. Don't cut mid-thought. 2-3 min.
3. **Demo 2: bulk archive** — prompt → confirm → execute → inbox count before/after. 2 min.
4. **Demo 3: thread summary** — pick real long thread, prompt, watch Claude read and summarize. 2 min.
5. **Architecture slide** — simple Claude → MCP → Gmail diagram. 20sec.
6. **Failure b-roll** — OAuth warning screen, re-auth terminal run. 20sec.

### Tools
- **Screen recorder:** OBS Studio (better control than QuickTime)
- **Resolution:** 1920×1080 minimum, 60fps for screen, 30fps for face cam
- **Audio:** external mic, pop filter, check levels are not clipping
- **Cursor:** use mouse highlighter tool (Cursor Highlighter, Keycastr for keystrokes)

## Talking head shots
- Hook (0-15sec): good lighting, eye contact, energy up
- CTA (final 30sec): same setup, repeat if needed
- Optional: "wait, this saved me an hour" reaction mid-demo

## B-roll ideas
- Zoomed UI shots of specific output lines (for Shorts later)
- Split-screen: Claude output left, Gmail UI right
- Terminal close-up of MCP logs (optional, for dev-curious viewer)
- Inbox count ticker: 400 → 0 animation (post)

## Privacy checklist (CRITICAL)
- [ ] Blur sender names on real emails
- [ ] Blur subject lines containing client info
- [ ] No visible email addresses of third parties
- [ ] No visible API keys, tokens, or credentials in terminal
- [ ] Check OAuth screen for `dionisiskavvadias@gmail.com` before showing

## Editing notes
- Keep demo takes long, cut minimally, let the reveal land
- Add inbox-count counter overlay for dramatic effect
- Cut filler words (OK, so, um) with Descript or CapCut AI
- Music: low, tense-to-resolved arc, no vocals
- Captions: auto-generate, manually fix "Claude", "MCP", "Gmail"

## Target duration
- Raw recording: 20-25 min
- Final cut: 10-12 min
- If over 15min, cut Demo 3 or move it to a follow-up
