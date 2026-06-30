# `/validate` Workflow Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable dynamic-workflow harness `/validate <idea>` that turns an idea into a falsifiable hypothesis, gathers evidence (live analyzer runs / web research / code inspection), adversarially reviews each finding, and writes a cited verdict report.

**Architecture:** A single self-contained workflow script `.claude/workflows/validate.js`. Phases: Frame → (optional Screen) → Gather (pipelined per claim, type-routed) → Review (independent skeptics, or debate for design hypotheses) → Synthesize (writes report). Every finding carries a schema-enforced verifiable artifact; nothing unverified reaches the report.

**Tech Stack:** Claude Code dynamic workflows (JavaScript script + injected `agent()`/`pipeline()`/`parallel()`/`phase()`/`log()`/`args`/`budget` globals), JSON Schema for structured agent output. Spec: `docs/superpowers/specs/2026-06-04-validation-workflow-harness-design.md`.

---

## Runtime constraints (read before coding)

- **Single file, self-contained.** No `require`/`import` of other project files. No filesystem/shell from the script itself (agents do that).
- **Banned in script:** `Date.now()`, `Math.random()`, argless `new Date()` — they throw. Date/slug for the report are produced by the **Synthesize agent** (it has tools). Vary agents by **index in prompt/label** instead of randomness.
- **`agent(prompt, opts)`** — `opts`: `{schema, phase, label, agentType, model}`. With `schema` returns a validated object; without, returns text. Returns `null` if the user skips it → `.filter(Boolean)`.
- **`pipeline(items, stage1, stage2)`** — each stage callback gets `(prevResult, originalItem, index)`. A throwing stage drops that item to `null`.
- **`parallel(thunks)`** — barrier; a throwing thunk → `null` in the result array.
- **Concurrency** auto-capped (~min(16, cores-2)); total agents capped at 1000.
- **Verification = real runs.** You cannot `node` this file. After each task, invoke the script via the `Workflow` tool (`{scriptPath: ".claude/workflows/validate.js", args: {...}}`) on a cheap input and inspect the returned object / written file. Workflow runs require explicit opt-in — that is expected here.

---

## File structure

| File | Responsibility |
|---|---|
| `.claude/workflows/validate.js` | The entire harness: `meta`, JSON schemas, phase functions (`frame`, `screen`, `gather*`, `reviewOne`/`debateOne`, `synthesize`), prompt builders, main flow. Built incrementally. |
| `docs/validations/` | Output directory for per-run reports (created by the Synthesize agent on first run). |

All tasks modify the same file. Each task adds one cohesive block (schemas, or one phase function + its prompt builder + main wiring) and is verified by a real run before commit.

---

## Task 1: Scaffold + Frame phase

**Files:**
- Create: `.claude/workflows/validate.js`

- [ ] **Step 1: Write the full scaffold with `meta`, schemas, the `frame` phase, and a frame-only main**

