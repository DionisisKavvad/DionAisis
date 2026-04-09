# greek-ecommerce

- **Code:** `/Users/dionisis/Projects/Business development/scrape-the-greek-ecommerce-v2`
- **AWS Alias:** equality
- **Description:** Scraping pipeline for Greek e-commerce marketplaces (Skroutz, BestPrice). Two Step Functions: `scrape-greek-marketplaces` (collects stores) and `scrape-greek-stores` (processes each store).
- **Status:** Tracked
- **Key date:** None

## Business services
- scrape-eshops
- scrape-eshops-helpers
- scrape-eshops-reports
- scrape-eshop-products
- process-eshops-information
- detect-store-logo
- manual-review
- scrape-logs

## Stack (high level)
- AWS Lambda + Step Functions + SQS + DynamoDB
- Puppeteer for scraping
- SQS queues: `stores-in-bulk-sqs`, `stores-sqs`
- See `dynamodb-data-models.md` in the repo for the data model
