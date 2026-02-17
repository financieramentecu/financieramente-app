# API Contract: Pre-Liquidation Feature

## 1. Upload Commission File
**Endpoint**: `POST /api/carga-archivos/file-import`
**Description**: Handles the upload of Voluntarias or Polizas Excel files, detects type, parses headers, and stores raw data.

### Request
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: File (Excel .xlsx)

### Response (200 OK)
```json
{
  "data": {
    "fileId": "uuid-v4",
    "fileName": "Voluntarias_Feb2026.xlsx",
    "status": "PENDING",
    "totalRows": 150,
    "detectedType": "VOLUNTARIA" // or "POLIZA"
  }
}
```

### Response (400 Bad Request)
```json
{
  "data": null,
  "error": "Invalid file format. Expected .xlsx",
  "details": ["Missing required column: 'Com'"]
}
```

---

## 2. Trigger Pre-Liquidation Process
**Endpoint**: `POST /api/pre-liquidacion/procesar`
**Description**: Initiates the calculation engine for a specific file import. Runs asynchronously for large batches.

### Request
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "fileId": "uuid-v4"
}
```

### Response (202 Accepted)
```json
{
  "data": {
    "jobId": "job-uuid",
    "status": "PROCESSING",
    "message": "Calculation started."
  }
}
```

---

## 3. Get Processing Status & Summary
**Endpoint**: `GET /api/pre-liquidacion/resultados/[fileId]`
**Description**: Returns the real-time progress or final summary of the calculation.

### Response (200 OK - In Progress)
```json
{
  "data": {
    "fileId": "uuid-v4",
    "status": "PROCESSING",
    "progress": 45, // Percentage 0-100
    "summary": null
  }
}
```

### Response (200 OK - Completed)
```json
{
  "data": {
    "fileId": "uuid-v4",
    "status": "COMPLETED", // or "COMPLETED_WITH_ERRORS"
    "progress": 100,
    "summary": {
      "totalProcessed": 150,
      "successfulRows": 148,
      "failedRows": 2,
      "errors": [
        { "rowIndex": 12, "reason": "Missing mandatory field 'Base'" },
        { "rowIndex": 45, "reason": "Invalid user mapping" }
      ],
      "totalCommissionBruta": 15000000.000,
      "totalCommissionNeta": 13200000.000,
      "totalClawbackRetained": 500000.000 // Only relevant for Polizas
    }
  }
}
```

---

## 4. Export Results
**Endpoint**: `GET /api/pre-liquidacion/exportar/[fileId]`
**Description**: Downloads the final calculation report as Excel.

### Response (200 OK)
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Disposition**: `attachment; filename="Report_Voluntarias_Feb2026.xlsx"`
