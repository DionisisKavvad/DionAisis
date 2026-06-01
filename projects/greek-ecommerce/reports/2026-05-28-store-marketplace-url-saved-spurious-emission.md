# Store Marketplace Url Saved — Spurious Emission από process-eshops-information

**TL;DR:** Το event `Store Marketplace Url Saved` έχει 2 πηγές inconsistency στο data: (α) 999 spurious live emissions από `APP#process-eshops-information` κατά το enrichment (bug), (β) 6,217 mislabeled migration events σαν `APP#manual-review` αντί για `APP#scrape-eshops`. Συνολικά **52% του dataset είναι θολό** (7,216/13,931). Production reports ΔΕΝ επηρεάζονται. Fix: 14-line code removal + 2-step DDB cleanup (~7,216 write transactions).

---

# Το θεματάκι

Το event `Store Marketplace Url Saved` εκπέμπεται και από το `process-eshops-information` service κατά τη διαδικασία enrichment, όχι μόνο από το `scrape-eshops` που είναι ο πραγματικός discovery source του URL.

## Πού γίνεται

Στο `services/business-services/process-eshops-information/src/services/storeEventService.js:50-63`, η μέθοδος `saveStore()` εκπέμπει ΠΑΝΤΑ και τα δύο events (`Store Saved` + `Store Marketplace Url Saved`) χωρίς conditional, ακόμα και όταν το URL δεν έχει αλλάξει (απλά γίνεται enrichment με email/Facebook page).

```js
events.push({ eventType: STORE_SAVED, ... });
if (storeData.marketplaceUrl) {
    events.push({ eventType: STORE_MARKETPLACE_URL_SAVED, ... });
}
```

Καλείται από:
- `process-store-information/get-email-from-website.js:143`
- `process-store-information/get-email-and-logo-from-facebook.js:304`
- `process-store-information/find-facebook-page.js:363`

## Σημασιολογικά

Το `Store Marketplace Url Saved` είναι **discovery event** — έπρεπε να εκπέμπεται μόνο όταν ανακαλύπτουμε νέο `(storeId, marketplaceUrl)` pair, δηλαδή ΜΟΝΟ από το `scrape-eshops` κατά το scraping των listings. Το `process-eshops-information` δεν ανακαλύπτει URLs, απλά εμπλουτίζει υπάρχοντα stores.

## Μέγεθος του προβλήματος

- **999 spurious events** στο `APP#process-eshops-information` lifetime (από Ιούνιο 2025 ως 28 Μαΐου 2026)
- Σε σύνολο 13,931 `Store Marketplace Url Saved` events → ~7% noise
- Επίσης ~999 extra activity-log records στο `activityLogs` table (μέσω `ActivityLogRule` του `scrape-eshops/serverless.yml:830`)

## Impact στα στατιστικά

- **Production reports**: ΔΕΝ επηρεάζονται. Το `scrape-eshops-reports` δεν χρησιμοποιεί καθόλου `Store Marketplace Url Saved` — μετράει `Store Scrape At Marketplace Completed/Skipped/Aborted`, `Process Store Information Completed`, κ.λπ.
- **Idempotency check** (`store-exists-in-marketplace.js`): Safe. Query σε GSI5 by URL, όχι by app. Διπλό emission απλά επιστρέφει "exists" νωρίτερα — ίδια συμπεριφορά.
- **Unique store counts**: Safe. Όλα τα counts γίνονται με dedup σε URL.
- **`audit-sqs-received-vs-saved.js`**: Safe. Το process-eshops-information enrichment ενεργοποιείται μόνο αφού το scrape-eshops κάνει το πραγματικό save, οπότε δεν δημιουργεί false "saved".
- **Per-app event-count breakdowns**: Μόνο εδώ θολώνει. Αν κάποιος μετρά "URL saves ανά app", το `APP#process-eshops-information: 999` είναι misleading.

**Συμπέρασμα: cosmetic + slight cost, όχι emergency.** Δεν έχει χαλάσει production reports.

---

# Fix

## Επιλογή Α (recommended, καθαρό)

Αφαίρεση των γραμμών 50-63 στο `process-eshops-information/src/services/storeEventService.js`. Το URL Saved event δεν εκπέμπεται από το enrichment path. Το `Store Saved` re-emission παραμένει (είναι by design — event sourcing state snapshot).

Diff (~14 lines removal):

```diff
- // 2. Store Marketplace Url Saved event
- if (storeData.marketplaceUrl) {
-     const escapedUrl = storeData.marketplaceUrl.replaceAll('#', '%23');
-     events.push({
-         eventType: ProcessEventTypes.STORE_MARKETPLACE_URL_SAVED,
-         entityType: EntityType.MARKETPLACE_URL,
-         entityId: escapedUrl,
-         properties: {
-             storeId,
-             storeName: storeData.name,
-             marketplaceUrl: storeData.marketplaceUrl,
-         },
-     });
- }
```

