# Completion Detection: completion-checker vs "emit στο Step Function"

**TL;DR:** Ο senior προτείνει: (1) το **Step Function** να εκπέμπει το `RUN_COMPLETED` event όταν το `get-store` βρει άδειο SQS, και (2) το **completion-checker** να μην το εκπέμπει πια — να μετατραπεί από cronjob σε **EventBridge-triggered handler** πάνω σε αυτό το event (cleanup + Slack). Το event-driven trigger είναι σωστό και idiomatic (το reports service ήδη το κάνει για το Run Started μέσω `RunStartedRule`). Το λεπτό λάθος: το **empty-poll του SF δεν είναι αξιόπιστο authoritative σήμα** (short-poll false empty, in-flight crashes, continue-as-new, one-shot χωρίς retry), και το `RUN_COMPLETED` είναι το event που μηδενίζει το `getActiveRun` → ένα false positive σταματάει **πρόωρα και μη αναστρέψιμα όλο το reporting του run**. Σωστή σύγκλιση: SF εκπέμπει **candidate** signal (`Queue Drained`) → triggers checker → checker **VERIFIES** (queue incl in-flight + SF idle + claim) → ο **checker** εκπέμπει το authoritative `RUN_COMPLETED`.

---

## Context — η τρέχουσα αρχιτεκτονική

**Δύο services:**
- `scrape-posts-service` — ο scraper. Step Function `scrape-facebook-posts` που τραβάει 1 store τη φορά από SQS, σκραπάρει, σβήνει το μήνυμα.
- `facebook-posts-reports` — ξεχωριστό service για monitoring/Slack reporting ενός ολόκληρου "run".

**Concurrency model (κρίσιμο):** το `watcher` lambda επιβάλλει **single execution** — ξεκινάει το SF μόνο αν `runningExecutions === 0`. Άρα τρέχει ένα execution τη φορά, σειριακά, ένα store κάθε φορά. (Continue-as-new κάθε ~100 stores για το όριο 25k events του SF history.)

**Πώς ορίζεται σήμερα το "complete"** (`ProcessStateService.isProcessComplete`):
```
isComplete = (SQS queueDepth === 0) AND (κανένα scrape SF execution σε RUNNING)
queueDepth = ApproximateNumberOfMessages (visible) + ApproximateNumberOfMessagesNotVisible (in-flight)
```
Το `completion-checker` τρέχει scheduled κάθε 30min (prod), ελέγχει τα παραπάνω, και αν complete: cleanup schedules + Slack "Run Completed" + log `RUN_COMPLETED` event. Idempotency μέσω `tryClaimCompletion` (conditional write στο DynamoDB → ο πρώτος κερδίζει).

---

## Πρόταση senior (ακριβής διατύπωση)

1. Το **Step Function** (`get-store` empty branch → `isStoreAvailable → Done`) εκπέμπει το `RUN_COMPLETED` event στο EventBridge.
2. Το **completion-checker** ΔΕΝ εκπέμπει πια το event και ΔΕΝ τρέχει σε cron. Γίνεται **EventBridge-triggered**: ένα rule πάνω στο `RUN_COMPLETED` το καλεί, και αυτό κάνει μόνο τη reactive δουλειά (cleanup schedules + Slack + final stats).

**Πού έχει δίκιο:**
- **Event-driven αντί cron = σωστό.** Μηδέν latency (όχι έως 30min), μηδέν άσκοπα ticks, μηδέν DynamoDB queries σε κάθε tick.
- **Υπάρχει ήδη το pattern στο codebase:** το `RunStartedRule` (serverless.yml του reports service) τριγκάρει το `schedule-daily-reports` στο `"Facebook Posts Run Started"`. Ένα συμμετρικό `RunCompletedRule → completion-checker` είναι 100% consistent.
- Σε single sequential execution, στο empty poll το προηγούμενο store έχει ήδη γίνει `sqs-delete`. Άρα "άδειο SQS" ≈ "τελείωσα" στο common case.

