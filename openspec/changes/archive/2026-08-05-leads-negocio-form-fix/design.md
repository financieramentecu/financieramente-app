# Design: Lead → Business Conversion Friction Fix

## Technical Approach

Unit A keeps every gate derivation inside `useBusinessForm` (single source of truth) and inserts one client-resolution step in the create branch of `handleFormSubmit`, before `createClient`. The resolved client is pushed through the existing `setSelectedClient` path so the current `hasChanges` → `updateClient` sync (lines ~246-275) runs unchanged. Resolution is read-only except for the D7 reactivation write, and it interrupts the submit only for the D5 document-mismatch decision.

Layering follows the project contract: `hook → Server Action → service → Prisma`. `use-business-form.ts` is a client hook and cannot import Prisma, so the new resolution service is exposed through a thin, auth-guarded Server Action (same shape as `createClient` / `updateClient`).

Unit B is a projection widening: one field in the existing `select`, one field in the `LeadCard` type, one visual treatment in `lead-card.tsx`.

## Architecture Decisions

### D1 — Exact match requires `active: true`

**Choice**: Both resolution queries filter `active: true` explicitly. An inactive `Client` is NEVER a match, regardless of document or email. No reactivation write.
**Alternatives**: (a) ignore `active` (reuse inactive clients as-is); (b) match then flip `active: true`.
**Rationale**: Business decision — a new business must never be attached to a deactivated client. `Client.active` exists in the schema with `@default(true)` and no current CRUD/listing filters or exposes it (`GET /api/clients/search` returns inactive clients today), but the product owner explicitly rejected creating that precedent: attaching new revenue records to a logically-deleted client is an inconsistency risk that outweighs the extra dead-end case below. (b) is rejected too: an implicit reactivation is a state mutation the user never requested and is outside the approved scope.
**Scope of D1 vs D7**: D1 governs the *silent background match* only — the system never reuses an inactive client just because a typed value happens to hit a deactivated row. It does NOT forbid reactivation under an explicit user action; that case is D7, which runs only after D1's two active lookups both return nothing and only under `leadId`. Read D1 and D7 together: D1 is "inactive is never a silent match", D7 is "inactive + explicit lead conversion is a legitimate reactivation signal".

**Known limitation (residual, out of scope)**: when the only `Client` carrying that `identityNumber` is inactive and D7 does not run (manual creation, no `leadId`) or D7 itself fails, resolution finds nothing, falls through to `createClient`, and `createClient` fails with *"Ya existe un cliente con este número de identificación"* (`create-client.ts:59-64`) because `@@unique([typeIdentity, identityNumber])` is not scoped by `active`. This is **pre-existing** behavior, unchanged by this design. After D7 it is narrowed to the manual (non-lead) path, which is explicitly out of scope. `sdd-tasks` MUST NOT widen the fix beyond D7 (no reactivation in the manual flow, no soft-delete-aware upsert, no constraint change).

### D2 — Resolution runs only when `leadId` is present

**Choice**: Called only from the create branch and only when `leadId` is truthy.
**Alternatives**: Run on every business creation.
**Rationale**: `leadId` is exactly where the manual `ClientAutocomplete` gate is removed, so it is the only path that lost its dedup step. Applying it to manual creation would silently change stable behavior (a user who deliberately clicked "Crear nuevo" would get a different client attached) — out of the approved scope.

### D3 — `isBlocked` folds `isEditMode`

**Choice**: `isBlocked = !isEditMode && !isPrivilegedRole && !leadId && (!documentValue || documentValue.length < 5)`, computed once in the hook and passed down.
**Alternatives**: Keep `!isEditMode` inside `ClientInfoSection`.
**Rationale**: `ClientInfoSection:57` carries `!isEditMode` and the hook does not; folding it in preserves that section's exact semantics. It is behavior-neutral for the other consumers because in edit mode `identityNumber` is always prefilled (≥5), so today's value is already `false` there.

### D4 — Contract gate stays a separate hook-derived flag

**Choice**: The hook also exposes `isContractBlocked = !isEditMode && !leadId && (!documentValue || documentValue.length < 5)`; `business-form.tsx` consumes it instead of deriving `isContractDisabled`.
**Alternatives**: Collapse it into `isBlocked`.
**Rationale**: Today's `isContractDisabled` (`business-form.tsx:73-74`) applies the document gate even to privileged roles. Collapsing it would unblock the contract field for privileged users in the manual flow — a scope change. A second named flag keeps that semantic while still deriving it in exactly one place.

### D5 — Email fallback: single match only, document mismatch is a user decision