```javascript
export const meta = {
  name: 'validate',
  description: 'Validate an idea (pipeline output, design hypothesis, or business idea) with evidence-gated adversarial review',
  whenToUse: 'When you want an idea checked against real evidence with a cited verdict, not a single-agent guess',
  phases: [
    { title: 'Frame', detail: 'idea → falsifiable hypothesis + atomic claims' },
    { title: 'Screen', detail: 'optional cheap go/no-go pre-screen' },
    { title: 'Gather', detail: 'type-routed evidence; each finding carries an artifact' },
    { title: 'Review', detail: 'independent skeptics, or debate for design hypotheses' },
    { title: 'Synthesize', detail: 'verdict + confidence + report' },
  ],
}

// ---------------- Schemas ----------------
const FRAME_SCHEMA = {
  type: 'object',
  properties: {
    hypothesis: { type: 'string' },
    ideaType: { type: 'string', enum: ['pipeline-output', 'design-hypothesis', 'business-idea'] },
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          statement: { type: 'string' },
          evidenceNeeded: { type: 'string' },
          needsStability: { type: 'boolean' },
        },
        required: ['id', 'statement', 'evidenceNeeded', 'needsStability'],
        additionalProperties: false,
      },
    },
    confirmIf: { type: 'string' },
    refuteIf: { type: 'string' },
    gatherRoutes: {
      type: 'array',
      items: { type: 'string', enum: ['live-run', 'web-research', 'code-inspect', 'cost-feasibility'] },
    },
  },
  required: ['hypothesis', 'ideaType', 'claims', 'confirmIf', 'refuteIf', 'gatherRoutes'],
  additionalProperties: false,
}

// ---------------- Phase: Frame ----------------
function framePrompt(idea, type) {
  return [
    `You are framing an idea for rigorous validation. Idea:`,
    `"""${idea}"""`,
    type && type !== 'auto' ? `The caller says ideaType = ${type}. Use it unless clearly wrong.` : `Infer ideaType.`,
    ``,
    `ideaType meanings:`,
    `- pipeline-output: a claim about what the eshop-analyzer / brief code actually outputs. Verified by RUNNING the code on real stores.`,
    `- design-hypothesis: a design/marketing claim (e.g. "premium → serif font"). Verified by research + reading repo code/docs.`,
    `- business-idea: a feasibility/value claim about new or existing work. Verified by code/infra inspection + market research.`,
    ``,
    `Decompose into ATOMIC, separately-testable claims (not one monolithic "is it true"). 3-6 claims max.`,
    `Set needsStability=true ONLY for a claim that requires running the SAME store multiple times (e.g. "stable between runs").`,
    `confirmIf / refuteIf must be concrete thresholds where possible.`,
    `gatherRoutes: pick from live-run | web-research | code-inspect | cost-feasibility (the routes needed to get evidence).`,
  ].filter(Boolean).join('\n')
}

async function frame(idea, type) {
  return agent(framePrompt(idea, type), { label: 'frame', phase: 'Frame', schema: FRAME_SCHEMA })
}

// ---------------- Main ----------------
const input = typeof args === 'string' ? { idea: args } : (args || {})
if (!input || !input.idea) throw new Error('validate: missing `idea` (pass a string or { idea: "..." })')

const cfg = {
  type: input.type || 'auto',
  sample: Math.min(input.sample ?? 3, 5),
  stores: input.stores || null,
  screen: input.screen ?? false,
  skeptics: input.skeptics ?? 3,
  reviewMode: input.reviewMode || 'auto',
}

phase('Frame')
const framed = await frame(input.idea, cfg.type)
log(`Hypothesis: ${framed.hypothesis}`)
log(`${framed.claims.length} claims · type=${framed.ideaType} · routes=${framed.gatherRoutes.join(', ')}`)

return { stage: 'frame-only', framed }
```

- [ ] **Step 2: Verify with a real run**

Invoke the `Workflow` tool: `{ scriptPath: ".claude/workflows/validate.js", args: { idea: "premium fashion eshops convert better with serif fonts than sans-serif", type: "design-hypothesis" } }`

Expected: returns `{ stage: "frame-only", framed: {...} }` where `framed.ideaType === "design-hypothesis"`, 3-6 atomic `claims` each with `needsStability` boolean, and `gatherRoutes` includes `web-research` and/or `code-inspect`. The `/workflows` view shows one `Frame` agent.

- [ ] **Step 3: Commit**

```bash
git add .claude/workflows/validate.js
git commit -m "feat(validate): scaffold workflow + Frame phase"
```

---

## Task 2: Screen phase (optional pre-screen)

**Files:**
- Modify: `.claude/workflows/validate.js`

- [ ] **Step 1: Add the `SCREEN_SCHEMA`, the `screen` function, and prompt** (insert after the Frame phase block)

