# Delta for ui-system

## ADDED Requirements

### Requirement: CoachKpiCard (Data-Dense, colorScheme)

El sistema MUST proveer el componente `CoachKpiCard` para los KPI del Coach en la vista de negocios. El component SHALL seguir el patrón visual Data-Dense (información compacta y escaneable). El component MUST aceptar una prop `colorScheme` con valores fijos `'orange' | 'emerald' | 'indigo'` alineados semánticamente con los estados de negocio asociados a cada tarjeta (p. ej. coherencia con la identidad del badge de estado); SHALL aplicar esa paleta a borde, fondo de cabecera y título de forma consistente. El component MUST NOT incluir sparklines ni gráficos temporales. El component MUST NOT incluir pestañas o selectores para alternar moneda: COP y USD SHALL mostrarse a la vez en la misma tarjeta.

#### Scenario: Estructura Data-Dense sin gráficos ni tabs de moneda

- GIVEN valores de conteo y montos en COP y USD
- WHEN se renderiza `CoachKpiCard`
- THEN SHALL mostrar título, métricas y monedas en un diseño denso sin gráficos
- AND SHALL NOT renderizar pestañas de selección de moneda
- AND SHALL NOT renderizar sparklines

#### Scenario: colorScheme fijo y semántico

- GIVEN `colorScheme` establecido a uno de orange, emerald o indigo
- WHEN la tarjeta se renderiza
- THEN los estilos de acento (p. ej. borde lateral, cabecera, título) SHALL corresponder a ese esquema
- AND SHALL NOT depender de cadenas de color arbitrarias libres en runtime

#### Scenario: Paridad de datos en una sola vista

- GIVEN la tarjeta muestra montos locales y extranjeros
- WHEN el usuario lee la tarjeta sin interacción adicional
- THEN ambas monedas SHALL ser visibles simultáneamente

## MODIFIED Requirements

None

## REMOVED Requirements

None
