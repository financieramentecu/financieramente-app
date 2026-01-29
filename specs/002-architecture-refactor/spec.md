# Feature Specification: Mejora de Arquitectura - Refactorización hacia Feature-Based Architecture

**Feature Branch**: `002-architecture-refactor`  
**Created**: 2026-01-28  
**Status**: Draft  
**Input**: User description: "Mejora de arquitectura basada en auditoría: migración de código legacy desde src/services/ y src/lib/ a features, completar estructuras de features incompletos, eliminar uso de any, implementar readonly para inmutabilidad, y mejorar cobertura de tests"

## Clarifications

### Session 2026-01-28

- Q: ¿Qué estrategia seguir cuando existe código duplicado entre servicios legacy y features existentes? → A: Consolidar funcionalidad - comparar código legacy vs feature existente, mantener la mejor implementación, eliminar duplicación
- Q: ¿En qué orden deben ejecutarse las migraciones? → A: Migración incremental por dependencias - analizar dependencias, migrar servicios sin dependencias primero, luego dependientes, finalmente src/lib/
- Q: ¿Cómo validar que no hay regresiones funcionales después de cada migración? → A: Tests automatizados (unit + integration) + validación manual de flujos críticos de usuario después de cada migración
- Q: ¿Cómo manejar código en `src/lib/navigation/` y `src/lib/utils.ts` marcado como "evaluar"? → A: Evaluar caso por caso con criterios: si usado por 3+ features → `features/shared/`, si infraestructura global → `lib/`, si dominio específico → feature correspondiente
- Q: ¿Cuándo usar Factory Functions vs Plain Functions al migrar servicios legacy? → A: Factory functions solo cuando hay múltiples dependencias externas o necesidad de testing con mocks, plain functions para casos simples

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Migración de Servicios Legacy (Priority: P1)

Los desarrolladores necesitan que todo el código de dominio esté organizado por features siguiendo Feature-Based Architecture, eliminando la estructura legacy en `src/services/` que viola los principios de autocontención y organización por dominio.

**Why this priority**: Esta es la violación más crítica de la arquitectura objetivo. Los servicios legacy crean duplicación de código, dificultan el mantenimiento y violan el principio de autocontención de features. Es el bloqueador principal para alcanzar 100% de alineación arquitectónica.

**Independent Test**: Puede ser probado independientemente verificando que:
1. No existen archivos en `src/services/` después de la migración
2. Todos los imports que referenciaban servicios legacy han sido actualizados
3. Los tests pasan correctamente después de la migración
4. La funcionalidad existente sigue operando sin regresiones

**Acceptance Scenarios**:

1. **Given** que existen 5 servicios legacy en `src/services/` (company, currency, origin, periodicity, product), **When** se ejecuta la migración, **Then** todos los servicios han sido migrados a sus features correspondientes en `features/admin/[feature]/lib/[feature]-api.ts` y el directorio `src/services/` ha sido eliminado
2. **Given** que existen referencias a servicios legacy en el código, **When** se actualizan los imports, **Then** todas las referencias apuntan a las nuevas ubicaciones en features y no hay imports rotos
3. **Given** que existen tests para servicios legacy, **When** se migran los tests junto con el código, **Then** todos los tests pasan y están ubicados en `features/admin/[feature]/__tests__/`
4. **Given** que la aplicación está funcionando, **When** se completa la migración, **Then** no hay regresiones funcionales y todas las funcionalidades operan correctamente

---

### User Story 2 - Migración de Código de Dominio desde src/lib/ (Priority: P1)

Los desarrolladores necesitan que todo el código específico de dominio esté ubicado en features en lugar de `src/lib/`, manteniendo solo infraestructura global en `src/lib/`.

**Why this priority**: El código de dominio en `src/lib/` viola Feature-Based Architecture al no estar autocontenido en features. Esto dificulta encontrar código relacionado y mantiene una organización por tipo técnico en lugar de dominio. Es crítico para alcanzar 100% de código en ubicación correcta.

