# Implementation Plan: Mejora de Arquitectura - Refactorización hacia Feature-Based Architecture

**Branch**: `002-architecture-refactor` | **Date**: 2026-01-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-architecture-refactor/spec.md`

## Summary

Refactorización arquitectónica para migrar código legacy desde `src/services/` y `src/lib/` a features siguiendo Feature-Based Architecture, completar estructuras de features incompletos, eliminar uso de `any`, implementar `readonly` para inmutabilidad, y mejorar cobertura de tests a 80% en business logic. El enfoque técnico utiliza migración incremental basada en dependencias, consolidación de código duplicado, y validación mediante tests automatizados + validación manual de flujos críticos.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20+  
**Primary Dependencies**: Next.js 15, React 19, Prisma ORM, Zod, Vitest, Testing Library, ESLint  
**Storage**: PostgreSQL 15 (no cambios en estructura de BD)  
**Testing**: Vitest (unit + integration), Testing Library (component), Playwright (E2E)  
**Target Platform**: Web application (Next.js App Router), Node.js runtime  
**Project Type**: Web application (single project with Next.js App Router)  
**Performance Goals**: Mantener performance actual - migraciones no deben degradar tiempos de respuesta  
**Constraints**: 
- No cambios funcionales - solo migración de ubicación
- No romper imports existentes durante migración incremental
- Mantener compatibilidad con código existente durante transición
- Tests deben pasar después de cada migración  
**Scale/Scope**: 
- 5 servicios legacy en `src/services/`
- ~15 archivos en `src/lib/` a migrar
- 43 ocurrencias de `any` a reemplazar
- 3 features incompletos a completar
- Cobertura de tests objetivo: 80% en business logic

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check

✅ **Feature-Based Architecture**: Plan migra código legacy a features organizados por dominio - COMPLIANT  
✅ **SOLID Principles**: Migración usa plain functions (preferido) o factory functions cuando se requiere DI - COMPLIANT  
✅ **TypeScript Best Practices**: Plan elimina `any`, implementa `readonly`, usa Zod schemas con type inference - COMPLIANT  
✅ **Functional Programming**: Preferencia por plain functions sobre clases estáticas - COMPLIANT  
✅ **Clean Code Standards**: Mantiene convenciones de naming y estructura - COMPLIANT  
✅ **Test-First Development**: Plan incluye migración de tests y mejora de cobertura a 80% - COMPLIANT  
✅ **Error Handling & Validation**: Plan incluye creación de schemas Zod donde se requiera - COMPLIANT  

**Status**: ✅ ALL GATES PASSED - No violations detected

### Post-Design Check

✅ **ALL GATES STILL PASSED** - Re-evaluado después de Phase 1:

✅ **Feature-Based Architecture**: Plan de migración sigue Feature-Based Architecture - COMPLIANT  
✅ **SOLID Principles**: Estrategia usa plain functions preferido, factory solo cuando necesario - COMPLIANT  
✅ **TypeScript Best Practices**: Plan elimina `any`, implementa `readonly`, usa Zod con type inference - COMPLIANT  
✅ **Functional Programming**: Preferencia por plain functions documentada - COMPLIANT  
✅ **Clean Code Standards**: Convenciones mantenidas en migración - COMPLIANT  
✅ **Test-First Development**: Migración de tests incluida, cobertura objetivo 80% - COMPLIANT  
✅ **Error Handling & Validation**: Schemas Zod incluidos en plan - COMPLIANT  

**Status**: ✅ ALL GATES PASSED - No violations detected post-design

## Project Structure

### Documentation (this feature)

```text
specs/002-architecture-refactor/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/                          # Next.js App Router (no cambios)
│   ├── api/                      # API Routes
│   └── dashboard/                # Dashboard pages
│
├── features/                     # Feature-Based Architecture (estructura objetivo)
│   ├── admin/                    # Features de administración
│   │   ├── companies/           # ✅ Completo → migrar servicio legacy aquí
│   │   │   ├── lib/
│   │   │   │   └── company-api.ts  # Migrar desde src/services/company.service.ts
│   │   │   └── __tests__/
│   │   ├── currencies/           # ✅ Completo → migrar servicio legacy aquí
│   │   │   ├── lib/
│   │   │   │   └── currency-api.ts  # Migrar desde src/services/currency.service.ts
│   │   │   └── __tests__/
│   │   ├── origins/              # ⚠️ Incompleto → completar estructura
│   │   │   ├── lib/
│   │   │   │   └── origin-api.ts  # Migrar desde src/services/origin.service.ts
│   │   │   ├── components/       # Crear si necesario
│   │   │   ├── hooks/           # Crear si necesario
│   │   │   └── __tests__/
│   │   ├── periodicities/        # ✅ Completo → migrar servicio legacy aquí
│   │   │   ├── lib/
│   │   │   │   └── periodicity-api.ts  # Migrar desde src/services/periodicity.service.ts
│   │   │   └── __tests__/
│   │   └── products/            # ✅ Completo → migrar servicio legacy aquí
│   │       ├── lib/
│   │       │   └── product-api.ts  # Migrar desde src/services/product.service.ts
│   │       └── __tests__/
│   │
│   ├── auth/                     # ⚠️ Incompleto → migrar src/lib/auth/ y completar
│   │   ├── components/           # ✅ Existe
│   │   ├── lib/                  # Crear → migrar desde src/lib/auth/
│   │   │   ├── auth-api.ts
│   │   │   └── auth-schemas.ts  # Crear schemas Zod
│   │   ├── hooks/                # Crear
│   │   ├── types/                # Crear → migrar desde src/lib/auth/types.ts
│   │   └── __tests__/            # Crear
│   │
│   ├── email/                    # ✅ Completo → migrar src/lib/email/ aquí
│   │   ├── lib/                  # Consolidar código desde src/lib/email/
│   │   └── __tests__/
│   │
│   ├── pre-liquidacion/          # ⚠️ Incompleto → completar estructura
│   │   ├── services/             # ✅ Existe
│   │   ├── lib/                  # Crear
│   │   │   └── pre-liquidacion-schemas.ts  # Crear schemas Zod
│   │   ├── types/                # Crear
│   │   └── __tests__/            # ✅ Existe
│   │
│   └── shared/                   # Recursos compartidos (usado por 3+ features)
│       ├── ui/                   # Componentes UI compartidos
│       ├── hooks/                # Hooks compartidos
│       └── lib/                  # Utilidades compartidas (si src/lib/utils.ts califica)
│
├── lib/                          # Infraestructura global (solo después de migración)
│   ├── api/
│   │   └── client.ts            # ✅ Mantener (infraestructura global)
│   └── prisma.ts                # ✅ Mantener (cliente global)
│
└── services/                     # ❌ ELIMINAR después de migración completa
    ├── company.service.ts        # Migrar a features/admin/companies/lib/
    ├── currency.service.ts       # Migrar a features/admin/currencies/lib/
    ├── origin.service.ts         # Migrar a features/admin/origins/lib/
    ├── periodicity.service.ts   # Migrar a features/admin/periodicities/lib/
    └── product.service.ts        # Migrar a features/admin/products/lib/
