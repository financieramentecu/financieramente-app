# Implementation Plan: Email resumen pre-liquidación por usuario

**Branch**: `003-email-resumen-preliquidacion` (o `feature/email-resumen-preliquidacion`)  
**Spec**: [spec.md](./spec.md)

## Summary

Tras una pre-liquidación exitosa, enviar un correo por usuario (agente) con el resumen de todas sus distribuciones de comisión de esa ejecución: una fila por negocio (negocio, valor, comisión), agrupando todo en un solo email por usuario. La lógica vive en el dominio de pre-liquidación/email; el envío no debe bloquear la API.

## Technical Context

**Language/Version**: TypeScript (strict), Node 20+  
**Primary Dependencies**: Next.js 15, Prisma, SendGrid (@sendgrid/mail), React 19  
**Storage**: PostgreSQL (Prisma); entidades: FileImport, SettlementCommission, ComissionDistribution, Business, User  
**Testing**: Vitest (unit/integration), colocalized `__tests__/`  
**Target Platform**: Next.js API Routes (server), SendGrid API  
**Project Type**: Web (Next.js App Router)  
**Performance Goals**: Respuesta de API de pre-liquidación < 3s; envío de correos en background  
**Constraints**: Un correo por usuario por ejecución; no exponer datos sensibles en logs  
**Scale/Scope**: Decenas a cientos de usuarios por ejecución; envío asíncrono aceptable

## Constitution Check

*GATE: Must pass before Phase 0. Re-check after Phase 1.*

- **Feature-based organization**: Lógica nueva en `src/features/pre-liquidacion` (orquestación + datos) y/o `src/features/email` (notificación); sin archivos en `src/services/` ni `src/lib/` para dominio.
- **SOLID / DI**: Servicio de notificación inyectable (email) o uso de funciones puras que reciben dependencias.
- **TypeScript**: Tipos explícitos, readonly donde aplique, sin `any`.
- **Tests**: Unit para agrupación y construcción del resumen; mocks para envío de email.
- **Validation**: Payloads/inputs validados con Zod si se exponen nuevos endpoints.

**Result**: PASS (diseño previsto cumple constitución).

## Project Structure

### Documentation (this feature)

```text
specs/003-email-resumen-preliquidacion/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── resumen-preliquidacion-email.yaml  (o .md)
└── tasks.md  (Phase 2 - speckit.tasks)
```

### Source Code (repository)

```text
src/features/
├── pre-liquidacion/
│   ├── services/
│   │   └── pre-liquidacion.service.ts   # Ya existe; orquestar post-proceso + notificaciones
│   └── lib/ o services/
│       └── resumen-preliquidacion-email.ts  # Agrupación por usuario + construcción resumen
├── email/
│   ├── lib/
│   │   ├── email-service.ts              # Ya existe
│   │   └── preliquidacion-resumen-notification.ts  # Contenido HTML/texto + llamada sendEmail
│   └── types/
│       └── email.types.ts                # Ya existe
```

**Structure Decision**: Pre-liquidación conserva orquestación; la construcción del resumen por usuario puede vivir en `pre-liquidacion` (datos) y la generación del cuerpo del correo + envío en `email` (notificaciones), siguiendo screaming architecture.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (Ninguna prevista) | — | — |
