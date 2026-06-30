# Case C σε Short-Form Eshop Video Ad

## TL;DR
- Static case C = flat base + selective gradients σε CTA/hero. Στο video η ίδια λογική κρατάει, αλλά η γραμμή ξαναχαράζεται: gradient = atmosphere/brand layer, flat = ό,τι κουβαλάει λέξεις, νούμερα ή tap target.
- **Διόρθωση (validated):** το full gradient background **ΔΕΝ** ήταν "κλειστό" στο static και δεν το "ξεκλειδώνει" το video. Static heroes ήδη το επιτρέπουν (Stripe, iOS launch screens, Linear/Aurora). Ο πραγματικός μεταβλητός είναι **text-load + contrast manageability του κάθε surface**, όχι το medium. Δες [validation report](2026-06-24-gradient-bg-foreground-claim-validation.html).
- Τι **όντως** προσθέτει το video: (1) native **motion** (animated mesh, parallax, drift) και (2) transition/reveal wipes που δεν έχουν στατικό αντίστοιχο. Το short-form ad απλώς πέφτει φυσικά στο **low-text / transient-text regime** όπου ένα full gradient bg δουλεύει, ακριβώς όπως και ένα sparse static hero.
- Ταυτόχρονα το flat rule γίνεται ΠΙΟ αυστηρό για information layers: kinetic captions, τιμή/offer, social proof, in-scene logo, το ίδιο το προϊόν μένουν flat (ή σε flat scrim) γιατί motion + compression + sound-off legibility τιμωρούν το gradient-on-info πιο σκληρά από μια στατική σελίδα.
- Νέοι περιορισμοί που δεν υπάρχουν στο static: slow drift (8-10s/cycle), product true-color (όχι gradient tint πάνω στο προϊόν), banding σε 8-bit H.264/H.265 (grain/dither), platform safe-zones, 3s dwell (το gradient είναι mood, όχι hook).
- Για το GLOH ramp: το αναλογικό warm->cool sweep χωρίς dark anchor είναι ασυνήθιστα ασφαλές σαν full-frame animated bg. Κίνδυνοι: banding στο σκούρο lavender άκρο, contrast loss για white captions πάνω στο ανοιχτό peach.

## Τι αλλάζει στο video (vs static C)

> **Σημαντική διόρθωση μετά από validation.** Η αρχική εκδοχή έλεγε "το background ανοίγει στο video γιατί ήταν OFF στο static". Αυτό **καταρρίφθηκε** (refuted, high confidence): το full gradient bg είναι ήδη common και accepted στο static (Stripe, iOS, Linear/Aurora). Δεν υπάρχει medium gate. Παρακάτω η σωστή απόδοση.

Το allowed-gradient set δεν μεγαλώνει επειδή "το static απαγόρευε" κάτι. Ο πραγματικός κανόνας είναι **medium-agnostic**: ένα gradient background δουλεύει όπου το **text-load είναι χαμηλό και το contrast διαχειρίσιμο** (sparse / large / transient / scrimmed text), και πολεμάει το foreground όπου υπάρχει πολύ fixed sustained-reading text απλωμένο χωρίς scrim. Αυτό ισχύει το ίδιο σε static hero και σε video.

Τι **όντως** φέρνει διαφορετικά το short-form video, σωστά αποδομένο:

- **Native motion (ο βασικός μοχλός).** Animated mesh / drift / parallax δίνουν το dynamic interest που κάνει το gradient να "κερδίζει" το full-frame real estate. Το static το πετυχαίνει κι αυτό (Stripe via WebGL), αλλά στο video είναι native και φθηνό. Δευτερευόντως, η κίνηση **κρύβει banding** (temporal dither) και το transient text **χαλαρώνει** το worst-case contrast.
- **Low-text regime by default.** Ένα 9:16 ad κουβαλάει λίγο, μεγάλο, transient text, χωρίς long dwell σε ένα frame. Αυτό το ρίχνει φυσικά στο regime όπου ένα full gradient bg συνυπάρχει με το foreground. Είναι ο **ίδιος** low-text-load μοχλός που έχει κι ένα sparse static hero, **όχι** κάτι που ξεκλειδώνει το medium.
- **Transitions & reveals: γνήσια video-only surfaces.** Gradient/luma wipes ανάμεσα σε scenes και gradient sweeps που αποκαλύπτουν product/logo δεν έχουν στατικό αντίστοιχο. Καθαρές προσθήκες: pure atmosphere, χωρίς text.
- **CTA accent εντείνεται.** Το CTA μένει gradient surface (όπως στο static C) αλλά αποκτά motion: pulse/shimmer/burst. Παρατηρημένο ~18% lift σε end cards με burst CTA.

