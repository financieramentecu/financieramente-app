# Modelo relacional - Sistema de Liquidación de Comisiones

Diagrama ER (Entity Relationship) generado a partir de `schema.prisma`.  
Sistema: Financieramente — liquidación de comisiones.

**Enums**:
- `BeneficiaryMode`: `OVERRIDE` | `BENEFICIARIO_GENERAL` (en `category.beneficiary_mode`).
- `AnnualPaymentStatus`: `SIN_FONDEAR` | `FONDEADO` (en `payments.status`).

```mermaid
erDiagram
    %% ========== CATÁLOGOS Y DOMINIOS ==========
    Company ||--o{ Product : "tiene productos"
    TypeProduct ||--o{ Product : "clasifica"
    CategoryType ||--o{ Category : "tipo de categoría"
    ClientOrigin ||--o{ Business : "origen del negocio"
    Category ||--o{ User : "categoría del usuario"
    Category ||--o{ ProductConfiguration : "categoría en config"
    Category ||--o{ ProductPercentageCommissionCategory : "en distribución"
    Category ||--o| Category : "siguiente en jerarquía"
    User ||--o{ Category : "beneficiario fijo categoría"
    Role ||--o{ User : "rol asignado"
    Role ||--o{ AuditLog : "rol en auditoría"
    BuyPeriodicity ||--o{ Business : "periodicidad de compra"
    Currency ||--o{ Business : "moneda negocio"
    Currency ||--o{ Company : "moneda compañía"

    %% ========== PRODUCTOS Y CONFIGURACIÓN ==========
    Product ||--o{ ProductConfiguration : "combinación producto/categoría"
    ProductConfiguration ||--o{ ProductPercentageCommission : "versiones PPC"
    ProductConfiguration ||--o| ProductPercentageCommission : "PPC nuevos negocios"
    ProductPercentageCommission ||--o{ ProductPercentageCommissionCategory : "distribución por categoría"
    ProductPercentageCommission ||--o{ Business : "config aplicada"
    ProductPercentageCommissionCategory ||--o{ ComissionDistribution : "distribución"

    %% ========== USUARIOS Y JERARQUÍA ==========
    User ||--o| User : "líder"
    User ||--o{ Business : "negocios"
    User ||--o{ FileImport : "importaciones"
    User ||--o{ AuditLog : "eventos auditoría"
    User ||--o{ Clawback : "clawbacks"
    User ||--o| ClawbackBalance : "saldo clawback"
    User ||--o{ ComissionDistribution : "beneficiario distribución"
    User ||--o{ CommissionDiscount : "created_by updated_by"
    User ||--o{ DistributionApproval : "aprobaciones"

    %% ========== CLIENTES Y NEGOCIOS ==========
    Client ||--o{ Business : "negocios"

    %% ========== IMPORTACIÓN Y LIQUIDACIÓN ==========
    FileImport ||--o{ SettlementCommission : "registros"
    FileImport ||--o{ FileImportError : "errores fila"
    FileImport ||--o{ DistributionApproval : "aprobaciones archivo"
    Business ||--o{ SettlementCommission : "comisiones"
    Business ||--o{ Payment : "pagos anuales"
    SettlementCommission ||--o{ ComissionDistribution : "distribuciones"
    ComissionDistribution ||--o| Clawback : "clawback opcional"

    %% ========== ENTIDADES - CATÁLOGOS ==========
    Company {
        int id_company PK
        string name
        string id_type_company
        int id_currency FK
        boolean status
        datetime created_at
        datetime updated_at
    }

    ClientOrigin {
        int id_client_origin PK
        string name
        text description
        boolean status
        datetime created_at
        datetime updated_at
    }

    CategoryType {
        int id_category_type PK
        string name UK
        text description
        boolean status
        datetime created_at
        datetime updated_at
    }

    Category {
        int id_category PK
        string code UK
        string name
        int id_category_type FK
        text descripcion
        varchar color
        boolean status
        enum beneficiary_mode
        int id_fixed_beneficiary_user FK
        int id_next_category FK
        datetime created_at
        datetime updated_at
    }

    Role {
        int id_role PK
        string code UK
        string name
        text description
        boolean active
        datetime created_at
        datetime updated_at
    }

    BuyPeriodicity {
        int id_buy_periodicity PK
        string name
        boolean active
        datetime created_at
        datetime updated_at
    }

    Currency {
        int id_currency PK
        string name
        string symbol
        boolean active
        datetime created_at
        datetime updated_at
    }

    TypeProduct {
        int id_type_product PK
        string name
        text description
        boolean status
        datetime created_at
        datetime updated_at
    }

    %% ========== ENTIDADES - PRODUCTOS ==========
    Product {
        int id_product PK
        int id_company FK
        string name
        text description
        int id_type_product FK
        boolean status
        datetime created_at
        datetime updated_at
    }

    ProductConfiguration {
        int id_product_configuration PK
        int id_product FK
        int id_category FK
        string code UK
        boolean active
        int id_product_percentage_commission_new_businesses FK
        datetime created_at
        datetime updated_at
    }

    ProductPercentageCommission {
        int id_product_percentage_commission PK
        int id_product_configuration FK
        string description
        boolean active
        boolean has_portfolio
        datetime created_at
        datetime updated_at
    }

    ProductPercentageCommissionCategory {
        int id PK
        int id_category FK
        int id_product_percentage_commission FK
        decimal porcentaje_distribucion
        decimal porcentaje_portfolio
        boolean active
        datetime created_at
        datetime updated_at
    }

    %% ========== ENTIDADES - USUARIOS Y CLIENTES ==========
    User {
        int id_user PK
        string name
        string last_name
        string type_identity
        string identity_number
        string email UK
        string password
        boolean sso_only
        string phone
        int id_categoria FK
        int id_role FK
        int id_user_leader FK
        date entry_date
        date retirement_date
        boolean active
        datetime created_at
        datetime updated_at
    }

    Client {
        int id_client PK
        string name
        string last_name
        string type_identity
        string identity_number
        string email
        string phone
        string direcction
        string city
        string country
        boolean active
        datetime created_at
        datetime updated_at
    }

    %% ========== ENTIDADES - OPERACIONES ==========
    FileImport {
        int id_file_import PK
        string name_file
        string file_type
        datetime load_date
        int id_user FK
        int total_record
        int success_record
        int error_record
        int sincronizado_record
        int rezagado_record
        int no_sincronizado_record
        int upload_count
        string status
        datetime pre_liquidacion_date
        int month
        int year
        datetime created_at
        datetime updated_at
    }

    FileImportError {
        int id_file_import_error PK
        int id_file_import FK
        int row_number
        int load_number
        string contract
        text reason
        json raw_data
        boolean resolved
        datetime resolved_at
    }

    Business {
        int id_business PK
        string contract UK
        int term
        decimal value
        text observations
        int id_buy_periodicity FK
        int id_user FK
        int id_client FK
        int id_product_percentage_commission FK
        int id_currency FK
        int id_client_origin FK
        datetime date_issued
        datetime date_anchored
        int num_aportes
        string status
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    Payment {
        int id_annual_payment PK
        int id_business FK
        int installment_index
        enum status
        datetime date_anchored
        datetime expected_date
        datetime created_at
        datetime updated_at
    }

    CommissionDiscount {
        int id PK
        string name
        string type
        decimal percentage
        text description
        string status
        datetime created_at
        datetime updated_at
        int created_by_id FK
        int updated_by_id FK
    }

    SettlementCommission {
        int id_settlement_commission PK
        int id_file_import FK
        int id_business FK
        int load_number
        string contract
        text descripcion
        decimal commission_value
        decimal base_commission
        decimal discount_percentage
        decimal clawback_percentage
        string origin_commission
        string commission_type
        datetime start_date
        datetime end_date
        string status
        boolean is_lag
        boolean is_clawback
        datetime lag_date
        boolean is_lag_by_user
        datetime is_lag_by_user_date
        datetime sync_date
        datetime settled_date
        datetime created_at
        datetime updated_at
    }

    ComissionDistribution {
        int id_comission_distribution PK
        int id_settlement_commission FK
        int id_percentaje_commision_category FK
        int id_beneficiary_user FK
        decimal value_comission
        decimal value_comission_final
        decimal total_discount
        decimal applied_discount_percentage
        decimal value_commission_with_discount
        text observation
        string status
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    Clawback {
        int id_clawback PK
        int id_user FK
        int id_comission_distribution UK
        decimal value_clawback
        decimal porcentaje_applied
        string state
        date applied_date
        date release_date
        text reason
        datetime created_at
        datetime updated_at
    }

    ClawbackBalance {
        int id_user PK
        decimal total_amount
        datetime updated_at
    }

    DistributionApproval {
        int id_distribution_approval PK
        int id_file_import FK
        int id_user FK
        datetime approved_at
        datetime created_at
        datetime updated_at
    }

    AuditLog {
        int id_audit_log PK
        int id_user FK
        int id_role FK
        string action
        string email
        string ip_address
        text user_agent
        text details
        datetime created_at
    }
```

