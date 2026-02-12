# Feature Specification: Responsive y Correos de Notificación

**Feature Branch**: `004-responsive-emails`
**Created**: 2026-02-10
**Status**: Ready
**Input**: Revisar responsivo de la plataforma y diseñar/ajustar correos de notificaciones cumpliendo estándares de calidad.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auditoría Responsive por Breakpoint (Priority: P1)

Como desarrollador/QA, quiero que la plataforma cumpla los criterios de usabilidad y UI/UX en todos los breakpoints (xs, sm, md, xl), para garantizar una experiencia consistente en móvil, tablet y desktop.

**Why this priority**: La usabilidad móvil es crítica para agentes que acceden desde el campo.

**Independent Test**: Verificar en viewports 375px, 640px, 768px y 1280px que no hay overflow horizontal, touch targets ≥44px, y acciones accesibles.

**Acceptance Scenarios**:

1. **Given** el usuario accede a `/login` en viewport xs (375px), **When** carga la página, **Then** no hay scroll horizontal y el formulario es completamente usable.
2. **Given** el usuario está autenticado y accede al dashboard en viewport xs, **When** abre el sidebar (trigger), **Then** el Sheet se muestra con overlay y puede cerrarse al navegar.
3. **Given** el usuario está en el header en viewport xs, **When** toca el avatar de usuario, **Then** el menú desplegable se abre y puede acceder a cerrar sesión (touch target ≥44px).
4. **Given** el usuario accede a una página con tabla (categorías, productos, etc.) en viewport xs, **When** la tabla tiene muchas columnas, **Then** el contenedor tiene overflow-x-auto y no hay scroll horizontal en el body.
5. **Given** el usuario abre un modal en viewport xs, **When** el contenido excede el viewport, **Then** el modal tiene max-height y overflow-y-auto con scroll interno.
6. **Given** el usuario accede a cualquier módulo en viewports sm (640px), md (768px) y xl (1280px), **When** carga la página, **Then** el layout se adapta según los criterios de usabilidad definidos por breakpoint.

---

### User Story 2 - Correos de Notificación Unificados (Priority: P2)

Como administrador o usuario del sistema, quiero recibir correos de notificación con diseño consistente, responsive y legible en móvil y desktop, para una experiencia profesional y accesible.

**Why this priority**: Los correos son el canal principal de notificación; un diseño inconsistente afecta la credibilidad.

**Independent Test**: Enviar correos de prueba y verificar en Gmail, Outlook y cliente móvil que el HTML se renderiza correctamente.

**Acceptance Scenarios**:

1. **Given** se registra un nuevo usuario, **When** se envía la notificación a admins, **Then** el correo tiene header con logo, paleta #00505C/#83D874, estructura común y versión plain text.
2. **Given** un admin activa una cuenta de usuario, **When** se envía el correo de activación, **Then** el correo usa buildEmailTemplate con logo, CTA "Iniciar Sesión" y media queries para móvil.
3. **Given** se envía el resumen de pre-liquidación a un agente, **When** el correo contiene tabla de negocios, **Then** la tabla es responsive (layout cards en móvil) y existe versión plain text.
4. **Given** un correo se abre en un cliente con imágenes bloqueadas, **When** el usuario lee el contenido, **Then** el mensaje principal sigue siendo legible (plain text o HTML sin depender de imágenes).
5. **Given** el contenido dinámico incluye caracteres especiales o HTML, **When** se genera el correo, **Then** se aplica escapeHtml para evitar XSS.

---

### User Story 3 - Documentación y Verificación (Priority: P3)

Como desarrollador o QA, quiero documentación clara de la auditoría responsive y de las pruebas de correos, para poder verificar el cumplimiento y ejecutar regresiones.

**Why this priority**: La documentación permite validación reproducible y onboarding.

**Acceptance Scenarios**:

1. **Given** existe docs/RESPONSIVE_AUDIT.md, **When** se consulta, **Then** contiene inventario de módulos, breakpoints xs/sm/md/xl, checklist por categoría y matriz módulo × breakpoint.
2. **Given** existe docs/EMAIL_TESTING.md, **When** se consulta, **Then** contiene checklist para Gmail, Outlook y Apple Mail, y guía de envío de prueba.
3. **Given** existen tests Playwright en e2e/responsive.spec.ts, **When** se ejecutan con viewports 375px, 768px, **Then** validan login y dashboard sin overflow y con acciones accesibles.

---

## Scope

### Responsive (Plataforma Web) – Auditoría completa y certera
- Auditoría exhaustiva por módulo garantizando usabilidad y experiencia UI/UX en todos los breakpoints.
- Breakpoints alineados con Tailwind: xs (0–639px), sm (640–767px), md (768–1023px), xl (1280px+).
- Viewports de prueba: 375px (xs), 640px (sm), 768px (md), 1280px (xl).
- Criterios: mobile-first, touch targets ≥44px, sin scroll horizontal salvo tablas, tipografía ≥16px en inputs, espaciado consistente, jerarquía visual preservada.

