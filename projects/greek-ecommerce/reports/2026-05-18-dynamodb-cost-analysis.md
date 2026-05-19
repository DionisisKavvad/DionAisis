# DynamoDB Cost Analysis - Μάιος 2026

**Date:** 2026-05-18
**Account:** 642783340947 (dionisis-equality)
**Profile:** equalityAdmin
**Region:** eu-west-1
**Period:** 2026-05-01 → 2026-05-18 (MTD)

## TL;DR
- **Gross cost MTD (Μάιος):** $10.61 (matches AWS console)
- **Net bill:** $0 (credits καλύπτουν 100% και τους 3 τελευταίους μήνες)
- **3-month trend:** Μάρτιος $36 → Απρίλιος $21.79 → Μάιος $11.46 MTD. Κόστος **σταθερά καθοδικό ~40%/μήνα**.
- **Το 95%+ του DynamoDB cost πάει σε ένα table: `prod_equality_unified_logs`**
- **Writes ήταν #1 cost driver τον Μάρτιο** (initial load), αλλά έπεσαν 88% μέχρι Μάιο. Τώρα Writes/Storage/Reads πιο ισορροπημένα.

## Που πάνε τα λεφτά - high level

| Action | Quantity | Cost | % |
|---|---|---|---|
| Writes (base + GSI replication) | 6.80M WCU | **$4.79** | 45% |
| Storage | 37.07 GB | **$3.42** | 32% |
| Reads (base + GSI queries) | 16.98M RCU | **$2.40** | 23% |
| Backup storage | 0.0003 GB | ~$0 | <1% |
| **Σύνολο** | | **$10.61** | |

Τα παραπάνω είναι amortized reserved-capacity rates (το account έχει Reserved Capacity, οπότε τα prices είναι κάτω του on-demand).

## Που πάνε τα λεφτά - ανά table

| Table | Reads | Writes | Size | ~% συνολικού cost |
|---|---|---|---|---|
| **`prod_equality_unified_logs`** | **18.1M** (base+GSIs) | **6.5M** (base+GSI repl.) | **7.48 GB** | **~95%** |
| `prod_activity_logs` | 124k | 99k | 252 MB | ~3% |
| `prod_user_logs` | 0 | 0 | 132 MB | ~1.5% (storage only) |
| `prod_equality_unified_data` | 7k | 9 | ~50 MB | <1% |
| `prod_ecommerce_unified` | 1.5 | 0 | 9.75 MB | <1% |

**Όλα τα κόστη ουσιαστικά πάνε σε ένα table.**

## Που πάνε τα λεφτά μέσα στο `prod_equality_unified_logs`

### Writes ($4.79, 45% του συνολικού)
- **Base table writes:** 815k WCU (~$0.58 amortized)
- **GSI write amplification:** ~5.7M WCU (~$4.21 amortized). Κάθε write στο base table τριγγάρει replication σε 7 GSIs.
- **88% του write cost είναι GSI replication**, όχι το ίδιο το data.

### Reads ($2.40, 23% του συνολικού)
- **Base table reads:** 7.66M RCU
- **GSI reads:** 10.4M RCU (~61% των reads)
  - GSI6: 9.21M (90.7% των GSI reads)
  - GSI1: 976k (9.6%)
  - GSI4: 183k (1.8%)
  - GSI2/3/5/7 combined: 72k (0.7%)

### Storage ($3.42, 32% του συνολικού)
- **Base table:** 7.48 GB
- **GSIs:** δεν metric-άρεται ξεχωριστά στο storage cost, αλλά κάθε GSI κρατάει copy των attributes που project-άρει, οπότε ένα κομμάτι από τα 7.48 GB είναι GSI storage.
- Growing με ~1.5 GB/μήνα.

## Που πάνε τα λεφτά ανά execution (`scrape-greek-stores`, ~100 runs τον Μάιο)

Per-execution I/O στο `prod_equality_unified_logs`:
- ~76,562 reads (κυρίως μέσω GSI6)
- ~8,150 writes στο base (που γίνονται ~65k WCU λόγω GSI replication)

I/O cost ανά execution (amortized reserved rate): **~$0.07-0.08**
(storage είναι time-based, δεν χρεώνεται per-execution)

## Που πάνε τα λεφτά ανά μέρα

| Μέρα | Writes | Reads | Comment |
|---|---|---|---|
| 1/5 | 290k | 0 | Initial backlog |
| 2-10/5 | 8-84k | 0 | Steady writes, μηδέν reads |
| 11/5 | 126k | 273k | Πρώτο read spike |
| **13/5** | 42k | **6.92M** | **90% όλων των reads του μήνα** |
| 14-17/5 | 19-23k | 0-462k | Decay |

