# Idea Judge: Agent Specifications

**Date:** 2026-04-26
**Companion to:** `2026-04-26-idea-judge-system.md`

Αναλυτικές προδιαγραφές για κάθε agent του συστήματος. Κάθε spec περιγράφει ακριβώς τι κάνει, τι παίρνει ως input, τι παράγει, και πώς αλληλεπιδρά με τους υπόλοιπους.

---

## Wave 1: Research Team

### 1.1 Research Lead

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Team orchestrator + synthesizer |
| **Wave** | 1 (Research) |
| **Type** | Lead |

**Αρμοδιότητες:**
- Διαβάζει το `input.md` (niche, budget, skills, timeframe)
- Σπάει το research σε δύο παράλληλα tasks: market analysis + web research
- Dispatches τα tasks στους Market Analyst και Perplexity Researcher
- Περιμένει τα outputs και τους δύο
- Συνθέτει τα findings σε ένα coherent research summary
- Εντοπίζει contradictions μεταξύ των δύο sources και τις σημειώνει
- Βγάζει preliminary opportunity list (δεν είναι ακόμα strategies, μόνο "εδώ υπάρχει χώρος")

**Input:**
```
Reads: {run}/input.md
```

**Output:**
```
Writes: {run}/wave-1-research/research-summary.md
```

**Output format (research-summary.md):**
```markdown
# Research Summary: {run-name}

## Market Overview
- Market size + trend direction
- Growth rate + projections
- Key players

## Opportunities Identified
For each opportunity (5-8):
  - Description
  - Why it exists (gap, trend, underserved segment)
  - Evidence (data points, sources)
  - Competition density: LOW / MEDIUM / HIGH
  - Revenue benchmark: how much similar businesses make

## Constraints
- Budget: {budget} implications
- Skills: what the skill set enables / limits
- Timeframe: what's realistic in {timeframe}

## Contradictions & Caveats
- Where Market Analyst and Perplexity Researcher disagreed
- Data points that seem unreliable
- Gaps in available information

## Raw Sources
- Link/reference to Market Analyst findings
- Link/reference to Perplexity findings
```

**Interaction pattern:**
1. Reads input.md
2. Spawns Market Analyst + Perplexity Researcher (parallel)
3. Waits for both
4. Reads their output files
5. Synthesizes into research-summary.md
6. Updates _status.md to COMPLETE

---

### 1.2 Market Analyst

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Market trends + competitive landscape |
| **Wave** | 1 (Research) |
| **Type** | Support |

**Αρμοδιότητες:**
- Αναλύει market trends στο δοθέν niche
- Εντοπίζει ανταγωνιστές και τι κάνουν (products, pricing, positioning)
- Μετράει competition density (πόσοι παίκτες, πόσο κορεσμένο)
- Βρίσκει revenue benchmarks (τι τζίρο κάνουν existing businesses στο space)
- Εντοπίζει underserved segments (ποιοι δεν εξυπηρετούνται καλά)
- Αναγνωρίζει market timing signals (αυξάνεται, μειώνεται, plateau)

**Input:**
```
Receives from Lead: niche, budget, skills, timeframe (as prompt context)
```

**Output:**
```
Writes: {run}/wave-1-research/market-analysis.md
```

**Output format (market-analysis.md):**
```markdown
# Market Analysis: {niche}

## Market Size & Trends
- Estimated market size
- Growth direction (growing/stable/declining)
- Key trends driving the market

## Competitive Landscape
For each major competitor (top 5-10):
  - Name
  - What they offer
  - Pricing model + price points
  - Strengths
  - Weaknesses / gaps

## Competition Density
- Overall: LOW / MEDIUM / HIGH
- By sub-segment (if applicable)

## Revenue Benchmarks
- Average revenue for similar businesses
- Range (low/mid/high performers)
- Time-to-revenue typical path

## Underserved Segments
- Who is not being served well
- Why (too expensive, too complex, wrong audience, missing features)

## Timing Signals
- Is now a good time to enter? Why?
```

**Tools:** Perplexity API (for market data searches)

---

### 1.3 Perplexity Researcher

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Real-time web data collection |
| **Wave** | 1 (Research) |
| **Type** | Support |

