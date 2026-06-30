# Validation A — Stability & Projection (26-tag output)

**TL;DR:** Δύο validations στο eshop-analyzer 26-tag output. **Stability: πέρασε** — το core των tags σταθερό μεταξύ runs, drift μόνο στο low-confidence margin (→ confidence floor ~0.6 αρκεί). **Projection: conclusive (n=7 με contrast)** — τα **Credible/Expert (7/7) + Helpful (6/7)** βγαίνουν σχεδόν παντού (ακόμα και σε budget παιχνιδάδικο) = **γνήσια projections, μηδέν διάκριση → down-weight στο brief**. Τα υπόλοιπα voice tags (Caring/Approachable/Humble) διακρίνουν σωστά.

> Ορισμένα stores αρχικά απέτυχαν λόγω SDK issue — τεκμηριώθηκε & διορθώθηκε **ξεχωριστά** στο `2026-06-04-sdk-crash-investigation.md`. Μετά το fix τρέξαμε 7 stores καθαρά.

---

## 1. Μεθοδολογία

| Test | Τι κάναμε | Τι μετράμε |
|---|---|---|
| **Stability** | Ίδιο store (Plaisio) ×3 | Σταθερότητα tags + confidence + tier μεταξύ runs |
| **Projection** | 7 διαφορετικά stores | Βγαίνουν τα voice tags σχεδόν παντού (= χαμηλή διάκριση); |

7 stores: Plaisio, Public, Korres, CoffeeIsland, Cosmossport, Pharmacy4u, Jumbo — spanning Electronics, Cosmetics, Coffee, Sports, Pharmacy, **Toys-budget** (το playful/budget contrast).

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

### Ευρήματα & Evaluation
- **9/10 tags εμφανίζονται και στα 3 runs.** Μόνο 1 (Approachable) flip-άρει — και είναι **το χαμηλότερου confidence** (~0.50). Το drift συγκεντρώνεται **στο όριο**.
- Confidence variance μικρό (High-Tech 0.88-0.91· mid tags ±0.10).
- **Εμπιστοσύνη: ΥΨΗΛΗ** (controlled). **Σοβαρότητα: ΧΑΜΗΛΗ** — η ταυτότητα του brand σταθερή· μόνο borderline tags τρεμοπαίζουν (αναμενόμενο/επιθυμητό).
- **Action:** confidence floor **~0.6** στο consumption → πρακτικά ντετερμινιστικό.

---

## 3. Projection test (7 stores, με contrast)

### Δεδομένα — voice tags ανά store
| Store | industry / tier | Voice tags |
|---|---|---|
| Plaisio | Electronics / mainstream | Approachable, Helpful, Credible/Expert, Authoritative, Corporate |
| Public | Electronics / mainstream | Helpful, Credible/Expert, Authoritative, Corporate |
| Korres | Cosmetics / premium | Credible/Expert, Authoritative |
| CoffeeIsland | Coffee / premium | Helpful, Credible/Expert, Authoritative |
| Cosmossport | Sports / mainstream | Helpful, Credible/Expert, Authoritative, Corporate |
| Pharmacy4u | Pharmacy / mainstream | Approachable, Helpful, Credible/Expert, Authoritative, Corporate |
| **Jumbo** | **Toys / budget** | Approachable, Caring, Helpful, Credible/Expert · *(+ Playful 0.97, Exciting, Funky)* |

### Συχνότητα (n=7)
| Voice tag | Συχνότητα | Ερμηνεία |
|---|---|---|
| **Credible/Expert** | **7/7** 🔴 | Truly universal — ακόμα και budget toy store → **projection, μηδέν διάκριση** |
| Authoritative | 6/7 | παντού **εκτός** Jumbo → διακρίνει serious-vs-playful |
| Helpful | 6/7 🔴 | σχεδόν universal → weak |
| Corporate | 4/7 | μέτριο |
| Approachable | 3/7 | διακρίνει (warm brands) |
| Caring | 1/7 | μόνο Jumbo → **διακρίνει** |
| Humble | 0/7 | ποτέ |
| *Funky / Playful (contrast)* | 1/7 · 2/7 | διακρίνουν καθαρά το playful brand (Jumbo) |

### Evaluation — ✅ ΣΥΜΠΕΡΑΣΜΑΤΙΚΟ
- **Credible/Expert + Helpful = γνήσια projections** (7/7, 6/7). Όλοι «παρουσιάζονται expert/helpful» — επιβεβαιώνει την πρόβλεψη round-4 (devil's advocate) **με δεδομένα**. → **Χαμηλή διάκριση, down-weight στο brief.**
- **Authoritative = μερικώς** (απών στο budget/playful Jumbo) → κουβαλά «serious vs playful» signal → μέτρια χρήσιμο.
- **Caring / Approachable / Humble = ΟΧΙ projections** → διακρίνουν ή σπάνια εμφανίζονται → **καλό signal**. Το conservative-confidence instruction δούλεψε (Caring βγήκε μόνο στο warm/kids brand).
- **Energy tags (Funky/Playful) διακρίνουν πολύ καλά.**
- **Confidence το μετριάζει ήδη:** Credible/Expert 0.65 (Jumbo) vs 0.85 (Korres) → confidence-weighting κωδικοποιεί τη διαφορά.

---

## 4. Συνολικό evaluation

| Finding | Εμπιστοσύνη | Σοβαρότητα | Action |
|---|---|---|---|
| Stability OK (drift στο low-conf margin) | Υψηλή | Χαμηλή | confidence floor ~0.6 |
| Projection: Credible/Expert + Helpful «παντού» | Υψηλή (n=7, contrast) | Μέτρια | **down-weight** Credible/Expert + Helpful στο brief |

## 5. Περιορισμοί
- Stability: 1 store (Plaisio) ×3. Ιδανικά 2-3 stores για γενίκευση.
- Projection: n=7 — αρκετό για το core εύρημα· περισσότερα budget/playful brands θα ενίσχυαν το Authoritative «serious-vs-playful».
- 1 μέρα, 1 model (CLAUDE_MODEL default).

## 6. Επόμενα
1. **Confidence floor 0.6** + **down-weight Credible/Expert + Helpful** στο brief guidance (έτοιμα να μπουν).
2. Περισσότερα stability stores αν θέλουμε γενίκευση.

> Σχετικά: SDK crash `2026-06-04-sdk-crash-investigation.md` · e2e `2026-06-04-brand-characteristics-e2e-test.md` · spec `eshop-analyzer/docs/brand-characteristics-source-mapping.md`
