# brief-localhost

- **Type:** work
- **Code:** `/Users/dionisis/Projects/brief-localhost`
- **AWS Alias:** none (uses direct credentials from .env)
- **Description:** SQS-based worker that processes design briefs using Claude Agent SDK. Analyzes products and generates color/font recommendations.
- **Status:** Active
- **Key date:** none

## What It Does
Takes a brief input (characteristics, audience, placement, products) and runs a Claude Agent SDK workflow that produces:
- Color tag recommendations
- Font pairing suggestions
- Platform-ready font config

## Architecture
```
SQS Message (with requestId)
    → sqs-worker.cjs
    → idempotency check (DynamoDB event-sourced)
    → brief-workflow.js
    → Color Tags (parallel) + Font Process (sequential)
    → final-brief-result.json
    → S3 Upload (optional)
```

## Stack
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- AWS: SQS, DynamoDB (idempotency), S3, EventBridge
- PM2 for worker management (3 instances)
- Dynamic prompt templates in `src/workflow/prompts/`

## Run
```bash
# Manual
npm run workflow <requestId>

# SQS worker (prod/dev)
npm run start:prod
npm run start:dev
```

## Notes
- Outputs go to `.output/<timestamp>-<requestId>/` (artifacts, logs, traces)
- Input sanitizer for prompt injection prevention
- Error sanitizer for credential redaction
- Docs in `docs/` (architecture, brief domain data)
