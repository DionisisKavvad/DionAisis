# L2: Deposit Playbook — Money IN (Revolut-centric)

**Context:** Greece resident, individual retail user, ~$1-3k bankroll, Revolut/neobank as base rail, funding Polymarket International. Verified as of 2026-07-01 (the MiCA transitional cliff).

**This is NOT legal or tax advice.** This covers the mechanics of moving money IN only. Whether Polymarket is legal/usable for a Greek resident, and how any winnings are taxed, are separate deal-breaker questions (see L1/legality and tax deliverables) that need a licensed Greek lawyer/accountant. Route every legal/tax uncertainty to a professional.

---

## TL;DR (the answer)

- **Revolut CANNOT be your on-chain leg for a $1-3k bankroll.** It technically *can* send USDC on Polygon, but its native crypto-withdrawal cap (~£500/day, ~£1,000/month) throttles $2-3k to a 2-3 month drip. Wrong tool for the job.
- **Use Revolut ONLY as the free EUR SEPA rail** into a MiCA-licensed EU exchange.
- **Cheapest reliable route:** Revolut EUR → free SEPA → **Coinbase EU** → convert EUR→USDC → withdraw USDC **on Polygon** → Polymarket deposit address (auto-wraps to pUSD).
- **Coinbase is recommended over Kraken** for the on-chain leg because Coinbase's USDC-on-Polygon withdrawal is free; Kraken charges a small flat fee.
- **The single highest-risk step is network selection.** Sending USDC on any network other than Polygon = permanent, irreversible loss. Always test with a tiny amount first.
- **You do NOT need POL/gas.** Polymarket's 2026 stack is gasless for users.

---

## The route at a glance

```
Revolut EUR
   │  (free SEPA / SEPA Instant, €0)
   ▼
Coinbase EU (or Kraken)   ← KYC here; DAC8 reporting choke point
   │  convert EUR → native USDC
   ▼
Withdraw USDC on POLYGON network (chain ID 137)   ← DANGER STEP
   │  (Coinbase: free · Kraken: small flat fee)
   ▼
Polymarket deposit address (0x…)
   │  auto-wraps USDC → pUSD 1:1, gasless
   ▼
Balance shows as pUSD, ready to trade
```

---

## Why not Revolut-direct?

Revolut *does* support USDC send/receive on Polygon for EEA customers (Greece is EEA; launched Nov 2025, confirmed). So the network is not the blocker. The blocker is the **caps**:

- Daily crypto-withdrawal limit ~**£500**, monthly ~**£1,000** (~€1,150).
- Extra per-address sub-limits possible based on risk scoring (a fresh Polymarket-linked address could get an even lower cap).
- **Math:** $1k just about fits one monthly cycle; $2-3k takes 2-3 months of dripping.

Two more caveats:
- These limits are from Revolut's **UK** help domain (GBP). EEA/Greece parity is **not independently confirmed** — check your actual in-app limit.
- The send-to-external-wallet feature is **gated by plan/region/verification**. Do not assume "Polygon" appears as a selectable network for USDC until you see it in *your* app. One 2026 review claimed Revolut USDC withdrawal is Ethereum-only (assessed as stale, but it shows the feature is not universal).

**Bottom line:** treat Revolut purely as the €0 SEPA pipe into a CEX. Do not use it as the on-chain sender for this bankroll.

---

## Prerequisites

1. **Revolut account** (you have this) with EUR balance and SEPA enabled.
2. **A MiCA-licensed EU CEX account, KYC completed:**
   - **Coinbase EU (recommended)** — free USDC-on-Polygon withdrawals (Circle/Coinbase subsidy).
   - **Kraken** — also supports native USDC on Polygon, but charges a small flat withdrawal fee (exact 2026 amount not pinned; verify in-app).
   - Complete KYC (ID + selfie) **now, while calm**, not when you're mid-transfer.
3. **A Polymarket account** with a deposit address (covered in the account/KYC deliverable). No ID/KYC needed at signup for a non-US user. **Avoid the in-app MoonPay/card deposit** — it forces MoonPay's own full KYC and is expensive; the whole point of this rail is to skip it.
4. **No VPN, ever.** Connect on a plain Greek residential/mobile IP. VPN use is a ToS 2.1.4 violation, actively detected, and can freeze funds that are not returned. Keep deposit/login IPs consistent.

---

## Step-by-step

### Step 0 — Verify Greece is still open (before funding anything)
On a normal Greek connection with **no VPN**, load `polymarket.com`. If it loads and lets you sign up (no "not available in your region" banner), proceed. If blocked, **STOP** — do not tunnel around it. (Note: access rests on a legal grey zone and Greece could be geo-blocked with no notice; this is a live risk, not a settled right.)

### Step 1 — (Optional) Check if Revolut-direct is even available
Revolut app → Crypto → USDC → Send/Withdraw to external wallet. See if **Polygon** appears as a selectable network. Even if it does, the ~£1,000/month cap makes it unsuitable for $1-3k. This step is just to confirm what your account exposes; you'll route via the CEX regardless.

