# Palette Scorer — Track 2 Deterministic Ranking (Frozen)

**Date**: 2026-06-02
**Status**: ❄️ Frozen / Reverted from platform-client-v2 (kept in brief-localhost for future use)
**Location (live)**: `brief-localhost/src/workflow/palette-scorer.js` (committed σε `d98c0f9`)
**Location (reverted)**: ήταν `platform-client-v2/src/app/create-video/palette-scorer.ts`

---

## Τι ήταν αυτό

Deterministic rule-based scorer που έπαιρνε ως input τα 5 LLM-generated palette recommendations και τα **κατατάσσει** (best→worst) με βάση μετρήσιμα criteria. Καμία AI κλήση, same input → same output.

**Σκοπός**: Αντί να εμφανίζουμε ασταθή AI rankings ή τυχαία επιλογή, να έχουμε **εξηγήσιμη και reproducible** επιλογή του "winner" palette που πάει στο canvas.

## Το scoring formula

```
total =  1.0 × placement_score          (Table A: styleTag × placement/audience/promo)
       + 1.5 × characteristics_score    (Table B: characteristics → styleTag bonus)
       + 1.0 × energy_score             (Table C: hue temperature × age bracket)
       + 2.0 × avgLuminanceSpread       (primary — contrast)
       + coherence_penalties            (additive, negative)
```

**Tie-break order**: total → pool coverage → fewer tags → original index.

## Τα 3 lookup tables

### Table A — `STYLE_PLACEMENT` (styleTag × placement/audience signals)

| Style | fastSocial | slow | age1824 | age35plus | discount |
|---|---|---|---|---|---|
| bright | +0.5 | -0.5 | +1.0 | -1.0 | +1.5 |
| dark | +0.5 | +1.0 | 0 | +1.0 | 0 |
| pastel | -0.5 | +1.0 | 0 | +1.0 | -1.0 |
| vintage | -0.5 | +1.0 | -0.5 | +1.5 | -0.5 |
| monochromatic | +0.5 | +0.5 | 0 | +0.5 | 0 |
| gradient | 0 | -1.0 | +0.5 | -0.5 | +0.5 |
| cold | +0.5 | 0 | 0 | 0 | 0 |
| warm | +0.5 | 0 | 0 | 0 | 0 |

Signals derived from brief:
- `fastSocial` = placement ∈ {reels, tiktok, igstory, fbstory, igreel, fbreel, story, shorts}
- `slow` = placement ∈ {posts, post, youtube}
- `age1824` = audience.ageGroup includes '18-24'
- `age35plus` = audience.ageGroup includes 35+
- `discount` = any product has oldPrice > price

### Table B — `CHARACTERISTICS` (brief characteristic → styleTag bonus)

| Characteristic | Bonuses |
|---|---|
| clean | monochromatic+2, pastel+1, bright+0.5, gradient-0.5, vintage-1 |
| modern | bright+1, gradient+1.5, cold+1, vintage-2 |
| slick | monochromatic+1, pastel-1, gradient+1, cold+1.5, dark+1 |
| luxury | monochromatic+1, bright-1, dark+2, vintage+0.5 |
| playful | monochromatic-1, pastel+1, bright+2, gradient+1, dark-1, warm+1 |
| natural | pastel+1, vintage+1, warm+1 |
| bold | pastel-1, bright+1, gradient+1, dark+1 |
| vintage | pastel+0.5, bright-1, vintage+3, warm+1 |

Aliases: premium→luxury, fun→playful, organic→natural, retro→vintage.

### Table C — `HUE` (hue → Temperature, Energy)

| Hue | T (-2 cold...+2 warm) | E (0 calm...2 vibrant) |
|---|---|---|
| red | +2 | 2.0 |
| orange | +2 | 1.5 |
| yellow | +1.5 | 1.5 |
| chartreuse-green | +0.5 | 1.5 |
| green | 0 | 0.5 |
| spring-green | +0.5 | 1.0 |
| cyan | -2 | 1.0 |
| azure | -1.5 | 0.5 |
| blue | -2 | 0.5 |
| violet | -0.5 | 0.5 |
| magenta | +1 | 1.5 |
| rose | +1 | 0.5 |

Energy term applied as:
- fastSocial + age1824 → reward high-energy hues (`+0.5 × E`)
- slow → reward calm hues (`+0.5 × (2 - E)`)

## Contrast (primary signal, weight 2.0)

`avgLuminanceSpread` = mean of (max - min) luminance per palette across all bucket groups. High spread → good contrast → high score.

## Coherence penalties

