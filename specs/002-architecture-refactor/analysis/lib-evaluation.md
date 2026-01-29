# Evaluación de src/lib/ - Decisión Final

**Fecha**: 2026-01-28  
**Fase**: 4 - User Story 2

## Evaluación de src/lib/navigation/

**Archivos**:
- `src/lib/navigation/menu-builder.ts`
- `src/lib/navigation/menu-items.tsx`

**Uso**:
- `src/features/shared/layout/Sidebar.tsx` - importa `buildMenuByRole`
- `src/app/page.tsx` - importa `getRedirectUrlByRole`
- `src/app/dashboard/page.tsx` - importa `getRedirectUrlByRole`

**Análisis**:
- Es infraestructura de navegación del app shell (cross-cutting)
- No es específico de dominio
- Usado por layout compartido y páginas de app

**Decisión**: ✅ **MANTENER en `src/lib/navigation/`** como infraestructura global

---

## Evaluación de src/lib/utils.ts

**Contenido**:
- `cn(...inputs)` - función helper de Tailwind para merge de clases

**Uso**:
- 57 archivos importan `cn` desde `@/lib/utils`
- Principalmente usado en `features/shared/ui/*` (componentes UI compartidos)
- También usado en múltiples features de dominio (auth, negocios, product, empresas, etc.)

**Análisis**:
- Es una utilidad de infraestructura UI (Tailwind)
- Usado por 3+ features, pero es infraestructura técnica, no dominio
- Similar a `clsx` y `tailwind-merge` - utilidades de infraestructura

**Decisión**: ✅ **MANTENER en `src/lib/utils.ts`** como infraestructura global

**Razón**: Aunque es usado por múltiples features, `cn()` es una utilidad técnica de infraestructura (similar a cómo `prisma.ts` es infraestructura aunque se use en múltiples features). No representa lógica de dominio.

---

## Estado Final de src/lib/

Después de la migración, `src/lib/` contiene solo infraestructura global:

✅ **Infraestructura (correcto)**:
- `api/client.ts` - Cliente HTTP global
- `prisma.ts` - Cliente Prisma global
- `auth/config.ts` - Configuración NextAuth (infraestructura)
- `auth/nextauth.ts` - Instancia NextAuth (infraestructura)
- `auth/types.ts` - Extensiones de módulo NextAuth (infraestructura)
- `navigation/menu-builder.ts` - Navegación del app shell (infraestructura)
- `navigation/menu-items.tsx` - Items de menú del app shell (infraestructura)
- `utils.ts` - Utilidad de Tailwind (infraestructura)

✅ **Migrado a features**:
- `auth/user-creation.ts` → `features/auth/lib/`
- `auth/user-validation.ts` → `features/auth/lib/`
- `auth/password-utils.ts` → `features/auth/lib/`
- `auth/permissions.ts` → `features/auth/lib/`
- `auth/roles.ts` → `features/auth/lib/`
- `auth/audit-logger.ts` → `features/auth/lib/`
- `currency/index.ts` → `features/admin/currencies/lib/currency-formatters.ts`
- `email/admin-notifications.ts` → `features/email/lib/`
- `email/user-activation-notification.ts` → `features/email/lib/`

---

## Conclusión

✅ **User Story 2 COMPLETA**: `src/lib/` ahora solo contiene infraestructura global. Todo el código de dominio ha sido migrado a features correspondientes.
