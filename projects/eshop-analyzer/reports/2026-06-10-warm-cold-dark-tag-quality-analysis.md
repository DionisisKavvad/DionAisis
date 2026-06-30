# Style-tag quality analysis vs human tags (warm / cold / dark / pastel / vintage)

> Αρχικό 2026-06-10 (warm/cold/dark). **Επεκτάθηκε 2026-06-11** με pastel + vintage + locked decisions.

**TL;DR:** Δοκιμάσαμε per-color μαθηματικούς κανόνες (Webster CIELAB, HSL, L*) για 5 style tags, με **supervised 70/30 train/test** όπου είχε νόημα. Τελικές μέθοδοι & νούμερα:
- **warm/cold:** SECTORS_FOLK per-color majority → **97.9% / 98.1% recall**, 99.7% / 99.3% precision (το cold ήταν 77% στο live).
- **dark:** `mean L*<50 & ≥1 dark` → **92%** (live 75%).
- **pastel:** `L*>60 & chroma<70, ≥60%` → **94.7% balanced, 92.7% precision** (supervised, λυμένο).
- **vintage:** vs ζωηρά 91% ✅, **vs warm/pastel 67% ❌** — σημασιολογικό, όχι γεωμετρικό.

Τρία μετα-συμπεράσματα: (1) **μέτρα με supervised + πραγματικά negatives**, ποτέ recall-vs-untagged (έβγαζε pastel "72%" αντί για το πραγματικό 95%). (2) Η διαφωνία με τον άνθρωπο είναι **aggregation/salience**, όχι classification. (3) Το **mutual exclusivity** των tags είναι το βαθύτερο πρόβλημα — η ίδια παλέττα είναι νόμιμα warm+pastel+vintage· για matching θες **multi-label**.

---

## 0. Setup

- Βάση: `dev_color-palettes` (eu-west-1), **13.068 παλέττες, 56.061 χρώματα**.
- Human tags (legacy `tags`): warm 2.026 · cold 1.904 · dark 1.561 · **pastel 2.431 · vintage 2.552**.
- **70% των παλεττών δεν έχουν human temperature tag** → ο άνθρωπος tag-άρισε μόνο το style της scrape σελίδας.
- Per-color μετρικές: CIELAB **L***, **chroma** = √(a*²+b*²), Webster warmth **S** = 0.6792·a* + 0.7233·b* + 0.0013·a*² + 0.0042·a*·b* + 0.0044·b*².
- Σύγκριση πάντα: **HSL (live `color-tagger.cjs`)** vs **Lab per-color κανόνας** vs **human tag (ground truth)**, με recall + κάλυψη untagged + 4 collapsible sections (διαφωνίες + extra coverage).

---

## 1. Warm/cold: chroma gate, όχι σκέτο πρόσημο S

`S` = προσημασμένη προβολή στον warm-cool άξονα → `|S| ≈ chroma·cos(θ−47°)`, κουβαλάει μέγεθος. Κοντά στο γκρι (chroma~0) το πρόσημο είναι **θόρυβος**. Knockout: `#807D7A` (γκρι) S=+1.9→"warm", `#A9ACA9` (ίδιο γκρι) S=−0.3→"cold". Γνήσια: |S|~20-47, γκρι: |S|~0-2. **Κανόνας: chroma<8 → neutral· αλλιώς S>0 warm / S≤0 cold.**

**Deadband (|S|<5 → borderline) απορρίφθηκε** — ασύμμετρο: no-op στο warm, ζημιά στο cold (το καθαρό μπλε `#0000FF` έχει S=−0.8, κάθεται στο S=0). Λεπτομέρειες: `why-chroma-matters.md`.

---

## 2. WARM — GT 2.026 (εύκολο)

| σύστημα | recall |
|---|---|
| Webster + deadband | 98.3% |
| Webster strict | 98.2% |
| HSL (live) | 97.3% |

