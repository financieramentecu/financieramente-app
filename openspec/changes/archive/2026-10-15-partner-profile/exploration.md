# Exploration: partner-profile (COM-41)

> Source of truth for product decisions: Kaneo task COM-41. Engram mirror: `sdd/partner-profile/explore`.

## Verified findings (file:line)

### Ownership and access

- **CRITICAL — non-AGENTE roles get no owner filter** (PARTNER would inherit):
  - `src/app/api/negocios/[id]/route.ts:208-216` (PUT; GET at `:88-100` is safe, hierarchical scope)
  - `src/app/api/negocios/[id]/payments/route.ts:52-54`
  - `src/app/api/negocios/[id]/annual-payments/route.ts:52-54`
  - `src/features/negocios/services/business-get-by-id.server.ts:15-18` (edit page loader)
  - `src/app/api/negocios/[id]/comprobantes/[supportId]/route.ts:79-85` (`visibleUserIds` only for AGENTE)
  - `src/app/api/negocios/[id]/mark-novedad/route.ts:106-115` (MARK has no ownership; UNMARK checks `idUser === self`)
- **No ownership at all, even for agents today:** comments GET/POST (`comments/route.ts`, `comments.service.ts`) and comprobantes list/presign/persist (`business-supports.service.ts`); only `isReadOnlyRole` guard.
- **`createBusiness`** (`src/features/negocios/actions/create-business.ts:64-116`): `idUser` comes from client input; only `requireWriteAccess`. Must force `idUser === session user` for PARTNER.
- **`src/app/api/clients/search/route.ts`**: any authenticated user can search all clients by identity number (>= 3 chars) and get email/phone/address. PII exposure for external users.
- Already safe (allowlist): `cancel/route.ts:35-39`, `manage-novedad:33`, fondear/aportes/date-anchored (`canFundPayments`), list/export/stats (`resolveVisibleUserIds`).
- Export gated by `canExportBusinessList` (`src/features/negocios/lib/can-export-business-list.ts:11`); add the partner level code.

### Route protection and sessions

- `src/middleware.ts:33-35` matcher covers only `/dashboard/*`, `/api/protected/*`, `/api/auth/*`. ~100 `/api/*` routes do their own `auth()`; ~35 have role guards.
- `authConfigEdge.authorized` (`src/lib/auth/auth.config.ts:45-71`) only blocks DEFAULT. Menu restriction is not enforced server-side.
- JWT sessions last 30 days (`src/lib/auth/config.ts:354-357`); role/active validated only at sign-in. Deactivation/password reset do not end live sessions.
- No login rate limit or lockout.

### Login

- `validateUserCredentials` (`src/features/auth/lib/user-validation.ts:118-252`): ADMIN/AGENTE only (`:169`), requires `ssoOnly = false` (`:184`); `validateUserByEmail` ignores activation.
- `src/app/login/page.tsx:63` client corporate-domain check; `src/lib/auth/config.ts:103` OAuth domain check stays.
- `validatePasswordStrength` (`password-utils.ts:84`) requires lower + UPPER + digit + 8; spec says letters + numbers, min 8.

### Admin users module

- No create-user endpoint today; users are only auto-created via SSO (`createUserAutomatically`, inactive, AGENTE).
- `api/admin/users/[id]` PUT sends the generic "account activated" email when `active` toggles (`:386-412`).
- Leader validation (`:306-331`) does not reject a PARTNER-role leader. `validateRoleLevelPair` (`user-role-level-rules.ts`) is the extension point.

### Naming collision (blocker)

- `prisma/seeds/level.ts` maps `oldCode: 'PARTNER'` → `LEVEL_5` named "Partner"; `seedLevels` Pass 1 finds by `oldCode` first and renames. A new level coded `PARTNER` would be renamed to `LEVEL_5` on any rerun.
- `prisma/seeds/category.ts:35` already has category "Partner" (MIA) for LEVEL_5 leaders.

### Commission and pre-liquidation

- `createStructuralProductConfiguration` (`product-configuration.service.ts:162-200`) creates config + PPC and marks it as new-businesses default; default distribution lines only for LEVEL_0..LEVEL_5.
- `create-product.service.ts:108-145` and `remediate-base-configurations.service.ts:51-55` iterate all active levels → a partner level automatically gets an empty-PPC configuration per product.
- Product configuration code limit 50 chars (`base-product-configurations.ts:143`).
- `getPpcForNewBusinesses` (`negocios/services/product-configuration.service.ts:30-67`) throws without configuration → seeds must run first.
- Pre-liquidation: empty PPC skipped at `pre-liquidacion.service.ts:1663-1668`; counters `:915-944`, `:1785-1789`; rezagar throws `:1469`; cambio-origen throws `:1938-1942`; detail listings `:306-335`, `:574`; never reaches LIQUIDADO (`:889-905`).
- Earliest exclusion point: load processors (`poliza.processor.ts:58-218`, `voluntaria.processor.ts`) via `findBusinessByContract`.

