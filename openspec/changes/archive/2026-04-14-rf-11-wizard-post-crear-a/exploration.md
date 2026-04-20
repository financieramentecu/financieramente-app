# Exploration: RF-11 — Wizard post-crear A (onboarding)

## Exploration: RF-11 — Wizard post-crear A

### Current State

- **Alta de A hoy:** Un solo formulario en `ProductConfigurationCreateClient` (`src/features/product-configuration/components/product-configuration-create-client.tsx`) que envía a `POST /api/product-configurations`. Tras éxito, **toast** y **redirección al listado** (`/dashboard/configuraciones-producto`); no hay flujo posterior ni pasos.
- **Persistencia:** En transacción se crean `ProductConfiguration` (con `code` generado) y un `ProductPercentageCommission` inicial, y se enlaza `idProductPercentageCommissionNewBusinesses` (`src/app/api/product-configurations/route.ts`). El modelo `ProductConfiguration` en Prisma **no** tiene campos de “setup completo”, “wizard step”, ni “incompleto” (`prisma/schema.prisma`).
- **Producto / UX (MAPA M16, PRD RF-11):** Tras crear A debe existir un **asistente** que complete datos de **A** (y en la misma línea temporal lo necesario de B/C según diseño). A incompleto **no bloquea** negocios; hace falta **indicador persistente** hasta terminar; **reanudación** explícita (badge menú, fila listado, banner, deep link “Continuar” — por definir); **sin límite de tiempo**.
- **Patrones existentes en repo:** No hay componentes de **stepper/wizard** reutilizables encontrados en `src` (búsqueda sin coincidencias). La UI actual usa Shadcn (`Card`, `Button`, formularios RHF + Zod) y patrones de dashboard ya establecidos.

### Affected Areas

- `src/features/product-configuration/components/product-configuration-create-client.tsx` — punto de salida post-crear; hoy navega al listado; aquí o en ruta nueva entrará el wizard o la redirección al mismo.
- `src/features/product-configuration/` — nuevos componentes del wizard, hooks (`AsyncState`), posible feature slice o subcarpeta `components/wizard/`.
- `src/app/dashboard/configuraciones-producto/` — nuevas rutas (p. ej. `[id]/onboarding` o `[code]/setup`) si el wizard es página dedicada.
- `src/app/api/product-configurations/` y **servicios** — lectura/escritura de estado de onboarding (si se persiste en BD) o contratos para “completitud” derivada.
- `prisma/schema.prisma` + migración — si se modela `setupCompleteAt`, `onboardingStep`, o flags equivalentes (alternativa: estado derivado solo con reglas de negocio + sin columna).
- `openspec/specs/product-configuration/spec.md` — delta de requisitos RF-11 cuando pase a spec.
- `PRDs/MAPA-topic-ux-product-config-commission-prd.md` §M16 — alinear copy de pasos, reanudación e indicadores.

### Approaches

1. **Wizard en ruta dedicada post-crear (recomendado base)** — Tras `201`, redirigir a `/dashboard/configuraciones-producto/[id]/onboarding` (o por `code` URL-encoded) con stepper interno (estado en URL `?step=` o segmentos), persistencia por paso vía API.
   - Pros: Deep link natural para “Continuar configuración”; recargable; encaja con **reanudación** y analytics por paso; separación clara create vs onboarding.
   - Cons: Requiere definir pasos y contratos; más rutas y guards.
   - Effort: **Medium–High**

2. **Wizard modal / drawer full-screen** — Tras crear, abrir overlay multi-paso sin cambiar de página o antes de ir al listado.
   - Pros: Sensación de “flujo único”; menos rutas nuevas.
   - Cons: Peor para deep link y reanudación desde listado/menú; accesibilidad (focus trap, `aria-modal`) más exigente; móvil más complejo.
   - Effort: **Medium**

3. **Solo indicador + reanudación lazy (sin bloquear)** — Persistir “incompleto” en BD; listado y menú muestran badge; **no** forzar wizard inmediato al crear; CTA “Completar configuración”.
   - Pros: Respeta usuarios que quieren salir; cumple “no bloquea”.
   - Cons: Riesgo de que nunca completen sin UX fuerte; hay que combinar con (1) o (2) para el primer acceso.
   - Effort: **Low** para indicador solo; **Medium** combinado con wizard.

