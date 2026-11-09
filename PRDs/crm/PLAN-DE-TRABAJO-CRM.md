# Plan de trabajo — CRM dentro de Negocios (Financieramente)

**Fecha:** 2026-11-05
**App:** `financieramente-app` (Next.js + Prisma + PostgreSQL)
**Objetivo:** Reemplazar GoHighLevel por un **CRM propio** que vive como submenú **Negocios → CRM** y cubre toda la gestión de leads hasta su conversión en negocio. Durante la migración GHL sigue siendo la fuente de verdad (ver sección 4).

---

## 1. Punto de partida (lo que ya existe)

| Pieza | Dónde | Estado |
|---|---|---|
| Modelo `Lead` + `LeadFunnelColumn` + enum `LeadOutcomeStatus` | `prisma/schema.prisma` (líneas ~743-790) | En producción |
| Webhook `POST /api/leads/crm-sync` (n8n → upsert por `externalCrmId`) | `src/app/api/leads/crm-sync` + `lead-sync.service.ts` | En producción |
| Kanban de leads **solo lectura** (sin drag & drop, sin creación manual) | `src/app/dashboard/leads`, `src/features/leads/components/leads-board.tsx` | En producción |
| Importación CSV de leads | `lead-csv-import.service.ts` | En producción |
| Conversión manual Lead → Cliente + Negocio | `lead-conversion.service.ts` | En producción |
| Admin de columnas del embudo | `funnel-columns-admin-table.tsx` | En producción |
| Visibilidad por jerarquía (`getAccessibleUserIds`) y auditoría (`logAuditEvent`) | `src/features/auth/lib` | Reutilizable |
| Menú lateral con submenús (`subItems`, ej. Liquidaciones) | `src/lib/navigation/menu-items.tsx`, `menu-builder.ts` | Reutilizable |
| Features reutilizables: `comments`, `notifications`, `email` | `src/features/*` | Reutilizable |

**Conclusión:** no partimos de cero. La v1 de Leads es la base de datos y el embudo; el CRM es hacerlo **editable, con actividades, automatizaciones y reportes**.

---

## 2. Qué tomamos de cada CRM de referencia

No vamos a instalar ninguno (stacks distintos y duplicarían usuarios/negocios); los usamos como **referencia funcional y de UX**.

| CRM | Qué copiamos | Qué no |
|---|---|---|
| **Twenty** (TS/React, mismo stack) | UX: vistas Kanban/tabla intercambiables, filtros guardados, timeline de actividad por registro, campos personalizados, ficha lateral (sheet) | Su motor de metadatos genérico (demasiado complejo para nuestro caso) |
| **EspoCRM** | Entidades claras Lead → Contacto → Oportunidad, actividades (llamada, reunión, tarea), asignación y equipos, API REST limpia | — |
| **SuiteCRM** | Workflows (si X entonces Y), reglas de asignación, SLA / recordatorios, reportes de conversión | UI antigua, sobrecarga de módulos |
| **Odoo CRM** | Pipeline con probabilidad y valor esperado, motivos de pérdida, actividades programadas con vencimiento, integración con el negocio/facturación (nuestro `Business`) | El resto del ERP |

### 2.1 Qué ya se trajo de cada referencia (rama `codex/negocios-basic-crm`, Andrés)

| Funcionalidad | Referencia | Estado |
|---|---|---|
| Timeline de eventos inmutable por lead (payload versionado, idempotente) | Twenty (`timelineActivity`) | Hecho (Andrés) |
| Notas en el timeline | Twenty Notes / EspoCRM Stream | Hecho (Andrés) |
| Tareas con responsable, vencimiento y estado | EspoCRM Task / Odoo `mail.activity` | Hecho (Andrés) |
| Casos de soporte con estado, prioridad y comentarios | EspoCRM Case / SuiteCRM Cases | Hecho (Andrés) — no estaba en el plan |
| Auditoría de conversión Lead → Negocio | EspoCRM (conversión de lead) | Hecho (Andrés) |
| Resumen de pipeline en tarjetas | Odoo (análisis de pipeline) | Hecho (Andrés) — adelanta parte de la Fase 3 |
| Flags por módulo (`crm_timeline`, `crm_tasks`, `crm_cases`, `crm_conversion_audit`, `crm_imports`, `crm_reports`) | — | Hecho (Andrés), apagados por defecto |
| Historial de etapas | Odoo (seguimiento de etapa) | Hecho (Fase 0) |
| Menú Negocios → CRM con pestañas | Twenty (vistas) | Hecho (Fase 0) |
| Registrar llamadas, reuniones, email y WhatsApp | EspoCRM Calls & Meetings / Odoo "Registrar actividad" | Fase 1 |
| Agenda "Mis actividades" (vencidas, hoy, próximas) | Odoo Activities / EspoCRM Activities | Fase 1 |
| Recordatorios y resumen diario | EspoCRM reminders / Odoo | Fase 1 |
| Lead sin actividad en N días | Odoo (días en etapa) | Fase 1 |
| Vistas tabla, filtros guardados, etiquetas, campos personalizados | Twenty | Fase 2 |
| Valor esperado y probabilidad | Odoo | Fase 2 |
| Motivos de pérdida, varios pipelines, duplicados | Odoo / EspoCRM | Fase 4 |
| Workflows y reglas de asignación | SuiteCRM | Fase 5 |

