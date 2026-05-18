# Plan A + Plan B — Review Findings

**Date:** 2026-05-15
**Reviewers:** `pr-review-toolkit:code-reviewer` + `pr-review-toolkit:silent-failure-hunter` (parallel)
**Scope:** Plan A (video-templates bundle) + Plan B (platform-client-v2 headless color recompute)
**Status:** Wave 1 (blocking correctness) ✅ done. Wave 2 (silent-failure hardening) + Wave 3 (polish) pending.

---

## Files reviewed

**Plan A (`video-templates`):**
- `src/project-for-angular.ts` — exports `restTimeForTarget`, new `keyForTarget`
- `src/scenes/gbLibrary-utils.tsx` — `annotateRestTimes` (249-300), `findProgenitor` (654-659), `restTimeForTarget` (672-682)
- `src/scenes/services/text-color-map.service.ts` — `buildTextKey` (83-104)
- `src/scenes/core/function-execution.ts` — pass-3 annotation call site (342-352)
- `src/scenes/services/text-color.service.ts` — deferred-effect captures
- `src/scenes/services/headless-scene.service.ts` — clone lifecycle

**Plan B (`platform-client-v2`):**
- `src/app/create-video/headless-color.service.ts` — `recomputeAtRestTime`, `applyComputedColors`
- `src/app/create-video/create-video.service.ts` — `maybeTriggerHeadlessRecompute`, `findTextElementForChange`

---

## 🔴 Blocking issues (correctness)

### 1. ~~Race window σε consecutive recomputes~~ — **Dismissed**
**File:** `create-video.service.ts:2130-2186`

Theoretical concern του reviewer: fire-and-forget χωρίς epoch/token, αν δύο consecutive font changes πέσουν γρήγορα, το παλιό clone μπορεί να γράψει stale colors πάνω από το νέο.

**Status: not a practical concern.** Στο πραγματικό flow ο user δεν παράγει consecutive font changes σε ms-scale που να προλαβαίνει να γίνει overlap στους clones. Αν προκύψει αργότερα ως pattern (π.χ. slider drag), επανεκτίμηση. Για τώρα δεν χρειάζεται token/cancellation infrastructure.

---

### 2. ~~`findTextElementForChange` χρησιμοποιεί `findFirst`~~ — **Dismissed**
**File:** `create-video.service.ts:2222-2229`

Theoretical concern του reviewer: το global-scope branch (`change.productIndex === undefined`) χρησιμοποιεί `findFirst` ενώ το `applyChanges` κάνει `findAll`. Φόβος: shared contexts μεταξύ multiple nodes.

**Status: not applicable με την τρέχουσα δομή του template.**

- Contexts μέσα σε Products (π.χ. `price`, `productName`, `oldPrice`, `productImg`) έρχονται **πάντα** με `productIndex` από το `detectProductChanges`. Το global branch δεν τρέχει για αυτά.
- Contexts εκτός Products (`introTxt`, `outroTxt`, BackgroundTxt elements) είναι unique στη scene. `findFirst` πιάνει το ένα και μοναδικό match.

Άρα δεν υπάρχει shared-context drift στο global branch. `findFirst` είναι σωστό.

**Caveat:** αν στο μέλλον εισαχθεί context που εμφανίζεται σε multiple non-product nodes (π.χ. multiple BackgroundTxt με ίδιο context), αυτή η παραδοχή σπάει και χρειάζεται revisit. Άξιο code comment στο `findTextElementForChange` για να μην επαναϋποτεθεί.

---

### 3. ~~`keyForTarget` per-element catch ήταν silent + λάθος comment~~ — ✅ **FIXED**
~~**File:** `headless-color.service.ts:88-116`~~

~~Πρόβλημα: silent catch + λάθος comment ("the unfiltered fallback below catches missing keys" — το fallback έτρεχε μόνο για not-a-function, όχι για throws per-element).~~

