# Guía de integración — Webhook de Leads (CRM → Financieramente)

Esta guía es para el equipo que configura el workflow de **n8n** (u otro sistema) que envía los leads del CRM hacia Financieramente. No requiere conocimiento del código del proyecto — solo cómo armar el request HTTP.

## 1. Qué hace este webhook, en simple

Financieramente tiene un módulo de **Leads** con un tablero tipo Kanban. Los leads no se crean ni se mueven manualmente ahí — **todo entra y se actualiza a través de este webhook**. Cada vez que en el CRM un lead cambia de etapa, se le asigna un Money Strategist, o se actualiza algún dato de contacto, el workflow de n8n tiene que llamar a este endpoint para reflejar ese cambio en Financieramente.

No hace falta distinguir "esto es una creación" de "esto es una actualización" — **el mismo endpoint sirve para ambos casos**. Financieramente identifica el lead por `externalCrmId`: si no existe, lo crea; si ya existe, lo actualiza.

## 2. Endpoint y autenticación

```
POST https://<dominio-del-ambiente>/api/leads/crm-sync
Content-Type: application/json
x-api-key: <API key entregada por el equipo de Financieramente>
```

- `<dominio-del-ambiente>` cambia según a qué ambiente esté apuntando el workflow (QA o producción) — pedir la URL exacta y la API key de cada ambiente al equipo de Financieramente. **Son API keys distintas por ambiente, nunca se reutiliza la misma.**
- El header `x-api-key` es obligatorio en cada request. Sin él (o con un valor incorrecto), el endpoint responde `401` y no procesa nada.
- No hace falta ningún tipo de sesión, cookie ni OAuth — es autenticación simple por API key.

## 3. Contrato del payload

Todo el body va como JSON. Estos son los campos:

| Campo | Obligatorio | Tipo | Descripción |
|-------|:-----------:|------|-------------|
| `externalCrmId` | **Sí** | texto | El ID único del lead/contacto en el CRM. Es la clave que usa Financieramente para saber si es un lead nuevo o uno que ya existía. **Siempre debe ser el mismo valor para el mismo lead**, en todas las llamadas de su ciclo de vida. |
| `statusKey` | **Sí** | texto | La etapa del funnel en la que está el lead ahora mismo (ver sección 4 — la lista completa de valores válidos). |
| `name` | No | texto | Nombre del lead. |
| `lastName` | No | texto | Apellido del lead. |
| `email` | No | email | Correo del lead. |
| `phone` | No | texto | Teléfono del lead. |
| `identityNumber` | No | texto | Cédula/documento de identidad. Normalmente no se tiene en el primer contacto — se puede mandar más adelante cuando se consiga. |
| `originTag` | No | texto | Etiqueta libre para identificar de qué campaña/pipeline vino el lead (ej. el nombre del pipeline en el CRM). Es solo informativa, no afecta nada del flujo. |
| `externalUrl` | No | URL | Link directo al lead/contacto dentro del CRM. Si se manda, en Financieramente aparece un botón "Ver en CRM" en el detalle del lead. |
| `ownerEmail` | No | email | El correo del **Money Strategist** asignado al lead (ver sección 6). |
| `outcomeStatus` | No (pero **recomendado enviarlo siempre**) | texto | El resultado actual del lead: `OPEN`, `WON`, `LOST` o `ABANDONED` (ver sección 5). |

### Reglas importantes sobre el payload

- **Nunca hace falta mandar todos los campos en cada llamada.** Si un campo no se manda (o se manda vacío), Financieramente **no borra** el dato que ya tenía guardado — simplemente lo deja como estaba. Por ejemplo, si ya se guardó el `email` del lead y después se manda un update solo con `statusKey`, el email sigue intacto.
- Los únicos dos campos que conviene mandar **siempre**, en cada llamada, son `externalCrmId` y `statusKey`. El resto se manda cuando hay un dato nuevo o un cambio real.
- El endpoint **nunca falla por datos de negocio "raros"** — si `statusKey` no corresponde a ninguna columna configurada, o `ownerEmail` no corresponde a ningún Money Strategist activo, el request igual se procesa y responde éxito (código 200). El lead simplemente queda en un estado especial hasta que alguien lo corrija del lado de Financieramente (ver secciones 4 y 6).
- El único caso donde el endpoint rechaza el request (código 400) es si falta `externalCrmId` o `statusKey`, o si algún campo tiene un formato inválido (ej. `email` que no es un email válido).

