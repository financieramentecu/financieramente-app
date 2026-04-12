# Mapa maestro — `ux/product-config-commission-prd`

**Proyecto Engram:** `financieramente-app`  
**Topic key:** `ux/product-config-commission-prd`  
**Propósito:** Una sola vista de **todas las definiciones** acordadas para el PRD de configuración de producto, comisiones y distribución, y cómo se relacionan con el repo y con Engram.

---

## A. Cómo Engram expone este tema (importante)

| Hecho | Implicación |
|-------|-------------|
| Las guardas con `topic_key: ux/product-config-commission-prd` usan **upsert** sobre la misma observación. | No obtienes “10 memorias” separadas en búsqueda; ves **una** entrada actualizada muchas veces. |
| En este entorno, `mem_get_observation(id: 409)` devolvió la **última** revisión; el metadato indicaba **25 revisiones** y `Duplicates: 1`. | El historial fino de cada `mem_save` **no** está disponible aquí como lista exportable. |
| `mem_search` con el texto literal del topic a veces devuelve **0** resultados; con `project: financieramente-app` + query `"PRD"` apareció **#409**. | Para auditoría usa **este repo** (`PRDs/`) como fuente estable. |

**Observación Engram conocida (#409, última revisión):** registra que el PRD en repo fue ampliado con anexo §13 (M1–M9), §14 sync, etc. — el cuerpo completo del producto está en Markdown, no solo en Engram.

---

## B. Índice del PRD maestro (documento narrativo)

Archivo: `financieramente-configuracion-comisiones-prd.md`

| § | Tema |
|---|------|
| 1 | Resumen ejecutivo |
| 2 | Glosario A/B/C; 2.1 nombres BD; 2.2 catálogo Product vs configuración (A) |
| 3 | Contexto, problema, pros/contras del modelo actual |
| 4 | Objetivos y no objetivos |
| 5 | Navegación, `.pen`, **5.4 wizard** (evolución: M10 estado actual + M16 onboarding A) |
| 6 | RF-01 … RF-11 (incluye M11–M16: filtro código, columna A, activa=nuevos negocios, wizard) |
| 7 | Liquidación: decisión pendiente (`originCommission` vs flag PPC) |
| 8 | UI/UX (incl. §8.0 salida ui-ux-pro-max) |
| 9 | Modelo datos / API / archivos afectados |
| 10 | Riesgos |
| 11 | Criterios de aceptación (checklist) |
| 12 | Referencias rutas y API |
| 13 | Anexo M1–M16 (registro tipo Engram; texto en MAPA §D) |
| 14 | Sincronización Engram ↔ repo |

---

## C. Glosario y entidades (definiciones canónicas)

### C.1 A / B / C

- **A — Configuración de producto:** producto + origen de cliente + categoría del negocio; ruta típica `/dashboard/configuraciones-producto`.
- **B — PPC (`ProductPercentageCommission`):** versión/esquema de comisión ligado a A; suele haber **una activa**; varias versiones posibles.
- **C — Reparto por categoría:** filas `ProductPercentageCommissionCategory` con `porcentaje_distribucion` y opcional `porcentaje_portfolio`.

**Regla mental usuario:** A → B → C.

### C.2 Catálogo vs A

- **Producto (catálogo):** tabla `Product`; alta en `/dashboard/products/create` — formulario **único**, no wizard en código.
- **Configuración (A):** `/dashboard/configuraciones-producto/crear` — formulario **único**; API crea config + PPC inicial en **transacción**.

### C.3 Nombres físicos BD (Prisma `@@map`)

- PPC → `product_percentaje_commision`
- Categorías → `product_percentaje_commision_category`
- Campos: `porcentaje_distribucion`, `porcentaje_portfolio` (nullable)

---

## D. Decisiones M1–M10 (registro Engram / anexo PRD)

### M1 — Alcance análisis inicial

- Documentar estado actual y pros/contras de (1) configuración producto, (2) PPC, (3) distribución por categoría.
- Rutas: `configuraciones-producto`, `editar/[id]`, `distribucion-comisiones` (sin ítem propio de menú en lateral), `[id]/reglas`.
- Features: `product-configuration`, `distribution-commission`.

### M2 — Menú administración

- Recomendación: ítem directo **“Distribución de comisiones”** bajo Administración si la tarea es frecuente.
- Condición: copy que enlace claramente **Config. producto (A)** con distribución **(B–C)**.

### M3 — Filtrado y unidad

- La lista de distribución = lista de configuraciones (A); elegir fila = elegir una A.
- El acceso debe seguir **centrado en configuración de producto**; distribución no es global suelta.

### M4 — Distribución: % en unidades, inputs, cartera (primera ola)

- UI (RF-01): escala **1–100** por campo; **suma** de `porcentaje_distribucion` por B **≤ 100**; sin negativos; **locale de la app**; símbolo **%** como **adorno** a la derecha; valor servidor **sin** redondeo/truncado en cliente; enteros en respuesta con **4** decimales en pantalla; fracciones con **cero** a la izquierda (`0,5 %`); input **carácter a carácter** (hasta 4 decimales al editar); pegado **normalizado**; a11y **solo número**; misma lógica en **todos** los módulos que muestren esos campos.
- Rutas de referencia: distribución de comisiones (MAPA §G); listados como hoy en ese módulo.
- Inputs (RF-02): permitir **vaciar** durante edición; validar en **blur** y al **guardar**; no forzar `'' → 0` de forma que impida corregir.
- Cartera: checkbox `hasPortfolio` en contexto **reglas / líneas C**; % cartera por categoría en `porcentaje_portfolio` (M5).

### M5 — `hasPortfolio` en PPC; % cartera en filas

- **`hasPortfolio`:** boolean en **`ProductPercentageCommission`**; checkbox en flujo de **comisión por categoría** (pantalla reglas / C), no fuera de ese contexto.
- **`porcentaje_portfolio`:** en **`ProductPercentageCommissionCategory`**; si flag off, **ocultar** columnas/inputs de cartera en UI (RF-04).
- No duplicar booleano en cada fila de categoría.
- Validación guardado (RF-03 + RF-05): rango **1–100** y sumas **≤ 100** según corresponda; **Guardar** deshabilitado o error claro hasta cumplir.

### M6 — No limpiar al apagar

- Al desactivar `hasPortfolio`, **no** nullificar `porcentaje_portfolio` en BD; **ocultar** inputs/columna cartera en UI; datos persisten.

### M7 — UI/UX profesional (ui-ux-pro-max)

- WCAG 4.5:1, texto secundario legible, estados no solo color, jerarquía tipográfica, ~16px cuerpo mobile, interlineado 1,5–1,75, focus, tab, 150–300 ms, `prefers-reduced-motion`, SVG sin emojis UI, ~44×44 táctil, labels, `aria-live`/`role=alert`, loading/toasts, tablas scroll horizontal, z-index, shadcn + `src/features/shared/ui`, posible `PercentageField`.
- Marca **#00545c** prevalece sobre paleta genérica del skill.

### M8 — Mapa impacto codebase

- Migración `hasPortfolio` en PPC; categoría sin nueva columna para cartera.
- Gap: API no persiste `porcentaje_portfolio`; mapper/dominio sin cartera; input `''→0`.
- PUT recrea categorías: incluir ambos % en payload o pérdida de datos.
- Pre-liquidación: hoy `usePortfolio` por `originCommission === 'CARTERA'`; alinear con negocio si interviene `hasPortfolio`.

### M9 — PRD en repo `PRDs/`

- Markdown en git como fuente además de Engram.

### M10 — Wizard “producto nuevo”

- Este PRD **no define** wizard para Nuevo Producto ni stepper para Nueva configuración: hoy **un solo formulario** en cada caso.
- Los 4 marcos del `.pen` son **viaje conceptual**, no wizard de alta.
- Ampliación futura: PRD hijo con pasos, borradores, alcance (solo Product vs A+C).
- **Nota:** **M16** concreta el **wizard/onboarding después de crear A**; M10 sigue describiendo el estado **actual** del código (formulario único) y que **Nuevo Producto** (catálogo) no tiene wizard.

### M11 — Pantalla distribución: filtro por código (A)

- **Código A:** `NOT NULL`, generado al crear A con patrón `PRODUCTO-ORIGEN-CATEGORIA` (M12); el usuario **debe seleccionar un código** para ver la distribución (B) de esa A.
- **MVP:** **solo** combobox/búsqueda por **código** (sin filtros adicionales empresa/producto/origen en esta ola — ver **§H.1**).
- **Antes de elegir código:** empty state orientativo; **no** tabla global de PPC.
- **Tras elegir código:** cabecera de contexto + tabla de esquemas **B** solo de esa A.
- **Deep link** desde configuración de producto: por **`code`** (URL o query acordada en diseño técnico).

### M12 — `ProductConfiguration.code` requerido y único

- Generado al **crear** A; formato lógico **`PRODUCTO-ORIGEN-CATEGORIA`** (como hoy a nivel negocio); **no editable** — nueva combinación ⇒ **nueva** A.
- **BD:** `NOT NULL` + **único** (una fila por código en el sistema).
- **Visibilidad:** mismo código para admin y usuarios operativos del módulo.
- **Objetivo técnico:** `findUnique` por `code` en pantalla distribución.

### M13 — Descripción del esquema (B)

- `ProductPercentageCommission.description` **opcional** (puede quedar **vacía**); editable **sin** restricciones de negocio adicionales (salvo límites técnicos de longitud si se definen).
- Coherencia con PPC creado en transacción al crear A: sin exigencia de placeholder obligatorio en PRD.

### M14 — Tabla listado A: sin columna “Distribución para nuevos negocios”

- La columna **no existe** en el módulo de configuración de producto (listado/detalle en ese alcance); **ningún rol** la ve ahí.
- Gestión de “nuevos negocios” vía flujo B y acción explícita (M15).
- Actualizar specs OpenSpec `product-configuration` al implementar.

### M15 — Asignada a nuevos negocios; activa informativa; acciones en tabla

- **Acción de negocio:** un solo control explícito — botón **«Asignada a nuevos negocios»** (o copy equivalente). El flag **activa** es **solo informativo** (tag), no sustituye esa acción.
- **Regla:** como máximo **una** B asignada a nuevos negocios por A; al asignar una, **desasignar/desactivar** automáticamente la asignación en las demás B de la misma A.
- **UX tabla B:** **todas** las acciones relevantes **visibles** en fila; **no** usar menú ⋮ para acciones principales.

### M16 — Wizard post-crear A (onboarding datos A + continuidad B/C)

- Alcance del asistente: completar datos de **A** (y en la misma línea temporal lo necesario de B/C según diseño técnico), no solo B/C.
- **Negocio:** A incompleto **no bloquea** nuevos negocios; debe existir **indicador persistente** de configuración incompleta hasta terminar el wizard.
- **Reanudación:** por definir en UX; alternativas: badge en ítem de menú Administración, badge en fila del listado A, banner contextual, deep link “Continuar configuración”, o combinación.
- **Abandono:** persistencia por paso; CTA **Continuar** desde listado A y/o distribución (por `code`); **sin límite de tiempo** para completar.

---

## E. Requisitos funcionales (tabla rápida)

| ID | Resumen |
|----|---------|
| RF-01 | **1–100**; suma C por B **≤ 100**; locale **app**; enteros → **4** decimales en pantalla; valor API **sin** round/trunc en cliente; % **adorno** derecha; input char-a-char; pegado **normalizar**; a11y solo número; **todos** los módulos. |
| RF-02 | No forzar `''→0`; vaciar mientras se edita; validar **blur** y **guardar**. |
| RF-03 | `hasPortfolio` en flujo **C/reglas**; sin regla liquidación hoy; al guardar cumplir **RF-05**; guardar deshabilitado si inválido. |
| RF-04 | Flag off ⇒ **ocultar** inputs/columna cartera; solo UI manual; sin reportes; no wipe BD. |
| RF-05 | **[1,100]** por campo; suma `porcentaje_distribucion` (C) por B **≤ 100**; con `hasPortfolio`, misma lógica para **cartera**; sin negativos; UI 4 dec.; BD **6** dec. |
| RF-06 | Solo filtro/selección por **`code`**; sin código ⇒ empty state; deep link por `code` (M11). |
| RF-07 | `code` generado al crear A (`PRODUCTO-ORIGEN-CATEGORIA`); NOT NULL, único, no editable; visible todos los perfiles del módulo. |
| RF-08 | Descripción B **opcional** (vacío permitido); editable sin restricciones. |
| RF-09 | Sin columna nuevos negocios en módulo config. producto; sin excepción por rol. |
| RF-10 | Botón **Asignada a nuevos negocios**; **activa** informativa; auto-desasignar otras; acciones en fila **sin** ⋮. |
| RF-11 | Wizard datos **A**; no bloquea negocios; indicador incompleto; reanudación por definir; sin límite tiempo. |

**Detalle narrativo y criterios:** `financieramente-configuracion-comisiones-prd.md` §6 y §6.1.

---

## F. Decisión pendiente (liquidación)

- Motor actual: cartera según **`originCommission === 'CARTERA'`**.
- En UI/PRD: hoy **no** hay regla que una `hasPortfolio` con liquidación (acuerdo explícito en RF-03).
- Pendiente: ¿`hasPortfolio` **restringe** uso de `porcentaje_portfolio` en motor además de `originCommission`, o solo **gobierna admin**?

---

## G. Rutas y API (checklist)

**Dashboard**

- `/dashboard/configuraciones-producto`
- `/dashboard/configuraciones-producto/editar/[id]`
- `/dashboard/configuraciones-producto/crear`
- `/dashboard/distribucion-comisiones`
- `/dashboard/distribucion-comisiones/[id]/reglas`
- `/dashboard/distribucion-comisiones/[id]/reglas/crear`
- `/dashboard/distribucion-comisiones/[id]/reglas/editar/[ruleId]`
- `/dashboard/products/create` (catálogo Product — fuera del núcleo A/B/C pero relacionado)

**API (distribución)**

- `/api/product-configurations/[id]/distribution-commission`
- `/api/product-configurations/[id]/distribution-commission/[ruleId]`

**Menú (`menu-items.tsx`):** hoy **Config. Producto** sí; **Distribución** como ítem propio **no** (M2).

---

## H. Archivos código — impacto principal (M8 resumido)

- `prisma/schema.prisma` + migración
- `src/features/distribution-commission/**` (types, schemas, mapper, form, row, hooks, tests)
- `src/app/api/product-configurations/[id]/distribution-commission/**`
- `src/app/api/product-configurations/route.ts`
- `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` (+ tests)
- `src/app/api/AGENTS.md`
- Diagrama: `financieramnete.pen`
- **M11–M16:** `menu-items`, pantalla `distribucion-comisiones` (combo por **código** + empty state), API/listado que resuelva A por `code`, wizard/rutas post-crear, tabla A, tabla B acciones, OpenSpec `product-configuration`.

### H.1 Pantalla distribución — filtro MVP vs ampliación

**MVP acordado (RF-06):** único filtro de selección de contexto = **`ProductConfiguration.code`** (búsqueda/combobox por código; subtítulo opcional con nombres vía joins).

**Ampliación futura (no MVP):** filtros adicionales para acotar el combo si el volumen lo exige:

| Filtro UI (futuro) | Origen |
|--------------------|--------|
| Empresa | `Product.idCompany` → `Company` |
| Producto | `ProductConfiguration.idProduct` |
| Origen | `ProductConfiguration.idClientOrigin` |
| Categoría (negocio) | `ProductConfiguration.idCategory` |
| Estado A | `ProductConfiguration.active` |

**Tras elegir A (por código):** tabla B filtrada por `ProductPercentageCommission.idProductConfiguration`. Búsqueda dentro de B (descripción, etc.) puede definirse en diseño técnico.

---

## I. Artefacto visual

- **Pencil 2.10:** flujo 4 marcos; tokens `#00545c`, `#DDE9EB`, `#F8FAFB`, `#0F172A`, `#64748B`; glosario A/B/C en lienzo; nombre archivo con typo **financieramnete**.

---

## J. Criterios de aceptación (lista corta)

- Copy A/B/C visible en flujo; menú o equivalente para descubrimiento distribución.
- %: rango **1–100**, sin negativos; suma de % de **categoría (C)** por B **≤ 100**; con `hasPortfolio`, misma regla de techo para **cartera** (salvo diseño técnico distinto); locale **de la app**; sin raw BD; valor servidor **sin** round/trunc en cliente; enteros mostrados con **4** decimales; % a la **derecha** como adorno; input char-a-char (borrar `0` final permitido); pegado **normalizado**; a11y **solo número**; coherencia **cross-módulo**.
- Inputs sin forzar `''→0`; validación blur/guardar (RF-02).
- `hasPortfolio` en flujo C/reglas; columnas cartera **ocultas** si flag off; persistencia `porcentaje_portfolio`; **no** wipe al apagar flag; guardar deshabilitado si inválido frente a RF-05.
- BD: porcentajes con precisión acordada (**hasta 6** decimales donde aplique — RF-05).
- A11y y tokens UI según §8; componentes shared; tests API/mapper/UI donde aplique.
- Cuando negocio defina §F: regla liquidación + `hasPortfolio` testeada si afecta cálculo.
- **M11–M16:** **solo** filtro/selección por `code` + empty state; deep link por `code`; sin columna nuevos negocios en módulo config. producto; botón **Asignada a nuevos negocios** + activa informativa + auto-desasignar otras; acciones B visibles sin ⋮; descripción B **opcional**; wizard datos A, no bloquea negocios, indicador incompleto, sin límite tiempo; `code` NOT NULL único generado al crear A.

---

## L. Auditoría cobertura (análisis ↔ PRD)

| Tema del análisis | ¿Cubierto antes del 2026-04? | Dónde queda |
|-------------------|------------------------------|-------------|
| Glosario A/B/C, menú distribución, lista A como entrada | Sí | M1–M3, §5 |
| % humanos, inputs, cartera, `hasPortfolio` | Sí | M4–M6, RF-01–05 |
| Filtro distribución por **código** (MVP sin otros filtros), empty state | **No** | **M11, RF-06, §H.1** |
| `code` NOT NULL + único, generado al crear | **No** | **M12, RF-07** |
| Descripción B opcional (actualización 2026-04) | **No** | **M13, RF-08** |
| Quitar columna “Distribución nuevos negocios” en tabla A | **No** | **M14, RF-09** |
| Asignada a nuevos negocios; activa informativa; acciones sin ⋮ | **No** | **M15, RF-10** |
| Wizard post-crear A (datos A), no bloquea negocios, indicador incompleto | Solo “PRD hijo” vago (M10) | **M16, RF-11** |
| PPC auto-creado al crear A (¿correcto?) | Parcial (C.2 transacción) | C.2; M13 opcional; M16 onboarding |

---

## K. Mantenimiento

| Evento | Acción |
|--------|--------|
| Nueva decisión de producto | Editar PRD maestro §5–6, §11 y §13; añadir fila en sección D (M17…); actualizar §L si aplica; `mem_save` con mismo `topic_key`. |
| Solo refinar redacción | PRD + este MAPA (secciones afectadas). |

---

*Mapa generado para sustituir la imposibilidad de listar todas las revisiones Engram vía API; alinear siempre con `financieramente-configuracion-comisiones-prd.md`.*