---

## 3. Navegación objetivo

El menú lateral solo soporta un nivel de `subItems`, así que:

```
Negocios                (grupo con subItems)
├── Negocios            → /dashboard/negocios          (lo actual)
└── CRM                 → /dashboard/negocios/crm      (nuevo)
        Pestañas internas de la página CRM:
        ├── Pipeline    (Kanban editable)
        ├── Leads       (tabla con filtros)
        ├── Actividades (mis tareas / agenda)
        └── Reportes    (embudo y conversión)
```

- Se elimina el ítem de primer nivel `Leads`; `/dashboard/leads` redirige a `/dashboard/negocios/crm`.
- Aplica a `ALL_MENU_ITEMS` y a `AGENTE_MENU_ITEMS`. Partner: sin CRM (confirmar).
- Breadcrumbs: añadir `crm: 'CRM'` en `breadcrumb-utils.ts`.
- Permisos: ampliar `permissions.leads` a un objeto `permissions.crm = { view, create, edit, assign, delete, configure, reports }`.

---

## 4. Estrategia de migración desde GoHighLevel (decisión tomada)

**Decisión (2026-11-05):** el objetivo es **desconectarnos de GoHighLevel (GHL)** y usar nuestro propio CRM. **Mientras dure la migración, GHL sigue siendo la fuente de verdad.**

Para que las dos cosas convivan sin pisarse, cada dato tiene un **dueño**:

| Tipo de dato | Ejemplos | Dueño durante la migración | Dueño tras el corte |
|---|---|---|---|
| **Datos sincronizados** | Contacto, etapa del embudo, responsable, estado Ganado/Perdido | **GHL**: solo entra por el webhook y en Financieramente es **solo lectura** | Financieramente |
| **Datos propios del CRM** | Actividades, tareas, notas, etiquetas, valor estimado, historial de etapas, vistas, reportes | Financieramente (GHL no los conoce, así que no hay conflicto) | Financieramente |

Para controlar quién manda se añadirá (en la Fase 4) un interruptor de **modo de fuente de verdad** (`crm_source_of_truth` = `GHL` | `INTERNAL`). Mientras valga `GHL`:
- el webhook `crm-sync` sigue escribiendo como hoy;
- en la UI, los campos sincronizados se muestran bloqueados con el aviso "Gestionado en GHL" y el botón "Ver en CRM" (`externalUrl`);
- no hay drag & drop ni creación manual de leads: los leads nuevos se crean en GHL.

El corte se hace en cuatro etapas:

```
Etapa A: Convivencia ─► Etapa B: Paralelo ─► Etapa C: Corte ─► Etapa D: Apagado de GHL
(GHL manda)              (GHL manda; se       (Financieramente   (se cancelan GHL
                          valida el CRM)       manda)             y los flujos n8n)
```

---

## 5. Fases

Cada fase = un change de OpenSpec (`/sdd-new crm-<fase>`), con proposal → spec → design → tasks → apply → verify.
El orden prioriza lo que **aporta valor sin pelear con GHL**. Las funciones que editan datos sincronizados se construyen detrás del flag y solo se activan en el corte.

### Etapa A — Convivencia (GHL es la fuente de verdad)

