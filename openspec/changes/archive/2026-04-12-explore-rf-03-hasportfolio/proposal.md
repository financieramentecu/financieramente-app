# Proposal: PPC `hasPortfolio` and portfolio percentages (RF-03 / RF-04)

## Intent

Deliver PRD **RF-03** and **RF-04**: `hasPortfolio` on **ProductPercentageCommission**, edited in the rule / category-lines flow; **portfolio %** per line when on; **hide** portfolio UI when off **without** clearing `porcentaje_portfolio`. Settlement keeps using `originCommission === 'CARTERA'` (**no** motor change; MAPA §F later).

## Scope

### In Scope

- Prisma: `hasPortfolio` on PPC, default `false`; migration.
- Stack: API, services, mappers — read/write flag + `porcentaje_portfolio`; no wipe on toggle-off.
- UI: rule checkbox; conditional portfolio column (`PercentageField`); Zod **[1,100]** + sum **≤ 100** when on (RF-05); RF-02 on portfolio fields.
- Delta spec + tests.

### Out of Scope

- Pre-liquidación `usePortfolio` logic; broad i18n; unrelated modules.

## Approach

End-to-end PRD-aligned delivery. Recreate/update category lines must carry both percents; persist portfolio when flag off. Category columns already **Decimal(8,6)**.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | `hasPortfolio` on PPC |
| `src/features/distribution-commission/` | Modified | schemas, form, row, mapper, types, services |
| `openspec/changes/.../specs/` | New delta | RF-03/04 |
| Commission rule API routes | Modified | Payloads |

## Risks

| Risk | L | Mitigation |
|------|---|------------|
| Flag confused with settlement | M | ~~Short UI note~~ Sin nota larga en formulario (producto prefiere UI mínima); alcance motor sigue documentado en PRD/MAPA |
| Line replace drops portfolio | M | Tests + explicit service mapping |

## Rollback Plan

Revert commits; down migration or DB restore; redeploy prior build.

## Dependencies

- Product: default `hasPortfolio = false` for existing PPCs.

## Success Criteria

- [x] On: save persists distribution + portfolio; validation enforced.
- [x] Off: UI hides portfolio; DB still holds prior `porcentaje_portfolio`.
- [x] Spec delta traceable; pre-liquidación logic unchanged in this PR.

## Actualización del plan (post-implementación)

- Semilla `product-percentage`: porcentajes por PPC coherentes (suma 100 % en escala UI).
- Presentación de % en solo lectura: sin ceros decimales superfluos (`formatPercentDisplay`).
- Tabla de reglas: chips legibles + color unificado; un solo buscador enlazado al API en el listado de reglas.
