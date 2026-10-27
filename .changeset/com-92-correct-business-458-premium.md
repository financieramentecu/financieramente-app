---
'financieramente-app': patch
---

### Corregido

- **Prima del negocio #458:** Corrección puntual del negocio fondeado de Angela Oliva (Trinity, contrato 183785CA) de USD 472.576,00 a USD 4.725,76, según el comprobante de transferencia. El resto de datos del negocio no cambia. Las comisiones históricas no se recalculan solas.

### Técnico

- Added `prisma/seeds/correct-business-458-premium.ts` (dry-run by default, `--apply --operator=`). Deploying this change does not update the database. Running `--apply` updates only `business.value` for id 458 after identity guards and writes `BUSINESS_VALUE_CORRECTED`. The operator email must match an active user whose role is `ADMIN`, `ASISTENTE_GERENCIA_OPERATIVA`, or `ANALISTA_SOPORTE`; otherwise the transaction never opens. Settlement, distribution and payment rows are reported and left unchanged. Reports read `business.value` at query time, so they pick up the corrected premium without a separate aggregate job.
