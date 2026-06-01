# SQS Retention Loss — Recovery Plan

**Date:** 2026-05-27
**Service:** `scrape-eshops` (prod)
**Stage:** prod
**Status:** Plan ready (post-review), execution pending

---

## TL;DR

Το 27-day run που έκλεισε σήμερα έχασε σιωπηλά μηνύματα στο `storesInShuffleSqs` λόγω 14-day SQS retention. Recovery plan: re-trigger marketplace listing scrape (χωρίς `RUN_STARTED`), drain το queue σε memory, filter μόνο τα stores που **δεν έχουν `Store Marketplace Url Saved` event**, re-enqueue μόνο αυτά. Νέο script: `scripts/recover-lost-stores.js` (patched μετά agent review).

## Recovery target — ξεκάθαρα

**Re-run μόνο τα stores που δεν έχουν `Store Marketplace Url Saved` event στο DDB.**

Αυτό το event εκπέμπεται από το `saveStore`, που τρέχει σε:
- ✅ Successful scrape
- ✅ `shopUnavailable` path

ΟΧΙ σε:
- ❌ Banned stores
- ❌ Connection-error stores
- ❌ Stores που ποτέ δεν τράβηξαν message από το queue (retention loss)

Άρα το criterion αυτόματα στοχεύει: retention-lost + ban-failed + connection-error-failed + νέα stores που εμφανίστηκαν στο current marketplace listing και δεν έχουμε ποτέ scraped. Όλα αυτά είναι **αυτά ακριβώς που θέλουμε** να ξαναπροσπαθήσουμε.

---

## Root cause

- `storesInShuffleSqs` (το per-store work queue) έχει retention = 14d, που είναι το AWS hard cap.
- Run διάρκεια = 27d → όσα μηνύματα έμειναν >14d στο queue, διαγράφηκαν σιωπηλά από AWS (no DLQ, no log, no event).
- Δεν είναι config bug — είναι **αρχιτεκτονικός περιορισμός** (run > 14d ≠ AWS-supported pattern για SQS-as-work-queue).
- Συνεισφέρων παράγοντας: BestPrice ban storm (3,639 BP bans vs 98 Skroutz) επιβράδυνε το throughput → drain slower than retention.

## Recovery στρατηγική

Αξιοποίηση του ήδη υπάρχοντος dedup στο pipeline (`store-exists-in-marketplace.js:46-60`) που τσεκάρει DDB GSI5 για `Store Marketplace Url Saved` event ανά `marketplaceUrl`. Stores που έχουν αυτό το event = ήδη scraped (success ή shopUnavailable, το `saveStore` τρέχει και στις δύο περιπτώσεις). Stores χωρίς = lost ή never-completed → χρειάζονται re-scrape.

## Βήματα

### 0. Pre-flight checks
- [x] Backup `prod_activity_logs` (DDB PITR/snapshot) — done
- [ ] Επιβεβαίωση ότι δεν τρέχει active `scrape-greek-stores` SF execution.
- [ ] AWS profile `equalityAdmin` active για το terminal session.

### 1. Patch + disable cron σε ΕΝΑ deploy
**Service:** `scrape-eshops`

Δύο αλλαγές σε αυτό το service deploy:

**(α) Patch `shuffle-stores.js` — skip `RUN_STARTED`**
**File:** `services/business-services/scrape-eshops/src/scrape-greek-marketplaces/shuffle-stores.js`, **lines 100-127**.

Σχολίασε το ολόκληρο `try { runId... } catch` block. Σκοπός: να μην δημιουργηθεί νέο run-window στο reporting.

**(β) Disable `watch-for-stores-scrape` schedule**
**File:** `services/business-services/scrape-eshops/serverless.yml`, **lines 23-26**

Από:
```yaml
watchForStoresEvents:
  prod:
    - schedule: rate(5 minutes)
  dev: []
```

Σε:
```yaml
watchForStoresEvents:
  prod:
    - schedule:
        rate: rate(5 minutes)
        enabled: false           # RECOVERY: disabled during operation
  dev: []
```

(Η explicit object syntax απαιτείται για να δουλέψει το `enabled: false` — βλ. `scheduledEvents` line 13-17 για το same pattern.)

**Άλλα events που εκπέμπει το marketplace SF (έλεγξε):**
- `MARKETPLACE_SCRAPE_ENDED` σε `get-skroutz-stores.js:264-274` και αντίστοιχο BP → benign, no run-boundary consumer. Επιβεβαίωση: `grep MARKETPLACE_SCRAPE_ENDED scrape-eshops-reports/ process-eshops-information/`.

