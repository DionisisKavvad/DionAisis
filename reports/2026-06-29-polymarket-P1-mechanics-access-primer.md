# Polymarket Mechanics & Access Primer (Greece/EU)

**Deliverable P1 — the foundation doc.** What Polymarket actually is, how money moves through it end to end, and whether you (Greece, EU, $1-3k, 1-2h/day, async, automation-first) can legally use it in 2026. Every concrete claim is sourced. Where the research flagged something as fragile, fast-moving, or unverified, it says so.

> **One-line frame vs your crypto work:** memecoins gave you no defined odds, no resolution, sub-4h trade life, and 3-7% round-trip fees against rugs/honeypots. Polymarket gives you defined probabilities, real (if imperfect) resolution, longer horizons, and maker-free fees. In exchange you take on two new risks that don't exist in memecoins: **oracle/resolution risk** and **capital lockup**. That trade is the whole story.

---

## 1. What Polymarket is (the core structure)

Polymarket is a **central limit order book (CLOB)**, not an AMM. Off-chain order matching, on-chain settlement on **Polygon (chain 137)**. Price emerges from supply/demand of limit orders, Polymarket does not set it. As of **April 28, 2026 it runs CLOB V2** (new Exchange contracts, rewritten backend, new collateral token pUSD).

**Shares = probabilities.** Each market has YES and NO shares priced **0 to 1 USDC**, and **YES + NO always sum to $1.00**.
- YES at $0.65 = the market's implied **65% probability**.
- When a $0.60 YES order matches a $0.40 NO order, $1.00 mints 1 YES + 1 NO token.
- Displayed price = bid-ask midpoint (or last trade if spread > $0.10).
- No size limits, but large orders move price.

**This is the single biggest structural upgrade over memecoins.** The price *is* the crowd's implied probability, so your edge is literally `your probability − market price`, and you can compute EV and score calibration. Memecoins have no defined odds at all.