**Πού είναι το λεπτό λάθος — ΠΟΙΟΣ αποφασίζει:**
Το πρόβλημα δεν είναι το "trigger αντί cron" (σωστό). Είναι ότι **το SF παίρνει την authoritative απόφαση** (empty-poll) και εκπέμπει το **authoritative** `RUN_COMPLETED`. Δύο συνέπειες:
- Το `RUN_COMPLETED` μηδενίζει το run: μόλις μπει στο Dynamo, `getActiveRun() → null` → σταματάνε daily + progress reports. Ένα **false positive** (Ζητήματα 2, 3) δεν στέλνει απλά λάθος Slack — **σκοτώνει πρόωρα όλο το reporting**, μη αναστρέψιμα.
- Ο checker τριγκάρεται **αφού** το event έχει ήδη σκάσει → ο robust έλεγχος (in-flight + SF idle) έρχεται πολύ αργά.
- Κρίσιμο: το SF **ήδη τερματίζει με ΕΝΑ short-poll empty, χωρίς retry**. Σήμερα αβλαβές (τερματισμός execution ≠ run completed· ο checker αποφασίζει ανεξάρτητα, ο watcher κάνει restart). Η πρόταση **κάνει αυτόν τον εύθραυστο τερματισμό authoritative** και αφαιρεί το δίχτυ ασφαλείας.

---

## Υπόβαθρο SQS (η βάση για όλα τα ζητήματα)

1. **Visibility timeout / in-flight:** `receiveMessage` ΔΕΝ διαγράφει το μήνυμα — το κάνει αόρατο (in-flight) για X sec. Διαγράφεται μόνο με ρητό `deleteMessage` (= το `sqs-delete` state, μετά από επιτυχές scrape). Αν δεν διαγραφεί στο timeout (crash), ξαναγίνεται visible.
   - 3 καταστάσεις: **Visible** (`ApproximateNumberOfMessages`) / **In-flight** (`ApproximateNumberOfMessagesNotVisible`) / **Deleted**.
2. **Short polling:** το `get-store` κάνει `WaitTimeSeconds: 0`, `MaxNumberOfMessages: 1`. Το SQS ρωτάει μόνο **υποσύνολο** των servers → μπορεί να γυρίσει **κενό ακόμα κι όταν υπάρχουν μηνύματα** (documented AWS behavior).
3. **Eventual consistency:** τα counters είναι κατά προσέγγιση, μπορεί να δείχνουν 0 ενώ υπάρχει μήνυμα για λίγα sec.

---

## Τα 5 ζητήματα — γιατί το SF δεν πρέπει να εκπέμπει το *authoritative* event

> Όλα ισχύουν για το σημείο που το SF empty-poll γίνεται η authoritative απόφαση ολοκλήρωσης. Στην πρόταση του senior, αυτά καθορίζουν πότε σκάει το `RUN_COMPLETED` — και επειδή είναι authoritative, ένα false positive μηδενίζει το run state (σταματάει το reporting), όχι απλά στέλνει λάθος Slack.

### Ζήτημα 1 — 4 διαφορετικά `Done`, μόνο 1 σημαίνει "τέλος run"
Στο `Done` καταλήγουν 4 μονοπάτια:
```
1. isStoreAvailable (άδειο SQS) ──► Done            ✅ ΑΥΤΟ θέλουμε
2. count > 100 ──► start-scrape ──► Done            ❌ continue-as-new (run ΣΥΝΕΧΙΖΕΙ)
3. catch-all-fallback ──► Done                       ❌ άγνωστο σφάλμα σε store
4. banCounter >= 5 ──► Done                          ❌ abort λόγω bans
```
Είναι ξεκάθαρο ότι θέλουμε **μόνο το branch #1** (κανένα available μήνυμα). Το πρόβλημα δεν είναι "ποιο branch" — είναι ότι **δεν μπορείς να βάλεις το emit στο shared `Done` state**, αλλιώς σκάει και στα 4. Παράδειγμα: 250 stores → στα 100 (`count>100 → Done`) στέλνεις "Run Completed" ενώ μένουν 150.
**Κόστος:** χρειάζεσαι ξεχωριστό state (πχ `emit-run-completed`) ανάμεσα στο `isStoreAvailable(empty)` και το `Done`, ΜΟΝΟ σε αυτό το branch. Διαχειρίσιμο, αλλά παραπάνω states/wiring — όχι "μία γραμμή".

### Ζήτημα 2 — Άδειο poll ≠ άδεια ουρά (short polling) [σοβαρότερο]
Λόγω `WaitTimeSeconds: 0`:
1. Στην ουρά μένουν 3 stores (visible).
2. `get-store` short poll → πέφτει σε άδειους servers → γυρίζει **κενό**.
3. `isStoreAvailable` → `Done`.
4. **Naive:** στέλνεις "Run Completed" ενώ 3 stores δεν σκραπαρίστηκαν.
5. Ο `watcher` (scheduled) βλέπει `messageCount > 0` + idle → restart SF → τα 3 σκραπάρονται τελικά, ΑΛΛΑ: (α) έστειλες πρόωρο "ολοκληρώθηκε", (β) στο τέλος του restart ξαναστέλνεις "Run Completed" (διπλό).
**Γιατί ο checker δεν την πατάει:** δεν βασίζεται σε ΕΝΑ `receiveMessage`. Διαβάζει `GetQueueAttributes` (visible+in-flight) + ελέγχει SF running + **ξανατρέχει** → transient false reading αυτο-διορθώνεται. Το SF emit είναι **one-shot**, χωρίς δεύτερη ευκαιρία.

