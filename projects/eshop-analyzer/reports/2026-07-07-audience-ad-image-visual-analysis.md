# Audience module — ad image visual analysis (reach-weighted contact sheet)

**Artifact (visual):** https://claude.ai/code/artifact/3703d09d-051f-476a-9b10-1a412a9599c3

**TL;DR:** Το `audience` module έκρινε "ποιον στοχεύει το brand" από reach counts + κείμενο + site screenshot, αλλά **δεν κοίταζε τις εικόνες των ads** — άρα έχανε το "ποιον απεικονίζει το brand". Τις εικόνες **τις έχουμε ήδη** (μάλιστα σε δικό μας S3). Λύση: extractor που φτιάχνει **ένα reach-weighted contact sheet 3×3** (top campaigns, deduped by ad-copy + strict perceptual net) και το ταΐζει σε audience + character. Σταθερό κόστος ~1.600 vision tokens ανεξαρτήτως πλήθους ads.

---

## Το πρόβλημα (gap που εντοπίστηκε)
Στο module-tree artifact, το audience gap έλεγε: *"τις εικόνες των posts/ads δεν τις διαβάζουμε (μόνο κείμενο + engagement), άρα το «ποιον απεικονίζει το brand» λείπει"*.

Λάθος διατύπωση για τα **ads**: δεν είναι "δεν τις έχουμε", είναι **"δεν τις περνάμε στο LLM"**.

## Τι υπάρχει όντως στα δεδομένα (verified σε test-stores)
- **Ads:** κάτω από `savedEvent.properties.ad.cards[]` υπάρχουν `original_image_url` / `resized_image_url` (fbcdn) **και `original_image_s3_url`** (δικό μας bucket, persistent) + `page_profile_picture_s3_url`.
- **Posts:** **δεν** κουβαλάνε image URL σε αυτό το data shape (μόνο `text` + video metrics, π.χ. `type: video_inline`, reel url). → πραγματικό data gap, εκτός scope τώρα.

### Πλήθος unique ad images ανά store
| store | ads | unique images |
|---|---|---|
| mamasaid | 28 | 61 |
| motoracing | 26 | 44 |
| michanossport | 12 | 18 |
| ergalia | 15 | 18 |
| gamestory | 6 | **0** |
| silvernose | 15 | **0** |

**Συμπέρασμα:** τεράστια διακύμανση + 2/6 στο μηδέν → οι εικόνες είναι **bonus signal, ποτέ dependency**. Το reach breakdown μένει η ραχοκοκαλιά· οι εικόνες προσθέτουν το "ποιον απεικονίζει".

## Γιατί όχι "όλες τις εικόνες"
Claude vision cost ≈ (w×h)/750 tokens, capped ~1.600/εικόνα (1568px).
- 61 ξεχωριστές εικόνες ≈ ~90-100k tokens **μόνο για audience**, ξανά για character → παράλογο.
- Το σήμα "ποιον απεικονίζει / τι vibe" **κορένει μετά τις ~8-10** εικόνες (diminishing returns).

## Η λύση: reach-weighted contact sheet
Ένα **grid 3×3** στα ~1536px = **~1.600 tokens flat**, ό,τι κι αν βάλεις μέσα. Σημασιολογικά καλύτερο: το LLM βλέπει το "mood board" του brand και κρίνει gestalt ("σταθερά γυναίκες 25-40 με μωρά").

