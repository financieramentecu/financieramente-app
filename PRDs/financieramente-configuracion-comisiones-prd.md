# PRD — Configuración de producto, comisiones y distribución

**Mapa e índice maestro (todas las definiciones M1–M16, tablas RF, rutas, Engram):**  
→ [MAPA-topic-ux-product-config-commission-prd.md](./MAPA-topic-ux-product-config-commission-prd.md)

**Engram:** `topic_key: ux/product-config-commission-prd` · `project: financieramente-app`

---

## 1. Resumen ejecutivo

Tres conceptos: **A** configuración de producto (matriz producto + origen + categoría), **B** PPC (versiones de comisión), **C** reparto por categoría. Problemas: descubrimiento del flujo, % en UI, inputs que no dejan borrar, cartera en BD no administrada en CRUD, menú sin “Distribución”. Este PRD pide: navegación clara, % en unidades, inputs corregidos, **`hasPortfolio` en PPC**, columna % cartera → `porcentaje_portfolio` sin wipe al apagar flag, UI/UX profesional, y alineación técnica documentada.

---

## 2. Glosario

| ID | Concepto |
|----|----------|
| **A** | Configuración de producto — `/dashboard/configuraciones-producto` |
| **B** | `ProductPercentageCommission` — una activa típica |
| **C** | `ProductPercentageCommissionCategory` — `porcentaje_distribucion`, `porcentaje_portfolio` |

**2.1 BD:** `product_percentaje_commision`, `product_percentaje_commision_category`.

**2.2** **Producto catálogo** (`/dashboard/products/create`) ≠ **configuración (A)** (`/configuraciones-producto/crear`). Ver **§5.4** y MAPA C.2.

---

## 3. Contexto

Menú: Config. Producto sí; distribución vía enlaces. Form fuerza `''→0` en %. API no persiste `porcentaje_portfolio`. Pre-liquidación usa `originCommission === 'CARTERA'`. Pros/contras detallados: **MAPA §D contexto** y tabla riesgos abajo.

---

## 4. Objetivos

Descubrimiento A→B→C, % humanos, inputs fluidos, cartera admin, shadcn/shared, sin redefinir contabilidad sin negocio.

**No objetivos:** motor liquidación completo sin acuerdo; cambiar significado DECIMAL sin consenso.

---

## 5. Navegación y flujo

- Ítem menú **Distribución de comisiones** recomendado (M2); copy A↔B/C.
- Lista distribución = lista A (M3); **evolución deseada (M11):** pantalla con **combo por código** + empty state + tabla B solo con A elegida (detalle en MAPA).
- **`financieramnete.pen`:** 4 marcos + glosario; tokens `#00545c`, etc. (MAPA §I).

### 5.4 Wizard

Hoy no hay wizard en código para Nuevo Producto ni para Nueva configuración (formulario único). **M16** define el **onboarding post-crear A** (B+C) como núcleo deseado: persistencia por paso, abandono/reanudación. **M10** sigue marcando el estado actual del repo y el alcance del catálogo Product. Detalle: **MAPA §D M10, M16** y **§L** (auditoría).

---

## 6. Requisitos funcionales

| ID | Resumen |
|----|---------|
| RF-01 | % en UI **1–100**; suma de % de **categoría (C)** por B **≤ 100**; formato **locale de la app**; **4** decimales en enteros; valor servidor **sin** redondeo/truncado; % como **adorno**; input restringido **carácter a carácter**; pegado **normalizado**; a11y **solo número** |
| RF-02 | Inputs de %: no forzar borrado → `0`; validar en **blur** y al **guardar** |
| RF-03 | `hasPortfolio` en contexto **comisión por categoría (PPC / C)**; sin regla de liquidación hoy |
| RF-04 | Si `hasPortfolio` off: **ocultar** columnas/inputs cartera; no borrar `porcentaje_portfolio` en BD |
| RF-05 | Rango **1–100** por campo; suma de `porcentaje_distribucion` (C) por B **≤ 100**; con `hasPortfolio`, misma regla de rango/suma para **cartera** por C; BD hasta **6** decimales |
| RF-06 | Distribución: **solo** filtro/selección por **código** A; sin código elegido → empty state; deep link **por `code`** |
| RF-07 | `code` generado al crear A (`PRODUCTO-ORIGEN-CATEGORIA`); **NOT NULL**, único, **no editable**; visible admin y operación |
| RF-08 | Descripción PPC **opcional** (puede quedar vacía); editable sin restricciones |
| RF-09 | Sin columna «Distribución para nuevos negocios» en listado A; sin excepción por rol |
| RF-10 | Acción explícita **«Asignada a nuevos negocios»**; **activa** solo informativa; al asignar, desactivar la otra; acciones en fila **sin** menú ⋮ |
| RF-11 | Wizard post-crear A (datos **de A**); no bloquea negocios; indicador de incompleto; reanudación por definir; sin límite de tiempo |

**Índice M1–M16 y auditoría de cobertura:** [MAPA §D y §L](./MAPA-topic-ux-product-config-commission-prd.md).