**Αρμοδιότητες:**
- Κάνει targeted web searches μέσω Perplexity API
- Ψάχνει specific data points: τιμές, case studies, success stories, failures
- Βρίσκει πρόσφατα articles/posts για trends στο niche
- Εντοπίζει communities (Reddit, forums, Discord) σχετικά με το niche
- Συλλέγει pricing data points από existing products
- Ψάχνει regulatory/legal considerations αν υπάρχουν

**Input:**
```
Receives from Lead: niche, budget, skills, timeframe (as prompt context)
```

**Output:**
```
Writes: {run}/wave-1-research/perplexity-findings.md
```

**Output format (perplexity-findings.md):**
```markdown
# Perplexity Research Findings: {niche}

## Search Queries Executed
- Query 1: "..." -> key findings
- Query 2: "..." -> key findings
- (5-10 queries)

## Key Data Points
For each finding:
  - Fact/data point
  - Source URL
  - Date (how recent)
  - Reliability: HIGH / MEDIUM / LOW

## Case Studies Found
- Success stories (who made it work, how, what revenue)
- Failure stories (who tried and failed, why)

## Community Signals
- Reddit threads, forums, Discord servers
- Common complaints from customers in the space
- Common requests/wishes (unmet needs)

## Pricing Intelligence
- What people are paying for similar products/services
- Price sensitivity signals

## Regulatory / Legal Notes
- Any compliance considerations
- Barriers to entry
```

**Tools:** Perplexity API (primary tool, multiple queries per run)

---

## Wave 2: Generation Team

### 2.1 Strategy Lead

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Team orchestrator + strategy curator |
| **Wave** | 2 (Generate) |
| **Type** | Lead |

**Αρμοδιότητες:**
- Διαβάζει το research summary από Wave 1
- Dispatches Creative Ideator με context από research
- Παίρνει τα raw ideas και τα στέλνει στον Feasibility Checker
- Κάνει final curation: αφαιρεί duplicates, merges παρόμοιες ιδέες, βελτιώνει descriptions
- Εξασφαλίζει ότι κάθε strategy έχει ολοκληρωμένη δομή (description, revenue model, target, effort, timeline)
- Φιλτράρει strategies που δεν πέρασαν feasibility
- Γράφει final strategies.md με τις viable ιδέες

**Input:**
```
Reads: {run}/wave-1-research/research-summary.md
```

**Output:**
```
Writes: {run}/wave-2-generate/strategies.md
```

**Output format (strategies.md):**
```markdown
# Generated Strategies: {run-name}

## Summary
- Total ideas generated: X
- Passed feasibility: Y
- Final strategies: Z

## Strategy 1: {name}
- **Description:** What it is, in 2-3 sentences
- **Revenue Model:** How it makes money (subscription, one-time, ads, affiliate, etc.)
- **Target Audience:** Who pays, and why they'd pay
- **Estimated Effort:** hours/week + total weeks
- **Budget Required:** EUR estimate for launch
- **Time to First Revenue:** weeks/months estimate
- **Key Assumption:** The one thing that must be true for this to work
- **Feasibility Score:** PASS (from Feasibility Checker)
- **Feasibility Notes:** Key considerations

## Strategy 2: {name}
(same structure)

## Strategy N: {name}
(same structure)

## Rejected Ideas (failed feasibility)
- Idea A: reason for rejection
- Idea B: reason for rejection
```

**Interaction pattern:**
1. Reads research-summary.md
2. Spawns Creative Ideator
3. Reads creative-ideas.md
4. Spawns Feasibility Checker
5. Reads feasibility-checks.md
6. Curates into final strategies.md
7. Updates _status.md to COMPLETE

---

### 2.2 Creative Ideator

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Divergent thinking, idea generation |
| **Wave** | 2 (Generate) |
| **Type** | Support |

**Αρμοδιότητες:**
- Παράγει 10-15 raw business ideas βασισμένες στα research findings
- Σκέφτεται divergent: not just obvious ideas, αλλά και unexpected combinations
- Κάθε ιδέα πρέπει να είναι grounded σε κάποιο finding από το research (όχι random)
- Εξετάζει διαφορετικά revenue models per idea (subscription, marketplace, freemium, pay-per-use)
- Εξετάζει variations: ίδια ιδέα σε διαφορετικό audience ή pricing
- Δεν φιλτράρει (αυτό το κάνει ο Feasibility Checker), μόνο παράγει

**Input:**
```
Receives from Lead: research-summary.md content (as prompt context)
```

**Output:**
```
Writes: {run}/wave-2-generate/creative-ideas.md
```

