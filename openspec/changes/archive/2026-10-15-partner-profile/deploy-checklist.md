# Deploy checklist: partner-profile (COM-41)

Run top to bottom. Do not continue past a failed step; see "Rollback".

## 1. Before deploying

1. Back up the production database (snapshot or `pg_dump`). Record the snapshot id here: **\_\_**.
2. Confirm environment variables on the target environment:
   - `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`, `SENDGRID_TEMPLATE_ID`: activation and reset mails are sent through SendGrid. A missing key does not break account creation (the API returns `emailSent: false` and the admin can resend), but no mail leaves.
   - `NEXTAUTH_URL`: must be the public base URL. It is used to build `/activate-account?token=...` and `/reset-password?token=...` links. A wrong value produces dead links.
   - `NEXTAUTH_SECRET`: unchanged. Existing sessions rely on it.
   - `E2E_TEST_AUTH_TOKEN` must NOT be set in production.
3. Confirm the deploy target is the intended branch/commit (`COM-41` merged into `develop`).

## 2. Database migration

1. `npx prisma migrate deploy` (migration `20261010150000_partner_profile`; additive: `user.activated_at`, `account_token`, enum values).
2. Verify the `activated_at` backfill. Expected result: `0` rows.

   ```sql
   SELECT COUNT(*) FROM "user"
   WHERE active = true AND activated_at IS NULL;
   ```

   Pass criteria: 0 before any partner is created. After creating partners, the only active users with `activated_at IS NULL` are partners pending activation.

3. Verify `account_token` exists and is empty: `SELECT COUNT(*) FROM account_token;` returns 0.

## 3. Seed (run it TWICE)

1. `npm run prisma:seed:partner` (first run). Expected: exit code 0 and a line `Configuraciones Partner: N creadas, M omitidas.` with N > 0 on a fresh database.
2. `npm run prisma:seed:partner` (second run). Expected: exit code 0 and `0 creadas` (idempotent), no duplicate role `PARTNER`, level `PARTNER_EXTERNAL` or category "Partner Externo":

   ```sql
   SELECT code, COUNT(*) FROM role  WHERE code = 'PARTNER' GROUP BY code;           -- 1 row, count 1
   SELECT code, COUNT(*) FROM level WHERE code = 'PARTNER_EXTERNAL' GROUP BY code; -- 1 row, count 1
   ```

3. Meaning of failures (the CLI sets a non-zero exit code):
   - `Cobertura Partner incompleta. Productos sin PPC: ...` (coverage gate): at least one active product has no `PARTNER_EXTERNAL` configuration. Nothing unrelated was written. Read the `Problemas:` part of the message.
   - `CODE_TOO_LONG` in the problems list: the generated product-configuration code for that product overflows `ProductConfiguration.code` because `PARTNER_EXTERNAL` is 9 characters longer than `LEVEL_n`. Resolve by either (a) widening the column (new migration, then re-run the seed) or (b) shortening the level segment used in the generated code. This is Open Question 1 of the design and needs a product/tech decision; do NOT deploy the app until the gate passes, because creating a partner or a partner business would fail with "missing configuration".
   - Reference data missing (role, level or category) when creating a partner: the seed was not run; the API answers 500 with a hint to run `npm run prisma:seed:partner`.

## 4. Deploy the application

1. Deploy the build. Watch startup logs for Prisma or auth errors.
2. Smoke test: `GET /api/health` answers 200 unauthenticated.

## 5. QA matrix (each row needs an explicit PASS)

