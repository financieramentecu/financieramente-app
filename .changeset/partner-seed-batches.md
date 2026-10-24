---
'financieramente-app': patch
---

### Técnico

- `prisma:seed:partner` now applies PARTNER_EXTERNAL product configurations in batches of 5 per transaction (`PARTNER_REMEDIATION_BATCH_SIZE`) instead of one transaction for every product, so it no longer exceeds the interactive-transaction timeout over a slow or tunnelled connection. The seed stays idempotent.
- `applyMissingBaseConfigurations` sets `maxWait: 30_000` alongside `timeout: 120_000`; the default 2s `maxWait` made opening the transaction fail with P2028 ("Unable to start a transaction in the given time").
- Added `PARTNER_CODE_OVERRIDES` (keyed by the generated code, not the product id) for products whose generated PARTNER_EXTERNAL code exceeds `ProductConfiguration.code` VarChar(50). First entry: `AFIBL-SELEC_TERM_TO_A_85_TO_A_100-PARTNER_EXTERNAL`.
