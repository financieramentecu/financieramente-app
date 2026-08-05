# Guía de prueba — Módulo Leads (webhook CRM sync)

Guía manual para probar `POST /api/leads/crm-sync` y el flujo completo del módulo Leads en local, sin depender del CRM/n8n real.

## 1. Variable de entorno

En `.env.local` agregá:

```
LEADS_CRM_SYNC_API_KEY="test-local-key-12345"
```

Reiniciá el servidor de desarrollo después de agregarla (`npm run dev`).

La comparación de la API key es timing-safe (`crypto.timingSafeEqual` sobre digest SHA-256) — ver `src/features/leads/lib/api-key-guard.ts`.

## 2. Columnas del funnel (seed)

`seedLeadFunnelColumns()` (`prisma/seeds/lead-funnel-columns.ts`) crea/asegura la columna fija `Sin mapear` (`externalStatusKey: "__unmapped__"`, posición 0, recibe cualquier `statusKey` sin mapeo) más las 22 columnas reales del funnel de negocio, en este orden:

| Posición | Nombre | externalStatusKey |
|:--------:|--------|--------------------|
| 1 | Lead Nuevo | `NUEVO_LEAD` |
| 2 | Contacto 1ra Vez | `PRIMER_CONTACTO` |
| 3 | Contacto 2ra Vez | `SEGUNDO_CONTACTO` |
| 4 | Contacto 3ra Vez | `TERCER_CONTACTO` |
| 5 | Contacto 4ra Vez | `CUARTO_CONTACTO` |
| 6 | Contacto 5ra Vez | `QUINTO_CONTACTO` |
| 7 | Diagnostico Agendado | `DIAGNOSTICO_AGENDADO` |
| 8 | Asistió al diagnostico | `ASISTIO_AL_DIAGNOSTICO` |
| 9 | No asistió al diagnostico | `NO_ASISTIO_AL_DIAGNOSTICO` |
| 10 | Reagendamiento | `REAGENDAMIENTO` |
| 11 | Pendiente Tareas | `PENDIENTE_TAREAS` |
| 12 | Tareas recibidas | `TAREAS_RECIBIDAS` |
| 13 | Estructurando propuesta | `ESTRUCTURANDO_PROPUESTA` |
| 14 | Cita de propuesta agendada | `CITA_PROPUESTA_AGENDADA` |
| 15 | Asistió a la cita de propuesta | `ASISTIO_CITA_PROPUESTA` |
| 16 | No asistió a la cita de propuesta | `NO_ASISTIO_CITA_PROPUESTA` |
| 17 | Propuestas Aceptadas | `PROPUESTA_ACEPTADA` |
| 18 | Seguimiento | `SEGUIMIENTO` |
| 19 | Negocio aplazado | `NEGOCIO_APLAZADO` |
| 20 | En acompañamiento | `EN_ACOMPANAMIENTO` |
| 21 | Cierre | `CIERRE` |
| 22 | Won | `WON` |

Correr solo este seed (no hace falta correr todo `prisma/seed.ts`):

```bash
npx tsx prisma/seed-lead-funnel-columns.ts
# o
npm run prisma:seed:lead-funnel-columns
```

También sigue corriendo automáticamente como parte del seed completo (`npx tsx prisma/seed.ts`), por si ya tenés ese paso integrado en el pipeline de deploy.

Es **idempotente** (upsert por `externalStatusKey`) — se puede correr en local, QA y producción sin duplicar columnas ni pisar el `externalStatusKey` de una columna ya existente (es inmutable después de creada). Si un admin ya renombró alguna de estas columnas desde la UI, volver a correr el seed le restaura el `name`/`position` canónico definido acá — coordinar con el equipo antes de correrlo en un ambiente donde ya hubo edición manual.

> Nota: `WON` como `externalStatusKey` de columna es solo el nombre del paso del funnel (posición visual en el Kanban) — no confundir con `outcomeStatus: "WON"` del payload del webhook (sección 3), que es un campo totalmente distinto (resultado del lead, no su columna).

## 3. Contrato del payload (`crmSyncPayloadSchema`)

Fuente: `src/features/leads/types/crm-sync.schema.ts`.