**Choice**: Email fallback requires the form email to be non-empty and to match **exactly one** active client; 0 or 2+ matches fall through to `createClient`. When that match's stored `identityNumber` differs from the typed one, the system does NOT decide silently: the submit is interrupted and an inline, non-modal alert renders inside the client section — *"Encontramos un cliente con este email pero con un documento distinto al que ingresaste: {stored}"* — with two explicit actions, **"Actualizar documento"** and **"Mantener el existente"**. Choosing resumes the same submit with that decision applied. `Actualizar` sends `identityNumber` through `updateClient`; `Mantener` keeps the stored document (the original D5 behavior, now user-chosen).
**Alternatives**: (a) silently discard the typed document (original D5); (b) silently overwrite the stored one; (c) a blocking modal.
**Rationale**: An email match implies the documents differ (an identical document would have matched at step 1), so (a)/(b) always silently discard user-entered data on a revenue record. (c) was rejected because the surrounding form is inline and the user must still see both values in context. `updateClient` gates `identityNumber` behind `requiresPrivilegedRole()` (`update-client.ts:54-61`), so **"Actualizar documento" is disabled with an explanatory caption for non-privileged roles** (evaluated client-side from `currentUser.role` via the same `canRoleEditClientInfo` predicate); the server remains authoritative and any returned error surfaces in the alert instead of failing silently.
**Interruption semantics (CONFIRMED by the user)**: the alert is non-modal but the submit **is interrupted until the user chooses** — the business needs a decided client. `handleFormSubmit` returns early, the form stays filled and editable, and the two buttons re-invoke the submit; the user never re-types or presses *Guardar* twice. The rejected alternative — create the business immediately with the stored document and offer an after-the-fact correction — was explicitly ruled out, because it reintroduces the silent discard of user-entered data that this decision exists to remove.

### D6 — Resolution failure never blocks the submit

**Choice**: The action returns `ApiResponse<Client | null>`; on `error` the hook logs and falls through to the current `createClient` path.
**Rationale**: Preserves today's worst case (create-then-error) instead of adding a new hard failure mode to the submit. Applies to D7's reactivation too: a failed reactivation falls through rather than aborting.

### D7 — Reactivation fallback, only under `leadId`

**Choice**: A third resolution step, reached only when D1's two active lookups both return nothing AND `leadId` is present:
1. active exact `typeIdentity` + `identityNumber` (D1) → reuse;
2. else active exact `email`, exactly one match (D1/D5) → reuse;
3. else **`active: false` exact `typeIdentity` + `identityNumber`** → reactivate (`active: true`) and reuse;
4. else `createClient` unchanged.

Step 3 matches **by document only — never by email**. The reactivation happens server-side inside the same resolution action, which then returns the now-active client so the existing `hasChanges` → `updateClient` sync handles the remaining fields.
**Alternatives**: (a) no reactivation (the previous design — leaves the dead end); (b) reactivate on email match too; (c) reactivate from the manual flow as well.
**Rationale**: Creating a business for a document is an explicit, high-intent business action — a legitimate reactivation signal, unlike a background match on a typed value (D1). (b) is rejected because `Client.email` is not unique and a false positive here does not just mis-link, it *resurrects* the wrong record. (c) is rejected for the same scope reason as D2.
**Consequences**: this makes the resolution action a **write path**, not the read-only service the proposal's rollback plan assumed. It therefore requires (i) `AuditAction.CLIENT_REACTIVATED` added to `src/features/auth/lib/audit-logger.ts` and a `logAuditEvent` call per project convention (all mutations are audited), and (ii) an `auth()`-derived actor for that log. `Client.active` stays a soft-delete flag — no physical delete, no schema change.