neither = **6**. Warm κυριαρχεί στα e-shop και το συμφωνούν folk-hue/Webster/HSL ταυτόχρονα. Extra κάλυψη untagged: HSL 45%, Webster 65%.

---

## 3. COLD — GT 1.904 (δύσκολο)

| σύστημα | recall |
|---|---|
| Webster strict | 80.8% |
| Webster + deadband | 77.9% |
| HSL (live) | 76.9% |

- both 1.307 · μόνο HSL 158 · μόνο Webster_db 177 · **neither 262 (13.8%)**.
- Precision (στις 3.929 human-temp): **~99.9%** — κανένα δεν μπερδεύει warm με cold.
- HSL & Webster **συμπληρωματικά**. Deadband κόστος: −54 (μπλε/βιολετί).
- **Probe neither (230):** 61% είναι **warm-πλειοψηφία** (avg 2.70 warm vs 0.98 cold). Ο άνθρωπος είπε cold λόγω **1 salient/κυρίαρχου** κρύου χρώματος, όχι πλειοψηφίας.

---

## 4. DARK — GT 1.561 (η σκάλα)

Per-color dark = L*<35.

| κανόνας | recall | κάλυψη untagged |
|---|---|---|
| mean L* < 35 | 69.9% | 2.0% |
| HSL (live, mean HSL-L<35) | 75.3% | 3.3% |
| dark ≥ μισά χρώματα | 82.3% | 7.3% |
| **mean L*<50 & ≥1 dark** | **91.9%** | 11.0% |
| ≥1 dark | 96.2% | 31.7% |

- **Best candidate: `mean L*<50 & ≥1 dark`** (92% recall, κυριαρχεί HSL: A=6 vs B=264).
- "≥1 dark" σκέτο → 96% αλλά flag-άρει 32% untagged (πολύ χαλαρό).
- **Probe neither (371):** 85% έχουν ≥1 πραγματικά σκούρο, mean L*=47. "Σκουρόχρωμες με ανοιχτά accents" → το `mean<50 & ≥1 dark` τις διασώζει. Επιβεβαιώνει dominance.
- (Live τώρα: HSL mean-L<35, 75%.)

---

## 4b. ΜΕΘΟΔΟΛΟΓΙΚΗ ΣΤΡΟΦΗ — γιατί το "recall vs untagged" ήταν λάθος μέτρηση

Για warm/cold/dark μετρούσαμε recall ενάντια στα human tags + "κάλυψη σε untagged" ως proxy για το πόσο χαλαρός είναι ο κανόνας. **Αυτό είναι contaminated:** μια untagged παλέττα που το σύστημα λέει pastel μπορεί να είναι **όντως** pastel (ο άνθρωπος απλώς δεν την tag-άρισε), οπότε δεν είναι verified false positive. Άρα η "κάλυψη" δεν είναι precision, και κάθε threshold tuning πάνω της κυνηγάει φάντασμα.

**Η σωστή μέθοδος (supervised με πραγματικά negatives):** αντί για untagged, παίρνουμε ως **αρνητικά** παλέττες με **άλλο confident human tag** — που είναι σίγουρα ΟΧΙ της κλάσης:
- **pastel**: positives = human-pastel · negatives = human-**dark** ∪ human-**bright** (3.459 παλέττες· dark & bright είναι ασύμβατα με pastel).
- **vintage**: positives = human-vintage · negatives κατά περίπτωση (bright, ή warm∪pastel).

Έτσι έχουμε **πραγματική precision/specificity**. Grid-search των thresholds σε **70/30 train/test**, βελτιστοποίηση **balanced accuracy** = (recall + specificity)/2 (για να μην εξαπατά η ανισορροπία κλάσεων). Αυτή η στροφή άλλαξε εντελώς τα συμπεράσματα για pastel & vintage.

---

## 5. PASTEL — GT 2.431 — **ΛΥΜΕΝΟ (supervised) ✅**

