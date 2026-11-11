---
'financieramente-app': patch
---

### Mejorado

- **Apertura más rápida de Negocios:** al entrar sin filtros de fecha, la pantalla aplica el mes actual con una sola espera menos antes de mostrarse.

### Técnico

- `negocios/page.tsx` computes the default date seed from `session.user.role` and redirects before `getCurrentUserByEmail`; the database role is still checked afterwards as a fallback when the session role is missing or has no default.
