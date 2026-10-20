---
'financieramente-app': minor
---

### Agregado

- **Tipo de Documento en negocios:** Al crear o editar un negocio hay que elegir el tipo de documento del cliente desde el catálogo activo. Si el número de identificación se diligencia, el tipo es obligatorio. Un tipo que después se inactiva sigue viéndose en el negocio que ya lo usa y no aparece para asignaciones nuevas.

### Mejorado

- La exportación de negocios a Excel incluye la columna **Tipo de Documento** junto al número de identificación. El número de cédula se mantiene.
- En el formulario de negocio el número de documento va primero. Si ese documento ya existe, se carga el tipo de documento del cliente; si no existe, se continúa con el alta.

### Técnico

- `Client.idDocumentType` is a required foreign key to `document_type` (`ON DELETE RESTRICT`). `type_identity` stays as the catalog code for the existing unique pair and current readers. Migration `20261014170000_link_client_document_type` is idempotent: it creates CC when missing, links matching codes, assigns CC only when `id_document_type` is null, and writes `CLIENT_DOCUMENT_TYPE_MIGRATED` with found/migrated/preserved/defaulted/skipped counts. Renaming a catalog code updates the denormalized `type_identity` of related clients. `DELETE /api/admin/document-types/[id]` refuses physical removal. Platform users and the future policyholder (COM-28) are not migrated here.