Καθαρό delta: η πραγματική επέκταση είναι στο **motion / low-text regime + transition wipes**, όχι σε medium-gated "permission" για gradient background. Κάθε "κράτα flat background" κανόνας πρέπει να δικαιολογείται από το **text density εκείνου του surface**, όχι από το "static = no gradient bg".

## Πού μπαίνει gradient / πού μένει flat — per scene

Rows = τα 5 beats του arc. Cell = gradient ή flat + λόγος. Τρεις σταθεροί κανόνες κουβαλάνε τα constants ώστε τα cells να μένουν terse:

- **R1** — κάθε layer με λέξεις/νούμερα/tap-target = FLAT (ή flat scrim).
- **R2** — gradient ζει στα persistent atmosphere/brand layers (bg, transitions, end-card, CTA accent) που απορροφούν motion.
- **R3** — το μόνο full 5-stop sweep είναι το animated background και το end card. Μικρές επιφάνειες = max 2 stops, πάντα grained, πάντα high-bitrate.

| Beat | Background | Product | Text / Captions | CTA | Transitions |
|---|---|---|---|---|---|
| **Hook (0-3s)** | Gradient (subtle drift) — warm peach base, διαβάζεται σαν φως όχι fill | Flat/photographic — ο hero, real specular = dewy cue | Flat solid hook word, heavy sans, σε scrim — πρέπει να διαβαστεί σε <3s | — | — |
| **Product reveal** | Gradient — slow drift, glow halo (radial) πίσω από το προϊόν | Flat — gradient μόνο σαν rim-light, ποτέ tint πάνω στο bottle | Flat keyword pop, gradient fill επιτρεπτό ΜΟΝΟ στο hero word | — | Gradient wipe/light sweep στο cut (video-only) |
| **Benefit / demo** | Gradient (cool lavender wash, near-flat, χαμηλό drift) | Flat — true-color, returns spike σε color inaccuracy | Flat running captions σε solid plate (contrast αλλάζει frame-by-frame) | — | Gradient wipe προαιρετικά |
| **Social proof** | Gradient (calm, low movement) | Flat | Flat — review/number, max legibility, ποτέ gradient | — | — |
| **CTA / end card** | Gradient — εδώ πάει το fullest 5-stop sweep (no info competes) | Flat | Flat white label πάνω στο button | Button = 2-stop gradient accent (coral->pink) + pulse· το "reward" moment | Gradient bloom/burst (sparkle) |

Το load-bearing signal: το background gradient **εντείνεται** hook->CTA, το text μένει flat ΣΕ ΟΛΑ τα beats, το logo μένει flat μέχρι το end card όπου επιτρέπεται full gradient lockup.

## Νέοι περιορισμοί από την κίνηση

- **Drift speed.** Background gradient = slow, ~8-10s/cycle (range 2-10s), smooth, GPU-friendly transforms. Fast drift = distracting + vestibular/motion-sickness hazard (δεν μπορείς να τιμήσεις prefers-reduced-motion σε feed video, οπότε default = αργό/χαμηλό amplitude). Fast gradient motion μόνο σε στιγμιαία transitions.
- **Product true-color.** Το animated gradient ΔΕΝ περνάει πάνω στο προϊόν. Color inaccuracy = top return driver (~11% returns, 58% δεν ξαναγοράζει μετά από color inconsistency). Το GLOH bottle σε masked/protected layer, gradient αυστηρά πίσω/γύρω, ποτέ σαν tint overlay.
- **Text legibility πάνω σε moving gradient.** Το contrast αλλάζει κάθε frame καθώς το gradient drift-άρει κάτω από το text. Άρα solid plate/scrim/pill πίσω από κάθε kinetic caption, heavy sans-serif, λίγες λέξεις ταυτόχρονα. Με ~70-85% sound-off viewing, το text κουβαλάει το μήνυμα, legibility κερδίζει πάντα.
- **Compression banding.** Smooth gradients = το #1 θύμα σε 8-bit H.264/H.265 (256 shades/channel, RGB->YUV rounding). Χειρότερο σε σκούρα/low-contrast ranges. Fix: 1-2% grain/noise dither, master 10-bit (ProRes 422 HQ / DNxHR / H.265 Main10) μετά encode, export 1080x1920 30fps ~7 Mbps. Η ΙΔΙΑ η κίνηση + grain δρουν σαν temporal dither και κρύβουν banding, αρκεί το drift να μένει αργό.
- **Safe-zones.** Το gradient μπορεί full-bleed edge-to-edge. Αλλά text/CTA/logo μέσα στο cross-platform safe zone (~900x1400 centered σε 1080x1920): απόφυγε top ~20%, bottom ~25%, right ~15% όπου κάθεται το platform UI (captions, profile, engagement, Ads CTA).
- **Short dwell.** 3s retention 70-85% = 2.2x views. Ένα 8-10s drift δεν έχει καν ολοκληρώσει έναν κύκλο στα κρίσιμα πρώτα 3s, άρα δεν μπορεί να είναι το hook. Το gradient είναι ambient mood/brand· το hook το κρατάνε product + kinetic text + opening visual beat.