**Πρακτική κρίση — το ασθενέστερο ζήτημα:** διορθώνεται με **long polling** (`get-store` → `WaitTimeSeconds: 20` αντί `0`). Long poll = ρωτάει ΟΛΟΥΣ τους servers → κενό = πραγματικά κενό. Επιστρέφει αμέσως όταν υπάρχει μήνυμα (μηδέν latency στο bulk), περιμένει 20s μόνο στο drain. `get-store` timeout = 30s, χωράει. SF cost = 0 (Standard = per-transition). Καθαρά θετικό. **Δεν** λύνει όμως in-flight (Ζήτημα 3). Άρα ως μόνιμο επιχείρημα κατά της πρότασης senior, το Ζήτημα 2 είναι αδύναμο — config fix, όχι αρχιτεκτονικό.

### Ζήτημα 3 — In-flight μήνυμα από store που έσκασε σκληρά
Τα `Catch` του `facebook` πιάνουν `FacebookLoginError` και `States.ALL`, ΟΧΙ infrastructure failures (Lambda timeout / OOM / killed).
1. `get-store` παίρνει `kotsovolos` → **in-flight** (NotVisible), visibility timeout πχ 15min.
2. Lambda **timeout**. Το `sqs-delete` δεν τρέχει ποτέ → το μήνυμα μένει in-flight, δεν διαγράφηκε.
3. `ApproximateNumberOfMessages` (visible) = **0** (το kotsovolos είναι NotVisible!).
4. **Naive** που κοιτά μόνο visible → "τελείωσα" → "Run Completed".
5. Μετά το timeout το kotsovolos ξαναγίνεται visible, watcher restart, σκραπάρεται. Είπες "ολοκληρώθηκε" ενώ store ήταν στον αέρα.
**Γιατί ο checker δεν την πατάει:** `getQueueDepth()` μετράει **visible + NotVisible**. Όσο το kotsovolos είναι in-flight → `queueDepth = 1` → not complete. Επιπλέον `isStateMachineRunning`.

### Ζήτημα 4 — Idempotency: το χρειάζεσαι ούτως ή άλλως
Από τα Ζητήματα 1-3, το Run Completed μπορεί να σκάσει πολλές φορές (continue-as-new, watcher restarts μετά από πρόωρο/transient empty). Άρα **και** στο SF design χρειάζεσαι "στείλε μόνο 1 φορά ανά run" = ακριβώς το `tryClaimCompletion`. Δεν εξαφανίζεις την πολυπλοκότητα του claim — την **μετακομίζεις** (ή την πετάς και τρως διπλά Slack).

### Ζήτημα 5 — Coupling (αρχιτεκτονικός διαχωρισμός)
Σήμερα: ο scraper ξέρει μόνο "σκράπαρε store, σβήσε από SQS". Το concept "run / μέρες / Slack thread / RUN_COMPLETED" ζει σε ξεχωριστό service. Δύο διαφορετικά domains: scraping vs reporting/observability.
Αν βάλεις το Run Completed στο scraper SF: κολλάς τα domains, κάθε αλλαγή reporting αγγίζει τον core scraper (regression risk), δυσκολότερο testing.

---

## Σύνοψη

| # | Ζήτημα | Γιατί ο naive σπάει | Πώς το λύνει ο checker |
|---|--------|---------------------|------------------------|
| 1 | 4 Done exits | emit και στα continue-as-new/failures | Έξω από SF, ρητά κριτήρια |
| 2 | Short polling | Κενό poll ≠ άδεια ουρά → πρόωρο | GetQueueAttributes + retry, αυτο-διόρθωση |
| 3 | In-flight crash | Visible=0 ενώ store "στον αέρα" → false | Μετράει visible + NotVisible + SF running |
| 4 | Idempotency | Χρειάζεται κι εκεί (continue-as-new, restarts) | `tryClaimCompletion` (atomic, exactly-once) |
| 5 | Coupling | Κολλάς scraper με reporting | Ξεχωριστό service, καθαρά όρια |

