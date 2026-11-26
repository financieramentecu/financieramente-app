Implementation and automated verification completed. Browser acceptance remains a QA validation step.

## 1. Infrastructure and contracts — backend owner
- [x] 1.1 Add nullable capture/referrer schema and additive migration without rewriting legacy rows.
- [x] 1.4 Verify generated Prisma and apply/inspect additive migration in the private disposable database.
- [x] 1.2 Implement capture catalogue services, validation, origin-equivalent admin permissions and active read routes; test inactive assignment/retention and unauthorized writes.
- [x] 1.3 Extend DTOs, native create, webhook/landing and CSV optional inputs without changing old envelopes/idempotency or guessing labels; test old inputs and retries.

## 2. Ownership and provenance — backend owner
- [x] 2.1 Share transactional component resolution/ownership enforcement across native creation, all ingestion, manual relation and reassignment; inspect every caller.
- [x] 2.2 Guard full affected write scope before writes; preserve all-contact OR matches across components, propagate explicit authorized native/trusted-ingress owners, inherit unique owner when incoming owner is absent/unmatched, reject unresolved conflicting owners, atomically audit explicit propagation.
- [x] 2.3 Add regressions for multi-hop groups, hidden-member denial/rollback, all ingestion paths, mixed/unowned owners and concurrent mutation.
- [x] 2.4 Aggregate scoped group timeline with source opportunity, actual actor/System and stable complete pagination; test interleaving, deduplication and invisible records.

## 3. Presentation — UI owner
- [x] 3.1 Add capture/referrer controls to native create and relevant detail, retaining Propio; integrate optional DTO fields and active options.
- [x] 3.2 Render one visible linked-person card with selectable distinct opportunities; align filters/counts, selected-stage/actions and sheet identity.
- [x] 3.3 Show separate source/referrer/capture and consolidated timeline provenance without inventing legacy values.
- [x] 3.4 Reuse origin administration/navigation patterns for capture name/level/active CRUD; cover validation, empty/loading/error states and inactive retention.
- [x] 3.5 Test grouped card selection, selected Lead mutations, timeline source/actor and admin controls; verify both captures remain active.

## 4. Verification — integration owner
- [x] 4.1 Run focused unit/integration tests, Prisma validation, type checking and lint; resolve actual failures.
- [x] 4.2 Exercise private-database native + old webhook/CSV + new capture ingress, authorized reassignment, unauthorized rollback, admin deactivation, grouped pipeline and complete timeline.
- [x] 4.3 Review every specification scenario and changed caller; verify no sessions/entitlement/supersession code, no hidden data leak and no QA/production writes.
- [x] 4.4 Record checks, remaining limitations and reviewable diff; no archive/version bump until implementation verification completes.

## Review evidence and remaining gates
- CSV focused suite: 57 tests passed across seven files; targeted lint passed.
- Landing focused suite: 25 tests passed before transactional origin-history refinement; follow-up form-service/admin suite: 18 tests passed including snapshot failure provenance ordering.
- Final evidence: 941 CRM unit/component tests across 144 files passed; mocked full-flow integration 5 tests passed; TypeScript, changed-file ESLint and Prisma validation passed. All 98 migrations deployed to disposable PostgreSQL 15; 8 real-service checks passed, including post-insert rollback and landing replay. Browser acceptance is left for QA and is not claimed as executed.
- Reviewer follow-ups resolved: manual relation/owner group conflicts return409, relation first-origin fill reads current row inside transaction, and board initial attribution uses one scoped batch across the full visible group while capture choices stay filtered.
