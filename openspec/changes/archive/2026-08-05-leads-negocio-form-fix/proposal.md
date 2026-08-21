# Proposal: Lead → Business Conversion Friction Fix

## Intent

The lead → business conversion is the revenue-critical hand-off between the CRM funnel and the settlement platform, and it fails today in two ways:

1. **Blocked prefilled form.** `/dashboard/negocios/crear?leadId=<id>` prefills contact data from the lead, but `isBlocked` is derived only from `identityNumber.length >= 5`. Many CRM leads have no `identityNumber`, so the user sees populated-but-disabled fields, cannot set `clientOrigin`/`agent`, and only discovers the problem when Zod rejects the submit after the whole form was filled. That gate exists for the *manual* "search existing client by document" flow, not for lead conversion.
2. **No conversion signal on the board.** The Kanban `LeadCard` projection omits `idBusiness` (only `LeadDetail` has it), so a user scanning the board cannot tell which leads already produced a business. This causes duplicate conversion attempts and manual detail-by-detail checking.

## Scope

### In Scope
- **Unit A (bugfix + client resolution)**:
  - A1 — the document-length gate MUST NOT apply for **any** lead conversion (`leadId` present), regardless of which lead fields were prefilled; prefilled client/coach fields stay editable.
  - A2 — remove the duplicated `isBlocked` / `isContractDisabled` derivations; `useBusinessForm` is the single source of truth.
  - A3 — **existing-client resolution before creation**: because the lead path skips the manual `ClientAutocomplete` search, the conversion submit MUST first resolve an existing `Client` and reuse it instead of calling `createClient`. A **new, dedicated resolution function** (new service under `src/features/negocios/services/`; no `client.service.ts` exists today) performs **exact** matching, never `contains`/fuzzy: (1) exact `identityNumber`, (2) if no match, exact `email`, (3) if neither matches, fall through to the current `createClient` path unchanged. Invoked from `use-business-form.ts` only when the submit carries `leadId`.
  - A4 — **silent reuse**: a resolved client is adopted without a confirmation modal, by routing it through the SAME path as a manually selected client (`setSelectedClient` / `handleClientSelected`), so the existing `hasChanges` → `updateClient` logic (`use-business-form.ts` ~246-275) syncs any differing name/email/phone from the lead. No new synchronization logic.
- **Unit B (feature)**: add `idBusiness` to the `LeadCard` projection (`getLeadBoard` `select` + type) and render **both** a "Negocio creado" badge and a distinct border/background on the Kanban card. A lead counts as converted whenever `idBusiness` is non-null, regardless of the linked `Business` current status (including cancelled).
- Colocated tests for both units.

### Out of Scope
- Changing `businessFormSchema` required fields (`identityNumber` stays required) or the manual (no-lead) search-by-document UX.
- Fuzzy/name-based client matching, a merge UI for near-duplicate clients, or extending `GET /api/clients/search` (its `where` is `identityNumber: { contains }` only — mixing email search into the manual document autocomplete would add false positives).
- **Recurring-client / cross-sell categorization (future work).** A resolved client that already owns other businesses is NOT a special case here: the model is 1 `Client` : N `Business` by design and a client buying a second product is normal. The business need to *identify clients sold an additional product* is real but deferred to a dedicated future change with its own rules. It is explicitly unrelated to the `CARTERA` / `EN_CARTERA` status, which is purely an overdue-payment/collections state (see `prisma/seeds/reset-future-payments-to-sin-fondear.ts`) with no recurring-client or differentiated-commission meaning.
- Backfilling `identityNumber` into leads from the CRM.
- Any board filter/sort by conversion state, click-through to the business, or drag/reorder.
- Reusing or altering `BusinessNovedadBadge` / `BusinessStatusBadge` (visual reference only).

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `negocios`: business creation form MUST NOT apply the document-length field gate when opened as a lead conversion, AND MUST resolve an existing client before creating one.
- `leads`: Kanban card MUST expose and display whether the lead already has an associated business.

## Approach

**Unit A** — compute a single `isBlocked` in `useBusinessForm` as `!isPrivilegedRole && !leadId && (document < 5 chars)` and pass it down; `ClientInfoSection` and `business-form.tsx` consume that prop instead of recomputing. In `handleFormSubmit`, before the `createClient` branch and only when `leadId` is present, call the new exact-match resolution service (identityNumber, then email); on a match feed it through `setSelectedClient` so the existing "update if changed" path handles field sync; on no match, the current create path runs untouched. This also removes today's dead end where `createClient` returns *"Ya existe un cliente con este número de identificación"* for a returning client.

**Unit B** — extend the Prisma `select` with `idBusiness` (same query, no extra cost) plus the `LeadCard` type, and render a `Badge` ("Negocio creado") together with a distinct card border/background in `lead-card.tsx`.

