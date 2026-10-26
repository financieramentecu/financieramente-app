---
'financieramente-app': minor
---

### Agregado

- **Tomador del negocio:** En el formulario de negocios, la primera sección se llama «Información básica y general del Cliente» y pregunta «¿El cliente es el mismo tomador?». La respuesta nace en «Sí». Si se cambia a «No», se capturan tipo y número de documento, correo, apellidos, nombres y teléfono del tomador. La búsqueda usa solo el catálogo de tomadores.
- La lista de negocios muestra la columna **Mismo tomador** (Sí o No). La exportación a Excel incluye esa columna y los datos del tomador: tipo de documento, número, correo, apellidos, nombres y teléfono.
- Los negocios que ya existían quedan con la respuesta «Sí».

### Técnico

- New `policyholder` table, independent from `client`, with `id_document_type` FK `ON DELETE RESTRICT` and unique `(type_identity, identity_number)`. `Business.client_is_policyholder` defaults to true; `id_policyholder` is set only when the client is not the policyholder. Switching back to Sí clears the business link and does not delete the policyholder row. Migration `20261015143000_add_policyholder` is idempotent and writes `BUSINESS_POLICYHOLDER_MIGRATED`. Search endpoint: `GET /api/policyholders/search`. `syncBusinessPolicyholder` is registered in the Server Action inventory and keeps `requireWriteAccess` plus `canRoleEditClientInfo`.
