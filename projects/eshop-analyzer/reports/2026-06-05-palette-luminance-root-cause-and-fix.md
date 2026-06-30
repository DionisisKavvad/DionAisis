# Palette Inventory Gap — Root Cause & Fix

**TL;DR:** Το «κενό» σε σκούρες/deep-desaturated παλέτες ΔΕΝ ήταν data-supply gap (όπως υπέθετε το αρχικό briefing) — ήταν **processing bug**: ένα luminance filter (`> 0.02` per color, με `every`) εξόντωνε το **72% των dark παλετών** που είχαμε ήδη μαζέψει. Χαμηλώσαμε το threshold σε **0.004**, ξανα-ingest-άραμε τα ίδια raw δεδομένα, και το dark coverage **διπλασιάστηκε** (5%→11.9%) χωρίς καμία γενιά νέων παλετών και χωρίς regression στα bright. Validation σε 7 stores + 5άδα plaisio επιβεβαιώνει αξιόπιστη βελτίωση στο dark top-match· μένει gap στα demanding 3-4 tag combos.

Σχετικό: το αρχικό briefing `2026-06-05-palette-inventory-gap-briefing.md`.

---

## 1. Το πρόβλημα (από το briefing)

Σύστημα επιλογής παλετών για video ads: LLM βγάζει 5 color proposals (color tags + style tags) → matcher ταιριάζει με βάση 11.387 παλετών (DynamoDB `dev_color-palettes`, attribute `tagsV2` = 41 perceptual tags). Η βάση ήταν skewed: bright 32%, dark 5%, deep+desaturated 3%. Κάθε σκούρο/earthy αίτημα έπεφτε σε T5 (loosest match): olive 97%, burgundy 92%, navy 69%, charcoal 77%.

**Διάγνωση briefing:** data gap → «φτιάξε synthetic dark παλέτες».

---

## 2. Root cause (μετρημένο, διαφορετικό από τη διάγνωση)

Η συλλογή (`color-palette-analysis`) μαζεύει από 3 sources (coolors-v2, color-hunt, schemecolor) ανά 8 style tags, μεταξύ των οποίων **`dark`**. Μετρήσεις στα raw scraped δεδομένα (τοπικά στο disk):

- coolors `dark` tag = **1.536 raw παλέτες** (= ίδιο volume με bright). **Άρα όχι collection gap.**
- Περασμένες από τον brief classifier: **94-100% όντως dark-style**, **973 deep+desaturated**.