### Recommendation

- Combinar **(1) + (3):** redirección opcional al wizard en el **primer** alta (o CTA claro “Configurar ahora” vs “Ir al listado”) **y** persistencia de estado incompleto + **badges / fila / banner** para reanudación, con URL estable del wizard (`id` o `code`).
- **Flujo acordado (producto, 2026):** el recorrido RF-11 se modela como **dos pasos** de alto nivel: **(1) crear configuración de producto** y **(2) distribución de comisiones**, donde el usuario define **porcentajes por categoría** (reglas B/C en la UI existente de distribución). El stepper visual refleja solo esas dos etapas; el paso 2 reutiliza el flujo por **`code`** (M17) hacia crear/editar reglas con líneas de categoría.
- **Primera decisión técnica:** si la completitud es **derivable** (p. ej. “tiene al menos una regla con porcentajes por categoría válidos y guardados”) vs **flag explícito** en BD — el PRD pide indicador **persistente**; un flag o timestamp `onboardingCompletedAt` puede seguir siendo útil además de reglas de negocio.

### UI / UX (ui-ux-pro-max + criterios Financieramente)

**Design system (query:** fintech B2B SaaS admin wizard):

- Patrón **Funnel / pasos:** revelación progresiva, **indicador de progreso visible** (“Paso 1 de 2” / “Paso 2 de 2”), CTA primario al final de cada paso coherente con el siguiente.
- Estilo sugerido por herramienta: **Glassmorphism** — en este producto conviene **usarlo con moderación**: MAPA §8 exige contraste y accesibilidad; preferir **cards sólidas** (`bg-card`, bordes) alineadas a Shadcn/Tailwind ya usados, y reservar blur solo a overlays si el contraste se mantiene ≥ 4.5:1.
- Paleta genérica de la búsqueda (azul CTA `#0369A1`, fondo `#F8FAFC`): **ajustar al token primario del proyecto** (p. ej. teal `#00545c` en lineamientos MAPA) para no romper identidad.
- Tipografía sugerida (Fira): el repo ya usa la stack del tema; **no cambiar fuentes** salvo decisión de diseño global — priorizar **consistencia** con el dashboard actual.
- **Checklist UX crítica (dominio `ux`):**
  - Indicador de progreso en flujos multi-paso (no dejar al usuario sin contexto).
  - Teclado: orden de tab coherente con el orden visual; foco visible en pasos y botones **Anterior / Siguiente**.
  - Formularios: `label` asociado, no solo `placeholder`; feedback de carga y éxito/error tras guardar paso.
  - `prefers-reduced-motion` en transiciones entre pasos.
- **Microcopy:** titulares por paso en español claro (“Paso 1: …”) y opción **“Guardar y salir”** / **“Continuar más tarde”** que persista y vuelva al listado con estado incompleto (alineado RF-11).

### Risks

- **Continuidad paso 1 → 2:** Tras `POST` exitoso, la redirección debe llevar al usuario al flujo de **distribución por `code`** (crear primera regla o lista de reglas) sin perder contexto; deep links y estados de carga deben estar alineados con `commission-distribution` / rutas `config-distribucion-comisiones`.
- **Sin campo BD:** no se puede mostrar “incompleto” de forma fiable entre sesiones; habrá que añadir migración o reglas de derivación muy bien definidas.
- **Doble flujo legado vs código (M17):** el wizard debe funcionar tanto si el usuario llega desde listado clásico como desde flujos por `code`; rutas y APIs deben resolverse sin duplicar lógica (servicios centralizados).

### Wizard: número de pasos (decisión de UX / producto)

**Decisión: 2 pasos** — el flujo end-to-end es **crear configuración** → **distribución de comisiones** (porcentajes por categoría en la UI de reglas).

| Paso | Qué es | Dónde vive en la app |
|------|--------|----------------------|
| **1 — Crear configuración** | Formulario actual de alta (empresa, producto, origen, categoría); genera A + `code` + PPC inicial. | `/dashboard/configuraciones-producto/crear` (`ProductConfigurationCreateClient` + `ProductConfigurationForm`). |
| **2 — Distribución de comisiones** | El usuario configura **reglas** y **porcentajes por categoría** (y el resto de reglas RF-01…RF-05 en ese formulario). | Flujo por **`code`**: p. ej. `config-distribucion-comisiones/[code]/reglas`, crear/editar regla con filas de categoría. |