**Output format (creative-ideas.md):**
```markdown
# Raw Ideas: {run-name}

## Idea 1: {name}
- What: brief description
- Revenue model: how it makes money
- Based on: which research finding inspired it
- Target: who would use/pay
- Why now: why this timing works

## Idea 2: {name}
(same structure)

(10-15 ideas total, no filtering)
```

**Constraints:**
- Minimum 10 ideas, target 15
- At least 3 different revenue models across all ideas
- At least 2 "unexpected" ideas (cross-niche, contrarian, non-obvious)
- Each must reference a specific research finding

---

### 2.3 Feasibility Checker

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Reality filter for raw ideas |
| **Wave** | 2 (Generate) |
| **Type** | Support |

**Αρμοδιότητες:**
- Παίρνει τα raw ideas από Creative Ideator
- Για κάθε idea κάνει feasibility check σε 4 axes:
  - **Technical:** μπορεί να χτιστεί με τα διαθέσιμα skills?
  - **Budget:** χωράει στο budget?
  - **Time:** μπορεί να γίνει στο timeframe?
  - **Market:** υπάρχει αρκετή ζήτηση βάσει του research?
- Βγάζει PASS / FAIL per idea
- Για FAIL: εξηγεί ακριβώς γιατί (ποιο axis απέτυχε και πώς)
- Για PASS: σημειώνει risks/caveats

**Input:**
```
Reads: {run}/wave-2-generate/creative-ideas.md
Also reads: {run}/input.md (for budget, skills, timeframe constraints)
```

**Output:**
```
Writes: {run}/wave-2-generate/feasibility-checks.md
```

**Output format (feasibility-checks.md):**
```markdown
# Feasibility Checks: {run-name}

## Idea 1: {name}
- **Technical:** PASS/FAIL - explanation
- **Budget:** PASS/FAIL - estimated cost vs available budget
- **Time:** PASS/FAIL - estimated timeline vs available timeframe
- **Market:** PASS/FAIL - demand evidence from research
- **Overall:** PASS / FAIL
- **Notes:** key risks even if passed

## Idea 2: {name}
(same structure)
```

**Decision rules:**
- 1 FAIL on any axis = overall FAIL (strict mode)
- Exception: if Technical is borderline and the other 3 are strong PASS, overall = PASS with warning

---

## Wave 3: Debate Team

### 3.1 Critic Lead

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Debate orchestrator + final judge |
| **Wave** | 3 (Debate) |
| **Type** | Lead |

**Αρμοδιότητες:**
- Διαβάζει strategies.md από Wave 2
- Για κάθε strategy τρέχει 3-round adversarial debate:
  - Round 1: στέλνει strategy στον Devil's Advocate, παίρνει counter-arguments
  - Round 2: φτιάχνει revised version που απαντά στα counter-arguments, ξαναστέλνει
  - Round 3: final version, last objections
- Μαζεύει claims/assumptions που χρειάζονται verification, τα στέλνει στον Fact Checker
- Μετά τα 3 rounds, βγάζει final verdict per strategy:
  - **STRONG:** Η στρατηγική επιβίωσε. Τα counter-arguments απαντήθηκαν, τα facts στέκουν.
  - **WEAK:** Η στρατηγική έχει σημαντικά issues αλλά δεν είναι dead. Μπορεί να δουλέψει με αλλαγές.
  - **KILL:** Η στρατηγική έχει fatal flaws. Δεν αξίζει περαιτέρω effort.
- Γράφει detailed reasoning πίσω από κάθε verdict

**Input:**
```
Reads: {run}/wave-2-generate/strategies.md
```

**Output:**
```
Writes: {run}/wave-3-debate/round-1.md
Writes: {run}/wave-3-debate/round-2.md
Writes: {run}/wave-3-debate/round-3.md
Writes: {run}/wave-3-debate/debate-verdict.md
```

**Output format (debate-verdict.md):**
```markdown
# Debate Verdicts: {run-name}

## Strategy 1: {name}
- **Verdict:** STRONG / WEAK / KILL
- **Confidence:** HIGH / MEDIUM / LOW
- **Key strengths that survived debate:**
  - ...
- **Weaknesses acknowledged:**
  - ...
- **Fact check results:**
  - Claim A: VERIFIED / DEBUNKED / INCONCLUSIVE
  - Claim B: ...
- **Reasoning:** Why this verdict (2-3 sentences)

## Strategy 2: {name}
(same structure)
```

