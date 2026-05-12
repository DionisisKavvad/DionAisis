# aws-customer-io

- **Type:** work
- **Status:** Active
- **AWS Alias:** equality
- **Repo:** `~/Projects/aws-customer-io/`
- **Key date:** none

## Description

Serverless AWS application for managing customer journeys and email campaigns. Processes entities (stores, companies, users) through configurable journeys with email automation, event tracking, and condition-based flow control.

## Stack

- AWS Lambda, Step Functions, DynamoDB, SES, SQS, EventBridge
- Serverless Framework
- TypeScript, Jest + Cucumber BDD
- AWS SDK v3

## Key concepts

- **Journeys:** configurable state machines (batch or ongoing) that move entities through action/wait/condition/terminal states
- **Projects:** business-development, cosmote, executive, gb-platform (each with its own campaign logic and email templates)
- **Event-driven:** EventBridge routes events, SES triggers logging, SQS handles entity processing at scale

## Notes

- Service wrapper pattern for all AWS interactions (never use SDK directly in handlers)
- Multi-tenant: partitioned by journey and entity IDs
- Stages: `dev` and `prod` via Serverless Framework
