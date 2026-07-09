# primaryIndustry Taxonomy Research

**TL;DR:** Το `primaryIndustry` enum έχει 15 hardcoded τιμές χωρίς Tools/Hardware, οπότε το ergalia.gr (εργαλεία) αναγκάστηκε να «snap» στο πλησιέστερο λάθος: Office Supplies. Δεν είναι bug κώδικα, είναι gap στην ταξινομία. Deep-research (5 άξονες, 24 πηγές, 97 claims, 25 verified με 3-vote adversarial) επιβεβαιώνει: (1) το forced snapping είναι εγγενές σε κλειστά enums με gap, (2) το Tools/Hardware είναι top-level σε ΟΛΑ τα standards και στην ελληνική αγορά, (3) η λύση είναι moderate-breadth MECE enum + sharp definitions με exclusions + ρητό "Other" escape hatch.

---

## Μέρος 1: Πώς παράγεται σήμερα το primaryIndustry

- **Κλειστό enum, 15 τιμές** — `src/utils/store-analysis.js:7-12`. Καμία Tools/Hardware.
- **Επιβάλλεται με structured output** — `ANALYSIS_SCHEMA` έχει `primaryIndustry: { enum: INDUSTRY_ENUM }`. Το μοντέλο ΔΕΝ μπορεί να βγάλει τιμή εκτός λίστας.
- **Το prompt απλά ξαναγράφει τη λίστα** (`store-analysis-system.md:129`), χωρίς οδηγία επιλογής ή fallback.
- **Ad-hoc προέλευση** — μπήκε σε ένα commit (`9ebd90c` migration), κανένα standard, κανένα design doc.
- **Downstream (εντός repo):** μόνο log + αποθήκευση σε DynamoDB/S3. Καμία branching λογική εδώ. Το καταναλώνει το έξω σύστημα (onboarding / video ads / lead scoring). Άρα ελευθερία redesign, αλλά αξίζει alignment με standard γιατί ταΐζει ad platforms.

**Γιατί βγήκε Office Supplies:** nearest-neighbor snap. Από 15 λάθος επιλογές, τα επαγγελματικά εργαλεία είναι σημασιολογικά πιο κοντά σε «professional supplies» παρά σε Electronics/Automotive. Least-wrong μέσα σε λάθος λίστα.

---

## Μέρος 2: Η έρευνα ανά άξονα (keypoints)

Κάθε άξονας: **τι ψάξαμε → τι βρήκαμε → πόσο δυνατό**.

### Άξονας 1 — Standard retail/product taxonomies
**Τι ψάξαμε:** πραγματικές δημοσιευμένες ταξινομίες (Google, GS1, IAB, Amazon, UNSPSC, NAICS): πόσα top-level, τι granularity.

**Τι βρήκαμε:**
- **Google Product Taxonomy:** ~21 top-level, με standalone `Hardware` (id 632, παιδιά Tools/Building Materials), ξεχωριστό από `Home & Garden`. Ταξινόμηση κατά «main function», ρητό όριο 1 κατηγορία/προϊόν (single-label).
- **GS1 GPC:** σταθερή 4-level ιεραρχία Segment > Family > Class > Brick. Το «primaryIndustry» αντιστοιχεί στο ευρύτερο level (Segment = «a particular industry»).
- **Amazon:** top-level department `Tools & Home Improvement`.

**Πόσο δυνατό:** ΔΥΝΑΤΟ. Primary sources, votes 3-0. Άμεσα σχετικό (product/store classification, όχι αναλογία).

### Άξονας 2 — Optimal breadth & MECE design
**Τι ψάξαμε:** ποιο είναι το «σωστό» πλήθος top-level κατηγοριών; trade-off λίγες (snapping) vs πολλές (confusion). IA / card-sorting / breadth-vs-depth literature.

**Τι βρήκαμε:**
- Moderate breadth κερδίζει, όχι πολύ λίγες, όχι τεράστια flat λίστα. UMD HCIL + Larson & Czerwinski: μεσαίο breadth νικά και το πιο βαθύ και το πιο πλατύ.
- Τα distinct top-level names μετράνε πιο πολύ στο 1ο επίπεδο (λάθος εκεί = ακριβό backtracking).
- Card-sorting (NNGroup): τα items «φαίνονται να ανήκουν σε 2+ groups» συχνά. Αυτή είναι η ουσία του MECE tension πίσω από το snapping.

