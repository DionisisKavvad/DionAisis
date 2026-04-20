# Video 001 — Cross-post plan

Flagship: 10-13 min YouTube video.
Core angle: "Official Gmail connector can't archive/send/label. I built the gap-filler."
Goal: 10+ derivative posts. Each stands alone.

---

## Shorts / Reels / TikTok (4 clips)

### Short 1 — "The connector can't"
- **Source timestamp:** [00:00] - [01:00]
- **Length:** 50sec
- **Hook (on-screen text, 0-2s):** "Claude has a Gmail connector."
- **Body:** ask it to archive, show the refusal/limitation
- **Payoff text:** "So I built my own."
- **CTA overlay:** "Full build log on YouTube"

### Short 2 — "380 emails in one prompt"
- **Source timestamp:** [02:30] - [04:30]
- **Length:** 45sec
- **Hook:** "This is impossible with the official connector."
- **Body:** prompt → batch archive → counter drops 400 → 20
- **Payoff:** "Custom MCP. ~100 lines of code. This is what AI assistants should do."
- **CTA:** "Series on the channel"

### Short 3 — "Read vs act, the real AI gap"
- **Source timestamp:** [01:00] - [02:00]
- **Length:** 35sec
- **Hook:** "Most AI tools read. Very few act."
- **Body:** side-by-side doc comparison (connector vs custom)
- **Payoff:** "If your AI can't act, it's a search engine with extra steps."

### Short 4 — "Building my own, warts and all"
- **Source timestamp:** [11:00] - [11:45]
- **Length:** 40sec
- **Hook:** "Here's what still sucks about my build."
- **Body:** OAuth re-auth every 7 days, rate limits, missing send
- **Payoff:** "No hype. Real tradeoffs. v2 fixes most of it."
- **Why it works:** authenticity differentiator in AI-hype feeds

---

## X thread (10 tweets)

```
1/ Claude has an official Gmail connector.

I asked it to archive 380 promo emails.

It couldn't.

Here's what I learned and what I built instead. 🧵

[screenshot: connector limitation]

---

2/ Most people assume "Claude Gmail connector" = "AI email assistant".

It's not.

The official connector is read-only + draft-only by design. No archive. No send. No label changes.

Documented. Not a bug.

---

3/ For search, read, summarize, draft: the connector is great.

For actual inbox automation: you need something that writes.

That's the gap I hit. Probably you too if you tried to use it for real work.

---

4/ So I built an MCP server for Gmail.

5 tools, v1:
- search
- list
- get content
- list labels
- modify labels (the killer one)

Weekend project. ~few hundred lines.

---

5/ "Modify labels" is the unlock.

Because in Gmail, archive = remove INBOX label. Star = add STARRED. Mark read = remove UNREAD.

One endpoint, full inbox control.

The connector doesn't expose it.

---

6/ Live demo: "archive every promo older than 30 days"

Claude runs gmail_search with query, gets IDs, batches modify_labels.

380 emails gone in 8 seconds.

[screenshot: before/after inbox count]

---

7/ MCP is just a protocol. USB for AI assistants.

The connector and my custom server both speak MCP.

Difference: who wrote the server and which tools they exposed.

Official = conservative by design (safety). Custom = do whatever you need.

---

8/ Honest caveats:

- OAuth unverified → re-auth every 7 days (painful)
- Rate limits on Gmail API
- v1 read + label. No send yet.
- No reversibility UI. You approve manually.

Real project. Real warts.

---

9/ v2 in progress: send, drafts, threads, attachments.

Then it's a real assistant, not just a power-user tool.

Next video walks through the v2 build live.

---

10/ Full 12-min walkthrough with the 380 archive demo + capability gap breakdown on YouTube.

[YouTube link]

I'm automating my whole company with AI agents in public. Follow for the series.

Need one built for your business? DM.
```

---

## X standalone clips (2)

### Clip A — the gap moment
- Native video post (not thread)
- 45sec clip showing connector refusing + custom MCP succeeding side-by-side
- Caption: "Official Claude connector can't archive emails. Custom MCP can. This is the gap. Full build log on YouTube."

### Clip B — the 380 archive
- Native video post
- 30sec of the bulk archive demo
- Caption: "One prompt. 380 emails archived. The official connector physically cannot do this. Here's why it matters."

---

## LinkedIn post (1)

```
I spent a weekend building a Gmail MCP server for Claude.

Most people who saw it asked: "why didn't you just use the official connector?"

Because the official connector can't archive. Can't send. Can't modify labels. Can't mark as read. It's read-only plus drafts, by design.

That's fine for a lot of use cases. For actual inbox automation, it's a non-starter.

So I built a custom MCP server that exposes the write side of Gmail. 5 tools in v1. One prompt now archives 380 promotional emails in seconds.

Three takeaways from the project:

1. Official AI integrations will always be conservative. Safety and liability push them toward read-heavy, write-light. Useful, but not transformative on their own.

2. MCP (Model Context Protocol) makes building custom integrations faster than most people realize. Google's API docs + a weekend was enough for v1.

3. The real unlock of AI in business workflows is not "better chat." It's "AI that acts on your systems." Read-only AI is a search engine with extra steps.

Full technical walkthrough with a live demo on YouTube: [link]

If you run a business and want an AI assistant that actually writes to your tools (email, CRM, internal dashboards), DM me.

#AI #Automation #ClaudeCode #MCP #Productivity
```

---

## Post schedule (1 week after flagship)

| Day | Platform | Content |
|-----|----------|---------|
| Day 0 | YouTube | Flagship drops |
| Day 0 | X | Thread (all 10 tweets) |
| Day 0 | LinkedIn | Long post |
| Day 1 | TikTok/Shorts | Short 1 (connector can't) |
| Day 2 | X | Clip A (native video, side-by-side) |
| Day 3 | TikTok/Shorts | Short 2 (380 archive) |
| Day 4 | X | Clip B (native, archive money shot) |
| Day 5 | TikTok/Shorts | Short 3 (read vs act) |
| Day 6 | TikTok/Shorts | Short 4 (failures/warts) |
| Day 7 | X + LinkedIn | Recap post + link to best-performing Short |

**Total: 11 posts from 1 flagship.** Hits the 10+ leverage target.