```javascript
const SCREEN_SCHEMA = {
  type: 'object',
  properties: {
    worthIt: { type: 'boolean' },
    reason: { type: 'string' },
    blockers: { type: 'array', items: { type: 'string' } },
  },
  required: ['worthIt', 'reason', 'blockers'],
  additionalProperties: false,
}

function screenPrompt(framed) {
  return [
    `Cheap go/no-go screen before an expensive validation run.`,
    `Hypothesis: ${framed.hypothesis}`,
    `Claims:\n${framed.claims.map(c => `- ${c.id}: ${c.statement}`).join('\n')}`,
    ``,
    `Is a full evidence-gathering + adversarial review worth it, or is this obviously settled / unfalsifiable / blocked?`,
    `worthIt=false ONLY if it is clearly not worth the cost. List concrete blockers if any.`,
  ].join('\n')
}

async function screen(framed) {
  return agent(screenPrompt(framed), { label: 'screen', phase: 'Screen', schema: SCREEN_SCHEMA })
}
```

- [ ] **Step 2: Wire the screen short-circuit into main** — replace the `return { stage: 'frame-only', framed }` line with:

```javascript
if (cfg.screen) {
  phase('Screen')
  const s = await screen(framed)
  if (!s.worthIt) {
    log(`Screen: not worth a full run — ${s.reason}`)
    return { verdict: 'inconclusive', screened: true, reason: s.reason, blockers: s.blockers, framed }
  }
  log(`Screen: proceeding — ${s.reason}`)
}

return { stage: 'through-screen', framed }
```

- [ ] **Step 3: Verify with a real run**

Invoke `Workflow`: `{ scriptPath: ".claude/workflows/validate.js", args: { idea: "we should rewrite the entire analyzer in COBOL for performance", type: "business-idea", screen: true } }`

Expected: returns `{ verdict: "inconclusive", screened: true, ... }` with `worthIt`-driven `reason` explaining it's not worth validating. Then run the same args WITHOUT `screen:true` and confirm it returns `{ stage: "through-screen" }` (no Screen agent spawned).

- [ ] **Step 4: Commit**

```bash
git add .claude/workflows/validate.js
git commit -m "feat(validate): add optional Screen pre-screen with short-circuit"
```

---

## Task 3: Gather phase (research route first) + per-claim pipeline

**Files:**
- Modify: `.claude/workflows/validate.js`

Research routes are free (no live $ cost), so build and verify them before live-run.

- [ ] **Step 1: Add `FINDINGS_SCHEMA`, the research/business/live-run gather functions, and a dispatcher** (insert after the Screen block)

