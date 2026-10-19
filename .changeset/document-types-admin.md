---
'financieramente-app': minor
---

### Agregado

- **Tipos de documento de identidad:** El Administrador del Sistema puede crear, editar y activar o inactivar tipos de documento desde Administración. El formulario de negocio valida el número según el tipo (numérico o alfanumérico, longitud mínima y máxima). Al desplegar quedan precargados CC, CE, PAS, NIT y PPT.

### Corregido

- **Abreviatura de un tipo en uso:** Si clientes o usuarios ya tienen esa abreviatura, el formulario de administración la deja bloqueada y el guardado rechaza el cambio. Así un código como CC no deja identificaciones sin tipo.
- **Cambio de tipo en un cliente:** Solo un rol con permiso de edición de cliente puede cambiar el tipo de documento. El tipo nuevo tiene que existir en el catálogo; un código que no está en el catálogo solo se conserva si el cliente ya lo tenía.
- **Edición de un negocio ya guardado:** Si el tipo y el número de documento no cambian, se puede guardar el resto del negocio aunque el número tenga puntos o guiones. La regla del catálogo se aplica cuando el documento sí cambia o cuando el negocio es nuevo.

### Técnico

- New `DocumentType` model and `DocumentDataType` enum; migration `20261009193000_add_document_type` preloads the five standard codes (`ON CONFLICT DO NOTHING`). Deactivation sets `status = false` (no physical delete and no FK to stored identities).
- Admin API `/api/admin/document-types` (ADMIN only) and authenticated `GET /api/document-types`. Business create/update validate the identity against the catalog.
- `updateDocumentType` rejects a code change when `Client.typeIdentity` or `User.typeIdentity` matches the current code. `validateIdentityForExistingRecord` allows a missing catalog row only when the code is unchanged, and skips the catalog format check when both `typeIdentity` and `identityNumber` are unchanged. `updateClient` treats `typeIdentity` like `identityNumber` for the privileged-role check.