Το spike της 13/5 είναι single event. Δεν είναι recurring pattern. Πιθανώς one-off operation (backfill, migration, ή manual scan).

## Συγκριτικά - 3-month trend (Μάρτιος → Μάιος 2026)

### Overview

| Μήνας | Gross | Net | Writes | Reads | Storage | Σχόλιο |
|---|---|---|---|---|---|---|
| **Μάρτιος** (full) | **$36.00** | $0 | 7.0M | 1.5M | ~7 GB | Peak month, write-heavy (πιθανώς migration/backfill) |
| **Απρίλιος** (full) | **$21.79** | $0 | 1.6M | 3.8M | ~7.5 GB | Writes -77%, reads x2.5 |
| **Μάιος** (MTD 18d) | **$11.46** | $0 | 0.8M | 7.6M | 7.48 GB | Writes -50%, reads x2, spike 13/5 |

Pro-rata daily rate: Μάρτιος $1.16/μέρα, Απρίλιος $0.73/μέρα, Μάιος $0.64/μέρα. **Σταθερά καθοδική πορεία ~40% κάθε μήνα.**

### Where the money went per month

| Μήνας | Writes | Storage | Reads |
|---|---|---|---|
| Μάρτιος | $25.20 (70%) | $7.20 (20%) | $3.60 (10%) |
| Απρίλιος | ~$11 (50%) | ~$7 (32%) | ~$4 (18%) |
| Μάιος MTD | $4.79 (42%) | $3.42 (30%) | $2.40 (21%) |

Σημαντικό shift: τον Μάρτιο τα writes ήταν το συντριπτικό cost driver (7M units). Από Απρίλιο και μετά τα writes πέφτουν δραματικά. Σήμερα storage γίνεται σχετικά πιο σημαντικό κομμάτι.

### Τι συμπεραίνεται

- **Storage σταθερό** στα ~7.5 GB σε όλους τους μήνες, δεν φουσκώνει unbounded. Άρα **κάτι ήδη κάνει cleanup**, ή το ρυθμό του ingestion δεν αυξάνεται.
- **Writes έπεσαν 88%** Μάρτιος → Μάιος. Πιθανώς initial data load τελείωσε.
- **Reads αυξάνονται** (1.5M → 3.8M → 7.6M), αλλά κοστίζουν 5x λιγότερο από writes, άρα μικρότερο impact.
- **Credits κάλυψαν 100%** και τους 3 μήνες. Net bill = $0 παντού.

### Post-credit outlook

Αν τα credits τελειώσουν αύριο, βάσει του May trend:
- Baseline: **~$13-15/μήνα**
- Peak month (αν επαναληφθεί Μάρτης pattern): ~$30-35/μήνα
- Annualized: **~$150-200/χρόνο**

Δεν είναι αλαρμιστικό για ένα table 3.3M items / 7.5 GB / 7 GSIs σε PAY_PER_REQUEST. Αλλά αξίζει να ξέρουμε πότε εξαντλούνται τα credits.

## Bottom line

Όλα τα κόστη ουσιαστικά πάνε σε ένα μέρος: το `prod_equality_unified_logs`. Μέσα σε αυτό:
- **GSI replication σε writes** = το #1 cost driver (~$4.21/μήνα amortized)
- **Storage** του ίδιου table = το #2 (~$3.42)
- **Reads μέσω GSI6** = το #3 (~$1.47, με το spike της 13/5 να ευθύνεται για το μεγαλύτερο μέρος)

Όλα τα άλλα tables συνδυασμένα = ~5% του cost.

## Context constraints (από τον Dionisis)
- Το `prod_equality_unified_logs` είναι **single source of truth για τα πάντα**, όχι απλά logs.
- **No global TTL** — θα χανόντουσαν δεδομένα.
- Διαφορετικά apps έχουν διαφορετικά retention requirements (κάποια >3 μήνες, κάποια λιγότερο). Όποια διαδικασία γίνει, πρέπει να είναι **app-scoped**.
- **Δεν κόβουμε GSIs** — διαφορετικά queries κάνουν overuse διαφορετικών indexes σε διαφορετικές περιόδους.

## Πιθανές λύσεις (με βάση τα παραπάνω constraints)

