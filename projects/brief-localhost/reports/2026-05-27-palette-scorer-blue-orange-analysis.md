# Palette scorer analysis — run 2536bbd2 (Greek brief, blue+orange winner)

**TL;DR:** Ο palette scorer v2 διαλέγει το recommendation **#4 (blue+orange / bright+gradient)** με οριακή νίκη (7.54 vs 7.48). Αλλά μέσα στο pool παλετών που γυρίζει η query-colors σε `weighted` mode, οι πραγματικές blue+orange παλέτες εμφανίζονται **πιο κάτω** στις περισσότερες ομάδες — όχι στην κορυφή. Μόνο στο 6colors group ανεβαίνουν 1η/2η θέση. Λόγος: ο weighted scorer βαραίνει τα style tags (0.5) πάνω από τα color tags (0.3), οπότε orange-only παλέτες με 2/2 style match κερδίζουν blue+orange παλέτες που έχουν μόνο 1/2 style match.

---

## 1. Το brief που έτρεξε

Από `logs/color-workflow.log` του run `2536bbd2-2cd8-4f90-8820-d1f5253dfaa0`:

```json
{
  "characteristics": ["Παιδικό", "fun", "energetic"],
  "audience": { "country": "Greece", "ageGroup": ["25-34"], "gender": ["Male","Female"] },
  "placement": "igPost",
  "products": [
    { "price": "€38,80", "oldPrice": "" },          // furniture, no discount
    { "price": "€40,00", "oldPrice": "€80,00" },    // sneaker, 50% off
    { "price": "€25,00", "oldPrice": "€50,00" },    // sneaker, 50% off
    { "price": "€70,00", "oldPrice": "€80,00" }     // sneaker, 12% off
  ]
}
```

Σημείωση: το `inputs/input.json` αυτή τη στιγμή στο repo δείχνει διαφορετικό brief (England / Clean+Modern+Slick / reels). Αυτό **δεν** είναι το brief του 2536bbd2. Το πραγματικό είναι από τα logs.

---

## 2. Επιλογή recommendation (Track 2 scorer)

### Τα 5 candidates που γύρισε το LLM

| # | colorTags | styleTags |
|---|---|---|
| 1 | orange + yellow + cyan | bright + gradient |
| 2 | magenta + cyan + yellow | bright + pastel |
| 3 | spring-green + yellow | bright + warm |
| 4 | blue + orange | bright + gradient |
| 5 | rose + cyan + chartreuse | pastel + gradient |

### Πώς δουλεύει ο scorer σε απλά λόγια

Ο scorer βγάζει πρώτα μερικά "σήματα" από το brief (booleans), μετά για κάθε recommendation κάνει **4 αθροίσματα** + μερικά penalties, και επιστρέφει σκορ. Σειρά = score DESC.

### Σήματα που βγήκαν από το brief

| Σήμα | Τιμή | Γιατί |
|---|---|---|
| `fastSocial` | **false** | "igPost" δεν matchάρει `{reels, tiktok, igstory, fbstory, igreel, fbreel, story, shorts}` |
| `slow` | **false** | "igPost" δεν matchάρει `{posts, post, youtube}` — **bug**, λογικά είναι "slow" |
| `age1824` | **false** | μόνο "25-34" στο ageGroup |
| `age35plus` | **false** | καμία ηλικία ≥35 |
| `discount` | **true** | 3 από 4 προϊόντα έχουν `oldPrice > price` |
| `characteristics` | `["παιδικό", "playful", "energetic"]` | Μετά από aliases: `"fun"→"playful"`. Τα `"παιδικό"` και `"energetic"` ΔΕΝ υπάρχουν στον πίνακα → silently 0 |

### Term A — Placement / Audience / Promo (×1.0)

Από όλες τις στήλες του Table A ενεργοποιείται **μόνο η `discount`**. Όλες οι άλλες είναι false.

Βρίσκουμε κάθε styleTag του recommendation στον πίνακα και διαβάζουμε τη στήλη `discount`:

| styleTag | discount column |
|---|---|
| bright | +1.5 |
| gradient | +0.5 |
| pastel | −1.0 |
| dark | 0 |
| warm | 0 |
| cold | 0 |
| monochromatic | 0 |
| vintage | −0.5 |

