# Palette Inventory Gap — Investigation Briefing

**Σκοπός αυτού του εγγράφου:** self-contained briefing για έναν agent που θα **διερευνήσει & λύσει** το πρόβλημα κάλυψης της βάσης παλετών. Δεν προϋποθέτει γνώση της προηγούμενης δουλειάς. Όλα τα νούμερα είναι μετρημένα (2026-06-05) και reproducible.

---

## TL;DR

Ένα σύστημα επιλέγει παλέτες χρωμάτων για βίντεο-διαφημίσεις, ταιριάζοντας «perceptual» χρωματικά tags (terracotta, navy, charcoal, sage, burgundy…) με μια βάση **11,387 παλετών** στο DynamoDB. Η βάση είναι **δραματικά skewed προς φωτεινά/κορεσμένα χρώματα**: το **bright** καλύπτει 32% των παλετών, το **dark** μόλις **5%**, και το **deep+desaturated** (σκούρο ΚΑΙ σβησμένο — εκεί ζει το premium/sophisticated aesthetic) μόλις **3%**.

Αποτέλεσμα: κάθε **σκούρο/earthy αίτημα αποτυγχάνει** να βρει match. Σε live test 7 καταστημάτων, ο matcher αναγκάστηκε να **πετάξει χρώματα** (το λεγόμενο «T5», loosest match) στο **97% των olive αιτημάτων, 92% burgundy/teal, 90% plum, 89% rust, 77% charcoal, 69% navy** — ενώ τα φωτεινά (yellow, coral, azure, orange…) είναι στο **0% T5** (πάντα βρίσκουν τέλειο match).

**Ζητούμενο:** εμπλούτισε τη βάση με παλέτες στο deep+desaturated τετράγωνο ώστε τα σκούρα/premium αιτήματα να βρίσκουν πραγματικά matches.

---

## 1. Background που χρειάζεται ο agent (self-contained)

**Τι κάνει το σύστημα:** Για κάθε e-shop, ένα LLM βγάζει 5 προτάσεις χρωμάτων. Κάθε πρόταση = μερικά **color tags** (primary + secondary) + **style tags** (bright/dark/warm/cold/pastel/monochromatic/…) + ένα mood. Ένα backend ταιριάζει αυτά τα tags με αποθηκευμένες παλέτες (έτοιμα σύνολα hex χρωμάτων) και επιστρέφει τις παλέτες που ταιριάζουν.

**Το χρωματικό λεξιλόγιο (41 perceptual tags):** Κάθε tag είναι καρφωμένο σε μια περιοχή του **HSL** χώρου (Hue, Saturation, Luminance). Παραδείγματα:
- `terracotta` = earthy muted orange (S 25-50, L 30-52)
- `navy` = very dark blue (L 10-30)
- `charcoal` = dark achromatic (L 12-35, S<10)
- `sage` = muted grey-green (S 12-38)
- `forest` = very dark green (L 12-30)
- `burgundy` = dark wine-red (L 8-30)

(Πλήρες λεξιλόγιο + HSL ranges: `brief-localhost/scripts/color-tagger.cjs`, σταθερά `TAGS` + `tagColor()`.)

**Πώς γίνεται το matching (5-tier cascade):** Κάθε αποθηκευμένη παλέτα έχει ένα attribute **`tagsV2`** = τα perceptual tags των χρωμάτων της (υπολογισμένα από τα hex μέσω του παραπάνω classifier). Ο matcher ζητάει «primary + secondary» tags και χαλαρώνει σταδιακά αν δεν βρει:
- **T1** = ταιριάζουν όλα (perfect)
- **T2** = ρίξε secondary χρώματα
- **T3** = ρίξε secondary styles
- **T4** = ρίξε όλα τα secondary
- **T5** = **ρίξε ένα primary χρώμα** (έσχατη λύση — το αίτημα δεν μπόρεσε να ικανοποιηθεί)

> **Το κλειδί:** υψηλό T5 σε ένα tag = «το LLM το ζητάει αλλά η βάση δεν το έχει σε χρησιμοποιήσιμο συνδυασμό». Δεν είναι bug του matcher — είναι **κενό δεδομένων**.

---

## 2. Το εύρημα (μετρημένα δεδομένα)

### 2.1 Ανισορροπία τετραγώνου (από 11,387 παλέτες)

| Περιοχή | Παλέτες | % |
|---|---|---|
| `bright` style | 3,738 | **32%** |
| `dark` style | 619 | **5%** |
| **deep+desaturated** (dark + ≥2 muted χρώματα) | **372** | **3%** ← το άδειο ράφι |

Αναλογία bright:dark ≈ **6:1**. Η βάση φτιάχτηκε για ένα παλαιότερο bright-centric σύστημα.

### 2.2 T5 rate ανά ζητούμενο χρώμα (από live run 7 καταστημάτων)

