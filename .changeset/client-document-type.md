---
'financieramente-app': minor
---

### Agregado

- **Tipo de Documento en negocios:** Al crear o editar un negocio hay que elegir el tipo de documento del cliente desde el catálogo activo. Si el número de identificación se diligencia, el tipo es obligatorio. Un tipo que después se inactiva sigue viéndose en el negocio que ya lo usa y no aparece para asignaciones nuevas.

### Mejorado

- La exportación de negocios a Excel incluye la columna **Tipo de Documento** junto al número de identificación. El número de cédula se mantiene.
- En el formulario de negocio el número de documento va primero. Si ese documento ya existe, se carga el tipo de documento del cliente; si no existe, se continúa con el alta.

### Técnico

- `Client.idDocumentType` is a required foreign key to `document_type` (`ON DELETE RESTRICT`). `type_identity` stays as the catalog code for the existing unique pair and current readers. Migration `20261014170000_link_client_document_type` is idempotent: it creates CC when missing, links matching codes, and assigns CC only when `id_document_type` is null. Before writing, it aborts when the rewrite would duplicate `(type_identity, identity_number)`. Each defaulted client keeps its previous code in `audit_log.details` (`CLIENT_DOCUMENT_TYPE_DEFAULTED`). The summary row `CLIENT_DOCUMENT_TYPE_MIGRATED` stores found/migrated/preserved/defaulted/skipped/out_of_catalog counts. Renaming a catalog code updates the denormalized `type_identity` of related clients. `DELETE /api/admin/document-types/[id]` refuses physical removal. Platform users and the future policyholder (COM-28) are not migrated here.
- Seed fix for a freshly reset database: `seedNewCategories` now upserts its `CategoryType` ('MIA') instead of skipping every category when none exists (the migration only copies types from existing categories), and no longer runs on import. `seedUsers` resolves the demo users' level through `requireLevel` with the `LEVEL_0`/`LEVEL_2` codes created by `seedLevels`, and fails when a level is missing instead of silently leaving `id_level` null (the stale `JUNIOR`/`LIDER` codes made the agent search return no one).
