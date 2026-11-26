---
'financieramente-app': patch
---

### Mejorado

- En el detalle del lead, el asesor se llama Money Strategy. Al asignarlo, los demás leads de la misma persona reciben el mismo.

### Técnico

- `assignLeadOwner` updates every active lead that shares document, email, or phone, plus leads joined by `lead_link`, and returns `assignedLeadIds`.
