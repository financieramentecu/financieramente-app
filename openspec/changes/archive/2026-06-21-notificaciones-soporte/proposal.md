# Proposal: Sistema de Notificaciones Analista de Soporte

## Intent

Implementar un sistema de notificaciones en tiempo real para alertar a los usuarios con rol "Analista de Soporte" inmediatamente cuando se adjunta un nuevo soporte a un negocio. Esto mejorará la eficiencia y los tiempos de respuesta del equipo de soporte al registrar documentos.

## Scope

### In Scope
- Creación de un modelo de persistencia `Notification` en Prisma.
- Envío de notificaciones en tiempo real utilizando Pusher cuando se adjunte un `BusinessSupport`.
- UI de notificaciones: Implementar un **Drawer en el lado derecho** que empuje el contenedor principal al abrirse.
- Panel de historial de notificaciones: Visualizar notificaciones históricas, diferenciando visualmente entre leídas y nuevas.
- Funcionalidad para filtrar notificaciones por usuario/agente.
- Acción para eliminar (cerrar) notificaciones individualmente.
- Acción global para "Marcar todas como leídas".
- **Migración del detalle de negocio:** Extraer la lógica visual del `BusinessViewModal` hacia una nueva ruta dedicada `/dashboard/negocios/[id]`.
- Redirección a la nueva ruta de detalle del negocio `/dashboard/negocios/[id]` desde cada notificación.

### Out of Scope
- Notificaciones por correo electrónico o SMS para este evento.
- Notificaciones para otros roles que no sean "Analista de Soporte".
- WebSockets puros con servidor personalizado (usaremos Pusher u otro provider similar abstracto).

## Capabilities

### New Capabilities
- `notificaciones-soporte`: Sistema en tiempo real para alertar de la carga de soportes en negocios, con historial y contadores.

### Modified Capabilities
- None

## Approach

Siguiendo `Screaming Architecture`, definiremos una interfaz en el backend `INotificationProvider` para desacoplar el envío de sockets y usaremos Pusher como implementación concreta inicial. Crearemos el modelo `Notification` en Prisma. En el frontend, utilizaremos un Custom Hook `useNotifications` para manejar el estado en tiempo real (Zustand/Context) y la conexión de websockets, renderizando la lista en un **Drawer lateral** que ajusta el layout empujando el contenido principal hacia la izquierda.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Nuevo modelo `Notification` |
| `src/features/negocios/services` | Modified | Inyectar envío de notificación al guardar soporte |
| `src/features/shared/components` | New | Campana de notificaciones y Dropdown UI |
| `src/features/shared/hooks` | New | `useNotifications` hook para sockets |
| `src/app/dashboard/negocios/[id]` | New | Nueva ruta dedicada para el detalle del negocio migrado del modal |
| `src/features/negocios/components/modals/BusinessViewModal.tsx` | Modified/Deprecated | Se extraerá su contenido a la nueva ruta |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Caída del servicio de Sockets de terceros | Low | Las notificaciones se guardan en BD (Prisma). El usuario aún puede verlas al recargar o entrar a la plataforma. |
| Consumo excesivo de base de datos | Low | Limitaremos la consulta inicial a las últimas 50 notificaciones no cerradas. |

## Rollback Plan

- Revertir las mutaciones de base de datos en `schema.prisma`.
- Remover el componente `<NotificationBell />` del Layout principal.
- Eliminar la inyección del provider en el guardado de soportes.

## Dependencies

- Instalación de librerías de Pusher (`pusher`, `pusher-js`).

## Success Criteria

- [ ] Un soporte adjuntado genera una notificación inmediata en la UI del Analista.
- [ ] La interfaz refleja correctamente el contador de "no leídas" en tiempo real.
- [ ] El Drawer permite visualizar el historial, filtrar por usuario, eliminar y marcar todas como leídas.
- [ ] El Drawer empuja el contenido principal a la izquierda sin sobreponerse destructivamente.
- [ ] Se crea exitosamente la ruta `/dashboard/negocios/[id]` con la información del antiguo modal.
- [ ] Se puede redirigir a la nueva página de detalle haciendo clic en la notificación.
- [ ] El modelo en base de datos guarda el estado de "cerrada" o "leída".
