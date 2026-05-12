# DynamoDB GSI Usage Across Projects

**Date:** 2026-05-08

## Summary

Full scan of all projects under `~/Projects/` for DynamoDB GSI usage: both table definitions (IaC) and actual code queries/writes.

---

## Per-Project GSI Query & Write Map

### 1. job-manager

**Table:** `events-{stage}` (7 GSIs defined in IaC)

| GSI | Queries |
|-----|---------|
| GSI1 | dispatcher/dag-queries, producer-api/job-queries, producer-api/get-job, health-check/task-queries |
| GSI4 | producer-api/list-jobs, health-check/task-queries |
| GSI5 | dispatcher/dag-queries, producer-api/job-queries, producer-api/get-job |

**Services querying:**
- **dispatcher** (dag-queries.js): GSI1, GSI5
- **producer-api** (job-queries.js, get-job.js, list-jobs.js): GSI1, GSI4, GSI5
- **health-check** (task-queries.js): GSI1, GSI4

---

### 2. Platform

**Table:** `unifiedEvents` (7 GSIs defined in IaC)

| GSI | Queries |
|-----|---------|
| GSI1 | video-brief-service-v2/dynamo.service |
| GSI3 | video-brief-service-v2/dynamo.service |

**Services querying:**
- **video-brief-service-v2** (dynamo.service.ts): GSI1, GSI3

---

### 3. Equality

**Table:** `activityLogs` (7 GSIs)

| GSI | Queries |
|-----|---------|
| GSI1 | async-messaging-service/message-utils (x2) |
| GSI2 | async-messaging-service/message-utils |
| GSI3 | async-messaging-service/message-utils |
| GSI4 | - |
| GSI5 | reminders-v2-service/reminder-utils |
| GSI6 | helpers-service/detect-course-progress, async-messaging-service/message-utils (x2), course-enrollment-service/utils (x3), users-service/user-utils |
| GSI7 | - |

---

### 4. aws-customer-io

**Table:** `eventLogs` / `prod_equality_unified_logs` (7 GSIs deployed, IaC commented out. GSI8 in the commented IaC was never deployed.)

| GSI | Queries |
|-----|---------|
| GSI1 | journey-service/dynamodbService, journey-service/logsApi, journey-service/check-journey-logs, journey-service/export-journey-logs, journey-service/migrations, akked/upload-and-process-csv |
| GSI2 | migration-service/migrate-app-items, migration-service/copy-events-to-unified, migration-service/pre-flight-check, migration-service/post-migration-verify (x4) |
| GSI3 | journey-service/export-journey-logs, migration-service/post-migration-verify |
| GSI4 | statistics/dynamodbService (x2) |
| GSI5 | shared-utils (createJourneyIfNotExists), journey-service/dynamodbService (x3), akked/fix-schedule-after-third-class (x3), akked/find-user-schedules, akked/process-csv-upload, migration-service/pre-copy-journey-configured (x2) |
| GSI6 | akked/certificate-entity-retriever, akked/fix-schedule-after-third-class, akked/find-user-schedules, akked/check-csv-registration (x3), akked/check-certificate-batch-status (x2), akked/fix-schedule-second-class, akked/get-user-statistics (x6), akked/deadline-reminder-entity-retriever, akked/process-csv-upload |
| GSI7 | akked/seed-test-certificate-events, akked/preview-csv, akked/fix-schedule-second-class, akked/process-csv-upload, statistics/dynamodbService, migration-service/post-migration-verify |
| ~~GSI8~~ | Never deployed. Exists only in commented-out IaC by mistake. |

**Sub-projects querying:**
- **akked**: GSI1, GSI5, GSI6, GSI7 (heaviest user, especially GSI6)
- **cosmote**: GSI3, GSI5, GSI6
- **business-development**: GSI5
- **journey-service**: GSI1, GSI3, GSI5
- **migration-service**: GSI1, GSI2, GSI3, GSI5, GSI7
- **statistics**: GSI4, GSI7
- **executive**: no queries
- **ai-executive**: no queries
- **gb-platform**: no queries
---

### 5. Business Development (scrape-the-greek-ecommerce-v2)

**Table:** own unified events table (7 GSIs)