**Independent Test**: Puede ser probado independientemente verificando que:
1. `src/lib/auth/` ha sido migrado a `features/auth/lib/`
2. `src/lib/currency/` ha sido migrado a `features/admin/currencies/lib/`
3. `src/lib/email/` ha sido migrado a `features/email/lib/`
4. `src/lib/` solo contiene infraestructura global (api/client, prisma)
5. Todos los imports han sido actualizados y los tests migrados

**Acceptance Scenarios**:

1. **Given** que existe código de autenticación en `src/lib/auth/`, **When** se migra a `features/auth/lib/`, **Then** todos los archivos (user-creation, user-validation, password-utils, permissions, roles, audit-logger) están en el feature y los imports actualizados
2. **Given** que existen utilidades de moneda en `src/lib/currency/`, **When** se migran a `features/admin/currencies/lib/`, **Then** las funciones de formateo están en el feature correcto y los tests migrados
3. **Given** que existen notificaciones de email en `src/lib/email/`, **When** se consolidan en `features/email/lib/`, **Then** todo el código de email está autocontenido en el feature
4. **Given** que existen tests en `src/lib/[domain]/__tests__/`, **When** se migran junto con el código, **Then** los tests están en `features/[feature]/__tests__/` y pasan correctamente

---

### User Story 3 - Completar Estructura de Features Incompletos (Priority: P2)

Los desarrolladores necesitan que todos los features tengan una estructura completa y consistente siguiendo Feature-Based Architecture, con `components/`, `hooks/`, `lib/` (incluyendo schemas Zod), `types/`, `services/` (opcional), `mappers/` (opcional), y `__tests__/` según corresponda a cada feature.

**Why this priority**: Features incompletos dificultan la navegación del código y crean inconsistencias arquitectónicas. Aunque no es crítico como las migraciones, es importante para mantener estándares consistentes y facilitar el desarrollo futuro. La estructura completa asegura que cada feature tenga schemas Zod para validación y tipos inferidos correctamente.

**Independent Test**: Puede ser probado independientemente verificando que:
1. `features/admin/origins/` tiene `components/` y `hooks/` si se necesitan
2. `features/auth/` tiene estructura completa con `lib/` (incluyendo `auth-schemas.ts`), `hooks/`, `types/`, `__tests__/`
3. `features/pre-liquidacion/` tiene `lib/` con `pre-liquidacion-schemas.ts` para validación Zod y `types/` completos
4. Todos los features siguen la estructura estándar según sus necesidades, con schemas Zod donde se requiera validación

**Acceptance Scenarios**:

1. **Given** que `features/admin/origins/` solo tiene `lib/` y `types/`, **When** se completa la estructura, **Then** tiene `components/` y `hooks/` si son necesarios para la funcionalidad, y `lib/[feature]-schemas.ts` si requiere validación
2. **Given** que `features/auth/` solo tiene `components/`, **When** se completa la estructura después de migrar `lib/auth/`, **Then** tiene `lib/` con `auth-schemas.ts` para validación Zod, `hooks/`, `types/` con tipos inferidos de schemas usando `z.infer<typeof schema>`, y `__tests__/` completos
3. **Given** que `features/pre-liquidacion/` tiene `services/` pero falta `lib/` con schemas, **When** se completa, **Then** tiene `lib/pre-liquidacion-schemas.ts` con validaciones Zod para cliente y servidor, y `types/` con tipos inferidos de schemas

---

### User Story 4 - Eliminar Uso de `any` en TypeScript (Priority: P2)

Los desarrolladores necesitan type safety completo eliminando todas las ocurrencias de `any` en el código, reemplazándolas con tipos específicos o `unknown` con type guards.

**Why this priority**: El uso de `any` elimina los beneficios de TypeScript, permite errores en tiempo de ejecución y dificulta la refactorización. Aunque no bloquea funcionalidad, es importante para mantener calidad de código y prevenir bugs.

**Independent Test**: Puede ser probado independientemente verificando que:
1. No hay ocurrencias de `any` en código de producción
2. Las ocurrencias en tests son mínimas y justificadas
3. ESLint está configurado para prevenir nuevos `any`
4. El código mantiene type safety completo

