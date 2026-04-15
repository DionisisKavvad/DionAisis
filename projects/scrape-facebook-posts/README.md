# scrape-facebook-posts

- **Code:** `/Users/dionisis/Projects/Business development/scrape-facebook-posts`
- **AWS Alias:** equality
- **Description:** Facebook posts scraper, part of the business development toolkit.
- **Status:** Active — bug fix deployed, heal in progress (~47% done)
- **Key date:** None

## Today (2026-04-15)

### Bug: re-scraping all posts on every run — FIX DEPLOYED ✅
Incremental-scrape was querying the wrong GSI and reading the wrong nested path, so every run re-wrote all historical posts as "Facebook Post Saved" events.

**Code changes (uncommitted on `development`):**
- `DynamoDBService.ts` — GSI4 → GSI7, fixed PK/SK prefix (`TENANT#gbinnovations#APP#scrape-posts#STORE#...`).
- `FacebookDataService.ts` — read `mostRecentPost.properties.post.creation_time` (not flat `creation_time`).
- Feature specs updated to match.

**Deployed:** `scrape-facebook-posts-prod-facebook` Lambda, `LastModified = 2026-04-15 08:12:47 UTC` (= `T_DEPLOY_MS 1776240767000`).

**Still to do:**
- [ ] Commit + push the fix on `development` (code is live but uncommitted).
- [ ] Run the service unit/feature tests locally once before committing.

### Heal: purge duplicates from the buggy run window — IN PROGRESS
Script: `services/business-services/scrape-posts-service/scripts/heal-facebook-post-duplicates.js`
Window: `T_RUN_START_MS=1775659599972` (2026-04-08 14:46 UTC) → `T_DEPLOY_MS=1776240767000` (2026-04-15 08:12 UTC).
Dry run estimate: **2534 affected stores, 67,940 duplicate events to delete.**

**Progress so far (`heal-progress.jsonl`, 1194 lines):**
- `healed`: 284 stores
- `already_healed` (idempotent short-circuit): 496
- `first_time_scrape_skipped`: 414
- **Processed: 1194 / 2534 (~47%)**
- **Deletions so far: 12,445**
- Errors: 205 (mostly `ENOTFOUND dynamodb.eu-west-1` network blips + 1 deserialization abort)

**Last batch (`run-limit-600.log`) aborted** at store `4dbdc6d2-e121-48e3-a0cb-a370fdc5aa2f` (~475/600) with `Deserialization error`. Script stopped there.

**Still to do:**
- [ ] Investigate `4dbdc6d2-e121-48e3-a0cb-a370fdc5aa2f` — why the Deserialize crashed the loop. Add try/catch so a single bad store doesn't abort the whole run.
- [ ] Resume heal for remaining ~1340 stores (script is re-runnable; already-healed stores short-circuit).
- [ ] Re-run any stores listed in `heal-errors.jsonl` after resolving the abort.
- [ ] Final verification: spot-check a handful of stores on GSI7 and confirm no `properties.post.creation_time <= prevMax` events remain in the window.
- [ ] Sanity check totals: `healed` + `already_healed` + `first_time_scrape_skipped` should converge on 2534 with `deletions ≈ 67,940`.
