# Validation A — Stability, Projection & Reliability

**TL;DR:** Τρέξαμε 3 validations στο eshop-analyzer (26-tag output). **Stability: πέρασε** (το core των tags σταθερό· drift μόνο στο low-confidence margin). **Projection: ασαφές** (το δείγμα ήταν πολύ μικρό ΚΑΙ μεροληπτικό — δεν μπορούμε να συμπεράνουμε, αν και υπάρχει ένδειξη ότι Credible/Expert + Authoritative είναι «παντού»). **Reliability: κόκκινο** (incidental finding — 50% των runs κρασάρουν με SDK error στο τέλος).

---

## 1. Μεθοδολογία

| Test | Τι κάναμε | Τι μετράμε |
|---|---|---|
| **Stability** | Ίδιο store (Plaisio) ×3 | Σταθερότητα tags + confidence + tier μεταξύ runs |
| **Projection** | Διαφορετικά stores | Βγαίνουν τα voice tags σχεδόν παντού (= χαμηλή διάκριση); |
| **Reliability** | (incidental) | Πόσα runs ολοκληρώνονται επιτυχώς |

Stores attempted (8): Plaisio, Korres, Public, CoffeeIsland, Cosmossport, Jumbo, Sephora, pharmacy4u.

---

## 2. Stability test (Plaisio ×3)

### Δεδομένα
`tier`: **mainstream** και στα 3 (100% σταθερό).

| Tag | run1 | run2 | run3 | Παρουσία |
|---|---|---|---|---|
| High-Tech | 0.88 | 0.90 | 0.91 | 3/3 ✅ |
| Modern | 0.90 | 0.85 | 0.92 | 3/3 ✅ |
| Clean | 0.85 | 0.80 | 0.78 | 3/3 ✅ |
| Credible/Expert | 0.72 | 0.82 | 0.72 | 3/3 ✅ |
| Corporate | 0.75 | 0.75 | 0.85 | 3/3 ✅ |
| Authoritative | 0.65 | 0.72 | 0.68 | 3/3 ✅ |
| Exciting | 0.80 | 0.65 | 0.75 | 3/3 ✅ |
| Slick | 0.70 | 0.70 | 0.80 | 3/3 ✅ |
| Helpful | 0.60 | 0.60 | 0.55 | 3/3 ✅ |
| **Approachable** | 0.55 | — | 0.50 | **2/3 ⚠️** |

### Ευρήματα
- **9/10 tags εμφανίζονται και στα 3 runs.** Μόνο 1 (Approachable) flip-άρει.
- Το tag που flip-άρει είναι **το χαμηλότερου confidence** (~0.50). Το drift συγκεντρώνεται **στο όριο**.
- Confidence variance μικρό: τα high-conf tags κυμαίνονται ±0.03-0.07 (π.χ. High-Tech 0.88-0.91)· τα mid ±0.10 (Corporate 0.75-0.85, Exciting 0.65-0.80).

### Evaluation
- **Εμπιστοσύνη στο εύρημα: ΥΨΗΛΗ** — controlled (ίδιο store, ίδιο prompt, 3 runs), καθαρό αποτέλεσμα.
- **Σοβαρότητα προβλήματος: ΧΑΜΗΛΗ** — η ταυτότητα του brand είναι σταθερή· μόνο τα borderline tags τρεμοπαίζουν, που είναι **αναμενόμενο και επιθυμητό** (low conf = αβέβαιο = μερικές φορές μπαίνει).
- **Action:** confidence floor **~0.6** στο consumption → πρακτικά ντετερμινιστικό **χωρίς καν caching**. Το caching guardrail παραμένει ως extra ασφάλεια, όχι ανάγκη.

---

## 3. Projection test (3 valid stores)

### Δεδομένα
| Store | industry / tier | Voice tags που πήρε |
|---|---|---|
| Plaisio | Electronics / mainstream | Approachable, Helpful, Credible/Expert, Authoritative, Corporate |
| Public | Electronics / mainstream | Helpful, Credible/Expert, Authoritative, Corporate |
| Korres | Health & Beauty / premium | Credible/Expert, Authoritative |

| Voice tag | Συχνότητα | |
|---|---|---|
| Credible/Expert | **3/3** | 🔴 παντού |
| Authoritative | **3/3** | 🔴 παντού |
| Corporate | 2/3 | |
| Helpful | 2/3 | |
| Approachable | 1/3 | |
| Caring | 0/3 | |
| Humble | 0/3 | |

### Ευρήματα
- **Credible/Expert & Authoritative βγαίνουν σε ΟΛΑ** τα stores — ακόμα και σε premium καλλυντικά (Korres) όχι μόνο σε tech retailers.
- **Caring / Humble / Approachable** ΔΕΝ υπερεμφανίστηκαν.

