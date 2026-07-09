# C2: Deposit Playbook — Money IN (Revolut → Solana → Phantom/Axiom)

**Context:** Greece-resident individual, self-custody Phantom + Axiom terminal, Standard Revolut, ~$1-3k bankroll, funding Solana memecoin trading. **This is NOT legal or tax advice.** Tax-classification and unexplained-wealth items are routed to a Greek accountant at the end.

## TL;DR

- **The deposit leg is GREEN and legal.** Buying spot SOL/USDC on a MiCA-licensed CASP and self-custodying into Phantom is standard, permitted activity for a Greek resident. This is the sharp contrast with the Polymarket sibling case, where the deposit funded an HGC-blacklisted illegal-gambling platform. No platform-legality problem here, no payment-blocking.
- **You do NOT strictly need a CEX anymore.** Since 3 Dec 2025 Revolut does the full on-chain Solana leg itself (native SEND of SOL/USDC/USDT over Solana), under its Cyprus MiCAR license. So the minimal path can be Revolut-only. **But verify the "send to external wallet" toggle is actually enabled in YOUR Greek Standard app before relying on it** (per-country feature gating exists).
- **Cheapest reliable route for repeated funding: Revolut EUR → free SEPA → Kraken → buy SOL (limit order) → withdraw SOL over Solana → Phantom.** Cost on $2k ≈ $5-8 vs ~$30-60 Revolut-only.
- **Prefer USDC** (Circle, MiCA-compliant EMI) over USDT (facing EU delisting) if you hold a stable buffer. But **fund primarily in SOL** — Axiom memecoin buys are quoted/settled in SOL and every trade burns SOL for gas.
- **Deposit direction is clean on AML.** "Tainted funds" risk lives on the way OUT (memecoin proceeds hitting a CEX later), not on this clean fiat → CASP → fresh SOL/USDC → your wallet leg.
- **AADE sees everything.** DAC8 / Greek Law 5301/2026 is live (data collection from 1 Jan 2026). Revolut and Kraken report your identity, wallet addresses and volumes. Keep every receipt as documented source-of-funds.

---

## Which route: can Revolut do the Solana leg itself?

**Yes — as of 3 Dec 2025.** Revolut Digital Assets Europe Ltd (RDAEL, Cyprus MiCAR/CASP license) supports native on-chain send/withdraw of SOL, USDC and USDT over the Solana network, EU-wide. Before that date SOL was trade-only (no withdrawals). This supersedes the older assumption that a CEX intermediary was mandatory.

**But two caveats keep Revolut from being the default:**
1. **Feature-gating uncertainty:** announced EU-wide via the Cyprus license, but per-country gating exists. Confirm the "Transfer to external wallet" toggle is live for your Greek Standard account in-app before depending on it.
2. **Cost:** the Revolut Standard *buy* leg is expensive (see below).

So: **Revolut-only = simplest, use for convenience/small top-ups.** **Revolut → Kraken → Phantom = cheapest, use for repeated funding.**

---

## Cost comparison ($2k buy)

| Route | Buy fee | Withdrawal/network fee | Approx total in-cost on $2k |
|---|---|---|---|
| **Revolut-only** | 1.49%/side + up to ~3% spread | £1-equiv (SOL) or £3-equiv (USDC) + sub-cent Solana fee | **~$30-60** |
| **Revolut → Kraken** (recommended) | 0.25% maker (limit order) / 0.40% taker on Kraken Pro | Solana network fee <$0.01 (Kraken adds little/none) | **~$5-8** |
| Coinbase EU alternative | Higher simple-flow fees than Kraken Pro | USDC withdrawals FREE (Coinbase covers Solana fee) | Between the two |

For a $1-3k bankroll topped up repeatedly, **Kraken Pro with a limit order is the cheapest reliable choice.**

---

## OPTION A — Revolut-only (simplest, one app)

Best if you value simplicity over cost and fund infrequently.

1. **Verify first:** open Revolut → Crypto → your SOL asset → confirm a "Send" / "Transfer to external wallet" option exists for your Greek account. If it's missing/gated, use Option B.
2. In Revolut → Crypto → **buy SOL** (fee 1.49% + spread on Standard).
3. Open the asset → **Send / Transfer to external wallet**.
4. **Select the SOLANA network** (not Ethereum, not Polygon).
5. Paste your **Phantom Solana receive address**.
6. Confirm. Service fee ~£1-equiv (SOL) + sub-cent Solana network fee. Settles in seconds.

---

## OPTION B — Revolut → Kraken → Phantom (cheapest, recommended for repeated funding)

