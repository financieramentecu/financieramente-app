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

---

## ADDED Requirements (from partner-profile)

### Requirement: SEED-01 Idempotent partner reference data

Seeds MUST create role `PARTNER`, level `PARTNER_EXTERNAL` and category "Partner Externo" (type MIA) idempotently: running twice yields no duplicates and no errors.

#### Scenario: Double run

- GIVEN a seeded database
- WHEN the seed runs again
- THEN row counts for role, level and category are unchanged

### Requirement: SEED-02 Partner configuration per product

For every active product there MUST exist a PARTNER_EXTERNAL configuration and a PPC flagged for new businesses. Products created later MUST get the same via the partner seed/remediation.

#### Scenario: Coverage

- GIVEN all active products after seeding
- WHEN checked
- THEN each has a PARTNER_EXTERNAL configuration with a PPC flagged for new businesses

#### Scenario: Idempotent remediation

- GIVEN the remediation already ran
- WHEN `prisma:seed:partner` runs again
- THEN no duplicate configuration or PPC is created

### Requirement: SEED-03 Dedicated script and safe ordering

A script `prisma:seed:partner` MUST run the partner seeds on its own; the remediation MUST run after the seed. LEVEL_5 MUST remain untouched and seedLevels MUST NOT rename PARTNER_EXTERNAL.

#### Scenario: Standalone run

- GIVEN an existing production-like database
- WHEN `prisma:seed:partner` runs
- THEN only partner data is added and no existing level, role or category is modified

#### Scenario: Fallo de Lookup para empresa no encontrada

- GIVEN Que el producto declara `companyName: 'INVALID_COMPANY'`
- WHEN El query `prisma.company.findFirst` retorna nulo
- THEN El sistema SHOULD arrojar una advertencia (log explícito) o saltar el producto preservando los anteriores (`continue`), sin causar caídas abruptas que corrompan transacciones parciales del seed completo.
