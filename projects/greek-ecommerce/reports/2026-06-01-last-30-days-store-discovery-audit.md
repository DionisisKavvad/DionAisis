# Store Discovery Audit — Last 30 Days

**TL;DR:** Πριν το run των τελευταίων 30 ημερών είχαμε **9,974 unique store-marketplace URLs**. Στο διάστημα 2026-05-02 → 2026-06-01 βρέθηκαν **3,140 νέα URLs** (2,116 Skroutz + 1,024 BestPrice). Συνολικά τώρα: **13,114 unique URLs**. Tο cleanup δεν προκάλεσε καμία απώλεια — όλα τα events είναι intact.

---

# Numbers

## Snapshot timestamps
- **Today:** 2026-06-01 09:38 UTC
- **30d cutoff:** 2026-05-02 09:38 UTC (ms: `1777714704934`)

## Event counts (μετά τον cleanup)

| Category | URL Saved events | Unique URLs |
|---|---|---|
| Πριν το cutoff (πριν 30 μέρες) | 9,981 | **9,974** |
| Νέα στο 30-day window | 3,142 | 3,141 (1 re-save) |
| **Σύνολο** | **13,123** | **13,114** |

## Genuinely new URLs

**3,140 URLs που δεν υπήρχαν πριν τις 2026-05-02**:

| Marketplace | Νέα URLs |
|---|---|
| Skroutz | 2,116 |
| BestPrice | 1,024 |
| **Total** | **3,140** |

## Daily distribution (νέα events ανά ημέρα)

```
2026-05-05:    4   2026-05-19:  213
2026-05-06:   28   2026-05-20:   89
2026-05-07:   26   2026-05-21:   84
2026-05-08:   31   2026-05-22:  207
2026-05-09:   37   2026-05-23:  132
2026-05-10:   35   2026-05-24:   40
2026-05-11:  183   2026-05-25:   41
2026-05-12:  265   2026-05-26:   20
2026-05-13:  590  ← peak day (recovery)
2026-05-14:  135   2026-05-27:   25
2026-05-15:  199   2026-05-28:   37
2026-05-16:  193   2026-05-29:   42
2026-05-17:  212   2026-05-30:   33
2026-05-18:  176   2026-05-31:   48
                   2026-06-01:   17
```

Spike στις 11-13 Μαΐου (1,038 events) → coincides με την έναρξη της recovery operation. Από 14/5 και μετά, σταθερό pace ~150-200/day.

---

# Sample νέων URLs (15 random)

```
https://www.skroutz.gr/shop/2201/Km-shop
https://www.skroutz.gr/shop/25664/Cosmetice-Originale
https://www.bestprice.gr/m/14220/petvip-gr.html
https://www.skroutz.gr/shop/29085/DXN-Wellness
https://www.bestprice.gr/m/9112/giaouris.html
https://www.skroutz.gr/shop/29124/Diakosmos-Candles
https://www.skroutz.gr/shop/28181/Dentaland
https://www.skroutz.gr/shop/28641/Findsolution
https://www.skroutz.gr/shop/2870/Electroholic
https://www.skroutz.gr/shop/16586/LK15
https://www.bestprice.gr/m/16520/spott.html
https://www.bestprice.gr/m/794/technosound.html
https://www.skroutz.gr/shop/28325/FansBrands
https://www.skroutz.gr/shop/28386/Touiti
https://www.skroutz.gr/shop/26919/Stella-Rossa
```

**Πλήρης λίστα 3,140 URLs:** `~/Projects/DionAi/projects/greek-ecommerce/reports/artifacts/2026-06-01-new-urls-last-30days.txt`

---

# Cleanup integrity check ✓

Διαπιστώθηκε ότι **το cleanup δεν επηρέασε καθόλου τα data**:

- Total `Store Marketplace Url Saved` events πριν cleanup: 13,931
- Total μετά cleanup: 13,123
- Διαφορά: -808 = (-1,001 deleted spurious) + (+193 νέα από live scraping στο window)
- Άρα **καμία απώλεια legitimate data**. Μόνο τα 1,001 duplicate emissions του `process-eshops-information` διαγράφηκαν.

- All 13,123 events έχουν app scope `APP#scrape-eshops` (consistent ✓)
- 0 events σε `APP#manual-review` ή `APP#process-eshops-information` για αυτό το event type ✓
- GSI2 count (13,123) ταυτίζεται με GSI4 count (13,123) ✓ → no orphan items

---

# Side-finding: pre-existing dedup bug στο scrape-eshops

Έλεγξα την 1 URL που εμφανίζεται και πριν και μετά το cutoff (`bestprice.gr/m/8758/365home.html`). Βρήκα 3 διαφορετικά events για αυτό το URL με **3 ΔΙΑΦΟΡΕΤΙΚΑ storeIds**:

| Timestamp | storeId | Origin |
|---|---|---|
| 2025-06-09 | `f6883809-...-878485051c3e` | migrate-to-events |
| 2026-05-11 04:47 | `ee70a36d-...-05578941da83` | scrape-store-in-bestprice-curl-fixed |
| 2026-05-11 06:02 | `b84e2d67-...-a0a53725cd4e` | scrape-store-in-bestprice-curl-fixed |

**Αυτό είναι separate bug** — δεν σχετίζεται με το cleanup μας. Σημαίνει ότι το `store-exists-in-marketplace.js` δεν εντόπισε το υπάρχον URL και ο scraper δημιούργησε νέο storeId. Άξιο follow-up investigation αλλά out of scope από αυτή την audit.

---

# Verification queries used

```bash
# Total before cutoff
aws dynamodb query --table-name prod_equality_unified_logs --index-name GSI4 \
  --key-condition-expression "GSI4PK = :pk" \
  --filter-expression "#ts < :cut" \
  --expression-attribute-names '{"#ts":"timestamp"}' \
  --expression-attribute-values '{":pk":{"S":"EVENT#Store Marketplace Url Saved"},":cut":{"N":"1777714704934"}}' \
  --select COUNT

# Genuinely new = (new URLs) − (old URLs)
comm -23 urls-new30.txt urls-pre.txt
```

---

# Conclusion

**Το cleanup ήταν επιτυχές και τα δεδομένα είναι ασφαλή.**

Στις τελευταίες 30 μέρες (κυρίως μέσω της recovery operation):
- Είχαμε **9,974 stores** πριν
- Προστέθηκαν **3,140 νέα** (2,116 Skroutz + 1,024 BestPrice)
- **+31.5% αύξηση** σε store coverage στο event log

Όλα τα νέα URLs μοιάζουν legitimate (σωστά skroutz.gr/shop/X και bestprice.gr/m/X formats, διάφορα domains). Δεν υπάρχει ένδειξη data corruption ή loss από το cleanup.
