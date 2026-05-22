# Exploration: alphanumeric-identity-number

## Goal
Allow alphanumeric characters in the `identityNumber` (cédula) field when creating a client. Currently blocked by `/^[0-9.]+$/` in two Zod schemas.

## Findings

### Affected files (code changes required)
| File | Line | Issue |
|------|------|-------|
| `src/features/negocios/lib/business-form-schemas.ts` | 22–26 | `businessFormSchema.identityNumber` regex `/^[0-9.]+$/` |
| `src/features/negocios/actions/create-client.ts` | 22–26 | duplicate embedded `createClientSchema.identityNumber` regex `/^[0-9.]+$/` |

### Not affected
- No API routes validate `identityNumber` directly
- `update-client.ts` does not update `identityNumber`
- `pre-liquidacion` only reads the field (no validation)
- `ClientAutocomplete` UI component uses a plain `CommandInput` — no `type="number"`, `pattern`, or `onKeyDown` filter
- Database: `Client.identityNumber` is `String @db.VarChar(20)` — already supports letters, no migration needed

### Tests — zero breakage risk
- No test asserts the "solo puede contener números y puntos" error message string
- All existing fixtures (`'12345678'`, `'1053.123.456'`) remain valid under the new regex
- New tests needed: assert `'A-12345678'` and `'PE-123456'` pass; `'abc @123'` fails

### VarChar(20) sufficiency
All known Colombian/regional formats fit within 20 chars: CC (10 digits), NIT (12 chars max), CE (`PE-123456` = 8 chars), passports (up to 12 chars).

## Recommended approach

**Extract a shared `identityNumberSchema`** (Approach 2 of 3):

Create `src/features/negocios/lib/identity-number.schema.ts` exporting a reusable Zod chain:
```ts
export const identityNumberSchema = z
  .string()
  .min(1, 'El número de identificación es obligatorio')
  .min(5, 'El número de identificación debe tener al menos 5 caracteres')
  .regex(
    /^[A-Za-z0-9.\-]+$/,
    'El número de identificación solo puede contener letras, números, puntos y guiones'
  )
```

Import it in both `business-form-schemas.ts` and `create-client.ts`, eliminating the SOLID-O duplication.

### Alternatives considered
| Approach | Verdict |
|----------|---------|
| Minimal regex update only (2 lines × 2 files) | Valid but leaves duplication unfixed |
| Extract shared schema (recommended) | Best balance — DRY, SOLID-O, low effort |
| Per-typeIdentity format validation | Correct but complex — `businessFormSchema` lacks `typeIdentity` in scope; defer to future |

## Risks
- No breaking risks. Zero DB migration. Zero test breakage.
- Hyphens (`-`) will be accepted in numeric-only CC fields — acceptable trade-off per business requirement.
