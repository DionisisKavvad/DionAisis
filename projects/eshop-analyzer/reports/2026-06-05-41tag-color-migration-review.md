# 41-tag Perceptual Color Migration — Υλοποίηση & Κριτικό Review

**Ημερομηνία:** 2026-06-05
**Scope:** brief-localhost (color step) · aws-microservices/query-colors (Lambda) · DynamoDB `dev_color-palettes` · platform-client-v2 (v4 mocks)

---

## TL;DR

Μεταφέραμε το color step του brief από ένα **χονδρικό 12-hue λεξιλόγιο** (που έδινε neon παλέτες σε ΟΛΑ τα brands, ακόμα και στα premium) σε ένα **41-tag perceptual λεξιλόγιο** (terracotta, sage, navy, charcoal, burgundy…). Το κάναμε **χωρίς migration** των υπαρχόντων δεδομένων: γράψαμε τα νέα tags σε ένα **καινούργιο attribute `tagsV2`** (κρατώντας το παλιό `tags` ανέγγιχτο) και αλλάξαμε το Lambda να ταιριάζει σε αυτό με έναν **5-tier cascade**.

**Αποτέλεσμα μετά από review 3 ειδικών (design theory, color, devil's advocate):**
- ✅ **Το «αίτημα» βελτιώθηκε γνήσια** — το LLM πλέον ζητάει σωστά, brand-appropriate χρώματα + moods (Korres → santorini-heritage, CoffeeIsland → noir, Jumbo → candy-pop).
- ❌ **Η «παράδοση» (τα τελικά hex) είναι σπασμένη στο ~⅓** — η βάση παλετών είναι skewed bright, οπότε τα σκούρα/muted αιτήματα πέφτουν σε loose matches που **αλλάζουν χρώμα** (ζητάς forest/navy, παίρνεις κόκκινο) και **επαναχρησιμοποιούνται** σε πολλά καταστήματα.
- ⚠️ **Μετρήσαμε ένα layer πολύ νωρίς:** κρίναμε τα tags/moods (που τα ελέγχει το LLM, βγαίνουν ωραία), όχι τα τελικά hex (που τα ελέγχει το inventory της βάσης, είναι skewed).

**Πρακτικά:** σήμερα μόνο το **Korres** δίνει αληθινά premium παλέτες. Το fix-κλειδί δεν είναι κώδικας — είναι **εμπλουτισμός του inventory** στο deep+desaturated άκρο.

---

## 1. Το πρόβλημα που ξεκινήσαμε να λύνουμε

Το brief παράγει για κάθε βίντεο-διαφήμιση: **παλέτα χρωμάτων + ζευγάρια γραμματοσειρών + CTA κείμενο**. Είσοδος = τα 26 brand-characteristics ενός καταστήματος (tier + tags με confidence) + audience + προϊόντα.

Στο πρώτο πέρασμα (12-hue) είδαμε ότι **όλα τα καταστήματα έβγαζαν παρόμοιες φωτεινές παλέτες**, ακόμα και τα premium. Παράδειγμα: το **Korres** (premium φυσικά καλλυντικά, Clean/Sophisticated/Minimalist) έπαιρνε **neon chartreuse/green**. Ο λόγος: το λεξιλόγιο είχε **μόνο 12 καθαρές αποχρώσεις** (red, green, azure…) + 8 styles (bright, dark, pastel…). **Δεν υπήρχε λέξη για «muted/earthy/deep»** — οπότε όταν το brand χρειαζόταν σταχτί-φασκόμηλο, οι μόνες επιλογές ήταν «green» + «pastel», και το downstream τράβαγε ένα έντονο hex.

**Συμπέρασμα:** το bottleneck ήταν το **λεξιλόγιο**, όχι ο αλγόριθμος.

---

## 2. Τι υπήρχε ήδη (και γιατί δεν ήταν live)

Υπήρχε ένα **πειραματικό 41-tag perceptual λεξιλόγιο** (`final-color-tag-prompt-v3.md`) όπου κάθε tag είναι καρφωμένο σε μια περιοχή του HSL χώρου:
- `terracotta` = earthy muted orange (saturation 25-50, luminance 30-52)
- `navy` = very dark blue (luminance 10-30)
- `sage` = muted grey-green (saturation 12-38)
- `charcoal` = dark achromatic, … (41 συνολικά)

**ΑΛΛΑ ποτέ δεν είχε συνδεθεί στο production.** Είχε χρησιμοποιηθεί μόνο από standalone test scripts. Η παραγωγική αλυσίδα έτρεχε ακόμα 12-hue.

Επιπλέον, τα 41 tags είχαν **ήδη υπολογιστεί offline** για όλες τις 11,387 παλέτες (`dry-run-retag.cjs` → `.output/dry-run/per-palette.json`) — αλλά **ποτέ δεν γράφτηκαν πίσω στη βάση**. Άρα το «δύσκολο» (re-tagging) είχε γίνει· έλειπε μόνο το delivery σε production.

---

## 3. Τι χτίσαμε — η αρχιτεκτονική

Επιλέξαμε τον **πιο καθαρό & reversible** δρόμο: **additive attribute, όχι migration.**

### 3.1 Βήμα 1 — Backfill σε νέο attribute `tagsV2`
Γράψαμε σε κάθε μία από τις **11,387 παλέτες** της βάσης `dev_color-palettes` ένα **νέο πεδίο `tagsV2`** = τα 41-tag (color + style) που είχαν ήδη υπολογιστεί.
- Το παλιό `tags` (12-hue) **μένει ανέγγιχτο** → instant rollback ανά πάσα στιγμή.
- Join με primary key `name` (μοναδικό, 11,387/11,387).
- Idempotent script, **100% coverage, 0 errors**.
- Γιατί νέο attribute: αν κάτι πάει στραβά, απλά γυρνάμε το query πίσω στο `tags`. Καμία απώλεια.

### 3.2 Βήμα 2 — Lambda: 5-tier cascade πάνω στο `tagsV2`
Το `query-colors` Lambda παίρνει tags και επιστρέφει παλέτες. Το αλλάξαμε ώστε:
- **Feature flag `TAGS_FIELD`** (`tags` = legacy, `tagsV2` = perceptual). Όταν είναι `tagsV2`, τρέχει **αποκλειστικά** ο νέος cascade· το legacy path μένει ανέγγιχτο.
- **No silent fallback** (απόφασή σου): αν μια παλέτα δεν έχει `tagsV2`, απλά δεν ταιριάζει — και το Lambda **log-άρει πόσες λείπουν** (θόρυβος, όχι σιωπή).
- **Ο 5-tier cascade** (πορταρισμένος από το validated v3 πείραμα): δέχεται nested `{primary, secondary}` tags και χαλαρώνει σταδιακά αν δεν βρει τέλειο match:
  - **T1** = όλα (primary + secondary, color + style)
  - **T2** = ρίξε τα secondary χρώματα
  - **T3** = ρίξε τα secondary styles
  - **T4** = ρίξε όλα τα secondary
  - **T5** = ρίξε ένα primary χρώμα (έσχατη λύση)

  Η ιδέα: όσο πιο χαμηλό tier, τόσο πιο πιστό το match. **Το T5 σημαίνει ότι η βάση δεν είχε καλό match και αναγκαστήκαμε να πετάξουμε ένα βασικό χρώμα** — κρατήστε αυτό, είναι το κλειδί του review.

### 3.3 Βήμα 3 — Deploy & verify (LIVE)
Deploy με `gbInnovationsAdmin`. Επιβεβαίωση στο πραγματικό API:
- `terracotta` → **150 παλέτες** (πριν: **0**), `sage` → 150, `navy` → 150
- `azure`/`green` (12-hue) συνεχίζουν να δουλεύουν (είναι κι αυτά valid tagsV2)

### 3.4 Βήμα 4 — Workflow: v3 prompt + nested schema
Στο brief-localhost:
- **`COLOR_VOCAB=perceptual`** (default) → φορτώνει το 41-tag prompt + **nested primary/secondary** output schema. `legacy` flag για revert.
- Ο `PaletteEnricher` στέλνει το nested structure ως έχει στο Lambda (το Lambda το δέχεται).
- Τρέξαμε και τα **7 καταστήματα** end-to-end (μέσω του LIVE path) → rebuild v4 bundles → review.

**Καθαρό σημείο αρχιτεκτονικής:** όλη η αλυσίδα είναι gated πίσω από flags (`TAGS_FIELD`, `COLOR_VOCAB`) → reversible χωρίς να σβήσουμε τίποτα.

---

## 4. Το canary που δικαιολόγησε τη δουλειά

Πριν αγγίξουμε production, τρέξαμε **Korres + Jumbo** στο 41-tag (τοπικά). Το αποτέλεσμα ήταν αποφασιστικό:
- **Korres** (premium organic): από neon chartreuse → **terracotta/cream/olive** (santorini-botanical-heritage), **navy/charcoal/teal** (stealth-luxury). Earthy/premium.
- **Jumbo** (budget playful): έμεινε **bright** (kinetic-primary-playroom, candy-pop).

Η διάκριση premium-organic vs budget-playful που το 12-hue **δεν μπορούσε** να εκφράσει, εμφανίστηκε. **Αυτό δικαιολόγησε όλη τη migration.** (Σημείωση review: αυτό το canary χρησιμοποίησε το ΤΟΠΙΚΟ pool — βλ. §6.5.)

---

## 5. Τα αποτελέσματα στα 7 καταστήματα (live)

Τα tags + moods που **ζήτησε** το LLM ήταν εξαιρετικά:

| Store | tier | Χαρακτηριστικά recs |
|---|---|---|
| Korres | premium | aegean-editorial-minimal, santorini-sunbaked-heritage, clinical-spa, stealth-luxury |
| CoffeeIsland | premium | stealth-luxury-**noir** (charcoal/burgundy/rust), heritage-roastery |
| Pharmacy4u | mainstream | clinical-blue-authority, soft-skincare-calm, mediterranean-heritage |
| Plaisio/Public | mainstream | neon-tech-pulse, stealth-corporate, electric-azure |
| Cosmossport | mainstream | kinetic-citrus-pop, stealth-tech-noir |
| Jumbo | budget | candy-pop, confetti-party-burst, retro-toybox |

**Σε επίπεδο αιτήματος, ο στόχος επιτεύχθηκε.** Το πρόβλημα είναι ένα layer πιο κάτω.

---

## 6. Το κριτικό review (3 ειδικοί) — αναλυτικά

Τρέξαμε 3 ανεξάρτητους reviewers (design theory · color science · devil's advocate) πάνω στα **πραγματικά hex**. **Συνέκλιναν σκληρά.**

### 6.1 Το «αίτημα» κέρδισε (και οι 3 συμφωνούν)
Το λεξιλόγιο + το mood reasoning είναι brand-literate. Τα moodLabels (santorini-heritage, stealth-noir, candy-pop) είναι **actionable creative direction** για designer, όχι διακοσμητικά ονόματα. Το Korres rec#1-2 και CoffeeIsland #1/#4 είναι **αληθινά premium** και στα hex (μετρημένα: muted blues, earthy terracotta, dark coffee ramps).

### 6.2 Η «παράδοση» σπάει στο ~⅓ — T5
**32% όλων των matches είναι T5** (ο cascade πέταξε ένα primary χρώμα). Και είναι **συγκεντρωμένο ακριβώς στα tags που δικαιολογούν τη migration:**

| Σκούρο/muted tag | T5 rate | | Φωτεινό/pale tag | T5 rate |
|---|---|---|---|---|
| olive | 98% | | yellow | 0% |
| burgundy | 92% | | coral | 0% |
| teal | 92% | | orange | 0% |
| charcoal | 78% | | azure | 0% |
| navy | 70% | | white | 0% |

Δηλαδή: **κάθε earthy/deep χρώμα είναι starved· κάθε bright είναι πλήρως stocked.**

### 6.3 Hue-flip: ζητάς πράσινο, παίρνεις κόκκινο (όχι «graceful degradation»)
Όταν ο cascade ρίχνει το primary χρώμα, βάζει ό,τι έχει — και αυτό συχνά είναι **λάθος απόχρωση**:
- Μία παλέτα `#313131 #414141 #525252 #CA3E47` (3 σταχτί + 1 **κόκκινο**) επιστρέφεται για **4 διαφορετικά καταστήματα**, σε αιτήματα «charcoal,**forest**,plum» / «charcoal,**navy**,slate» / «**burgundy**». Ζήτησαν πράσινο/μπλε/μπορντό → πήραν **κόκκινο**.
- «burgundy,amber,rust» → επιστρέφει `#174A63(teal) #243A03(olive) #582327 #775004` — μόνο 1 στα 4 είναι όντως burgundy.

Αυτό **δεν** είναι ευγενική υποβάθμιση· είναι **αλλαγή χρώματος μασκαρεμένη ως match**.

### 6.4 Cross-store reuse: 35 recs → 22 unique (37% recycled)
Η ίδια neon παλέτα `#0038EA,#00DBEE,#5816E7,#E300EB` σε public + plaisio + cosmossport. Η ίδια charcoal+red σε 4 stores (incl. premium Korres).

**Το πιο καταδικαστικό εύρημα (devil's advocate):**
> **Korres (premium) rec#5 `#7FE7CC,#DFE38E,#EFCA8C,#F17E7E` είναι BYTE-IDENTICAL με Jumbo (budget) rec#1.**

Δηλαδή το premium φαρμακευτικό-καλλυντικό brand πήρε **ακριβώς** την candy παλέτα του budget παιχνιδάδικου. **Το ίδιο bug που υποτίθεται διορθώσαμε**, απλώς κρυμμένο πίσω από διαφορετικό όνομα (`kinetic-citrus-vital` vs `kinetic-candy-pop`).

### 6.5 Premium↔budget διάκριση: αδύναμη, σχεδόν αντεστραμμένη
Μετρημένο median saturation:
- Korres (premium): **0.38** ✅
- CoffeeIsland (premium): **0.65** ❌
- Jumbo (budget): **0.50**

**Το budget Jumbo είναι λιγότερο saturated από το premium CoffeeIsland.** Μόνο το Korres είναι όντως muted. Η «διάκριση» οφείλεται κυρίως στα **ονόματα**, όχι στα hex.

### 6.6 Το δικό μου λάθος μέτρησης (το παραδέχομαι)
Το `best-tier` που παρουσίασα στο HTML/data **υπερεκτιμά**: υπολογίζεται σε όλα τα color-count buckets (2-6 χρωμάτων), αλλά **η 4-color παλέτα που βλέπει ο designer είναι συχνά χειρότερο tier**. Π.χ. Korres stealth: advertised **T2**, delivered **T5**. **9/35** shown palettes χειρότερα από το advertised.

> **Το βασικό λάθος:** validate-αρα το **prompt** (tags + moods, που τα ελέγχει το LLM και βγαίνουν ωραία), όχι το **product** (τα hex, που τα ελέγχει το inventory και είναι skewed). Μετρήσαμε ένα layer πολύ νωρίς.

---

## 7. Τίμιο verdict

**Partial improvement, oversold.**
- Το **request layer** βελτιώθηκε γνήσια → **κρατάμε το 41-tag**.
- Το **delivery layer** σήμερα δίνει αληθινό όφελος **μόνο στο Korres** (rec#1-2). Για τους υπόλοιπους, το neon/recycled επιβιώνει επειδή αυτό έχει η βάση.
- Η αρχιτεκτονική (additive tagsV2 + cascade + flags) είναι **σωστή και reversible** — το πρόβλημα είναι **τα δεδομένα**, όχι ο κώδικας.

---

## 8. Fix priority (από τη σύγκλιση των 3)

1. 🔴 **Εμπλουτισμός inventory στο deep+desaturated quadrant** (L<30 & S<35: navy/charcoal/forest/plum/burgundy/olive/teal/rust). Σήμερα μόνο **8%** των swatches ζει εκεί, και αυτό τροφοδοτεί όλο το 447-palette T5 σωρό. **Single highest-leverage.** Χωρίς αυτό, τα υπόλοιπα είναι μπαλώματα.
2. 🟠 **Cascade guardrail — no hue-flip.** Όταν ρίχνει primary χρώμα, ο substitute να μένει στο requested hue/luminance band, ή true monochrome του χρώματος που κρατήθηκε — όχι high-sat off-hue accent (`#CA3E47` σε charcoal brief). Φθηνό, σταματά τα χειρότερα breaks πριν καν φτιαχτεί το inventory.
3. 🟡 **Cap saturation σε premium recs (~S65)** στο selection → σταματά τα S100 neon options που περνάνε στο T1.
4. 🟡 **De-dup παλετών ανά store** + σταμάτα το force-fit «stealth-luxury» σε κάθε brand (6/7 stores το πήραν).
5. 🟢 **Report delivered tier** (της 4-color παλέτας που πραγματικά δείχνεις), όχι best-across-buckets. + νέο metric: % recs με delivered primary hue εντός 30° του requested.

---

## 9. Ο τίμιος έλεγχος που εκκρεμεί (για να μη ξανα-ξεγελαστούμε)
1. **Blind classification:** πάρε ΜΟΝΟ τα delivered hex (χωρίς ονόματα/tags), δώσ' τα σε ανθρώπους να τα βάλουν premium/mainstream/budget. Αν είναι ~chance → η διάκριση είναι **naming, όχι χρώμα**.
2. **12-hue baseline A/B:** δεν κρατήσαμε το παλιό 12-hue output στο disk → το «clear win vs 12-hue» είναι προς το παρόν **unfalsifiable**. Ανακατασκεύασέ το και κάνε A/B στα delivered hex.

---

## 10. Κατάσταση & επόμενα

**LIVE / committed-ready (uncommitted στα repos):**
- ✅ DynamoDB `tagsV2` backfill (11,387/11,387)
- ✅ Lambda cascade deployed (dev), verified
- ✅ Workflow `COLOR_VOCAB=perceptual` + nested schema
- ✅ 7 v4 bundles + visual report

**Εκκρεμεί απόφαση:** πού πάμε — (α) inventory enrichment (#1, το κλειδί), (β) cascade guardrail (#2, φθηνό patch), (γ) ο τίμιος έλεγχος §9, ή (δ) rollback flags στο legacy μέχρι να φτιαχτεί το inventory.

---

## 11. Αρχεία που άλλαξαν
- `brief-localhost/src/workflow/brief-workflow.js` (COLOR_VOCAB, nested schema)
- `brief-localhost/src/services/palette-enricher.js` (nested-safe)
- `brief-localhost/scripts/{backfill-tagsv2,build-v4-bundles,probe-api-41}.cjs`
- `aws-microservices/services/query-colors/src/get-palettes-based-on-tags.ts` (TAGS_FIELD, cascadeV3, loud missing counter)
- `aws-microservices/services/query-colors/serverless.yml` (TAGS_FIELD: tagsV2)
- DynamoDB `dev_color-palettes` (+`tagsV2` attribute, additive)
- `platform-client-v2/src/assets/brief-mocks-v4/store-*.json` (7 bundles)
- `eshop-analyzer/reports/v4-stores-review.html` (visual)

---

## 12. Tier statistics (αναλυτικά, 7 stores)

Το match-tier μετράει πόσο πιστά ταίριαξε η βάση στο αίτημα του LLM: **T1 = perfect** (όλα τα tags), **T2** = drop secondary colors, **T3** = drop secondary styles, **T4** = drop both secondaries, **T5 = drop a primary color (loosest, σπασμένο)**.

### (α) Ανά παλέτα-variant (όλα τα buckets 2-6 χρωμάτων, όλα τα recs)

| Store | tier | T1 | T2 | T3 | T4 | T5 | Total | T5% |
|---|---|---|---|---|---|---|---|---|
| korres | premium | 22 | 101 | 0 | 0 | 24 | 147 | 16% |
| **coffeeisland** | premium | 45 | 78 | 4 | 9 | **105** | 241 | **44%** |
| public | mainstream | 11 | 41 | 8 | 12 | 27 | 99 | 27% |
| cosmossport | mainstream | 9 | 123 | 0 | 28 | 49 | 209 | 23% |
| pharmacy4u | mainstream | 26 | 105 | 0 | 34 | 83 | 248 | 33% |
| plaisio | mainstream | 1 | 34 | 8 | 33 | 26 | 102 | 25% |
| **jumbo** | budget | 2 | 160 | 0 | 17 | **133** | 312 | **43%** |
| **ΣΥΝΟΛΟ** | | **116** | **642** | **20** | **133** | **447** | **1358** | |
| **%** | | **8%** | **47%** | **1%** | **9%** | **32%** | | |

### (β) Ανά recommendation (35 = 7 stores × 5 recs)

| Metric | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|
| **best-tier** (καλύτερο σε όποιο bucket) | 14 | 9 | 3 | 3 | 6 |
| **shown** (η 4-color παλέτα που ΟΝΤΩΣ βλέπει ο designer) | **7** | 14 | 3 | 4 | **7** |

**9/35 recs υποβαθμίζονται** από best→shown (το «best-tier» metric υπερεκτιμά):
korres#4 (T2→**T5**), jumbo#1 (T2→T4), korres#3 · coffeeisland#2 · coffeeisland#4 · cosmossport#5 · plaisio#4 · jumbo#2 · jumbo#3 (T1→T2).

### Ανάγνωση
- **Το τίμιο νούμερο είναι το «shown»:** μόνο **7/35 recs (20%)** δίνουν T1 στην παλέτα που πραγματικά χρησιμοποιείται· **7/35 (20%) είναι T5** (σπασμένα). Τα μισά κάθονται σε T2 (αποδεκτά matches).
- **Χειρότερα = τα πιο "σκούρα" stores:** CoffeeIsland (premium noir) **44% T5**, Jumbo **43% T5** (τα muted/retro/pastel recs του). Επιβεβαιώνει ότι σπάει όποιος ζητάει dark/muted.
- **Καλύτερο = Korres (16% T5):** οι παλέτες του (sky-blue/cream/terracotta) ζουν στο μέρος του χώρου που ΕΧΕΙ stock.
- **T1 παντού χαμηλό (8% variant / 20% rec):** σχεδόν τίποτα δεν είναι perfect match — η βάση δεν έχει πυκνότητα για τα ακριβή combos.

> Το 32% T5 (variants) / 20% T5 (shown recs) είναι ακριβώς το μέγεθος της τρύπας που στοχεύει το inventory enrichment (§8.1).

---

> Σχετικά: e2e `2026-06-04-brand-characteristics-e2e-test.md` · validation `2026-06-04-validation-stability-projection.md` · SDK bug `2026-06-04-sdk-crash-investigation.md`
