# Proposal: Partner Profile (COM-41)

## Intent

External partners (any email domain) must register and manage their own businesses without SSO, without joining commission distribution, and without seeing anyone else's data. Today only SSO agents exist, and several negocios sub-routes fail open for non-AGENTE roles. An external user must not inherit those gaps.

## Scope

### In Scope

- Role `PARTNER`, level `PARTNER_EXTERNAL` ("Partner Externo", OVERRIDE, outside the LEVEL_0..GENERAL_LEVEL chain), and category "Partner Externo" (MIA). LEVEL_5 stays as it is.
- Admin > Partners: list, create (leader is required and limited to LEVEL_1..5), deactivate/reactivate, resend activation. The users module cannot change a partner's role, level, or leader, and does not send its generic activation email to partners.
- `User.activatedAt` and a hashed single-use token table. Activation links last 72h and a resend invalidates the earlier link. Reset links last 1h, are rate limited, return generic responses, and are available to every email/password user (never to SSO-only accounts). Password rule: at least 8 characters, with letters and numbers.
- Login requires `active && activatedAt`. Every request checks this again, so deactivation takes effect immediately.
- The partner can create, list, export, edit (agent rules), comment on, mark novedad on, and attach comprobantes to their own businesses only. The partner cannot cancel. The dashboard has no hierarchy sidebar. The menu shows only Dashboard and Mis negocios.
- Security hardening: a central business-access helper covers every negocios sub-route and `createBusiness`. PARTNER gets a deny-by-default allowlist in Edge `authorized`, and the middleware matcher now includes `/api`.
- Businesses whose PPC level is `PARTNER_EXTERNAL` are excluded from pre-liquidation and distribution. Files do not stay stuck in SYNCHRONIZED.
- Seeds plus `prisma:seed:partner`, the remediate run, the migration, the ERD, AuditActions, and a minor changeset.

### Out of Scope

- Partner commission calculation (COM-49). Blocking rule edits (COM-50).
- Partner access to Liquidaciones, Reportes, or Calculadora.
- Narrowing client search for partners. This is an **accepted risk**: search stays the same as for agents.

## Capabilities

### New Capabilities

- `partner-management`: admin partner lifecycle and leader rules.
- `account-activation`: activation and password-reset tokens, activation and forgot pages.
- `partner-access`: PARTNER allowlist, own-business scope, menu, dashboard.

### Modified Capabilities

- `security`: per-request session revalidation and the central business-access helper.
- `negocios`: ownership enforced on PUT, payments, annual-payments, edit page, and mark-novedad. Creating as PARTNER forces `idUser` to the session user.
- `contract-comments`, `business-supports`: an ownership guard. Partners get agent-equivalent notifications.
- `admin`: users-module guards for PARTNER.
- `levels`, `seed-pipeline`: PARTNER_EXTERNAL plus a configuration for each product.
- `pre-liquidacion`: partner exclusion.
- `navigation`, `production-dashboard`: the partner menu, the empty-tree path, and a separate "Partners" block at the end of the leader's heatmap.

## Approach

Build in this order: (1) the foundation and security hardening, (2) auth and tokens, (3) the Partners module, (4) exclusion and UI parity. Branch on role/level constants and the `validateRoleLevelPair` extension point. Tokens use `randomBytes(32)` and store only a SHA-256 hash, consumed atomically with `updateMany`. Design decides two things: where the exclusion happens (the load stage or the procesar step) and how sessions are revalidated.

## Affected Areas

| Area                                                                                          | Impact       |
| --------------------------------------------------------------------------------------------- | ------------ |
| `prisma/schema.prisma`, migrations, `prisma/ERD.md`, `prisma/seeds/{roles,level,category}.ts` | Modified/New |
| `src/middleware.ts`, `src/lib/auth/{auth.config,config}.ts`, `features/auth`                  | Modified     |
| `src/app/api/negocios/**`, `features/negocios/{actions,services,hooks,components}`            | Modified     |
| `features/admin` (new partners module), `api/admin/users/[id]`                                | New/Modified |
| `features/email`, new activation/forgot pages                                                 | New          |
| `features/pre-liquidacion` services                                                           | Modified     |
| `lib/navigation`, `production-dashboard`, `shared/services/agent.service.ts`                  | Modified     |

## Risks

| Risk                                                               | Likelihood | Mitigation                                                 |
| ------------------------------------------------------------------ | ---------- | ---------------------------------------------------------- |
| Agents lose access they rely on today (hardening changes behavior) | Med        | Release notes and tests for each route                     |
| The `/api` matcher affects every route                             | Med        | The allowlist applies only to PARTNER; regression tests    |
| Business creation fails because a product has no partner PPC       | Med        | Deploy checklist plus a test covering every active product |
| The in-memory rate limiter does not work across instances          | Med        | Documented; design chooses where it is stored              |
| Accepted risk: client PII is visible through search                | Accepted   | Product-owner decision, recorded                           |

## Rollback Plan

Revert the PR. The migration only adds things: drop the token table and `activatedAt`, then restore with a down migration. Deactivate partner users (`active=false`). The PARTNER_EXTERNAL level and configurations stay inert. No existing data is rewritten.

## Dependencies

- SendGrid and NEXTAUTH_URL.
- The remediate script runs after the seed.

## Success Criteria

- [ ] A partner activates, logs in, and manages only their own businesses. Every other route returns 403.
- [ ] A deactivated partner loses access on the next request.
- [ ] Partner businesses do not appear in distribution, and files reach PRE-SETTLED/SETTLED.
- [ ] Ownership tests pass for every negocios sub-route, for both agents and partners.
- [ ] Every active product has a PARTNER_EXTERNAL configuration and PPC.

## Proposal question round (confirmed by product owner, 2026-10-10)

1. **Heatmap:** leaders see their partners in a **separate "Partners" block at the end of the heatmap**, below the agent rows (one row per partner under the leader's subtree). Partners are not mixed into the agent rows. The partner still hangs under the leader in the hierarchy tree and the agent filter.
2. **Forgot password:** applies to **every user who signs in with email and password** (admins, agents with a password, partners). Users who sign in with Google are unchanged: the flow is not offered to them and never creates a password for an SSO-only account.
3. **"Ver como":** allowed for any partner enabled by the admin (`active = true`), **including partners pending activation**. It stays blocked for deactivated partners, as for any other user.