### 1. App-scoped archival pipeline σε S3 (στοχεύει storage + read cost)
Background Lambda που τρέχει daily και κάνει αυτά:
- Διαβάζει items βάσει per-item attribute (π.χ. `app`, `retentionDaysHot`)
- Items πάνω από το όριο του app μετακινούνται σε S3 (parquet/jsonl, partitioned by date+app)
- Διαγραφή από DynamoDB **μόνο** αφού confirmed write σε S3
- Cold queries → S3 Select ή Athena
- Διατηρεί single source of truth (S3 ως cold tier του ίδιου dataset)
- Per-app πολιτική: κάθε app ορίζει το δικό του hot retention. Default π.χ. 60 ημέρες, override per app.

**Cost impact:** storage στο S3 είναι ~$0.023/GB (vs $0.306 στο DynamoDB on-demand), δηλαδή ~13x φθηνότερα. Επίσης μειώνει writes amplification στο μέλλον για archived data (γιατί τα παλιά items δεν χρειάζονται GSI presence).

### 2. DynamoDB native export to S3 (incremental)
Το DynamoDB υποστηρίζει incremental exports σε S3 χωρίς να καταναλώνει RCU.
- Daily/weekly incremental export → S3
- App ή κάποιο read layer μπορεί να ψάχνει πρώτα στο DDB, αν miss πάει στο S3 με Athena
- Λιγότερο maintenance από custom Lambda, αλλά τα items μένουν και στο DDB (δεν λύνει storage growth)
- Καλό combo με #1: το #2 σου δίνει backup/audit, το #1 κάνει lifecycle management

### 3. DynamoDB Standard-Infrequent Access (Standard-IA) table class
- Storage κόστος **~60% χαμηλότερο** ($0.10/GB vs $0.25/GB on-demand)
- Reads/writes ~25% πιο ακριβά
- Trade-off ωφέλιμο για log-heavy tables όπου τα παλιά data σπάνια διαβάζονται
- **Αμέσως applicable** χωρίς app changes, ένα setting στο table
- Για το `prod_equality_unified_logs`: αν τα reads στα παλιά items είναι σπάνια (το pattern της 13/5 δείχνει spike σε historical lookups, οπότε προσοχή), savings ~$1.50-2/μήνα στο storage
- Συνδυάζεται με όλες τις άλλες λύσεις

### 4. App-scoped item compression
Σε write time, η εφαρμογή compressη το log payload (gzip/zstd) πριν το γράψει.
- Μειώνει size **και** writes amplification (μικρότερο item = λιγότερα WCUs αν >1KB)
- Per-app επιλογή: log-heavy apps το ενεργοποιούν, app metadata όχι
- Trade-off: queries που χρειάζονται να φιλτράρουν το payload server-side δε δουλεύουν, μόνο key/attribute lookups
- Νο impact στα GSIs αν τα GSI keys/projections δεν περιλαμβάνουν το compressed payload

### 5. Hot/cold διαχωρισμός σε ξεχωριστά tables (πιο μεγάλη αλλαγή)
- Δύο tables: `equality_unified_logs_hot` (πρόσφατα) + `equality_unified_logs_cold` (παλαιότερα)
- App write-ahead πάντα στο hot. Background process μεταφέρει στο cold per-app policy.
- Cold table έχει λιγότερα GSIs (μόνο όσα χρειάζεται για audit lookups), Standard-IA class
- Read path: app ψάχνει hot, αν miss πάει στο cold
- Single source of truth διατηρείται (union των δύο tables), αλλά δικαιολογεί διαφορετική GSI strategy ανά τιερ
- Πιο επεμβατικό, αλλά αν τα retention varies πολύ ανά app, καθαρότερο model

### Συνδυασμός που έχει νόημα
- **Φάση 1 (γρήγορη win, no app changes):** Standard-IA class → storage ~$1-2 λιγότερο/μήνα άμεσα
- **Φάση 2 (medium effort):** App-scoped archival Lambda σε S3 με per-item policy → κρατάει το single source of truth, σταματάει αόριστο growth, ξεκλειδώνει cheap cold queries μέσω Athena
- **Φάση 3 (αν το app pattern το δικαιολογεί):** Hot/cold tables με διαφορετικό GSI footprint στο cold

Δεν θίγονται GSIs, δεν χάνεται data, retention είναι app-scoped.

## Methodology notes
- Cost data από `aws ce get-cost-and-usage` με metric AmortizedCost / record type Usage (matches AWS console).
- Per-table breakdown εκτιμημένο από CloudWatch `ConsumedReadCapacityUnits` / `ConsumedWriteCapacityUnits` per table.
- GSI breakdown από CloudWatch με dimension `GlobalSecondaryIndexName`.
- GSI write amplification υπολογισμένο από διαφορά total account writes (6.80M) και base table writes (815k).
