# Proposal: Remove "New Business Distribution" list column (RF-09)

## Intent

RF-09 (PRD + MAPA M14) requires that Product Configuration list views no longer show the "Distribución para nuevos negocios" text column. The current UI and main OpenSpec spec still enforce that column, creating product/spec drift.

## Scope

### In Scope
- Remove the "Distribución para nuevos negocios" column from `ProductConfigurationsTableSection`.
- Align Product Configuration domain model by removing `newBusinessesDistributionDescription` if no runtime consumers remain.
- Update tests, fixtures, and main OpenSpec requirement to reflect RF-09 behavior.

### Out of Scope
- Changing assignment workflow for "nuevos negocios" in rule-level controls.
- Wizard/onboarding changes (RF-11) or liquidation semantics (`hasPortfolio` in engine).

## Approach

Adopt the "UI + domain cleanup" approach from exploration: remove the table column, then remove the now-dead derived field from mapper/type/fixtures. Update `openspec/specs/product-configuration/spec.md` so it no longer requires display of active distribution description in the list and instead reflects RF-09.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/product-configuration/components/product-configurations-table.tsx` | Modified | Remove RF-09-prohibited column definition |
| `src/features/product-configuration/types/product-configuration.types.ts` | Modified | Remove `newBusinessesDistributionDescription` |
| `src/features/product-configuration/mappers/product-configuration.mapper.ts` | Modified | Remove list-only derivation logic |
| `src/features/product-configuration/__tests__/fixtures/mock-product-configuration.ts` | Modified | Remove obsolete field from fixture |
| `src/features/product-configuration/__tests__/components/product-configurations-table.test.tsx` | Modified | Add regression assertion: column header absent |
| `openspec/specs/product-configuration/spec.md` | Modified | Replace conflicting list-column requirement |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Shared table is used by legacy distribution page too | Medium | Validate both entry points after column removal |
| Historical OpenSpec changes mention this column | Medium | Explicitly document RF-09 supersession in specs |
| Stakeholder expects form copy changes too | Low | Keep form unchanged; confirm scope with product if requested |

## Rollback Plan

Revert this change set (UI/spec/domain) by restoring the removed column block and field in type/mapper/fixtures from Git history. No migration or data rollback is required.

## Dependencies

- PRD `financieramente-configuracion-comisiones-prd.md` (RF-09)
- MAPA `M14` and exploration artifact for this change

## Success Criteria

- [ ] Product Configuration list no longer renders "Distribución para nuevos negocios" in any role.
- [ ] Unit/RTL tests pass with no references to removed list field.
- [ ] Main OpenSpec Product Configuration spec no longer contradicts RF-09.
