# L4 — Greek Tax & Declaration Guide: Polymarket Winnings

**Who this is for:** Dionisis, Greek tax resident, individual retail user, ~$1–3k hobby bankroll, funding/withdrawing via Revolut + an EU CEX.
**Verified as of:** 1 July 2026 (the MiCA transitional cliff).
**Status of this document:** NOT legal or tax advice. It organizes verified research into a defensible working position and, critically, into a precise question list for a licensed Greek accountant/tax lawyer. Every classification call below is flagged as an accountant decision, not a settled procedure.

---

## 1. The one-paragraph reality

There is **no clean, blessed Greek channel** for declaring winnings from an unlicensed offshore prediction market. Greece taxes worldwide income, so your Polymarket profit is in scope regardless of where it is earned. But the profit does not fit cleanly into any existing tax category, and the "obvious" gambling channel (E1 code 781, tax withheld at source) is **structurally unavailable** because Polymarket is unlicensed and cannot issue a Greek tax certificate. Meanwhile DAC8/CARF (live since 1 Jan 2026) means your EU on-ramp/off-ramp CEX and Revolut report your identity, wallets, and volumes to ΑΑΔΕ automatically. So: you cannot hide it, you cannot cleanly slot it, and the worst-case classification is punitive. The rational move is to **declare in full, pick the most defensible bucket with a professional's written sign-off, and keep an airtight paper trail.**

---

## 2. Worldwide-income rule (the starting point)

- A Greek tax resident is taxed on **worldwide income**. Profit earned on an offshore platform (Panama-operated Polymarket) is fully in scope for the Greek return.
- "It's on an offshore site" is **irrelevant** to your obligation. And it does not even help with visibility: the fiat in/out legs run through EU-licensed CEXs/Revolut that report to ΑΑΔΕ under DAC8/CARF (see §6). The offshore platform is the only leg the state does *not* see directly; both money endpoints are visible.

---

## 3. The three candidate classifications (and why each is problematic)

The core unresolved question is which bucket Polymarket profit falls into. No Greek authority (ΑΑΔΕ) has ruled on prediction markets specifically as of 1 July 2026. Each plausible bucket changes **both the rate and the form**.

| # | Classification | Rate / mechanism | Why it (partly) fits | Why it's problematic |
|---|---|---|---|---|
| 1 | **Licensed gambling winnings** (Art. 60 L.2961/2001) | Withheld at source by the operator; player just reports certified amount in **E1 code 781** (for πόθεν-έσχες coverage). Betting scale: 0% ≤€100, 2.5% €100–200, 5% €200–500, 7.5% >€500 | This is the "natural" home for betting winnings | **UNAVAILABLE.** Only HGC-licensed operators withhold and certify. Polymarket is unlicensed, issues no Greek certificate, withholds nothing. Code 781 is not a usable path for it. |
| 2 | **Crypto capital gains** | Proposed **15% flat**, ~€500 annual tax-free threshold, 5-yr loss carryforward | Funds move as USDC; the on/off-ramp deltas look like crypto disposals | **NOT YET LAW** as of 1 Jul 2026 (bill expected in Parliament ~end July 2026, possibly retroactive to 1/1/2025). Even once enacted it targets *crypto disposals*, not *prediction-market payouts*. Applying it is an argument, not a given. |
| 3 | **Miscellaneous / "other" income** | Progressive scale (9%–44%) | Residual bucket when nothing else fits; same scale used for mining/staking income | Weak legal basis for this specific income type; still a judgment call. But at €1–3k the marginal rate is low (~9% on the first €10k). |

**The worst case — "unexplained wealth" (the reason to declare proactively):**

- **Council of State (ΣτΕ) ruling 1485/2025** held that winnings from **unlicensed** betting operators are **not recognized**. If such amounts surface as bank inflows **without a legitimate, provable source**, they are taxed as *"προσαύξηση περιουσίας από άγνωστη πηγή"* (unexplained increase of wealth) under **Art. 21 §4 L.4172/2013**: **33% as business profit + 50% penalty + surcharges.**
- The **burden of proof is on you** to show a legally-taxed or exempt source. Because Polymarket winnings cannot be certified as licensed-gambling winnings, they are **structurally exposed** to this treatment if an audited withdrawal has no documented trail.
- This is exactly why the defensible play is to declare the net profit *proactively* with full records, rather than let a withdrawal appear as an unexplained deposit.

