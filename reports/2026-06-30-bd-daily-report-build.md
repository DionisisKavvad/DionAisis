# BD Daily Report — build & validation (2026-06-30)

**TL;DR:** Έτοιμο και validated end-to-end ένα cross-project daily report για τα 3 BD scrapers (Facebook Ads/Posts, Greek Ecommerce). Πιάνει σιωπηλή απώλεια stores (coverage), proxy/queue health, cost & Lambda perf. Νέο: 2-tab UI (Business/Technical) + change-first diff (δείχνει μόνο τι άλλαξε από χθες). Μένει deploy του Lambda + update του cloud-routine prompt.

## Αρχιτεκτονική
- **gatherer** (Lambda στο AWS, IAM role, μηδέν κλειδιά) → μαζεύει νούμερα από DynamoDB/CloudWatch/SQS/Cost Explorer/Logs → γράφει projected `pack.json` στο S3 (μόνο aggregates, κανένα raw content).
- **routine** (Claude cloud agent) → διαβάζει ΜΟΝΟ το pack → investigation → render HTML → S3 → presign → Slack.
- Security: τα ce/cloudwatch perms που δεν κλειδώνονται σε ARN μένουν στη Lambda· ο cloud agent δεν έχει AWS access.

## Τι πιάνει (business value)
- **Store-level coverage**: universe vs distinct-processed vs **never-processed** — η μετρική που δείχνει ευθέως silent loss.
- **Early-warning queue signals**: consumer-stall (νεκρός consumer), retention-cliff (countdown μέχρι expiry), no-DLQ, sent≫deleted.
- **Counter-vs-reality divergence**: events count (φουσκωμένο) vs distinct stores.
- Proxy bans, cost (account-level + Δ χθες), Lambda perf, memory over-provisioning.

## Πραγματικά ευρήματα (από prod data)
- **Facebook Posts**: 6.132 universe, 5.473 distinct processed → **659 stores χαθηκαν σιωπηλά** (έληξαν στο SQS στις 14 μέρες· consumer νεκρός 20-24/06 από proxy bans· **καμία DLQ**). Το per-project Slack report έδειχνε «6.117/6.132 ✅» επειδή μετράει events, όχι distinct.
- **Greek Ecommerce**: 3.667/10.682 distinct processed → **7.015 ασκαρπάριστα** (νέο εύρημα).
- **Facebook Ads**: coverage μη μετρήσιμο (το `Facebook Ad Process Completed` δεν φέρει store id· σωστά μαρκάρεται αντί να βγάζει ψεύτικο νούμερο). Baseline ~1.0 ad/store = ύποπτο limit bug.
- Proxy infra: `detect-cold-proxies` 100% fail για 5 μέρες (20-24/06) → gate έκλεισε τον main scraper → 0 invocations → απώλεια.
- Ongoing: `scrape-eshops-prod-store-removal-callback` 100% error rate.

## Change-first report (λύση στο alarm fatigue)
- Deterministic signals (`signals.ts`, ΟΧΙ AI) με σταθερό key → diff με το χθεσινό pack.
- Status: 🆕 NEW / 📈 WORSE / ✅ RESOLVED / 📉 BETTER / ⏳ ONGOING (collapsed, δεν ξαναφωνάζει).
- AI = αφήγηση (summary + εξηγήσεις στις κάρτες), όχι πηγή των alarms.

## Validation
- gatherer τρέχει τοπικά + στο πραγματικό S3 (new-schema pack). Coverage Posts 659 ✓ (ταιριάζει με χειροκίνητη διασταύρωση), Greek 7.015, Ads not-measurable ✓. Typecheck καθαρό.
- Report ανεβασμένο στο πραγματικό S3 (`html/2026-06-30.html`), presigned link OK.

## Known nuances / next
- **Day-1 artifact**: το χθεσινό pack στο S3 είναι παλιού schema → coverage βγαίνει NEW· perf signals σε idle μέρα βγαίνουν RESOLVED (no-data ≠ fixed). Καθαρίζει από τη 2η μέρα· εκκρεμεί προαιρετικό fix «no-data ≠ resolved».
- **Next**: (1) `serverless deploy` του gatherer (νέο SQS IAM + κώδικα), (2) commit/push (έγινε), (3) update του pasted prompt στο `/schedule` UI, (4) πραγματικό cloud "Run now" με Slack.
- Δεν είναι ακόμα registered DionAi project — ίσως αξίζει δικό του slug.
