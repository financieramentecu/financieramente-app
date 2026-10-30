---
'financieramente-app': patch
---

### Corregido

- **Reversión de la corrección de prima del negocio 458 (COM-92):** Se retira el script y el servicio que corregían la prima de ese negocio. La corrección de periodicidad de SKANDIA/MFUND (COM-94) se mantiene.

### Técnico

- Reverts merge `41d95916` (PR #376). Removes `correct-com-92-premium` service, seed and `BUSINESS_VALUE_CORRECTED`. Keeps `BUSINESS_PERIODICITY_CORRECTED` from COM-94.