Sources: [docs.polymarket.com/concepts/prices-orderbook](https://docs.polymarket.com/concepts/prices-orderbook), [quantvps.com CLOB explainer](https://www.quantvps.com/blog/polymarket-clob-central-limit-order-book), [CLOB V2 deep-dive](https://medium.com/@benjamin.bigdev/how-polymarket-orders-actually-get-executed-a-deep-dive-into-clob-v2-for-developers-fdcd5d395ef5).

---

## 2. Buying and selling YES/NO

- **Open a position:** buy YES (you think it happens) or NO (you think it doesn't). Cost = current price × shares.
- **Close early:** sell your shares back into the book at the current price, *if there's depth*. On thin markets you may not be able to exit at a good price, or at all, before resolution.
- **Hold to resolution:** winning shares pay exactly **$1.00**, losers **$0.00**, automatically. Auto-redeem is available, no manual claim needed.

**Two order types, and the distinction is the whole fee game (Section 4):**
- **Limit order that RESTS on the book = maker = $0 fee.**
- **Order that crosses the spread and fills immediately = taker = pays the fee**, even if you submitted it as a "limit" order. A limit order priced through the book is a taker. This is the trap to encode in any bot.

Sources: [order lifecycle](https://docs.polymarket.com/concepts/order-lifecycle), [limit orders](https://help.polymarket.com/en/articles/13364444-limit-orders).

---

## 3. USDC / Polygon / pUSD (the money rail)

- Polymarket runs on **Polygon**. Collateral is **USDC**.
- As of **~April 2026**, deposited USDC is auto-wrapped into **pUSD** (Polymarket's wrapped stablecoin, 1:1 USDC-backed, minted on deposit / burned on withdraw). The wrap is automatic and transparent: you still send plain USDC on Polygon, but your **balance will display as pUSD**. Know this for accounting and for bot code.
- Polygon gas is **< $0.01** per transaction. Bridging to Ethereum mainnet costs $1-20+ (avoid unless necessary).

**Open question flagged by research:** pUSD redemption friction / depeg risk vs raw USDC under CLOB V2 is **not yet hands-on confirmed**. Verify withdrawal behaves cleanly with a small test amount before sizing up.

Sources: [how-to-deposit](https://docs.polymarket.com/polymarket-learn/get-started/how-to-deposit), [pUSD concept](https://docs.polymarket.com/concepts/pusd), [USDC->pUSD upgrade](https://www.webopedia.com/news/markets/polymarket-usdc-pusd-upgrade-settlement-infrastructure/).

---

## 4. Fees (this changed in 2026, it matters for EV)

**Fees flipped in 2026.** Polymarket historically charged zero. As of ~April 3, 2026 it now charges **taker fees**; **maker (resting limit) orders remain free** and can even earn a rebate.

**Taker fee schedule (international platform, per 100 shares = per $100 notional at resolution):**

| Category | Taker fee |
|---|---|
| Crypto | 1.80% |
| Economics | 1.50% |
| Mentions | 1.56% |
| Culture / Weather | 1.25% |
| Finance / Politics / Tech | 1.00% |
| Sports | 0.75% |
| Geopolitics | free |

**Critical mechanical detail:** the fee follows `C × feeRate × p × (1−p)`, so it **peaks at $0.50 and shrinks toward the $0.01/$0.99 tails**. The percentages above are the worst case (near 50c), not a flat rate. Plug the actual formula into any EV check, don't use a flat number.

**Makers do better than free:** the Maker Rebates Program redistributes ~**20-25% of collected taker fees** daily to liquidity providers as pUSD (Finance category up to 50%). $1 minimum accrual.

- No platform deposit/withdrawal fee.
- Card deposit via MoonPay = 2-3% (avoid). Cheapest = buy USDC on a CEX, send on Polygon.

**vs memecoins:** round-trip cost is far lower than the 3-7% you paid on memecoins **if you trade as a maker**. Taker fees on crypto/econ (1.5-1.8%) are not trivial on a thin edge with a small bankroll. **Default to resting limit orders.** Caveat: this is an actively-changing area (a fee change and quick reversal happened in April 2026), so re-verify the live schedule at [docs.polymarket.com/trading/fees](https://docs.polymarket.com/trading/fees) before locking automation.

Sources: [trading fees help](https://help.polymarket.com/en/articles/13364478-trading-fees), [maker rebates](https://docs.polymarket.com/market-makers/maker-rebates), [startpolymarket fees](https://startpolymarket.com/learn/polymarket-fees/), [predictionhunt fee guide](https://www.predictionhunt.com/blog/polymarket-fees-complete-guide).

---

## 5. Resolution via UMA oracle (the defining NEW risk)

This is the risk class that **does not exist in memecoins**. A memecoin never "resolves." A Polymarket market resolves through **UMA's optimistic oracle**, which is a **token-weighted vote, not ground truth**.

**The flow:**
1. A proposer posts a ~$750 USDC bond proposing the outcome.
2. **2-hour challenge window.**
3. First dispute is ignored (an identical request is recreated).
4. Second dispute escalates to UMA's DVM, where **UMA token holders vote** (~48h debate + vote).

**Why this is dangerous, with documented cases:**
- **Ukraine mineral-deal market (March 2025, ~$7M):** resolved "Yes" despite no deal existing, after a whale cast ~5M UMA across 3 accounts (~25% of votes). Polymarket called it a governance attack and **did not refund**.
- **Strategy/MicroStrategy "sold BTC by May 31" (May-June 2026, $60-85M):** disputed entirely over whether "sell in May" meant execution or disclosure (8-K filed June 1). Pure wording ambiguity.
- A **WSJ investigation** found that in most disputed markets **>50% of votes came from the 10 largest wallets**, **~60% of active UMA voters are linked to Polymarket accounts**, and **~1 in 5 disputes had a voter with a stake** in the market they judged.
- **1,150+ disputed markets logged in 2026**, already past the full 2025 total.

**What lowers this risk (and is automatable as a filter):**
- Prefer **objective, data-resolved markets**. Polymarket now routes objective sports / crypto-price markets to **Chainlink Data Streams** (automated, no human vote, near-zero dispute risk). Only ambiguous/intersubjective markets go through the UMA DVM, and ~98.5% of proposals never reach a DVM vote.
- **Read the exact resolution rules before entering** (named source of truth, definitions, edge cases). Skip any market where "true outcome" and "how it resolves" could diverge. Avoid subjective wording ("significant," "major," "in some way").
- **Being right does NOT guarantee payout.** Add an edge haircut on fuzzy/political markets and never assume the real-world outcome equals the payout.

**Caveat the research adds:** even "objective" Chainlink-resolved short-duration crypto markets became an MEV target (April 24-25, 2026: $40M+ extracted from 5-min markets via micro-gaps between CEX price and oracle update). Objective resolution is necessary but not sufficient: you want objective **and not latency-gameable**, which means avoiding the fast crypto-tick markets entirely.

Sources: [UMA resolution docs](https://docs.polymarket.com/developers/resolution/UMA), [Strategy $85M dispute](https://thedefiant.io/news/markets/usd85m-polymarket-dispute-over-strategy-s-may-bitcoin-sale-puts-uma-s-token-voting-oracle-on), [Ukraine debacle](https://thedefiant.io/news/defi/polymarket-s-usd7m-ukraine-mineral-deal-debacle-traced-to-oracle-whale), [oracle manipulation analysis](https://orochi.network/blog/oracle-manipulation-in-polymarket-2025).

---

## 6. Settlement timing & capital lockup

Fast median, but a real right tail, and **your capital is locked until resolution**.

Across **18,427 markets** in the 12 months to May 8, 2026:
- **Median resolution: 41 minutes** after the event ended.
- 90th percentile: 6.4h.
- 99th percentile: 4.2 days.
- **1.0% (184 markets) disputed at UMA**, adding a median **49h**.
- Undisputed payout unlocks **~2h after market end** (proposal + challenge window).

**Capital cost vs memecoins:**
- Memecoins recycled in < 4h, never locked. Polymarket can lock capital for **hours to months**.
- Money in a long-dated market earns nothing while T-bills pay ~3.5-4%/yr. A 4-year YES at 80% should rationally trade nearer ~64% once you price in forgone yield. Polymarket even added a ~4% "Holding Reward" on select long-dated political markets to compensate.
- **Practical rule:** prefer **shorter-horizon markets** so capital recycles; only lock long-term if your edge clearly beats ~4%/yr opportunity cost + resolution risk. This also constrains how many concurrent positions a $1-3k bankroll can support.

Sources: [resolution time study](https://www.polysyncer.com/blog/polymarket-resolution-time-2026), [how markets resolve](https://docs.polymarket.com/polymarket-learn/markets/how-are-markets-resolved), [pUSD/holding reward context](https://www.ainvest.com/news/polymarket-4-daily-reward-mechanism-catalyst-long-term-capital-allocation-user-retention-decentralized-prediction-markets-2509/).

---

## 7. Liquidity & exit risk (the quiet killer)

On thin markets the bid-ask can be **$0.05-$0.10/share** and large orders walk through the book. Orders can sit unfilled for hours/days.
- Markets < 1 day old average **~$10k depth**; > 30-day markets average **~$450k**; reliable pricing kicks in above ~$100k volume.
- A $5k position can move price ~15% in a ~$20k-depth book.
- **Rule:** use limit orders (maker, free), only take meaningful size in deep books, and **assume you may have to hold to resolution** rather than exit. Paper PnL on a thin market is fiction until you can actually sell.

**vs memecoins:** there, liquidity risk = rug/honeypot (you can't sell at all). Here, you can sell but at a bad price, and worst case you wait for resolution. Less catastrophic, but real.

Sources: [tradealgo liquidity guide](https://www.tradealgo.com/trading-guides/prediction-markets/prediction-market-liquidity-how-to-identify-and-trade-thin-markets-profitably), [Phemex liquidity analysis](https://phemex.com/news/article/polymarket-liquidity-analysis-reveals-key-insights-into-prediction-markets-52184).

---

## 8. LEGAL ACCESS from Greece / EU (2026)

> **Confidence: medium, and actively moving.** This is a real research target, not a footnote. Re-verify at the actual signup flow before funding. There is a hard regulatory inflection at **July 1, 2026** (MiCA transitional period ends).

### Can you use it from Greece?
**Yes, at the IP level, today.** Greece is **not** on any Polymarket blocklist and is among the **~22 of 27 EU states** with functional access (alongside Germany, Spain, Italy, NL, Poland, etc.). **France and Belgium are explicitly geo-blocked.** **Portugal and Hungary were added to the restricted list in Jan 2026** (driven by their national gambling regulators, not MiCA), and **Spain ordered ISPs to block Polymarket + Kalshi on May 26, 2026.** So the restricted list is **growing**, and Greece could follow.

### The legal nature of that access (be precise)
- Access rests on the **MiCA Article 61 reverse-solicitation grey zone**: a non-EU firm may serve EU users who self-initiate. Polymarket holds **no EU CASP license**. ESMA's Feb 2025 guidelines say this exemption is **"very narrowly framed,"** voided by any marketing/promotion targeting EU clients. This is *tolerated*, not *licensed*. It can flip with enforcement.
- Separately and arguably bigger: several EU states classify prediction markets as **unlicensed gambling**, and Greece's gambling regulator (Hellenic Gaming Commission) prohibits unlicensed offshore operators serving Greek players. Greece is in the middle of a **2026 gambling crackdown** (criminal penalties for operators, expanded site/account blocking powers). Enforcement targets operators/promoters, not individual punters, but the direction of travel is hardening, not loosening.
- **Bottom line:** runnable today for a small test bankroll, but treat the legal footing as fragile. The near-term kill switch is more likely a Greek gambling-law block than a MiCA action.

### KYC
- **Non-US users currently need NO ID** to trade the international platform (polymarket.com). Wallet/email self-onboard. Polymarket's VP Eng publicly denied mandatory KYC for the main platform (May 2026).
- KYC is only mandatory on **Polymarket US** (the separate QCEX/CFTC venue, irrelevant to you) and on a separate new beta product.
- Risk-based KYC/AML review **can** trigger on very high volume or rapid deposit/withdraw cycles. At $1-3k you're well below that.
- **Flag:** Polymarket is reportedly moving toward broader trader KYC under sanctions pressure, so the no-KYC status **may not be durable**. Verify at signup.

### Geo-evasion / VPN
- **Do NOT use a VPN.** Greece is accessible without one, so there is **zero upside**. VPN use violates **ToS Section 2.1.4**, is actively detected (IP ranges, browser fingerprinting, WebRTC, on-chain wallet history), and can get **funds frozen** for weeks-to-months. Onboard from a normal Greek connection.

### Fiat on/off-ramp (the clean route)
**SEPA → EU CEX → buy USDC → send on Polygon → Polymarket.**
- **Deposit:** SEPA EUR into Kraken or Coinbase EU (free / sub-€1, 0-3 business days), buy USDC, withdraw USDC on **Polygon**.
  - Kraken supports Polygon USDC + SEPA, but charges a small variable USDC withdrawal fee.
  - **Coinbase EU withdraws USDC free on Polygon** (Circle subsidy), so it's marginally cheaper on that specific leg. Either works.
  - Avoid the MoonPay card on-ramp (2-3%).
- Polygon gas to deposit: **< $0.01**. Balance shows as **pUSD**.
- **Off-ramp:** send USDC to the CEX, SEPA EUR out (~1 business day).
- **USDC is the one large-cap stablecoin that is MiCA-compliant** (Circle holds an EU EMI license), which de-risks the EU holding/funding angle vs USDT.
- **Test the full deposit → trade → withdraw → bank loop with a small amount before sizing up.**

### Tax (DAC8) — unresolved, get a Greek accountant
- **EU DAC8 took effect Jan 1, 2026.** Your **EU CEX on-ramp** (Kraken/Coinbase EU) is the reporting choke point: it must report your identity, wallet addresses, and transaction volumes to tax authorities. Polymarket itself is offshore and not a reporting CASP, but the CEX makes the whole flow visible. **Reporting is not avoidable via this route.** Keep records.
- **Greek classification of winnings is unresolved** (gambling income vs capital gains vs misc income), and it materially changes your net. Greek residents are taxed on worldwide income regardless. **Confirm with a Greek tax professional before any size**, this is genuinely unverified in the research.

### US context (why it doesn't affect you, but explains the platform)
Polymarket re-entered the US by acquiring **CFTC-licensed QCEX for $112M (closed July 21, 2025)**, getting an amended CFTC order, and launching **Polymarket US** as a separate regulated DCM requiring full KYC (different, lower fee schedule: ~0.30% taker / 0.20% maker rebate). **The international site geo-blocks US IPs.** As a Greek resident you use the **international platform only**, do not pip-install or follow the US SDK/docs by mistake.

Sources: [geographic restrictions](https://help.polymarket.com/en/articles/13364163-geographic-restrictions), [datawallet restricted countries](https://www.datawallet.com/crypto/polymarket-restricted-countries), [copytradeinsider EU 2026](https://www.copytradeinsider.com/blog/polymarket-eu-users-2026/), [ESMA reverse-solicitation guidelines](https://www.esma.europa.eu/sites/default/files/2025-02/ESMA35-1872330276-2030_Guidelines_on_reverse_solicitation_under_MiCA.pdf), [Spain block](https://www.coindesk.com/policy/2026/05/26/spain-joins-growing-list-of-countries-shutting-out-polymarket-and-kalshi), [VPN crackdown](https://www.techradar.com/vpn/vpn-privacy-security/polymarket-blocks-vpns-and-tightens-identity-verification-as-over-30-countries-ban-the-betting-platform), [QCEX acquisition](https://www.prnewswire.com/news-releases/polymarket-acquires-cftc-licensed-exchange-and-clearinghouse-qcex-for-112-million-302509626.html), [DAC8](https://taxation-customs.ec.europa.eu/taxation/tax-transparency-cooperation/administrative-co-operation-and-mutual-assistance/directive-administrative-cooperation-dac/dac8_en), [Greece gambling crackdown](https://www.europeanbusinessreview.com/greeces-2026-crackdown-on-illegal-gambling-enforcement-upgrades-and-the-affiliate-compliance-checklist/).

---

## 9. POLY token / airdrop — optional upside, NOT a thesis

- **Confirmed intent, no live token, no date.** CMO Matthew Modabber (Oct 24, 2025): "there will be a coin and there will be an airdrop." Expected retroactive, no-farming, ~5-10% of supply reserved. US relaunch prioritized first; token expected later in 2026.
- **Polymarket's own help center still formally states no announced token/TGE**, contradicting the verbal hints. Treat exec quotes as intent, not commitment.
- **Do not distort strategy to farm it.** Volume-farming an undated, Sybil-filtered, possibly-zeroed reward pays real taker fees now for unknowable upside, which undermines your edge-first goal. Trade your edge normally; if a token drops and you qualify, free upside.

Sources: [99bitcoins](https://99bitcoins.com/news/bitcoin-btc/polymarket-confirms-poly-token-launch-and-airdrop-plans/), [does Polymarket have a token (help)](https://help.polymarket.com/en/articles/13364250-does-polymarket-have-a-token).

---

## 10. Concrete actionable checklist (gated, in order)

1. **Verify access at signup from Greece** (IP unblocked, current KYC requirement) **on or after July 1, 2026** before funding anything. Do not assume permanent access.
2. **Set up the ramp:** Kraken or Coinbase EU via SEPA → buy USDC → withdraw on Polygon. **Test the full round-trip loop with ~€20** before depositing real size. Expect balance to show as **pUSD**.
3. **Never use a VPN.** Onboard from a normal Greek connection.
4. **Cap total Polymarket bankroll at $1-3k, keep funds withdrawable.** Jurisdiction/withdrawal risk is a capital tail, not a footnote.
5. **Default to maker (resting limit) orders** to pay $0 + earn rebate. Encode the rule: never let a bot cross the spread to force a fill (that makes it a taker). Accept non-fills as the cost.
6. **Hard-filter for resolution risk:** prefer Chainlink-resolved (sports / crypto-price) or objectively data-resolved markets; read the exact UMA resolution rules before entering; skip ambiguous/subjective wording; **avoid the fast 5-min crypto-tick markets** (MEV bot territory).
7. **Prefer liquid, short-horizon markets.** Assume hold-to-resolution as the base case. Treat capital as locked.
8. **Get a Greek tax opinion** on prediction-market winnings (gambling vs capital gains) before any meaningful size. Keep records; assume DAC8 reporting via your CEX.
9. **Treat the POLY airdrop as zero in all sizing math.**

---

## Open questions to resolve before deploying capital (carry into later deliverables)
- Does signup from Greece **currently** require KYC? (Reportedly no, but trending toward broader KYC.)
- Which entity does a Greek user trade under post-US-relaunch, and is the international platform still fully open to EU residents through the July 2026 MiCA ramp?
- Exact **live** taker fee schedule (verify at docs before any EV modeling).
- **pUSD** redemption friction / depeg / withdrawal delay vs raw USDC (needs hands-on test).
- **Greek tax classification** of winnings + DAC8 specifics (needs a local accountant).

---

## Sources
- Polymarket docs: [prices/orderbook](https://docs.polymarket.com/concepts/prices-orderbook), [order lifecycle](https://docs.polymarket.com/concepts/order-lifecycle), [limit orders](https://help.polymarket.com/en/articles/13364444-limit-orders), [fees](https://docs.polymarket.com/trading/fees), [trading fees help](https://help.polymarket.com/en/articles/13364478-trading-fees), [maker rebates](https://docs.polymarket.com/market-makers/maker-rebates), [UMA resolution](https://docs.polymarket.com/developers/resolution/UMA), [how markets resolve](https://docs.polymarket.com/polymarket-learn/markets/how-are-markets-resolved), [pUSD](https://docs.polymarket.com/concepts/pusd), [how to deposit](https://docs.polymarket.com/polymarket-learn/get-started/how-to-deposit), [geographic restrictions](https://help.polymarket.com/en/articles/13364163-geographic-restrictions), [does Polymarket have a token](https://help.polymarket.com/en/articles/13364250-does-polymarket-have-a-token)
- CLOB V2: [quantvps](https://www.quantvps.com/blog/polymarket-clob-central-limit-order-book), [CLOB V2 dev deep-dive](https://medium.com/@benjamin.bigdev/how-polymarket-orders-actually-get-executed-a-deep-dive-into-clob-v2-for-developers-fdcd5d395ef5)
- Fees: [predictionhunt](https://www.predictionhunt.com/blog/polymarket-fees-complete-guide), [startpolymarket](https://startpolymarket.com/learn/polymarket-fees/), [April 2026 fee U-turn](https://www.pokernews.com/prediction-markets/news/2026/04/polymarket-blunder-prompts-quick-u-turn-new-polymarket-fees-50947.htm)
- Resolution risk: [Strategy $85M dispute](https://thedefiant.io/news/markets/usd85m-polymarket-dispute-over-strategy-s-may-bitcoin-sale-puts-uma-s-token-voting-oracle-on), [Ukraine debacle](https://thedefiant.io/news/defi/polymarket-s-usd7m-ukraine-mineral-deal-debacle-traced-to-oracle-whale), [WSJ/oracle manipulation analysis](https://orochi.network/blog/oracle-manipulation-in-polymarket-2025), [dispute scrutiny](https://cryptobriefing.com/polymarket-dispute-resolution-scrutiny/)
- Settlement timing: [resolution time study](https://www.polysyncer.com/blog/polymarket-resolution-time-2026)
- Liquidity: [tradealgo](https://www.tradealgo.com/trading-guides/prediction-markets/prediction-market-liquidity-how-to-identify-and-trade-thin-markets-profitably), [Phemex](https://phemex.com/news/article/polymarket-liquidity-analysis-reveals-key-insights-into-prediction-markets-52184)
- pUSD upgrade: [webopedia](https://www.webopedia.com/news/markets/polymarket-usdc-pusd-upgrade-settlement-infrastructure/)
- Ramp: [Kraken SEPA](https://support.kraken.com/articles/360000381846-cash-deposit-options-fees-minimums-and-processing-times-), [Kraken Polygon USDC](https://support.kraken.com/articles/native-usd-coin), [Coinbase fees](https://www.datawallet.com/crypto/coinbase-fees), [Polymarket bridge/deposit](https://docs.polymarket.com/trading/bridge/deposit), [Circle EEA/MiCA](https://www.circle.com/circle-eea)
- Legal/access: [datawallet restricted countries](https://www.datawallet.com/crypto/polymarket-restricted-countries), [copytradeinsider EU 2026](https://www.copytradeinsider.com/blog/polymarket-eu-users-2026/), [is Polymarket legal](https://cryptonews.com/cryptocurrency/is-polymarket-legal/), [ESMA reverse solicitation](https://www.esma.europa.eu/sites/default/files/2025-02/ESMA35-1872330276-2030_Guidelines_on_reverse_solicitation_under_MiCA.pdf), [Spain block](https://www.coindesk.com/policy/2026/05/26/spain-joins-growing-list-of-countries-shutting-out-polymarket-and-kalshi), [Portugal/Hungary bans](https://finance.yahoo.com/news/polymarket-banned-portugal-hungary-prediction-175111303.html), [VPN crackdown](https://www.techradar.com/vpn/vpn-privacy-security/polymarket-blocks-vpns-and-tightens-identity-verification-as-over-30-countries-ban-the-betting-platform), [ToS 2.1.4](https://www.tradetheoutcome.com/polymarket-section-2-1-4/), [Greece gambling crackdown](https://www.europeanbusinessreview.com/greeces-2026-crackdown-on-illegal-gambling-enforcement-upgrades-and-the-affiliate-compliance-checklist/), [MiCA July 2026 deadline](https://en.spaziocrypto.com/regulation/mica-july-1-2026-deadline-authorized-platforms/)
- KYC / US re-entry: [QCEX acquisition](https://www.prnewswire.com/news-releases/polymarket-acquires-cftc-licensed-exchange-and-clearinghouse-qcex-for-112-million-302509626.html), [CFTC amended order](https://www.regulatoryoversight.com/2025/12/cftc-approval-allows-polymarket-to-reenter-the-u-s-market/), [KYC requirements](https://www.copytradeinsider.com/blog/polymarket-kyc-requirements/), [KYC beta clarification](https://cryptobriefing.com/polymarket-kyc-beta-product-clarification/), [Polymarket US fees](https://docs.polymarket.us/fees)
- Tax: [DAC8 EU](https://taxation-customs.ec.europa.eu/taxation/tax-transparency-cooperation/administrative-co-operation-and-mutual-assistance/directive-administrative-cooperation-dac/dac8_en), [Greek individual income (PwC)](https://taxsummaries.pwc.com/greece/individual/income-determination)
- POLY token: [99bitcoins](https://99bitcoins.com/news/bitcoin-btc/polymarket-confirms-poly-token-launch-and-airdrop-plans/), [Decrypt](https://decrypt.co/345854/polymarket-exec-confirms-token-airdrop-after-reenters-us-market)
