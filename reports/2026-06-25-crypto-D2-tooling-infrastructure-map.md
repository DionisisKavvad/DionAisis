# D2 — Tooling & Infrastructure Map

For: Solana memecoin trader, $1-3k risk bankroll, 1-2h/day, async (alert → quick decision), cannot babysit screens. Speed/sniping is off the table. The only viable edge is **information + automation**: be on the fast side of the slow crowd, with mechanical rules.

This map ranks every verified tool by **value-for-effort under your exact constraints**, gives the honest verdict from verification (scam / risky / outdated / affiliate flags), and ties each one to the D3 system you're building (NO-gate entry filter, written exit ladder, synthetic wallet network, trade log, then automation). Bottom line up front: **your starting stack is $0/month.** Don't pay for anything until a free version proves it adds edge in your own trade log.

---

## How to read the verdicts

- **legit** — real, current (2026), works for your case. Use it.
- **risky** — real tool, but the framing oversells it or there's a material trust/cost/expectancy problem. Use only with the guardrails noted.
- Every tool below is **non-custodial or read-only** unless flagged. The two trust landmines to keep in mind across the whole stack:
  - **Axiom insider scandal (Feb 2026):** ZachXBT alleged Axiom employees used internal dashboards to de-anonymize users and front-run them (~$400k over 10+ months). Non-custodial, so funds weren't stolen, but **assume the platform can see your activity.** Unresolved.
  - **Affiliate contamination:** "best Solana bot 2026" listicles are systematically conflicted (BullX pays up to 35% lifetime fee commission; GMGN/Axiom run similar programs). Trust on-chain-verifiable data and primary docs, not rankings.

---

## Tier 1 — The free v0.1 stack (start here, this month, $0)

These five build the whole async loop: discover proven wallets → get a phone ping when they move → 30-second safety check → log it → measure expectancy. This IS the documented, testable manual edge before any spend or automation.

### 1. RugCheck.xyz (free API + web) — **legit**
- **What it does:** Pre-buy NO-gate. Free public REST endpoints (no key) return a 0-100 normalised risk score plus structured flags: mint authority, freeze authority, LP lock/burn, single-holder concentration, honeypot signals.
- **Cost:** Free. Independent, open-source wrappers exist. Not affiliate-shilled.
- **Value/effort:** Highest in the stack. The single most leverage-able automatable filter for an async trader.
- **Verdict notes:** Verified live. Two corrections: (a) gate on the **`score_normalised` (0-100, lower = safer)** field and on the **structured risk flags**, NOT the raw `score` (which is on a thousands scale and inverted) — keying off the wrong field makes the gate meaningless; (b) handle 429 rate-limits with backoff + caching (low-volume async use is fine). A clean score is NOT a buy signal, only "didn't trip obvious instant-rug tripwires." Necessary, not sufficient.
- **Serves D3:** This is the v0.1 automated NO-gate. The filter config file = your written entry ruleset.

### 2. Bubblemaps (freemium) — **legit**
- **What it does:** Visual cluster / insider-network check. Color-codes same-entity wallets and draws funding links, so you can sum a connected cluster's true control in ~30 seconds. Catches bundles (the dominant 2026 attack) that per-wallet holder lists miss. Has a dedicated pump.fun/Raydium bundle-detection view.
- **Cost:** Free map shows **top 150 holders only**; deeper holder lists / AI cluster scoring are paywalled (BMT token-hold or ~$10-100/mo). For sub-$50k microcaps, top-150 is usually enough.
- **Value/effort:** High. 30-second visual gut-check, fits medium on-chain skill.
- **Verdict notes:** A line means wallets share on-chain history (presales, CEX-funded snipers, whale transfers all draw lines), **not proof of same owner.** Interpret, don't auto-reject on color. The "<15% largest cluster = OK" rule is sane folklore, not a validated threshold.
- **Serves D3:** The manual cluster check that sits alongside the RugCheck NO-gate on every candidate.

### 3. Kolscan (free) — **legit** (with an ownership flag)
- **What it does:** Discover which wallets to track (the hard part of a synthetic network). Leaderboard ranked by **realized PnL / ROI / win-rate**, live trade feed, per-wallet token-level PnL. No wallet connection to browse.
- **Cost:** Fully free. The old "hold 100,000 $KOLSCAN" gating is **outdated** — Pump.fun acquired Kolscan (July 2025) and made all features free.
- **Value/effort:** High for sourcing candidate wallets at $0.
- **Verdict notes:** **Conflict of interest:** now owned by Pump.fun, so the leaderboard is a funnel that benefits the house (more trading = more launchpad fees), and post-acquisition PnL data has been publicly flagged as inaccurate/gameable (Pump.fun itself admits it needs to "reward real traders again"). **Cross-check every candidate wallet's PnL against an independent tracker** (Solana Tracker / Cielo / Solscan) before trusting a number. Do NOT buy the $KOLSCAN token. Only kolscan.io (watch for phishing clones).
- **Serves D3:** Sourcing layer for the synthetic network. Use for **cluster/narrative detection** (multiple proven wallets rotating into one theme), not single-wallet copy.

