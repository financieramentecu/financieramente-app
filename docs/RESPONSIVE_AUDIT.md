# Auditoría Responsive - Financieramente

## 1. Inventario de páginas y componentes

### Flujos y rutas críticas

| Flujo | Rutas | Componentes clave |
|-------|-------|-------------------|
| Auth | `/login` | `login-view.tsx`, `brand-panel.tsx`, `auth-card.tsx` |
| Dashboard | `/dashboard/*` | `sidebar.tsx`, `Header.tsx`, `breadcrumb.tsx` |
| Negocios | `/dashboard/negocios/*` | `MisNegociosPage.tsx`, `StatsOverview.tsx`, modales |
| Pre-liquidación | `/dashboard/pre-liquidacion/*` | `ResultadosPreLiquidacion.tsx`, `PanelResumenArchivos.tsx` |
| Carga archivos | `/dashboard/carga-archivos/*` | `ProcessingSummary.tsx`, `HistorialCargasTab.tsx` |
| Admin | `/dashboard/admin/*` | Tablas usuarios, categorías, empresas, `user-info-card.tsx` |
| Configuración | `/dashboard/configuraciones-producto/*`, `/dashboard/categorias/*`, `/dashboard/origenes/*` | DataTable, formularios CRUD |
| Access denied | `/access-denied` | Página de acceso denegado |

### Breakpoints (xs, sm, md, xl) – Auditoría completa

| Breakpoint | Rango | Tailwind | Target | Dispositivos típicos |
|------------|-------|----------|--------|----------------------|
| xs | 0–639px | (base) | Mobile | iPhone SE, Galaxy S |
| sm | 640–767px | sm: | Large phone | iPhone 14 Pro Max |
| md | 768–1023px | md:, lg: | Tablet / laptop | iPad, laptop pequeño |
| xl | 1280px+ | xl:, 2xl: | Desktop | Laptop, monitor |

### Breakpoints Tailwind (mobile-first)

| Prefix | Min Width | Target |
|--------|-----------|--------|
| (none) | 0px | Mobile base |
| `sm:` | 640px | Large phone / small tablet |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Laptop |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Large desktop |

### Hook useIsMobile

- Ubicación: `src/features/shared/hooks/use-mobile.tsx`
- Breakpoint: 768px (`MOBILE_BREAKPOINT`)
- Usado en: `sidebar.tsx` para alternar entre Sheet (móvil) y Sidebar (desktop)

---

## 2. Checklist por viewport

### Viewports de prueba (xs, sm, md, xl)

| Viewport | Breakpoint | Dispositivo | Prioridad |
|----------|------------|-------------|-----------|
| 375px | xs | iPhone SE | P0 |
| 390px | xs | iPhone 14 | P0 |
| 428px | xs | iPhone 14 Pro Max | P0 |
| 640px | sm | Large phone | P0 |
| 768px | md | Tablet portrait | P1 |
| 1024px | md | Laptop / tablet landscape | P1 |
| 1280px | xl | Desktop | P1 |

### Checklist por categoría

#### Layout y navegación

- [x] Sidebar: Sheet móvil visible, overlay correcto, cierre al navegar
- [x] Header: SidebarTrigger visible en móvil (touch target 44px)
- [x] Header: Menú usuario accesible en móvil (avatar siempre visible)
- [x] Breadcrumb: flex-wrap, min-w-0, overflow-hidden
- [x] Título página: truncate en móvil

#### Tablas

- [x] DataTable: overflow-x-auto, flex-col sm:flex-row en filtros
- [x] CrudTable: overflow-x-auto, search full width en móvil
- [x] Filtros y búsqueda: stack vertical en móvil (flex-col)

#### Formularios

- [x] Inputs: text-base en móvil (evitar zoom iOS), w-full
- [x] Touch targets: 44x44px para icon buttons (sm breakpoint)
- [x] Select triggers: w-full sm:w-[180px] en tablas

#### Modales

- [x] Dialog: w-[calc(100%-2rem)], max-h-[90vh], overflow-y-auto, p-4 sm:p-6
- [x] Modal: scroll interno cuando contenido excede viewport
- [x] liquidation-detail-modal: grid-cols-1 sm:grid-cols-2

#### Login

- [x] Grid: md:grid-cols-2, en móvil solo formulario visible
- [x] BrandPanel: oculto en móvil (showBrandPanel)
- [x] AuthCard: padding adecuados

---

## 3. Estado de componentes (pre-auditoría)

| Componente | Responsive actual | Observaciones |
|------------|-------------------|---------------|
| sidebar.tsx | useIsMobile + Sheet | OK, verificar overlay |
| Header.tsx | hidden sm:flex en usuario | Problema: menú usuario oculto en móvil |
| breadcrumb.tsx | flex-wrap, gap | OK |
| StatsOverview | grid-cols-1 md:grid-cols-2 | OK |
| DataTable | sin overflow-x | Revisar scroll horizontal |
| product-configurations-table | flex-col sm:flex-row | OK en header |
| login-view | md:grid-cols-2 | OK |

---

## 4. Criterios de aceptación

- Mobile-first con breakpoints xs/sm/md/xl consistentes
- Sin scroll horizontal salvo en tablas (con overflow controlado)
- Touch targets >= 44px
- Tipografía base >= 16px en inputs (evitar zoom automático iOS)
- Todas las acciones críticas (logout, navegación) accesibles en móvil
- Usabilidad: jerarquía visual preservada en todos los breakpoints
- UI/UX: espaciado consistente, acciones thumb-reachable en xs/sm

## 5. Matriz de auditoría por módulo (xs / sm / md / xl)

| Módulo | xs | sm | md | xl |
|--------|----|----|----|----|
| Auth | ✓ | ✓ | ✓ | ✓ |
| Dashboard layout | ✓ | ✓ | ✓ | ✓ |
| Negocios | ✓ | ✓ | ✓ | ✓ |
| Pre-liquidación | ✓ | ✓ | ✓ | ✓ |
| Carga archivos | ✓ | ✓ | ✓ | ✓ |
| Admin (tablas) | ✓ | ✓ | ✓ | ✓ |
| Categorías | ✓ | ✓ | ✓ | ✓ |
| Empresas | ✓ | ✓ | ✓ | ✓ |
| Orígenes | ✓ | ✓ | ✓ | ✓ |
| Productos | ✓ | ✓ | ✓ | ✓ |
| Config. producto | ✓ | ✓ | ✓ | ✓ |
| Access denied | ✓ | ✓ | ✓ | ✓ |
