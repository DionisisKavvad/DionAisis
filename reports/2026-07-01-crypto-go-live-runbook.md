# Crypto Go-Live Runbook (Ελλάδα) — Deposit / Withdraw setup

**Τι είναι:** το πρακτικό checklist που τρέχουμε **μαζί** όταν πεις. Δεν κινώ κεφάλαια μόνος μου — εσύ στο πληκτρολόγιο, εγώ σε καθοδηγώ βήμα-βήμα (και μπορώ να οδηγήσω τον browser live αν θες).
**Βάση:** reports C2 (deposit) + C3 (withdrawal) + CEX comparison (Kraken/Uphold/Crypto.com). Ισχύει: Solana, self-custody Phantom + Axiom, Revolut/Crypto.com, $1-3k.

> **CEX pick (re-verified 2026-07-06):** **Crypto.com** (Foris DAX MT, Malta MFSA CASP, MiCA-compliant, καλύπτει Ελλάδα). **Uphold αποκλείεται** — MiCAR ακόμα "under active review" + temporary restrictions (fails MiCA). Kraken = backup rail αν η Crypto.com μπλοκάρει.
> **Caveat Crypto.com:** documented Jan 2026 case (Γερμανία) freeze **αμέσως μετά από self-custody wallet interaction** — ακριβώς το δικό μας pattern. Γι' αυτό **test cycle με μικρά ποσά πριν βάλεις όγκο** (§Φάση 0).

---

## Φάση 0 — Προαπαιτούμενα (πριν κινηθεί ευρώ)
- [ ] **KYC / Re-KYC στο Crypto.com** ολοκληρωμένο (έχεις ήδη account· περίμενε re-verification, budget λίγες εργάσιμες). Κάν' το τώρα που είσαι ήρεμος, όχι τη στιγμή που θες ανάληψη.
- [ ] **Test cycle Crypto.com (ΚΡΙΣΙΜΟ, λόγω self-custody freeze case):** μικρό SOL από Phantom → Crypto.com → πίσω στο Phantom, **και** μικρό SEPA withdrawal σε τράπεζα/Revolut. Αν κάτι παγώσει/κολλήσει >3-5 εργάσιμες → σταμάτα, άνοιξε **Kraken** ως fallback.
- [ ] Επιβεβαίωσε in-app ότι **SOL + USDC-on-Solana** υποστηρίζονται για deposit/withdraw στο account σου (το USDC-on-Solana δεν ήταν independently confirmed).
- [ ] Στο **Revolut**: έλεγξε αν υπάρχει «Send / Transfer to external wallet» για **SOL** στον λογαριασμό σου (feature-gating ανά χώρα). Αν λείπει → πάμε μέσω Crypto.com.
- [ ] **Phantom**: σημείωσε τη Solana receive address σου. Κράτα το seed phrase **offline** (backup).
- [ ] Άνοιξε αρχείο **trade-log / cost-basis** (θα το γεμίζεις από day 1). Μπορώ να σου το φτιάξω template.
- [ ] Διάβασε το C3 §Part 3 (pre-withdrawal checklist) μία φορά.

## Φάση 1 — Deposit (money IN) — φθηνή διαδρομή
1. Revolut → κράτα **EUR**.
2. **SEPA** EUR → Crypto.com (δωρεάν, ~1 εργάσιμη· Instant SEPA διαθέσιμο).
3. Crypto.com → **buy SOL**. *(USDC μόνο αν θες stable buffer· κράτα SOL για gas.)*
4. Crypto.com → Withdraw → **SOL** → δίκτυο **SOLANA** → paste Phantom address.
5. **TEST πρώτα:** στείλε ~$10-20 να δεις ότι φτάνει, πριν το πλήρες ποσό.
6. Επιβεβαίωσε 6 πρώτα/τελευταία chars της διεύθυνσης. Ποτέ λάθος δίκτυο.

## Φάση 2 — Trade (Axiom)
- Κράτα λίγο **SOL για gas** πάντα. Εφάρμοσε το σύστημα D3 (exit ladder, sizing, NO-gate).
- **Ασφάλεια (D5):** ξεχωριστό/burner wallet, backup seed, πρόσεχε approvals.

## Φάση 3 — Withdraw (money OUT) — ΤΟ ΚΡΙΣΙΜΟ (C3)
1. Στο Phantom/Axiom: **consolidate** τα κέρδη σε **καθαρό USDC ή SOL** (όχι απευθείας proceeds από scam token).
2. Στείλε σε **Solana** στη διεύθυνση κατάθεσης του **Crypto.com**.
3. **TEST** μικρό ποσό πρώτα.
4. Crypto.com → πούλα σε **EUR**.
5. **SEPA** → Revolut/τράπεζα. Το Revolut ως **τελικός προορισμός**, όχι πρώτη πόρτα ελέγχου.
6. **Tranches:** μερικές εκατοντάδες ως ~1k EUR τη φορά, όχι lump μετά από win.
7. Κράτα **tx hashes + provenance** (για source-of-funds αν σε ρωτήσουν).

## Χρυσοί κανόνες (μη τα σπάσεις)
- ❌ **Ποτέ VPN.**
- ❌ Ποτέ «quarantine/burner για να κρύψεις προέλευση» (χειροτερεύει το AML).
- ✅ **Records από day 1** (η ΑΑΔΕ βλέπει τα fiat legs — δήλωσε consistently).
- ✅ **Λογιστής πριν το πρώτο cash-out** (στείλε το accountant brief).
- ✅ Μέγεθος = χρήματα που αντέχεις να χάσεις (τα memecoins είναι ~98% αποτυχία).

---

## Όταν πεις «πάμε»
Λέγε μου σε ποια φάση είσαι και το τρέχουμε live βήμα-βήμα. Μπορώ να:
- σου φτιάξω το **trade-log/cost-basis template** τώρα,
- σε καθοδηγήσω στο **Crypto.com Re-KYC + πρώτο test transfer**,
- τσεκάρω μαζί σου το **Revolut Solana toggle**.
