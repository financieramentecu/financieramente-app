# Feature Flags

Guía para agregar, usar y retirar feature flags en financieramente-app.

---

## Stack

| Capa | Módulo |
|---|---|
| SDK servidor | `flagsmith-nodejs` — singleton en `src/features/shared/lib/flagsmith-server.ts` |
| SDK cliente | `@flagsmith/flagsmith` — React context en `src/features/shared/providers/flagsmith-provider.tsx` |
| Hook | `useFeatureFlag` en `src/features/shared/hooks/use-feature-flag.ts` |
| Catálogo de nombres | `src/features/shared/types/feature-flags.types.ts` |

---

## Cómo agregar un nuevo flag

### Paso 1 — Creá el flag en Flagsmith

1. Entrá a [app.flagsmith.com](https://app.flagsmith.com)
2. Seleccioná el environment **QA** → **Feature Flags** → **Create Feature**
3. Nombre: `snake_case`, sin espacios (ej: `negocios_advanced_filters`)
4. Repetí para el environment **Production**

> El nombre debe ser idéntico en QA y Prod.

### Paso 2 — Agregalo al catálogo de tipos

Abrí `src/features/shared/types/feature-flags.types.ts` y agregá el nuevo nombre al union type:

```ts
export type FeatureFlag =
  | 'negocios_advanced_filters'
  | 'tu_nuevo_flag'          // ← acá
```

Eso es todo. TypeScript va a rechazar cualquier typo en tiempo de compilación.

### Paso 3 — Usalo en el código

**En un Client Component:**

```tsx
'use client'
import { useFeatureFlag } from '@/features/shared/hooks/use-feature-flag'

export function MiComponente() {
  const { enabled } = useFeatureFlag('tu_nuevo_flag')

  if (!enabled) return null
  return <div>Feature activa</div>
}
```

**En un Server Component o Route Handler:**

```ts
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'

export async function GET() {
  const enabled = await isFeatureEnabledServer('tu_nuevo_flag')
  if (!enabled) return Response.json({ error: 'Not found' }, { status: 404 })
  // ...
}
```

**En un Server Action:**

```ts
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'

export async function miAction() {
  const enabled = await isFeatureEnabledServer('tu_nuevo_flag')
  if (!enabled) throw new Error('Feature no disponible')
  // ...
}
```

> **Regla de arquitectura**: los flags se evalúan en la capa de acción o route handler. Los servicios (`services/`) nunca importan Flagsmith — reciben parámetros ya validados.

---

## Convenciones de nombres

| Patrón | Ejemplo |
|---|---|
| `[feature]_[descripcion]` | `negocios_advanced_filters` |
| `[feature]_[entidad]_[accion]` | `pagos_bulk_upload` |

- Siempre `snake_case`
- Siempre en inglés
- El nombre debe describir la funcionalidad, no el experimento

---

## Valores multivariate

Si el flag tiene un valor string/number (no solo boolean):

```ts
const { enabled, value } = useFeatureFlag('tu_nuevo_flag')
// value: string | number | boolean | null
```

---

## Retirar un flag (cleanup)

Cuando el flag está 100% habilitado y ya no es necesario:

1. Eliminá el condicional del código — dejá solo la rama activa
2. Sacá el nombre del union type en `feature-flags.types.ts`
3. Archivá o eliminá el flag en el dashboard de Flagsmith
4. Commiteá con `chore(flags): remove [nombre_del_flag] flag`

---

## Propagación de cambios

Los cambios en el dashboard de Flagsmith tardan **máximo 60 segundos** en reflejarse en el servidor (configurado en `environmentRefreshIntervalSeconds: 60`). El cliente se actualiza en el siguiente refresh del SDK.

---

## Troubleshooting

**El flag siempre devuelve `false`**
- Verificá que el nombre en el código coincide exactamente con el nombre en el dashboard (case-sensitive)
- Revisá que el flag esté habilitado en el environment correcto (QA vs Prod)

**Error: `FLAGSMITH_SERVER_KEY is not set`**
- Falta la variable de entorno. Agregala a `.env.local` para desarrollo local (ver `docs/ENVIRONMENT_VARIABLES.md`)

**El cambio en el dashboard no se refleja**
- Esperá hasta 60 segundos
- En desarrollo, reiniciá el servidor si el singleton quedó cacheado con el estado anterior