```

**Structure Decision**: Single project structure con Next.js App Router. La migración reorganiza código existente sin cambiar la estructura base del proyecto. Features ya existen parcialmente - se completa estructura y migra código legacy.

## Complexity Tracking

> **No violations detected - all gates passed**

## Phase 0: Research & Strategy

✅ **COMPLETED** - Ver [research.md](./research.md) para detalles completos

### Research Tasks Completed

1. ✅ **Análisis de dependencias entre servicios legacy**
   - Servicios son independientes entre sí
   - Orden recomendado: por complejidad (simple → complejo)

2. ✅ **Análisis de código duplicado**
   - Estrategia: Consolidar manteniendo mejor versión
   - Comparar e integrar funcionalidad faltante

3. ✅ **Análisis de uso de imports**
   - Patrón identificado: `@/services/x.service` → `@/features/admin/x/lib/x-api`
   - Archivos afectados mapeados

4. ✅ **Análisis de tests existentes**
   - Estrategia: Migrar junto con código a `__tests__/`

5. ✅ **Análisis de código en evaluación**
   - Criterios definidos para `navigation/` y `utils.ts`

### Research Findings

Ver [research.md](./research.md) para decisiones detalladas y rationale.

## Phase 1: Design & Migration Strategy

✅ **COMPLETED** - Ver documentos generados:

### Data Model

✅ **COMPLETED** - Ver [data-model.md](./data-model.md)
- Entidades de migración definidas (Servicio Legacy, Feature Existente, Código de Dominio, etc.)
- Relaciones entre entidades mapeadas
- Reglas de validación documentadas

### Migration Contracts

✅ **COMPLETED** - Ver [contracts/migration-steps.md](./contracts/migration-steps.md)
- Pasos de migración definidos (7 pasos principales)
- Validaciones para cada paso
- Checklist de validación
- Estrategia de rollback

### Quickstart Guide

✅ **COMPLETED** - Ver [quickstart.md](./quickstart.md)
- Guía paso a paso para cada fase
- Comandos específicos para ejecutar migraciones
- Checklist de completación
- Troubleshooting común