Deploy: `npm run deploy:prod` στο `scrape-eshops` service. **ΕΝΑ deploy καλύπτει και τα δύο.**

### 2. Verification — cron is disabled
```bash
aws events list-rules --region eu-west-1 --name-prefix scrape-eshops-prod-watch | \
  jq -r '.Rules[] | "\(.Name)  STATE=\(.State)"'
```

Πρέπει να δείξει `STATE=DISABLED` για το rule του `watch-for-stores-scrape`. Αν δείχνει ENABLED, sysop check το deploy.

### 3. Trigger marketplace re-discovery
Start το `prod-scrape-greek-marketplaces` SF από AWS console (ή CLI).

```bash
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:eu-west-1:642783340947:stateMachine:prod-scrape-greek-marketplaces \
  --name "recovery-$(date +%s)" \
  --region eu-west-1
```

Wait until completion (~1-2 hours). Το shuffle θα γεμίσει το `storesInShuffleSqs` με ολόκληρο το current marketplace listing (Skroutz + BP).

### 4. Run recovery script
**File:** `scripts/recover-lost-stores.js` (post-review patches applied)

```bash
cd /Users/dionisis/Projects/Business\ development/scrape-the-greek-ecommerce-v2

# ΠΡΩΤΑ dry-run για sanity check
node scripts/recover-lost-stores.js --dry-run --table=prod_activity_logs

# Αν τα νούμερα δείχνουν λογικά, real run
node scripts/recover-lost-stores.js --table=prod_activity_logs --concurrency=10
```

**Τι κάνει:**
1. Drains όλα τα messages από `storesInShuffleSqs` (12h VisibilityTimeout για safety)
2. **Incremental JSONL backup** σε `scripts/lost-stores-recovery-backup-<ts>.jsonl` — γράφεται **πριν** κάθε `DeleteMessageBatchCommand`. Crash mid-drain = zero data loss (μηνύματα παραμένουν στο queue invisible για 12h, μπορούν να re-drained).
3. Για κάθε message: DDB GSI5 query για `Store Marketplace Url Saved` event στο `marketplaceUrl` (same pattern με `store-exists-in-marketplace.js:46-60`)
4. Classify: `lost` (no event), `alreadyProcessed` (event exists), `invalid` (parse/query error)
5. Re-enqueue ΜΟΝΟ τα `lost` με **partial-failure handling** (1 retry στο per-entry `result.Failed`, fail-loud αν retry εξαντλείται)
6. Summary JSON σε `scripts/lost-stores-recovery-report-<ts>.json` (counts, samples, queue depths)

**Expected output:**
```
counts: {
  drained: ~8000,
  lost: ~few hundred to 2k,        // αυτά είναι τα recovery targets
  alreadyProcessed: ~5000-7000,    // dedup hits
  invalid: ~0-10
}
```

### 5. Sanity checks πριν re-enable cron
- [ ] `lost` count μέσα σε reasonable range (10s-1000s, όχι 0 ούτε 8000).
- [ ] `alreadyProcessed` count κοντά στο `Scraped + storeRemoved + skipped` του previous run.
- [ ] Sample 5 lost stores: επιβεβαίωσε χειροκίνητα ότι δεν υπάρχουν στο DDB store table (`prod_ecommerce_unified`).
- [ ] Queue depth μετά το recovery = `lost.count`.

### 6. Re-activate reporting — delete latest `RUN_COMPLETED`

Χωρίς αυτό, τα daily reports δεν θα τρέξουν κατά τη διάρκεια του recovery (το `getActiveRun()` returns null όσο υπάρχει matching RUN_COMPLETED).

**File:** `scripts/delete-latest-run-completed.js` (νέο)

```bash
# Dry-run πρώτα — εμφανίζει το target event χωρίς διαγραφή
node scripts/delete-latest-run-completed.js --dry-run

# Επιβεβαίωσε ότι:
#   - timestampIso ≈ 2026-05-27T06:37 UTC (το σημερινό completion)
#   - properties.runId ταιριάζει με το runId του τελευταίου RUN_STARTED
# Μετά real delete:
node scripts/delete-latest-run-completed.js
```

