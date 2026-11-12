# Spec: CRM pipeline reports

## Requirement: Access
The report SHALL require a session (401), the `crm_reports` flag (404), CRM access (403) and permission for report `CRM_PIPELINE` (403).

#### Scenario: Category without the report
- GIVEN an ASESOR whose category has no `CRM_PIPELINE` permission
- WHEN they request the report
- THEN the response is 403

## Requirement: Scope
The report SHALL only include leads visible to the viewer; the owner filter SHALL only narrow that set.

#### Scenario: Owner outside the hierarchy
- GIVEN a leader whose hierarchy does not include user 99
- WHEN they request `owner=99`
- THEN no lead of user 99 is counted

## Requirement: Range
`from`/`to` SHALL default to the last 90 Bogotá days; `from > to`, a span over 366 days, a single bound or a malformed date SHALL answer 400.

## Requirement: Size limit
More than 20,000 leads in range SHALL answer 413 with a message asking to narrow the range.

## Requirement: Outcomes and rates
Win rate SHALL be won / (won + lost + abandoned); conversion rate SHALL be won / total; both null when the denominator is 0.

## Requirement: Funnel
A lead SHALL count as having reached every active, non-fallback stage up to the furthest one in its current stage or history.

#### Scenario: Skipped stage
- GIVEN stages A, B, C and a lead that moved A → C
- THEN it counts as reached for A, B and C

## Requirement: Time per stage
Only completed stays SHALL be measured; the current stay SHALL be excluded.

## Requirement: Breakdowns
The report SHALL group by origin, advisor and team (owner's leader), with "Sin origen", "Sin asignar" and "Sin líder" buckets.

## Requirement: Forecast
The forecast SHALL include open leads only; weighted value SHALL be value × probability / 100 with a missing probability counted as 0.

## Requirement: No contact data
The response SHALL NOT contain lead names, emails, phones or identity numbers.
