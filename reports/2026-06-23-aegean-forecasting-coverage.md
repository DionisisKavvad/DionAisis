# Aegean Deck — Forecasting (Μέρος Β): κάλυψη ερωτημάτων άσκησης (Task 2)

**TL;DR:** Και τα 7 ερωτήματα του Task 2 (Forecasting, 40% του project) καλύπτονται από τα slides 12-15. Όμως τα **δύο βαρύτερα (Q6+Q7 = 20%+20% = τα μισά βαθμολογούμενα του Task 2) είναι ενωμένα σε ΕΝΑ slide** — ρίσκο για τη βαθμολογία, γιατί καθένα θέλει να δείξει parameter estimates. Επιπλέον μικρά κενά: ανακρίβεια στο recurrence=year (Q3), χαρακτηριστικά σειράς μόνο προφορικά (Q5), aggregation υπονοούμενο (Q1). Hard requirement εκτός forecasting: λείπουν credentials SAS Viya στο slide 1.

- **Scope:** Μέρος Β (Forecasting), slides 12-15 του `aegean_deck.html`
- **Date:** 2026-06-23
- **Πηγή ερωτημάτων:** `MSc MST - PSBA - Aegean - 2026_WELC_WBS (1).pdf`, Task 2
- **Ομάδα:** The Data Athletes — Q5 ATH→TLV · Q6 DUS→SKG (Germany, 28 Οκτ) · Q7 LCA→SKG (Cyprus, Promotion)

---

## Αντιστοίχιση ερωτήματος → slide → πώς απαντιέται

| Q (βάρος) | Τι ζητά | Slide | Πώς απαντιέται | Κάλυψη |
|---|---|---|---|---|
| Q1 (5%) | Περιγραφή ιεραρχικών δεδομένων: #obs, #σειρές, #σημεία/σειρά, #επίπεδα, #σειρές/επίπεδο, aggregation | 12 «Πώς προβλέπουμε» | 41.799 παρατηρήσεις · 491 χρονοσειρές · 156 εβδ.=3×52/σειρά · 4 επίπεδα (Σύνολο→45 χώρες→131 αεροδρόμια→491 γραμμές) | ✅ πλήρης |
| Q2 (5%) | Έννοια holdout + δικαιολόγηση 39 | 13 «Πόσο να την εμπιστευτείτε» | Holdout 39 = 25%×3×52, concept στο script | ✅ |
| Q3 (10%) | Έννοια events/intervention + 4 pulse events | 13 | Pills: Χριστούγεννα·Πάσχα·25 Μαρτ·28 Οκτ· intervention analysis στο script | ⚠️ μικρό λάθος |
| Q4 (10%) | Drill-down / roll-up (live) | 12 | «Live demo: drill-down/roll-up» + SAS note χτίσιμο hierarchy | ✅ (live) |
| Q5 (10%) | Χαρακτηριστικά σειράς ATH→TLV, μοντέλο, σφάλμα, ερμηνεία 95% interval | 14 «Η πρόβλεψη 2019» | ATH→TLV, Holt-Winters (ESM), MAPE 14%, «19 στις 20 φορές» | ✅ (χαρακτηριστικά μόνο προφορικά) |
| Q6 (20%) | Effect 28ης Οκτ DUS→SKG, ARIMAX, σχόλιο parameter estimates (μοντέλο ίδιο MAPE με PREDECESSOR) | 15 (merged) | DUS→SKG, +45/εβδ, ARIMAX· PREDECESSOR στο SAS note | ⚠️ ρίσκο merge |
| Q7 (20%) | Effect Promotion LCA→SKG, ARIMAX, σχόλιο parameter estimates | 15 (merged) | LCA→SKG, +51/εβδ, promo 92% εβδ. | ⚠️ ρίσκο merge |

Βάρη Task 2: 5+5+10+10+10+20+20 = 80% ρητά βαθμολογούμενα. Q6+Q7 = **40%** = τα μισά.

---

## 🔴 Κρίσιμο — Q6 + Q7 ενωμένα σε ένα slide
- Τα δύο βαρύτερα ερωτήματα (20% το καθένα) ενώθηκαν σε ένα slide για το αφηγηματικό flow (θέμα 7 της κριτικής).
- Για **βαθμολογία** είναι ρίσκο: η εκφώνηση ζητά ρητά να **σχολιαστούν τα parameter estimates** του μοντέλου «με ίδιο MAPE με τον PREDECESSOR», live ΚΑΙ στο pptx. Σε μισό slide με δύο μικρά charts δεν χωράει το estimates table/screenshot.
- **Σύσταση:** για το παραδοτέο, ξανα-χώρισέ τα σε 2 slides (ένα Q6, ένα Q7), καθένα με: chart + parameter estimate + p-value + ερμηνεία + αναφορά PREDECESSOR. Κράτα το «μη ταυτοποιήσιμο» framing. Το flow λύνεται με τον divider, όχι με merge.

---

## ⚠️ Μικρότερα κενά
- **Q3 (ανακρίβεια):** το pill «(pulse, recurrence=year): Χριστούγεννα·Πάσχα·25 Μαρτ·28 Οκτ» υπονοεί recurrence=year και για τα 4. Η εκφώνηση: Χριστούγεννα/Πάσχα = predefined events· **μόνο** 25 Μαρτ & 28 Οκτ με recurrence=year (χειροκίνητες εβδομάδες). Διόρθωση wording σε pill + SAS note slide 13.
- **Q5:** τα «χαρακτηριστικά της σειράς» (εποχικότητα, ανοδική τάση, αιχμές Πάσχα) είναι μόνο στο προφορικό — βάλε 2-3 bullets στο slide 14 (η εκφώνηση ζητά ρητά «describe the characteristics»).
- **Q1:** το «aggregation of time series» (bottom-up) υπονοείται από την ιεραρχία — κάν' το ρητό (μία λέξη/φράση).
- **Q6/Q7:** σιγουρέψου ότι σε live + pptx φαίνεται το parameter estimates table, όχι μόνο +45/+51 & p-value.

---

## Εκτός forecasting — hard requirements άσκησης
- **Slide 1:** πρέπει να περιέχει **usernames/passwords SAS Viya** (Learners account) — το ζητά ρητά η εκφώνηση. Δεν υπάρχει.
- **Executive summary:** μία διαφάνεια, χωρίς technicalities, με problem/approach/methods/tool/results — υπάρχει (slide 2). ✅

---

## Επόμενα βήματα (προτεινόμενα)
1. Ξανα-χώρισμα Q6/Q7 σε 2 slides (αναίρεση merge — σωστό για βαθμολογία).
2. Q3 wording fix (recurrence=year μόνο 25 Μαρτ & 28 Οκτ).
3. Q5 bullets χαρακτηριστικών στο slide 14.
4. Q1 ρητό «aggregation» (bottom-up).
5. Slide 1: προσθήκη SAS Viya credentials.
