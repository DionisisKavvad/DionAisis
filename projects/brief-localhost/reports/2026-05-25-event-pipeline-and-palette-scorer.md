# Brief workflow event-pipeline overhaul + palette scorer spec

**TL;DR:** Δύο ανεξάρτητα tracks σήμερα. (1) Διορθώθηκε ο τρόπος που το brief-localhost εκπέμπει το `WORKFLOW_COMPLETED` event ώστε να μη χάνεται το `outputs` payload για μεγάλα briefs (~1MB), και update στο `video-brief-service-v2` ώστε ο status endpoint να υπογράφει fresh presigned URL on-demand. End-to-end επιβεβαιωμένο. (2) Documented + ported-ready ο deterministic palette-scorer v2 που αντικαθιστά τον opaque AI selector — έτοιμος για port στο platform-client-v2.

---

## Track 1 — Event pipeline overhaul

### Πρόβλημα που λύθηκε

Status response από την πλατφόρμα γύρναγε `outputs: null`, `totalSteps: 3`, και `font-matrix-layers: PENDING` ακόμα και για Greek briefs (όπου το step δεν τρέχει). UI popup έκλεινε σιωπηλά γιατί δεν έβρισκε `outputs.palettes`.

### Root causes (3 ξεχωριστά bugs)

| # | Bug | Που | Σχόλιο |
|---|---|---|---|
| 1 | `WORKFLOW_COMPLETED` event με inline `outputs ~990KB` ξεπερνούσε το 256KB EventBridge limit → silent S3 spill σε internal location → consumer δεν ακολουθούσε pointer | brief-localhost (sender) | Επιβεβαιώθηκε στα logs: `Event overflow: 399KB → S3 (events/.../...payload.json)` |
| 2 | `getWorkflowSteps('full', subset)` αγνοούσε το subset — πάντα γύρναγε 3 Latin steps ακόμα και για Greek brief | brief-localhost `src/workflow/brief-workflow.js:73-81` | Το event δήλωνε λάθος expected steps |
| 3 | Status aggregator hardcoded `STEP_NAMES = ['color-tags','font-matrix-layers','font-pairing']` + διάβαζε μόνο `properties.outputs`, αγνοούσε νέα fields | aws-microservices `services/video-brief-service-v2/src/handlers/get-brief-status.ts` | Συνέπεια: response totalSteps=3 πάντα, outputs:null πάντα για μεγάλα briefs |

### Αλλαγές στο brief-localhost

`src/services/event-emitter-service.js` → `recordWorkflowCompleted()` δέχεται `outputs`, `outputsRef`, `outputsSummary` (exactly-one-of). `outputs` removed από inline emission για large payloads.

`src/workflow/brief-workflow.js`:
- `handleS3Upload()` επιστρέφει τώρα `{bucket, basePath, uploadedAt, successCount, failCount}` (πριν επέστρεφε undefined).
- `emitWorkflowCompletedEvent()` ξαναγράφτηκε: decision logic per request:
  - ≤ 150KB → `outputs` inline (όπως πριν, backwards compat για colors-only / small runs).
  - 150KB → `outputsRef: { s3Bucket, s3Key, uploadedAt, sizeBytes }` (χωρίς presignedUrl — υπογράφεται downstream).
  - Πάντα `outputsSummary: { paletteCount, textElementsPairCount, sizeBytes }`.
- Σειρά εκτέλεσης άλλαξε: S3 upload **πριν** event emission, ώστε ο consumer να βρίσκει το artifact όταν λαμβάνει το event.
- `getWorkflowSteps()` (`brief-workflow.js:73-83`): full mode πια διακρίνει subset — Greek = 2 steps, Latin = 3.

### Αλλαγές στο aws-microservices (`services/video-brief-service-v2`)

`serverless.yml` → προστέθηκαν `S3_ACCESS_KEY` / `S3_SECRET_KEY` env vars **μόνο** στο `get-brief-status` function, από το shared `config.dev.yml` `s3.presignedRoleCredentials` (ίδιο pattern με `presigned-urls-service` και `query-colors`).

`src/handlers/get-brief-status.ts` — πλήρης rewrite του core flow:
- Αφαίρεση hardcoded `STEP_NAMES`. Νέα helper `getExpectedSteps(allEvents)` διαβάζει το `Brief Workflow Started` event και παίρνει `properties.workflow.steps`. Fallback στο legacy `[3 steps]` μόνο αν το event δεν δηλώνει.
- `totalSteps: expectedSteps.length` (dynamic).
- Single DynamoDB query (`getAllEvents`) αντί για δύο (`getStepEvents` + `getLatestEvent`) — local partition.
- COMPLETED branch: εξάγει και `outputs` και `outputsRef`. Αν υπάρχει `outputsRef`, υπογράφει νέο presigned URL με `getSignedUrl` + dedicated IAM user (`S3_ACCESS_KEY`/`S3_SECRET_KEY`), TTL = 1h, fresh κάθε κλήση API.

`src/types/index.ts` → νέοι τύποι `OutputsRef` (server-fills `presignedUrl` + `presignedUrlExpiresAt`), `OutputsSummary`. `BriefStatusResponse` επεκτάθηκε.

`package.json` → pin `@aws-sdk/client-s3@3.758.0` + `@aws-sdk/s3-request-presigner@3.758.0` (match υπάρχουσας έκδοσης `@aws-sdk/client-dynamodb` για να μη σπάει το `@smithy/types` type-check).

### S3 CORS

`brief-logs-dev` bucket **δεν είναι managed** από το `core/s3-stack/serverless.yml`. Browser fetch έπεφτε σε CORS error.

Άμεση εφαρμογή out-of-band μέσω AWS CLI (`aws s3api put-bucket-cors`):
```json
{
  "CORSRules": [{
    "AllowedHeaders": ["*"], "AllowedMethods": ["GET"],
    "AllowedOrigins": ["*"], "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 1800
  }]
}
```

**TODO (drift risk):** να μπει στο `core/s3-stack/serverless.yml` με `DeletionPolicy: Retain`. Για prod sharpen το `AllowedOrigins` στο specific UI domain.

