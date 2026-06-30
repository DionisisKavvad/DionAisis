# Completion-Checker Event-Driven Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all remaining completion-checkers (5 checkers across 4 services) from CRON-polling to the event-driven model already shipped in `scrape-facebook-posts` (commit `c142ed3`).

**Architecture:** The Step Function becomes the single decider of completion. On its empty-queue branch a `notify-run-completed` lambda emits an authoritative "Run Completed" event (after a queue/state guard). The old completion-checker stops polling and becomes an EventBridge-rule-triggered reactive handler that claims the completion atomically (exactly-once), computes stats, sends Slack, cleans up schedules. Emits are at-least-once; the atomic claim guarantees exactly-once Slack.

**Tech Stack:** AWS Lambda (Node.js), Step Functions, SQS, EventBridge (default bus), DynamoDB (single unified-events table, GSI6), Serverless Framework (`serverless-step-functions`, `serverless-iam-roles-per-function`).

## Global Constraints

- **Reference implementation (copy this, do not reinvent):** `scrape-facebook-posts`:
  - Emit lambda: `scrape-posts-service/src/step-functions/scrape-facebook-posts/notify-run-completed.ts`
  - Reactive checker: `facebook-posts-reports/src/reports/completion-checker.js`
  - SFN branch wiring + IAM: `scrape-posts-service/serverless.yml` (`isStoreAvailable` → Default `notify-run-completed` → `Next: Done`)
  - EventBridge rule: `facebook-posts-reports/serverless.yml` `RunCompletedRule` + `RunCompletedPermission`
- **Exactly-once contract:** the emit may fire multiple times (watcher restarts re-enter the empty-queue branch; multi-branch services emit from >1 place). De-dup lives in the reactive checker via an **atomic claim** (`tryClaimCompletion`, conditional `PutItem`). NONE of the target services has this today — it must be added to each.
- **Emit guard:** `notify-run-completed` must re-check SQS `GetQueueAttributes` for `ApproximateNumberOfMessages` (visible) + `ApproximateNumberOfMessagesNotVisible` (in-flight); skip emit if `visible + inFlight > 0`. For multi-queue / multi-SFN services it must ALSO re-check the other queues + `ListExecutions RUNNING` on the sibling SFNs (full `getProcessState()` equality) before emitting, or completion fires prematurely.
- **runId resolution:** resolve from the latest "Run Started"-equivalent event via GSI6: `GSI6PK = EVENT#<startedEventType>`, `begins_with(GSI6SK, TENANT#gbinnovations#APP#<appName>#)`, `ScanIndexForward: false`, `Limit: 1`. App-name prefixes differ per service (listed per task).
- **Event bus:** `default` in every service. `DetailType: 'activity-log'`. `Source: <APP_NAME>-<stage>`. Emit via the service's existing `eventBridgeService.logActivity(data, context)` helper — do not hand-roll PutEvents.
- **logActivity needs the real Lambda `context`** (it reads `context.functionName` / `context.logGroupName`). Pass it through.
- **count>100 cap:** in every SFN the `count>100` continue path routes to the SAME terminal state as empty-queue. That is NOT completion (the watcher restarts the run). The queue guard handles this: at count>100 the queue is generally non-empty so `visible+inFlight>0` → emit skipped. Do not add the emit on a path that bypasses the guard.
- **DUAL-PIPELINE ZERO-EMIT RACE (groups E and A only) — closed by a reconciler backstop.** When completion depends on >1 SFN (scrape + process for E; scrape + post-process for A), a terminal emit lambda runs INSIDE one SFN execution and checks whether the OTHER SFN is RUNNING. At the exact completion instant both SFNs can be in their terminal lambdas simultaneously — each sees the other as RUNNING and skips. Both then stop with queues empty, so the watchers (which only restart on a non-empty queue) never re-trigger, and completion is NEVER emitted. The atomic claim only collapses ≥1 emits to one Slack; it cannot rescue zero emits. **Therefore E and A keep a thin low-frequency `completion-reconciler` cron (rate(30 minutes), emit-only — NOT Slack).** It runs OUTSIDE any SFN execution, so it evaluates the REAL full `getProcessState()` (all SFNs not RUNNING + all queues empty) correctly, and emits the same "Run Completed" event if complete-and-unclaimed. The reactive checker still owns claim+Slack+cleanup, so the reconciler emit is idempotent (already-claimed → no-op). Single-pipeline services (D, P, V) do NOT need this — their single SFN + queue-empty branch is the proven fb-posts design, and their watcher restarts on any non-empty queue.
  - **Corollary (resolves the getProcessState placement):** the terminal emit lambda uses the EXCLUDE-SELF guard (queue empty + the OTHER SFN(s) not running, never its own). The verbatim `getProcessState()` (which checks its own SFN too, and would therefore never fire from inside that SFN) belongs ONLY in the out-of-band reconciler.
- **Idempotency-key note:** the claim must key on `runId`. For services where `runId` is absent from the started event (detect-store-logo), fix the producer first (Task D0).
- **Deploy/verify reality:** these are serverless infra changes. Unit tests cover the emit-lambda decision logic and `tryClaimCompletion`. End-to-end verification is `serverless deploy` to a non-prod stage (`dev`) + driving a run + reading CloudWatch logs + confirming exactly one Slack message. Where dev schedules are disabled, trigger the SFN manually.

---

## Service order (lowest risk first)

1. **detect-store-logo** — cleanest single-queue/single-SFN, `log-process-completed` already on the empty-queue exit. (Task group D)
2. **scrape-eshop-products** — clean single-queue/single-SFN. (Task group P)
3. **scrape-eshops / scrape-greek-stores (a)** — single queue but dual-SFN completion, cross-service deploy. (Task group E)
4. **availability (b)** — single queue/single-SFN, cross-service, run-anchor naming quirk. (Task group V)
5. **scrape-ads** — dual-queue + dual-SFN, hardest. (Task group A)

