# Spec: Business Creation Product Identity & Data Seeding

## 1. Logic Requirements
- Deterministic product resolution via filtered fallback.
- Rejection of creation if no valid commission plan exists for the selected product.

## 2. Seeding Requirements
To ensure a smooth user experience, the system must bootstrap a "safe default" for all products.

### Default Configuration Spec:
- **Scope**: Every active `Product` in the database.
- **Origin**: "Propio".
- **Category**: "JUNIOR".
- **Commission Distribution**:
    - Recipient: "JUNIOR" category.
    - Percentage: 60% (0.60).
- **Plan Type**: Active for new businesses.

### Unique Code Format:
`{COMPANY_NAME}-{PRODUCT_NAME}-{ORIGIN}-{CATEGORY}`
All segments normalized (Upper case, spaces to `_`).