| GSI | Queries |
|-----|---------|
| GSI1 | manual-review/stores-report, manual-review/get-stores, detect-store-logo/detect-cold-proxies, scrape-eshops-helpers/diagnose-validation-inconsistencies, scrape-eshops-helpers/export-stores, scrape-eshops-helpers/migrate-to-events, scrape-eshops-helpers/validate-state-before-migration, scrape-eshops-helpers/final-migration, manual-review/get-all-store-information |
| GSI2 | scrape-eshops-helpers/diagnose-validation-inconsistencies, scrape-eshops-helpers/export-stores, scrape-eshops-helpers/migrate-to-events, scrape-eshops-helpers/validate-state-before-migration, scrape-eshops-helpers/final-migration |
| GSI4 | scrape-eshop-products/begin-top-categories-scrape, scrape-eshop-products/resume-monthly-run, scrape-eshops/check-stores-availability, detect-store-logo/begin-detect-logos, detect-store-logo/storeValidatedService, manual-review/reviewEventQueryService, scrape-eshops-helpers/verify-migration, scrape-eshops-helpers/migrate-to-events, scrape-eshops-helpers/export-filtered-stores, scrape-eshops-helpers/final-migration |
| GSI5 | process-eshops-information/storeEventService, scrape-eshops/store-exists-in-marketplace (x2), detect-store-logo/begin-detect-logos, detect-store-logo/save-store-event, detect-store-logo/storeValidatedService, manual-review/storeEventService |
| GSI6 | scrape-eshop-products/begin-top-categories-scrape, scrape-eshop-products/reportQueryService (x8), scrape-eshop-products/resume-monthly-run (x4), scrape-eshops-reports/reportQueryService (x7), scrape-eshops-reports/availabilityQueryService (x5), detect-store-logo/detectLogosReportQueryService (x6) |
| GSI7 | process-eshops-information/detect-cold-proxies, scrape-eshop-products/detect-cold-proxies, scrape-eshops/detect-cold-proxies |

**GSIs queried:** GSI1, GSI2, GSI4, GSI5, GSI6, GSI7 (6 of 7). GSI3 not queried.

---

### 6. Business Development (scrape-facebook-ads)

**Table:** own unified events table (6 GSIs)

| GSI | Queries |
|-----|---------|
| GSI1 | scrape-ads-service/dynamoDbService (x3), ci-cd/slack-notifier/activityLogsService, detect-pages-service/detect-cold-proxies |
| GSI2 | (table creation script only) |
| GSI3 | ci-cd/slack-notifier/activityLogsService, helpers/fix-kitchenlab, helpers/invalidate-fb-closed |
| GSI4 | detect-pages-service/storeValidatedService (x2), helpers/requeue-stuck-stores (x2), scrape-ads-service/pageIdSavedService |
| GSI5 | helpers/fix-kitchenlab, helpers/lookup-websites, helpers/invalidate-fb-closed, helpers/fix-facebook-pages, detect-pages-service/save-store-event |
| GSI6 | detect-pages-service/reportQueryService (x6), scrape-ads-service/adsReportQueryService (x6), scrape-ads-service/hourlyPostProcessReport, helpers/retry-failed-stores, helpers/investigate-run (x2), helpers/evaluate-detection, helpers/analyze-bans |

**GSIs queried:** GSI1, GSI3, GSI4, GSI5, GSI6 (5 of 6). GSI2 only in table creation script.

---

### 7. Business Development (scrape-facebook-posts)

**Table:** own unified events table (7 GSIs)

| GSI | Queries |
|-----|---------|
| GSI1 | ci-cd/slack-notifier/activityLogsService, scrape-posts-service/DynamoDBService (x2) |
| GSI3 | ci-cd/slack-notifier/activityLogsService |
| GSI4 | scrape-posts-service/backfill-store-page-ids (x2), scrape-posts-service/StoreQueryService (x3), scrape-posts-service/get-posts-by-store, scrape-posts-service/analyze-page-id-coverage (x4), scrape-posts-service/get-posts-per-hour-weekly (x2), scripts/requeue-unprocessed-stores |
| GSI5 | scrape-posts-service/hourly-scraping-report |
| GSI6 | facebook-posts-reports/reportQueryService (x6), scrape-posts-service/heal-facebook-post-duplicates, scrape-posts-service/verify-post-duplicates |
| GSI7 | scrape-posts-service/DynamoDBService, scrape-posts-service/heal-facebook-post-duplicates, scrape-posts-service/verify-post-duplicates (x2) |

**GSIs queried:** GSI1, GSI3, GSI4, GSI5, GSI6, GSI7 (6 of 7). GSI2 only in table creation script.

---

## Summary Table

| Project | Table | GSIs Defined | GSIs Queried |
|---------|-------|-------------|-------------|
| job-manager | events | 7 | GSI1, GSI4, GSI5 |
| Platform | unifiedEvents | 7 | GSI1, GSI3 |
| Equality | activityLogs | 7 | GSI1, GSI2, GSI3, GSI5, GSI6 |
| aws-customer-io | eventLogs | 7 | GSI1-GSI7 |
| BD / scrape-ecommerce-v2 | unified events | 7 | GSI1, GSI2, GSI4, GSI5, GSI6, GSI7 |
| BD / scrape-facebook-ads | unified events | 6 | GSI1, GSI3, GSI4, GSI5, GSI6 |
| BD / scrape-facebook-posts | unified events | 7 | GSI1, GSI3, GSI4, GSI5, GSI6, GSI7 |
