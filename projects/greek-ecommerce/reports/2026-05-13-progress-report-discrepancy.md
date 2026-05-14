# Progress Report: Missing Skroutz Scrape Events & Report Fixes

**Date:** 2026-05-13
**Trigger:** Slack progress report numbers didn't add up between consecutive windows.

## What We Found

### 1. Skroutz scraper never emitted "Completed" events (critical bug)

The Skroutz scraper (`scrape-store-in-skroutz.js`) emitted `Store Scrape At Marketplace Ended` after a successful scrape. The BestPrice scraper emitted `Store Scrape At Marketplace Completed`. The report query only counted `Completed` events.

Result: **597 Skroutz scrapes were invisible** in the "processed" counter. The report only showed BestPrice stores (331 out of 928 total).

Both event types were semantically identical, used at the same code points (success path + shopUnavailable path), with the same properties. Just different names.

### 2. Window vs cumulative timing gap (minor, not fixed)

A ~1-2 second gap exists between when the report Lambda finishes querying and when the "Progress Reported" event is written. Events landing in this gap get counted in cumulative but not in either window. Confirmed with actual DynamoDB data: a Skroutz scrape event (Gruppo-Mossialos) at `10:08:28.197 UTC` fell 1.176 seconds before the Progress Reported event at `10:08:29.373 UTC`.

Not worth fixing. The gap is tiny and only affects window display, not cumulative accuracy.

### 3. Process-stage metrics invisible in Slack (minor, fixed)

The window section only showed scrape-stage metrics. Process-stage outcomes (aborted, FB bans, Google bans, review pending) were tracked in DynamoDB but never displayed. This made it confusing when `completed` jumped without visible activity.

## What Changed

### scrape-store-in-skroutz.js
- Changed `STORE_SCRAPE_ENDED` to `STORE_SCRAPE_COMPLETED` in both emit points (success + shopUnavailable paths)

### slackReportService.js
- Added Skroutz/BestPrice breakdown to scrape bans: `Bans: +3 (Skroutz: 2, BP: 1)`
- Only shows breakdown when counts are > 0

### reportQueryService.js
- No changes (query was correct, the scraper was wrong)

### DynamoDB migration
- Script: `scripts/migrate-ended-to-completed.js`
- Migrated 597 "Store Scrape At Marketplace Ended" events to "Store Scrape At Marketplace Completed"
- Updated all GSI keys (GSI4, GSI5, GSI6, GSI7) and the eventType field
- Post-migration: 0 ENDED events, 724 COMPLETED events total
- Idempotent (ConditionExpression prevents double-migration)

### Deployments
- `scrape-eshops` deployed to prod
- `scrape-eshops-reports` deployed to prod (3 times total during investigation)

## Files Modified
- `services/business-services/scrape-eshops/src/scrape-all-stores/scrape-store-in-skroutz.js`
- `services/business-services/scrape-eshops-reports/src/services/slackReportService.js`
- `scripts/migrate-ended-to-completed.js` (new)
