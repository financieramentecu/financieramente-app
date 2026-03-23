# Research: Responsive y Correos de Notificación

## Responsive

### Decision: Breakpoints xs, sm, md, xl alineados con Tailwind
- **Rationale**: Auditoría completa por breakpoint. Mapeo: xs=0–639px (base), sm=640–767px, md=768–1023px, xl=1280px+.
- **Alternatives**: Usar solo 3 breakpoints (menos granular), agregar 2xl (no crítico para auditoría).

### Decision: Breakpoints Tailwind mobile-first
- **Rationale**: El proyecto ya usa Tailwind. Breakpoints sm:640, md:768, lg:1024 son estándar.
- **Alternatives**: CSS custom properties, MUI breakpoints (proyecto no usa MUI).

### Decision: useIsMobile con 768px
- **Rationale**: Sidebar usa 768px para alternar Sheet vs Sidebar. Mantener consistencia.
- **Alternatives**: 640px (más móvil), 1024px (menos móvil).

### Decision: Auditoría por módulo
- **Rationale**: Garantizar usabilidad y UI/UX en todos los módulos. Matriz módulo × breakpoint para trazabilidad.
- **Alternatives**: Auditoría solo en vistas críticas (menos exhaustiva).

### Decision: Touch targets ≥44px
- **Rationale**: WCAG 2.5.5 Target Size (Level AAA), Apple HIG y Material Design recomiendan 44–48px.
- **Alternatives**: 40px (menos accesible).

### Decision: Font-size ≥16px en inputs móvil
- **Rationale**: iOS Safari hace zoom automático en inputs <16px, degradando UX.
- **Alternatives**: Mantener 14px y aceptar zoom.

## Correos

### Decision: Estilos inline + media queries
- **Rationale**: Gmail y Outlook tienen soporte limitado de CSS. Inline + media en `<style>` es compatible.
- **Alternatives**: Solo HTML básico (pierde diseño), frameworks como MJML (dependencia adicional).

### Decision: Tabla responsive con display:block en móvil
- **Rationale**: Patrón "cards" en móvil: thead oculto, td con data-label para pseudo ::before.
- **Alternatives**: Scroll horizontal (menos legible), ocultar tabla (pierde datos).

### Decision: Versión plain text obligatoria
- **Rationale**: Clientes de solo texto, accesibilidad, fallback si HTML falla.
- **Alternatives**: Solo HTML (algunos clientes lo convierten mal).

### Decision: Paleta #00505C, #83D874
- **Rationale**: Colores de marca Financieramente ya usados en admin-notifications.
- **Alternatives**: Palette distinta (rompería consistencia).