**Interaction pattern:**
1. Reads strategies.md
2. For each strategy:
   a. Sends to Devil's Advocate (Round 1)
   b. Gets counter-arguments
   c. Revises, sends back (Round 2)
   d. Gets deeper objections
   e. Final version (Round 3)
   f. Collects claims, sends to Fact Checker
3. Writes round-1/2/3.md (logs of all rounds)
4. Writes debate-verdict.md
5. Updates _status.md to COMPLETE

---

### 3.2 Devil's Advocate

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Attack strategies, find holes |
| **Wave** | 3 (Debate) |
| **Type** | Support |

**Αρμοδιότητες:**
- Παίρνει μια strategy και προσπαθεί να τη σπάσει
- Ψάχνει:
  - **Λανθασμένα assumptions:** "Υποθέτεις ότι X, αλλά στην πραγματικότητα..."
  - **Hidden costs:** Κρυφά κόστη που δεν υπολογίστηκαν
  - **Competitive response:** Τι θα κάνουν οι ανταγωνιστές αν μπεις
  - **Worst-case scenarios:** Τι γίνεται αν πάει στραβά (customer acquisition fails, tech breaks, market shifts)
  - **Scale problems:** Τι σπάει αν δουλέψει πολύ καλά (support load, infrastructure, burnout)
  - **Survivorship bias:** Αν η strategy βασίζεται σε success stories, τι μας λένε τα failures
- Κάθε round πρέπει να φέρνει ΝΕΕΣ objections, όχι τις ίδιες ξανά
- Δεν προτείνει fixes (αυτό το κάνει ο Critic Lead), μόνο σπάει

**Input:**
```
Receives from Lead: strategy description + any revisions from previous rounds
```

**Output:**
```
Returns to Lead: list of counter-arguments, weaknesses, objections
```

**Output format per round:**
```markdown
## Counter-Arguments: {strategy name} (Round X)

### Assumption Attacks
- Assumption: "{quoted assumption}"
  Attack: why this might be wrong

### Hidden Costs
- Cost 1: description + estimated impact

### Competitive Threats
- Threat 1: what competitors would do

### Worst-Case Scenarios
- Scenario 1: what happens if X fails

### Scale Problems
- Problem 1: what breaks at scale

### Overall Assessment
- Severity: FATAL / SERIOUS / MINOR
- Key weakness: the single biggest problem
```

**Constraints:**
- Min 3 objections per round
- Each round must raise at least 1 new category of objection
- Cannot repeat an objection from a previous round
- Must be specific, not generic ("this market is competitive" is too vague)

---

### 3.3 Fact Checker

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Verify specific claims with real data |
| **Wave** | 3 (Debate) |
| **Type** | Support |

**Αρμοδιότητες:**
- Παίρνει specific claims/assumptions από τον Critic Lead
- Για κάθε claim κάνει Perplexity search για verification
- Κατηγοριοποιεί κάθε claim:
  - **VERIFIED:** Data υποστηρίζουν το claim
  - **DEBUNKED:** Data αντικρούουν το claim
  - **INCONCLUSIVE:** Δεν βρέθηκαν αρκετά data
  - **OUTDATED:** Ήταν σωστό κάποτε, δεν ισχύει πλέον
- Παρέχει sources για κάθε verification
- Σημειώνει πόσο reliable είναι τα sources

**Input:**
```
Receives from Lead: list of claims to verify
```

**Output:**
```
Writes: {run}/wave-3-debate/fact-checks.md
```

**Output format (fact-checks.md):**
```markdown
# Fact Checks: {run-name}

## Claim 1: "{exact claim text}"
- **Verdict:** VERIFIED / DEBUNKED / INCONCLUSIVE / OUTDATED
- **Evidence:** What the data says
- **Sources:**
  - Source 1: URL/description (reliability: HIGH/MEDIUM/LOW)
  - Source 2: ...
- **Notes:** Context, caveats

## Claim 2: "{exact claim text}"
(same structure)
```

**Tools:** Perplexity API
**Constraints:**
- Minimum 2 sources per claim
- Must state source reliability
- Must flag when data is older than 6 months

---

## Wave 4: Scoring Team

### 4.1 Scorer Lead

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Multi-axis scoring + ranking |
| **Wave** | 4 (Score) |
| **Type** | Lead |