**Πόσο δυνατό:** ΜΕΤΡΙΟ / ΑΝΑΛΟΓΙΑ. **Προσοχή: αυτό το κομμάτι είναι μελέτες navigation menus σε websites (human navigation), όχι πείραμα πάνω σε LLM enums.** Το χρησιμοποιούμε ως αναλογία για «πόσο μεγάλο enum». Τα specific νούμερα («16 links») ΑΠΟΡΡΙΦΘΗΚΑΝ (βλ. Μέρος 4). Ασφαλές takeaway: «μεσαίο, όχι 15, όχι 100».

### Άξονας 3 — Πού κάθεται το Tools/Hardware/DIY
**Τι ψάξαμε:** το Tools είναι top-level ή παιδί του Home & Garden;

**Τι βρήκαμε:** top-level παντού, ομόφωνα (3-0):
- **Amazon:** `Tools & Home Improvement` (node 228013), ρητά «industrial, professional, DIY customers, or all of the above», με dedicated attributes (Torque, Watts, RPM).
- **Google:** standalone `Hardware`.
- **GS1:** δικό του Tools/Hardware segment.

**Πόσο δυνατό:** ΔΥΝΑΤΟ. Primary sources, 3-0. Άμεση απάντηση στο bug: το ergalia.gr ανήκει σε dedicated Tools/Hardware, όχι Office Supplies.

### Άξονας 4 — LLM fixed-enum classification best practices
**Τι ψάξαμε:** πώς χειρίζεσαι το «none fits», single vs multi-label, ρόλος ορισμών/exclusions, escape hatch, accuracy vs πλήθος labels.

**Τι βρήκαμε:**
- **Forced snapping = εγγενές** (arXiv 2508.16478, 3-0): κλειστό enum με «conceptual gap» αναγκάζει μηχανικά το novel store στο «least wrong» class. Ακριβώς το bug μας.
- **Single-label ταιριάζει με το μοντέλο** (EMNLP 2025, arXiv 2505.17510, 3-0): τα LLMs κάνουν multi-label σαν ακολουθία single-label, κάθε βήμα ευνοεί έντονα μία ετικέτα. Άρα ένα primaryIndustry field είναι φυσικό fit.
- **Exclusions διορθώνουν overlap** (3-0): sharpen τον ορισμό + explicit exclusion που κατονομάζει τον confusable γείτονα. Πχ «Office Supplies: εξαιρεί επαγγελματικά/ηλεκτρικά εργαλεία → Tools & Hardware».
- **Escape hatch πρέπει να είναι ρητό enum member** (3-0): το constrained decoding επιβάλλει μία από τις τιμές (100% conformance). Το μοντέλο ΔΕΝ μπορεί να σηματοδοτήσει gap εκτός λίστας. Χρειάζεσαι `"Other"` + optional free-text secondary.
- **Πολλά labels + descriptions μαζί = accuracy collapse** στο high cardinality («lost in the middle»). CAVEAT: το πείραμα ήταν weak 7B μοντέλο (Banking77, 4.0 F1), μάλλον δεν μεταφέρεται σε Claude. Directional μόνο.

**Πόσο δυνατό:** ΔΥΝΑΤΟ για το «πώς» (single-label, exclusions, ρητό Other). Το «πόσα labels» directional.

### Άξονας 5 — Greek/European e-commerce verticals
**Τι ψάξαμε:** τι verticals υπάρχουν πραγματικά στην ελληνική αγορά.

**Τι βρήκαμε (convergent, 3 πηγές):**
- **ECDB:** 7 verticals, DIY = 8.8% της αγοράς ως δικό του.
- **Statista Greece:** 14 top-level, «DIY & Hardware Store» ξεχωριστό.
- **Mordor:** 7 segments, DIY first-class (bundled με Toys/Media).

**Πόσο δυνατό:** ΜΕΤΡΙΟ (secondary/market research), αλλά convergent. Επιβεβαιώνει: το DIY/Tools ΔΕΝ είναι niche στην Ελλάδα, δικαιολογεί top-level.

---

## Μέρος 3: Μεθοδολογία (για αξιολόγηση του τρόπου σκέψης)

Η deep-research δεν ήταν «ρώτα και γράψε». Pipeline με adversarial verification:

1. **Decompose** — η ερώτηση σπάστηκε σε 5 συμπληρωματικούς άξονες.
2. **Parallel search** — 5 agents ταυτόχρονα, ένας/άξονα.
3. **Fetch + extract** — 24 πηγές, εξαγωγή 97 falsifiable claims (με quote + source).
4. **Adversarial verify** — top 25 claims, το καθένα με 3 ανεξάρτητους skeptics που προσπαθούν να το ΚΑΤΑΡΡΙΨΟΥΝ. Χρειάζεται 2/3 refutes για να πεθάνει.
5. **Synthesize** — merge duplicates, ranking by confidence, με πηγές.

