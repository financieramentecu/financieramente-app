# Role
You are an expert software engineer with experience in modeling architectures and databases.
Eres un experto en desarrollo de software, next.js, prisma y eract

# Objective
Quiero actualizar el flujo de sincronización porque ahora van a existir dos tipos de excel a sincronizar y cambia la estrucutra a leer y la forma como se guardan los datos en settlement_commission, ademas de actualizar el flujo de carga de commissionDistriburtion para el proceso de liquidación

#RULES
- En la interfaz el usuario va poder seleccionar que tipo de archivo quiere cargar. 'POLIZA' o 'VOLUNTARIAS'.
- Cuando el usuario realice la carga se debe validar los header del excel para determinar que el correcto para el tipo que selecciono, debe seleccionar que tipo de archivo va cargar para activar la carga.
- En la api de carga se mantiene las mismas reglas de validaciones para guardar en la tabla de file_import y darle feedback a el usuario el estado de la sincronización
- Si el excel es POLIZA y en la columna "Plan de componesación" es igual a "FRONT19_OMPEV" se debe guardar en la base de datos tabla de settlement_commission columna origin_commission el "CARTERA"

# Clarifications about the model:
- El usuario va cargar dos tipo de excel BASE DE VOLUNTARIAS SKANDIA.xlsx para las comisionde s voluntarias.
- El usuario va cargar Polizas.xlsx para las comisiones de Poliza.
- se debe agregar en la tabla se settlement_commision un nuevo compo que se llame type_commission con dos valores 'POLIZA' y VOLUNTARIA.
- En la tabla de settlement_commision se debe eliminar las columnas de poliza, ramo, producto, recibo, fecha_pago.
- se va agregar tres columnas as nuevas , descripcion, clawback_percentage y discount_percentage
- se debe normalizar los nombres, variables de la aplicación y de la base de datos con commission porque esta mal escrito en columnas de la base de datos y dentro de la aplicación
- renombrar la tabla de Discount y llamarla commissionConfiguration, donde solo va tener clawback_percentage: numero, discount_percentaje_numero y no va estar relacionada con ninguna tabla porque va ser una tabla de configuración.
- Actualizar las tablas acorde a el siguiente diagrama
erDiagram
    User ||--o| ClawbackBalance : "saldo actual"
    User ||--o{ Clawback : "historial movimientos"
    FileImport ||--o{ SettlementCommission : "contiene registros"
    SettlementCommission ||--o{ CommissionDistribution : "se distribuye en roles"
    CommissionDistribution ||--o| Clawback : "genera movimiento (opcional)"

    CommissionConfiguration {
        int id_config_commission PK
        float discount_percentage "Config: 12% oficina"
        float clawback_percentage "Config: 10% retención"
        string name "Identificador único"
        string description "Detalles config"
        string status "ACTIVE / INACTIVE"
        datetime created_at
        datetime updated_at
    }

    SettlementCommission {
        int id_settlement_commission PK
        int id_file_import FK
        int id_business FK "Relación con negocio"
        string descripcion "Descripción excel"
        decimal commission_value "Monto base"
        decimal commission_percentage "Porcentaje (si aplica)"
        decimal base_commission "Base para cálculo"
        decimal applied_discount_percentage "SNAPSHOT: % oficina usado"
        decimal applied_clawback_percentage "SNAPSHOT: % retención usado"
        string origin_commission "CARTERA / NULL"
        string commission_type "POLIZA / VOLUNTARIA"
        string status "PENDIENTE, PRELIQUIDADO, LIQUIDADO"
        boolean is_lag "Si es registro rezagado"
        datetime created_at
        datetime updated_at
    }

    CommissionDistribution {
        int id_commission_distribution PK
        int id_settlement_commission FK
        int id_percentage_commission_category FK
        decimal commission_value "Bruta por rol"
        decimal commission_value_final "Neta final"
        decimal total_discount "Monto descontado (12%)"
        decimal applied_discount_percentage "SNAPSHOT: % oficina usado"
        int id_config_commission "Ref. config (opcional)"
        string observation "Notas adicionales"
        string status "LIQUIDADO, etc."
        datetime created_at
        datetime updated_at
    }

    Clawback {
        int id_clawback PK
        int id_user FK "Dueño de la reserva"
        int id_commission_distribution FK "Vínculo a liquidación"
        decimal value_clawback "Monto (+/-)"
        decimal porcentaje_applied "SNAPSHOT: % aplicado"
        string state "ACUMULADO / DESCONTADO"
        date applied_date "Fecha aplicación"
        date release_date "Fecha liberación"
        string reason "Motivo (ej. Poliza, Claw)"
        datetime created_at
        datetime updated_at
    }

    ClawbackBalance {
        int id_user PK, FK "Relación 1:1"
        decimal total_amount "SALDO ACTUAL NETO"
        datetime updated_at
    }

    User {
        int id_user PK
        string name
        int id_user_leader FK "Mapeo jerarquía"
    }
- Solo en POLIZAS revisamos el clowback, en la columna del excel "Plan de compoensación" viene la palabra CLAW. se debe obtener de la tabla CommissionConfiguration el valor del clawback y se agurega en la tabla settlement_commission columna clawback_percentage, sino cumple con esa regla siempre sera vacio.
- cuando se va registrar la settlement_commission se debe leer de CommissionConfiguration el discount_percentaje para ser guardado en la settlement_commission 
- crear una columna de la tabla de ProductPercentageCommissionCategory con el nombre porcentaje_portfolio decimal


Estas son las variables que deben ser configurables en el sistema, ya que representan los porcentajes extraídos de la hoja de cálculo.

DESCOUNT_PERCENTAGE = valor obtenido de la tabla settlement_commission
VALOR_COMISION_BASE= valor obtenido de la tabla settlement_commission
PRODUCT_PERCENTAGE_COMMISSION_CATEGORY = valor obtenido de la tabla product_percentage_commission_category por el id_category
CLAWBACK_PERCENTAGE = valor obtenido de la tabla settlement_commission
TOTAL_COMISION = valor para almacenar en la tabla comission_distribution value_comission_final

CASO 1
---
Calculos si la SETTLEMENT_COMMISSION.type_commission = 'CARTERA'.

PRODUCT_PERCENTAGE_COMMISSION_CATEGORY.porcentaje_portfolio = 66%

CALULOS / SE REALIZA POR CADA PRODUCT_PERCENTAGE_COMMISSION_CATEGORY.porcentaje_portfolio valor asignado a el negocio en el campo id_product_percentage_commission
:
COMISION_GENERAL = VALOR_COMISION_BASE * PRODUCT_PERCENTAGE_COMMISSION_CATEGORY.porcentaje_portfolio			
COMISION_GENERAL_DESPUES_DE_DESCUENTO = COMISION_GENERAL * DESCOUNT_PERCENTAGE			
CLAWBACK= COMISION_GENERAL_DESPUES_DE_DESCUENTO * CLAWBACK_PERCENTAGE			
TOTAL_COMISION = COMISION_GENERAL_DESPUES_DE_DESCUENTO - CLAWBACK

---------------------------------
CASO 2.

CALCULOS SEGUN EL ORIGEN:
Los calculos varian depende del ORIGEN = valor Business.id_client_origin
ORIGEN = Vortex, Propio, Asesoría Gratuita

CALULOS / SE REALIZA POR CADA PRODUCT_PERCENTAGE_COMMISSION_CATEGORY.porcentaje_distribucion valor asignado a el negocio en el campo id_product_percentage_commission
:
COMISION_GENERAL = VALOR_COMISION_BASE * PRODUCT_PERCENTAGE_COMMISSION_CATEGORY.porcentaje_distribucion			
COMISION_GENERAL_DESPUES_DE_DESCUENTO = COMISION_GENERAL * DESCOUNT_PERCENTAGE			
CLAWBACK= COMISION_GENERAL_DESPUES_DE_DESCUENTO * CLAWBACK_PERCENTAGE			
TOTAL_COMISION = COMISION_GENERAL_DESPUES_DE_DESCUENTO - CLAWBACK

EJEMPLOS

PORCENTAJE_JUNIOR = 64,19%	-> valor obtenido de la tabla product_percentage_commission_category por el id_category -> porcentaje_distribucion
PORCENTAJE_SENIOR = 5,502%	-> valor obtenido de la tabla product_percentage_commission_category por el id_category -> porcentaje_distribucion
PORCENTAJE_AGENCIA = 4,5%	-> valor obtenido de la tabla product_percentage_commission_category por el id_category -> porcentaje_distribucion
PORCENTAJE_DESCUENTO = 12%	-> valor obtenido de la tabla settlement_commission
PORCENTAJE_CLAWBACK = 10%   -> valor obtenido de la tabla settlement_commission

COMISION_GENERAL= Valor Comisión * PORCENTAJE_JUNIOR				
COMISION_GENERAL_DESPUES_DE_DESCUENTO = COMISION_GENERAL * PORCENTAJE_DESCUENTO				
CLAWBACK = COMISION_GENERAL_DESPUES_DE_DESCUENTO * PORCENTAJE_CLAWBACK				
TOTAL_COMISION = COMISION_GENERAL_DESPUES_DE_DESCUENTO - CLAWBACK				
				
COMISION_LIDER = VALOR_COMISION_BASE * PORCENTAJE_SENIOR				
COMISION_LIDER_DESPUES_DE_DESCUENTO = COMISION_LIDER * PORCENTAJE_DESCUENTO				
CLAWBACK = COMISION_LIDER_DESPUES_DE_DESCUENTO * PORCENTAJE_CLAWBACK				
TOTAL_COMISION = COMISION_LIDER_DESPUES_DE_DESCUENTO - CLAWBACK				
    
COMISION_AGENCIA = VALOR_COMISION_BASE * PORCENTAJE_AGENCIA				
COMISION_AGENCIA_DESPUES_DE_DESCUENTO = COMISION_AGENCIA * PORCENTAJE_DESCUENTO				
CLAWBACK= COMISION_AGENCIA_DESPUES_DE_DESCUENTO * PORCENTAJE_CLAWBACK				
TOTAL_COMISION = COMISION_AGENCIA_DESPUES_DE_DESCUENTO - CLAWBACK		

---------------------------------

Crear un documento usando el skill de documentacion con el analisis, agragar diagramas de flujo con mermaid para tener claro el analisis.