# Delta for Levels

## MODIFIED Requirements

### Requirement: Level code values aligned to hierarchy

The canonical code-to-levelNumber mapping SHALL be:

| Code             | levelNumber |
| ---------------- | ----------- |
| LEVEL_0          | 0           |
| LEVEL_1          | 1           |
| LEVEL_2          | 2           |
| LEVEL_3          | 3           |
| LEVEL_4          | 4           |
| LEVEL_5          | 5           |
| GENERAL_LEVEL    | null        |
| PARTNER_EXTERNAL | null        |

`PARTNER_EXTERNAL` (display "Partner Externo", beneficiary mode OVERRIDE) MUST sit outside the LEVEL_0..GENERAL_LEVEL chain: it MUST NOT be the next level of any level and MUST NOT be reachable through hierarchy progression. LEVEL_5 ("Partner") MUST remain unchanged.
(Previously: the table had no PARTNER_EXTERNAL row.)

#### Scenario: Seed data matches canonical mapping

- GIVEN the database is seeded with hierarchy levels
- WHEN each level is read
- THEN `code` and `levelNumber` SHALL match the canonical table above

#### Scenario: LEVEL_5 untouched

- GIVEN the seeds run on a database that already has LEVEL_5 "Partner"
- WHEN seedLevels completes
- THEN LEVEL_5 keeps its code, name and levelNumber, and PARTNER_EXTERNAL exists separately

#### Scenario: PARTNER_EXTERNAL not renamed

- GIVEN PARTNER_EXTERNAL exists
- WHEN seedLevels runs again (including the legacy old-code rename step)
- THEN PARTNER_EXTERNAL is not renamed or merged into LEVEL_5

## ADDED Requirements

### Requirement: LVL-01 Partner level excluded from chains and pickers

`PARTNER_EXTERNAL` MUST NOT appear in the calculadora level dropdown, in leader-candidate lists, or in admin level choices for users (PM-07, PA-03).

#### Scenario: Dropdown

- GIVEN the calculadora
- WHEN levels load
- THEN PARTNER_EXTERNAL is absent
