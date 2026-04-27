# Design: Remove "New Business Distribution" list column (RF-09)

## Technical Approach

Remove the `ColumnDef` for `newBusinessesDistributionDescription` in `ProductConfigurationsTableSection` so no list surface renders **«Distribución para nuevos negocios»**. Then delete the derived domain field and mapper logic that existed only to populate that column. Keep `ppcNewBusinesses` and `idProductPercentageCommissionNewBusinesses` on `ProductConfiguration` — they still support forms and APIs. Replace the main OpenSpec **Active Distribution Display** requirement with an RF-09 requirement (no such column in the product-configuration list module). Matches proposal “UI + domain cleanup”.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|------------|
| List-only removal vs hide via feature flag | Remove column in code; no flag | Env flag to show column | RF-09 allows no role exception; flags add complexity |
| Domain field | Remove `newBusinessesDistributionDescription` | Keep for future reuse | Field has zero consumers after column removal; avoids dead API surface |
| Active-distribution resolution in mapper | Drop `activeDistribution` lookup used only for description | Keep for debugging | YAGNI; uniqueness rules remain elsewhere |
| Form copy «Nuevos Negocios» | Unchanged | Rename to match PRD | Out of scope per proposal; PRD targets list column text |

## Data Flow

```
Prisma (includes PPC + categories)
       → prismaProductConfigToProductConfig
       → ProductConfiguration (no list description field)
       → ProductConfigurationsTableSection columns
```

No API route or Server Action signature changes: list data still comes from existing product-configuration fetch; only the mapped shape loses one display-only property.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/product-configuration/components/product-configurations-table.tsx` | Modify | Remove column block (lines ~88–106) |
| `src/features/product-configuration/types/product-configuration.types.ts` | Modify | Remove `newBusinessesDistributionDescription` |
| `src/features/product-configuration/mappers/product-configuration.mapper.ts` | Modify | Remove `activeDistribution` + `newBusinessesDistributionDescription` mapping |
| `src/features/product-configuration/__tests__/fixtures/mock-product-configuration.ts` | Modify | Drop field from domain mock; adjust Prisma mock if it only served that field |
| `src/features/product-configuration/__tests__/mappers/product-configuration.mapper.test.ts` | Modify | Remove assertions if any referenced removed field (grep after change) |
| `src/features/product-configuration/__tests__/components/product-configurations-table.test.tsx` | Modify | `expect(screen.queryByText('Distribución para nuevos negocios')).not.toBeInTheDocument()` |
| `openspec/specs/product-configuration/spec.md` | Modify | Remove/replace **Active Distribution Display** with RF-09 requirement |
| `openspec/changes/rf-09-remove-list-column-nuevos-negocios/specs/product-configuration/spec.md` | Create (if using delta) | Delta mirroring main spec edits |

## Interfaces / Contracts

```ts
// ProductConfiguration — remove one property
// readonly newBusinessesDistributionDescription removed
// ppcNewBusinesses unchanged
```

Prisma queries and `ProductPercentageCommission` uniqueness behavior stay as today (**Active Distribution Uniqueness** in spec remains).

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Mapper | Assert returned object has no `newBusinessesDistributionDescription`; existing happy-path cases still pass |
| RTL | Table | Column header string absent; smoke: code + Distribución de Comisión link still render |
| Integration | API list | Optional: if any route test asserts full JSON shape including removed field, update fixture expectations |
| E2E | None required | RF-09 is structural UI + type cleanup |

## Migration / Rollout

No migration required. No DB schema change.

## Open Questions

- [ ] None blocking — confirm with product only if they later ask to change form copy (out of scope).