**Implicaciones:**

- El **indicador de pasos** (stepper) muestra **solo 2 nodos**, p. ej. etiquetas cortas: **“Configuración”** | **“Distribución”** (o copy equivalente en español).
- En **paso 1** el stepper marca el primer nodo como actual; al guardar la creación, navegar a **paso 2** (misma sesión) con el segundo nodo activo — sin pantalla intermedia obligatoria salvo que producto quiera un resumen/código antes de distribución.
- **RF-11 “incompleto”:** tiene sentido mientras exista A **sin** distribución mínima acordada (p. ej. sin regla guardada con categorías) o hasta marcar explícitamente “completado”; definir criterio en proposal/spec.
- **“Guardar y continuar más tarde”** en paso 2: vuelve al listado con badge de incompleto; reanudación por `code` al flujo de distribución.

**Indicador de pasos (UX):**

- **Stepper horizontal de 2 ítems**; paso actual con color primario (`#00545c` / token tema), `aria-current="step"`.
- Paso 1 completado al crear: primer nodo con check al entrar en distribución; segundo nodo activo.
- Texto: **“Paso 1 de 2”** / **“Paso 2 de 2”** junto al título de la vista (refuerzo para lectores de pantalla).
- En paso 1, el segundo nodo aparece **deshabilitado o atenuado** hasta que exista configuración creada (opcional: mostrar ambos desde el inicio con “2” bloqueado hasta POST).

### Ready for Proposal

**Yes** — con estas salvedades: hace falta **proposal** que fije (a) criterio exacto de “onboarding completo” en el modelo de **2 pasos**, (b) modelo de persistencia (flag vs derivado según reglas guardadas en distribución), (c) redirección POST → URL de paso 2 (`code`), (d) superficies de reanudación si abandona en paso 2. *Este documento fija **2 pasos**: crear configuración + distribución (porcentajes por categoría).*

---

## Envelope (SDD)

**Status:** success  
**Summary:** Explored RF-11 against current create flow, Prisma model, MAPA M16, and repo patterns; documented approaches, UI/UX guidance from ui-ux-pro-max aligned to Financieramente constraints, and risks. Wrote `openspec/changes/rf-11-wizard-post-crear-a/exploration.md`.  
**Artifacts:** `openspec/changes/rf-11-wizard-post-crear-a/exploration.md`  
**Next:** `sdd-propose` (or `openspec-new-change` proposal phase) to lock scope, steps, and persistence.  
**Risks:** Undefined step list and B/C scope; missing DB fields for incomplete state; wizard UX must meet a11y and brand tokens.

---

## Implementation log (applied — RF-11 + follow-ups)

Captured for OpenSpec / Engram alignment with the current codebase (session work).

| Area | What shipped |
|------|----------------|
| **Post–create redirect** | `createProductConfiguration` returns `ProductConfiguration \| null`; success uses `response.data != null`. `ProductConfigurationCreateClient` calls `router.replace` to `/dashboard/config-distribucion-comisiones/{encodedCode}/reglas/crear` in `handleSubmit` after await; errors toast via `useEffect` on `createState.status === 'error'`. |
| **Distribution save (continuar)** | Auto-created active PPC (no category lines) is edited (PUT) via `useDistributionWizardFormMode` + `findActiveRulePendingDistribution`; avoids POST “Ya existe una distribución activa”. |
| **By-code URL** | `normalizeProductConfigurationCodeParam` in hook + `GET …/by-code/[code]` so `%2B` / encoded segments match DB `code`. |
| **Breadcrumbs** | `breadcrumb-utils.ts`: decode labels, encode each segment in `href`, friendly labels for config distribución / reglas / config producto. |
| **List + API** | `distributionSetupIncomplete` on list; Prisma mock for category lines in route tests. |
| **UX** | Stepper centered; “Agregar Categoría” outline button; table “Distribución” + **Continuar configuración** → `…/reglas/crear`. |

**Artifacts:** `tasks.md` Phase 7; tests: `product-configuration-create-client`, `breadcrumb-utils`, `distribution-wizard-form-mode`, `by-code` route, mutations hook.
