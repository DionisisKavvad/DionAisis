# D5 — Security & Safety Checklist

You touch brand-new, unaudited contracts daily on $1-3k of risk capital, with only 1-2h/day and no ability to babysit screens. That profile means the threats that actually wipe you out are NOT the slow rugs you can spot later. They are: (1) a single bad signature draining your wallet, (2) a token you literally cannot sell, and (3) keeping savings in the same wallet you trade memecoins from. This checklist is ordered by blast radius: the first three sections stop catastrophic loss; the rest are daily/weekly hygiene that fits an async workflow.

Two framing rules to internalize first:
- **Treat your trading wallet (Axiom embedded / Phantom) as a HOT/BURNER wallet.** Never your vault.
- **The vulnerability is almost always YOU approving a signature, not your wallet being "hacked."** Read every transaction before signing.

---

## 1. Wallet separation (highest leverage, do this first)

The single most important fix. If everything (including non-risk savings) currently sits in one Axiom/Phantom wallet, this is your #1 priority before anything else.

Three-tier structure:

1. **COLD vault — hardware wallet (Ledger/Trezor).** Holds the bulk of your capital. Never connects to a memecoin contract, ever. ~$80-180 one-time. Buy ONLY from the official site (ledger.com) to avoid supply-chain tampering. Brand is secondary; any reputable hardware wallet works.
2. **FUNDING wallet — a separate plain Phantom wallet.** You top up the hot wallet from here, NOT directly from the cold vault.
3. **HOT trading wallet — Axiom embedded / Phantom.** Funded only with **this week's risk capital** (a fraction of the $1-3k), never the whole bankroll.

Why: you sign dozens of unaudited contracts daily, each a potential drainer or malicious token. The blast radius of any single bad signature must be capped at the hot-wallet balance. **Weekly: sweep profits from the hot wallet back to cold storage** so the trading balance stays minimal.

Cost: free (besides the hardware wallet). The only friction is a small transfer step, which is the point.

---

## 2. Seed phrase hygiene (where real wealth is actually lost)

Anyone with the seed controls every account derived from it, irreversibly.

- **NEVER store any seed phrase digitally.** No screenshot, photo, cloud, email, Notion, password manager, or messaging app. (A leaked photo of a seed cost South Korean agencies $4.8M.)
- **3-2-1 backup:** 3 copies, 2 formats (metal plate + paper), 1 stored offsite. Metal plate ~$20-30, optional but cheap insurance.
- **CRITICAL for Axiom:** its 12-word phrase lives in your **browser local storage**. Clearing browser data or a browser compromise = total, permanent loss. **Back up the Axiom phrase offline on day one.**
- If using a passphrase (25th word), store it **separately** from the seed.
- On Ledger: verify device authenticity, update firmware only via the official app, and test recovery before loading real funds. 2026 Ledger firmware ("Clear Signing") shows exactly what you're swapping on the device screen — use it.

---

## 3. Pre-buy token scan (every token, ~30 seconds, mandatory)

A perfectly secured wallet still loses 100% on a honeypot. This is a token-safety check, distinct from wallet security, and it's the part that catches the "can't sell" trap.

Paste the mint address into **RugCheck.xyz** (free, no account). **Auto-reject if:**

- **Mint authority active** → creator can print unlimited supply and dump.
- **Freeze authority active** → creator can lock your wallet so you can't sell. Legit projects revoke this before launch.
- **LP not locked/burned** → dev can pull liquidity instantly (classic rug).
- **Honeypot / sellability fails** → simulate buy-then-sell (via Jupiter); no sell quote or nonsensical output = trap.
- **Token-2022 transfer hooks present with a sell tax** → 2026 risk: devs run custom code on transfer to impose up to 99% sell tax or block sells. Require tax = 0 AND immutable.
- **High top-holder / dev-cluster concentration** → one dev splitting supply across ~50 wallets fakes "decentralized" distribution.

