# BestPrice HTTP/2 Connection Block

**Date:** 2026-05-07
**Severity:** High (scrape-eshops BestPrice scraping fully broken)
**Status:** Root cause identified, fix pending

## Summary

BestPrice.gr blocks HTTP/2 connections via silent drop. Puppeteer (Chromium) always negotiates HTTP/2, so every BestPrice scrape attempt times out. This is the root cause of the 682 connection errors reported in the Day 7 progress (May 7, 2026).

## Impact

- **scrape-eshops BestPrice:** ~99% failure rate (719/720 invocations failed in 24h)
- **scrape-eshops Skroutz:** 84% success rate (unaffected, different site)
- **process-store-information:** Not affected (100% success, 39/39 in 12h)
- **detect-logos:** Separate issue (SQS receipt handle expiration + Facebook bans)
- **Queue backlog:** 10,428 stores remaining, not draining for BestPrice

## Root Cause

BestPrice added (or tightened) anti-bot protection that does HTTP/2 fingerprinting:

1. TLS handshake completes normally
2. During ALPN negotiation, client advertises HTTP/2 support
3. Server accepts HTTP/2
4. Server detects bot-like HTTP/2 SETTINGS frame (headless Chrome fingerprint)
5. Server does **silent drop**: no response, no connection close, just hangs until client times out

This was confirmed with manual curl tests from local machine (no proxy involved):

| Test | Protocol | Result |
|------|----------|--------|
| `curl --http1.1 bestprice.gr` | HTTP/1.1 | 200 OK, 0.45s, 435KB |
| `curl --http2 bestprice.gr` | HTTP/2 | TIMEOUT, 10s, 0 bytes |
| `curl bestprice.gr` (default) | HTTP/2 (auto) | TIMEOUT, 10s, 0 bytes |
| `curl --http1.1 bestprice.gr -H "Accept-Encoding: gzip, deflate, br"` | HTTP/1.1 | 200 OK |
| `curl skroutz.gr` (comparison) | HTTP/2 | 403 (responds, no silent drop) |

The only variable that matters is the protocol. Headers, user-agent, encoding: no effect.

## Why Puppeteer Is Affected

Chromium always negotiates HTTP/2 via ALPN during TLS handshake. There is no per-request override. The only way to disable it is a global launch flag: `--disable-http2`.

## Why This Wasn't Caught Earlier

- The health check in `get-active-proxies` tests connectivity via `CONNECT api.ipify.org:443`, not BestPrice. That passes fine.
- The Step Function catches `ConnectionError` with 2 retries (30s interval), then routes to "Done" silently. No alert, no escalation, no logging. Errors were invisible until the progress report showed 682 connection failures.
- Skroutz kept working, so the workflow appeared partially healthy.

## Investigation Path

1. Initial investigation showed 682 connection errors, assumed proxy infrastructure issue (2 of 3 Tailscale proxies showed SOCKS5 rejections)
2. User pointed out that unhealthy proxies get filtered by health checks, so they can't be the source of scraping errors
3. Deeper log analysis showed even the "healthy" proxy (100.84.148.15) failed on BestPrice with `net::ERR_TUNNEL_CONNECTION_FAILED`
4. Manual curl tests isolated the cause: HTTP/2 vs HTTP/1.1 is the only differentiator
5. Confirmed: BestPrice silently drops HTTP/2 connections after TLS negotiation

## Proposed Fix

### Immediate (unblocks scraping)

Add `--disable-http2` to Puppeteer launch args in `scrape-store-in-bestprice.js`:

```js
browser = await puppeteer.launch({
  args: ['--disable-http2', ...existingArgs]
});
```

This forces Chromium to negotiate only HTTP/1.1. BestPrice responds normally over HTTP/1.1.

### Also Consider

- **Step Function error handling:** `ConnectionError` currently goes to silent "Done". Should route to a handler that logs/alerts, same as `StoreBanError` goes to `parse-ban-error`.
- **Health check improvement:** `get-active-proxies` could test against actual target domains (bestprice.gr, skroutz.gr) instead of api.ipify.org.
- **Monitoring:** The 682 errors accumulated over 7 days before being visible in the progress report. An alarm on ConnectionError rate would catch this sooner.

## Proxy Status (Separate Issue)

During investigation, also found Tailscale proxy degradation:

| Device | IP | Status |
|--------|-----|--------|
| ias's MacBook Pro | 100.84.148.15 | Alive |
| Dionisis's MacBook Pro 2 | 100.102.211.97 | Dead (SOCKS5 rejection) |
| GB's Mac mini | 100.94.21.68 | Dead (SOCKS5 rejection) |

This is a separate issue from the HTTP/2 block. Even with all 3 proxies healthy, BestPrice scraping would still fail because of HTTP/2 fingerprinting. But fixing proxies will improve Skroutz success rate and overall throughput.

## Files to Modify

- `services/business-services/scrape-eshops/src/scrape-all-stores/scrape-store-in-bestprice.js` (add `--disable-http2`)
- Possibly `scrape-store-in-skroutz.js` too (preemptive, in case Skroutz adds similar protection)
- Step Function definition in `serverless.yml` (ConnectionError handling)
