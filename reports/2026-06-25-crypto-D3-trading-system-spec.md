# D3: Trading System Spec (v0.1)

A written, testable ruleset you can run by hand in 1-2h/day right now, and automate piece by piece later. Every rule is phrased as if/then so it can become a code check.

## Read this first (honest framing)
- Memecoins are negative-EV for most participants. ~98% of pump.fun launches fail; most traders lose. A ruleset does not manufacture an edge, it cuts variance and tilt and makes your results measurable so you can find out if you actually have one.
- Your -10% is almost certainly an EXIT/SIZING leak, not a pick leak. Round-tripping winners (10x to 2x to break-even) is the #1 documented profit drain. This spec attacks that first.
- Your real edge is INFORMATION + SYSTEM on an async cadence (alert -> quick decision), not speed/sniping. Everything here respects $1-3k bankroll, 1-2h/day, no screen-babysitting.
- The exact numbers below (multiples, %, thresholds) are STARTING HYPOTHESES from 2026 sources, not validated for your style. The v0.1 job is to log outcomes and tune them, not to trust them.

---

## 1. Position Sizing (the real stop-loss)
On-chain stops slip badly on illiquid coins (a nominal -30% can fill far worse; documented $5.7M slippage loss). So your stop IS your size: assume every position can go to zero.

**Rules (fixed-fractional, phase 1):**
- `MAX_RISK_PER_TRADE = 1.0-1.5%` of bankroll, treating the full position as at-risk. On $2k that's ~$20-30/trade.
- `MAX_SINGLE_COIN = 5%` of bankroll.
- `MAX_CONCURRENT_OPEN = 5-10` positions. Diversify across many small bets; never concentrate.
- `POSITION_SIZE <= X% of pool LP` so your own exit can't tank the price. No clean source formula; tune X from your fills (start conservative: if a $5k buy moves the chart >5%, the pool is too thin for your full size).
- Fee reality: ~3-7% round-trip (protocol ~1.25%/side + terminal ~0.75-1%/side + priority + slippage + MEV). On a $20-30 trade this is a heavy tax. **A winner must clear ~+10% just to break even.** Bias to fewer, higher-conviction trades. Every expectancy calc must be NET of fees or it lies to you.
- Kelly is NOT a starting tool. You can't compute it until 50-100 logged trades. Use flat 1-1.5% now; later use quarter-Kelly at most; a negative Kelly = no edge, stop.

**Maps to automated check:** `risk_amount = bankroll * 0.015`; reject order if `order_size > bankroll * 0.05` or if `open_positions >= 10` or if `order_size > pool_lp * X`.

---

## 2. Entry Filter (two lists, run on every candidate)
Filters REDUCE loss (one study: ~56% fewer simulated losses), they do not make a coin a buy. The NO-gate is a kill-filter; the YES-checklist is for post-graduation entries.

