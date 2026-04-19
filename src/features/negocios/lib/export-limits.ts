/**
 * Límite de filas por solicitud de export (H5). Superar → HTTP 413.
 * Alineado con KPI K4 del PRD (~5 000 filas referencia).
 */
export const EXPORT_MAX_ROWS = 5000