| # | styleTags | Term A |
|---|---|---|
| 1 | bright+gradient | 1.5 + 0.5 = **2.0** |
| 2 | bright+pastel | 1.5 + (−1.0) = **0.5** |
| 3 | bright+warm | 1.5 + 0 = **1.5** |
| **4** | **bright+gradient** | **1.5 + 0.5 = 2.0** |
| 5 | pastel+gradient | (−1.0) + 0.5 = **−0.5** |

### Term B — Characteristics → styleTag bonus (×1.5)

Μόνο το `"playful"` υπάρχει στον πίνακα. Διαβάζουμε τη γραμμή του:

```
playful: bright=+2, gradient=+1, pastel=+1, dark=−1, mono=−1, warm=+1
```

| # | styleTags | playful row sum | × 1.5 |
|---|---|---|---|
| 1 | bright+gradient | 2 + 1 = 3 | **4.5** |
| 2 | bright+pastel | 2 + 1 = 3 | **4.5** |
| 3 | bright+warm | 2 + 1 = 3 | **4.5** |
| **4** | **bright+gradient** | **2 + 1 = 3** | **4.5** |
| 5 | pastel+gradient | 1 + 1 = 2 | **3.0** |

**4 από 5 έχουν ίδιο Term B = 4.5.** Δεν διακρίνει.

### Term Energy (×1.0)

Φόρμουλα: αν `fastSocial && age1824` → `0.5×E`. Αλλιώς αν `slow` → `0.5×(2−E)`. Αλλιώς **0**.

Εδώ ούτε fastSocial, ούτε slow → **ΌΛΑ τα recommendations παίρνουν 0.** Το term δεν συμμετέχει.

### Term D — Contrast (×2.0, primary)

Μέσος όρος luminance spread σε **όλα** τα candidate palettes του recommendation (όλα τα color-count groups μαζί).

| # | spread | × 2.0 = Term D |
|---|---|---|
| 1 | 0.491 | 0.98 |
| 2 | 0.534 | 1.07 |
| 3 | 0.492 | 0.98 |
| **4** | **0.519** | **1.04** |
| 5 | 0.354 | 0.71 |

### Penalties

Κανένα recommendation δεν παίρνει penalty:
- Bright+dark μαζί → όχι
- Pastel+dark μαζί → όχι
- Cold tag με warm hues → όχι (κανένα δεν έχει `cold`)
- Warm tag με cold hues → στο #3 (`warm`) τα hues είναι spring-green+yellow με avg T = (0.5+1.5)/2 = +1.0 > −0.5 → όχι penalty

### Τελικό άθροισμα

| rank | # | A | B | energy | D | pen | **TOTAL** |
|---|---|---|---|---|---|---|---|
| **1** | **#4** | 2.0 | 4.5 | 0 | **1.04** | 0 | **7.54 🏆** |
| 2 | #1 | 2.0 | 4.5 | 0 | 0.98 | 0 | **7.48** |
| 3 | #3 | 1.5 | 4.5 | 0 | 0.98 | 0 | **6.98** |
| 4 | #2 | 0.5 | 4.5 | 0 | 1.07 | 0 | **6.07** |
| 5 | #5 | −0.5 | 3.0 | 0 | 0.71 | 0 | **3.21** |

**Νικητής: #4 με margin 0.06 πάνω από το #1.** Το tie σπάει στο Term D — το #4 έχει spread 0.519 έναντι 0.491 του #1.

### Γιατί η νίκη είναι θρίλερ / αβέβαιη

Τρεις μεγάλες απώλειες signal:

1. **`igPost` δεν matchάρει ούτε fastSocial ούτε slow.** Η normalization (`norm("igPost")` → `"igpost"`) δεν παράγει `"post"`. Αποτέλεσμα: το Term Energy μηδενίζεται για όλους, και 4 στήλες του Table A αγνοούνται.
2. **2 από 3 characteristics σιωπηλά αγνοούνται.** `"Παιδικό"` (Greek, χωρίς alias) και `"energetic"` (όχι στον πίνακα) επιστρέφουν 0. Πραγματικά εκτιμάται μόνο το 1/3 του creative direction.
3. **4 από 5 recs έχουν ίδιο Term B = 4.5.** Το rulebook λέει "characteristics = dominant signal", αλλά εδώ καταλήγει σταθερά να μην ξεχωρίζει.

