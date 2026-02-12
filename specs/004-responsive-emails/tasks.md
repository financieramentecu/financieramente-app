---
description: 'Task list for Responsive y Correos de Notificación'
---

# Tasks: Responsive y Correos de Notificación

**Input**: Design documents from `/specs/004-responsive-emails/`
**Prerequisites**: plan.md, spec.md

**Organization**: Phases aligned with plan (Auditoría, Implementation, Correos, Tests, Docs).

## Format: `[ID] [P?] [US?] Description`

- **[P]**: Can run in parallel
- **[US]**: User Story 1, 2, 3

---

## Phase 1: Auditoría Responsive (US1)

**Purpose**: Inventario, verificación por breakpoint, documentación.

- [ ] T001 [P] [US1] Crear/actualizar docs/RESPONSIVE_AUDIT.md con inventario de módulos y breakpoints xs/sm/md/xl
- [ ] T002 [US1] Verificar Auth (login) en viewports 375, 640, 768, 1280px: sin overflow, formulario usable
- [ ] T003 [US1] Verificar Dashboard layout (sidebar, Header, breadcrumb) en xs/sm/md/xl
- [ ] T004 [US1] Verificar módulo Negocios: StatsOverview, modales, tablas
- [ ] T005 [US1] Verificar módulo Pre-liquidación: ResultadosPreLiquidacion, PanelResumenArchivos, modales
- [ ] T006 [US1] Verificar módulo Carga archivos: ProcessingSummary, HistorialCargasTab
- [ ] T007 [US1] Verificar módulos Admin (tablas usuarios, categorías, empresas)
- [ ] T008 [US1] Verificar módulos Categorías, Empresas, Orígenes, Productos, Config. producto
- [ ] T009 [US1] Verificar Access denied
- [ ] T010 [US1] Completar matriz módulo × breakpoint en docs/RESPONSIVE_AUDIT.md con estado de cumplimiento

---

## Phase 2: Correcciones Responsive (US1)

**Purpose**: Aplicar correcciones detectadas en auditoría.

- [ ] T011 [US1] Layout: Sidebar trigger y menú usuario con touch target ≥44px en móvil
- [ ] T012 [US1] Layout: Breadcrumb con overflow controlado, título truncate
- [ ] T013 [US1] Tablas: DataTable y CrudTable con overflow-x-auto, filtros flex-col en móvil
- [ ] T014 [US1] Formularios: Inputs font-size ≥16px en móvil, Select triggers w-full sm:w-[180px]
- [ ] T015 [US1] Modales: Dialog con max-h-[90vh], overflow-y-auto, padding responsive; grids grid-cols-1 sm:grid-cols-2
- [ ] T016 [US1] Botones icon con min-h-[44px] min-w-[44px] en móvil

---

## Phase 3: Correos (US2)

**Purpose**: Sistema de diseño unificado y rediseño de correos.

- [ ] T017 [P] [US2] Crear email-template-base.ts con paleta, buildEmailTemplate, escapeHtml, EMAIL_BASE_STYLES
- [ ] T018 [US2] Admin notifications: aplicar escapeHtml a contenido dinámico
- [ ] T019 [US2] User activation: refactorizar a buildEmailTemplate, añadir logo, media queries
- [ ] T020 [US2] Preliquidación: rediseñar buildResumenPreliquidacionHtml con header/content/footer, tabla responsive, media queries
- [ ] T021 [US2] Preliquidación: crear generateResumenPreliquidacionPlainText y usarlo en sendResumenPreliquidacionEmail

---

## Phase 4: Tests (US3)

**Purpose**: Tests automáticos para validación.

- [ ] T022 [P] [US3] Crear/actualizar e2e/responsive.spec.ts con viewports 375, 640, 768px
- [ ] T023 [US3] Tests responsive: login sin overflow, dashboard sidebar trigger, menú usuario accesible
- [ ] T024 [P] [US3] Ejecutar tests unit de email: admin-notifications, user-activation, preliquidacion-resumen

---

## Phase 5: Documentación (US3)

**Purpose**: Documentación para verificación y onboarding.

- [ ] T025 [US3] Crear/actualizar docs/EMAIL_TESTING.md con checklist Gmail, Outlook, Apple Mail
- [ ] T026 [US3] Verificar docs/RESPONSIVE_AUDIT.md y docs/EMAIL_TESTING.md completos y actualizados
- [ ] T027 [US3] Ejecutar checklist specs/004-responsive-emails/checklists/responsive-emails-quality.md y cerrar gaps

---

## Phase 6: Polish

- [ ] T028 [P] Ejecutar `npm run test:unit` y `npm run lint`
- [ ] T029 [P] Ejecutar tests Playwright e2e/responsive.spec.ts
- [ ] T030 Actualizar Status del spec a Ready cuando todas las tareas críticas estén completas
