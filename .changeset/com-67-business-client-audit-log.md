---
'financieramente-app': patch
---

### Mejorado

- La creación de negocios y de clientes ahora queda registrada en la auditoría, con el usuario, la fecha y los datos principales del registro.

### Técnico

- Added `AuditAction.BUSINESS_CREATED` and `AuditAction.CLIENT_CREATED`, logged from the `createBusiness` and `createClient` Server Actions after a successful create. The existing `BUSINESS_POLICYHOLDER_LINKED` event is kept unchanged.
