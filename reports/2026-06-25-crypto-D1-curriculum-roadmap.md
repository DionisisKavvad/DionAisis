# D1 — Curriculum / Gap-Closing Roadmap

**For:** Solana memecoin trader, 2-3 months in, currently -10% net, no formalized ruleset.
**Constraints baked into every step:** $1-3k risk bankroll, 1-2h/day max, async (alert -> quick decision), NO all-day sniping. Speed/sniping edge is off the table. Your only realistic edge is **information + system/automation**: be on the fast side of a two-speed market vs the slow (YouTube) crowd.

## How this roadmap is sequenced (and why)

Your self-rated gaps, biggest first: **exit/sizing/risk (very little)** and **tooling (very little)**, then on-chain reading (medium), then narrative/meta (little-medium). The research is blunt about why that ordering is correct:

- Most memecoin traders lose. Entries are NOT where the money leaks. **Round-tripping winners back to break-even** (a 10x becoming a 2x becoming flat) is the #1 profit leak, and it's driven by loss aversion + greed, not bad picks. A -10% conviction trader with no exit rules is the textbook victim.
- Therefore: **fix exits/sizing first** (weeks 1-4), because it's the highest-leverage gap AND the easiest part of the system to write down as if/then rules and later automate. Entry filtering and narrative come after, because good entries into a sloppy exit framework still lose.
- Honest framing throughout: a ruleset reduces variance and tilt. It does **not** manufacture positive expectancy. Memecoin EV is negative for most participants. The goal of v0.1 is a **testable process**, not assured returns.

**Hard prerequisite (do in Week 0, before any of this):** security hygiene. None of the below matters if your wallet gets drained. See the Security block at the end; it's listed last only because it's a one-time setup, not because it's low priority.

---

## Month 1 — Close the killer gaps: EXIT/SIZING/RISK + minimum tooling

Goal: by end of Month 1 you have a **written, testable ruleset** and a **free alert/logging stack** running. You are still clicking buy manually.

### Week 1 — Exits and sizing (the #1 gap)

**Learn:**
- **The expectancy model.** Expectancy = (Win% x Avg Win) - (Loss% x Avg Loss). At a 40-50% win rate you are still profitable IF avg winner >= 3x avg loser. The edge is **asymmetry, not accuracy**. If your winners aren't running, the leak is the exit ladder.
- **Position size IS your stop.** In illiquid memecoins, nominal stops slip badly (documented case: a trader lost $5.7M to slippage on one exit). Treat the full position as at-risk. Don't rely on a clean stop fill.
- **Round-tripping psychology.** Losses felt ~2x as intensely as gains. The fix is pre-commitment + automation, not willpower.

**Do (write these down as your v0.1 ruleset):**
- **Sizing rule:** risk 1-1.5% of bankroll per trade (~$20-30 on $2k). Max 5% in any single coin. Max 5-10 open positions. Diversify across small bets.
- **TP ladder (pick ONE, write exact %/multiples, never freelance):** e.g. sell 50% at 2x (recovers your initial = now playing house money), 25% of the remainder at 5x, 25% at 10x, keep a 5-10% moonbag on a trailing stop. *Caveat from verification: these exact multiples trace largely to ONE blogger (FXM Brand); the CONCEPT (partial-profit then trail) is the converged-on standard across independent trading-education sources, the exact numbers are a starting hypothesis to tune against YOUR log.*
- **Trailing stop on the moonbag:** the "20-30%" number is flagged as likely **too tight** for memecoin volatility. Start there but plan to make it volatility-based once you have data.
- **Replace the discretionary "first red candle = exit" rule with a mechanical trailing stop** so you actually kill freelancing instead of re-introducing it.

### Week 2 — Anti-tilt rules + the fee reality

**Learn:**
- **Fees can flip your expectancy negative at your size.** True round-trip on a Pump.fun trade is ~3-7% (protocol fee + terminal fee ~0.75-1%/side + priority/Jito + slippage + MEV). On a $20-30 trade that's brutal. **Every expectancy calc must be net of fees.** This alone partly explains your -10%.
- **Implication:** bias to **fewer, higher-conviction trades.** Churn is a primary leak.

**Do (add to ruleset, enforce structurally not by willpower):**
- No entry without a pre-written exit.
- Max N trades/day.
- Mandatory cooldown after any loss.
- Never average down a loser.
- **Enforcement:** only fund the trading wallet with the day's/week's risk allowance. Hard-code limits via the terminal where possible (the research found NO reliable daily-loss lockout, so wallet-funding discipline is the real mechanism).

### Week 3 — Minimum tooling + start the trade log