## 4. Las columnas del funnel (`statusKey`)

`statusKey` le dice a Financieramente en qué columna del tablero Kanban debe aparecer el lead. Estos son los 22 valores válidos actualmente configurados:

| Columna en Financieramente | Valor de `statusKey` a enviar |
|---|---|
| Lead Nuevo | `NUEVO_LEAD` |
| Contacto 1ra Vez | `PRIMER_CONTACTO` |
| Contacto 2ra Vez | `SEGUNDO_CONTACTO` |
| Contacto 3ra Vez | `TERCER_CONTACTO` |
| Contacto 4ra Vez | `CUARTO_CONTACTO` |
| Contacto 5ra Vez | `QUINTO_CONTACTO` |
| Diagnostico Agendado | `DIAGNOSTICO_AGENDADO` |
| Asistió al diagnostico | `ASISTIO_AL_DIAGNOSTICO` |
| No asistió al diagnostico | `NO_ASISTIO_AL_DIAGNOSTICO` |
| Reagendamiento | `REAGENDAMIENTO` |
| Pendiente Tareas | `PENDIENTE_TAREAS` |
| Tareas recibidas | `TAREAS_RECIBIDAS` |
| Estructurando propuesta | `ESTRUCTURANDO_PROPUESTA` |
| Cita de propuesta agendada | `CITA_PROPUESTA_AGENDADA` |
| Asistió a la cita de propuesta | `ASISTIO_CITA_PROPUESTA` |
| No asistió a la cita de propuesta | `NO_ASISTIO_CITA_PROPUESTA` |
| Propuestas Aceptadas | `PROPUESTA_ACEPTADA` |
| Seguimiento | `SEGUIMIENTO` |
| Negocio aplazado | `NEGOCIO_APLAZADO` |
| En acompañamiento | `EN_ACOMPANAMIENTO` |
| Cierre | `CIERRE` |
| Won | `WON` |

**Este es el contrato — lo define Financieramente, no el CRM.** Si el CRM tiene una etapa que todavía no está en esta lista, avisar al equipo de Financieramente para que la agreguen (es una configuración rápida del lado de ellos), en vez de inventar un valor nuevo del lado de n8n.

No importa si se manda en mayúscula, minúscula o con espacios (`nuevo lead`, `Nuevo Lead`, `NUEVO_LEAD` son equivalentes) — Financieramente lo normaliza automáticamente. Si de todos modos se manda un valor que no corresponde a ninguna columna, el lead cae en una columna especial "Sin mapear" y el equipo de Financieramente lo nota ahí — no se pierde el dato, pero conviene evitarlo usando siempre los valores de la tabla de arriba.

## 5. El resultado del lead (`outcomeStatus`)

Este campo es **independiente** de `statusKey`. Mientras `statusKey` dice "en qué paso del proceso está", `outcomeStatus` dice "cómo va a terminar (o terminó) ese lead":

| Valor | Significado |
|---|---|
| `OPEN` | El lead sigue activo, en proceso. Es el valor por defecto. |
| `WON` | El lead se convirtió en cliente/venta. **Ver la regla especial abajo.** |
| `LOST` | El lead se perdió. |
| `ABANDONED` | El lead dejó de responder / se abandonó el seguimiento. |

