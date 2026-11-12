# Modelo relacional - Sistema de Liquidación de Comisiones

Diagrama ER (Entity Relationship) generado a partir de `schema.prisma`.  
Sistema: Financieramente — liquidación de comisiones.

**Enums**:
- `BeneficiaryMode`: `OVERRIDE` | `BENEFICIARIO_GENERAL` (en `level.beneficiary_mode`).
- `AnnualPaymentStatus`: `SIN_FONDEAR` | `FONDEADO` | `EN_CARTERA` | `PAGO_ANTICIPADO` | `CARTERA_PAGADO` (en `payment.status`).
- `ContributionType`: `REGULAR` | `UNICO` (en `product.contribution_type`).
- `Notification.status`: Boolean (`is_read`, `is_closed`) para marcar lectura y cierre.
- `AccountTokenType`: `ACTIVATION` | `RESET` (en `account_token.type`).
- `LeadOutcomeStatus`: `OPEN` | `WON` | `LOST` | `ABANDONED` (en `lead.outcome_status`, `@default(OPEN)`, `NOT NULL`). `WON` es terminal: ver nota bajo "Índices y convenciones".
- `DocumentDataType`: `NUMERIC` | `ALPHANUMERIC` (en `document_type.data_type`).
- `LeadStageChangeSource`: `CRM_SYNC` | `CSV_IMPORT` | `MANUAL` (en `lead_stage_history.source`).
- `LeadActivityType`: `NOTE_ADDED` | `CALL_LOGGED` | `MEETING_LOGGED` | `EMAIL_LOGGED` | `WHATSAPP_LOGGED` | `TASK_CREATED` | `TASK_COMPLETED` | `TASK_REASSIGNED` | `TASK_COMMENTED` | `CONVERTED` | `BUSINESS_LINKED` | `CASE_OPENED` | `CASE_UPDATED` (en `lead_activity.type`). `TASK_COMMENTED` registra un comentario de tarea; un comentario de caso sigue siendo `CASE_UPDATED` con `action: COMMENTED`.
- `LeadTaskType`: `TODO` | `CALL` | `MEETING` | `EMAIL` | `WHATSAPP` (en `lead_task.type`, `@default(TODO)`). El nombre visible vive en `lead_activity_label` (`code` nulo = etiqueta creada por el equipo).
- `LeadCustomFieldType`: `TEXT` | `NUMBER` | `DATE` | `SELECT` (en `lead_custom_field.type`; inmutable tras crear el campo).
- `LeadTaskStatus`: `OPEN` | `DONE` | `CANCELLED` (en `lead_task.status`).
- `LeadSupportCaseStatus`: `OPEN` | `IN_PROGRESS` | `WAITING` | `RESOLVED` | `CLOSED` (en `lead_support_case.status`).
- `LeadSupportCasePriority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT` (en `lead_support_case.priority`).