## GLOH εφαρμογή (concrete)

Παλέτα: `#FFD9C0` peach -> `#FF9E7A` coral -> `#FF7AA8` pink -> `#C98BD6` lavender -> `#A99BE0` periwinkle. Μην εμφανιστεί όλη μαζί. Split by beat κατά temperature/energy:

- **Hook — full arc, slow linear-ish drift.** Και τα 5 stops σαν 9:16 backdrop, angle ~160-200deg (warm peach κάτω/bottom-left ανεβαίνει σε cool lavender πάνω, σαν dawn light). Drift origin αργά (8-15s loop, πολύ μεγαλύτερο από το beat ώστε να μην "φτάνει" ποτέ). Talent/face/product πάνω στο warmer lower third (`#FFD9C0`/`#FF9E7A`) ώστε το skin να δείχνει sun-kissed.
- **CTA / energetic beat — hot middle, radial/conic.** Τα δύο high-chroma stops `#FF9E7A -> #FF7AA8` σαν radial bloom πίσω από το CTA chip (`#FF9E7A` center -> `#FF7AA8` edge), ή slow conic shimmer ("light catching dewy skin"). Pulse ON το beat / τη λέξη "now". Το chip/label μένει FLAT (solid coral ή white) σαν crisp tap target· gradient = το halo, όχι το chip.
- **Benefit / payoff — cool tail, near-flat.** `#C98BD6 -> #A99BE0` gentle wash, minimal drift, για το "calm, hydrated, dewy result" ή το end card. Cool lavender χαμηλώνει το arousal, διαβάζεται premium/clean-beauty, contrast στο warm hook. Direction top-down ή radial vignette ώστε το result να κάθεται σε soft halo.

Η warm->hot->cool δομή χρησιμοποιεί την ίδια τη θερμοκρασία της παλέτας σαν emotional arc του ad.

- **OKLCH interpolation.** Interpolate σε OKLCH, όχι sRGB. Στο sRGB το coral (`#FF9E7A`) -> lavender (`#C98BD6`) βουλιάζει σε γκριζωπό muddy midpoint που σκοτώνει το glow. OKLCH κρατάει perceptual lightness/chroma σταθερά -> συνεχές luminous skincare glow. CSS: `linear-gradient(in oklch, ...)`. Σε AE/Figma: intermediate stops ή bridge ~`#E58FB0` για coral->lavender χωρίς graying.
- **Πού μένει flat.** Product packshot (τα δικά του specular highlights = το dewy cue), text plates, logo in-scene, CTA chip. Gradients μόνο σε backgrounds + accent halos.
- **GLOH-specific risks.** (1) Banding συγκεντρώνεται στο σκούρο lavender άκρο `#C98BD6 -> #A99BE0` -> grain/dither ή κράτα το σε κίνηση. (2) Το ανοιχτό peach `#FFD9C0` σκοτώνει το contrast για white captions -> flat scrim ή solid χρώμα από τα coral/pink mids κάτω από το text. Και τα δύο σπρώχνουν το gradient στο fringe και κρατάνε τα text-bearing zones flat.
- **Validation.** Το GLOH ramp είναι σχεδόν ταυτόσημο με proven skincare gradients ("Peach Mist Daybreak", "Morning Haze Glow") που χρησιμοποιούνται για skincare openers/callouts/end screens. Glow Recipe βάζει προϊόντα σε pink-to-lavender gradient bg. Δεν είναι speculative, είναι higher-chroma εκδοχή μιας ήδη validated skincare gradient family.

## Πρακτικό recipe

