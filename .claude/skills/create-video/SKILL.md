---
name: create-video
description: End-to-end workflow for planning a new video for the content-engine project. Produces topic validation, hook, script, shot list, thumbnail/title options, and cross-post plan. Triggers on "new video", "plan video", "create video", "script for video", "video about X", "/create-video".
---

# Create Video

## When to use this skill
Trigger when Dionisis wants to plan a new video for `content-engine`. Phrasings:
- "let's do a video about X"
- "new video on X"
- "plan video: X"
- "script for X"
- "create video"
- "/create-video"

If the topic is vague, propose 2-3 concrete angles based on the content pillars in `projects/content-engine/README.md` and ask him to pick. Otherwise run the workflow end-to-end without asking permission.

## What it produces

For each video, a folder under `projects/content-engine/videos/NNN-slug/` with:

1. `brief.md` — one-page plan (topic, audience, angle, outcome, CTA, success criteria)
2. `script.md` — hook options + full script with timestamps
3. `shots.md` — shot list / recording checklist
4. `title-thumb.md` — 3 title options + 3 thumbnail concepts
5. `cross-posts.md` — Shorts plan, X thread, LinkedIn post, all derived from the flagship

Keep every doc short. Bullets > paragraphs. No fluff.

## Steps

### Step 1: Validate topic fit
- Read `projects/content-engine/README.md` to ground in audience, pillars, anti-patterns
- Check that the topic matches at least one pillar (build log, before/after, experiment, failure)
- Check it doesn't hit an anti-pattern (news, top-10 list, tech-only for mass audience)
- If it fails either check, flag it and propose an adjustment before continuing

### Step 2: Determine video number + slug
- Count existing folders in `projects/content-engine/videos/`
- Next folder: `NNN-slug` (e.g. `001-gmail-mcp-assistant`, zero-padded 3 digits)
- Slug = short kebab-case summary of the topic

### Step 3: Write `brief.md`
Structure:
- **Topic** — one sentence
- **Audience** — prosumer / dev / both (default: prosumer)
- **Angle** — which pillar + the specific framing (outcome-first, not jargon-first)
- **Outcome shown** — what the viewer sees happening (concrete, visual)
- **Why viewer cares** — one sentence on the "so what"
- **CTA** — what we want them to do (follow, try tool, DM for work, etc.)
- **Success criteria** — what makes this video worth having shipped (views target is secondary, clarity of message is primary)

### Step 4: Write `script.md`
Structure:

**Hook options (3)**
- 0-3 second openers, each with a different angle
- Pick one as the "recommended" based on strongest curiosity gap or outcome preview

**Script (full)**
Target length: 8-15 min για flagship YouTube. Timestamps in `[MM:SS]` format.

Sections:
- `[00:00] Hook` — locked-in hook από πάνω
- `[00:xx] Problem` — why this matters, whose life it changes
- `[00:xx] The build / demo` — screen recording walkthrough, outcome-first
- `[00:xx] What you just saw` — zoom out, recap the win
- `[00:xx] Lessons / caveats` — honest takes, failures, what you'd do differently
- `[00:xx] CTA` — subscribe / DM / try it / next video

**Voice rules:**
- Casual, no corporate voice
- Show outcomes before mechanism
- Hide jargon, show screen
- Don't explain what's obvious on screen

### Step 5: Write `shots.md`
A checklist to run during recording:

- **Screen recordings needed** — list specific captures (e.g. "Claude Code with Gmail MCP running a search", "email arriving in Gmail UI")
- **Talking head shots** — which parts need face cam (hook + CTA usually)
- **B-roll ideas** — visual variety options (zoomed UI, split-screen, terminal close-up)
- **Resolution / tools** — OBS or QuickTime, 1080p min, 60fps for screen
- **Pre-record checklist** — close notifications, clean desktop, set font size, mic check

### Step 6: Write `title-thumb.md`
- **3 title options** — each under 70 chars, curiosity/outcome-driven, NOT clickbait
- **3 thumbnail concepts** — short description of visual + text overlay
- Recommendation: pick one title + one thumbnail to start, ready for A/B later

Title heuristics:
- Lead with outcome or transformation, not tool name
- Numbers και timeframes αν είναι αληθινά ("in 15 minutes", "6 hours to 2 minutes")
- Question hooks fine αν είναι πραγματικά provocative

### Step 7: Write `cross-posts.md`
The flagship must produce 10+ posts. Plan:

- **Shorts/Reels/TikTok (3-5 clips)** — για κάθε clip: timestamp range από το flagship + hook line
- **X thread (1)** — 5-10 tweets: hook, 3-5 key moments με screenshots, CTA με link to full video
- **X standalone clips (1-2)** — best 30-60sec moment posted natively
- **LinkedIn post (1)** — rewrite X thread σε 1-2 paragraph narrative, outcome-focused, add link

Each cross-post should be able to stand alone χωρίς να χρειάζεται το flagship context.

### Step 8: Report back
After writing all files, output a compact summary:
- Folder path
- Recommended hook + title + thumbnail
- Total planned cross-posts count
- Next action: "record it" with a link to `shots.md`

## Rules
- Follow `.claude/rules/communication-style.md`: concise, casual, no em-dashes, no hype filler
- Always validate against `projects/content-engine/README.md` first
- Never skip cross-posts step — the whole ROI model assumes leverage
- Don't write generic advice; every deliverable must be specific to THIS video
- If topic is boring or off-strategy, say so and propose alternatives
- Keep English as default language for scripts (primary audience), Greek only when explicitly requested or for LinkedIn Greek-market posts
