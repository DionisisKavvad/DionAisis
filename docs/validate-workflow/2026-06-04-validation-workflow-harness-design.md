# `/validate` — Validation Workflow Harness (Design Spec)

**Date:** 2026-06-04
**Status:** Design approved, pending implementation plan
**Author:** brainstorming session (Dionisis + Claude)

---

## 0. Σκοπός & πρόβλημα

Θέλουμε ένα **reusable agent harness** που παίρνει μια **ιδέα/υπόθεση** (καινούργια ή τωρινή) και τρέχει **ανάλυση + adversarial review**, βγάζοντας **verdict + confidence + cited evidence** μέσα σε αναλυτικό report.

**Το πρόβλημα που λύνει:** τα built-in agent συστήματα του Claude Code (single subagent, skill, agent team) σε **σύνθετα tasks κάνουν hallucinations** — ο ένας agent κρατά όλο το πλάνο στο context του, μπλοφάρει σε ισχυρισμούς, και κανείς δεν τον ελέγχει ανεξάρτητα. Χρειαζόμαστε καλύτερο harness όπου:

- το πλάνο ζει σε **script** (deterministic control flow), όχι στο context ενός agent,
- κάθε ισχυρισμός ελέγχεται **ξεχωριστά** και **ανεξάρτητα**,
- τίποτα χωρίς **verifiable artifact** δεν φτάνει στο τελικό report.

