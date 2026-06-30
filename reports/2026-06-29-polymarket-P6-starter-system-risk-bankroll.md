# P6 — Starter System Spec + Risk/Bankroll (v0.1)

**For:** Solo technical builder, Greece/EU, ~$1-3k risk bankroll, 1-2h/day, async (no screen-babysitting). **Goal B:** document a TESTABLE edge first, then automate. Dual payoff: money + understanding.

**One-line thesis:** Polymarket is a structurally better arena than memecoins for "be the better-INFORMED side, not the faster side" — but the honest expectancy is breakeven-to-small-loss for a part-time retail operator. The realistic v0.1 win is a **measured calibration skill + a discipline-enforcing system**, not a money printer. Treat month 1 as instrumentation, not profit.

> **Reality check baked into every rule below:** ~84% of Polymarket wallets lose; top ~0.1-1% capture the majority of profit; the winners look like **arbitrage/market-making bots and patient makers**, not well-calibrated forecasters. Retail often picks the *right* outcome more often than bots but still loses, because it enters **late at bad prices** as a taker. Your edge has to close THAT gap (price discipline + maker execution + real information in thin niches), and you must prove it before sizing up.

---

## 0. What changed vs the memecoin world (keep these in view)

- **Defined odds:** price = implied probability. So Kelly and Brier scoring actually WORK here (they were unusable on memecoins). Your edge is literally `your_p − market_p`.
- **Real resolution + $1/$0 payout** vs no resolution at all. But this adds a brand-new tail: **UMA oracle/resolution risk** (you can be right and still get paid wrong).
- **Fees flipped in 2026:** makers (resting limit orders) pay **$0** (+20-25% taker-fee rebate); takers pay **0.75%-1.80%** by category (worst near $0.50, shrinks toward the tails). Far cheaper than memecoin ~3-7% round-trip — *if you stay a maker*. No rugs/honeypots/bundles.
- **Capital lockup:** funds locked until resolution (median ~41 min, but a tail to days/weeks; disputes add ~49h median). Opportunity cost ~3.5-4%/yr (T-bills). Memecoins recycled in <4h.
- **Async fit:** you choose the horizon, post limit orders, walk away. Far better for 1-2h/day than babysitting charts.
- **Speed is still a losing game:** sub-100ms bots own cross-venue arb, binary-bundle arb, breaking-news racing, and 5-min crypto markets. Do NOT enter those.

---

## 1. Strategy lane to START (the only one for v0.1)

**LANE: Niche informational/mispricing in your own domain (AI milestones, crypto-protocol, tech) + resolution-rules reading, executed as a MAKER, on the international platform — but framed as a CALIBRATION-MEASUREMENT exercise, not an arb.**

Why this lane and not others:
- It's the one place humans still beat bots: thin, niche markets requiring domain knowledge, where you already have a real moat (AI/crypto-tech).
- It's testable (defined probabilities → Brier), async (weekly watchlist), and tiny positions fit thin books.
- **Honesty flag (research verdict was "risky" on this lane):** the best study found *forecasting accuracy alone earns NEGATIVE returns* because the informed crowd arrives late and pays bad prices; execution (being a maker, not chasing your own read) is what converts a correct view into money. So this lane is only viable as **(information edge in thin niches) + (maker-only execution) + (resolution-ambiguity hard filter) + (honest Brier logging)**. Weighting "I'm better informed" as the sole driver is the documented losing strategy.

**Explicitly DEFER / AVOID in v0.1:**
- **AVOID:** cross-platform (Polymarket/Kalshi) arb, binary YES+NO bundle arb, live breaking-news speed trading, 5-min crypto up/down markets. All sub-100ms bot territory; treat any profit there as variance.
- **DEFER to v0.2:** NegRisk multi-outcome convert-arb scanner — build it READ-ONLY first; expectancy is thin-to-negative after 2026 taker fees + bot competition. Good API-learning build, not a v0.1 money edge.
- **DEFER to v0.3:** market-making / liquidity-reward farming — $1-3k is too light, needs an always-on adverse-selection-aware bot, and it's a latency war that contradicts your info-not-speed thesis. If it ever comes back, scope it to reward-pool farming in sparse markets with circuit breakers, not quote-tightness competition.
- **Copy-trading:** use Polycopy / Wallet Master / PolySmartWallet **read-only as research signal**, never auto-mirror. The "~78% basket-convergence hit rate" is folklore (n≈14 from one undisclosed-affiliate blog). You'd be exit liquidity (2-30s lag, self-inflicted slippage, deliberate bait).