**Αρμοδιότητες:**
- Διαβάζει debate verdicts (μόνο STRONG + WEAK strategies, αγνοεί KILL)
- Στέλνει surviving strategies στον Economics Analyst για unit economics deep-dive
- Βαθμολογεί κάθε strategy σε 5 axes (1-10 scale):
  - Revenue Potential (25%)
  - Time to Money (25%)
  - Effort Required (20%, inverse)
  - Risk Level (15%, inverse)
  - Scalability (15%)
- Υπολογίζει weighted score
- Κατατάσσει strategies
- Επιλέγει top 3
- Εξηγεί γιατί κάθε strategy πήρε τη βαθμολογία που πήρε

**Input:**
```
Reads: {run}/wave-3-debate/debate-verdict.md
```

**Output:**
```
Writes: {run}/wave-4-score/scores.md
```

**Output format (scores.md):**
```markdown
# Strategy Scores: {run-name}

## Rankings

| Rank | Strategy | Revenue | Time | Effort | Risk | Scale | Weighted |
|------|----------|---------|------|--------|------|-------|----------|
| 1 | {name} | 8/10 | 7/10 | 6/10 | 7/10 | 9/10 | 7.45 |
| 2 | {name} | ... | ... | ... | ... | ... | ... |
| 3 | {name} | ... | ... | ... | ... | ... | ... |
| 4 | {name} | ... | ... | ... | ... | ... | ... |

## Top 3 (proceed to planning)

### #1: {name} (score: X.XX)
- **Why this ranked first:** explanation
- **Revenue reasoning:** why X/10
- **Time reasoning:** why X/10
- **Effort reasoning:** why X/10
- **Risk reasoning:** why X/10
- **Scalability reasoning:** why X/10
- **Economics summary:** key findings from Economics Analyst
- **Debate verdict was:** STRONG/WEAK + key takeaway

### #2: {name} (score: X.XX)
(same structure)

### #3: {name} (score: X.XX)
(same structure)

## Did Not Make Top 3
- {name} (score: X.XX): short reason why it ranked lower
```

**Interaction pattern:**
1. Reads debate-verdict.md, filters out KILL
2. Spawns Economics Analyst with surviving strategies
3. Reads economics-analysis.md
4. Scores each strategy using economics data + debate results
5. Writes scores.md
6. Updates _status.md to COMPLETE

---

### 4.2 Economics Analyst

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Unit economics deep-dive |
| **Wave** | 4 (Score) |
| **Type** | Support |

**Αρμοδιότητες:**
- Για κάθε surviving strategy κάνει detailed unit economics analysis:
  - **Revenue per unit:** Πόσο βγάζεις per sale/subscription/transaction
  - **Cost per unit:** Πόσο κοστίζει per unit (hosting, API calls, support time, etc.)
  - **Gross margin:** Revenue minus cost per unit
  - **Customer acquisition cost (CAC):** Εκτίμηση πόσο κοστίζει να βρεις 1 πελάτη
  - **Lifetime value (LTV):** Εκτίμηση πόσο βγάζεις ανά πελάτη συνολικά
  - **LTV/CAC ratio:** Πρέπει να είναι > 3 για healthy business
  - **Break-even point:** Πόσοι πελάτες/πόσος χρόνος μέχρι να βγαίνεις κερδοφόρα
  - **Monthly recurring revenue potential:** Αν applicable
- Χρησιμοποιεί conservative estimates (χειρότερο σενάριο, όχι best case)
- Σημειώνει ποια νούμερα είναι assumptions και ποια data-backed

**Input:**
```
Receives from Lead: surviving strategies with their debate context
```

**Output:**
```
Writes: {run}/wave-4-score/economics-analysis.md
```

**Output format (economics-analysis.md):**
```markdown
# Economics Analysis: {run-name}

## Strategy 1: {name}

### Revenue Model
- Type: subscription / one-time / per-use / etc.
- Price point: EUR X per {unit}
- Basis: {how this price was determined}

### Unit Economics
- Revenue per unit: EUR X
- Cost per unit: EUR Y (breakdown: hosting Z, API calls Z, support Z)
- Gross margin: X%
- Customer acquisition cost (CAC): EUR X (estimated)
- Lifetime value (LTV): EUR X (over Y months)
- LTV/CAC ratio: X.X

### Break-even Analysis
- Fixed costs: EUR X/month
- Variable costs: EUR X per customer/month
- Break-even: X customers or Y months
- Assumptions: (list what's assumed vs data-backed)

### Monthly Revenue Projections (conservative)
- Month 1: EUR X (Y customers)
- Month 3: EUR X (Y customers)
- Month 6: EUR X (Y customers)

### Red Flags
- (any concerning economic signals)

## Strategy 2: {name}
(same structure)
```