~~**Applied fix:** Σε throw, log error με element identity και skip μόνο αυτό το element από το allowlist. Δεν είναι silent πια. Αν τελικά `allowedKeys.size === 0`, bail πριν τον clone (συνεργατικό με #5 fix).~~

~~Resolved at commit-time `headless-color.service.ts:88-116`. Δες git history για το exact diff.~~

---

### 4. ~~`restTimeForTarget` catch → `restTime=0` → 1-frame clone~~ — **Dismissed**
**File:** `headless-color.service.ts:76-84`

Theoretical concern: αν `restTimeForTarget(el)` throw-άρει για όλα τα elements, `maxRest=0` και ο clone τρέχει 1 frame.

**Status: not a practical concern.** Στο πραγματικό runtime τα elements που περνάμε είναι live scene nodes με σωστή hierarchy. `findProgenitor` τερματίζει πάντα στο View2D fallback, `restTimeForTarget` διαβάζει `node.restTime` (που υπάρχει ή δεν υπάρχει, χωρίς throw). Δεν υπάρχει path που να σπάει για όλα τα elements ταυτόχρονα σε healthy bundle. Re-evaluate μόνο αν εμφανιστούν concrete errors στο production logging.

---

### 5. ~~Bundle-skew fallback έκανε unfiltered apply σε ολόκληρη τη scene~~ — ✅ **FIXED**
~~**File:** `headless-color.service.ts:88-100`~~

~~Πρόβλημα: όταν `keyForTarget` έλειπε από το bundle (deploy skew, browser cache), το `allowedKeys` έμενε `null` και το apply path γύρναγε ολόκληρο το unfiltered map. Αποτέλεσμα: silent clobber σε user-set / locked colors σε ολόκληρη τη scene μετά από κάθε font change.~~

~~**Applied fix:** early return πριν τον clone όταν `keyForTarget` λείπει. Δεν τρέχει wasted clone, δεν γίνεται unfiltered apply. Visible failure mode = stale color στα changed texts (refresh το διορθώνει), αντί για invisible failure mode = clobbered colors στα untouched.~~

~~Το unfiltered fallback branch στο apply path αφαιρέθηκε ολόκληρο — `allowedKeys` είναι πλέον πάντα non-empty Set όταν φτάνει εκεί. Single source of truth για key construction παραμένει στο bundle. Resolved at commit-time. Δες git history για exact diff.~~

---

## 🟡 Silent failures (quality)

### 6. Empty catches σπάνε το FILL_MAP του clone
**Files:** `text-color.service.ts:585-587, 711-714`

```ts
} catch (e) {
    // Non-fatal: map capture failure doesn't affect rendering.
}
```

Το comment ισχύει για real player. **Όχι για clone.** Στο clone, αν `buildTextKey` throw-άρει, το capture χάνεται από το FILL_MAP, ο clone επιστρέφει incomplete map, το Plan B filter ρίχνει τα missing entries. Wrong colors σε real scene χωρίς log.

**Fix:** `Logger.error` με element identity. Το δεύτερο site (711) δεν έχει καν comment.

---

### 7. Fire-and-forget δεν surface-άρει αποτυχίες στο user
**File:** `create-video.service.ts:2166-2186`

Πέντε διαφορετικά failure modes (4 early returns + catch handler + actual clone fail) collapse σε `colors.size === 0` log line. User βλέπει stale colors, no toast, no indicator. Μόνο dev console.

**Fix:** discriminated result (`{ok: true, colors}` vs `{ok: false, reason}`). Surface persistent failures via toast μετά από N consecutive fails.

---

### 8. `cleanupCloneShadowDom` swallows DOM detach → memory leak
**File:** `headless-scene.service.ts:114-125`

Αν `element.remove()` throw-άρει (already detached, mutation observer interference, shadow-root reparenting bug), ο clone DOM μένει forever. Κάθε font change leak-άρει scene worth of nodes. 50 font edits σε session → editor crawl, no explanation.

**Fix:**
```ts
} catch (e) {
    console.error('[headless] cleanupCloneShadowDom failed — clone DOM leaking', e);
}
```

Προαιρετικά: track active clone count και warn σε threshold breach.

---

### 9. `annotateRestTimes` partial failure → wrong rest fallback
**File:** `function-execution.ts:344-352`

Το loop **δεν** είναι per-layer-wrapped. Throw σε progenitor `k` αφήνει `k+1..N` un-annotated. Το `restTimeForTarget` πέφτει σε `progenitor.globalStartTime` fallback — comment claim-άρει ότι είναι σωστό όταν element δεν έχει in-animation, αλλά εδώ το element **έχει** in-animation που απλά δεν annotate-στηκε. Wrong rest time → clone σε too-few frames → wrong colors.

Ο outer catch στο 353-356 normalize-άρει "annotation pass failed partial" σε "everything's fine".

**Fix:** wrap per-progenitor, mark `progenitorLayers.__restTimeAnnotationIncomplete = true` αν υπάρχουν failures. Platform consumer να αρνείται headless run.

---

## 🟢 Design improvements (μη-blocking)

### 10. Background/shape staleness από subset filter

Το `text-color.service.ts:712, 780` capture-άρει στο FILL_MAP keys για `targetShape` και `bgRect`. Plan B allowlist περιέχει μόνο text elements του change, οπότε αυτά τα downstream colors πέφτουν από το filter.

Αν text reflow αλλάζει `bgGroupColors` bucket (auto-color rotation `!usedColors.has(color)` branch στο 692-700), το clone υπολογίζει νέα bg color που δεν εφαρμόζεται. Real scene: text contrast against background that should be different. Όχι catastrophic αλλά silent staleness.

**Options:**
- **(a) Expand allowlist:** για κάθε collected text, βρες progenitor scope, enumerate shape/bg descendants, κάλεσε `keyForTarget` σε όλα.
- **(b) Accept + comment:** explicit code comment ότι shape colors δεν refresh σε text-layout changes, full reload required.

Decision χρειάζεται πριν Wave 1 fix.

---

### 11. `applyComputedColors` quadratic `findFirst` per key

**File:** `headless-color.service.ts:160, 210-219`

Κάθε key τρέχει `view.findFirst` που visit-άρει ολόκληρη τη scene. Για 50-product scene = `O(keys × nodes)` στο main thread, μετά το clone. UI stall.

**Fix (συνεργατικό με #2):** πέρασε `Map<key, liveNode>` από το `findTextElementForChange` μέχρι το apply phase. Iterate και κάλεσε `liveNode.fill(color)` direct. Καμία `findFirst` walk στο apply. Λύνει ταυτόχρονα το #2 (zero collection/apply drift).

---

### 12. Production logging flood, bypass Sentry

Platform CLAUDE.md αναφέρει Sentry. 8+ `console.log/console.time` per recompute. `[HeadlessColorService] computeColorsAtFrame failed` δεν φτάνει στο Sentry capture.

**Fix:** route errors μέσω project logger/Sentry, gate debug logs πίσω από flag.

---

### 13. `findProgenitor` χωρίς termination guard

**File:** `gbLibrary-utils.tsx:654-659`

```ts
while (!layer.progenitor && !(layer.parent() instanceof View2D)) {
    layer = layer.parent();
}
```

Αν `layer.parent()` γυρίσει null (detached node, lifecycle race), TypeError πυροδοτεί ταυτόχρονα τα silent catches #1, #3, #4, #6. Throw source σε όλο το pipeline.

**Fix:** null guard + explicit error message.

---

## Sequencing για fixes

### Wave 1 — Blocking correctness — ✅ DONE
1. ✅ **#3** — keyForTarget per-element throws logged + skipped, empty-allowlist bail.
2. ✅ **#5** — hard-skip πριν τον clone αν `keyForTarget` λείπει. Unfiltered apply branch αφαιρέθηκε.

Συνδυασμένο fix και για τα δύο σε `headless-color.service.ts:88-116`. Το early-return idiom καλύπτει: (a) bundle skew, (b) all elements throw, (c) wasted clone όταν δεν υπάρχει χρήσιμο allowlist.

(#1, #2, #4 dismissed — δες παραπάνω. #11 παραμένει ως design improvement στο Wave 3.)

### Wave 2 — Silent-failure hardening
6. **#6** — log στα empty catches του `text-color.service.ts`.
7. **#7** — discriminated result + user-facing notification σε επανάληψη.
8. **#8** — log στο `cleanupCloneShadowDom`.
9. **#9** — per-progenitor wrapping + incomplete-annotation flag.
10. **#13** — null guard στο `findProgenitor`.

### Wave 3 — Polish
11. **#10** — decision call πρώτα (expand allowlist ή accept staleness).
12. **#12** — Sentry routing, debug flag gating.

---

## Architectural smell

Failure modes collapse σε `colors.size === 0` στο platform boundary. Πέντε διαφορετικές αιτίες (early returns, throws, clone fail) γίνονται indistinguishable. **Single most impactful change**: discriminated result type από `recomputeAtRestTime` ώστε `maybeTriggerHeadlessRecompute` να ξέρει τι ακριβώς συνέβη και να ενεργήσει ανάλογα.

---

## Things confirmed correct

- Pass-3 placement του `annotateRestTimes` (μετά τα timing-content functions) — όλα τα `_animations` είναι finalized.
- `restTimeForTarget` fallback `progenitor.globalStartTime` — σωστή απόφαση για products που δεν ξεκινούν στο t=0.
- `setHeadlessInProgress` guard στο `syncGeneration` — σωστή isolation primitive.
- Deferred effects gate-άρουν με `currentTime < restTime` (lines 728, 759) → stepping στο `max(restTimes)` τα fire-άρει όλα at least once.
- `delete cloneVariables.headlessColorMode` πριν το clone — σωστή isolation.
- Synchronous resolve `restTimes` πριν async boundary — αποφεύγει stale refs.
- `keyForTarget` wrapper του `buildTextKey(target, findProgenitor)` — byte-identical κeys με τα capture sites στο `text-color.service.ts:579, 712, 780`.
- `findTextElementForChange` με `findFirst` στο global branch — σωστό υπό την τρέχουσα παραδοχή ότι non-product contexts (intro/outro/BackgroundTxt) είναι unique στη scene. Product-level contexts (price, name κλπ.) πάντα έρχονται με `productIndex`.
- Fire-and-forget chain χωρίς epoch token — αποδεκτό για το realistic user input cadence. Re-evaluate μόνο αν εμφανιστούν ms-scale consecutive triggers (π.χ. slider drag).