| #   | Scenario                                        | Pass criteria                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Partner create, email, activate, login          | Admin creates a partner in Administración → Partners; row shows "Pendiente"; mail arrives with a link to `/activate-account`; setting a valid password shows "Cuenta activada"; login with email + password lands on `/dashboard`; the link cannot be reused (second visit shows the invalid-link state)                                                                                                   |
| 2   | Forgot / reset: admin                           | "¿Olvidaste tu contraseña?" with an admin email returns the generic confirmation; mail arrives (valid 1 hour); new password works; old password rejected                                                                                                                                                                                                                                                   |
| 3   | Forgot / reset: agent with password             | Same as row 2 for an agent that has a password                                                                                                                                                                                                                                                                                                                                                             |
| 4   | Forgot / reset: partner                         | Same as row 2 for an activated partner                                                                                                                                                                                                                                                                                                                                                                     |
| 5   | SSO user not offered a password                 | Google-only (SSO) user submitting the forgot form gets the same generic confirmation and NO mail; the response is byte-identical to the unknown-email case                                                                                                                                                                                                                                                 |
| 6   | Deactivate ends session                         | With a partner logged in, admin deactivates; the partner's next navigation or API call redirects to `/login` (or 401/403); re-login is rejected                                                                                                                                                                                                                                                            |
| 7   | Reactivate and resend                           | Reactivate restores access (activated partner keeps password); a pending partner stays "Pendiente"; "Reenviar activación" delivers a new link and invalidates the previous one                                                                                                                                                                                                                             |
| 8   | Partner business flow                           | Partner creates a business (owner is always the partner, PPC from `PARTNER_EXTERNAL`); edits it; changes origin while `EMITIDO` (no recalculation); exports the list (own businesses only); posts a comment and support users (ANALISTA_SOPORTE) are notified; uploads and deletes a comprobante                                                                                                           |
| 9   | Partner denied                                  | As partner: `/dashboard/admin/users`, `/dashboard/admin/partners`, `/dashboard/calculadora`, `/dashboard/liquidaciones`, `/dashboard/reportes` redirect away; `GET /api/admin/users`, `/api/admin/partners`, `/api/liquidaciones*`, reports APIs answer 403; menu shows only Dashboard and Mis negocios                                                                                                    |
| 10  | Agent regression                                | Agent opens own and subordinates' businesses and their comments/comprobantes/payments (200); a foreign business id answers 404 on comments, comprobantes and payments; admin/analyst/consultor behavior unchanged                                                                                                                                                                                          |
| 11  | Leader view                                     | The leader of the partner sees the partner's business in the list and the "Partners" block in the dashboard heatmap; column totals include partners                                                                                                                                                                                                                                                        |
| 12  | Pre-liquidation                                 | A mixed file (partner + agent contracts) pre-liquidates with partner rows `EXCLUDED` and agents distributed normally; a partner-only file reaches `SETTLED` (procesar → liquidar-archivo → notificar completes)                                                                                                                                                                                            |
| 13  | Large upload and SSE through the `/api` matcher | A large carga-archivos upload (same size class as production files) still succeeds; `/api/notifications/stream` (SSE) connects and receives events                                                                                                                                                                                                                                                         |
| 14  | Existing session survives                       | An agent with a Google session opened BEFORE the deploy stays logged in after it (no forced logout)                                                                                                                                                                                                                                                                                                        |
| 15  | "Ver como"                                      | Admin impersonates a pending partner and an active partner; the pending one is allowed, the banner to exit works, and a deactivated partner cannot be impersonated                                                                                                                                                                                                                                         |
| 16  | Audit                                           | `audit_log` has `PARTNER_CREATED`, `ACCOUNT_ACTIVATED`, `PASSWORD_RESET_REQUESTED/COMPLETED`, `PARTNER_DEACTIVATED/REACTIVATED/ACTIVATION_RESENT/UPDATED` rows for the actions above, `SETTLEMENT_EXCLUDED` (one aggregated event per loaded batch / pre-liquidated file, with the excluded count) and `FILE_IMPORT_EXCLUDED_ONLY_CLOSED` for partner-only files, without tokens or passwords in `details` |
| 17  | Consultor reads any business                    | As CONSULTOR: opening `/dashboard/negocios/{id}` of ANY business (own team or not) shows the detail in read-only mode, the same scope as the list; `/dashboard/negocios/editar/{id}` answers not found; write routes (PUT, comments POST, comprobantes POST/DELETE) still answer 403                                                                                                                       |
| 18  | Users without a valid role                      | A user whose role is DEFAULT or unknown gets 403 on `/api/negocios/{id}`, comments, comprobantes, payments and annual-payments, 403 ("Sin permisos") on the calculator actions, and an empty business list and stats (no data; the export is refused by its own gate); admin and agent behavior is unchanged                                                                                               |

### 5b. Additional QA after the review remediation (2026-10-11)

