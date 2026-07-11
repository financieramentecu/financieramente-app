# Delta for Notificaciones de Soporte

## ADDED Requirements

### Requirement: Comment-created notification routing by author role

When a comment is created on a contract, the system MUST generate a notification routed by the author's role: if the author is `ANALISTA_SOPORTE`, the system MUST notify the Money Strategist assigned to the contract (`Business.idUser`); if the author is `AGENTE`, the system MUST notify all active `ANALISTA_SOPORTE` users.

#### Scenario: Analyst comment notifies the assigned Money Strategist

- GIVEN an Analyst creates a comment on a contract
- WHEN the comment is saved successfully
- THEN the system creates a notification for the contract's assigned Money Strategist (`Business.idUser`)
- AND the Money Strategist's unread notification counter increments by one

#### Scenario: Money Strategist comment broadcasts to all Analysts

- GIVEN a Money Strategist creates a comment on a contract
- WHEN the comment is saved successfully
- THEN the system creates a notification for every active `ANALISTA_SOPORTE` user
- AND each notified Analyst's unread notification counter increments by one

### Requirement: Comment notification panel entry format

The system MUST display comment-created notifications in the notification panel with the creator's full name, a relative timestamp, and a deep link containing the contract number and comment name; unread entries MUST show a blue indicator dot and read entries MUST NOT.

#### Scenario: Unread comment notification shows indicator

- GIVEN a comment-created notification exists and has not been opened
- WHEN the recipient views the notification panel
- THEN the entry shows the creator's full name, a relative time (e.g. "hace 5 minutos"), and a link with the contract number and comment name
- AND the entry shows a blue unread indicator

#### Scenario: Read comment notification hides indicator

- GIVEN a comment-created notification has been opened by the recipient
- WHEN the recipient views the notification panel again
- THEN the entry no longer shows the unread indicator

### Requirement: Navigate from comment notification to comments sidebar

Clicking an unread comment notification MUST navigate to the contract detail page, auto-open the comments sidebar, position on the referenced comment, decrement the recipient's unread counter by one, and mark the notification as read.

#### Scenario: Click unread notification opens sidebar at the new comment

- GIVEN the recipient has an unread comment-created notification
- WHEN they click the notification
- THEN the system navigates to the contract detail page
- AND the comments sidebar opens automatically, scrolled/positioned to the referenced comment
- AND the recipient's unread notification counter decrements by one
- AND the notification's visual state changes to read
