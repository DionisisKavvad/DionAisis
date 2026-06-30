# P4: Forecasting & Calibration Curriculum

A structured skill-building path for the one durable, transferable edge on Polymarket: **calibration**. Prices on Polymarket *are* implied probabilities, so unlike memecoins you can write down a forecast, score it against a defined outcome, and measure whether you actually beat the crowd. This curriculum builds that skill for free (no bankroll at risk), tracks it with hard metrics, and ties it to a real, documented track record over 1-3 months.

**Read this honestly up front:** calibration is **necessary but not sufficient**. Two verified findings that should anchor every expectation below:
- Brier score (pure calibration) correlates only **+0.148** with realized PnL across ~8,600 Polymarket wallets. A perfectly calibrated forecaster who sizes badly makes no money.
- The most rigorous study to date (Della Vedova 2026, 222M trades) found that traders with **above-random accuracy earned negative returns** because they entered late at bad prices, while near-random traders made money on execution. Information without execution discipline loses on Polymarket.

So calibration is the foundation, not the whole building. It tells you whether your probabilities are honest. It does not generate alpha by itself, and it does not protect you from spread, fees, adverse selection, or resolution risk. Treat the first month as a **measurement exercise**, not a profit center.

---

## What calibration actually is (and how it's scored)

- **Calibration** = your stated probabilities match observed frequencies. Things you call 70% should happen ~70% of the time.
- **Brier score** = mean squared error between your probability and the 0/1 outcome. 0 = perfect, 0.25 = always saying 50/50, 1.0 = confidently wrong.
- Benchmarks: Good Judgment Project superforecasters ~0.10 on broad geopolitics; superforecasters generally 0.15-0.20; Polymarket aggregate ~0.084-0.187 depending on the dataset. **The market is a hard benchmark.** Beating a crowd that already scores ~0.08 is genuinely difficult.
- **Brier decomposes** (Murphy 1973) into reliability (calibration) + resolution (sharpness/decisiveness) + uncertainty. A low score requires BOTH being calibrated AND making sharp, decisive calls. Hedging everything to 50% does not win.
- **Sample-size reality:** at ~25 questions a perfectly calibrated 70% forecaster can score anywhere from 60-80% by pure variance. You need **50-100+ resolved, independent forecasts** before your own Brier means anything. At 1-2h/day this is the binding constraint, plan for it.

