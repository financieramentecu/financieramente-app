# Design: Admin Discount (Dynamic Discount Management)

**Convención de diseño (proyecto Financieramente):** Siempre que se hable de diseño o se implemente UI/UX en este proyecto, usar el skill **ui-ux-pro-max** (`.cursor/skills/ui-ux-pro-max`). Referencia visual: **`financieramnete.pen`**; reglas y checklist: ui-ux-pro-max. Ver sección "UI/UX Design Reference" más abajo.

## Technical Approach

Introduce a new Prisma model `CommissionDiscount` (table `commission_discount`) with one row per discount and type enum (IMPUESTO | CLAWBACK). Enforce at most one ACTIVE per type in application logic. Build the domain feature at `src/features/commission-discounts/` (root); expose list/create/inactivate via admin API and dashboard page. Process-batch will resolve active discount by type (two queries or one with `type: { in: [...] }`), convert percentage to ratio for snapshots, and keep the same snapshot shape for processors. CommissionConfiguration remains in schema during transition; process-batch reads only from CommissionDiscount with fallback to hardcoded 0.12 / 0.1. Audit log extended with DISCOUNT_CREATED and DISCOUNT_INACTIVATED.

## Architecture Decisions

### Decision: One active per type enforced in application

**Choice**: Enforce "at most one ACTIVE per type" in API/service layer (check before create; inactivate is a status update only).

**Alternatives considered**: (1) PostgreSQL partial unique index `UNIQUE (type) WHERE status = 'ACTIVE'` — Prisma does not declare partial indexes in schema; would require raw SQL in migration. (2) Database trigger — adds complexity and is less visible in code.

**Rationale**: Application check is explicit, testable, and consistent with existing admin validation patterns. If we need partial unique later for extra safety, we can add it in a follow-up migration.

### Decision: Store percentage as decimal 0.01–100 (display value)

**Choice**: Store `percentage` as Decimal(5,2) in the range 0.01–100 (e.g. 12.00 for 12%). In process-batch, convert to ratio (divide by 100) when building snapshots so processor contract remains unchanged (snapshots still use 0.12 for 12%).

**Alternatives considered**: (1) Store as ratio (0.01–1) like current CommissionConfiguration — would require UI to show value * 100 and validate 0.0001–1. (2) Store as ratio and show * 100 in UI — same as (1), more conversion in UI.

**Rationale**: Spec and acceptance criteria use "Porcentaje (%)" and example "12.00"; list shows "12.00%". Storing the display value keeps API and UI simple; single conversion point in process-batch.

### Decision: Optional createdById / updatedById on CommissionDiscount

**Choice**: Add optional `createdById` and `updatedById` (FK to User) on CommissionDiscount. On create set createdById from session; on inactivate set updatedById and updatedAt. List can show "Creado por" / "Modificado por" via include User name without querying AuditLog.

**Alternatives considered**: (1) No FKs; only AuditLog — list would need to join or parse audit details for display. (2) Required FKs — would force User on every path; optional allows backward compatibility if session is missing.

**Rationale**: Matches acceptance criteria columns "Creado por", "Modificado por". AuditLog still stores full payload in details for traceability; FKs simplify list query.

### Decision: CommissionConfiguration kept in schema; process-batch reads only CommissionDiscount

**Choice**: Add CommissionDiscount; do not remove CommissionConfiguration in this change. Process-batch reads active CommissionDiscount by type; if none found for a type, use DEFAULT_DISCOUNT_PERCENTAGE (0.12) and DEFAULT_CLAWBACK_PERCENTAGE (0.1). Seed or a one-off migration can create initial CommissionDiscount rows from current CommissionConfiguration; deprecation of CommissionConfiguration is deferred.

**Alternatives considered**: (1) Drop CommissionConfiguration in same change — riskier; requires data migration and rollback complexity. (2) Process-batch tries CommissionDiscount first, falls back to CommissionConfiguration — two code paths and ordering ambiguity.

