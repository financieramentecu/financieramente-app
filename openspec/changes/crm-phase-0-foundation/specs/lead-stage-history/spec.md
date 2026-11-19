# Lead Stage History Specification

## Purpose

Record every funnel stage transition of a lead, starting now with GHL-sourced data, so that time-in-stage and conversion reports have history before the CRM cut-over.

## Requirements

### Requirement: Stage History Entity

`LeadStageHistory` MUST store `idLead`, `fromIdLeadFunnelColumn` (nullable: null on the lead's first stage), `toIdLeadFunnelColumn`, `source` (`CRM_SYNC` | `CSV_IMPORT` | `MANUAL`), `idUser` (nullable: null for system sources), `changedAt` and `createdAt`. Rows are append-only: never updated, never deleted.

### Requirement: Record On Create And On Column Change

When the webhook or the CSV import upserts a lead, a history row MUST be written if and only if the lead is new or its funnel column changed. No row SHALL be written when the column is unchanged.

`changedAt` MUST be the sync's `updatedAt` when provided (webhook historical timestamps), otherwise the processing instant.

#### Scenario: New lead via webhook
- GIVEN no lead exists for `externalCrmId = 'crm-1'`
- WHEN the webhook creates it in column 5
- THEN one history row SHALL exist with `from = null`, `to = 5`, `source = CRM_SYNC`

#### Scenario: Column change via webhook
- GIVEN a lead in column 1
- WHEN the webhook moves it to column 5 with `updatedAt = 2026-08-01T10:00:00Z`
- THEN one history row SHALL exist with `from = 1`, `to = 5`, `changedAt = 2026-08-01T10:00:00Z`

#### Scenario: Same column
- GIVEN a lead in column 5
- WHEN a webhook arrives that keeps it in column 5
- THEN no history row SHALL be written

#### Scenario: CSV import change
- GIVEN a lead in column 1
- WHEN a CSV row moves it to column 3
- THEN one history row SHALL exist with `source = CSV_IMPORT` and `idUser` = the importing user

### Requirement: History Failures Do Not Break Sync

A failure writing history MUST NOT fail the webhook or the CSV row: the error SHALL be reported to Sentry and processing SHALL continue.