**Learn / set up (all free):**
- **Trade log** (dead-simple spreadsheet or Notion, NOT a custom app): log entry, exit, R-multiple, and **which exit rule fired**, for every trade.
  - Define **R off your risk-capital-per-trade** (the amount you'd zero out), not a tight stop, because memecoins have no clean stop.
  - Log the **partial-exit ladder explicitly**, not just a single exit.
- **Solana Tracker** (solanatracker.io/wallet, free, no login) on your own wallet to measure realized + unrealized PnL.
- **Axiom auto-sell / limit orders / trailing stop** (you already use Axiom): encode your TP ladder + moonbag trailing stop as **resting orders at entry time.** This is the bridge from "manual edge" to "automated" with near-zero setup, and it directly attacks your biggest gap by removing the in-the-moment decision. Average winning Solana memecoin trade lasts <4h, so preset orders let trades resolve whether or not you're at the screen.
  - **Honest caveats:** Axiom fees are ~0.75-0.95%/side (NOT the rosy 0.5% you'll see quoted). Stops/limit sells are server-side and **do NOT reliably fill on dumps or rugs** (illiquidity, gaps, freeze authority); they protect against ordinary fades only. Use a **dedicated burner wallet** funded only with risk capital. And note the Feb 2026 ZachXBT insider-data scandal (below) when deciding how much to centralize on Axiom.

### Week 4 — Pre-trade safety NO-gate (cheap on-chain reading starts here)

**Learn / wire in (free):**
- **RugCheck.xyz** (free public REST API, no key): returns a 0-100 risk score + structured flags. Auto-reject if mint authority active, freeze authority active, LP not locked/burned, or honeypot/sellability fails. *Implementation notes from verification: gate on the structured risk FLAGS, not the opaque composite score; use `score_normalised` (0-100) if you use the score at all; add 429 backoff + caching; treat a clean score as "didn't trip obvious tripwires," NEVER as a buy signal.*
- **Cross-reference a 2nd scanner** (Solsniffer) and run a **honeypot/sellability sim** (Jupiter buy-then-sell quote check; reject if no sell quote). In 2026 also check for **Token-2022 transfer hooks** (mutable/99% sell taxes). These sims are point-in-time and beatable by post-buy mutation, so always pair with live freeze/mint/transfer-fee authority checks.

**Month 1 checkpoint (see Success Metrics below):** ruleset written; log running; ~10-30+ trades logged with R-multiples; alert/safety stack live; you can state your realized win-rate and avg win/avg loss (even if the sample is thin).

---

## Month 2 — On-chain reading + the "synthetic network"

Goal: turn "when to buy/sell" into a checklist, and build the greenfield network as auto-tracked on-chain wallets (your stated network fix). Still alert -> manual decision; no blind copy-trading.

### Weeks 5-6 — Entry filtering (NO-gate + YES-checklist)

**Learn the evidence base:**
- **MemeTrans (arXiv 2026):** a small set of on-chain features predicts dumps well enough to cut simulated losses ~56%. **Bundle % and early-buyer concentration are the heaviest signals.** But AUPRC was only 0.57: these are a **NO-gate, not a YES-gate.** They reduce loss; they do not make a coin a buy.
- **Bundles are the dominant 2026 attack:** devs spin up 20-50 clean wallets buying simultaneously along the bonding curve. Per-wallet holder checks miss this; you need **cluster / funding-graph analysis** (shared funding source is the strongest tell).

**Do — write the two-list checklist (this IS your documented manual edge):**
- **KILL-FILTERS (auto-reject):** mint/freeze authority live; LP not locked/burned; honeypot or mutable/>0 sell tax; largest connected cluster >15-20%; top-10 holders >40%; mcap/liquidity >50x; liquidity <$100k; bundle/sniper % over your cap.
- **YES-CHECKLIST (post-graduation entries):** dev <5% with public allocation post; organically rising holder count; smart-money accumulating AND holding through dips; multi-week narrative family; listed on 3+ discovery surfaces within 48h.
- Decide: **on-curve** (earlier, max insider risk, needs survivability filters) vs **post-graduation only** (cleaner, later). Post-graduation fits your constraints better.
- Make every line a **measurable field** so it's testable and automatable. Thresholds are 2026 starting points; tune via your log.

**Tools for this (free / near-free):**
- **Bubblemaps** — 30-sec visual cluster/insider check per candidate. Largest connected cluster <15% = OK; central bubble radiating same-color lines = reject. *Caveat: free map shows top-150 holders only; a line means on-chain linkage, NOT proven same-owner, so interpret, don't auto-reject on color.*
- **Axiom Pulse filters** (you already use Axiom): hard-code your NO-gate thresholds (sniper %, holder concentration, min liquidity, bundle %) as saved filters. Coarser than RugCheck/Bubblemaps, use as a screen, then audit finalists.

### Weeks 7-8 — The synthetic network (network gap + tooling)

**Learn:**
- On-chain history can't be cherry-picked or faked. Track wallets, not humans. **Edge = the CLUSTER signal** (multiple proven wallets converging on one theme = narrative forming), NOT chasing a single late tx. By the time a whale's tx is visible you may be 10-20% late, so naive copiers become exit liquidity.
- **Copy-trading is the wrong first target.** Latency + ~3-7% round-trip fees + adverse selection make blind/AFK auto-copy likely negative-EV at your size. Use tracking for **alerts + learning ("why did this wallet buy?")**, not blind mirroring.

**Do — build the free v0.1 network stack:**
- **Kolscan** (free) to DISCOVER candidate wallets via a real PnL/win-rate leaderboard. *Caveat: now owned by Pump.fun (conflict of interest; leaderboard is gameable and PnL numbers may be inaccurate). Cross-check every candidate on an independent tracker. Don't buy the $KOLSCAN token.*
- **Cielo Finance free tier** as the alert backbone: 10 Solana wallet slots (250 total across chains), Telegram/Discord push, sign-in is message-signature only (no asset permissions). 10 slots forces ruthless curation. Note 120 alerts/hr cap.
- **7-point wallet vetting filter before any wallet earns a slot** (use as a REJECTION filter, not a winner-finder):
  1. 30+ trades over 60+ days. 2. Win rate (weight realized PnL higher). 3. Realized PnL is the majority of total PnL. 4. Max drawdown <40%. 5. No 90%+ single-token concentration. 6. Wash-trade filter (>40% volume in one token + <10min round-trips = reject). 7. Consistent activity (not dormant-then-spiking).
  - Add: **filter out fast-flip wallets** (enter/exit in seconds) — uncopyable for a 1-2h/day async trader. Target slower-hold, accumulation/narrative-style wallets.
  - Start with **~8-15 wallets**, not 20-50 (alert overload). Re-vet monthly; prune. Treat the wallet list as perishable; the durable asset is the pipeline (track -> filter -> alert -> log -> review).
  - Require a **transfer/airdrop/MEV-aware PnL check** before trusting any number (free trackers don't de-noise; this is where garbage-in happens).

**Month 2 checkpoint:** two-list entry checklist written and being applied; 8-15 vetted wallets in Cielo pushing alerts; you're logging each alert + decision + outcome.

---

## Month 3 — Narrative/meta + prove the edge, then plan automation

Goal: add the highest-leverage mental model for your time budget (category-level reading), confirm whether your logged process has edge, and decide the first automation target.

### Weeks 9-10 — Narrative/meta as the master frame

**Learn (this is the single most important mental model for your style):**
- Memecoins pump in **narrative waves**, not randomly. Families (Dog, Cat, Frog, AI, Political, Brainrot, Celebrity) rotate together. Don't ask "is this coin good," ask "**which meta is running, is it early or late, does this coin fit it.**" Category-level reading is far higher leverage than per-coin sniping you can't win.
- **Category data LEADS coin-level moves by hours to days** — exactly the async edge you need.
- **Narratives originate UPSTREAM of crypto-twitter:** 4chan/Reddit and increasingly **TikTok** make the meme first, then it gets tokenized. By the time it's loud on CT the early move is gone. YouTube (your sole source today) is the slowest, most-lagging layer.
- **Dying-meta signals** (your exit-side discipline): family 24h + 7d both negative while dominance drops; leader failing new highs on rising volume; CT flipping to capitulation; stablecoin share of flow rising. When the meta dies, reduce size or sit out, don't rotate into laggards.

**Do — higher-signal sources (demote YouTube):**
- **Sharpe.ai narrative tracker** (sharpe.ai/memecoins, free, 30-min refresh): ranks families by mcap/24h/7d/momentum/dominance. *Honest flag: its specific rotation rules (enter #2 narrative +15%/7d flat 24h; leader +25%/7d = late) are the VENDOR's own unbacktested marketing heuristics. Use the dashboard as one input; paper-track the rules for weeks before trusting the numbers; cross-check against CoinGecko categories / a Dune dashboard.*
- **LunarCrush free tier** as a social-momentum CONFIRMATION layer only (gameable; lags on fresh low-caps; never standalone; never a discovery/early tool).
- **Build a private X/CT list of 10-20 accounts** that post entries WITH on-chain wallet addresses; verify each wallet via your 7-point filter, then **track the wallet, not the human.** Add TikTok-trend + Reddit meme-velocity scanning as idea-generation only (4chan is the noisiest, lowest-yield).
- **AVOID paid Telegram/Discord "alpha caller" groups entirely.** Documented coordinated dumping (e.g. Solidus Labs' "PumpCell"), ~70% of signal-only traders lose, and they're structurally designed to make you exit liquidity — incompatible with async 1-2h/day (you only buy tops). Most "best group" listicles are affiliate content. If you ever join one, treat a loud call as a SELL/sentiment signal, never a buy, and only harvest wallet addresses to vet independently.

### Weeks 11-12 — Prove the edge + plan automation

**Do:**
- **Compute realized win-rate and avg win / avg loss net of fees.** If avg win < avg loss, the leak is your exits, fix the ladder before anything else.
- **Kelly as a sizing-DOWN discipline, not now:** you need 50-100+ closed trades per setup before Kelly inputs mean anything (a 5pp win-rate error swings position size ~3x). Stay on tiny fixed-fractional (1-1.5%) until then. Use **quarter-Kelly at most** later. **A negative Kelly = no edge, stop trading that setup.** This is your kill switch.
- **Plan the v0.1 automation (build by ~3-month mark, ship the dumbest version):** Helius Enhanced Webhook (free tier) -> small serverless function -> Telegram alert, tracking 10-30 wallets, with a RugCheck NO-gate bolted on. **The filter config IS your documented edge.** You still click buy manually. Sequence: alerts-only (now) -> semi-auto one-tap-approve (~3mo) -> unattended auto-exec only after logged data proves positive expectancy net of ~8-12% round-trip costs (maybe never at this account size).
- **Do NOT build/buy:** launch-sniping/latency-race bots (pros own sub-100ms), Pump.fun volume bots (manipulation), or any GitHub "trading bot" you'd run with your private keys (active wallet-drainer vector, SlowMist-documented). If you automate, use audited platform APIs + a dedicated burner wallet, never paste a seed phrase into unaudited code.

**Month 3 checkpoint:** see Success Metrics.

---

## Success metrics / checkpoints

**1-Month checkpoint:**
- Written ruleset exists: sizing (1-1.5%, max 5%/coin, max 5-10 open), ONE TP ladder, trailing moonbag stop, anti-tilt rules.
- Trade log running with R-multiples + which-exit-rule-fired, **net of fees**.
- Free alert + safety stack live (Cielo or Axiom alerts + RugCheck NO-gate + Solana Tracker PnL).
- Security hygiene done (cold vault, burner trading wallet, seed backed up offline).
- **Process metric (not PnL):** did you follow your written rules on every trade? Did you avoid averaging down and respect cooldowns? At ~10-30 trades, PnL is still noise; rule-adherence is the real Month-1 score.

**3-Month checkpoint:**
- Entry NO-gate + YES-checklist written and applied; 8-15 vetted wallets feeding alerts.
- ~50-100 logged trades; you can state realized win-rate and avg win/avg loss **net of fees**.
- **Edge test:** is portfolio avg win >= ~3x avg loss? Is logged expectancy positive net of ~3-7% round-trip fees? If yes, you have a testable manual edge to automate. If no, you've learned exactly where the leak is (almost always exits) for the cost of tiny size, the honest and intended outcome.
- v0.1 automation scoped/prototyped (webhook -> RugCheck filter -> Telegram), manual buy still in your hands.

---

## Week 0 prerequisite — Security (one-time, non-negotiable)

A drained wallet beats any edge. Catastrophic loss for an async trader comes from custodial bots, malicious signatures, and seed leaks, not slow rugs.

- **Three-tier wallets:** Ledger cold vault (never touches a memecoin contract) -> Phantom funding wallet -> Axiom/Phantom **hot/burner** trading wallet funded only with this week's risk capital. Blast radius of any bad signature = hot-wallet balance only.
- **Back up the Axiom 12-word phrase offline immediately** (it lives in browser local storage; clearing data or a browser compromise = total loss). 3-2-1 backup, never digital.
- **Pre-buy:** RugCheck (~30s, every token). **At sign-time:** read Phantom's transaction simulation; reject any "approve all tokens"/broad-scope request. **Monthly:** revoke approvals (Famous Fox Revoker / Revoke.cash), disconnect unused dApps, update firmware/extensions.
- **Never** copy a destination address from tx history (address poisoning); verify the full address; test-send before large transfers.
- **Be aware:** Feb 2026 ZachXBT exposed Axiom employees using internal dashboards to de-anonymize and front-run users (~$400k, 10+ months). Non-custodial so keys are safe, but assume the platform can see your activity; keep size modest; don't treat Axiom's in-app "smart money" as clean.

---

## Sources (by domain)

**Exit / sizing / risk:**
- tradetron.tech/blog/timing-the-trade-why-entry-and-exit-rules-matter-in-crypto
- merlincrypto.com/blog/why-crypto-investors-cant-sell-the-psychology-behind-missed-exits
- stratiumsol.com/blog/risk-management-memecoin-trading-solana
- gate.com/learn/articles/playing-meme-coins-the-strategy-and-path-from-a-few-hundred-u-to-a-million-u/8645
- medium.com/@fxmbrand/the-ultimate-guide-to-memecoin-entry-and-exit-strategies (treat exact multiples as one author's template)
- news.slashdot.org/story/24/01/15/1555226 (slippage $5.7M case)
- altrady.com/blog/risk-management/kelly-criterion-crypto-position-sizing
- journalplus.co/learn/guides/kelly-criterion-guide/
- axiompro.app/auto-sell/ ; axiompro.app/limit-orders/ ; docs.axiom.trade/getting-started/fees
- pump.fun/docs/fees (round-trip fee math)

**Entry / on-chain filtering:**
- arxiv.org/html/2602.13480v1 (MemeTrans)
- nansen.ai/post/solana-token-analysis-complete-framework-for-evaluating-tokens-in-2026
- blog.bubblemaps.io/how-to-analyze-meme-coin-holders-with-bubblemaps/
- defade.org/blog/solana-memecoin-insider-networks
- rugcheck.xyz ; api.rugcheck.xyz/swagger/index.html ; solsniffer.com
- docs.bitquery.io (Pump-Fun Marketcap/Bonding-Curve API)
- docs.axiom.trade/axiom/finding-tokens/pulse

**Narrative / meta:**
- sharpe.ai/memecoins ; sharpe.ai/learn/memecoin-narrative-tracker (rotation rules = vendor heuristics, unbacktested)
- dextools.io/tutorials/solana-memecoins-complete-guide-2026
- dlnews.com/articles/people-culture/mog-coin-memecoin-soars-after-4chan-mogging-meme-blows-up
- benzinga.com/crypto/cryptocurrency/26/01/49961366 (TikTok coins meta)
- kolscan.io ; lunarcrush.com ; lunarcrush.com/pricing
- coindesk.com/business/2025/12/09 (PumpCell coordinated dumps) ; arxiv.org/html/2507.01963v2

**Tooling / network:**
- cielo.finance ; docs.cielo.finance/subscribe
- kolscan.io/leaderboard ; coindesk.com/markets/2025/07/11 (Pump.fun acquires Kolscan)
- uwuu.ai/blog/gmgn-review ; docs.gmgn.ai/index/gmgn-fees-settings (1% fee, 0.006 SOL priority default)
- nansen.ai/solana-onchain-data ; academy.nansen.ai/articles/0414043-new-pricing-explained
- coinbureau.com/review/axiom-trade-review ; coindesk.com/markets/2026/02/26 (ZachXBT/Axiom insider trading)

**Automation feasibility:**
- helius.dev/blog/build-a-wallet-tracker-on-solana ; helius.dev/pricing ; helius.dev/blog/create-a-solana-telegram-bot-in-less-than-100-lines-of-code
- github.com/DracoR22/handi-cat_wallet-tracker
- chainstack.com/solana-trading-infrastructure-2026/

**Security:**
- decrypt.co/224371 (Solareum drain) ; dlnews.com/articles/regulation/how-a-dprk-developer-tricked-solareum
- kerberus.com/learn/crypto-wallet-hygiene-guide-2026/ ; ledger.com/academy/topics/security/crypto-wallet-security-checklist
- help.phantom.com/hc/en-us/articles/19142125651731 (revoke approvals) ; support.ledger.com/article/address-poisoning-scams
- slowmist.medium.com/threat-intelligence-an-analysis-of-a-malicious-solana-open-source-trading-bot (GitHub bot drainer)

*Source-quality note: several exit/narrative tactics trace to SEO/affiliate blogs (notably FXM Brand on Medium) and vendor marketing (Sharpe.ai, GMGN, Axiom reviews). Exact numeric thresholds are starting hypotheses to A/B-test against your own trade log, not validated truths. Tool rankings/listicles are systematically conflicted (bots pay up to 35% lifetime fee commissions); the tools named above are recommended on independent grounds, with affiliate/trust flags called out inline.*