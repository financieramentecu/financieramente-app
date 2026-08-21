# Tasks: Lead → Business Conversion Friction Fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550-650 total (gates ~120, resolution/D5/D7/audit ~350-400, Kanban badge ~60) |
| 400-line budget risk | High — accepted by explicit user decision (single PR) |
| Chained PRs recommended | No (user rejected chaining) |
| Suggested split | Single PR, no chaining. Internal phase order preserved: gates → client resolution/D5/D7/audit → Kanban badge |
| Delivery strategy | single-pr |
| Chain strategy | size-exception (explicitly accepted by user — over-budget diff delivered as one PR) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

**Note**: consolidating all logical units into one PR pushes the diff clearly over the 400-line budget (previously mitigated by an A1/A2/B chain). This is a known, accepted risk per explicit user decision — not something for `sdd-apply` to resolve or re-litigate.

### Work Scope (single PR, no chaining)

| Segment | Goal | Focused test command | Runtime harness | Rollback boundary |
|---------|------|----------------------|-----------------|-------------------|
| Gates | Centralize `isBlocked`/`isContractBlocked` (D3/D4) | `npm run test:unit -- use-business-form` | Manual: form w/wo leadId, privileged/non-privileged, doc <5/>=5 | Revert hook + 2 components |
| Resolution | Client resolution (D1/D7) + D5 alert + interrupt/resume + audit | `npm run test:unit -- client-resolution resolve-existing-client identity-conflict` | Manual: convert lead by doc match, email match w/ doc conflict, no match, inactive-doc reactivation | Revert service/action/alert component + hook resolution call |
| Kanban | `idBusiness` badge/border | `npm run test:unit -- lead-board lead-card` | Manual: Kanban board shows badge+border on converted lead | Revert select field + type + card render |

Single `git revert` on the PR merge commit reverts all three segments together (no per-segment rollback needed once merged; the above boundaries describe pre-merge scoping only).

## Phase 1: Gate Centralization — `negocios`

### RED Tests
- [x] 1.1 Write failing unit tests in `use-business-form.test.ts` for `isBlocked` matrix: leadId present (always false), privileged role (false), edit mode (false), doc <5/>=5 (manual, non-privileged)
- [x] 1.2 Write failing unit tests for `isContractBlocked`: leadId present (false), edit mode (false), manual doc <5/>=5 regardless of privileged role

### GREEN Implementation
- [x] 1.3 In `use-business-form.ts` compute `isBlocked = !isEditMode && !isPrivilegedRole && !leadId && (!documentValue || documentValue.length < 5)` once, return from hook
- [x] 1.4 Compute `isContractBlocked = !isEditMode && !leadId && (!documentValue || documentValue.length < 5)`, return from hook

### Wiring / Cleanup
- [x] 1.5 `client-info-section.tsx`: remove local `isBlocked` derivation (line 57), accept `isBlocked` prop
- [x] 1.6 `business-form.tsx`: remove `documentValue` watch + local `isContractDisabled`, pass `isBlocked`/`isContractBlocked` from hook to children
- [x] 1.7 Run full `use-business-form` + `client-info-section` + `business-form` test suites, confirm no regression

## Phase 2: Client Resolution + D5 Alert + D7 Reactivation + Audit — `negocios`

### Foundation
- [x] 2.1 Add `AuditAction.CLIENT_REACTIVATED` to `src/features/auth/lib/audit-logger.ts`
- [x] 2.2 Define `ResolveClientCriteria`, `ClientResolutionSource`, `ClientResolution` types in `client-resolution.service.ts`

### Resolution Service (RED → GREEN)
- [x] 2.3 RED: tests for `resolveExistingClient` — active doc match → `'document'`; inactive doc + matching email never matches (D1)
- [x] 2.4 RED: tests — email single active match → `'email'`; 0 or 2+ email matches → `null`
- [x] 2.5 RED: tests — inactive doc + `allowReactivation:true` → `'reactivated'` + `update({active:true})`; `allowReactivation:false` → `null`, no write
- [x] 2.6 GREEN: implement `resolveExistingClient` in `src/features/negocios/services/client-resolution.service.ts` per the 4-step Data Flow (findFirst composite active:true → findMany email active:true take:2 → findFirst composite active:false+reactivate → null)