1. In Revolut, hold **EUR**.
2. **SEPA transfer EUR** to your Kraken EUR deposit IBAN. Free; arrives minutes to ~1 business day.
3. On **Kraken Pro**, place a **LIMIT buy for SOL** (pays the 0.25% maker side). Use USDC instead only if you want a stable parking buffer.
4. Kraken → **Withdraw → SOL → select SOLANA network** → paste Phantom address. Near-zero fee, settles in seconds.

**Timing bottleneck is NOT the blockchain.** Solana settles in seconds. The delays are (a) the SEPA hop (minutes to ~1 business day) and (b) any first-time/large-withdrawal KYC/AML review hold.

---

## Non-negotiable safeguards

### 1. Test transaction first (every new address)
Before moving the full amount, send **~0.05 SOL (or a few USDC on Solana)** to your Phantom address, confirm it lands, then send the rest. Never skip this on a first send to a new address.

### 2. Network selection = Solana / SPL, every time
This is the #1 way to lose money on the deposit leg. USDC/USDT exist on many chains. For Phantom + Axiom you need **SPL tokens on the SOLANA network**. Sending ERC-20 (Ethereum), Polygon, or BSC USDC to a Solana address = **funds effectively lost, irreversible.** Triple-check the network dropdown reads **Solana** on every withdrawal.

### 3. Keep native SOL for gas
Every Solana transaction and every Axiom trade pays fees + priority fees in **native SOL, not USDC**. If you deposit only USDC you literally cannot transact. Keep **~0.05-0.1 SOL** untouched as gas. Practical approach: fund primarily in SOL (Axiom buys are quoted in SOL anyway); if you also want a USDC buffer, send it as SPL USDC in a separate transfer and still keep a SOL gas reserve.

### 4. Which stablecoin: USDC, not USDT
If you hold a stable buffer, use **USDC** (Circle, MiCA-compliant EMI). USDT faces EU delisting pressure (Coinbase/Kraken already delisted it for EEA retail), which can complicate the compliant cash-out path later. For the deposit leg, USDC on Solana is the clean choice.

### 5. Pre-fund and pre-whitelist ahead of time
First-time or large sends to a new external address can trigger a short KYC/AML review hold. Don't rely on same-minute funding for a hot memecoin entry — get SOL sitting in Phantom in advance.

---

## Risk table (deposit leg)

| Risk | Severity | Mitigation |
|---|---|---|
| Wrong-network withdrawal (ERC-20/Polygon USDC to a Solana address) — irreversible loss | **High** | Explicitly select SOLANA (SPL) every send; test transfer first; confirm receipt in Phantom before sending the balance |
| Funding only USDC, unable to trade (no SOL for gas) | Medium | Always hold ~0.05-0.1 SOL; fund primarily in SOL |
| Revolut native Solana withdrawal is new (Dec 2025); historic reputation for opaque holds; limits are account-specific and can tighten without notice | Medium | Don't make Revolut-native your only rail; keep a Kraken account as backup; test small; verify the feature is live in your GR app |
| First-time/large withdrawal to a new address triggers a KYC/AML review hold (timing risk) | Low | Pre-fund and pre-whitelist your Phantom address; don't rely on same-minute funding |
| Higher-than-necessary cost from defaulting to Revolut-only buys (1.49% + ~3% spread/side) | Low | Use Kraken Pro limit orders (0.25% maker) when cost matters; reserve Revolut for small top-ups |
| DAC8 visibility — AADE receives identity, wallet addresses, volumes from all EU CASPs | Low | Not avoidable, not a deal-breaker; keep clean records so reported inflows are fully documented |

---

## Records to keep (cheap insurance for AADE / Art 21 §4 unexplained-wealth)

Whichever rail you use, **AADE sees the deposit** — DAC8 / Law 5301/2026 is live. Save from day one:
- Screenshot of each **buy** (Revolut or Kraken).
- Each **withdrawal with tx hash**.
- The **SEPA statement** (clean EUR → CASP trail).
- The **Phantom address** you funded, so the audit trail matches DAC8 reporting.

This documented chain (clean EUR → CASP → self-custody) is your defense against an Art 21 §4 L.4172/2013 unexplained-wealth reassessment (~33% + up to 50% penalty on undocumented inflows) if AADE ever queries the crypto inflows. Legal to trade, but you must be able to explain every euro.

---

## vs Polymarket (deposit leg)