**Constraints:**
- Always use conservative estimates
- Always label assumptions vs data
- Always calculate LTV/CAC ratio
- Flag if break-even exceeds the given timeframe

---

## Wave 5: Planning Team

### 5.1 Planner Lead

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Execution plan architect |
| **Wave** | 5 (Plan) |
| **Type** | Lead |

**Αρμοδιότητες:**
- Διαβάζει scores.md (top 3 strategies)
- Dispatches Experiment Designer + Risk Analyst (parallel, per strategy)
- Δημιουργεί week-by-week execution plan per strategy
- Ενσωματώνει experiment design (πώς θα validate πριν πας all-in)
- Ενσωματώνει risk mitigation (πώς θα handle τα risks)
- Ορίζει concrete milestones με success criteria
- Ορίζει kill criteria (πότε σταματάμε)
- Γράφει plan-1.md, plan-2.md, plan-3.md

**Input:**
```
Reads: {run}/wave-4-score/scores.md
```

**Output:**
```
Writes: {run}/wave-5-plan/plan-1.md (top strategy)
Writes: {run}/wave-5-plan/plan-2.md (runner-up)
Writes: {run}/wave-5-plan/plan-3.md (third)
```

**Output format (plan-X.md):**
```markdown
# Execution Plan: {strategy name}
- **Rank:** #X of {total}
- **Weighted Score:** X.XX
- **Verdict:** STRONG/WEAK

## Minimum Viable Test (from Experiment Designer)
- What to test: description
- How to test: specific steps
- Duration: X days
- Budget: EUR X
- Success metric: specific number
- Decision: if metric >= threshold -> proceed, else -> kill

## Week-by-Week Plan

### Week 1: {milestone name}
- Tasks:
  - Task 1: description (estimated hours: X)
  - Task 2: description (estimated hours: X)
- Deliverables: what should exist by end of week
- Success criteria: measurable
- Time budget: X hours total

### Week 2: {milestone name}
(same structure)

### Week N: {milestone name}
(same structure)

## Resources Required
- Tools: list of tools/services needed
- Budget breakdown: EUR per category
- Time: hours per week
- External dependencies: APIs, services, etc.

## Risk Mitigation (from Risk Analyst)
For each risk:
  - Risk: description
  - Probability: HIGH/MEDIUM/LOW
  - Impact: HIGH/MEDIUM/LOW
  - Mitigation: what to do about it
  - Trigger: when to activate mitigation

## Kill Criteria
- Kill if: {condition 1} (e.g., "fewer than 10 signups after 2 weeks of marketing")
- Kill if: {condition 2}
- Kill if: {condition 3}
- Pivot option: if killing, what could we pivot to?

## Success Metrics (for Monitor)
- Metric 1: {name}, target: {number}, measured: {how}
- Metric 2: ...
- Metric 3: ...
```

**Interaction pattern:**
1. Reads scores.md
2. For each top 3 strategy, spawns Experiment Designer + Risk Analyst (parallel)
3. Reads experiments.md + risk-assessment.md
4. Builds week-by-week plans incorporating both
5. Writes plan-1/2/3.md
6. Updates _status.md to COMPLETE

---

### 5.2 Experiment Designer

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Minimum viable test design |
| **Wave** | 5 (Plan) |
| **Type** | Support |

**Αρμοδιότητες:**
- Για κάθε top 3 strategy σχεδιάζει το μικρότερο δυνατό experiment που αποδεικνύει αν η ιδέα αξίζει
- Ορίζει:
  - **Τι τεστάρουμε:** the core assumption (π.χ. "θα πληρώσει κάποιος EUR 29/μήνα για αυτό;")
  - **Πώς τεστάρουμε:** concrete test (landing page, ad campaign, cold outreach, prototype)
  - **Πόσο κοστίζει:** EUR budget for the test
  - **Πόσο διαρκεί:** days/weeks
  - **Success threshold:** concrete number (π.χ. "5% conversion rate on landing page" or "3 paid signups in 2 weeks")
  - **Go/No-go decision:** αν περάσει threshold -> proceed, αν δεν -> kill or pivot
