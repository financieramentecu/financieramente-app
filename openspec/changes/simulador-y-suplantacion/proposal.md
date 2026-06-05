# Proposal: Mejoras en Simulador y Suplantación de Usuarios

## Context
El administrador requiere una forma eficiente de brindar soporte profesional comprobando los flujos del sistema bajo el rol y permisos de otros asesores (impersonation / "Ver Como"), sin tener que solicitar credenciales ni cerrar su propia sesión. Además, se detectaron mejoras de usabilidad en el módulo del Simulador de Comisiones (Calculadora), específicamente en el manejo de moneda, diseño de los campos de entrada, texto de fórmulas y la lógica de filtrado de los niveles (Money Strategy vs ADMIN).

## Intent
- Implementar un sistema de suplantación de usuario para perfiles ADMIN.
- Agregar un selector en el Header global que permita al ADMIN cambiar rápidamente la vista de sesión a cualquier otro usuario, con buscador integrado.
- Ajustar el "Simulador" a "Calculadora", incluir manejo dinámico de moneda (USD/COP) por compañía.
- Solucionar la visibilidad jerárquica de niveles de ventas en el simulador para respetar el rol (ADMIN vs Money Strategy) y configurar por defecto el nivel correspondiente del asesor.

## Scope
### In Scope
- Auth.js session extension para manejar `impersonateUserId` y `originalUserId`.
- UI: Banner persistente y Selector Combobox (Popover + Command) en el Header superior para iniciar o salir de la suplantación.
- Lógica en `/api/users/search` para soportar búsqueda de usuarios sin límite de caracteres cuando es para impersonar (`forImpersonation=true`).
- Simulador: Renombre de títulos, breadcrumbs; ajustes de CSS para los inputs (unificados visualmente).
- Simulador: Configuración de la lógica que filtra los niveles hacia abajo, con auto-selección del "Tu Nivel" para usuarios no admin.
- Información sobre los cálculos y fórmulas actualizada en el footer del simulador.

### Out of Scope
- Interfaz completa de reportes de auditoría de qué Admin suplantó a quién (por ahora se enfoca en operatividad, no auditoría profunda).
- Impersonación múltiple encadenada (un admin suplantando a un admin para suplantar a otro).

## Dependencies
- `@hookform/resolvers/zod` y React Hook Form para el simulador.
- Radix UI (`Popover`, `Command`, `Select`) para el buscador de impersonación.
- NextAuth.js para actualización de token y sesión en caliente (`update()` trigger).
