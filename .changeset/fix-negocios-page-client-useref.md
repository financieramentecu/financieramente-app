---
'financieramente-app': patch
---

### Corregido

- Se corrige un error que impedía cargar la pantalla de negocios por un import faltante.

### Técnico

- Add the missing `useRef` import in `negocios-page-client.tsx`, which broke 17 unit tests on `develop`.