### Server Action (RED → GREEN)
- [x] 2.7 RED: test `resolve-existing-client.ts` returns `ApiResponse<ClientResolution|null>`, requires `auth()`, validates input via Zod
- [x] 2.8 RED: test reactivation path calls `logAuditEvent` with `CLIENT_REACTIVATED`, actor/ip/userAgent populated
- [x] 2.9 GREEN: implement `src/features/negocios/actions/resolve-existing-client.ts`

### Hook Interrupt/Resume (RED → GREEN)
- [x] 2.10 RED: test `handleFormSubmit` calls resolution only when `leadId` present (D2); resolution error falls through to `createClient` (D6)
- [x] 2.11 RED: test `source === 'email'` + differing `identityNumber` sets `identityConflict` state and stops submit before `createBusiness`
- [x] 2.12 RED: test `resolveIdentityConflict('update')` resumes via `updateClient` with new `identityNumber`; `resolveIdentityConflict('keep')` resumes without it
- [x] 2.13 RED: test `'document'`/`'reactivated'` sources never raise `identityConflict`, route straight through `setSelectedClient`
- [x] 2.14 GREEN: implement resolution call + `identityConflict` state + `resolveIdentityConflict(choice)` in `use-business-form.ts`

### Identity Conflict Alert (RED → GREEN)
- [x] 2.15 RED: test `ClientIdentityConflictAlert` renders stored vs typed document, two actions
- [x] 2.16 RED: test "Actualizar documento" disabled with caption when `!canRoleEditClientInfo`; server-error slot renders `error` prop
- [x] 2.17 GREEN: create `src/features/negocios/components/sections/client-identity-conflict-alert.tsx`
- [x] 2.18 Wire alert into `client-info-section.tsx`

### Integration
- [x] 2.19 Integration test: "Mantener" resumes submit, `updateClient` called without `identityNumber`
- [x] 2.20 Integration test: "Actualizar" resumes submit, `updateClient` called with `identityNumber`; privileged rejection error surfaces in alert, business not created
- [x] 2.21 Integration test: leadId + no match → `createClient` runs unchanged
- [x] 2.22 Verify no test/task addresses the manual-flow inactive-doc dead end (explicitly out of scope per D1/D7)

## Phase 3: Kanban `idBusiness` Indicator — `leads`

### Data (RED → GREEN)
- [x] 3.1 RED: test `getLeadBoard` select includes `idBusiness`, single query, non-converted lead → `null`
- [x] 3.2 GREEN: add `idBusiness: true` to `lead-board.service.ts` select + card mapping
- [x] 3.3 GREEN: add `idBusiness: number | null` to `LeadCard` in `lead-board.types.ts`

### Card UI (RED → GREEN)
- [x] 3.4 RED: test `LeadCard` renders "Negocio creado" badge + emerald border/background when `idBusiness !== null`; neither when `null`
- [x] 3.5 RED: test indicator persists when linked Business status is cancelled
- [x] 3.6 GREEN: implement `isConverted = idBusiness !== null` in `lead-card.tsx`, add secondary Badge after outcome-status badge + `border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20`

## Post-apply bugfix: "Crear nuevo" wiped prefilled lead data (RED → GREEN)

Found during manual verification: opening the lead-conversion form (prefilled name/email/phone from the lead, no `identityNumber`) and typing a document number that has no match triggered `ClientAutocomplete`'s "Crear nuevo cliente" path, whose `handleCreateNew` in `client-info-section.tsx` unconditionally wiped `email`/`name`/`lastNames`/`phone` — destroying the prefilled lead data on every lead conversion with a new document. `ClientAutocomplete` renders whenever `!isEditMode`, i.e. for every create-mode form including lead conversions, so this fired even though Phase 1 already unblocked the fields.

- [x] B.1 RED: `client-info-section.test.tsx` — "Crear nuevo" must NOT clear prefilled contact fields when `isLeadConversion` is true; must still clear them (unchanged) for the manual (non-lead) flow
- [x] B.2 GREEN: added `isLeadConversion?: boolean` prop to `ClientInfoSectionProps`; `handleCreateNew` only clears `email`/`name`/`lastNames`/`phone` when `!isLeadConversion`
- [x] B.3 Wired `isLeadConversion={Boolean(leadId)}` from `business-form.tsx` into `ClientInfoSection`
- [x] B.4 Regression: `npm run test:unit -- src/features/negocios` — 75 files / 681 tests passed

## Post-apply feature: default + lock Money Strategist to lead owner; require owner to convert (RED → GREEN)

