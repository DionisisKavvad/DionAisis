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

// ---------------- Phase: Screen ----------------
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

// ---------------- Phase: Gather ----------------
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
    ? `This claim needs STABILITY: run the SAME one store 3 times and compare the \`characteristics\` arrays (flip rate).`
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

// ---------------- Main ----------------
function parseArgs(a) {
  if (a && typeof a === 'object') return a
  if (typeof a === 'string') {
    const s = a.trim()
    if (s.startsWith('{') || s.startsWith('[')) {
      try { return JSON.parse(s) } catch (_) { /* not JSON, treat as plain idea */ }
    }
    return { idea: a }
  }
  return {}
}
const input = parseArgs(args)
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

if (cfg.screen) {
  phase('Screen')
  const s = await screen(framed)
  if (!s.worthIt) {
    log(`Screen: not worth a full run — ${s.reason}`)
    return { verdict: 'inconclusive', screened: true, reason: s.reason, blockers: s.blockers, framed }
  }
  log(`Screen: proceeding — ${s.reason}`)
}

phase('Gather')
const gathered = await pipeline(
  framed.claims,
  (claim) => gather(claim, framed, cfg),
)
const findings = gathered.filter(Boolean).flatMap(g => g.findings)
log(`Gathered ${findings.length} findings across ${framed.claims.length} claims`)

return { stage: 'through-gather', framed, findings }
