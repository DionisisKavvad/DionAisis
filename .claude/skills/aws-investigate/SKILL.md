---
name: aws-investigate
description: Investigate AWS issues, executions, logs, and events in one of Dionisis's aliased AWS accounts. Resolves the right AWS profile, stage, and region from DionAi/.env before running any AWS CLI commands.
---

# AWS Investigate

## When to use this skill
Trigger on any phrasing like:
- "investigate <alias> ..."
- "aws investigation for <alias>"
- "check <alias> logs for ..."
- "what's happening on <alias> with ..."
- "why did <alias> ... fail"
- "look at the <alias> step function execution for ..."

The `<alias>` is the account name Dionisis types (e.g. `gbInnovations`, `equality`). Anything that sounds like "go poke around in AWS for account X" fires this skill.

## Rule 0 — Never run AWS CLI before resolving the environment
Before the first AWS call, you MUST:
1. Read `DionAi/.env` and extract the alias's `PROFILE`, `STAGE`, `REGION`
2. Apply any explicit overrides from the user's message
3. Confirm the resolved trio in one line back to the user
4. Only then run AWS CLI commands

If the alias is missing or incomplete in `.env`, stop and ask Dionisis to fill it in. Do not guess.

## Step 1: Parse the request
Extract from the user's message:
- **Alias** (required): the account name, matches a key prefix in `.env`
- **Stage override** (optional): if they said "prod", "staging", "dev" explicitly
- **Region override** (optional): if they mentioned a region like "eu-central-1"
- **Investigation target**: what they actually want (Lambda name, Step Function, time window, error message, resource ID, etc.)

If the alias is ambiguous ("investigate the prod account"), ask which alias.

## Step 2: Resolve the environment
Read `DionAi/.env`:

```bash
grep -E "^<alias>_(PROFILE|STAGE|REGION)=" /Users/dionisis/Projects/DionAi/.env
```

Pull:
- `<alias>_PROFILE` → base profile (NEVER overridden, locked to alias)
- `<alias>_STAGE` → default stage (override if user specified)
- `<alias>_REGION` → default region (override if user specified)

If any of the 3 are empty or missing, stop and tell Dionisis to fill in `.env`.

## Step 3: Confirm the resolved environment
Before running anything, output a one-liner like:

> Using `gbInnovations` → profile=`gb-prod`, stage=`prod`, region=`eu-west-1` (defaults from .env, no overrides)

Or if overrides applied:

> Using `gbInnovations` → profile=`gb-prod`, stage=`staging` (override), region=`eu-central-1` (override)

This gives Dionisis one chance to catch a wrong account before you start poking.

## Step 4: Investigate
You decide what AWS CLI commands are useful for the question. Common patterns:

- **Lambda logs:** `aws logs filter-log-events --log-group-name /aws/lambda/<name>-<stage> --start-time <ms> --filter-pattern <pattern>`
- **Lambda recent invocations / errors:** `aws logs tail /aws/lambda/<name>-<stage> --since <duration> --filter-pattern ERROR`
- **Step Function executions:** `aws stepfunctions list-executions --state-machine-arn <arn> --status-filter FAILED --max-items 20`
- **Step Function execution history:** `aws stepfunctions get-execution-history --execution-arn <arn> --reverse-order`
- **CloudWatch metrics:** `aws cloudwatch get-metric-statistics ...`
- **DynamoDB query/scan:** `aws dynamodb query ...` (prefer query over scan, always)
- **SQS queue depth:** `aws sqs get-queue-attributes --attribute-names ApproximateNumberOfMessages`
- **API Gateway / CloudFront access logs:** via CloudWatch Logs Insights
- **EventBridge rules and recent invocations:** `aws events list-rules`, CloudWatch metrics

Rules for investigation:
- Always pass `--profile <resolved_profile> --region <resolved_region>` on every call. Do not rely on env vars, be explicit.
- Use `<stage>` in resource names when the naming convention is `<name>-<stage>` (very common with Serverless Framework, SAM, CDK).
- If you don't know the resource naming convention, ask before guessing. Wrong Lambda name = silent empty results = wasted time.
- Prefer narrow time windows. Default to last 1 hour unless Dionisis specified otherwise.
- Run read-only calls in parallel when possible.
- NEVER run destructive commands (delete, put, update, invoke with side effects) without explicit confirmation from Dionisis. Read-only is fine, mutation is not.

## Step 5: Report findings
Follow `.claude/rules/communication-style.md`: concise bullets, no em-dashes, no fluff. Structure:

1. **TL;DR** — one sentence, the answer
2. **What I found** — the key evidence (error messages, execution IDs, timestamps, counts)
3. **Root cause or best hypothesis** — if the evidence is clear, name the cause. If not, say "best guess" and list what else to check.
4. **Next steps** — 1-3 concrete actions

Always cite the AWS resource you pulled from (log group, state machine ARN, execution ID) so Dionisis can open it in the console if he wants to dig deeper.

## Example flow

**User:** "investigate gbInnovations why the daily-report lambda failed last night"

**You:**
1. Read `.env`, resolve `gbInnovations` → profile=`gb-prod`, stage=`prod`, region=`eu-west-1`
2. Confirm: "Using gbInnovations → profile=gb-prod, stage=prod, region=eu-west-1"
3. Run in parallel:
   - `aws logs tail /aws/lambda/daily-report-prod --since 24h --filter-pattern ERROR --profile gb-prod --region eu-west-1`
   - `aws lambda get-function --function-name daily-report-prod --profile gb-prod --region eu-west-1`
4. If the logs point to a downstream service, keep chasing
5. Report findings in the structure above

## Security
- `.env` is gitignored. Never commit it. Never echo its contents back in full. Only reference the resolved values for the current call.
- Never log, save, or expose AWS credentials. The profile name is safe to display, the underlying credentials in `~/.aws/credentials` are not.
