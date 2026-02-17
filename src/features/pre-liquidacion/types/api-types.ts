export interface PreLiquidationResultResponse {
    fileId: string
    status: string
    progress: number
    summary: {
        totalProcessed: number
        successfulRows: number
        failedRows: number
        // Use specific type or simplified object
        errors: Array<{ rowIndex: number, reason: string }>
        totalCommissionBruta: number
        totalCommissionNeta: number
        totalClawbackRetained: number
    } | null
}