Two caveats the verification flagged:
- **Cross-reference ≥2 scanners.** RugCheck/Solsniffer are heuristic and recall-biased (they've even flagged USDC/USDT). A clean score is NOT a buy signal — it only means the obvious tripwires didn't trip.
- **Scans are point-in-time.** A clean token today can have freeze authority activated or a mutable tax flipped AFTER your buy. That's why position size (Section 7) is your real backstop.

**Never buy a token you received as a surprise airdrop** (see Section 6).

---

## 4. Sign-time defense (the moment drainers win)

Wallet-drainer-as-a-service is industrialized (Riddance, Rublevka Team — $10M+). The attack chain is always: phishing/fake site → you connect → you sign a transaction granting transfer rights → drainer batch-liquidates in seconds.

- **Read Phantom's built-in transaction simulation on EVERY signature.** It previews outcomes, flags known scam contracts, and surfaces approval changes before you sign.
- **REJECT any signature** requesting broad/unlimited "approve all tokens" scope, or anything the simulation flags as suspicious.
- Optional extra layer: a pre-sign scanner extension (Pocket Universe / Blowfish-style) adds scam-site/transaction warnings. Install only from official stores; Phantom's native simulation alone covers most cases. (Each extension is itself attack surface — keep them minimal.)

---

## 5. Approval revocation (monthly sweep)

Solana SPL tokens support delegate/approval permissions, and forgotten old approvals are a top exploit vector (approval-abuse phishing cost >$1B in 2024). Revocation on Solana costs a fraction of a cent.

- **Monthly: run a revoke-all on the trading wallet.** Tools: Phantom's native revoke (Settings flow), **Famous Fox Federation Revoker** (famousfoxes.com/revoke), or Revoke.cash (supports Solana).
- Also disconnect unused dApps.
- For a daily new-contract trader, **monthly is the floor**, not the ceiling.
- **Only reach revoker sites via bookmarks** — fake revoker sites are themselves a phishing vector.

---

## 6. Fake-site, extension, and airdrop defense

Active Phantom/Solflare attack vectors:

- **Lookalike domains** (e.g. solflare.com spoofed as solfllare.live). **Reach wallet/trading sites ONLY via bookmarks or official Twitter/Discord — never via ads or search results.** Ad-position phishing is common.
- **Malicious airdrops:** a scam NFT/token lands in your wallet; opening it shows a "install a security update" link that downloads clipboard/password-stealing malware. **Assume ANY unexpected airdrop is hostile.** Don't click its links, don't sign anything tied to it, hide/burn it.
- **Manage swaps inside the wallet UI** rather than connecting to unfamiliar external sites.
- **Run anti-malware and keep the browser/extensions clean.** Clipboard malware silently swaps the address you paste.

---

## 7. Address poisoning (Solana-specific, cheap to run against you)

Solana's near-zero fees make this prevalent. Attackers send dust from an address that matches your frequent counterparty in the first/last characters, hoping you later copy-paste the lookalike from history and send real funds to them.

- **Never copy a destination address from transaction history.** Use a saved/whitelisted address book.
- **Verify the FULL address**, not just first/last 4 chars.
- **Send a tiny test amount first** for any new large transfer (funding the trading wallet, withdrawing to cold storage).

---

## 8. Bot & automation rules (relevant to your automate-the-edge goal)

Custodial / browser-key bots are the biggest catastrophic-loss vector for an async trader — bigger than slow rugs.

- **Solareum (Telegram bot) was drained of ~$523K / 2,800 SOL across 300+ users** via a malicious insider; no compensation. Any platform where you fund a bot wallet or paste keys inherits its full breach risk.
- **Never paste a seed/private key into any "auto-trading" bot that isn't client-side non-custodial.** Fake GitHub "trading bots" actively drain wallets by stealing keys (SlowMist-documented).
- When you automate (your stated 3-month goal): **prefer client-side non-custodial architectures**, route through audited platform APIs, and use a **dedicated burner wallet funded only with throwaway size**. Decide custodial-vs-non-custodial BEFORE any bot touches real funds.
- **Axiom-specific note:** it is non-custodial (keys client-side), so funds aren't at direct theft risk. BUT the Feb 2026 ZachXBT investigation alleged Axiom employees used internal dashboards to access user wallet data and front-run trades for 10+ months (~$400k). Treat your order flow as **not private**, keep size modest, and don't treat its in-app "smart money" signals as clean. This is a trust/privacy flag, not a reason to avoid the tool outright.

---

## Cadence summary (fits 1-2h/day)

**Per token (~30s):** RugCheck scan → reject on active mint/freeze authority, unlocked LP, honeypot, mutable/>0 tax, high concentration. Never buy surprise airdrops.

**At sign-time:** read Phantom simulation every time → reject broad "approve all" scope or any flagged tx.

**Daily structure:** trade only from the hot wallet, funded with this week's risk capital. Reach sites via bookmarks only. Verify full addresses; test-send before large transfers.

**Weekly:** sweep profits from hot wallet → cold vault, keeping the trading balance small.

**Monthly:** revoke-all on the trading wallet (Famous Fox / Revoke.cash), disconnect unused dApps, update wallet extensions + Ledger firmware, scan machine for malware.

**Never:** store seeds digitally; paste keys into any non-client-side bot; fund a custodial Telegram bot beyond throwaway size; act on or click unexpected airdrops.

---

## Open items to resolve for yourself

- Is all capital currently inside the Axiom/Phantom hot wallet? If yes, Section 1 is the urgent first fix.
- Have you backed up the Axiom 12-word phrase offline? If not, a single browser-data clear could wipe you today.
- Is your trading machine dedicated/clean? Clipboard and extension malware undercut every control above.

---

## Sources

Wallet separation & hygiene:
- https://www.kerberus.com/learn/crypto-wallet-hygiene-guide-2026/
- https://www.ledger.com/academy/topics/security/crypto-wallet-security-checklist-protect-crypto-with-ledger
- https://web3.bitget.com/crypto-news/wallet-safety-guide-2026
- https://www.ledger.com/academy/hardwarewallet/best-ways-to-protect-your-recovery-phrase

Custodial bot / platform risk:
- https://decrypt.co/224371/solana-telegram-trading-bot-shut-down-users-drained-523k
- https://www.dlnews.com/articles/regulation/how-a-dprk-developer-tricked-solareum-and-stole-14m/
- https://docs.axiom.trade/faqs
- https://www.coindesk.com/markets/2026/02/26/zachxbt-alleges-axiom-employee-conducted-insider-trading
- https://coinpedia.org/news/crypto-scam-alert-new-fake-github-trading-bot-is-draining-solana-wallets/
- https://slowmist.medium.com/threat-intelligence-an-analysis-of-a-malicious-solana-open-source-trading-bot-ab580fd3cc89

Token-level scams & pre-buy scanning:
- https://rugcheck.xyz/
- https://www.solanatracker.io/rugcheck
- https://createmycoin.app/articles/solana-rug-checker-guide
- https://www.solsniffer.com/
- https://www.dipprofit.com/honeypot-crypto-scam-memecoin-rugpull-guide/

Drainers & sign-time defense:
- https://hodder.law/solana-wallet-drain-scam-how-it-works/
- https://www.recordedfuture.com/research/rublevka-team-anatomy-russian-crypto-drainer-operation
- https://www.shironeko.gg/phantom-wallet-review/

Approvals & revocation:
- https://help.phantom.com/hc/en-us/articles/19142125651731-Revoke-token-approvals
- https://www.kerberus.com/learn/revoke-crypto-token-approvals/

Fake sites, extensions, airdrops:
- https://help.solflare.com/en/articles/9267784-avoiding-scams-with-airdropped-nfts-and-tokens-in-solflare
- https://phantom.com/learn/crypto-101/common-crypto-scams
- https://coingeek.com/fake-solana-wallet-update-steals-users-digital-holdings-via-nft-airdrops/
- https://goplussecurity.medium.com/exposing-solana-scammers-scams-and-phishing-b5a4e0ca2676

Address poisoning:
- https://support.ledger.com/article/address-poisoning-scams
- https://medium.com/@rahulsinghhh2312/spam-to-scams-dirty-dev-tricks-with-dusting-address-poisoning-on-solana-27a1c30a8325