### Evaluation — ⚠️ ΑΣΑΦΕΣ (μη συμπερασματικό)
- **Εμπιστοσύνη στο εύρημα: ΧΑΜΗΛΗ.** Δύο λόγοι:
  1. **n=3** — πολύ μικρό για frequency claim.
  2. **Confounded sample** — και τα 3 valid stores είναι «σοβαροί» mid/premium retailers. Το **budget/playful** store (Jumbo) που θα έδινε το contrast **κρασάρισε**. Άρα δεν ξεχωρίζουμε «τα Credible/Authoritative είναι universal projections» από «αυτά τα 3 brands όντως είναι credible/authoritative». **Το test δεν απαντά ακόμα.**
- **Ένδειξη (όχι απόδειξη):** το 3/3 για Credible/Authoritative είναι **συμβατό** με την πρόβλεψη (round 4) ότι «όλοι παρουσιάζονται expert/authority» → χαμηλή διάκριση. Αλλά χρειάζεται **contrast stores** (budget, playful, artisan) για να επιβεβαιωθεί.
- **Action:** ΟΧΙ απόφαση ακόμα. Ξανατρέξε projection με **διακριτά αντίθετα brands** (1 budget/loud, 1 playful, 1 artisan) ΑΦΟΥ φτιαχτεί το reliability (§4). Μέχρι τότε: **πρόσεχε** τα Credible/Authoritative ως πιθανώς weak signal, μην χτίσεις πάνω τους.

---

## 4. Reliability — 🔴 incidental finding (το πιο σοβαρό)

### Δεδομένα (8 distinct stores)
| Αποτέλεσμα | Stores | # |
|---|---|---|
| ✅ Success (tags) | Plaisio, Korres, Public | 3 |
| 🔴 SDK crash | pharmacy4u, CoffeeIsland, Cosmossport, Jumbo | 4 |
| 🟡 Site-block (graceful conf:0) | Sephora | 1 |

- **SDK crash rate: 4/8 = 50%.** Error: `only prompt commands are supported in streaming mode`.
- Κρασάρει **στο ΤΕΛΟΣ** — μετά από επιτυχές browse + extract + screenshot + ColorThief (8-9 βήματα). Όλη η δουλειά πάει χαμένη στο final emission.
- Συσχέτιση: χτυπά σε runs με **μακρύτερο/περισσότερα βήματα** (π.χ. CoffeeIsland step-4 extract 143s, 9 βήματα). Τα «καθαρά» (Plaisio/Public, 8 βήματα) περνάνε.

### Evaluation
- **Εμπιστοσύνη στο εύρημα: ΥΨΗΛΗ** (4 ανεξάρτητα κρασαρίσματα, ίδιο error).
- **Σοβαρότητα: ΥΨΗΛΗ για production** — αν ~50% των eshops αποτυγχάνουν, το pipeline δεν είναι viable ως έχει.
- **Αιτία (υπόθεση):** Agent SDK σε streaming-input mode δέχεται non-prompt message στο τέλος (πιθανώς maxTurns/extra tool call/result-serialization). **Δεν είναι δικό μας prompt bug** — οι αλλαγές μας πρόσθεσαν μόνο reasoning + output πεδία.
- **Action:** διερεύνηση πριν production — (α) retry logic στο workflow, (β) έλεγχος SDK version / streaming config, (γ) μείωση βημάτων του recipe (το ≤7 constraint παραβιάζεται — βλέπουμε 8-9 βήματα), (δ) hard cap maxTurns με graceful fallback.

---

## 5. Συνολικό evaluation

| Finding | Εμπιστοσύνη | Σοβαρότητα | Action |
|---|---|---|---|
| Stability OK (drift στο low-conf margin) | Υψηλή | Χαμηλή | confidence floor ~0.6 |
| Projection: Credible/Authoritative «παντού» | **Χαμηλή** (n=3, confounded) | Μέτρια (αν αληθεύει) | re-test με contrast stores· προσωρινά downweight |
| Reliability: 50% SDK crash | Υψηλή | **Υψηλή** | διερεύνηση πριν production |

## 6. Περιορισμοί αυτού του validation
- Projection: n=3, sample biased προς serious retailers (το reliability έκοψε ακριβώς τα contrast stores).
- Stability: 1 store μόνο (Plaisio). Ιδανικά 2-3 stores ×3 για γενίκευση.
- Όλα σε 1 μέρα, 1 model (CLAUDE_MODEL default), χωρίς palette/site variation control.

## 7. Προτεινόμενη σειρά
1. **Reliability fix** (blocker — χωρίς αυτό δεν μπορούμε καν να μαζέψουμε δείγμα).
2. **Projection re-test** με contrast stores (budget/playful/artisan).
3. **Confidence floor 0.6** στο brief consumption (φθηνό, έτοιμο).

> Σχετικά: e2e test report `2026-06-04-brand-characteristics-e2e-test.md` · spec `eshop-analyzer/docs/brand-characteristics-source-mapping.md`
