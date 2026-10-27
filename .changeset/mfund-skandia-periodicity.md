---
'financieramente-app': patch
---

### Corregido

- **Periodicidad de MFUND:** En negocios de SKANDIA con producto MFUND, la periodicidad queda en Aportes Ocasionales y no se puede cambiar, ni al crear ni al editar, tampoco si se envía otro valor por la API. Al pasar de otro producto a MFUND se aplica sola; los demás productos siguen con sus reglas.

### Técnico

- `mfundPeriodicityError` guards `createBusiness` and `PUT /api/negocios/[id]`.
- `prisma/seeds/correct-mfund-periodicity.ts` inventories historical SKANDIA/MFUND rows and, with `--apply --operator`, updates only `idBuyPeriodicity`, writing `BUSINESS_PERIODICITY_CORRECTED`. Premiums, payments and settlement amounts are not rewritten.