### Step 2 — Fund the CEX from Revolut via free SEPA
- In Revolut, send EUR by **SEPA** to the CEX's EUR deposit IBAN (Coinbase/Kraken give you a dedicated IBAN + a **reference code**).
- Revolut SEPA fee = **€0**.
- **Always include the exact reference code** the exchange gives you, or the deposit can be delayed/lost.
- **SEPA Instant** lands in minutes; standard SEPA in 1-2 business days. Watch weekend/low-liquidity delays.

### Step 3 — Convert EUR → USDC on the CEX
- Buy/convert EUR to **native USDC** (the stablecoin — not USDT, and prefer native USDC over bridged USDC.e).
- **Coinbase:** use *Convert* (low/zero spread).
- **Kraken:** trade the **USDC/EUR** pair with a limit order to minimize the ~0.2-0.4% taker fee.

### Step 4 — Get your Polymarket Polygon deposit address
- Sign in to `polymarket.com` → **Deposit** → **Deposit Crypto**.
- It shows your **Polygon USDC deposit address** (`0x…`).
- **Copy it with the copy button. Never type it.**

### Step 5 — Withdraw USDC from the CEX on POLYGON — do a TEST first ⚠️
This is the step that loses money if you get it wrong.
- CEX → Withdraw → USDC → **select network = Polygon (PoS) / chain ID 137**.
- **NOT** Ethereum/ERC-20 (exchanges often default to this — it costs $5-25 gas AND is the wrong chain = lost funds).
- **NOT** Base, Arbitrum, Optimism, or Solana.
- Paste the Polymarket address (from Step 4). **Verify the first 6 and last 6 characters** match.
- **Send a small TEST first: 20-50 USDC.**
- Confirm it appears as **pUSD** in Polymarket (usually <1-2 min on Polygon).
- **Only then send the rest.**
- Note: Kraken's 2026 "Unified EVM Deposit Methods" changed the network-selection UI — don't rely on old screenshots; confirm the selector reads Polygon before sending.

### Step 6 — Do NOT pre-buy POL/gas
Polymarket's 2026 stack is **gasless for users** (a relayer pays gas) and auto-wraps USDC → pUSD 1:1. You do **not** need MATIC/POL. Ignore older guides telling you to hold $2-5 of POL.

---

## Fees & timing summary

| Leg | Cost | Timing |
|---|---|---|
| Revolut → CEX (SEPA) | €0 | Minutes (SEPA Instant) to 1-2 business days |
| EUR → USDC on CEX | ~0% (Coinbase Convert) to ~0.2-0.4% (Kraken taker) | Instant |
| USDC withdraw on Polygon | **Coinbase: free** · Kraken: small flat fee · Polygon gas: fraction of a cent (paid by CEX) | Seconds to ~1-2 min |
| USDC → pUSD on Polymarket | Free, gasless, auto-wrap | Near-instant |
| **Revolut-direct crypto send (avoid)** | ~£3 flat service fee + negligible Polygon gas | Capped at ~£1,000/month |

**Cheapest reliable route = Revolut SEPA → Coinbase → USDC on Polygon → Polymarket.** Effectively just the tiny EUR→USDC spread; on-chain leg free on Coinbase.

---

## Risk table (deposit leg)

| Risk | Severity | Mitigation |
|---|---|---|
| **Wrong network** (Ethereum/Base/Arbitrum/Solana instead of Polygon) = permanent, irreversible loss | High | Explicitly select Polygon (PoS, chain 137); copy-paste address; verify first/last 6 chars; **always do a 20-50 USDC test first** |
| Revolut-direct caps (~£1k/month) throttle a $1-3k bankroll to a multi-month drip; Polygon send may not be enabled on your plan | Medium | Use the CEX route; treat Revolut as the €0 SEPA rail only |
| CEX flags/holds a withdrawal to a fresh address or asks AML questions | Low | Expect a possible first-withdrawal hold/2FA/whitelist step; whitelist the Polymarket address in advance; keep the test-then-bulk pattern so a hold only hits the small test |
| USDC.e (bridged) vs native USDC confusion | Low | Polymarket wraps either to pUSD, but prefer **native USDC** on Polygon to avoid edge-case slippage |
| MoonPay/card in-app deposit silently forces full third-party KYC (ID+selfie) | Low | Skip MoonPay entirely; fund via USDC-on-Polygon through the CEX rail |
| VPN use freezes funds (not returned) | High | Never use a VPN/proxy/Tor; connect on a genuine Greek IP; keep IPs consistent |
| **Full DAC8 visibility** — the CEX reports your identity, wallet address, and volumes to AADE (in force Jan 1 2026) | Medium (disclosure/tax, not a deposit failure) | Assume total transparency. Keep clean records (dates, EUR in, USDC amounts, tx hashes, Polymarket address). Confirm tax treatment with a Greek accountant before scaling. |

---

## First-time test checklist (do this before committing the bankroll)

