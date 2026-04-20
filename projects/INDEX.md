# Projects Index

Bird's-eye view of all active workstreams. Each row links to the project's own `README.md`. The `Type` here must match the `- **Type:**` line inside each README.

**Totals:** 8 work, 6 personal

| Project | Type | Status | Key date |
|---|---|---|---|
| [brief-localhost](./brief-localhost/README.md) | work | Active | none |
| [claude-code-stuff](./claude-code-stuff/README.md) | personal | Active | none |
| [content-engine](./content-engine/README.md) | personal | Active | 2026-05-03 |
| [gmail-mcp](./gmail-mcp/README.md) | personal | Live | 2026-04-19 (last ship) |
| [greek-ecommerce](./greek-ecommerce/README.md) | work | Tracked | none |
| [hero-wars](./hero-wars/README.md) | personal | Planning | none |
| [job-manager](./job-manager/README.md) | work | Tracked | none |
| [paramythas](./paramythas/README.md) | personal | Active | 2026-07-01 |
| [platform](./platform/README.md) | work | Active | none |
| [scrape-facebook-ads](./scrape-facebook-ads/README.md) | work | Tracked | none |
| [scrape-facebook-posts](./scrape-facebook-posts/README.md) | work | Stable | none |
| [video-templates](./video-templates/README.md) | work | Active | 2026-04-30 |
| [vigil](./vigil/README.md) | personal | Planning | 2026-04-26 |
| [youtube-insights](./youtube-insights/README.md) | work | Active | 2026-06-01 |

## How to keep this in sync
- When a project is added, created το folder `projects/<name>/README.md` με `- **Type:** work|personal` ως πρώτη γραμμή metadata, και πρόσθεσε row εδώ.
- Όταν αλλάζει `Status` ή `Key date` σε κάποιο README, ενημέρωσε και την αντίστοιχη γραμμή εδώ.
- Quick grep για filtering:
  - Όλα τα personal: `grep -rl "Type:\*\* personal" projects/`
  - Όλα τα work: `grep -rl "Type:\*\* work" projects/`