### 4. Cielo Finance (free tier) — **legit**
- **What it does:** Alert backbone. Real-time Telegram/Discord pings when tracked wallets move, filtered by tx-type and min-USD value. Login is message-signature only (no asset permissions = safe).
- **Cost:** Free = **10 Solana wallet slots** (250 total across all chains; the Solana cap is the binding one for you), 1 Telegram + 1 Discord bot, ~120 alerts/hour.
- **Value/effort:** Best-fit free tool for the literal "alert → quick decision, no babysitting" model.
- **Verdict notes:** Reputable, read-only, no breach history. Confirm the exact free Solana-wallet cap in-app at signup (sources drift between 10 and 50). Known limitation: incoming-tx alerts on Solana can be incomplete; support is slow.
- **Serves D3:** Push-alert layer. Load your best 5-10 Kolscan-vetted wallets here. 10 slots forces ruthless curation (a feature at v0.1).

### 5. Solana Tracker (free) — **legit**
- **What it does:** Own-wallet PnL. Real-time realized + unrealized PnL, trade history for any address, no login. Also doubles as the independent cross-check for Kolscan candidate wallets.
- **Cost:** Free for own-wallet use.
- **Value/effort:** High. Makes your own results measurable, which is the prerequisite for a "documented, testable edge."
- **Serves D3:** Feeds the trade log / expectancy math. Pair with a dead-simple spreadsheet logging entry, exit, R-multiple, and which exit rule fired.

### Also free and mandatory: SolSniffer + honeypot/sellability sim
- **SolSniffer (free tier) — legit:** 0-100 Snifscore across 20+ indicators. Cross-reference with RugCheck (always use ≥2 scanners). Note: it's primarily a **static** scanner; not confirmed to run a true buy-then-sell sim.
- **Honeypot/sellability sim — legit tactic, build it yourself:** The verified way on Solana is hitting the **Jupiter quote API** for a tiny buy-then-sell and rejecting if no sell quote returns. "ApeSpace-style" is EVM-oriented, don't rely on it for Solana. Add live-authority checks (freeze, transfer-fee, mint, upgrade) because sims are point-in-time and beatable by post-buy mutation (Token-2022 transfer hooks can impose a 99% mutable sell tax). Jupiter free rate limits run through 30 Jun 2026 — flag for re-check.

---

## Tier 2 — Execution & filters in the terminal you already use

### Axiom + Axiom Pulse — **risky** (use, with hygiene)
- **What it does:** Your execution + mobile-alert hub. Native limit orders, **auto-sell with take-profit + trailing stop-loss** (directly attacks your biggest gap: exits/sizing/risk), copy-trade, X tracker, mobile push. **Pulse** filters live launches by Age, Top-10 Holders %, Dev Holding %, Snipers %, Insiders %, Bundle %, Holders, Liquidity, Volume, Mcap — saveable as presets, so you can hardcode your NO-gate thresholds inside the terminal.
- **Cost:** Tiered **~0.75% (high tier) to ~0.95% (entry tier) per side** with SOL cashback — NOT the 0.5% sometimes quoted. Grab a referral discount and aim for higher cashback tiers. Cheaper than BullX/Photon (~1% flat) for Solana-only.
- **Value/effort:** High. Zero new tooling; auto-sell externalizes your weakest skill (exits).
- **Verdict notes:** **Risky on trust, not function.** The Feb 2026 insider-data scandal is real and unresolved — keep size modest, don't treat in-app "smart money" as clean, use a dedicated trading wallet. Pulse filters are coarser than RugCheck/Bubblemaps: use as a screen, then audit finalists with the Tier-1 tools.
- **Serves D3:** Execution venue + the place you encode the exit ladder as resting orders. Fallbacks if you want a clean-hands stack: **BullX Neo** (referral required to onboard, flat 1%) or **Photon** (desktop-first, ~1%, worse for async/mobile).

---

## Tier 3 — Paid upgrades, ONLY after the free stack proves edge

Spend follows proven signal, never before. Don't stack a subscription on top of a losing system.