Each service is independently shippable. The shared `tryClaimCompletion` helper pattern (Task S0) is copied per-service (each has its own query-service), not extracted into a cross-repo lib (YAGNI — two separate repos, no shared package).

---

## Task S0: Reference-pattern dossier (read-only, no code)

**Files:** none (orientation task).

- [ ] **Step 1: Read the three reference files end-to-end**

```
scrape-facebook-posts/services/business-services/scrape-posts-service/src/step-functions/scrape-facebook-posts/notify-run-completed.ts
scrape-facebook-posts/services/business-services/facebook-posts-reports/src/reports/completion-checker.js
scrape-facebook-posts/services/business-services/facebook-posts-reports/src/services/reportQueryService.js   (tryClaimCompletion)
```

- [ ] **Step 2: Note the exactly-once mechanism**

`tryClaimCompletion(runId)` does a conditional `PutItem` of a claim marker (`attribute_not_exists`) keyed by runId; returns `false` if already claimed → reactive checker returns `skipped` without Slack. The emit lambda itself does NOT claim. Confirm both signatures before porting.

No commit (read-only).

---

# Task Group D — detect-store-logo (do first)

Base: `scrape-the-greek-ecommerce-v2/services/business-services/detect-store-logo/`
App name (GSI6): `detect-page-logo`. Queue: `DetectStoreLogoQueue`. SFN: `detectLogos`. Run anchor: `BATCH_DETECT_LOGOS_STARTED` = `'Batch Detect Logos Started'`. Completion event: `DETECT_LOGOS_RUN_COMPLETED` = `'Detect Logos Run Completed'`.

## Task D0: Add runId to the run-anchor event (PREREQUISITE — blocks idempotency)

**Files:**
- Modify: `src/begin-detect-logos.ts:245-249` (the `BATCH_DETECT_LOGOS_STARTED` emit)
- Modify: `src/services/detectLogosReportQueryService.ts` (`getLatestBatchStarted` already reads `properties.runId`, line ~90 — verify it surfaces it)
- Test: `__tests__/begin-detect-logos.runid.test.ts`

**Interfaces:**
- Produces: `BATCH_DETECT_LOGOS_STARTED` event whose `properties` includes `runId: string` (uuidv4).

- [ ] **Step 1: Write the failing test** — assert the emitted started event carries a `runId`.

```ts
// __tests__/begin-detect-logos.runid.test.ts
import { buildBatchStartedProperties } from '../src/begin-detect-logos';
test('batch-started event includes a runId', () => {
  const props = buildBatchStartedProperties({ validatedStores: 3, storesQueued: 3 });
  expect(props.runId).toMatch(/[0-9a-f-]{36}/);
});
```

- [ ] **Step 2: Run it, confirm fail** (`buildBatchStartedProperties` not exported yet).
- [ ] **Step 3: Refactor `begin-detect-logos.ts`** to build properties via an exported helper that injects `runId: uuidv4()`, and use that runId both in the emit and (if needed) downstream. Current emit:

```ts
// BEFORE (begin-detect-logos.ts:245-249) — no runId
properties: { validatedStores, storesQueued, startedAt }
// AFTER
const runId = uuidv4();
properties: { runId, validatedStores, storesQueued, startedAt }
```

- [ ] **Step 4: Run test, confirm pass.**
- [ ] **Step 5: Verify** `getLatestBatchStarted()` returns the runId (it already maps `properties.runId`); `getActiveRun()` / `isRunCompleted(runId)` now get a real key.
- [ ] **Step 6: Commit** `fix(detect-logos): emit runId on Batch Detect Logos Started for idempotent completion`

## Task D1: Add `tryClaimCompletion` to DetectLogosReportQueryService

**Files:**
- Modify: `src/services/detectLogosReportQueryService.ts`
- Test: `__tests__/detectLogosReportQueryService.claim.test.ts`

**Interfaces:**
- Produces: `tryClaimCompletion(runId: string): Promise<boolean>` — conditional PutItem of a claim marker; `true` if this caller won the claim, `false` if already claimed.

- [ ] **Step 1: Write failing test** (mock DynamoDB `PutItemCommand`): first call resolves true, second throws `ConditionalCheckFailedException` → returns false.
- [ ] **Step 2: Run, confirm fail.**
- [ ] **Step 3: Implement**, copying fb-posts `reportQueryService.tryClaimCompletion` VERBATIM (only `this.APP_NAME` differs per service). Exact item shape from the reference — DO NOT invent a different PK; reuse the table partition key `TENANT#<tenant>` so the marker is a valid row:

```js
async tryClaimCompletion(runId) {
  const params = {
    TableName: this.tableName,
    Item: {
      PK: `TENANT#${this.tenantId}`,                          // TENANT#gbinnovations
      SK: `COMPLETION#APP#${this.APP_NAME}#RUN#${runId}`,     // app varies per service
      tenantId: this.tenantId, app: this.APP_NAME, runId, claimedAt: Date.now(),
    },
    ConditionExpression: 'attribute_not_exists(PK)',
  };
  try { await this.docClient.send(new PutCommand(params)); return true; }
  catch (e) { if (e.name === 'ConditionalCheckFailedException') return false; throw e; }
}
```

The `APP_NAME` per service (so the two ecommerce pipelines never collide): detect-logos `detect-page-logo`; scrape-eshop-products `scrape-eshop-products`; scrape-greek-stores `scrape-eshops`; availability use a distinct suffix in the SK (`COMPLETION#APP#scrape-eshops#AVAILABILITY#RUN#${runId}`) since it shares `APP_NAME=scrape-eshops` with group E; scrape-ads `facebook-ads`. **Note:** `attribute_not_exists(PK)` is correct because the full key is `(PK, SK)` and no other item shares that exact SK — the condition is evaluated per-item.

- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Commit** `feat(detect-logos): add tryClaimCompletion atomic claim`

## Task D2: Move emit into `log-process-completed` (the SFN empty-queue exit)

**Files:**
- Modify: `src/step-functions/detect-logos/log-process-completed.ts`
- Modify: `serverless.yml` (log-process-completed IAM block, ~lines 336-340)
- Test: `__tests__/log-process-completed.emit.test.ts`

**Interfaces:**
- Consumes: `DetectLogosProcessStateService.getQueueDepth()`, `detectLogosReportQueryService.getLatestBatchStarted()`.
- Produces: emits `DETECT_LOGOS_RUN_COMPLETED` via `eventBridgeService.logActivity` when queue truly empty.

- [ ] **Step 1: Write failing tests** for the decision logic:
  - queue `visible+inFlight > 0` → no emit, returns event unchanged.
  - queue empty + a batch-started exists → emits `DETECT_LOGOS_RUN_COMPLETED` with `{ runId, completedAt }`.
  - no batch-started → no emit.
- [ ] **Step 2: Run, confirm fail.**
- [ ] **Step 3: Implement.** Keep the existing `'Logo Detection Process Completed'` low-level emit; ADD after it:

```ts
// queue guard (reuse DetectLogosProcessStateService.getQueueDepth)
const depth = await processStateService.getQueueDepth();
if (depth > 0) { console.log(`[notify] queue not drained (${depth}) - skip`); return event; }
const started = await queryService.getLatestBatchStarted();
if (!started) { console.log('[notify] no batch-started - nothing to complete'); return event; }
await eventBridgeService.logActivity({
  eventType: DetectLogoEventTypes.DETECT_LOGOS_RUN_COMPLETED,
  entityType: EntityType.USER, entityId: 'system',
  properties: { runId: started.runId, completedAt: new Date().toISOString() },
}, context);
return event;
```

Wrap in try/catch that logs and returns `event` (never block the SFN).

- [ ] **Step 4: Add IAM** to `log-process-completed` in serverless.yml (it currently has only `events:PutEvents`). Append (copy from completion-checker block 476-499):

```yaml
      - Effect: Allow
        Action: [ dynamodb:Query ]
        Resource:
          - arn:aws:dynamodb:${aws:region}:${aws:accountId}:table/${ssm:${self:custom.resources.ssm.parameterNames.unifiedEvents}}
          - arn:aws:dynamodb:${aws:region}:${aws:accountId}:table/${ssm:${self:custom.resources.ssm.parameterNames.unifiedEvents}}/index/*
      - Effect: Allow
        Action: [ sqs:GetQueueAttributes ]
        Resource: !GetAtt DetectStoreLogoQueue.Arn
```

Add `DETECT_STORE_LOGO_QUEUE_URL`, `UNIFIED_EVENTS_TABLE`, `TENANT_ID` to the function `environment` if not inherited.

- [ ] **Step 5: Run unit tests, confirm pass.**
- [ ] **Step 6: Commit** `feat(detect-logos): emit Run Completed from log-process-completed on empty queue`

## Task D3: Make the completion-checker reactive (drop cron, add claim, add EventBridge rule)

**Files:**
- Modify: `src/reports/detect-logos-completion-checker.ts`
- Modify: `serverless.yml` (remove schedule 470-473; add `dynamodb:PutItem` IAM; add rule + permission)
- Test: `__tests__/detect-logos-completion-checker.reactive.test.ts`

- [ ] **Step 1: Write failing test** — handler invoked with an EventBridge event carrying `detail.properties.runId`:
  - `tryClaimCompletion` true → computes stats, sends Slack, cleanup, returns `success`.
  - `tryClaimCompletion` false → returns `skipped`, no Slack.
- [ ] **Step 2: Run, confirm fail.**
- [ ] **Step 3: Implement.** Replace the `getActiveRun()` + `getProcessState()` polling head with: read `runId`/`startTimestamp` from `event.detail.properties`; `if (!await tryClaimCompletion(runId)) return skipped;` then keep the existing stats/Slack/cleanup tail. Remove the `processStateService` usage and its `STATE_MACHINE_ARN`/`states:ListExecutions` need.
- [ ] **Step 4: serverless.yml — remove the `schedule` event** (470-473). Add `dynamodb:PutItem` to the checker IAM (for the claim):

```yaml
      - Effect: Allow
        Action: [ dynamodb:PutItem ]
        Resource:
          - arn:aws:dynamodb:${aws:region}:${aws:accountId}:table/${ssm:${self:custom.resources.ssm.parameterNames.unifiedEvents}}
```

Add rule + permission (clone `BatchDetectLogosStartedRule` 882-906, change eventType + target to the checker logical id `DetectDashlogosDashcompletionDashcheckerLambdaFunction`):

```yaml
    DetectLogosRunCompletedRule:
      Type: AWS::Events::Rule
      Properties:
        EventBusName: ${self:custom.resources.eventBridge.eventBusName}
        EventPattern:
          source: [ detect-page-logo-${self:provider.stage} ]
          detail-type: [ activity-log ]
          detail: { eventType: [ "Detect Logos Run Completed" ] }
        State: ENABLED
        Targets:
          - Arn: !GetAtt DetectDashlogosDashcompletionDashcheckerLambdaFunction.Arn
            Id: DetectLogosCompletionCheckerTarget
    DetectLogosRunCompletedPermission:
      Type: AWS::Lambda::Permission
      Properties:
        FunctionName: !Ref DetectDashlogosDashcompletionDashcheckerLambdaFunction
        Action: lambda:InvokeFunction
        Principal: events.amazonaws.com
        SourceArn: !GetAtt DetectLogosRunCompletedRule.Arn
```

