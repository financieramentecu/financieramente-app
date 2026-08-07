# Delta for Leads

## ADDED Requirements

### Requirement: idBusiness exposed on Kanban lead card projection

The Kanban board projection (`LeadCard`) MUST include `idBusiness: number | null`. The board-building query MUST select `idBusiness` for every lead returned, so the board can indicate conversion state without an additional query per card.

#### Scenario: Board query includes idBusiness

- GIVEN the Kanban board is requested
- WHEN the board service builds the response
- THEN each returned lead card SHALL include its `idBusiness` value (a number or `null`)

#### Scenario: Non-converted lead has null idBusiness

- GIVEN a lead that has never been converted to a `Business`
- WHEN it is included in the Kanban board response
- THEN its `idBusiness` SHALL be `null`

### Requirement: Conversion blocked for leads without an owner

The system MUST prevent converting a lead to a business when the lead has no assigned owner (`idUser == null`), enforced in depth at three layers: (1) the UI disables the "Convertir a negocio" action with an explanatory caption when `lead.idUser == null`; (2) `getLeadForConversion` MUST exclude ownerless leads from its query, reusing the existing "not found → redirect to a blank creation form" behavior for that case; (3) `linkLeadToBusinessTx` MUST throw (rolling back the enclosing transaction) if the lead it is linking has no owner, as a backstop against a direct API/service call that bypasses the page-level gate.

#### Scenario: UI disables conversion for an ownerless lead

- GIVEN a lead with `idUser == null`
- WHEN its detail sheet is rendered
- THEN the "Convertir a negocio" button SHALL be disabled
- AND an explanatory caption SHALL indicate an owner must be assigned before conversion

#### Scenario: Conversion query excludes ownerless leads

- GIVEN a lead with `idUser == null` and no linked `Business`
- WHEN `getLeadForConversion` is called with that lead's id
- THEN it SHALL return `null`
- AND the caller SHALL fall back to a blank creation form, the same as for a not-found lead

#### Scenario: Transaction-level backstop rejects linking an ownerless lead

- GIVEN a direct call to `linkLeadToBusinessTx` for a lead with `idUser == null`
- WHEN the call executes inside the enclosing transaction
- THEN it SHALL throw
- AND the enclosing transaction SHALL roll back, creating no `Business`/link side effects

## MODIFIED Requirements

### Requirement: Converted-lead visual indicator on Kanban card

When a Kanban lead card's `idBusiness` is not `null`, the card MUST display both a converted-state icon indicator with an accessible label/tooltip ("Negocio creado") AND a visually distinct border/background compared to non-converted cards. This indicator MUST apply for any non-null `idBusiness`, regardless of the current status of the linked `Business` (including a cancelled business).
(Previously: the converted state was indicated with a text badge reading "Negocio creado" placed alongside the outcome-status badge; it is now an emerald star icon with a tooltip, shown inline next to the lead's name, with the outcome-status badge moved to its own row. The activation criterion — `idBusiness` non-null — is unchanged.)

#### Scenario: Converted lead shows icon indicator and distinct styling

- GIVEN a lead card with a non-null `idBusiness`
- WHEN the Kanban board renders that card
- THEN the card SHALL display an emerald star icon inline next to the lead's name
- AND the icon SHALL expose an accessible label and a tooltip reading "Negocio creado" on hover/focus
- AND the card SHALL render with a distinct border/background compared to non-converted cards

#### Scenario: Non-converted lead shows neither indicator

- GIVEN a lead card with `idBusiness = null`
- WHEN the Kanban board renders that card
- THEN neither the icon indicator nor the distinct border/background SHALL appear

#### Scenario: Indicator persists regardless of linked business status

- GIVEN a lead card whose linked `Business` has since been cancelled
- WHEN the Kanban board renders that card
- THEN the icon indicator and distinct styling SHALL still appear, because `idBusiness` remains non-null
