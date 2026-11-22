---
'financieramente-app': patch
---

### Corregido

- Asignar un Money Strategy a un lead que no tenía asesor también lo deja en los otros leads de la misma persona.
- Si dos leads ya están relacionados, la otra ficha muestra la relación y deja de pedir que se relacionen.

### Técnico

- `assignLeadOwner` matches unassigned leads with `idUser: null`, because Prisma `NOT: { idUser }` excludes null owners.
- The relation panel treats either side of `lead_link` as already linked.