### Ο αλγόριθμος
1. **Normalize + reach-sort:** ανά ad → `{reach, imgs[]}`, ταξινόμηση φθίνουσα κατά reach.
2. **Campaign dedup (PRIMARY — το κρίσιμο εύρημα):** group ads by normalized `ad_creative_bodies[0]` (fallback `link_titles[0]`). Ίδιο copy = ίδιο campaign = **ίδιο creative σε οποιοδήποτε aspect ratio** (feed square / story portrait / landscape). Το κάθε campaign κρατά μία **hero image** = 1ο card του ad με το μεγαλύτερο reach. Campaign reach = άθροισμα reach των ads του. Reach-rank campaigns.
3. **Perceptual net (SECONDARY, αυστηρό):** 16×16 aHash (256-bit) + greedy Hamming, threshold `HAM≤3`. Πιάνει **μόνο** την ίδια εικόνα re-uploaded κάτω από διαφορετικό copy. Measured: identical=0· το πιο σφιχτό different-product pair (δύο διαφορετικά λευκά sneakers σε λευκό φόντο, michanossport) = 6 → `≤3` πιάνει τα exact re-uploads χωρίς να λιώνει διαφορετικά product-on-white shots. (Το 8×8 loose net και το `HAM≤6` έλιωναν λευκά προϊόντα — απορρίφθηκαν.)
4. **Compose:** top-K campaigns → κάθε εικόνα tile 512×512 (`fit:contain` + letterbox), composite σε 3×512 grid, JPEG q82.

### Parameters
`K=9` (3×3), `CELL=512px` (→1536px sheet), perceptual net `16×16 aHash, HAM≤3`.

### Multi-store validation (4 stores με ads)
| store | ads | campaigns w/ images | sheet | αποτέλεσμα |
|---|---|---|---|---|
| mamasaid | 28 | 5 | **4** | maternity + kids· 1 identical COLORÉ κόπηκε σωστά |
| motoracing | 26 | 4 | **4** | moto chains/helmet/promo, distinct |
| michanossport | 12 | 3 | **3** | 3 διαφορετικά Converse (HAM≤3 ανέκτησε το χαμένο) |
| ergalia | 15 | 2 | **2** | industrial tools, distinct |

**Εύρημα:** πολλά ads έχουν **0 image cards** (michanossport 8/12, ergalia 12/15) → τα visual campaigns είναι συχνά λίγα· το sheet είναι ειλικρινά αραιό για κάποια stores (bonus signal, όχι dependency). Σε stores που διαφημίζουν **product-on-white** (michanossport/ergalia) το sheet λέει "τι" (προϊόντα) όχι "ποιον" — το "ποιον" το κουβαλά το reach.

> **Γιατί campaign-dedup κι όχι pixel-dedup:** μετρήθηκε ότι portrait vs landscape του ίδιου creative είναι **>16 hamming apart** σε κάθε global hash (aHash/dHash/cover-crop) — δεν πιάνεται σε ασφαλές threshold, γιατί στο ~11-13 αρχίζει να μπερδεύει *διαφορετικά* creatives. Το ad-copy είναι το μόνο σήμα που ταυτίζει το creative ανεξαρτήτως aspect ratio.

### Graceful degradation
- 0 images → κανένα sheet, audience μένει reach-only.
- <9 → μικρότερο grid.
- **1 sheet τροφοδοτεί και audience και character** (ίδιο asset, 2 prompts).

## Demo results (mamasaid, live)
Η εξέλιξη απέδειξε κάθε σχεδιαστικό σημείο:

| version | αποτέλεσμα | μάθημα |
|---|---|---|
| v1 (all cards by reach) | 6/9 ίδια φωτο | εξαντλεί τα cards του top ad → triplets |
| v2 (1-per-ad, url-dedup) | ~4 distinct σε 9 | ίδιο creative σε πολλά ad IDs → **url-dedup αποτυγχάνει** |
| v3 (+ 8×8 aHash) | 7 distinct, **αλλά 2 aspect-crop dups** | pixel-hash δεν πιάνει portrait vs landscape του ίδιου creative |
| v4-v5 (campaign dedup) | aspect dups έφυγαν, **1 identical re-upload έμεινε** | copy-grouping λύνει το aspect· μένει image reused σε άλλο copy |
| **final (campaign + 16×16 net)** | **4 distinct, μηδέν dup** | campaign primary + αυστηρό perceptual secondary |

Το τελικό sheet (mamasaid): **4 distinct campaigns** = maternity bazaar + COLORÉ kids + kids-in-grass + kids dress. Διαβάζεται μονομιάς ως **maternity + baby/kids, γυναίκες 25-40, feminine/bright/spring, sale-driven** — ταιριάζει με το reach (γυναίκες 25-44) και **προσθέτει** τη διάσταση "μητέρα + παιδιά" που τα νούμερα μόνα τους δεν δίνουν. (Το K=9 είναι ceiling· το mamasaid έχει ειλικρινά ~4 οπτικά διακριτά top campaigns.)