#### Fase 0 — Base (≈ 1 semana) · **hecha** (change `crm-phase-0-foundation`; aplicada sobre la rama de Andrés en `feature/crm-on-basic-crm`)
- Reestructurar el menú: Negocios con submenú, página `/dashboard/negocios/crm` con pestañas y redirección desde `/dashboard/leads`.
- Nueva tabla `LeadStageHistory`, alimentada por el webhook y la importación CSV: cada cambio de etapa queda registrado. Así, cuando llegue el corte, ya habrá historial para los reportes.
- Badge "Gestionado en GHL" en el detalle de los leads sincronizados.
- Ajustes respecto al borrador inicial:
  - Se reutiliza el flag existente `leads_module` en lugar de crear `crm_module`.
  - Los permisos granulares `crm.*` y el interruptor `crm_source_of_truth` pasan a la Fase 4: hoy no hay acciones de edición que controlar, y los permisos viajan dentro del JWT, así que renombrar `leads` rompería las sesiones activas.

#### Fase 1 — Actividades y timeline (≈ 2 semanas) · **primer MVP útil** · **diseño listo** (change `crm-phase-1-activities`)
Parte ya está hecha en la rama de Andrés (ver sección 2.1). El diseño completa lo que falta sobre su modelo.
- ~~Modelo `LeadActivity`~~ → ya existe (Andrés): registro de eventos inmutable + `LeadTask` para lo programado. Se amplía con llamadas, reuniones, email y WhatsApp registrados y con `LeadTask.type`.
- Timeline en la ficha del lead: actividades, cambios de etapa (de `LeadStageHistory`) y comentarios.
- Pestaña **Actividades**: mis pendientes de hoy, vencidas y próximas.
- Recordatorios y notificaciones in-app/email (reutilizar `notifications` y `email`).
- Indicador de "lead sin actividad en X días".

#### Fase 2 — Vistas, etiquetas y datos propios (≈ 2 semanas)
- Vista tabla con filtros, búsqueda, orden, paginación y exportación CSV.
- Vistas guardadas por usuario.
- Etiquetas (`LeadTag`) y campos personalizados simples.
- Campos propios del CRM: valor estimado y probabilidad, para calcular el valor ponderado del pipeline.

#### Fase 3 — Reportes (≈ 1-2 semanas)
- Embudo de conversión, tasas de ganados y perdidos, tiempo promedio en cada etapa.
- Leads por origen, por asesor y por equipo (respetando la jerarquía).
- Pronóstico con el valor ponderado.
- Integrar con `report-permissions`.

### Etapa B — Paralelo (GHL manda; el CRM se valida)

#### Fase 4 — Gestión editable detrás del flag (≈ 2-3 semanas)
Se construye y se prueba en QA con `crm_source_of_truth = INTERNAL`; en producción sigue apagado.
- Crear leads manualmente, editar los datos de contacto.
- **Drag & drop** entre etapas y reasignación de responsable (respetando la jerarquía).
- Marcar Ganado / Perdido / Abandonado con **motivo de pérdida** (`LeadLossReason`).
- Detección de duplicados por email, teléfono o documento.
- Varios pipelines (`LeadPipeline`): las columnas actuales se migran a un pipeline "Principal".
- Captura directa de formularios web (`landing-gunvura`) en `POST /api/leads` con API key, también detrás del flag.

#### Fase 5 — Automatizaciones (≈ 2-3 semanas)
Sustituyen lo que hoy hacen los workflows de GHL.
- **Inventario de los workflows actuales de GHL y n8n** (qué hacen, quién depende de ellos): es la lista de requisitos de esta fase.
- Reglas de asignación (round-robin, por origen o por producto), workflows "cuando… entonces…" y SLA de primer contacto.
- Ejecución: cron interno o n8n (por decidir).
- Email y WhatsApp: plantillas, y registro de los mensajes como actividad.

#### Fase 6 — Migración de datos y ensayo (≈ 1-2 semanas)
- Script de importación histórica desde la API de GHL: contactos, oportunidades, notas, tareas y conversaciones, mapeados a `Lead` y `LeadActivity` y guardando `externalCrmId` como referencia.
- Conciliación: un reporte de diferencias entre GHL y Financieramente (conteos por etapa y por responsable; leads que faltan).
- **Piloto**: un equipo o pipeline trabaja en el CRM propio durante 1-2 semanas, con GHL como respaldo.
- Ensayo del corte en QA: subir el flag a `INTERNAL`, comprobar que el webhook queda ignorado y probar el plan de vuelta atrás.

### Etapa C — Corte (Financieramente pasa a ser la fuente de verdad)