### 6.1 Detalle por RF (acuerdo producto)

**RF-01 — Presentación y comportamiento de porcentajes (detalle 2026-04)**

- **Alcance y rutas (confirmado):** mismas superficies que hoy listan o editan porcentajes en **distribución de comisiones**, en coherencia con el listado actual del módulo. Rutas de referencia (MAPA §G):  
  `/dashboard/distribucion-comisiones`,  
  `/dashboard/distribucion-comisiones/[id]/reglas`,  
  `/dashboard/distribucion-comisiones/[id]/reglas/crear`,  
  `/dashboard/distribucion-comisiones/[id]/reglas/editar/[ruleId]`.  
  Cualquier otra pantalla del producto que muestre los mismos campos (`porcentaje_distribucion`, `porcentaje_portfolio`) debe usar **la misma lógica** (ver punto “cross-módulo”).
- **Otras pantallas:** no hay exclusiones; toda superficie que muestre `porcentaje_distribucion` / `porcentaje_portfolio` debe usar la misma lógica (**cross-módulo** abajo).

- **Locale y idioma:** separadores decimales y de miles según la **configuración regional / idioma de la aplicación** (no depender solo del navegador ni fijar siempre español). Si el usuario cambia idioma o locale en la app, el formato numérico debe seguir esa configuración.

- **Escala y límites (negocio):** cada porcentaje **≥ 1** y **≤ 100**; **no** valores negativos. La **suma** de los `porcentaje_distribucion` de las filas **C** pertenecientes al mismo esquema **B** **no puede superar 100 %**. Detalle de `porcentaje_portfolio` cuando `hasPortfolio` es true: **RF-05**.

- **Visualización (solo lectura y tablas):** no mostrar el valor “raw” interno de BD (fracción distinta de 0–100) como valor principal.  
  - **Valor devuelto por el servidor:** mostrar **exactamente** la precisión que entrega el API **sin redondear ni truncar en el cliente** (hasta **6** decimales en persistencia — RF-05).  
  - **Valores enteros** (sin parte decimal en la respuesta): formatear con **4** decimales para consistencia visual (ej. `10` → `10,0000` % en el locale activo).  
  - **Decimales fraccionarios:** siempre con **cero a la izquierda** del separador (ej. `0,5 %`, nunca `,5 %`). Si el servidor devuelve parte decimal, mostrar **todos** los dígitos que envía (hasta 6). Si el valor es **entero** en la respuesta, **rellenar a 4** decimales en pantalla (ej. `10,0000 %`).

- **Símbolo %:** el carácter **`%`** va **fuera del input**, a la **derecha** como **adorno** visual (no dentro del string editable).

- **Entrada (input):** hasta **4** decimales durante la edición; **restricción carácter a carácter** (solo dígitos y separador decimal válido para el locale). Debe poderse **borrar** el último carácter aunque sea `0` para permitir reescribir el número (no “atascar” ceros finales).

- **Pegado desde portapapeles:** **normalizar** el contenido pegado a un número válido en el locale activo antes de aceptarlo.

- **Accesibilidad:** en lectores de pantalla, anunciar **solo el valor numérico** (sin leer “por ciento” de forma redundante si el diseño ya comunica la unidad por otra vía acordada en implementación).

- **Cross-módulo:** la misma lógica de presentación, límites y formato aplica en **todos los módulos** de la aplicación que expongan estos porcentajes.

**RF-02 — Comportamiento de inputs (problema y objetivo)**

- **Problema hoy:** al borrar o vaciar, el formulario o capa de datos fuerza `'' → 0`, impidiendo un flujo natural de edición.
- **Objetivo:** permitir **vaciar** el campo durante la edición; validar con mensajes claros en **blur** y al **intentar guardar**; no reemplazar automáticamente el vacío por cero de forma que impida corregir el valor.

**RF-03 — `hasPortfolio` y alcance**

- El checkbox `hasPortfolio` (PPC / esquema B) se gestiona en el flujo de **comisión por categoría** ligado a PPC (pantalla de **reglas / líneas C**), no como concepto suelto fuera de ese contexto.
- **Liquidación:** hoy **no** existe regla que una `hasPortfolio` con el motor; sigue pendiente alinear con §7 / MAPA §F cuando negocio lo defina.
- **Inputs de % en ese flujo:** durante la edición puede haber estado intermedio vacío o inválido (ver **RF-02**). Al **guardar**, cada porcentaje **obligatorio** debe cumplir rango **1–100** y las reglas de **suma** de **RF-05**; mientras no se cumpla, inputs inválidos y **Guardar** deshabilitado o envío rechazado con mensaje claro.

**RF-04 — Cartera en UI y datos**

- Con `hasPortfolio === false`: las columnas e **inputs** de % cartera **no se muestran** (no solo deshabilitados).
- Entrada solo por **UI manual**; no hay reportes ni exportes de cartera en este alcance.

**RF-05 — Reglas numéricas**

