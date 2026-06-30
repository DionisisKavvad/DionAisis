# Facebook Posts — Runs, Posts Saved & Cost (last year)

**TL;DR:** Η διαδικασία έτρεξε **3 φορές** μέσα στον ορίζοντα δεδομένων (table από 31/12/2025): 1η full backfill (~304k posts, $64), μετά 2 incremental (~195k/$42 και ~185k/$36). Πιο ακριβό κάθε φορά ο **chrome scraper Lambda** (60-78% του κόστους), ~σταθερό γιατί κάθε run σκανάρει όλα τα 6132 stores ανεξάρτητα από νέα posts. Reusable script: `scripts/analyze-runs-cost.js`.

## Πώς μετρήθηκε
- **Runs:** time-clustering των `Facebook Post Saved` events (ground truth — ο cron ήταν συχνά disabled, runs με manual triggers). Marker `Facebook Posts Run Started` υπάρχει μόνο στα 2 πρόσφατα (προστέθηκε στο rewrite του begin-facebook-posts).
- **Cost:** bottom-up από usage metrics (CloudWatch/Lambda/SF/Logs + DDB estimate). Το Cost Explorer είναι άχρηστο εδώ: το account `642783340947` (equality) είναι member, το CE του δείχνει ~$0 (κόστη σε inaccessible payer), και δεν υπάρχουν active cost-allocation tags. Επίσης το account τρέχει πολλά projects, οπότε ακόμα κι account-level cost δεν απομονώνει το facebook-posts.

## Summary

| # | Period | Type | Posts saved | Lambda $ | DDB $ | SF $ | Logs $ | **Total $** | Πιο ακριβό |
|---|--------|------|------------:|---------:|------:|-----:|-------:|------------:|------------|
| 1 | 01/01→05/02/26 | unmarked (manual, 1η/full) | 304,271 | $38.69 | $9.13 | $1.66 | $14.36 | **$63.84** | Lambda compute |
| 2 | 02/04→30/04/26 | marked cf603ec6 (bug+heal+requeue) | 194,624 | $32.83 | $5.84 | $0.43 | $3.10 | **$42.20** | Lambda compute |
| 3 | 28/05→25/06/26 | marked e73ad87f (clean incremental) | 184,809 | $27.09 | $5.54 | $0.70 | $2.31 | **$35.64** | Lambda compute |

## Βασικά ευρήματα
- **Posts:** 1η φορά όλα (~304k) → μετά μόνο νέα (~185-195k/run). Το "μόνο νέα" είναι **per-store** (σώζει posts νεότερα από το τελευταίο saved). Σύνολο 683,704 post-saved events (post-heal, -67.939 dupes).
- **Πιο ακριβό:** ο `facebook` scraper Lambda (2 GB, ~115 sec/store): $26.7-38.2/run. ~Σταθερό γιατί κάθε run σκανάρει **όλα** τα stores· το incremental κόβει μόνο DynamoDB writes & logs, όχι compute.
- **Run 1 ακριβότερο** (πρώτο full): περισσότερες & μεγαλύτερες invocations (318h vs 222h) + 25 GB logs ($14 μόνο logs, λόγω full-history scrape).
- **Run 2 "βρώμικο":** έτρεξε με το duplicate bug (πριν το fix 15/04) → heal (-67.939) + requeue 2.741 stores. Τα 194k είναι post-heal.

## Caveats
- Run windows = weekly clustering (idle μέρες εντός window προσθέτουν ~0 κόστος).
- DDB writes & SF transitions = estimates (flagged στο script, tunable constants).
- Δεν υπάρχει NAT gateway → μηδέν data-transfer κόστος.
- Ορίζοντας δεδομένων: μόνο από 31/12/2025 (το stack στήθηκε τότε σε αυτό το account· παλιότερα runs σε άλλο account/old table, δεν ψάχτηκαν).

Πλήρες report (auto-generated): `scrape-facebook-posts/docs/2026-06-29-runs-posts-and-cost-analysis.md`