## Πλήρες input στο module (mamasaid, πραγματικά νούμερα)
Τι φτάνει στο audience LLM και τι δίνει το καθένα:

| πηγή | τιμή (mamasaid) | τι μας δίνει |
|---|---|---|
| `ads.age_country_gender_reach_breakdown` **(hard)** | F **86%** / M 13%· 25-34=47%, 35-44=40% (**87% γυναίκες 25-44**)· 100% GR· reach 159.398 | ο **σκληρός σκελετός** του κοινού, deterministic |
| `ads.target_ages/gender/locations/languages` | 18–65 · All · Greece · el | τι **δήλωσε** ο advertiser (πλατύ)· αξία στην **αντίθεση** με το reach |
| `posts.text` (55) | white-noise sleep machines, baby/premature clothing, μπουφάν/υπνόσακοι/μαγιό, Yumbox, maternity | **θέματα** → life stage (νέοι γονείς) + κατηγορίες· επιβεβαιώνει |
| `site screenshot` | feminine/bright, baby & maternity hero | **αυτοπαρουσίαση** brand (visual vibe) |
| **ad creative sheet** (3×3, ~1.600 tok) | 4 distinct: maternity bazaar + COLORÉ kids + kids-in-grass + kids dress | ποιον **απεικονίζει** — μητέρα **μαζί με** παιδιά· το κομμάτι που έλειπε |

**Insight (σύγκριση 2 πηγών):** targeting πλατύ (18-65, All) αλλά reach = γυναίκες 25-44 στο 87% → το κοινό είναι το ίδιο το προϊόν, όχι σχεδιαστική επιλογή. Γι' αυτό στηριζόμαστε στο **reach** (τι έγινε), όχι στο targeting (τι ζητήθηκε).

**Output:** `targetAudience` = γυναίκες 25-44, μητέρες/έγκυες · Ελλάδα/ελληνικά · life stage εγκυμοσύνη→βρέφος→παιδί · απεικόνιση feminine/bright · κίνητρο value/sale-driven. Reach (hard) = σκελετός· text+visual = life stage/απεικόνιση/κίνητρο.

## Επιλυμένο
Το aspect-crop dup (ίδιο creative σε portrait vs landscape) — **λύθηκε** με campaign (ad-copy) grouping, όχι με pixel hashing που αποδείχθηκε αναξιόπιστο για crops + product-on-white.

## Απόφαση / επόμενα
- **Approach κλειδωμένο**, validated σε 4 stores (βλ. πίνακα πάνω).
- Επόμενο: `adCreativeSheet` extractor (Wave 0) → feeds `audience` + `character`.
- Posts images: out of scope μέχρι να αλλάξει το scraping.
- Script POC: `contact-sheet.mjs` (Sharp — ήδη στο stack).

## Σχετικό ιστορικό (context)
Πλήρες index: `../research-history.md` (Φάση 6-7). Άμεσα σχετικά με τα ads:
- 🔗 [Επιπλέον πηγές δεδομένων](https://claude.ai/code/artifact/507ad415-c7b3-4860-9bec-aa25e41c90f5) — τα **ads = STRONG** πηγή· η μόνη για ENERGY (video/motion). Εκεί μπήκε το scope των ad creatives.
- 🔗 [Phase B v2 — multisource](https://claude.ai/code/artifact/433d36f7-5e35-47e0-9d40-fe91fdbb1769) — το **targetAudience έγινε deterministic** από Meta **reach breakdown** (το σκληρό σήμα). Το contact sheet εδώ είναι το **visual** συμπλήρωμα ("ποιον απεικονίζει") πάνω σε αυτό το reach — bonus signal, όχι backbone.
- 🔗 [Module dependency tree](https://claude.ai/code/artifact/12fb9fd1-e3fa-40a0-b623-7668c3426a61) — updated ώστε audience+character να δείχνουν πλέον ad-creative visual (μορφή + gap).