```javascript
const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claimId: { type: 'string' },
          statement: { type: 'string' },
          stance: { type: 'string', enum: ['supports', 'contradicts'] },
          artifact: {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['code-output', 'url-quote', 'doc-line', 'metric'] },
              ref: { type: 'string' },
              excerpt: { type: 'string' },
            },
            required: ['kind', 'ref', 'excerpt'],
            additionalProperties: false,
          },
          rawConfidence: { type: 'number' },
        },
        required: ['claimId', 'statement', 'stance', 'artifact', 'rawConfidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['findings'],
  additionalProperties: false,
}

const ARTIFACT_RULE =
  'EVERY finding MUST include a real artifact object (kind + ref + verbatim excerpt). ' +
  'A finding without a concrete, checkable artifact is invalid — do not invent one; omit the finding instead. ' +
  'Return both supporting AND contradicting findings you actually found.'

function researchPrompt(claim, framed) {
  return [
    `Gather evidence for ONE claim of a design hypothesis. Do NOT guess — find sources.`,
    `Hypothesis: ${framed.hypothesis}`,
    `Claim ${claim.id}: ${claim.statement}`,
    `Evidence needed: ${claim.evidenceNeeded}`,
    ``,
    `Use WebSearch/WebFetch for best-practices/research, and read repo code/docs under`,
    `/Users/dionisis/Projects/eshop-analyzer, /Users/dionisis/Projects/brief-localhost,`,
    `/Users/dionisis/Projects/Platform/platform-client-v2 where relevant.`,
    `Artifact kinds: url-quote (ref=URL, excerpt=quoted sentence) or doc-line (ref=file:line, excerpt=line).`,
    ARTIFACT_RULE,
  ].join('\n')
}

function businessPrompt(claim, framed) {
  return [
    `Assess feasibility + value for ONE claim of a business idea.`,
    `Hypothesis: ${framed.hypothesis}`,
    `Claim ${claim.id}: ${claim.statement}`,
    `Evidence needed: ${claim.evidenceNeeded}`,
    ``,
    `Inspect real code/infra (repos: eshop-analyzer, brief-localhost, Platform/aws-microservices) for feasibility/cost,`,
    `and use WebSearch for market evidence. Artifact kinds: code-output, doc-line (ref=file:line), url-quote, metric.`,
    ARTIFACT_RULE,
  ].join('\n')
}

function liveRunPrompt(claim, framed, cfg) {
  const storeLine = cfg.stores
    ? `Use exactly these stores: ${cfg.stores.map(s => JSON.stringify(s)).join(', ')}.`
    : `Pick ${cfg.sample} representative Greek eshops (e.g. plaisio.gr, public.gr, a fashion store). Use real domains.`
  const runs = claim.needsStability
    ? `This claim needs STABILITY: run the SAME one store ${'3'} times and compare the \`characteristics\` arrays (flip rate).`
    : `Run each store ONCE.`
  return [
    `Gather evidence for ONE claim by RUNNING the real analyzer. Working dir: /Users/dionisis/Projects/eshop-analyzer.`,
    `Hypothesis: ${framed.hypothesis}`,
    `Claim ${claim.id}: ${claim.statement}`,
    `Evidence needed: ${claim.evidenceNeeded}`,
    ``,
    `Command per store: npm run workflow -- '{"storeName":"NAME","storeUrl":"https://URL","domain":"DOMAIN"}'`,
    storeLine,
    runs,
    `Parse the analyzer JSON output. Build findings whose artifact.kind="metric" (ref=what was measured, excerpt=the actual numbers),`,
    `or "code-output" for a raw JSON excerpt. Record vocabularyVersion/promptVersion if present.`,
    ARTIFACT_RULE,
  ].join('\n')
}

async function gather(claim, framed, cfg) {
  const t = framed.ideaType
  if (t === 'pipeline-output') {
    return agent(liveRunPrompt(claim, framed, cfg), { label: `gather-live:${claim.id}`, phase: 'Gather', schema: FINDINGS_SCHEMA })
  }
  if (t === 'business-idea') {
    return agent(businessPrompt(claim, framed), { label: `gather-biz:${claim.id}`, phase: 'Gather', agentType: 'general-purpose', schema: FINDINGS_SCHEMA })
  }
  return agent(researchPrompt(claim, framed), { label: `gather-research:${claim.id}`, phase: 'Gather', agentType: 'general-purpose', schema: FINDINGS_SCHEMA })
}
```

- [ ] **Step 2: Wire a gather-only pipeline into main** — replace `return { stage: 'through-screen', framed }` with:

```javascript
phase('Gather')
const gathered = await pipeline(
  framed.claims,
  (claim) => gather(claim, framed, cfg),
)
const findings = gathered.filter(Boolean).flatMap(g => g.findings)
log(`Gathered ${findings.length} findings across ${framed.claims.length} claims`)

return { stage: 'through-gather', framed, findings }
```

- [ ] **Step 3: Verify with a real run** (design-hypothesis = free)

Invoke `Workflow`: `{ scriptPath: ".claude/workflows/validate.js", args: { idea: "the brief uses a fixed 26-tag characteristics vocabulary and the analyzer emits exactly those tags", type: "design-hypothesis" } }`

Expected: returns `{ stage: "through-gather", findings: [...] }` where every finding has `artifact.kind` of `doc-line`/`url-quote`, a real `ref` (e.g. `src/utils/store-analysis.js:14`) and a verbatim `excerpt`. There should be at least one finding referencing the actual `CHARACTERISTICS_ENUM`.

- [ ] **Step 4: Commit**

```bash
git add .claude/workflows/validate.js
git commit -m "feat(validate): add type-routed Gather phase with artifact gate"
```

---

## Task 4: Review phase (adversarial skeptics + debate mode)

**Files:**
- Modify: `.claude/workflows/validate.js`

- [ ] **Step 1: Add review schemas, lens helpers, `reviewOne`, `debateOne`, and `reviewFindings`** (insert after the Gather block)

```javascript
const SKEPTIC_SCHEMA = {
  type: 'object',
  properties: { refuted: { type: 'boolean' }, why: { type: 'string' } },
  required: ['refuted', 'why'],
  additionalProperties: false,
}

