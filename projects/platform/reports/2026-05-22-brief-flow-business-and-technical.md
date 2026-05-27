# Brief Flow — Business Logic & Technical Deep-Dive (platform-client-v2)

**TL;DR:** Ο χρήστης συμπληρώνει creative brief (audience + placement + products + language), η πλατφόρμα παράγει AI palettes + font pairings, και αυτά εφαρμόζονται αυτόματα στο video template μέσω 4 αξόνων: palettes, fonts, optimization/pacing, ratio. Από κάτω τρέχει signal-based reactive pipeline (Angular) που καταλήγει σε JSON variables για τον Motion Canvas engine.

Verified against source 2026-05-22 (Angular 21, `src/app/create-video/`).

---

## ΜΕΡΟΣ 1 — Business Logic & Σημαντικά Components

### Τι κάνει το brief (business)
Ένας "creative brief" είναι το AI-driven onboarding του video editor: ο χρήστης δηλώνει **σε ποιον** (audience/persona), **πού** (placement/platform), **τι** (products) και **σε ποια γλώσσα**. Η πλατφόρμα γυρνάει AI προτάσεις για:
- **Color palettes** (themes με color/style tags + reasoning, ομαδοποιημένα ανά πλήθος χρωμάτων)
- **Font pairings** (font ανά text role με reasoning)

και τα **εφαρμόζει αυτόματα** στο επιλεγμένο template, ώστε ο χρήστης να ξεκινάει από ένα έτοιμο, brand-aware βίντεο αντί από default.

### Σημαντικά Components

| Component / Service | Ρόλος (business) |
|---|---|
| `BriefCreativeBriefService` | Κρατάει το state του brief form: personas, audience mode, video format, ratio, stepper index, form validation. |
| `brief-creative-brief.component` | Το stepper UI (audience/placement/products/content). |
| `CreateBriefButtonComponent` | Το "Create Brief" κουμπί + validation + loading dialog (3 steps) + palette summary modal. **Εδώ ζει η orchestration του brief generation.** |
| `BriefService` | API client (`createBrief`, `getBriefStatus`) + κρατάει `brief` signal, `fontPairs`, `briefGenerationStatus`. |
| `CreateVideoService` | Το "brain" — εφαρμόζει το brief result στο template (palettes/fonts/pacing) και παράγει τα `variables` για τον engine. |
| `ColorRoleService` + `color-role-scorer` | Role-based palette scoring (permutations, adjacency/chroma/text-contrast). |
| `OptimizationService` | Safe-zones ανά platform (`dynamicPositioning`) + platform selection. |

### Σημαντικά state signals
- `briefService.brief` — **ο master διακόπτης "brief active"**. Όσο δεν είναι null, το template παίρνει brief palettes/fonts.
- `briefService.fontPairs` — προτεινόμενα font pairs (το πρώτο `selected`).
- `createVideoService.selectedPalette` / `appliedPalette` — τρέχουσα palette.
- `createVideoService.variables` — το τελικό JSON που τρώει ο Motion Canvas engine.

---

## ΜΕΡΟΣ 2 — Business Steps + Τεχνικά από κάτω

### Step 1 — Συμπλήρωση brief form (audience / placement / products / language)
**Business:** Ο χρήστης διαλέγει persona, video format, ανεβάζει products, διαλέγει γλώσσα.

**Τεχνικά:**
- `BriefCreativeBriefService.stepperFormGroup` (Angular `FormGroup`) με 4 controls: `products`, `placement`, `audience`, `content` — όλα `Validators.required`.
- `products` control έχει custom `productsLengthValidator()` → valid μόνο αν `createVideoService.products().length > 0`. Ένα `effect()` συγχρονίζει το control value με το products signal.
- `selectedPersona` = `computed()` που βρίσκει το `persona.selected === true`. Persona = `{country, ageGroup[], gender[], type}`.
- `selectedVideoFormat` (default `igReel`), `selectedRatioCard`, `selectedLanguage` = writable signals.

### Step 2 — Πάτημα "Create Brief" + validation
**Business:** Έλεγχος ότι συμπληρώθηκαν τα απαραίτητα· αλλιώς δείξε πού λείπει.

