# Weekend Tasks: DynamoDB Billing + Job Manager Testing

**Date:** 2026-05-17 / 2026-05-18 (Σ/Κ)

## 1. DynamoDB Billing Investigation

**Goal:** Καταλαβαίνω γιατί η DynamoDB κοστίζει τόσο across the business development projects.

**Questions to answer:**
- Είναι storage cost? (πολλά items, μεγάλα items, GSIs που πολλαπλασιάζουν storage)
- Είναι writes? (πολλά writes, μεγάλα writes, on-demand pricing vs provisioned)
- Είναι reads? (scans αντί queries, μεγάλα result sets)
- Ποιο project καίει τα περισσότερα? Breakdown per table/project

**Action items:**
- Check AWS Cost Explorer, filter by DynamoDB, group by usage type
- Check per-table metrics (consumed RCU/WCU) στο CloudWatch
- Compare on-demand vs provisioned pricing for the active tables
- Cross-reference with the existing report: `reports/2026-05-08-dynamodb-gsi-usage-across-projects.md`

## 2. Job Manager Testing

**Context:** Ο Ιάκωβος έχει κάνει αλλαγές στον job manager. Πρέπει να τον δοκιμάσω.

**Goal:** Test the updated job manager + use it to build a Motion Canvas copy-and-review template pipeline.

**Action items:**
- Pull latest changes, review what Iakobos changed
- Run the job manager locally, verify basic functionality
- Design the Motion Canvas copy-and-review template pipeline on top of it
- Document any issues or gaps found during testing