**Contrast vs memecoins:** memecoins have no defined probability, so you can only track PnL (mostly variance) and Kelly is unusable. Here probability is defined, scorable, improvable, and the skill transfers across domains and into real-world understanding (Goal B's co-equal payoff).

---

## The method: Tetlock's loop (your daily engine)

The strongest predictor of forecasting accuracy in the Good Judgment Project was **commitment to self-improvement**, not IQ or domain expertise. The operational recipe (the "Ten Commandments"), which you run on every question:

1. **Triage** - only work questions in the Goldilocks zone where effort pays. Skip the trivially knowable and the pure-noise.
2. **Fermi-ize** - decompose into knowable/unknowable sub-parts to flush ignorance into the open.
3. **Outside view FIRST** - start from the base rate of the reference class (incumbent re-election rate, base rate of a CEO fired in a quarter, etc.).
4. **Inside view** - then adjust for case specifics.
5. **Update incrementally** - small Bayesian steps as news arrives; resist both overreaction and under-reaction.
6. **Manage the calibration/resolution tradeoff** - avoid overconfidence but don't dawdle at "maybe."
7. **Maintain granularity** - use 60% vs 65%, not just "likely." Accuracy literally degrades when you round superforecasters' numbers.

Base rates (the outside view) are the highest-leverage and cheapest habit to install. Do it week one. It is exactly the muscle memecoin trading never built (no defined odds to anchor to).

---

## The curriculum (3 phases, ~1-3 months)

### Phase 1 (Week 1): Free calibration drills, zero capital

Goal: establish your baseline over/under-confidence before risking anything.

- **Daily 20-30 min** on **Clearer Thinking "Calibrate Your Judgment"** (clearerthinking.org/tools/calibrate-your-judgment). Free, no signup wall, tracks progress. Peer-reviewed evidence (Gruetzemacher et al. 2024) shows measurable calibration gains and reduced overconfidence in under 30 minutes.
- Then shift to **Quantified Intuitions Pastcasting** (quantifiedintuitions.org). Pastcasting (forecasting *resolved* questions you don't already know the answer to) transfers better to real markets than pure trivia, it mimics actual event forecasting. Also use its Calibration game and Estimation/Fermi game.
- Read **Tetlock & Gardner, *Superforecasting*** once for the mental model. Keep the 10 Commandments as a one-page reference.

**Honest caveat:** trivia calibration transfers imperfectly to real-world event forecasting. Weight Pastcasting over trivia games. Do NOT conclude "I'm calibrated" from the game alone, it's warm-up, not proof of market edge. (The canonical Good Judgment Project result *does* show ~1hr of probability training transferring to real geopolitical accuracy, so transfer is possible, just not guaranteed.)

**Checkpoint 1 (end of week 1):** You have a baseline calibration curve and know whether you're systematically over- or under-confident.

### Phase 2 (Weeks 2-6): Money-free track record on real questions

Goal: 50-100 timestamped forecasts with real resolution and automatic scoring, before touching capital. This directly serves Goal B (testable edge FIRST).

- Open **Good Judgment Open** (gjopen.com) and **Metaculus** (metaculus.com) accounts. Both free, money-free, real resolution, automatic Brier/calibration scoring, no KYC/geo issue for an EU resident (no real money wagered).
  - Metaculus auto-computes your Brier + a reliability diagram on your track-record page.
  - GJ Open gives a **Relative Brier Score** (you vs the crowd), which is the more useful metric for your edge thesis: it directly answers "am I beating consensus?"
- Log forecasts on questions that **resemble live Polymarket markets**, especially in your domain (AI milestones, crypto-protocol, tech, macro). These double as paper-trading.
- **Force question diversity and difficulty.** If you only forecast easy/lopsided questions your Brier looks better than your real edge (selection bias). Compare like-for-like.
- **Load short-horizon questions** (resolving days/weeks: sports, near-term economic prints, scheduled events) to speed the feedback loop. Year-out geopolitics is too slow for a 1-3 month curriculum.
- Optionally use **Fatebook** (Sage) to log live predictions on your own near-term events with resolution dates.

**Watch the benchmark trap:** when you later compare your Brier to the market's, log `market_price` at YOUR decision time, not at resolution. The market's published ~0.08 is partly hindsight-favorable (prices converge near resolution). Same-instant comparison is the only fair one.

**Checkpoint 2 (end of week 6):** 50+ resolved forecasts logged. You can plot your reliability diagram. You have a noisy first read on whether you beat consensus. This is NOT yet proof of edge, it's the instrument plus an early signal.

### Phase 3 (Weeks 6-12): Bridge to Polymarket via a scored bet-log

Goal: instrument real (or paper) Polymarket forecasts so calibration converts into a *testable, automatable* edge artifact.

Adopt a **fixed pre-trade checklist** (operationalizes Tetlock, and is exactly what an LLM agent can later automate):
1. Write the base rate from a reference class.
2. Fermi-decompose.
3. Read the **EXACT resolution rules** (the named source of truth, the dispute window, edge cases). This is a documented Polymarket alpha source, most retail never does it, and ambiguous wording is where UMA disputes resolve against fundamentals.
4. Set a granular probability.
5. Compare to the market price.
6. Only act if your edge > taker fee + spread + slippage + a resolution-risk margin. **Log skipped trades too**, or the calibration record is biased.

Build a **bet-log** (spreadsheet or DB) with these fields:

`timestamp, market, your_p, market_price, size, fee, resolution, dispute_flag, realized_PnL`

- Score **Brier weekly**, and compute the market's Brier on the same questions. **If you're not beating the market's implied probability, you have no edge yet, stop sizing up.**
- Track **BOTH** calibration and realized PnL. Because Brier-to-PnL correlation is only +0.148, a calibrated log that loses money means your *sizing/execution* is the leak (the same exits/sizing leak from your crypto work). Reconcile the two.
- Bucket your log by price band to check whether your "edge" is just harvesting the structural favorite-longshot bias (longshots overpriced, favorites underpriced), which can get fee-eaten.
- This can be auto-populated via Polymarket's free public Gamma/Data APIs (markets, prices, resolutions, fills), matching your automation bias. Build it read-only first, zero execution risk.

**Checkpoint 3 (end of week 12):** 100+ resolved, independent bets logged. You know your Brier vs the market on matched questions AND whether your sizing converts calibration into positive net-of-fee PnL. Only now is there a basis to move from flat-small/quarter-Kelly toward half-Kelly.

---

## Sizing gate (how calibration unlocks capital)

Calibration is the trigger for how aggressively you size. The verified discipline:

- **Quarter Kelly** (or flat-small) while you have <50 logged resolutions and unproven calibration. Beginners systematically *overestimate* edge, and full Kelly on a wrong probability overbets with a brutal asymmetric penalty (you can go net-negative even with a real edge).
- Move to **half Kelly only after your Brier beats the market's** over a real sample. Half Kelly keeps ~75% of growth at ~half the variance.
- **Never full Kelly.** Hard caps override Kelly regardless: ~3% per position, ~25% total open, ~40% per correlated cluster.
- Without the calibration log, "quarter Kelly" is just arbitrary conservatism. The measurement is what makes the sizing meaningful.

---

## Measuring your own calibration (concrete)

1. **Reliability diagram:** bin your forecasts by stated probability (e.g. 0-10%, 10-20%, ... 90-100%). For each bin, plot stated probability vs actual hit rate. Perfect calibration = points on the 45-degree line.
2. **Diagnosis:** if your 90% bin resolves at 65%, you're overconfident, compress your extremes toward 50%. This is the #1 beginner failure mode and it's directly diagnosable from the diagram.
3. **Brier vs market:** on matched questions, your_Brier < market_Brier (at decision-time prices) = evidence of edge. Otherwise, no edge.
4. **Cadence:** recompute weekly. Don't conclude from <50 resolutions. Correlated bets (e.g. five markets on one election) are not independent samples, count them as roughly one.

---

## Optional: LLM forecasting copilot (fits your builder profile)

2025-2026 studies show prompting an LLM with the superforecasting commandments lifts human accuracy ~23-43% via structured reasoning. A v0.1 copilot that pulls a market, fetches resolution rules, proposes a reference class + base rate, forces a Fermi decomposition and a devil's-advocate, then outputs a probability and edge-vs-price, is a realistic ~1-month build and keeps you as the final calibrator.

**Caveat:** LLMs are themselves overconfident and hallucinate base rates and citations. The agent must cite sources and you must verify. Do NOT auto-trade off it, human-in-the-loop until your manual + agent track record proves out over 50+ resolved markets.

---

## What this curriculum does NOT give you

- It validates **forecasting accuracy**, not **position sizing / exit discipline** (where your crypto edge actually leaked). A great Metaculus Brier says nothing about whether you'll size correctly or handle capital lockup. Phase 3's PnL tracking is what closes that gap.
- It does not remove **resolution/oracle risk** (UMA token-voting capture, 1,150+ disputes in 2026, ambiguous-wording markets resolving against truth). Read rules like a lawyer; prefer objectively-resolvable markets.
- It does not beat the **bots on speed**. Your lane is slow, research-driven, niche markets, not latency arb.
- Greece/EU **access and tax legality remain a separate, live research target** (MiCA grey zone, July 2026 enforcement ramp, DAC8 reporting). Don't build a track record you can't deploy, verify access before funding. (This is flagged here as a dependency, not resolved.)

---

## Quick checklist

- [ ] Week 1: daily Clearer Thinking + Quantified Intuitions Pastcasting; read *Superforecasting*; establish baseline calibration curve.
- [ ] Weeks 2-6: GJ Open + Metaculus, 50+ timestamped forecasts in your domain, short-horizon weighted, diversity-forced.
- [ ] Weeks 6-12: pre-trade checklist + bet-log (auto-populated via Gamma/Data API), weekly Brier vs market, 100+ resolved.
- [ ] Sizing: quarter Kelly until Brier beats market on a real sample, then half Kelly. Never full. Hard caps always.
- [ ] Verify Greece/EU access + tax before funding (separate legal thread).

---

## Sources

**Calibration & scoring**
- https://www.convexly.app/answers/how-to-measure-forecasting-calibration
- https://www.convexly.app/tools/polymarket-wallet-analyzer (Brier-to-PnL +0.148; Edge Score)
- https://en.wikipedia.org/wiki/Brier_score
- https://library.virginia.edu/data/articles/a-brief-on-brier-scores
- https://www.openphilanthropy.org/research/how-accurate-are-our-predictions/
- https://polymarket.com/accuracy (market Brier ~0.084)

**Superforecasting method & base rates**
- https://goodjudgment.com/philip-tetlocks-10-commandments-of-superforecasting/
- https://fs.blog/ten-commandments-for-superforecasters/
- https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/
- https://forecasting.quarto.pub/book/base-rates.html
- https://www.cambridge.org/core/journals/judgment-and-decision-making/article/developing-expert-political-judgment-the-impact-of-training-and-practice-on-judgmental-accuracy-in-geopolitical-forecasting-tournaments/123EB18425391D05FA6581FDBB3F309F

**Free training tools (verified, free, no scam history)**
- https://www.clearerthinking.org/tools/calibrate-your-judgment
- https://www.quantifiedintuitions.org/
- https://github.com/Sage-Future/quantified-intuitions
- https://onlinelibrary.wiley.com/doi/abs/10.1002/ffo2.177 (sub-30-min calibration gains, peer-reviewed)
- https://forum.effectivealtruism.org/posts/qFkEhW7Hn2mkJvjNv/does-calibrated-probability-assessment-training-work (transfer skepticism, honest)

**Track-record platforms**
- https://www.metaculus.com/faq/
- https://www.metaculus.com/questions/track-record/
- https://www.gjopen.com/faq
- https://github.com/Metaculus/forecasting-tools (automation)

**Market efficiency, inefficiency pockets & honest expectancy**
- https://www.predicts.guru/blog/polymarket-implied-probability-how-to-convert-prices-into-market-expectations
- https://fglancszpigel.medium.com/debunking-the-polymarket-dream-d67ba3922e4b (Della Vedova: execution > information)
- https://www.coindesk.com/markets/2026/04/26/only-3-of-traders-drive-prediction-markets-accuracy-not-the-crowd-study-finds
- https://www.dlnews.com/articles/markets/polymarket-kalshi-prediction-markets-not-so-reliable-says-study/
- https://thedefiant.io/news/research-and-opinion/polymarket-profitability-report-april-2026

**Sizing (Kelly)**
- https://masterpredictionmarkets.com/blog/kelly-criterion-prediction-markets-guide/
- https://www.prevayo.com/blog/kelly-criterion-prediction-markets-complete-guide-2026

**Resolution/oracle risk (read rules)**
- https://thedefiant.io/news/defi/polymarket-s-usd7m-ukraine-mineral-deal-debacle-traced-to-oracle-whale
- https://docs.polymarket.com/concepts/resolution
- https://cryptobriefing.com/polymarket-dispute-resolution-scrutiny/

**LLM-assisted forecasting**
- https://www.emergentmind.com/topics/superforecasting-llm

**Tooling (free data layer for the bet-log)**
- https://docs.polymarket.com/developers/gamma-markets-api/overview
- https://github.com/Polymarket/py-sdk