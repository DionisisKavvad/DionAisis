# eshop-analyzer

- **Type:** work
- **Code:** `/Users/dionisis/Projects/eshop-analyzer`
- **AWS Alias:** none (uses direct credentials from .env)
- **Description:** E-shop website analyzer. Claude Agent SDK + agent-browser autonomously browse a store and return structured brand intelligence JSON.
- **Status:** Active
- **Key date:** none

## What It Does
Δίνεις ένα store URL, ο agent ανοίγει τη σελίδα σε πραγματικό browser, την "διαβάζει" και επιστρέφει δομημένο JSON: industry, brandTone, target audience, brand colors, logo, taglines, social media, product categories, feature flags. Τροφοδοτεί το video ad platform (onboarding, video creation, lead scoring).

## Architecture
```
SQS message {name,url,domain}
    → sqs-worker.cjs (PM2 daemon, concurrency, visibility extension, env allowlist)
    → spawn analyze-workflow.js (1 subprocess/store)
    → Claude Agent SDK + agent-browser (≤7 Bash recipe)
    → analysis JSON
    → DynamoDB (key: storeName+domain) + S3 (screenshot+json) + EventBridge (cost/tokens)
```

## Stack
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`), agent-browser
- ColorThief + Sharp (brand palette από το logo)
- AWS: SQS, S3, DynamoDB, EventBridge
- PM2 (dev/prod)

## Run
```bash
# Local test (χωρίς SQS) — χρειάζεται μόνο CLAUDE_CODE_OAUTH_TOKEN στο .env
npm run workflow -- '{"storeName":"Plaisio","storeUrl":"https://www.plaisio.gr","domain":"plaisio.gr"}'

# SQS worker
npm run start:dev
npm run start:prod
```

## Notes
- brandTone enum: premium | budget | playful | professional | luxury | artisan
- primaryIndustry enum: 15 κλάδοι (Electronics, Fashion, Pharmacy, ...)
- Output schema: `src/utils/store-analysis.js` (ANALYSIS_SCHEMA)
- Recipe/prompt: `src/workflow/prompts/store-analysis-system.md`
- Local test ~115s, ~$0.33/store (Plaisio, sonnet-4-6)
- README + HTML report παράδειγμα μέσα στο repo (`reports/`)
- Σχέση με platform/brief: βλ. report `2026-06-03-eshop-analyzer-platform-brief-integration.md`
