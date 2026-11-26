---
'financieramente-app': patch
---

### Corregido

- Crear un negocio desde un lead ya no se revierte si falla el registro de esa conversión en el timeline del CRM.

### Técnico

- Conversion audit is written in its own transaction after the business commits. QA and production deploys do not install the CRM task-reminder or task-digest crontabs while CRM flags stay off outside development.
