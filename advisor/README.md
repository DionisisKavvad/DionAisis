# advisor/

Χώρος κατάστασης για τον `advisor` skill και τον `advisor-reviewer` agent.

Όλα τα αρχεία εδώ δημιουργούνται/ενημερώνονται αυτόματα από τα skills/agents όταν τρέχουν. Μπορείς να τα διαβάζεις/επεξεργάζεσαι χειροκίνητα αν θες, αλλά γενικά είναι tool-managed state.

## Τι είναι τι

### `thesis.md`
Η τρέχουσα διατύπωση του στόχου/κατεύθυνσης που προσπαθείς να ξεκαθαρίσεις. Έχει `**Version:** vN` στην κορυφή. Κάθε φορά που αλλάζει ουσιαστικά, bump version. Το topic ορίζεται στην πρώτη session και παραμένει σταθερό μέχρι να αρχειοθετηθεί ρητά.

### `open-questions.md`
Ερωτήματα που άνοιξαν στις sessions και περιμένουν απάντηση. Κάθε entry έχει date opened. Αυτά τροφοδοτούν τις επόμενες sessions.

### `assumptions.md`
Σιωπηρές υποθέσεις που εντοπίστηκαν. Τέσσερις ενότητες:
- **Verified** παρατηρήσιμες από τα context files
- **Validated** τις επιβεβαίωσες ρητά
- **Invalidated** τις απέρριψες όταν σε ρώτησε
- **Pending** εντοπίστηκαν αλλά δεν τις έχει ρωτήσει

### `fears.md`
Τι αποφεύγεις να ψάξεις και γιατί. Το core της αντι-displacement λογικής του συστήματος. Ο advisor καταγράφει εδώ όταν παρατηρεί σιωπηρή αποφυγή, ακόμα κι αν δεν το παραδέχεσαι ευθέως στη συζήτηση.

### `commitments.md`
Δεσμεύσεις που προκύπτουν μέσα από τις sessions. Fields: description, dated, deadline (αν υπάρχει), status (open/done/dropped). Στο αρχικό setup μπορεί να είναι κενό.

### `sessions/YYYY-MM-DD-N.md`
Summary κάθε session. Τι άλλαξε στο thesis, ποια layers αγγίχτηκαν, τι ερωτήσεις άνοιξαν, προτεινόμενη κατεύθυνση επόμενης session.

### `reviews/YYYY-MM-DD.md`
Drift reports από τον `advisor-reviewer` agent. Γράφονται από τον parent agent όταν τρέχεις `/advisor-review`.

### `archives/` (μπορεί να μην υπάρχει)
Όταν ξεκινάς νέο topic (π.χ. κλειδώνεις τον στόχο για την εταιρεία και μετά θες να κάνεις setup για career direction), το παλιό thesis.md και τα συναφή files αρχειοθετούνται εδώ με prefix `YYYY-MM-DD-`.

## Flow

1. Τρέχεις `/advisor` → setup sessions → thesis κλειδώνει
2. Τρέχεις `/advisor-review` καθημερινά → report στο `reviews/`
3. Αν review εντοπίσει drift, τρέχεις `/advisor` σε consultation mode → επικαιροποίηση thesis/commitments
4. Επανάληψη 2-3 όσο χρειάζεται
