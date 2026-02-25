## ADDED Requirements

### Requirement: Centralized Business Retrieval
The system SHALL provide a centralized service for retrieving business details by ID, ensuring consistent query parameters and data mapping.

#### Scenario: Retrieval by ID
- **WHEN** a business ID is provided to the service
- **THEN** it returns the full business entity or throws a specialized not-found error
