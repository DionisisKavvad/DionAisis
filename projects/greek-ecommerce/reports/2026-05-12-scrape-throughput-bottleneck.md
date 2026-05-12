# Scrape Throughput Bottleneck Report

**Date:** 2026-05-12
**Project:** greek-ecommerce (scrape-the-greek-ecommerce-v2)
**Trigger:** Investigation into why ~310 stores took 12 hours to process

---

## TL;DR

Ο scraper (`prod-scrape-greek-stores`) σταματάει 65% του χρόνου του περιμένοντας τα `process-store-information` executions να πέσουν κάτω από 21. Τις τελευταίες 12 ώρες, 7.8h από τις 12h ήταν idle wait. Τα scrapes τρέχουν κανονικά (0 bans, 98%+ success rate), αλλά δεν προλαβαίνουν να εκτελεστούν γιατί η downstream pipeline κολλάει.

---

## 1. Store scraping stats (τελευταίες 12h)

Source: DynamoDB `prod_activity_logs`, query via GSI2 (APP#scrape-eshops).

### Per execution breakdown

**Execution 1** (22:26 - 02:21, 3h55min) SUCCEEDED

| Metric | bestprice | skroutz |
|---|---|---|
| SQS Received | 37 | 41 |
| Skipped (already exists) | 15 | 25 |
| Scrape Started | 22 | 16 |
| Scrape Completed | 22 | 17 |
| Store Saved | 22 | 17 |
| Selector Fail | 9 | 0 |

**Execution 2** (02:21 - 06:06, 3h45min) SUCCEEDED

| Metric | bestprice | skroutz |
|---|---|---|
| SQS Received | 34 | 67 |
| Skipped (already exists) | 21 | 51 |
| Scrape Started | 13 | 17 |
| Scrape Completed | 13 | 16 |
| Store Saved | 13 | 16 |
| Connection Error | 0 | 1 |

**Execution 3** (06:06 - 09:55, 3h49min) SUCCEEDED

| Metric | bestprice | skroutz |
|---|---|---|
| SQS Received | 28 | 73 |
| Skipped (already exists) | 15 | 42 |
| Scrape Started | 13 | 32 |
| Scrape Completed | 13 | 31 |
| Store Saved | 13 | 31 |
| Connection Error | 0 | 1 |
| Selector Fail | 6 | 0 |

**Execution 4** (09:56 - running) RUNNING

| Metric | bestprice | skroutz |
|---|---|---|
| SQS Received | 14 | 16 |
| Skipped (already exists) | 11 | 10 |
| Scrape Started | 3 | 6 |
| Scrape Completed | 3 | 6 |
| Store Saved | 3 | 6 |

### Totals (12h)

| Metric | bestprice | skroutz | Total |
|---|---|---|---|
| SQS Received | 113 | 197 | 310 |
| Skipped (already exists) | 62 (55%) | 128 (65%) | 190 (61%) |
| Scrape Started | 51 | 71 | 122 |
| Scrape Completed | 51 | 70 | 121 |
| Store Saved | 51 | 70 | 121 |
| Banned | 0 | 0 | 0 |
| Connection Error | 0 | 2 | 2 |
| Selector Fail | 15 | 0 | 15 |

**Success rate:** 121/122 = 99.2%

---

## 2. Bottleneck analysis

### How the Step Function works

`prod-scrape-greek-stores` τρέχει σε loop (max 100 iterations per execution). Κάθε iteration:

1. `get-store-info-sqs`: τραβάει 1 store από SQS
2. `store-exists-in-marketplace`: τσεκάρει αν υπάρχει ήδη
3. Αν υπάρχει (skip) → delete SQS message, loop back (no wait)
4. Αν δεν υπάρχει → proxy selection → scrape → 40s `wait-state` → delete SQS → loop back

Πριν κάθε iteration, τσεκάρει (`get-running-executions`) πόσα `process-store-information` Step Function executions τρέχουν. Αν > 20, μπαίνει σε `wait-for-some-time` (15min wait) και ξανατσεκάρει.

### Wait time breakdown (Execution 3, 3h49min)

| Wait type | Τι σημαίνει | Count | Total | % execution |
|---|---|---|---|---|
| `wait-for-some-time` | process-store-info > 20 running | 8 | 120 min | 52% |
| `wait-for-proxies` | NoProxyError, random 60-300s retry | 16 | 49 min | 21% |
| `wait-state` | 40s cooldown μετά κάθε scrape | 44 | 29 min | 13% |
| Actual work | Lambda calls + scraping | - | 31 min | 14% |

**86.6% wait, 13.4% actual work.**

### All wait-for-some-time periods (12h)

Source: CloudWatch logs, `scrape-eshops-prod-get-running-executions` Lambda.

| Period (UTC) | Duration | 15min waits |
|---|---|---|
| 23:06 → 23:21 | 15min | 1 |
| 00:06 → 01:51 | 1h45min | 7 |
| 02:31 → 05:32 | 3h | 12 |
| 06:58 → 07:13 | 15min | 1 |
| 07:49 → 09:34 | 1h45min | 7 |
| 10:19 → 11:04 | 45min | 3 |
| **Total** | **7h45min** | **31** |

**7.8 ώρες idle wait σε 12h window = 65% idle.**

### Running executions distribution

```
 0-10: ████████████████████████ (common, scraper runs freely)
11-15: ██████████████████ (building up)
16-19: ████████████████████████████████ (close to threshold)
20:    ██████████████████████████ (26 observations, at the edge)
21:    ████████████████████████████████ (32 observations, BLOCKED)
```

Ο scraper ξεκινάει να γεμίζει τα `process-store-information` executions, φτάνει 21, σταματάει. Η `process-store-information` αδειάζει αργά (μερικές φορές 3h για να πέσει κάτω από 21).

---

## 3. Root cause: proxy deadlock

Βρέθηκε η ακριβής αιτία. **Δεν είναι αργό processing, είναι infinite proxy loop.**

### Τι γίνεται μέσα στο `process-store-information`

Κάθε execution ακολουθεί αυτό το flow:
1. `notify-for-process-start`
2. `get-active-proxies` → επιστρέφει τα διαθέσιμα proxies
3. `detect-cold-proxies` → τσεκάρει ποια proxies δεν είναι banned στο Facebook
4. Αν 0 cold proxies → `NoProxyError` → `generate-random-wait` (60-300s) → πίσω στο 2
5. Αν βρει proxy → `find-facebook-page` → υπόλοιπο enrichment

**Και τα 21 running executions κολλάνε στο βήμα 3-4**, σε ατέρμονο loop χωρίς exit condition.

### Γιατί 0 cold proxies

`get-active-proxies` γυρνάει **μόνο 1 proxy**: `100.94.21.68` (GB's Mac mini, Tailscale). Αυτό το μοναδικό proxy είναι banned στο Facebook, με exponential backoff cooldown.

Παλιά cooldown values: `[10, 30, 60, 140, 200]` λεπτά (max 3h20min). Με 1 proxy banned στο max tier, χρειάζεται 200 λεπτά (3h20) για να "ξεπαγώσει".

### Παράδειγμα: `Coffeetales-1567`

- Running: 4+ ώρες (ξεκίνησε 10:18)
- `NoProxyError` failures: 75 φορές
- Δεν έφτασε ποτέ στο `find-facebook-page`
- Κάθε retry: `get-active-proxies` (1 proxy) → `detect-cold-proxies` (banned, still cooling) → wait 60-300s → retry

### Double bottleneck (chicken-and-egg)

1. 21 executions "τρέχουν" χωρίς να κάνουν τίποτα (μετράνε ως RUNNING)
2. Ο scraper βλέπει 21 running → σταματάει να στέλνει νέα stores (15min wait loops)
3. Κανένα execution δεν χρησιμοποιεί τα proxies (γιατί περιμένει cooldown), αλλά μετράνε ως busy
4. Δεν υπάρχει max retry limit στο proxy loop, οπότε τα executions δεν τελειώνουν ποτέ μόνα τους

---

## 4. Fixes

### 4a. Cooldown times

Αλλάχτηκαν σε 6 αρχεία (3 services x 2 αρχεία: `detect-cold-proxies.js` + `parse-ban-error.js`):

| | Πριν | Μετά |
|---|---|---|
| Cooldown steps | 10, 30, 60, 140, 200 min | 10, 20, 30, 40, 60 min |
| Max cooldown | 200 min (3h20) | 60 min (1h) |

Services: `process-eshops-information`, `scrape-eshops`, `scrape-eshop-products`.

Deployed. Αποτέλεσμα: τα 21 κολλημένα executions ξεκόλλησαν σε ~15 λεπτά, νέα executions τρέχουν σε 2-6 min αντί 2-4 ώρες.

### 4b. Max running executions threshold

Scraper threshold αλλαγμένο: `> 20` → `> 10` (`should-wait` Choice state στο Step Function). Deployed.

---

## 5. Αλλαγές στο Slack report

### 5a. Skipped count bug

Το progress report έδειχνε `storesSkipped: 0` ενώ υπήρχαν 879 skipped. Αιτία: η `reportQueryService.js` έψαχνε `Store Skipped At Marketplace` ενώ ο scraper γράφει `Scraping Store At Marketplace Skipped`. Deployed.

### 5b. Αφαίρεση Processing section

Αφαιρέθηκε το Processing section (Completed, For Review, FB Bans, Google Bans) από daily report, progress report, run completed message. Deployed.

---

## 6. Cleanup: αφαίρεση bestprice-curl-fixed

Ο `bestprice-curl-fixed` Lambda + test Step Function αφαιρέθηκαν (source file, serverless.yml, config). Ο `bestprice-curl` (original) τρέχει κανονικά. Deployed, committed, pushed (`fcde428`).

---

## 7. Πιθανές επιπλέον βελτιώσεις

1. **Max retry limit στο proxy loop:** τώρα κάνει loop forever. Βάλε limit (π.χ. 10-20 retries) μετά τον οποίο fail-άρει το execution
2. **Περισσότερα proxies:** μόνο 1 proxy (Mac mini) = single point of failure. Αν ban-αριστεί, κολλάνε όλα
3. **Μείωση wait-for-some-time:** 900s → 300s (τσεκάρει πιο συχνά)
4. **Μείωση wait-state:** 40s cooldown μετά κάθε scrape ίσως είναι conservative

---

## 7. Τελευταίες 2 ώρες πριν το fix (snapshot 11:22 UTC)

| Metric | bestprice | skroutz | Total |
|---|---|---|---|
| SQS Received | 22 | 30 | 52 |
| Skipped (already exists) | 13 | 18 | 31 |
| Scrape Started | 9 | 12 | 21 |
| Store Saved | 9 | 12 | 21 |
| Selector Fail | 4 | 0 | 4 |

Scraper (Execution-1778579793346, running from 09:56) σε `wait-for-some-time` loop, τσεκάρει κάθε 15min, βλέπει 21 running `process-store-information`, ξαναπεριμένει. Τα 21 running executions είναι όλα κολλημένα στο proxy cooldown loop.

---

## 8. Τελική κατάσταση (snapshot 12:18 UTC, μετά τα fixes)

| Metric | Value |
|---|---|
| Running `process-store-information` | 7 (κάτω από threshold, scraper τρέχει ελεύθερα) |
| Scraper | 1 execution running, δεν κολλάει πλέον |
| Cumulative scraped (12 days) | 189 |
| Cumulative skipped (12 days) | 879 (559 skroutz, 320 bestprice) |
| Remaining | 9,311 |
| Execution time per store | 2-6 min (πριν: 2-4 ώρες stuck) |

Proxies: 2 Tailscale devices (Mac mini + MacBook Pro), αλλά μόνο 1 healthy (Mac mini). MacBook Pro fail-αρει health check (`Socks5 proxy rejected connection`), δεν τρέχει proxy service στη port 3128.

---

## 9. Script

Δημιουργήθηκε `scripts/scrape-execution-report.js` για on-demand report:

```bash
cd scrape-the-greek-ecommerce-v2
AWS_PROFILE=equalityAdmin node scripts/scrape-execution-report.js 12
```

Τραβάει events από DynamoDB (`prod_activity_logs`) και Step Function executions, σπάει τα νούμερα ανά execution.

---

## 10. Σημειώσεις

- `bestprice-curl-fixed` αφαιρέθηκε. Ο `bestprice-curl` (original) τρέχει κανονικά (51/51 success rate στο 12h window).
- 0 bans scraping και στα δύο marketplaces. Τα "ban" problems που βλέπαμε παλιότερα ήταν infrastructure issues (βλ. report 2026-05-11).
- 15 "Selector Fail" στο bestprice: scrape γίνεται αλλά κάποιοι HTML selectors δεν βρέθηκαν (missing data fields).
- MacBook Pro δεν τρέχει proxy service (port 3128). Single point of failure: μόνο Mac mini.