### Νέα developer tools

| Script | Σκοπός |
|---|---|
| `brief-localhost/scripts/send-test-sqs.cjs` | Στέλνει `inputs/input.json` στο SQS queue με σωστό `requestId` MessageAttribute. Δοκιμή του dev SQS worker end-to-end χωρίς να μπλέξεις με την πλατφόρμα. |
| `brief-localhost/scripts/get-event.cjs` | DynamoDB query για όλα τα events ενός requestId. Δείχνει inline-vs-ref state, presignedUrl status, expected vs completed steps. Διαγνωστικό όταν UI/aggregator δείχνει κάτι περίεργο. |

### Documentation

`brief-localhost/docs/workflow-completed-event-schema.md` — πλήρες schema του νέου event με Variant A (inline) / Variant B (ref), field reference, client integration one-liner (`outputs ?? fetch(outputsRef.presignedUrl)`), step-completion check, error handling table, migration checklist, backwards compat note. Σχεδιασμένο για παράδοση στην ομάδα του UI / aggregator.

### Verification

End-to-end test ζωντανά: brief από πλατφόρμα → SQS → worker → `WORKFLOW_COMPLETED` με `outputsRef` → API call `GET /dev/brief/{requestId}` → fresh presigned URL → browser fetch με `Origin: http://localhost:4200` → HTTP 200 + `Access-Control-Allow-Origin: *` + 990KB JSON με palettes+textElements ✅.

### Pending

- Deploy aws-microservices σε prod stage.
- UI repo: ενημέρωση να χρησιμοποιεί `outputs ?? fetch(outputsRef.presignedUrl)` pattern.
- Παλιά events πριν το `getWorkflowSteps` fix έχουν frozen Latin defaults στο `Brief Workflow Started` event για Greek briefs. Νέα events σωστά.
- Αν χρειαστεί να ξανα-πειραχτεί ο step naming στο aggregator, υπάρχει ακόμα ένα fallback `DEFAULT_STEP_NAMES = [3 steps]` στο `get-brief-status.ts:24` για legacy events.

---

## Track 2 — Palette scorer (separate, parallel work)

### Γιατί υπάρχει (το πρόβλημα)

Το AI workflow παράγει **5** color palette recommendations για κάθε brief. Το UI χρειάζεται **1** για να φτιάξει το τελικό video creative. Παλιότερα το `platform-client-v2` καλούσε `selectBestPaletteTheme(outputs.palettes)` που ήταν:

- **Opaque** — κανείς δεν μπορούσε να εξηγήσει γιατί επιλέχθηκε το συγκεκριμένο.
- **Μη αναπαραγώγιμο** — ίδιο input, διαφορετικό output αν άλλαζε κάτι internal.
- **Costly** αν γινόταν με δεύτερη κλήση LLM (latency + tokens) χωρίς κανείς να επιβλέπει.

Decision context (κλειδωμένο):
- Fully-automated pipeline — κανείς άνθρωπος δεν βλέπει τα 5, χρειάζεται 1 deterministic answer.
- No AI in hot path — η δεύτερη κλήση LLM σαν "judge" αποκλείστηκε.
- Επομένως: rule-based scorer είναι ο μόνος δρόμος μέσα σε αυτά τα constraints.

Αυτό **δεν** είναι ο `color-role-scorer` (που βαθμολογεί τα χρώματα ΜΕΣΑ σε ένα palette για να αντιστοιχίσει color → layer). Είναι ένα step πριν: ποιο από τα 5 themes παίρνουμε.

### Πώς λειτουργεί σε μία πρόταση

Από το brief εξάγονται μερικά boolean signals (fastSocial, age1824, discount...) και η συνάρτηση `score()` αθροίζει βάρη από 3 lookup tables + ένα μετρημένο contrast (luminance spread) + penalties, παράγοντας ένα νούμερο per recommendation. Sort DESC, take top-1.

### Inputs

**Brief** (όπως ήρθε στο SQS):
```js
{
  characteristics: ["Clean", "Modern", "Slick"],
  audience: { ageGroup: ["18-24","25-34"], gender: [...], country: "..." },
  placement: "reels",
  products: [{ price: "€40,00", oldPrice: "€80,00", ... }, ...]
}
```

**Recommendation** (ένα από τα 5 στο `outputs.palettes` του brief-localhost — enriched με palette API data):
```js
{
  colorTags: ["azure", "cyan"],          // hue tags
  styleTags: ["bright", "gradient"],     // style tags
  reasoning: "...",                       // unused by scorer
  paletteData: {
    palettes: {                           // grouped by color count
      "2colors": [{ palette: [{color, luminance, hueCategory}, ...] }, ...],
      "3colors": [...],
      ...
    }
  }
}
```

Σημαντικό: ο scorer **δεν διαβάζει hex colors directly**, μόνο `luminance` (για το contrast term) και tags.

### Βήμα 1 — Signals από το brief

Όλα εξάγονται από τη `deriveSignals(brief)`:

