# Modelo relacional - Sistema de Liquidación de Comisiones

Diagrama ER (Entity Relationship) generado a partir de `schema.prisma`.  
Sistema: Financieramente — liquidación de comisiones.

```mermaid
erDiagram
    %% ========== CATÁLOGOS Y DOMINIOS ==========
    Company ||--o{ Product : "tiene productos"
    TypeProduct ||--o{ Product : "clasifica"
    ClientOrigin ||--o{ ProductConfiguration : "origen en config"
    ClientOrigin ||--o{ Business : "origen del negocio"
    Category ||--o{ User : "categoría del usuario"
    Category ||--o{ ProductConfiguration : "categoría en config"
    Category ||--o{ ProductPercentajeCommisionCategory : "en distribución"
    Role ||--o{ User : "rol asignado"
    Role ||--o{ AuditLog : "rol en auditoría"
    BuyPeriodicity ||--o{ Business : "periodicidad de compra"
    Currency ||--o{ Business : "moneda"

    %% ========== PRODUCTOS Y CONFIGURACIÓN ==========
    Product ||--o{ ProductConfiguration : "combinación producto/origen/categoría"
    ProductConfiguration ||--o{ ProductPercentajeCommision : "versiones PPC"
    ProductConfiguration ||--o| ProductPercentajeCommision : "PPC activo nuevos negocios"
    ProductPercentajeCommision ||--o{ ProductPercentajeCommisionCategory : "distribución por categoría"
    ProductPercentajeCommision ||--o{ Business : "config aplicada"
    ProductPercentajeCommisionCategory ||--o{ ComissionDistribution : "distribución"

    %% ========== USUARIOS Y JERARQUÍA ==========
    User ||--o| User : "líder"
    User ||--o{ Business : "negocios"
    User ||--o{ FileImport : "importaciones"
    User ||--o{ AuditLog : "eventos auditoría"

    %% ========== CLIENTES Y NEGOCIOS ==========
    Client ||--o{ Business : "negocios"

    %% ========== IMPORTACIÓN Y LIQUIDACIÓN ==========
    FileImport ||--o{ SettlementCommission : "registros"
    Business ||--o{ SettlementCommission : "comisiones"
    SettlementCommission ||--o{ ComissionDistribution : "distribuciones"
    ComissionDistribution ||--o| Clawback : "clawback opcional"

    %% ========== ENTIDADES - CATÁLOGOS ==========
    Company {
        int id_company PK
        string name
        string id_type_company
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

    Category {
        int id_category PK
        string code UK
        string name
        string type_category
        text descripcion
        boolean status
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
        int id_client_origin FK
        int id_category FK
        string code
        int id_product_percentaje_commision_new_businesses FK
        datetime created_at
        datetime updated_at
    }

    ProductPercentajeCommision {
        int id_product_percentaje_commision PK
        int id_product_configuration FK
        boolean active
        datetime created_at
        datetime updated_at
    }

    ProductPercentajeCommisionCategory {
        int id PK
        int id_category FK
        int id_product_percentaje_commision FK
        decimal porcentaje_distribucion
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
        datetime load_date
        int id_user FK
        int total_record
        int success_record
        int error_record
        int sincronizado_record
        int rezagado_record
        int no_sincronizado_record
        string status
        datetime pre_liquidacion_date
        datetime created_at
        datetime updated_at
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
        int id_product_percentaje_commision FK
        int id_currency FK
        int id_client_origin FK
        string status
        datetime created_at
        datetime updated_at
    }

    SettlementCommission {
        int id_settlement_commission PK
        int id_file_import FK
        int id_business FK
        string poliza
        string ramo
        string producto
        string recibo
        string concepto
        datetime fecha_pago
        decimal valor_comision
        decimal porcentaje_comision
        decimal valor_prima
        string status
        boolean is_lag
        string error
        datetime created_at
        datetime updated_at
    }

    ComissionDistribution {
        int id_comission_distribution PK
        int id_settlement_commission FK
        int id_percentaje_commision_category FK
        decimal value_comission
        decimal value_comission_final
        text observation
        string status
        datetime created_at
        datetime updated_at
    }

    Clawback {
        int id_clawback PK
        int id_comission_distribution FK
        decimal value_clawback
        decimal porcentaje_applied
        string state
        date applied_date
        date release_date
        text reason
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
- Nombres de tablas y columnas coinciden con el mapeo en `schema.prisma` (`@@map` / `@map`).

## Cómo ver el diagrama

- Pegar el bloque de código mermaid en [mermaid.live](https://mermaid.live) o en cualquier visor que soporte Mermaid (GitHub, GitLab, Notion, etc.).
