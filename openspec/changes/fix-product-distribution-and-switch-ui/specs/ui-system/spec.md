## Requisitos AÑADIDOS

### Requisito: Integración de Variables de Tema Tailwind v4
El sistema DEBERÁ integrar las variables CSS en el tema de Tailwind v4 utilizando el bloque `@theme` en `globals.css` para permitir un estilo consistente de los componentes compartidos.

#### Escenario: Estados Visuales del Componente Switch
- **CUANDO** un componente `Switch` de Shadcn/UI cambia su estado (activado/desactivado).
- **ENTONCES** DEBERÁ aplicar los colores de fondo y borde correctos definidos en las variables del tema (ej. `bg-primary` para activado).