- [ ] **Step 5: Run unit tests, confirm pass.**
- [ ] **Step 6: Bump get-store long polling** — `src/services/sqsService.ts:38` `WaitTimeSeconds: 5 → 20`.
- [ ] **Step 7: Commit** `feat(detect-logos): reactive completion-checker via EventBridge, drop cron`

## Task D4: Deploy to dev + end-to-end verify

- [ ] **Step 1:** `serverless deploy --stage dev` in `detect-store-logo`.
- [ ] **Step 2:** Seed the queue + start the `detectLogos` SFN manually (dev schedules are disabled). Let it drain.
- [ ] **Step 3:** Confirm in CloudWatch: `log-process-completed` emitted exactly one `Detect Logos Run Completed`; `DetectLogosRunCompletedRule` fired the checker; checker logged a won claim and one Slack send.
- [ ] **Step 4:** Re-trigger the empty-queue branch (or replay the event) and confirm the checker logs `already_claimed` and sends NO second Slack.
- [ ] **Step 5: Commit** any fixes.

---

# Task Group P — scrape-eshop-products

Base: `scrape-the-greek-ecommerce-v2/services/business-services/scrape-eshop-products/`
App name: `scrape-eshop-products`. Queue: `storesInTopCategoriesSqs`. SFN: `scrapeTopCategories`. Run anchor: `MONTHLY_STARTED` = `'Monthly Scrape Eshop Products Started'` (HAS runId). Completion: `MONTHLY_COMPLETED` = `'Monthly Scrape Eshop Products Completed'`. Watcher: `step-function-watcher` (prod `rate(5 minutes)`).

Single queue, single SFN → mirrors fb-posts almost exactly. No D0-style prerequisite (runId already present).

## Task P1: Add `tryClaimCompletion` to ReportQueryService
Same as D1, in `src/services/reportQueryService.js`. SK `COMPLETION#APP#scrape-eshop-products#RUN#${runId}`. Test + commit.

## Task P2: New `notify-run-completed` lambda on the empty-queue branch

**Files:**
- Create: `src/scrape-top-categories/notify-run-completed.js`
- Modify: `serverless.yml` (new function def + IAM; SFN `IsStoreAvailable` Default `Done` → insert `notify-run-completed` before `Done`)
- Test: `__tests__/notify-run-completed.test.js`

- [ ] **Step 1: Write failing tests** (queue guard skip / emit-on-empty / no-started-skip), as D2.
- [ ] **Step 2–3: Implement** as a standalone task lambda (this service routes empty-queue straight to `Done`, so a new task is inserted, unlike detect-logos which already had `log-process-completed`). Use `ProcessStateService.getQueueDepth()` for the guard and `reportQueryService.getLatestMonthlyStarted()` for runId. Emit `MONTHLY_COMPLETED`-trigger event. (Note: keep `MONTHLY_COMPLETED` itself emitted by the reactive checker AFTER claim, OR emit a distinct trigger event. Decision: emit a NEW dedicated trigger event `'Monthly Scrape Eshop Products Run Completed'` so the existing `MONTHLY_COMPLETED` semantics — "report done" — stay owned by the checker. This avoids the checker re-deriving completion. Add the constant to `src/types/events.js`.)
- [ ] **Step 4: serverless.yml** — add the function:

```yaml
  notify-run-completed:
    handler: src/scrape-top-categories/notify-run-completed.handler
    timeout: 30
    environment:
      STORES_IN_TOP_CATEGORIES_SQS: !Ref StoresInTopCategoriesSqs   # match existing wiring
      UNIFIED_EVENTS_TABLE: ${ssm:${self:custom.resources.ssm.parameterNames.unifiedEvents}}
      TENANT_ID: gbinnovations
    iamRoleStatements:
      - { Effect: Allow, Action: [sqs:GetQueueAttributes], Resource: arn:aws:sqs:${aws:region}:${aws:accountId}:${self:custom.resources.sqs.QueueName.storesInTopCategoriesSqs} }
      - { Effect: Allow, Action: [dynamodb:Query], Resource: [ "arn:aws:dynamodb:${aws:region}:${aws:accountId}:table/${ssm:${self:custom.resources.ssm.parameterNames.unifiedEvents}}", "arn:aws:dynamodb:${aws:region}:${aws:accountId}:table/${ssm:${self:custom.resources.ssm.parameterNames.unifiedEvents}}/index/*" ] }
      - { Effect: Allow, Action: [events:PutEvents], Resource: '*' }
```

Insert into the SFN (replace `Default: Done` at 602-608 with `Default: notify-run-completed`):

```yaml
          IsStoreAvailable:
            Type: Choice
            Choices:
              - Variable: $.storeAvailable
                BooleanEquals: true
                Next: is-proxy-mechanism-active
            Default: notify-run-completed
          notify-run-completed:
            Type: Task
            Resource: !GetAtt notify-run-completed.Arn
            Next: Done
            Catch:
              - ErrorEquals: [ States.ALL ]
                Next: Done
```

(Leave the `count>100 → Done` path untouched — the queue guard skips it.)

- [ ] **Step 5: Run tests, confirm pass.**
- [ ] **Step 6: Commit** `feat(scrape-eshop-products): emit Run Completed from SFN empty-queue branch`

