# Video 001 — Gmail MCP Assistant

## Topic
Claude has an official Gmail connector. It can read and draft, but it can't archive, can't send, can't even mark as read. I built my own MCP server that actually acts on my inbox. Here's the concrete gap and what it unlocks.

## Audience
Prosumer primary (freelancers, solo founders, SMB owners drowning in email). Dev-curious secondary.

## Angle
**Pillar:** Before/after + build log.
**Framing:** Reveal the capability gap between the official connector and what real inbox automation needs. Lead with something the connector physically cannot do (archive 380 emails in one prompt). Outcome-first. MCP plumbing stays out of the main video.

## The core proof (why this video exists)
The "400 → 6 + archive 380 promos" demo is **impossible** with the official connector. That's not opinion, that's docs (connector is read + draft only, no archive, no send, no label modification). This video shows that gap on screen, then shows the custom MCP closing it.

## Outcome shown
1. Live test: ask the official connector to archive emails → it refuses (or can't)
2. Same prompt to the custom MCP → executes bulk archive, 380 emails gone
3. Triage: "which 6 emails this week need a reply"
4. Tease: v2 adds send, so "reply to my client" becomes possible next

## Why viewer cares
- Everyone has inbox overload
- Everyone will assume "Claude's built-in connector is enough"
- Showing it's read-only changes the mental model
- Shows the path forward for people who want real automation: build MCPs

## CTA
- Subscribe / follow for the build-log series
- Comment: "what's the one email action you'd want an AI to handle for you?"
- Secondary: link to monorepo when public
- Implicit: "I build this stuff for clients, DM if you want one"

## Success criteria
- Hook lands the "connector can't, mine can" contrast in first 30sec
- No jargon in the first 3 minutes
- Side-by-side connector vs custom MCP comparison is clear to non-devs
- Produces minimum 10 cross-posts (4 Shorts + X thread + 1-2 X clips + LinkedIn)
- Locks in the format for future MCP-build videos in the series

## What changed (vs first draft)
First draft framed it as "I built AI for Gmail". That's weak now that the connector exists. Rewrote around the **demonstrable capability gap** — the connector is read-only + draft-only by design, and real automation needs write actions (archive, bulk labels, send). The video now makes a fact-based case, not an opinion case.