- **Legality:** buying spot SOL/USDC on a MiCA-licensed CASP and self-custodying is standard, permitted activity. Polymarket's deposit funded an HGC-blacklisted illegal-gambling platform. No platform-legality problem on the money-in leg here.
- **Payment-blocking:** none. Polymarket faces winnings/payment blocking; buying crypto on a regulated CASP does not.
- **Rails/control:** Polymarket forces USDC on Polygon tied to a specific illegal venue; here you choose SOL/USDC on Solana into your **own** wallet, no third-party custodian.
- **Bonus:** unlike Polymarket, Revolut itself can now do the entire fiat → on-chain leg in one regulated app. No sketchy intermediary needed.
- **Carry-over caveat:** the AML "tainted funds" danger is real but sits on the **withdraw-OUT** leg (memecoin/DEX-sourced funds hitting a CEX later), not on this clean deposit-IN leg. See the C-series withdrawal playbook.

---

## For the accountant (deposit-specific)

1. Is the SEPA → CASP → SOL deposit chain sufficient documented "source of funds" to defend against an Art 21 §4 L.4172/2013 unexplained-wealth reassessment? Exact records to retain (bank statements, exchange CSVs, tx hashes)?
2. Does the DAC8 data AADE receives from Revolut/Kraken (identity + wallet address + volumes) need to be pre-emptively reconciled on my E1, or only if they query?
3. For a ~$1-3k bankroll funded in tranches, is there any per-transfer or cumulative annual threshold at which the deposit activity itself becomes a reporting / pothen-esches concern independent of any trading gains?
4. Confirm there is no Greek-side restriction on an individual buying crypto on a MiCA CASP and self-custodying (believed none — unlike Polymarket — but confirm).

---

## Open items to verify live (before relying on them)

- Is Revolut's native Solana external-withdrawal toggle actually enabled for **Greek Standard** accounts specifically? (Announced EU-wide, but per-country gating exists — confirm in-app.)
- Exact current Revolut crypto withdrawal daily/monthly limits for a Greek Standard account (public figures like £500/day, £1,000/month are stale; only visible in-app).
- Precise Kraken SOL and SPL-USDC withdrawal fees/minimums as shown at the confirmation screen in 2026 (network fee <$0.01, but confirm Kraken-added amount live).
- Whether Coinbase EU's free-USDC-withdrawal policy still applies to the Solana network for Greek accounts in mid-2026.

---

## Sources

**Revolut native Solana withdrawals / fees / limits**
- https://help.revolut.com/help/wealth/cryptocurrencies/transferring-cryptocurrencies/withdrawing-cryptocurrencies/crypto-withdrawal-basics/what-cryptocurrencies-are-available-for-sending-to-external-wallet/
- https://yellow.com/news/revolut-adds-solana-payments-transfers-and-staking-for-65-million-users
- https://www.cryptopolitan.com/revolut-adds-support-for-solanas-network/
- https://www.revolut.com/en-GR/legal/standard-fees/
- https://help.revolut.com/help/wealth/cryptocurrencies/transferring-cryptocurrencies/withdrawing-cryptocurrencies/crypto-withdrawal-basics/how-much-does-it-cost-to-withdraw-crypto/
- https://www.datawallet.com/crypto/revolut-crypto-fees
- https://help.revolut.com/help/wealth/cryptocurrencies/transferring-cryptocurrencies/withdrawing-cryptocurrencies/crypto-withdrawal-basics/what-are-the-limits-on-crypto-withdrawal/

**Kraken / Coinbase fees, Solana network, withdrawals**
- https://www.kraken.com/features/fee-schedule
- https://support.kraken.com/articles/360000767986-cryptocurrency-withdrawal-fees-and-minimums
- https://blog.kraken.com/product/kraken-now-supports-deposits-and-withdrawals-of-usdc-via-the-solana-and-tron-networks
- https://help.coinbase.com/en/international-exchange/trading-deposits-withdrawals/how-do-i-withdraw-funds

**Network selection / gas / USDC-on-Solana**
- https://eco.com/support/en/articles/14998917-usdc-on-solana-second-largest-usdc-chain-explained
- https://web3.bitget.com/crypto-news/revolut-crypto-transfer-to-external-wallet-guide
- https://www.circle.com/blog/how-to-send-usdc-to-phantom-wallet

**DAC8 / Greek Law 5301/2026 (AADE reporting)**
- https://www.solcrowe.gr/en/νόμος-5301-2026-φεκ-74-15-5-2026-σχετικά-με-τη-διοικητικ/
- https://help.revolut.com/help/wealth/cryptocurrencies/crypto-exchange/revolut-x-fees/

*Verdict for the deposit leg: GREEN, in sharp contrast to the CAUTION-leaning-NO-GO Polymarket picture. Not legal/tax advice; route the flagged tax items to a Greek accountant.*