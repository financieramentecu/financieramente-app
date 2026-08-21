# Proposal: Leads module — CRM sync + read-only Kanban funnel

## Intent

Leads (the stage before a `Business` exists) live only in an external CRM (GoHighLevel today). Financieramente has no visibility of the pre-sale funnel, so tracking and conversion depend on a third-party UI we do not control and may replace. Add a `Leads` module that receives normalized lead data via webhook, mirrors the funnel as an admin-defined Kanban, and lets a user manually convert a lead into a `Client` + `Business`.

## Scope

### In Scope
- `POST /api/leads/crm-sync`: API-key header auth (no HMAC, no IP allowlist), in-memory sliding-window rate limit per key (~120 req/min → 429). Caller is n8n, which normalizes CRM payloads into a CRM-agnostic contract.
- Payload contract: required `externalCrmId`, `statusKey`; optional `name`, `lastName`, `email`, `phone`, `identityNumber`, `originTag`, `externalUrl`, `ownerEmail`. UPSERT by `externalCrmId`; partial merge — absent/empty optional fields never overwrite stored values. Idempotency comes from upsert, no event table.
- Owner assignment: `ownerEmail` (sent by n8n) resolves to `User.email` → `Lead.ownerId`, following exactly the same partial-merge upsert rule as every other optional field — **there is no "sticky owner"**. Every webhook that carries a present, non-empty `ownerEmail` re-resolves it and writes the result to `Lead.ownerId`, whether it is the same as the current owner or a different one; an already assigned owner is never protected from reassignment. The existing owner is preserved only when `ownerEmail` is absent or empty in that particular webhook, which is just the general rule applied to this field. If `ownerEmail` is present but matches no existing `User` (typo, deactivated user), the webhook still succeeds and the lead ends with `ownerId` null — never rejected, never silently lost: the unmatched email is recorded in `AuditLog` and surfaced to admins so they can correct it in the CRM/n8n.
- `Lead` model (`externalCrmId` nullable+unique, nullable owner FK, funnel column FK, soft delete).
- `LeadFunnelColumn` model: admin-defined `name`, unique `externalStatusKey`, `position`, soft delete. Fixed non-deletable "Sin mapear" fallback for unmapped `statusKey` (webhook still returns success). Column with active leads cannot be deleted. One unified funnel.
- Column admin screen inside existing Administración/Configuración section.
- `Leads` top-level nav entry with a read-only Kanban board (no drag/drop, no manual lead creation) + lead detail with conditional "Ver en CRM" button (`externalUrl`).
- Visibility via existing hierarchy: `getAccessibleUserIds()` + `HIERARCHY_BYPASS_ROLES` (`src/features/auth/lib/hierarchy.ts` CTE version — not the negocios BFS variant). A lead with `ownerId` null is visible ONLY to `HIERARCHY_BYPASS_ROLES` (admins), never to regular users, until an owner is assigned.
- Manual "Convertir a negocio" action: requires `identityNumber` at conversion time, matches/creates `Client` (`[typeIdentity, identityNumber]` unique), then creates `Business`.
- New `AuditAction` values (`LEAD_CREATED`, `LEAD_STATUS_CHANGED`, `LEAD_OWNER_ASSIGNED`, `LEAD_OWNER_UNRESOLVED`, `LEAD_CONVERTED_TO_BUSINESS`, `LEAD_FUNNEL_COLUMN_CREATED`, `LEAD_FUNNEL_COLUMN_UPDATED`) via `logAuditEvent()`.

### Out of Scope
- Lead metrics/analytics dashboard (time-in-column, conversion rates) — separate future change.
- Multi-CRM simultaneous support or an actual CRM migration; only agnostic naming is required now.
- Automatic conversion triggered by any column, manual drag between columns, manual lead creation.
- Manual reassignment of a lead's owner from the UI — future feature. (Reassignment via webhook IS in scope and unrestricted, see the owner-assignment rule above.)
- Manual editing of any lead field (owner, column, contact data) — future feature. The whole Leads v1 module is read-only from Financieramente; every value enters and changes only via webhook.
- Redis-backed rate limiting (unavailable); a Postgres-table limiter is the future option, not built now.

## Capabilities

### New Capabilities
- `leads`: lead entity, ownership/hierarchy visibility, read-only Kanban board, lead detail, manual conversion to `Client` + `Business`.
- `leads-crm-sync`: webhook ingestion contract, API-key auth, rate limiting, upsert/partial-merge semantics, unmapped-status fallback.
- `lead-funnel-columns`: admin CRUD for columns, `externalStatusKey` mapping, ordering, deletion guards, fixed "Sin mapear" column.