Ένα animated full-frame gradient background (full GLOH 5-stop arc, OKLCH, drift 8-15s, +1-2% grain, export ~7 Mbps 10-bit master) που εντείνεται hook->CTA. Πάνω του: product packshot flat και true-color σε protected layer (gradient μόνο σαν rim-light/glow halo, ποτέ tint). Όλα τα text/τιμή/social proof flat solid σε scrim/pill μέσα στο safe zone. Στο CTA: radial coral->pink bloom πίσω από flat-white button που κάνει pulse στο beat. Ανάμεσα στα cuts: gradient/light-sweep wipes. End card: full 5-stop sweep + gradient logo lockup. Κανόνας ελέγχου σε κάθε frame: gradient = atmosphere, flat = κάθε λέξη/νούμερο/tap target.

## Πηγές
- https://colorshunter.com/blog/gradient-design-trends
- https://www.kittl.com/blogs/gradient-design-trend-stl/
- https://versacreative.com/blog/top-social-media-design-trends-2026/
- https://instantgradient.com/blog/animated-gradient-backgrounds
- https://blog.adobe.com/en/publish/2021/08/17/gradients-in-motion-design-offer-range-of-possibilities-match-our-current-emotional-spectrum
- https://www.svgator.com/blog/color-banding-gradient-animation/
- https://community.adobe.com/t5/after-effects-discussions/avoid-colour-banding-when-exporting-in-h-264/td-p/12892487
- https://indietips.com/fix-colour-banding/
- https://unifab.ai/resource/what-is-color-banding
- https://forum.blackmagicdesign.com/viewtopic.php?t=152540
- https://cloudinary.com/glossary/compression-artifacts
- https://hevcut.com/guides/best-export-settings-reels-tiktok-shorts
- https://www.fontmirror.com/en/typography-trends-shaping-short-form-ai-video-content/
- https://tigerpistol.com/vertical-video-ad-best-practices/
- https://www.influencers-time.com/boost-short-form-views-with-kinetic-typography-in-2025/
- https://www.influencers-time.com/kinetic-typography-boost-video-retention-on-tiktok-and-reels/
- https://www.todaymade.com/blog/kinetic-typography-examples
- https://educationalvoice.co.uk/kinetic-typography/
- https://www.digitalsilk.com/digital-trends/kinetic-typography/
- https://elements.envato.com/stock-video/motion-graphics/overlays/light+sweep
- https://guide.alightmotion.com/effects/light-glow
- https://www.rewarx.com/blogs/halo-effect-social-ads-fashion-brands
- https://craftsmanplus.com/blog/why-end-cards-are-a-winning-strategy-for-your-digital-ads
- https://wisernotify.com/blog/call-to-action-designs-with-examples/
- https://premierebro.com/premiere-in-post/motion-array-how-to-make-a-gradient-wipe-transition-luma-wipe
- https://motionarray.com/motion-graphics-templates/gradient-transitions-227950/
- https://zeely.ai/blog/22-skincare-ads-that-actually-work-with-proof-you-can-copy/
- https://topgrowthmarketing.com/beauty-and-skincare-ads/
- https://www.rocketshiphq.com/text-overlays-video-ads-mobile/
- https://zeely.ai/blog/tiktok-safe-zones/
- https://kreatli.com/guides/safe-zone-guide
- https://houseofmarketers.com/guide-to-safe-zones-tiktok-facebook-instagram-stories-reels/
- https://adaptlypost.com/en/blog/social-media-safe-zones-2026-complete-guide
- https://medium.com/@uiuxstevemathews/animated-gradients-on-digital-design-8e4fa2c71297
- https://www.bestbackgrounds.com/gradient-backgrounds/animated-gradient-backgrounds/
- https://minitoolshub.com/blog/css-gradient-animations
- https://blogs.freetoolsmax.com/animated-background-gradient-tool/
- https://equalentry.com/why-motion-on-websites-and-digital-content-is-a-problem/
- https://www.webaxe.org/vestibular-issues-parallax-design/
- https://www.pixelz.com/blog/color-correct-product-photography-reduce-e-commerce-return-rates/
- https://www.creativelive.com/class/creating-advanced-masks-chris-knight/lessons/use-luminance-masks-to-color-grade
- https://filmora.wondershare.com/video-creative-tips/gradient-color-palette.html
- https://insights.ttsvibes.com/tiktok-first-3-seconds-hook-retention-rate/
- https://sqmagazine.co.uk/social-media-attention-span-statistics/
- https://brandefy.com/optimize-first-3-seconds-video/
- https://sovran.ai/blog/hook-body-cta-video-ad-structure
- https://auroracos.com/10-tiktok-viral-color-cosmetics-trends-this-summer/
- https://www.pennock.co/blog/short-form-video-beauty-ad-creative-trends-q2-2026