**Acceptance Scenarios**:

1. **Given** que existen 43 ocurrencias de `any` en el código, **When** se reemplazan con tipos específicos, **Then** hay 0 ocurrencias en código de producción y mínimas en tests (solo cuando sea necesario)
2. **Given** que los archivos más afectados son tests, **When** se crean mocks tipados y tipos apropiados, **Then** los tests usan tipos específicos en lugar de `any`
3. **Given** que no hay regla ESLint para prevenir `any`, **When** se configura `@typescript-eslint/no-explicit-any`, **Then** nuevos `any` son detectados y bloqueados

---

### User Story 5 - Implementar Inmutabilidad con `readonly` (Priority: P3)

Los desarrolladores necesitan que las interfaces usen `readonly` apropiadamente para campos inmutables, especialmente IDs y campos de auditoría, siguiendo best practices de TypeScript.

**Why this priority**: La inmutabilidad previene bugs por mutación accidental y sigue best practices. Aunque es de menor prioridad que las migraciones críticas, mejora la calidad del código y facilita el mantenimiento a largo plazo.

**Independent Test**: Puede ser probado independientemente verificando que:
1. Las interfaces principales usan `readonly` en campos inmutables (IDs, createdAt, etc.)
2. Las convenciones están documentadas
3. El código nuevo sigue las convenciones

**Acceptance Scenarios**:

1. **Given** que las interfaces principales no usan `readonly`, **When** se auditan y actualizan, **Then** IDs y campos de auditoría (createdAt, updatedAt) son `readonly` cuando corresponda
2. **Given** que no hay documentación sobre convenciones de `readonly`, **When** se documentan, **Then** existe una guía clara sobre cuándo usar `readonly` en interfaces
3. **Given** que se crea código nuevo, **When** se siguen las convenciones documentadas, **Then** las interfaces nuevas usan `readonly` apropiadamente

---

### User Story 6 - Mejorar Cobertura de Tests (Priority: P3)

Los desarrolladores necesitan mejorar la cobertura de tests para alcanzar al menos 80% en business logic (utilidades, servicios, hooks), asegurando que hooks, funciones de negocio, schemas Zod y componentes complejos tengan tests adecuados.

**Why this priority**: Los tests son importantes para mantener calidad y prevenir regresiones, pero es de menor prioridad que las migraciones arquitectónicas críticas. Puede ejecutarse en paralelo con otras mejoras. La constitución requiere mínimo 80% de cobertura para business logic.

**Independent Test**: Puede ser probado independientemente verificando que:
1. Los features sin tests tienen tests básicos implementados en `__tests__/` colocalizados
2. Los hooks tienen tests de integración
3. Las funciones críticas de negocio tienen unit tests
4. Los schemas Zod tienen tests de validación
5. La cobertura alcanza al menos 80% en business logic (utilidades, servicios, hooks)

**Acceptance Scenarios**:

1. **Given** que `features/auth/` no tiene tests, **When** se implementan después de la migración, **Then** tiene tests básicos en `__tests__/` colocalizados cubriendo funcionalidad principal, incluyendo tests para schemas Zod
2. **Given** que `features/pre-liquidacion/` tiene baja cobertura, **When** se agregan tests, **Then** las funciones críticas tienen unit tests, los schemas Zod tienen tests de validación, y la cobertura alcanza al menos 80% en business logic
3. **Given** que algunos hooks no tienen tests, **When** se implementan integration tests, **Then** los hooks de data fetching tienen tests adecuados en `__tests__/` colocalizados

---

### Edge Cases