| Tool | Verdict | Cost | When to add | Notes |
|---|---|---|---|---|
| **Cielo Pro** | legit | $59/mo (annual ≈ $708/yr) | After free 10-wallet tier shows positive expectancy in your log | Lifts to 200 Solana wallets + Wallet Discovery + higher alert caps. $59 is the **annual-billing** price — treat as a yearly commit, not a casual monthly try. |
| **Nansen Pro** | legit | $49/mo annual ÷ $69/mo monthly | Phase-2, only if you hit a wallet-quality filtering wall | Adds wallet **labels** (fund/CEX/smart-money) free tools lack. Honest caveat: labels are **noticeably weaker on low-cap memecoins** than the pitch implies; pays off more for mid-cap / vetting copy-tracked wallets. |
| **Bitquery pump.fun streaming** | legit | Free trial (1K points, 2 streams), production = sales-only | v0.2 automation: near-graduation alerts on tokens that passed your NO-gate | Independent infra. April 2026 made Solana gRPC streaming free per plan (verify entitlement). Stream can drop — code reconnect/heartbeat. Comparison-shop Helius/QuickNode/Shyft before locking in. |

---

## Tier 4 — Build-your-own automation (the 3-month milestone)

- **Helius Enhanced Webhooks → Cloudflare Worker/Node → Telegram — legit, recommended v0.1-to-v0.2 build.** Tracked-wallet swap fires a webhook → serverless function → Telegram push. **Helius Free = 1M credits, webhooks included, 10 RPC/s ($0); Developer = $49/mo** if you scale wallet count. Webhook pushes cost 1 credit each, so dozens of wallets stay free/cheap. Fork `DracoR22/handi-cat_wallet-tracker` or follow Helius's <100-line tutorial.
- **Build-vs-buy rule:** **buy the data feed (Helius), build the logic (your filter ruleset + alert formatting + log).** The ruleset is the asset — never outsource it. Don't build raw RPC indexing; don't buy a black-box copy bot.
- **Sequencing:** (1) ~1 month: wallet-tracker + RugCheck filter → Telegram alert, **manual buy stays in your hands** (produces the logged dataset = your testable edge). (2) ~3 months: semi-auto, one-tap/approve execution, human-in-the-loop. (3) unattended auto-exec LAST, maybe never at this account size, and only after logged data proves positive expectancy net of fees.

---

## Avoid / use only as data — flagged in verification

| Item | Verdict | Why |
|---|---|---|
| **Paid Telegram "alpha caller" / signal groups** | **avoid (legit to skip)** | Negative-EV and structurally designed to make you exit liquidity (documented PumpCell ring, ~$800k/mo, Solana-specific). Pump peaks in ~70s — async you always buy the top. Most "best group" lists are affiliate content. Use a call (if ever) as a **sell/sentiment signal**, never a buy. |
| **GMGN copy-trade / "synthetic network"** | **risky** | Features are real (tracking, alerts, AFK copy of up to 10 wallets) and fine as a **wallet-discovery + learning** tool. But blind/AFK auto-copy is likely negative-EV: ~2% round-trip fee, default priority fee ~6x Axiom's (crushes small trades), latency makes you the copied wallet's exit liquidity. Heavily affiliate-shilled; Nov 2025 fake-GMGN phishing drained $700k. Use for **finding/tracking only**, official gmgn.ai domain, burner wallet. |
| **Sharpe.ai narrative tracker** | **risky** | Tool is real, free, company legit, and category-level rotation IS the right mental model for you. But the specific "+15%/+25% 7d" rotation rules are **vendor self-published heuristics with zero backtest** — paper-track for weeks before trusting. Useful dashboard, not a tested edge. |
| **LunarCrush** | **risky** | Real social-intel tool, but **structurally late** for fresh low-cap launches (a token needs social footprint before it registers). Gameable by bots. Free tier as a **confirmation** layer only, never a trigger or discovery tool. Pay only at phase-2 for API access, after it proves edge. |
| **Sniper bots / Pump.fun volume bots / random GitHub "trading bots"** | **avoid (legit to skip)** | Sniping needs sub-second speed + screen presence you don't have = negative-EV for you. Volume bots are wash-trade manipulation, not edge. **Fake GitHub bots actively drain wallets** (SlowMist-documented key theft). Never paste a seed into unaudited code; only automate via audited APIs + a burner wallet. |

---

## Recommended minimal stack to start (this week, $0)