**Κάθε σκούρο/muted χρώμα είναι starved· κάθε φωτεινό είναι πλήρως stocked:**

| Σκούρο/muted | T5 rate | | Φωτεινό/pale | T5 rate |
|---|---|---|---|---|
| olive | **97%** (78/80) | | yellow | 0% (0/198) |
| burgundy | **92%** (74/80) | | coral | 0% (0/198) |
| teal | **92%** (61/66) | | azure | 0% (0/125) |
| plum | **90%** (9/10) | | orange | 0% (0/183) |
| rust | **89%** (78/87) | | blush | 0% (0/247) |
| crimson | **87%** (21/24) | | beige | 0% (0/247) |
| forest | **80%** (4/5) | | peach | 0% (0/247) |
| charcoal | **77%** (95/122) | | white | 0% (0/34) |
| black | **74%** (49/66) | | red | 0% (0/46) |
| navy | **69%** (162/232) | | sky-blue | 3% (2/59) |

(Ενδιάμεσα: cyan 55%, violet 52%, magenta 48%, slate 46%, mustard/terracotta 40%, amber 38%, cream 20%, taupe 15%.)

Συνολικά: **32% όλων των matched παλετών είναι T5**, συγκεντρωμένα ακριβώς στα tags που δικαιολογούν την ύπαρξη του perceptual λεξιλογίου.

### 2.3 Προσοχή — τα single-tag counts ΞΕΓΕΛΑΝΕ

Πόσες παλέτες περιέχουν κάθε tag (φαίνεται «εντάξει»):

| dark/muted | count | | bright/pale | count |
|---|---|---|---|---|
| charcoal | 754 | | cyan | 1539 |
| slate | 820 | | mint | 1733 |
| navy | 518 | | blush | 1764 |
| plum | 483 | | peach | 1897 |
| rust | 497 | | sky-blue | 1517 |
| olive | 324 | | orange | 1439 |
| forest | 234 | | red | 1420 |
| burgundy | 126 | | yellow | 1275 |
| mustard | 107 | | | |
| **maroon** | **0** | | | |

«charcoal 754» ακούγεται καλό — **αλλά αυτές είναι φωτεινές παλέτες που τυχαίνει να έχουν ΕΝΑ charcoal χρώμα** (charcoal + neon accent). Δεν υπάρχει **συνεκτικά σκούρα** παλέτα.

### 2.4 Το smoking gun — οι ζητούμενοι ΣΥΝΔΥΑΣΜΟΙ είναι μηδέν

Ο matcher χρειάζεται τον συνδυασμό, όχι το μεμονωμένο tag. Μέτρηση ακριβών combos που ζήτησε το LLM (ανά color-count bucket):

| Ζητούμενο combo | Παλέτες στη βάση |
|---|---|
| `charcoal + forest + plum` (dark, mono) | **0** |
| `navy + slate` (dark, mono) | **0** |
| `burgundy + rust` (dark, warm) | ~7 |
| `terracotta + olive` (vintage, warm) | ~27 |
| `navy + charcoal` (dark) | ~28 |
| *`cyan + magenta` (bright) — για σύγκριση* | **141** |

Όταν το αίτημα είναι `charcoal+forest+plum` και η βάση έχει **0**, ο matcher **υποχρεωτικά** πέφτει σε T5 και επιστρέφει μια άσχετη παλέτα (π.χ. γκρι + κόκκινο accent). Το ίδιο fallback επαναχρησιμοποιείται σε πολλά καταστήματα.

---

## 3. Root cause

Η βάση παλετών **δεν καλύπτει το deep+desaturated τετράγωνο του χρωματικού χώρου** (σκούρα ΚΑΙ σβησμένα χρώματα, συνεκτικά σε μία παλέτα). Το perceptual λεξιλόγιο + το LLM **ζητούν σωστά** premium σκούρες/earthy παλέτες, αλλά η προσφορά δεν υπάρχει. Code του matcher = σωστό· **το πρόβλημα είναι τα δεδομένα.**

---

## 4. Ζητούμενο για τον investigating agent

**Στόχος:** εμπλούτισε τη βάση ώστε τα σκούρα/muted/earthy combos να βρίσκουν πραγματικά (T1/T2) matches.

