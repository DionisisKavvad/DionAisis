# Batch 2 & 3 Certificate Email Report

**Date:** 2026-05-11
**Project:** AKKED (aws-customer-io)
**Journey IDs:** `akked-certificate-email-batch-2-v2`, `akked-certificate-email-batch-3`

## What was done

Shipped certificate + receipt email batches for AKKED. Unlike batch-1 (certificates only), batches 2 & 3 send both the attendance certificate PDF and the receipt PDF as attachments per user.

### New components built

- **CertificateEntityRetrieverWithReceipt** Lambda: reads certificate PDFs from S3 (matched by `kodikos_aitisis` in filename), receipt PDFs (matched by surname/name), cross-references against DynamoDB user records, generates presigned URLs, returns entities with both attachments
- **organize-batch-2.sh**: shell script to organize raw OneDrive exports (4 drives, Greek folder names with typo variants like ΒΕΒΑΙΩΣΕΙΣ/ΒΕΒΕΑΙΩΣΕΙΣ/Βεβαιώσεις) into a clean staging structure with manifest
- **validate-batch-2.ts**: local dry-run validation script that matches PDFs to DB users, reports orphans/conflicts/missing docs before uploading to S3
- **Email template updated**: added mention of receipt attachment in the email body

### Data challenges resolved

- 4 OneDrive exports with inconsistent Greek folder naming (3 variants for "certificates", 3 for "receipts")
- 1 duplicate department folder (06-0068) across drives, handled by processing order
- Receipt PDFs named by person name (not kodikos), requiring name-based matching with conflict resolution
- 21 users in department 06-0143 had a typo in DynamoDB (`06-00143`), fixed directly in prod
- Multiple name conflicts (same name, different users) resolved via department-based disambiguation
- 7 orphan receipts (duplicates/extras) deleted after verification
- 2 orphan receipts renamed to match correct DB records

## Delivery results

### Batch 2
| Metric | Count |
|--------|-------|
| PDFs in S3 | 698 |
| Emails prepared | 698 |
| Delivered | 696 |
| Bounced | 0 |
| Pending | 2 |

**Pending:** frosinigrania@gmail.com, katerinavourliti@yahoo.gr

### Batch 3
| Metric | Count |
|--------|-------|
| PDFs in S3 | 703 |
| Emails prepared | 703 |
| Delivered | 701 |
| Bounced | 0 |
| Pending | 2 |

**Pending:** lmastrandrikou@yahoo.gr, pepyglentzi@yahoo.com

### Totals
- **1,401 emails sent** across both batches
- **1,397 delivered** (99.7% delivery rate)
- **0 bounces**
- **4 pending** (likely slow mailbox delivery, no bounce signal)

## Step Function executions

Both batches used the `aws-customer-io-journey-batch-approval-prod` Step Function with Slack-based approval.

- Batch 2: approved by dennis at 18:12 UTC+3, completed in 68 seconds
- Batch 3: approved and completed same day

## Files committed

```
projects/akked/all-journeys.ts                          (3 new journey defs: test, batch-2, batch-3)
projects/akked/email-templates/certificate-email.html   (receipt mention added)
projects/akked/serverless.yml                           (new Lambda: CertificateEntityRetrieverWithReceipt)
projects/akked/src/handlers/certificate-entity-retriever-with-receipt.ts
projects/akked/scripts/organize-batch-2.sh
projects/akked/scripts/validate-batch-2.ts
projects/akked/batch-2-manual-resolutions.md
projects/akked/unique-departments.txt
```
