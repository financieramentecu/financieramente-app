# Implementation Tasks

## Fase 1: Motor de Suplantación
- [x] Extender los tipos `next-auth.d.ts` con `originalUserId`, `originalRole`.
- [x] Modificar la configuración de `auth/config.ts` para manejar el trigger `update` e intercambiar variables de sesión.
- [x] Crear el componente `ImpersonationBanner` y ubicarlo en `DashboardLayout` sin romper el layout (dentro del `SidebarInset`).
- [x] Crear el componente `HeaderImpersonationSelect` como Combobox (Popover + Command).
- [x] Ajustar `/api/users/search/route.ts` para permitir búsquedas `forImpersonation=true` sin límite mínimo de caracteres.
- [x] Añadir el componente al Header.

## Fase 2: Calculadora y Lógica de Negocio
- [x] Cambiar textos de "Simulador" a "Calculadora" en `page.tsx` y `DashboardLayout`.
- [x] Modificar `SimuladorForm` para incluir el símbolo de la moneda dinámico.
- [x] Ajustar los estilos de los inputs del formulario del simulador para que se vean compactos y atractivos.
- [x] Actualizar la lógica `useMemo` de los niveles en el formulario para restringir la vista hacia abajo.
- [x] Modificar `page.tsx` para obtener el `userLevelId` desde la DB y pasarlo por props hasta `SimuladorForm`.
- [x] Establecer el valor por defecto de "Tu Nivel" (`idLevelView`) al `userLevelId` para roles no administradores.
- [x] Actualizar el copy del disclaimer de cálculo de comisiones.