1. ☐ Confirm Greece loads `polymarket.com` on a plain Greek IP, no VPN.
2. ☐ CEX account KYC'd and funded with a small EUR amount via SEPA.
3. ☐ Converted a small amount to native USDC.
4. ☐ Copied Polymarket's Polygon deposit address (copy button, verified first/last 6 chars).
5. ☐ Withdrew **20-50 USDC on Polygon** from the CEX.
6. ☐ Confirmed it landed as **pUSD** in Polymarket.
7. ☐ Only after all of the above: send the rest.

Ideally, also run a small **round-trip** (deposit then withdraw a tiny amount back out to your CEX/bank) before committing real money — the off-ramp is where Greek payment-blocking and bank AML questions bite. (Covered in the withdrawal deliverable, but validate it early.)

---

## Confidence & open items (verify live)

- **High confidence:** cheapest route (Revolut SEPA → Coinbase → USDC-on-Polygon → pUSD); Polygon-only network rule; gasless/no-POL; pUSD auto-wrap; Coinbase free Polygon USDC withdrawal; DAC8 visibility of the CEX leg.
- **Medium/verify in-app:** whether Revolut GR exposes Polygon as a USDC network for external sends (sources conflict); exact Revolut EEA crypto caps (UK figures cited); Kraken's exact 2026 Polygon-USDC withdrawal fee; whether Coinbase EU applies a first-30-day withdrawal throttle to new accounts.
- **Separate deal-breaker (not this deliverable):** whether Polymarket remains legal/accessible for a Greek resident post-July-1-2026 (MiCA reverse-solicitation grey zone + Hellenic Gaming Commission unlicensed-gambling angle). Confirm before funding.

---

## For the accountant (deposit-side only)

- Does moving my own EUR → USDC → self-controlled Polymarket wallet create any **taxable event on the deposit side** (before any winnings)? (My understanding: no — confirm.)
- Is the **EUR→USDC conversion** itself a taxable disposal under Greek rules, or tax-neutral because USDC is a 1:1 stablecoin?
- At $1-3k hobby scale, individual (E1) vs routing through Innova/μπλοκάκι — which does the deposit/withdrawal paper trail best support, and does business-booking create VAT/activity-code problems?
- What records does AADE expect me to retain for the on-ramp (CEX statements, on-chain tx hashes, Polygon deposit address, EUR-in bank references), and for how long?

---

## Sources

**Revolut / Polygon capability & limits**
- https://help.revolut.com/en-GR/help/wealth/cryptocurrencies/transferring-cryptocurrencies/depositing-cryptocurrencies/what-network-should-i-use-for-my-crypto-deposit/
- https://help.revolut.com/business/help/currency-exchange-crypto-and-savings/crypto-deposits/supported-crypto-deposit-currencies-networks-and-exchanges/
- https://help.revolut.com/help/wealth/cryptocurrencies/transferring-cryptocurrencies/withdrawing-cryptocurrencies/crypto-withdrawal-basics/what-are-the-limits-on-crypto-withdrawal/
- https://help.revolut.com/help/wealth/cryptocurrencies/transferring-cryptocurrencies/withdrawing-cryptocurrencies/crypto-withdrawal-basics/how-much-does-it-cost-to-withdraw-crypto/
- https://polygon.technology/blog/revolut-integrates-polygon-for-payments-trading-and-staking-processing-690m-to-date
- https://www.coindesk.com/business/2025/11/18/revolut-enlists-polygon-for-stablecoin-remittances-in-uk-and-eea
- https://coinspot.io/en/reviews/revolut-crypto-wallet/ (stale "Ethereum-only" claim, flagged)

**CEX route (Coinbase / Kraken) + SEPA**
- https://cryptostartnow.com/sepa-kraken-deposit/
- https://blog.kraken.com/product/fund-your-account-in-minutes-with-sepa-instant-transfers-eur-only
- https://blog.kraken.com/product/dai-usdc-and-usdt-deposits-and-withdrawals-available-on-the-polygon-network
- https://support.kraken.com/articles/native-usd-coin
- https://help.coinbase.com/en/international-exchange/trading-deposits-withdrawals/network-fees
- https://www.coinbase.com/blog/send-and-receive-crypto-on-multiple-networks-starting-with-polygon-and-solana

**Polymarket deposit / pUSD / network safeguards**
- https://help.polymarket.com/en/articles/14762452-polymarket-exchange-upgrade-april-28-2026
- https://docs.polymarket.com/trading/bridge/deposit
- https://www.copytradeinsider.com/blog/how-to-deposit-usdc-on-polymarket/
- https://www.frenflow.com/blog/how-to-deposit-on-polymarket
- https://www.blog.bim.finance/en/what-is-polymarket-usd-pusd-guide-upgrade/

**DAC8 reporting (deposit leg visibility)**
- https://taxdo.com/resources/blog/carf-greece-casp-rfi-compliance-guide-2026
- https://taxation-customs.ec.europa.eu/taxation/tax-transparency-cooperation/administrative-co-operation-and-mutual-assistance/directive-administrative-cooperation-dac/dac8_en
- https://finance.yahoo.com/news/revolut-secures-mica-license-cyprus-160103192.html

---

*Verified as of 2026-07-01. Not legal or tax advice. Confirm Greece-specific legality and tax treatment with a licensed Greek lawyer/accountant before funding.*