### Correos de Notificación
- Unificar diseño de los 3 correos existentes: nuevo usuario (admin), activación de cuenta, resumen pre-liquidación.
- Sistema de diseño: paleta (#00505C, #83D874), logo, contenedor max-width 600px, footer.
- Requisitos: DOCTYPE, viewport, charset UTF-8, estilos inline, media queries móvil, versión plain text, alt en imágenes.

## Requirements *(mandatory)*

### Responsive - Layout y Navegación
- **REQ-R1**: El sidebar debe mostrar Sheet en móvil con overlay y cierre al navegar.
- **REQ-R2**: El Header debe exponer menú de usuario (avatar) accesible en móvil con touch target ≥44px.
- **REQ-R3**: Breadcrumb debe evitar overflow horizontal (flex-wrap, min-w-0, overflow-hidden).
- **REQ-R4**: Título de página debe truncarse en móvil cuando sea muy largo.

### Responsive - Tablas
- **REQ-R5**: DataTable y CrudTable deben tener overflow-x-auto para scroll horizontal controlado.
- **REQ-R6**: Filtros y búsqueda deben usar layout en columna en móvil (flex-col).

### Responsive - Formularios y Modales
- **REQ-R7**: Inputs deben tener font-size base ≥16px en móvil para evitar zoom iOS.
- **REQ-R8**: Botones icon deben tener touch target ≥44px en móvil.
- **REQ-R9**: Dialog/Modal debe tener max-height, overflow-y-auto y padding responsive (p-4 sm:p-6).
- **REQ-R10**: Modales con grids deben usar grid-cols-1 sm:grid-cols-2 para móvil.

### Correos - Sistema de Diseño
- **REQ-E1**: Todos los correos deben usar paleta unificada (#00505C, #83D874, #1a1a1a, #333333, #666666).
- **REQ-E2**: Estructura común: header con logo, content, CTA, footer con copyright.
- **REQ-E3**: Contenedor max-width 600px con viewport meta y charset UTF-8.

### Correos - Técnicos
- **REQ-E4**: Estilos inline para compatibilidad con Gmail/Outlook.
- **REQ-E5**: Media query @media (max-width: 600px) para ajustes móvil.
- **REQ-E6**: Versión plain text para cada correo HTML.
- **REQ-E7**: escapeHtml para todo contenido dinámico (evitar XSS).
- **REQ-E8**: Tabla responsive en correo pre-liquidación (layout cards en móvil).

## Matriz de auditoría por módulo (Responsive xs/sm/md/xl)

| Módulo | Rutas | Componentes clave | xs (0–639) | sm (640–767) | md (768–1023) | xl (1280+) |
|--------|-------|-------------------|------------|--------------|---------------|------------|
| Auth | `/login` | login-view, brand-panel, auth-card | Formulario full, sin overflow | Igual | Grid 2 cols | Igual |
| Dashboard layout | `/dashboard/*` | sidebar, Header, breadcrumb | Sheet, avatar, truncate | Igual | Sidebar fijo | Igual |
| Negocios | `/dashboard/negocios/*` | MisNegociosPage, StatsOverview, modales | Cards 1 col, modales adaptados | 2 cols stats | Full layout | Igual |
| Pre-liquidación | `/dashboard/pre-liquidacion/*` | ResultadosPreLiquidacion, PanelResumenArchivos, modales | Stack vertical | Igual | Layout completo | Igual |
| Carga archivos | `/dashboard/carga-archivos/*` | ProcessingSummary, HistorialCargasTab | Stack, scroll controlado | Igual | Tabs/cols | Igual |
| Admin | `/dashboard/admin/*` | Tablas usuarios, categorías, empresas | Tablas scroll-x | Igual | Full tables | Igual |
| Categorías | `/dashboard/categorias/*` | categories-table, forms | Stack, full width | Igual | Igual | Igual |
| Empresas | `/dashboard/empresas/*` | empresas-table, forms | Igual | Igual | Igual | Igual |
| Orígenes | `/dashboard/origenes/*` | origenes-table, forms | Igual | Igual | Igual | Igual |
| Productos | `/dashboard/products/*` | products-table, product-form | Igual | Igual | Igual | Igual |
| Config. producto | `/dashboard/configuraciones-producto/*` | product-configurations-table, forms | Igual | Igual | Igual | Igual |
| Access denied | `/access-denied` | Página estática | Centrado, legible | Igual | Igual | Igual |

## Criterios de Usabilidad y UI/UX por breakpoint

- **xs**: Contenido prioritario visible sin scroll horizontal; acciones primarias thumb-reachable; formularios en una columna; modales full-width con scroll interno.
- **sm**: Transición gradual; filtros y búsqueda pueden compartir fila; stats pueden pasar a 2 columnas.
- **md**: Layout tablet; sidebar visible; tablas con scroll horizontal controlado; formularios pueden usar 2 columnas en campos no críticos.
- **xl**: Layout desktop completo; máximo aprovechamiento de espacio sin densificar en exceso; espaciado generoso.

## Non-Functional Requirements

- **NFR-1**: Tests Playwright con viewports xs (375px), sm (640px), md (768px), xl (1280px) en flujos críticos.
- **NFR-2**: Documentación de pruebas de correos (Gmail, Outlook, Apple Mail) con checklist.
- **NFR-3**: Criterios de aceptación medibles y documentados en docs/RESPONSIVE_AUDIT.md y docs/EMAIL_TESTING.md.
- **NFR-4**: Auditoría por módulo documentada con estado de cumplimiento en cada breakpoint (xs/sm/md/xl).
