# Implementation Plan: Responsive y Correos de Notificación

**Branch**: `004-responsive-emails` | **Date**: 2026-02-10
**Spec**: [spec.md](./spec.md)

## Summary

Implementar **auditoría completa y certera** del responsive de la plataforma Financieramente, garantizando usabilidad y experiencia UI/UX en breakpoints xs, sm, md y xl, con análisis exhaustivo por módulo. Adicionalmente, unificar el diseño de los correos de notificación existentes con estándares de calidad.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15, React 19  
**Primary Dependencies**: Tailwind CSS v4, Shadcn/UI, Radix UI, SendGrid  
**Storage**: N/A (correos enviados vía SendGrid)  
**Testing**: Vitest (unit), Playwright (e2e responsive)  
**Target Platform**: Web (responsive), clientes de correo (Gmail, Outlook, Apple Mail)  
**Project Type**: Web application  
**Performance Goals**: Core Web Vitals (LCP, FID, CLS), correos <600px de ancho  
**Constraints**: Touch targets ≥44px, font-size ≥16px en inputs móvil  
**Scale/Scope**: ~12 módulos/rutas, ~40 vistas, 3 tipos de correo

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Screaming Architecture | PASS | Responsive en shared + features; correos en `src/features/email/` |
| II. SOLID | PASS | Funciones puras para generación de HTML |
| III. TypeScript Best Practices | PASS | Tipos explícitos, escapeHtml tipado |
| IV. Functional Programming | PASS | buildEmailTemplate, generate*HTML como funciones puras |
| V. Clean Code | PASS | Naming consistente |
| VI. Test-First | PASS | Tests unit para email, e2e para responsive |
| VII. Error Handling | PASS | escapeHtml evita XSS |
| VIII. React Data Fetching | N/A | No aplica a correos |
| IX. API Response Standardization | N/A | Correos no son API |
| X. Component Logic Separation | PASS | Lógica en hooks/layout |

## Project Structure

### Documentation

```text
specs/004-responsive-emails/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
├── checklists/
│   └── responsive-emails-quality.md
└── contracts/
    └── email-template-contract.ts
```

### Source Code (existing)

```text
src/features/shared/         # Layout, sidebar, header, breadcrumb, dialog
src/features/email/          # admin-notifications, user-activation, preliquidacion-resumen
src/features/shared/ui/      # DataTable, modal, button
docs/
├── RESPONSIVE_AUDIT.md
└── EMAIL_TESTING.md
e2e/
└── responsive.spec.ts
```

## Phases

### Phase 0: Research (Completed)
- Breakpoints Tailwind (xs/sm/md/lg/xl) y mapeo a xs/sm/md/xl
- useIsMobile (768px) como frontera móvil/desktop
- Estándares HTML email (inline styles, media queries, compatibilidad)
- Ver research.md

### Phase 1: Design (Completed)
- Sistema de diseño unificado en `email-template-base.ts`
- Plantilla buildEmailTemplate con header, content, footer
- Matriz de auditoría por módulo y breakpoint

### Phase 2: Auditoría Responsive Completa (xs, sm, md, xl)
- Inventario por módulo: Auth, Dashboard, Negocios, Pre-liquidación, Carga archivos, Admin, Categorías, Empresas, Orígenes, Productos, Config. producto, Access denied
- Verificación por breakpoint:
  - **xs (0–639px)**: Sin overflow horizontal, touch targets, formularios 1 col, modales adaptados
  - **sm (640–767px)**: Transición, filtros/búsqueda adaptados
  - **md (768–1023px)**: Sidebar visible, tablas con scroll controlado
  - **xl (1280px+)**: Layout completo, espaciado adecuado
- Criterios usabilidad UI/UX: jerarquía visual, legibilidad, acciones accesibles
- Documentar estado en docs/RESPONSIVE_AUDIT.md con matriz módulo × breakpoint

### Phase 3: Implementation & Correos
- Correcciones detectadas en auditoría (layout, tablas, formularios, modales)
- Correos: admin (escapeHtml), activación (plantilla), pre-liquidación (rediseño + plain text)
- Tests Playwright con viewports 375, 640, 768, 1280
- Documentación EMAIL_TESTING.md

## Complexity Tracking

None. No constitution violations.