const JUDGE_SCHEMA = {
  type: 'object',
  properties: { survived: { type: 'boolean' }, reasoning: { type: 'string' } },
  required: ['survived', 'reasoning'],
  additionalProperties: false,
}

const LENSES = [
  'Is the artifact REAL and SUFFICIENT to support this exact claim? Quote it back and judge sufficiency.',
  'Is there an ALTERNATIVE explanation for this artifact that does NOT support the claim?',
  'Is there SAMPLE/SELECTION BIAS or over-generalization from too little data?',
]

function pickLenses(n) {
  if (n <= LENSES.length) return LENSES.slice(0, Math.max(1, n))
  const out = []
  for (let i = 0; i < n; i++) out.push(`${LENSES[i % LENSES.length]} (independent pass ${i + 1})`)
  return out
}

function skepticPrompt(finding, claim, framed, lens) {
  return [
    `You are an independent skeptic. Try to REFUTE this finding. Default to refuted=true if you are uncertain.`,
    `Hypothesis: ${framed.hypothesis}`,
    `Claim ${claim.id}: ${claim.statement}`,
    `Finding (${finding.stance}): ${finding.statement}`,
    `Artifact: [${finding.artifact.kind}] ${finding.artifact.ref} — "${finding.artifact.excerpt}"`,
    ``,
    `Your refutation lens: ${lens}`,
    `Verify the artifact independently if you can (read the file / open the URL). refuted=true if the finding does not hold under this lens.`,
  ].join('\n')
}

function fid(finding, idx) {
  return `${finding.claimId}-f${idx}`
}

async function reviewOne(finding, claim, framed, mode, cfg, idx) {
  if (mode === 'debate') return debateOne(finding, claim, framed, idx)
  const lenses = pickLenses(cfg.skeptics)
  const votes = await parallel(
    lenses.map((lens, j) => () =>
      agent(skepticPrompt(finding, claim, framed, lens), {
        label: `skeptic:${claim.id}:${idx}:${j}`,
        phase: 'Review',
        schema: SKEPTIC_SCHEMA,
      })
    )
  )
  const lensVotes = lenses.map((l, j) => ({
    lens: l,
    refuted: votes[j]?.refuted ?? true,
    why: votes[j]?.why ?? 'no vote (treated as refuted)',
  }))
  const refutedCount = lensVotes.filter(v => v.refuted).length
  const survived = refutedCount <= Math.floor(lenses.length / 2)
  return {
    finding,
    verdict: { findingId: fid(finding, idx), survived, lensVotes, refutations: lensVotes.filter(v => v.refuted).map(v => v.why) },
  }
}

function proPrompt(finding, claim, framed) {
  return `Argue, with citations, that this finding holds.\nClaim ${claim.id}: ${claim.statement}\nFinding: ${finding.statement}\nArtifact: [${finding.artifact.kind}] ${finding.artifact.ref} — "${finding.artifact.excerpt}"`
}
function devilPrompt(finding, claim, framed) {
  return `Devil's advocate: argue, with citations, that this finding does NOT hold or is unsupported.\nClaim ${claim.id}: ${claim.statement}\nFinding: ${finding.statement}\nArtifact: [${finding.artifact.kind}] ${finding.artifact.ref} — "${finding.artifact.excerpt}"`
}
function judgePrompt(finding, claim, framed, pro, con) {
  return [
    `Judge a debate about a finding. Weigh both sides on evidence quality, not rhetoric.`,
    `Claim ${claim.id}: ${claim.statement}`,
    `Finding: ${finding.statement}`,
    `PRO argument:\n${pro}`,
    `CON argument:\n${con}`,
    `survived=true only if PRO is better grounded in verifiable evidence.`,
  ].join('\n')
}