---

## Εναλλακτική: GetQueueAttributes μέσα στο SF empty-branch

Ιδέα: στο empty branch, πριν το `Done`, βάζουμε state που κάνει `GetQueueAttributes` για να επιβεβαιώσει "όντως άδειο".

**Τι κερδίζει:** aggregate metric πάνω σε όλα τα partitions → κλείνει το spatial sampling του short poll. Αν μετράς και `NotVisible`, πιάνει μερικώς το in-flight (Ζήτημα 3).

### Α) Κοινά όρια — ΔΕΝ τα λύνει ΟΥΤΕ η τωρινή λύση (όχι δίκαιη μομφή στην εναλλακτική)
> Αυτά τα κουβαλάει εξίσου ο σημερινός completion-checker, γιατί κι αυτός κάνει `GetQueueAttributes`. Δεν είναι λόγος να προτιμήσεις τη μία ή την άλλη.
- **Eventual consistency:** το `ApproximateNumberOfMessages` είναι approximate, lag δευτερολέπτων (ειδικά μετά delete ή visibility-timeout return). Το έχει **και** ο τωρινός checker.
- **False positive δεν αυτο-διορθώνεται:** η επανάληψη του checker σώζει μόνο false **negatives** (επόμενο tick). Σε false **positive** (stale `0` → πρόωρο completion), η ενέργεια (claim + Slack + `RUN_COMPLETED`) είναι **μη αναστρέψιμη** — το run έκλεισε. Ισχύει και για τις δύο λύσεις.
- **Idempotency:** continue-as-new + watcher restart → πολλά executions φτάνουν σε "confirmed empty". Atomic claim χρειάζεται **παντού** (ο checker το έχει ήδη ως `tryClaimCompletion`).
- **Residual in-flight τρύπα:** crashed execution + stale `NotVisible` + κανένα SF running → false "0". Στενό, κοινό σε όλες τις εκδοχές.

### Β) Γνήσιο μειονέκτημα της εναλλακτικής — χάνει το ορθογώνιο `isStateMachineRunning` guard
Αυτό είναι το **πραγματικό** διαφοροποιό, και δεν έχει σχέση με την ακρίβεια του counter:
- Ο τωρινός/triggered checker αποφασίζει `isComplete = (queueDepth===0) AND (!scrapeRunning)`. Το `isStateMachineRunning` είναι **ορθογώνιο** στο queue-lag: αν σκραπάρεται store → SF running → not complete, ό,τι κι αν λέει ο stale counter. Αυτό μασκάρει το μεγαλύτερο μέρος του lag ρίσκου.
- Το `GetQueueAttributes` **μέσα στο SF** ΔΕΝ μπορεί να χρησιμοποιήσει αυτό το guard — τρέχει **μέσα στο ίδιο running SF** που θα έπρεπε να είναι idle. Μένει μόνο με τον lag-prone counter.
- Ο triggered checker τρέχει **αφού** τελειώσει το execution → `ListExecutions(RUNNING)` ≈ 0 → μπορεί να το χρησιμοποιήσει. **Γι' αυτό το candidate+checker > GetQueueAttributes-in-SF**: όχι λόγω API accuracy, αλλά γιατί το ορθογώνιο σήμα είναι διαθέσιμο μόνο εκτός/μετά το SF.

### Γ) Νέα ζητήματα που δημιουργεί η εναλλακτική (αποκλειστικά δικά της)
- **TOCTOU race:** check `0` → ανάμεσα check και `Done` ένα in-flight ξαναγυρίζει → false completion.
- **Busy-loop / livelock:** αν `>0` (πχ in-flight για 15min visibility timeout), loop `get-store→check→get-store` καίει Lambda + state transitions· θες Wait + max-retries guard.
- **ASL πολυπλοκότητα + extra transitions** (Standard SF = χρέωση ανά transition).

**Meta-σημείο:** για να το κάνεις σωστά μέσα στο SF χρειάζεσαι: GetQueueAttributes (visible+NotVisible) + Wait+loop + max-retries + ListExecutions + atomic claim = **ο completion-checker ξαναγραμμένος σε ASL**, και μάλιστα **χωρίς** να μπορεί να χρησιμοποιήσει το SF-running guard. Καθαρότερο σε imperative Lambda παρά σε state-machine YAML.

---

## Σύσταση — η σύγκλιση (candidate event, όχι authoritative)

Πολύ κοντά είστε. Η διαφορά είναι στενή αλλά σημαντική: **το SF να εκπέμπει candidate signal, όχι το authoritative `RUN_COMPLETED`.**

