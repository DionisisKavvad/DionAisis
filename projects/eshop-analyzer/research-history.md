# eshop-analyzer — Research History & Artifact Index

**Σκοπός:** ενιαίο index όλης της έρευνας/artifacts ώστε να κάνουμε **resume** ανά πάσα στιγμή. Χρονολογικά, θεματικά ομαδοποιημένο. Τα artifacts είναι στο claude.ai (fetchable με WebFetch), τα reports στο repo `reports/`.

> **Πού είμαστε τώρα (2026-07-08):** Ξεκίνησε το **modularize** του analyzer (μονόλιθος → sub-agents ανά άξονα). Τελευταίο ολοκληρωμένο κομμάτι: **audience module — ad image visual analysis** (reach-weighted contact sheet). Report: `reports/2026-07-07-audience-ad-image-visual-analysis.md`.

---

## Φάση 0 — Brand color extraction (Απρ + Ιούλ 1-2)
Το πρώτο μεγάλο πρόβλημα: αξιόπιστη εξαγωγή brand colors.

- `reports/2026-04-06-ai-extraction-analysis.md` — αρχική ανάλυση AI extraction
- `reports/2026-04-07-brand-color-extraction-research.md` — έρευνα brand color extraction
- `reports/2026-07-01-colorthief-vs-hybrid-vs-llm-only.md` — ColorThief vs hybrid vs LLM-only-visual (→ pending A/B, βλ. memory)
- `reports/2026-07-02-colorthief-dominant-artifact-investigation.html` — ColorThief dominantColors artifact investigation
- `reports/2026-07-02-colorthief-fix-before-after.html` — **ColorThief fix, πριν/μετά ανά store με εικόνες**
- Απόφαση: prioritize ColorThief output over visual re-estimation for dominantColors (commit 7fde7ae)

## Φάση 1 — Validation 10 stores (Ιούλ 2)
- `reports/2026-07-02-final-validation-all10.html` — **Final Validation, όλα τα 10 stores** (+ batch1/batch2)
- `reports/2026-07-02-recommendation-explained.html` — recommendation logic explained
- `reports/plaisio-analysis.html` — sample analysis (Plaisio)