- Cada `porcentaje_distribucion` (fila C) está en **[1, 100]**; la **suma** de todos los `porcentaje_distribucion` de las filas C del **mismo B** **≤ 100 %**. Valores **negativos** no permitidos.
- Si `hasPortfolio === true`: cada fila C debe poder cargar **`porcentaje_portfolio`** en **[1, 100]** y la **suma** de `porcentaje_portfolio` de esas filas C del mismo B **≤ 100 %** (misma lógica de techo que distribución; si negocio distingue un solo techo conjunto, documentarlo en diseño técnico).
- **Entrada en UI:** hasta **4** decimales (locale de la app). **Persistencia en BD:** hasta **6** decimales (ajustar esquema/API si hoy es menor).
- **Presentación cargada desde servidor:** según **RF-01** (sin redondeo/truncado en cliente; relleno a 4 decimales para valores enteros).

**RF-06 — Pantalla distribución (M11)**

- El **código** de A es **obligatorio** en datos: se genera al crear la configuración de producto; el usuario **debe seleccionar un código** en la pantalla de distribución para ver la tabla de esquemas **B** de esa A.
- **Único filtro MVP:** búsqueda/selección por **código** (sin filtros adicionales por empresa/producto/origen en esta ola).
- Enlaces desde configuración de producto: deep link usando **`code`** (no solo `id`).

**RF-07 — Código de configuración A (M12)**

- **Unicidad:** el código identifica de forma **única** la configuración A en el sistema (un código = una fila A), coherente con el patrón `PRODUCTO-ORIGEN-CATEGORIA`.
- Se **genera al crear** A; **no** es editable; un cambio de combinación implica **nueva** configuración, no renombrar código.
- **Visibilidad:** mismo código visible para perfiles administrativos y operativos que usen el módulo (sin ocultar por rol).

**RF-08 — Descripción del esquema B (M13)**

- Campo **opcional**: puede permanecer **vacío** en alta y edición.
- Sin límite de ediciones ni reglas de negocio adicionales sobre el texto, salvo las técnicas habituales (longitud máxima en API si se define en diseño).

**RF-09 — Listado A (M14)**

- La columna de texto tipo «Distribución para nuevos negocios» **no existe** en el módulo de configuración de producto (listado ni detalle en ese módulo, según alcance acordado).
- **Sin excepciones** por rol: nadie la ve en ese contexto.

**RF-10 — Activa vs nuevos negocios (M15)**

- Una sola acción primaria de negocio: botón **«Asignada a nuevos negocios»** (o copy equivalente). El estado **activa** de una PPC es **informativo** (tag/etiqueta), no el control principal.
- Al marcar una B como asignada a nuevos negocios: **sí** debe desasignarse/desactivarse automáticamente la asignación en las demás B de la misma A (una sola ganadora).
- En la tabla B: **todas** las acciones relevantes **visibles** en la fila; **no** usar menú ⋮ para acciones principales.

**RF-11 — Wizard post-crear A (M16)**

- El asistente cubre el **completado de datos de A** (no solo B/C); detalle de pasos en diseño técnico / OpenSpec.
- Un A **incompleto no bloquea** la creación o uso de nuevos negocios; debe existir un **indicador persistente** de “configuración incompleta” hasta completar el wizard.
- **Reanudación:** pendiente decisión de UX; alternativas a valorar: badge en ítem de menú **Administración**, badge en fila del listado A, banner en dashboard de config, o combinación (ver MAPA §D M16).
- **Sin límite de tiempo** para completar (no expira el borrador por cron).

---

## 7. Liquidación (pendiente)

¿`hasPortfolio` condiciona motor además de `originCommission`? Definir con negocio (MAPA §F).

---

## 8. UI/UX

Skill ui-ux-pro-max: contraste, tipo, focus, motion, a11y, tablas, Toaster, **#00545c** sobre paleta genérica. Detalle: MAPA §D M7.

---

## 9. Datos y API

Migración `hasPortfolio` en PPC. GET/POST/PUT incluyen flag y portfolio en líneas. **PUT recrea categorías:** payload con ambos % (MAPA §H).

`ProductConfiguration.code`: generado al **POST** de A; **NOT NULL** y **único** en BD; formato lógico `PRODUCTO-ORIGEN-CATEGORIA` (MAPA §D M12). Campos de porcentaje en BD: soportar hasta **6** decimales donde aplique (RF-05).

---

## 10. Riesgos

Pérdida datos PUT; desalineación admin/motor; a11y columnas nuevas.

---

## 11. Criterios de aceptación

Lista en **MAPA §J**.

---

## 12. Referencias

Rutas y API: **MAPA §G**. Código: **MAPA §H**.

---

## 13. Anexo M1–M16

Texto íntegro de cada decisión: **MAPA §D**.

---

## 14. Sincronización Engram ↔ repo

Cambio de definición → editar este PRD + MAPA + `mem_save` mismo `topic_key`.

---

*Versión resumida: el detalle exhaustivo y el mapa único viven en `MAPA-topic-ux-product-config-commission-prd.md`.*