**Ανοιχτά ερωτήματα προς διερεύνηση:**
1. **Υπάρχει ήδη generator** που έφτιαξε τις 11,387 παλέτες; (στρέψ' τον στο dark-desat box) — αλλιώς σχεδίασε νέο.
2. **Generation αλγόριθμος:** πώς να συνθέσεις *αρμονικές* (όχι λασπωμένες) παλέτες 2-6 χρωμάτων που ζουν στο deep+desaturated (monochromatic ramps, analogous dark hues, dark-base + 1 muted accent). Ποιοι harmony κανόνες;
3. **Πόσες & ποιες combos** προτεραιότητα; (οι zero-combos πρώτα: charcoal/forest/plum/navy/slate/burgundy/rust/olive σε dark/monochromatic/vintage styles, σε όλα τα color-counts 2-6.)
4. **Tagging:** κάθε νέα παλέτα πρέπει να περάσει από τον ΙΔΙΟ classifier (`tagColor`/`paletteStyleTags`) → `tagsV2`, ώστε να ταιριάζει 1:1 με το matching.
5. **Validation:** μετά το insert, re-run και επιβεβαίωσε ότι τα T5 rates των σκούρων tags πέφτουν.
6. **Ποιότητα:** πώς να αποφύγεις muddy παλέτες (το συχνό πρόβλημα όταν απλώς desaturate-άρεις bright). Contrast/luminance spread για legibility κειμένου σε βίντεο.

---

## 5. Technical handles (πού να ψάξει / πώς να αναπαράγει)

**Παλέτες — DynamoDB:**
- Table: `dev_color-palettes` (region `eu-west-1`), **11,387 items**, primary key `name` (HASH) = το hex combo, π.χ. `2916C8-2CFCBE-E8498B-FE6A46-FEEE5F`.
- Item shape: `{ name, palette: [{color, luminance, hueCategory}], harmonyAnalysis, tags (legacy 12-hue), tagsV2 (41 perceptual — color+style ένωση) }`.
- Read profile: `gbInnovationsDeveloper` (DynamoDB read+write). Deploy/admin: `gbInnovationsAdmin`.
- Color-count ενός palette = `name.split('-').length`.

**Matcher (Lambda):**
- `Platform/aws-microservices/services/query-colors/src/get-palettes-based-on-tags.ts`
- Ενεργό path όταν `TAGS_FIELD=tagsV2` → function `cascadeV3()` (5-tier, primary/secondary). Κάνει full Scan όλων των παλετών ανά request, match `containsElementsOfSublist(p.tagsV2, requested)`.
- Live API: `POST https://smflq135bk.execute-api.eu-west-1.amazonaws.com/dev/palettes` body `{colorTags:{primary,secondary}, styleTags:{primary,secondary}}` (δέχεται και flat arrays).

**Classifier (η πηγή της αλήθειας για tags):**
- `brief-localhost/scripts/color-tagger.cjs` → `tagColor(hex)` (41 color tags, HSL decision tree) + `paletteStyleTags()` (8 style tags). **Χρησιμοποίησε ΑΥΤΟΝ για να tag-άρεις νέες παλέτες** (συνέπεια με το matching).

**Precomputed pool (τοπικό, γρήγορο για analysis):**
- `brief-localhost/.output/dry-run/per-palette.json` (9.5MB, 11,387 παλέτες με `name, ncolors, oldTags, newColorTags, newStyleTags, perColor`). Ίδια δεδομένα με το `tagsV2` της βάσης. Όλα τα νούμερα αυτού του report βγαίνουν από εδώ.

**Insert pattern (additive, idempotent):**
- `brief-localhost/scripts/backfill-tagsv2.cjs` — δείχνει πώς να γράψεις σε batch στο DynamoDB με `gbInnovationsDeveloper` (fromIni profile, UpdateCommand by `name`). Νέες παλέτες: PutItem με `{name, palette, harmonyAnalysis, tagsV2}`.
- API probe: `brief-localhost/scripts/probe-api-41.cjs` (POST tags → counts ανά bucket).

---

## 6. Reproduce (commands)

```bash
cd /Users/dionisis/Projects/brief-localhost
# Όλα τα νούμερα του report (quadrant, per-tag counts, T5 rates, combos):
#   βλ. το analysis script που παρήγαγε αυτά — διαβάζει .output/dry-run/per-palette.json
#   + τα bundles στο platform-client-v2/src/assets/brief-mocks-v4/store-*.json

# Live API check (πριν/μετά enrichment):
node scripts/probe-api-41.cjs        # terracotta/sage/navy vs azure/green counts

# DB scan (read) με Developer profile:
AWS_PROFILE=gbInnovationsDeveloper aws dynamodb scan --table-name dev_color-palettes \
  --region eu-west-1 --projection-expression "#n,tagsV2" \
  --expression-attribute-names '{"#n":"name"}' --max-items 5
```

---

## 7. Success criteria

- T5 rate των core dark/muted tags (olive, burgundy, teal, plum, rust, charcoal, navy, forest) πέφτει από 70-97% → κάτω από ~20%.
- Οι zero-combos (`charcoal+forest+plum`, `navy+slate`) έχουν ≥ μερικές δεκάδες παλέτες ανά color-count.
- Re-run των 7 καταστημάτων: τα premium/dark recs (Korres stealth, CoffeeIsland noir) δίνουν T1/T2 αντί T5, με συνεκτικά σκούρες/earthy παλέτες (όχι γκρι+κόκκινο).
- Καμία regression στα bright (παραμένουν 0% T5).
