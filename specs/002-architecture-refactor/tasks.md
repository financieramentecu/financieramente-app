# Tasks: Mejora de Arquitectura - Refactorización hacia Feature-Based Architecture

**Input**: Design documents from `/specs/002-architecture-refactor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests incluidos para validar migraciones y asegurar que no hay regresiones.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- **Web app**: Next.js App Router structure

---

## Phase 1: Setup (Preparación y Análisis)

**Purpose**: Preparar entorno y analizar código existente antes de migraciones

- [ ] T001 Analizar dependencias entre servicios legacy en `src/services/` y crear mapa de dependencias
- [ ] T002 [P] Identificar todas las referencias a servicios legacy usando `grep -r "from '@/services" src/`
- [ ] T003 [P] Identificar tests existentes para servicios legacy en `src/services/` y `src/app/api/__tests__/`
- [ ] T004 [P] Comparar código legacy vs código existente en features para identificar duplicación (ej: `src/services/product.service.ts` vs `src/features/admin/products/lib/product-api.ts`)
- [ ] T005 Analizar código en `src/lib/navigation/` y `src/lib/utils.ts` para determinar destino según criterios (3+ features → shared, infraestructura → lib, dominio → feature)
- [ ] T006 Crear script de búsqueda/reemplazo para actualizar imports masivamente

---

## Phase 2: Foundational (Bloqueadores Críticos)

**Purpose**: Configuraciones y herramientas que deben estar listas antes de migraciones

**⚠️ CRITICAL**: No se puede comenzar migraciones hasta completar esta fase

- [ ] T007 Configurar ESLint con regla `@typescript-eslint/no-explicit-any` como error en `eslint.config.mjs`
- [ ] T008 [P] Verificar que TypeScript strict mode está habilitado en `tsconfig.json`
- [ ] T009 [P] Verificar que suite de tests ejecuta correctamente con `npm run test:all`
- [ ] T010 Crear checklist de validación para cada migración basado en `contracts/migration-steps.md`

**Checkpoint**: Foundation ready - migraciones pueden comenzar

---

## Phase 3: User Story 1 - Migración de Servicios Legacy (Priority: P1) 🎯 MVP

**Goal**: Migrar todos los servicios legacy desde `src/services/` a features correspondientes, eliminando el directorio legacy y actualizando todos los imports.

**Independent Test**: Verificar que:
1. No existen archivos en `src/services/` después de la migración
2. Todos los imports actualizados apuntan a nuevas ubicaciones
3. Todos los tests pasan
4. No hay regresiones funcionales

### Migración de currency.service.ts (Primero - más simple)

- [ ] T011 [US1] Comparar `src/services/currency.service.ts` con `src/features/admin/currencies/lib/currency-api.ts` para identificar duplicación
- [ ] T012 [US1] Consolidar código duplicado manteniendo mejor versión en `src/features/admin/currencies/lib/currency-api.ts` (si aplica)
- [ ] T013 [US1] Migrar código de `src/services/currency.service.ts` a `src/features/admin/currencies/lib/currency-api.ts` como plain function
- [ ] T014 [US1] Actualizar imports de `@/services/currency.service` a `@/features/admin/currencies/lib/currency-api` en todos los archivos afectados
- [ ] T015 [US1] Migrar tests relacionados con currency a `src/features/admin/currencies/__tests__/` y actualizar imports
- [ ] T016 [US1] Ejecutar tests y validar que pasan: `npm run test`
- [ ] T017 [US1] Validar manualmente flujos que usan currency service
- [ ] T018 [US1] Eliminar `src/services/currency.service.ts` después de validación exitosa

### Migración de periodicity.service.ts

- [ ] T019 [US1] Comparar `src/services/periodicity.service.ts` con `src/features/admin/periodicities/lib/periodicity-api.ts` para identificar duplicación
- [ ] T020 [US1] Consolidar código duplicado manteniendo mejor versión en `src/features/admin/periodicities/lib/periodicity-api.ts` (si aplica)
- [ ] T021 [US1] Migrar código de `src/services/periodicity.service.ts` a `src/features/admin/periodicities/lib/periodicity-api.ts` como plain function
- [ ] T022 [US1] Actualizar imports de `@/services/periodicity.service` a `@/features/admin/periodicities/lib/periodicity-api` en todos los archivos afectados
- [ ] T023 [US1] Migrar tests relacionados con periodicity a `src/features/admin/periodicities/__tests__/` y actualizar imports
- [ ] T024 [US1] Ejecutar tests y validar que pasan: `npm run test`
- [ ] T025 [US1] Validar manualmente flujos que usan periodicity service
- [ ] T026 [US1] Eliminar `src/services/periodicity.service.ts` después de validación exitosa

### Migración de origin.service.ts

- [ ] T027 [US1] Comparar `src/services/origin.service.ts` con `src/features/admin/origins/lib/origin-api.ts` para identificar duplicación
- [ ] T028 [US1] Consolidar código duplicado manteniendo mejor versión en `src/features/admin/origins/lib/origin-api.ts` (si aplica)
- [ ] T029 [US1] Migrar código de `src/services/origin.service.ts` a `src/features/admin/origins/lib/origin-api.ts` como plain function
- [ ] T030 [US1] Actualizar imports de `@/services/origin.service` a `@/features/admin/origins/lib/origin-api` en todos los archivos afectados
- [ ] T031 [US1] Migrar tests relacionados con origin a `src/features/admin/origins/__tests__/` y actualizar imports
- [ ] T032 [US1] Ejecutar tests y validar que pasan: `npm run test`
- [ ] T033 [US1] Validar manualmente flujos que usan origin service
- [ ] T034 [US1] Eliminar `src/services/origin.service.ts` después de validación exitosa

### Migración de company.service.ts

- [ ] T035 [US1] Comparar `src/services/company.service.ts` con `src/features/admin/companies/lib/company-api.ts` para identificar duplicación
- [ ] T036 [US1] Consolidar código duplicado manteniendo mejor versión en `src/features/admin/companies/lib/company-api.ts` (si aplica)
- [ ] T037 [US1] Migrar código de `src/services/company.service.ts` a `src/features/admin/companies/lib/company-api.ts` como plain function
- [ ] T038 [US1] Actualizar imports de `@/services/company.service` a `@/features/admin/companies/lib/company-api` en todos los archivos afectados
- [ ] T039 [US1] Migrar tests relacionados con company a `src/features/admin/companies/__tests__/` y actualizar imports
- [ ] T040 [US1] Ejecutar tests y validar que pasan: `npm run test`
- [ ] T041 [US1] Validar manualmente flujos que usan company service
- [ ] T042 [US1] Eliminar `src/services/company.service.ts` después de validación exitosa

### Migración de product.service.ts (Último - más usado)

- [ ] T043 [US1] Comparar `src/services/product.service.ts` con `src/features/admin/products/lib/product-api.ts` para identificar duplicación
- [ ] T044 [US1] Consolidar código duplicado manteniendo mejor versión en `src/features/admin/products/lib/product-api.ts` (si aplica)
- [ ] T045 [US1] Migrar código de `src/services/product.service.ts` a `src/features/admin/products/lib/product-api.ts` como plain function
- [ ] T046 [US1] Actualizar imports de `@/services/product.service` a `@/features/admin/products/lib/product-api` en todos los archivos afectados
- [ ] T047 [US1] Migrar tests relacionados con product a `src/features/admin/products/__tests__/` y actualizar imports
- [ ] T048 [US1] Ejecutar tests y validar que pasan: `npm run test`
- [ ] T049 [US1] Validar manualmente flujos críticos que usan product service (crear/editar productos, crear/editar negocios)
- [ ] T050 [US1] Eliminar `src/services/product.service.ts` después de validación exitosa

### Limpieza Final de src/services/

- [ ] T051 [US1] Verificar que `src/services/` está vacío: `ls src/services/`
- [ ] T052 [US1] Eliminar directorio `src/services/` si está vacío: `rmdir src/services/`
- [ ] T053 [US1] Verificar que no quedan referencias a `src/services/` en el código: `grep -r "services/" src/`
- [ ] T054 [US1] Ejecutar suite completa de tests: `npm run test:all`
- [ ] T055 [US1] Validar manualmente todos los flujos críticos de la aplicación

**Checkpoint**: User Story 1 completa - todos los servicios legacy migrados, `src/services/` eliminado, tests pasando, sin regresiones

---

## Phase 4: User Story 2 - Migración de Código de Dominio desde src/lib/ (Priority: P1)

**Goal**: Migrar código específico de dominio desde `src/lib/[domain]/` a features correspondientes, dejando solo infraestructura global en `src/lib/`.

**Independent Test**: Verificar que:
1. `src/lib/auth/` migrado a `features/auth/lib/`
2. `src/lib/currency/` migrado a `features/admin/currencies/lib/`
3. `src/lib/email/` migrado a `features/email/lib/`
4. `src/lib/` solo contiene infraestructura global (api/client, prisma)
5. Todos los imports actualizados y tests migrados

### Migración de src/lib/auth/ → features/auth/lib/

- [x] T056 [US2] Crear estructura en `src/features/auth/lib/` si no existe: `mkdir -p src/features/auth/lib`
- [x] T057 [US2] Crear estructura en `src/features/auth/types/` si no existe: `mkdir -p src/features/auth/types`
- [x] T058 [US2] Migrar archivos desde `src/lib/auth/` a `src/features/auth/lib/` (user-creation.ts, user-validation.ts, password-utils.ts, permissions.ts, roles.ts, audit-logger.ts)
- [x] T059 [US2] Migrar `src/lib/auth/types.ts` a `src/features/auth/types/auth.types.ts` si existe
- [x] T060 [US2] Migrar tests desde `src/lib/auth/__tests__/` a `src/features/auth/__tests__/` y actualizar imports
- [x] T061 [US2] Actualizar imports de `@/lib/auth/` a `@/features/auth/lib/` en todo el proyecto
- [x] T062 [US2] Ejecutar tests y validar que pasan: `npm run test`
- [x] T063 [US2] Validar manualmente flujos de autenticación
- [x] T064 [US2] Eliminar `src/lib/auth/` después de validación exitosa: `rm -rf src/lib/auth/`

### Migración de src/lib/currency/ → features/admin/currencies/lib/

- [x] T065 [US2] Migrar funciones de formateo desde `src/lib/currency/index.ts` a `src/features/admin/currencies/lib/currency-formatters.ts`
- [x] T066 [US2] Migrar tests desde `src/lib/currency/__tests__/` a `src/features/admin/currencies/__tests__/` y actualizar imports
- [x] T067 [US2] Actualizar imports de `@/lib/currency/` a `@/features/admin/currencies/lib/` en todo el proyecto
- [x] T068 [US2] Ejecutar tests y validar que pasan: `npm run test`
- [x] T069 [US2] Eliminar `src/lib/currency/` después de validación exitosa: `rm -rf src/lib/currency/`

### Migración de src/lib/email/ → features/email/lib/

- [x] T070 [US2] Consolidar código desde `src/lib/email/` con código existente en `src/features/email/lib/`
- [x] T071 [US2] Migrar `src/lib/email/admin-notifications.ts` a `src/features/email/lib/admin-notifications.ts`
- [x] T072 [US2] Migrar `src/lib/email/user-activation-notification.ts` a `src/features/email/lib/user-activation-notification.ts`
- [x] T073 [US2] Migrar tests desde `src/lib/email/__tests__/` a `src/features/email/__tests__/` y actualizar imports
- [x] T074 [US2] Actualizar imports de `@/lib/email/` a `@/features/email/lib/` en todo el proyecto
- [x] T075 [US2] Ejecutar tests y validar que pasan: `npm run test`
- [x] T076 [US2] Eliminar `src/lib/email/` después de validación exitosa: `rm -rf src/lib/email/`

### Evaluación y Migración de Código en Evaluación

- [x] T077 [US2] Evaluar `src/lib/navigation/` según criterios: contar features que lo usan, determinar destino (shared/lib, lib/, o feature específico)
- [x] T078 [US2] Migrar `src/lib/navigation/` a destino determinado según evaluación (si no es infraestructura)
- [x] T079 [US2] Evaluar `src/lib/utils.ts` según criterios: si solo tiene `cn()` mantener en lib/, si tiene más lógica evaluar destino
- [x] T080 [US2] Migrar `src/lib/utils.ts` a destino determinado según evaluación (si no es infraestructura)
- [x] T081 [US2] Verificar que `src/lib/` solo contiene infraestructura global (api/client.ts, prisma.ts)
- [x] T082 [US2] Ejecutar suite completa de tests: `npm run test:all`
- [x] T083 [US2] Validar manualmente flujos críticos de la aplicación

**Checkpoint**: User Story 2 completa - código de dominio migrado desde `src/lib/`, solo infraestructura global permanece, tests pasando, sin regresiones

---

## Phase 5: User Story 3 - Completar Estructura de Features Incompletos (Priority: P2)

**Goal**: Completar estructura de features incompletos (origins, auth, pre-liquidacion) con directorios faltantes según Feature-Based Architecture.

**Independent Test**: Verificar que:
1. `features/admin/origins/` tiene estructura completa (components/, hooks/ si necesarios)
2. `features/auth/` tiene estructura completa (lib/, hooks/, types/, __tests__/)
3. `features/pre-liquidacion/` tiene estructura completa (lib/ con schemas, types/)
4. Todos los features siguen estructura estándar según necesidades

### Completar features/admin/origins/

- [x] T084 [US3] Evaluar si `src/features/admin/origins/` necesita `components/` revisando funcionalidad existente
- [x] T085 [US3] Crear `src/features/admin/origins/components/` si es necesario: `mkdir -p src/features/admin/origins/components`
- [x] T086 [US3] Evaluar si `src/features/admin/origins/` necesita `hooks/` revisando funcionalidad existente
- [x] T087 [US3] Crear `src/features/admin/origins/hooks/` si es necesario: `mkdir -p src/features/admin/origins/hooks`
- [x] T088 [US3] Crear hooks necesarios en `src/features/admin/origins/hooks/` si se requiere (ej: use-origins.ts, use-origin-mutations.ts)
- [x] T089 [US3] Crear `src/features/admin/origins/lib/origins-schemas.ts` con schemas Zod si se requiere validación
- [x] T090 [US3] Validar estructura completa de `src/features/admin/origins/`

### Completar features/auth/ (después de migración de lib/auth/)

- [x] T091 [US3] Crear `src/features/auth/lib/auth-schemas.ts` con schemas Zod para validación (login, registro, etc.)
- [x] T092 [US3] Exportar tipos desde schemas usando `z.infer<typeof schema>` en `src/features/auth/lib/auth-schemas.ts`
- [x] T093 [US3] Crear `src/features/auth/hooks/` si no existe: `mkdir -p src/features/auth/hooks`
- [x] T094 [US3] Crear hooks necesarios en `src/features/auth/hooks/` (ej: use-auth.ts, use-session.ts)
- [x] T095 [US3] Asegurar que `src/features/auth/types/` tiene todos los tipos necesarios (migrados desde lib/auth/types.ts)
- [x] T096 [US3] Asegurar que `src/features/auth/__tests__/` existe y tiene tests básicos
- [x] T097 [US3] Validar estructura completa de `src/features/auth/`

### Completar features/pre-liquidacion/

- [x] T098 [US3] Crear `src/features/pre-liquidacion/lib/` si no existe: `mkdir -p src/features/pre-liquidacion/lib`
- [x] T099 [US3] Crear `src/features/pre-liquidacion/lib/pre-liquidacion-schemas.ts` con schemas Zod para validación (cliente y servidor)
- [x] T100 [US3] Exportar tipos desde schemas usando `z.infer<typeof schema>` en `src/features/pre-liquidacion/lib/pre-liquidacion-schemas.ts`
- [x] T101 [US3] Crear `src/features/pre-liquidacion/types/` si no existe: `mkdir -p src/features/pre-liquidacion/types`
- [x] T102 [US3] Crear `src/features/pre-liquidacion/types/pre-liquidacion.types.ts` con tipos necesarios o inferir desde schemas
- [x] T103 [US3] Validar estructura completa de `src/features/pre-liquidacion/`
- [x] T104 [US3] Ejecutar tests y validar que pasan: `npm run test`

**Checkpoint**: User Story 3 completa - todos los features incompletos tienen estructura completa según Feature-Based Architecture

---

## Phase 6: User Story 4 - Eliminar Uso de `any` en TypeScript (Priority: P2)

**Goal**: Eliminar todas las ocurrencias de `any` en código de producción, reemplazándolas con tipos específicos o `unknown` con type guards.

**Independent Test**: Verificar que:
1. 0 ocurrencias de `any` en código de producción
2. Mínimas ocurrencias en tests (solo cuando justificado)
3. ESLint configurado previene nuevos `any`
4. Type safety completo mantenido

### Auditoría y Priorización

- [x] T105 [US4] Encontrar todas las ocurrencias de `any` en código de producción: `grep -r ":\s*any" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v ".test.ts"`
- [x] T106 [US4] Categorizar ocurrencias por prioridad (high: producción crítica, medium: producción no crítica, low: tests)
- [x] T107 [US4] Crear lista de tareas para cada ocurrencia con tipo sugerido

### Reemplazo de `any` en Código de Producción (Prioridad High)

- [x] T108 [US4] Reemplazar `any` en archivos de producción críticos (empezar con los más afectados según auditoría)
- [x] T109 [US4] Usar tipos específicos o `unknown` con type guards según contexto
- [x] T110 [US4] Validar que TypeScript compila sin errores después de cada reemplazo: `npm run type-check`
- [x] T111 [US4] Ejecutar tests relacionados después de cada reemplazo: `npm run test`

### Reemplazo de `any` en Código de Producción (Prioridad Medium)

- [x] T112 [US4] Reemplazar `any` en archivos de producción no críticos
- [x] T113 [US4] Validar que TypeScript compila sin errores: `npm run type-check`
- [x] T114 [US4] Ejecutar tests: `npm run test`

### Reemplazo de `any` en Tests (Prioridad Low)

- [x] T115 [US4] Revisar ocurrencias de `any` en tests y reemplazar con mocks tipados cuando sea posible
- [x] T116 [US4] Mantener solo ocurrencias justificadas en tests (máximo 5 según spec)
- [x] T117 [US4] Documentar justificación para cada `any` restante en tests

### Validación Final

- [x] T118 [US4] Verificar que ESLint detecta nuevos `any`: `npm run lint`
- [x] T119 [US4] Verificar que no hay `any` en código de producción: `grep -r ":\s*any" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v ".test.ts" | wc -l` debe ser 0
- [x] T120 [US4] Ejecutar suite completa de tests: `npm run test:all`
- [x] T121 [US4] Validar que type safety completo se mantiene: `npm run type-check`

**Checkpoint**: User Story 4 completa - 0 `any` en producción, ESLint configurado, type safety completo

---

## Phase 7: User Story 5 - Implementar Inmutabilidad con `readonly` (Priority: P3)

**Goal**: Aplicar `readonly` apropiadamente en interfaces principales para campos inmutables (IDs, createdAt, etc.).

**Independent Test**: Verificar que:
1. Al menos 80% de interfaces principales usan `readonly` en campos inmutables
2. Convenciones documentadas
3. Código nuevo sigue convenciones

### Auditoría de Interfaces

- [x] T122 [US5] Encontrar interfaces principales en `src/features/`: `find src/features -name "*.ts" -exec grep -l "interface" {} \;`
- [x] T123 [US5] Identificar campos inmutables en cada interface (IDs, createdAt, updatedAt cuando corresponda)
- [x] T124 [US5] Crear lista de interfaces a actualizar con campos identificados

### Aplicar `readonly`

- [x] T125 [US5] Aplicar `readonly` a campos inmutables en interfaces principales (empezar con las más usadas)
- [x] T126 [US5] Validar que TypeScript compila sin errores después de cada actualización: `npm run type-check`
- [x] T127 [US5] Ejecutar tests después de cada actualización: `npm run test`

### Documentación de Convenciones

- [x] T128 [US5] Crear guía de convenciones sobre cuándo usar `readonly` en interfaces
- [x] T129 [US5] Documentar ejemplos de uso correcto de `readonly` en `docs/` o `.cursor/rules/`
- [x] T130 [US5] Validar que al menos 80% de interfaces principales usan `readonly` apropiadamente

**Checkpoint**: User Story 5 completa - `readonly` aplicado, convenciones documentadas

---

## Phase 8: User Story 6 - Mejorar Cobertura de Tests (Priority: P3)

**Goal**: Mejorar cobertura de tests a al menos 80% en business logic (utilidades, servicios, hooks).

**Independent Test**: Verificar que:
1. Features sin tests tienen tests básicos
2. Hooks tienen tests de integración
3. Schemas Zod tienen tests de validación
4. Cobertura alcanza 80% en business logic

### Identificar Gaps de Cobertura

- [x] T131 [US6] Ejecutar cobertura de tests: `npm run test:coverage`
- [x] T132 [US6] Identificar features con baja cobertura en business logic
- [x] T133 [US6] Identificar hooks sin tests
- [x] T134 [US6] Identificar schemas Zod sin tests de validación

### Implementar Tests para features/auth/ (después de migración)

- [x] T135 [US6] Crear tests básicos en `src/features/auth/__tests__/` para funciones principales
- [x] T136 [US6] Crear tests para schemas Zod en `src/features/auth/__tests__/auth-schemas.test.ts`
- [x] T137 [US6] Crear tests de validación para schemas en `src/features/auth/__tests__/auth-schemas.test.ts`
- [x] T138 [US6] Validar que tests pasan: `npm run test`

### Implementar Tests para features/pre-liquidacion/

- [x] T139 [US6] Crear unit tests para funciones críticas en `src/features/pre-liquidacion/__tests__/`
- [x] T140 [US6] Crear tests de validación para schemas Zod en `src/features/pre-liquidacion/__tests__/pre-liquidacion-schemas.test.ts`
- [x] T141 [US6] Validar que tests pasan: `npm run test`

### Implementar Tests para Hooks

- [x] T142 [US6] Crear integration tests para hooks de data fetching en `src/features/[feature]/__tests__/hooks/`
- [x] T143 [US6] Crear tests para hooks en `src/features/auth/hooks/` si existen
- [x] T144 [US6] Crear tests para hooks en `src/features/admin/origins/hooks/` si existen
- [x] T145 [US6] Validar que tests pasan: `npm run test`

### Validación de Cobertura

- [x] T146 [US6] Ejecutar cobertura de tests nuevamente: `npm run test:coverage`
- [x] T147 [US6] Verificar que cobertura alcanza al menos 80% en business logic (utilidades, servicios, hooks)
- [x] T148 [US6] Identificar y cubrir gaps restantes si cobertura es menor a 80%
- [x] T149 [US6] Ejecutar suite completa de tests: `npm run test:all`

**Checkpoint**: User Story 6 completa - cobertura ≥ 80% en business logic, tests para hooks y schemas Zod

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Validación final y mejoras que afectan múltiples user stories

- [x] T150 Ejecutar validación completa según `quickstart.md`: verificar todas las fases completadas
- [x] T151 [P] Ejecutar suite completa de tests: `npm run test:all`
- [x] T152 [P] Ejecutar type checking: `npm run type-check`
- [x] T153 [P] Ejecutar linting: `npm run lint`
- [x] T154 Validar manualmente todos los flujos críticos de la aplicación (crear/editar productos, crear/editar negocios, operaciones administrativas, autenticación)
- [x] T155 Verificar métricas finales: 0 archivos en `src/services/`, `src/lib/` solo infraestructura, 0 `any` en producción, 80% cobertura
- [x] T156 Documentar cambios arquitectónicos en `docs/` si es necesario
- [x] T157 Actualizar `.gitignore` si se eliminaron directorios
- [x] T158 Crear commit con mensaje siguiendo conventional commits: `refactor(architecture): migrate legacy code to feature-based structure`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - Migrar servicios legacy
- **User Story 2 (Phase 4)**: Depends on Foundational - Puede ejecutarse en paralelo con US1 después de Foundational
- **User Story 3 (Phase 5)**: Depends on US2 (necesita lib/auth migrado) - Completar estructuras
- **User Story 4 (Phase 6)**: Depends on US1, US2, US3 - Eliminar `any` en código migrado
- **User Story 5 (Phase 7)**: Depends on US1, US2, US3 - Aplicar `readonly` en interfaces migradas
- **User Story 6 (Phase 8)**: Depends on US1, US2, US3 - Tests para código migrado
- **Polish (Phase 9)**: Depends on all user stories completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Can run in parallel with US1
- **User Story 3 (P2)**: Depends on US2 completion (needs lib/auth migrated) - Completes structures
- **User Story 4 (P2)**: Depends on US1, US2, US3 - Works on migrated code
- **User Story 5 (P3)**: Depends on US1, US2, US3 - Works on migrated interfaces
- **User Story 6 (P3)**: Depends on US1, US2, US3 - Tests migrated code

### Within Each User Story

- Migración de código antes de actualizar imports
- Actualizar imports antes de eliminar código legacy
- Migrar tests junto con código
- Validar después de cada migración antes de continuar
- Eliminar código legacy solo después de validación completa

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- Foundational tasks marked [P] can run in parallel (within Phase 2)
- User Stories 1 and 2 can run in parallel after Foundational (different services/domains)
- Within US1: Migraciones de servicios diferentes pueden hacerse secuencialmente (no en paralelo por dependencias de validación)
- Within US2: Migraciones de diferentes dominios (auth, currency, email) pueden hacerse en paralelo después de análisis
- User Stories 4, 5, 6 can run in parallel after US1, US2, US3 complete (different concerns)

---

## Parallel Example: User Story 1

```bash
# Migraciones deben hacerse secuencialmente para validar cada una:
# 1. Migrar currency.service.ts → validar → continuar
# 2. Migrar periodicity.service.ts → validar → continuar
# 3. Migrar origin.service.ts → validar → continuar
# 4. Migrar company.service.ts → validar → continuar
# 5. Migrar product.service.ts → validar → continuar
# 6. Eliminar src/services/
```

---

## Parallel Example: User Story 2

```bash
# Después de análisis, migraciones de diferentes dominios pueden hacerse en paralelo:
# Task: Migrar src/lib/auth/ → features/auth/lib/
# Task: Migrar src/lib/currency/ → features/admin/currencies/lib/
# Task: Migrar src/lib/email/ → features/email/lib/
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Migración de Servicios Legacy)
4. **STOP and VALIDATE**: Verificar que servicios legacy migrados, `src/services/` eliminado, tests pasando, sin regresiones
5. Deploy/demo si ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Stories 4, 5, 6 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (servicios legacy)
   - Developer B: User Story 2 (código desde lib/) - después de análisis
3. Once US1 and US2 complete:
   - Developer A: User Story 3 (completar estructuras)
   - Developer B: User Story 4 (eliminar `any`)
   - Developer C: User Story 5 (implementar `readonly`)
   - Developer D: User Story 6 (mejorar tests)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Validate after each migration before continuing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Migraciones deben hacerse incrementalmente con validación después de cada paso
- No eliminar código legacy hasta validación completa exitosa
