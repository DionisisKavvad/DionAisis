# detect-logos — May 2026 Cycle Results

**Date:** 2026-05-18
**Account:** 642783340947 (dionisis-equality)
**Profile:** equalityAdmin
**Region:** eu-west-1
**Service:** `services/business-services/detect-store-logo`
**Cycle window:** 2026-05-01 → 2026-05-15 (annual logo refresh)

## TL;DR
- Initial queue: **6,149 stores**, final queue: **0**.
- Logo saved successfully: **161 distinct stores** (2.6% of initial, 27.6% of attempted).
- Only **584 unique stores** ever got an outcome event in DynamoDB. ~5,565 stores were dequeued without producing any logged result.
- Pipeline τυπικά succeeded (queue άδεια, SF runs SUCCEEDED), αλλά τα στατιστικά λένε άλλο: 89% του traffic ήταν connection errors, καμία batch completion δεν γράφτηκε.

## Cycle timeline

| # | Start | End | Duration | Main SF Status | Note |
|---|---|---|---|---|---|
| 0 | 1/5 06:00 UTC | — | seconds | — | `begin-detect-logos` cron, 6,149 stores queued |
| 1 | 1/5 09:02 | 5/5 15:36 | 105h | **FAILED** | Child hit Step Functions max history events (25,000) |
| 2 | 5/5 15:37 | 6/5 12:31 | 21h | **ABORTED** | Manual stop, proxies in cooldown loop, 401 retry fix redeployed |
| 3 | 6/5 12:31 | 13/5 05:01 | 168h | **SUCCEEDED** | output count=101 |
| 4 | 13/5 05:02 | 15/5 12:44 | 56h | **SUCCEEDED** | output count=27, queue exhausted |

## Step Functions stats

**Main `prod-detect-logos`:**
- 4 runs, 2 SUCCEEDED, 1 FAILED, 1 ABORTED

**Child `prod-detect-store-logo` (May total):**
- 217 executions
- SUCCEEDED: 215 (99.1%)
- FAILED: 1 (`States.Runtime: max history events 25000`)
- ABORTED: 1 (manual)
- Avg duration: ~2.8h, range 8s → 335min

## DynamoDB outcomes (the real picture)

Queried `prod_equality_unified_logs` via GSI4 για events ≥ 2026-05-01:

| Event | Events | Distinct stores |
|---|---|---|
| Store Logo Saved | 162 | **161** |
| Store Logo Not Found | 0 | 0 |
| Facebook Page Possible Ban Detected | 420 | 141 |
| Facebook Page Hard Ban Detected | 0 | 0 |
| Connection Error | 3,773 | 311 |
| Unexpected Error | 23 | 9 |
| Logo Detection Process Started | 4 | — |
| Logo Detection Process Completed | 2 | — |
| Batch Detect Logos Started | 1 | — |
| Batch Detect Logos Completed | **0** | — |

### Distinct store coverage
- 584 unique stores touched (Logo Saved + Possible Ban + Connection Error + Unexpected Error, deduped union ≈ 584)
- 6,149 initial − 584 with events = **~5,565 stores με κανένα outcome event**
- 6,149 − 161 saved = 5,988 stores **χωρίς logo** στο τέλος του cycle

## Red flags

### 1. 5,565 stores silently disappeared
Queue πήγε 6,149 → 0 και το SF βλέπει "SUCCEEDED", αλλά μόνο 584 stores έχουν event στο DynamoDB. Τα υπόλοιπα είτε:
- Dequeued και dropped χωρίς να γίνει processing (consumer bug)
- Processed αλλά κανένα event δεν emit-αρίστηκε (logging bug)
- Re-queued πολλές φορές (ίδιο storeId πολλαπλά messages) → queue depth ψεύδεται

Πρώτο priority: validate ότι κάθε dequeue παράγει event.

### 2. Zero "Logo Not Found" events
Ο κώδικας έχει το branch (`STORE_LOGO_NOT_FOUND`) αλλά δεν χτυπάει ποτέ. Είτε όλα crash πριν φτάσουν εκεί (connection errors πρώτα), είτε το emit είναι σπασμένο.

### 3. Zero "Batch Completed" events
2 main SF runs SUCCEEDED, αλλά κανένα `Batch Detect Logos Completed` event δεν γράφτηκε. Πιθανώς το emit μπαίνει μόνο στο "happy path" που δεν χτυπιέται ποτέ.

### 4. 89% των failures είναι Connection Errors
3,773 events σε 311 stores = ~12 retries per store. Είτε retries πολύ aggressive, είτε το upstream (Facebook) blocking heavily.

### 5. Step Functions history limit χτύπησε
1 child failed στο 25k events. Σημαίνει ότι ένα single store έκανε ~25k state transitions σε ~92 ώρες. Είτε retry loop, είτε infinite-ish wait pattern. Architectural smell.

### 6. Real success rate πολύ χαμηλό
- 2.6% επί 6,149 αρχικών
- 27.6% επί 584 attempted

Για annual refresh αυτό δεν είναι acceptable.

## Investigation priorities (next)

1. **Trace τα 5,565 missing stores.** Πάρε ένα sample 10 storeIds που ήταν validated αλλά δεν έχουν May 2026 event, ψάξε στα CloudWatch logs του `detect-store-logo` Lambda αν έγινε attempt. Αν ναι, διορθώθηκε το logging. Αν όχι, διορθώθηκε το consumer.
2. **Investigate connection error pattern.** Είναι Facebook block; Είναι proxy issue; Συσχέτισε με `Proxy Banned` events.
3. **Verify 401 retry fix deployment.** Mentioned στο abort cause της 5/5, να επιβεβαιωθεί ότι όντως είναι στο prod.
4. **Refactor inner state machine.** Να μην παράγει 25k events per store. Πιθανώς το retry/wait pattern είναι ASL anti-pattern.
5. **Fix `Batch Detect Logos Completed` emit.** Παρακολουθεί completion για το πιο σημαντικό milestone.
6. **Επανέλεγξε αν τα 6,149 messages είναι unique stores.** Αν είναι duplicates, η εικόνα του coverage αλλάζει.

## Open questions
- Έγινε deploy το 401 retry fix; Πότε ακριβώς;
- Slack reports (Daily / Completion) πήγαν για τη 13-15/5 περίοδο; (Δεν έχουμε access από εδώ.)
- Validated stores στο GSI4 query: 6,149 unique storeIds ή πολλαπλά events ανά store;
- Αν `Logo Not Found` δεν emit-άρεται ποτέ, σε ποιο branch του κώδικα κολλάει το flow;

## Methodology
- AWS calls via aws-investigator agent (read-only)
- DynamoDB queries: GSI4 με `EVENT#<type>` PK, SK range `TENANT#gbinnovations#TIMESTAMP#2026-05-01` → end of May (epoch ms range 1777582800000-1780261199000)
- Distinct store counts: είτε από GSI5 (`EVENT#<type>` PK με STORE# segment στο SK), είτε από counting unique storeIds στα Items
- Step Functions: `list-executions` paginated, `describe-execution` για input/output, `get-execution-history --reverse-order` για failure causes
- SQS: `get-queue-attributes ApproximateNumberOfMessages` για current depth