- Επιλέγει lowest-cost, fastest validation method
- Αποφεύγει "build it and they will come" (δεν προτείνει "φτιάξε ολόκληρο MVP" ως experiment)

**Input:**
```
Receives from Lead: top 3 strategies with scores and debate context
```

**Output:**
```
Writes: {run}/wave-5-plan/experiments.md
```

**Output format (experiments.md):**
```markdown
# Experiment Designs: {run-name}

## Strategy 1: {name}

### Core Assumption to Test
"{the one thing that must be true}"

### Experiment Design
- **Type:** landing page test / ad campaign / cold outreach / prototype / pre-sale / survey
- **Description:** what exactly to do, step by step
- **Duration:** X days
- **Budget:** EUR X
- **Tools needed:** list

### Success Metric
- **Metric:** {specific metric}
- **Threshold:** {number}
- **How to measure:** {method}

### Decision Framework
- If metric >= threshold: PROCEED to full build (Week 2+)
- If metric < threshold but close: ITERATE experiment with adjustments
- If metric significantly below: KILL or PIVOT

## Strategy 2: {name}
(same structure)

## Strategy 3: {name}
(same structure)
```

**Constraints:**
- Experiment must cost < 20% of total budget
- Experiment must take < 25% of total timeframe
- Must have a clear, measurable threshold
- Cannot propose "build the whole thing" as an experiment

---

### 5.3 Risk Analyst

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Risk identification + mitigation planning |
| **Wave** | 5 (Plan) |
| **Type** | Support |

**Αρμοδιότητες:**
- Για κάθε top 3 strategy εντοπίζει risks σε 6 κατηγορίες:
  - **Technical risks:** Τεχνικές προκλήσεις, dependencies σε APIs/services, scaling issues
  - **Market risks:** Αλλαγή ζήτησης, new competitor entry, pricing pressure
  - **Financial risks:** Υπέρβαση budget, delayed revenue, unexpected costs
  - **Execution risks:** Time management, skill gaps, burnout (solo operator)
  - **Legal/compliance risks:** Regulatory issues, terms of service violations
  - **External risks:** Platform dependency, API deprecation, economic shifts
- Για κάθε risk:
  - Probability (HIGH/MEDIUM/LOW)
  - Impact (HIGH/MEDIUM/LOW)
  - Mitigation strategy (τι κάνουμε για να μειώσουμε probability)
  - Contingency plan (τι κάνουμε αν γίνει)
  - Trigger (πότε ενεργοποιούμε contingency)
- Φτιάχνει risk matrix per strategy

**Input:**
```
Receives from Lead: top 3 strategies with scores and debate context
```

**Output:**
```
Writes: {run}/wave-5-plan/risk-assessment.md
```

**Output format (risk-assessment.md):**
```markdown
# Risk Assessment: {run-name}

## Strategy 1: {name}

### Risk Matrix

| Risk | Category | Probability | Impact | Priority |
|------|----------|-------------|--------|----------|
| {risk 1} | Technical | HIGH | HIGH | CRITICAL |
| {risk 2} | Market | MEDIUM | HIGH | HIGH |
| {risk 3} | ... | ... | ... | ... |

### Detailed Risks

#### Risk 1: {name}
- **Category:** Technical / Market / Financial / Execution / Legal / External
- **Description:** What could go wrong
- **Probability:** HIGH / MEDIUM / LOW
- **Impact:** HIGH / MEDIUM / LOW
- **Mitigation:** How to reduce probability (before it happens)
- **Contingency:** What to do if it happens
- **Trigger:** Signal that this risk is materializing
- **Cost of mitigation:** EUR X / hours

#### Risk 2: {name}
(same structure)

### Overall Risk Profile
- Total risks: X
- Critical (HIGH/HIGH): X
- High priority: X
- Acceptable (LOW/LOW): X
- **Overall risk level:** HIGH / MEDIUM / LOW
- **Recommendation:** proceed with caution / proceed freely / reconsider

## Strategy 2: {name}
(same structure)

## Strategy 3: {name}
(same structure)
```

**Constraints:**
- Minimum 5 risks per strategy
- Must cover at least 4 of the 6 categories
- Every HIGH/HIGH risk must have a mitigation AND contingency
- Must provide overall risk profile summary

---

## Wave 6: Monitor Team

