# Research: Email resumen pre-liquidación por usuario

## 1. Envío asíncrono de correos en Next.js

**Decision**: Usar **fire-and-forget** desde la API route: tras guardar el resultado de la pre-liquidación, invocar una función que envía los correos sin `await` (o con `void`), de modo que la respuesta HTTP no espere al envío.

**Rationale**:
- El proyecto no introduce una cola (Bull, Inngest, etc.) en este plan; la documentación y el stack actual (Next.js API Routes + SendGrid) permiten un paso incremental.
- Fire-and-forget es aceptable para “notificación no crítica”: si un envío falla, se puede registrar y tratar en una iteración posterior (retry, cola).
- Alternativa futura: cola de jobs (p. ej. Inngest o worker con Bull) para retries y observabilidad.

**Alternatives considered**:
- **Cola (Bull/Redis)**: Más robusto pero añade infra y complejidad; se pospone.
- **Await en la ruta**: Bloquearía la respuesta varios segundos; rechazado.

---

## 2. Agrupación por usuario y origen de datos

**Decision**: Tras `procesarPreLiquidacion`, obtener los `ComissionDistribution` creados en el rango recién procesado (mismo `idFileImport` + marcas de tiempo o estado recién actualizado), incluyendo `settlementCommission -> business -> user` (con `email`), y agrupar en memoria por `user.idUser` (o `user.email`).

**Rationale**:
- Prisma ya expone las relaciones necesarias; una query con `include` evita N+1.
- Agrupar en memoria por usuario es sencillo (Map/Reduce) y testeable con datos mock.

**Alternatives considered**:
- Agrupar en SQL (GROUP BY): posible pero menos flexible para construir filas “por negocio” con nombres; se prefiere agrupación en aplicación.
- Marcar distribuciones como “notificadas”: opcional en una fase posterior (campo o tabla de control).

---

## 3. Contenido del correo (HTML vs plantilla SendGrid)

**Decision**: Usar **HTML generado en código** (función en `src/features/email`) con una tabla por negocio, y enviar vía `sendEmail` existente. Opcionalmente más adelante migrar a `sendTemplatedEmail` con un template en SendGrid si se requiere diseño de marca.

**Rationale**:
- El feature de email ya tiene `sendEmail` con HTML; no requiere nuevas variables de entorno para templates.
- Tabla HTML simple (negocio, valor, comisión/categoría) es suficiente para el resumen.

**Alternatives considered**:
- Template dinámico SendGrid: mejor para branding; se deja para iteración si el equipo lo pide.

---

## 4. Dónde colocar la orquestación (quién llama al envío)

**Decision**: **Pre-liquidación orquesta**: al final de `procesarPreLiquidacion` (éxito), se llama a una función del dominio de pre-liquidación que: (1) obtiene distribuciones por usuario, (2) construye el resumen por usuario, (3) llama al servicio de email una vez por usuario. El servicio de email solo recibe “to”, “subject”, “html” (y opcionalmente “text”).

**Rationale**:
- Pre-liquidación conoce el contexto (fileImportId, rango, qué se procesó); el feature email permanece genérico.
- Cumple arquitectura por dominios: pre-liquidacion usa el contrato del feature email (sendEmail), no al revés.

**Alternatives considered**:
- API route llama directamente al envío: duplicaría lógica; rechazado.
- Job separado que lee “pre-liquidaciones pendientes de notificar”: válido como evolución con cola; no en este plan.