```mermaid
erDiagram
    %% ========== CATÁLOGOS Y DOMINIOS ==========
    Company ||--o{ Product : "tiene productos"
    TypeProduct ||--o{ Product : "clasifica"
    CategoryType ||--o{ Category : "tipo de categoría"
    ClientOrigin ||--o{ Business : "origen del negocio"
    Level ||--o{ User : "nivel del usuario"
    Level ||--o{ ProductConfiguration : "nivel en config"
    Level ||--o{ ProductPercentageCommissionCategory : "en distribución"
    Level ||--o{ DefaultDistributionPercentage : "nivel de la plantilla"
    Level ||--o{ DefaultDistributionPercentage : "nivel receptor"
    Level ||--o| Level : "siguiente en jerarquía"
    User ||--o{ Level : "beneficiario fijo nivel"
    Category ||--o{ User : "categoría del usuario"
    Category ||--o{ CategoryReportPermission : "permisos de reportes"
    ReportDefinition ||--o{ CategoryReportPermission : "categorías habilitadas"
    Role ||--o{ User : "rol asignado"
    Role ||--o{ AuditLog : "rol en auditoría"
    BuyPeriodicity ||--o{ Business : "periodicidad de compra"
    Currency ||--o{ Business : "moneda negocio"
    Currency ||--o{ Company : "moneda compañía"
    DocumentType ||--o{ Client : "identifica"
    DocumentType ||--o{ Policyholder : "identifica tomador"
    DocumentType ||--o{ User : "code = type_identity"
    Policyholder ||--o{ Business : "tomador del negocio"

    %% ========== PRODUCTOS Y CONFIGURACIÓN ==========
    Product ||--o{ ProductConfiguration : "combinación producto/nivel"
    ProductConfiguration ||--o{ ProductPercentageCommission : "versiones PPC"
    ProductConfiguration ||--o| ProductPercentageCommission : "PPC nuevos negocios"
    ProductPercentageCommission ||--o{ ProductPercentageCommissionCategory : "distribución por nivel"
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
    User ||--o{ Notification : "notificaciones"
    User ||--o{ Comment : "comentarios creados"
    User ||--o{ AccountToken : "tokens de activación y reseteo"
    Business ||--o{ Comment : "comentarios del contrato"
    LeadFunnelColumn ||--o{ Lead : "columna del embudo"
    User ||--o{ Lead : "propietario del lead"
    Business ||--o| Lead : "negocio originado del lead"
    Lead ||--o{ LeadStageHistory : "historial de etapas"
    LeadFunnelColumn ||--o{ LeadStageHistory : "etapa origen"
    LeadFunnelColumn ||--o{ LeadStageHistory : "etapa destino"
    User ||--o{ LeadStageHistory : "usuario que movió"
    Lead ||--o{ LeadActivity : "eventos del timeline"
    Business ||--o{ LeadActivity : "negocio relacionado"
    User ||--o{ LeadActivity : "actor"
    Lead ||--o{ LeadTask : "tareas"
    Business ||--o{ LeadTask : "negocio relacionado"
    User ||--o{ LeadTask : "responsable / creador"
    User ||--o{ LeadActivityLabel : "crea etiquetas de actividad"
    User ||--o{ LeadActivityColumn : "renombra cabeceras"
    LeadActivityLabel ||--o{ LeadTask : "etiqueta visible"
    LeadTask ||--o{ LeadTaskComment : "comentarios"
    User ||--o{ LeadTaskComment : "autor"
    Lead ||--o{ LeadSupportCase : "casos de soporte"
    Business ||--o{ LeadSupportCase : "negocio relacionado"
    User ||--o{ LeadSupportCase : "abre / asignado"
    LeadSupportCase ||--o{ LeadSupportCaseComment : "comentarios"
    User ||--o{ LeadSupportCaseComment : "autor"
    Lead ||--o{ LeadTagAssignment : "etiquetas"
    LeadTag ||--o{ LeadTagAssignment : "asignaciones"
    User ||--o{ LeadSavedView : "vistas guardadas"

    %% ========== CLIENTES Y NEGOCIOS ==========
    Client ||--o{ Business : "negocios"

    %% ========== IMPORTACIÓN Y LIQUIDACIÓN ==========
    FileImport ||--o{ SettlementCommission : "registros"
    FileImport ||--o{ FileImportError : "errores fila"
    FileImport ||--o{ DistributionApproval : "aprobaciones archivo"
    Business ||--o{ SettlementCommission : "comisiones"
    Business ||--o{ Payment : "pagos anuales"
    Business ||--o{ BusinessSupport : "comprobantes"
    User ||--o{ BusinessSupport : "comprobantes subidos"
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

    Level {
        int id_level PK
        string code UK
        string name
        text descripcion
        varchar color
        boolean status
        enum beneficiary_mode
        int id_fixed_beneficiary_user FK
        int id_next_level FK
        datetime created_at
        datetime updated_at
    }

    DefaultDistributionPercentage {
        int id_default_distribution_percentage PK
        int id_config_level FK
        int id_receiver_level FK
        decimal percentage
        datetime created_at
        datetime updated_at
    }

    Category {
        int id_category PK
        string name
        int id_category_type FK
        text description
        boolean status
        datetime created_at
        datetime updated_at
    }

    ReportDefinition {
        int id PK
        string code UK
        string name
        text description
        string route_path
        boolean status
        datetime created_at
        datetime updated_at
    }

    CategoryReportPermission {
        int id PK
        int id_report FK
        int id_category FK
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

    DocumentType {
        int id_document_type PK
        string name UK
        string code UK
        DocumentDataType data_type
        int min_length
        int max_length
        boolean status
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
        decimal commission_percentage
        enum contribution_type
        boolean status
        datetime created_at
        datetime updated_at
    }

    ProductConfiguration {
        int id_product_configuration PK
        int id_product FK
        int id_level FK
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
        int id_level FK
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
        int id_level FK
        int id_category FK
        int id_role FK
        int id_user_leader FK
        date entry_date
        date retirement_date
        boolean active
        datetime activated_at
        datetime created_at
        datetime updated_at
    }

    AccountToken {
        int id PK
        int id_user FK
        AccountTokenType type
        string token_hash UK
        datetime expires_at
        datetime used_at
        datetime revoked_at
        datetime created_at
    }

    Client {
        int id_client PK
        string name
        string last_name
        string type_identity
        int id_document_type FK
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

    Policyholder {
        int id_policyholder PK
        string name
        string last_name
        string type_identity
        int id_document_type FK
        string identity_number
        string email
        string phone
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
        boolean client_is_policyholder
        int id_policyholder FK
        int id_product_percentage_commission FK
        int id_currency FK
        int id_client_origin FK
        datetime date_issued
        datetime date_anchored
        int num_aportes
        string status
        string novedad_status
        datetime novedad_marked_at
        datetime novedad_resolved_at
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
        datetime cartera_date
        datetime pago_anticipado_date
        datetime portfolio_payment_date
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

    BusinessSupport {
        string id PK
        int business_id FK
        string object_key UK
        string mime_type
        int size_bytes
        int uploaded_by FK
        boolean status
        datetime created_at
        datetime updated_at
    }

    Notification {
        int id_notification PK
        int id_user FK
        string title
        text message
        string callback_url
        boolean is_read
        boolean is_closed
        datetime created_at
        datetime updated_at
    }

    Comment {
        string id PK
        int business_id FK
        int author_id FK
        string title
        string detail
        boolean status
        datetime created_at
        datetime updated_at
    }

    LeadFunnelColumn {
        int id_lead_funnel_column PK
        string name
        string external_status_key UK
        int position
        boolean is_fallback
        boolean active
        datetime created_at
        datetime updated_at
    }

    Lead {
        int id_lead PK
        string external_crm_id UK
        string name
        string last_name
        string email
        string phone
        string identity_number
        string origin_tag
        text external_url
        int id_user FK
        int id_lead_funnel_column FK
        int id_business UK, FK
        string outcome_status
        boolean active
        datetime last_activity_at
        decimal estimated_value
        int probability
        json custom_field_values
        datetime created_at
        datetime updated_at
    }

    LeadStageHistory {
        int id_lead_stage_history PK
        int id_lead FK
        int from_id_lead_funnel_column FK
        int to_id_lead_funnel_column FK
        string source
        int id_user FK
        datetime changed_at
        datetime created_at
    }

    LeadActivity {
        int id_lead_activity PK
        int id_lead FK
        int id_business FK
        int id_user FK
        string type
        datetime occurred_at
        json payload
        int payload_version
        string correlation_id
        datetime created_at
    }

    LeadActivityLabel {
        int id_lead_activity_label PK
        string name
        string color
        string code
        boolean active
        int position
        int created_by FK
        datetime created_at
        datetime updated_at
    }

    LeadActivityColumn {
        int id_lead_activity_column PK
        string code
        string name
        int position
        int updated_by FK
        datetime updated_at
    }

    LeadTask {
        int id_lead_task PK
        int id_lead FK
        int id_business FK
        int assigned_to FK
        int created_by FK
        int id_lead_activity_label FK
        string title
        string type
        datetime due_at
        string status
        datetime completed_at
        datetime reminder_sent_at
        datetime created_at
        datetime updated_at
    }

    LeadTaskComment {
        int id_lead_task_comment PK
        int id_lead_task FK
        int author_id FK
        string body
        datetime created_at
    }

    LeadSupportCase {
        int id_lead_support_case PK
        int id_lead FK
        int id_business FK
        int opened_by FK
        int assigned_to FK
        string subject
        string status
        string priority
        datetime due_at
        datetime resolved_at
        datetime created_at
        datetime updated_at
    }

    LeadSupportCaseComment {
        int id_lead_support_case_comment PK
        int id_lead_support_case FK
        int author_id FK
        string body
        datetime created_at
    }

    LeadTag {
        int id_lead_tag PK
        string name
        string color
        boolean active
        int created_by
        datetime created_at
        datetime updated_at
    }

    LeadTagAssignment {
        int id_lead_tag_assignment PK
        int id_lead FK
        int id_lead_tag FK
        boolean active
        int assigned_by
        datetime created_at
        datetime updated_at
    }

    LeadCustomField {
        int id_lead_custom_field PK
        string key UK
        string label
        string type
        json options
        int position
        boolean active
        int created_by
        datetime created_at
        datetime updated_at
    }

    LeadSavedView {
        int id_lead_saved_view PK
        int id_user FK
        string name
        json query
        boolean active
        datetime created_at
        datetime updated_at
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
- **Nueva tabla `document_type`** (migración `20261009193000_add_document_type`): catálogo de tipos de documento. `name` y `code` son únicos. `status = false` es el borrado lógico (nunca `delete()` físico). La precarga inserta CC, CE, PAS, NIT y PPT en estado activo. `max_length` queda acotado a 20 para caber en `identity_number`.
- **`Client.id_document_type`** (migración `20261014170000_link_client_document_type`, COM-27): FK `ON DELETE RESTRICT` hacia `document_type`. `type_identity` queda como copia del `code` para la unicidad `(type_identity, identity_number)` y los consumidores existentes; no es texto libre. La migración es idempotente: solo llena `id_document_type` nulo, conserva el código que ya coincide con el catálogo y asigna CC al resto. Reejecutarla no reemplaza una FK ya definida. Desactivar un tipo lo oculta en altas nuevas y conserva la relación histórica. `User.type_identity` sigue sin FK (usuarios de plataforma, fuera de alcance).
- **`Policyholder`** (migración `20261015143000_add_policyholder`, COM-28): catálogo independiente de `Client`. `Business.client_is_policyholder` nace en `true` para los negocios existentes (el cliente es el mismo tomador) y `id_policyholder` queda nulo. Un tomador distinto se vincula solo a ese negocio (`ON DELETE RESTRICT`); volver la casilla a «Sí» desvincula el negocio y no borra la fila del tomador. La unicidad es `(type_identity, identity_number)`. Reejecutar la migración no crea tomadores ni cambia un vínculo ya guardado.
- `SettlementCommission.id_business` es opcional en Prisma (`Int?`); el diagrama refleja la FK habitual hacia `business`.
- Tablas físicas con typo histórico: `product_percentaje_commision`, `product_percentaje_commision_category` (ver `@@map` en el schema).
- **Nueva tabla `default_distribution_percentage`** (migración `20261006140000_add_default_distribution_percentage`): plantilla editable de la distribución por defecto. Unique `(id_config_level, id_receiver_level)`. `percentage` es fracción (`0.6` = 60%). Al crear un producto, o al completar una configuración sin líneas, se copian estas filas. Cambiar la plantilla no reescribe distribuciones ya guardadas. La migración siembra `LEVEL_0`–`LEVEL_5` con la tabla aprobada. `GENERAL_LEVEL` no tiene filas.
- `Level.id_next_level` es una FK auto-referencial a `level.id_level` (relación nombrada `"LevelSequence"`). Permite modelar la secuencia de jerarquía: LEVEL_0 → LEVEL_1 → LEVEL_2 → LEVEL_3 → LEVEL_4 → LEVEL_5 → GENERAL_LEVEL.
- `Level.color` almacena un color hex `#RRGGBB` (VARCHAR 7) para identificación visual de cada nivel.
- `BeneficiaryMode` renombrado (migración manual): `UPLINE_CHAIN → OVERRIDE`, `FIXED_BENEFICIARY → BENEFICIARIO_GENERAL`.
- `ProductConfiguration`: el campo `id_client_origin` fue eliminado (migración `20260507010000_mejoras_product_configuration_sin_origen`). El unique constraint cambió de `(id_product, id_client_origin, id_category)` a `(id_product, id_level)`. El `code` es único a nivel de columna.
- `Business`: campo `is_active` agregado (`@default(true)`) para soporte de soft delete lógico.
- `Business`: campos `novedad_status` (nullable, VARCHAR(20), sin cambio de tipo/migración de columna), `novedad_marked_at` y `novedad_resolved_at` agregados (migración `20260731043040_add_business_novedad_fields`) para el flag de "novedad" sobre negocios en `VENTA_EFECTUADA`. Sin relación nueva; `novedad_status = null` es el estado por defecto/pre-existente.
- `Business.novedad_status` — vocabulario ampliado a 5 estados (`novedad-gestion-manual`, solo TS, sin migración de schema): `NUEVA` (asignado por MARK, punto de partida), `SOMETIDA_DEVOLUCION`, `DECLINADA`, `PENDIENTE`, `CANCELADA` (los 4 últimos gestionables manualmente vía `PATCH /api/negocios/[id]/manage-novedad`, rol `ANALISTA_SOPORTE`/`ADMIN`, sin estado terminal — cualquier estado manual puede volver a cualquier otro). La transición `VENTA_EFECTUADA → EMITIDO` ya NO modifica `novedad_status`/`novedad_resolved_at` automáticamente (auto-resolución eliminada); `PENDIENTE`/`RESUELTA` legados se migran a `NUEVA` vía `prisma/seeds/backfill-novedad-status.ts` (idempotente, `--dry-run`).
- `ComissionDistribution`: campo `is_active` agregado (`@default(true)`) para soft delete lógico (reemplaza `deleteMany` en servicios de pre-liquidación y carga de archivos).
- **Renombre `Category → Level`** (migración `20260509000000_rename_category_to_level`): la tabla `category` fue renombrada a `level`; la columna `id_category_type` fue eliminada de `level` (migración `20260509010000_create_category_and_populate`). El modelo Prisma `Category` ahora mapea a la tabla `level` bajo el nombre `Level`.
- **`Payment` — nuevos campos** (migración `20260521220206_aportes_cartera_anticipado`): `cartera_date` y `pago_anticipado_date` son nullable; se rellenan al marcar EN_CARTERA o PAGO_ANTICIPADO respectivamente. Se añaden los valores `EN_CARTERA` y `PAGO_ANTICIPADO` al enum `AnnualPaymentStatus`.
- **`Payment` — campo `portfolio_payment_date`** (migración `20260524000000_cartera_pagado_transition`): columna nullable `TIMESTAMP(3)` que registra la fecha en que el cliente pagó la cartera. Se rellena al transicionar a `CARTERA_PAGADO`. Corresponde al valor terminal del enum `AnnualPaymentStatus` — una vez en `CARTERA_PAGADO` no hay más transiciones posibles.
- **Nueva tabla `business_support`** (migración `20260514000000_add_business_support`): almacena comprobantes de pago por negocio respaldados en Digital Ocean Spaces. `object_key` es único (ruta en el bucket). Soft delete vía `status = false`. Índice compuesto `(business_id, status)` para filtrar activos eficientemente. FK a `business` y `user` (uploader).
- **Nueva tabla `category`** (migración `20260509010000_create_category_and_populate`): representa la categoría comercial/organizacional de un usuario (p. ej. MS Junior, MS Senior). Tiene FK a `category_type`. `User.id_category` apunta a esta tabla. La antigua jerarquía técnica es ahora `Level`; la nueva `Category` es la clasificación de negocio.
- `ProductConfiguration`: el unique constraint parcial `(id_product, id_level)` preserva el comportamiento de índice parcial `WHERE active = true` heredado de la migración de renombre. El `@@map` del constraint es `product_configuration_idProduct_idLevel_key`.
- `Product`: campos `commission_percentage` (Decimal 7,4) y `contribution_type` (enum REGULAR | UNICO) agregados para configuración de comisiones y tipos de contribución.
- **Nueva tabla `Notification`** (migración `notificaciones`): almacena notificaciones genéricas para usuarios con soporte de `callbackUrl` para acciones interactivas. Campos `is_read` e `is_closed` para estado. Soft delete a través de `is_closed`. FK a `user` con `onDelete: Cascade`.
- **Nueva tabla `comment`** (migración `20260710180400_add_comment_model`): comentarios por contrato, creados por `AGENTE` (Money Strategist) o `ANALISTA_SOPORTE` (Analista de Soporte). `title` `VARCHAR(40)` y `detail` `VARCHAR(200)` reflejan los límites de UI. `status` (boolean, default `true`) se mantiene reservado para soft-delete futuro — esta iteración es create-only, sin endpoints de edición/borrado. Índice compuesto `(business_id, created_at)` para listar el hilo ordenado cronológicamente. FK a `business` y `user` (autor).
- **Nuevas tablas `lead_funnel_column` y `lead`** (migración `20260803190000_add_leads_module`, feature `leads-crm-sync`): representan el embudo de leads sincronizado desde un CRM externo (GoHighLevel vía n8n) antes de que exista un `Business`. `lead_funnel_column.external_status_key` es único y mapea el `statusKey` agnóstico enviado por el webhook; incluye una columna fija no eliminable `is_fallback = true` ("Sin mapear", `external_status_key = '__unmapped__'`) sembrada por `prisma/seeds/lead-funnel-columns.ts`, que recibe cualquier `statusKey` sin mapeo. `lead.external_crm_id` es único y nullable — motor de idempotencia del webhook vía `upsert`. `lead.id_user` (FK nullable, `ON DELETE SET NULL`) es el propietario resuelto por `ownerEmail`; un lead con `id_user = null` es visible únicamente para roles en `HIERARCHY_BYPASS_ROLES` (ver `src/features/auth/lib/hierarchy.ts`). `lead.id_business` (FK nullable y única, `ON DELETE SET NULL`) se completa solo al convertir manualmente el lead en `Client` + `Business`; el `@unique` es el respaldo a nivel de base de datos contra doble conversión. Soft delete vía `active` en ambas tablas — nunca `delete()` físico. Índices en `lead.id_user`, `lead.id_lead_funnel_column` y `lead_funnel_column.position`.
- **`Lead.outcome_status`** (migración `20260804000000_add_lead_outcome_status`): nuevo enum Prisma `LeadOutcomeStatus` (`OPEN | WON | LOST | ABANDONED`), `NOT NULL DEFAULT 'OPEN'`, índice compuesto `(outcome_status, created_at)` para el filtro por defecto del tablero. El webhook nunca rechaza un valor desconocido: normaliza a `OPEN` y audita `LEAD_OUTCOME_STATUS_UNRESOLVED`. **`WON` es terminal**: una vez persistido, ningún webhook posterior puede cambiarlo — el intento se descarta silenciosamente (HTTP 200, resto del payload sí se aplica) y se audita `LEAD_OUTCOME_STATUS_LOCKED`; `LOST`/`ABANDONED` no son terminales. El lock vive enteramente en `resolveOutcomeStatus()` (`src/features/leads/lib/lead-outcome-status.ts`), no en un trigger de base de datos.
- **Nuevas tablas `report_definition` y `category_report_permission`** (migración `20260805150000_add_report_permissions`, feature reportes/COM-80): catálogo de reportes con `code` único estable (p. ej. `PRODUCCION_REAL`) y habilitación por `Category`. Soft delete en ambas vía `status = false` — nunca `delete()` físico. Unique compuesto `(id_report, id_category)`. Save reemplaza el set: upsert `status=true` para seleccionadas; soft-disable las no seleccionadas. Seeds de deploy (`prisma migrate deploy`, no `db seed`): **Performance Leader** → `PRODUCCION_REAL` (`20260821153000`); **Performance Leader** + **Business Leader** → `LEADS_ANALYTICS` (`20260821180000`, reafirmado en `20260903120000`) y `ABA_MFUND` (`20260903120000`). ADMIN bypasea la validación de categoría al ver reportes.
- **`User.activated_at` y nueva tabla `account_token`** (migración `20261010150000_partner_profile`, COM-41): `activated_at` es `TIMESTAMP(3)` nullable; la migración hace backfill `activated_at = created_at` para todos los usuarios existentes (nadie pierde acceso) y solo los usuarios nuevos nacen con `NULL` (pendientes de activación). El login exige `active AND activated_at IS NOT NULL`. `account_token` guarda únicamente el hash SHA-256 (`token_hash` único, `VARCHAR(64)`) de los tokens `ACTIVATION` (72 h) y `RESET` (1 h); se invalidan con `revoked_at` y se consumen con `used_at` (nunca se borran filas). Índice `(id_user, type)`.
- **Nivel `PARTNER_EXTERNAL`** (COM-41, sembrado por `npm run prisma:seed:partner`, sin migración): fila de `level` con `beneficiary_mode = OVERRIDE` y sin `id_next_level`. Queda **fuera** de `NEXT_LEVEL_CHAIN` (no es siguiente nivel de ninguno) y no se renombra desde `LEVEL_5`, que sigue siendo "Partner". El rol `PARTNER` y la categoría "Partner Externo" (tipo `MIA`) también se siembran allí.
- **Nueva tabla `lead_stage_history`** (migración `20261105120000_add_lead_stage_history`, change `crm-phase-0-foundation`): log de solo inserción (nunca se actualiza ni se borra) de cada transición de etapa del embudo. La escriben el webhook `crm-sync` (`source = CRM_SYNC`, `id_user = NULL`, `changed_at = updatedAt` del payload o el instante de proceso) y la importación CSV (`source = CSV_IMPORT`, `id_user` = quien importa) solo cuando el lead es nuevo (`from_id_lead_funnel_column = NULL`) o cambia de columna. Dos FKs a `lead_funnel_column` (relaciones `LeadStageHistoryFrom` / `LeadStageHistoryTo`). Índices `(id_lead, changed_at)` y `(to_id_lead_funnel_column, changed_at)` para reportes de tiempo en etapa. Un fallo al escribir el historial se reporta a Sentry y nunca rompe la sincronización. `MANUAL` queda reservado para el CRM editable (Fase 4).
- **CRM: cabeceras del tablero** (migración `20261112190000_add_lead_activity_column`): `lead_activity_column` guarda el título visible de cada columna (`code` único `overdue | today | upcoming | done`). La migración siembra Vencidas, Vencen hoy, Próximas a vencer y Completadas. Renombrar no mueve las tarjetas: el `code` sigue decidiendo la columna. No se crean ni se borran columnas.
- **CRM: etiquetas de actividad** (migración `20261112183000_add_lead_activity_label`): `lead_activity_label` es el catálogo de nombres que se ven en la tarjeta (color, `active`, `code` único y nulo en las etiquetas creadas por el equipo). La migración siembra Tarea, Llamada, Reunión, Email y WhatsApp con el `id_user` más bajo y enlaza `lead_task.id_lead_activity_label` según `lead_task.type`. `lead_task.type` se conserva para recordatorios y tareas anteriores al catálogo. Borrar una etiqueta es lógico (`active = false`); la última etiqueta activa no se puede desactivar.
- **CRM: `lead_task_comment`** (migración `20261111170000_add_lead_task_comment`): comentarios de una tarea, escritos desde Actividades. Mismo patrón que `lead_support_case_comment` (solo inserción, índice `(id_lead_task, created_at)`).
- **CRM: `lead_activity`, `lead_task`, `lead_support_case`, `lead_support_case_comment`** (migraciones `20261105165000`–`20261105180000`, rama `codex/negocios-basic-crm`): `lead_activity` es un registro de eventos de solo inserción (payload JSON versionado; `(id_lead, correlation_id)` único para idempotencia; cursor `(occurred_at, id_lead_activity)`). Solo `NOTE_ADDED` y `*_LOGGED` los envía el cliente; el resto los escriben los servicios. `lead_task` = trabajo programado (estilo Odoo `mail.activity`); `lead_support_case` = casos de soporte (estilo EspoCRM Case). Los cambios de etapa **no** se duplican en `lead_activity`: el timeline los mezcla al leer desde `lead_stage_history` (el webhook no tiene actor y `lead_activity.id_user` es obligatorio).
- **CRM Fase 1** (migración `20261109120000_extend_lead_activity_and_task`, change `crm-phase-1-activities`): `LeadActivityType` += `CALL_LOGGED | MEETING_LOGGED | EMAIL_LOGGED | WHATSAPP_LOGGED`; nuevo enum `LeadTaskType` y columnas `lead_task.type` (`DEFAULT 'TODO'`) y `lead_task.reminder_sent_at` (índice `(due_at, reminder_sent_at)`: el cron reclama la tarea con `updateMany ... WHERE reminder_sent_at IS NULL` antes de notificar; reprogramar la tarea lo vuelve `NULL`). `lead.last_activity_at` es dato propio del CRM (nunca lo escriben el webhook ni el CSV): lo actualiza `appendLeadActivityTx` en la misma transacción para los eventos de contacto, solo si es más reciente; índice `(outcome_status, last_activity_at)` para el indicador "Sin actividad".
- **CRM Fase 2** (migración `20261110120000_add_lead_views_tags_fields`, change `crm-phase-2-views-tags`): datos propios del CRM que el webhook `crm-sync` nunca escribe. `lead.estimated_value` (`DECIMAL(15,2)`) y `lead.probability` (`CHECK 0..100`) dan el valor ponderado del pipeline (valor × probabilidad / 100). `lead.custom_field_values` es un JSON indexado por `lead_custom_field.key` (sin tabla EAV); se valida contra los campos activos al escribir y un campo desactivado oculta su valor sin borrarlo. `lead_custom_field.key` es único para siempre (no se reutiliza la clave de un campo inactivo). `lead_tag_assignment` tiene `(id_lead, id_lead_tag)` único: quitar una etiqueta pone `active=false` y volver a ponerla reactiva la misma fila. `lead_tag.name` es único entre las activas sin distinguir mayúsculas (lo valida el servicio). `lead_saved_view` es personal (`id_user`), guarda filtros y orden de la tabla sin paginación; máximo 20 activas por usuario. `created_by` / `assigned_by` son ids de usuario sin FK (solo trazabilidad; la auditoría está en `AuditLog`).