| Campo | Obligatorio | Tipo / validación | Notas |
|-------|:-----------:|--------------------|-------|
| `externalCrmId` | Sí | string no vacío | Clave del upsert. Mismo valor = mismo lead. |
| `statusKey` | Sí | string no vacío | Se mapea contra `LeadFunnelColumn.externalStatusKey`. Debe ser uno de los 22 valores definidos en la sección 2 (`NUEVO_LEAD`, `PRIMER_CONTACTO`, `SEGUNDO_CONTACTO`, `TERCER_CONTACTO`, `CUARTO_CONTACTO`, `QUINTO_CONTACTO`, `DIAGNOSTICO_AGENDADO`, `ASISTIO_AL_DIAGNOSTICO`, `NO_ASISTIO_AL_DIAGNOSTICO`, `REAGENDAMIENTO`, `PENDIENTE_TAREAS`, `TAREAS_RECIBIDAS`, `ESTRUCTURANDO_PROPUESTA`, `CITA_PROPUESTA_AGENDADA`, `ASISTIO_CITA_PROPUESTA`, `NO_ASISTIO_CITA_PROPUESTA`, `PROPUESTA_ACEPTADA`, `SEGUIMIENTO`, `NEGOCIO_APLAZADO`, `EN_ACOMPANAMIENTO`, `CIERRE`, `WON`). Se normaliza a mayúscula/guion bajo antes de matchear (case/espacios no importan). Un valor desconocido no rechaza el webhook → cae en "Sin mapear", responde 200 igual. |
| `name` | No | string | Partial merge: ausente/vacío nunca pisa un valor ya guardado. |
| `lastName` | No | string | Ídem. |
| `email` | No | string vacío o email válido | Ídem. |
| `phone` | No | string | Ídem. |
| `identityNumber` | No | string | Cédula — normalmente no llega en el sync inicial. |
| `originTag` | No | string | Etiqueta informativa del pipeline de origen. |
| `externalUrl` | No | string vacío o URL válida | Habilita el botón "Ver en CRM" en el detalle. |
| `ownerEmail` | No | string vacío o email válido | Se resuelve contra `User.email` → `Lead.ownerId` (match **case-insensitive** + trim, ej. `Agente@Dominio.com` matchea igual que `agente@dominio.com`). Siempre reasigna si viene presente y distinto (no hay "owner fijo"). Si no matchea ningún usuario activo, el lead queda sin dueño (`ownerId` null) y solo lo ven roles admin. |
| `outcomeStatus` | No, pero **recomendado enviarlo siempre** | string, se normaliza a mayúsculas | Debe resolver a `OPEN`/`WON`/`LOST`/`ABANDONED`. Valor no reconocido → cae a `OPEN`, responde 200 igual, audit log `LEAD_OUTCOME_STATUS_UNRESOLVED`. **`WON` es terminal**: una vez que el lead ya está en `WON`, ningún webhook posterior puede cambiarlo (el resto de los campos sí se siguen actualizando); el intento queda registrado como `LEAD_OUTCOME_STATUS_LOCKED`. |

Semántica general: **upsert por `externalCrmId`** con **partial merge** — un campo opcional ausente o vacío nunca borra un valor ya guardado. El webhook nunca se rechaza por datos de negocio desconocidos (`statusKey`/`outcomeStatus`/`ownerEmail` sin match); solo se rechaza por API key inválida (401), rate limit excedido (429) o payload inválido (400, ej. `externalCrmId`/`statusKey` faltantes, o un email/URL mal formado).

> **Recomendación para la configuración de n8n**: aunque `outcomeStatus` es técnicamente opcional (si falta, se preserva el valor ya guardado), configurá el workflow para que lo mande **en todas las llamadas**, no solo cuando cambia. Así el payload siempre refleja el estado real actual del lead en el CRM, sin depender de que el workflow "recuerde" cuándo omitirlo. Ver el ejemplo de progresión completa abajo.

## 4. Curl de prueba

### Crear un lead nuevo