**Επίδραση:**
- `getActiveRun()` ξανα-επιστρέφει το παλιό RUN_STARTED ως active
- Daily reports cron resumes, counting cumulatively από `runStartTimestamp` (27d πριν)
- `Scraped`, `Prepared for review`, κλπ. συνεχίζουν να αυξάνονται πάνω από το 2,905/2,965 baseline
- `dayNumber` στο Slack θα δείχνει 28+ (recovery phase)
- Μετά το τέλος του recovery (queue empty + SF idle), ο completion-checker θα fire ξανά → emit **νέο** RUN_COMPLETED + νέο "Run Complete" Slack message με final updated stats

**Δεν χρειάζεται να σβηστεί:**
- ❌ RUN_STARTED (το θέλουμε ως anchor)
- ❌ Store-level scrape events (history, μετράνε στο cumulative)
- ❌ DAILY_REPORT_COMPLETED του τελευταίου day (απλά marker, daily-report check βασίζεται στο latest DAILY_REPORT_STARTED timestamp)
- ❌ Το παλιό Slack "Run Complete" message (cosmetic, μπορεί να μείνει)

### 6.5 Recreate daily-report schedules για το recovery

**Γιατί:** το `completion-checker.js:131-148` διέγραψε ΟΛΕΣ τις daily-report + progress-report schedules κατά το completion σήμερα. Χωρίς αυτές, η `daily-report` lambda δεν θα fire αυτόματα ποτέ → no Slack progress visibility. Επίσης δεν μπορούμε απλά να invoke το `schedule-daily-reports` lambda γιατί:
1. Στέλνει νέο "Run Started" Slack notification (noise).
2. Δημιουργεί 30 schedules με dates `startDate + (day-1)`, που για το παλιό startDate (April~May) σημαίνει σχεδόν όλα είναι **στο παρελθόν** → invalid.

**File:** `scripts/setup-recovery-daily-schedules.js` (νέο, ~120 lines)

**Pre-requisite:** πάρε το `SCHEDULER_ROLE_ARN` από το deployed lambda env:

```bash
ROLE_ARN=$(aws lambda get-function-configuration \
  --function-name scrape-eshops-reports-prod-schedule-daily-reports \
  --region eu-west-1 \
  --query 'Environment.Variables.SCHEDULER_ROLE_ARN' --output text)
echo $ROLE_ARN
```

**Dry-run + real run:**
```bash
node scripts/setup-recovery-daily-schedules.js --dry-run --scheduler-role-arn=$ROLE_ARN --days=7
node scripts/setup-recovery-daily-schedules.js --scheduler-role-arn=$ROLE_ARN --days=7
```

**Τι κάνει:**
- Ensures schedule group `scrape-eshops-daily-reports-prod` exists
- Δημιουργεί 7 one-time schedules ονόματος `recovery-daily-<epoch>-day-N`:
  - Day 1: `now + 1 minute` (immediate)
  - Day 2-7: consecutive days, same UTC time
- Καθεμία invoke-ει την `daily-report` lambda χωρίς input
- Auto-delete μετά την εκτέλεση (`ActionAfterCompletion: DELETE`)

**Αποτέλεσμα στο daily-report run:**
- `getActiveRun()` returns το παλιό RUN_STARTED (μετά το βήμα 6)
- `dayNumber = (now - activeRun.timestamp) / 86400000` → ~Day 28+
- `latestDailyReport` = Day 26 από χθες → `has23HoursPassed = true` → δημιουργεί ΝΕΟ Slack daily thread "Day 28 Progress"
- Schedules N progress-report sub-schedules για τη μέρα (default interval 240 min = 4h)
- Cumulative numbers continuous από `runStartTimestamp` (27d πριν): π.χ. `Scraped: 2,965 → 2,970 → 2,975...`

**Day 26 thread μένει intact** — κανένας δεν γράφει εκεί.

### 7. Revert patch + re-enable cron σε ΕΝΑ deploy
**Service:** `scrape-eshops`

Αντίστροφο του βήματος 1 — δύο αλλαγές σε ένα deploy:

**(α) Revert `shuffle-stores.js`**: επανέφερε το `RUN_STARTED` block (lines 100-127) για το επόμενο normal full run.

**(β) Revert `serverless.yml` watchForStoresEvents**:
```yaml
watchForStoresEvents:
  prod:
    - schedule: rate(5 minutes)
  dev: []
```

Deploy: `npm run deploy:prod` στο `scrape-eshops` service.

