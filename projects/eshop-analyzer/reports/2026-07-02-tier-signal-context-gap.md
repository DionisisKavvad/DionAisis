# Προβληματισμός: το LLM δεν έχει αρκετό context για tier/distribution signals

**Status:** ανοιχτό ερώτημα, όχι απόφαση — δεν έχει υλοποιηθεί τίποτα ακόμα.

## Το πρόβλημα

Μετά τη [βιβλιογραφική έρευνα για tier vs brand-style](../../../eshop-analyzer/reports/2026-07-02-tier-vs-style-research.html — artifact, βλ. session) καταλήξαμε ότι το `tier` (budget/mainstream/premium/luxury) πρέπει να κρίνεται από τη **δική του στρατηγική positioning** του retailer (τιμολόγηση, distribution, κανάλι) — όχι από το ποια brands στοκάρει (masstige pattern: π.χ. Beautycom πουλάει Dior/YSL/Lancôme αλλά είναι mainstream retailer).

Πρόβλημα: ελέγξαμε τι context έχει σήμερα διαθέσιμο το LLM (`store-analysis-system.md`) και είναι πολύ αδύναμο για αυτή τη κρίση:
- Ο agent επισκέπτεται **μόνο την αρχική σελίδα** (καμία σελίδα προϊόντος/κατηγορίας)
- Μοναδικό distribution signal: `hasPhysical` boolean (regex σε "καταστήματα"/store-locator) — όχι πόσα καταστήματα, τι τύπος
- Καμία δομημένη εξαγωγή τιμών — ό,τι τιμή βλέπει το LLM είναι τυχαία, μόνο αν έτυχε να είναι ορατή σε screenshot προϊόντων στην αρχική
- `≤7 Bash commands` constraint (για ταχύτητα/κόστος) περιορίζει το πόσα νέα steps μπορούμε να προσθέσουμε

## Ιδέα προς εξέταση: Facebook posts / FB ads ως επιπλέον context

Ο χρήστης πρότεινε να δούμε αν αξίζει να προσθέσουμε **FB posts + FB ads** του καταστήματος ως πηγή context — ακριβώς η ίδια ιδέα υπάρχει ήδη τεκμηριωμένη στο παλιότερο doc `docs/brand-characteristics-source-mapping.md` (commit `31e2bc7`, 4 Ιουνίου) που σχεδίασε το 26-tag characteristics σύστημα:

| Source | Coverage (πραγματικά ελληνικά eshops) | Τι αντιπροσωπεύει |
|---|---|---|
| 🌐 Website | ~100% | το brand που **θέλει** να είναι (canonical design) |
| 📦 Products | ~80% | η **ουσία & tier** (τιμή, υλικά) |
| 📱 FB posts | ~40% | η **πραγματική φωνή** (off-script, όχι μόνο ό,τι θέλει να δείξει) |
| 📢 FB ads | ~25% | τι **όντως converts** (paid, proven — δείχνει τι στρατηγική ακολουθεί ενεργά, π.χ. discount-heavy vs prestige-framing) |

Το ίδιο doc προτείνει σειρά υλοποίησης **Website → Products → Posts → Ads**, και ρητό κανόνα: πρόσθεσε νέα πηγή μόνο όταν αποδειχθεί ότι (α) υπάρχει σε >50% των eshops και (β) αλλάζει το tag assignment προς το καλύτερο. Με coverage 40%/25%, τα FB posts/ads δεν πληρούν ακόμα το (α) — αυτός είναι ο λόγος που δεν έχουν υλοποιηθεί ποτέ.

**Γιατί θα βοηθούσαν συγκεκριμένα στο tier:** τα FB ads ειδικά θα έδειχναν *πραγματική* στρατηγική go-to-market (πόσο discount-driven vs prestige-framing είναι το messaging) — ακριβώς το distribution/positioning σήμα που λείπει σήμερα. Πιο άμεσο σήμα από το να μαντεύει το LLM από μια screenshot της αρχικής.

## Επόμενα βήματα (όχι αποφασισμένα)

- Αν προχωρήσουμε ΜΟΝΟ στη φτηνή λύση (καλύτερη prompt διατύπωση με τα υπάρχοντα σήματα) → καμία εξάρτηση από FB data
- Αν θέλουμε το FB posts/ads context σοβαρά → χρειάζεται ξεχωριστό scoping (Facebook Graph API access, coverage validation στα δικά μας πραγματικά stores πριν το χτίσουμε, νέο pipeline stage — μεγαλύτερο feature, όχι quick prompt tweak)
- Σχετικά με το `tierReasoning` field: παραμένει ανεξάρτητη, χαμηλού ρίσκου σύσταση που αξίζει να προχωρήσει independent από αυτό το ερώτημα
