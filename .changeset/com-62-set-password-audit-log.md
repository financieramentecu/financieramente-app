---
'financieramente-app': patch
---

### Corregido

- **Auditoría al establecer contraseña de admin:** El cambio de contraseña desde el panel de usuarios queda registrado en el log de auditoría.

### Técnico

- `POST /api/admin/users/set-password` now calls `logAuditEvent()` with `AuditAction.USER_PASSWORD_SET` (admin actor, target email, IP, user-agent, `ssoOnly` flag; never the password).
