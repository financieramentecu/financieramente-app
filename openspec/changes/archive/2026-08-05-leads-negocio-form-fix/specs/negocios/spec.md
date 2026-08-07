# Delta for Negocios

## ADDED Requirements

### Requirement: Contact fields unblocked for lead conversion

When the business-creation form is opened for a lead conversion (a `leadId` is present in context), the system MUST NOT apply the document-length gate (`identityNumber.length >= 5`) to the contact fields (`email`, `name`, `lastNames`, `phone`, `clientOrigin`) or to the `agent` selector. This exemption applies for every lead conversion, independent of which lead fields were prefilled. The gate MUST continue to apply unchanged when no `leadId` is present (manual creation flow). The blocking condition MUST be derived in exactly one place in the form's state (no duplicated derivation across sections).

#### Scenario: Lead without identityNumber leaves contact fields editable

- GIVEN the business-creation form is opened with a `leadId` for a lead that has no `identityNumber`
- WHEN the form renders
- THEN `email`, `name`, `lastNames`, `phone`, `clientOrigin`, and `agent` SHALL be editable
- AND the user SHALL be able to submit without first typing a document number

#### Scenario: Lead with identityNumber still leaves contact fields editable

- GIVEN the business-creation form is opened with a `leadId` for a lead that already has an `identityNumber`
- WHEN the form renders
- THEN the contact fields and `agent` selector SHALL NOT be blocked by the document-length rule

#### Scenario: Manual creation without leadId still gates on document length

- GIVEN the business-creation form is opened without a `leadId`
- WHEN `identityNumber` has fewer than 5 characters
- THEN the contact fields and `agent` selector SHALL remain blocked, unchanged from current behavior

### Requirement: Existing client resolved before creation on lead conversion

When a business is submitted from a lead conversion (`leadId` present), the system MUST attempt to resolve an existing `Client` before creating a new one, using EXACT matching only (never partial/fuzzy): first by the identity composite (`typeIdentity` + `identityNumber`), and if no match, by exact `email`. If a match is found, the system MUST reuse that `Client` instead of creating a new one, routed through the same selection path already used for manual existing-client selection, so existing update-on-change logic synchronizes any differing contact data. The reuse MUST be silent — no confirmation prompt or additional user-facing notice. If no match is found, the system MUST create a new `Client` exactly as it does today.

#### Scenario: Matching client found by identity is reused silently

- GIVEN a `Client` already exists whose identity composite matches the identity supplied on lead conversion
- WHEN the user submits the business-creation form for that lead
- THEN the existing `Client` SHALL be reused for the new `Business`
- AND no new `Client` record SHALL be created
- AND no confirmation dialog SHALL be shown to the user

#### Scenario: Matching client found by email when identity does not match

- GIVEN no `Client` matches the supplied identity composite, but a `Client` exists with the exact same `email`
- WHEN the user submits the business-creation form for that lead
- THEN the existing `Client` matched by `email` SHALL be reused
- AND no new `Client` record SHALL be created

#### Scenario: No matching client creates a new one as today

- GIVEN no `Client` matches by identity composite or by exact `email`
- WHEN the user submits the business-creation form for that lead
- THEN a new `Client` SHALL be created following the current creation path unchanged

#### Scenario: Reused client with differing contact data is synced

- GIVEN a resolved existing `Client` whose stored name, email, or phone differs from the data on the lead
- WHEN the reused `Client` is routed through the existing selection path
- THEN the existing change-detection and update logic SHALL persist the differing fields on that `Client`

### Requirement: Money Strategist locked to the lead's owner on conversion

When the business-creation form is opened from a lead conversion (`leadId` present) and the resolved lead has an assigned owner, the system MUST prefill the `agent` (Money Strategist) field with that owner and MUST lock the field so it cannot be changed, overriding any auto-assignment that would otherwise apply (e.g. the logged-in user being an AGENTE who normally self-assigns). This lock MUST apply only in creation mode from a lead conversion; it MUST NOT apply to manual creation (no `leadId`) or to edit mode, which use their own existing agent-assignment rules unchanged.

#### Scenario: Lead owner locks the agent field, overriding self-assignment

- GIVEN the business-creation form is opened with a `leadId` whose lead has an assigned owner
- AND the logged-in user is an AGENTE who would normally auto-assign themselves as the agent
- WHEN the form renders
- THEN the `agent` field SHALL be prefilled with the lead's owner
- AND the `agent` field SHALL be disabled/non-editable
- AND an explanatory caption SHALL be shown indicating the Money Strategist is responsible for the lead and cannot be modified

#### Scenario: Manual creation is unaffected by the lock

- GIVEN the business-creation form is opened without a `leadId`
- WHEN the form renders
- THEN the `agent` field SHALL follow existing auto-assignment/search rules, unlocked
