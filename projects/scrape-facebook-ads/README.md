# scrape-facebook-ads

- **Code:** `/Users/dionisis/Projects/Business development/scrape-facebook-ads`
- **AWS Alias:** equality
- **Description:** Facebook ads scraper, part of the business development toolkit.
- **Status:** Tracked
- **Key date:** None

## Goal για αύριο πρωί (2026-04-16)

Ψάξε τι γίνεται με τα **countries** και το **random limit** στο `facebook-ads-v2.ts`. Ο Dionisis νιώθει ότι δεν τραβάμε σωστό αριθμό ads.

Reference: `docs/reports/2026-04-15-scrape-ads-rate-limit-deep-dive.md` (sections 7.1 και 7.4).

Σημεία εκκίνησης:
- `services/business-services/scrape-ads-service/src/step-functions/scrape-facebook-ads/facebook-ads-v2.ts:319-335` — `ad_reached_countries` έχει ~230 χώρες (commit `5214ef5`)
- `facebook-ads-v2.ts:19` — `FACEBOOK_API_LIMIT_PER_PAGE` random 1..10, pagination off
- Υποψία: το random 1..10 + no pagination σημαίνει ότι ανά store τραβάμε 1–10 ads μόνο, άρα χάνουμε ads. Επιβεβαίωσε με logs/DB counts πριν αλλάξει τίποτα.
