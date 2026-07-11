# Proposal: Comentarios y notificaciones en tiempo real para contratos

## Intent

Money Strategists (`AGENTE`) and Support Analysts (`ANALISTA_SOPORTE`) currently have no in-app channel to discuss a specific contract. Coordination happens out-of-band (chat/email), losing traceability and context. This change adds a per-contract comment thread with role-aware real-time notifications so both roles can communicate on the business record itself, with a full audit trail.

## Scope

### In Scope
- New `Comment` model (per-contract, author, title, detail, timestamps, soft-delete).
- Create-comment modal from the business actions list: locked pre-filled fields (Name, Email, Date/Time, Contract) + editable "Comment name" (max 40) and "Detail" (max 200), both required, with live counters.
- Comments service that persists the comment then fans out `Notification` rows (mirror of `persistComprobante`).
- Notification routing: Analyst comments → notify contract's Money Strategist (`Business.idUser`); Money Strategist comments → broadcast to all active `ANALISTA_SOPORTE`.
- Notification panel entry: creator, relative time, deep link to the contract; clicking navigates to contract, scrolls to comments, marks the notification read.
- Comment thread in contract detail: all comments ordered, threaded UI (Money Strategist left / Analyst right).
- New `COMMENT_CREATED` audit action; `prisma/ERD.md` update.

### Out of Scope
- Editing existing comments (create-only in this slice).
- Per-contract analyst assignment (none exists today — broadcast is intentional).
- Third-party real-time infra (Pusher/Ably); existing SSE store is reused as-is.
- Replies/reactions/attachments on comments.

## Capabilities

### New Capabilities
- `contract-comments`: per-contract comment thread — data model, create modal, listing, threaded UI, and notification fan-out on create.

### Modified Capabilities
- `notificaciones-soporte`: add comment-created notification type, its role-based recipient routing, and the deep-link-to-comments navigation/read behavior.

## Approach

Exploration Approach 1 (+ light Approach 2). Add the `Comment` model and a `comments.service.ts` that creates the record then bulk-creates `Notification` rows routed by author role, pushed via the existing swappable `notificationProvider`/SSE store — wrapped in try/catch so notification failure never blocks the write. New route `POST/GET /api/negocios/[id]/comments` follows the `ApiResponse<T>` contract (auth → Zod → service, no Prisma in routes). Optionally piggyback a `new-comment` SSE event to live-update an open thread.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` + `prisma/ERD.md` | New | `Comment` model + relations on `Business`/`User` |
| `src/features/comments/services/comments.service.ts` | New | CRUD + notification fan-out |
| `src/app/api/negocios/[id]/comments/route.ts` | New | GET list / POST create |
| `src/app/dashboard/negocios/[id]/page.tsx` | Modified | Comment thread + create-modal trigger |
| `src/features/auth/lib/audit-logger.ts` | Modified | `COMMENT_CREATED` action |
| SSE provider / notifications service | Reused | Transport + read/close unchanged |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Broadcast to all analysts creates notification noise | Med | Product-approved; revisit with thread-scoped targeting if volume grows |
| SSE store is single-process (in-memory) | Med | Acceptable at current single-instance topology; provider is swappable to Redis later |
| Missing `VarChar` sizing / new max-length Zod pattern | Low | DB `VarChar(40)`/`VarChar(200)` mirror the UI limits |

## Rollback Plan

Revert the migration (drop `Comment` table), remove the comments feature module, route, UI section, and the `COMMENT_CREATED` audit enum value. Notifications and SSE infra are untouched, so removal is isolated with no impact on existing features.

## Dependencies

- Existing `Notification` model, SSE provider/store, and `NotificationBell`/`Drawer` UI.
- `UserRole` (`AGENTE`, `ANALISTA_SOPORTE`) and `Business.idUser` for recipient routing.

## Success Criteria

- [ ] All 9 acceptance scenarios pass (modal, locked/editable fields, validation, cancel, save, notification panel, navigation+read, ordered threaded UI).
- [ ] Analyst→MS and MS→broadcast routing verified end-to-end via SSE.
- [ ] Comment create writes a `COMMENT_CREATED` audit log; `ERD.md` updated.
- [ ] Char limits enforced (40/200) on both client and server with counters.
