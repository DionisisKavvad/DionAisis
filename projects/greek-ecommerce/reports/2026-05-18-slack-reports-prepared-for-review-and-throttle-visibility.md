# Slack Reports: Prepared for review + Throttle Visibility

**Date:** 2026-05-18
**Project:** greek-ecommerce
**Code:** `scrape-the-greek-ecommerce-v2` (branch `development`, commit `7f4d1a9`)
**Deployed:** stage `prod`, region `eu-west-1`, alias `equality`

## Context

Στο Slack reporting του greek-ecommerce υπήρχαν δύο τυφλά σημεία:

1. **Δεν φαινόταν τίποτα για το process pipeline** πέρα από ένα "completed" νούμερο που δεν εξηγούσε ξεκάθαρα τι σήμαινε. Όταν το report έλεγε `Processed: 2`, ο αναγνώστης νόμιζε ότι αυτό αφορούσε και το `process-eshops-information`, ενώ αφορούσε μόνο το scrape SF.
2. **Όταν το pipeline πάγωνε** (π.χ. ένα 10λεπτο progress window με `+0 / +0 / +0 / +0`) δεν υπήρχε καμία ένδειξη του γιατί. Είδαμε π.χ. στο window 18:28-18:38 UTC στις 2026-05-17 ότι όλα ήταν 0 — όχι λόγω bans, αλλά γιατί το `prod-scrape-greek-stores` είχε χτυπήσει το throttle gate `should-wait` (>10 concurrent executions στο `prod-process-store-information` → 900s freeze).

## Investigation summary

- Επιβεβαιώθηκε ότι ο μηχανισμός `should-wait` στο state machine `prod-scrape-greek-stores` παγώνει τις iterations για 900s όταν το `prod-process-store-information` έχει >10 RUNNING.
- Στα events 18:18 → 18:28, ολοκληρώθηκαν 2 scrapes που δημιούργησαν 2 νέα process executions (από 9 σε 11), σπρώχνοντας το pipeline πάνω από το threshold. Το επόμενο window παρέμεινε άδειο.
- Cumulative numbers του current run (started 2026-02-19):
  - 1.901 unique stores ξεκίνησαν process
  - 1.889 unique stores έφτασαν σε final outcome (Completed ή Aborted)
  - 1.371 Completed (email βρέθηκε), 518 Aborted (no email)
  - 12 stuck (started αλλά κανένα final outcome event)
  - Step Function execution status: 1.916 SUCCEEDED, 23 ABORTED, 2 FAILED, 10 RUNNING (delta από τα 1.889 unique stores οφείλεται σε retries / multi-emission)
- Το αρχικό μου implementation έδειχνε `Prepared for review: 3,006 / 1,930` γιατί άθροιζε raw event counts (`completed + aborted`). Διπλομετρούσε γιατί ένα execution μπορεί να εκπέμπει πολλαπλά outcome events (π.χ. `parse-ban-error` εκπέμπει `Process Aborted` σε κάθε ban πριν φτάσει στο τελικό `notify-for-process-end`).

## Changes shipped

### `reportQueryService.js`
- Νέα μέθοδος `countUniqueEntitiesSince(eventTypes, since, app)` που κάνει query στο GSI6 με `ProjectionExpression: 'GSI1PK'` και deduplicate σε `Set`. Το `GSI1PK` έχει την τιμή `STORE#<storeId>`, οπότε το size του Set = unique stores με at least one event.
- Το `getStatsSinceTimestamp` τώρα γυρνάει `process.preparedForReview` ως unique store count από τα events `Process Store Information Completed` και `Process Store Information Aborted`.
- Τα παλιά `process.completed` και `process.aborted` παραμένουν ως raw event counts για backward compat.

### `processStateService.js`
- Νέα μέθοδος `getRunningExecutionsCount(stateMachineArn)` που κάνει paginated `ListExecutions` με `statusFilter: 'RUNNING'` και επιστρέφει actual count (capped at 500 για bounded latency).

### `progress-report.js`
- Καλεί `processStateService.getRunningExecutionsCount(PROCESS_SF_ARN)` και περνάει το νούμερο στο `slackReportService.sendProgressReport` ως `processRunningCount`.

### `slackReportService.js`
- **Progress report:**
  - Rename `Processed` → `Scraped`
  - Νέο block "This window — Process:" με δύο πεδία:
    - `Prepared for review: +N` (window delta)
    - `Running: N` (live count process SF)
  - Throttle warning `:warning: throttle` όταν `Running > 10`
  - Cumulative footer αναλυτικότερο: `scraped, skipped, bans, errors, prepared, remaining`
- **Daily snapshot:**
  - Rename `Processed` → `Scraped`
  - Νέο 5ο field στο Scraping section: `Prepared for review: 1,889 / 1,930`
  - `Remaining` παραμένει χαμηλά
- **Final completion message:**
  - Ίδιες αλλαγές (Scraped + Prepared for review)

## Throttle interpretation

Στο νέο progress report η τιμή `Running` δείχνει το πραγματικό state:

- `Running: 4` → ροή κανονική
- `Running: 11 :warning: throttle` → το `prod-scrape-greek-stores` είναι σε `wait-for-some-time` (900s freeze). Καμία scrape iteration δεν τρέχει.
- `Running: 0` → idle. Είτε queue άδεια είτε το `watch-for-stores-scrape` (cron κάθε 5 min) δεν έτρεξε ακόμα.

## Deployment

```
✔ Service deployed to stack scrape-eshops-reports-prod (44s)
```

Δύο deploys σε prod:
1. Initial με raw event sum (έδωσε 3,006 / 1,930 — wrong)
2. Fix με unique store dedup (αναμενόμενο ~1,889 / 1,930)

Το επόμενο scheduled progress report (interval 10 min στο prod) θα είναι το πρώτο που χρησιμοποιεί τη νέα μορφή.

## Followup ideas (όχι shipped)

- **Bump throttle threshold ή graceful backoff.** Το όριο 10 είναι hardcoded στο state machine `should-wait`. Με 1:1 ratio scrape→process executions, αρκούν 2 successful scrapes για να σπάσει. Εναλλακτικά: 60s wait στο 11-15, 300s στο 16-20, 900s στο 20+.
- **Stuck stores tracking.** 12 stores έχουν `Process Store Information Started` event αλλά κανένα final outcome. Αξίζει να βγουν σε ξεχωριστή γραμμή ή σε νέο alert.
- **Process avg duration.** Αν φαίνεται κοντά στο SF max, εξηγεί γιατί πιάνεται το throttle.
- **Connection error rate.** 3.702 errors / 1.920 scraped = 1.93 errors per scrape. Πιθανώς από proxy churn. Καλό να σημανθεί.