---

## 2. Market-selection filters (hard gates, all must pass)

Encode these as a pre-trade checklist now; map each to a code check later (Section 7).

| # | Filter | Rule | Why |
|---|--------|------|-----|
| F1 | **Domain** | Only AI-milestone / crypto-protocol / tech markets where your read genuinely beats the crowd. | Your only durable moat; bots can't replicate domain knowledge. |
| F2 | **Resolution clarity** | Read the EXACT UMA resolution criteria + named source of truth before entering. SKIP any market where "true outcome" and "how it resolves" could diverge. Avoid subjective wording ("significant", "major", "in some way"). | UMA token-voting is whale-capturable (Ukraine $7M false resolve; MicroStrategy ~$60M dispute; 1,150+ disputes in 2026, >50% of votes from top-10 wallets). Being right ≠ getting paid. |
| F3 | **Resolution source type** | Prefer markets routed to **Chainlink Data Streams / objective hard data** (automated, near-zero dispute risk). Treat fuzzy/political/geopolitical markets as elevated risk, not tail. | ~98.5% of proposals resolve without a DVM vote; the dangerous 1.5% are the fuzzy/high-stakes ones. |
| F4 | **Liquidity / spread** | Skip markets with **>5c spread** or thin books you can't exit. Assume **hold-to-resolution** as the base case. | Thin-book exit risk: you may not be able to sell except at a bad price. Paper PnL on a thin market is fiction until you can exit. |
| F5 | **Horizon** | Prefer **30-7 day** windows. Avoid sub-$0.10 longshots (the #1 documented retail loss driver — overpriced, negative realized return) and very long-dated markets (dead capital, must clear ~3.5-4%/yr opportunity cost). | Better capital velocity for a small bankroll; less oracle-exposure time; longshots are a trap. |
| F6 | **Edge vs cost** | Only enter if `your_p − market_p` clears **taker fee (if any) + spread + resolution-risk haircut + margin**. Require **≥5-7pt** edge minimum; **more on ambiguous/political markets** (the 5-7pt is a heuristic floor, not derived — scale it per-category, near-zero haircut on Chainlink-resolved, higher on fuzzy). | Edge math is meaningless if estimate is biased (GIGO), so calibration training (Section 6) comes first. |
| F7 | **Entry-time benchmark** | Log `market_price` at YOUR decision instant, same moment as `your_p`. Don't compare your Brier to the market's resolution-converged Brier. | Otherwise the calibration comparison is rigged against you. |

---

## 3. Position sizing — fractional Kelly for $1-3k

Kelly is usable here because both inputs exist: defined payoff ($1 settle, cost = price) and an estimable win probability.

**Binary Kelly:** `f* = (b·p − q) / b` where `b = (1−price)/price`, `p = your prob`, `q = 1−p`.
Fee-adjust the odds: `b = ((1−price)·(1−feeRate))/price`. As a maker, feeRate = 0.

**Worked example:** buy YES at $0.65, your p = 0.78 → b = 0.538 → f* = 0.372 = **37% at full Kelly**. That is a trap on a $1-3k bankroll.

**Sizing rules:**
1. **Quarter Kelly** while you have **<50 logged resolutions** and unproven calibration. Move to **half Kelly** only after your Brier beats the entry-time market Brier on matched questions. **Never full Kelly.** (37% full → ~9% quarter → ~18.6% half.) Overbetting a mis-estimated p is asymmetrically brutal; underbetting only slows growth.
2. **Recompute on CURRENT bankroll each time** (Kelly auto-shrinks after losses = built-in ruin protection memecoin sizing lacked).
3. **Hard caps override Kelly** (caps = insurance against your p being wrong):
   - **Per position: ≤3% of bankroll** (~$30-90). Regardless of what Kelly says.
   - **Total open exposure: ≤25%** of bankroll.
   - **Per correlated cluster: ≤40%** — and treat correlated markets (e.g. 5 Fed-decision markets) as **ONE bet**, not five. *(Note: with a 25% total cap, the 40% cluster cap rarely binds; the total cap is the real backstop. Fine as a safety, just know the ordering.)*
4. **Quarter Kelly + 3% cap makes gambler's-ruin on the full bankroll effectively negligible** across dozens of independent bets. That's the entire point.

> **Sizing is survival, not alpha.** Correct sizing keeps you alive long enough to find out if you have an edge. It does not create one.

---

## 4. Resolution / lockup / liquidity risk rules

- **Resolution-risk haircut:** require ≥5-7pt edge to enter; scale up the haircut on ambiguous/political markets; skip subjectively-worded markets entirely. Never size as if "I was right" guarantees payout.
- **Exit before the last cent:** consider selling winners at **~$0.95** rather than holding to $1.00 to dodge late-resolution lockup + the final-cents dispute tail.
- **Per-UMA-market cap ~15%** of bankroll on any single oracle-resolved market (on top of the 3% per-position rule for fuzzy ones — use the tighter number).
- **Capital lockup:** assume funds are locked to resolution. Never deploy capital you need liquid within ~1 week. Prefer short-horizon so capital recycles. For long-dated bets, your edge must clearly beat ~3.5-4%/yr T-bill opportunity cost + resolution risk.
- **Liquidity/exit:** F4 spread filter; use LIMIT (maker) orders to avoid crossing the book; assume hold-to-resolution. Your own size IS the constraint in thin markets, not your bankroll.
- **Maker discipline (the single highest-leverage behavior):** post resting limit orders **at/inside the spread that REST**; **never let the bot cross the spread** (a limit order that crosses fills as a TAKER and pays the full fee — the premise collapses). Accept non-fills as the cost. Reserve taker fees only for high-conviction, time-sensitive fills where edge clearly exceeds the category taker fee. *(Honesty: the "makers +1.12%/trade" stat is mostly the informed crowd's skill, not a fee bonus you passively inherit. You inherit the fee saving + you eat adverse selection — your resting bid fills disproportionately when the market is moving against you. Watch this on news-sensitive markets.)*

---

## 5. Forecasting + trade log (this IS the testable edge)

A bet log + calibration scoring is the v0.1 deliverable. Auto-populate from the API where possible (don't hand-type).

**Fields per bet:** `timestamp | market | resolution_source | your_p | market_price_at_entry | size | fee_paid | maker/taker | resolution | dispute_flag | realized_PnL | skipped (y/n + reason)`

**Scoring (weekly):**
- **Brier** = mean of `(your_p − outcome)²`. Benchmarks: Polymarket aggregate ~0.084-0.187; superforecasters ~0.10-0.20; coin-flip = 0.25.
- **Reliability diagram:** bin by your stated probability; your 70% bucket should resolve ~70%. If your 90% bucket resolves 65%, you're overconfident → compress extremes toward 50%.
- **The real test:** compare YOUR Brier to the **entry-time market** Brier on the **same matched questions**. If you don't beat the market's implied probability, you have **no edge — stop sizing up.**
- **Track BOTH calibration AND whether sizing converts it to PnL.** Brier correlates only **+0.148** with realized PnL — a perfectly calibrated forecaster who never sizes high-edge bets makes no money. A composite "edge score" (calibration + sizing + discipline) correlates ~+0.5.
- **Log SKIPPED trades too** — discipline decays under FOMO, and the no-bets are part of the calibration record.

**Sample-size honesty:** 50-100 resolved, *independent* forecasts is a **floor, not proof**. At 1-2h/day you'll get low-dozens in month 1 → mostly noise. Many bets on one election are not independent samples. Treat the month-1 number as a noisy first read, not a confirmed edge.

**Free pre-capital track record (do this in parallel, zero money at risk, EU-legal, no KYC):**
- Week 1: daily 20-30 min calibration drills on **Clearer Thinking "Calibrate Your Judgment"** + **Quantified Intuitions** (peer-reviewed: measurable gains in <30 min). Establish your baseline over/under-confidence. Weight **Pastcasting** over pure trivia (closer to real markets).
- Open **Good Judgment Open + Metaculus**, log 50-100 timestamped forecasts on Polymarket-like questions; both auto-score Brier + give reliability/relative-to-crowd scores. GJ Open's *relative* Brier directly answers "am I beating the crowd?" — your exact thesis. Load short-horizon questions to speed feedback. (Caveat: this validates forecasting calibration only, NOT sizing/exit discipline, which is where your crypto edge actually leaked.)

---

## 6. Daily / weekly async workflow (1-2h/day)

**Daily (~20-40 min):**
- 20-30 min calibration drill (week 1) → then Metaculus/GJ Open forecasting to keep the track record growing.
- Check alerts (Telegram) from the scanner (Section 7); triage, don't react. No screen-watching.

**Weekly (~1-2h block):**
- Refresh domain watchlist: scan AI/crypto/tech markets in the 30-7 day window. Apply F1-F7.
- For each candidate: write base rate (outside view) → Fermi-decompose → read EXACT resolution rules → set granular `your_p` → compare to entry-time price → only act if edge clears cost+haircut+margin.
- Place **resting limit orders** (maker). Walk away.
- Score the log: Brier vs market Brier, reliability diagram, PnL net of fees. Note disputes.
- Review skipped trades + any tilt.

**Pre-trade checklist (operationalized Tetlock; this is process/table-stakes, NOT an edge by itself):**
1. Base rate from a reference class (outside view first).
2. Fermi-decompose into knowable/unknowable parts.
3. Read the EXACT resolution rules + source of truth.
4. Set a granular probability (60% vs 65%, not "likely").
5. Compare to entry-time Polymarket price.
6. Act only if `edge > taker fee + spread + resolution haircut + margin`; prefer maker.

---

## 7. Manual-now → automate-later (each rule → a future code check)

Build order respects "test edge first, then automate" and "automate the sizing+logging, not the picking (yet)."

**Stack (verified, 2026):**
- **`py-clob-client` is DEAD** (archived 2026-05-25, non-functional). Do NOT use it or pre-2026 tutorials.
- **Read-only v0.1 data:** free public **Gamma API** (markets/metadata) + **Data API** (positions/trades/leaderboards), no auth — plain JSON over HTTP, no SDK needed. CLOB `/prices-history` for candles.
- **For authenticated trading (later):** evaluate **`py-sdk`** (official, unified REST+WS, but BETA / API churn) vs **`py-clob-client-v2`** (more battle-tested for orders, being phased out). For a 1-month v0.1: read-only via raw HTTP/Gamma/Data; reach for an SDK only when you place orders. Known landmines: floating-point order-build bug, an L1-auth bug blocking new wallets, and **pUSD collateral** (USDC auto-wraps to pUSD on deposit — verify handling in code).
- Implement **exponential backoff + jitter (tenacity)** yourself — no SDK auto-handles rate limits. Limits are generous (Gamma ~4k/10s, Data ~1k/10s) — a 1-2h/day poller is nowhere near them.
- **Do NOT install the Polymarket US (`polymarket.us` / QCEX) SDK** — that's the separate US-regulated venue, irrelevant from Greece.

| Manual rule (now) | Future code check (later) | Build phase |
|---|---|---|
| F1 domain filter | Gamma API category/tag filter | v0.1 scanner |
| F2/F3 resolution-rules read | Parse UMA resolution text; diff headline vs criteria; flag ambiguous wording; flag non-Chainlink source | v0.1 scanner (alert) |
| F4 spread/liquidity | Pull order book depth; reject >5c spread / thin book | v0.1 scanner |
| F5 horizon/longshot | Filter by `end_date` (30-7d window); reject price <$0.10 | v0.1 scanner |
| F6/F7 edge vs cost @ entry-time price | Fee-aware EV check vs your_p; alert when edge > threshold | v0.1 scanner |
| Section 3 sizing | **Kelly + caps calculator** (quarter→half, 3%/25%/40%, fee-adjusted b) | v0.1 (build FIRST — removes impulsive taker behavior) |
| Section 5 log | **Auto-logger**: cron pulls `get_trades`/`get_positions`, populates log, computes Brier vs entry-time market Brier weekly | v0.1 (build FIRST) |
| Maker discipline | Order builder that only posts resting limits inside spread; hard refuse to cross | v0.1+ when trading |
| NegRisk arb | Read-only basket scanner (sum-of-YES < $1), net-of-fee, paper-track | v0.2 |
| LLM forecasting copilot | Agent runs the checklist (base rate, Fermi, devil's-advocate, cited sources); human-in-the-loop, never auto-trades | v0.2-v0.3 |

**Automation gate:** do NOT automate ENTRY until the log shows you beat the entry-time market Brier over 100+ independent resolutions AND positive PnL net of fees. Until then automate only **sizing + logging** (safe, high-value). Automating an unproven edge just loses faster.

---

## 8. Legal / access (Greece, EU) — RISKY-but-usable, re-verify before funding

- **Greece is accessible** at IP level today (one of ~22 of 27 EU states; France/Belgium geo-blocked; **Portugal + Hungary cut Jan 2026**). **No KYC** for non-US retail at your volume. **Do NOT use a VPN** (ToS 2.1.4; actively detected via fingerprinting/WebRTC/on-chain; risks frozen funds — and you don't need one).
- **MiCA reverse-solicitation grey zone**, NOT a license. **Hard inflection: MiCA full enforcement July 1, 2026** + several EU regulators classify prediction markets as **unlicensed gambling**. The near-term Greece risk is more likely a **Hellenic Gaming Commission gambling-law** action than a MiCA one (Greece is mid-crackdown on offshore gambling: criminal penalties up to 10yr / €800k for operators — targets operators/promoters, not individual punters, but signals hardening). **Treat jurisdiction/withdrawal as a capital tail.**
- **Fiat ramp:** SEPA EUR → **Kraken or Coinbase EU** → buy USDC → send on **Polygon** (gas <$0.01) → Polymarket (displays as **pUSD**). Coinbase EU = free USDC-Polygon withdrawal (cheapest leg); Kraken = simplest SEPA. Avoid MoonPay card (2-3%). Off-ramp reverses. USDC is the MiCA-compliant stablecoin (de-risks the holding leg vs USDT).
- **Tax:** **DAC8 in force (Jan 2026)** — your EU on/off-ramp CEX reports your activity to Greek authorities. Greek residents taxed on worldwide income. Classification (gambling income vs capital gains) is **unsettled and materially changes your bill** — get a **Greek accountant's view** before any size.
- **POLY airdrop:** confirmed intent, no live token/date, retroactive/no-farming. **Optional upside only — never distort sizing to farm it** (negative-EV given fees).

**Action gates before funding:** (1) re-verify Greece geo-access **on/after July 1, 2026**; (2) confirm no new KYC at signup; (3) test a full **deposit → trade → withdraw → bank** loop with a small amount first; (4) keep total bankroll capped at $1-3k and funds withdrawable.

---

## 9. Checkpoints (process over PnL)

**1-month checkpoint — instrumentation, not profit. Pass criteria:**
- Read-only scanner live (Gamma/Data API) flagging F1-F7-passing markets to Telegram.
- Kelly+caps calculator + auto-logger working; every bet/skip logged with entry-time market price.
- Week-1 calibration baseline established; 50-100 forecasts logged on Metaculus/GJ Open with a computed Brier + reliability diagram.
- Legal/access + funding loop verified end-to-end with small capital; Greek tax view obtained.
- **Do NOT expect a proven trading edge.** Realistic month-1 trading sample is too small to distinguish skill from variance. Success = the system exists and you have a noisy first signal.

**3-month checkpoint — first honest edge read. Pass criteria:**
- 100+ independent resolved forecasts (paper + small live) logged.
- Your entry-time Brier vs the market's on matched questions → **are you beating the market's implied probability?** If not: no edge yet, stay at quarter-Kelly/flat-small or stop deploying capital and keep training.
- Reliability diagram shows you're not systematically overconfident.
- Realized PnL net of fees tracked alongside calibration (remember Brier↔PnL is weak; both must be positive to claim edge).
- Decision: if calibration beats market AND PnL is net-positive over a real sample → graduate to half-Kelly and consider automating entry + building the v0.2 NegRisk scanner. If not → the payoff was the **knowledge/skill** (co-equal goal), and that's a legitimate outcome. Do not scale capital on a hot streak.

---

## Sources

Mechanics/fees/resolution: docs.polymarket.com (prices-orderbook, fees, resolution/UMA, order-lifecycle, v2-migration), help.polymarket.com (trading-fees, maker-rebates, geographic-restrictions), polysyncer.com/blog/polymarket-resolution-time-2026.
Strategy/expectancy: thedefiant.io (profitability-report-april-2026; $85M MicroStrategy dispute), bloomberg.com (2026-04-28 bots-vs-traders), coindesk.com (2026-04-26 "only 3% drive accuracy"), kucoin.com (84%/87% lose), SSRN 6443103 / CEPR DP21615 (Akey et al., makers vs takers), SSRN 6191618 (Della Vedova, "execution not information"), arxiv.org/html/2604.24366 (microstructure/longshot), quantpedia.com (systematic edges).
Forecasting/calibration: goodjudgment.com (10 commandments), convexly.app (Brier/calibration; +0.148 PnL corr), clearerthinking.org + quantifiedintuitions.org (training, peer-reviewed Futures & Foresight Science 2024), metaculus.com + gjopen.com (track record), en.wikipedia.org/wiki/Brier_score.
Risk/bankroll: prevayo.com + masterpredictionmarkets.com + managebankroll.com (Kelly for prediction markets), predictionhunt.com (sizing), MacLean/Ziemba (fractional Kelly growth/variance).
Oracle risk: coindesk.com (2025-03-27 Ukraine $7M; 2026-06-02 Strategy BTC), thedefiant.io + orochi.network (oracle manipulation), cryptobriefing.com + WSJ-reported voter concentration, polymarkets.co.il (UMA disputes survival guide).
Tooling: github.com/Polymarket/py-clob-client (archived), py-sdk, py-clob-client-v2 (+issues #66/#70), docs.polymarket.com (gamma/data/clob, websocket, rate-limits), agentbets.ai (rate limits), github.com/jd/tenacity.
Legal/access/tax: help.polymarket.com (geo), datawallet.com + copytradeinsider.com (EU 2026), esma.europa.eu (reverse-solicitation guidelines; MiCA July 2026), prnewswire.com (QCEX $112M), techradar.com + gizmodo.com (VPN blocking), coindesk.com (Spain block 2026-05-26), iclg.com + europeanbusinessreview.com + sbcnews.co.uk (Greece gambling crackdown), taxation-customs.ec.europa.eu + cointracker.io (DAC8), circle.com (USDC MiCA), kraken/coinbase support (SEPA/Polygon).
Airdrop: 99bitcoins.com + decrypt.co (POLY confirmed intent), help.polymarket.com (no token announced).

*All concrete claims trace to the verified research digest. Greece access, KYC, fee schedule, and tax treatment are flagged MEDIUM confidence and fast-moving (esp. around the July 1, 2026 MiCA cliff) — re-verify at signup/funding.*