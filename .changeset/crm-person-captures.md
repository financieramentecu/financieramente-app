---
'financieramente-app': minor
---

### Agregado

- Capturas configurables y referente por lead, con una tarjeta por persona y selector de oportunidades relacionadas.

### Mejorado

- Historial consolidado con la captura y autor de cada evento, y asignación del Money Strategy a todos los leads relacionados respetando los permisos.
- Integraciones compatibles con los datos anteriores; las capturas existentes siguen vigentes.

### Técnico

- Add nullable capture/referrer fields and a capture catalogue through an additive migration; transactionally link contacts and enforce group ownership across native, webhook, landing and CSV ingestion.
- No session balances, entitlement changes, automatic supersession, new environment variables or cron jobs.
