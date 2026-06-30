# Gradient Παλέττες στο Graphic Design — Θεωρητική Έρευνα

## TL;DR
- Το "gradient" ΔΕΝ είναι το ίδιο είδος attribute με warm/cold/bright/dark/pastel/vintage/monochromatic. Είναι orthogonal (συνδυάσιμος) άξονας: τα εφτά λένε ΠΟΙΑ χρώματα, το gradient λέει ΠΩΣ απλώνονται στον χώρο.
- Μια λίστα από hex ΔΕΝ είναι από μόνη της gradient. Γίνεται ντετερμινιστικά gradient με δύο προσθήκες: positions ανά stop + interpolation rule (color space + lerp).
- Το palette σου ΕΙΝΑΙ ήδη τα stop-colors ενός gradient. Λείπουν μόνο οι θέσεις και το interpolation contract.
- Η υπόθεση "gradient palette => ΟΛΑ τα elements σε gradient fill και ΜΟΝΟ gradient fill" είναι η πιο αδύναμη ερμηνεία. Καμία authoritative πηγή δεν τη στηρίζει.
- Πιο πιθανό intent: selective gradient σε key surfaces (hero backgrounds, primary CTAs, overlays, λίγα accents) πάνω σε flat neutral βάση.
- Το ίδιο ζεύγος hex δίνει διαφορετικό gradient ανάλογα με interpolation space (sRGB vs OKLab/OKLCH), stop positions και midpoint hints. Το hex list under-specifies το gradient.

## 1. Τι είναι μια gradient παλέττα

**Gradient** (γνωστό και ως color ramp / color progression): μια συνεχής, position-dependent μετάβαση ανάμεσα σε δύο ή περισσότερα ορισμένα χρώματα, που παράγεται με μαθηματική interpolation των ενδιάμεσων χρωμάτων μεταξύ σταθερών σημείων αναφοράς (τα **color stops**).

Formally απαιτεί τρία συστατικά:
1. Μια αύξουσα ακολουθία **positions** (sample points)
2. Ένα **χρώμα** σε κάθε position (τα stops)
3. Έναν **interpolation rule** για ό,τι βρίσκεται ανάμεσα

```
gradient = ordered list of color stops { color, position }  +  interpolation rule (color space + lerp)
```

- Τα **stops** είναι discrete. Το hex list σου = ακριβώς τα stop-colors, μείον τις θέσεις.
- Τα ενδιάμεσα χρώματα **δεν αποθηκεύονται, υπολογίζονται** at render time. Math per channel: `c = start + (end - start) * t`, piecewise ανάμεσα σε διαδοχικά stops.

**Geometry / τύποι gradient** (από το πώς τοποθετούνται τα stops):
- **Linear / axial** — μετάβαση κατά μήκος ευθείας ανάμεσα σε δύο σημεία, σε οποιαδήποτε γωνία.
- **Radial** — χρώματα ακτινωτά από ένα κέντρο σε ομόκεντρους κύκλους/ελλείψεις (center color -> edge color).
- **Conic / angular** — stops τοποθετημένα σε γωνίες (degrees), περιστροφή γύρω από κέντρο (color-wheel / pie-sweep effect).
- **Mesh** — πλέγμα από stops και control points για multi-directional, painterly blends.

**Gradient vs flat fill:** το gradient δίνει συνεχή χρωματική μεταβολή, το solid/flat fill ένα ομοιόμορφο χρώμα. Στο CSS είναι και type distinction: το gradient είναι `<image>`, όχι `<color>`, γι' αυτό ζει στο `background-image`, όχι στο `background-color`.

**Κρίσιμο:** το οπτικό αποτέλεσμα εξαρτάται από το **color space** της interpolation. Το ίδιο red-to-blue ζεύγος περνά από muddy desaturated purple-gray midpoint σε sRGB, αλλά μένει saturated και smooth σε OKLab/OKLCH.

## 2. Είναι το "gradient" στην ίδια κατηγορία με warm/cold/pastel κλπ;

**Verdict: ΟΧΙ. Διαφορετικός, orthogonal άξονας.**

**Τα άλλα εφτά απαντούν "ΠΟΙΑ χρώματα"** και χαρτογραφούνται στις 3 κλασικές διαστάσεις του χρώματος (hue / saturation / value):
- warm/cold = hue (θερμοκρασία στον χρωματικό τροχό)
- bright/dark = value/lightness
- pastel = χαμηλό saturation + υψηλό lightness
- monochromatic = σχέση hue (ένα hue, μεταβολή S/V)
- vintage = mood/εποχή πάνω σε muted/desaturated hues