**Regla especial: una vez que un lead llega a `WON`, queda así para siempre.** Si después de marcar `WON` se manda otro webhook con `outcomeStatus` distinto (`LOST`, por ejemplo), Financieramente **ignora ese cambio de resultado** — el lead se queda en `WON`. El resto de los datos del payload (columna, teléfono, etc.) sí se siguen actualizando normalmente; solo el resultado queda bloqueado. Esto es intencional: `WON` es un estado final de "venta ganada" y no debería revertirse por un error de sincronización posterior.

Si se manda un valor que no es ninguno de los 4 de la tabla (por un typo, por ejemplo), Financieramente lo trata como `OPEN` y no rechaza el request.

**Recomendación:** configurar el workflow de n8n para que mande `outcomeStatus` en **todas** las llamadas, reflejando el estado real y actual del lead en el CRM en ese momento — no hace falta lógica especial para "solo mandarlo cuando cambia".

## 6. Asignación del Money Strategist (`ownerEmail`)

`ownerEmail` es el correo del Money Strategist (asesor) al que se le asigna el lead en Financieramente. Tiene que ser el mismo correo con el que esa persona tiene su usuario en Financieramente.

- La comparación **no distingue mayúsculas/minúsculas** y descarta espacios — `Juan.Perez@dominio.com` y `juan.perez@dominio.com` son equivalentes.
- **No existe "asignación fija".** Cada vez que se manda `ownerEmail`, Financieramente vuelve a resolver quién es el dueño y actualiza — incluso si ya tenía uno distinto asignado. Si el CRM reasigna el lead a otro Money Strategist, el próximo webhook con el nuevo `ownerEmail` va a mover la asignación.
- Si no se manda `ownerEmail` en una llamada puntual, Financieramente conserva el dueño que ya tenía asignado (no lo borra).
- **Si el correo enviado no corresponde a ningún Money Strategist activo en Financieramente** (typo, persona que ya no trabaja ahí, etc.), el lead queda **sin asignar** — sigue existiendo y actualizándose con normalidad, pero solo lo pueden ver los administradores hasta que se corrija el correo. El webhook igual responde éxito, no se rechaza por esto.

## 7. Ejemplo de configuración en n8n

Usando el nodo **HTTP Request**:

- **Method**: `POST`
- **URL**: `https://<dominio-del-ambiente>/api/leads/crm-sync`
- **Authentication**: `None` (la autenticación va por header, no por el sistema de auth de n8n)
- **Headers**:
  - `Content-Type`: `application/json`
  - `x-api-key`: `{{ $env.FINANCIERAMENTE_API_KEY }}` (recomendado guardarla como variable de entorno de n8n, nunca hardcodeada en el nodo)
- **Body** → `JSON`, mapeando los campos del contacto de GHL (u otro CRM) a los nombres que espera Financieramente. Ejemplo de expresión en n8n:

```json
{
  "externalCrmId": "={{ $json.contact_id }}",
  "statusKey": "={{ $json.pipeline_stage }}",
  "name": "={{ $json.first_name }}",
  "lastName": "={{ $json.last_name }}",
  "email": "={{ $json.email }}",
  "phone": "={{ $json.phone }}",
  "originTag": "={{ $json.pipeline_name }}",
  "ownerEmail": "={{ $json['Assigned Coach Email'] }}",
  "outcomeStatus": "={{ $json.status }}"
}
```

> Importante: los nombres de campo de la izquierda (`externalCrmId`, `statusKey`, etc.) son el contrato fijo de Financieramente — no cambian. Los nombres de la derecha (`$json.contact_id`, `$json.pipeline_stage`, etc.) son los campos que manda el CRM de origen y sí pueden variar. La traducción entre ambos mundos (mapear el nombre real de la etapa del CRM a uno de los 22 `statusKey` de la sección 4, por ejemplo) se resuelve en este nodo de n8n — Financieramente nunca ve el formato original del CRM.

## 8. Ejemplos de payload por escenario

