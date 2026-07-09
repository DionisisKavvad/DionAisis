# Per-Ad REST Metadata + Slim Retrieved Events — Investigation & Plan

**TL;DR:** Τα REST fields (targeting/reach/platforms/timing/languages) που τραβάμε από το Graph `ads_archive` σήμερα ΔΕΝ σώζονται per-ad στο `Facebook Ad Saved` — ζουν μόνο στα batch `Active/Inactive Ads Retrieved` events. Έγινε πλήρες implementation plan (7 tasks) για να μπαίνουν per-ad, τα retrieved events να γίνουν id-only, + migration με dry-run για όλο το ιστορικό. **Status: plan-only, καμία υλοποίηση.**

## Τι βρέθηκε (current state)

Δύο ξεχωριστά persistence paths:
- **Path A — `Active/Inactive Ads Retrieved`** (batch ανά scrape): κρατάει ΟΛΑ τα REST fields μέσω `toAdMetrics` spread. Inline στο DynamoDB, ή S3 αν >200KB.
- **Path B — `Facebook Ad Saved`** (per-ad): χτίζεται **μόνο** από το GraphQL response. Όλα τα REST fields πετιούνται στο SQS boundary (`toSqsAdMessage` περνάει μόνο 5 ids). Comment στον κώδικα το επιβεβαιώνει ως σκόπιμο.

**Αποτέλεσμα:** ό,τι targeting/reach χάνεται στο per-ad record. Ζει μόνο στο batch snapshot, χωρίς join πίσω μέσω `adArchiveId`.

### Κρίσιμα τεχνικά facts
- Table: `prod_equality_unified_logs` (env `UNIFIED_EVENTS_TABLE`, SSM `/prod/core/unifiedEvents-table`). Query ανά event type = GSI4 (`GSI4PK = EVENT#<type>`).
- Events = **append-only** log, keyed `PK=TENANT#gbinnovations` / `SK=TIMESTAMP#{ms}#EVENT#{uuid}`. Το `adArchiveId` ζει μόνο στο `properties`, ποτέ σε key.
- Μόνος writer στο DynamoDB = `activityLogProcessor` lambda (Put μόνο). Καμία update path σήμερα.
- Fields που ζητάμε: 17/28 του επίσημου node. Τα missing (spend/impressions/demographics κλπ) γυρίζουν κενά για commercial ads ούτως ή άλλως.

## Το plan (7 tasks)

Full doc: `docs/superpowers/plans/2026-07-06-per-ad-metadata-and-slim-retrieved.md` (στο repo).

**Forward path:**
1. Canonical `AdMetadata` type + `pickAdMetadata` util (11 REST-only fields)
2. Fat SQS message — `buildSqsAdMessage` βάζει `metadata` block
3. `ProcessedAd.metadata` — attach στο post-process → πέφτει στο `AD_SAVED` αυτόματα
4. State machine — pass `metadata.$` στο `ProcessAdWithGraphQlRequest`
5. Slim retrieved events — `storeSnapshot` κρατάει μόνο `adIds`, φεύγει το S3 branch

**Migration (Task 6):** `helpers/src/backfill-ad-metadata.ts`, dry-run by default
- Map `adArchiveId → metadata` από ιστορικά fat retrieved events (latest wins)
- Enrich όλα τα `AD_SAVED` (direct `UpdateCommand`)
- Slim όλα τα retrieved σε id-only + delete S3 blobs (enrich ΠΡΙΝ slim)
- Flags: `--apply`, `--limit N`, `--out`

**Rollout (Task 7):** deploy → dry-run subset → full dry-run → apply → verify (idempotent).

## Αποφάσεις που κλείδωσαν
- Transport: **fat SQS message** (όχι re-join από snapshot)
- Shape: REST fields κάτω από `processedAd.metadata` (namespaced)
- Migration: εμπλουτισμός όλων των `AD_SAVED` + όλα τα retrieved → id-only
- History: **slim & clean** (rewrite ιστορικά retrieved + delete S3 blobs)

## Risks flagged
- **In-flight SQS messages** στο deploy: παλιά messages χωρίς `metadata` → SFN `.$` path error. Άδειασμα queue πριν deploy.
- **Enrich-before-slim**: το slim καταστρέφει το source, σειρά μέσα σε ένα `--apply` run.
- `--limit` = partial AD_SAVED scan (logged).
- Ad σε πολλά retrieved events → latest timestamp wins για metadata.

## Side-finding (security) ⚠️
Leaked live FB system-user token committed στο repo:
- `services/business-services/scrape-ads-service/facebook-rate-limit.js:2` (hardcoded `EAAVXUK7f...`)
- `.../docs/example-ad.html:88` (ίδιο token)
Επιβεβαιώθηκε ότι είναι το **ίδιο** token με το production SSM `/facebook/system_user_token`. **Θέλει rotate.** Δεν έγινε ακόμα.

## Next
- Plan κρατημένο, όχι execution. Όταν δοθεί go: subagent-driven ή inline.
- Ανοιχτό: rotate leaked token.
