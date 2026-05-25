# Design: Alphanumeric Identity Number

## Technical Approach

Extract a shared Zod fragment (`identityNumberSchema`) in `src/features/negocios/lib/identity-number.schema.ts`. The fragment validates length (5–20) and the new regex `/^[A-Za-z0-9.\-]+$/`. The shared fragment does NOT include `.transform()` — normalization is composed only inside the server action via `identityNumberSchema.transform(v => v.toUpperCase())`. This keeps the React Hook Form input/output type as a plain `string` (no surprise type drift in `BusinessFormData`) while guaranteeing the server-side query and persisted value are uppercase. Tests in `__tests__/identity-number.schema.test.ts` follow the colocated TDD pattern already used by the feature.

## Architecture Decisions

### Decision: Transform only on the server, not on the shared fragment

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Apply `.transform(toUpperCase)` on the shared fragment | DRY; but `z.infer<typeof businessFormSchema>` still resolves to `string`, while form callers pass the raw input — masks intent and risks accidental client normalization that diverges from the visible input field | Rejected |
| Apply `.transform(toUpperCase)` only inside `createClientSchema` (server action) by composing `identityNumberSchema.transform(...)` | Server is the single normalization boundary; form stays user-faithful; DB uniqueness is preserved because Prisma query receives `validatedData.identityNumber` already uppercased | **Chosen** |
| Add a `preprocess(toUpperCase)` then regex | `preprocess` mutates before validation, so invalid lowercase becomes valid by coincidence; behavior is harder to reason about | Rejected |

**Rationale**: The proposal's risk #2 calls out form/server type mismatch. Composing transform only on the server boundary contains normalization where it matters (uniqueness lookup + persistence) and leaves form types untouched.

### Decision: Single shared fragment, composed by both callers

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Duplicate the regex inline in both files (status quo) | Cheap now; drifts later — exactly the bug we're fixing | Rejected |
| Shared fragment in `lib/identity-number.schema.ts` | Matches `fondear-anualidades.schema.ts` precedent; one source of truth for regex/length/messages | **Chosen** |
| Schema in `shared/` | Wrong layer — this is a negocios-domain rule, not cross-feature | Rejected |

### Decision: Regex `/^[A-Za-z0-9.\-]+$/` (no whitespace, no other punctuation)

**Rationale**: Colombian alternative IDs (CE, passports, NIT with check digit) use letters, digits, dots, and hyphens. Whitespace and `/`, `_` are not standard and would widen the surface unnecessarily. Hyphen is escaped inside the class for safety.

## Data Flow

```
Form input (raw string)
   │
   ▼
businessFormSchema (client)            ── validates regex + length, returns raw string
   │
   ▼
Server Action: createClient(data)
   │
   ▼
createClientSchema.parse(data)         ── identityNumberSchema.transform(toUpperCase)
   │                                       validatedData.identityNumber is UPPERCASE
   ▼
prisma.client.findUnique({ typeIdentity_identityNumber })  ── uppercase lookup
   │
   ▼
prisma.client.create({ identityNumber }) ── persists uppercase
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/negocios/lib/identity-number.schema.ts` | Create | Exports `identityNumberSchema` (string, min 5, max 20, regex `/^[A-Za-z0-9.\-]+$/`) and `IDENTITY_NUMBER_REGEX`, `IDENTITY_NUMBER_MAX` for reuse. No transform. |
| `src/features/negocios/lib/business-form-schemas.ts` | Modify | Replace inline `identityNumber` field (lines 19–26) with `identityNumber: identityNumberSchema`. |
| `src/features/negocios/actions/create-client.ts` | Modify | Replace inline `identityNumber` field with `identityNumber: identityNumberSchema.transform(v => v.toUpperCase())`. |
| `src/features/negocios/__tests__/identity-number.schema.test.ts` | Create | TDD: valid alphanumeric IDs, valid with hyphen/dot, rejects whitespace, rejects symbols, length bounds, uppercase normalization (only when composed with transform). |

## Interfaces / Contracts

```ts
// src/features/negocios/lib/identity-number.schema.ts
import { z } from 'zod'

export const IDENTITY_NUMBER_REGEX = /^[A-Za-z0-9.\-]+$/
export const IDENTITY_NUMBER_MIN = 5
export const IDENTITY_NUMBER_MAX = 20

export const identityNumberSchema = z
  .string()
  .min(1, 'El número de identificación es obligatorio')
  .min(IDENTITY_NUMBER_MIN, `El número de identificación debe tener al menos ${IDENTITY_NUMBER_MIN} caracteres`)
  .max(IDENTITY_NUMBER_MAX, `El número de identificación no puede exceder ${IDENTITY_NUMBER_MAX} caracteres`)
  .regex(IDENTITY_NUMBER_REGEX, 'El número de identificación solo puede contener letras, números, puntos y guiones')
```

Server-side composition:
```ts
// inside createClientSchema
identityNumber: identityNumberSchema.transform(v => v.toUpperCase())
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit (schema) | Accepts `12345`, `ABC-123`, `1.234.567.890`, `ce123` | Vitest + `identityNumberSchema.safeParse` |
| Unit (schema) | Rejects empty, `< 5` chars, `> 20` chars, whitespace, `/`, `_`, emoji | `safeParse` returns `success: false` with expected message |
| Unit (server transform) | `'ce-123'` → `'CE-123'` after parse | Compose `identityNumberSchema.transform(v => v.toUpperCase()).parse('ce-123')` returns `'CE-123'` |
| Integration | `createClient` rejects duplicate after normalization (`ce-123` vs `CE-123`) | Existing pattern in actions tests (if present) or covered by manual verification — out of scope for new tests |

## Migration / Rollout

No migration required. Existing rows are already digit-only, which the new regex still accepts. New rows go in uppercase. The proposal explicitly excludes backfilling.

## Open Questions

- [ ] None blocking. Note for tasks: confirm there are no other call sites validating `identityNumber` (a grep over `identityNumber` + `regex` should return only the two files in scope).
