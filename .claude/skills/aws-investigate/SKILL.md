---
name: aws-investigate
description: Investigate AWS issues, executions, logs, and events for one of Dionisis's projects. Two-phase flow, first discovers the specific workflow's AWS resources from the project's code and IaC, then runs scoped AWS CLI calls using the alias resolved from DionAi/.env.
---

# AWS Investigate

## When to use this skill
Trigger on any phrasing like:
- "investigate <project> ..."
- "look into <project> why <workflow> failed yesterday"
- "check <project> logs for <event>"
- "what happened with <project>'s <workflow> two days ago"
- "investigate <alias> ..." (direct alias also works)

## The core idea
Projects are large and dynamic. Static resource lists in READMEs go stale. Instead:

1. **Phase 1 — Discover** the specific workflow's AWS resources from the project's code and IaC files
2. **Phase 2 — Investigate** those exact resources via AWS CLI using the alias resolved from `.env`

Never jump straight to CLI calls without discovery. Never guess resource names.

---

## Phase 1: Discovery

### Step 1.1: Find the project
- If the user mentioned a project name (e.g. "youtube-insights"), read `projects/<name>/README.md` in DionAi
- Pull `Code:` (path to the actual codebase) and `AWS Alias:` (which account to use)
- If `AWS Alias:` is missing from the README, ask Dionisis which alias to use and update the README with his answer
- If the user mentioned only an alias (e.g. "investigate gbInnovations ..."), skip straight to Phase 2 (no project context to discover)

### Step 1.2: Identify the workflow in question
From the user's message, extract the specific thing they're asking about:
- A workflow name ("ingest worker", "daily report", "checkout flow")
- A specific event or execution ("what ran at 3pm yesterday")
- A symptom ("why it crashed", "why it was slow")

If the workflow is ambiguous, ask before discovering. Wrong workflow = wrong resources = wasted time.

### Step 1.3: Discover resources from code + IaC
`cd` to the project's code path. Search for the workflow in this order:

1. **IaC files (highest signal):**
   - `serverless.yml`, `serverless.ts` (Serverless Framework)
   - `template.yaml`, `template.yml` (SAM)
   - `cdk.json` + `lib/**/*.ts` or `lib/**/*.py` (CDK)
   - `*.tf`, `terraform/**` (Terraform)
   - `sam-app/`, `infra/`, `infrastructure/`, `iac/`

2. **Code references:**
   - Lambda handlers mentioning the workflow name
   - Step Function definitions (JSON or ASL in TypeScript)
   - EventBridge rules, SQS queues, SNS topics, DynamoDB table names
   - Environment variables in `.env.*` or deploy configs

3. **Deploy scripts:**
   - `package.json` scripts (deploy, deploy:prod)
   - `Makefile` targets
   - `scripts/deploy.*`

Use parallel Grep calls to save time. Common patterns to search:
- `(function|Function|lambda).*<workflow>` for Lambda definitions
- `StateMachine|stateMachine|statesExecutionRole` for Step Functions
- `TableName|dynamoDb|DynamoDB` for DynamoDB
- `queueUrl|QueueName|SQS` for SQS
- `BucketName|S3::Bucket|s3.Bucket` for S3
- `ScheduleExpression|cron|rate\(` for scheduled triggers

### Step 1.4: Build the resource map
Output a short bulleted map of what you found, before running any AWS call:

```
Discovered for <project> / <workflow>:
- Lambdas: ingest-worker-<stage>, ingest-retry-<stage>
- Log groups: /aws/lambda/ingest-worker-<stage>
- Step Function: IngestPipeline-<stage> (arn in serverless.yml)
- DynamoDB: ingest-items-<stage>
- Trigger: SQS ingest-queue-<stage> (batch size 10)
- Schedule: EventBridge rule every 15min
Source: serverless.yml line 42-78, lib/handlers/ingest.ts
```

Always cite where you found each resource (file + line). If something is unclear or you found nothing, say so, do not invent resource names.

If discovery turns up nothing useful, stop and ask Dionisis to point you at the right file or workflow name. Do not proceed to Phase 2 with guesses.

---

## Phase 2: Investigation

### Step 2.1: Resolve the AWS environment
Read `DionAi/.env`:

```bash
grep -E "^<alias>_(PROFILE|STAGE|REGION)=" /Users/dionisis/Projects/DionAi/.env
```

Pull:
- `<alias>_PROFILE` (locked to alias, never overridden)
- `<alias>_STAGE` (override if user explicitly said "prod"/"staging"/"dev")
- `<alias>_REGION` (override if user mentioned a region like "eu-central-1")

If any of the 3 are empty or missing, stop and tell Dionisis to fill in `.env`.

### Step 2.2: Confirm the resolved environment
One-liner back to Dionisis:

> Using `gbInnovations` → profile=`gb-prod`, stage=`prod`, region=`eu-west-1`. Investigating `ingest-worker` workflow, resources found above.

### Step 2.3: Run scoped AWS CLI calls
Use the discovered resource names with the resolved env. Common patterns:

- **Lambda logs:** `aws logs filter-log-events --log-group-name /aws/lambda/<discovered-name> --start-time <ms> --filter-pattern <pattern> --profile <profile> --region <region>`
- **Lambda recent errors:** `aws logs tail /aws/lambda/<discovered-name> --since <duration> --filter-pattern ERROR --profile <profile> --region <region>`
- **Step Function executions:** `aws stepfunctions list-executions --state-machine-arn <discovered-arn> --status-filter FAILED --max-items 20 --profile <profile> --region <region>`
- **Step Function history:** `aws stepfunctions get-execution-history --execution-arn <arn> --reverse-order --profile <profile> --region <region>`
- **DynamoDB query:** `aws dynamodb query --table-name <discovered-table> ... --profile <profile> --region <region>`
- **SQS depth:** `aws sqs get-queue-attributes --queue-url <discovered-url> --attribute-names ApproximateNumberOfMessages --profile <profile> --region <region>`
- **CloudWatch metrics:** `aws cloudwatch get-metric-statistics ...`

Rules:
- Always pass `--profile` and `--region` explicit on every call
- Always use the exact stage found in Phase 1 (e.g. `-prod` suffix) or overridden by the user
- Prefer narrow time windows (default last 1 hour unless user said otherwise)
- Run read-only calls in parallel when possible
- **NEVER run destructive commands** (delete, put, update, invoke with side effects) without explicit confirmation from Dionisis

### Step 2.4: Report findings
Follow `.claude/rules/communication-style.md`. Structure:

1. **TL;DR** one sentence, the answer
2. **What I found** key evidence (error messages, execution IDs, timestamps, counts)
3. **Root cause or best hypothesis** if evidence is clear, name it. If not, say "best guess" and list what else to check
4. **Next steps** 1-3 concrete actions

Cite every AWS resource you pulled from (log group, state machine ARN, execution ID) so Dionisis can open it in the console.

---

## Security
- `.env` is gitignored. Never commit it. Never echo its contents in full.
- Never log or expose AWS credentials. Profile names are safe to display, credentials in `~/.aws/credentials` are not.
- Never mutate AWS resources without explicit OK.