## Φάση 2 — primaryIndustry taxonomy redesign (Ιούλ 3)
Αφορμή: το ergalia.gr (εργαλεία) ταξινομήθηκε ως "Office Supplies" — κλειστό 15-value enum χωρίς Tools/Hardware.
- 🔗 [primaryIndustry Taxonomy Research](https://claude.ai/code/artifact/58f1f6bd-9c30-407b-b1b1-ca67f1509c0e) — 5 άξονες, 24 πηγές, adversarial verify → πρόταση **15 ad-hoc → 18/19 MECE + Other**, mapped σε Google taxonomy
- Απόφαση υλοποιήθηκε: commit e233f3b (15 → 18 MECE + Other)

## Φάση 3 — pricePositioning + positioningStatement (Ιούλ 2-3)
Rename `tier` → `pricePositioning`, νέο `positioningStatement`, κανόνας "brands ≠ audience ≠ τιμή".
- 🔗 [Δοκιμή positioningStatement — απλά](https://claude.ai/code/artifact/157d1a9b-54e1-4f62-b69b-6da3ec1682bc) — test σε 10 stores· χρήσιμο κυρίως όταν "κάτι δεν κολλάει" (Beautycom, Pet Shop 88 = masstige)
- 🔗 [Νέα πεδία — live έλεγχος σε 3 μαγαζιά](https://claude.ai/code/artifact/3d698970-9e73-4409-bd0b-df7c9037b74f) — live run: taxonomy fix + rename + νέα πεδία, evidence-gated
- Απόφαση υλοποιήθηκε: commit a32b5c3 (pricePositioning + positioningStatement + reasoning + roster guardrail)

## Φάση 4 — Positioning/price θεωρία (βιβλιογραφία)
Deep-research πάνω στη θεωρία marketing, για να στηριχθεί το schema.
- 🔗 [Τιμή vs Ύφος — τι λέει η βιβλιογραφία](https://claude.ai/code/artifact/f5b9026a-1cfa-405a-9000-58cff62305d4) — price-tier vs brand personality = 2 διακριτοί αλλά σχετιζόμενοι άξονες (Zeithaml, Aaker, Kapferer, masstige)
- 🔗 [Τι είναι «positioning» — τι λέει η βιβλιογραφία](https://claude.ai/code/artifact/0da6b4e4-31f2-43e0-9327-24971c0fe372) — positioning ⊂ branding· STP· 6 bases· creative-brief must-haves (audience, single message, RTB, competitive frame)
- 🔗 [Τι καθορίζει θεωρητικά το price positioning](https://claude.ai/code/artifact/309b06da-f55c-4e7c-9cb2-99b8ddc5c1b7) — 2-axis μοντέλο (τιμή × ποιότητα/κύρος)· premium ≠ luxury· τι σήμα παίρνουμε ανά πηγή. Report: `reports/2026-07-07-price-positioning-theory.html`

## Φάση 5 — Brand component tree: Phase A → B → impl (Ιούλ 6)
Πλήρης κύκλος: θεωρία → απόφαση αξόνων → κώδικας → validation.
- 🔗 [Phase A — Τι είναι το brand & πού κάθεται το positioning](https://claude.ai/code/artifact/1bcc9c36-8104-4739-9204-27f66615f34a) — 4 frameworks (identity/image/equity/positioning)· pricePositioning = 1 άξονας. Report: `reports/2026-07-06-brand-component-tree-phaseA.html` + `2026-07-06-brand-positioning-research-analysis.html`
- 🔗 [Phase B — Ποιοι άξονες μπαίνουν στον analyzer](https://claude.ai/code/artifact/2038d36a-9f72-4488-9d7a-34d4733f4579) — φιλτράρισμα 12 αξόνων (keep 7 / add 2 / defer 2 / drop 3). Add: `brandVoice`, `behavioralSignals`. Report: `reports/2026-07-06-brand-phaseB-decision.html`
- 🔗 [Συνολικό review — Phase A → B → impl](https://claude.ai/code/artifact/1dd3f077-d0cf-4a73-be1b-48b310e54404) — 2 νέα fields, 4 stores, 0 false positives, evidence-gated (8→5 behavioral values, brandVoice null-bias). Report: `reports/2026-07-06-brand-phaseB-review.html`

## Φάση 6 — Multi-source data (products / ads / posts) (Ιούλ 6-7)
Το pipeline παίρνει πλέον marketplace products + FB ads + FB posts. Ξανα-κρίση αξόνων.
- 🔗 [Επιπλέον πηγές δεδομένων — έρευνα](https://claude.ai/code/artifact/507ad415-c7b3-4860-9bec-aa25e41c90f5) — 3 πηγές × 2 πεδία. **Ads = STRONG για price ΚΑΙ characteristics** (μόνη πηγή για ENERGY/video)· προτεραιότητα Website → Products → **Ads** → Posts
- 🔗 [Phase B v2 — multisource re-filter](https://claude.ai/code/artifact/433d36f7-5e35-47e0-9d40-fe91fdbb1769) — **targetAudience γίνεται deterministic** από Meta reach (ads)· 2 τίμιες κοπές (competitor price, marketplace rating = δεν υπάρχουν)· νέο πρόβλημα: cross-source reconciliation
- 🔗 [Product Scraping — Validation](https://claude.ai/code/artifact/c17ca098-837b-44ee-9836-0df64e82fa2b) — κανόνες scraping skroutz/bestprice (max 15/store, recommended + top-2 categories, DOM order)
- 🔗 [Validation: Skroutz & BestPrice ως πηγές pricePositioning](https://claude.ai/code/artifact/3a6fa93f-44e7-4786-bcce-d29847f99f3c) — adversarial (16 agents). Skroutz sort = JS-gated (πέφτει)· BestPrice histogram = conditional· coverage 5/10· floor/ceiling = product-format outliers, μόνο κεντρική μάζα φέρει σήμα

## Φάση 7 — Modularize (Ιούλ 7-8) — ΤΡΕΧΟΝ
Σπάσιμο του μονόλιθου σε sub-agents ανά άξονα.
- 🔗 [Module dependency tree](https://claude.ai/code/artifact/12fb9fd1-e3fa-40a0-b623-7668c3426a61) — **A extractors / B leaf judges / C synthesizers / F aggregate**, 5 waves, critical path. Updated (2026-07-08): audience+character τροφοδοτούνται πλέον ad-creative visual
- 🔗 [Audience — ad creatives ως reach-weighted contact sheet](https://claude.ai/code/artifact/3703d09d-051f-476a-9b10-1a412a9599c3) — reach-weighted 3×3 contact sheet από ad creatives (campaign-dedup by ad-copy + strict 16×16 aHash net), με τα πραγματικά mood boards + 4-store validation + πλήρες mamasaid input + πώς υπολογίζεται το reach breakdown. Report: `reports/2026-07-07-audience-ad-image-visual-analysis.md`. POC script: scratchpad `contact-sheet.mjs`
- 🔗 [Character — ad creative sheet ως πηγή ύφους](https://claude.ai/code/artifact/66fb0dec-b307-4dc7-a593-899e3084679b) — 26 adjectives σε 4 άξονες (gestalt)· το ad sheet προσθέτει τον άξονα Energy που το site υποτιμά (mamasaid Playful vs motoracing High-Tech, από το sheet μόνο)· κίνδυνος: promo energy ≠ πυρήνας ταυτότητας· mamasaid παράδειγμα 3 πηγών. Report: `reports/2026-07-08-character-module-validation.md`
- 🔗 [Behavioral signals — γιατί regex flags, snippet αντί boolean](https://claude.ai/code/artifact/e9a81b13-4b37-45ca-bf51-03dae821bc86) — validation σε 6 stores: επιπλέον πηγές (categories/ads/posts) ξεκλειδώνουν αληθινά σήματα αλλά το boolean γεμίζει false fires → πρόταση `behavioralEvidence` snippets αντί booleans· occasion = «πουλάω για περίσταση» ≠ «εύχομαι γιορτές» (μετρημένο). Report: `reports/2026-07-08-behavioral-signals-validation.md`. Script: scratchpad `behavioral-validate.mjs`

---

## Ανοιχτά / εκκρεμότητες
- **Modularize:** υλοποίηση των modules ως πραγματικά sub-agents (το tree είναι σχέδιο). Επόμενο module υπό συζήτηση: `adCreativeSheet` extractor (Wave 0) → feeds audience + character
- **Deferred (θέλουν δεδομένα ανταγωνιστών):** POP/POD competitive frame, perceptual axes πέρα από τιμή
- **Pending A/B:** dominantColors hybrid vs LLM-only-visual (βλ. memory `pending-ab-dominant-colors`)
- **Posts images:** δεν υπάρχουν στο data shape (μόνο text/video metrics) — out of scope μέχρι αλλαγή scraping
- **Competitor price / marketplace rating:** δεν υπάρχουν στα δεδομένα → price μένει absolute, social proof μόνο FB engagement
