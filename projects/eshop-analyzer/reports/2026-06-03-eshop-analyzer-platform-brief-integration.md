# eshop-analyzer → platform → brief: Integration Analysis

**TL;DR:** Το store analysis καλύπτει το brand-level κομμάτι του brief (characteristics, audience) και μπορεί να το προ-συμπληρώνει σαν defaults, αλλά **δεν** έχει (ούτε πρέπει) τα per-video δεδομένα (`products`, `placement`). Η πραγματική αξία της σύνδεσης δεν είναι το autofill, αλλά ότι φέρνει **brand colors + logo + taglines + industry** που το brief σήμερα **αγνοεί τελείως** — και αυτό απαιτεί επέκταση του brief.

---

## 1. Concept: δύο διαφορετικά επίπεδα δεδομένων

| | eshop-analyzer | brief |
|---|---|---|
| Επίπεδο | per-**STORE** (ταυτότητα brand) | per-**VIDEO** (συγκεκριμένο render) |
| Συχνότητα | 1× ανά eshop (onboarding) | κάθε φορά που φτιάχνεις video |
| Φύση | σταθερό (brand colors, tone, logo) | μεταβλητό (ποια προϊόντα, ποιο placement) |
| Storage | DynamoDB (key: storeName+domain) | S3 + EventBridge event (`Brief Workflow Completed`) |

Η «σύνδεση» **δεν** σημαίνει 1:1 mapping analysis → brief input. Σημαίνει:

> Το store analysis γίνεται το **brand layer / defaults** που προ-συμπληρώνει τη φόρμα του brief. Ο χρήστης συμπληρώνει μόνο τα per-video (products + placement).

### Ροή
```
onboarding: company δίνει store URL
      ↓ (SQS)
eshop-analyzer → analysis JSON → DynamoDB (key: domain)
      ↓
platform: για κάθε eshop έχει cached την brand ανάλυση
      ↓
user "Create Video" → brief form ΗΔΗ προ-γεμισμένο με brand defaults
   + user διαλέγει products (από product feed) + placement
      ↓ (SQS)
brief → colors + fonts → render
```

---

## 2. Τα δύο enums / vocabularies

### eshop-analyzer `brandTone` (enum, αυστηρό)
Πηγή: `src/utils/store-analysis.js:22`
```
premium | budget | playful | professional | luxury | artisan
```

### brief `characteristics` (de facto vocabulary)
Τεχνικά `string[]` ελεύθερο (`platform-client-v2/src/app/create-video/brief.service.ts:8`), αλλά το UI/test set χρησιμοποιεί σταθερά:
```
Clean | Modern | Slick | Bold | Luxury | Elegant | Vintage | Natural | Playful
```
(Παρατήρηση: στον κώδικα υπάρχουν και commented παραδείγματα με free-form tags: `Tech`, `futuristic`, `Παιδικό`, `fun`, `energetic` → το πεδίο δέχεται οτιδήποτε, δεν validate-άρεται enum.)

### Άλλα brief vocabularies (από UI)
- **placement**: Instagram (reels/posts/stories), TikTok, YouTube, Facebook story κ.ά. (`placement-grid.types.ts`)
- **ageGroup**: `18-24, 25-34, 35-44, 45-54, 55-64, 65+`
- **gender**: `Male | Female`
- **country**: England, Greece, Cyprus, US, DE, FR, IT, JP, … (οδηγεί font subset: Greece/Cyprus → Greek)

---

## 3. Gap analysis: έχει το analysis ό,τι θέλει το brief;

Το brief δέχεται **5 placeholders** στα prompts: `{{AUDIENCE}}`, `{{CHARACTERISTICS}}`, `{{PLACEMENT}}`, `{{PRODUCTS}}`, `{{FONTS}}` (το `fonts` παράγεται εσωτερικά).

| Brief input | Πηγή στο analysis | Κατάσταση |
|---|---|---|
| `characteristics` | `brandTone` enum + `brandToneReasoning` | 🟡 Partial — θέλει mapping brandTone→characteristics |
| `audience.gender` | `targetAudience.gender` (male/female/mixed) | 🟢 Ναι (mixed → ["Male","Female"]) |
| `audience.ageGroup` | `targetAudience.demographics` (free text "18-55") | 🟡 Partial — όχι διακριτά buckets |
| `audience.country` | `storeLanguage.primary` (el) + TLD (.gr) | 🟡 Inferable — γλώσσα ≠ χώρα |
| `placement` | — | 🔴 Λείπει **by design** (per-video επιλογή χρήστη) |
| `products` (name, price, oldPrice, images) | `productCategories` (μόνο ονόματα κατηγοριών) | 🔴 Λείπει — δεν έχει πραγματικά προϊόντα |

