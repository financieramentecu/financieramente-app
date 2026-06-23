# Convenciones de Manejo de Fechas (Bogotá / UTC)

**Propósito**: Evitar que las fechas se corran un día (adelante o atrás) al convertir entre strings `YYYY-MM-DD`, `Date` y la visualización en UI.

**Fecha de creación**: 2026-06-17
**Origen**: Bug recurrente en `negocios` — `dateIssued` y `expectedDate` se mostraban/guardaban con un día de diferencia porque cada componente hacía su propia conversión de fecha con el timezone local del navegador/servidor en vez de Bogotá.

---

## El problema de raíz

Colombia es `UTC-5` (sin horario de verano). Un string `YYYY-MM-DD` no tiene timezone propio, así que `new Date('2026-06-17')` lo interpreta como **medianoche UTC**, que en Bogotá es **19:00 del día anterior**. Y `toLocaleDateString()` sin `timeZone` explícito usa el timezone del entorno donde corre el código (navegador del usuario o el del servidor), no necesariamente Bogotá.

Como cada archivo construía y mostraba fechas "a mano", dos pantallas podían representar el **mismo instante** con **días distintos**.

## La convención (única fuente de verdad)

Todo el manejo de fechas de negocio pasa por dos módulos. **No se construye ni se formatea una fecha "a mano" en ningún otro lugar.**

| Necesito... | Uso |
|---|---|
| Convertir un string `YYYY-MM-DD` (de un `<input type="date">` o un body de API) a `Date` | `dateOnlyToBogotaNoonUtc(dateStr)` — `src/features/negocios/lib/bogota-date.ts` |
| Mostrar una fecha (`Date` o ISO string) al usuario | `formatDateBogota(value)` — `src/features/shared/lib/format-date.ts` |
| Convertir un `Date` de vuelta a `YYYY-MM-DD` (ej. para escribirlo en un param de URL) | `bogotaDateOnly(date)` — `src/features/negocios/lib/bogota-date.ts` |
| Obtener el "hoy" calendario de Bogotá como medianoche UTC (comparaciones de mes, `bogotaYearMonth`) | `todayBogota()` — `src/features/negocios/lib/bogota-date.ts` |
| Obtener el "hoy" calendario de Bogotá **anclado igual que `expectedDate`** (mediodía UTC) — para comparar `expectedDate <= hoy` (ej. cron de fondeo) | `todayBogotaNoonUtc()` — `src/features/negocios/lib/bogota-date.ts` |

### Por qué mediodía UTC (`T12:00:00Z`) y no medianoche

Mediodía UTC = 07:00 Bogotá. Sin importar en qué timezone corra el código que lo parsea de vuelta (navegador del usuario, servidor, CI), sigue cayendo dentro del mismo día calendario en Bogotá. Medianoche UTC, en cambio, es 19:00 del día anterior en Bogotá — by construcción, ambigua.

### Reglas

1. **Nunca** `new Date(dateOnlyString)` directo — usar `dateOnlyToBogotaNoonUtc()`.
2. **Nunca** `new Date(\`${str}T12:00:00\`)` sin `Z` — sin la `Z` queda anclado al timezone local de quien ejecuta el código, no a UTC.
3. **Nunca** `.toLocaleDateString(...)` sin `{ timeZone: 'America/Bogota' }` para mostrar una fecha de negocio — usar `formatDateBogota()`.
4. **Nunca** derivar año/mes/día de una fecha con `.getFullYear()/.getMonth()/.getDate()` (son locales) cuando el valor representa una fecha de negocio en Bogotá — usar `Intl.DateTimeFormat` con `timeZone: 'America/Bogota'` (ver `formatToInputDate` en `BusinessViewModal.tsx` como ejemplo).
5. Una fecha-instante real con hora (timestamps de auditoría, `createdAt`, `now()` para anclar fondeos) **sí** puede usar `new Date()` normal — la convención aplica a fechas *de negocio* (`dateIssued`, `expectedDate`, `paymentDate`, `dateAnchored` cuando se construye desde un input de usuario).
6. **Nunca mezclar anchors al comparar contra `expectedDate`**: `expectedDate` siempre está anclado a mediodía UTC (`dateOnlyToBogotaNoonUtc`). Si necesitás un "hoy" para comparar (`expectedDate <= hoy`), usá `todayBogotaNoonUtc()` — **no** `todayBogota()` (medianoche UTC), porque medianoche UTC es *anterior* a mediodía UTC del mismo día, y la comparación excluiría incorrectamente los registros vencidos hoy mismo hasta el día siguiente.

