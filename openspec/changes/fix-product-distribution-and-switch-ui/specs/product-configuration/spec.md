## Requisitos AÑADIDOS

### Requisito: Visualización Dinámica de Distribución Activa
El sistema DEBERÁ mostrar la descripción de la distribución de comisión marcada como `active: true` para cada configuración de producto en la tabla de administración.

#### Escenario: Mostrar Descripción de Distribución Activa
- **CUANDO** un producto tiene múltiples distribuciones de comisión y exactamente una está activa.
- **ENTONCES** la columna "Distribución para nuevos negocios" DEBERÁ mostrar la descripción de esa distribución activa.

#### Escenario: Sin Distribución Activa
- **CUANDO** un producto tiene distribuciones de comisión pero ninguna está marcada como activa.
- **ENTONCES** la columna "Distribución para nuevos negocios" DEBERÁ mostrar un mensaje de reserva o valor nulo (mapeado a "Sin descripción" en la interfaz).