Επομένως το #4 κερδίζει το #1 με margin που είναι ουσιαστικά **noise** (0.06 σε σκορ 7.5 ≈ 0.8%). Αν διορθώσουμε τα τρία gaps παραπάνω, η σειρά πιθανότατα αλλάζει.

---

## 3. Σειρά παλετών στο pool του νικητή (Track 3 weighted scoring)

Ο handler του query-colors **τρέχει ήδη σε `weighted` mode** (φαίνεται από τα `_score` fields στο enriched output). Default weights:

```
W_STYLE = 0.5   (βάρος για style tags: bright, gradient, ...)
W_HUE   = 0.3   (βάρος για color tags: blue, orange, ...)
W_RARE  = 0.2   (βάρος για rarity bonus)
MIN_SCORE = 0.4 (κατώφλι αποδοχής)
TOP_N = 30     (πόσες παλέτες ανά color-count group)
```

Για το recommendation #4 ζητήθηκαν: `wantColors=[blue, orange]`, `wantStyles=[bright, gradient]`.

### Πώς υπολογίζεται το score της κάθε παλέτας

```
styleScore = πόσα style tags ταιριάζουν / 2
colorScore = πόσα color tags ταιριάζουν / 2
rarityScore = (Σ 1/log(2 + freq του tag)) / 3  → clipped στο 1
score = 0.5 × styleScore  +  0.3 × colorScore  +  0.2 × rarityScore
```

### Τα 4 score bands που εμφανίζονται

| Tier | score περίπου | Τι ταιριάζει | Παράδειγμα |
|---|---|---|---|
| **Top** | **~0.834** | **4/4 tags**: bright + gradient + blue + orange | παλέτα 6 χρωμάτων που χωράει όλα |
| **Mid-high** | **~0.675** | 2/2 style + 1/2 color (orange ή blue, ΟΧΙ μαζί) | orange+orange+yellow με tag gradient |
| **Mid** | **~0.575** | 1/2 style + 2/2 color (blue ΚΑΙ orange μαζί, αλλά μόνο `bright`, χωρίς `gradient`) | οι **πραγματικές** blue+orange παλέτες |
| **Low** | **~0.418** | 1/2 style + 1/2 color | blue-only χωρίς orange, με μόνο 1 style match |

### Γιατί οι blue+orange παλέτες πέφτουν στο **Mid** band

Παρατήρηση από το enriched data: οι περισσότερες αυθεντικές blue+orange παλέτες έχουν **μόνο** το `bright` style tag, ΟΧΙ το `gradient`. Άρα πιάνουν `styleScore=0.5` αντί για `1.0`.

Σύγκριση δύο παλετών για το ίδιο recommendation:

| Παλέτα | tags που έχει | styleScore | colorScore | score |
|---|---|---|---|---|
| `orange + rose` (καθαρά warm) | `[bright, gradient, orange, rose, warm]` | 1.0 (2/2) | 0.5 (1/2) | **0.5+0.15+rarity ≈ 0.675** |
| `blue + orange` (το θεματικά σωστό) | `[bright, blue, orange, cold, gradient]` ή μόνο `[bright, ...]` χωρίς gradient | **0.5 (1/2)** | 1.0 (2/2) | **0.25+0.3+rarity ≈ 0.575** |

Το style βάρος (0.5) > color βάρος (0.3). **Άρα μια παλέτα orange-only με 2 style matches κερδίζει μια παλέτα blue+orange με 1 style match.**

### Σειρά εμφάνισης blue+orange ανά color-count group (top-30 ταξινομημένο)

Από τα 5 groups που γυρίζει ο handler (2colors..6colors, 30 παλέτες έκαστο, σύνολο 150):

| Group | 1η αυθεντική blue+orange | Τι κάθεται από πάνω |
|---|---|---|
| **2colors** | **#5** | cyan+blue (#1), orange+rose (#2), red+orange (#3, #4) |
| **3colors** | **#5** | 4× orange-only / rose+orange |
| **4colors** | **#9** | 8× orange-heavy (orange+orange+yellow κλπ) |
| **5colors** | **#7** | 6× orange-only / red+orange |
| **6colors** | **#1 και #2 ✅** | (κανένα — εδώ το blue+orange νικάει) |