- ¿Qué sucede si un servicio legacy tiene dependencias circulares con otros servicios? Se debe analizar y refactorizar para eliminar dependencias circulares antes de migrar
- ¿Cómo se manejan los servicios legacy que están siendo usados en múltiples features? Se debe evaluar si deben estar en un feature compartido o si la lógica debe duplicarse/refactorizarse
- ¿Qué pasa si migrar código de `src/lib/` rompe imports en código legacy no migrado? Se debe crear un plan de migración incremental que actualice imports gradualmente
- ¿Cómo se manejan los tests que dependen de estructura legacy? Se deben migrar junto con el código o refactorizar para usar las nuevas ubicaciones
- ¿Qué sucede si hay código en `src/lib/` que es realmente infraestructura global vs código de dominio? Se debe evaluar caso por caso usando criterios: usado por 3+ features → `features/shared/`, infraestructura global → `lib/`, dominio específico → feature correspondiente, y documentar la decisión
- ¿Cómo se maneja código duplicado entre servicios legacy y features existentes? Se debe consolidar funcionalidad comparando ambas implementaciones, mantener la mejor versión, y eliminar duplicación antes de eliminar código legacy
- ¿En qué orden deben ejecutarse las migraciones? Se debe seguir un orden incremental basado en dependencias: analizar dependencias primero, migrar servicios sin dependencias, luego dependientes, finalmente `src/lib/`
- ¿Cómo se manejan servicios que requieren dependency injection? Se deben migrar usando factory functions solo cuando hay múltiples dependencias externas o necesidad de testing con mocks, usar plain functions para casos simples según la constitución
- ¿Qué sucede si código migrado no tiene schemas Zod pero requiere validación? Se deben crear schemas Zod en `lib/[feature]-schemas.ts` con validaciones para cliente y servidor, y usar type inference para generar tipos

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE eliminar completamente el directorio `src/services/` después de migrar todos los servicios legacy a sus features correspondientes
- **FR-002**: El sistema DEBE migrar cada servicio legacy (`company.service.ts`, `currency.service.ts`, `origin.service.ts`, `periodicity.service.ts`, `product.service.ts`) a `features/admin/[feature]/lib/[feature]-api.ts` usando plain functions (preferido) o factory functions cuando se requiera dependency injection
- **FR-002c**: El sistema DEBE usar factory functions solo cuando el servicio tiene múltiples dependencias externas o requiere testing con mocks, usar plain functions para casos simples con dependencias mínimas
- **FR-002a**: Cuando exista código duplicado entre servicios legacy y features existentes, el sistema DEBE consolidar funcionalidad comparando ambas implementaciones, mantener la mejor versión (más completa, actualizada o mejor estructurada), y eliminar la duplicación antes de eliminar el código legacy
- **FR-002b**: El sistema DEBE ejecutar migraciones en orden incremental basado en dependencias: primero analizar dependencias entre servicios legacy y código en `src/lib/`, luego migrar servicios sin dependencias, después servicios que dependen de los ya migrados, y finalmente migrar código desde `src/lib/`
- **FR-003**: El sistema DEBE actualizar todos los imports que referencian servicios legacy para apuntar a las nuevas ubicaciones en features
- **FR-004**: El sistema DEBE migrar código de dominio desde `src/lib/auth/` a `features/auth/lib/` incluyendo todos los archivos (user-creation, user-validation, password-utils, permissions, roles, audit-logger)
- **FR-005**: El sistema DEBE migrar código de dominio desde `src/lib/currency/` a `features/admin/currencies/lib/`
- **FR-006**: El sistema DEBE migrar código de dominio desde `src/lib/email/` a `features/email/lib/`
- **FR-007**: El sistema DEBE mantener solo infraestructura global en `src/lib/` (api/client, prisma)
- **FR-007a**: Para código en `src/lib/navigation/` y `src/lib/utils.ts` marcado como "evaluar", el sistema DEBE evaluar caso por caso usando criterios: si es usado por 3+ features → migrar a `features/shared/`, si es infraestructura global → mantener en `lib/`, si es específico de dominio → migrar a feature correspondiente
- **FR-008**: El sistema DEBE migrar tests junto con el código legacy, ubicándolos en `features/[feature]/__tests__/`
- **FR-009**: El sistema DEBE completar la estructura de `features/admin/origins/` agregando `components/` y `hooks/` si son necesarios
- **FR-010**: El sistema DEBE completar la estructura de `features/auth/` con `lib/`, `hooks/`, `types/`, y `__tests__/` después de migrar código desde `src/lib/auth/`
- **FR-011**: El sistema DEBE completar la estructura de `features/pre-liquidacion/` agregando `lib/` con `pre-liquidacion-schemas.ts` para validación Zod (cliente y servidor) y `types/` con tipos inferidos usando `z.infer<typeof schema>`
- **FR-011a**: El sistema DEBE asegurar que todos los features que requieren validación tengan schemas Zod en `lib/[feature]-schemas.ts` dentro de cada feature
- **FR-011b**: El sistema DEBE usar type inference desde schemas Zod (`z.infer<typeof schema>`) para generar tipos TypeScript en lugar de definir tipos manualmente
- **FR-012**: El sistema DEBE eliminar todas las ocurrencias de `any` en código de producción, reemplazándolas con tipos específicos o `unknown` con type guards
- **FR-013**: El sistema DEBE minimizar ocurrencias de `any` en tests, usando mocks tipados y tipos apropiados
- **FR-014**: El sistema DEBE configurar ESLint con la regla `@typescript-eslint/no-explicit-any` para prevenir nuevos `any`
- **FR-015**: El sistema DEBE aplicar `readonly` a campos inmutables en interfaces principales (IDs, createdAt, updatedAt cuando corresponda)
- **FR-016**: El sistema DEBE documentar convenciones sobre cuándo usar `readonly` en interfaces
- **FR-017**: El sistema DEBE mejorar cobertura de tests para alcanzar al menos 80% en business logic (utilidades, servicios, hooks) según la constitución del proyecto
- **FR-017a**: El sistema DEBE asegurar que todos los schemas Zod tengan tests de validación en `__tests__/` colocalizados
- **FR-018**: El sistema DEBE implementar tests para features que actualmente no tienen tests (`auth` después de migración, `pre-liquidacion`, etc.)
- **FR-019**: El sistema DEBE asegurar que todos los hooks tengan tests de integración adecuados
- **FR-020**: El sistema DEBE verificar que no hay regresiones funcionales después de cada migración mediante tests automatizados (unit + integration) y validación manual de flujos críticos de usuario

