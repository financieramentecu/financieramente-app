---
'financieramente-app': patch
---

### Mejorado

- **Carga más estable:** la plataforma deja de consultar un servicio externo de configuración en cada visita. Todos los módulos (Dashboard, Calculadora, Leads y Reportes) siguen visibles como hasta ahora.

### Corregido

- **Errores 403 de producción:** se eliminan los errores periódicos de acceso al servicio de feature flags.

### Técnico

- Removed Flagsmith (`flagsmith-nodejs`, `@flagsmith/flagsmith`), `FlagsmithProvider`, `useFeatureFlag`, `isFeatureEnabledServer` and the feature flag catalog; every previously flagged module is now unconditionally enabled. Impersonation UI stays ADMIN-only via existing role checks.