### Γιατί 6colors είναι διαφορετικό

Με 6 χρωματικές θέσεις, η παλέτα έχει χώρο να έχει **ταυτόχρονα blue ΚΑΙ orange ΚΑΙ bright ΚΑΙ gradient**. Έτσι πιάνει 4/4 → score 0.834 (top band). Στα 2-3-4-5 colors δεν χωράει συνδυασμός όλων των tags σε ίδια παλέτα.

### Concrete παράδειγμα (2colors group)

```
#1  score=0.676  cyan+blue       — έχει gradient tag, ΟΧΙ orange
#2  score=0.675  orange+rose     — έχει bright+gradient, ΟΧΙ blue
#3  score=0.675  red+orange      — έχει bright+gradient, ΟΧΙ blue
#4  score=0.675  red+orange      — έχει bright+gradient, ΟΧΙ blue
#5  score=0.575  blue+orange  ←  πρώτη αυθεντική
#6  score=0.575  blue+orange
...
#10 score=0.575  blue+orange     (6 διαδοχικές blue+orange)
#11 score=0.518  spring-green+azure (δεν έχει ούτε blue ούτε orange)
```

---

## 4. Συνέπειες κατά τη χρήση downstream

### Επίδραση στο `avgLuminanceSpread` του Track 2

Ο Track 2 παίρνει mean spread σε **ΟΛΕΣ τις 150 παλέτες** του pool. Επομένως:

- Παλέτες orange+orange+yellow (που πιάνουν τις πρώτες θέσεις σε 4/5 groups) δεν έχουν blue → contrast τους έρχεται από διαφορές luminance ΜΟΝΟ μεταξύ ζεστών χρωμάτων.
- Παλέτες blue+orange (που πέφτουν μέση/χαμηλά) έχουν φυσικά υψηλό spread γιατί το blue είναι σκούρο και το orange μεσαίο/ανοιχτό.
- Το μέσο spread του pool **καθορίζεται κυρίως από τις mid-high tier orange παλέτες**, όχι από τις blue+orange.

Αυτό σημαίνει ότι ο νικητής `Term D = 1.04` δεν αντικατοπτρίζει το contrast των blue+orange παλετών αλλά το contrast του μίγματος.

### Επίδραση στο rendering downstream

Αν το downstream picker (στο platform-client-v2) **παίρνει την πρώτη παλέτα κάθε color-count group**:

- Σε 2,3,4,5 colors θα πάρει **orange-heavy** παλέτα, ΟΧΙ blue+orange.
- Σε 6 colors θα πάρει αυθεντικά blue+orange.

Το recommendation κέρδισε σαν "blue+orange" στο rulebook αλλά τα concrete creatives μπορεί να βγουν χωρίς blue.

### Αν διορθώσουμε το igPost mapping

Αν `igPost` matchάρει `slow`, αλλάζουν:
- `Term Energy` ενεργοποιείται με τύπο `0.5×(2−E)`.
- `Term A.slow` ενεργοποιείται. Στήλη slow: `bright=−0.5, gradient=−1.0, pastel=+1.0, dark=+1.0, warm=0, cold=0`.

Επανυπολογισμός Term A (slow=true, discount=true):
- #1, #4 (bright+gradient): (−0.5 + 1.5) + (−1.0 + 0.5) = **0.5**
- #2 (bright+pastel): (−0.5 + 1.5) + (1.0 + (−1.0)) = **1.0**
- #3 (bright+warm): (−0.5 + 1.5) + (0 + 0) = **1.0**
- #5 (pastel+gradient): (1.0 + (−1.0)) + (−1.0 + 0.5) = **−0.5**

