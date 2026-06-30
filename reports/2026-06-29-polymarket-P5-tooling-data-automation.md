# P5 — Tooling, Data & Automation Map

Ranked map of Polymarket tools/data/APIs for your exact situation: ~$1-3k bankroll, 1-2h/day, async (no screen-babysitting), solo technical builder, edge = information + system NOT raw speed, dual payoff (money + understanding). Every verdict is sourced. Where verification flagged something stale/risky/affiliate, it says so.

The headline: the official data/API layer is genuinely first-class, well-documented, and free to read — the structural opposite of memecoin RPC/mempool scraping (no honeypots, no rugs, a real order book to model, explicit probabilities). But the package you'll find in 90% of tutorials (`py-clob-client`) is **dead as of May 2026**, and most "best tool" directories are affiliate-driven. Build read-only first, automate sizing/logging before picking, and never automate entry on an unproven edge.

---

## 1. The honest framing before any tooling

What's automatable at $1-3k is **narrow**. Verification killed the two glamorous lanes:

- **Pure arbitrage / market-making: NOT viable at your size.** Arb window collapsed from 12.3s (2024) to ~2.7s (2026); 73% of arb profit goes to sub-100ms bots; median arb spread ~0.3% (dies to gas). Market-making needs $1M-$10M pools and 24/7 quoting to matter; the example bot used $10k to make $1,247/3wk. ([Yahoo/IMDEA](https://finance.yahoo.com/news/arbitrage-bots-dominate-polymarket-millions-100000888.html), [Medium/Illumination](https://medium.com/illumination/beyond-simple-arbitrage-4-polymarket-strategies-bots-actually-profit-from-in-2026-ddacc92c5b4f))
- **AI/news speed arb: needs $2-5k floor PLUS $200-500/mo in news+LLM APIs** — that subscription alone eats 2.4-6%/mo of a small account. ([Medium/Illumination](https://medium.com/illumination/beyond-simple-arbitrage-4-polymarket-strategies-bots-actually-profit-from-in-2026-ddacc92c5b4f), [CoinDesk](https://www.coindesk.com/markets/2026/02/21/how-ai-is-helping-retail-traders-exploit-prediction-market-glitches-to-make-easy-money))

So the realistic automatable surface for YOU is: **a scheduled (cron) read-only pipeline that scans data, scores your calibration, enforces sizing discipline, and pushes alerts** — semi-auto execution, not a money-printing bot. The win is removing the impulsive-taker behavior that statistically kills retail, plus a measurable forecasting track record. (Contrast memecoins: there automation was a speed race you lose; here automation's highest-value job early is *discipline enforcement*, not signal.)

---

## 2. Official API / SDK layer — VERDICTS

### `py-clob-client` (the classic SDK) — ❌ OUTDATED / DEAD
- **Archived by Polymarket 2026-05-25** with explicit notice: "no longer functional... should not be used for new or existing integrations." Only speaks CLOB V1; CLOB V2 went live ~2026-04-28 and V1-signed orders stopped being accepted on production. **Any tutorial built on it will not place orders.** ([GitHub](https://github.com/Polymarket/py-clob-client), [v2-migration](https://docs.polymarket.com/v2-migration))
- This is the single biggest landmine: most pre-2026 content references it. Ignore it.

### `py-sdk` (new unified SDK) — ✅ RECOMMENDED for new builds, ⚠️ BETA
- Official, current, folds **CLOB REST + Gamma + Data + WebSockets + Web3** into one package (`polymarket-client`), actively developed. Polymarket recommends it for new projects. ([GitHub](https://github.com/Polymarket/py-sdk), [clients-sdks](https://docs.polymarket.com/api-reference/clients-sdks))
- **Caveat: explicitly BETA** ("working toward a stable public API," expect breaking changes), ~few-dozen stars. Native WebSocket is its advantage over the v2 client.

### `py-clob-client-v2` — ✅ WORKS, ⚠️ being phased out, no bundled WS
- Real, official, on PyPI (`py-clob-client-v2` v1.0.1, May 2026), MIT, Python ≥3.9.10. More battle-tested for *just trading* but its own docs steer new projects to `py-sdk`. **Does NOT bundle WebSocket** — you'd hand-stitch a separate WS client. ([GitHub](https://github.com/Polymarket/py-clob-client-v2), [PyPI](https://pypi.org/project/py-clob-client-v2/))
- Known open bugs as of mid-2026: an L1-auth bug binding the API key to the EOA instead of the deposit wallet (can **block** order placement for brand-new wallets — [issue #70](https://github.com/Polymarket/py-clob-client-v2/issues/70)), and float precision drift in order building ([#66](https://github.com/Polymarket/py-clob-client-v2/issues/66)). These don't touch read-only work but will bite when you automate execution.

**⚠️ Do NOT install `polymarket-us-python` / follow `docs.polymarket.us`.** That's the separate CFTC/QCEX US venue (full KYC). As a Greece resident you use international `polymarket.com` APIs. (The US SDK auto-handles backoff, which is why some sources wrongly say "the SDK handles rate limiting" — only the US one does.) ([US SDK](https://github.com/Polymarket/polymarket-us-python))

### The three APIs (the actual data foundation) — ✅ ALL LEGIT, FREE TO READ
| API | Host | Auth | Use |
|---|---|---|---|
| **Gamma** | `gamma-api.polymarket.com` | none (public) | market/event metadata, titles, end dates, volume, token_ids, search |
| **Data** | `data-api.polymarket.com` | none (public) | positions, trades, activity, holders, OI, leaderboards |
| **CLOB** | `clob.polymarket.com` | wallet (L1 sign → API creds, then L2) | order book, prices, midpoints, spreads, price-history, order placement/cancel |
| **WebSocket** | `wss://ws-subscriptions-clob.polymarket.com/ws/` | — | live book/price |

Chain = Polygon (137). Rate limits are generous (CLOB ~9,000 req/10s general; POST /order 3,500/10s burst) — nowhere near a 1-2h/day poller. **But the SDK does NOT auto-handle rate limiting on the international platform** — implement exponential backoff + jitter yourself (`tenacity` `wait_random_exponential`; retry GETs/DELETEs, NOT order placement). ([api-reference](https://docs.polymarket.com/api-reference/introduction), [rate-limits guide](https://agentbets.ai/guides/polymarket-rate-limits-guide/), [tenacity](https://github.com/jd/tenacity))

**Gotchas:** `outcomePrices` come back as JSON-encoded strings (`"[\"0.62\",\"0.38\"]"`) — parse before indexing. `/prices-history` is one token_id at a time. Collateral now displays as **pUSD** (1:1 USDC-backed wrapper) under CLOB V2 — verify pUSD handling in any execution code. ([pm.wiki](https://pm.wiki/learn/polymarket-api), [pUSD](https://docs.polymarket.com/concepts/pusd))

---

## 3. Dashboards & data (smart-money study) — VERDICTS

### Dune dashboards — ✅ LEGIT, FREE, best free analytics layer
On-chain ground truth, queryable, no affiliate angle. Maintained Polymarket dashboards: `genejp999` (leaderboard, volume), `brunoskl` (whale tracker), `andy_chelsea` (whale orders), `dunedata` (cross-platform: Polymarket/Kalshi/Limitless/Myriad). Free tier + SQL = no-code analytics; Dune API if you want it in your pipeline. ([genejp999](https://dune.com/genejp999/polymarket-leaderboard), [brunoskl](https://dune.com/brunoskl/polymarket-whale-tracker), [dunedata](https://dune.com/dunedata))

Use it to identify the verifiable ~0.5% +EV wallets and **reverse-engineer WHY they win** (which markets, sizing, timing) — research, not blind copy.

### Whale/wallet trackers (Polywhaler, PolyTrack, PolyWallet, PolyIntel) — ✅ legit as read-only, ⚠️ "insider" labels are heuristics
Polywhaler (most-cited, real-time $10K+ trade alerts, ~5-15s latency, Discord/Telegram) and peers are mostly free/freemium because the space is young and competing for users. **Honest caveat: "insider" flags are heuristics (early/large positioning), not proof; some sites are affiliate-driven.** Whale prints in thin markets are often manipulation or position-building, not signal. ([Polywhaler](https://polywhaler.com/), [QuickNode list](https://www.quicknode.com/builders-guide/best/top-10-polymarket-whale-trackers))

### Copy-trading tools (Polycopy, Wallet Master, PolySmartWallet) — ⚠️ RISKY, signal-only
- Tools are **real and low-risk when used read-only** (no wallet connect, no PII, no funds). Polycopy trust score 76. So as a free async research dashboard the worst case is wasted time. ([Polycopy](https://polycopy.app/), [Wallet Master](https://www.walletmaster.tools/polymarket-wallet-tracker/), [Scamadviser](https://www.scamadviser.com/check-website-old/polycopy.app))
- **The "~78% basket-convergence hit-rate" is FOLKLORE, not documented.** It traces to a single Medium post (`0xIcaruss`), n=14-23, self-reported, no methodology, promotes paid tools with no affiliate disclosure. Do NOT treat as a tradeable edge. ([Medium](https://medium.com/@0xicaruss/5-polymarket-strategies-that-are-actually-working-in-2026-with-real-wallet-data-7a56fd547912))
- **Why copy-trading fails structurally** (verified): the price moves *because* of the trade you copy (2-30s+ lag, sub-100ms MEV front-runs you); you become exit liquidity; bot wallets profit by closing spreads (gone when you copy at market). ~84% of all traders lose; copy-trader profitable rate ~12.7%. ([startpolymarket](https://startpolymarket.com/strategies/copy-trading/), [The Defiant](https://thedefiant.io/news/research-and-opinion/polymarket-profitability-report-april-2026))
- **Verdict:** keep as a research/cross-check layer (free, async, zero capital risk read-only). Never auto-mirror. Drop the 78% belief.

---

## 4. News / odds aggregators — VERDICTS

### Adjacent News (`adj.news` / `adjacent.markets`) — ✅ tool legit, ⚠️ edge thesis risky
- Real, active company; aggregates 40,000+ markets across Polymarket/Kalshi/Limitless behind one key; Markets/News/semantic-search APIs; market/event endpoints accessible **unauthenticated** (free to test). ([adj.news](https://adj.news/launch/), [docs](https://docs.adj.news/))
- **No published pricing page** — the "$200-500/mo" figure is unverified for Adjacent specifically (likely lumps in generic news+LLM costs). Treat the missing price as a yellow flag; pin them down before paying.
- **Why "risky":** the 30s-5min news-repricing window it targets is being eaten by AI bots (arb lifetime ~2.7s, AI assigns probabilities before humans react). And an aggregator adds a *hop* — it's good for **discovery/research/cross-venue comparison**, weak as a latency execution feed (go direct to Polymarket WebSocket if you ever need speed). ([Medium/Illumination](https://medium.com/illumination/beyond-simple-arbitrage-4-polymarket-strategies-bots-actually-profit-from-in-2026-ddacc92c5b4f))

### OddsPapi (`oddspapi.io`) — ✅ LEGIT, generous free tier
- Real, well-reviewed; 370 bookmakers incl. Polymarket + Kalshi + sharp books (Pinnacle) normalized to decimal odds. **Free tier = full product, 250 req/month, no card.** No scam/breach history. Useful for cross-venue mispricing detection vs sharp lines. ([oddspapi.io](https://oddspapi.io/us), [comparison](https://oddspapi.io/blog/best-odds-apis-2026-comparison/))

**Reframe both:** not "information edge that beats the crowd on news speed" (bot-dominated, aggregator latency makes it worse) — instead **cross-venue mispricing scanner + research surface** feeding an edge you backtest and automate. Stay on free tiers until you've logged real spreads surviving fees + slippage + resolution risk. On a $1-3k account even $50-100/mo is a 2-4%/mo EV drag.

### OSS building blocks (free) — ✅
TREMOR (data terminal, SQL + AI), Marketlens (tick-level historical order book + backtest REST API), `structbuild/polymarket-telegram-bot`, Metaforecast (meta-aggregator). ([Awesome list](https://github.com/aarora4/Awesome-Prediction-Market-Tools), [telegram bot](https://github.com/structbuild/polymarket-telegram-bot))

---

## 5. Forecasting / calibration tooling (the actual edge engine) — ✅ ALL LEGIT, FREE

This is where your durable, transferable edge lives, and it's all free, money-free, async — the opposite of memecoins where you paid tuition in lost bankroll to learn anything.

- **Clearer Thinking "Calibrate Your Judgment"** + **Quantified Intuitions** (calibration game + Pastcasting + Fermi). Peer-reviewed evidence: <30 min training measurably reduces overconfidence. Weight **Pastcasting** (forecasting resolved questions) over pure trivia — closer to real markets. ([Clearer Thinking](https://www.clearerthinking.org/tools/calibrate-your-judgment), [Quantified Intuitions](https://www.quantifiedintuitions.org/))
- **Metaculus + Good Judgment Open** — free, money-free, real resolution, **automatic Brier + reliability-diagram scoring**. GJ Open's *relative Brier* directly answers "am I beating the consensus crowd?" — your exact edge thesis. No geo/KYC issue (no real money). Metaculus has a public API + bot framework for later automation. ([Metaculus track record](https://www.metaculus.com/questions/track-record/), [GJ Open](https://www.gjopen.com/), [Metaculus API](https://www.metaculus.com/api/))
- Benchmark to beat: Polymarket market Brier ~0.084 (very hard). Log market_price at YOUR entry time, not at resolution, or the comparison is rigged against you. Need 100+ independent resolutions before your Brier is trustworthy; ~1 month gets you a noisy first read, NOT a proven edge.

---

## 6. What to actually build — the concrete v0.1 (ships in ~1 month)

**Build a read-only, cron-scheduled alert + discipline pipeline. NOT an arb bot, NOT a market maker, NOT a copy bot.**

```
1. Data ingest (Gamma + Data APIs, raw HTTP, $0)
   → markets, end dates, prices, volume, liquidity, resolution rules text
   verify: pulls live markets, parses outcomePrices JSON-strings correctly

2. Filters (hard-coded, non-negotiable)
   → liquidity/spread floor (skip <$20k depth, >5c spread)
   → resolution-clarity screen (flag ambiguous wording; prefer
     Chainlink-resolved sports/crypto-price = near-zero oracle risk)
   verify: thin/fuzzy markets get excluded from alerts

3. Bet log (DB/sheet) — the core deliverable
   → timestamp, market, your_p, market_price (at decision time),
     size, fee, resolution, dispute_flag, realized_PnL
   → weekly Brier vs market's Brier on same questions
   verify: Brier computed; sizing reconciled against realized PnL

4. Kelly + caps calculator (fee-aware)
   → quarter-Kelly until calibration proven; 3% per position,
     25% total open, 40% per correlated cluster
   → fee = C × feeRate × p × (1-p); default to MAKER (limit) orders
   verify: never outputs a size > caps; EV check nets out taker fee

5. Alerts (Telegram/Discord) — semi-auto, human-in-the-loop
   verify: alert fires on a flagged market; you act manually
```

**Why this sequence (alerts → assisted → automated):**
- **v0.1 alerts/logging (now):** read-only, zero execution risk, builds the calibration dataset. Auto-populate market_price/resolution/fees via the API instead of hand-typing. Directly serves Goal B (documented testable edge first).
- **v0.2 assisted execution:** add `py-sdk` (or `py-clob-client-v2`) for maker/limit order placement *you confirm*. Optionally a NegRisk convert-arb **scanner** (sum-of-mutually-exclusive-YES < $1) — but build it read-only and paper-track net-of-fees first; the mechanism is real but largely bot-arbed and fee-sensitive post-2026 taker fees. Gate this on: ≥50-100 logged bets where your Brier beats the entry-time market Brier AND positive realized PnL net of fees.
- **v0.3 automation:** only sizing + logging fully automated; entry automation only after the edge is proven. Defer market-making / liquidity-reward farming entirely (latency war + adverse selection, contradicts your info-not-speed thesis; $1-3k is too light for a meaningful reward share).

**Automate the SIZING + LOGGING, not the PICKING.** The highest-leverage early automation is enforcing fractional-Kelly + caps + fee-aware EV and auto-logging — this removes the impulsive-taker behavior that statistically kills retail. Picking automation is premature until your bet log shows you beat the market's Brier.

---

## 7. Setup essentials (gate everything on these)

- **On/off-ramp (✅ legit):** Kraken or Coinbase EU → SEPA EUR (free, <€1) → buy USDC → withdraw on Polygon → Polymarket. Gas <$0.01. Coinbase EU withdraws USDC free on Polygon (Kraken charges a small variable fee), so Coinbase wins that leg; Kraken wins on SEPA simplicity. Avoid MoonPay card (2-3%). Balance displays as **pUSD**. ([Kraken SEPA](https://support.kraken.com/articles/360000381846), [deposit](https://docs.polymarket.com/trading/bridge/deposit))
- **Geo/access (⚠️ medium-confidence, re-verify):** Greece accessible at IP level, no VPN needed — and **never use a VPN** (ToS 2.1.4, actively detected, freezes funds). No KYC for non-US at your volume today. ([geo](https://help.polymarket.com/en/articles/13364163-geographic-restrictions), [EU users](https://www.copytradeinsider.com/blog/polymarket-eu-users-2026/))
- **Legal tail (real, not a footnote):** MiCA reverse-solicitation grey zone, NOT a license; **July 1 2026 MiCA enforcement cliff**; Portugal/Hungary blocked Jan 2026 (gambling regulators, not MiCA); Greece's gambling authority hasn't acted but is mid-crackdown. **Re-verify geo-block on/after July 1 before funding.** Cap at $1-3k, keep funds withdrawable, test one full deposit→trade→withdraw loop with a small amount first. DAC8 (Jan 2026) reports your CEX activity to Greek tax authorities — keep records, consult a Greek accountant on gambling-vs-capital-gains classification. ([MiCA cliff](https://en.spaziocrypto.com/regulation/mica-july-1-2026-deadline-authorized-platforms/), [DAC8](https://taxation-customs.ec.europa.eu/taxation/tax-transparency-cooperation/administrative-co-operation-and-mutual-assistance/directive-administrative-cooperation-dac/dac8_en))

---

## 8. Ranked tooling summary

| Rank | Tool/Layer | Verdict | Cost | Role |
|---|---|---|---|---|
| 1 | **Gamma + Data APIs** (raw HTTP) | ✅ legit | free | v0.1 data foundation |
| 2 | **Metaculus / GJ Open + calibration apps** | ✅ legit | free | edge engine, money-free track record |
| 3 | **Dune dashboards** | ✅ legit | free | smart-money study (not copy) |
| 4 | **`py-sdk`** (or `py-clob-client-v2`) | ✅ recommended, ⚠️ beta | free/MIT | execution layer (v0.2+) |
| 5 | **OddsPapi** | ✅ legit | free tier | cross-venue mispricing scan |
| 6 | **`tenacity`** | ✅ legit | free | backoff/jitter (you implement) |
| 7 | **Marketlens / TREMOR** (OSS) | ✅ legit | free | backtest before capital |
| 8 | **Adjacent News** | ✅ tool / ⚠️ edge | unverified $ | research/discovery only |
| 9 | **Polywhaler / whale trackers** | ✅ read-only / ⚠️ labels | free/freemium | alpha discovery leads |
| 10 | **Polycopy / copy-trade tools** | ⚠️ risky | free RO / $30/mo auto | signal-only, never mirror |
| — | **`py-clob-client` (v1)** | ❌ dead/archived | — | DO NOT USE |
| — | **Pure arb / market-making bots** | ❌ not viable @ $1-3k | infra-heavy | skip |
| — | **`polymarket-us-python` / docs.polymarket.us** | ❌ wrong venue | — | US-only, not for Greece |

**Contrast vs memecoins (tooling lens):** clean documented APIs + queryable on-chain truth (building a pipeline is days, not a forensic war); defined odds make Kelly + Brier *usable*; no rugs/honeypots/bundles (risk shifts to oracle/resolution + capital lockup + adverse selection). The same lesson carries over though: you can't win on raw speed — your tooling must serve information + discipline, not latency.

---

## Sources
Official: [Gamma/Data/CLOB API](https://docs.polymarket.com/api-reference/introduction) · [py-sdk](https://github.com/Polymarket/py-sdk) · [py-clob-client (archived)](https://github.com/Polymarket/py-clob-client) · [py-clob-client-v2](https://github.com/Polymarket/py-clob-client-v2) · [v2 migration](https://docs.polymarket.com/v2-migration) · [WebSocket](https://docs.polymarket.com/market-data/websocket/overview) · [fees](https://docs.polymarket.com/trading/fees) · [maker rebates](https://docs.polymarket.com/market-makers/maker-rebates) · [NegRisk](https://docs.polymarket.com/advanced/neg-risk) · [resolution/UMA](https://docs.polymarket.com/developers/resolution/UMA) · [deposit](https://docs.polymarket.com/trading/bridge/deposit) · [geo](https://help.polymarket.com/en/articles/13364163-geographic-restrictions)
Data/dashboards: [Dune genejp999](https://dune.com/genejp999/polymarket-leaderboard) · [Dune brunoskl](https://dune.com/brunoskl/polymarket-whale-tracker) · [Dune dunedata](https://dune.com/dunedata)
Trackers/aggregators: [Polywhaler](https://polywhaler.com/) · [Polycopy](https://polycopy.app/) · [Wallet Master](https://www.walletmaster.tools/polymarket-wallet-tracker/) · [Adjacent News](https://adj.news/launch/) · [OddsPapi](https://oddspapi.io/us) · [Awesome Prediction Market Tools](https://github.com/aarora4/Awesome-Prediction-Market-Tools)
Forecasting: [Metaculus](https://www.metaculus.com/questions/track-record/) · [GJ Open](https://www.gjopen.com/) · [Clearer Thinking](https://www.clearerthinking.org/tools/calibrate-your-judgment) · [Quantified Intuitions](https://www.quantifiedintuitions.org/)
Expectancy/strategy reality: [Yahoo/IMDEA arb](https://finance.yahoo.com/news/arbitrage-bots-dominate-polymarket-millions-100000888.html) · [Medium/Illumination 4 strategies](https://medium.com/illumination/beyond-simple-arbitrage-4-polymarket-strategies-bots-actually-profit-from-in-2026-ddacc92c5b4f) · [The Defiant profitability](https://thedefiant.io/news/research-and-opinion/polymarket-profitability-report-april-2026) · [CoinDesk AI arb](https://www.coindesk.com/markets/2026/02/21/how-ai-is-helping-retail-traders-exploit-prediction-market-glitches-to-make-easy-money)
Infra/legal: [rate limits guide](https://agentbets.ai/guides/polymarket-rate-limits-guide/) · [tenacity](https://github.com/jd/tenacity) · [Kraken SEPA](https://support.kraken.com/articles/360000381846) · [EU users](https://www.copytradeinsider.com/blog/polymarket-eu-users-2026/) · [MiCA July 2026](https://en.spaziocrypto.com/regulation/mica-july-1-2026-deadline-authorized-platforms/) · [DAC8](https://taxation-customs.ec.europa.eu/taxation/tax-transparency-cooperation/administrative-co-operation-and-mutual-assistance/directive-administrative-cooperation-dac/dac8_en)