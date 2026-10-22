# Delta for Production Dashboard

## ADDED Requirements

### Requirement: PD-01 Partner empty-tree path

For a PARTNER the hierarchy tree MUST NOT be requested or rendered; the dashboard scope MUST be the partner's own businesses.

#### Scenario: Partner dashboard

- GIVEN a partner opens the dashboard
- WHEN it loads
- THEN no hierarchy tree call is made, no sidebar renders, and metrics cover own businesses

### Requirement: PD-02 Partner in the leader's tree

A partner MUST hang under their leader in the hierarchy tree and the agent filter, and their businesses MUST be included in the totals visible to the leader and all superiors.

#### Scenario: Leader sees partner

- GIVEN partner P under leader L
- WHEN L (or a superior) opens the dashboard
- THEN P appears in the tree and P's businesses count in L's scope

### Requirement: PD-03 Separate "Partners" heatmap block

The leader's heatmap MUST render partners in a separate "Partners" block at the end, below all agent rows, with one row per partner in the leader's subtree. Partners MUST NOT be mixed into agent rows. If there are no partners the block MUST be omitted.

#### Scenario: Block placement

- GIVEN a leader with agents and two partners
- WHEN the heatmap renders
- THEN agent rows come first, followed by a "Partners" block with two rows

#### Scenario: No partners

- GIVEN a leader without partners
- WHEN the heatmap renders
- THEN no "Partners" block is shown

#### Scenario: Superior view

- GIVEN a superior of the leader
- WHEN the heatmap renders
- THEN partners in the subtree appear in the Partners block, not among agents
