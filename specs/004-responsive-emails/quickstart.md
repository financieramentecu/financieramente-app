# Quickstart: Responsive y Correos de Notificación

**Feature**: 004-responsive-emails  
**Date**: 2026-02-10  
**Status**: Ready for Implementation

## Overview

Guía rápida para ejecutar la auditoría responsive y verificar los correos de notificación. No requiere migraciones de base de datos.

## Prerequisites

- Node.js 18+
- Financieramente codebase
- Variables de entorno para SendGrid (para pruebas de correos)

## Breakpoints (xs, sm, md, xl)

| Breakpoint | Rango | Viewport prueba |
|------------|-------|-----------------|
| xs | 0–639px | 375px |
| sm | 640–767px | 640px |
| md | 768–1023px | 768px |
| xl | 1280px+ | 1280px |

## Pasos de Implementación

### 1. Auditoría Responsive

1. Ejecutar dev server: `npm run dev`
2. Abrir DevTools → Toggle device toolbar
3. Probar cada módulo en 375, 640, 768, 1280px:
   - Login: `/login`
   - Dashboard: `/dashboard`
   - Negocios, Pre-liquidación, Carga archivos
   - Admin: categorías, empresas, orígenes, productos, config. producto
4. Verificar: sin overflow horizontal, touch targets ≥44px, menú usuario accesible
5. Documentar hallazgos en docs/RESPONSIVE_AUDIT.md

### 2. Correcciones Responsive

- Layout: `src/features/shared/layout/Header.tsx`, `sidebar.tsx`, `breadcrumb.tsx`
- Tablas: `DataTable.tsx`, `CrudTable.tsx`
- Modales: `dialog.tsx`, `liquidation-detail-modal.tsx`
- Botones: `button.tsx` (size icon con min-h/min-w en móvil)

### 3. Correos

- Plantilla base: `src/features/email/lib/email-template-base.ts`
- Admin: `admin-notifications.ts` (escapeHtml)
- Activación: `user-activation-notification.ts` (buildEmailTemplate)
- Preliquidación: `preliquidacion-resumen-notification.ts` (rediseño + plain text)

### 4. Tests

```bash
npm run test:unit -- src/features/email
npx playwright test e2e/responsive.spec.ts --project=chromium
```

### 5. Pruebas de Correos

```bash
npm run test:email tu-email@ejemplo.com
```

Ver docs/EMAIL_TESTING.md para checklist Gmail, Outlook, Apple Mail.

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| docs/RESPONSIVE_AUDIT.md | Inventario, breakpoints, checklist, matriz |
| docs/EMAIL_TESTING.md | Guía pruebas correos |
| src/features/email/lib/email-template-base.ts | Sistema diseño correos |
| e2e/responsive.spec.ts | Tests Playwright responsive |

## Referencias

- **Spec**: [spec.md](./spec.md)
- **Plan**: [plan.md](./plan.md)
- **Tasks**: [tasks.md](./tasks.md)
- **Checklist**: [checklists/responsive-emails-quality.md](./checklists/responsive-emails-quality.md)