---

## 4. Recommended treatment for a $1–3k individual (with the caveat)

> **Not tax advice. This is the least-bad defensible position to take to your accountant for written sign-off — not a blessed procedure.**

1. **Declare as an individual on the E1. Do NOT route through freelance/business books (μπλοκάκι / Innova).** See §5 for why the business path is worse at this scale.
2. Since code 781 (licensed gambling) is unavailable, the practical route is your **accountant declaring net annual profit as miscellaneous/other income**, with full supporting records. It's a defensible small-scale position, not a settled path — get it in writing.
3. **Net the year, not each bet.** For a small individual, compute annual net profit (total EUR withdrawn/withdrawable minus total EUR deposited, adjusted for open positions at year-end). Confirm the netting method with the accountant. Note: losses do **not** obviously offset under a gambling frame the way they would under the proposed crypto regime (5-yr carryforward) — another reason the frame choice matters.
4. **Declare consistently with what the CEX reports to ΑΑΔΕ** (§6). The goal is that your E1 reconciles to the auto-reported CEX/Revolut figures, so there is no unexplained delta to flag.
5. **Keep withdrawals modest, regular, and documented.** €1–3k of net profit is well below typical unexplained-wealth audit scale, but DAC8 makes the on-ramp visible. Large, lumpy inflows are the trigger; steady documented conversions are lower risk.
6. **Watch the crypto bill.** If the 15% crypto CGT is enacted (expected submission end-July 2026, possibly retroactive to 1/1/2025), *reassess* whether the USDC leg can be framed as a crypto disposal. It's a cleaner frame than unlicensed-gambling, but may still not capture the prediction-market payout itself. Revisit with the accountant after it passes; **do not assume the 15% rate is available today.**

---

## 5. Individual (E1) vs freelance/business books (μπλοκάκι / Innova) — verdict: individual

**Routing $1–3k of hobby winnings through business books is NOT recommended.** The reasons that actually matter are not the tax *rate*:

- **Fixed EFKA social-security contributions.** Active freelancers owe income-*independent* EFKA (roughly €1,800–3,000+/yr depending on category). A €1–3k hobby year would be swamped by this fixed overhead.
- **Imputed/presumptive minimum income (τεκμαρτό εισόδημα).** Freelancers are taxed on a floor regardless of actual profit — punishing for a tiny, non-systematic activity.
- **ΚΑΔ (activity code) mismatch.** There is no clean activity code for prediction-market winnings; forcing one invites scrutiny.
- **Business income is taxed 9%–44%** (post-L.5246/2025, top 44% now starts above €60k). But on €1–3k the marginal cost is small (~9%) — so the rate is the *weak* argument; EFKA + imputed income are the real killers.

Corrections to keep the reasoning honest (per verification):
- **τέλος επιτηδεύματος (trade fee) was abolished for individual freelancers/sole proprietors from tax year 2024** — but it still applies to **legal entities**, so it *would* bite if routed through Innova as a company.
- **VAT** is not a real added cost: gambling/betting is VAT-exempt and winnings aren't an invoiceable supply. The "VAT problem" is a symptom of the mismatch, not a separate tax.

**The business path only makes sense if this became a systematic, high-volume professional operation — which $1–3k hobby scale is not.** Caveat: the individual path itself is not "clean" (code 781 unavailable, classification unresolved) — it is the **lesser evil**, not a blessed route.

---

## 6. What ΑΑΔΕ will actually see — DAC8 / CARF auto-reporting

**The reporting machinery is live even though the taxing rule (15% crypto CGT) is not.** This creates a *declare-now / rate-TBD* gap you must plan around.

