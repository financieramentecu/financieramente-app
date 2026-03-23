# Research Notes: Commission Sync & Pre-liquidation

## Decision 1: Validación por tipo de archivo
**Decision**: Exigir selección explícita del tipo (POLIZA/VOLUNTARIA) y validar headers contra el set esperado de ese tipo.  
**Rationale**: Evita mapeos cruzados y estados inconsistentes en sincronización.  
**Alternatives considered**: Auto-detección de tipo por headers (más flexible pero propenso a falsos positivos).

## Decision 2: Regla de lag para POLIZA
**Decision**: Aplicar validación de fechas solo para VOLUNTARIA. En POLIZA, el estado depende solo de si existe el negocio.  
**Rationale**: POLIZA no tiene columnas Desde/Hasta; usar fechas derivadas agrega incertidumbre.  
**Alternatives considered**: Derivar rango desde `Polizas Periodo` o `file_import.load_date`.

## Decision 3: Fuente de `descripcion`
**Decision**: POLIZA usa `Plan de Compensación`; VOLUNTARIA usa `Tipo de Comision`.  
**Rationale**: Son los campos más semánticos y estables para identificar la comisión.  
**Alternatives considered**: Usar `Producto` o concatenar campos.

## Decision 4: Fallback de configuración
**Decision**: Si no existe configuración ACTIVE, permitir la carga con valores por defecto: descuento 12% y clawback 10%.  
**Rationale**: Evita bloquear la carga operativa; se mantiene consistencia con políticas de negocio.  
**Alternatives considered**: Rechazar carga o marcar todo como error.

## Decision 5: Parsing de valores numéricos monetarios
**Decision**: Normalizar valores con símbolos y separadores antes de parsear.  
**Rationale**: En POLIZA aparecen formatos como `-$ 1.713.600` o `(1.713.600,00)` que requieren limpieza.  
**Alternatives considered**: Rechazar formatos no numéricos (alto impacto operativo).

**Reglas de parsing propuestas**:
- Remover símbolos de moneda y espacios.
- Si el valor está entre paréntesis, marcarlo como negativo.
- Si contiene `.` y `,`: tratar `.` como miles y `,` como decimal.
- Si contiene solo `,`: tratar `,` como decimal.
- Si contiene solo `.`: tratar `.` como decimal.
- Si el resultado no es numérico, marcar el registro como ERROR.

## Decision 6: Auditoría de errores
**Decision**: Registrar un evento de auditoría por cada fila con error.  
**Rationale**: Mayor trazabilidad y análisis de fallos por contrato/archivo.  
**Alternatives considered**: Un único resumen por archivo.