## Migración (granular, no big-bang)

No se migra todo de una sola vez. Cada vez que se toque un archivo que maneje fechas de negocio:

1. Revisar si construye/formatea fechas a mano.
2. Si sí, migrarlo a los helpers de esta convención **como parte del mismo cambio** (no se abre un PR aparte solo para esto, salvo que sea el foco del ticket).
3. Agregar el archivo a la tabla de estado abajo.

### Estado de migración

| Archivo | Estado | Notas |
|---|---|---|
| `src/features/shared/lib/format-date.ts` (`formatDateBogota`) | ✅ Migrado | Fuente de verdad para mostrar fechas |
| `src/features/negocios/lib/bogota-date.ts` (`dateOnlyToBogotaNoonUtc`, `todayBogota`) | ✅ Migrado | Fuente de verdad para construir fechas |
| `src/app/api/negocios/[id]/aportes/[index]/cartera-pagado/route.ts` | ✅ Migrado | |
| `src/app/api/negocios/[id]/aportes/[index]/date-anchored/route.ts` | ✅ Migrado | |
| `src/features/negocios/components/BusinessTableSection.tsx` | ✅ Migrado | |
| `src/features/negocios/components/modals/BusinessViewModal.tsx` | ✅ Migrado | |
| `src/features/negocios/components/AdvancedFiltersSheet.tsx` (filtro avanzado: fondeo/creación/emisión) | ✅ Migrado | `getDefaultValues`/`toDateStr` ahora usan `dateOnlyToBogotaNoonUtc`/`bogotaDateOnly` |
| `src/features/negocios/lib/default-date-filter.ts` (`getCurrentMonthRange`) | ✅ Migrado | Seed por defecto del filtro de fechas según rol |
| `src/features/negocios/lib/to-business-list-filter-input.ts` / `bogota-date-range.ts` | ✅ Ya estaba correcto | Backend del filtro (WHERE de Prisma) ya usaba `parseBogotaInclusiveUtcRange` |
| `src/features/negocios/components/modals/EditFundedDateModal.tsx` | ✅ Migrado | `getTodayIso()` ahora usa `bogotaDateOnly(new Date())` |
| `src/features/negocios/components/modals/ConfirmCarteraPagadoDialog.tsx` | ✅ Migrado | Mismo fix que arriba |
| `src/features/negocios/components/modals/BusinessViewModal.tsx` (display de `createdAt` — "Registrado:") | ✅ Migrado | (nota: la fila anterior apuntaba por error a `[id]/route.ts`, que es un API route sin UI; el display real estaba acá) |
| `src/app/api/negocios/cron/fund-payments/route.ts` | ✅ Migrado | Usaba `todayBogota()` (medianoche UTC) para comparar contra `expectedDate` (mediodía UTC) — el cron corrido a las 6am Bogotá no encontraba los pagos vencidos el mismo día. Fix: `todayBogotaNoonUtc()` |

Cuando un archivo se migre, mover su fila a "✅ Migrado" en el mismo PR.

## Enforcement

Por ahora esto es **convención documentada + code review**, no un lint rule automático. Si el problema reaparece con frecuencia después de unas semanas, evaluar agregar un `eslint` rule (`no-restricted-syntax`) que bloquee `new Date(` sobre literales `YYYY-MM-DD` y `toLocaleDateString(` sin `timeZone` en `src/features/negocios/**` y `src/app/api/negocios/**`.
