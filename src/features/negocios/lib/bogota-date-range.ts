/**
 * Re-export shim. `parseBogotaInclusiveUtcRange` and `BOGOTA_TZ` were
 * promoted to `src/features/shared/lib/bogota-date-range.ts` since they are
 * now used by both `negocios` and `leads`. Kept here so every existing
 * `negocios` importer resolves with no import-path changes.
 */
export {
	parseBogotaInclusiveUtcRange,
	BOGOTA_TZ,
} from '@/features/shared/lib/bogota-date-range'