### 6.1 Monitor Lead

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Weekly progress analysis + recommendations |
| **Wave** | 6 (Monitor) |
| **Type** | Lead |

**Αρμοδιότητες:**
- Τρέχει weekly (triggered manually ή via scheduled agent)
- Dispatches Metrics Collector για data gathering
- Συγκρίνει actual metrics vs plan targets
- Ελέγχει kill criteria (αν κάποιο trigger ενεργοποιήθηκε)
- Ελέγχει risk triggers (αν κάποιο risk materializes)
- Βγάζει status: ON_TRACK / AT_RISK / OFF_TRACK
- Αν OFF_TRACK 2+ consecutive weeks: recommend PIVOT or KILL
- Γράφει weekly report
- Προτείνει adjustments στο plan αν χρειάζεται

**Input:**
```
Reads: {run}/wave-5-plan/plan-{active}.md (the active plan)
Reads: {run}/wave-6-monitor/week-{previous}.md (last week's report, if exists)
Reads: Metrics Collector output
```

**Output:**
```
Writes: {run}/wave-6-monitor/week-XX.md
```

**Output format (week-XX.md):**
```markdown
# Week {XX} Report: {strategy name}
- **Date:** YYYY-MM-DD
- **Status:** ON_TRACK / AT_RISK / OFF_TRACK
- **Consecutive off-track weeks:** X

## Metrics vs Targets

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| {metric 1} | {target} | {actual} | ON_TRACK / BEHIND / AHEAD |
| {metric 2} | ... | ... | ... |

## This Week's Progress
- Completed: list of what got done
- Missed: list of what didn't get done
- Blockers: anything that's blocking progress

## Kill Criteria Check
- {criterion 1}: NOT TRIGGERED / TRIGGERED
- {criterion 2}: NOT TRIGGERED / TRIGGERED

## Risk Trigger Check
- {risk 1}: NOT MATERIALIZED / MATERIALIZING / MATERIALIZED
- {risk 2}: ...

## Recommendation
- **Action:** CONTINUE / ADJUST / PIVOT / KILL
- **Reasoning:** why
- **Suggested adjustments:** (if ADJUST)
- **Pivot direction:** (if PIVOT)

## Next Week Focus
- Priority 1: ...
- Priority 2: ...
- Priority 3: ...
```

**Decision rules:**
- ON_TRACK: all metrics within 80% of target
- AT_RISK: 1-2 metrics below 80%, no kill criteria triggered
- OFF_TRACK: 3+ metrics below 80%, or any kill criterion triggered
- 2+ consecutive OFF_TRACK weeks: recommend KILL or PIVOT (mandatory)

---

### 6.2 Metrics Collector

| Field | Value |
|-------|-------|
| **Model** | Sonnet |
| **Role** | Data gathering from multiple sources |
| **Wave** | 6 (Monitor) |
| **Type** | Support |

**Αρμοδιότητες:**
- Μαζεύει metrics data για τον Monitor Lead
- Sources to check (depending on strategy type):
  - **Revenue:** Stripe, PayPal, manual sales records
  - **Users/signups:** Analytics, database, email list
  - **Traffic:** Google Analytics, social media stats
  - **Engagement:** Email open rates, retention, churn
  - **Costs:** Running expenses, API costs, ad spend
  - **Tasks completed:** Progress on plan milestones
- Ζητάει data από τον Dionisis αν δεν μπορεί να τα βρει αυτόματα
- Μαζεύει qualitative data: customer feedback, reviews, support requests
- Formats data σε structured format για τον Monitor Lead

**Input:**
```
Receives from Lead: which metrics to collect, from where
Also reads: {run}/wave-5-plan/plan-{active}.md (to know what metrics to track)
```

**Output:**
```
Returns to Lead: structured metrics data
```

**Output format:**
```markdown
# Metrics Collection: Week {XX}

## Quantitative Metrics
- {metric 1}: {value} (source: {where})
- {metric 2}: {value} (source: {where})
- ...

## Qualitative Data
- Customer feedback: summary
- Support requests: count + themes
- Market signals: any notable changes

## Data Gaps
- {metric X}: could not collect, reason: {why}
- Suggested action: {how to get this data}
```

**Constraints:**
- Must clearly state the source of each data point
- Must flag when data is self-reported vs verified
- Must flag data gaps (metrics we couldn't collect)
- Phase 1: mostly manual data collection via asking Dionisis. Phase 2+: automated where possible.
