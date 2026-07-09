# targetAudience — το `demographics` καταργήθηκε

**TL;DR:** Το ελεύθερο πεδίο `demographics` έβαζε μετρημένα και εικασίες στην ίδια πρόταση. Καταργήθηκε. Μένει `demographic: { gender, ageGroup }`, μόνο ό,τι μετριέται από το reach breakdown. Οτιδήποτε άλλο πάει σε `interests` / `lifestyle`, που είναι ρητά σημασμένα ως εντύπωση.

## Το πρόβλημα

Το output του mamasaid ήταν:

```
demographics: "γυναίκες 25-44, μητέρες & έγκυες, mainstream value-seeking"
```

| κομμάτι | τι είναι |
|---|---|
| γυναίκες 25-44 | μετρημένο — **και ήδη υπήρχε** στα `gender` / `ageGroup` |
| μητέρες & έγκυες | εικασία από τον κατάλογο προϊόντων |
| mainstream value-seeking | κίνητρο, εντύπωση |

Δηλαδή το πεδίο επαναλάμβανε τα δύο σκληρά πεδία και τους κολλούσε από πάνω εικασίες, σε ελεύθερο κείμενο. Ο αναγνώστης δεν μπορούσε να ξεχωρίσει ποιο ήταν ποιο.

## Το επιχείρημα που έκρινε

**Το «demographic» προϋποθέτει μέτρηση, όχι ταξινόμηση.** Όταν η Meta ή η Google λένε «parental status: demographic», το λένε επειδή **το ξέρουν** από δεδομένα λογαριασμού. Εμείς έχουμε ένα μόνο μετρημένο σήμα: το reach breakdown (age × gender × country). Αν γράψουμε «μητέρες» στο `demographics`, δανειζόμαστε αξιοπιστία που δεν κερδίσαμε.

Το κέρδος της αλλαγής δεν είναι ακρίβεια, είναι **ειλικρίνεια της ετικέτας**. Το «μαμάδες» δεν γίνεται πιο αληθινό επειδή μετακόμισε στα interests. Απλώς σταματά να παριστάνει ότι μετρήθηκε.

## Τι άλλαξε

**`src/utils/store-analysis.js`** — νέο σχήμα:

```js
targetAudience: {
  demographic: { gender: [...], ageGroup: [...] },  // ΜΟΝΟ μετρημένα
  country, interests, lifestyle, behavioralSignals
}
```

**`src/workflow/prompts/store-analysis-system.md`** — ρητή απαγόρευση:
- κανένα free-text persona στο `demographic`
- `interests` = **θέματα** (`μητρότητα`, `βρεφικός ύπνος`), ποτέ ετικέτες κοινού («για μαμάδες»)

**`README.md`** + **audience module map artifact** ενημερώθηκαν.

Δεν έσπασε τίποτα κατάντη: τα modules που θα διάβαζαν το `demographics` (`positioningStatement`, `storeDescription`, `creativeTaglines`) **δεν έχουν υλοποιηθεί ακόμα**.

## Διόρθωση προηγούμενου ισχυρισμού (δικό μου λάθος)

Είχα γράψει στο §2 του artifact ότι, κατά **Wells & Gubar (1966)**, το «έγκυος» και το «νέα μαμά» ανήκουν ρητά στη demographic base ως στάδιο οικογενειακού κύκλου. **Το επαλήθευσα και δεν στέκει.**

Τα 8 στάδια είναι: *bachelor · newly married · full nest I (μικρότερο παιδί <6) · full nest II · full nest III · empty nest I/II · solitary survivor I/II*.

- Η **εγκυμοσύνη δεν είναι στάδιο.** Το μοντέλο πάει από «παντρεμένοι χωρίς παιδιά» κατευθείαν σε «παιδί κάτω των 6».
- Η **«μητέρα» δεν είναι ιδιότητα ατόμου** εκεί. Το στάδιο ορίζεται από **νοικοκυριό**: οικογενειακή κατάσταση + ηλικία μικρότερου παιδιού.

Επίσης λάθος ήταν και η εικασία μου ότι «οι πλατφόρμες αντιμετωπίζουν την εγκυμοσύνη ως life event». Επαληθευμένα:

- **Meta life events:** newly engaged, newly married, new job, recently moved, anniversary. **Καμία εγκυμοσύνη.**
- **Google life events:** graduation, marriage, moving, retirement, business creation. **Καμία εγκυμοσύνη.**
- Τον **Ιαν. 2022** η Meta αφαίρεσε χιλιάδες targeting options ευαίσθητων θεμάτων (υγεία, εθνότητα, θρησκεία, πολιτική, σεξ. προσανατολισμός). Η εγκυμοσύνη πέφτει στα health-related.
- **Parental status**: και οι δύο πλατφόρμες το βάζουν στα **demographics** — γιατί το μετρούν.

Δηλαδή το «έγκυες» δεν είναι απλώς αστήρικτο στα δικά μας δεδομένα: είναι κατηγορία που η ίδια η Meta θεωρεί **ευαίσθητο δεδομένο υγείας** και αρνείται να εκθέσει. Εμείς θα το συνάγαμε από αγοραστική συμπεριφορά.

## Πηγές

- Wells & Gubar, *Life Cycle Concept in Marketing Research*, JMR III (Nov 1966), 355-363 — https://journals.sagepub.com/doi/10.1177/002224376600300403
- Meta, *Preparing for Upcoming Removal of Certain Ad Targeting Options* — https://www.facebook.com/government-nonprofits/blog/preparing-for-upcoming-removal-of-certain-ad-targeting-options
- Search Engine Land, *Meta will remove targeting options for sensitive topics on January 19* — https://searchengineland.com/meta-will-remove-targeting-options-for-sensitive-topics-on-january-19-378095
- Cypress North, *Life Events & Detailed Demographics in Google Ads* — https://cypressnorth.com/paid-search-marketing/live-events-detailed-demographics-two-little-known-google-ads-audience-options/
