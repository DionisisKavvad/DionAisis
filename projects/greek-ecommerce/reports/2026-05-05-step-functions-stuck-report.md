# Step Functions Stuck Report

**Date:** 2026-05-05
**Account:** Equality (642783340947), eu-west-1
**Status:** 24 executions stuck since 2026-05-01

## Summary

All 24 running Step Function executions are stuck in infinite retry loops due to expired Tailscale API token.

## Affected State Machines

| State Machine | Running | Started | Issue |
|---|---|---|---|
| prod-process-store-information | 21 | May 1, 11:08-11:35 | NoProxyError retry loop (~1800+ failures each) |
| prod-scrape-greek-stores | 1 | May 1, 11:07 | Wait state (waiting for downstream) |
| prod-detect-store-logo | 1 | May 1, 09:02 | 156 NoProxyError failures, retry loop |
| prod-detect-logos | 1 | May 1, 09:02 | Child execution hit 25K event limit |

## Root Cause

`get-active-proxies` Lambda calls Tailscale HTTP API to list proxy devices. The API returns **401 Unauthorized** because the token baked into the Lambda env var is the old revoked one (`tskey-api-kmKaCoSFQt11CNTRL-...`).

The token was already rotated in Secrets Manager, but the Lambda reads it from `process.env.TAILSCALE_API_ACCESS_TOKEN` which is resolved at deploy-time via:

```yaml
TAILSCALE_API_ACCESS_TOKEN: ${ssm:/aws/reference/secretsmanager/tailscale-api-access-token}
```

This SSM reference resolves Secrets Manager at deploy-time and bakes the value into the Lambda environment. No redeploy happened after token rotation, so the Lambda still has the old token.

## Inconsistency Found

In the same service (`process-eshops-information`), two different patterns coexist:

| File | How it reads the token |
|---|---|
| `src/services/tailscaleService.js` | Runtime Secrets Manager call (correct, resilient to rotation) |
| `src/process-store-information/get-active-proxies.js` (line 72) | `process.env.TAILSCALE_API_ACCESS_TOKEN` (deploy-time, broken on rotation) |

The `tailscaleService.js` already has `getTailscaleApiToken()` that reads from Secrets Manager at runtime with proper error handling. The `get-active-proxies.js` doesn't use it.

## All Services Using Deploy-Time Token Pattern

All use `${ssm:/aws/reference/secretsmanager/tailscale-api-access-token}` in serverless.yml:

**scrape-the-greek-ecommerce-v2:**
- `process-eshops-information/serverless.yml` (line 201)
- `scrape-eshop-products/serverless.yml` (line 271)
- `detect-store-logo/serverless.yml` (line 246)
- `scrape-eshops/serverless.yml` (line 359)

**scrape-facebook-ads:**
- `scrape-ads-service/serverless.yml` (line 183)
- `detect-pages-service/serverless.yml` (line 427)

**scrape-facebook-posts:**
- `scrape-posts-service/serverless.yml` (line 279)

Note: `scrape-eshop-products`, `scrape-eshops` already have `tailscaleService.js` with runtime Secrets Manager read, same inconsistency as `process-eshops-information`.

## Why Secrets Manager (not Parameter Store)

The Tailscale Lambda Extension (layer) requires Secrets Manager. It reads the auth key via `TS_SECRET_API_KEY` env var which points to a Secrets Manager secret name. Using the same store for the API access token avoids duplicating the secret across two systems.

The `${ssm:/aws/reference/secretsmanager/...}` syntax is an SSM bridge to Secrets Manager (not a native SSM parameter).

## Fix Plan

**Immediate (unblock the 24 executions):**
1. Redeploy `process-eshops-information` service to pick up new token
2. Stop the 24 stuck executions
3. Re-trigger scrape

**Permanent (prevent recurrence):**
1. In `get-active-proxies.js` (and equivalents in other services): replace `process.env.TAILSCALE_API_ACCESS_TOKEN` with a call to the existing `getTailscaleApiToken()` from `tailscaleService.js`
2. Remove `TAILSCALE_API_ACCESS_TOKEN` env var from all serverless.yml files
3. Ensure IAM role has `secretsmanager:GetSecretValue` on `tailscale-api-access-token` (already present in services that have `tailscaleService.js`)
4. Module-level caching in `tailscaleService.js` ensures minimal API calls (1 per cold start)

**Secrets Manager limits (no concern):**
- 10,000 RPS per account/region
- ~$0.05 per 10,000 calls
- With 21 concurrent Lambdas and cold-start caching, usage is negligible