async function debateOne(finding, claim, framed, idx) {
  const [pro, con] = await Promise.all([
    agent(proPrompt(finding, claim, framed), { label: `debate-pro:${claim.id}:${idx}`, phase: 'Review' }),
    agent(devilPrompt(finding, claim, framed), { label: `debate-con:${claim.id}:${idx}`, phase: 'Review' }),
  ])
  const j = await agent(judgePrompt(finding, claim, framed, pro || '(none)', con || '(none)'), {
    label: `debate-judge:${claim.id}:${idx}`,
    phase: 'Review',
    schema: JUDGE_SCHEMA,
  })
  return {
    finding,
    verdict: {
      findingId: fid(finding, idx),
      survived: j.survived,
      lensVotes: [{ lens: 'debate', refuted: !j.survived, why: j.reasoning }],
      refutations: j.survived ? [] : [j.reasoning],
    },
  }
}

async function reviewFindings(findings, claim, framed, mode, cfg) {
  const reviewed = await parallel(findings.map((f, i) => () => reviewOne(f, claim, framed, mode, cfg, i)))
  return reviewed.filter(Boolean)
}
```

- [ ] **Step 2: Wire Gather→Review into one pipeline** — replace the `phase('Gather') … return { stage: 'through-gather', … }` block in main with:

```javascript
const mode = cfg.reviewMode === 'auto'
  ? (framed.ideaType === 'design-hypothesis' ? 'debate' : 'adversarial')
  : cfg.reviewMode

const reviewed = await pipeline(
  framed.claims,
  (claim) => gather(claim, framed, cfg),
  (gathered, claim) => reviewFindings(gathered.findings, claim, framed, mode, cfg),
)
const allReviewed = reviewed.filter(Boolean).flat()
log(`Reviewed ${allReviewed.length} findings (mode=${mode})`)

return { stage: 'through-review', framed, mode, reviewed: allReviewed }
```

Make sure the standalone `phase('Gather')` call from Task 3 is removed; the `pipeline` stages assign their own `phase` via the `agent()` `phase:` option, so no global `phase()` call is needed here (avoids a race between Gather and Review groups).

- [ ] **Step 3: Verify with a real run**

Invoke `Workflow`: `{ scriptPath: ".claude/workflows/validate.js", args: { idea: "the analyzer emits exactly the 26-tag CHARACTERISTICS_ENUM", type: "design-hypothesis" } }`

Expected: returns `{ stage: "through-review", mode: "debate", reviewed: [...] }`. Each item has `verdict.survived` (boolean) and a `lensVotes` entry. Then run with `args: { idea: "...", type: "design-hypothesis", reviewMode: "adversarial", skeptics: 3 }` and confirm each verdict now has 3 `lensVotes`.

- [ ] **Step 4: Commit**

```bash
git add .claude/workflows/validate.js
git commit -m "feat(validate): add adversarial + debate Review phase"
```

---

## Task 5: Synthesize phase + report writing

**Files:**
- Modify: `.claude/workflows/validate.js`

- [ ] **Step 1: Add `SYNTHESIS_SCHEMA`, `synthesizePrompt`, and `synthesize`** (insert after the Review block)

```javascript
const SYNTHESIS_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['validated', 'refuted', 'inconclusive'] },
    confidence: { type: 'number' },
    perClaim: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claimId: { type: 'string' },
          verdict: { type: 'string' },
          surviving: { type: 'array', items: { type: 'string' } },
          dropped: { type: 'array', items: { type: 'string' } },
        },
        required: ['claimId', 'verdict', 'surviving', 'dropped'],
        additionalProperties: false,
      },
    },
    droppedFindings: { type: 'array', items: { type: 'string' } },
    recommendation: { type: 'string' },
    nextSteps: { type: 'array', items: { type: 'string' } },
    slug: { type: 'string' },
    reportPath: { type: 'string' },
  },
  required: ['verdict', 'confidence', 'perClaim', 'droppedFindings', 'recommendation', 'nextSteps', 'slug', 'reportPath'],
  additionalProperties: false,
}