Ο πραγματικός killer — luminance filter στο `process-palettes-v2.js`:
```
LUMINANCE_LOWER_THRESHOLD = 0.02   // WCAG linearized
if (!colors.every(c => lum(c) > 0.02 && lum(c) < 0.99)) skip;
```
- `0.02` linearized ≈ sRGB **RGB 39 (#272727)**. Δηλαδή **οποιαδήποτε παλέτα με έστω ΕΝΑ χρώμα σκουρότερο από ~#272727 πετιόταν ολόκληρη**.

Survival rate per tag μέσα από το filter:

| tag | raw | survive | killed |
|---|---|---|---|
| **dark** | 1536 | 430 (**28%**) | **1106** |
| bright | 1536 | 1536 (100%) | 0 |
| vintage | 1536 | 1523 (99%) | 13 |
| pastel | 1536 | 1458 (95%) | 78 |

Funnel για deep+desaturated: 973 raw → 300 επιβιώνουν (lum-filter σκοτώνει 673) → ~372 τελικά μετά dedup. **Το filter, όχι η προσφορά, δημιούργησε το κενό.**

---

## 3. Το fix

Δεν είναι «bug» με την έννοια ότι το threshold ήταν λάθος να υπάρχει (υπάρχει για legibility — να μη μπαίνουν χρώματα αδιάκριτα από μαύρο). Ήταν **κακο-calibrated**: το `0.02` κόβει usable charcoals.

**Αλλαγές (όλες στο `color-palette-analysis`):**
1. `LUMINANCE_LOWER_THRESHOLD`: **0.02 → 0.004** (≈ RGB 16 / #101010). Κρατά την αρχική πρόθεση (κόβει near-black RGB 0-15) και ανακτά ~70% των dark.
2. **`tagsV2` inline στο processing** (πριν γινόταν σε ξεχωριστό `backfill-tagsv2.cjs` σε άλλο repo). Υπολογίζεται per-palette ως καθαρή συνάρτηση των hex (`paletteColorTags ∪ paletteStyleTags`). ΔΕΝ γίνεται union στο dedup (σε αντίθεση με τα legacy provenance `tags`).
3. **Vendored ο classifier** (`color-tagger.cjs` copy στο `color-palette-analysis/src/`, όχι shared) — επειδή τελικά τα tags/classifier θα φύγουν από το `brief-localhost`.

Σημείωση sweep για το threshold (dark survival): 0.02→28%, 0.01→49%, **0.004→70%**, 0→91%.

---

## 4. Live re-ingest (πραγματικά αποτελέσματα στη βάση)

Διαδικασία: backup (44MB scan-dump, restorable) → additive re-ingest (13.437 PutItems, 0 failures) → dedup (perm: 0 αλλαγές, perceptual OKLab: −420) → **τελικό 13.068 items**.

| metric | OLD (0.02) | LIVE (0.004) |
|---|---|---|
| dark | 619 (5%) | **1.556 (11.9%)** ↑2.5x |
| deep+desat | 372 (3%) | **841 (6.4%)** ↑2.3x |
| bright | 3.738 (32%) | 3.954 (30.3%) — καμία regression |
| bright:dark ratio | 6:1 | **2.54:1** |

Zero-combos του briefing έκλεισαν: `navy+slate` 0→**129**, `charcoal+forest+plum` 0→3, `burgundy+rust` 7→31, `navy+charcoal` 28→81. (`maroon` παραμένει 0 — αληθινό supply gap, ξεχωριστό.)

---

## 5. Platform: v5 set + UI fixes

**v5 set:** και τα 7 real stores ξανατρέξανε full brief στο enriched DB → bundles στο `brief-mocks-v5/`. Προστέθηκε **v5 toggle** στον dev picker (manifest type+`assetPathV5`, `brief.service.ts` filter+load, `brief-mock-picker` filter+button). Συγκρίνεται side-by-side με v4.

**2 UI bugs που βρέθηκαν & διορθώθηκαν:**
1. Το palette card έδειχνε το **legacy `tags`** (12-hue, π.χ. «orange») αντί για `tagsV2` (perceptual, π.χ. «terracotta/rust»). Τα δεδομένα είχαν και τα δύο· το template δεν τα έδειχνε. Fix: plumb `tagsV2` στο Palette object + render `tagsV2 ?? tags` σε `colors.component` & `template-properties`.
2. Το tier grouping ήξερε μόνο **buckets 1-4**· οι **T5** παλέτες (που παράγει ο τρέχων 5-tier `cascadeV3`) **εξαφανίζονταν** από το display. Επίσης τα labels ήταν ανεστραμμένα. Fix: buckets 1-5 + labels από actual `_droppedTags`.

(tsc --noEmit clean· τα templates επικυρώνονται στο `ng serve` restart — που χρειάζεται ούτως ή άλλως για να σερβιριστεί το νέο `brief-mocks-v5/` folder.)

---

## 6. Validation

### 6.1 cascadeV3 — τι σημαίνει κάθε tier (source of truth)
«Match» = η παλέτα `tagsV2` ⊇ required set. Πρώτο tier (1→5) που δίνει ≥1 hit, ανά color-count.
- **T1** = cP+cS+sP+sS (όλα)
- **T2** = ρίξε secondary colors (cS)
- **T3** = ρίξε secondary styles (sS)
- **T4** = ρίξε όλα τα secondary
- **T5** = ρίξε το **τελευταίο** primary color (sP ποτέ δεν πέφτει)

### 6.2 7-store v4↔v5 comparison: **86% neutral**
Το LLM βγάζει διαφορετικά proposals κάθε run → μόνο 5/35 proposals συγκρίσιμα (ίδια tags). **Η αυτόματη tag-aligned σύγκριση δεν είναι αξιόπιστη μέθοδος** (confounded από LLM variance). Από τα 5 comparable: 1 dark case βελτιώθηκε (plaisio charcoal+navy+slate: v4 T5-only → v5 T1), 4 ίδια, **καμία regression**.

### 6.3 plaisio 5άδα (controlled για consistency)
Το stealth-dark proposal (charcoal+navy+slate) εμφανίστηκε **και στα 5 runs**:

| run | best tier |
|---|---|
| R1 | T1 |
| R2 | T1 |
| R3 | T1 |
| R4 (4 tags) | T2 |
| R5 (4 tags) | T2 |

vs v4 plaisio όπου το ίδιο combo ήταν **bestT=5 (όλα T5)**. → Η βελτίωση στο dark top-match είναι **αξιόπιστη (5/5), όχι τυχαία**. Όταν ζητούνται 3 tags → T1· 4 tags → T2.

---

## 7. Τι παραμένει (honest — αναθεωρημένο μετά από 2-agent validation: reviewer + devil's advocate)

Τα **νούμερα** αναπαράγονται ακριβώς στο live table (reviewer): `terracotta+mustard+cream+rust` 78/80, `burgundy+amber+crimson` 76/76, `forest+charcoal+olive+teal` 9/10· και τα color sets είναι όντως σχεδόν ανύπαρκτα (burgundy+amber+crimson = **0** colors-only, terracotta+mustard+cream+rust = **2**).

**ΑΛΛΑ η αρχική διάγνωση («ακόμα starved → targeted generation») είναι misframed.** Τρία ευρήματα:

1. **«T5 share υψηλό» = quota-fill artifact, όχι quality metric.** Ο cascade επιστρέφει ανά color-count bucket ΕΝΑ tier (το πρώτο που πιάνει) και γεμίζει μέχρι TOP_N=30. Το «78/80 T5» σημαίνει ότι 2/5 buckets βρήκαν tight match (1-3 hits) και 2 loose buckets γέμισαν 30 ο καθένας — δεν είναι per-result quality rate. **Metric of record = best-tier-per-bucket**, όχι aggregate T5 share.
2. **Over-constrained REQUESTS, όχι (μόνο) supply gap.** `burgundy+amber+crimson` = 3 διαφορετικά κόκκινα που δεν συνυπάρχουν σε μη-λασπωμένη παλέτα (=0 colors-only). Είναι το LLM που ζητάει αλληλο-αποκλειόμενες αποχρώσεις, όχι η βάση που λείπει.
3. **Ευαισθησία στο primary/secondary split.** Μετακίνηση `mustard` primary→secondary: T5 **78→10**. Άρα tag-ordering / matcher issue, όχι data. (Ο cascade κρατάει τα style tags υποχρεωτικά μέχρι το T5· `burgundy+amber` 2-color = 24 παλέτες υπάρχουν αλλά ο cascade δεν τα φτάνει γιατί κουβαλάει πάντα `dark+warm`.)

**Metric consistency:** το §6 βαθμολογεί με best-tier, το §7 (αρχικό) με T5-share — goalpost move. Με κοινό best-tier metric, τα earthy combos *κι αυτά* βελτιώθηκαν (2-3/5 buckets φτάνουν T1/T2). Το «30/43» του §6.3 αφορά το συγκεκριμένο stealth proposal, όχι μέσο όρο (dark-proposal average ≈ 63% T5).

---

## 8. Συμπέρασμα

Το luminance fix έκανε το βαρύ lifting **τζάμπα** (διπλασίασε dark/deep-desat από δεδομένα που ήδη είχαμε, ξεμπλόκαρε τα broad/2-tag combos) και επιβεβαιώθηκε αξιόπιστα στο plaisio (best-tier v4 all-T5 → v5 T1/T2, 5/5 runs). Το εναπομείναν «κενό» στα στενά πολυ-tag warm-dark combos είναι **κυρίως request-over-constraint + matcher/prompt structure, όχι supply gap** (βλ. §7). Άρα το επόμενο βήμα ΔΕΝ είναι πρωτίστως generation.

## 9. Next steps (αναλυτικά — προτεραιότητα: φθηνό & root-cause πρώτα)

Σειρά εκτέλεσης: **9.1 + 9.2α πρώτα** (φθηνά, χτυπάνε τη ρίζα — το ~80% του προβλήματος του §7), μετράμε, μετά αποφασίζουμε για 9.2β / 9.3.

### 9.1 — Prompt fix: rare/mutually-exclusive tags ΕΚΤΟΣ primary
**Πρόβλημα:** Ο cascade ΠΟΤΕ δεν ρίχνει `colorTags.primary` πριν το T5 (last resort). Όταν το LLM βάζει ένα **σπάνιο** tag (π.χ. `mustard` = 135/13.068 items) ή **αλληλο-αποκλειόμενες** αποχρώσεις (`burgundy+amber+crimson` = 3 κόκκινα, 0 συνύπαρξη) στο primary, ο matcher αποτυγχάνει σε όλα τα tiers 1-4 και πέφτει σε T5 για όλα τα buckets.

**Πού:** `brief-localhost/src/workflow/prompts/final-color-tag-prompt-v3.md` → ενότητα **Workflow, βήμα 3 (Color tags primary + secondary)**.

**Τι να προστεθεί (2 κανόνες):**
1. *Primary = structural anchors, όχι accents.* «`colorTags.primary` (1-2): διάλεξε τα χρώματα που είναι πιθανότερο να **συνυπάρχουν** σε αρμονική παλέτα — κατά προτίμηση ο ένας dominant/neutral άξονας (charcoal, navy, slate, cream, beige) ή το ΕΝΑ hero hue. Βάλε **σπάνια/κορεσμένα accents** (mustard, crimson, rust, teal, plum) στο `secondary` — ο matcher τα ρίχνει πρώτα, οπότε δεν μπλοκάρουν το match.»
2. *Όχι 3+ ομοειδείς αποχρώσεις.* «ΜΗΝ βάζεις 3+ αποχρώσεις της ίδιας οικογένειας που δεν γίνεται να συνυπάρξουν χωρίς λάσπη (π.χ. burgundy+amber+crimson = τρία κόκκινα). Αν το mood θέλει βάθος ζεστασιάς: ΕΝΑ red-family primary + contrasting secondary.»

**Αναμενόμενο effect (μετρημένο):** μετακίνηση `mustard` primary→secondary έριξε το T5 του `terracotta+mustard+cream+rust` από **78 → 10** — χωρίς καμία αλλαγή στη βάση, χωρίς αλλαγή στο οπτικό intent.
**Effort:** μικρό (prompt edit). **Risk:** χαμηλό. **Verify:** re-run 2-3 stores, μέτρα **best-tier-per-bucket** (όχι aggregate T5-share, βλ. 9.4) πριν/μετά.

### 9.2 — Matcher structure (`query-colors/src/get-palettes-based-on-tags.ts`)
**9.2α — In-tier coherence scoring (clear win):** Σήμερα ο cascade επιστρέφει `matched.slice(0, TOP_N)` (γρ. ~80) με τη σειρά του Scan — γι' αυτό μέσα σε ένα tier εμφανίζεται «γκρι+κόκκινο» δίπλα σε συνεκτικά σκούρα. **Fix:** πριν το `slice`, ταξινόμησε το `matched[]` με coherence score ως προς τα requested style/color tags — π.χ. penalty για χρώματα εκτός του ζητούμενου luminance/saturation band (ένα φωτεινό κόκκινο σε `dark` request πέφτει χαμηλά). Έτσι τα top-N είναι τα πιο συνεκτικά ακόμα κι όταν το tier είναι χαλαρό. **Effort:** μικρό-μεσαίο. **Risk:** χαμηλό (μόνο ordering). **Verify:** τα top results των dark proposals να μην έχουν off-tone accents.

**9.2β — Ενδιάμεσο relaxation tier (design tradeoff, χρειάζεται οπτικό έλεγχο):** Ο cascade κρατάει τα `styleTags.primary` (π.χ. `dark`, `warm`) **υποχρεωτικά μέχρι το T5**. Έτσι `burgundy+amber+dark+warm` = 0 → T5, ενώ `burgundy+amber` (χωρίς style) = **24 παλέτες υπάρχουν** αλλά ο cascade δεν τις φτάνει. **Πιθανό fix:** νέο tier κάτω από το T4 που δοκιμάζει drop ενός style-primary (ή ενός primary color) ΠΡΙΝ καταλήξει στο T5-garbage. **Tradeoff:** το style-primary είναι το «mood anchor» — χαλάρωσή του μπορεί να δώσει παλέτα που δεν είναι αρκετά σκούρα. **Άρα:** controlled experiment + οπτικός έλεγχος, όχι τυφλό. **Effort:** μεσαίο. **Risk:** μεσαίο (αλλάζει match semantics).

### 9.3 — Targeted generation (ΜΟΝΟ μικρό συμπλήρωμα, μετά τα 9.1/9.2)
Αφού πέσει το «τεχνητό» T5 από prompt+matcher, ό,τι μένει είναι **γνήσιες τρύπες** σε χρήσιμους & harmonic combos. Γέννησε ΜΟΝΟ γι' αυτούς:
- **Κριτήρια συμπερίληψης:** (α) ο combo ζητείται συχνά από το LLM, (β) είναι harmonically συνεκτικός (monochromatic ramp / analogous dark hues / dark-base + 1 muted accent). Π.χ. `charcoal+forest+plum` (dark mono, μόλις 3 σήμερα), `navy+slate` dark, `forest+charcoal` σκούρα.
- **Αποκλεισμός:** unsatisfiable asks (burgundy+amber+crimson = 3 κόκκινα) — αυτά λύνονται στο prompt (9.1), όχι με generation.
- **How:** σύνθεση 2-6 χρωμάτων στο deep+desaturated box → tag με τον **vendored classifier** (`color-palette-analysis/src/color-tagger.cjs`, για 1:1 με το matching) → additive insert + dedup (idempotent pipeline). Contrast/luminance spread για legibility.
**Effort:** μεσαίο. **Verify:** οι zero/thin combos να έχουν ≥δεκάδες παλέτες ανά color-count· best-tier των αντίστοιχων proposals → T1/T2.

### 9.4 — Metric convention (να μη ξανα-misframe-άρουμε)
Υιοθέτησε **best-tier-per-bucket** ως metric of record, ΟΧΙ aggregate T5-share (που είναι quota-fill artifact: κάθε bucket γεμίζει TOP_N από το πρώτο tier που πιάνει, άρα ένα high-supply loose bucket φουσκώνει το T5 count). Πρόσθεσε probe script που τυπώνει ανά store/proposal: best-tier ανά color-count + αν υπάρχει coherent top match.

### 9.5 — Visual & validation
Restart `ng serve` (φορτώνει τα 7 v5 bundles + recompiled components) → οπτική v4-vs-v5 σύγκριση στο picker. Optional **controlled replay:** πάρε τα ακριβή colorTags/styleTags κάθε v4 proposal, replay στο enriched API τώρα → σύγκριση tiers με ίδιο request (απομονώνει το DB effect από το LLM variance).

## Validation note
Το Section 7 ξανα-validated με 2-agent team (reviewer + devil's advocate, 2026-06-05). Numbers HOLD· διάγνωση/framing αναθεωρήθηκε (artifact + over-constraint + ordering, όχι supply). Matcher quota-fill: `query-colors/src/get-palettes-based-on-tags.ts:80`· prompt constraint: `final-color-tag-prompt-v3.md`.

## 10. Generic alternative — perceptual matcher (IMPLEMENTED, OFF BY DEFAULT)

Διερευνήθηκε μια πιο γενική λύση από τα μπαλώματα: αντί exact tag-set membership, ranking με **OKLab color distance** (request color tags → centroids → απόσταση από τα πραγματικά χρώματα της παλέτας) + ελαφρύ style tie-break στα **ανθρώπινα** styles. Πάντα επιστρέφει το πλησιέστερο — χωρίς 0-match cliffs / T5 garbage.

**Ευρήματα (offline prototype σε ~5 παραδείγματα):** καλύτερο από τον cascade στα δύσκολα dark/earthy (π.χ. forest+charcoal+olive+teal: cascade→νέον, perceptual→σκούρα σβησμένα πράσινα), ισοπαλία στα εύκολα. Μάθημα: το style πρέπει να **αποσυντίθεται** (μόνο dark/bright/pastel ορίζουν φωτεινότητα· warm/cold/mono/gradient είναι ορθογώνια — το empirical L τους είναι θόρυβος, π.χ. warm 0.72 > bright 0.71). Το style ως **ισχυρός** όρος υπερισχύει του χρώματος → καλύτερα ως ελαφρύ tie-break.

**Κατάσταση:** υλοποιημένο στον matcher (`MATCH_MODE=perceptual`, **default `cascade`**), **ανενεργό**. Τεκμηρίωση: `query-colors/docs/perceptual-matcher.md`. Δεν ενεργοποιείται χωρίς broad A/B — 5 παραδείγματα + hand-tuned weights δεν είναι απόδειξη. Το μεγάλο κέρδος ήρθε από τα **δεδομένα** (luminance + human styles), που βοηθούν και τον cascade.

## 11. Human style tags — πείραμα (ΕΠΙΒΕΒΑΙΩΜΕΝΟ: pure-human over-prunes)

### Αφορμή
Το `tagsV2` υπολογίζει **και** τα style tags (dark/warm/...) από HSL (`paletteStyleTags`), όχι από την ανθρώπινη ετικέτα του source site. Ο HSL τύπος είναι **perceptually λάθος** σε ένα σημείο: ένα σκούρο/άτονο χρώμα χάνει τον χαρακτήρα warm/cold για τον άνθρωπο, αλλά ο τύπος (mean hue) το ταγκάρει ούτως ή άλλως.

**Μετρημένη απόκλιση (13.068 παλέτες):**
- `warm`: HSL **6.675** vs human **2.026** → ο HSL υπερ-ταγκάρει **3x** (4.702 παλέτες «warm» που ο άνθρωπος δεν λέει).
- `dark`: ~25% διαφωνία εκατέρωθεν (385 μόνο-human, 380 μόνο-HSL).
- Δομικό: `warm`+`cold` **ποτέ μαζί** (0/13.068) → είναι ένας άξονας (hue direction), όχι δύο ιδιότητες.
- Perceptual επιβεβαίωση (OKLab): warm-vs-cool απόσταση = **0.325 στα φωτεινά** αλλά **0.042 στα σκούρα/άτονα** → ο χαρακτήρας θερμοκρασίας όντως «μαζεύεται» στο σκοτάδι. Το OKLab το κωδικοποιεί εγγενώς, ο HSL τύπος όχι.

### Τι δοκιμάσαμε
In-place re-tag του live table: `tagsV2 = (color tags ως έχουν, HSL) ∪ (HUMAN style tags από legacy `tags`)`. Color tags αμετάβλητα· μόνο το style part άλλαξε. 11.533/13.068 items (88%) άλλαξαν style-part. Idempotent, reversible (legacy `tags` ανέπαφα· backup `dev_color-palettes.20260605-160146.json`).

### Το trade που αποκαλύφθηκε
- **HSL:** πλήρες αλλά **over-broad** (false positives — warm παντού).
- **Human:** ακριβές αλλά **ελλιπές** (false negatives — κάθε παλέτα κουβαλάει μόνο τα styles των σελίδων απ' όπου την κάναμε scrape).
- Συγκεκριμένο παράδειγμα: παλέτα **«Wizards on Holiday»** (`19232D-…-60798B`, σκούρο→μεσαίο μπλε ramp) είναι **όντως** dark+cold+monochromatic, αλλά την κάναμε scrape μόνο από τη σελίδα *monochromatic* → human style = μόνο `monochromatic`. Στο αίτημα plaisio `{dark,cold,monochromatic}` έπεσε από **T1 → T2**. Χαμένο **γνήσιο** match (HSL είχε δίκιο εδώ· human ελλιπές).

### ΕΠΙΒΕΒΑΙΩΜΕΝΟ αποτέλεσμα — δραστική απώλεια επιλογών
Re-run και των 7 stores στη re-tagged βάση, σύγκριση συνολικών παλετών ανά store (παλιό HSL run vs νέο human run):

| store | OLD (HSL) | NEW (human) | πτώση |
|---|---|---|---|
| coffeeisland | 328 | 55 | **−83%** |
| pharmacy4u | 253 | 45 | **−82%** |
| plaisio | 170 | 54 | −68% |
| public | 191 | 64 | −66% |
| jumbo | 202 | 75 | −63% |
| korres | 174 | 75 | −57% |
| cosmossport | 121 | 79 | −35% |

**Αιτία:** ο cascade απαιτεί ΟΛΑ τα requested style tags ως subset. Τα ανθρώπινα tags είναι τόσο αραιά που ελάχιστες παλέτες περνούν → −57% έως −83% επιλογές.

### Συμπέρασμα (επιβεβαιωμένο)
Το **insight είναι σωστό** (τα HSL style tags είναι perceptually ατελή· το warm υπερ-ταγκάρεται 3x). **ΑΛΛΑ το pure-human re-tag είναι λάθος trade** — το κέρδος ακρίβειας δεν αξίζει την απώλεια 60-80% των επιλογών. Βιώσιμο **μόνο ως hybrid**: human styles ∪ **high-confidence** HSL (πρόσθεσε HSL tag μόνο όταν είναι αναμφίβολο — π.χ. `dark` όταν meanL σαφώς κάτω από όριο, `warm` μόνο όταν κορεσμένο+ζεστό — ώστε να ανακτηθεί η πληρότητα χωρίς το over-broad warm).

**Σύσταση:** revert των HSL style tags από backup (επιστροφή στη γνωστή luminance+HSL κατάσταση)· το hybrid να γίνει μόνο μετά από σχεδιασμό του confidence gate, όχι βιαστικά.

## Technical handles
- Threshold/processing: `color-palette-analysis/src/process-palettes-v2.js:22`
- Classifier (vendored): `color-palette-analysis/src/color-tagger.cjs`
- v5 build: `brief-localhost/scripts/build-v5-bundles.cjs`
- Backup: `color-palette-analysis/backups/dev_color-palettes.<ts>.json`
- Matcher: `Platform/aws-microservices/services/query-colors/src/get-palettes-based-on-tags.ts` (`cascadeV3`)
