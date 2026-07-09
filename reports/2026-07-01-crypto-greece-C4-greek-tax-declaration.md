# C4 — Greek Tax & Declaration Guide for Crypto/Memecoin Gains

**Context:** Greek tax resident, individual retail, self-custody Phantom + Axiom (Solana memecoins), ~$1-3k bankroll, Revolut/Kraken rails. **Date of writing: ~1 July 2026.**

> **THIS IS NOT LEGAL OR TAX ADVICE.** The core Greek crypto tax law is a *draft bill*, not yet enacted, as of this writing. Several load-bearing points (swap taxability, professional-trader line, exact E1 codes) are genuinely unresolved and MUST be confirmed with a licensed Greek λογιστής/φοροτεχνικός once the law is gazetted and AADE issues its implementing circular. A precise question list for that professional is at the end.

---

## 0. The one-paragraph answer

Crypto memecoin trading is **legal** for you as a Greek individual (unlike the Polymarket sibling case, which was blacklisted gambling). The danger is **not legality, it is tax**: (1) whether your *frequent* trading gets reclassified from flat 15% capital gains into **business income (9-44% + EFKA)**, and (2) **unexplained-wealth** exposure (33% + penalty) if euros land in your bank without a documented paper trail. **Default recommendation for a $1-3k hobby scale: declare as an individual on the E1 return, do NOT open μπλοκάκι / route through Innova** (that voluntarily invites EFKA + business treatment). Keep an airtight, exportable record trail from day one. Provision 15% on net EUR-realized gains now, because the pending law is retroactive to 1 Jan 2025 and DAC8 means AADE already sees your fiat flows.

---

## 1. The legal backdrop: legal to trade, but fully visible

