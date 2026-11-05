---
'financieramente-app': patch
---

### Corregido

- Al eliminar una carga de archivo (estado LOAD o ERROR) ya no se borran físicamente sus comisiones, errores ni clawbacks: la carga queda marcada como eliminada y se conserva el historial. La eliminación queda registrada en auditoría.

### Técnico

- `delete-file-import.service.ts`: replaced `deleteMany` with logical deletion (`FileImport.status`, `SettlementCommission.status` and `Clawback.state` set to `DELETED`; distributions `isActive=false`; `FileImportError` rows kept).
- Added `AuditAction.FILE_IMPORT_DELETED`, logged in `DELETE /api/carga-archivos/file-import/[id]`.
- Excluded `DELETED` from file import id lookups, upload deduplication and the voluntaria prior-commission check. No schema migration.