User request during apply (out of the original spec/design scope; implemented directly, not re-run through sdd-propose/spec/design given the size and the explicit mid-turn direction):
1. When the lead being converted already has an owner (`Lead.idUser`), the business-creation form's `agent` (Money Strategist) field MUST default to that owner and stay locked (cannot be changed).
2. A lead with no owner MUST NOT be convertible to a business — neither via the UI entry point nor the underlying service/transaction.

### R2 — block conversion without an owner
- [x] R2.1 RED/GREEN `lead-detail-sheet.test.tsx` + `lead-detail-sheet.tsx`: "Convertir a negocio" renders as a disabled button + explanatory caption when `lead.idUser == null`; unchanged (active link) when an owner is present
- [x] R2.2 RED/GREEN `lead-conversion.service.test.ts` + `lead-conversion.service.ts`: `getLeadForConversion` adds `idUser: { not: null }` to the where clause (reuses the existing "not found → redirect to blank form" handling in `crear/page.tsx` for the no-owner case)
- [x] R2.3 RED/GREEN same files: `linkLeadToBusinessTx` throws (rolling back the transaction) when `current.idUser == null` — defense-in-depth against a direct `createBusiness({ idLead })` call bypassing the page-level gate

### R1 — default + lock agent to lead owner
- [x] R1.1 RED/GREEN `lead-conversion.service.test.ts` + `lead-conversion.service.ts`: `getLeadForConversion` now includes `user: { include: { role: true, category: true } }` in the same query (no N+1); return type renamed `LeadWithOwner`
- [x] R1.2 RED/GREEN `lead-owner-to-agent-info.test.ts` + new `src/features/leads/mappers/lead-owner-to-agent-info.ts`: `mapLeadOwnerToAgentInfo(user)` maps the joined owner to the existing `AgentInfo` shape
- [x] R1.3 RED/GREEN `use-agent-permissions-lead-owner.test.tsx` + `use-agent-permissions.ts`: new `leadId` option; `isLeadOwnerLocked = mode==='create' && leadId && businessAgent`; when locked, defaults `agent` to `businessAgent.id` (overriding the current-user-is-AGENTE self-assignment) and preloads `agentsList`; never locked in edit mode
- [x] R1.4 RED/GREEN `coach-info-section.test.tsx` + `coach-info-section.tsx`: new `isAgentLocked` prop disables `AgentAutocomplete` (`isBlocked || isAgentUser || isAgentLocked`) and renders an explanatory caption
- [x] R1.5 Wiring (no dedicated test — glue code): `use-business-form.ts` passes `leadId` into `useAgentPermissions` and returns `isLeadOwnerLocked`; `business-form.tsx` passes it to `CoachInfoSection` as `isAgentLocked`; `business-wrapper.tsx` accepts/forwards a new `businessAgent` prop; `crear/page.tsx` builds `businessAgent` via `mapLeadOwnerToAgentInfo(lead.user)` when present and passes it through
- [x] R1.6 Regression: full `npm run test:unit` — 376 files / 3336 tests passed (3 pre-existing skips), 0 failures; `npx tsc --noEmit` clean; `npx eslint` clean on all changed files

## Post-apply UI polish: converted-lead indicator as icon + tooltip (RED → GREEN)

User request: the "Negocio creado" text badge took too much horizontal space on the Kanban card. Replaced it with a compact star icon (emerald, next to the lead's name) that shows a "Negocio creado" tooltip on hover/focus — same `isConverted` condition, same distinct card border/background, less space consumed.

- [x] U.1 RED: `lead-card.test.tsx` updated — mocks `@/features/shared/ui/tooltip` (same pattern as `BusinessRowActions.test.tsx`) so `TooltipContent` renders unconditionally as `role="tooltip"`; asserts `getByLabelText('Negocio creado')`, a `svg.lucide-star`, and tooltip text content
- [x] U.2 GREEN: `lead-card.tsx` — replaced the secondary `Badge` with a `Star` (lucide-react) icon wrapped in `TooltipProvider`/`Tooltip`/`TooltipTrigger`/`TooltipContent` (self-contained provider — no ancestor `TooltipProvider` exists in the leads board tree); icon sits inline next to the truncated name, outcome-status `Badge` moved to its own row below
- [x] U.3 Regression: `npm run test:unit -- src/features/leads` — 22 files / 153 tests passed; `npx tsc --noEmit` clean; `npx eslint` clean
