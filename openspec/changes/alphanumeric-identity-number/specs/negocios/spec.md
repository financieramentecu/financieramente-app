# Delta for Negocios — Client Identity Number Validation

## MODIFIED Requirements

### Requirement: Identity Number Validation Rule

The system MUST validate `identityNumber` using the regex `/^[A-Za-z0-9.\-]+$/` — accepting letters (upper and lower), digits, dots, and hyphens. The minimum length MUST be 5 characters and the maximum MUST be 20 characters.

The system MUST normalize the accepted value to uppercase server-side before storage.

The validation rule MUST be defined in exactly one location (`identity-number.schema.ts`). Both the client-creation action and the business form schema MUST import from that single source. No inline regex definition of this rule MAY exist elsewhere.

(Previously: `identityNumber` validated against `/^[0-9.]+$/`, accepting only digits and dots. No normalization was applied.)

#### Scenario: Digits-only identity number accepted (backward compat)

- GIVEN `identityNumber = '12345678'`
- WHEN the schema validates the input
- THEN validation SHALL succeed
- AND the stored value SHALL be `'12345678'`

#### Scenario: Digit-dot identity number accepted (backward compat)

- GIVEN `identityNumber = '12.345.678'`
- WHEN the schema validates the input
- THEN validation SHALL succeed
- AND the stored value SHALL be `'12.345.678'`

#### Scenario: Alphanumeric-hyphen identity number accepted (new)

- GIVEN `identityNumber = 'A-12345678'`
- WHEN the schema validates the input
- THEN validation SHALL succeed
- AND the stored value SHALL be `'A-12345678'`

#### Scenario: Passport-style identity number accepted (new)

- GIVEN `identityNumber = 'PE-123456'`
- WHEN the schema validates the input
- THEN validation SHALL succeed
- AND the stored value SHALL be `'PE-123456'`

#### Scenario: CE without separator accepted (new)

- GIVEN `identityNumber = 'CE987654'`
- WHEN the schema validates the input
- THEN validation SHALL succeed
- AND the stored value SHALL be `'CE987654'`

#### Scenario: Uppercase normalization applied

- GIVEN `identityNumber = 'ce-123456'` (lowercase input)
- WHEN the schema validates and transforms the input
- THEN validation SHALL succeed
- AND the stored value SHALL be `'CE-123456'`

#### Scenario: Mixed-case normalized to uppercase

- GIVEN `identityNumber = 'ab1234'`
- WHEN the schema validates and transforms the input
- THEN the stored value SHALL be `'AB1234'`

#### Scenario: Empty string rejected

- GIVEN `identityNumber = ''`
- WHEN the schema validates the input
- THEN validation MUST fail with a length or required error

#### Scenario: Space in identity number rejected

- GIVEN `identityNumber = '12 345'`
- WHEN the schema validates the input
- THEN validation MUST fail

#### Scenario: At-sign rejected

- GIVEN `identityNumber = 'abc@123'`
- WHEN the schema validates the input
- THEN validation MUST fail

#### Scenario: Underscore rejected

- GIVEN `identityNumber = 'A_1234'`
- WHEN the schema validates the input
- THEN validation MUST fail

#### Scenario: Too-short identity number rejected

- GIVEN `identityNumber = 'AB1'` (fewer than 5 characters)
- WHEN the schema validates the input
- THEN validation MUST fail with a minimum-length error

#### Scenario: Too-long identity number rejected

- GIVEN `identityNumber` with 21 characters
- WHEN the schema validates the input
- THEN validation MUST fail with a maximum-length error

## ADDED Requirements

### Requirement: Single-source identity number schema module

The system MUST provide `src/features/negocios/lib/identity-number.schema.ts` exporting `identityNumberSchema` as the canonical Zod schema for client identity numbers. This module MUST be the only location where the validation regex, min/max bounds, and uppercase transform are defined.

#### Scenario: Schema module is importable

- GIVEN `identity-number.schema.ts` exists
- WHEN any feature module imports `identityNumberSchema`
- THEN the import SHALL resolve without error and expose a Zod schema with parse and safeParse methods

#### Scenario: No duplicate regex definitions remain

- GIVEN the codebase after implementation
- WHEN checked for inline identity-number regex definitions
- THEN no inline `/^[0-9.]+$/` or equivalent identity-number regex MUST exist outside `identity-number.schema.ts`
