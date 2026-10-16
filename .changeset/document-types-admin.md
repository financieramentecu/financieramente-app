---
'financieramente-app': minor
---

### Agregado

- **Tipos de documento de identidad:** El Administrador del Sistema puede crear, editar y activar o inactivar tipos de documento desde Administración. El formulario de negocio valida el número según el tipo (numérico o alfanumérico, longitud mínima y máxima). Al desplegar quedan precargados CC, CE, PAS, NIT y PPT.

### Técnico

- New `DocumentType` model and `DocumentDataType` enum; migration `20261009193000_add_document_type` preloads the five standard codes (`ON CONFLICT DO NOTHING`). Deactivation sets `status = false` (no physical delete and no FK to stored identities).
- Admin API `/api/admin/document-types` (ADMIN only) and authenticated `GET /api/document-types`. Business create/update validate the identity against the catalog.
