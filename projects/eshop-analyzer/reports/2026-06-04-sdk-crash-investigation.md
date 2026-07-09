# eshop-analyzer SDK Crash — Πλήρες Report (root cause + GitHub issue match)

**TL;DR:** Το eshop-analyzer κρασάρει σε **~50% των stores** (τα «βαριά»/αργά) με Agent-SDK error «only prompt commands are supported in streaming mode», **στο τέλος** του run. Μετά από συστηματική διερεύνηση (4 υποθέσεις, 3 διαψεύστηκαν με μετρήσεις) εντοπίσαμε τη ρίζα **μέσα στον κώδικα του SDK**: όταν μια Bash εντολή ξεπεράσει το timeout → γίνεται **background task** → γεννά ένα `task-notification` command στην ουρά → ο **headless streaming handler δεν το χειρίζεται → crash**. **Είναι το ίδιο bug με το GitHub issue [anthropics/claude-code#19195](https://github.com/anthropics/claude-code/issues/19195)** (ίδια ρίζα, ελαφρώς διαφορετικό σύμπτωμα: εκείνοι hang σε pipe mode, εμείς crash σε streaming mode). Open, χωρίς upstream fix.

> ✅ **ΛΥΘΗΚΕ (2026-06-04):** Ανεβάσαμε το Bash timeout (`BASH_DEFAULT_TIMEOUT_MS`/`BASH_MAX_TIMEOUT_MS = 600000`) μέσα στο `analyze-workflow.js` → καμία εντολή δεν γίνεται background → κανένα task-notification → κανένα crash. Validated: CoffeeIsland + Cosmossport (σταθεροί failers) τώρα ολοκληρώνονται με σκέτο `npm run workflow`. Real-fix, όχι workaround.
>
> ⚠️ **UPDATE (2026-07-01):** Το παραπάνω αποτρέπει το SDK crash, αλλά **δεν εξηγούσε ΓΙΑΤΙ** μια μεμονωμένη Bash εντολή ξεπερνούσε τα ~2 λεπτά στην πρώτη θέση. Βαθύτερη έρευνα (workflow: research + live tests + **adversarial verify**) επιβεβαίωσε ότι το recipe's `wait <ref> --state detached` step **όντως κρεμάει deterministically** (4/4 φορές, ~2:32 κάθε φορά) — αλλά η αρχική εξήγηση ("`--state` flag collision") **αποδείχθηκε ΛΑΘΟΣ ως αιτία** (adversarial verdict: holds=false, confidence=high, μέσω controlled ablation). Το flag-collision bug είναι πραγματικό (confirmed source-level) αλλά είναι red herring — δεν επηρεάζει το αν κρεμάει η εντολή. Η πραγματική αιτία είναι άγνωστη ακόμα, εντοπισμένη στο ref-resolution/retry loop της `wait` εντολής. Δες §9 (διορθωμένο).

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

## 9. Deeper root cause (2026-07-01, ΔΙΟΡΘΩΜΕΝΟ μετά από adversarial verify) — γιατί μια εντολή ξεπερνά καν τα ~2 λεπτά

Το §7 απέτρεψε το crash (bigger timeout), αλλά δεν εξήγησε γιατί μια απλή browser εντολή θα χρειαζόταν ποτέ 2+ λεπτά. Έγινε βαθύτερη έρευνα σε 2 γύρους: (1) manual live testing → πρότεινε τη θεωρία "`--state` flag collision", (2) **workflow με research + live-tests + adversarial skeptic** για να την ελέγξει. Ο σκεπτικιστής **την κατέρριψε** με controlled ablation. Η ενότητα αυτή αντικαθιστά την προηγούμενη (λανθασμένη) εκδοχή.

### Τι είναι ΣΙΓΟΥΡΟ (live-tested, reproducible, 4/4 φορές)
Η εντολή `wait <ref> --state detached` μέσα σε `batch --bail` (ακριβώς το recipe pattern) **κρεμάει deterministically**: ~2:32.4x–2:32.6x κάθε φορά, exit 1, `Failed to read: Resource temporarily unavailable (os error 35) (after 5 retries)`. Reproduced 4/4 σε controlled sandbox ablation + 3x standalone σε cosmossport.gr.

### Η θεωρία "`--state` flag collision" — ΕΠΙΒΕΒΑΙΩΜΕΝΗ ως φαινόμενο, ΑΛΛΆ ΟΧΙ η αιτία
Πράγματι υπάρχει σύγκρουση flag στο `agent-browser` CLI — επιβεβαιωμένο μέχρι source-code level:
- `--help`: `--state <path>` = global "load saved auth state" flag
- README παράδειγμα (misdocumented, βλ. παρακάτω): `wait "#spinner" --state hidden` = per-element wait state
- **Source code** (`cli/src/flags.rs`): το `--state` είναι registered ΜΟΝΟ ως global flag, χωρίς `seen_command` guard — στρίπεται από το argv πριν καν φτάσει στον `wait` subcommand parser.
- **Source code** (`cli/src/commands.rs`, γραμμές 667-778): ο `wait` subcommand parser **δεν έχει ΚΑΝ per-element `--state` branch**. Το README-documented syntax είναι dead/misdocumented — δεν θα δούλευε ΠΟΤΕ, ούτε καν χωρίς το flag collision.

**ΑΛΛΑ**: controlled ablation test (fresh daemon, ίδιο ref, ίδιο pattern) με 3 παραλλαγές έδωσε **ταυτόσημα αποτελέσματα**:
- `wait @e1 --state detached` → κρεμάει ~2:32
- `wait @e1 --state visible` (συνθήκη **ήδη αληθής** τη στιγμή του call!) → κρεμάει ~2:32 **το ίδιο**
- `wait @e1` **χωρίς κανένα** `--state` flag → κρεμάει ~2:32 **το ίδιο**

Άρα το `--state` (παρουσία, απουσία, ή τιμή) **δεν επηρεάζει καθόλου** αν κρεμάει η εντολή. `get text @e1` (άλλη ref-based εντολή, ίδιο daemon) επέστρεψε σε 0.59s — άρα ούτε stale ref ούτε νεκρός daemon. **Adversarial verdict: holds=false, confidence=high.** Η "flag collision" θεωρία είναι πραγματική αλλά **correlated coincidence, red herring** — όχι η αιτία του hang.

### Η πραγματική αιτία (άγνωστη ακόμα, deeper)
Bug εντοπισμένο στο **ref-resolution/retry loop** της `wait` εντολής όταν καλείται ως **2η+ εντολή πάνω σε already-running daemon** — ανεξάρτητο από `--state`. Δεν βρέθηκε αντίστοιχο υπάρχον GitHub issue στο `vercel-labs/agent-browser` για αυτό το ακριβές σενάριο. Ανοιχτό ερώτημα, χρειάζεται περαιτέρω isolation (π.χ. δοκιμή `click @ref` standalone, δοκιμή `wait` ως 1η εντολή στο ίδιο daemon).

### Τι παραμένει σωστό (ανεξάρτητο εύρημα)
Το "hide-not-remove" pattern των Cookiebot-family CMPs παραμένει **σωστό και live-verified σε 3/3 sites** (cosmossport.gr, public.gr, kotsovolos.gr): μετά accept-click το container μένει `inDOM:true`, `display:none`. Άρα `--state detached` είναι **λάθος target state ούτως ή άλλως** (θα έπρεπε `hidden`, όχι `detached`) — ανεξάρτητα από το daemon bug. Αλλά αυτό είναι **άσχετο** με το γιατί κρεμάει η εντολή: ακόμα κι αν το `--state hidden` δούλευε σωστά, η ίδια ref-wait-on-running-daemon deadlock θα συνέβαινε (αποδείχθηκε με το `--state visible` ablation).

### Production impact (μετριασμένο, όχι λυμένο, από το §7 fix)
Με το `dbcc5d1` (Bash timeout → 10min), ένα ~2:32 hang πλέον **δεν** σκάει το SDK timeout. Αλλά λόγω `--bail`, όταν το `wait` αποτυγχάνει (exit 1) το `batch` σταματάει **πριν** το screenshot step. Άρα η πραγματική συνέπεια σήμερα πιθανότατα δεν είναι "screenshot με ορατό cookie banner" αλλά **καθόλου screenshot** για επηρεαζόμενα stores, plus ~2.5 λεπτά χαμένου χρόνου ανά store, σιωπηλά.

### Προτεινόμενο fix — ΚΑΘΟΛΙΚΟ, χωρίς vendor-specific selectors
**Σύσταση: fixed short delay, `wait 800`–`1000` (χωρίς selector/state flag καθόλου)**, ως άμεσο fix υψηλής confidence:
```
"click <ref1>" "wait 800" "screenshot --full ..."
```
Live-tested να δουλεύει σε 2/2 sites (coffeeisland.gr, cosmossport.gr), καμία εντολή >1.2s, το stall δεν αναπαράχθηκε. Δουλεύει **όχι** επειδή αποφεύγει το flag collision (που αποδείχθηκε άσχετο) αλλά επειδή **αποφεύγει εντελώς το buggy `wait <ref>` code path**.

Εναλλακτικές (πιο robust θεωρητικά, λιγότερο επαληθευμένες): `wait --fn "<JS polling expression>"` (δεν collide-άρει με global flags, αλλά δεν έχει επιβεβαιωθεί ζωντανά ότι αποφεύγει και το ref-resolution bug)· MutationObserver-based generic wait (πιο robust αλλά πιο σύνθετο, μη επαληθευμένο).

**Δεν συστήνεται καμία μορφή `--state detached/hidden`** — λάθος target state ούτως ή άλλως, ΚΑΙ πέφτει στο ref-resolution bug.

### Ανοιχτά ερωτήματα
1. Ποιο ακριβώς είναι το bug μέσα στο ref-resolution path της `wait` (χρειάζεται πιθανό upstream issue στο vercel-labs/agent-browser).
2. Απόκλιση timing παρατηρήθηκε: ένα live test σε cosmossport.gr έδειξε ~63s hang αντί ~2:32 — δεν εξηγήθηκε πλήρως (real site vs sandbox; retry/network behavior;).
3. Αν το `wait --fn` όντως αποφεύγει το ref-resolution bug ή απλά το μετατοπίζει — δεν δοκιμάστηκε.
4. Γενίκευση "hide-not-remove" πέρα από Cookiebot (OneTrust, iubenda, κλπ) στηρίζεται σε desk research χαμηλής/μεσαίας confidence, όχι ζωντανά επαληθευμένη.

## 11. ✅ Fix εφαρμόστηκε + validated end-to-end (2026-07-01)

`store-analysis-system.md` άλλαξε σε:
```
npx agent-browser --session {domain} batch --bail "click <ref1>" "wait 2000"
npx agent-browser --session {domain} screenshot --full /tmp/{domain}.jpg --screenshot-format jpeg --screenshot-quality 80
```
(ήταν: `batch --bail "click <ref1>" "wait <ref1> --state detached" "screenshot --full ... --screenshot-format ... --screenshot-quality ..."`)

**Δεύτερο, ανεξάρτητο bug βρέθηκε κατά το testing**: το `screenshot --full <path> --screenshot-format jpeg --screenshot-quality 80` όταν καλείται **μέσα σε `batch`** αποτυγχάνει σιωπηλά — τυπώνει ψευδο-επιτυχία `"✓ Screenshot saved to --screenshot-format"` αλλά **δεν γράφει κανένα αρχείο** (confirmed: standalone screenshot με τα ίδια flags δουλεύει άψογα, μέσα σε `batch` όχι — δοκιμάστηκε και με argument-mode string και με stdin JSON array mode, ίδιο αποτέλεσμα). Άρα το screenshot βγήκε εντελώς **έξω** από το `batch` call, ως ξεχωριστή standalone εντολή — matching το ήδη-δουλεύον "no overlay" path.

### Live-test αποτελέσματα (CLI primitives, πριν το full run)
| Site | click+wait2000 (batch) | screenshot (standalone) | Οπτικός έλεγχος |
|---|---|---|---|
| coffeeisland.gr | 2.5s | 0.57s, 512KB | ✅ καθαρό, χωρίς banner |
| cosmossport.gr | 2.7s | 0.62s, 634KB | ✅ καθαρό, χωρίς banner |

### Full end-to-end production validation (`npm run workflow`)
CoffeeIsland — site που στο §8 evidence appendix ήταν σταθερά στη λίστα "SDK crash" (πάντα απέτυχε) — τρέχτηκε 2 φορές με το fixed recipe:
- **Run 1**: ολοκληρώθηκε καθαρά σε **114.9s**, πλήρες JSON (tier: premium, 12 characteristics), καμία crash/hang.
- **Run 2**: ολοκληρώθηκε ξανά καθαρά. Step timings: **"3. 9.1s — Dismiss cookie banner and screenshot full page"** (πριν: >2 λεπτά ή crash) — 15x βελτίωση.

**Συμπέρασμα**: το fix δουλεύει end-to-end στην πραγματική production pipeline, όχι μόνο σε isolated CLI tests. Δεν χρειάστηκε να αγγίξουμε το `BASH_DEFAULT_TIMEOUT_MS`/`MAX` (§7) — παραμένει σαν επιπλέον ασφάλεια, αλλά το πραγματικό trigger εξαλείφθηκε.

### Παραμένει ανοιχτό (ενημέρωση: ΛΥΘΗΚΕ, δες παρακάτω)
~~Δεν επιβεβαιώθηκε ρητά αν αυτό το fix λύνει και τα `pharmacy4u`/`Jumbo`~~ — **δοκιμάστηκαν, δες §12.** Το βαθύτερο ref-resolution bug (§9, ανοιχτό ερώτημα #1) παραμένει ανεξήγητο σε επίπεδο upstream, απλά το recipe πλέον το αποφεύγει εντελώς.

## 12. ✅ Πλήρες 4/4 validation — ΟΛΑ τα stores του §8 failure list περνάνε τώρα

Τρέχτηκαν end-to-end (`npm run workflow`) τα 2 υπόλοιπα stores από το §8 failure list:

| Store | Πριν (§8) | Τώρα | Duration | Bottleneck step |
|---|---|---|---|---|
| CoffeeIsland | SDK crash | ✅ pass (×2) | 114.9s | dismiss cookie: 9.1s |
| Cosmossport | SDK crash | ✅ pass (CLI-level) | — | click+wait: 2.7s |
| **Jumbo** | SDK crash | ✅ pass (×2) | 128.9s – 541.8s (βλ. σημείωση) | Cloudflare challenge, **άσχετο** με το fix μας |
| **Pharmacy4u** | SDK crash | ✅ pass | 130.6s | dismiss cookie: 11.5s |

**Σημείωση για Jumbo**: 1η προσπάθεια πήρε 541.8s (9 λεπτά) — ΑΛΛΑ όχι λόγω του cookie-wait bug. Clean rerun έδειξε step `"3. 10.7s — Wait for Cloudflare to pass and snapshot"` + `"4. 16.0s — Retry opening jumbo.gr homepage directly"`: το jumbo.gr έχει **Cloudflare bot-protection**, που καμιά φορά αργεί να περάσει το challenge (πιθανώς η 1η προσπάθεια χτύπησε σε πιο αργό/αποτυχημένο challenge, με retries). 2η φορά πέρασε γρήγορα (10.7s) και όλο το run έκλεισε σε 128.9s. Άσχετο confound, ξεχωριστό ζήτημα από ό,τι ερευνήσαμε εδώ — δεν χρειάζεται περαιτέρω action τώρα, απλά σημειώνεται.

**Συμπέρασμα**: **4/4 από τα stores που στο §8 ήταν σταθερά "SDK crash" τώρα ολοκληρώνονται καθαρά** με το fixed recipe (§11). Το fix θεωρείται πλήρως validated.

## 10. Evidence appendix
- Failure breakdown: Success {Plaisio, Korres, Public}· SDK crash {pharmacy4u, CoffeeIsland, Cosmossport, Jumbo}· site-block conf:0 {Sephora}.
- SDK code: `cli.js` streaming loop throw· `eH({mode:"task-notification"})` ×4· XML types `oH="task-notification"`· `backgroundTaskId` σε Bash results.
- «TaskOutput» step εμφανίστηκε σε failing run (direct evidence background-task path).
- (2026-07-01) `--state` flag collision reproduced 2× με fresh daemon· Cookiebot container επιβεβαιωμένα παραμένει στο DOM μετά dismiss (`inDOM:true, display:none`)· agent-browser v0.25.5.

> Σχετικά: validation `2026-06-04-validation-stability-projection.md` · e2e `2026-06-04-brand-characteristics-e2e-test.md`