**Συμπέρασμα:** Όχι, δεν υπάρχει ΟΛΗ η πληροφορία.
- Brand κομμάτι (characteristics, audience): εκεί ή παράγεται → καλό για defaults.
- Per-video (products, placement): **δεν είναι** και **δεν πρέπει** να είναι στο store analysis.
  - `products` → product feed του eshop (XML/cloudfront, όπως φαίνεται στα brief inputs)
  - `placement` → επιλογή χρήστη τη στιγμή του video

---

## 4. Proposed mapping (brandTone → characteristics)

Πρόταση αρχικού mapping (1 brandTone → 1-3 characteristics defaults, ο χρήστης μπορεί να αλλάξει):

| brandTone | → characteristics defaults |
|---|---|
| premium | Luxury, Elegant, Slick |
| luxury | Luxury, Elegant |
| professional | Clean, Modern, Slick |
| budget | Bold, Clean |
| playful | Playful, Bold |
| artisan | Natural, Vintage, Elegant |

Audience mapping:
- `targetAudience.gender`: male→["Male"], female→["Female"], mixed→["Male","Female"]
- `targetAudience.demographics` (free text) → parse σε ageGroup buckets (ή LLM normalization)
- country: από `storeLanguage`/TLD (π.χ. .gr → Greece). Εναλλακτικά πρόσθεσε `market/country` πεδίο στο eshop-analyzer (ξέρει το TLD ήδη).

---

## 5. Extra πληροφορία στο analysis που το brief ΔΕΝ χρησιμοποιεί σήμερα

### 🔥 #1 ευκαιρία — brand colors
Το brief σήμερα **παράγει χρώματα τυφλά** (από products + characteristics + color-theory insights). **Δεν ξέρει καθόλου τα χρώματα του brand.** Το analysis έχει:
- `brandColors.palette` (3-8 hex), `brandColors.sale`, `brandColorsReasoning`

→ Περνώντας τα ως νέο `{{BRAND_COLORS}}` input, τα videos γίνονται **brand-consistent**. Πιθανόν το #1 reason να γίνει η σύνδεση. Απαιτεί τροποποίηση brief (prompt + input schema).

### Άλλα αξιοποιήσιμα πεδία
| Πεδίο | Πιθανή χρήση |
|---|---|
| `logoUrl.primary` | placement λογότυπου στο template |
| `taglines` (site + creative) | έτοιμα κείμενα για text placeholders |
| `primaryIndustry` / `secondaryIndustries` | style/color steering, template selection |
| `targetAudience.interests` + `lifestyle` | πλουσιότερο audience signal |
| `socialMedia` | handles/CTA στο outro |
| `storeDescription` | context για copy |
| `estimatedStoreSize` | tier/pricing logic |
| `storeLanguage.supported` | font subset (καλύτερο από country) |
| `confidence` | quality gate: αν < threshold → manual review πριν autofill |

---

## 6. Engineering gaps για το implementation

1. **Join key**: analysis κλειδώνεται σε `domain`. Η πλατφόρμα πρέπει να συνδέει company/tenant ↔ domain (από store URL onboarding).
2. **Trigger**: ποιος/πότε καλεί eshop-analyzer (signup, ή manual "re-analyze").
3. **Mapping layer**: analysis → brief defaults (πίνακες §4). Πού ζει; (client ή microservice).
4. **Brief extension** (για brand colors): `{{BRAND_COLORS}}` σε prompts + input schema + palette-enricher logic.
5. **Products**: παραμένουν ξεχωριστό pipeline (product feed), εκτός analysis.
6. **Read API**: το `getStoreAnalysis()` υπάρχει ήδη στο eshop-analyzer (query by storeName) — αξιοποιήσιμο από την πλατφόρμα.

---

## 7. Bottom line
- **Όχι** όλη η brief πληροφορία υπάρχει: λείπουν `products` + `placement` (σωστά, per-video).
- **Ναι** το brand-level (characteristics + audience) καλύπτεται/παράγεται → ιδανικό για defaults.
- Το **μεγάλο win**: brand colors + logo + taglines + industry που το brief αγνοεί → brand-consistent videos. Θέλει επέκταση του brief.

## Πηγές (code refs)
- eshop-analyzer schema: `src/utils/store-analysis.js` (ANALYSIS_SCHEMA, brandTone enum L22)
- eshop-analyzer recipe: `src/workflow/prompts/store-analysis-system.md`
- brief placeholders: `brief-localhost/src/workflow/prompts/*.md`, `brief-workflow.js`
- brief input shape: `brief-localhost/inputs/*.json`
- characteristics vocab: `platform-client-v2/src/app/create-video/brief.service.ts`, `inputs/test-*.json`
- placement vocab: `platform-client-v2/.../brief/placement-grid/placement-grid.types.ts`