Unit A and Unit B remain logically separable design units (Unit A itself splits internally into gate centralization and client resolution/D5/D7/audit) and each is independently revertible in code, but delivery is a **single PR** — the user explicitly rejected chaining to avoid managing PR sequencing/branch strategy overhead. The single PR carries the full diff (gates → client resolution/D5/D7/audit → Kanban badge) in that implementation order; see `tasks.md` for the accepted line-budget risk.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/negocios/hooks/use-business-form.ts` | Modified | `isBlocked` accounts for `leadId`; calls client resolution before `createClient` |
| `src/features/negocios/services/` (new file) | New | Exact-match client resolution for lead conversions |
| `src/features/negocios/components/sections/client-info-section.tsx` | Modified | Consume `isBlocked` prop, drop local derivation |
| `src/features/negocios/components/business-form.tsx` | Modified | Drop duplicated `isContractDisabled` derivation |
| `src/features/leads/services/lead-board.service.ts` | Modified | Add `idBusiness` to `select` and card mapping |
| `src/features/leads/types/lead.types.ts` | Modified | `LeadCard.idBusiness: number \| null` |
| `src/features/leads/components/lead-card.tsx` | Modified | Converted-lead visual treatment |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Silent reuse attaches the business to the WRONG existing client (shared/stale lead email, recycled document) | Med | Exact matching only, `identityNumber` before `email`; no fuzzy/name matching; resolved client's data is shown in the form fields the user still reviews before saving |
| Resolution adds a failure mode to the submit path | Med | On resolution error, fall through to the current create-then-error behavior; never block the submit silently |
| Silent reuse overwrites good stored client data with stale lead data via `hasChanges` → `updateClient` | Med | Reuses the exact behavior already accepted in the manual selection flow — no new sync semantics introduced by this change |
| A prefilled lead without `identityNumber` still fails Zod at submit | Med | Keep `identityNumber` required and visibly marked; only the *blocking* changes, not the requirement |
| Centralizing `isBlocked` changes behavior in edit mode or for privileged roles | Med | Preserve `isEditMode` / `isPrivilegedRole` semantics; cover with hook + section tests |
| Board card visual conflicts with the existing outcome-status badge | Low | Reuse shadcn `Badge` patterns; keep the converted signal secondary to the status badge |

## Rollback Plan

Delivered as a single PR; `git revert` on the merge commit reverts all units together. Unit A changes client-side derivation plus a client-resolution service/action that also performs a narrow `active:true` reactivation write (D7) — no schema change, and reverting restores the previous create-or-error behavior; businesses already linked to a reused client remain valid data (1 `Client` : N `Business` is a supported shape), and clients reactivated by D7 stay `active: true` after a revert (benign, traceable via `CLIENT_REACTIVATED` audit entries). Unit B adds one Prisma `select` field and one optional type property — no migration, no persisted state to unwind. Because both units land in one PR, a *partial* rollback (Unit A only or Unit B only) would require a manual follow-up commit rather than a single `git revert`.

## Dependencies

- None. No Prisma schema change, no migration, no new package.

## Success Criteria

- [x] Opening `/dashboard/negocios/crear?leadId=<id>` for a lead **without** `identityNumber` leaves name/lastNames/email/phone/clientOrigin/agent editable. Verified by `isBlocked`/`isContractBlocked` D3/D4 matrix tests (`use-business-form.test.tsx`) and by the post-apply bugfix (B.1-B.4) that stopped `ClientAutocomplete`'s "Crear nuevo" path from wiping those fields on a lead conversion.
- [x] The same conversion can be submitted successfully without re-typing prefilled contact data. Verified by the D2/D5/D6/D7 submit-flow integration tests and the B.1-B.4 bugfix.
- [x] Manual creation (no `leadId`) still blocks those fields until 5+ document characters. Verified by the `isBlocked`/`isContractBlocked` matrix (manual, non-privileged cases) and by `client-info-section.test.tsx`'s manual-flow regression test.
- [x] `isBlocked` is derived in exactly one place (`use-business-form.ts`) — `client-info-section.tsx` and `business-form.tsx` consume the prop, no local derivation remains.
- [x] Converting a lead whose exact document (or exact email) already belongs to a `Client` reuses that client silently instead of creating a duplicate or failing with "Ya existe un cliente...". Verified by `client-resolution.service.test.ts` (D1/D5) and the hook integration tests.
- [x] Differing lead contact data on a reused client is synced through the existing `hasChanges` → `updateClient` path. Verified by `finishCreateSubmit`'s hasChanges tests and the D5 resume integration tests.
- [x] Converting a lead with no exact match still creates a client exactly as today. Verified by the D6 fallback tests.
- [x] A reused client that already has other businesses is accepted with no special handling or blocking — no such check was added; 1 `Client` : N `Business` remains unrestricted by design.
- [x] `GET /api/leads` board payload includes `idBusiness` per card with no additional query. Verified by `lead-board.service.test.ts`'s single-query assertion.
- [x] A converted lead shows a distinct visual indicator (originally a "Negocio creado" badge; superseded post-apply by a star icon + tooltip per explicit user request for a more compact card — see `tasks.md` "Post-apply UI polish") and the distinct card border/background, for any non-null `idBusiness`. Verified by `lead-card.test.tsx`.

**Post-apply additions beyond this proposal's original scope** (implemented per explicit mid-turn user direction, tracked in `tasks.md`, not re-run through `sdd-propose`/`sdd-spec`/`sdd-design` given size — flagged here for spec/design reconciliation if this change is formalized further):
- Money Strategist (`agent`) field defaults to and locks on the lead's owner when one is assigned (R1).
- A lead with no owner cannot be converted to a business, at the UI, service, and transaction layers (R2) — and confirmed by construction that this is reachable only by hierarchy-bypass/administrative roles (`ADMIN`, `ASISTENTE_GERENCIA_OPERATIVA`, `ANALISTA_SOPORTE`), since non-bypass roles never see ownerless leads at all (`buildLeadListWhere`).
- Converted-lead indicator redesigned from a text badge to a compact icon + tooltip.