## Task P3: Reactive checker + EventBridge rule + drop cron
Same shape as D3, in `src/reports/completion-checker.js` and `serverless.yml`:
- Read runId from `event.detail.properties`; `tryClaimCompletion` gate; keep stats/Slack/cleanup tail; the checker still emits `MONTHLY_COMPLETED` (its existing semantic) after winning the claim.
- Remove `schedule` event (489-492). Add `dynamodb:PutItem` IAM. Add rule cloning `MonthlyStartedRule` (799-818) with eventType `"Monthly Scrape Eshop Products Run Completed"` → target `CompletionDashcheckerLambdaFunction`, plus its Permission.
- Bump `get-store-sqs.js:29` `WaitTimeSeconds: 0 → 20`.
- Commit `feat(scrape-eshop-products): reactive completion-checker, drop cron`.

## Task P4: Deploy dev + verify (as D4, single Slack, replay → already_claimed).

---

# Task Group E — scrape-eshops / scrape-greek-stores (a)  [CROSS-SERVICE]

Emit lambda DEPLOYS IN `scrape-eshops`; reactive checker STAYS IN `scrape-eshops-reports`.
App name (both): `scrape-eshops`. Queue: `storesInShuffleSqs`. SFNs: `scrapeGreekStores` AND `processStoreInformation` (BOTH must be idle for completion). Run anchor: `'Scrape Eshops Run Started'` (HAS runId). Completion: `RUN_COMPLETED` = `'Scrape Eshops Run Completed'`.

**Dual-SFN gotcha:** `IsStoreAvailable → Default Done` only proves the SCRAPE queue/SFN is drained; `processStoreInformation` (a SEPARATE state machine, defined in the `process-eshops-information` service) may still run. The terminal emit lambda runs INSIDE a `scrapeGreekStores` execution, so it must use the EXCLUDE-SELF guard: emit only when `queueDepth===0` AND `processStoreInformation` NOT running — it must NOT check `scrapeGreekStores` (always RUNNING from inside). Do NOT port `processStateService.getProcessState()` verbatim here (it checks scrapeGreekStores too → would never fire). The verbatim `getProcessState()` lives in the reconciler (Task E5). Because `processStoreInformation` may finish LAST with the queue already empty, the scrape-side terminal alone can miss completion — the reconciler (Task E5) is the backstop. See Global Constraints "DUAL-PIPELINE ZERO-EMIT RACE".

## Task E1: Add `tryClaimCompletion` to `scrape-eshops-reports` ReportQueryService
As D1. SK `COMPLETION#APP#scrape-eshops#RUN#${runId}`. (Reports service owns the claim; it has the Query+Put IAM.) Test + commit.

## Task E2: New `notify-run-completed` lambda IN `scrape-eshops`

**Files:**
- Create: `scrape-eshops/src/scrape-greek-marketplaces/notify-run-completed.js`
- Modify: `scrape-eshops/serverless.yml` (function + IAM; SFN `IsStoreAvailable` Default `Done` → `notify-run-completed`)
- Test: `scrape-eshops/__tests__/notify-run-completed.test.js`

- [ ] **Step 1: Write failing tests** including the dual-SFN guard: emit ONLY when queue empty AND `scrapeGreekStores` not RUNNING (ignore self-execution — see note) AND `processStoreInformation` not RUNNING.
  - **Self-execution note:** this lambda runs INSIDE a `scrapeGreekStores` execution, so `ListExecutions RUNNING` will include itself. Guard on `processStoreInformation` running + queue depth only; do NOT gate on `scrapeGreekStores` running (it is, by definition). This matches fb-posts (which never re-checks its own SFN).