### 5α. Παλιά μέτρηση (recall vs untagged) — παραπλανητική
Per-color pastel = L*>70 & chroma<50:

| κανόνας | recall | κάλυψη untagged |
|---|---|---|
| HSL (live) | 24.6% | 5.2% |
| Lab ≥ μισά | 92.3% | 30.6% |
| Lab ≥ 75% | 71.9% | 9.7% |
| Lab όλα | 50.3% | 4.4% |

Με αυτή τη μέτρηση φάνηκε ότι "δεν υπάρχει καλό σημείο" (≥75% → μόνο 72%, ≥μισά → 31% κάλυψη). **Λάθος συμπέρασμα**, artefact του contaminated proxy.

### 5β. Supervised (pos=2.431 pastel, neg=3.459 dark+bright) — η αλήθεια
**Βέλτιστος κανόνας: per-color pastel = `L* > 60 & chroma < 70`, palette pastel αν ≥60% των χρωμάτων.**

| split | recall | specificity | **precision** | balanced acc |
|---|---|---|---|---|
| TRAIN | 95.2% | 94.0% | 91.8% | 94.6% |
| **TEST** | **94.7%** | **94.8%** | **92.7%** | **94.7%** |

- **Ο classifier ξεχωρίζει pastel από dark/bright στο ~95% και στις δύο κατευθύνσεις, με πραγματική precision 92.7%.** Δεν υπάρχει "ταβάνι" — το pastel **είναι** καθαρή γεωμετρική ιδιότητα (φωτεινό + όχι-ζωηρό).
- **Γιατί τα optimal thresholds είναι πιο χαλαρά** απ' ό,τι μαντέψαμε (L*>60 αντί 70, chroma<70 αντί 50, frac≥60% αντί 75%): επειδή η πραγματική δουλειά είναι να ξεχωρίσεις pastel από **dark** (χαμηλό L* → το όριο L*>60 αρκεί) και από **bright** (υψηλό chroma → chroma<70 αρκεί). Τα σφιχτά όρια που είχαμε βάλει "έκοβαν" νόμιμα pastel χωρίς λόγο.
- **Το live HSL pastel είναι χαλασμένο** (24.6% recall, `meanS<55` υπερβολικά αυστηρό). **Άμεσο fix** με τον παραπάνω κανόνα.

**Locked: `L*>60 & chroma<70, ≥60% των χρωμάτων`.** (Η παλιά τιμή `L*>70 & C<50, ≥75%` αντικαθίσταται — ήταν βασισμένη στο λάθος proxy.)

---

## 6. VINTAGE — GT 2.552 — **εξαρτάται από τι το ξεχωρίζεις**

### 6α. Εύρημα: vintage = μουντό + warm
Οι human-vintage είναι **84% warm** (vs 64% baseline) με avg chroma **24** (vs 38). Η θερμότητα είναι πραγματικό signal — μισιάζει το false coverage. Αλλά (βλ. παρακάτω) δεν αρκεί για διάκριση από warm/pastel.

### 6β. Supervised — δύο πολύ διαφορετικές ιστορίες

**vs BRIGHT (εύκολο):** pos=2.552 vintage, neg=1.914 bright. Βέλτιστο: `chroma 5-45 & L* 25-95, ≥50%`.

| split | recall | specificity | precision | balanced |
|---|---|---|---|---|
| TEST | 88.9% | 93.7% | 95.0% | **91.3%** |

→ Δηλαδή μπορούμε να φτιάξουμε καλό **"muted / non-vivid detector"**. (Σημείωση: η warm-συνθήκη **δεν** επιλέχθηκε — vs bright αρκεί το "μουντό".)

**vs WARM ∪ PASTEL (δύσκολο):** pos=2.552 vintage, neg=3.527 warm|pastel (μη vintage). Βέλτιστο: `chroma 5-45 & L* 25-80, ≥50%`.

