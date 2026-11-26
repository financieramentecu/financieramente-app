/**
 * Logical-deletion marker shared by FileImport.status, SettlementCommission.status
 * and Clawback.state. Rows carrying it are kept for traceability but must never
 * be listed, counted, deduplicated against or settled.
 */
export const FILE_IMPORT_STATUS_DELETED = 'DELETED'
