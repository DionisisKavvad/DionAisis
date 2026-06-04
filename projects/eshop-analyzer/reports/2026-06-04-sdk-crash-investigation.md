# eshop-analyzer SDK Crash — Πλήρες Report (root cause + GitHub issue match)

**TL;DR:** Το eshop-analyzer κρασάρει σε **~50% των stores** (τα «βαριά»/αργά) με Agent-SDK error «only prompt commands are supported in streaming mode», **στο τέλος** του run. Μετά από συστηματική διερεύνηση (4 υποθέσεις, 3 διαψεύστηκαν με μετρήσεις) εντοπίσαμε τη ρίζα **μέσα στον κώδικα του SDK**: όταν μια Bash εντολή ξεπεράσει το timeout → γίνεται **background task** → γεννά ένα `task-notification` command στην ουρά → ο **headless streaming handler δεν το χειρίζεται → crash**. **Είναι το ίδιο bug με το GitHub issue [anthropics/claude-code#19195](https://github.com/anthropics/claude-code/issues/19195)** (ίδια ρίζα, ελαφρώς διαφορετικό σύμπτωμα: εκείνοι hang σε pipe mode, εμείς crash σε streaming mode). Open, χωρίς upstream fix.

> ✅ **ΛΥΘΗΚΕ (2026-06-04):** Ανεβάσαμε το Bash timeout (`BASH_DEFAULT_TIMEOUT_MS`/`BASH_MAX_TIMEOUT_MS = 600000`) μέσα στο `analyze-workflow.js` → καμία εντολή δεν γίνεται background → κανένα task-notification → κανένα crash. Validated: CoffeeIsland + Cosmossport (σταθεροί failers) τώρα ολοκληρώνονται με σκέτο `npm run workflow`. Real-fix, όχι workaround.

---

## 1. Το σύμπτωμα
- **Error:** `Agent failed: error_during_execution — only prompt commands are supported in streaming mode`
- **Πότε:** στο **τέλος**, μετά από επιτυχημένα browse + extract + screenshot + ColorThief (8-10 βήματα). Η ανάλυση ολοκληρώνεται, μετά σκάει → **όλο το run χάνεται** (process exit 1).
- **Failure rate:** 4/8 distinct stores (50%). Τα «γρήγορα» περνάνε, τα «αργά» σκάνε.

## 2. Πώς το εντοπίσαμε (investigation)

### Υποθέσεις & τι βρήκαμε
| # | Υπόθεση | Test | Αποτέλεσμα |
|---|---|---|---|
| 1 | Transient | Ξανατρέξαμε τα 4 | 🔴 Όλα ξανα-απέτυχαν → **ντετερμινιστικό** (όχι transient) |
| 2 | Παλιό SDK version | Σύγκριση | Και τα δύο repos **0.1.77** → ruled out |
| 3 | Full-page screenshot (τεράστια εικόνα) | Άλλαξα σε viewport, ξανατρέξα | 🔴 Ξανακρασάρισε → ruled out |
| 4 | Context bloat (μεγάλα outputs) | **Μέτρησα** τα bytes fail vs pass | ❌ **Μεγέθη ~ίδια & μικρά** → ruled out |

### Μετρήσεις (το βήμα που ξεκαθάρισε ότι ΔΕΝ είναι το μέγεθος)
| Output | CoffeeIsland (FAILS) | Plaisio (SUCCEEDS) |
|---|---|---|
| extract eval | 2.5 KB | 3.1 KB |
| snapshot | 24 KB | 18 KB |
| screenshot | 6.7 KB | ~7 KB |

→ Το failing site έχει **συγκρίσιμα/μικρότερα** outputs. Καμία υπερχείλιση. Το μέγεθος αποκλείστηκε **με δεδομένα**.

### Παρατήρηση-κλειδί
- Το extract eval manual = **1s**, αλλά στον agent run «143s» → τα 143s ήταν **χρόνος εκτέλεσης/αναμονής** μέσα στο sandbox, όχι μέγεθος.
- Failing sites = **περισσότερα βήματα** (10 vs 8) + ένα βήμα **«TaskOutput»** (στο pharmacy4u). Αυτό μας οδήγησε στα **background tasks**.

## 3. Η ρίζα (μέσα στον κώδικα του SDK)

Διαβάσαμε το `node_modules/@anthropic-ai/claude-agent-sdk/cli.js`:

1. Ο streaming-input handler διαβάζει την ουρά εντολών:
   ```js
   while (JA = await dequeue()) {
     if (JA.mode !== "prompt" && JA.mode !== "orphaned-permission")
       throw Error("only prompt commands are supported in streaming mode");
   }
   ```
   → Δέχεται **μόνο** `prompt` / `orphaned-permission`. Οτιδήποτε άλλο → throw.

2. Βρήκαμε generic enqueue `eH(cmd)` που βάζει **οποιοδήποτε** mode στην ουρά. Οι κλήσεις του:
   ```js
   eH({value:X, mode:"task-notification"})   // ×4  ← ο ένοχος
   eH({value:MA, mode:"prompt", ...})        // κανονικά
   ```

3. Το `"task-notification"` είναι **XML message type** του Claude Code:
   ```js
   oH="task-notification", _L="task-id", v50="local-command-caveat", zC="command-name"
   ```
   → Είναι **οι ίδιες `<task-notification>`** που εμφανίζονται όταν τελειώνει ένα **background task** (όπως τις βλέπουμε κι εμείς στη συνομιλία).

4. Τα Bash results κουβαλάνε `backgroundTaskId` → το SDK **μετατρέπει Bash εντολές σε background tasks** (όταν ξεπεράσουν το timeout).

### Η αλυσίδα
```
βαρύ/αργό site
  → μια Bash εντολή (agent-browser) ξεπερνά το ~2min timeout
  → Claude Code την κάνει background task (ο agent παίρνει result με TaskOutput)
  → completion του background task γεννά ένα <task-notification>
  → μπαίνει στην ουρά ως mode:"task-notification"
  → ο HEADLESS streaming handler κάνει dequeue → mode ∉ {prompt, orphaned-permission}
  → throw "only prompt commands are supported in streaming mode" → process exit 1
```

## 4. Γιατί μόνο σε μερικά (και όχι σταθερά)
Το bug απαιτεί **μια εντολή να ξεπεράσει το timeout** → threshold effect:
- **Γρήγορα sites** (Plaisio 1:30): ποτέ δεν περνάνε τη γραμμή → **ποτέ crash**.
- **Αργά sites** (CoffeeIsland 2:30): πάντα την περνάνε → **πάντα crash**.
- **Οριακά** (Jumbo ~2:00): πότε ναι πότε όχι → **flaky** (κρασάρισε μία φορά, πέρασε άλλη).

Άρα «μερικά και όχι όλα» + «όχι 100% σταθερά» — και τα δύο εξηγούνται.

## 5. Σχέση με το GitHub issue #19195

| Στοιχείο | Issue #19195 | Δικά μας ευρήματα |
|---|---|---|
| Trigger | Bash command ξεπερνά timeout → **background task** | ✅ Ίδιο |
| Μηχανισμός | «task-notification — internal queue operation» μετά το completion | ✅ Βρήκαμε `mode:"task-notification"` |
| TaskOutput | ο agent παίρνει result με TaskOutput | ✅ Είδαμε step «TaskOutput» (pharmacy4u) |
| Correlation | με background tasks → fail· χωρίς → success | ✅ Ίδιο pattern |
| Mode | pipe (`claude -p --output-format json`) | SDK streaming `query()` |
| **Σύμπτωμα** | **hang** (`stop_reason: null`) | **crash** («only prompt commands...») |
| Status | **Open**, χωρίς fix/maintainer | — |

**Συμπέρασμα:** **Ίδια ρίζα.** Διαφέρει μόνο η επιφάνεια (pipe→hang vs streaming→crash). Εμείς έχουμε **επιπλέον** το ακριβές σημείο που σκάει στο streaming + τον `task-notification` μηχανισμό — δεδομένα που λείπουν από το issue (αξίζει comment εκεί).

## 6. Τι πιστεύουμε ότι είναι
**SDK bug, όχι δικό μας.** Ο non-interactive (headless/pipe/streaming) handler του Claude Code **δεν χειρίζεται** τα task-notification queue-operations που έρχονται **μετά** το completion ενός background task. Το interactive TUI τα χειρίζεται· οι αυτοματοποιημένες λειτουργίες σκάνε/κρεμάνε. Χτυπά όποτε μια Bash εντολή γίνει background (ξεπερνώντας το timeout) — δηλαδή σε αργά/βαριά runs.

## 7. Επιλογές αντιμετώπισης
1. **🎯 Avoid trigger — ✅ ΕΦΑΡΜΟΣΤΗΚΕ & VALIDATED:** ανέβασμα Bash timeout σε 600000ms μέσα στο `analyze-workflow.js`:
   ```js
   process.env.BASH_DEFAULT_TIMEOUT_MS ??= '600000';
   process.env.BASH_MAX_TIMEOUT_MS ??= '600000';
   ```
   → καμία εντολή δεν ξεπερνά το όριο → κανένα background → κανένα crash. Δουλεύει local + production (το CLI subprocess κληρονομεί το process.env· δεν χρειάζεται αλλαγή στο worker allowlist). **Validated** σε CoffeeIsland + Cosmossport.
2. **🛡️ Recovery workaround (δεν χρειάζεται πια):** είχαμε φτιάξει recovery του JSON από το τελευταίο assistant message — δούλευε, αλλά ήταν workaround. **Ακυρώθηκε** υπέρ του #1. Κρατιέται ως ιδέα αν ξαναεμφανιστεί διαφορετική παραλλαγή.
3. **🐛 Upstream:** αξίζει comment στο #19195 με τα streaming-mode ευρήματά μας (το ακριβές throw + ο `task-notification` mechanism + ότι το `BASH_*_TIMEOUT_MS` το αποτρέπει).

**Σημείωση:** το brief-localhost ΔΕΝ επηρεάζεται (τρέχει με `tools:[]`, single-shot — κανένα Bash, άρα κανένα background task). Ο fix αφορά μόνο το agentic eshop-analyzer.

## 8. Evidence appendix
- Failure breakdown: Success {Plaisio, Korres, Public}· SDK crash {pharmacy4u, CoffeeIsland, Cosmossport, Jumbo}· site-block conf:0 {Sephora}.
- SDK code: `cli.js` streaming loop throw· `eH({mode:"task-notification"})` ×4· XML types `oH="task-notification"`· `backgroundTaskId` σε Bash results.
- «TaskOutput» step εμφανίστηκε σε failing run (direct evidence background-task path).

> Σχετικά: validation `2026-06-04-validation-stability-projection.md` · e2e `2026-06-04-brand-characteristics-e2e-test.md`