| negatives | recall | specificity | precision | balanced |
|---|---|---|---|---|
| vs warm ∪ pastel | 59.0% | 75.1% | 63.2% | **67.0%** |
| → vs warm-only | 86.0% | **57.7%** | — | 71.8% |
| → vs pastel-only | 59.0% | 78.9% | — | 68.9% |

**Το 67% balanced ≈ ρίψη νομίσματος.** Ειδικά vs warm-only η specificity είναι **57.7%** — δηλαδή **~42% των warm παλεττών flag-άρονται ως vintage**. Σχεδόν οι μισές warm παλέττες "μοιάζουν" vintage γεωμετρικά.

### 6γ. Γιατί — concrete probes (επιβεβαιώνουν το ταβάνι)
- **Vintage = ίδια περιοχή με warm/pastel, άλλη ετικέτα.** Over-flags (warm-muted ≥μισά, μη human-vintage, 2.477): **42% human-pastel + 33% human-warm**.
- **Human tags = mutually-exclusive by convention.** 74% των human-vintage έχουν vintage ως **μόνη** temp/light/sat ετικέτα· μόνο 15% και warm, 13% και pastel — παρότι γεωμετρικά είναι warm+μουντά.
- **Δομικά capped:** προσπαθούμε να μαντέψουμε **ποια λέξη** διάλεξε ο άνθρωπος ανάμεσα σε near-synonyms — πληροφορία που **δεν υπάρχει στα χρώματα**. Τα supervised νούμερα το ποσοτικοποιούν: vs vivid 91%, vs near-synonyms 67%.
- **Χτυπάει το prompt:** το `final-color-tag-prompt-v3.md` δηλώνει `pastel ✗ vintage` mutually-exclusive· τα δεδομένα το διαψεύδουν (13% human co-occurrence). **Λάθος κανόνας.**

**Συμπέρασμα vintage:** 
- Ως **"muted detector"** (vs ζωηρά): φτιάχνεται, ~91%.
- Ως **exclusive tag διακριτό από warm/pastel**: **αδύνατο γεωμετρικά** (67%). Είναι σημασιολογική επιλογή λέξης, όχι ιδιότητα των pixels.
- **Πρόταση:** είτε human-only για τη λεπτή διάκριση, είτε multi-label (vintage = warm ∩ muted ∩ mid-light, με επικάλυψη — αποδεκτή). **Μην** το κάνεις exclusive geometric tag.

---

## 6δ. WARM/COLD — βελτιωμένο σχήμα SECTORS_FOLK (per-color majority)

Πέρα από το live (circular-mean hue), δοκιμάσαμε **per-color folk-sector + πλειοψηφία**:
- per-color: neutral αν CIELAB C*<2· αλλιώς **warm** hue∈[340,75), **cool** [90,315), **ambiguous** [75,90)∪[315,340) (δεν ψηφίζει).
- palette: warm αν #warm>#cool, cold αν #cool>#warm.

| σχήμα | warm recall | warm prec | cold recall | cold prec |
|---|---|---|---|---|
| HSL circular-mean (live) | 97.3% | — | 76.9% | — |
| **SECTORS_FOLK (per-color majority)** | **97.9%** | **99.7%** | **98.1%** | **99.3%** |

**Το cold εκτοξεύεται 77% → 98%.** Λόγος: το cool sector [90,315) περιλαμβάνει **πράσινα + μωβ**· οι green/purple παλέττες (που ο Webster έλεγε warm → χάνονταν ως cold) γίνονται σωστά cool-πλειοψηφία. Warm precision 99.7% (μόλις 5 FP — το green-as-warm έφυγε). **Αυτό θα πρότεινα για νέο warm/cold tagging.** (Παραλλαγή Γ: τα όρια 332/78 per-color → 96.5%/97.2%, ~1.5 μονάδες κάτω από Β.)

---

## 7. Διατομεακά συμπεράσματα

