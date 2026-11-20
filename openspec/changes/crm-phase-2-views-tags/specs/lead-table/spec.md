# Spec: Lead table, saved views, tags and CRM fields

## Requirement: Scoped table
The table MUST only list active leads visible to the viewer (same scope as the board).
- Scenario: an ASESOR filters by an owner outside their hierarchy → the owner id is ignored and no foreign lead is returned.
- Scenario: `q=ana` matches name, last name, email, phone or document, case-insensitively.
- Scenario: `idle=1` returns only OPEN leads whose last activity (or creation) is older than `CRM_INACTIVITY_DAYS`.
- Scenario: `pageSize=500` → 400.

## Requirement: Totals
- Scenario: two leads 1 000 000 @ 50 % and 2 000 000 @ none → estimated 3 000 000, weighted 500 000.

## Requirement: Export
- Scenario: export returns `text/csv` with BOM and the filtered rows; a cell `=SUM(A1)` is written as `'=SUM(A1)`.
- Scenario: more than 5 000 rows → 413 "Demasiados registros"; the export is audited when it succeeds.

## Requirement: Saved views
- Scenario: a user cannot read, rename or delete another user's view (404).
- Scenario: the 21st active view → 409.
- Scenario: delete sets `active=false`.

## Requirement: Tags
- Scenario: CONSULTOR cannot create tags or change a lead's tags (403).
- Scenario: `PUT tags [1,3]` on a lead with `[1,2]` → 2 deactivated, 3 assigned, 1 untouched.
- Scenario: creating "vip" when "VIP" is active → 409; when inactive → reactivated.

## Requirement: CRM fields
- Scenario: probability 120 → 400; estimatedValue "-1" → 400.
- Scenario: a SELECT custom field rejects a value outside its options; an unknown key → 400.
- Scenario: setting a custom value to null removes the key and leaves the others.
- Scenario: the `crm-sync` webhook never touches these columns.