**Rationale**: Reduces risk; allows gradual cutover. Seed script can create two CommissionDiscount rows (IMPUESTO 12%, CLAWBACK 10%) from existing config so behavior is unchanged after deploy.

### Decision: Single action "Inactivar" for list; no edit/delete

**Choice**: List table shows one action button "Inactivar" only for rows with status ACTIVE. No edit, no reactivate, no row delete. Reuse admin table patterns (CrudTable or similar) but with a single action column that calls POST /api/admin/discounts/[id]/inactivate; hide or omit edit/delete.

**Alternatives considered**: (1) Use CrudTable with onDelete → inactivate — might show "Eliminar" label; confusing. (2) Custom DiscountsTable with only "Inactivar" — clearer; can wrap shared Table primitives.

**Rationale**: Spec explicitly says inactive records are read-only and no reactivation. Single action keeps UI and API aligned with business rules.

### Decision: UI/UX from financieramnete.pen + skill ui-ux-pro-max

**Choice**: Al implementar la UI del módulo Descuentos, usar como referencia el diseño en **`financieramnete.pen`** y aplicar el skill **ui-ux-pro-max** (`.cursor/skills/ui-ux-pro-max`) para guía de estilo, accesibilidad, interacción y buenas prácticas. Los tokens visuales concretos (colores, tipografía) se toman del .pen; las reglas de prioridad (accesibilidad, touch targets, contraste, focus, etc.) del skill ui-ux-pro-max.

**Rationale**: El .pen define la lengua visual del módulo; ui-ux-pro-max aporta las 99 guías UX, paletas, tipografía y checklist pre-entrega (contraste 4.5:1, cursor-pointer, labels en formularios, etc.) para que la implementación sea profesional y accesible.

## UI/UX Design Reference (financieramnete.pen + ui-ux-pro-max)

- **Diseño visual**: **`financieramnete.pen`** en la raíz del repo (pantallas y tokens siguientes).
- **Estilo y UX**: Aplicar el skill **ui-ux-pro-max**. Al implementar, invocar el skill (por ejemplo generando design system con `--design-system` para "admin dashboard fintech") y cumplir sus reglas: accesibilidad (contraste, focus, labels), touch targets ≥44px, feedback de errores, cursor-pointer en interactivos, y Pre-Delivery Checklist del skill.

### Pantallas en el .pen