## Data Flow

    handleFormSubmit (create, leadId present)
         │
         ├─ resolveExistingClient(action) ─→ client-resolution.service ─→ Prisma
         │      1. active:true AND exact typeIdentity+identityNumber      → 'document'
         │      2. else active:true AND exact email (exactly 1 match)     → 'email'
         │      3. else active:false AND exact typeIdentity+identityNumber
         │              → reactivate(active:true) + audit               → 'reactivated'
         │      4. else                                                   → null
         │
         ├─ 'email' AND stored doc ≠ typed doc
         │      └─ STOP → render inline decision alert (D5)
         │             ├─ "Actualizar documento" → updateClient(+identityNumber) ─┐
         │             └─ "Mantener el existente" ───────────────────────────────┤
         │                                                        (resume submit)│
         ├─ 'document' | 'reactivated' | resumed ←──────────────────────────────┘
         │      └─ setSelectedClient(client) → hasChanges? → updateClient
         └─ null / error → createClient (unchanged) → setSelectedClient
                                    │
                                    └─→ createBusiness({ ..., idLead })

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/negocios/services/client-resolution.service.ts` | Create | `resolveExistingClient(...)` → `ClientResolution \| null`; `findFirst` composite + `active: true`, then `findMany(take: 2)` exact email + `active: true`, then (lead mode) `findFirst` composite + `active: false` → `update({ active: true })` |
| `src/features/negocios/actions/resolve-existing-client.ts` | Create | `'use server'`, `auth()` guard, Zod input, returns `ApiResponse<ClientResolution \| null>`; emits `CLIENT_REACTIVATED` audit on D7 |
| `src/features/auth/lib/audit-logger.ts` | Modify | Add `AuditAction.CLIENT_REACTIVATED` (D7) |
| `src/features/negocios/hooks/use-business-form.ts` | Modify | `isBlocked` (D3) + `isContractBlocked` (D4); resolution call in create branch (D2, D6, D7); `identityConflict` state + `resolveIdentityConflict(choice)` resume handler (D5) |
| `src/features/negocios/components/sections/client-info-section.tsx` | Modify | Add `isBlocked: boolean` prop, delete local derivation (line 57), render `<ClientIdentityConflictAlert>` (D5) |
| `src/features/negocios/components/sections/client-identity-conflict-alert.tsx` | Create | Presentational inline alert: stored vs typed document, two actions, disabled `Actualizar` + caption for non-privileged roles, server-error slot (D5) |
| `src/features/negocios/components/business-form.tsx` | Modify | Delete `documentValue` watch + `isContractDisabled`; pass `isBlocked` to `ClientInfoSection`, `isContractBlocked` as `contractDisabled` |
| `src/features/leads/services/lead-board.service.ts` | Modify | `idBusiness: true` in `select` + card mapping |
| `src/features/leads/types/lead.types.ts` | Modify | `LeadCard.idBusiness: number \| null` |
| `src/features/leads/components/lead-card.tsx` | Modify | `isConverted = lead.idBusiness !== null` → "Negocio creado" Badge + emerald border/background |

## Interfaces / Contracts

```typescript
// services/client-resolution.service.ts
export interface ResolveClientCriteria {
	typeIdentity: string // 'CC' — mirrors createClient's hardcoded default
	identityNumber: string
	email?: string | null
	/** D7: enables the inactive-document reactivation fallback. Lead conversion only. */
	allowReactivation: boolean
}

/** How the client was resolved — drives the D5 alert and the D7 audit entry. */
export type ClientResolutionSource = 'document' | 'email' | 'reactivated'

export interface ClientResolution {
	client: Client
	source: ClientResolutionSource
}

