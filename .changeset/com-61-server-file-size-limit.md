---
'financieramente-app': patch
---

### Corregido

- El límite de tamaño de los comprobantes y de los lotes de carga de archivos ahora también se valida en el servidor, no solo en la pantalla.

### Técnico

- `presignComprobanteUpload` now enforces `MAX_BYTES` (`FILE_TOO_LARGE`) and `presignPutUrl` signs `ContentLength`, so Spaces rejects an upload whose size differs from the validated one.
- `POST /api/carga-archivos/process-batch` returns 413 when a batch exceeds `MAX_BATCH_RECORDS` (500) or `MAX_BATCH_HEADERS` (200) (`load-file/lib/process-batch-limits.ts`).