Νέο Term Energy (slow → `0.5×(2−E)`):
- #1 (orange+yellow+cyan): 0.5×(2−1.5) + 0.5×(2−1.5) + 0.5×(2−1.0) = 0.25+0.25+0.5 = **1.0**
- #4 (blue+orange): 0.5×(2−0.5) + 0.5×(2−1.5) = 0.75+0.25 = **1.0**
- #3 (spring-green+yellow): 0.5×(2−1.0) + 0.5×(2−1.5) = 0.5+0.25 = **0.75**
- #2 (magenta+cyan+yellow): 0.5×(2−1.5) + 0.5×(2−1.0) + 0.5×(2−1.5) = 0.25+0.5+0.25 = **1.0**
- #5 (rose+cyan+chartreuse): 0.5×(2−0.5) + 0.5×(2−1.0) + 0.5×(2−1.5) = 0.75+0.5+0.25 = **1.5**

Νέα totals (Term B = 4.5/4.5/4.5/4.5/3.0, Term D ίδιο):

| # | A | B | energy | D | TOTAL |
|---|---|---|---|---|---|
| #4 | 0.5 | 4.5 | 1.00 | 1.04 | **7.04** |
| #1 | 0.5 | 4.5 | 1.00 | 0.98 | **6.98** |
| #2 | 1.0 | 4.5 | 1.00 | 1.07 | **7.57 🏆** |
| #3 | 1.0 | 4.5 | 0.75 | 0.98 | **7.23** |
| #5 | −0.5 | 3.0 | 1.50 | 0.71 | **4.71** |

Με σωστό igPost→slow mapping, **νικητής γίνεται το #2 (magenta+cyan+yellow / bright+pastel)** — εντελώς διαφορετικό creative direction.

---

## 5. Συμπεράσματα

1. **Ο νικητής "#4 blue+orange" κερδίζει με margin που είναι μέσα στο noise** (0.06 σε σκορ 7.5).
2. **3 σιωπηλά gaps** στο rulebook μειώνουν τη διακριτική ικανότητα του scorer για αυτό το brief: igPost normalization, Greek χαρακτηριστικό, "energetic" alias.
3. **Στο pool παλετών, οι αυθεντικές blue+orange ΔΕΝ είναι ψηλά** σε 4 από 5 color-count groups με τα νέα loose criteria. Λόγος: style weight (0.5) > color weight (0.3) και οι περισσότερες blue+orange παλέτες έχουν μόνο 1/2 style match.
4. **Μόνο στο 6colors group** οι blue+orange ανεβαίνουν 1η/2η θέση (γιατί χωράνε 4/4 tags σε μία παλέτα).
5. **Αν διορθωθεί το igPost→slow mapping**, ο winner αλλάζει σε **#2 (magenta+cyan+yellow / bright+pastel)** — άρα το bug δεν είναι κοσμητικό, αλλάζει creative direction.

## 6. Suggested fixes (priority order)

| Fix | Επίπτωση |
|---|---|
| **Α.** Επέκταση `FAST_SOCIAL` ή `SLOW` ώστε να καλύπτει `igPost`, `igpost`, `fbpost`, `instagrampost` κλπ | Μεγάλη — αλλάζει winner σε αυτή την περίπτωση |
| **Β.** Aliases για Greek characteristics στο `CHARACTERISTIC_ALIASES` (παιδικό→playful, μοντέρνο→modern, κλπ) | Μέτρια — βελτιώνει Term B variance |
| **Γ.** Alias `"energetic"→"playful"` ή νέα γραμμή στον πίνακα | Μικρή — άλλος ένας χαρακτηρισμός μετράει |
| **Δ.** Σκέψη: ανεβάστε `W_HUE` σε weighted scoring από 0.3 → 0.4 ή χαμηλώστε `W_STYLE` σε 0.4 | Φέρνει τις πραγματικές blue+orange παλέτες ψηλότερα όταν το thematic concept είναι color-driven |
| **Ε.** Sanity warning στα logs όταν `>50%` των characteristics ενός brief σιωπηλά αγνοούνται | Παρατηρησιμότητα, αποτρέπει invisible degradation |

---

## Παραρτήματα

- Run: `.output/2026-05-27-10-34-36-2536bbd2-2cd8-4f90-8820-d1f5253dfaa0/`
- Brief input χρησιμοποιήθηκε για re-scoring: `/tmp/brief-2536bbd2.json` (constructed από logs)
- Scorer module: `src/workflow/palette-scorer.js`
- Scorer CLI: `scripts/score-palettes.js`
- Query-colors handler: `aws-microservices/services/query-colors/src/get-palettes-based-on-tags.ts`