**Το gradient απαντά "ΠΩΣ απλώνονται τα χρώματα στον χώρο"** (position-dependent transition). Είναι rendering/application property, όχι color-content property.

**Δομική απόδειξη ορθογωνιότητας:** μπορείς να φτιάξεις warm-gradient, dark-gradient, pastel-gradient, monochromatic-gradient. Το gradient **συνδυάζεται** με κάθε ένα από τα άλλα tags αντί να **ανταγωνίζεται** μαζί τους, άρα κάθεται σε άλλον άξονα. Αντίθετα, δεν μπορείς να φτιάξεις "warm-cold" ή "pastel-vintage" ως single coherent value στον ίδιο άξονα.

**Η nuance (γιατί μπερδεύεται):** στα catalogues και στο dataviz το "gradient" χρησιμοποιείται χαλαρά ως palette-type (sequential/diverging gradients vs categorical). Επίσης ένα gradient συχνά υπονοεί μια σχέση χρωμάτων (smooth, low-contrast, κοντινό hue arc). ΟΜΩΣ αυτή η σχέση είναι **παρενέργεια, όχι ορισμός**: ένα gradient μπορεί να είναι monochromatic, analogous ή full rainbow. Το monochromatic ορίζεται ΑΠΟ τη σχέση hue, το gradient ορίζεται ΑΠΟ τη χωρική μετάβαση. Άρα: loosely tagged ως "palette type", αλλά κατηγορικά διαφορετικό.

## 3. Παλέττα = λίστα από hex. Πώς συμβιβάζεται με "gradient";

**Verdict: Μια λίστα hex ΔΕΝ είναι από μόνη της gradient, αλλά γίνεται gradient ντετερμινιστικά με positions + interpolation rule.**

Η γέφυρα είναι **μία πράξη: interpolation.** Είναι ο τρόπος που βρίσκεις νέα χρώματα ανάμεσα σε γνωστά. Math: lerp per channel, `c = start + (end - start) * t`, piecewise ανάμεσα σε κάθε διαδοχικό ζεύγος stops.

Τι λείπει από το raw hex list για να γίνει gradient:
1. **position ανά χρώμα** (offset 0..1 ή 0%..100%)
2. **interpolation method** (color space + lerp)

5 hex γίνονται "gradient palette" ντετερμινιστικά: ισοκατανέμεις τα stops και διαλέγεις space:
```css
linear-gradient(in oklch, #h1 0%, #h2 25%, #h3 50%, #h4 75%, #h5 100%)
```

Κάθε design tool μοντελοποιεί το ίδιο πράγμα: array of `{color, position}`. Διαφέρουν μόνο στις μονάδες και στο default space:
- **SVG:** `<stop offset stop-color>` children μέσα στο parent gradient element
- **Figma:** `gradientStops: ColorStop[]` με `{position 0..1, color}`, geometry χωριστά (gradientTransform)
- **Illustrator:** gradient slider stops με location 0..100 + draggable midpoints + interpolation mode (Perceptual vs classic)

**Κρίσιμο: το hex list under-specifies το gradient.** Το ίδιο ζεύγος hex δίνει διαφορετικό αποτέλεσμα ανάλογα με (α) interpolation space (sRGB -> muddy midpoint, OKLCH -> saturated smooth), (β) stop positions (even vs weighted), (γ) midpoint hints/bias. "Το" gradient ενός palette δεν είναι μοναδικό χωρίς να ορίσεις αυτά.

Συμπερασματικά: **το palette σου ΕΙΝΑΙ ήδη τα stop-colors ενός gradient.** Είναι το ίδιο color data, plain ως swatches, gradient όταν προσθέσεις τις δύο συμβάσεις.

## 4. Τι σημαίνει "ο designer προτείνει gradient" για το ίδιο το design;

Το κλειδί: **"gradient palette" περιγράφει το color SET, όχι το πώς ζωγραφίζεται το design.** Δύο **διαχωρίσιμοι** άξονες που συχνά μπερδεύονται σε έναν:

- **Άξονας 1 — Πώς προκύπτει η παλέττα:** είναι gradient-derived; (τα hex είναι stops κατά μήκος ενός smooth ramp, άρα αρμονικά συνδεδεμένα). Αν την πεις "gradient palette", εξ ορισμού ναι.
- **Άξονας 2 — Πώς εφαρμόζεται στο design:** μπαίνει πραγματικό gradient fill, ή τα χρώματα μπαίνουν flat; Ξεχωριστή απόφαση.