| #   | Check                           | Pass criteria                                                                                                                                                                                                                    |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Session cookie behind nginx TLS | Session cookie is `__Secure-authjs.session-token`; a PARTNER calling a denied `/api` route (e.g. `/api/admin/users`) gets 403; an agent session keeps working                                                                    |
| R2  | No cookie churn on `/api`       | Responses of `/api/negocios`, `/api/notifications/stream` (SSE) and a large `carga-archivos` upload carry NO `Set-Cookie`                                                                                                        |
| R3  | Auth flows on `/api/auth/*`     | Google sign-in, credentials sign-in, session refresh and "Ver como" start/stop work                                                                                                                                              |
| R4  | One session read per page       | A dashboard page render issues a single session revalidation query                                                                                                                                                               |
| R5  | Login throttling                | After 10 failed attempts for one email within 15 minutes the login shows "Demasiados intentos. Intenta de nuevo más tarde." for existing and non-existing emails alike                                                           |
| R6  | Trusted IP                      | A request sending a forged `X-Forwarded-For` first hop is rate limited and audited with the real client IP (nginx must keep `X-Real-IP $remote_addr`)                                                                            |
| R7  | Activation / reset links        | The page validates the link on the server; the token disappears from the address bar after load; submitting the form still works; refreshing the page afterwards shows the invalid-link screen (the user reopens the email link) |
| R8  | `callbackUrl`                   | `/login?callbackUrl=https://example.org` lands on `/dashboard` after login; `/login?callbackUrl=/dashboard/negocios` is honored                                                                                                  |
| R9  | Edge bundle                     | `next build` succeeds (not run during development: needs environment secrets)                                                                                                                                                    |

## 6. Rollback

1. Revert/redeploy the previous release.
2. Disable partner access immediately by setting partners inactive: `UPDATE "user" SET active = false WHERE id_role = (SELECT id_role FROM role WHERE code = 'PARTNER');` (the old code never looks at partners, but they must not be able to log in on the old build).
3. Optional down migration (only if required): drop `account_token` and `user.activated_at`. Role, level, category and product configurations stay inert and can remain.
4. `SettlementCommission` rows with status `EXCLUDED` are ignored by the previous code's status filters; no data fix is needed.
5. Restore the backup only if the migration itself failed midway.

## Known limitations / accepted risks

- Login throttling is per email: 10 failed attempts within 15 minutes from any IP temporarily block password login for that email (accepted brute-force trade-off; state is in-process, per instance).
- If the Edge middleware cannot decode the session cookie it treats the request as unauthenticated and lets the route authenticate itself; verify R1 after every proxy/TLS change.

- The client search and the rezagos autocomplete (`/api/pre-liquidacion/rezagos/autocomplete`) are open to partners by product decision; a partner can see other users' lagged contracts.
- The rate limiter for activation / reset / forgot endpoints is in-process, so limits apply per instance (not global across replicas).
- `liquidaciones` server actions are still readable by agents and the consultor role (only PARTNER and unknown roles are blocked); narrowing is a product decision (`TODO(partner-profile)` in code).
- Dashboard routes `kpis`, `by-status`, `by-company`, `by-origin` and `ms-chart` still trust client-supplied `userIds` for non-partner roles; PARTNER sessions are pinned to their own id.
- `GET /api/categories` has no session check (pre-existing; it is also allowlisted for partners).
- Session revalidation is fail-open on database errors: a DB blip keeps the current token instead of logging everyone out.
- `GET /api/negocios/validate-contract` returns `existingBusinessId` of foreign businesses to any role (pre-existing).
- `/api/email/send` has no authentication (pre-existing, out of scope).
- A partner can query product-percentage-commission ids directly through `find-product-percentage-commission` (login only, needed for create/edit).
- The "Excluidos (partners)" indicator in the available-files list is not implemented (follow-up).

## Release note for agents (Spanish)

> A partir de esta versión, cada agente solo puede ver y modificar los comentarios, soportes de pago y pagos de los negocios propios y de los de sus subordinados. Si abres un negocio que no pertenece a tu equipo, el sistema responderá que no existe. Además, el formulario de correo y contraseña ahora aparece siempre en el inicio de sesión, y puedes recuperar tu contraseña con "¿Olvidaste tu contraseña?" si tu cuenta tiene contraseña. Si desactivan tu usuario, tu sesión se cerrará en la siguiente acción que hagas.