**Lead nuevo entra al funnel:**
```json
{
  "externalCrmId": "ghl-contact-8821",
  "statusKey": "NUEVO_LEAD",
  "name": "Maria",
  "lastName": "Gonzalez",
  "email": "maria.gonzalez@example.com",
  "phone": "3011234567",
  "originTag": "Asesorías Estratégicas de Cortesía",
  "ownerEmail": "asesor@financieramente.co",
  "outcomeStatus": "OPEN"
}
```

**El lead avanza de columna (mismo `externalCrmId`):**
```json
{
  "externalCrmId": "ghl-contact-8821",
  "statusKey": "PRIMER_CONTACTO",
  "outcomeStatus": "OPEN"
}
```

**Se reasigna a otro Money Strategist:**
```json
{
  "externalCrmId": "ghl-contact-8821",
  "statusKey": "SEGUIMIENTO",
  "ownerEmail": "otro.asesor@financieramente.co",
  "outcomeStatus": "OPEN"
}
```

**Se cierra la venta:**
```json
{
  "externalCrmId": "ghl-contact-8821",
  "statusKey": "CIERRE",
  "outcomeStatus": "WON"
}
```

## 9. Qué hacer según la respuesta

| Código | Significa | Qué hacer en n8n |
|---|---|---|
| `200` | Todo bien, se creó/actualizó el lead. | Nada — continuar el workflow. |
| `400` | Falta `externalCrmId` o `statusKey`, o algún campo tiene formato inválido (ej. email mal formado). | Revisar el mapeo de campos del nodo — es un error de configuración del workflow, reintentar no lo va a arreglar. |
| `401` | La API key es incorrecta o falta el header. | Verificar que `x-api-key` esté bien configurado y sea el de este ambiente (QA vs producción usan keys distintas). |
| `429` | Se superó el límite de solicitudes (~120 por minuto por API key). | Esperar un momento y reintentar — no debería pasar en uso normal, solo si hay una ráfaga muy grande de eventos. |

El body de la respuesta siempre es JSON: `{ "data": ... }` si salió bien, o `{ "data": null, "error": "mensaje" }` si hubo un error — el campo `error` trae el detalle en `400`/`401`.

## 10. Reintentos e idempotencia

Es seguro reintentar el mismo webhook si n8n no está seguro de si se procesó (timeout de red, por ejemplo). Financieramente identifica el lead por `externalCrmId` y hace upsert — reenviar exactamente el mismo payload no crea un lead duplicado ni genera un estado raro, simplemente vuelve a aplicar los mismos valores.

## Preguntas frecuentes

**¿Puedo mandar solo los campos que cambiaron, o siempre el contacto completo?**
Cualquiera de las dos formas funciona. Financieramente solo actualiza lo que reciba y conserva el resto. Mandar el contacto completo en cada llamada es más simple de configurar en n8n y no tiene ningún efecto negativo.

**¿Qué pasa si el mismo lead vuelve a entrar al funnel más adelante con un `externalCrmId` distinto (ej. el CRM le creó un contacto nuevo)?**
Financieramente lo trata como un lead totalmente nuevo e independiente — no intenta fusionarlo con el anterior por email o cédula.

**¿Puedo cambiar `statusKey` a un valor que no está en la lista de la sección 4 mientras se define?**
Se puede, pero el lead va a caer en "Sin mapear" hasta que alguien de Financieramente cree la columna correspondiente o corrija el mapeo del lado de n8n. Mejor coordinar antes de lanzar un pipeline nuevo del CRM.

**¿Hay ambiente de pruebas antes de conectar producción?**
Sí, pedir al equipo de Financieramente la URL y API key del ambiente de QA para probar el workflow antes de apuntar a producción.

## Referencias técnicas (para el equipo de Financieramente)

- Guía de pruebas internas con curls: `docs/LEADS_CRM_SYNC_TESTING_GUIDE.md`
- Variables de entorno / CI-CD: `docs/ENVIRONMENT_VARIABLES.md`
- Contrato del payload en código: `src/features/leads/types/crm-sync.schema.ts`
- Seed de las columnas del funnel: `prisma/seeds/lead-funnel-columns.ts`
