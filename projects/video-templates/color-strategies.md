# Color Assignment Strategies

Οι στρατηγικές που υπάρχουν στο platform-client-v2 + video-templates για την ανάθεση χρωμάτων σε templates. Κάθε μία λύνει διαφορετικό πρόβλημα ή λειτουργεί σε διαφορετικό layer.

Updated: 2026-04-27


## 1. Legacy Positional Assignment

**Αρχείο:** `create-video.service.ts` > `applyLegacyBriefPalettes()`
**Status:** Fallback, τρέχει αν δεν υπάρχει color-role mapping ούτε numberOfColours

**Τι κάνει:**
1. Παίρνει τα original template palettes
2. Μετράει πόσα primary + secondary slots υπάρχουν (totalSlots)
3. Κάνει structural detection: βρίσκει positions που είναι white/black σε >= 90% των default palettes (consensus). Αυτά μένουν ως έχουν
4. Τα υπόλοιπα slots (totalSlots - structural) = πόσα χρώματα χρειάζονται
5. Τραβάει `Ncolors` brief palettes, γεμίζει σειριακά τα non-structural slots
6. Text slots γίνονται null (auto-detect αργότερα)

**Πλεονεκτήματα:**
- Απλή λογική, δουλεύει παντού
- Δεν χρειάζεται per-template setup

**Μειονεκτήματα:**
- Μηδέν semantic awareness. Δεν ξέρει αν ένα slot είναι background, accent, ή CTA
- Σειριακό γέμισμα = τυχαία αντιστοίχιση χρώμα-ρόλος


## 2. M3 Color-Role Profiling + Permutation Scoring

**Αρχεία:** `color-role.service.ts`, `color-role-scorer.ts`, `color-roles/` (video-templates repo)
**Status:** Ported στο client, αλλά COMMENTED OUT στο `selectTemplate()` (γραμμή 1198)

**Pipeline (offline, per template):**
1. Screenshot template > Gemini prompt (v3) > M3 color role analysis JSON
2. Claude prompt > slot-to-role mapping (π.χ. `__primary[0]` = `surface`, `__secondary[1]` = `primary`)
3. Bundle: profile + mapping > `palette-mappings.json` (shipped ως Angular asset)

**Runtime (client-side):**
1. Φορτώνει `palette-mappings.json` στο `ColorRoleService.load()`
2. Για κάθε template, ξέρει: slots, roles, adjacencies (ποιο element είναι πάνω σε ποιο)
3. Παίρνει brief palette colors (ή pool colors)
4. Δοκιμάζει ΟΛΟΥΣ τους N! permutations (role → color assignment)
5. Βαθμολογεί κάθε permutation σε 3 axes:
   - **Adjacency contrast (50%):** Gaussian κεντρισμένη στο 4.5:1 ratio. Γειτονικά elements πρέπει να ξεχωρίζουν, αλλά δεν θέλουμε υπερβολικό contrast
   - **Chroma-area correlation (30%):** Pearson correlation μεταξύ chroma και 1/area. Μικρά elements πρέπει να είναι πιο saturated (accent), μεγάλα πιο neutral (surface)
   - **Text contrast (20%):** APCA contrast μεταξύ text-background pairs, normalized στο 75 Lc