**Τεχνικά (`createBrief()` στο `create-brief-button`):**
- Σειριακά checks: persona → ageGroup → gender → country → language. Αν λείπει, `showTooltip(...)` (CDK Overlay flexible-connected-to) δείχνει inline tooltip.
- Αν υπάρχει tooltip index → `ngZone.runOutsideAngular()` + `element.scrollIntoView({behavior:'smooth'})` και **return** (μπλοκάρει submission).
- Map ratio: `mapBriefRatioToTemplateRatio(selectedRatioCard) → createVideoService.selectedRatio.set(...)`.
- Χτίσιμο `BriefRequest`:
  ```ts
  { characteristics: ['Clean','Modern','Slick'],  // ⚠️ HARDCODED — όχι από user input
    audience: {country, id, ageGroup, gender, type, selected},
    placement: selectedVideoFormat.value,
    products: [{images, price, oldPrice, name, imageProperties, removedImageChecked, id, proxyImages, removedImages}] }
  ```

### Step 3 — Brief generation (mock ή API)
**Business:** Τρέχει η AI παραγωγή palettes + fonts (3 στάδια), με loading UI.

**Τεχνικά:**
- **Mock path** (`useMockBrief = true` — ΤΟ ΕΝΕΡΓΟ ΤΩΡΑ): παρακάμπτει API, καλεί κατευθείαν `handleBriefCompleted(mockBriefOutputs)`. Το `mockBriefOutputs` είναι inline στο component (~2000 γραμμές JSON).
- **API path:**
  - `createVideoService.submitBrief(input)` → `POST {environment.BRIEF_API}/brief` → `{requestId}`.
  - `pollBriefUntilDone(requestId)` → polling `GET /brief/{requestId}` (RxJS `switchMap` + `tap` + `finalize`, `takeUntilDestroyed`).
  - Loading dialog (`MatDialog`, 360×480) με 3 steps: **`color-tags` → `font-matrix-layers` → `font-pairing`** (status PENDING/IN_PROGRESS/COMPLETED/FAILED, οδηγείται από `briefGenerationStatus`).
  - `status === 'COMPLETED'` + `outputs` → `handleBriefCompleted(outputs)`. `FAILED`/timeout → `MatSnackBar` error.
- **Outputs schema:**
  - `palettes[]`: themes με `colorTags`, `styleTags`, `reasoning`, `paletteData.palettes` ομαδοποιημένα ανά `'2colors'..'6colors'`, κάθε palette `{palette:[{color,luminance,hueCategory}], harmonyAnalysis, name, tags}`.
  - `textElements`: fonts ανά role (`productName`, `productPrice`, `productOldPrice`, `introTxt`, `bgMessage`) + reasoning.

### Step 4 — Επεξεργασία brief result
**Business:** Διάλεξε καλύτερο palette theme, ετοίμασε font pairs, ενεργοποίησε "brief mode".

**Τεχνικά (`handleBriefCompleted`):**
- `selectBestPaletteTheme(outputs.palettes)` → επιλογή theme.
- **`briefService.brief.set({ palettes: theme.paletteData, textElements })`** ← ενεργοποιεί brief mode.
- `processFontPairs(textElements)`:
  - id remap: `introTxt→intro`, `productPrice→price`, `productOldPrice→oldPrice`· `bgMessage` αγνοείται.
  - default weights: intro 700, υπόλοιπα 400.
  - `briefService.fontPairs.set([...])` με το πρώτο `selected:true`.
- `showPaletteSummary(theme)` (modal preview των palettes ανά color-count).
- `selectedOptionFromMenu.set('Template')` + `applyOptimizationAndPacing()`.

### Step 5 — Εφαρμογή στο template (4 άξονες)
**Business:** Το brief result μεταφράζεται σε πραγματικές αλλαγές στο βίντεο.

**Τεχνικά:**

**(α) Palettes** — `selectTemplate(videoTemplate)` με ενεργό `brief()`:
- Κρατάει `template._originalPalettes` (structural detection πάντα σε αμετάβλητα data).
- **`tryApplyColorGroupPalettes(videoTemplate)`:**
  - `distinctGroups = template.numberOfColours`.
  - `resolveBriefPalettes(N)`: pool API (`/palettes/by-style`) πρώτα, αλλιώς `brief().palettes.palettes['Ncolors']`· φίλτρο `hasEnoughLuminanceSpread`.
  - Special case: `N===1` χωρίς palettes → πέφτει σε `2colors` παίρνοντας μόνο το πρώτο χρώμα.
  - Χτίζει `template.palettes = newPalettes` (πρώτα N colors κάθε brief palette), `selectedPalette.set(newPalettes[0])`.
