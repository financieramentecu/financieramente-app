---
'financieramente-app': patch
---

### Corregido

- CRM: un lead solo se puede convertir en negocio desde tu propia rama. Quien solo tiene la vista de otras ramas ya no puede convertir un lead ajeno.

### Técnico

- `createBusiness` validates the lead scope server-side with `isLeadWithinConversionScope` before resolving the owner or opening the transaction.