*Σημείωση (validation):* οι δύο άξονες είναι **διαχωρίσιμοι** (απόδειξη: το Material 3 παράγει ramp-derived discrete tones χωρίς κανένα rendered gradient), **όχι όμως πλήρως ανεξάρτητοι στην καθημερινή χρήση**. Το tag δηλώνει Άξονα 1 και επιτρέπει flat χρήση, αλλά δεν είναι ουδέτερο ως προς rendering: στο mainstream branding το "gradient palette" κουβαλάει το connotation ότι κάπου φαίνεται gradient (άρα πιθανότερο intent παραμένει C).

Παράδειγμα παλέττας GLOH: `#FFD9C0 → #FF9E7A → #FF7AA8 → #C98BD6 → #A99BE0` (peach → coral → pink → lavender).

**Οι 4 περιπτώσεις, με συγκεκριμένο design outcome:**

**A — Gradient-derived παλέττα, flat χρήση**
Τα 5 hex μπαίνουν σαν **solid fills** (peach background, coral button, lavender badge). Πουθενά πραγματικό gradient στο τελικό. Το "gradient" είναι μόνο το logic/πηγή της παλέττας (γι' αυτό δένουν τα χρώματα), αόρατο στο μάτι. Αυτό βγάζουν εργαλεία: το Coolors έχει tool με τίτλο ακριβώς "gradient palette" (Start/End color → hex swatches), το Adobe το λέει "Extract Gradient". Default behavior = ισοκατανεμημένα flat swatches από ένα fade.
→ Outcome: harmonious flat design, **κανένα ορατό gradient.**

**B — Πραγματικό gradient μέσα στο design**
Τα ίδια hex γίνονται **color stops** και το design δείχνει συνεχείς μεταβάσεις: hero background peach→lavender, CTA coral→pink, image overlays.
→ Outcome: **βλέπεις gradients** στις key surfaces.

**C — Και τα δύο** (το ρεαλιστικό default όταν μιλάμε για brand/marketing expression)
Η ίδια παλέττα παίζει διπλό ρόλο: base flat χρώματα για το γενικό UI (text, cards, states) **+** 2-3 approved gradient combos από τα ίδια hex για hero/CTA/accents.
→ Outcome: flat neutral βάση + επιλεκτικά πραγματικά gradients.

*Σημείωση (validation) — δύο layers:* στα **codified/tokenized design systems** (Material 3, IBM Carbon, Linear) το default είναι flat base + **ένα** flat solid accent, με τα gradients **εκτός** του token system. Τα gradients ζουν στο **brand/marketing layer**: hero/marketing (Stripe) ή brand mark (Instagram gradient = logo, όχι UI surface). Άρα το "flat base + selective gradients" είναι dominant στο **brand/marketing** layer, **όχι** universal default σε κάθε component library.

**D — "gradient" σαν mood, όχι σαν παλέττα**
Ο designer δεν περιγράφει δομή παλέττας. Λέει "θέλω gradient αισθητική" = soft, blended, atmospheric, glow vibe. Αφήνει ανοιχτό και ποια χρώματα και πού μπαίνουν. Το "gradient" είναι **επίθετο πάνω σε όλη την οπτική γλώσσα**, όχι spec.
→ Outcome: κατεύθυνση style, όχι συγκεκριμένο σύστημα.

*Γιατί ακριβώς 4 (exhaustive):* προκύπτουν από δύο orthogonal binaries (δομημένη παλέττα ναι/όχι × ορατό gradient ναι/όχι). Variants όπως gradient maps/duotone, animated gradients, mesh **δεν** είναι 5η περίπτωση: είναι διαφορετικός μηχανισμός/geometry/motion που ως **ορατό outcome** πέφτει στο B ή C.

**Verdict — τι είναι πιο πιθανό:**
- **Κυρίως C.** Αν κάποιος λέει "gradient" κυριολεκτικά, περιμένει να **δεις** gradient κάπου (B παρόν) αλλά όχι παντού (και flat χρήση, A παρόν).
- **Καθαρό A είναι ασύνηθες σε brief, ΟΧΙ αντιφατικό.** Είναι όρος τέχνης: ένα set από flat swatches με interpolation logic (ακριβώς ό,τι βγάζουν τα "gradient palette" tools). "Κανένα ορατό gradient" = κανονικό output της κατηγορίας. Caveat: σε casual brief κάποιος που λέει "gradient" συχνά περιμένει να **δει** μετάβαση, οπότε αν το deliverable είναι 100% flat, διευκρίνισε intent. (Σημείωση: gradient ramp ≠ analogous, ένα peach→lavender ramp καλύπτει non-adjacent hues, άρα το "απλώς analogous" δεν στέκει σαν fallback.)
- **Η αρχική υπόθεση "μόνο B / gradient fill και τίποτα flat" είναι η λιγότερο σωστή.** Best practice = restraint: "one great gradient beats five average ones", bold gradients σε μικρή περιοχή (button/hero), όχι σε όλη την οθόνη. Overuse αυξάνει το ρίσκο accessibility failures (το contrast αλλάζει pixel-by-pixel: ίδιο text block περνάει WCAG AA σε μια περιοχή και κόβεται σε άλλη, μέτρα στο worst point: 4.5:1 normal, 3:1 large ≥18pt/14pt-bold, Level AA) + distracting + performance cost. Προσοχή ειδικά σε gradient CTAs.

**Στο δικό σου tag system specifically:**
Όταν ταγκάρεις μια παλέττα "gradient", αυτό είναι δήλωση για τον **Άξονα 1** (το color set είναι ramp, έτοιμο να γίνει stops), **όχι** εγγύηση για το output. Το tag λέει "αυτά τα hex interpol-άρουν ωραία", όχι "βάλε gradient fill παντού". Γι' αυτό το "gradient" κάθεται σε **διαφορετικό άξονα** από warm/cold/pastel (που μιλάνε μόνο για το ποια χρώματα = Άξονας 1).

**Σωστή κίνηση:** μην default-άρεις σε "everything gradient fill." Πιο πιθανό intent = selective gradient σε key surfaces πάνω σε flat neutral βάση. Αν χρειάζεται ακρίβεια για deliverable (stops, hex, angle, allowed surfaces), διευκρίνισε το scope με τον designer.

## 5. Παράδειγμα brief για eshop

**Vertical:** Clean beauty / skincare (tech-forward αισθητική, νεανικό κοινό, wellness αφήγηση: το πιο φυσικό έδαφος για gradient παλέτες).

**Project:** GLOH — Eshop & rebrand οπτικής ταυτότητας
**Πελάτης:** GLOH Skincare
**Παραδοτέο:** Color system + UI direction για το νέο eshop

**Audience**
- Γυναίκες και άνδρες 22-34, αστικά κέντρα (Αθήνα, Θεσσαλονίκη), digital-natives.
- Αγοράζουν κυρίως από κινητό (Instagram/TikTok -> eshop), σύντομο attention span.
- Skincare-literate (niacinamide, hyaluronic, SPF), διαβάζουν ingredients, αλλά δεν θέλουν "κλινικό/φαρμακευτικό" στήσιμο.
- Value-driven: "καθαρές" φόρμουλες, cruelty-free, sustainability, με αισθητική που μοιράζεται στα stories.
- Μέτριο budget, 2-3 προϊόντα ανά παραγγελία, ευαίσθητοι σε look & feel πριν την τιμή.

**Brand**
- Όνομα: GLOH (από το "glow"). Σημαίνει λάμψη, ενυδάτωση, φρεσκάδα.
- Προϊόν: σειρά 8 SKU clean skincare (serums, moisturizers, SPF, cleanser, mist) σε minimal frosted μπουκάλια.
- Positioning: "skincare που λάμπει", προσιτό premium ανάμεσα σε pharmacy brand και high-end luxury.
- Brand promise: φωτεινό, ενυδατωμένο δέρμα χωρίς περίπλοκη ρουτίνα.
- Ανταγωνιστές αναφοράς (mood): Glossier, Typology, Frank Body.
- Logo: wordmark, λεπτό sans, χωρίς έντονο χρώμα. Αφήνει ελευθερία στο color system.

**Language (tone of voice)**
- Φιλικό, ζεστό, "φίλη που ξέρει από skincare", όχι expert που σε κράζει.
- Σύντομες, καθαρές προτάσεις. Καθημερινή γλώσσα, ελάχιστη ορολογία (όταν μπαίνει, εξηγείται απλά).
- Optimistic και αισθησιακό χωρίς υπερβολές. Λέξεις-κλειδιά: λάμψη, φως, ενυδάτωση, φρεσκάδα, απαλό, αέρινο.
- Χωρίς ιατρικό/αυστηρό λεξιλόγιο, χωρίς fear-based marketing.
- Inclusive, body/skin positive. Μιλάει σε όλους τους τόνους δέρματος.

**Characteristics (αισθητική κατεύθυνση)**
- Light, airy, "φωτεινό": αίσθηση φωτός που πέφτει στο δέρμα.
- Soft & dewy: απαλές μεταβάσεις, τίποτα σκληρό ή high-contrast, αποφυγή έντονων μαύρων borders.
- Modern minimal με glow: άπλετο λευκό/off-white χώρο, αλλά με χρώμα που "αναπνέει" και κινείται, όχι flat blocks.
- Νεανικό, optimistic, "sun-kissed" παλέτα: ροδακινί, κοραλί, ροζ-χρυσό, απαλό μωβ, warm peach, lavender.
- Premium αλλά προσιτό: καθαρό feel χωρίς cold/luxury αυστηρότητα.
- Mobile-first: τα χρώματα ξεχωρίζουν και "λάμπουν" σε μικρές οθόνες, τραβάνε το μάτι στο feed.
- Επιθυμητό feel: golden-hour φως, ενυδάτωση, φρεσκάδα νωρίς το πρωί.

**Deliverable προς σχεδιαστή:** ολοκληρωμένο color system για το eshop (primary/secondary, backgrounds, accents, states) που μεταφέρει το "glow" και λειτουργεί σε mobile-first UI.

## Πηγές

**Ορισμός & θεωρία gradient**
- https://en.wikipedia.org/wiki/Color_gradient
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/linear-gradient
- https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/linear-gradient
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color-interpolation-method
- https://developer.mozilla.org/en-US/docs/Web/CSS/color-interpolation-method
- https://chrisburnell.com/article/interpolating-colours/
- https://dev.to/ndesmic/linear-color-gradients-from-scratch-1a0e
- https://css-tricks.com/almanac/functions/l/linear-gradient/
- https://www.align.vn/blog/7-types-of-gradients-in-graphic-design/
- https://www.designyourway.net/blog/what-is-gradient-in-graphic-design/

**Κατηγοριοποίηση χρώματος & dataviz**
- https://learn.leighcotnoir.com/artspeak/elements-color/hue-value-saturation/
- http://www2.vitanorthamerica.com/products/shade-management/color-theory/understanding-color-overview/hue-value-and-chroma/
- https://www.paletton.com/wiki/index.php/Monochromatic_color_scheme
- https://www.datawrapper.de/blog/which-color-scale-to-use-in-data-vis
- https://www.geeksforgeeks.org/data-visualization/color-palettes-for-data-visualization/
- https://www.tandfonline.com/doi/full/10.1080/10696679.2025.2552272

**Tooling (stops & interpolation)**
- https://www.w3.org/TR/SVG11/pservers.html
- https://developers.figma.com/docs/plugins/api/Paint/
- https://helpx.adobe.com/illustrator/desktop/paint-and-fill/create-and-edit-gradients/gradients-overview.html

**Gradient palettes σε design guides & UI practice**
- https://colorarchive.org/guides/color-gradients-design-guide/
- https://colorarchive.org/guides/gradient-color-palette/
- https://www.linearity.io/blog/gradient-color-palette/
- https://www.zilliondesigns.com/blog/guide-gradients-web-design-color-palettes-trends/
- https://www.media.io/color-palette/gradient-color-palette.html
- https://supercharge.design/blog/gradients-in-ui-design-a-guide
- https://www.designrush.com/agency/graphic-design/trends/gradient-design
- https://blog.logrocket.com/ux-design/hero-section-examples-best-practices/
- https://www.pacgie.com/guides/css-gradient-mistakes
- https://www.landingpageflow.com/post/gradient-design-vs-flat-design-what-looks-better
- https://medium.com/@sagardattatrey/the-secret-science-of-gradients-the-ultimate-guide-to-creating-classy-gradients-in-ui-design-6bd5fc88b807
- https://www.kittl.com/blogs/gradient-design-trend-stl/
- https://blog.hubspot.com/website/gradients-in-design
- https://www.iconikai.com/blog/app-icon-design-trends-2026
- https://www.awesomesauce.in/insights/5-logo-design-trends-reshaping-brands-in-2026

**Brand references**
- https://about.instagram.com/brand/gradient
- http://www.brandgradients.com/stripe-colors/
- https://www.designyourway.net/blog/stripe-logo/

**Color tools (flat-from-gradient swatches)**
- https://colorkit.co/gradient-palette/
- https://coolors.co/gradient-palette
- https://color.adobe.com/create/image-gradient