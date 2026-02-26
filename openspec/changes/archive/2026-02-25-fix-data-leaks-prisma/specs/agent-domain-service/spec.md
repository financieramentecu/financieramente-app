## ADDED Requirements

### Requirement: Agent Metric Consolidation
The system SHALL provide a dedicated service to aggregate performance metrics and profile data for agent users.

#### Scenario: Aggregating agent data
- **WHEN** the agent dashboard requests overview data
- **THEN** the service performs the necessary joins and aggregations, returning a summary entity