Αποτέλεσμα: 25 claims → **19 confirmed, 6 refuted**. Το ότι 6 απορρίφθηκαν είναι το σημαντικό: η μέθοδος έχει δόντια, δεν επιβεβαιώνει ό,τι βρει.

### Τι ΑΠΟΡΡΙΦΘΗΚΕ (μην στηριχτούμε σε αυτά)
- «IAB Content Taxonomy = ~34 tier-1» → 1-2 ✗
- «50-word descriptions βελτιώνουν πάντα το accuracy» → 1-2 ✗
- «GS1 GPC = ~40.000 κατηγορίες» → 1-2 ✗
- «IA converges σε ~16 top-level links» → 1-2 ✗
- Specific breadth layouts (4x16 fastest) → 0-3 ✗

Δηλαδή τα «μαγικά νούμερα» έπεσαν. Ό,τι έμεινε είναι το ποιοτικό: «moderate breadth», «Tools top-level», «single-label + exclusions + Other».

### Πού να είσαι επιφυλακτικός
- Το breadth-vs-depth είναι αναλογία από human menus, όχι LLM πείραμα.
- Το Banking77 collapse είναι 7B μοντέλο, όχι Claude.
- Κάποιες πηγές arXiv preprints (όχι peer-reviewed).
- Η τελική προτεινόμενη taxonomy είναι synthesis, όχι αντιγραμμένη από ένα authoritative source.

---

## Μέρος 4: Πρόταση taxonomy (~19, MECE, mapped σε Google Product Taxonomy)

| # | Κατηγορία | Σημείωση / exclusion |
|---|---|---|
| 1 | Electronics & Technology | |
| 2 | Fashion & Apparel | + accessories, bags |
| 3 | Jewelry & Watches | |
| 4 | Health & Beauty | cosmetics, personal care |
| 5 | Pharmacy & Medical | Rx, parapharmacy, ιατρικά |
| 6 | Food & Grocery | γενικό σούπερ μάρκετ |
| 7 | Coffee, Beverages & Fine Foods | keep (business cat), εξαιρεί γενικό grocery |
| 8 | Home & Garden | décor, κήπος, εξαιρεί έπιπλα + εργαλεία |
| 9 | Furniture & Home Furnishings | Greek market 11.9%, μεγάλο |
| 10 | **Tools, Hardware & DIY** ← NEW | power/hand tools, οικοδομικά, επαγγελματικός εξοπλισμός |
| 11 | Automotive & Powersports | parts, accessories |
| 12 | Baby & Kids | |
| 13 | Toys & Games | |
| 14 | Sports & Outdoors | |
| 15 | Pet Supplies | |
| 16 | Books & Media | βιβλία, μουσική, film |
| 17 | Hobbies & Crafts | art supplies, όργανα, collectibles (optional) |
| 18 | Office & Business Supplies | εξαιρεί επαγγελματικά εργαλεία → #10 |
| 19 | **Other** ← NEW | ρητό escape hatch |

**Αλλαγές vs τωρινό 15:** +Tools/Hardware, +Furniture (split από Home & Garden), +Hobbies & Crafts, +Other. Landing ~19 (μέσα στο moderate-breadth range).

**Συνοδευτικά changes στο prompt/schema:**
- Κάθε κατηγορία με 1-line ορισμό + exclusion clause που κατονομάζει τον confusable γείτονα.
- `"Other"` ως ρητό enum value (constrained decoding το απαιτεί).
- Optional free-text `secondaryIndustry` για να αναδύεται το πραγματικό vertical των "Other" + seed για periodic gap review.

---

## Ανοιχτές αποφάσεις (pending)
1. Granularity Tools: μία κατηγορία (Amazon-style) vs split σε 2-3 (industrial/DIY/garden).
2. Μέγεθος: ~19 (πρόταση) vs minimal fix (15 + Tools + Other) vs πλήρες Google top-level (~21).
3. Escape hatch: Other enum + free-text secondary (rec) vs μόνο Other vs καθόλου.

## Πηγές-κλειδιά
- Google Merchant Center product category — support.google.com/merchants/answer/6324436
- Amazon Tools & Home Improvement style guide (node 228013)
- GS1 GPC — gs1.org/standards/gpc/how-gpc-works
- LLM-as-classifier / conceptual gap — arXiv 2508.16478
- LLMs do multi-label as sequential single-label — arXiv 2505.17510 (EMNLP 2025)
- High-cardinality collapse — arXiv 2501.12332
- Greek market verticals — ECDB, Statista Greece, Mordor Intelligence