| Signal | Πώς υπολογίζεται |
|---|---|
| `fastSocial` | placement (lowercased, no spaces/hyphens) ∈ `{reels, tiktok, igstory, fbstory, igreel, fbreel, story, shorts}` |
| `slow` | placement ∈ `{posts, post, youtube}` |
| `age1824` | `audience.ageGroup` (norm'd) includes `"18-24"` |
| `age35plus` | οποιοδήποτε ageGroup ταιριάζει με `/^(35|45|55|65)/` |
| `discount` | οποιοδήποτε product έχει `parsePrice(oldPrice) > parsePrice(price)` |
| `characteristics` | κάθε characteristic → lowercase, strip spaces/hyphens, εφαρμογή alias map (`premium→luxury`, `fun→playful`, `organic→natural`, `retro→vintage`) |

`parsePrice("€80,00") → 80`:
1. Strip ό,τι δεν είναι `[0-9.,]` → `"80,00"`
2. Remove thousand separator dots → unchanged
3. Replace `,` με `.` → `"80.00"`
4. `parseFloat` → `80`

### Βήμα 2 — Lookup tables (3 πίνακες, locked numbers)

**Table A — styleTag × placement/audience/promo** (multiplier ×1.0):

| styleTag | fast-social | slow | 18-24 | 35+ | discount |
|---|---|---|---|---|---|
| bright | +0.5 | −0.5 | +1.0 | −1.0 | +1.5 |
| gradient | 0 | −1.0 | +0.5 | −0.5 | +0.5 |
| dark | +0.5 | +1.0 | 0 | +1.0 | 0 |
| pastel | −0.5 | +1.0 | 0 | +1.0 | −1.0 |
| monochromatic | +0.5 | +0.5 | 0 | +0.5 | 0 |
| vintage | −0.5 | +1.0 | −0.5 | +1.5 | −0.5 |
| cold | +0.5 | 0 | 0 | 0 | 0 |
| warm | +0.5 | 0 | 0 | 0 | 0 |

Πώς διαβάζεται: αν το recommendation έχει `styleTag = "bright"` ΚΑΙ το brief έχει `discount = true`, προσθέτεις +1.5 στο Term A.

**Table B — characteristic → styleTag bonus** (multiplier ×1.5):

| characteristic | mono | pastel | bright | gradient | cold | dark | vintage | warm |
|---|---|---|---|---|---|---|---|---|
| clean | +2 | +1 | +0.5 | −0.5 | 0 | 0 | −1 | 0 |
| modern | 0 | 0 | +1 | +1.5 | +1 | 0 | −2 | 0 |
| slick | +1 | −1 | 0 | +1 | +1.5 | +1 | 0 | 0 |
| luxury | +1 | 0 | −1 | 0 | 0 | +2 | +0.5 | 0 |
| playful | −1 | +1 | +2 | +1 | 0 | −1 | 0 | +1 |
| natural | 0 | +1 | 0 | 0 | 0 | 0 | +1 | +1 |
| bold | 0 | −1 | +1 | +1 | 0 | +1 | 0 | 0 |
| vintage | 0 | +0.5 | −1 | 0 | 0 | 0 | +3 | +1 |

Πώς διαβάζεται: brief έχει `Clean`, recommendation έχει `monochromatic` → +2. Brief έχει `Modern`, recommendation έχει `gradient` → +1.5. Άγνωστο characteristic → silent 0.

**Table C — hue colorTag → temperature T και energy E**:

| hue | T | E | hue | T | E |
|---|---|---|---|---|---|
| red | +2 | 2.0 | cyan | −2 | 1.0 |
| orange | +2 | 1.5 | azure | −1.5 | 0.5 |
| yellow | +1.5 | 1.5 | blue | −2 | 0.5 |
| chartreuse-green | +0.5 | 1.5 | violet | −0.5 | 0.5 |
| spring-green | +0.5 | 1.0 | magenta | +1 | 1.5 |
| green | 0 | 0.5 | rose | +1 | 0.5 |

T: −2 (ψυχρό) → +2 (ζεστό). E: 0 (ήρεμο) → 2 (δυνατό). Χρησιμοποιείται στο Term Energy και στα warm/cold penalties.

### Βήμα 3 — Τα 4 terms + penalties

**Term A (placement/audience/promo)** ×1.0
```
Για κάθε styleTag στο recommendation:
  Βρες τη γραμμή στο Table A.
  Πρόσθεσε τις στήλες που είναι active (fastSocial/slow/age1824/age35plus/discount).
```

**Term B (characteristics)** ×1.5
```
Για κάθε characteristic στο brief:
  Για κάθε styleTag στο recommendation:
    Πρόσθεσε το Table B[characteristic][styleTag] (default 0).
```
Χρησιμοποιεί τη βαρύτερη πολλαπλασιαστική. Είναι ο dominant signal για briefs με σαφή tone-of-voice.

**Term Energy** ×1.0
```
Για κάθε colorTag στο recommendation (E = Table C energy):
  Αν fastSocial ΚΑΙ age1824: + 0.5 × E
  Αλλιώς αν slow:            + 0.5 × (2 - E)
  Αλλιώς:                    + 0
```
Φιλοσοφία: στα reels/tiktok με νεαρό κοινό θες ζωηρά (high E). Στα slow placements (posts/youtube) θες πιο ήρεμα (`2 - E` αναστρέφει).

**Term D (contrast)** ×2.0 — **primary signal**
```
spread(palette) = max(luminance) - min(luminance)  πάνω στα colors του palette
avgLuminanceSpread = mean spread πάνω σε ΟΛΑ τα candidate palettes
                     όλων των color-count groups του paletteData
contrastTerm = 2.0 × avgLuminanceSpread
```
Διαβάζει τα πραγματικά luminance values από το enriched palette data. Το ξεχωριστικό: τα tags δεν "βλέπουν" το spread, οπότε χωρίς αυτό το term το rulebook διάλεγε muddy palettes. Range στην πράξη ~0 → ~0.75, άρα συνεισφορά ~0 → +1.5.

#### Πώς υπολογίζεται το spread (deep-dive)

**Luminance:** τιμή 0→1 που λέει πόσο "φωτεινό" είναι ένα χρώμα ως αντίληψη ματιού. `0.0` = μαύρο, `0.5` = μεσαίο γκρι, `1.0` = λευκό. Το enriched palette data (palette API) το δίνει ήδη υπολογισμένο per color — δεν το υπολογίζουμε εμείς.

**Δομή του `paletteData`:** Κάθε recommendation **δεν έχει 1 palette** — έχει πολλά **candidate palettes** ομαδοποιημένα ανά color count:
```js
paletteData.palettes = {
  "2colors": [ palette1, palette2, ... ],
  "3colors": [ palette3, palette4, ... ],
  "4colors": [ ... ],
  // ... έως "6colors"
}
palette = {
  palette: [
    { color: "#1a3b5c", luminance: 0.18, hueCategory: "azure" },
    { color: "#a8d4f0", luminance: 0.78, hueCategory: "azure" },
    ...
  ]
}
```

**Αλγόριθμος (`avgLuminanceSpread`):**
```
spreads = []
για κάθε group (2colors..6colors):
  για κάθε candidate palette στο group:
    lums = όλα τα luminance values του palette (skip αν < 2 colors)
    spread_του_palette = max(lums) − min(lums)
    spreads.push(spread_του_palette)
return mean(spreads)   // ή 0 αν δεν υπάρχουν spreads
```

**Concrete example** — recommendation με 4 candidate palettes:

| Group | Palette | Luminances | spread = max−min |
|---|---|---|---|
| 2colors | A | [0.10, 0.85] | **0.75** ← υψηλό contrast (σκούρο+φωτεινό) |
| 3colors | B | [0.25, 0.50, 0.78] | **0.53** |
| 3colors | C | [0.40, 0.45, 0.50] | **0.10** ← muddy, όλα μεσαία γκρι |
| 4colors | D | [0.15, 0.40, 0.60, 0.92] | **0.77** |

```
spreads = [0.75, 0.53, 0.10, 0.77]
avgLuminanceSpread = (0.75 + 0.53 + 0.10 + 0.77) / 4 = 0.5375
Term D = 2.0 × 0.5375 = 1.075
```

**Σχεδιαστικές επιλογές & γιατί:**

| Επιλογή | Λόγος |
|---|---|
| **Per-palette spread**, όχι global `max(όλων) − min(όλων)` | Αν είχαμε ένα muddy palette + ένα σκουρόλευκο, το global θα έδινε ψεύτικα υψηλό score. Εμείς μετράμε τη μέση contrast capability **των διαθέσιμων palettes**. |
| **Average**, όχι max | Το recommendation θα χρησιμοποιηθεί downstream και θα διαλέξει κάποιο candidate. Αν τα μισά είναι muddy, ο average τα πιάνει σαν risk. Max θα έλεγε "υπάρχει ένα καλό" χωρίς να ζυγίζει αξιοπιστία. |
| **Filter `lums.length >= 2`** | Palette με 1 χρώμα δεν έχει νόημα spread. Skip silently. |

**Γιατί είναι το #1 signal** — σύγκριση από acceptance test:

| Rec | tags | spread | Term D | Παρατήρηση |
|---|---|---|---|---|
| #4 (winner v2) | bright+gradient | 0.715 | 1.43 | high contrast → καθαρά διακριτό σε mobile reel |
| #3 (loser v2) | dark+mono | 0.046 | 0.09 | όλα τα candidate palettes muddy → invisible σε reels |

Τα tags του #3 (`dark`+`mono`) ακούγονται "premium" στο rulebook. Αλλά τα **πραγματικά luminance values** προδίδουν ότι το #3 παράγει unreadable creatives. Χωρίς το Term D, το rulebook διάλεγε σιωπηλά κακά palettes με σωστά tags. Με Term D × 2.0, η μετρημένη contrast quality νικάει τα soft signals των tags.

**Coherence penalties** (αφαιρετικά)

| Συνθήκη | Penalty |
|---|---|
| styleTag `bright` ΚΑΙ `dark` μαζί | −1 |
| styleTag `pastel` ΚΑΙ `dark` μαζί | −1.5 |
| styleTag `cold` αλλά avg(colorTag T) > +0.5 | −2 |
| styleTag `warm` αλλά avg(colorTag T) < −0.5 | −2 |

Φιλοσοφία: penalize ασυνεπή tag combinations που υποδηλώνουν AI confusion.

### Τελική σύνθεση

```
score = 1.0 × Σ(Table A)
      + 1.5 × Σ(Table B)
      + 1.0 × Σ(Energy)
      + 2.0 × avgLuminanceSpread       ← primary, contrast-driven
      +       penalties (negative)
```

Tie-break (deterministic order):
1. Higher pool coverage (συνολικό count candidate palettes σε όλα τα groups).
2. Λιγότερα συνολικά tags (`colorTags.length + styleTags.length`).
3. Μικρότερο original index.

### Worked example A — Winner (#4)

**Brief:** placement=`reels`, ageGroup=`["18-24","25-34"]`, characteristics=`["Clean","Modern","Slick"]`, products με discount.

**Derived signals:** `fastSocial=true, age1824=true, age35plus=false, slow=false, discount=true`, characteristics=`["clean","modern","slick"]`.

**Recommendation #4:** colorTags=`["azure","cyan"]`, styleTags=`["bright","gradient"]`, spread=`0.715`.

**Term A** — active columns: fastSocial, age1824, discount (slow και age35plus = inactive).
- `bright`: +0.5 (fastSocial) + 1.0 (age1824) + 1.5 (discount) = **+3.0**
- `gradient`: +0 (fastSocial) + 0.5 (age1824) + 0.5 (discount) = **+1.0**
- Σ = 4.0 → × 1.0 = **4.0** ✅

**Term B** — για κάθε characteristic × κάθε styleTag:
- `clean × bright` = +0.5, `clean × gradient` = −0.5 → 0
- `modern × bright` = +1, `modern × gradient` = +1.5 → +2.5
- `slick × bright` = 0, `slick × gradient` = +1 → +1.0
- Σ = 3.5 → × 1.5 = **5.25** ✅

**Term Energy** — fastSocial ΚΑΙ age1824 → `0.5 × E`:
- `azure`: E=0.5 → +0.25
- `cyan`: E=1.0 → +0.50
- Σ = 0.75 → × 1.0 = **0.75** ✅

**Term D** — `2.0 × 0.715` = **1.43** ✅

**Penalties** — δεν έχει `dark`/`pastel`/`cold`/`warm` στα styleTags → **0**.

**Total = 4.0 + 5.25 + 0.75 + 1.43 + 0 = 11.43** 🏆

### Worked example B — Loser (#3, γιατί χάνει)

**Recommendation #3:** colorTags=`["violet","blue"]`, styleTags=`["dark","monochromatic"]`, spread=`0.046`.

- **Term A:** `dark` (+0.5 fastSocial) + `mono` (+0.5 fastSocial) = 1.0 → × 1.0 = **1.0**
- **Term B:** `clean × mono` (+2), `slick × dark` (+1), `slick × mono` (+1) → 4.0 → × 1.5 = **6.0**
- **Term Energy:** `violet` (E=0.5) + `blue` (E=0.5), `0.5 × E` ανά = 0.25 + 0.25 = **0.5**
- **Term D:** `2.0 × 0.046` = **0.09** ← κατακόρυφη πτώση εδώ
- **Penalties:** dark+mono δεν τιμωρείται → **0**

**Total = 1.0 + 6.0 + 0.5 + 0.09 + 0 = 7.59** (τελευταίο)

Τι δείχνει: το #3 είχε καλό Term B (6.0, οι characteristics ταίριαζαν στους τόνους του monochromatic+dark), αλλά το **μετρημένο contrast ήταν catastrophic (0.046)** → muddy, αόρατο σε mobile sound-off context. Πριν το v2 (όπου το contrast ήταν μόνο tie-break) αυτό δεν θα φαινόταν.

### v1 → v2 — Τι άλλαξε και γιατί

Μετά από review (video designer + social strategist + devil's advocate):

| Αλλαγή | Λόγος |
|---|---|
| Contrast από tie-break → **primary scored term** (×2.0) | Tags δεν "βλέπουν" το πραγματικό luminance spread. v1 διάλεγε muddy palettes με σωστά tags. |
| Διόρθωση cold/warm zeroing στο Table A | v1 τιμωρούσε δομικά τα `clean` briefs χωρίς εμφανή λόγο. |
| Μείωση "fast-social = louder" bonuses | Designer myth του 2018· τα data της εποχής δείχνουν αντίθετο. |
| `dark × discount` = 0 (από +) | `dark` = premium tone, αντίθετο της urgency που θες σε discount. |
| Διορθωμένα T values για violet/cyan/azure | v1 είχε λάθος polarity, ενεργοποιούσε λάθος warm/cold penalties. |
| `bright+dark` penalty −3 → −1 | High contrast = ιδανικό σε mobile, όχι warning sign. |

Επίδραση στο acceptance test:
- #1 ανέβηκε από τελευταίο → 2ο (το cold/warm fix το έσωσε). Τώρα neck-and-neck με #4 (διαφορά < 1pt).
- #3 έπεσε από μεσαίο → τελευταίο (το Term D τιμώρησε σωστά το 0.046 spread).
- Winner παρέμεινε #4 αλλά για **defensible** λόγο (μετρημένο contrast 0.715), όχι από stacked soft signals.

### Παραδοτέα

| Αρχείο | Τι κάνει |
|---|---|
| `src/workflow/palette-scorer.js` | Reference implementation (206 lines, ES module). Exports `deriveSignals`, `avgLuminanceSpread`, `scoreRecommendation`, `rankPalettes`. Pure functions, no I/O, no side effects → unit-testable. |
| `scripts/score-palettes.js` | CLI που τρέχει το scorer πάνω σε `.output/<run>/artifacts/color-tags-enriched.json` + brief input, τυπώνει ranked πίνακα. Usage: `node scripts/score-palettes.js .output/<folder>`. |
| `scripts/palette-report.js` | Συνοδευτικό reporting / batch analysis. |
| `docs/palette-selection-rulebook.md` | v2 rulebook με όλα τα tables, worked examples, decision rationale, known limitations. Living document. |
| `docs/palette-scorer-porting-spec.md` | Self-contained spec για port σε TypeScript/Angular (`platform-client-v2`). Περιλαμβάνει acceptance test που πρέπει να περάσει exact. |
| `docs/palette-tag-report.md` | Background ανάλυση των tag distributions στα ιστορικά briefs. |

### Acceptance test (locked — αν δεν περάσει, ο port είναι λάθος)

Brief: `placement="reels"`, `ageGroup=["18-24","25-34"]`, `characteristics=["Clean","Modern","Slick"]`, με discount.

| # | colorTags | styleTags | spread | A | B | energy | D | TOTAL |
|---|---|---|---|---|---|---|---|---|
| **4** | azure,cyan | bright,gradient | 0.715 | 4.00 | 5.25 | 0.75 | 1.43 | **11.43 🏆** |
| 1 | azure,blue | cold,monochromatic | 0.378 | 1.00 | 8.25 | 0.50 | 0.76 | **10.51** |
| 2 | cyan,azure,blue | gradient,cold | 0.546 | 1.50 | 6.75 | 1.00 | 1.09 | **10.34** |
| 5 | blue,magenta | gradient,dark | 0.442 | 1.50 | 4.50 | 1.00 | 0.88 | **7.88** |
| 3 | violet,blue | dark,monochromatic | 0.046 | 1.00 | 6.00 | 0.50 | 0.09 | **7.59** |

Ranked order: **#4 → #1 → #2 → #5 → #3**.

### Pending / open

- **Port** σε TypeScript/Angular στο `platform-client-v2`. Public API ίδιο: `rankPalettes(recommendations, brief)`, take `[0]`.
- **Acceptance test πρέπει να περάσει exact** — αν διαφέρει κατά 0.01 σε οποιοδήποτε term, υπάρχει bug στο port.
- **Tunable numbers** — design-judgment + review consensus, ΟΧΙ data-derived. Treat as v0. A/B/CTR validation σε επόμενη φάση.
- **#1 missing signal (κατά τους 3 reviewers): product-image colors** — camouflage risk (palette που χάνεται μέσα στο προϊόν δεν "ποπάρει"). Out of scope v0· χρειάζεται product-aware scoring term σε επόμενη μεθόδο.
- **Άλλα out-of-scope v0:** caption/UI safe-zone overlap, brand-color consistency.
- **Pool coverage** = μόνο tie-break — ίσως πρέπει να γίνει scored penalty (winner με pool=1 έχει zero downstream variety = risky).
- **Άγνωστο characteristic / hue / tag επιστρέφει σιωπηλά 0** → invisible degradation. Maintenance owner = TBD.

---

---

## Track 3 — Χαλάρωση του AND στο palette-matching (`query-colors` service)

> Όλα τα συγκεκριμένα νούμερα είναι παραπεμπόμενα σε source. Όσα είναι projection (μη μετρημένα ακόμα στο live system) σημειώνονται ρητά.

### Πού ζει ο κώδικας

- **Repo:** `aws-microservices/services/query-colors/`
- **Handler:** `src/get-palettes-based-on-tags.ts`
- **DynamoDB table:** `dev_color-palettes` (line 154)
- **Read pattern:** `Scan` (όχι Query) με paginated `LastEvaluatedKey` loop — διαβάζει όλο το table σε κάθε API call.
- **Splitting σε color-count groups:** το όνομα κάθε palette είναι string της μορφής `"<color>-<color>-...-<color>"`. Ο handler μετρά `name.split('-').length` (line 84) και φτιάχνει buckets `2colors`/`3colors`/.../`6colors`.

### Ροή σε σχέση με τα άλλα tracks

```
1. brief-localhost: LLM γεννά 5 recommendations με tags
2. brief-localhost (palette-enricher.js, line 26-58):
      για κάθε recommendation, POST { colorTags, styleTags } στο query-colors API
3. query-colors handler (που πειράξαμε):
      a. Scan DynamoDB (paginated)
      b. Filter ή Rank με βάση tags  ← ΕΔΩ είναι η αλλαγή AND → weighted
      c. Split σε color-count groups
      d. Return { colorTags, propertyTags, palettes: {2colors:..., 3colors:..., ...} }
4. brief-localhost: ενώνει σε enriched recommendation
5. platform-client-v2: ο palette-scorer του Track 2 διαλέγει 1 από τα 5
```

### Το παλιό path — strict AND + linear fallback (default σήμερα)

Όλα τα παρακάτω είναι ευθεία από τον κώδικα `get-palettes-based-on-tags.ts` (lines 63-80, 172-178, 230-255):

```ts
// Φίλτρο: μια παλέτα κρατιέται μόνο αν έχει ΟΛΑ τα tags
function containsElementsOfSublist(mainList, subList) {
  for (let element of subList) if (!mainList.includes(element)) return false;
  return true;
}

// Loop με fallback drops
while (matchingPalettes.length === 0) {
  let newTags = fallbackCases(`case${loop}`, paletteTags);
  if (newTags == null) break;
  matchingPalettes = palettes.filter((p) =>
    containsElementsOfSublist(p.tags, [...newTags.colorTags, ...newTags.propertyTags])
  );
  loop += 1;
}
```

```ts
function fallbackCases(caseName, tags) {
  switch (caseName) {
    case 'case1': return { colorTags: tags.colorTags,             propertyTags: tags.propertyTags };
    case 'case2': return { colorTags: tags.colorTags,             propertyTags: tags.propertyTags.slice(0, -1) };
    case 'case3': return { colorTags: tags.colorTags.slice(0,-1), propertyTags: tags.propertyTags };
    case 'case4': return { colorTags: tags.colorTags.slice(0,-1), propertyTags: tags.propertyTags.slice(0,-1) };
    default:      return null;
  }
}
```

Δηλαδή 4 attempts: ξεκινάει με όλα τα tags, μετά drops στις θέσεις `.slice(0,-1)`. Drop στρατηγική = "πάντα το τελευταίο" — δεν λαμβάνει υπόψη rarity ή semantic weight. Αν τα 4 attempts γυρίσουν 0, η response είναι empty (ο handler δεν early-exits, απλά γυρίζει `palettes: { ...: [] }` με zero matches).

### Quantitative evidence — γιατί ο AND έδινε λίγα results

Source: `color-palette-analysis/analysis/brief-matching-improvements.md` (analysis snapshot σε dataset `12.106 παλέτες`). Πιο πρόσφατο tag census στο `brief-localhost/docs/palette-tag-report.md` έχει `5.840 παλέτες` (διαφορετικό slice / time period). **Τα ποσοστά παρακάτω είναι ratios — ισχύουν ανεξάρτητα από absolute count.**

5 real recommendations από ένα brief, και τι pool έπαιρναν:

| # | requested colorTags | requested styleTags | echoed tags στο response | final pool |
|---|---|---|---|---|
| 1 | azure, cyan | cold, monochromatic | cold, mono (ίδια) | **7** |
| 2 | blue, violet | dark, gradient | dark, gradient (ίδια) | **5** |
| 3 | cyan, green | bright, gradient | bright (← gradient dropped) | **76** |
| 4 | azure, violet, blue | cold, pastel | cold, pastel (ίδια) | **10** |
| 5 | magenta, violet | dark, monochromatic | dark (← mono dropped) | **26** |

Q3 και Q5: γύρισαν εύρος μόνο επειδή ο fallback drop μάτωσε ένα tag. Q1, Q2, Q4: η AND-intersection ήταν 5-10 παλέτες σε όλο το dataset.

Decomposition του Q1 (`azure ∩ cyan ∩ cold ∩ monochromatic`, από `brief-matching-improvements.md`):
```
12.106 παλέτες σύνολο
  → 1.522 έχουν "cold"                       (12.5%)
  → 1.766 έχουν "monochromatic"              (14.6%)
  → 177   έχουν "cold" AND "monochromatic"   (1.5%)
  → 39    + "azure"
  → 7     + "cyan"
```

Κάθε extra `∩` έκοβε κατά factor 5-10x.

Δομικοί λόγοι (από το ίδιο analysis):

| Λόγος | Στοιχείο |
|---|---|
| Cross-style intersections small | `cold ∩ mono` = 177, `bright ∩ gradient` = 44, `dark ∩ gradient` = 33, `dark ∩ mono` = 33 |
| `dark` σπάνιο | 5.8% του dataset (703/12.106). Causal: `LUMINANCE_LOWER_THRESHOLD = 0.02` στο `process-palettes-v2.js` πετάει παλέτες με ένα μόνο χρώμα `luminance < 0.02`. Στο Color Hunt import χάθηκαν 151/243 dark παλέτες |
| Hue cross-pairs zero | `magenta ∩ violet` = 0 σε όλο το dataset (παρόλο που υπάρχουν 1.252 magenta + 1.724 violet ξεχωριστά). Λόγος: τα hues σπάνια συμπίπτουν σε ίδιο palette γιατί τα palette-import sources τα γκρουπάρουν διαφορετικά |

### Το νέο path — Weighted scoring (feature-flagged)

Πέρα από `SCORING_MODE` το feature flag, υπάρχουν 4 ακόμα tunable params, όλα διαβάζονται directly από env στην εκκίνηση (lines 27-32):

```ts
const SCORING_MODE     = (process.env.SCORING_MODE || 'and').toLowerCase();
const W_STYLE          = Number(process.env.W_STYLE)           || 0.5;
const W_HUE            = Number(process.env.W_HUE)             || 0.3;
const W_RARE           = Number(process.env.W_RARE)            || 0.2;
const MIN_SCORE        = Number(process.env.MIN_SCORE)         || 0.4;
const TOP_N            = Number(process.env.TOP_N_PER_COUNT)   || 30;
```

Δεν χρειάζεται redeploy για να αλλάξει το tuning — `serverless deploy` με νέα env values, ή AWS console env vars override.

Όταν `SCORING_MODE=weighted` (lines 49-61):

```ts
// Live frequency map από το dataset της κλήσης (ένα pass)
const freq = {};
for (const p of palettes) for (const t of (p.tags || [])) freq[t] = (freq[t]||0) + 1;

matchingPalettes = palettes
  .map((p) => ({ ...p, _score: scorePalette(p.tags||[], paletteTags.colorTags, paletteTags.propertyTags, freq) }))
  .filter((p) => p._score >= MIN_SCORE)
  .sort((a, b) => b._score - a._score);
```

Σημείωση: ο `freq` map υπολογίζεται **κάθε API call** σε όλο το dataset που μόλις scanned-θηκε. Δεν είναι precomputed — άρα reflects ακριβώς το current state του DynamoDB.

Και ο `scorePalette` (lines 213-228):

```ts
function scorePalette(tags, wantColors, wantStyles, freq) {
  if (wantStyles.length === 0 && wantColors.length === 0) return 0;
  const styleMatches = wantStyles.filter((t) => tags.includes(t)).length;
  const colorMatches = wantColors.filter((t) => tags.includes(t)).length;
  const styleScore   = wantStyles.length ? styleMatches / wantStyles.length : 0;
  const colorScore   = wantColors.length ? colorMatches / wantColors.length : 0;
  const matched      = [...wantStyles, ...wantColors].filter((t) => tags.includes(t));
  const rarityRaw    = matched.reduce((s, t) => s + 1 / Math.log(2 + (freq[t] || 1)), 0);
  const rarityScore  = Math.min(rarityRaw / 3, 1);
  return W_STYLE * styleScore + W_HUE * colorScore + W_RARE * rarityScore;
}
```

**Σημαντική παρατήρηση από τον κώδικα:** η argument order είναι `(tags, wantColors, wantStyles, freq)` αλλά η σύμβαση naming στις rest του handler είναι:
- `body.colorTags` → `paletteTags.colorTags` → `wantColors` (το hue κομμάτι)
- `body.styleTags` → `paletteTags.propertyTags` → `wantStyles` (το style κομμάτι)

Δηλαδή `W_STYLE=0.5` βαραίνει τα **style tags** (cold, bright, dark...), και `W_HUE=0.3` τα **color tags** (azure, cyan, blue...).

### Worked example — actual computation με real frequencies

Frequencies από `palette-tag-report.md` (totals across all color-count groups):

| Tag | freq | 1/log(2+freq) |
|---|---|---|
| azure | 1290 | 1/log(1292) = 1/7.164 = **0.1396** |
| cyan | 1112 | 1/log(1114) = 1/7.016 = **0.1425** |
| cold | 870 | 1/log(872) = 1/6.771 = **0.1477** |
| monochromatic | 718 | 1/log(720) = 1/6.579 = **0.1520** |
| dark | 345 | 1/log(347) = 1/5.849 = **0.1709** |
| orange | 2521 | 1/log(2523) = 1/7.833 = **0.1277** |

(Σημείωση: ο τύπος `Math.log` στο Node είναι natural log. Τιμές παραπάνω είναι 1/ln, όχι 1/log10.)

**Query:** `wantColors=[azure, cyan]`, `wantStyles=[cold, monochromatic]`. Default weights (`W_STYLE=0.5, W_HUE=0.3, W_RARE=0.2, MIN_SCORE=0.4`).

**Palette A — perfect 4/4 match.** tags `⊇ {azure, cyan, cold, monochromatic}`:
- styleMatches = 2, styleScore = 2/2 = 1.0
- colorMatches = 2, colorScore = 2/2 = 1.0
- matched = [cold, mono, azure, cyan]
- rarityRaw = 0.1477 + 0.1520 + 0.1396 + 0.1425 = 0.5818
- rarityScore = min(0.5818/3, 1) = 0.1939
- **score = 0.5×1.0 + 0.3×1.0 + 0.2×0.1939 = 0.839**

**Palette B — 3/4 (missing cyan).** tags `⊇ {azure, cold, monochromatic}`:
- styleScore = 1.0, colorScore = 1/2 = 0.5
- rarityRaw = 0.1477 + 0.1520 + 0.1396 = 0.4393
- rarityScore = 0.4393/3 = 0.1464
- **score = 0.5×1.0 + 0.3×0.5 + 0.2×0.1464 = 0.679**

**Palette C — 2/4 (one style + one hue).** tags `⊇ {azure, cold}`:
- styleScore = 1/2 = 0.5, colorScore = 1/2 = 0.5
- rarityRaw = 0.1477 + 0.1396 = 0.2873
- rarityScore = 0.2873/3 = 0.0958
- **score = 0.5×0.5 + 0.3×0.5 + 0.2×0.0958 = 0.419**

**Palette D — 1/4 (only `cold`).** tags `⊇ {cold}`, no azure/cyan/mono:
- styleScore = 1/2 = 0.5, colorScore = 0
- rarityRaw = 0.1477
- rarityScore = 0.0492
- **score = 0.25 + 0 + 0.0098 = 0.260** ← κάτω από `MIN_SCORE=0.4`, cut

**Παρατηρήσεις:**
- Με default `MIN_SCORE=0.4`, μόνο palettes με ≥ 2/4 tags περνούν.
- Η rarity contribution στο τελικό score είναι μικρή (~0.04 για 4/4, ~0.01 για 2/4). Με `W_RARE=0.2` και `rarityScore` ≤ ~0.2 σε ρεαλιστικά combos, ο rarity term δίνει max ~0.04 πόντους. Δηλαδή ο rarity είναι **tie-breaker**, όχι primary driver. Αν θέλουμε στα rare tags πραγματική πριμοδότηση, χρειάζεται `W_RARE ≈ 0.4-0.5` ή αναβάθμιση του normalization (`rarityRaw / 1.5` αντί `/3`).
- Έχει σημασία ότι `(freq[t] || 1)` — αν λείπει εντελώς το tag από το dataset, το score υπολογίζεται με `1/log(3) = 0.910`, που είναι **πολύ υψηλό**. Δεν συμβαίνει στην πράξη γιατί ο handler καλείται με tags που υπάρχουν στο dataset, αλλά είναι potential edge case.

### Pool size — measured vs projected

**Measured (παλιό AND), από brief-matching-improvements.md Q1:** 7 παλέτες.

**Projected (νέο weighted), από το ίδιο doc:** _"7 perfect (4/4) + 32 '3/4' + 100+ '2/4' → top-50 ranked"_. Αυτά τα νούμερα είναι projections του doc author, ΟΧΙ μετρήσεις από live system με weighted enabled. Πραγματική επιβεβαίωση απαιτεί A/B run.

**Αν τα projections ισχύουν**, με default `MIN_SCORE=0.4` και `TOP_N_PER_COUNT=30`:
- ~7 + 32 + 100 = ~140 candidates περνούν το threshold.
- Distribution σε 5 color-count groups (2..6colors). Αν είναι ομοιόμορφο, ~28/group → όλα κρατιούνται. Αν συγκεντρώνονται σε ένα group (π.χ. 4colors είναι το dominant στο dataset, 3.802/12.106 = 31%), εκείνο το group θα γεμίσει στα 30 και τα υπόλοιπα ~10 θα κοπούν.
- Cap input στο downstream Track 2 scorer: **5 × 30 = 150** palettes max ανά recommendation.

### Σχέση με Track 2 — concrete

Ο Track 2 χρησιμοποιεί το pool με 2 τρόπους:
1. **`avgLuminanceSpread`** = mean spread over όλα τα candidate palettes του `paletteData`.
2. **`pool` = total count των candidate palettes**, χρησιμοποιείται ως tie-breaker #1 (όχι σαν scored term).

Με τον παλιό AND:
- Q1 είχε pool=7. Το `avgLuminanceSpread` ήταν mean over 7. Statistical noise: μία outlier palette είναι 14% του sample.
- Στο acceptance test, recommendation #4 είχε pool=1 (μόνο 1 candidate palette). Spread=0.715 βασίστηκε σε μία μέτρηση — ευαίσθητο σε noise.

Με τον weighted (αν επιβεβαιωθούν τα projections):
- Q1 θα είχε pool ~140. Spread mean over 140 → noise ~7-12x μικρότερο (1/√140 vs 1/√7 ≈ √20 ≈ 4.5x για normally-distributed noise — actually το improvement εξαρτάται από το distribution shape, δες "Risk" παρακάτω).

### Risks και open questions

| Risk | Παρατήρηση |
|---|---|
| Spread distribution σε μεγαλύτερο pool | Δεν είναι εγγυημένο ότι 140 candidates θα δώσουν παρόμοιο spread mean με 7. Αν τα 3/4 και 2/4 palettes είναι συστηματικά πιο muddy (γιατί λείπουν τα distinguishing tags), ο mean spread θα **πέσει** για όλα τα recommendations. Πρακτικά: το Term D distribution θα τσιμπηθεί προς το χαμηλότερο. Δεν είναι κατ' ανάγκη bad — απλά αλλάζει τη βαθμονόμηση. |
| DynamoDB scan κόστος | Κάθε API call διαβάζει όλο το `dev_color-palettes` table. Στις ~5.840 παλέτες είναι ~λίγα MB · ~1-2s. Αν φτάσει 100k items, χρειάζεται GSI per tag + intersection at app layer ή Elasticsearch/OpenSearch. |
| Tags drop είναι gone στον weighted | Στο response, ο handler γυρίζει `colorTags`/`propertyTags` που του ζητήθηκαν (όχι post-drop). Αν consumer βασιζόταν στο "δες ποια tags έπεσαν για να καταλάβεις τι έγινε match", τώρα δεν θα το βλέπει. |
| `W_RARE=0.2` πολύ ασθενές | Όπως υπολογίστηκε παραπάνω, ο rarity term συνεισφέρει ≤ 0.04 πόντους σε τυπικό match. Δεν επηρεάζει σχεδόν καμία απόφαση. Αν θέλουμε σπανιότητα να μετράει, χρειάζεται tuning. |

### Rollout

- **Σήμερα:** `SCORING_MODE=and` παντού (default) — zero behavioral change.
- **Επόμενο βήμα:** Enable `SCORING_MODE=weighted` σε ONE dev environment, τρέξε το ίδιο brief 10x, μέτρα:
  - Pool size per recommendation (νέο vs old)
  - Distribution του `avgLuminanceSpread` (νέο vs old) στο enriched output
  - Top-1 winner του Track 2 — άλλαξε; (αν ναι, για ποιο λόγο, ποιο term άλλαξε)
- **Promote σε prod** μόνο μετά από αυτές τις μετρήσεις.
- Όλες οι 5 παράμετροι (`W_STYLE/W_HUE/W_RARE/MIN_SCORE/TOP_N_PER_COUNT`) tunable χωρίς redeploy.

---

## Cross-cutting open items

- Maintenance ownership για το rulebook του Track 2 (κάθε νέο characteristic/placement θέλει tuning).
- Status aggregator (aws-microservices) σιωπηλά κάνει fallback σε `DEFAULT_STEP_NAMES = 3` αν λείπει το `Brief Workflow Started` event. Είναι invisible degradation — ίσως να log-άρει warning.
- Track 3 default είναι ακόμα `and`. Να αποφασιστεί roadmap για να γίνει `weighted` το default μετά από A/B validation.