1. **Η μέτρηση μετράει.** Το "recall vs untagged" είναι contaminated proxy και έβγαζε λάθος συμπεράσματα (pastel "72%"). Με **supervised + πραγματικά negatives** (παλέττες με άλλο confident tag), το pastel βγήκε **95%**. Πάντα μέτρα με καθαρά negatives, όχι με την απουσία ετικέτας.
2. **Η διαφωνία είναι aggregation/salience, όχι classification.** Per-color τα tags είναι καθαρά· ο άνθρωπος κρίνει με **dominant/salient** χρώμα ή **gestalt**, η μηχανή με mean/count. Dominance proxy δουλεύει (dark 70%→92%· cold 77%→98% με per-color majority).
3. **Διαχωρισμός κλάσεων ανά "δυσκολία":**
   - **Καθαρά γεωμετρικά:** warm/cold (98%/98% με SECTORS_FOLK), dark (92% με mean<50&≥1), **pastel (95% supervised)**.
   - **Ημι-γεωμετρικό:** vintage **vs ζωηρά** (91%) ναι· **vs warm/pastel** (67%) όχι — είναι σημασιολογικό.
4. **Το human tag δεν είναι ground truth:** sparse (30%), single-salient-label, folk (=HSL home advantage), αισιόδοξες μετρήσεις.
5. **Mutual exclusivity είναι το βαθύτερο πρόβλημα.** Η ίδια παλέττα είναι νόμιμα warm ΚΑΙ pastel ΚΑΙ vintage. Το supervised vintage-vs-warm (specificity 57.7%) το αποδεικνύει αριθμητικά. Για matching θες **multi-label / soft scores**, όχι exclusive tags.

---

## 8. Recommendations / decisions

- **Warm/cold:** υιοθέτησε **SECTORS_FOLK per-color majority** (warm [340,75), cool [90,315), amb [75,90)∪[315,340), neutral C*<2). → 98%/98% recall, 99.7%/99.3% precision. Καταργεί το live circular-mean (cold 77%). **Deadband out** (ασύμμετρο).
- **Pastel:** **LOCKED** → `L*>60 & chroma<70, ≥60% των χρωμάτων` (supervised 94.7% bal, 92.7% prec). Αντικαθιστά το παλιό `L*>70 & C<50, ≥75%`. **Fix άμεσα το live HSL pastel** (24.6%).
- **Dark:** candidate `mean L*<50 & ≥1 dark` (92% vs live 75%).
- **Vintage:** **όχι** exclusive geometric tag (vs warm/pastel μόλις 67%). Είτε human-only, είτε multi-label "muted" (91% vs ζωηρά). **Διόρθωσε το `pastel ✗ vintage`** στο prompt.
- **Γενικά:** μοχλός για cold/dark = **area/dominance weights** (αν το scrape τα κρατά). Πάντα supervised με πραγματικά negatives, ποτέ recall-vs-untagged. Synthetic/rainbow παλέττες υπάρχουν στη βάση (data hygiene — βλ. warm-small-untagged).

---

## Artifacts (`color-palette-analysis/reports/`)
- `why-chroma-matters.md` — αιτιολόγηση chroma gate.
- `warm-vs-human.html`, `cold-vs-human.html`, `dark-vs-human.html`, `pastel-vs-human.html`, `vintage-vs-human.html` — per-palette σύγκριση vs human, collapsible, style tags + per-color metrics, sections ①-④.
- `cold-webster-vs-hsl.html` — Webster±deadband vs HSL.
- `hue-partition.html` — warm/cold: 3 επιλογές δίπλα-δίπλα (Α 2-cut circular-mean, Γ όρια-Α per-color, **Β SECTORS_FOLK** recommended) με hue wheels + μετρικές.
- `warm-fp.html` — warm false positives (HSL 11 vs Webster 169) + warm-on-untagged.
- `warm-small-untagged.html` — 787 untagged warm ≤3 χρώματα, grid με κρίση (96 dubious / 199 rainbow-synthetic / 492 ok).
- `all-palettes.json` — full dump (13.068, 11.9 MB).
