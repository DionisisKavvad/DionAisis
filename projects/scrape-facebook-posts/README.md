# scrape-facebook-posts

- **Type:** work
- **Code:** `/Users/dionisis/Projects/Business development/scrape-facebook-posts`
- **AWS Alias:** equality
- **Description:** Facebook posts scraper, part of the business development toolkit.
- **Status:** Stable. Bug fixed, heal complete.
- **Key date:** None

## Resolved: duplicate posts bug (2026-04-15)

**Bug:** incremental scrape queried the wrong GSI and read the wrong nested path, so every run re-wrote all historical posts as "Facebook Post Saved" events.

**Fix (commit `9aad2b4`):**
- `DynamoDBService.ts`: GSI4 -> GSI7, fixed PK/SK prefix
- `FacebookDataService.ts`: read `properties.post.creation_time` instead of flat `creation_time`
- Feature specs updated to match
- Lambda memory dropped to 2048

**Heal completed:**
- 2,534 / 2,534 affected stores processed (100%)
- 67,939 duplicate events deleted (matched dry-run estimate of 67,940)
- 1,056 transient errors (network blips, all retried via idempotent re-runs)
- Script: `services/business-services/scrape-posts-service/scripts/heal-facebook-post-duplicates.js`

## Notes
- Branch: `development`
- All heal artifacts committed in `heal-output/`
- Scraper Lambda deployed 2026-04-15 08:12 UTC
