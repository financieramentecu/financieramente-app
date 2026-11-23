# CRM: Create a lead from Pipelines

## Why

The Pipelines board only receives leads through integrations/imports. Advisors need to register a contact directly and start following it in the existing CRM.

## What changes

- Add a **Nuevo lead** form to Pipelines for basic contact data.
- Create an active `OPEN` lead in the active `NUEVO_LEAD` column with origin **Propio**.
- A leaf Money Strategist owns the lead automatically. An administrator or leader can select an active advisor within their existing write scope.
- Enforce permissions on the server, persist the origin pivot atomically, record the real actor, and refresh the board after success.
- Repeated document, email or phone creates a distinct lead automatically related to every active contact match; each side shows the relation in its existing timeline.

## Capabilities

### Modified capabilities
- `leads`: manual lead creation and ownership at creation.

## Impact

`src/features/leads/{components,hooks,lib,services}`, `src/app/api/leads/route.ts`, API reference and focused tests. Reuse `Lead`, hierarchy authorization, shared form controls, audit logging and origin helpers. No Prisma migration or new dependency is needed: `Lead.externalCrmId` is already nullable and `Propio` already exists in the seed.

## Assumptions and scope

“Team lead” means a person leading other Money Strategists according to the existing hierarchy policy. Basic fields are name, last name, email, phone and optional identity number; the minimum required fields follow the form schema and must reject an empty contact. All manual creations use `Propio`; origin is not a user-editable integration field. Creating accounts, pushing to the external CRM, selecting arbitrary stages and changing existing leads are outside this task.

## Risk and rollback

The main risk is unauthorized assignment through a forged request or a broad read grant. Authorize against `manageableUserIds`, never read-only visibility. Do not merge, overwrite or reassign existing leads as a side effect of creation. Save automatic contact relations atomically with the new lead while retaining its explicitly authorized advisor. Keep existing API visibility controls and timeline behavior. Revert the feature code to remove creation; preserve manually created leads and their origins.