- styleTags includes both `bright` AND `dark` → **-1**
- styleTags includes both `pastel` AND `dark` → **-1.5**
- styleTags includes `cold` but avg colorTag temperature > +0.5 → **-2**
- styleTags includes `warm` but avg colorTag temperature < -0.5 → **-2**

## UI Integration (το reverted part)

Το `create-brief-button.component.ts` στο platform είχε:

1. **Import** του `rankPalettes, RankedRecommendation, ScorerBrief` από `palette-scorer.ts`
2. **Signal** `briefScorerRanking = signal<RankedRecommendation[]>([])`
3. **Στο `handleBriefCompleted`** call το `rankPalettes(outputs.palettes, brief)` αντί για το παλιό απλό `selectBestPaletteTheme(outputs.palettes)`
4. **UI popup** "Why this theme was selected" — δείχνει και τα 5 candidates με score breakdown ανά term, με WINNER badge στο top-1

### UI popup screenshot description

Card per candidate (#1 highlighted purple):
```
#1 [WINNER]  azure  blue  cold  monochromatic               12.45
placement 1.50 · chars 4.50 · energy 0.50 · contrast 5.95 · spread 0.297 · pool 23

#2           rust  cream  warm  vintage                      9.20
placement 0.50 · chars 2.50 · energy 0.20 · contrast 6.00 · spread 0.300 · pool 31
...
```

## Why frozen / reverted

Από user feedback (2026-05):
> "θελω να κρατησουμε μονο τα perfect match στο display και να παγώσουμε για τώρα τον scorer"

Λόγος: Το team έχει επιλέξει για τώρα διαφορετική στρατηγική display palette recommendations:
- **Tier cascade** (T1 perfect match → T5 last resort drop primary)
- **Mood diversity** (5 mutually exclusive recommendations, user picks 1)
- **Tag-based filtering** (brief-tag eligibility για background slot — see Aug 2026 docs)

Ο scorer ήταν συμβατός με flat "pool all 5 recommendations" approach. Είναι ασύμβατος με "5 distinct moods" (γιατί δεν έχει νόημα να scoreαρει mutually exclusive options σαν να ήταν παραλλαγές).

Αν στο μέλλον αλλάξει η στρατηγική (π.χ. user wants single best recommendation αυτόματα) ο scorer είναι έτοιμος και committed στο brief-localhost.

## Files snapshot

| File | Status |
|---|---|
| `brief-localhost/src/workflow/palette-scorer.js` | ✅ Committed (`d98c0f9`), 289 lines |
| `brief-localhost/scripts/score-palettes.js` | ✅ Committed (`d98c0f9`), CLI test harness |
| `brief-localhost/scripts/palette-report.js` | ✅ Committed (older) |
| `platform-client-v2/src/app/create-video/palette-scorer.ts` | ❌ Reverted (was port of .js to TypeScript) |
| `platform-client-v2/.../create-brief-button.component.ts` | ❌ Scorer integration reverted |

## How to bring it back

### Quick re-enable στο platform

1. Re-port `brief-localhost/src/workflow/palette-scorer.js` → TypeScript ως `platform-client-v2/src/app/create-video/palette-scorer.ts` (current code in this report's git history is reference)
2. Στο `create-brief-button.component.ts`:
   ```typescript
   import { rankPalettes, RankedRecommendation, ScorerBrief } from '../../palette-scorer';

   public briefScorerRanking = signal<RankedRecommendation[]>([]);

   private handleBriefCompleted(outputs: any, brief: ScorerBrief): void {
       const ranked = rankPalettes(outputs.palettes || [], brief);
       this.briefScorerRanking.set(ranked);
       const winner = ranked[0];
       const selectedPalette = winner != null ? outputs.palettes[winner.index] : null;
       // ... rest of logic
   }
   ```
3. Add the "Why this theme was selected" HTML block στο palette summary popup
4. Update callers του `handleBriefCompleted` να περνάνε το `input` (brief) ως 2ο argument

### Standalone test harness

Στο brief-localhost μπορείς να τρέξεις:
```bash
node scripts/score-palettes.js <path-to-brief-output.json>
```
Επιστρέφει ranked list με score breakdown, χωρίς να χρειάζεται UI.

## References

- Source code (live, committed): `~/Projects/brief-localhost/src/workflow/palette-scorer.js`
- Test harness: `~/Projects/brief-localhost/scripts/score-palettes.js`
- Related docs:
  - `~/Projects/brief-localhost/docs/palette-scorer-porting-spec.md`
  - `~/Projects/brief-localhost/docs/palette-strategies-and-cleanup.md`
  - `~/Projects/brief-localhost/docs/palette-cascade-flow.md`