- **Greek law:** CARF transposed via **Law 5193/2025**; DAC8 aligned via **Law 5301/2026** (Gazette 15 May 2026). Reporting provisions apply from **1 Jan 2026**. Supervised by ΑΑΔΕ (co-supervised with the Hellenic Capital Market Commission).
- **Who reports:** every EU-licensed CASP you touch — **Kraken EU, Coinbase EU, Revolut** (Revolut's crypto entity reports via Lithuania's VMI, which forwards to ΑΑΔΕ under AEOI). There is **no privacy advantage** to any rail.
- **What is reported, per user:** legal name, date of birth, address, **TIN** for each tax residence, all tax residences. **Per transaction:** type (exchange/transfer/payment), crypto-asset type, amount in native units **and** fiat equivalent at transaction time, and date.
- **Transfers to self-custody/external wallets ARE reportable.** When you move USDC from the CEX to the wallet that funds Polymarket, the CEX reports that outbound transfer (amount + destination address + date). ΑΑΔΕ therefore sees: **euros in → USDC bought → USDC sent to wallet 0x…**
- **Polymarket itself does NOT report.** Polymarket International is offshore, non-CASP, issues no tax forms. So ΑΑΔΕ sees **money leaving and money returning**, but not the bet-by-bet detail inside Polymarket. Chain analytics can still link your wallet to Polymarket deposit contracts.
- **Timing:** data collected across all of 2026; **first automatic exchange to ΑΑΔΕ due between 1 Jan and 30 Sep 2027** (first filing ~2027 for 2026 activity).
- **Retention:** CARF mandates ≥5 years at the CASP level. The paper trail is now **permanent**.

**Practical takeaway:** the asymmetric visibility (state sees money out and money back, not the internal PnL) is exactly why **an unexplained larger sum returning than left is the audit trigger.** Declare so your E1 reconciles to the reported CEX legs.

---

## 7. Record-keeping (your only real defense)

Keep a **complete, contemporaneous ledger from day one.** This is what stands between you and the 33% + 50% unexplained-wealth treatment.

For **every leg**, record date and EUR value at the time:
1. SEPA out of Revolut/bank → CEX
2. CEX buy/convert EUR → USDC (units + EUR rate)
3. On-chain transfer to Polymarket (tx hash + destination wallet address)
4. Each market entry/exit and payout on Polymarket
5. USDC returned to wallet → CEX (tx hash)
6. USDC → EUR conversion on CEX
7. SEPA back to Revolut/Greek bank

- Export **Polymarket activity and CEX statements monthly.**
- Save **screenshots** of the Polymarket source for any withdrawal.
- Retain **≥5 years** (match CASP retention; confirm exact period with the accountant).
- This ledger doubles as your **source-of-funds proof** if a CEX/Revolut/bank AML check freezes an inbound transfer.

---

## 8. Netting gains and losses

- **Net per year, not per bet** (recommended for a small individual): annual net profit = total EUR out/withdrawable − total EUR in, adjusted for open positions at year-end.
- **Loss offset is frame-dependent:** under a gambling classification, losses likely do **not** offset cleanly; under the *proposed* crypto regime, losses would carry forward 5 years. This is another reason the classification choice is load-bearing — confirm the netting method and loss treatment with the accountant.
- **Open positions at year-end** need a valuation method — confirm with the accountant (e.g. mark-to-market USDC value vs cost).
- **Unrealized gains** sitting as USDC/pUSD: confirm whether these are taxable only on conversion to EUR (likely) or earlier — this is an explicit accountant question.

---

## 9. Risk table (tax/declaration side)