Μετά το deploy, ο cron resume-άρει αυτόματα. Το pipeline ξεκινά να επεξεργάζεται το (μικρότερο) queue. Επειδή είναι ~10-25% του original size, το drain θα ολοκληρωθεί καλά μέσα σε 14 days.

## Monitoring while recovery runs

- **CloudWatch alarm**: `ApproximateAgeOfOldestMessage` στο `storesInShuffleSqs` > 10 days = warning, > 13 days = critical. Setup μετά το recovery, πριν το επόμενο full run.
- **Periodic check**: queue depth μειώνεται monotonically.
- **Slack reports**: αυξανόμενο `Scraped` και `Prepared for review` ως progress signal.

## Open questions / decisions needed

1. Πώς να ονομαστεί το EventBridge rule του `watch-for-stores-scrape`; (find via CLI πριν disable)
2. Αν `MARKETPLACE_SCRAPE_ENDED` παίζει ρόλο σε downstream, χρειάζεται επιπλέον mask.
3. Architectural: αν τα μελλοντικά runs είναι likely >14 days, χρειάζεται DDB-backed queue ή parallel SF executions. Decision pending.

## Risks

| Risk | Mitigation |
|---|---|
| Cron not actually disabled → race | Step 2 explicit verification gate (`aws events list-rules ... STATE=DISABLED`) πριν trigger SF στο step 3 |
| Recovery script crashes mid-drain | **PATCHED**: incremental JSONL backup πριν κάθε delete batch → messages persist on disk πριν χαθεί η visibility. Αν crash, messages παραμένουν invisible στο queue για 12h και ξανα-drained on restart |
| DDB throttling στο GSI5 partition `EVENT#Store Marketplace Url Saved` | **MITIGATED**: concurrency default 10 (από 25). Αν δεις throttle exceptions, μείωσε σε 5 |
| Re-enqueue partial failures (SQS SendMessageBatch returns `Failed[]`) | **PATCHED**: 1 retry per failed entry, fail-loud αν retry εξαντλείται. Summary JSON έχει `reEnqueueFailedSamples` για audit |
| Re-enqueue duplicates υπάρχοντα stores | Το `store-exists-in-marketplace.js` τα φιλτράρει στο scrape SF entry. Acceptable defense-in-depth (αλλά μετά το script filter δεν αναμένουμε τέτοιες περιπτώσεις) |
| Marketplace listing drift over 27d | Acceptable / desirable. Νέα stores → re-scrape. Παλιά που έφυγαν → δεν θα μπουν καν στο queue. Recovery υπολογίζει "what's currently scrapeable" όχι "what was there 27d ago" |
| Backup file size | ~8k messages × ~250 bytes = ~2MB JSONL. Acceptable |

## Post-review changes (from solution-architect + devil's-advocate agents)

Trimmed & applied:
- **Incremental JSONL backup**: streamed πριν κάθε delete batch (crash safety)
- **SQS partial-failure handling στο re-enqueue**: 1 retry + fail-loud
- **Concurrency default 10**: από 25 για να μην hot-partition-άρει το GSI5
- **Removed retention/VT YAML step entirely**: `storesInShuffleSqs` ήδη έχει 14d (AWS max), `VisibilityTimeout` 30s είναι ΟΚ λόγω singleton SF guard. Δεν υπάρχει config patch να γίνει.
- **Clarified recovery target**: μόνο stores **χωρίς `Store Marketplace Url Saved` event**. Αυτό αυτόματα συμπεριλαμβάνει retention-lost, ban-failed, connection-error-failed, νέα stores

Rejected:
- "Do nothing, accept loss" — δεν είναι το ζητούμενο, θες recovery
- "Re-enqueue ban-failed θα κάψει ξανά bans" — λάθος ανάλυση, αυτά **πρέπει** να ξαναπροσπαθήσουν αλλιώς ποτέ δεν θα συλληφθούν
- "Marketplace drift κάνει το recovery wrong" — drift είναι feature, όχι bug για αυτό το context

## Deliverables

- [x] Recovery script: `scripts/recover-lost-stores.js` (patched)
- [x] Delete-latest-RUN_COMPLETED script: `scripts/delete-latest-run-completed.js`
- [x] Recovery daily-report schedules setup: `scripts/setup-recovery-daily-schedules.js`
- [x] Recovery report: this file
- [ ] Execution log / actual counts (todo μετά το run)
