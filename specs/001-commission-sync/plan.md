# Implementation Plan: Commission Sync & Pre-liquidation

**Branch**: `001-commission-sync` | **Date**: 2026-02-17 | **Spec**: /Volumes/JohnAgudelo/Projects/financieramente-app/specs/001-commission-sync/spec.md  
**Input**: Feature specification from `/Volumes/JohnAgudelo/Projects/financieramente-app/specs/001-commission-sync/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Actualizar el flujo de carga para soportar dos tipos de Excel (POLIZA/VOLUNTARIA) con validación de headers por tipo, mantener estados/contadores de sincronización, normalizar valores numéricos, y recalcular pre‑liquidación usando `base_commission`, descuentos/clawback por snapshot y reglas de cartera, con auditoría de errores.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (Next.js 15 / Node.js)  
**Primary Dependencies**: Next.js App Router, Prisma ORM, XLSX  
**Storage**: PostgreSQL 15  
**Testing**: Vitest, Testing Library, Playwright  
**Target Platform**: Web app (Next.js)  
**Project Type**: Web application (single Next.js repo)  
**Performance Goals**: Sin objetivos nuevos; no degradar tiempos actuales de procesamiento por lotes  
**Constraints**: Mantener semántica de estados/contadores; tamaño máximo de archivo 50MB  
**Data Integrity**: `file_import.id_user` debe existir en `user` (FK). Validar existencia del usuario autenticado antes de crear FileImport.  
**Scale/Scope**: Procesamiento de archivos mensuales de comisiones con batch de 50 registros

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Feature-Based Architecture (Screaming Architecture): cambios dentro de dominios existentes (`src/app/dashboard/carga-archivos`, `src/features/pre-liquidacion`, `src/features/shared`)  
- [x] SOLID y funciones puras para lógica de negocio  
- [x] TypeScript estricto, sin `any`, uso de Zod para validaciones  
- [x] Import alias obligatorio `@/` (sin rutas relativas)  
- [x] Tests para lógica de negocio y validaciones  

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── app/
│   ├── api/
│   │   ├── carga-archivos/
│   │   └── pre-liquidacion/
│   └── dashboard/
│       └── carga-archivos/
├── features/
│   ├── pre-liquidacion/
│   ├── distribution-commission/
│   ├── shared/
│   └── negocios/
└── lib/

prisma/
```

**Structure Decision**: Next.js App Router en `src/app` con lógica de dominio en `src/features/*`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations.

## Phase Plan

### Phase 0 - Research
- Parsing numérico con formatos de moneda y negativos (paréntesis, separadores).
- Regla de lag: solo VOLUNTARIA valida fechas; POLIZA usa existencia de negocio.
- Auditoría: registrar cada error con detalle en tabla de auditoría.
- Fallback de configuración: descuento 12% y clawback 10% si no hay ACTIVE.

### Phase 1 - Design
- **Modelo de datos**:
  - `SettlementCommission`: agregar `commission_type`, `descripcion`, `discount_percentage`, `clawback_percentage`, `origin_commission`; eliminar columnas legacy.
  - `CommissionConfiguration`: tabla desconectada, valores de descuento/clawback.
  - `ProductPercentageCommissionCategory`: agregar `porcentaje_portfolio`.
  - `CommissionDistribution`: guardar snapshots de porcentajes aplicados.
  - `Clawback`: agregar `id_user` para dueño de la reserva de clawback.
  - `ClawbackBalance`: nueva tabla 1:1 con `User` para saldo neto (`id_user` PK/FK, `total_amount`, `updated_at`).
- **Contratos API**:
  - `file-import` y `process-batch` reciben `fileType`.
  - Validaciones de headers por tipo y errores explícitos.
- **Reglas de negocio**:
  - POLIZA: sin validación de fechas; mapping desde `Plan de Compensación`, `Valor Comisión`, `BASE`, `Contrato Largo`.
  - VOLUNTARIA: validación de fechas `Desde/Hasta`; mapping desde `Tipo de Comision`, `Com`, `Base`, `Cto`.
  - `origin_commission = CARTERA` si Plan = FRONT19_OMPEV; CLAW aplica clawback snapshot.
- **Auditoría**:
  - Persistir detalle de error (campo, valor bruto, motivo, referencia a archivo/registro).
- **Artefactos**:
  - `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`.

### Phase 2 - Planning
- **Backend**
  - Validación de headers por tipo con normalización de encabezados.
  - Parsing robusto de valores monetarios (símbolos, miles, paréntesis).
  - Validar que el `id_user` del session exista en `user` antes de crear `file_import` (evitar FK `file_import_id_user_fkey`). Si no existe, responder con error claro.
  - Revisar el include de detalle de usuario en `src/app/api/admin/users/[id]/route.ts`; el include `categoria` no existe en el modelo `User` y provoca `Unknown field 'categoria'`. Ajustar a relaciones válidas.
  - Reglas de estados/contadores de sincronización sin cambios.
  - Inserción de auditoría por cada error de parsing/validación.
  - Cálculo de pre‑liquidación con `base_commission` y porcentajes según origen.
- **Arquitectura (Constitución)**
  - Toda lógica de dominio en `src/features/*` (no crear `src/services` ni `src/utils`).
  - Acciones y servicios respetan separación: acciones orquestan, servicios acceden a datos.
  - Imports siempre con alias `@/`.
  - Tipos y validaciones con Zod + TypeScript estricto.
- **Frontend**
  - Selector obligatorio de tipo de archivo antes de cargar.
  - Mensajes de error específicos por headers/estructura.
- **Migraciones**
  - Renombres y nuevas columnas en tablas relacionadas a comisiones.
  - `CommissionConfiguration` sin relaciones.
- **Testing**
  - Unit tests: parsing numérico, validación headers, reglas de lag.
  - Integration tests: sincronización y pre‑liquidación con POLIZA/VOLUNTARIA.