### Key Entities *(include if feature involves data)*

- **Servicio Legacy**: Representa código de negocio organizado por tipo técnico en `src/services/`. Debe migrarse a features organizados por dominio. Atributos clave: nombre del servicio, feature destino, dependencias, tests asociados
- **Código de Dominio en lib/**: Representa código específico de dominio ubicado incorrectamente en `src/lib/`. Debe migrarse a features correspondientes. Atributos clave: ruta actual, feature destino, tipo de código (auth, currency, email), tests asociados
- **Feature Incompleto**: Representa un feature que no tiene la estructura completa requerida según Feature-Based Architecture. Debe completarse con directorios faltantes según necesidades. Estructura objetivo incluye: `types/`, `lib/` (con `[feature]-api.ts` y `[feature]-schemas.ts`), `components/` (opcional), `hooks/` (opcional), `services/` (opcional, solo si se necesita), `mappers/` (opcional), `__tests__/`. Atributos clave: feature name, estructura actual, estructura objetivo, componentes faltantes, schemas Zod faltantes
- **Ocurrencia de `any`**: Representa uso de tipo `any` que elimina type safety. Debe reemplazarse con tipos específicos o `unknown` con type guards. Atributos clave: archivo, línea, contexto, tipo apropiado sugerido
- **Interface sin `readonly`**: Representa interfaces que deberían usar `readonly` en campos inmutables. Debe actualizarse siguiendo convenciones de la constitución. Atributos clave: interface name, campos inmutables identificados (IDs, createdAt, etc.), campos mutables
- **Schema Zod Faltante**: Representa código que requiere validación pero no tiene schema Zod. Debe crearse `lib/[feature]-schemas.ts` con validaciones para cliente y servidor, y tipos inferidos usando `z.infer<typeof schema>`. Atributos clave: feature name, código que requiere validación, tipo de validación necesaria

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de los servicios legacy (5 archivos) han sido migrados desde `src/services/` a features y el directorio `src/services/` ha sido eliminado completamente
- **SC-002**: 100% del código de dominio ha sido migrado desde `src/lib/[domain]/` a features correspondientes, dejando solo infraestructura global en `src/lib/`
- **SC-003**: 100% de los imports que referenciaban código legacy han sido actualizados para apuntar a las nuevas ubicaciones en features
- **SC-004**: 100% de los features tienen estructura completa según sus necesidades (todos los features incompletos identificados han sido completados)
- **SC-005**: 0 ocurrencias de `any` en código de producción (máximo 5 ocurrencias justificadas en tests)
- **SC-006**: ESLint está configurado con `@typescript-eslint/no-explicit-any` como error, previniendo nuevos `any` en el código
- **SC-007**: Al menos 80% de las interfaces principales usan `readonly` apropiadamente en campos inmutables (IDs, createdAt, etc.)
- **SC-008**: Convenciones de `readonly` están documentadas y disponibles para desarrolladores
- **SC-009**: Cobertura de tests alcanza al menos 80% en business logic (utilidades, servicios, hooks) según la constitución del proyecto
- **SC-009a**: Todos los schemas Zod tienen tests de validación en `__tests__/` colocalizados dentro de cada feature
- **SC-010**: Todos los features migrados tienen tests en `__tests__/` y todos los tests pasan correctamente
- **SC-011**: No hay regresiones funcionales después de las migraciones - todas las funcionalidades existentes operan correctamente, validado mediante tests automatizados pasando y validación manual de flujos críticos de usuario
- **SC-012**: Métricas de calidad del código mejoran: Features bien estructurados de 67% a 100%, código en ubicación correcta de 75% a 100%, type safety de 95% a 100%

## Assumptions

- Los servicios legacy en `src/services/` tienen funcionalidad equivalente o pueden consolidarse con código existente en features, y pueden migrarse como plain functions (preferido) o factory functions cuando se requiera dependency injection
- El código en `src/lib/[domain]/` puede migrarse sin cambios funcionales significativos, solo cambios de ubicación e imports
- Los features incompletos pueden completarse sin agregar funcionalidad nueva, solo estructura organizacional incluyendo schemas Zod donde se requiera validación
- Los schemas Zod pueden crearse para código que actualmente no tiene validación, usando `z.infer<typeof schema>` para type inference
- La eliminación de `any` no requerirá cambios funcionales, solo mejoras de tipos
- La implementación de `readonly` es principalmente cosmética y no afectará la funcionalidad existente, pero sigue las convenciones de la constitución
- Los tests pueden escribirse sin cambios en la funcionalidad subyacente, y deben alcanzar 80% de cobertura en business logic según la constitución
- El equipo tiene capacidad para ejecutar migraciones incrementales sin bloquear desarrollo de nuevas features
- No hay dependencias externas críticas que requieran los servicios legacy en su ubicación actual
- Los schemas Zod pueden usarse tanto para validación en cliente como en servidor según la constitución

## Dependencies

- Acceso a código fuente completo en `src/services/`, `src/lib/`, y `src/features/`
- Capacidad de ejecutar tests para validar migraciones
- Herramientas de búsqueda y reemplazo para actualizar imports masivamente
- Documentación de arquitectura actualizada (constitución) para guiar migraciones según Feature-Based Architecture
- ESLint configurado y funcionando para validar reglas de `any`
- Biblioteca Zod disponible para crear schemas de validación
- Conocimiento de type inference con `z.infer<typeof schema>` para generar tipos TypeScript desde schemas Zod

## Out of Scope

- Refactorización funcional de código legacy (solo migración de ubicación)
- Creación de nueva funcionalidad en features incompletos (solo completar estructura)
- Cambios en la lógica de negocio de servicios migrados
- Migración de código de infraestructura global (`lib/api/client.ts`, `lib/prisma.ts`)
- Mejora de performance o optimización de código migrado
- Cambios en la estructura de base de datos o esquemas Prisma
- Implementación de nuevas features durante la refactorización