Υλοποιείται ως **dynamic workflow** (βλ. https://code.claude.com/docs/en/workflows): JavaScript script που ορchestrά subagents, τρέχει background, resumable, save-able ως `/validate`.

### Context: το project
- **eshop-analyzer** (αυτό το repo): Claude Agent SDK browse-άρει eshop → structured brand JSON (industry, brandTone, 26 brand `characteristics` + `tier` + confidence, colors, logo). Store-level, cached σε DynamoDB.
- **brief-localhost**: per-video workflow που διαβάζει τα store-level tags + per-video inputs → color/font/CTA.
- **platform-client-v2**: Angular client που καταναλώνει τα brief outputs (canvas, palette picking).
- Σχετικά docs: `docs/brand-characteristics-source-mapping.md` (§5 = validation tests, §9 = utilization), `reports/2026-06-03-eshop-analyzer-platform-brief-integration.md`.

Το harness αρχικά εξυπηρετεί validation αυτού του pipeline, αλλά είναι **γενικό** (3 τύποι ιδεών, παρακάτω).

---

## 1. Τι validate-άρουμε (3 τύποι)

| Τύπος | Παράδειγμα | Πηγή αλήθειας (grounding) |
|---|---|---|
| **pipeline-output** | «το 26-tag extraction βγάζει σταθερά & διακριτά tags» | **live runs** του analyzer σε δείγμα eshops + parse outputs |
| **design-hypothesis** | «premium → serif font», «brandTone→characteristics mapping σωστό», «το Stark όντως οδηγεί το COLOR» | research/best-practices + inspect repo code/docs |
| **business-idea** | «αξίζει FB-ads source;», «να βγάλουμε CTA step;» | feasibility (infra/cost στα repos) + market research |

Κοινός παρονομαστής: **idea → evidence → adversarial review → verdict**. Το «πώς μαζεύεται evidence» αλλάζει ανά τύπο (type-routed Gather, §3.2).

---

## 2. Αρχιτεκτονική (high-level flow)

```
/validate <idea>                       (saved workflow: .claude/workflows/validate.js)
   │
   ├─ Phase 1   FRAME       (1 agent)        idea → falsifiable hypothesis + atomic claims
   │                                          + confirmIf / refuteIf + ideaType + gatherRoutes
   ├─ Phase 1.5 SCREEN      (1 agent, opt.)   "αξίζει full run;"  → αν όχι: short-circuit cheap report
   ├─ Phase 2   GATHER      (pipeline/claim)  type-routed evidence  → findings (καθένα ΜΕ artifact)
   ├─ Phase 3   REVIEW      (per finding)     adversarial skeptics (A) | debate panel (B, design)
   └─ Phase 4   SYNTHESIZE  (1 agent)         surviving findings → verdict+confidence → report
```

- **Pipeline (όχι barrier) μεταξύ Gather→Review:** μόλις ένα claim μαζέψει evidence, μπαίνει σε review ενώ τα άλλα claims ακόμα μαζεύουν. Wall-clock = το πιο αργό claim-chain, όχι sum.
- **Barrier μόνο πριν το Synthesize:** χρειάζεται όλα τα verdicts μαζί για να βγάλει συνολική ετυμηγορία.

### Approach που επιλέχθηκε: **A + B-mode + C-flag**
- **A (default):** evidence-gated adversarial — κάθε finding κουβαλά verifiable artifact, περνά N independent skeptics, επιβιώνει με πλειοψηφία.
- **B-mode:** debate panel (proponent vs devil's-advocate + judge) ως review-mode **για design-hypothesis** (argument-heavy, λιγότερο hard-artifact).
- **C-flag:** optional cheap pre-screen που κόβει προφανώς-κακές ιδέες πριν ξοδέψουμε tokens.

---

## 3. Phase contracts (εδώ ζει το anti-hallucination)

### 3.1 Phase 1 — FRAME (1 agent, schema-forced)
```jsonc
{
  "hypothesis": "string",            // αυστηρή, falsifiable αναδιατύπωση της ιδέας
  "ideaType": "pipeline-output | design-hypothesis | business-idea",
  "claims": [                         // atomic, ξεχωριστά testable — ΟΧΙ μονολιθικό "ισχύει;"
    { "id": "c1", "statement": "...", "evidenceNeeded": "..." }
  ],
  "confirmIf": "string",             // τι evidence επιβεβαιώνει
  "refuteIf": "string",              // τι evidence διαψεύδει
  "gatherRoutes": ["live-run|web-research|code-inspect|cost-feasibility"]
}
```
**Anti-hallucination #1:** σπάει την ιδέα σε **atomic claims**. Κάθε claim ελέγχεται μόνο του· δεν υπάρχει «γενική εντύπωση» που κρύβει αβεβαιότητα.

### 3.2 Phase 1.5 — SCREEN (optional, flag `screen=true`, 1 agent)
```jsonc
{ "worthIt": true, "reason": "...", "blockers": ["..."] }
```
Αν `worthIt=false` → ο workflow short-circuit-άρει με σύντομο report «δεν αξίζει full validation, γιατί: …». Γλιτώνει το ακριβό μέρος.

### 3.3 Phase 2 — GATHER (pipeline ανά claim, type-routed)
Κάθε finding **υποχρεωτικά** φέρει `artifact` (schema-enforced):
```jsonc
{
  "claimId": "c1",
  "statement": "...",
  "stance": "supports | contradicts",
  "artifact": {
    "kind": "code-output | url-quote | doc-line | metric",
    "ref": "store URL / file:line / source URL / metric name",
    "excerpt": "το πραγματικό απόσπασμα/τιμή"
  },
  "rawConfidence": 0.0
}
```

**Routes ανά ideaType:**
- **pipeline-output** → τρέχει `npm run workflow -- '{...}'` σε **≤`sample`** live stores (cap). Για **stability** τρέχει ίδιο store ×3 και μετράει flip rate· για **projection** μετράει σε πόσα stores βγαίνει ένα low-conf voice tag (§5 του source-mapping). Artifact = πραγματικό JSON output + `vocabularyVersion`/`promptVersion`.
- **design-hypothesis** → `WebSearch`/`WebFetch` best-practices/literature + read repo code/docs. Artifact = URL quote + doc line (`file:line`).
- **business-idea** → feasibility (inspect infra/cost στα repos: aws-microservices, brief, analyzer) + market research. Artifact = code ref + external source.

**Anti-hallucination #2 (Evidence Gate):** finding χωρίς έγκυρο `artifact` → invalid στο schema → ο agent ξαναπροσπαθεί ή το finding πέφτει. **Τίποτα χωρίς απόδειξη δεν φτάνει στο review/report.**

### 3.4 Phase 3 — REVIEW (per finding, independent)
**A (default — adversarial):** `skeptics` (default 3) **ανεξάρτητοι** agents, ο καθένας με διαφορετικό lens:
1. «Είναι το artifact πραγματικό & **επαρκές** για το claim;»
2. «Υπάρχει **εναλλακτική εξήγηση** του artifact;»
3. «**Sample/selection bias** ή over-generalization;»

Prompt κάθε skeptic: *προσπάθησε να **διαψεύσεις** το finding· default-to-refuted αν αβέβαιος.* Survives αν **πλειοψηφία** δεν το ρίξει.

**B-mode (design-hypothesis):** proponent (υπέρ) vs devil's-advocate (κατά) πάνω στο hypothesis, και οι δύο με citations, judge βγάζει survived/συντριπτικότητα.

```jsonc
{ "findingId": "...", "survived": true, "lensVotes": [{"lens":"...","refuted":false,"why":"..."}], "refutations": ["..."] }
```

**Anti-hallucination #3 (Independent context):** κάθε skeptic = ξεχωριστό `agent()` call → **κανένα shared context** με τον proponent/gatherer. Δεν παρασύρεται στην ίδια ψευδαίσθηση. Refute-by-default σκοτώνει το plausible-but-wrong.

### 3.5 Phase 4 — SYNTHESIZE (1 agent, schema + γράφει report)
```jsonc
{
  "verdict": "validated | refuted | inconclusive",
  "confidence": 0.0,
  "perClaim": [{ "claimId":"c1", "verdict":"...", "surviving":["..."], "dropped":["..."] }],
  "droppedFindings": ["finding + γιατί κόπηκε"],   // transparency
  "recommendation": "...",
  "nextSteps": ["..."]
}
```
Γράφει report → `docs/validations/YYYY-MM-DD-<slug>-validation.md`: hypothesis, verdict+confidence, per-claim evidence (cited), **dropped/refuted section**, αναλυτικό σκεπτικό, recommendation + next steps. (Καλύπτει και τα δύο deliverables: *verdict+confidence+evidence* ΚΑΙ *αναλυτικό report*.)

**Anti-hallucination #4 (Transparency):** ό,τι κόπηκε καταγράφεται με τον λόγο. Καμία σιωπηλή απόρριψη.

---

## 4. Config, caps, invocation

`args` schema (όλα optional εκτός `idea`):
```jsonc
{
  "idea": "string",                  // required
  "type": "auto",                    // auto | pipeline-output | design-hypothesis | business-idea
  "sample": 3,                       // live stores (pipeline-output), max 5
  "screen": false,                   // C-flag: cheap pre-screen
  "skeptics": 3,
  "reviewMode": "auto"               // auto: debate→design, adversarial→αλλιώς· overridable
}
```

- **Caps:** `sample` default 3 / **max 5** για live runs (~$0.33 + ~115s/store). `skeptics` default 3.
- **Budget-aware:** αν δοθεί token target, scale `skeptics`/`sample` με `budget.remaining()`.
- **No silent caps:** αν κόψουμε sample/findings, `log()` το ρητά.
- **Versioning:** για pipeline-output runs, κατέγραψε `vocabularyVersion`/`promptVersion` στο report (ίδια σύμβαση με §6 του source-mapping).

---

## 5. File layout

| Αρχείο | Ρόλος |
|---|---|
| `.claude/workflows/validate.js` | το workflow script (shared στο repo, γίνεται `/validate`) |
| `docs/validations/YYYY-MM-DD-<slug>-validation.md` | output report ανά run |
| `docs/superpowers/specs/2026-06-04-validation-workflow-harness-design.md` | αυτό το spec |

> Σημ.: ο workflow δεν γράφει files μόνος του — ο **Synthesize agent** γράφει το report μέσω των tools του.

---

## 6. Γιατί αυτό > built-in agent (σύνοψη anti-hallucination)

| Μηχανισμός | Πώς σταματά το hallucination |
|---|---|
| **Claim-level granularity** | verify κάθε ισχυρισμό ξεχωριστά, ΟΧΙ «review όλο το report» (εκεί μπλοφάρει ο single agent) |
| **Evidence gate** | claim χωρίς verifiable artifact → drop πριν φτάσει στο report |
| **Independent skeptics** | ο reviewer δεν βλέπει το reasoning chain του proponent → δεν παρασύρεται |
| **Refute-by-default** | skeptic προτρέπεται να διαψεύσει, default-refuted αν αβέβαιος |
| **Structured schemas** | agents επιστρέφουν validated JSON, όχι free-text που drift-άρει |
| **Live grounding** | pipeline-output validation πατάει σε πραγματικά runs, όχι σε «θυμάμαι ότι…» |
| **Transparency** | dropped/refuted findings καταγράφονται με λόγο |

---

## 7. Resolved decisions

1. **Report filename slug:** ο **Synthesize agent** παράγει kebab-case slug από το hypothesis (≤6 λέξεις) και βάζει την ημερομηνία από το περιβάλλον του (ο workflow δεν έχει `Date.now`). Filename: `docs/validations/<date>-<slug>-validation.md`.
2. **agentType ανά phase:**
   - Frame / Screen / Synthesize → default workflow agent
   - Gather · **live-run** → default (χρειάζεται Bash για `npm run workflow`)
   - Gather · **code-inspect** → `Explore`
   - Gather · **web-research** → `general-purpose` (έχει WebSearch/WebFetch)
   - Review skeptics → default
3. **stability ×3 cost:** το ×3 (ίδιο store τρεις φορές) γίνεται **μόνο όταν το claim το απαιτεί** (π.χ. claim με `needsStability: true`), όχι σε κάθε pipeline-output run. Το Frame το σηματοδοτεί στο claim· ο Gather το διαβάζει.

## 8. Smoke test (πρώτο run μετά την υλοποίηση)
Πρώτη πραγματική ιδέα για να validate-άρουμε **το ίδιο το harness**: ένα από τα §5 tests του source-mapping — βλ. το worked example §9 παρακάτω (stability + projection του 26-tag extraction).

---

## 9. Worked example (dry-run, πριν την υλοποίηση)

> Δείχνει τι ΘΑ έκανε ο workflow end-to-end για μία ιδέα. Δεν είναι εκτελεσμένο — είναι το συμβόλαιο συμπεριφοράς.

**Invocation:**
```
/validate "Το 26-tag brand extraction είναι αξιόπιστο: σταθερό μεταξύ runs
           και τα low-confidence voice tags δεν κάνουν projection (δεν βγαίνουν σχεδόν παντού)."
   args: { type: "pipeline-output", sample: 3 }
```

### Phase 1 — FRAME (1 agent) → επιστρέφει:
```jsonc
{
  "hypothesis": "Το 26-tag extraction παράγει σταθερά tags μεταξύ runs, και τα low-conf voice tags (Caring/Approachable/Helpful/Humble/Credible-Expert) δεν εμφανίζονται σε σχεδόν όλα τα eshops.",
  "ideaType": "pipeline-output",
  "claims": [
    { "id": "c1", "statement": "Ίδιο eshop, 3 runs → το tag set & confidence δεν flip-άρουν σημαντικά.",
      "evidenceNeeded": "3× output ανά store, σύγκριση flip rate", "needsStability": true },
    { "id": "c2", "statement": "Τα 5 voice tags δεν βγαίνουν σε >70% των stores (projection).",
      "evidenceNeeded": "tag frequency across sample stores", "needsStability": false }
  ],
  "confirmIf": "flip rate < 15% ΚΑΙ κανένα voice tag > 70% frequency",
  "refuteIf": "flip rate > 30% Ή voice tag > 85% frequency",
  "gatherRoutes": ["live-run"]
}
```

### Phase 2 — GATHER (pipeline ανά claim, live-run route)
Sample = 3 stores (π.χ. plaisio.gr, public.gr, ένα fashion eshop).
- **c1 (needsStability):** τρέχει `npm run workflow -- '{"storeName":"Plaisio","storeUrl":"...","domain":"plaisio.gr"}'` **×3** για 1 store (×3 cost μόνο εδώ, γιατί το claim το απαιτεί). Συγκρίνει τα 3 `characteristics` arrays.
  - finding f1: `{ claimId:"c1", stance:"supports", artifact:{kind:"metric", ref:"flip-rate plaisio ×3", excerpt:"24/26 tags identical, 2 confidence shifts <0.1 → flip 8%"}, rawConfidence:0.8 }`
- **c2:** τρέχει 1× ανά store για τα 3 stores, μετράει σε πόσα βγαίνει κάθε voice tag.
  - finding f2: `{ claimId:"c2", stance:"contradicts", artifact:{kind:"metric", ref:"voice-tag freq n=3", excerpt:"'Caring' σε 3/3 stores (100%), 'Helpful' σε 3/3"}, rawConfidence:0.6 }`

> Κάθε finding **έχει artifact** (πραγματικές τιμές από τα outputs) — αλλιώς το schema το απορρίπτει.

### Phase 3 — REVIEW (3 independent skeptics ανά finding, refute-by-default)
- **f1** (stability supports): 
  - lens «artifact επαρκές;» → δεν ρίχνει (8% < threshold). 
  - lens «sample bias;» → **ρίχνει**: «n=1 store για stability, μη γενικεύσιμο». 
  - lens «εναλλακτική εξήγηση;» → δεν ρίχνει. 
  - → 1/3 refute → **survives** (αλλά με caveat: χαμηλό n).
- **f2** (projection contradicts): και οι 3 lenses δεν το ρίχνουν (100% freq = ξεκάθαρο projection). → **survives strongly.**

### Phase 4 — SYNTHESIZE (1 agent) → verdict + γράφει report
```jsonc
{
  "verdict": "refuted",
  "confidence": 0.7,
  "perClaim": [
    { "claimId":"c1", "verdict":"weakly-supported", "surviving":["f1 (n=1 caveat)"], "dropped":[] },
    { "claimId":"c2", "verdict":"refuted", "surviving":["f2: Caring/Helpful σε 100% → projection"], "dropped":[] }
  ],
  "droppedFindings": [],
  "recommendation": "Stability ok σε πρώτη ένδειξη, ΑΛΛΑ τα voice tags κάνουν projection (όπως προειδοποιεί §3 του source-mapping). Χαμήλωσε τα authority weights των voice tags ή ανέβασε KEEP_THRESHOLD γι' αυτά.",
  "nextSteps": ["Stability σε n≥5 stores", "Re-run μετά το tuning των voice authority weights"]
}
```
**Report** → `docs/validations/2026-06-04-26tag-extraction-reliability-validation.md` με: hypothesis, verdict **refuted @0.7**, per-claim evidence (cited στα metrics), recommendation, next steps.

**Συνολικά τι παρήγαγε:** μια **τεκμηριωμένη ετυμηγορία** ότι η ιδέα *μερικώς ισχύει* — stability ok αλλά projection πρόβλημα — με πραγματικά νούμερα από live runs, ξεχωριστά verified ανά claim, και concrete next steps. Κανένας ισχυρισμός χωρίς artifact, κανένα «νομίζω ότι ισχύει».