### Hierarchy

- `getSubordinateUserIds` / `resolveViewerScope` walk `idUserLeader` over active users → leader and superiors already see partner businesses.
- `buildHierarchyTree` includes users with a level → partners appear in leaders' trees/heatmap.
- `listActiveAgents` (`shared/services/agent.service.ts:22,41`) filters role AGENTE.

### Literals needing PARTNER handling

- LEVEL_0: `hierarchy-tree/route.ts:15,37`, `agent.service.ts:14,52`, `api/agents/route.ts`, calculadora (`calculate-commission.ts:84`, `calculadora/page.tsx`).
- AGENTE UI branches: `use-business-form.ts:165`, `use-agent-permissions.ts:72`, `BusinessTable/ActionCell.tsx:105`, `BusinessTableSection.tsx:790-799`, `CommentItem.tsx:15`, `MisNegociosPage.tsx`, `comments.service.ts:29`, `use-leaders.ts:54,85`, `user-actions-card.tsx:106-137`.
- `Record<UserRole, …>`: `roles.ts:19,31`, `permissions.ts:38`; switch in `default-date-filter.ts:56`; menu `menu-builder.ts:25`.

### Email, tokens, audit

- SendGrid via `features/email/lib/email-service.ts`; `email-template-base.ts`; base URL from `NEXTAUTH_URL` / `NEXT_PUBLIC_API_URL`.
- No reset-token model. Only rate limiter: in-process Map (`features/leads/lib/rate-limiter.ts`).
- New `AuditAction` values in `audit-logger.ts:6`.

## Approaches

| Approach                                                                                                                                   | Pros                                         | Cons                                                    | Effort      |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------- | ----------- |
| Per-route PARTNER checks                                                                                                                   | Smallest diff per file                       | Repeats fall-through bug class; misses unguarded routes | Medium      |
| **Central access helper + Edge allowlist (recommended)**                                                                                   | Closes existing agent gaps; defense in depth | More files; `/api` matcher change needs care            | Medium-High |
| Exclusion at load stage (recommended) + defensive pre-liq filter                                                                           | Records never enter the distribution flow    | Needs skip/status semantics                             | Medium      |
| Token: `randomBytes(32)`, SHA-256 hash, atomic `updateMany` consume, invalidate on resend/deactivate, generic forgot responses, rate limit | Standard, safe                               | New table                                               | Medium      |

## Size estimate (changed lines, prod / tests)

| Area                                                                                  | Prod | Tests |
| ------------------------------------------------------------------------------------- | ---- | ----- |
| Foundation (schema, migration, ERD, seeds, role, level, permissions, menu, allowlist) | ~300 | ~300  |
| Ownership hardening                                                                   | ~200 | ~350  |
| Auth                                                                                  | ~100 | ~150  |
| Tokens, email, public pages/routes                                                    | ~450 | ~400  |
| Admin Partners module                                                                 | ~550 | ~400  |
| Pre-liquidation exclusion                                                             | ~100 | ~150  |
| UI parity                                                                             | ~150 | ~150  |
| Changeset/docs                                                                        | ~40  | —     |

Total ≈ 3.5–3.8k lines; a single 800-line PR is not viable.

## Risks

Level/category naming collision; privilege escalation via non-AGENTE fall-through; no ownership on comments/comprobantes; JWT not revoked on deactivate/reset; no brute-force protection; client PII search; pre-liquidation files stuck SYNCHRONIZED; business creation fails without seeds; config code length; generic activation email on toggle; stricter password policy in code; in-memory rate limiter; `/api` matcher change; Edge runtime cannot use Prisma.

## Open questions

- Q1 Final codes/names for the external-partner level and category (LEVEL_5 is already "Partner").
- Q2 Should partners appear in leaders' hierarchy tree / heatmap / agent filter?
- Q3 Password policy: code's upper+lower+digit or spec's letters+numbers?
- Q4 Session revocation: per-request DB check or session version?
- Q5 Partner client search scope.
- Q6 Exclusion semantics: skip at load (new status) vs. filter in pre-liquidation.
- Q7 Delivery: chained PRs vs. single PR (preflight: single-pr, 800 lines).
- Q8 Admin impersonation ("Ver como") of partners.
- Q9 Admin editing partners through the existing users module.
- Q10 Rate-limit storage (in-memory vs. Postgres).
