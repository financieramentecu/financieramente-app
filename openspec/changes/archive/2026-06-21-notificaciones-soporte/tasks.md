# Tasks: Sistema de Notificaciones Analista de Soporte

## Phase 1: Foundation & Database

- [x] 1.1 Agregar el modelo `Notification` en `prisma/schema.prisma` con relaciones a `User` e `idBusiness`, y campos `isRead`, `isClosed`.
- [x] 1.2 Ejecutar la generación de Prisma (`npx prisma generate` y preparar la migración con `npx prisma migrate dev`).

## Phase 2: Core Implementation (Backend & Sockets)

- [x] 2.1 Crear interfaz `INotificationProvider` y su implementación `PusherNotificationProvider` (e.g. en `src/features/shared/services/notifications`).
- [x] 2.2 Modificar el servicio donde se guardan los soportes (`src/features/negocios/services/business-support.service.ts` o la Action correspondiente) para inyectar la creación de la notificación en BD y emitir el evento por Pusher a los analistas.
- [x] 2.3 Crear endpoint `GET /api/notifications` para consultar el historial de notificaciones del usuario autenticado.
- [x] 2.4 Crear endpoints (o Server Actions) para actualizar notificaciones: "marcar como leída", "marcar todas como leídas" y "cerrar/eliminar".

## Phase 3: Integration & UI (Frontend Sockets & Drawer)

- [x] 3.1 Instalar librerías de Pusher (`pusher` y `pusher-js`).
- [x] 3.2 Crear el Custom Hook `useNotifications` en `src/features/shared/hooks` para suscribirse al canal de Pusher, cargar el histórico y manejar el estado global (leídas, nuevas).
- [x] 3.3 Construir componente `<NotificationDrawer />` en `src/features/shared/components` que consuma el hook y muestre la lista, filtros por usuario y el botón de "marcar todas leídas".
- [x] 3.4 Construir el componente `<NotificationBell />` (con contador tipo badge) e integrarlo en el Header global del dashboard.

## Phase 4: Migration of Business Detail Route

- [x] 4.1 Crear la nueva estructura de ruta `src/app/dashboard/negocios/[id]/page.tsx` (Server Component).
- [x] 4.2 Extraer la lógica visual y de obtención de datos desde `BusinessViewModal.tsx` hacia la nueva página `page.tsx` (y sus componentes de UI/Sections si aplica).
- [x] 4.3 Actualizar `MisNegociosPage.tsx`, `BusinessRowActions.tsx` y cualquier otra tabla para que los enlaces de detalle dirijan a `/dashboard/negocios/[id]` en lugar de despachar el estado para abrir el modal.
- [x] 4.4 Deprecar o eliminar con seguridad `BusinessViewModal.tsx` una vez migrado.

## Phase 5: Verification & Cleanup

- [x] 5.1 Verificar que la inyección en `persistComprobante` compila correctamente (`npm run type-check`).
- [x] 5.2 (Opcional) Correr el linter para asegurar que el componente del Drawer no tenga issues de ESLint (`npm run lint`).
- [x] 5.3 Asegurar que las variables de entorno de Pusher estén bien documentadas o mencionadas como requeridas en `.env.example`.
- [x] 5.4 Validar visualmente el flujo E2E y el filtro por usuario en el Drawer.
