# Delta for Negocios

## MODIFIED Requirements

### Requirement: Edit client origin from Ver Negocio modal when EMITIDO

The system SHALL display a confirmation alert before persisting the new client origin if the business is in `EMITIDO` state. The alert MUST warn the user that commissions will be recalculated. If accepted, the system SHALL call the update API.
(Previously: The system saved the origin immediately without alerting about recalculation.)

#### Scenario: User saves new origin and accepts recalculation warning

- GIVEN the user is in edit mode (Select visible) and has selected a different client origin for a business in EMITIDO state
- WHEN the user clicks "Guardar"
- THEN the system SHALL display an alert warning that commissions will be recalculated
- WHEN the user confirms the alert
- THEN the system SHALL send the update request to change `idClientOrigin`
- AND the modal SHALL return to the label view showing the new origin

#### Scenario: User cancels origin change at the warning

- GIVEN the user is in edit mode and has selected a different client origin
- WHEN the user clicks "Guardar"
- THEN the system SHALL display an alert warning that commissions will be recalculated
- WHEN the user cancels or dismisses the alert
- THEN the system SHALL NOT send the update request
- AND the modal SHALL remain in edit mode or revert the selection without saving
