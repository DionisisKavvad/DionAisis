# Completion-checker pattern: πού αλλού χρειάζεται το fb-posts refactor

**TL;DR:** Το event-driven completion refactor του `scrape-facebook-posts` (commit `c142ed3`) ταιριάζει σε άλλα 6 completion-checkers. Πραγματικά αξίζει μόνο στο **fb-ads / detect-pages** (καθαρό 1:1, λύνει υπαρκτό duplicate-reports bug). Τα 2 prod fixes (handler path, dead progress lambda) **δεν ισχύουν πουθενά αλλού** — είναι μοναδικά του fb-posts.

## Τι ήταν το reference change (fb-posts, c142ed3)
1. **Completion: cron polling → event-driven.** Παλιά: `completion-checker` σε cron, polls SQS depth + Step Function state για να μαντέψει αν τελείωσε το run, μετά emit "Run Completed" + Slack. Νέα: το Step Function αποφασίζει· στο empty-queue branch τρέχει `notify-run-completed` (queue guard: visible + in-flight, resolve runId από latest "Run Started", emit). Ο checker έγινε EventBridge-triggered reactive: claim (idempotent) + stats + Slack + cleanup. Επίσης `get-store` → SQS long polling (WaitTimeSeconds 20).
2. **Fix A:** `start-scrape-facebook-posts` handler έδειχνε σε non-existent path → `Runtime.ImportModuleError` σε κάθε count>100 continue-as-new. Fix: σωστό path + `states:StartExecution` IAM.
3. **Fix B:** dead `get-facebook-posts-progress` lambda (null tableName κάθε 2h, superseded) → διαγραφή.

## Verdict table

| Service / checker | Migration | Fix A | Fix B |
|---|---|---|---|
| fb-ads / detect-pages | ✅ ΝΑΙ — καθαρό 1:1, λύνει bug | — | — |
| fb-ads / scrape-ads | ⚠️ Ναι, αλλά θέλει design | — | — |
| ecommerce / scrape-eshop-products | 🟡 Optional | — | — |
| ecommerce / scrape-eshops-reports | 🟡 Optional, cross-service | — | — |
| ecommerce / availability-checker | 🟡 Optional, cross-service | — | — |
| ecommerce / detect-store-logo | 🟡 Optional | — | — |

---

## scrape-facebook-ads (εδώ αξίζει)

Και τα 2 services έχουν ακριβώς το παλιό cron-polling pattern (checker σε schedule, polls SQS + `states:ListExecutions` μέσω `getProcessState()`, self-emit χωρίς idempotent claim).

**detect-pages-service → προτεραιότητα #1**
- `serverless.yml:269-284`: schedule `rate(4 hours)`, prod enabled
- `completion-checker.ts:111` `getProcessState()` → `:116` branch σε `isComplete`; self-emit `MONTHLY_DETECT_PAGES_COMPLETED` (`:214`)
- **Καθαρό 1:1**: single queue, single pipeline· empty-queue branch υπάρχει (`log-process-completed`, `serverless.yml:811-820`, `:884-888`) έτοιμο για queue-guarded emit
- Το cron polling **έχει ήδη βγάλει bugs**: commits `2c1efda` (duplicate reports κάθε 4h) + query-order fix. Δηλαδή event-driven = πραγματικό fix, όχι polish
- get-store: `sqsService.ts:38` WaitTimeSeconds 5 (ήδη long-poll· bump σε 20 optional)

**scrape-ads-service → χρειάζεται, ΟΧΙ 1:1**
- `serverless.yml:761-803`: schedule `rate(2 hours)`, ίδιο anti-pattern· self-emit `RUN_COMPLETED` (`completion-checker.ts:186`)
- Completion εξαρτάται από **2 queues + 2 SFs**: `adsProcessStateService.ts:84-88` → `isComplete = storesQueueEmpty && postProcessingQueueEmpty && !scrapeSfRunning && !postProcessSfRunning`
- Empty-queue branch (`notify-facebook-ads-completed`, `serverless.yml:838-847`) καλύπτει μόνο το scrape· το post-processing (2η ουρά + `FacebookAdProcessingStateMachine`) μπορεί ακόμα να τρέχει → emit εκεί = **premature**
- Θέλει queue guard και στις 2 ουρές + συντονισμό pipelines. **Πρώτα design, μετά υλοποίηση.**
- get-store: `sqsService.ts:71` WaitTimeSeconds 10 (optional bump)

## scrape-the-greek-ecommerce-v2 (optional polish, όχι fix)

Και τα 4 checkers έχουν ίδιο cron-poll shape, ΑΛΛΑ:
- **Δεν είναι broken** — έχουν ήδη in-flight queue guard· η ομάδα τα patch-άρει in-place (`9fc50fb`, `784a4c4`, `88903ab` για false-completion)
- **Διαφορετική restart αρχιτεκτονική**: αντί in-SF `start-scrape` continue-as-new, κάνουν `Done` στις 100 iterations + ξεχωριστά cron **watcher lambdas** για restart (wired σωστά)
- 2 από 4 (scrape-eshops-reports, availability) έχουν το SFN σε **άλλο service** από τον checker → cross-service, πιο invasive
- `detect-store-logo` = το καλύτερο fit (έχει ήδη `log-process-completed` στο empty-queue exit, `serverless.yml:758-767`)
- Όλοι οι get-store readers: WaitTimeSeconds 0 (ένας 5) — κανείς 20

Checkers/triggers:
- scrape-eshop-products `serverless.yml:489-492` rate(4h)
- scrape-eshops-reports `serverless.yml:160-163` rate(4h) — ελέγχει 2 SFs
- availability `serverless.yml:306-309` rate(1h)
- detect-store-logo `serverless.yml:470-473` rate(1h)

## Fix A & Fix B — δεν ισχύουν αλλού

**Fix A (handler path + StartExecution IAM):** ΟΧΙ.
- fb-ads: `start-scrape-facebook-ads` handler resolve-άρει σωστά (`src/start-scrape-facebook-ads.ts`)· `states:StartExecution` μπήκε ήδη (commit `39548af`)
- ecommerce: δεν υπάρχει καν in-SF start-scrape· τα watcher lambdas έχουν valid handlers + IAM

**Fix B (dead progress lambda):** ΟΧΙ.
- Πουθενά orphaned `get-*-progress`. Τα `progress-report` lambdas live, EventBridge-triggered, σωστά wired με `UNIFIED_EVENTS_TABLE`

---

## Προτεινόμενη σειρά
1. **detect-pages-service** (fb-ads) — καθαρό port, λύνει duplicate-reports bug
2. **scrape-ads-service** (fb-ads) — πρώτα design note για dual-queue completion, μετά υλοποίηση
3. **ecommerce ×4** — μόνο για consistency, δεν επείγει (δεν είναι broken)
