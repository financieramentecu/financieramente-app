# Tasks: Visibilidad Jerárquica en Negocios

## Phase 1: Foundation — BFS Service

- [x] 1.1 Create `src/features/negocios/services/user-hierarchy.service.ts` — export `getSubordinateUserIds(prisma, rootIdUser): Promise<number[]>` using BFS over `User { idUser, idUserLeader, status: true }` with a `Set<number>` for cycle safety; root NOT included in result
- [x] 1.2 Create `src/features/negocios/__tests__/user-hierarchy.service.test.ts` — RED tests for: linear chain, multi-branch tree, cycle A→B→A terminates without duplicates, root with no subordinates returns `[]`, inactive users excluded

## Phase 2: Core Implementation — where-builder + detail guard

- [x] 2.1 Modify `src/features/negocios/lib/build-business-list-where.ts` — add `BuildBusinessListWhereOptions { visibleUserIds?: number[] }` third param; when `visibleUserIds` is present and user is scoped, emit `{ idUser: { in: visibleUserIds } }` instead of `{ idUser: currentUser.idUser }`
- [x] 2.2 Update `src/features/negocios/__tests__/build-business-list-where.test.ts` — add cases: scoped user with `visibleUserIds` → `IN` predicate; admin with `visibleUserIds` → no idUser filter; scoped user without `visibleUserIds` → single idUser

## Phase 3: Integration — Route Handlers

- [x] 3.1 Modify `src/app/api/negocios/route.ts` GET handler — after resolving `currentUser`, call `getSubordinateUserIds` for scoped roles; build `visibleUserIds = [currentUser.idUser, ...subordinates]`; pass to `buildBusinessListWhere` options; admin path unchanged
- [x] 3.2 Modify `src/app/api/negocios/stats/route.ts` GET handler — replace `userFilter = currentUser.idUser` with `userFilter = [currentUser.idUser, ...subordinates]` for scoped roles; apply `{ idUser: { in: userFilter } }` in `whereClause`; admin path unchanged
- [x] 3.3 Modify `src/app/api/negocios/[id]/route.ts` GET handler — replace current `isAgent` binary check with: if ADMIN → `{ idBusiness: businessId }`; if scoped → call `getSubordinateUserIds`, build `visibleUserIds = [self, ...subordinates]`, use `{ idBusiness: businessId, idUser: { in: visibleUserIds } }`
- [x] 3.4 Verify `src/app/api/negocios/[id]/route.ts` PUT handler — confirm it does NOT need hierarchy expansion (PUT is scoped by `isAgent` only; leaders editing subordinate businesses is not in scope — documented inline with comment)

## Phase 4: Testing

- [x] 4.1 Make `user-hierarchy.service.test.ts` GREEN — implement service so all BFS scenarios pass
- [x] 4.2 Make `build-business-list-where.test.ts` GREEN — verify updated where-builder passes all new cases plus existing ones
- [x] 4.3 Add/update integration test for `GET /api/negocios` — seed 2-level hierarchy (leader → subordinate), assert leader sees both own and subordinate's businesses; assert AGENTE only sees own
- [x] 4.4 Add/update integration test for `GET /api/negocios/stats` — same 2-level seed, assert leader's KPI count equals `findMany` count for same scope
- [x] 4.5 Add integration test for `GET /api/negocios/[id]` — assert leader can fetch subordinate's business detail (200); assert unrelated user gets 404; assert ADMIN always gets 200

## Phase 5: Cleanup

- [ ] 5.1 Run `npm run type-check` and `npm run lint` — fix any TypeScript errors from `number | undefined` → `number[] | undefined` change in stats `userFilter`
- [ ] 5.2 Run `npm run test:unit` — confirm all unit tests pass
- [ ] 5.3 Resolve open question in design: confirm no other roles beyond `AGENTE` require scoped visibility; add inline comment in route handler documenting the role-scope decision
