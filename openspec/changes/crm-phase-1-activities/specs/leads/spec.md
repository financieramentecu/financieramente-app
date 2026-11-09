# Leads Specification (delta)

## MODIFIED Requirements

### Requirement: CRM Page Tabs

The **Actividades** tab MUST be enabled when `crm_tasks` is on and show the agenda in four groups (Vencidas, Hoy, Próximas, Completadas). `?tab=actividades` MUST select it and `?lead={id}` MUST open that lead's detail sheet.

#### Scenario: Open lead from notification
- GIVEN a notification with callback `/dashboard/negocios/crm?tab=actividades&lead=42`
- WHEN the user follows it
- THEN the Actividades tab SHALL be selected and the sheet of lead 42 SHALL be open

## ADDED Requirements

### Requirement: Inactivity Indicator

An OPEN lead whose `lastActivityAt ?? createdAt` is older than `CRM_INACTIVITY_DAYS` (default 7) MUST show "Sin actividad · N días" on its card and in the sheet. Closed leads SHALL NOT.

#### Scenario: Stale open lead
- GIVEN an open lead with last activity 10 days ago
- WHEN the board renders
- THEN its card SHALL show "Sin actividad · 10 días"