**Intel & safety (Tier 1):**
- **Kolscan** → discover and vet candidate wallets by realized PnL (cross-check on Solana Tracker).
- **Cielo free** → load 5-10 vetted wallets, get Telegram pings.
- **RugCheck + SolSniffer** → 30-second NO-gate on every candidate (gate on `score_normalised` + risk flags).
- **Bubblemaps** → 30-second cluster check on finalists.
- **Solana Tracker + a spreadsheet** → own-wallet PnL + trade log (entry, exit, R-multiple, exit rule fired).

**Execution (Tier 2):**
- **Axiom** → place the exit ladder as resting limit/auto-sell + trailing-stop orders at entry. Keep size modest, dedicated wallet, assume the platform sees you.

**The loop:** Cielo ping → RugCheck + SolSniffer + Bubblemaps (≈1 min) → if it passes the NO-gate, decide → enter on Axiom with the exit ladder pre-set → log it. Run for ~1 month and measure expectancy net of the **~3-7% round-trip fee/slippage drag** before spending a cent or automating.

**First paid upgrade (only if the free loop shows edge):** Cielo Pro ($59/mo annual) for more wallet slots. **First build (3-month target):** Helius webhook → Telegram alerter with your RugCheck filter as the version-controlled ruleset.

---

## Sources

**Token-safety / filters**
- https://rugcheck.xyz/ · https://api.rugcheck.xyz/swagger/index.html · https://github.com/degenfrends/solana-rugchecker
- https://www.solsniffer.com/ · https://www.solanatracker.io/rugcheck
- https://blog.bubblemaps.io/how-to-analyze-meme-coin-holders-with-bubblemaps/ · https://app.bubblemaps.io
- https://developers.jup.ag/docs/price · https://solana.com/developers/guides/token-extensions/transfer-hook · https://neodyme.io/en/blog/token-2022/

**Wallet tracking / discovery**
- https://kolscan.io/ · https://kolscan.io/leaderboard · https://www.coindesk.com/markets/2025/07/11/pumpfun-acquires-wallet-tracker-kolscan-to-expand-onchain-trading-tools · https://uwuu.ai/blog/kolscan-review
- https://cielo.finance/ · https://docs.cielo.finance/faq · https://docs.cielo.finance/subscribe
- https://www.solanatracker.io/wallet
- https://uwuu.ai/blog/gmgn-review · https://docs.gmgn.ai/index/gmgn-fees-settings · https://www.pcrisk.com/removal-guides/33299-fake-gmgn-website-scam
- https://nansen.ai/solana-onchain-data · https://academy.nansen.ai/articles/0414043-new-pricing-explained

**Execution terminal**
- https://docs.axiom.trade/axiom/finding-tokens/pulse · https://docs.axiom.trade/getting-started/fees · https://axiompro.app/auto-sell/ · https://axiompro.app/limit-orders/
- https://coinbureau.com/review/axiom-trade-review
- https://www.coindesk.com/markets/2026/02/26/zachxbt-alleges-axiom-employee-conducted-insider-trading · https://www.theblock.co/post/391423/zachxbt-investigation-into-alleged-employee-insider-trading
- https://solanatools.io/bullx-vs-axiom · https://solanatools.io/photon

**Automation infra**
- https://www.helius.dev/pricing · https://www.helius.dev/blog/create-a-solana-telegram-bot-in-less-than-100-lines-of-code · https://github.com/DracoR22/handi-cat_wallet-tracker
- https://docs.bitquery.io/docs/blockchain/Solana/Pumpfun/Pump-Fun-Marketcap-Bonding-Curve-API/ · https://bitquery.io/pricing · https://bitquery.io/blog/bitquery-april-2026-release

**Narrative / social**
- https://www.sharpe.ai/memecoins · https://www.sharpe.ai/learn/memecoin-narrative-tracker · https://www.scamadviser.com/check-website/sharpe.ai
- https://lunarcrush.com/ · https://lunarcrush.com/pricing

**Fees, scams, security**
- https://pump.fun/docs/fees · https://solanatools.io/solana-trading-bot-fees · https://solanatools.io/blog/solana-trading-bot-fees-compared
- https://www.coindesk.com/business/2025/12/09/telegram-ring-ran-pump-and-dump-network-that-netted-usd800k-in-a-month-solidus-labs
- https://slowmist.medium.com/threat-intelligence-an-analysis-of-a-malicious-solana-open-source-trading-bot-ab580fd3cc89 · https://coinpedia.org/news/crypto-scam-alert-new-fake-github-trading-bot-is-draining-solana-wallets/
- https://www.soliduslabs.com/reports/solana-rug-pulls-pump-dumps-crypto-compliance
- https://defillama.com/protocol/axiom · https://madeonsol.com/blog/solana-referral-affiliate-programs