## Leyenda de cardinalidad (Mermaid)

| Símbolo | Significado        |
|---------|--------------------|
| `\|\|--o{` | Uno a muchos     |
| `\|\|--o\|` | Uno a cero o uno |
| `}o--o{`   | Muchos a muchos  |

## Índices y convenciones

- **PK**: Primary Key  
- **FK**: Foreign Key  
- **UK**: Unique (constraint único)  
- Nombres de tablas y columnas en el diagrama siguen el mapeo físico de `schema.prisma` (`@@map` / `@map`).
- `User`: además de `email` UK, existe constraint único compuesto `(type_identity, identity_number)` cuando ambos tienen valor.
- `SettlementCommission.id_business` es opcional en Prisma (`Int?`); el diagrama refleja la FK habitual hacia `business`.
- Tablas físicas con typo histórico: `product_percentaje_commision`, `product_percentaje_commision_category` (ver `@@map` en el schema).
- `Category.id_next_category` es una FK auto-referencial a `category.id_category` (relación nombrada `"CategorySequence"`). Permite modelar la secuencia de jerarquía: MS JUNIOR → MS SENIOR → TEAM LEADER → PERFORMANCE LEADER → BUSINESS LEADER → PARTNER → MIA.
- `Category.color` almacena un color hex `#RRGGBB` (VARCHAR 7) para identificación visual de cada nivel.
- `BeneficiaryMode` renombrado (migración manual): `UPLINE_CHAIN → OVERRIDE`, `FIXED_BENEFICIARY → BENEFICIARIO_GENERAL`.
- `ProductConfiguration`: el campo `id_client_origin` fue eliminado (migración `20260507010000_mejoras_product_configuration_sin_origen`). El unique constraint cambió de `(id_product, id_client_origin, id_category)` a `(id_product, id_category)`. El `code` es único a nivel de columna.
- `Business`: campo `is_active` agregado (`@default(true)`) para soporte de soft delete lógico.
- `ComissionDistribution`: campo `is_active` agregado (`@default(true)`) para soft delete lógico (reemplaza `deleteMany` en servicios de pre-liquidación y carga de archivos).

## Cómo ver el diagrama

- Pegar el bloque de código mermaid en [mermaid.live](https://mermaid.live) o en cualquier visor que soporte Mermaid (GitHub, GitLab, Notion, etc.).