function synthesizePrompt(framed, reviewed, mode) {
  const rows = reviewed.map(r =>
    `- [${r.verdict.survived ? 'SURVIVED' : 'KILLED'}] (${r.finding.stance}) ${r.finding.statement} | artifact: [${r.finding.artifact.kind}] ${r.finding.artifact.ref} | refutations: ${r.verdict.refutations.join('; ') || 'none'}`
  ).join('\n')
  return [
    `Synthesize a validation verdict. Use ONLY surviving findings as positive evidence; list killed ones as dropped (transparency).`,
    `Hypothesis: ${framed.hypothesis}`,
    `confirmIf: ${framed.confirmIf}`,
    `refuteIf: ${framed.refuteIf}`,
    `Review mode: ${mode}`,
    `Claims:\n${framed.claims.map(c => `  ${c.id}: ${c.statement}`).join('\n')}`,
    `Reviewed findings:\n${rows}`,
    ``,
    `Decide verdict (validated | refuted | inconclusive) against confirmIf/refuteIf, with a 0..1 confidence.`,
    `Then WRITE a report file:`,
    `  1. Run \`date +%Y-%m-%d\` to get today's date.`,
    `  2. Make a kebab-case slug (<=6 words) from the hypothesis.`,
    `  3. mkdir -p /Users/dionisis/Projects/eshop-analyzer/docs/validations`,
    `  4. Write /Users/dionisis/Projects/eshop-analyzer/docs/validations/<date>-<slug>-validation.md containing:`,
    `     hypothesis, verdict + confidence, per-claim evidence with citations (artifact ref + excerpt),`,
    `     a "Dropped / refuted" section, recommendation, and next steps.`,
    `Return the structured object, with slug and the absolute reportPath you wrote.`,
  ].join('\n')
}

async function synthesize(framed, reviewed, mode) {
  return agent(synthesizePrompt(framed, reviewed, mode), { label: 'synthesize', phase: 'Synthesize', schema: SYNTHESIS_SCHEMA })
}
```

- [ ] **Step 2: Wire Synthesize into main** — replace `return { stage: 'through-review', … }` with:

```javascript
phase('Synthesize')
const result = await synthesize(framed, allReviewed, mode)
log(`Verdict: ${result.verdict} @${result.confidence} → ${result.reportPath}`)
return { hypothesis: framed.hypothesis, ideaType: framed.ideaType, mode, ...result }
```

- [ ] **Step 3: Verify with a real run**

Invoke `Workflow`: `{ scriptPath: ".claude/workflows/validate.js", args: { idea: "the analyzer emits exactly the 26-tag CHARACTERISTICS_ENUM", type: "design-hypothesis" } }`

Expected: returns `{ verdict, confidence, reportPath, ... }`. Then `Read` the `reportPath` file and confirm it exists, contains the verdict + confidence, per-claim cited evidence, and a "Dropped / refuted" section.

- [ ] **Step 4: Commit**

```bash
git add .claude/workflows/validate.js
git commit -m "feat(validate): add Synthesize phase + cited report output"
```

---

## Task 6: Live-run route end-to-end (pipeline-output smoke test) + caps/budget

**Files:**
- Modify: `.claude/workflows/validate.js`

- [ ] **Step 1: Make `sample`/`skeptics` budget-aware** — in main, immediately after the `const cfg = {...}` block, add:

```javascript
// Budget-aware scaling: shrink the expensive knobs when a token target is set and low.
if (budget.total && budget.remaining() < 150_000) {
  cfg.sample = Math.min(cfg.sample, 2)
  cfg.skeptics = Math.min(cfg.skeptics, 2)
  log(`Budget low (${Math.round(budget.remaining() / 1000)}k left) → sample=${cfg.sample}, skeptics=${cfg.skeptics}`)
}
```

- [ ] **Step 2: Verify the live-run path with a capped real run**

Invoke `Workflow`: `{ scriptPath: ".claude/workflows/validate.js", args: { idea: "the 26-tag extraction is stable across runs and low-confidence voice tags do not project across most stores", type: "pipeline-output", sample: 1 } }`

Expected (this spends ~$0.33–$1 on real analyzer runs — sample:1 keeps it minimal): a `pipeline-output` run where the Gather agent actually executes `npm run workflow`, findings have `artifact.kind: "metric"` with real numbers, the stability claim triggers a same-store ×3 run, and a report is written to `docs/validations/`. Confirm via the returned `reportPath` and `Read`.

If the analyzer needs `CLAUDE_CODE_OAUTH_TOKEN` in `.env` (per project README), confirm it is present before this step; if missing, the Gather agent should report a `contradicts`/no-artifact result rather than fabricate metrics — verify it did not invent numbers.

- [ ] **Step 3: Commit**

```bash
git add .claude/workflows/validate.js
git commit -m "feat(validate): budget-aware caps + verify live-run pipeline-output path"
```

---

## Task 7: Save as `/validate` command + document

**Files:**
- Modify: `.claude/workflows/validate.js` (already in `.claude/workflows/`, so it is already a `/validate` command)
- Modify: `README.md` (add a short Validation section)

- [ ] **Step 1: Confirm the command is discoverable**

The file at `.claude/workflows/validate.js` is automatically available as `/validate` in this project. Start a check: in a session, `/validate` should appear in `/` autocomplete. (No code change needed; this step is a confirmation.)

- [ ] **Step 2: Add a Validation section to `README.md`** — append:

```markdown
## Validation harness (`/validate`)