## Επιλογή Β (defensive)

Conditional emission — fire μόνο αν το URL είναι νέο σε σύγκριση με `getLatestStoreState()`. Πιο πολύπλοκο, αλλά πιο safe αν αύριο κάποιο enrichment path πραγματικά αλλάξει URL.

---

# Backward compatibility

## Historical events

Δεν χρειάζεται καμία αλλαγή στα **6,217 events του `APP#manual-review`** που υπάρχουν στο `prod_equality_unified_logs`. Αυτά είναι retroactive labels από το migration script (`scrape-eshops-helpers/src/migrate-to-events.js:338-348`):

- Validated stores → `APP#manual-review`
- Unvalidated stores → `APP#scrape-eshops`

Είναι σημασιολογικά λάθος μεν, αλλά αφαίρεση/μετονομασία τους μπορεί να σπάσει historical analytics queries που βασίζονται στο app scope. Άσε τα ως έχουν — αποτυπώνουν πραγματική προέλευση του validation.

## Existing 999 spurious events

Βλ. παρακάτω section "2-Step DDB Cleanup".

## Code-level breaking changes

**Κανένα.** Το removal αφορά μόνο event emission, όχι API/schema. Καμία service που καταναλώνει events από EventBridge δεν θα σπάσει — απλά θα λαμβάνει λιγότερα `Store Marketplace Url Saved` events από `APP#process-eshops-information` source (που δεν χρησιμοποιεί κανείς).

## Consumers του event που τσέκαρα

- `store-exists-in-marketplace.js` (scrape-eshops): δεν φιλτράρει by app
- `audit-sqs-received-vs-saved.js`: filter by `APP#scrape-eshops` only
- `recover-lost-stores.js` και `classify-from-jsonl.js`: παρόμοιο pattern

Κανένας consumer δεν περιμένει το event ειδικά από `APP#process-eshops-information`. Safe to remove.

---

# 2-Step DDB Cleanup (historical data)

Για να είναι το `Store Marketplace Url Saved` consistent σε όλο το dataset (μοναδικό app scope = `APP#scrape-eshops`), χρειάζεται και cleanup των ήδη γραμμένων events.

**Σύνολο dataset σήμερα:**
- `APP#scrape-eshops`: 6,715 (correct)
- `APP#manual-review`: 6,217 (mislabeled from migration)
- `APP#process-eshops-information`: 999 (spurious live emissions)
- **Total: 13,931 — 52% inconsistent**

## Step 1 — Delete 999 spurious events από `APP#process-eshops-information`

**Why delete, not relabel:** Αυτά είναι **duplicates**. Για κάθε ένα από τα 999, υπάρχει ήδη identical `Store Marketplace Url Saved` event από `APP#scrape-eshops` για το ίδιο URL (το scrape-eshops το έγραψε πρώτο, μετά το process re-emit-aρε άσκοπα στο enrichment). Relabel θα δημιουργούσε double-counting.

**Operation:**
- Query GSI2 με `GSI2PK = APP#process-eshops-information` filtered by `eventType = Store Marketplace Url Saved`
- Για κάθε item, `DeleteItem` με PK + SK
- ~999 deletions

## Step 2 — Relabel 6,217 events από `APP#manual-review` → `APP#scrape-eshops`

**Why relabel, not delete:** Αυτά είναι **πραγματικά unique URL saves**, απλώς mislabeled από το migration script (λόγω της λογικής `validated → APP#manual-review`). Είναι η ΜΟΝΗ καταγραφή των συγκεκριμένων store-URL pairs — αν διαγραφούν, χάνουμε δεδομένα.

**Operation: `UpdateItem`** (όχι delete+put). Το PK+SK του base table δεν αλλάζει — αλλάζουν μόνο GSI attributes:
- `GSI2PK`: `APP#manual-review` → `APP#scrape-eshops`
- `GSI3PK`: `APP#manual-review` → `APP#scrape-eshops`
- `GSI6SK`: `TENANT#...#APP#manual-review#TIMESTAMP#...` → `TENANT#...#APP#scrape-eshops#TIMESTAMP#...`
- `GSI7SK`: `TENANT#...#APP#manual-review#MARKETPLACE_URL#...` → `TENANT#...#APP#scrape-eshops#MARKETPLACE_URL#...`

Το DDB αυτόματα ξανα-index-άρει τα GSIs όταν τα GSI attributes αλλάξουν. Το `context.origin = "migrate-to-events"` να παραμείνει — διατηρεί το audit trail ότι ήρθαν από migration.

## Τι ΔΕΝ αγγίζουμε