| Risk | Severity | Mitigation |
|---|---|---|
| **Unexplained-wealth treatment** (ΣτΕ 1485/2025 + Art. 21§4): audited withdrawal you can't source → 33% + 50% penalty + surcharges | High | Meticulous contemporaneous records; declare net profit proactively; keep amounts small and documented |
| **Adverse reclassification**: you file as "other income," ΑΑΔΕ recharacterizes as unlicensed-gambling/unexplained wealth | Medium | Written accountant sign-off on the chosen treatment + retained reasoning; professional cover matters in this gray area |
| **Assuming the 15% crypto rate applies today** (it isn't law yet) | Medium | Treat 15% as pending; only rely on it after enactment, and confirm it captures prediction-market payouts |
| **DAC8 visibility → detectable non-declaration**: CEX reports identity/wallets/volumes to ΑΑΔΕ from 2026 | Medium | Assume full transparency; file consistently with reported CEX legs |
| **Declare/rate mismatch**: ΑΑΔΕ receives 2026 CARF data (by Sep 2027) before the crypto rate is finalized; deltas auto-flag | High | Self-declare consistently; get accountant sign-off before filing E1; keep reconciling records; be ready to amend if the decree changes 2026 treatment |
| **Solidarity contribution** stacking | None | Special solidarity contribution (εισφορά αλληλεγγύης) **abolished** for private-sector income since 1/1/2023, still abolished in 2026 — no extra levy stacks (penalties under the unexplained-wealth route are separate) |

**Legal-status flag (separate from tax, but colors whether you'd even want to self-declare unlicensed-source winnings):** Verification found that **Art. 52 §3 of L.4002/2011 criminalizes the individual PLAYER** for participating in unlicensed games of chance — historically up to 3 months imprisonment + €5,000–20,000 fine. The Feb 2026 reform bill reportedly did **not add new consumer penalties** and enforcement targets operators/promoters/influencers, not small punters — but the underlying player liability exists on the books and the exact post-reform text is unverified. This is a **lawyer question**, and it interacts with the self-declaration decision (potential self-incrimination angle). Do not treat "players aren't targeted" as legal cover.

---

## 10. READY-TO-SEND QUESTION LIST FOR A GREEK ACCOUNTANT / TAX LAWYER

Copy-paste this. Route the last two to a **lawyer**, not just an accountant.

**Classification & rate**
1. How should winnings from an **unlicensed offshore prediction market (Polymarket)** be classified for a Greek tax resident: gambling winnings (Art. 60 L.2961/2001), crypto capital gains, miscellaneous/other income, or unexplained wealth (Art. 21§4 L.4172/2013)? Which is most defensible at €1–3k scale, and at what rate?
2. Since **E1 code 781 and Art. 60 withholding only work for HGC-licensed operators**, is there any legitimate E1 line/code to self-declare net profit from an unlicensed source, and what is its legal basis?
3. Does **ΣτΕ 1485/2025** mean any Polymarket withdrawal I cannot certify as licensed-gambling winnings is automatically exposed to the **33% + 50%** unexplained-wealth treatment? How do I pre-empt that by declaring proactively?

**Individual vs business**
4. For €1–3k hobby scale, confirm the **individual (E1) path is preferable** to freelance/business books (μπλοκάκι / Innova). Specifically confirm the **EFKA**, **imputed-income (τεκμαρτό)**, **ΚΑΔ**, and **τέλος επιτηδεύματος** (sole proprietor vs legal-entity Innova) implications of the business path.

**Mechanics**
5. How do I **net gains and losses** — per year or per market? Do losses offset at all under the treatment you recommend? How are **open positions at year-end** valued?
6. Do I owe anything on **unrealized gains** sitting as USDC/pUSD, or only when converted to EUR and withdrawn?
7. Is the **EUR→USDC conversion** itself a taxable disposal, or tax-neutral because USDC is a 1:1 stablecoin? (Relevant when the return USDC→EUR leg is scrutinized.)
8. How should I document the **USDC-on-Polygon leg and each fiat↔crypto conversion** so the euro-valued gains are defensible if audited? Which records/certificates does ΑΑΔΕ expect, and for how many years?

**DAC8 / reconciliation**
9. Given **DAC8/CARF (Law 5193/2025 + 5301/2026)**, what exactly will Kraken/Coinbase/Revolut report about me to ΑΑΔΕ (identity, wallet addresses, volumes), and **how should my E1 line up with that** to avoid a data-match flag? Is the destination wallet address of outbound transfers included in what reaches ΑΑΔΕ?
10. For tax-year 2026, is there **any crypto capital-gains rule in force yet**, or does general income tax apply until the 15% decree lands? Will the decree apply **retroactively** to 2026 (or 2025) gains? Once enacted (€500 tax-free threshold), can the USDC leg be framed as a crypto disposal, and does the €500 threshold interact with a gambling classification?
11. Confirm **no special solidarity contribution** applies to this income in 2026, and identify any other levy that could attach under each classification.
12. Is there a **de-minimis / hobby threshold** below which this activity is not separately taxable at €1–3k scale? What is the realistic audit probability if I declare consistently?

**LAWYER (not accountant)**
13. Under **L.4002/2011 as amended (Art. 52 §3)** and the 2026 crackdown bill, does an individual Greek resident face any **criminal/legal exposure merely for placing bets** on an unlicensed operator like Polymarket? Does the final enacted bill contain any consumer/player penalty, and is the historical "3 months + €5,000–20,000" text still operative?
14. Could **declaring unlicensed-source winnings itself trigger** the criminal-participation provision (self-incrimination angle)? How do I reconcile the tax duty to declare with the gambling-law risk?

---

## 11. Clearly-labeled UNRESOLVED points (do not treat as settled)

- **Classification is genuinely unresolved.** No Greek authority has ruled on prediction markets specifically as of 1 July 2026. Any treatment you file could be recharacterized by ΑΑΔΕ. *(confidence: high that it's unresolved)*
- **The 15% crypto CGT is not yet law.** Bill expected in Parliament ~end July 2026; final rate, wording, and retroactivity (1/1/2025 vs 1/1/2026) are unsettled. Whether it would capture prediction-market payouts (vs pure USDC disposals) is unknown. *(medium)*
- **No AADE guidance exists** on prediction-market or crypto-derived event-contract payouts. The classification is purely inferred from general income rules. *(high)*
- **Whether losses offset, and how, depends entirely on the frame chosen** — unresolved until the accountant fixes the classification. *(high)*
- **Player-side criminal liability post-reform is uncertain.** Art. 52 §3 L.4002/2011 historically criminalized the player; the exact operative text after the Feb 2026 amendment is unverified. Enforcement against small players is near-zero in practice, but the legal exposure is a live flag. *(medium)*
- **Exact DAC8 report field granularity** (does the outbound destination wallet address actually reach ΑΑΔΕ cross-border, or only aggregate amounts?) is unclear. *(medium)*
- **Real audit probability at €1–3k scale** vs the historical near-zero enforcement against small players is unresolved — letter-of-law vs enforcement reality. *(medium)*
- **Self-incrimination interaction** between declaring the income and the gambling-participation provision needs a lawyer, outside accountant scope. *(unresolved)*

---

## 12. Bottom line

- **You must declare** (worldwide income + DAC8 visibility make non-declaration detectable and risky).
- **Declare as an individual on the E1, as net "other income," NOT through business books** — pending written accountant sign-off.
- **The single biggest tax risk is the 33% + 50% unexplained-wealth treatment** if a withdrawal is audited without a documented source. Your ledger (§7) is the defense.
- **The 15% crypto rate is not available today** — do not file as if it were.
- **Nail down classification with a professional BEFORE the first withdrawal**, because how it enters your E1 is a one-way door once filed, and the CARF data for 2026 lands at ΑΑΔΕ by Sep 2027.

---

## Sources

**Greek tax classification & unexplained wealth**
- ΣτΕ block on unlicensed-betting winnings: https://www.businessdaily.gr/oikonomia/216286_mploko-toy-ste-se-kerdi-apo-stoihimatikes-horis-adeia-stin-ellada
- Art. 21§4 / 33% unexplained-wealth treatment: https://www.ot.gr/2021/05/27/apopseis/experts/i-adikaiologiti-prosayksisi-tis-periousias-forologeitai-me-33-os-kerdos-apo-epixeirimatiki-drastiriotita/
- ΑΑΔΕ betting/gambling declaration (code 781): https://www.aade.gr/en/tax-return-greek-states-participation-gross-betting-and-gambling-earnings
- Greek gambling winnings tax / Art. 60: https://www.forin.gr/questions/question/6101/kerdh-apo-to-stoixhma
- Greece crypto/blockchain tax overview: https://www.globallegalinsights.com/practice-areas/blockchain-cryptocurrency-laws-and-regulations/greece/
- PwC Greece income determination: https://taxsummaries.pwc.com/greece/individual/income-determination
- Gambling winnings taxation (OPAP): https://www.opap.gr/en/winnings-taxation
- Casino/gambling tax return: https://casino.edra.gr/en/blog/casino-tax-return/

**15% crypto CGT bill (not yet law)**
- https://cryptobriefing.com/greece-crypto-capital-gains-tax/
- https://www.cryptotimes.io/2026/06/06/greece-plans-15-crypto-gains-tax-under-new-digital-asset-rules/
- https://coingeek.com/greece-to-impose-15-tax-on-digital-asset-gains-over-e500/
- https://www.globalbankingandfinance.com/greece-tax-gains-crypto-sources-say/

**DAC8 / CARF reporting (Law 5193/2025, 5301/2026)**
- EU DAC8: https://taxation-customs.ec.europa.eu/taxation/tax-transparency-cooperation/administrative-co-operation-and-mutual-assistance/directive-administrative-cooperation-dac/dac8_en
- ΑΑΔΕ crypto monitoring / OECD system: https://athens-times.com/greek-tax-authority-monitors-crypto-transactions-via-oecd-system/
- CARF Greece CASP compliance guide: https://taxdo.com/resources/blog/carf-greece-casp-rfi-compliance-guide-2026
- Tax authorities to get crypto data: https://www.blockpit.io/tax-guides/tax-authorities-will-get-your-crypto-data
- Greece crypto tax guide 2026 (Waltio): https://help.waltio.com/en/articles/14704986-greece-crypto-tax-guide-2026-the-complete-guide
- Revolut reporting (Lithuania → AADE): https://tax-wizard.eu/en/p/does-revolut-report-to-tax-authorities
- CARF record retention (OECD FAQ): https://www.oecd.org/content/dam/oecd/en/topics/policy-issues/tax-transparency-and-international-co-operation/faqs-crypto-asset-reporting-framework.pdf

**Individual vs business / rates / EFKA / trade fee**
- Greece personal taxation: https://taxravens.com/en/blog/greece-personal-taxation
- Freelance tax in Greece: https://taxratesbycountry.com/freelance-tax-in-greece/
- EFKA self-employed contributions 2026: https://www.link.com.gr/en/self-employed-contributions-greece-2026/
- τέλος επιτηδεύματος status: https://www.fortunegreece.com/article/telos-epitidevmatos-paramenei-gia-epixeiriseis-kai-blokakia-pote-katargeitai/
- Solidarity contribution abolition: https://eurofast.eu/greece-amendments-to-solidarity-tax-and-social-contribution/
- EY Greece tax amendments: https://www.ey.com/en_gr/technical/tax/tax-alerts/new-law-significant-amendments-in-the-tax-legislation

**Gambling law & player liability**
- ICLG Greece gambling 2026: https://iclg.com/practice-areas/gambling-laws-and-regulations/greece/
- Player-participation penalties (Art. 52): https://daynight.gr/paranomo-paignio-kiroseis-kai-poines
- 2026 gambling bill (Pierrakakis): https://minfin.gov.gr/schedio-nomou-gia-ti-rythmisi-tis-agoras-tycheron-paignion-prostasia-ton-paikton-enischysi-tis-eeep-kai-loipes-forologikes-kai-syntaxiodotikes-diataxeis/
- Player-liability nuance / consumer penalties dropped: https://www.mundovideo.com.co/en/europe/greece-targets-black-market-gambling-with-player-liability-and-tougher-penalties/

**Prediction-market tax treatment (comparative)**
- https://coinledger.io/blog/prediction-markets-tax
- https://greentradertax.com/prediction-market-taxes-capital-gains-gambling-or-something-else/
- https://www.monacocpa.cpa/prediction-market-tax