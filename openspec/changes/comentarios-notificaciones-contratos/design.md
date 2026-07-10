# Design: Comentarios y notificaciones en tiempo real para contratos

## Technical Approach
Exploration Approach 1 + light Approach 2. New `Comment` model + a dedicated `comments` feature slice whose service mirrors `business-supports.service.ts::persistComprobante`: create record -> fan out `Notification` rows routed by author role -> push via existing swappable `notificationProvider` (SSE) inside try/catch so notification failure never blocks the write. Reuse Notification model, SSE store/provider, NotificationBell/Drawer, and `markNotificationAsRead` unchanged. Routes follow `ApiResponse<T>` (auth -> Zod -> service, no Prisma in routes). UI is a collapsible right sidebar on the contract detail page.

## Architecture Decisions

### Decision: Comment mutability / soft-delete
**Choice**: Ship create-only. Keep `status Boolean @default(true)` field but expose NO edit/delete endpoints this slice.
**Alternatives**: (a) truly immutable, no status field; (b) full edit + soft-delete now.
**Rationale**: Project CLAUDE mandates soft-delete on ALL entities and forbids physical delete; keeping `status` future-proofs removal without a later migration and stays convention-consistent, while create-only scope matches the proposal's "editing out of scope."

### Decision: Read-state ownership
**Choice**: Read state lives ONLY on `Notification` (reuse `markNotificationAsRead`). No `isRead`/`markCommentAsRead` on Comment.
**Alternatives**: per-comment read tracking on Comment.
**Rationale**: Notification already models per-user read; a per-comment read matrix would need a join table with no product requirement. Avoids duplicate state (SRP).

### Decision: Recipient routing
**Choice**: Author AGENTE (MS) -> broadcast to all `active` users with `role.code === 'ANALISTA_SOPORTE'`. Author ANALISTA_SOPORTE -> single `Business.idUser` (owning MS). Always exclude the author (no self-notify).
**Alternatives**: thread-scoped analyst targeting.
**Rationale**: No per-contract analyst assignment exists; broadcast is product-approved, revisit later. Mirrors existing role-query fan-out.

### Decision: Live thread update
**Choice**: Piggyback a `comment-added` SSE event on the same EventSource alongside `new-notification`; open sidebar appends optimistically/refetches. Degrades gracefully to notification-click refetch if listener absent.
**Rationale**: Zero new transport; single in-memory SSE store acceptable at single-instance (documented constraint), swappable to Redis later.

## Data Flow
```
CommentInput -> POST /api/negocios/[id]/comments
  route(auth+Zod) -> comments.service.createComment()
     |- prisma.comment.create (title/detail/authorId/businessId)
     |- logAuditEvent(COMMENT_CREATED)
     |- [try] resolveRecipients(authorRole, business.idUser)
     |       -> prisma.notification.createMany + fetch created rows
     |       -> notificationProvider.sendNotification (new-notification)
     |       -> sseStore.send(recipientId, 'comment-added', commentDTO)
     `- return CommentDTO (ApiResponse)
Client EventSource: 'new-notification' -> bell/drawer; 'comment-added' -> thread append
```

## File Changes
| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | New `Comment` model (id cuid, businessId FK->Business, authorId FK->User, title VarChar(40), detail VarChar(200), status Boolean, createdAt, updatedAt); `comments` relations on Business + User; `@@index([businessId, createdAt])` |
| `prisma/ERD.md` | Modify | Add Comment entity, relations, index note (mandatory) |
| `src/features/comments/types/comment.types.ts` | Create | Comment domain type + CommentDTO |
| `src/features/comments/schemas/comment.schema.ts` | Create | Zod: title `.min(1).max(40)`, detail `.min(1).max(200)` |
| `src/features/comments/mappers/comment.mapper.ts` | Create | Prisma model -> CommentDTO (author name+role) |
| `src/features/comments/services/comments.service.ts` | Create | `createComment()`, `getCommentsByBusinessId()`, private `resolveRecipients()` + fan-out |
| `src/app/api/negocios/[id]/comments/route.ts` | Create | GET (list, chronological) / POST (create) |
| `src/features/comments/hooks/use-comments.ts` | Create | AsyncState<CommentDTO[]>, SSE `comment-added` listener |
| `src/features/comments/components/{CommentsSidebar,CommentThread,CommentItem,CommentInput}.tsx` | Create | Collapsible sidebar, role-aligned thread, counters |
| `src/app/dashboard/negocios/[id]/page.tsx` | Modify | Mount sidebar; `?openComments=true` auto-open |
| `src/features/auth/lib/audit-logger.ts` | Modify | Add `COMMENT_CREATED` |

## Interfaces / Contracts
```prisma
model Comment {
  id         String   @id @default(cuid())
  businessId Int      @map("business_id")
  authorId   Int      @map("author_id")
  title      String   @db.VarChar(40)
  detail     String   @db.VarChar(200)
  status     Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  business   Business @relation(fields: [businessId], references: [idBusiness])
  author     User     @relation(fields: [authorId], references: [idUser])
  @@index([businessId, createdAt])
  @@map("comment")
}
```
Notification: title `Nuevo comentario en contrato {business.contract}`, message `{comment.title} - {author.name}`, callbackUrl `/dashboard/negocios/{id}?openComments=true`.

## Testing Strategy
| Layer | What | Approach |
|-------|------|----------|
| Unit | resolveRecipients routing (both roles, self-exclude, null idUser, empty analysts) | Vitest + prisma mock |
| Unit | Zod 40/200 boundaries; mapper role alignment | Vitest |
| Integration | POST creates comment + audit + notifications; notif failure does not fail write | mocked provider |
| E2E | Create comment -> recipient sees bell -> click -> sidebar opens+scrolls+marks read | Playwright |

## Edge Cases
- `Business.idUser` null -> skip MS notification, still create comment (defensive guard).
- No active analysts -> empty fan-out, comment succeeds.
- Author == recipient -> filtered out (no self-notify).

## Migration / Rollout
`prisma migrate dev --name add_comment_model` then `prisma generate`. Additive-only, no data backfill. Rollback: drop migration + remove module/route/enum; Notification/SSE untouched.

## Open Questions
- [ ] Confirm broadcast-to-all-analysts volume is acceptable long term (product).
- [ ] Deployment instance count (validates single-process SSE assumption).
