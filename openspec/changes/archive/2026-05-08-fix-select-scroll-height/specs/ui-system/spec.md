# Delta for UI System

## ADDED Requirements

### Requirement: Componente Select con Scroll y Altura Controlada

El sistema MUST proveer un componente de selección (Select) basado en Radix UI que garantice la accesibilidad de todos sus elementos mediante scroll automático y una altura máxima predecible.

#### Scenario: Scroll en listas largas

- GIVEN Un componente Select con una cantidad de elementos que excede la capacidad visual inmediata (ej. > 10 ítems).
- WHEN El usuario abre el selector.
- THEN El contenido SHALL mostrar una barra de scroll vertical.
- AND El usuario SHALL poder desplazarse mediante ratón o teclado hasta el último elemento de la lista.

#### Scenario: Altura máxima controlada

- GIVEN Un componente Select desplegado en la plataforma.
- WHEN El contenido se visualiza.
- THEN La altura del contenedor SHALL estar limitada a un máximo de 320px (`max-h-80`).
- AND El contenedor SHALL reducir su altura automáticamente si el total de elementos requiere menos espacio que el máximo definido.

#### Scenario: Adaptabilidad al espacio disponible

- GIVEN Una pantalla con espacio vertical limitado.
- WHEN Se abre el selector cerca del borde inferior de la pantalla.
- THEN El sistema SHALL priorizar el ajuste al espacio disponible (`available-height`) sobre la altura máxima fija para evitar que el componente se renderice fuera de la vista.