- [ ] **Step 2–3: Implement.** Port `processStateService.getQueueDepth()` + `isStateMachineRunning(processSfArn)` into the emit lambda (or import a copy). Resolve runId via a `getLatestRunStarted()` GSI6 query (port from reports `reportQueryService.js:36-47`, app prefix `TENANT#gbinnovations#APP#scrape-eshops#`). Emit a dedicated trigger event `'Scrape Eshops Run Completed'` via `scrape-eshops/src/services/eventBridgeService.js` `logActivity`.
- [ ] **Step 4: serverless.yml (scrape-eshops)** — function env needs `STORES_IN_SHUFFLE_SQS`, `PROCESS_STORE_INFORMATION_STATE_MACHINE_ARN`, `UNIFIED_EVENTS_TABLE`, `TENANT_ID`. IAM: `sqs:GetQueueAttributes` (storesInShuffleSqs), `states:ListExecutions` (processStoreInformation), `dynamodb:Query` (unified + index/*), `events:PutEvents '*'`. Wire SFN:

```yaml
          IsStoreAvailable:
            Type: Choice
            Choices:
              - Variable: $.storeAvailable
                BooleanEquals: true
                Next: store-exists-in-marketplace
            Default: notify-run-completed
          notify-run-completed:
            Type: Task
            Resource: !GetAtt notify-run-completed.Arn
            Next: Done
            Catch: [ { ErrorEquals: [States.ALL], Next: Done } ]
```

- [ ] **Step 5: Tests pass.** **Step 6: Bump** `get-store-info-sqs.js:25` `WaitTimeSeconds: 0 → 20`. **Step 7: Commit** in scrape-eshops.

## Task E3: Reactive checker + rule in `scrape-eshops-reports` + drop cron

**Files:**
- Modify: `scrape-eshops-reports/src/reports/completion-checker.js`
- Modify: `scrape-eshops-reports/serverless.yml` (remove schedule 160-163; add `dynamodb:PutItem`; add rule + permission)

- [ ] **Step 1–3:** as D3. Read runId from `event.detail.properties`; `tryClaimCompletion` gate; keep stats/Slack/cleanup. The checker no longer needs `states:ListExecutions` on either SFN — remove those IAM lines.
- [ ] **Step 4:** clone `RunStartedRule` (reports 340-355) with eventType `"Scrape Eshops Run Completed"` → target `CompletionDashcheckerLambdaFunction` + Permission. Add `dynamodb:PutItem`. Confirm cross-service flow: scrape-eshops puts `Source: scrape-eshops-<stage>` on `default`; this rule (in reports, same bus) matches it. ✔ (verified: both use `default`, same source/detail-type).
- [ ] **Step 5: Commit** in scrape-eshops-reports.

## Task E4: `completion-reconciler` cron backstop (closes the zero-emit race)

**Files:**
- Create: `scrape-eshops-reports/src/reports/completion-reconciler.js` (reports service already has `processStateService` + GSI6 query + the unified-table Query IAM)
- Modify: `scrape-eshops-reports/serverless.yml` (new scheduled function + IAM)
- Test: `__tests__/completion-reconciler.test.js`

**Interfaces:**
- Consumes: `processStateService.getProcessState()` (the REAL one — checks both SFNs + queue, run out-of-band so no self-execution problem), `reportQueryService.getLatestRunStarted()`, and a read to check the claim marker does not yet exist.
- Produces: emits `'Scrape Eshops Run Completed'` (same event the terminal lambda emits) when complete AND unclaimed. Does NOT Slack.

- [ ] **Step 1: Failing tests** — (a) all-quiet + no claim marker → emits once; (b) all-quiet + claim marker already present → no emit; (c) any SFN running or queue non-empty → no emit.
- [ ] **Step 2: Run, confirm fail.**
- [ ] **Step 3: Implement.** Resolve runId via `getLatestRunStarted()`; if none → return. `getProcessState()`; if `!isComplete` → return. Read the claim marker (`GetItem PK=TENANT#gbinnovations, SK=COMPLETION#APP#scrape-eshops#RUN#${runId}`); if it exists → already handled, return. Else `eventBridgeService.logActivity({ eventType: 'Scrape Eshops Run Completed', entityType:'USER', entityId:'system', properties:{ runId, completedAt: new Date().toISOString() } }, context)`. (The reactive checker then claims+Slacks; concurrent terminal emit is deduped by the claim.)
- [ ] **Step 4: serverless.yml** — scheduled function:

```yaml
  completion-reconciler:
    handler: src/reports/completion-reconciler.handler
    timeout: 30
    environment:
      STORES_IN_SHUFFLE_SQS: <same wiring as completion-checker>
      SCRAPE_GREEK_STORES_STATE_MACHINE_ARN: <...>
      PROCESS_STORE_INFORMATION_STATE_MACHINE_ARN: <...>
      UNIFIED_EVENTS_TABLE: ${ssm:${self:custom.resources.ssm.parameterNames.unifiedEvents}}
      TENANT_ID: gbinnovations
    events:
      - schedule:
          rate: ${self:custom.completionReconciler.rate.${self:provider.stage}}   # dev rate(365 days)/disabled, prod rate(30 minutes)
          enabled: ${self:custom.completionReconciler.enabled.${self:provider.stage}}
    iamRoleStatements:
      # copy completion-checker's dynamodb:Query + sqs:GetQueueAttributes + states:ListExecutions (BOTH SFNs) + events:PutEvents
      # NO dynamodb:PutItem — it only reads the claim marker (GetItem) and emits; the reactive checker writes the claim
```

- [ ] **Step 5: Run unit tests, confirm pass.**
- [ ] **Step 6: Commit** `feat(scrape-eshops): completion-reconciler cron backstop for dual-SFN completion`

## Task E5: Deploy BOTH services to dev + verify (incl. the race)
- [ ] Deploy `scrape-eshops` then `scrape-eshops-reports` (order: emitter before listener, but rule tolerates missing events).
- [ ] Drive a run; confirm the terminal emit fires only after `processStoreInformation` is idle; exactly one Slack; replay → `already_claimed`.
- [ ] **Simultaneous-terminal test:** force `processStoreInformation` to finish at ~the same instant as `scrapeGreekStores` (or simulate by making the terminal lambda observe the other SFN RUNNING). Confirm both terminals skip, then the `completion-reconciler` (trigger it manually in dev) emits, and exactly one Slack is sent.

---

# Task Group V — availability (b)  [CROSS-SERVICE]

Emit lambda in `scrape-eshops`; reactive checker in `scrape-eshops-reports`.
App name: `scrape-eshops`. Queue: `storesAvailabilityCheckSqs`. SFN: `checkStoresAvailability` (SINGLE). Run anchor (quirk): `'Store Availability Check Completed'` (NOT a "Run Started"; HAS runId). Completion: `'Availability Check Run Completed'`. Watcher: `watch-for-stores-availability` (prod `rate(24 hours)`).

Single SFN → simpler than E. Same cross-service split.

## Task V1: `tryClaimCompletion` in `availabilityQueryService.js`
As D1. SK `COMPLETION#APP#scrape-eshops#AVAILABILITY#RUN#${runId}` (distinct suffix from E's so the two pipelines never collide). Test + commit.

## Task V2: `notify-availability-completed` lambda in `scrape-eshops`
- Create: `scrape-eshops/src/check-stores-availability/notify-availability-completed.js`. Queue guard on `storesAvailabilityCheckSqs`; single-SFN, so (like fb-posts) no sibling-SFN check, and skip self. Resolve runId via `getLatestAvailabilityRun()` GSI6 (`EVENT#Store Availability Check Completed`, prefix `TENANT#gbinnovations#APP#scrape-eshops#`). Emit `'Availability Check Run Completed'`.
- SFN `IsStoreAvailableForCheck → Default availability-done`: insert `notify-availability-completed` before `availability-done`.
- IAM: GetQueueAttributes (availability queue), dynamodb:Query (unified+index/*), events:PutEvents. (No states needed — single SFN, self-execution.)
- Bump `get-store-availability-sqs.js:23` `WaitTimeSeconds: 0 → 20`.
- Test + commit.

## Task V3: Reactive `availability-completion-checker` + rule + drop cron
- Modify `scrape-eshops-reports/src/availability-reports/availability-completion-checker.js`: runId from event, `tryClaimCompletion` gate, keep tail.
- serverless.yml: remove schedule (306-309); add `dynamodb:PutItem`; clone `AvailabilityCheckCompletedRule` (367-382) with eventType `"Availability Check Run Completed"` → target `AvailabilityDashcompletionDashcheckerLambdaFunction` + Permission.
- Commit.

## Task V4: Deploy both + verify (single Slack, replay → already_claimed).

---

# Task Group A — scrape-ads (HARDEST, do last)

Base: `scrape-facebook-ads/services/business-services/scrape-ads-service/`
App name: `facebook-ads`. Queues: `STORES_IN_FACEBOOK_ADS` + `FACEBOOK_ADS_POST_PROCESSING_QUEUE_URL`. SFNs: `scrapeFacebookAds` + `postProcessFacebookAds`. Completion = `storesQueueEmpty && postProcessingQueueEmpty && !scrapeSfRunning && !postProcessSfRunning` (`adsProcessStateService`). Run anchor: `'Facebook Ads Run Started'` (HAS runId). Completion: `RUN_COMPLETED` = `'Facebook Ads Run Completed'`.

**Why hardest:** no single SFN terminal proves completion. The scrape SF finishing only means stores drained; post-processing (fed via SQS from the scrape SF) may still run. Two terminal points exist: scrape SF `notify-facebook-ads-completed` (already a task) and post-process SF `DoneState` (a `Succeed`).

**Design decision:** emit from BOTH terminal branches, each running the FULL 4-condition `adsProcessStateService.getProcessState()` guard, skipping self-SFN in the running-check. Whichever branch observes all-quiet last emits; the other skips (queue/other-SFN still busy). The reactive checker's atomic claim makes the double-emit safe (exactly-once Slack). This avoids restructuring the SFNs or adding a separate poller.

## Task A1: `tryClaimCompletion` in `adsReportQueryService.ts`
As D1, TypeScript. SK `COMPLETION#APP#facebook-ads#RUN#${runId}`. Test + commit.

## Task A2: Shared `evaluateAdsCompletion` guard helper

**Files:**
- Create: `src/step-functions/shared/evaluateAdsCompletion.ts`
- Test: `__tests__/evaluateAdsCompletion.test.ts`

**Interfaces:**
- Produces: `evaluateAdsCompletion(opts: { excludeSfArn?: string }): Promise<{ complete: boolean; runId?: string }>` — runs `adsProcessStateService.getProcessState()` but treats the SFN in `excludeSfArn` as not-running (the caller's own SFN), resolves runId via `getLatestRunStarted()`.

- [ ] **Step 1: Failing tests** — all-quiet → `{complete:true, runId}`; either queue non-empty → false; sibling SFN running → false; own SFN running but excluded → ignored.
- [ ] **Step 2–4: Implement** by composing `adsProcessStateService` getters (`getQueueDepth` ×2, `isStateMachineRunning` for the NON-excluded SFN) + `adsReportQueryService.getLatestRunStarted()`.
- [ ] **Step 5: Commit** `feat(scrape-ads): shared ads-completion evaluator`

## Task A3: Extend scrape-SF terminal `notify-facebook-ads-completed`

**Files:**
- Modify: `src/step-functions/scrape-facebook-ads/notify-facebook-ads-completed.ts`
- Modify: `serverless.yml` (its IAM + env)

- [ ] **Step 1: Failing test** — when `evaluateAdsCompletion({excludeSfArn: scrapeSfArn})` returns complete, emits `'Facebook Ads Run Completed'`; else no emit. Keep existing batch-finished signal. **Note:** `notify-facebook-ads-completed` is ALSO the target of the count>100 restart path (`start-scrape-facebook-ads → notify-facebook-ads-completed`, serverless.yml:826-829), so the evaluator runs there too; the queue guard inside `evaluateAdsCompletion` (stores queue non-empty at the 100-cap) makes it skip. Add a test for that path.
- [ ] **Step 2–3: Implement** — call the evaluator (exclude scrape SF, since this runs inside it), emit on complete via `eventBridgeService.logActivity`.
- [ ] **Step 4: IAM/env** — this lambda needs both queue ARNs (`sqs:GetQueueAttributes`), `states:ListExecutions` on `postProcessFacebookAds`, `dynamodb:Query` (unified+index/*), `events:PutEvents`. Add envs `FACEBOOK_ADS_POST_PROCESSING_QUEUE_URL`, `POST_PROCESS_FACEBOOK_ADS_SF_ARN`, `STORES_IN_FACEBOOK_ADS`, `UNIFIED_EVENTS_TABLE`.
- [ ] **Step 5: Commit.**

## Task A4: New emit on post-process SF terminal (`DoneState`)

**Files:**
- Create: `src/step-functions/post-process-facebook-ads/notify-postprocess-completed.ts`
- Modify: `serverless.yml` — post-process SFN: insert the task on the `CheckIfNull → DoneState` path. Since `DoneState` is `Type: Succeed` (terminal, cannot have `Next`), change `CheckIfNull`'s `IsNull → Next: DoneState` to `Next: notify-postprocess-completed`, and the new task `Next: DoneState`.
  - **SURGICAL-EDIT WARNING:** `DoneState` is ALSO reached from `CheckIfCounterBelow100`'s `Default: DoneState` (the ≥100 counter-cap restart exit, serverless.yml:992-998). Reroute ONLY the `CheckIfNull → DoneState` edge. Do NOT touch the `CheckIfCounterBelow100` edge — the cap exit must NOT emit (it ends so the watcher restarts). The queue guard would skip it anyway, but keeping the edit surgical avoids a needless emit attempt on every 100-ad batch.

```yaml
          CheckIfNull:
            Type: Choice
            Choices:
              - Variable: "$.sqsAdMessage"
                IsNull: true
                Next: notify-postprocess-completed
            Default: ProcessAdWithGraphQlRequest
          notify-postprocess-completed:
            Type: Task
            Resource: !GetAtt notify-postprocess-completed.Arn
            Next: DoneState
            Catch: [ { ErrorEquals: [States.ALL], Next: DoneState } ]
```

- [ ] **Step 1: Failing test** — `evaluateAdsCompletion({excludeSfArn: postProcessSfArn})` complete → emit; else skip.
- [ ] **Step 2–3: Implement** (exclude post-process SF).
- [ ] **Step 4: IAM/env** same set as A3, plus the new function gets `GetAdFromSqs` long-poll bump: `sqsService.ts:93-102` `WaitTimeSeconds: 0 → 20` (the post-processing receive — reduces premature empties).
- [ ] **Step 5: Commit.**

## Task A5: Reactive checker + rule + drop cron
- Modify `src/reports/completion-checker.ts`: runId from `event.detail.properties`; `tryClaimCompletion` gate; keep stats/Slack/cleanup; drop `processStateService`/`getProcessState` head and its `states:ListExecutions`/`sqs:GetQueueAttributes` IAM (no longer polls).
- serverless.yml: remove schedule (775-779); add `dynamodb:PutItem`; clone `FacebookAdsRunStartedRule` (1070-1095) with eventType `"Facebook Ads Run Completed"` → target `CompletionDashcheckerLambdaFunction` + Permission.
- Commit.

## Task A6: `completion-reconciler` cron backstop (closes the zero-emit race)

**Files:**
- Create: `src/reports/completion-reconciler.ts` (reuses `adsProcessStateService` + `adsReportQueryService`)
- Modify: `serverless.yml` (scheduled function + IAM)
- Test: `__tests__/completion-reconciler.test.ts`

**Interfaces:**
- Consumes: `adsProcessStateService.getProcessState()` (REAL full 4-condition check — both queues + both SFNs; runs out-of-band so no self-exclusion needed), `adsReportQueryService.getLatestRunStarted()`, a `GetItem` on the claim marker.
- Produces: emits `'Facebook Ads Run Completed'` when complete AND unclaimed. No Slack.

- [ ] **Step 1: Failing tests** — (a) all 4 conditions met + no claim marker → emit once; (b) claim marker present → no emit; (c) any condition false → no emit.
- [ ] **Step 2: Run, confirm fail.**
- [ ] **Step 3: Implement.** Resolve runId; `getProcessState()`; if `!isComplete` return; `GetItem PK=TENANT#gbinnovations, SK=COMPLETION#APP#facebook-ads#RUN#${runId}` — if present return; else `logActivity('Facebook Ads Run Completed', ...)`.
- [ ] **Step 4: serverless.yml** — scheduled function, `rate(30 minutes)` prod / disabled dev. IAM: copy the (pre-migration) completion-checker statements — `dynamodb:Query` (unified+index/*), `dynamodb:GetItem` (claim read, table-only), `sqs:GetQueueAttributes` (both queues), `states:ListExecutions` (both SFNs), `events:PutEvents`. NO `dynamodb:PutItem`.
- [ ] **Step 5: Run unit tests, confirm pass.**
- [ ] **Step 6: Commit** `feat(scrape-ads): completion-reconciler cron backstop for dual-pipeline completion`

## Task A7: Deploy dev + verify (incl. the zero-emit race)
- [ ] **Staggered:** drive a run with post-processing lag (enqueue ads, let scrape finish first). Confirm scrape-terminal SKIPS (post-processing still running), post-process-terminal FIRES when all-quiet. Exactly one Slack. Reverse the ordering → still exactly one (claim dedupes).
- [ ] **Simultaneous-terminal (the race):** force both SFNs to reach their terminals together (or simulate each terminal observing the other SFN RUNNING). Confirm BOTH skip, then `completion-reconciler` (trigger manually in dev) emits, reactive checker claims, exactly one Slack. This is the case the pre-migration cron used to cover — confirm the reconciler now covers it.

---

## Cross-cutting verification checklist (run after each group)

- [ ] Old cron schedule removed (no `schedule:` event on the checker).
- [ ] Reactive checker has `dynamodb:PutItem` IAM (for the claim).
- [ ] Emit lambda has `sqs:GetQueueAttributes` + `dynamodb:Query` (+ `states:ListExecutions` for multi-SFN) + `events:PutEvents`.
- [ ] EventBridge rule eventType string EXACTLY matches the emitted `eventType`.
- [ ] Rule target logical id matches serverless mangling (`-` → `Dash`, suffix `LambdaFunction`).
- [ ] Emit wrapped in try/catch returning the SFN event (never blocks the state machine).
- [ ] get-store `WaitTimeSeconds` bumped to 20 on the relevant receive.
- [ ] Replay test: second delivery of the same Run-Completed event → `already_claimed`, zero extra Slack.
- [ ] **Dual-pipeline services (E, A) ONLY:** `completion-reconciler` cron deployed (rate(30 min) prod), emit-only (no Slack, no PutItem), and the simultaneous-terminal race test passes (both terminals skip → reconciler emits → exactly one Slack). Single-pipeline services (D, P, V) must NOT add a reconciler (pure event-driven).