- **`Store Saved` events** (6,215 σε `APP#manual-review` + 999 σε `APP#process-eshops-information`): Το `Store Saved` είναι state-snapshot event, εκπέμπεται legitimately από κάθε service που αλλάζει store state. Σωστά εκεί. Άστο intact.
- **Validation events** (Email Validated, Website Validated, Facebook Page Validated, Store Review Completed, κ.λπ.) που ζουν σε `APP#manual-review`: Σωστά εκεί — αυτά πραγματικά εκπέμπονται από τη manual review διαδικασία.

## Risk analysis cleanup

| Risk | Mitigation |
|---|---|
| Reports σπάνε | Confirmed κανείς δεν φιλτράρει `Store Marketplace Url Saved` by app. |
| `store-exists-in-marketplace.js` σπάει | Query σε GSI5 (no app filter). Safe. |
| Audit scripts σπάνε | Δεν φιλτράρουν by app για URL Saved. Safe. |
| Σπάει το logical "validated vs unvalidated at seeding" | Η πληροφορία υπάρχει στο `Store Validated` event που μένει intact. |
| Partial completion bug στο script | Idempotent script + dry-run mode + BatchWriteItem σε batches των 25. |
| Διπλό delete (πχ retry) | Φυσικά idempotent — DeleteItem σε missing key δεν σφάζει. |

## Idempotency strategy

Και τα δύο steps είναι **inherently idempotent** by virtue of the DDB operations που χρησιμοποιούμε:

**Step 1 (Delete 999):**
- `DeleteItem` σε missing key είναι no-op (επιστρέφει success, δεν σφάζει).
- Αν τρέξει 2 φορές: 1η φορά διαγράφει, 2η φορά no-op. Safe.

**Step 2 (Relabel 6,217):**
- `UpdateItem` με absolute value: `SET GSI2PK = 'APP#scrape-eshops', GSI3PK = 'APP#scrape-eshops', GSI6SK = <new>, GSI7SK = <new>`.
- Αν τρέξει 2 φορές: 2η φορά απλά ξανα-θέτει την ίδια τιμή. Safe.
- **Σημαντικό:** το script να ΜΗΝ βασίζεται σε read-modify-write pattern (γιατί τότε μια 2η εκτέλεση θα δει `GSI2PK = APP#scrape-eshops` και δεν θα ξέρει αν έγινε ήδη το rewrite). Αντί για αυτό, να χρησιμοποιεί **ConditionExpression** ώστε να γράφει μόνο όταν το παλιό value υπάρχει:
  ```
  UpdateExpression: "SET GSI2PK = :new_app, GSI3PK = :new_app, GSI6SK = :new_sk6, GSI7SK = :new_sk7"
  ConditionExpression: "GSI2PK = :old_app"
  ```
  Με ExpressionAttributeValues: `:old_app = "APP#manual-review"`, `:new_app = "APP#scrape-eshops"`, etc.
- Αυτό κάνει το retry επίσης safe: τα ήδη-relabeled items πετάνε `ConditionalCheckFailedException` (τα οποία το script τα αγνοεί), τα μη-relabeled προχωράνε.

**Pre-cleanup backup (light):**
Πριν το cleanup, dump σε JSONL το affected subset (`Store Marketplace Url Saved` events με `APP#manual-review` ή `APP#process-eshops-information`):
```bash
aws dynamodb query --table prod_equality_unified_logs \
  --index-name GSI4 \
  --key-condition-expression "GSI4PK = :pk" \
  --filter-expression "GSI2PK = :app1 OR GSI2PK = :app2" \
  ... > backup-pre-cleanup-2026-05-28.jsonl
```
~7,216 items, μερικά MB. Αν κάτι πάει στραβά → restore από JSONL με PutItem.

## Effort

~6,217 + 999 = **7,216 DDB write operations**. Με `BatchWriteItem` (25 items/batch, μόνο για DeleteItem) και `UpdateItem` (single ops για relabel) ≈ **40 batches deletes + 6,217 single updates**. Tέλος σε λίγα λεπτά. Cost: pennies. DDB capacity: marginal spike — να γίνει εκτός peak hours αν θέλουμε ασφάλεια.

## Execution order

1. **Code fix πρώτα** (αφαίρεση των 14 γραμμών στο `process-eshops-information/src/services/storeEventService.js`)
2. **Deploy** σε prod (ώστε να σταματήσει νέο noise από spurious emissions)
3. **Verify** μέσα στο επόμενο 24h ότι δεν εμφανίζονται νέα `Store Marketplace Url Saved` events με `APP#process-eshops-information`
4. **Step 1 cleanup** (delete 999)
5. **Step 2 cleanup** (relabel 6,217)
6. **Post-verify**: query GSI4 για `EVENT#Store Marketplace Url Saved` και confirm ότι όλα τα events έχουν `GSI2PK = APP#scrape-eshops`
