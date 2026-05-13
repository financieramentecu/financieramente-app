# Product Commission Management — Specification

## Purpose

Extend the `Product` entity with `commissionPercentage` and `contributionType` fields so administrators can configure commission rates and contribution categories per product. Includes a seed script to populate existing products from a CSV source.

---

## Requirements

### Requirement: Product Commission Percentage Field

The `Product` entity MUST store a `commissionPercentage` as a non-null Decimal value (default 0). The DB migration `20260513031441_add_product_commission_properties` is already applied — no new migration required.

#### Scenario: Create product with commission percentage

- GIVEN an administrator submits a valid product creation request
- WHEN `commissionPercentage` is provided as a numeric value (e.g., 3.5)
- THEN the product is persisted with that value and returned in the response

#### Scenario: Create product without commission percentage

- GIVEN an administrator submits a product creation request without `commissionPercentage`
- WHEN the request is processed
- THEN `commissionPercentage` defaults to 0

#### Scenario: Commission percentage below 0 is rejected

- GIVEN an administrator submits a product with `commissionPercentage` of -1
- WHEN the request is validated
- THEN a 400 error is returned with a message indicating the value must be >= 0

#### Scenario: Commission percentage above 100 is rejected

- GIVEN an administrator submits a product with `commissionPercentage` of 101
- WHEN the request is validated
- THEN a 400 error is returned with a message indicating the value must be <= 100

---

### Requirement: Product Contribution Type Field

The `Product` entity MUST store a `contributionType` as a non-null enum value of `REGULAR` or `INICIO`. No default is implied — the field is required on create.

#### Scenario: Create product with valid contribution type

- GIVEN an administrator submits a product with `contributionType` of `REGULAR` or `INICIO`
- WHEN the request is processed
- THEN the product is persisted with the provided contribution type

#### Scenario: Create product with invalid contribution type

- GIVEN an administrator submits a product with `contributionType` of `OTRO`
- WHEN the request is validated
- THEN a 400 error is returned with a message listing valid values

#### Scenario: Update product contribution type

- GIVEN an existing product with `contributionType = REGULAR`
- WHEN an administrator updates it to `INICIO`
- THEN the product record reflects `INICIO` and an audit log entry is created

---

### Requirement: Product Form UI — Commission Fields

The `ProductForm` component MUST render inputs for `commissionPercentage` (numeric) and `contributionType` (select: REGULAR | INICIO). Both fields MUST be included in the Zod validation schema.

#### Scenario: Form displays commission fields

- GIVEN an administrator opens the product create or edit form
- WHEN the form renders
- THEN `commissionPercentage` input and `contributionType` select are visible

#### Scenario: Form submission with valid fields

- GIVEN the administrator fills both fields with valid values
- WHEN the form is submitted
- THEN the API request includes both fields and the product is saved

---

### Requirement: Products Table — Commission Columns

The `ProductsTable` component MUST display `commissionPercentage` (formatted as percentage) and `contributionType` columns for each product row.

#### Scenario: Commission columns are visible

- GIVEN the products list page is loaded with products that have commission data
- WHEN the table renders
- THEN each row shows the commission percentage and contribution type

---

### Requirement: API Routes — Commission Fields Accepted

`POST /api/products` and `PUT/PATCH /api/products/[id]` MUST accept and persist `commissionPercentage` and `contributionType`. Responses MUST include both fields. All mutations MUST log an audit event via `logAuditEvent()`.

#### Scenario: POST creates product with commission fields

- GIVEN a valid POST body including `commissionPercentage` and `contributionType`
- WHEN the route handler processes the request
- THEN a 201 response includes the persisted product with both fields

#### Scenario: PATCH updates commission fields

- GIVEN an existing product and a PATCH body with updated `commissionPercentage`
- WHEN the route handler processes the request
- THEN a 200 response includes the product with updated commission value and an audit log entry is created

---

### Requirement: CSV Seed Script

A seed script MUST read `docs/product-percentage-payment-commission.csv` and update existing products with `commissionPercentage` and `contributionType` derived from the CSV data.

Mapping rules:
- `PRODUCTO` column → match by `Product.name` (case-insensitive)
- `APORTE` column → `contributionType` (`REGULAR` or `INICIO`)
- `% COMISIONAL PAGO LIQUIDACION` column → `commissionPercentage` (strip `%` and parse as Decimal)

#### Scenario: Seed updates matched products

- GIVEN the CSV contains a row with `PRODUCTO = "ProductoX"`, `APORTE = "REGULAR"`, `% COMISIONAL PAGO LIQUIDACION = "3.5%"`
- WHEN the seed script runs
- THEN the product with name `ProductoX` is updated to `commissionPercentage = 3.5` and `contributionType = REGULAR`

#### Scenario: Seed skips unmatched products

- GIVEN the CSV contains a product name that does not match any `Product.name` in the database
- WHEN the seed script runs
- THEN no record is created or modified for that row and the mismatch is logged to the console

#### Scenario: Seed strips percent symbol correctly

- GIVEN a CSV row with `% COMISIONAL PAGO LIQUIDACION = "12.5%"`
- WHEN the seed script parses the value
- THEN `commissionPercentage` is stored as `12.5` (not `12.5%` or `0.125`)
