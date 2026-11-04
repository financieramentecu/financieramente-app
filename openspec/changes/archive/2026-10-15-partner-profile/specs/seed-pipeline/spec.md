# Delta for Seed Pipeline

## ADDED Requirements

### Requirement: SEED-01 Idempotent partner reference data

Seeds MUST create role `PARTNER`, level `PARTNER_EXTERNAL` and category "Partner Externo" (type MIA) idempotently: running twice yields no duplicates and no errors.

#### Scenario: Double run

- GIVEN a seeded database
- WHEN the seed runs again
- THEN row counts for role, level and category are unchanged

### Requirement: SEED-02 Partner configuration per product

For every active product there MUST exist a PARTNER_EXTERNAL configuration and a PPC flagged for new businesses. Products created later MUST get the same via the partner seed/remediation.

#### Scenario: Coverage

- GIVEN all active products after seeding
- WHEN checked
- THEN each has a PARTNER_EXTERNAL configuration with a PPC flagged for new businesses

#### Scenario: Idempotent remediation

- GIVEN the remediation already ran
- WHEN `prisma:seed:partner` runs again
- THEN no duplicate configuration or PPC is created

### Requirement: SEED-03 Dedicated script and safe ordering

A script `prisma:seed:partner` MUST run the partner seeds on its own; the remediation MUST run after the seed. LEVEL_5 MUST remain untouched and seedLevels MUST NOT rename PARTNER_EXTERNAL.

#### Scenario: Standalone run

- GIVEN an existing production-like database
- WHEN `prisma:seed:partner` runs
- THEN only partner data is added and no existing level, role or category is modified
