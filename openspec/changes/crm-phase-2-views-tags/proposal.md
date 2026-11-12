# Proposal: CRM Phase 2 — Lead table, saved views, tags and CRM-owned fields

## Why
Advisors only have the Kanban board, which shows one month of open leads and cannot be searched, sorted or exported. Managers cannot see what the pipeline is worth. Twenty (table views, saved views, tags, custom fields) and Odoo (expected revenue × probability) solve this; we port those features.

## What
- **Leads tab (table):** search, filters (status, stage, owner, tag, created range, idle only), sorting, pagination, CSV export, totals (estimated and weighted value).
- **Saved views:** per user; a view stores the filters and sort of the table.
- **Tags:** a managed catalogue (`LeadTag`) assigned to leads (`LeadTagAssignment`).
- **CRM-owned fields:** `estimatedValue` and `probability` on `Lead`, plus simple custom fields (`LeadCustomField` definitions, values in `Lead.customFieldValues`).

## Constraints
- GHL stays the source of truth: everything here is CRM-owned data that the `crm-sync` webhook never writes. Synced fields stay read-only.
- Hierarchy scope, CONSULTOR read-only, audit on every mutation, soft delete only.
- Behind two new flags, off by default: `crm_lead_table` (table, views, export) and `crm_lead_fields` (tags, value, probability, custom fields).

## Out of scope
Inline editing of synced fields, bulk actions, per-team shared views (Phase 4+), reports (Phase 3).