#### Fase 7 — Corte (≈ 1 semana + estabilización)
- Congelar GHL (solo lectura) → última sincronización e importación delta → subir el flag a `INTERNAL`.
- El webhook `crm-sync` deja de escribir: responde OK y registra el evento en `AuditLog` mientras quede tráfico.
- Redirigir los formularios y fuentes de leads de GHL a `POST /api/leads`.
- Capacitar a los asesores y acompañarlos durante las primeras 2 semanas.
- **Vuelta atrás:** si hay un problema grave, el flag vuelve a `GHL`. Los cambios hechos en Financieramente durante el corte se exportan para cargarlos en GHL.

### Etapa D — Apagado de GHL

#### Fase 8 — Desconexión (≈ 1 semana)
- Retirar `crm-sync`, `api-key-guard` de GHL y los flujos de n8n relacionados.
- Revisar `mia-app`, que también llama a la API de GHL (leads de coaches): migrarlo a la API del CRM propio o dejarlo documentado como dependencia aparte.
- Hacer una exportación final de GHL como archivo histórico y cancelar la suscripción.
- Limpiar el código: quitar los avisos "Gestionado en GHL" y convertir `externalCrmId` / `externalUrl` en campos solo históricos.

**Total estimado:** 14-18 semanas con 1-2 devs. **Valor visible a las ≈ 3 semanas** (Fases 0 + 1), sin tocar el flujo actual de GHL.

---

## 6. Cambios de modelo de datos (resumen)

| Modelo | Fase | Notas |
|---|---|---|
| `LeadStageHistory` | 0 | La alimentan el webhook (Etapa A) y la UI (tras el corte) |
| `LeadActivity`, `LeadTask`, `LeadSupportCase`, `LeadSupportCaseComment` | 1 (rama de Andrés) | Ya creados |
| `LeadActivityType` (+ `*_LOGGED`), `LeadTaskType`, `LeadTask.reminderSentAt`, `Lead.lastActivityAt` | 1 | Migración aditiva |
| `LeadTag`, `LeadTagOnLead`, `LeadCustomField`, `LeadCustomFieldValue` | 2 | Datos propios: sin conflicto con GHL |
| `Lead` (+ `estimatedValue`, `probability`) | 2 | Migración aditiva, sin romper el webhook |
| `Lead` (+ `idLossReason`, `idPipeline`, `source`) + `LeadLossReason` + `LeadPipeline` | 4 | |
| `CrmAutomationRule`, `CrmAutomationRun` | 5 | |

---

## 7. Decisiones abiertas

1. ~~Fuente de verdad frente a GHL~~ → **Decidido:** GHL durante la migración y Financieramente tras el corte (sección 4).
2. ¿El CRM es solo para Financieramente o lo compartirán MIA y Vortex? Afecta a `centarl-user` (SSoT de identidad) y a los leads de coaches de `mia-app`.
3. ¿Los Partners deben ver el CRM?
4. Herramienta de jobs para las automatizaciones (cron interno frente a n8n).
5. Canales de comunicación prioritarios (email, WhatsApp, llamadas).
6. Fecha objetivo del corte y qué equipo hace el piloto.
7. Qué historial de GHL se migra (¿todo, o solo los leads abiertos y los cerrados de los últimos N meses?).

---

## 8. Riesgos

- **Choques con el webhook:** quedan evitados mientras el flag esté en `GHL`, porque los campos sincronizados son de solo lectura. El riesgo se concentra en el corte, que por eso se ensaya en QA (Fase 6).
- **Workflows ocultos en GHL:** automatizaciones que nadie documentó y que dejarían de ejecutarse tras el apagado. Por eso el inventario de la Fase 5 es obligatorio.
- **Adopción:** que los asesores sigan usando GHL por costumbre. Mitigación: el piloto, la capacitación y congelar GHL en el corte.
- **Rendimiento del Kanban** con muchos leads: paginación por columna e índices en `(idLeadFunnelColumn, updatedAt)`.
- **Jerarquía:** todas las consultas nuevas deben pasar por `getAccessibleUserIds()`.
- **Alcance:** cada fase se libera tras el flag `crm_module` y se valida con usuarios antes de empezar la siguiente.

---

## 9. Próximo paso

Acordar con Andrés cómo entra su commit a `develop`, revisar el diseño de la Fase 1 (`openspec/changes/crm-phase-1-activities/`) y arrancar por la limpieza de rutas (Prisma fuera de los handlers).