| Fact | Status | Confidence |
|---|---|---|
| Crypto spot/memecoin trading legal for a Greek individual | Yes, not gambling, no HGC blacklist | High |
| MiCA regulates the *platform* (Axiom/CASP), not you the self-custody holder | Yes | High |
| Greek residents taxed on **worldwide** income (offshore Axiom/self-custody does NOT exempt you) | Yes (PwC) | High |
| DAC8 / Law 5301/2026 in force, data collection from 1 Jan 2026 | Yes (ΦΕΚ Α' 74/15.05.2026) | High |
| 15% flat crypto capital-gains tax | **NOT yet enacted** — draft bill, expected Parliament ~end July 2026, retroactive to 1 Jan 2025 | Medium |

**Key takeaway:** There is **no private cash-out.** Revolut, Kraken, Coinbase EU all report your identity, linked wallet addresses, and volumes to ΑΑΔΕ. First auto-report lands ~2027 covering full-year 2026. Non-declaration bets against a gap that DAC8 is specifically closing at the fiat rail.

---

## 2. The two declaration paths

### Path A — Individual capital gains (E1) ✅ RECOMMENDED for $1-3k hobby scale
- Declare **net EUR-realized gains** on your personal E1 return, taxed at **15%** (per draft bill).
- No business books, no EFKA, no activity registration.
- Current practitioner convention uses the foreign-securities analogue codes (see §5).
- Filing: calendar-year basis, return due ~30 June the following year.

### Path B — Freelance / business books (μπλοκάκι or via Innova) ❌ AVOID at this scale
- Uses E3 (business results) + **progressive scale 9% → 44%** + **mandatory EFKA** (~€250-650/month = €3,000-7,800/yr) + advance tax (προκαταβολή) + ατομική επιχείρηση registration with a KAD code.
- **At a $1-3k bankroll, EFKA alone exceeds your entire capital.** Opening this path voluntarily triggers the exact outcome the reclassification risk warns against.

**Do NOT preemptively open freelance books.** BUT: if trading is genuinely high-frequency, an accountant may rule the professional line is *already crossed* involuntarily (see §3). Get that ruling before scaling volume.

---

## 3. THE central risk: professional-trader reclassification

This is the sharpest exposure and it is **genuinely unresolved.**

- **The trap:** Art 21 §3 L.4172/2013 — **3 similar transactions within 6 months = "systematic conduct" = business income.** A literal reading catches almost *any* active memecoin trader. Confirmed verbatim against the primary law text and AADE circular E.2031/2023.
- **The counterweight:** For **listed securities**, frequent trading is specifically **carved out** of this rule regardless of frequency (E.2031/2023 excludes Art 42 "titles"). So securities day-traders are NOT mechanically reclassified.
- **The open question:** Does the new crypto bill park crypto in that *securities-style flat-15% bucket* (shielding you), or leave it exposed to Art 21 §3? **No source resolves this.** The bill separately addresses "organized/business exercise" for mining, *implying* trading is meant as capital gains, but it is NOT explicitly stated for high-frequency traders. **This is the single most important question for your accountant.**
- **AADE has published NO bright-line frequency/volume threshold.** It is facts-and-circumstances. (One Greek outlet floated "3 sales in 6 months" for crypto, but that number is NOT in the actual bill text — it's extrapolation from the general doctrine.)

> **Correction flag:** The old "44% bracket starts >€40k" is outdated. For income earned from 1 Jan 2026 the 44% top bracket starts at **€60,000**. EFKA 2026 Category 1 minimum ≈ **€244/month** (not "~€250"), up to ~€650 for higher categories.

**Practical stance:** You cannot realistically keep memecoin trade count under 3-per-6-months. Your defense rests entirely on the securities-analogue framing holding for crypto. Get **written** accountant confirmation before scaling. This is a **tax/cost** risk, not an illegality.

---

## 4. Taxable-event timing: the swap question (huge for memecoins)

Memecoin trading generates **thousands of on-chain swaps.** Whether each is taxable changes everything.

- **The draft bill text says crypto-to-crypto swaps are NOT taxable.** Verified against the actual leaked bill (powergame full-text): *"η ανταλλαγή ενός κρυπτοστοιχείου με άλλο κρυπτοστοιχείο δεν θεωρείται μεταβίβαση"* — a swap is not a transfer; tax is **deferred to the moment of conversion to fiat (EUR) or spending crypto on goods/services.**
- **Practical consequence:** Your taxable base ≈ **total EUR withdrawn − total EUR deposited − fees**, netted, minus the **€500** annual exemption. NOT per-swap P&L.
- **CONFLICT:** Generic tax-software guides (Waltio, Koinly, TokenTax) claim swaps ARE taxable. These describe a **generic EU-default model, not the Greek bill.** Trust the Greek statutory text for a Greek resident, but **verify on enactment** — this leans "swaps excluded" at *medium* confidence, and the professional-trader path (§3) may treat each swap as a realization event anyway.

**Regardless of which way it resolves: keep per-trade EUR-valued logs** so you can compute either way. Do not build a plan that *depends* on swaps being tax-free until the enacted text confirms it.

**Other income types (per draft bill, if it passes as written — mostly N/A for a pure memecoin trader):**
- Staking / crypto-lending / yield / liquidity income → taxed as **interest at 15%**.
- Individual mining → exempt at creation, taxed on later disposal with **zero cost basis**.
- Airdrops → treatment **unverified** (bill's interest expansion does not clearly enumerate them). Flag for accountant.

---

## 5. How to actually file (Path A mechanics)

Current **practitioner convention** (securities analogue — may be renamed once AADE issues the crypto circular):

| Item | E1 code | Table |
|---|---|---|
| Capital **gain** (from transfer of foreign securities), taxed 15% | **865** (866 = spouse column) | Πίν. 4Ε |
| **Loss** carryforward (offset vs future crypto gains, 5 yrs) | **871** | — |
| Amount **spent** buying crypto (feeds πόθεν έσχες) | **743** | Πίν. 5 |
| Disposal **proceeds** (minus costs) | **781** | Πίν. 6 |

- Confirmed across multiple Greek practitioner sources (AFS, Excenta, forin.gr).
- **Caveat:** This is convention by analogy, **not** binding crypto-specific AADE guidance. The bill may introduce dedicated crypto codes/annex. **File only after the AADE implementing decision defines the codes for the relevant tax year**, and have the accountant confirm the exact code.
- €500 annual exemption, fee deductibility, and 5-year loss carryforward: confirm computation with accountant.

---

## 5b. Legacy holdings (pre-existing crypto) & partial disposals

Added 2026-07-06. Scenario: crypto held ~5 years on **Uphold**, moved to Phantom, traded, then cashed out via Crypto.com — possibly only **part** of it. This changes the cost-basis mechanics vs a fresh EUR-in / EUR-out cycle.

**Only ONE taxable event in the whole chain:** the final **crypto → EUR** conversion on the CEX. Everything before is non-taxable: Uphold → Phantom (own wallet → own wallet), the +20% via crypto-to-crypto swaps (deferred per §4), Phantom → Crypto.com (own → own). Do **not** declare the transfers or the swaps.

**Cost basis = ORIGINAL EUR purchase price (5 yrs ago), not the value when it entered Phantom.** The taxable gain spans the *entire* holding period:
```
gain = EUR received  −  original EUR cost of the units sold  −  fees  −  €500 (annual)
tax  = 15% × gain    (Path A, individual, E1)
```
So the gain is NOT the recent +20% — it's the full appreciation from the original 5-year-old purchase to the final sale.

**Partial cash-out → allocate cost basis to ONLY the units sold, not the whole deposit.**
- **Single purchase (one lot):** proportional. Bought €1,000 → 10 units; sell 3 → cost basis €300. Remaining 7 units carry €700 basis and are **not** declared until sold.
- **Multiple purchases at different prices (likely over 5 yrs):** need a **method** to decide which units were sold — **FIFO** (oldest/cheapest first → higher gain → more tax) vs **weighted-average cost** (total EUR ÷ total units × units sold). Lock ONE method and apply it consistently across all disposals; no cherry-picking per sale.
- Unsold units = **no realized gain**, declared only when disposed. €500 exemption is **annual** (once/year), not per-transaction.

**Provenance is what converts a 33% unexplained-wealth hit into a clean 15% capital gain.** Crypto.com DAC8-reports both the EUR-out *and* the incoming SOL from your unhosted Phantom wallet, but AADE cannot see where that crypto originated. Without a documented chain back to the original Uphold purchase, the full inflow risks Art 21 §4 treatment (§6). Required evidence set:
1. **Original EUR** that bought the crypto ~5 yrs ago — Uphold trade confirmations + the bank statement from back then.
2. Uphold → Phantom **tx hash**.
3. Phantom/Axiom trade history (the +20%).
4. Phantom → Crypto.com **tx hash**.
5. Crypto.com → EUR cash-out.

> **⚠️ ACTION — export Uphold history NOW.** Uphold is in MiCAR limbo (application under review, temporary restrictions as of 2026-07-06). If it freezes/closes you lose the single most important record: the original cost basis. Without it you risk 33% on the *entire* proceeds instead of 15% on the gain. Export full transaction + statement history before moving anything.

**Two genuinely unresolved points (see §10 Q13-Q15):** (a) whether pre-1-Jan-2025 appreciation is **grandfathered** or the full 5-year gain is taxed at 15% (bill is retroactive to 1 Jan 2025); (b) which **cost-basis method** (FIFO vs average) the enacted crypto regime mandates. Both materially change the tax owed. Do not assume the favorable reading.

---

## 6. Unexplained-wealth exposure (Art 21 §4) — the tail risk

- Undocumented euro inflows to your bank/Revolut can be reclassified as **προσαύξηση περιουσίας** = taxed at **33%** (+ a separate penalty regime; the "up to 50%" figure is indicative, not a fixed statutory number — confirm).
- **DAC8 means AADE already sees the flows.** If euros land without a documented origin, you are exposed.
- **Defense = airtight, contemporaneous records** linking every fiat inflow to a documented chain: original EUR deposited → CEX buy → on-chain → Axiom/Phantom trades → off-ramp tx hash → EUR out. On-chain history + CEX statements + cost basis are the evidence set. (ΣtΕ 1485/2025 context: courts scrutinize documentation of source *and* timing.)

---

## 7. What ΑΑΔΕ sees (DAC8/CARF) and why consistency matters

- Reportable set: name, DOB, address, TIN, tax residence; per-transaction crypto↔fiat, crypto↔crypto, transfers (incl. to your **unhosted Phantom wallet**), staking/airdrops, EUR fair-market values.
- The report says *"Dionisis sent X SOL to address ABC on date Y"* — not just "had an account."
- **Linkage trap:** Once a KYC'd CEX address is tied to you, chain-analytics clustering can walk the graph to your Phantom wallet and every memecoin trade behind it. Travel Rule (>€1,000) formally verifies you control the Phantom address.
- **Strategy is CONSISTENCY, not concealment.** Reconcile your E1 to what the venue reports *before* filing. Any gap between your return and the CARF file is the single biggest audit trigger.

> **Statute note:** Sources cite both **Law 5193/2025** (MiCA + CARF layer) and **Law 5301/2026** (DAC8 tax-reporting mechanics). Both are real; they are different layers. The EC opened a DAC8 infringement vs Greece in Jan 2026, and 5301/2026 (ΦΕΚ 15 May 2026) completed the transposition. Confirm the operative statute + reporting cadence (one aggregator says "quarterly" but DAC8 is designed as **annual**, first report by ~30 Sep 2027) with your accountant.

---

## 8. Records to keep from day one (mandatory, not optional)

1. Bank/Revolut statement showing the original EUR on-ramp.
2. CEX (Kraken/Coinbase) buy confirmations + SEPA trail.
3. Full Axiom/Phantom on-chain trade history (export monthly; use a Solana-supporting tax tool — Koinly/Waltio).
4. Every off-ramp **tx hash** tracing win-back → withdrawal.
5. A running P&L / cost-basis file, per-trade EUR-valued.
6. The Phantom address(es) you funded, so the audit trail matches DAC8 reporting.

Build this **contemporaneously from day 1 of activity**, not at tax time.

---

## 9. Recommended posture (the not-tax-advice recommendation)

1. **Declare as an individual (E1), 15% on net EUR-realized gains.** Do not open μπλοκάκι/Innova at $1-3k scale.
2. **Provision 15% now** on all 2025-2026 realized gains (law is retroactive to 1 Jan 2025). Treat €500 exemption and swap-non-taxability as *provisional* until enacted text + AADE circular confirm.
3. **Track base as EUR-in vs EUR-out**; keep per-swap logs as backup.
4. **Off-ramp only through MiCA-licensed EU CEXs** (Kraken/Coinbase) that report to AADE — never P2P/private (that manufactures the unexplained-wealth problem).
5. **Book a Greek crypto-experienced accountant BEFORE first cash-out, and again after the bill passes.** Bring §10.
6. **Do NOT assume the most favorable interpretation** on swaps or professional-trader status until the law is gazetted.

---

## 10. QUESTION LIST for a Greek accountant / tax lawyer

1. Has the 15% crypto CGT bill been **enacted/gazetted** yet, and is it retroactive to 1 Jan 2025 for my 2025 **and** 2026 realized gains?
2. For frequent Solana memecoin trading (dozens-hundreds of trades/month), do I get **flat-15% capital gains** (securities analogue), or does **Art 21 §3 (3-in-6-months)** reclassify me as a **business** (9-44% + EFKA)? **Where exactly is the line for crypto?** *(most important)*
3. Under the enacted text, is a **crypto-to-crypto swap** a taxable event, or only conversion to EUR / spending? Do I compute per-trade P&L or **net EUR-out minus EUR-in**?
4. Which exact **E1 (and E3 if business) codes** apply for the relevant tax year — are 865/871/743/781 still valid, or is there a new dedicated crypto annex?
5. What **documentation standard** satisfies AADE to rebut an **Art 21 §4 unexplained-wealth** assessment on memecoin/DEX proceeds hitting Revolut? Is on-chain history + CEX statements + cost basis enough?
6. Given DAC8/L.5301, what is my declaration obligation for **2025 gains that occurred before the law was voted**?
7. At $1-3k, is there **ANY** scenario where the **μπλοκάκι/Innova** path beats the individual path, or does EFKA make it never worth it? Any downside to the pure E1 path?
8. How are the **€500 exemption, fee deductibility, and 5-year loss carryforward** computed on my E1? Does any solidarity contribution apply?
9. If I earn small **staking/airdrop** rewards on Solana, are they 15%-as-interest or progressive-scale, and how are they declared?
10. Do I need to declare crypto **HOLDINGS** (not just gains) anywhere (πόθεν έσχες / asset statement), or only realized gains?
11. Does using an **unlicensed offshore terminal (Axiom)** create any reporting/disclosure obligation for me as an individual, or is it purely the platform's MiCA problem?
12. Does **staging withdrawals into tranches** over days risk a "structuring" concern, or is genuine consolidation fine if documented?
13. **[legacy holdings]** For crypto **acquired ~5 years ago** (pre-dating the CGT bill) and sold now: is the appreciation that accrued **before 1 Jan 2025 grandfathered/exempt**, or is the **full gain** (original cost → today) taxed at 15%? What acquisition-date / cost-basis documentation does AADE require to substantiate it? *(most important for legacy holdings)*
14. **[cost-basis method]** On a **partial disposal** where units were bought at different prices over time, which method applies — **FIFO** or **weighted-average cost**? Is it mandated by the bill or my choice, and must it stay consistent across years?
15. **[non-MiCA source platform]** The legacy crypto sits on **Uphold** (currently NOT MiCA-authorized, no clean AADE reporting). Does buying/holding on a non-reporting platform years ago create any extra disclosure obligation, and is my exported Uphold history sufficient proof of original cost + ownership to rebut an Art 21 §4 assessment when the euros land?

---

## 11. Labeled list of UNRESOLVED points (as of 1 July 2026)

- 🔴 **[UNRESOLVED — pivotal]** Whether the enacted crypto regime **shields high-frequency traders** inside flat-15% CGT, or Art 21 §3 reclassifies memecoin day-trading as business. AADE has issued **no numeric criteria.** *(Confidence: low)*
- 🟠 **[CONFLICTING — verify on enactment]** Crypto-to-crypto **swap taxability**. Draft bill text says NOT taxable (tax on fiat conversion only); generic vendor guides say taxable. Leans "not taxable" but must be confirmed against gazetted law + AADE circular. *(Medium)*
- 🟠 **[NOT YET LAW]** The **15% CGT bill itself** — draft, expected ~end July 2026, retroactivity to 1 Jan 2025 not yet confirmed to survive Parliament. *(Medium)*
- 🟡 **[CONVENTION, not binding]** E1 codes 865/871/743/781 — practitioner convention; may be replaced by a dedicated crypto annex. *(Medium)*
- 🟡 **[UNVERIFIED]** Airdrop treatment (interest 15% vs capital vs ordinary income) — not clearly enumerated in the bill.
- 🟡 **[NEEDS CONFIRMATION]** Operative DAC8 statute (5193/2025 vs 5301/2026), reporting cadence (annual vs the single "quarterly" claim), and the exact "up to 50%" unexplained-wealth penalty figure.
- 🔴 **[UNRESOLVED — material for legacy holdings]** Whether **pre-1-Jan-2025 appreciation** on crypto held for years is **grandfathered** or the full gain is taxed at 15% (bill retroactive to 1 Jan 2025). No source resolves it. *(Confidence: low)*
- 🟠 **[UNRESOLVED]** **Cost-basis method** for partial disposals of multi-lot holdings — **FIFO vs weighted-average**. Not specified in available bill text; confirm on enactment. *(Low-medium)*

---

## 12. Contrast with the Polymarket sibling (why this is far greener)

| | Polymarket | Crypto memecoin trading |
|---|---|---|
| Legality of the activity | Unlicensed gambling, HGC blacklist, player liability → **CAUTION/NO-GO** | Legal investment/property activity → **GO** |
| Where risk sits | Participation-illegality + payment-blocking of winnings | **TAX classification + AML off-ramp friction** (not legality) |
| Declarable path? | Grey/blocked; winnings treated as illegal-source | **Yes** — explicit (pending) 15% CGT + defined E1 codes |
| Unique-to-crypto trap | — | Frequent trading → **business reclassification (EFKA)** |
| Off-ramp | Winnings can be outright blocked | Legal euros, just need **documentation** to clear AML |
| Both share | — | DAC8 auto-reporting to AADE (no quiet cash-out); source-of-funds choke point at the bank |

**Verdict shape:** Polymarket = CAUTION-leaning-NO-GO (real legality deal-breaker). Crypto = **LEGAL/GO on legality; the caveats live entirely in tax compliance and off-ramp AML, not in whether you're allowed to do it.** No tax deal-breaker for a $1-3k individual — worst realistic outcomes (reclassification, unexplained-wealth) are manageable with clean records and a professional ruling before scaling.

---

*Sources (key): powergame.gr full-bill exclusive; newsit.gr; Global Legal Insights Greece 2026; Law 5301/2026 (ΦΕΚ Α' 74/15.05.2026); AADE E.2031/2023; L.4172/2013 Art 21 §3/§4; PwC Greece worldwide-income; AFS/Excenta/forin.gr (E1 codes); EC DAC8 page; Waltio/Koinly/TokenTax (generic guides, flagged where they conflict with the Greek bill). Full URLs in the verified research digest. NOT legal or tax advice — route all flagged items to a licensed Greek professional.*