```bash
curl -X POST http://localhost:3000/api/leads/crm-sync \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-local-key-12345" \
  -d '{
    "externalCrmId": "test-lead-001",
    "statusKey": "NUEVO_LEAD",
    "name": "Maria",
    "lastName": "Gonzalez",
    "email": "maria.gonzalez@example.com",
    "phone": "3011234567",
    "originTag": "Asesorías Estratégicas de Cortesía",
    "ownerEmail": "un-usuario-real@tudominio.com",
    "outcomeStatus": "OPEN"
  }'
```

> `ownerEmail` debe ser el email de un `User` activo que ya exista en tu base para que el lead quede asignado (match case-insensitive, no hace falta que coincida el mayúscula/minúscula exacto). Si no matchea, `ownerId` queda `null` y solo lo ven roles admin (`HIERARCHY_BYPASS_ROLES`).

### Actualizar el estado del mismo lead (cambia de columna)

```bash
curl -X POST http://localhost:3000/api/leads/crm-sync \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-local-key-12345" \
  -d '{
    "externalCrmId": "test-lead-001",
    "statusKey": "PRIMER_CONTACTO",
    "outcomeStatus": "OPEN"
  }'
```

Podés mandar la key en minúscula o con espacios (`primer contacto`) — se normaliza a `PRIMER_CONTACTO` de los dos lados (admin y webhook), así que igual matchea. Un `statusKey` que no corresponda a ninguna de las 22 columnas seedeadas (sección 2) cae en "Sin mapear" (igual responde 200).

### Ejemplo de progresión completa (`outcomeStatus` siempre presente)

Así debería verse el workflow de n8n mandando el estado real del lead en cada paso, sin omitir nunca el campo:

```bash
# 1. Entra al funnel
curl -X POST http://localhost:3000/api/leads/crm-sync \
  -H "Content-Type: application/json" -H "x-api-key: test-local-key-12345" \
  -d '{"externalCrmId": "crm-8821", "statusKey": "NUEVO_LEAD", "outcomeStatus": "OPEN"}'

# 2. Avanza de columna — outcomeStatus se sigue mandando aunque no cambie
curl -X POST http://localhost:3000/api/leads/crm-sync \
  -H "Content-Type: application/json" -H "x-api-key: test-local-key-12345" \
  -d '{"externalCrmId": "crm-8821", "statusKey": "PRIMER_CONTACTO", "outcomeStatus": "OPEN"}'

# 3. Se cierra la venta
curl -X POST http://localhost:3000/api/leads/crm-sync \
  -H "Content-Type: application/json" -H "x-api-key: test-local-key-12345" \
  -d '{"externalCrmId": "crm-8821", "statusKey": "CIERRE", "outcomeStatus": "WON"}'
```

> Ojo: `statusKey` (columna del Kanban, ej. `CIERRE`) y `outcomeStatus` (resultado del lead: `OPEN`/`WON`/`LOST`/`ABANDONED`) son dos campos independientes — un lead puede estar en la columna "Cierre" con `outcomeStatus: OPEN` todavía, o llegar a `outcomeStatus: WON` estando en cualquier columna.

### Probar el lock de `WON`

Repetí la llamada con un `outcomeStatus` distinto sobre el mismo lead ya `WON`:

```bash
curl -X POST http://localhost:3000/api/leads/crm-sync \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-local-key-12345" \
  -d '{
    "externalCrmId": "crm-8821",
    "statusKey": "SEGUIMIENTO",
    "outcomeStatus": "LOST"
  }'
```

Esperado: responde 200, el lead se queda en `outcomeStatus = WON` (no cambia a `LOST`), pero sí se mueve de columna a "Seguimiento" (el lock es solo sobre `outcomeStatus`, no congela el resto del lead), y queda un registro `LEAD_OUTCOME_STATUS_LOCKED` en `AuditLog`.

### Valor de `outcomeStatus` desconocido (prueba el fallback)

```bash
curl -X POST http://localhost:3000/api/leads/crm-sync \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-local-key-12345" \
  -d '{
    "externalCrmId": "test-lead-002",
    "statusKey": "NUEVO_LEAD",
    "outcomeStatus": "abc123"
  }'
```

Esperado: responde 200, se guarda `outcomeStatus: OPEN`, y queda un registro `LEAD_OUTCOME_STATUS_UNRESOLVED` en `AuditLog`.

### Sin API key (debe dar 401)