- **Εναλλακτικά role-based** (`tryApplyRoleBasedPalettes`, αν υπάρχει color-role manifest):
  - `ColorRoleService.rankAndMaterializeForMode` → `color-role-scorer.scoreAllPermutations(NoText)`.
  - Score = adjacency 50% (WCAG ratio ~4.5 Gaussian) + chroma-vs-area 30% (correlation) + text-contrast 20% (APCA). No-text mode (το ενεργό): text slots εξαιρούνται, weights 0.625/0.375, text παράγεται από bg με APCA (#444444 vs #FFFFFF).
- `reapplyPalettes()` re-runs όταν αλλάζει `colorStrategy`, κρατώντας index.

**(β) Fonts** — επιλεγμένο `fontPair` → font/weight ανά role → `textProperties` των products/intro/outro.

**(γ) Optimization + pacing** — `applyOptimizationAndPacing(placement)`:
- `tiktok/igReel/fbReel/igStory/fbStory` → `optimizationService.activateOptimization(...)` + platform safe-zones (`dynamicPositioning`).
- `posts/youtube` → `activateOptimization('none')` + `selectedPacing.set(0.7)`.

**(δ) Ratio** — `selectedRatio` από `selectedRatioCard`.

### Step 6 — Render pipeline (downstream προς engine)
**Business:** Οι αλλαγές γίνονται ορατό βίντεο.

**Τεχνικά (`CreateVideoService` computed chain):**
- `appliedPalette` (computed) = `selectedPalette.colors` + overlay από `customPaletteDraft`.
- `templateData` (computed) = products + palette + background elements + intro/outro.
- **`variables` (computed)** = deep-clone template →
  - `replaceTemplateValuesWithPalette(template, flatPalette)`: `__color[N]` → hex + γράφει `_metadata.color = N` σε κάθε fill/stroke.
  - βάζει `palette`, `lockedColors`, `colorAssignmentStrategy`, `pacing`, `dynamicPositioning`, `templateName`, products.
- `effect "TemplateChange"` → `analyzeTemplateUpdate(prev, new)`:
  - `requiresFullReload` → `player.playback.reload()` (full recalculate).
  - αλλιώς → `applyChanges()` + `setSkipNextReload()` (direct node mutation, no reload).
- Round-trip χρωμάτων: engine `HierarchyColorService` (Pass 5) επιλύει colors ανά `_metadata.color` group (contrast-aware) → emit `mc:colorAssignment` event → `motion-canvas.component` → `colorAssignment` signal → UI swatches. `lockedColors` (fork/draft) bypass-άρουν το contrast path.

---

## Σημεία προσοχής
- **`characteristics` hardcoded** `['Clean','Modern','Slick']` — δεν έρχονται από user input (πιθανό gap).
- **`useMockBrief = true`** — αυτή τη στιγμή τρέχει mock, όχι το πραγματικό BRIEF_API.
- Δύο palette paths συνυπάρχουν: **color-groups** (`numberOfColours`) και **color-role** (manifest-based scoring). Ο δεύτερος ενεργοποιείται μόνο αν υπάρχει mapping στο `/assets/color-roles/palette-mappings.json`.
- Γνωστό σχετικό bug history: `palette-change-bug-diagnosis.md` (selectedPalette stale + `analyzeTemplateUpdate` fast-path miss σε palette switches).

## Roadmap / Flow diagram
```
Stepper (persona + placement + products + language)
  → createBrief() [validation] → BriefRequest
  → [mock | API: color-tags → font-matrix-layers → font-pairing]
  → outputs {palettes, textElements}
  → handleBriefCompleted → brief.set(...)   ← "brief active"
       ├─ palettes      → selectTemplate / tryApplyColorGroupPalettes (ή role-based) → template.palettes → selectedPalette
       ├─ textElements  → fontPairs → textProperties (fonts)
       ├─ placement     → optimization (safe-zones) + pacing
       └─ ratio         → selectedRatio
  → appliedPalette → templateData → variables (computed)
  → analyzeTemplateUpdate → reload | applyChanges
  → Motion Canvas engine (HierarchyColorService → mc:colorAssignment → UI)
```
