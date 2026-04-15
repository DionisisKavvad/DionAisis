---
name: perplexity-research
description: Research any topic using the Perplexity API (web search + AI synthesis with citations). Triggers on "research X", "look up X", "find out about X", "what's the current state of X", "search for X", "deep research on X". Calls api.perplexity.ai via curl, returns findings with source citations.
---

# Perplexity Research

## Delegation

**Always delegate this skill to the `perplexity-researcher` sub-agent.** Do not execute the steps below yourself.

When delegating, include in the prompt:
- The user's original query (verbatim)
- Any signal words present ("quick", "fast", "deep", "thorough", "analyze", etc.)
- Whether the user asked to save the result ("save this", "keep this")

The sub-agent handles Steps 1-6. If the user asked to save (Step 7), the sub-agent will flag it and the parent agent handles saving since the sub-agent has no Write access.

---

## When to use this skill
Trigger on any phrasing like:
- "research <topic>"
- "look up <topic>"
- "find out about <topic>"
- "what's the current state of <topic>"
- "search for <topic>"
- "deep research on <topic>"
- "quick lookup on <topic>"

## Model selection

Pick the model based on signal words in the user's request:

| Signal words | Model | Notes |
|---|---|---|
| "quick", "fast", "brief" | `sonar` | Lightweight, fast, cheap |
| (none, default) | `sonar-pro` | Best for most queries |
| "deep", "thorough", "comprehensive" | `sonar-deep-research` | Multi-step, slower, more expensive |
| "analyze", "reason", "compare", "pros and cons" | `sonar-reasoning-pro` | Reasoning + search |

Default to `sonar-pro` when no signal words are present.

## Steps

### Step 1: Read the API key

```bash
PERPLEXITY_API_KEY=$(grep '^PERPLEXITY_API_KEY=' /Users/dionisis/Projects/DionAi/.env | cut -d'=' -f2)
```

If the value is empty, stop immediately and tell Dionisis:
> Fill in `PERPLEXITY_API_KEY` in `/Users/dionisis/Projects/DionAi/.env`. Get a key at https://www.perplexity.ai/settings/api

### Step 2: Pick the model

Based on the signal words table above. Note the chosen model so you can include it in the output.

### Step 3: Build and run the curl call

Construct the JSON payload with the user's query. Make sure to properly escape any special characters (double quotes, backslashes, newlines) in the query string.

```bash
curl -s -w "\n%{http_code}" "https://api.perplexity.ai/chat/completions" \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "<MODEL>",
    "messages": [
      {
        "role": "system",
        "content": "Be precise and thorough. Cite specific sources with URLs. If information is uncertain or conflicting, say so. Prefer recent and authoritative sources. Structure your response with clear sections when the topic is complex."
      },
      {
        "role": "user",
        "content": "<QUERY>"
      }
    ]
  }'
```

When the user asks about recent events ("this week", "latest", "today", "recent"), add `"search_recency_filter": "week"` (or `"day"` for very recent) to the JSON payload.

When using `sonar-deep-research`, add `--max-time 120` to the curl call and warn Dionisis upfront:
> Using deep research mode. This will take a minute.

### Step 4: Handle errors

Capture the HTTP status code from the last line of the curl output (`-w "\n%{http_code}"`):

- **Empty API key** (caught in Step 1): stop and prompt to fill `.env`
- **HTTP 401**: bad API key. Tell Dionisis to check `PERPLEXITY_API_KEY` in `.env`
- **HTTP 429**: rate limited. Wait 5 seconds, retry once. If it fails again, report the limit
- **HTTP 5xx**: Perplexity API is down. Report and suggest trying later
- **curl exit != 0**: network/connectivity issue. Report the curl error message
- **Malformed JSON**: print the raw response for debugging

### Step 5: Parse the response

Use python3 to extract the content and citations:

```bash
echo "$BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data['choices'][0]['message']['content'])
print('---CITATIONS---')
for i, url in enumerate(data.get('citations', []), 1):
    print(f'{i}. {url}')
"
```

### Step 6: Present findings

Format the output following `.claude/rules/communication-style.md` (bullets, concise, no em-dashes):

```
## Research: <brief query summary>

<synthesized findings as bullet points>

### Sources
1. [domain.com](url)
2. [domain.com](url)

_Model: sonar-pro | Date: YYYY-MM-DD_
```

If citations are empty: note "No specific sources cited for this response."

### Step 7: Save (optional)

Only save if Dionisis explicitly asks ("save this", "save it", "keep this for later").

Create `references/research/YYYY-MM-DD-<slug>.md` where `<slug>` is a short kebab-case summary of the query (e.g. `claude-code-latest-features`). Run `mkdir -p /Users/dionisis/Projects/DionAi/references/research/` first.

File format:
```markdown
# Research: <query summary>
- **Date:** YYYY-MM-DD
- **Model:** sonar-pro
- **Query:** <original query>

---

<response content>

## Sources
1. [url](url)
2. [url](url)
```

If a file with the same slug already exists on the same date, append `-2`, `-3`, etc.

## Rules
- Never echo the API key
- Always include citations when the API returns them
- For `sonar-deep-research`: always warn about time/cost before running
- Follow `.claude/rules/communication-style.md` for all output
- Save path is always `references/research/` — never elsewhere