```bash
curl -X POST http://localhost:3000/api/leads/crm-sync \
  -H "Content-Type: application/json" \
  -d '{"externalCrmId": "x", "statusKey": "x"}'
```

### Payload inválido (debe dar 400)

```bash
curl -X POST http://localhost:3000/api/leads/crm-sync \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-local-key-12345" \
  -d '{"statusKey": "contactado"}'
```

Falta `externalCrmId` → 400 con mensaje de validación Zod.

### `statusKey` que no matchea ninguna columna (cae en "Sin mapear")

```bash
curl -X POST http://localhost:3000/api/leads/crm-sync \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-local-key-12345" \
  -d '{"externalCrmId": "test-lead-003", "statusKey": "PASO_INEXISTENTE"}'
```

### Rate limit (429)

Repetir la misma llamada más de ~120 veces en menos de un minuto con la misma API key debería empezar a devolver 429 (ventana deslizante en memoria, por proceso — se resetea al reiniciar el servidor).

## 5. Verificar en la UI

1. `/dashboard/leads` → el lead debe aparecer en la columna correcta con el badge de `outcomeStatus`.
2. Filtros del tablero: por defecto solo se ven leads `OPEN` creados en el mes actual (zona horaria Bogotá). Para ver el lead marcado `WON` de la prueba anterior, activá el chip "Ganado" en el filtro de estados, y ajustá el rango de fechas si hace falta.
3. Abrí el detalle del lead (`LeadDetailSheet`) y verificá:
   - El botón "Ver en CRM" solo aparece si mandaste `externalUrl`.
   - El botón "Convertir a negocio" abre `/dashboard/negocios/crear?leadId=<id>` con los datos precargados (nombre, apellido, email, teléfono).
4. `/dashboard/admin/lead-funnel-columns` → confirmá que no se puede borrar una columna que tiene leads activos.

## 6. Visibilidad por jerarquía

- Un lead con `ownerId` asignado solo lo ve ese usuario, sus jefes en la jerarquía (`idUserLeader`), y los roles admin (`HIERARCHY_BYPASS_ROLES`).
- Un lead sin dueño (`ownerId` null) **solo lo ven los roles admin** — probalo iniciando sesión con un usuario regular y confirmando que el lead de prueba sin `ownerEmail` válido no aparece en su tablero.

## 7. Notas para el rollout a QA/Producción

- Correr `npx tsx prisma/seed-lead-funnel-columns.ts` (o `npm run prisma:seed:lead-funnel-columns`) en QA y en Producción para crear las 22 columnas reales del funnel + "Sin mapear", sin tocar el resto de los datos del seed completo. Es idempotente, seguro de correr más de una vez.
- **Antes de correr el seed en un ambiente que ya tenga columnas creadas manualmente desde la UI**: si algún admin ya creó a mano una columna con una versión no canónica de alguno de estos nombres (ej. `nuevo lead` en vez de `NUEVO_LEAD`, antes de que existiera la normalización automática), el seed va a crear una **columna nueva y separada** con la key canónica en mayúscula, en vez de actualizar la vieja (`externalStatusKey` es único, así que valores distintos = filas distintas). Resultado: quedarían dos columnas pareadas para el mismo paso del funnel. Revisá `/dashboard/admin/lead-funnel-columns` antes de correr el seed en un ambiente existente, y si hay duplicados, eliminá la columna vieja (libera la key vía el tombstone de borrado) antes o después de correr el seed.
- Una vez seedeadas, compartí la tabla de la sección 2 (nombre → `externalStatusKey`) con quien configure el workflow de n8n — ese es el contrato exacto que el CRM tiene que respetar en el campo `statusKey` de cada webhook.

## Referencias

- Proposal / spec / design / tasks completos: `openspec/changes/leads-crm-sync/`
- Variables de entorno: `docs/ENVIRONMENT_VARIABLES.md` (sección `LEADS_CRM_SYNC_API_KEY`)
- Contrato del payload: `src/features/leads/types/crm-sync.schema.ts`
- Lógica de resolución de outcome: `src/features/leads/lib/lead-outcome-status.ts`
- Lógica de upsert/sync: `src/features/leads/services/lead-sync.service.ts`
