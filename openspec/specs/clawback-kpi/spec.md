## ADDED Requirements

### Requirement: Visualización del KPI acumulado de Reserva de Clawback

El sistema debe mostrar en el Dashboard del Agente y en el Formulario de Registro de Negocio un indicador (KPI) con el acumulado de la reserva de Clawback del usuario.

#### Scenario: Coach visualiza el KPI de Clawback con reserva acumulada
- **WHEN** The coach has logged in AND has at least one settled business with Clawback applied.
- **THEN** The system shows a KPI card titled "Reserva de Clawback" with the total accumulated monetary value.

#### Scenario: Coach sin negocios con Clawback visualiza el KPI en cero
- **WHEN** The coach has logged in AND does NOT have any settled business with Clawback.
- **THEN** The system shows a KPI card titled "Reserva de Clawback" with the value "$0".

#### Scenario: El KPI se actualiza tras una nueva liquidación
- **WHEN** An operative management assistant approves a settlement that includes Clawback for the coach AND the coach accesses or reloads the dashboard.
- **THEN** The KPI card "Reserva de Clawback" reflects the updated accumulated value.