**No-text mode (ενεργό, `COLOR_ROLE_MODE = 'no-text'`):**
- Text slots εξαιρούνται από permutation
- Weights renormalized: adjacency 62.5%, chroma 37.5%
- Text colors derived αργότερα (APCA #444 vs #FFF)

**Πλεονεκτήματα:**
- Semantic: ξέρει ότι surface πρέπει να πάρει neutral, primary πρέπει να πάρει chromatic
- Adjacency-aware: σκοράρει βάσει ποια elements είναι δίπλα/πάνω
- Μαθηματικά optimal (brute-force όλα τα permutations)

**Μειονεκτήματα:**
- Setup cost: Gemini prompt + manual review ανά template
- Gemini κάνει λάθη (π.χ. `surface` σε saturated red, orphan `on-X` χωρίς `X`)
- N! permutations: 5 roles = 120, 6 roles = 720. Πάνω από 7-8 roles γίνεται αργό


## 3. Color-Groups Assignment

**Αρχείο:** `create-video.service.ts` > `tryApplyColorGroupPalettes()`
**Status:** ΕΝΕΡΓΟ, τρέχει πρώτο στο `selectTemplate()` (γραμμή 1194)

**Τι κάνει:**
1. Το template δηλώνει `numberOfColours` (distinct color groups)
2. Τραβάει `Ncolors` brief/pool palettes (όπου N = numberOfColours)
3. Γεμίζει primary + secondary slots σειριακά από τα brief colors
4. Αν χρειάζονται παραπάνω slots από τα available colors, επαναλαμβάνει τελευταίο χρώμα
5. Text + backgroundText γίνονται null (auto-detect)

**Πλεονεκτήματα:**
- Πολύ απλό: template δηλώνει μόνο πόσα χρώματα θέλει
- Δεν χρειάζεται per-template profile

**Μειονεκτήματα:**
- Ίδιο με legacy: σειριακό γέμισμα χωρίς semantic awareness
- Δεν ξέρει ποιο slot είναι background vs accent


## 4. Hierarchy-Preserving Constraint Solver

**Αρχεία:** `hierarchy-solver-engine.ts`, `hierarchy-color.service.ts`, `template-descriptors.json` (video-templates repo)
**Status:** Ενεργό σε runtime (Motion Canvas layer), switch via `colorAssignmentStrategy` scene variable

**Pre-extracted descriptors (offline):**
Για κάθε template, ένα JSON descriptor δηλώνει:
- `backgroundSlot`: ποιο slot είναι background
- `shapeSlots[]`: ποια slots έχουν shapes
- `textSlots[]`: ποια slots έχουν text
- Per slot: `isBackground`, `hasText`, `hasShape`, `hasStroke`, elements[]

**Runtime solver (client, pre-render):**
Δέχεται descriptor + palette colors, δοκιμάζει combinationsWithRepetition (ή kPermutations) μέχρι 50K max. Για κάθε assignment:

**4 constraint pillars:**

1. **Background Luminance Extreme (HARD):** Το background πρέπει να είναι το πιο φωτεινό ή πιο σκοτεινό χρώμα. Αν είναι mid-range = hard violation, reject
2. **Saturation Budget (SOFT):** Max 2 high-chroma (Oklch C > 0.08) non-text slots. Παραπάνω = visual noise. Soft violation (penalty, δεν reject)
3. **Text Contrast Floor (HARD):** Κάθε text slot πρέπει APCA >= 45 Lc vs background. Κάτω από αυτό = hard violation, reject
   - **3b. Shape Contrast Floor (SOFT):** Shapes πρέπει APCA >= 25 Lc vs background. Soft violation
   - **Contrast Hierarchy (SOFT):** Text πρέπει να έχει υψηλότερο contrast από shapes vs background. Αλλιώς shapes "κλέβουν" attention
4. (Implicit pillar) **Background Neutrality Bonus:** Background chroma < 0.05 = +30 score, < 0.10 = +15

**Scoring (μετά τα constraints):**
- Text readability: APCA contrast text vs bg, weighted 2x
- Shape visibility: APCA contrast shapes vs bg, weighted 1x
- Color diversity: unique colors / total shape colors * 50
- Harmony: average pairwise Oklch distance * 100
- Background neutrality bonus

**Strategy switching:**
Scene variable `colorAssignmentStrategy`:
- `'auto'` (default): solver αν υπάρχει descriptor, αλλιώς legacy TextColorService
- `'hierarchy-solver'`: force solver
- `'legacy'`: always TextColorService

**Πλεονεκτήματα:**
- Constraint-based: εγγυάται minimum readability (text 45 Lc, shapes 25 Lc)
- Background-aware: πάντα luminance extreme
- Validated: 27 templates x 10 palettes
- Δεν χρειάζεται M3 roles, μόνο slot descriptors

**Μειονεκτήματα:**
- Per-template descriptors χρειάζονται extraction
- Shapes/masks/patterns μπορεί να σπάνε με dynamic color replacement (open issue)
- Combinations cap στα 50K, δεν εξαντλεί πάντα search space


## 5. Text Color Strategies (sub-layer)

Αυτά τρέχουν μετά τα παραπάνω, στο Motion Canvas render layer. Αφορούν μόνο text elements.

### 5a. White/Black Binary

**Αρχική approach.** Pick #ffffff ή #444444 βάσει APCA contrast vs background. Αποτυγχάνει σε dual backgrounds (text πάνω σε 2 χρώματα).

### 5b. Grayscale Solver

**Αρχείο:** `grayscale-solver.ts`
Minimax sweep 51 grayscale τιμών (0, 5, 10, ..., 255). Για κάθε gray value, μετράει worst-case APCA contrast vs ΟΛΑ τα background colors πίσω από το text. Επιλέγει αυτό με max(min-contrast). Δουλεύει καλύτερα σε dual backgrounds αλλά δεν μπορεί να χρησιμοποιήσει brand colors.

### 5c. Palette Text Color (current)

**Αρχείο:** `text-color.service.ts`
Ίδια minimax λογική αλλά αντί 51 grays, δοκιμάζει palette colors + #444 + #FFF. Έτσι text μπορεί να πάρει brand color αν δίνει αρκετό contrast. Falls back σε grayscale solver αν κανένα palette color δεν δουλεύει.

**Ahead-of-time problem (solved):** Text color εξαρτάται από rendered backgrounds, δεν γίνεται decide πριν τρέξει το template. Λύση: MC recalculate-cycle (invisible pass μέσα από όλα τα frames πριν playback). Frame-based guard per text, fires at in-animation rest time, compute + cache σε generation-aware FILL_MAP. During playback, texts read from map instantly.


## 6. Pool Override (νέο, 2026-04-27)

**Αρχεία:** `color-role.service.ts` > `loadPalettePool()`, `create-video.service.ts` > `resolveBriefPalettes()`
**API:** `POST /palettes/by-style` (query-colors service)
**Status:** Ενεργό

**Τι κάνει:**
1. Στο init, καλεί `/palettes/by-style` μια φορά (χωρίς body = όλες οι palettes)
2. Cache response: `{ "2colors": { "bright": [...], "warm-vintage": [...] }, "3colors": { ... } }`
3. `resolveBriefPalettes(N)` τραβάει pool palettes πρώτα, brief fallback
4. Luminance spread filter: reject palettes με max-min luminance < 0.3

**Δεν αντικαθιστά** τις strategies 1-4. Αντικαθιστά μόνο ΑΠΟ ΠΟΥ ΕΡΧΟΝΤΑΙ τα palette colors. Αντί να περιμένεις brief API (LLM tags → palette lookup), τα palettes pre-fetched by style group.


## Dispatch Order (τρέχον)

```
selectTemplate(videoTemplate)
  |
  |-- brief ενεργό?
  |     |
  |     |-- tryApplyColorGroupPalettes()     <-- αν template.numberOfColours > 0
  |     |     (uses resolveBriefPalettes → pool first, brief fallback)
  |     |
  |     |-- (COMMENTED OUT) tryApplyRoleBasedPalettes()  <-- αν υπάρχει color-role mapping
  |     |     (uses resolveBriefPalettes + N! permutation scorer)
  |     |
  |     |-- (COMMENTED OUT) applyLegacyBriefPalettes()   <-- fallback
  |           (uses resolveBriefPalettes + structural detection)
  |
  |-- Motion Canvas render
        |
        |-- colorAssignmentStrategy === 'auto'
        |     |-- descriptor exists? → hierarchy solver
        |     |-- else → TextColorService (palette text color, 5c)
        |
        |-- colorAssignmentStrategy === 'hierarchy-solver' → force solver
        |-- colorAssignmentStrategy === 'legacy' → TextColorService
```

Δηλαδή σήμερα:
1. **Angular layer:** Color-Groups (strategy 3) γεμίζει primary/secondary slots με pool palettes
2. **MC layer:** Hierarchy Solver (strategy 4) ή TextColorService (strategy 5c) handles text + shape colors at render time