```
SF (get-store empty branch)
   └─► εκπέμπει "Scrape Queue Drained" event   (candidate, ΟΧΙ authoritative)
          └─► EventBridge rule ─► triggers completion-checker
                                     ├─ VERIFY: queueDepth (visible+in-flight)==0 AND SF idle
                                     ├─ tryClaimCompletion(runId)            (exactly-once)
                                     └─ αν OK ─► εκπέμπει το authoritative RUN_COMPLETED + Slack + cleanup
   + αραιό safety-net cron (πχ κάθε 2h) σε περίπτωση χαμένου event
```

Έτσι ο senior παίρνει το 95%:
- **Event-driven trigger** (no cron latency), idiomatic σαν το `RunStartedRule`. ✅
- Ο checker **παραμένει ο verifier** — απλά τριγκάρεται αντί να κάνει poll. ✅
- Το authoritative `RUN_COMPLETED` το εκπέμπει **ο checker μετά το verify**, ΟΧΙ το SF → δεν μηδενίζεται το run state σε false positive. ✅
- Κρατάς idempotency (`tryClaimCompletion`) + decoupling + δίχτυ ασφαλείας. ✅

Κόστος: λίγο wiring — ένα νέο event από το SF empty-branch + ένα `RunCompletedRule`-style rule + το VERIFY βήμα μένει στον checker.

**Μήνυμα στον senior:** "Ναι στο event-driven trigger — ταιριάζει με το `RunStartedRule` που ήδη έχουμε. Όχι στο να εκπέμπει το SF το authoritative `RUN_COMPLETED`: το empty-poll είναι one-shot χωρίς retry και μηδενίζει το run state σε false positive. Στείλε **candidate** event από το SF, ο checker verify-άρει (queue incl in-flight + SF idle + claim) και εκπέμπει το πραγματικό `RUN_COMPLETED`."

---

## Παράρτημα — Ο πραγματικός bug που δικαιολογεί το Ζήτημα 4 (commit `835ffff`, 2026-06-29)

Πραγματικό συμβάν: το Slack "Scrape Complete" στάλθηκε **6 φορές, κάθε 30min**, για ένα run. Αποδεικνύει ότι το idempotency δεν είναι θεωρητικό.

**Buggy `isRunCompleted` (πριν):**
```js
FilterExpression: 'properties.runId = :runId',   // runId ΜΟΝΟ σε filter (όχι key)
Limit: 1,                                          // ο φονιάς
```

**Δύο facts DynamoDB:**
1. `Limit` εφαρμόζεται **ΠΡΙΝ** το `FilterExpression` → `Limit:1` = "διάβασε 1 item, μετά φιλτράρισέ το". Περιορίζει read count, όχι result count.
2. Default `ScanIndexForward: true` (ascending) → διαβάζει το **παλαιότερο** RUN_COMPLETED event.

**Αλυσίδα:** runs runA (t1), μετά runB (latest). `isRunCompleted(runB)`:
- Query ascending `Limit:1` → διαβάζει event **runA** (παλαιότερο) → filter `runId=runB` → πετιέται → `[]` → `false`.
- runB θεωρείται active → στέλνει "Run Completed" → επόμενο tick **ίδιο ακριβώς** → loop κάθε 30min για πάντα.

**Γιατί "latest run":** με ΕΝΑ μόνο run δεν σκάει (το μοναδικό event είναι του ίδιου → matchάρει). Μόλις υπάρχει ≥1 προηγούμενο completed run, το παλαιότερο RUN_COMPLETED είναι πάντα κάποιου παλιού → το current/latest run **δεν αναγνωρίζεται ποτέ** ως completed.

**Fix (2 πράγματα):**
- `isRunCompleted`: drop `Limit:1`, **paginate όλα** τα RUN_COMPLETED → το runId filter εφαρμόζεται σωστά.
- **Add `tryClaimCompletion`**: atomic conditional write (`attribute_not_exists(PK)`). Ο πρώτος γράφει marker, οι υπόλοιποι → `ConditionalCheckFailedException`. Idempotency που **δεν** εξαρτάται από eventual-consistent read.

**Δίδαγμα για το παρόν:** η idempotency βασιζόταν σε buggy **read**· τώρα σε atomic **write** (strongly consistent). Κάθε σχέδιο completion (SF-emit, candidate+checker, GetQueueAttributes-in-SF) πρέπει να κρατήσει το atomic claim — αλλιώς continue-as-new + watcher restart ξαναφέρνουν duplicates.
