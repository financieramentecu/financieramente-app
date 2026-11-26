## Why
The CRM currently mixes acquisition source, referrer and offer, and renders linked opportunities separately. The approved scope needs one visible person card while preserving every Lead and its attribution, history and authorization.

## What Changes
- Keep ClientOrigin/originTag as acquisition source; add optional dynamic referrer and configurable capture per Lead.
- Configure capture names, presentation levels and active status beside existing origin administration.
- Render one card per visible LeadLink component and select individual opportunities in card/detail.
- Consolidate visible history with actual human/System provenance.
- Enforce one Money Strategist across related records during creation, ingestion, relation and reassignment, with full write authorization.
- Preserve old webhook/CSV payloads and legacy attribution; nullable additive migration only.

## Capabilities
### Modified Capabilities
- `leads`: captures, visible person grouping, consolidated history, transactional ownership propagation.

## Impact
Prisma Lead/catalogue migration; leads ingestion/create/link/assignment/read/timeline services and routes; lead types/schemas/hooks; pipeline/card/detail/native create UI; admin origins/navigation and catalogue UI; feature tests.

## Out of scope
Session balances, entitlements, consumption, session packages, automatic supersession/cancellation, new Person table, destructive label inference, backfill of guessed origins/referrers/captures. Both captures remain active; levels only order presentation.

## Rollback
Hide new UI and roll back application while retaining additive nullable columns/catalogue. Do not drop capture data or undo historical ownership with guessed values. Existing integrations continue without new fields.