`/validate <idea>` runs a dynamic workflow that frames an idea into falsifiable claims,
gathers evidence (live analyzer runs / web research / code inspection), adversarially
reviews each finding (independent skeptics, or debate for design hypotheses), and writes
a cited verdict report to `docs/validations/`.

```bash
# Design hypothesis (free — research only)
/validate "premium fashion eshops convert better with serif fonts"

# Pipeline output (runs the real analyzer — costs $; cap with sample)
# args: { idea, type: "pipeline-output", sample: 1 }

# Optional cheap pre-screen and knobs:
# args: { idea, screen: true, skeptics: 3, sample: 3, reviewMode: "adversarial" }
```

Design + behavior contract: `docs/superpowers/specs/2026-06-04-validation-workflow-harness-design.md`.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/workflows/validate.js README.md
git commit -m "docs(validate): document /validate harness in README"
```

---

## Self-review notes (author checklist — already applied)

- **Spec coverage:** Frame (§3.1)→T1, Screen (§3.2)→T2, Gather+artifact gate (§3.3)→T3, Review adversarial+debate (§3.4)→T4, Synthesize+report (§3.5)→T5, caps/budget/live-run (§4, §9 smoke)→T6, save+docs (§5)→T7. Decisions §7: slug/date by Synthesize agent (T5), agentType routing (T3), stability ×3 gated by `needsStability` (T3 `liveRunPrompt`).
- **Type consistency:** `framed.claims[].{id,statement,evidenceNeeded,needsStability}`, finding `{claimId,statement,stance,artifact{kind,ref,excerpt},rawConfidence}`, verdict `{findingId,survived,lensVotes,refutations}` are used identically across T3–T5. `gather`/`reviewFindings`/`reviewOne`/`debateOne`/`synthesize` signatures match their call sites.
- **No placeholders:** all phase code is complete. The only intentional runtime-formatted value is the report date (`date +%Y-%m-%d` in the Synthesize agent), required because the script cannot call `new Date()`.
- **Known sharp edge:** `ARTIFACT_RULE` is built with single-quoted string concatenation (no backticks) specifically to avoid a template-literal escaping footgun.
```
