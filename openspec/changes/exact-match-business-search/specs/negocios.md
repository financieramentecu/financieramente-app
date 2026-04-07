## ADDED Requirements

### Requirement: Búsqueda por coincidencia exacta en el listado de negocios
El sistema debe permitir a los usuarios alternar entre una búsqueda parcial (por defecto) y una búsqueda por coincidencia exacta para los campos identificadores (Número de contrato e ID de negocio).

#### Scenario: Búsqueda por contrato con coincidencia exacta activada
- **WHEN** El usuario ingresa un término de búsqueda (ej: "CON-123").
- **AND** El usuario activa la opción de "Coincidencia exacta".
- **THEN** El sistema debe retornar únicamente los negocios cuyo número de contrato sea exactamente "CON-123".
- **AND** No debe incluir resultados como "CON-1234" o "X-CON-123".

#### Scenario: Búsqueda por ID de negocio con coincidencia exacta activada
- **WHEN** El usuario ingresa un número de ID (ej: "45").
- **AND** El usuario activa la opción de "Coincidencia exacta".
- **THEN** El sistema debe retornar únicamente el negocio con el ID de base de datos número 45.

#### Scenario: Búsqueda parcial (Comportamiento por defecto)
- **WHEN** El usuario ingresa un término de búsqueda (ej: "Juan").
- **AND** La opción de "Coincidencia exacta" está desactivada.
- **THEN** El sistema debe retornar todos los negocios que coincidan parcialmente con "Juan" en nombre, apellido, email, contrato o ID.
