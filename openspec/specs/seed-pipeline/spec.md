# seed-pipeline Specification

## Purpose

Define el comportamiento de los sub-módulos del sistema Prisma Seed (`prisma db seed`) utilizados para poblar los registros iniciales mandatorios (operación, portafolio de productos y compañías financieras). Estas lógicas configuran la fuente de verdad estática que habilita liquidaciones y usuarios.

## Requirements

### Requirement: Registro de multi-compañía estático

The system MUST inicializar o actualizar las compañías de forma predictible sin depender de archivos de sistema asíncronos.

#### Scenario: Sembrado de catálogo financiero

- GIVEN Una configuración de base de datos fresca o pre-existente
- WHEN Se invoca la función `seedCompanies(prisma)`
- THEN Debe iterar sobre una variable constante `companies: Array<{ name: string, type: string }>` alojada localmente
- AND Debe invocar un Upsert en la tabla Company garantizando su existencia o correcta actualización de "status".

### Requirement: Lookup dinámico de Foreign Key en creación de productos

The system MUST resolver activamente los IDs primarios de los nodos padre (Company) desde su nombre descriptivo antes de registrar subsecuentes nodos hijo en el grafo (Product).

#### Scenario: Lookup exitoso previo a inserción

- GIVEN La ejecución funcional interna de `seedProducts(prisma)`
- WHEN El iterador expone la fila abstracta `{ companyName: 'TRINITY', name: 'PROTECTION PLUS' }`
- THEN El script MUST ejecutar `prisma.company.findFirst` buscando de antemano el String `companyName`
- AND MUST inyectar la id resultante dentro de la llamada de `create/update` de la tabla Product asociada a este producto.

#### Scenario: Fallo de Lookup para empresa no encontrada

- GIVEN Que el producto declara `companyName: 'INVALID_COMPANY'`
- WHEN El query `prisma.company.findFirst` retorna nulo
- THEN El sistema SHOULD arrojar una advertencia (log explícito) o saltar el producto preservando los anteriores (`continue`), sin causar caídas abruptas que corrompan transacciones parciales del seed completo.