### Modified Capabilities
- `navigation`: add top-level `Leads` entry and the column-admin entry under Administración.
- `security`: first non-session, service-to-service authenticated inbound endpoint (API key header + rate limit).

## Approach

n8n acts as the anti-corruption layer: it flattens GHL's noisy payload into our generic contract, so Financieramente never learns CRM-specific vocabulary. The route handler validates the API key, applies the in-memory limiter, parses with Zod, and delegates to `src/features/leads/services/` (all Prisma access). Column routing is a lookup of `statusKey` against `LeadFunnelColumn.externalStatusKey`, falling back to "Sin mapear"; owner routing runs on every payload that includes `ownerEmail`, looking it up against `User.email` and falling back to a null owner when unmatched — no special-casing of an already assigned owner. Feature layout mirrors `src/features/negocios/` (`components/`, `hooks/`, `lib/`, `services/`, `types/`, `mappers/`, `__tests__/`); a `buildLeadListWhere()` pure builder mirrors `buildBusinessListWhere()`. Conversion reuses the existing `negocios` creation path.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | New `Lead`, `LeadFunnelColumn`; FKs to `User`, `Business` |
| `prisma/ERD.md` | Modified | Must be updated with new models (design/tasks phase) |
| `src/features/leads/` | New | Full feature folder |
| `src/app/api/leads/` | New | `crm-sync` webhook + board/detail/column endpoints |
| `src/features/auth/lib/audit-logger.ts` | Modified | New `AuditAction` values |
| `src/features/auth/lib/hierarchy.ts` | Reused | Visibility scoping (no third implementation) |
| Navigation config | Modified | `Leads` menu entry + admin sub-entry |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| API-key-only auth on a write endpoint | Med | Long random key in env, HTTPS-only, rate limit, audit log every ingest, key rotation documented |
| In-memory limiter ineffective across instances | Med | Accepted for now; Postgres-table limiter documented as the upgrade path |
| Out-of-order webhooks regress a lead's column or owner | Med | Upsert is last-write-wins by design (explicitly including owner); changes are audit-logged so regressions are traceable |
| Missing `identityNumber` blocks conversion | High | Conversion form requires it explicitly before creating `Client`/`Business` |
| New Kanban UI has no prior art in the repo | Med | Read-only board (no DnD) keeps the surface small; reuse shared UI primitives |
| Unmapped `statusKey` silently accumulates | Med | "Sin mapear" column is visible in the board so admins notice and map it |
| `ownerEmail` never matches a `User`, leaving leads owner-less and invisible to sales users until the CRM is corrected | Med | **Accepted for v1 — confirmed by the user.** Webhook is not rejected; unmatched email is audit-logged and owner-less leads are surfaced to admins so the CRM/n8n value can be corrected; a later webhook assigns the owner. Manual owner reassignment from the UI is the natural follow-up in a future feature, explicitly out of scope here |

## Rollback Plan

Feature is additive. Revert order: remove nav entries (hides the module), revert the feature branch, then run a down migration dropping `Lead` and `LeadFunnelColumn`. No existing table is altered destructively, so `Business`/`Client`/`User` flows are unaffected. Disabling the API key alone stops all ingestion without touching data.

## Dependencies

- n8n workflow at `n8n.financieramentecu.co` must emit the agreed CRM-agnostic contract.
- Shared API key provisioned as an environment variable in each deploy environment.

## Success Criteria

- [ ] n8n POSTs to `/api/leads/crm-sync` create and update leads idempotently; repeated identical payloads yield identical state.
- [ ] Optional fields absent from a payload never blank out previously stored values.
- [ ] Unknown `statusKey` lands in "Sin mapear" and returns success.
- [ ] Admin can create/rename/reorder/soft-delete columns and map `externalStatusKey`; deletion is blocked when active leads exist.
- [ ] A present `ownerEmail` always (re)assigns the lead owner, including overwriting a different existing owner; an unmatched email still stores the lead with `ownerId` null, returns success, and is audit-logged for admin correction.
- [ ] Kanban shows only leads visible per hierarchy; admins see all (including owner-less leads); regular users never see leads with `ownerId` null; no user can move or create a lead from the UI.
- [ ] A lead converts manually into a matched/created `Client` and a new `Business` after supplying `identityNumber`.
- [ ] Every ingest, column change, column CRUD and conversion produces an `AuditLog` entry.
