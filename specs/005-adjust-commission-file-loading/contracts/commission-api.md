# API Contract: Pre-Liquidation Processing

## Endpoints

### POST /api/pre-liquidacion/procesar
Triggers the commission calculation for a specific imported file.

**Request Body**
```json
{
  "idFileImport": 123
}
```

**Response (Success 200)**
```json
{
  "data": {
    "totalProcessed": 50,
    "totalClawbacksRetained": 1500.00,
    "totalVoluntarias": 30,
    "totalPolizas": 20
  }
}
```

### GET /api/pre-liquidacion/detalles?idFileImport=123
Retrieves the calculated distributions for preview before final settlement.

**Response (Success 200)**
```json
{
  "data": [
    {
      "idSettlementCommission": 456,
      "contrato": "123456",
      "origin": "Propio",
      "distribuciones": [
        {
          "role": "COACH",
          "agente": "Juan Perez",
          "bruta": 1000.00,
          "neta": 880.00,
          "clawback": 88.00
        },
        {
          "role": "LEADER",
          "agente": "Maria Lopez",
          "bruta": 55.02,
          "neta": 48.42,
          "clawback": 4.84
        }
      ]
    }
  ]
}
```