### NO-GATE (any one true = reject, no debate)
- [ ] Mint authority NOT revoked (infinite supply risk)
- [ ] Freeze authority NOT revoked (they can lock your wallet so you can't sell)
- [ ] LP not locked/burned (verify LP tokens at burn address `1111...` or a timelock with real unlock date). N/A for pure pump.fun-curve tokens (no pullable LP, but insider dumping risk instead)
- [ ] Honeypot: buy-then-sell simulation via Jupiter returns no sell quote / nonsensical output
- [ ] Token-2022 sell tax > 0 OR tax is mutable OR a transfer hook is present (can impose 99% sell tax / block sells)
- [ ] Top-10 holders > 40% of supply
- [ ] Largest connected wallet CLUSTER > 15-20% (per-wallet % misses bundles; check the cluster, not the address)
- [ ] mcap/liquidity > 50x (manipulation signal)
- [ ] Liquidity < ~$100k
- [ ] Bundle % / sniper % over your cap (set a starting cap, tune from your log)

### YES-CHECKLIST (post-graduation entries; want most of these true)
- [ ] Dev wallet < 5% of supply, with a public allocation explanation
- [ ] Unique holder COUNT organically rising (not airdrop-farm wallets)
- [ ] Smart-money wallets accumulating across days AND holding through dips
- [ ] Fits a meme family with multi-week tailwinds (see section 5)
- [ ] Listed on 3+ discovery surfaces (DexScreener, Birdeye, DexTools) within 48h of graduation

**Decision rule:** NO-gate must be 100% clean. Then YES-checklist + narrative state. On-curve = max insider risk (survivability filters matter most); post-graduation = cleaner but later. Pick one lane and stay consistent while testing.

**Maps to automated check:** RugCheck free API (`GET /tokens/{mint}/report/summary`, no key) auto-rejects on the score's structured risk flags (gate on the flags, not the opaque composite score; use `score_normalised` if you use any score). Add a Jupiter buy/sell sim. Cluster check stays manual via Bubblemaps (free top-150 view) for now.

---

## 3. Exit / Take-Profit Ladder (the core fix)
Pick ONE ladder, write the exact %/multiples, enter them as resting orders at entry time, never freelance. This is survival/consistency-biased and deliberately sacrifices some tail upside, which is the right trade for a -10% trader with no system.

**Default ladder (starting hypothesis):**
- Sell **50% at 2x** (recovers initial = now playing house money, kills loss aversion)
- Sell **25% of the remainder at 5x**
- Sell **25% of the remainder at 10x**
- Keep a **5-10% moonbag** with a **trailing stop** behind peak

**Trailing stop:** the cited 20-30% fixed trail is likely too tight for memecoin volatility (gets stopped by noise). Start at the wider end (~30%) and move toward a volatility-based trail as your log tells you. Hard-coded trail beats the discretionary "first major red candle, exit fully" rule, encode it as a mechanical trail to actually kill freelancing.

**Caveats:** in thin pools the 5x/10x limit sells may not fill cleanly. Size small enough (section 1) that your own exit doesn't tank price. Test fills on small live trades before trusting automation. Average winning Solana memecoin trade resolves in <4h, so place all TP/stop orders AT ENTRY and let it resolve whether or not you're at the screen.

**Maps to automated check:** Axiom natively supports resting limit TP orders + trailing stop-loss (the "sell 50% at 2x, rest at 5x" pattern is exactly what it markets). Encode the ladder + trailing moonbag as resting orders at entry. Treat stops as protection against ordinary fades only, they fail on rugs/illiquid dumps; avoiding low-liquidity tokens is the only fix for that.

---

## 4. Exit-Trigger Checklist (async alert layer)
Any single HARD on-chain trigger = exit the moonbag NOW (market sell), no waiting to confirm. Weight on-chain signals over RSI/social (those are confirmation only).

**HARD (on-chain, weight high):**
- LP dropping while price holds = devs cashing out (slow rug)
- A single wallet / new cluster distributing into retail = distribution phase
- Smart-money / tracked wallets selling
- Holder growth stalling or declining despite rising price (wash trading)

**SOFT (confirmation only, weight low):**
- RSI > 90 on 15m/1h + parabolic 500-1000% with zero pullbacks = exhaustion
- Celebrity/mainstream/CT-influencer promotion peaking = exit-liquidity creation (sell INTO it, don't chase)
- Community shifts from memes to price-target talk
- Social mentions peaking

**Honest limit:** "LP pulled" as an alert is a weak rug shield, the fastest rugs crash 95-99% in seconds before the alert fires. Rug protection comes from the section 2 PRE-entry filters, not from exit alerts. This checklist's real value: turning "when do I sell" into a non-emotional rule.

**Maps to automated check:** wallet/holder/LP push alerts via Cielo (free, 10 Solana wallets, Telegram), Axiom alerts, or a Helius webhook -> Telegram. The automatable triggers are tracked-wallet sells + holder-concentration changes.

---

## 5. Narrative / Meta State (entry context, async)
Don't ask "is this coin good," ask "which meta is running, early or late, does this coin fit it." Category-level data leads coin moves by hours-days, and it's slower-moving (1-3 weeks), which fits your time budget.

**Meta-state rules (starting hypotheses, paper-track before trusting):**
- Family 7d positive + 24h positive = still trending, OK to enter the strongest 1-2 names
- Family 7d positive + 24h flat/negative = mid-rotation, move mostly done, skip
- #2-ranked family +15% 7d but flat 24h = contrarian rotation target (front-run the pivot)
- Family leader > +25% 7d = ~two-thirds of move done, rotation imminent, don't chase

**Death signals (reduce size / sit out, don't rotate into laggards):**
- Family 24h AND 7d both negative + dominance dropping
- Leader failing new highs on rising volume
- CT sentiment flipping to capitulation
- Stablecoin share of network flow rising (risk-off)

**Sources hierarchy (demote YouTube, it's the laggiest):** cultural source (TikTok/Reddit; 4chan noisiest, lowest yield) -> curated CT/X list -> on-chain wallet clusters. Treat narrative tools (Sharpe.ai tracker, LunarCrush free) as one input each, NOT validated edge, their published rotation rules are vendor heuristics with no backtest shown.

---

## 6. Anti-Tilt Rules (enforcement via wallet, not willpower)
Willpower fails. Hard-code these structurally.
- No entry without a pre-written exit (TP ladder + trailing stop entered as actual orders).
- `MAX_TRADES_PER_DAY = N` (set a number, e.g. 3-5).
- Mandatory cooldown timer after any loss before next entry.
- Never average down a loser (disposition effect: holding losers is the documented retail killer).
- **Primary enforcement:** only fund the trading wallet with the day's/week's risk allowance. Keep the rest in a separate wallet / cold storage. The wallet balance IS the daily-loss limit.

**Maps to automated check:** wallet-funding discipline + Axiom per-trade and daily spend caps. (No reliable daily-loss lockout exists, so wallet funding is the real lever.)

---

## 7. Trade Journal (the data gate)
Log the first 50-100 trades before scaling size or automating. Dead-simple spreadsheet/Notion, not an app.

**Log per trade:**
- Token, entry mcap/liquidity, date/time
- Position size ($ and % of bankroll)
- Which entry lane (on-curve / post-graduation) and which YES-checklist items hit
- Narrative family + meta state at entry
- Exits (each tranche %/multiple), which exit rule fired
- **R-multiple** (profit/loss as a multiple of intended risk-per-trade, defined off your risk-capital, not a tight stop, since memecoins go to ~0)
- Fees paid (round-trip), so PnL is net
- Outcome notes: did the death-signals fire before the dump? Did I follow my rules?

**Compute after the sample:** realized win-rate, avg win, avg loss, expectancy net of fees. Target portfolio avg win >= 3x avg loss. **If avg win < avg loss, the leak is your EXITS, not your entries.** Treat 1-month / handful-of-trades as PROCESS validation (did I follow rules, did signals work), not statistical proof, you won't get 100 clean samples in a month.

**Maps to automated check:** Solana Tracker (free, own-wallet realized + unrealized PnL) feeds the numbers; the log records the decisions.

---

## 8. Daily Workflow (1-2h, async)
1. **Meta scan (~15 min):** check narrative tracker + LunarCrush free for which families are running / dying (section 5). Note meta state.
2. **Alert triage (~20-30 min):** review overnight Cielo/Axiom pings from tracked wallets. For each, run the NO-gate (RugCheck + Bubblemaps + Jupiter sim, ~30s each). Reject most.
3. **Decide on survivors (~15 min):** YES-checklist + narrative fit. If it passes and you're under MAX_CONCURRENT and MAX_TRADES_PER_DAY: size per section 1, enter, immediately set the TP ladder + trailing stop as resting orders.
4. **Manage open positions (~10 min):** check exit-trigger checklist (section 4) for any hard on-chain trigger -> exit moonbag. Otherwise let resting orders work.
5. **Journal (~10 min):** log every closed trade and every alert you acted on (section 7).
6. **Weekly:** re-vet the tracked-wallet list (prune stale/cold wallets, add new proven ones), sweep profits from hot wallet to cold storage.

---

## 9. Security baseline (non-negotiable)
- **Three-tier wallets:** Ledger cold vault (never touches a memecoin contract) -> Phantom funding wallet -> Axiom/Phantom hot wallet funded only with this week's risk capital.
- **Back up the Axiom 12-word phrase offline today** (it lives in browser local storage; clearing data or a browser compromise = total loss). 3-2-1 backup, never digital.
- **Pre-buy:** RugCheck on every token (also covered by section 2). Never buy a surprise airdrop.
- **At sign-time:** read Phantom's transaction simulation; reject any "approve all tokens" / broad-scope signature.
- **Monthly:** revoke approvals (Famous Fox / Revoke.cash via bookmarked domains), disconnect unused dApps, update firmware, malware scan.
- **Address poisoning:** never copy a destination from tx history; verify full address; test-send before large transfers.
- **Never** paste a seed into any "auto-trading" bot that isn't client-side non-custodial; never run a random GitHub trading bot with your keys (SlowMist-documented wallet drainers).

---

## 10. Automation roadmap (build the edge, then automate it)
- **Exits FIRST, immediately:** encode the section 3 ladder + trailing moonbag as resting Axiom orders. Near-zero setup, removes the in-the-moment decision (your biggest leak). Use a dedicated burner wallet. Budget real net fees (~1.5-2% bot fees alone, not 0.5%).
- **v0.1 (~1 month):** free stack as instrumentation, NOT blind copy-trade. Kolscan (discover wallets) -> Cielo free (alerts on 10 vetted wallets) -> RugCheck + Solsniffer + Bubblemaps (manual NO-gate) -> Solana Tracker (own PnL) -> trade log. Alert -> manual decision. Log everything.
- **v0.2 (~3 months):** if logged data shows positive expectancy net of fees: add Bitquery near-graduation stream alerts on NO-gate-passing tokens; consider one-tap (human-approve) execution. Helius webhook -> Telegram is the cheap DIY backbone.
- **Full unattended auto-exec: LAST, maybe never** at this size. Dangerous (sandwiching, slippage blowouts, no margin). Only after the manual edge is proven, with hard caps.

**Tool trust flags (be skeptical):**
- **Axiom** (your terminal): Feb 2026 ZachXBT exposed employees using internal dashboards to de-anonymize and front-run users (~$400k, unresolved). Non-custodial so keys are safe, but assume the platform sees your activity; keep size modest, don't trust its in-app "smart money." Real fees ~0.75-0.95%/side, not 0.5%.
- **Kolscan:** owned by pump.fun (conflict of interest; leaderboard is gameable, PnL flagged as sometimes inaccurate). Free now (old 100k-token gating is stale). Use for discovery + cluster signals, NOT single-wallet copy. Don't buy the $KOLSCAN token.
- **GMGN:** features real but copy-trade is likely negative-EV at your size (latency + you become exit liquidity + ~2% round-trip). Use for tracking/learning only. Heavily affiliate-shilled; Nov 2025 phishing clones drained $700k+, use only gmgn.ai with a burner.
- **Cielo:** legit, read-only (no key access). Free = 10 Solana wallets. Pay only after the free tier proves edge.
- **Bitquery / RugCheck / Bubblemaps:** legit, independent, not shilled. Free tiers work for your volume; code reconnect logic for Bitquery streams.
- **Paid Telegram "alpha caller" groups: AVOID.** Documented coordinated dumps onto subscribers (Solidus Labs "PumpCell"). By the time you get the call you're exit liquidity, fatal for an async trader. "Best group" listicles are affiliate content.
- **Sniper bots / volume bots: AVOID.** Speed isn't your edge; volume bots are manipulation tooling.

---

## Sources
**Exit / sizing / risk:**
- https://tradetron.tech/blog/timing-the-trade-why-entry-and-exit-rules-matter-in-crypto
- https://www.merlincrypto.com/blog/why-crypto-investors-cant-sell-the-psychology-behind-missed-exits
- https://www.stratiumsol.com/blog/risk-management-memecoin-trading-solana
- https://www.gate.com/learn/articles/playing-meme-coins-the-strategy-and-path-from-a-few-hundred-u-to-a-million-u/8645
- https://medium.com/@fxmbrand/the-ultimate-guide-to-memecoin-entry-and-exit-strategies-how-to-time-the-market-for-maximum-9bad76d015ed
- https://news.slashdot.org/story/24/01/15/1555226/trader-loses-57-million-to-slippage-in-memecoin-trade
- https://www.altrady.com/blog/risk-management/kelly-criterion-crypto-position-sizing
- https://www.quantifiedstrategies.com/fixed-fractional-position-sizing/
- https://news.bitcoin.com/report-exposes-98-6-of-solana-meme-coins-on-pump-fun-as-fraudulent/
- https://axiompro.app/auto-sell/ , https://axiompro.app/limit-orders/

**Entry / on-chain filtering:**
- https://arxiv.org/html/2602.13480v1 (MemeTrans study)
- https://nansen.ai/post/solana-token-analysis-complete-framework-for-evaluating-tokens-in-2026
- https://blog.bubblemaps.io/how-to-analyze-meme-coin-holders-with-bubblemaps/
- https://defade.org/blog/solana-memecoin-insider-networks
- https://rugcheck.xyz/ , https://www.solsniffer.com/
- https://www.dextools.io/tutorials/how-to-trade-solana-meme-coins-safely-using-on-chain-tools
- https://moby.win/learn/pumpfun/
- https://docs.bitquery.io/docs/blockchain/Solana/Pumpfun/Pump-Fun-Marketcap-Bonding-Curve-API/

**Narrative / meta:**
- https://www.sharpe.ai/learn/memecoin-narrative-tracker
- https://www.dlnews.com/articles/people-culture/mog-coin-memecoin-soars-after-4chan-mogging-meme-blows-up/
- https://lunarcrush.com/
- https://learn.backpack.exchange/articles/memecoin-market-crash-dead-or-bounce
- https://cointelegraph.com/news/pump-fun-memecoins-are-dying-at-record-rates-less-than-1-survive

**Tooling / network / security:**
- https://coinbureau.com/review/axiom-trade-review
- https://www.coindesk.com/markets/2026/02/26/zachxbt-alleges-axiom-employee-conducted-insider-trading
- https://cielo.finance/ , https://docs.cielo.finance/
- https://kolscan.io/ , https://www.coindesk.com/markets/2025/07/11/pumpfun-acquires-wallet-tracker-kolscan-to-expand-onchain-trading-tools
- https://docs.gmgn.ai/index/gmgn-fees-settings , https://www.pcrisk.com/removal-guides/33299-fake-gmgn-website-scam
- https://www.helius.dev/blog/build-a-wallet-tracker-on-solana
- https://www.coindesk.com/business/2025/12/09/telegram-ring-ran-pump-and-dump-network-that-netted-usd800k-in-a-month-solidus-labs
- https://slowmist.medium.com/threat-intelligence-an-analysis-of-a-malicious-solana-open-source-trading-bot-ab580fd3cc89
- https://www.kerberus.com/learn/crypto-wallet-hygiene-guide-2026/
- https://www.ledger.com/academy/topics/security/crypto-wallet-security-checklist-protect-crypto-with-ledger
- https://www.soliduslabs.com/reports/solana-rug-pulls-pump-dumps-crypto-compliance