export async function resolveExistingClient(
	criteria: ResolveClientCriteria
): Promise<ClientResolution | null>
```

Steps 1-2 are `active: true`-scoped (D1); step 3 is `active: false`-scoped (D7). Because the composite match carries a second condition it uses `findFirst({ where: { typeIdentity, identityNumber, active: <bool> } })` rather than `findUnique` on `typeIdentity_identityNumber`.

`source` is what the hook keys on: `'email'` plus `client.identityNumber !== data.identityNumber` is the only combination that raises the D5 conflict. The hook state is:

```typescript
type IdentityConflict = {
	client: Client
	storedIdentityNumber: string
	typedIdentityNumber: string
	error?: string
} | null
```

Card visual: single boolean state, so no `STATUS_CONFIG` map (that pattern from `BusinessNovedadBadge.tsx` applies to multi-state enums). Converted card = `border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20` plus a secondary `Badge` rendered after the outcome-status badge, keeping the status badge dominant.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `resolveExistingClient`: active document hit → `'document'`; inactive client with matching **email** → never matched (D1); email single hit → `'email'`; email 2-match → `null`; no email → `null`; inactive document hit + `allowReactivation: true` → `'reactivated'` and `update({ active: true })` called (D7); same case with `allowReactivation: false` → `null` and NO update | Vitest + mocked `prisma`, asserting `active: true` on steps 1-2 and `active: false` on step 3 |
| Unit | D5 conflict: `'email'` + differing document raises `identityConflict`; `'email'` + equal document does not; `'document'`/`'reactivated'` never do | `use-business-form.test.tsx` |
| Unit | `ClientIdentityConflictAlert` renders stored + typed document, disables "Actualizar documento" for non-privileged roles with caption, surfaces the server error slot | `client-identity-conflict-alert.test.tsx` |
| Integration | D5 resume: "Mantener" → `updateClient` WITHOUT `identityNumber`, submit completes; "Actualizar" → `updateClient` WITH `identityNumber`, submit completes; privileged-role rejection from the server renders in the alert and does not create the business | Testing Library + mocked actions |
| Integration | D7 audit: reactivation emits `CLIENT_REACTIVATED` with actor/ip/userAgent | Mocked `logAuditEvent` |
| Unit | `isBlocked` / `isContractBlocked` matrix: leadId, privileged, edit mode, doc <5/≥5 | `use-business-form.test.tsx` |
| Integration | Submit with `leadId` + existing document → no `createClient`, `updateClient` called on change; no match → `createClient` as today; resolution error → falls through (D6) | Testing Library on the hook with mocked actions |
| Integration | `getLeadBoard` returns `idBusiness` with no extra query | Mocked prisma, assert single `findMany` |
| Unit | `LeadCard` renders badge + border only when `idBusiness !== null` | `lead-card.test.tsx` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The new Server Action is auth-guarded via `auth()` like every sibling action. Since D7 it is no longer read-only: it performs one narrow `update({ active: true })` reachable only after an authenticated submit, on an exact composite-key match, under `leadId`, and audited via `CLIENT_REACTIVATED`.

## Migration / Rollout

No migration required. No schema change, no new package, no feature flag. Two independently revertible PRs (A: negocios, B: leads).

**Rollback delta vs the proposal**: the proposal's rollback plan assumed Unit A added "one new read-only service; no new write path". D7 changes that — reverting Unit A after a reactivation has run leaves clients whose `active` flipped back to `true`. This is benign (it restores the default state of a field nothing currently reads or filters) and is fully traceable through the `CLIENT_REACTIVATED` audit entries, but it is persisted state the original plan did not anticipate.

**Line-budget impact**: Unit A grew from a hook change plus one service to a hook change, a service with three lookups and a write, an audited Server Action, a new presentational alert component, an interrupt/resume submit path, and an `AuditAction` enum value. Unit A alone is now a realistic candidate to exceed the 400-line review budget; `sdd-tasks` MUST forecast it and should plan Unit A as two chained slices — **A1** (gate centralization: D3/D4, mechanical, small) and **A2** (resolution + D5 alert + D7 reactivation) — with Unit B remaining a separate small PR.

## Post-Apply Addendum — Traceability for R1/R2/R3

The three items below were designed implicitly during `sdd-apply` (no dedicated design entry existed at the time) and are now retroactively spec'd in `specs/negocios/spec.md` and `specs/leads/spec.md`. Recorded here for traceability only — behavior already shipped, tested, and typechecked.

- **R1 — Agent lock to lead owner**: extends D2's scope (lead-conversion-only branching) one step further — once `leadId` resolves an owner, `useAgentPermissions` treats that owner as authoritative over `isAgentUser` self-assignment. Implemented as `isLeadOwnerLocked` in `use-agent-permissions.ts`, sourced via `mapLeadOwnerToAgentInfo` (new mapper) from `getLeadForConversion`'s `user` join, and rendered as a disabled `AgentAutocomplete` + caption in `coach-info-section.tsx`.
- **R2 — Ownerless-lead conversion block**: a defense-in-depth counterpart to D2/D7's `leadId`-gated writes — `getLeadForConversion` narrows its query with `idUser: { not: null }` (same "not found → blank form" fallback as an already-converted or out-of-scope lead), and `linkLeadToBusinessTx` throws if `idUser` is null at write time, mirroring its existing `idBusiness != null` guard.
- **R3 — Converted-lead indicator restyle**: superseded the Data Flow/Interfaces section's original "secondary Badge after the outcome-status badge" treatment (line 140 above) with an inline emerald star icon + tooltip next to the lead's name, moving the outcome-status badge to its own row. The `isConverted` boolean/border treatment is unchanged.

## Open Questions

- [x] **D5 interaction shape — confirmed during apply.** Implemented exactly as designed: the alert is non-modal but interrupts the submit until the user picks "Actualizar documento" or "Mantener el existente"; `resolveIdentityConflict(choice)` resumes the same submit from there. Verified by the D5 resume integration tests in `use-business-form.test.tsx` ("Mantener" completes without updating the document; "Actualizar" completes with it; a server rejection surfaces on `identityConflict.error` without creating the business). No revision requested — the "create immediately + after-the-fact correction" alternative was not adopted.
- Residual, explicitly deferred: the inactive-document dead end survives only in the manual (non-lead) path — see D1/D7. MUST NOT be addressed in this change.