- **Modal Crear Descuento** (frame `Modal Crear Descuento`): formulario de creación. Ancho 420px, fondo blanco, borde y sombra. Header: título "Crear Descuento", subtítulo "Completa el formulario para crear un nuevo descuento de comisión". Body: campos Nombre *, Tipo * (select), Porcentaje (%) * (helper "Valor entre 0.01 y 100"), Descripción (opcional). Footer: Cancelar + Guardar. Incluye caja de advertencia cuando ya existe un descuento activo del mismo tipo (texto tipo: "Ya existe un descuento ACTIVO de tipo IMPUESTO (12%). Al crear este, el anterior se inactivará." — en implementación puede ajustarse al mensaje de validación 409 del API).
- **Admin Discounts - Lista** (frame `Admin Discounts - Lista`): página completa 1440×900 con sidebar (#00545c), área principal #F8FAFB y zona de tabs (TabsList). La tabla/listado de descuentos va en el área principal.

### Tokens visuales (del .pen)

| Uso | Valor | Notas |
|-----|--------|--------|
| Primary / botón principal | `#00545c` | Teal oscuro |
| Texto primario / labels | `#00545c` | Inter 13px weight 500 |
| Texto secundario / placeholder / helper | `#529398` | Inter 13px normal |
| Borde inputs / modal / footer | `#DDE9EB` | |
| Fondo página / main area | `#F8FAFB` | |
| Fondo tabs / neutro | `#F1F5F5` | |
| Fondo modal / inputs | `#FFFFFF` | |
| Advertencia (warning) fondo | `#FFFBEB` | Borde `#F59E0B` |
| Advertencia texto | `#92400E` / `#B45309` | |
| Tipografía | Inter | 11px helper, 13px body/labels, 18px bold título modal |
| Radio | 6px (inputs, botones), 8px (modal, contenedor tabs) | |
| Sombras | Modal: blur 24, offset y 8, color #00000020; botón primario: blur 16, #00505c59 | |

### Reglas de implementación UI

1. **Modal crear**: Estructura y copy del .pen (título, subtítulo, campos Nombre, Tipo, Porcentaje, Descripción; botones Cancelar / Guardar). Placeholder nombre: "Ej: Impuesto estándar 2026". Helper porcentaje: "Valor entre 0.01 y 100".
2. **Lista**: Página con mismo layout que "Admin Discounts - Lista" (sidebar + main + tabs si aplica). Tabla con columnas según spec; acción "Inactivar" solo para registros ACTIVE.
3. **Estilo y UX**: Aplicar el skill **ui-ux-pro-max** (design system, dominios ux/color/typography según el skill) y usar los tokens de la tabla anterior para colores/tipografía del .pen. Verificar Pre-Delivery Checklist del skill antes de entregar (contraste, focus, cursor-pointer, labels, etc.).

## Data Flow

### Resolve percentages for process-batch

```
ProcessBatchService.processBatch()
    │
    ├─► prisma.commissionDiscount.findMany({
    │     where: { status: 'ACTIVE', type: { in: ['IMPUESTO','CLAWBACK'] } }
    │   })
    │   OR two findFirst({ where: { status: 'ACTIVE', type: 'IMPUESTO' } }) etc.
    │
    ├─► discountPercentage = (impuestoRow?.percentage / 100) ?? 0.12
    ├─► clawbackPercentage = (clawbackRow?.percentage / 100) ?? 0.1  (or null)
    │
    └─► snapshots = { discountPercentage, clawbackPercentage }
         └─► processors unchanged (same shape)
```

### Admin create discount

```
Client (form) ──POST /api/admin/discounts──► Route (auth, Zod)
                                                    │
                                                    ├─► Check: no other ACTIVE for same type
                                                    ├─► prisma.commissionDiscount.create({ createdById: session.user.id })
                                                    ├─► logAuditEvent(DISCOUNT_CREATED, details)
                                                    └─► return 201
```

### Admin inactivate (flujo completo)

1. **Click "Inactivar"** (solo visible para filas con status ACTIVE): el cliente abre un **modal de confirmación** (no se llama al API todavía).
2. **Contenido del modal**:
   - Mensaje: *"¿Está seguro de que desea inactivar el descuento '[Nombre]' de tipo [Tipo] con porcentaje [X%]? Esta acción cambiará el estado a Inactivo. El historial de negocios liquidados con este descuento se conservará sin cambios. Los archivos cargados a partir de este momento no aplicarán este descuento."*
   - Botones: **Confirmar** y **Cancelar**.
3. **Cancelar**: se cierra el modal sin llamar al API; no se cambia nada.
4. **Confirmar**: el cliente envía `POST /api/admin/discounts/[id]/inactivate`. La ruta: carga el registro, rechaza si ya está INACTIVE (400), actualiza `status` a INACTIVE y `updatedById`, registra `DISCOUNT_INACTIVATED` en auditoría con estado anterior en `details`, responde 200.
5. **Tras éxito**: el cliente cierra el modal, muestra mensaje de éxito (*"Descuento inactivado exitosamente"*), refresca el listado; la fila pasa a mostrarse con estado "Inactivo" y **sin** botón "Inactivar" (registros inactivos son solo lectura).

```
Client: click "Inactivar" ──► Abre modal confirmación (Nombre, Tipo, %)
                                    │
              Cancelar ◄────────────┼────────────► Confirmar
                    (cierra modal)   │                    │
                                     │                    ▼
                                     │         POST /api/admin/discounts/[id]/inactivate
                                     │                    │
                                     │                    ├─► Load row; 400 si ya INACTIVE
                                     │                    ├─► update({ status: 'INACTIVE', updatedById })
                                     │                    ├─► logAuditEvent(DISCOUNT_INACTIVATED, details)
                                     │                    └─► 200
                                     │                    │
                                     │                    ▼
                                     │         Cierra modal, toast éxito, refresh listado
                                     │         Fila muestra "Inactivo" y sin botón Inactivar
```

### Comportamiento UX del flujo Inactivar (ui-ux-pro-max)

Al implementar el botón "Inactivar" y el modal de confirmación, aplicar estas reglas del skill **ui-ux-pro-max** para que el flujo quede reflejado de forma clara en el diseño:

| Momento | Comportamiento UX (ui-ux-pro-max) |
|--------|------------------------------------|
| **Botón "Inactivar" en la tabla** | `cursor-pointer`; hover con feedback visual (color/sombra/borde); área clicable mínima **44×44px** (touch-target-size); si el botón es solo icono, `aria-label="Inactivar descuento"`; anillo de foco visible (focus-states). |
| **Click en Inactivar** | Abre el modal; **trap de foco** dentro del modal; foco inicial en "Cancelar" (opción segura) o en el primer elemento interactivo; **Escape** cierra el modal (equivale a Cancelar) (keyboard-nav). |
| **Modal abierto** | Mensaje de confirmación legible (contraste ≥4.5:1); botones "Cancelar" y "Confirmar" con **44×44px** mínimo, `cursor-pointer`, transición suave 150–300ms al hover (duration-timing). |
| **Click en Confirmar** | **Loading**: el botón "Confirmar" se deshabilita y muestra estado de carga (spinner o texto "Inactivando…") hasta recibir respuesta (loading-buttons). No se puede enviar de nuevo mientras está en curso. |
| **Si el API devuelve error (400/500)** | **Error feedback**: mensaje de error claro **dentro o junto al modal** (p. ej. "No se pudo inactivar. El descuento ya está inactivo."), no solo toast; el botón "Confirmar" se rehabilita para reintentar o el usuario puede Cancelar (error-feedback). |
| **Si el API responde 200** | Cierra el modal (animación opcional 150–300ms); toast "Descuento inactivado exitosamente"; refresh del listado. Evitar **content-jumping**: mantener altura/placeholder de la tabla o usar skeleton breve si el refresh tarda (content-jumping, loading-states). |
| **Tras refresh** | La fila correspondiente muestra estado "Inactivo" y **ya no** muestra el botón "Inactivar"; sin cambio brusco de layout (la fila no "salta"). |

**Checklist pre-entrega (extracto ui-ux-pro-max) para este flujo**: cursor-pointer en Inactivar y en ambos botones del modal; focus visible en todos los interactivos; botón Confirmar deshabilitado + loading durante POST; mensaje de error visible en fallo; contraste del texto del modal ≥4.5:1.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add model CommissionDiscount (id, name, type enum, percentage Decimal(5,2), description?, status, createdAt, updatedAt, createdById?, updatedById?); @@map("commission_discount"). Add relation User → CommissionDiscount if createdById/updatedById used. |
| `prisma/migrations/YYYYMMDD_add_commission_discount/migration.sql` | Create | Create table commission_discount; optional: partial unique index (type) WHERE status = 'ACTIVE' (if added later). |
| `prisma/seeds/discount.ts` | Modify | After checking CommissionConfiguration, also ensure at least one CommissionDiscount per type exists (e.g. create IMPUESTO 12%, CLAWBACK 10% if none); or create from current CommissionConfiguration row. |
| `src/features/auth/lib/audit-logger.ts` | Modify | Add AuditAction.DISCOUNT_CREATED, AuditAction.DISCOUNT_INACTIVATED. |
| `src/features/commission-discounts/types/commission-discount.types.ts` | Create | Domain types: CommissionDiscount, CreateCommissionDiscountInput, list response; type enum IMPUESTO \| CLAWBACK. |
| `src/features/commission-discounts/lib/commission-discount-schemas.ts` | Create | Zod: createCommissionDiscountSchema (name, type, percentage 0.01–100, description optional, status default ACTIVE). |
| `src/features/commission-discounts/lib/commission-discount-api.ts` | Create | Fetch wrappers: getCommissionDiscounts(), createCommissionDiscount(), inactivateCommissionDiscount(id). |
| `src/features/commission-discounts/hooks/use-commission-discounts.ts` | Create | useCommissionDiscounts(): fetch list, AsyncState. |
| `src/features/commission-discounts/hooks/use-commission-discount-mutations.ts` | Create | useCommissionDiscountMutations(): create, inactivate; handle errors and success messages. |
| `src/features/commission-discounts/components/commission-discounts-table.tsx` | Create | Table with columns Name, Type, Percentage (%), Status, Created at, Created by, Last modified, Modified by; action "Inactivar" only for ACTIVE. Botón Inactivar: según ui-ux-pro-max (cursor-pointer, min 44×44px, aria-label, focus visible); al click abre modal de confirmación (ver flujo Inactivar en este design). |
| `src/features/commission-discounts/components/commission-discount-form.tsx` | Create | Form for create: name, type (select), percentage (number 0.01–100), description (optional), status (default Active). Uses commission-discount-schemas. **UI**: Match Modal Crear Descuento in `financieramnete.pen`; apply ui-ux-pro-max skill for style and UX (see UI/UX Design Reference). |
| `src/features/commission-discounts/components/inactivate-confirm-modal.tsx` | Create | Modal de confirmación: mensaje completo con nombre, tipo y %; botones "Confirmar" y "Cancelar". Comportamiento según **Comportamiento UX del flujo Inactivar (ui-ux-pro-max)** en este design: focus trap, Escape = Cancelar, loading en Confirmar durante POST, mensaje de error en modal si falla, luego toast éxito y refresh. Mismos tokens visuales que modal crear. |
| `src/app/dashboard/admin/discounts/page.tsx` | Create | Client page: title "Descuentos", "+ Crear Descuento" button, table (useCommissionDiscounts), create modal (form), inactivate confirm modal; layout DashboardLayout currentPage="Administración". **Layout**: Align with frame "Admin Discounts - Lista" in `financieramnete.pen`; apply ui-ux-pro-max for layout/UX rules. |
| `src/app/api/admin/discounts/route.ts` | Create | GET: auth(), list CommissionDiscount (include createdBy/updatedBy User name); return { data: discounts }. POST: auth(), Zod parse, check no ACTIVE for same type, create, logAuditEvent(DISCOUNT_CREATED), return 201. |
| `src/app/api/admin/discounts/[id]/inactivate/route.ts` | Create | POST: auth(), load discount by id, if status already INACTIVE return 400, update status + updatedById, logAuditEvent(DISCOUNT_INACTIVATED, details with previous state), return 200. |
| `src/app/dashboard/admin/page.tsx` | Modify | Add admin module { title: 'Descuentos', description: '...', href: '/dashboard/admin/discounts', icon: <Percent or similar /> }. |
| `src/features/load-file/services/process-batch.service.ts` | Modify | Replace CommissionConfiguration findFirst with CommissionDiscount resolution by type; build discountPercentage and clawbackPercentage from active rows (divide percentage by 100); fallback DEFAULT_DISCOUNT_PERCENTAGE / DEFAULT_CLAWBACK_PERCENTAGE. |
| `src/features/load-file/__tests__/process-batch.service.test.ts` | Modify | Mock prisma.commissionDiscount.findMany or findFirst (per type); return rows with percentage 12 and 10 (or 0.12/0.1 depending on storage). Adjust tests that currently mock commissionConfiguration.findFirst. |

## Interfaces / Contracts

### CommissionDiscount (Prisma model)

```prisma
model CommissionDiscount {
  id           Int       @id @default(autoincrement())
  name         String    @db.VarChar(100)
  type         String    @db.VarChar(20)   // 'IMPUESTO' | 'CLAWBACK'
  percentage   Decimal   @db.Decimal(5, 2) // 0.01 - 100
  description  String?   @db.Text
  status       String    @default("ACTIVE") @db.VarChar(20) // 'ACTIVE' | 'INACTIVE'
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  createdById  Int?      @map("created_by_id")
  updatedById  Int?      @map("updated_by_id")

  createdBy    User?     @relation("CreatedBy", fields: [createdById], references: [idUser])
  updatedBy    User?     @relation("UpdatedBy", fields: [updatedById], references: [idUser])

  @@index([status])
  @@index([type])
  @@map("commission_discount")
}
```

(User model gets `commissionDiscountsCreated CommissionDiscount[] @relation("CreatedBy")` and `commissionDiscountsUpdated CommissionDiscount[] @relation("UpdatedBy")`.)

### API responses

- `GET /api/admin/discounts`: `{ data: CommissionDiscount[] }` with optional `createdBy: { name }`, `updatedBy: { name }` for list columns.
- `POST /api/admin/discounts`: body CreateCommissionDiscountInput; response `{ data: CommissionDiscount }` 201; 409 if active exists for type (message per spec).
- `POST /api/admin/discounts/[id]/inactivate`: no body; 200 `{ data: { id, status: 'INACTIVE' } }`; 400 if already inactive; 404 if not found.

### Process-batch snapshot (unchanged)

```ts
const snapshots = { discountPercentage: number, clawbackPercentage: number | null }
// discountPercentage and clawbackPercentage are ratios (0.12, 0.1), not 12/10.
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | commission-discount-schemas: percentage 0.01–100, type enum, required name | Zod parse valid/invalid inputs. |
| Unit | Process-batch: resolve from CommissionDiscount by type; fallback when no active | Mock prisma.commissionDiscount.findMany (or findFirst x2); assert snapshot values and that processor receives same shape. Existing process-batch tests updated to mock commissionDiscount. |
| Unit | API POST create: reject when ACTIVE exists for same type | Mock Prisma; call route with body; expect 409 and message. |
| Unit | API POST inactivate: reject when already INACTIVE | Mock Prisma; expect 400. |
| Integration | Create discount → list shows it; inactivate → status INACTIVE, no Inactivar button | Optional: API integration tests with test DB or full mocks. |
| E2E | Admin can open Descuentos, create, see list, inactivate (optional) | Playwright if E2E exists for admin. |

## Migration / Rollout

1. **Migration**: Add `commission_discount` table; add optional FK columns to User if used. Do not drop CommissionConfiguration.
2. **Seed**: Update seed so that if no CommissionDiscount rows exist, create two (type IMPUESTO 12%, type CLAWBACK 10%) so process-batch has data from first run. Optionally migrate single CommissionConfiguration row into two CommissionDiscount rows in seed or one-off script.
3. **Deploy**: Deploy schema + process-batch change + admin feature together. Process-batch will use CommissionDiscount; if table is empty, fallback 0.12/0.1 keeps behavior.
4. **Rollback**: Revert process-batch to read CommissionConfiguration; revert admin routes and page; down migration drops commission_discount (and User FKs if added). No data loss to CommissionConfiguration if left in place.

## Open Questions

- [ ] Confirm User model relation names (CreatedBy / UpdatedBy) to avoid clashes with existing User relations.
- [ ] Optional: add role check (e.g. only certain admin roles can manage discounts) — currently reuse same auth as other admin routes (session required).
- [ ] Opcional: generar y persistir design system con ui-ux-pro-max (`--design-system --persist -p "Financieramente"`) para reutilizar en otras pantallas admin.
