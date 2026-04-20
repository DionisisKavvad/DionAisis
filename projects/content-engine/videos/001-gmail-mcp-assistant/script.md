# Video 001 — Script

## Hook options

### A (recommended) — contrast + curiosity
> "Claude has an official Gmail connector. Watch what happens when I ask it to archive 380 promo emails. [cut to connector refusing] Yeah. It can read, it can draft, it can't actually do anything. So I built my own. Here's the gap and how I closed it."

Why: Opens with a tested assumption, breaks it on camera, promises the fix. Strongest hook because the "failure" moment is unexpected.

### B — takes a stance
> "Your AI assistant shouldn't be read-only. Most are. I'll show you why Claude's Gmail connector can't archive a single email, and why that matters."

Why: Opinion hook, filters audience, but weaker than showing the gap live.

### C — outcome
> "I cleared 380 emails in one prompt. The official Claude connector can't do this. Here's what I built and why."

Why: Outcome-first, factual, but skips the "discover the gap" arc that makes A compelling.

**Pick A.** Strongest retention pattern: surprise + payoff.

---

## Full script (target: 10-13 min)

### [00:00] Hook (A)
- Face cam. Deliver opener with energy.
- Cut to screen recording mid-sentence: the Claude.ai connector trying to archive
- Show the refusal/fallback clearly on screen
- Back to face cam: "So I built my own."

### [00:30] The assumption most people have
- "Most people see 'Claude Gmail connector' and think, done, AI email assistant."
- Quick zoom on claude.com/connectors/gmail page
- "Let me show you what it actually does, and more importantly, what it doesn't."

### [01:00] The capability gap (on-screen)
Show the docs side by side:

**Official connector can:**
- Search emails
- Read content
- Draft replies
- Read label metadata

**Cannot:**
- Archive
- Send
- Mark read/unread
- Modify any label
- Access attachment content

- Voiceover: "It's a really powerful read tool. It's not an assistant that acts."
- "For me, that's the whole point. So I built an MCP server that does the write side."

### [02:00] Setup in one sentence
- "Ran one command, added OAuth, wrote 5 tools. Weekend project."
- No deep tech. Hide OAuth/tsdown/etc. This is for the dev-deep-dive follow-up.

### [02:30] Demo 1 — the impossible demo (archive 380 promos)
- Real inbox on screen, 400+ unread
- Prompt: "archive every promotional email older than 30 days"
- Claude confirms count, executes batch modify
- Counter visibly drops
- React live: "The connector literally can't do this. This is the whole point."

### [04:30] Demo 2 — triage by importance
- "What unread this week actually needs my attention?"
- Claude reads, scores, outputs short list
- Output: "6 need reply, 14 FYI, 380 already archived"
- Note: "Read part overlaps with the connector. But here it's stitched into the action workflow."

### [06:30] Demo 3 — context-aware summary + labeling
- Long thread with client
- Prompt: "summarize this and label it with 'waiting-on-me'"
- Claude reads → summarizes → applies label
- Visible in Gmail UI afterwards
- "Connector would read and summarize. Can't label. Mine does both."

### [08:00] What it can't do yet (honesty + v2 tease)
- "One thing I still can't do: send replies. That's v2, coming next video."
- Quick shot of v2 backlog file from the repo
- "Send + drafts + threads + attachments. Then it's a real assistant, not just a power-user tool."

### [09:00] The 30-second explanation
- One slide: `Claude → MCP server → Gmail API`
- "MCP is just a protocol. Think USB for AI. Any service that speaks MCP can plug into Claude."
- "The official connector uses the same protocol. The difference is who writes the server and what tools it exposes."

### [10:00] The real lesson
- "Official connectors will grow. But they'll always be conservative by design. Read-heavy, write-light, for safety."
- "If you want your AI to actually do the work, at some point you build your own."
- "And the barrier is lower than you think. MCP makes this possible for solo devs."

### [11:00] Failures and caveats
- OAuth unverified → weekly re-auth
- Rate limits on Gmail API
- No safety rails yet (confirmation prompts are manual in v1)
- "This is why you start with label actions, not deletes. Reversibility matters."

### [11:45] What's next
- v2: send, drafts, threads, attachments
- Follow-up video: dev deep-dive on building your first MCP server
- "Next MCP is for [Linear/something else]. Series continues."

### [12:15] CTA
- "Comment the one email action you'd want an AI to handle. Top answer becomes a video."
- "Subscribe for the build-log series. I'm automating my whole company with agents in public."

---

## Voice rules for recording
- Casual, conversational, no scripted-sounding delivery
- The "wait, the connector can't do this?" moment in the hook has to feel genuine. Record it as if discovering it live.
- Don't rush the archive-380 moment. That's the proof.
- When the capability gap slide is on screen, slow down. Let it register.
- Authentic on OAuth pain, don't hide it.
