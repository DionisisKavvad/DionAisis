# Palette Selection Rulebook — Design & Review

**TL;DR:** Σχεδιάσαμε deterministic rule-based scorer που διαλέγει 1 από τα 5 AI-generated palettes χωρίς AI call. Πέρασε από 3-agent review (video designer / social strategist / devil's advocate), διορθώθηκε σε v2. Απόφαση: fully-automated pipeline, no AI in hot path → το rulebook είναι defensible ως deterministic v0. Spec: `brief-localhost/docs/palette-selection-rulebook.md`.

---

## 1. Το πρόβλημα

Το brief workflow γυρνά **5 color palette recommendations** (το καθένα: 2-3 hue tags + 2-3 style tags + reasoning). Κάποιος πρέπει να διαλέξει 1.

- Σήμερα το διαλέγει το `selectBestPaletteTheme()` στο platform-client-v2 — opaque λογική.
- Θέλουμε να βγει αυτή η λογική από εκεί και να αντικατασταθεί με κάτι explainable.

## 2. Πιθανές διαδικασίες επιλογής (4 δρόμοι)

| Μέθοδος | Πώς | Trade-off |
|---|---|---|
| **#1 Rule-based scoring** | Deterministic weighted-sum πάνω στα tags | Instant, $0, reproducible· αλλά tags-only, bias |
| **#2 Product-image-aware** | Contrast/harmony vs χρώματα προϊόντος | Πιο σωστό· λύνει το camouflage· θέλει image processing |
| **#3 LLM-as-judge** | 2η AI κλήση που κρίνει τα 5 | Καλύτερη κρίση· cost/latency/non-deterministic |
| **#4 Data-driven (A/B)** | Engagement decides | Η μόνη αλήθεια· θέλει traffic/χρόνο/infra |

**Επιλέχθηκε #1** λόγω constraints (βλ. §5).

## 3. Το rulebook (v2) — δομή

`score(brief, palette) → number`. Διαβάζει signals: placement, ηλικία, characteristics, discount, **luminance spread**. (Gender αγνοείται σκόπιμα — gendered-color = near-zero lift + brand risk.)

```
score = 1.0 × Σ(Πίνακας A: styleTag × placement/audience/promo)
      + 1.5 × Σ(Πίνακας B: characteristics → styleTag bonus)
      + 1.0 × Σ(energy alignment από colorTags)
      + 2.0 × avgLuminanceSpread           ← PRIMARY (contrast)
      +       coherence penalties
```

Πλήρη νούμερα: `docs/palette-selection-rulebook.md`. Λεξιλόγιο: 12 baseColors, 8 styleTags (από τα prompts).

## 4. Multi-agent review — convergent findings

3 agents (video designer, social media strategist, devil's advocate). Συμφώνησαν σε 4:

1. **Το v1 διάλεγε για λάθος λόγους** — στοίβαζε soft signals (bright/gradient = "reels myth", "younger = louder" = 2018 thinking).
2. **Zeroing cold/warm = bug** — τιμωρούσε δομικά τα "clean" briefs.
3. **Tags-only = τυφλό** στο πιο σημαντικό: actual contrast/hex. Δύο ίδια-tagged palettes παίρνουν ίδιο score ασχέτως ποιότητας.
4. **Contrast πρέπει να είναι primary signal**, όχι tie-break.

Devil's advocate: το rulebook είναι "lossy scorer πάνω σε εξυπνότερο generator" — δικαιολογείται **μόνο** ως deterministic, no-AI-in-hot-path v0.

### Number fixes (v1 → v2)
- Contrast (luminance spread): tie-break → **primary scored term** (×2.0)
- cold/warm fast-social: 0 → +0.5 (fix bug)
- bright fast-social: +2 → +0.5· gradient fast-social: +2 → 0
- dark + discount: +1.5 → 0 (dark = premium, αντίθετο urgency)
- 18-24: bright +2 → +1.0, gradient +1.5 → +0.5
- temperature: violet −1 → −0.5· cyan/azure swap (cyan −2, azure −1.5)
- bright+dark penalty: −3 → −1 (high contrast = ιδανικό για mobile)

## 5. Απόφαση (κλειδωμένη)

- **Selection owner:** Fully-automated pipeline (κανείς δεν βλέπει τα 5 → χρειάζεται 1 deterministic answer)
- **LLM-judge στο selection path:** ΟΧΙ (no AI in hot path)

→ Αυτό είναι ακριβώς το σενάριο όπου ο devil's advocate παραδέχτηκε ότι το hand-tuned rulebook **είναι** η σωστή κλήση. Αν ήταν human-in-loop ή επιτρεπόταν LLM-judge, θα κατέρρεε.

## 6. Πώς υλοποιείται στην πράξη (test-001)

**Approach που καταλήξαμε:** Μέθοδος #1 — deterministic rule-based scoring (v2). Συνάρτηση `score(brief, palette) → number`· τρέχει και στα 5, μεγαλύτερο νούμερο κερδίζει. Καμία AI κλήση.

**Status:** Το module **δεν είναι γραμμένο ακόμα**. Το rulebook είναι spec· τα νούμερα του test-001 υπολογίστηκαν στο χέρι + ad-hoc node script για τα luminance. Next step = κώδικας.

### Data flow
```
inputs/input.json (brief: characteristics, audience, placement, products)
  → [workflow] → color-tags-result.json   (5 recommendations, μόνο tags)
  → [enrichment] → color-tags-enriched.json (+ paletteData με πραγματικά hex+luminance)
  → [SCORER, TBD] για κάθε ένα: score = A + B + energy + D + penalties → ranked
  → νικητής → downstream στο template
```

### Πλήρης υπολογισμός του νικητή #4 (azure,cyan / bright,gradient)
brief active: fast-social ✅, 18-24 ✅, 35+ ❌, discount ✅, Clean/Modern/Slick

```
Term A (×1.0):  bright(fast+0.5, 18-24+1.0, disc+1.5)=3.0
                gradient(fast 0, 18-24+0.5, disc+0.5)=1.0      → A = 4.0
Term B (×1.5):  bright(Clean+0.5,Modern+1.0,Slick 0)=1.5
                gradient(Clean−0.5,Modern+1.5,Slick+1.0)=2.0   → 3.5 ×1.5 = 5.25
energy (×1.0):  azure E0.5 + cyan E1.0 = 1.5 ×0.5             → 0.75
Term D (×2.0):  avgLuminanceSpread 0.715 ×2.0                  → 1.43
penalties:      κανένα                                          → 0
                                                       ΣΥΝΟΛΟ = 11.43 🏆
```
vs #1 (clean+mono): μεγαλύτερο B (8.25) αλλά ~0 στο A και χαμηλό contrast (D=0.76) → 10.51. Το contrast ήταν ο decider.

## 7. Worked example — test-001 (πραγματικά luminance από enriched)

brief: reels, 18-24/25-34, Male, Clean/Modern/Slick, discount 50%

| # | tags | Total v2 | luminance spread | pool |
|---|---|---|---|---|
| **4** | azure,cyan / bright,gradient | **11.43 🏆** | 0.715 (punchy) | ⚠️ 1 |
| 1 | azure,blue / cold,mono | 10.51 | 0.378 | 5 |
| 2 | cyan,azure,blue / gradient,cold | 10.34 | 0.546 | 7 |
| 5 | blue,magenta / gradient,dark | 7.88 | 0.442 | 20 |
| 3 | violet,blue / dark,mono | 7.59 | **0.046 (muddy)** | 20 |

**Insight:** Το #4 ακόμα κερδίζει, αλλά τώρα για **defensible** λόγο (υψηλότερο μετρημένο contrast), όχι για vibes. Το fix άλλαξε το *γιατί*, όχι το *ποιο*. Παράλληλα διόρθωσε τη σειρά: **#1 από τελευταίο → 2ο**, **#3 από μέση → τελευταίο** (το Term D τιμώρησε σωστά το 0.046 spread — muddy, αόρατο στο v1).

## 8. Open questions

1. **Pool coverage:** το #4 έχει μόνο 1 candidate palette στη βιβλιοθήκη (vs 20 για #3/#5). Risky — μηδέν εναλλακτική downstream. Πρέπει να γίνει **scored penalty**, όχι μόνο tie-break.
2. **Product-image clash (#1 miss, και οι 3 reviewers):** κανένα table δεν κοιτάζει τα χρώματα του προϊόντος. Μπλε προϊόν + μπλε palette = camouflage → άχρηστο output. Out of scope για v0· χρειάζεται product-aware scoring (μέθοδος #2). Επόμενος σταθμός.
3. Caption/UI safe-zone overlap + brand-color consistency: out of scope v0.
4. **Maintenance:** κάθε νέο characteristic/placement/tag θέλει hand-tuned νούμερα. Owner TBD. Άγνωστο characteristic → σιωπηλά 0 (invisible degradation).
5. Τα νούμερα είναι design-judgment + review consensus, **όχι data-derived**. Περιμένουν A/B/CTR validation.

## Next step (προτεινόμενο)
Γράψιμο του scorer module που τρώει το enriched JSON και βγάζει ranked list με τα v2 νούμερα· προαιρετικά pool-coverage penalty πρώτα.
