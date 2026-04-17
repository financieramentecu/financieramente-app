# Requerimientos Técnicos DNS - financieramentecu.com

Para garantizar la correcta entrega de correos electrónicos desde la plataforma **Financieramente** y evitar que sean marcados como SPAM, es necesario realizar las siguientes actualizaciones en los registros DNS (GoDaddy).

## 1. Actualización del Registro SPF

Actualmente el dominio ya tiene un registro SPF para Google. Debemos modificarlo para incluir a **SendGrid**.

*   **Tipo**: TXT
*   **Host**: `@`
*   **Valor Actual**: `v=spf1 include:_spf.google.com ~all`
*   **Nuevo Valor**: `v=spf1 include:_spf.google.com include:sendgrid.net ~all`

> [!IMPORTANT]
> No crees un segundo registro SPF. Debes **editar** el existente para que contenga ambos `include`.

---

## 2. Autenticación de Dominio (SendGrid)

Para habilitar la firma **DKIM** y eliminar el mensaje "vía sendgrid.net" en los correos, se deben agregar los siguientes registros CNAME que proporciona SendGrid.

| Tipo | Host | Valor |
| :--- | :--- | :--- |
| CNAME | em7345 | u41234567.wl123.sendgrid.net |
| CNAME | s1._domainkey | s1.domainkey.u41234567.wl123.sendgrid.net |
| CNAME | s2._domainkey | s2.domainkey.u41234567.wl123.sendgrid.net |

> [!NOTE]
> Los valores de arriba son **ejemplos**. El administrador de SendGrid debe ir a:
> **Settings → Sender Authentication → Domain Authentication**
> Seleccionar el dominio `financieramentecu.com` y obtener los valores exactos generados para la cuenta.

---

## 3. Política DMARC

El dominio ya cuenta con una política DMARC básica. Se recomienda mantenerla mientras se validan los cambios anteriores.

*   **Tipo**: TXT
*   **Host**: `_dmarc`
*   **Valor**: `v=DMARC1; p=none; rua=mailto:soporte@financieramentecu.com`

---

## Verificación
Una vez realizados los cambios, se pueden verificar en [MXToolbox SPF Lookup](https://mxtoolbox.com/spf.aspx).
